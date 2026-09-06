import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import Installation from "../models/Installation.js";
import Telemetry from "../models/Telemetry.js";


dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const LOOKBACK_DAYS =
  Number(
    process.env.GRID_STATE_AUDIT_LOOKBACK_DAYS
  ) || 30;

const EXAMPLE_LIMIT = 8;


/*
|--------------------------------------------------------------------------
| Candidate parameter patterns
|--------------------------------------------------------------------------
|
| These identify potentially useful grid/mains availability signals.
|
| They do NOT define outage semantics.
|--------------------------------------------------------------------------
*/

const INCLUDE_PATTERNS = [
  /grid/i,
  /mains/i,
  /ac input/i,
  /ac[- ]?in/i,
  /active input/i,
  /input source/i,
  /input voltage/i,
  /input frequency/i,
  /system state/i,
  /ve\.?bus state/i,
];


const EXCLUDE_PATTERNS = [
  /serial/i,
  /firmware/i,
  /product/i,
  /energy/i,
  /yield/i,
  /consumption/i,
  /battery to grid/i,
  /grid to battery/i,
  /grid to load/i,
  /history/i,
  /total/i,
];


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getMongoUri = () => {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not defined."
    );
  }

  return process.env.MONGODB_URI;
};


const normalize = (value) =>
  value === null ||
  value === undefined
    ? ""
    : String(value)
        .trim()
        .toLowerCase();


const matchesCandidate = (
  record
) => {
  const text = [
    record.parameter,
    record.description,
    record.deviceType,
  ]
    .map(normalize)
    .join(" ");


  const included =
    INCLUDE_PATTERNS.some(
      (pattern) =>
        pattern.test(text)
    );


  if (!included) {
    return false;
  }


  const excluded =
    EXCLUDE_PATTERNS.some(
      (pattern) =>
        pattern.test(text)
    );


  return !excluded;
};


const getValue = (
  record
) => {
  if (
    record.numericValue !==
      null &&
    record.numericValue !==
      undefined
  ) {
    return record.numericValue;
  }

  return record.value;
};


const buildSignalKey = (
  record
) => [
  record.deviceType ??
    "UNKNOWN_DEVICE",

  record.deviceInstance ??
    "UNKNOWN_INSTANCE",

  record.parameter ??
    record.description ??
    "UNKNOWN_PARAMETER",
].join("|");


const valueKey = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "NULL";
  }

  return String(value);
};


/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

const runAudit =
  async () => {
    const now =
      new Date();

    const from =
      new Date(
        now.getTime() -
          LOOKBACK_DAYS *
            24 *
            60 *
            60 *
            1000
      );


    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "ASHMAAN GRID STATE CANDIDATE AUDIT"
    );
    console.log(
      "========================================"
    );

    console.log(
      `Lookback: ${LOOKBACK_DAYS} days`
    );

    console.log(
      `From: ${from.toISOString()}`
    );

    console.log(
      `To:   ${now.toISOString()}`
    );

    console.log("");


    await mongoose.connect(
      getMongoUri()
    );


    console.log(
      "MongoDB connected."
    );


    /*
     * Eligible installations
     */

    const installations =
      await Installation.find({
        source: "VRM",

        syncEnabled: true,

        status: {
          $ne: "INACTIVE",
        },
      })
        .select({
          _id: 1,
          vrmSiteId: 1,
          name: 1,
        })
        .lean();


    const installationIds =
      installations.map(
        (item) =>
          item._id
      );


    const installationMap =
      new Map(
        installations.map(
          (item) => [
            String(
              item._id
            ),
            item,
          ]
        )
      );


    console.log(
      `Eligible installations: ${installations.length}`
    );


    /*
     * Stream only relevant fields.
     *
     * Using cursor avoids holding the whole
     * telemetry collection in memory.
     */

    const cursor =
      Telemetry.find({
        source: "VRM",

        installation: {
          $in:
            installationIds,
        },

        timestamp: {
          $gte: from,
          $lte: now,
        },
      })
        .select({
          installation: 1,

          deviceType: 1,
          deviceInstance: 1,

          parameter: 1,
          description: 1,

          numericValue: 1,
          value: 1,

          unit: 1,
          quality: 1,

          timestamp: 1,
        })
        .sort({
          timestamp: 1,
        })
        .lean()
        .cursor();


    const groups =
      new Map();


    let scanned = 0;
    let candidates = 0;


    for await (
      const record
      of cursor
    ) {
      scanned += 1;


      if (
        !matchesCandidate(
          record
        )
      ) {
        continue;
      }


      candidates += 1;


      const key =
        buildSignalKey(
          record
        );


      if (
        !groups.has(key)
      ) {
        groups.set(
          key,
          {
            key,

            deviceType:
              record.deviceType ??
              null,

            deviceInstance:
              record.deviceInstance ??
              null,

            parameter:
              record.parameter ??
              record.description ??
              null,

            unit:
              record.unit ??
              null,

            installations:
              new Set(),

            values:
              new Map(),

            records:
              0,

            transitions:
              0,

            examples:
              [],

            lastValueByInstallation:
              new Map(),

            firstSeenAt:
              null,

            lastSeenAt:
              null,
          }
        );
      }


      const group =
        groups.get(key);


      group.records += 1;


      const installationId =
        String(
          record.installation
        );


      group.installations.add(
        installationId
      );


      const value =
        getValue(
          record
        );


      const keyValue =
        valueKey(
          value
        );


      group.values.set(
        keyValue,
        (
          group.values.get(
            keyValue
          ) || 0
        ) + 1
      );


      /*
       * Count actual state/value changes
       * independently for each installation.
       */

      const previous =
        group
          .lastValueByInstallation
          .get(
            installationId
          );


      if (
        previous !== undefined &&
        previous !== keyValue
      ) {
        group.transitions += 1;
      }


      group
        .lastValueByInstallation
        .set(
          installationId,
          keyValue
        );


      const timestamp =
        new Date(
          record.timestamp
        );


      if (
        !Number.isNaN(
          timestamp.getTime()
        )
      ) {
        if (
          !group.firstSeenAt ||
          timestamp <
            group.firstSeenAt
        ) {
          group.firstSeenAt =
            timestamp;
        }


        if (
          !group.lastSeenAt ||
          timestamp >
            group.lastSeenAt
        ) {
          group.lastSeenAt =
            timestamp;
        }
      }


      if (
        group.examples.length <
        EXAMPLE_LIMIT
      ) {
        const installation =
          installationMap.get(
            installationId
          );


        group.examples.push({
          vrmSiteId:
            installation
              ?.vrmSiteId ??
            null,

          name:
            installation
              ?.name ??
            null,

          timestamp:
            record.timestamp,

          value,

          quality:
            record.quality ??
            null,
        });
      }
    }


    /*
     * Sort:
     *
     * 1. highest fleet coverage
     * 2. highest transitions
     * 3. most records
     */

    const sorted =
      Array.from(
        groups.values()
      )
        .sort(
          (a, b) => {
            const coverage =
              b.installations.size -
              a.installations.size;

            if (
              coverage !== 0
            ) {
              return coverage;
            }


            const transitions =
              b.transitions -
              a.transitions;

            if (
              transitions !== 0
            ) {
              return transitions;
            }


            return (
              b.records -
              a.records
            );
          }
        );


    console.log("");
    console.log(
      `Telemetry scanned: ${scanned}`
    );

    console.log(
      `Candidate records: ${candidates}`
    );

    console.log(
      `Candidate signals: ${sorted.length}`
    );


    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "GRID STATE CANDIDATES"
    );
    console.log(
      "========================================"
    );


    sorted.forEach(
      (
        group,
        index
      ) => {
        console.log("");
        console.log(
          `#${index + 1}`
        );

        console.log(
          `Signal: ${group.key}`
        );

        console.log(
          `Parameter: ${group.parameter ?? "--"}`
        );

        console.log(
          `Device Type: ${group.deviceType ?? "--"}`
        );

        console.log(
          `Device Instance: ${group.deviceInstance ?? "--"}`
        );

        console.log(
          `Unit: ${group.unit ?? "--"}`
        );

        console.log(
          `Fleet Coverage: ${group.installations.size}/${installations.length}`
        );

        console.log(
          `Records: ${group.records}`
        );

        console.log(
          `Value Transitions: ${group.transitions}`
        );

        console.log(
          `First Seen: ${
            group.firstSeenAt
              ?.toISOString() ??
            "--"
          }`
        );

        console.log(
          `Last Seen: ${
            group.lastSeenAt
              ?.toISOString() ??
            "--"
          }`
        );


        console.log(
          "Observed Values:"
        );


        const values =
          Array.from(
            group.values.entries()
          )
            .sort(
              (
                [, a],
                [, b]
              ) =>
                b - a
            );


        for (
          const [
            value,
            count,
          ]
          of values
        ) {
          console.log(
            `  ${value}: ${count}`
          );
        }


        console.log(
          "Examples:"
        );


        for (
          const example
          of group.examples
        ) {
          const timestamp =
            example.timestamp
              ? new Date(
                  example.timestamp
                ).toISOString()
              : "--";


          console.log(
            `  ${example.vrmSiteId ?? "--"} | ${example.name ?? "--"} | ${timestamp} | value: ${example.value} | quality: ${example.quality ?? "--"}`
          );
        }
      }
    );


    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "SUMMARY"
    );
    console.log(
      "========================================"
    );

    console.log(
      `Eligible installations: ${installations.length}`
    );

    console.log(
      `Telemetry scanned: ${scanned}`
    );

    console.log(
      `Candidate telemetry: ${candidates}`
    );

    console.log(
      `Candidate signals: ${sorted.length}`
    );

    console.log("");
    console.log(
      "No electrical outage semantics have been assigned."
    );

    console.log(
      "Signals must be validated before being used by gridOutageDetector."
    );

    console.log("");
  };


try {
  await runAudit();
} catch (error) {
  console.error("");
  console.error(
    "Grid state candidate audit failed:"
  );

  console.error(
    error
  );

  process.exitCode =
    1;
} finally {
  await mongoose.disconnect();

  console.log(
    "MongoDB disconnected."
  );
}