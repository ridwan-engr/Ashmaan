import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import Installation
  from "../models/Installation.js";

import Telemetry
  from "../models/Telemetry.js";


/*
|--------------------------------------------------------------------------
| DNS
|--------------------------------------------------------------------------
*/

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
    process.env.GRID_SIGNAL_AUDIT_LOOKBACK_DAYS
  ) || 30;

const SAMPLE_LIMIT_PER_SIGNAL =
  Number(
    process.env.GRID_SIGNAL_AUDIT_SAMPLE_LIMIT
  ) || 12;


/*
|--------------------------------------------------------------------------
| Candidate grid-related keywords
|--------------------------------------------------------------------------
|
| We intentionally search broadly.
|
| This audit does NOT assume that any particular
| field means "grid outage".
|--------------------------------------------------------------------------
*/

const GRID_KEYWORDS = [
  "grid",
  "mains",
  "ac input",
  "ac-in",
  "ac in",
  "input voltage",
  "input current",
  "input power",
  "ve.bus",
  "vebus",
  "system state",
  "active input",
  "input source",
];


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getMongoUri = () => {
  const uri =
    process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined."
    );
  }

  return uri;
};


const normalizeText = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase();
};


const matchesGridKeyword = (
  record
) => {
  const searchable =
    [
      record.parameter,
      record.description,
      record.deviceType,
      record.unit,
    ]
      .map(
        normalizeText
      )
      .join(" ");

  return GRID_KEYWORDS.some(
    (keyword) =>
      searchable.includes(
        keyword
      )
  );
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


const safeDate =
  (value) => {
    const date =
      value
        ? new Date(value)
        : null;

    if (
      !date ||
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;
  };


/*
|--------------------------------------------------------------------------
| Main audit
|--------------------------------------------------------------------------
*/

const runAudit =
  async () => {
    const startedAt =
      new Date();

    const lookbackStart =
      new Date(
        startedAt.getTime() -
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
      "ASHMAAN GRID SIGNAL AUDIT"
    );
    console.log(
      "========================================"
    );
    console.log(
      `Lookback: ${LOOKBACK_DAYS} days`
    );
    console.log(
      `From: ${lookbackStart.toISOString()}`
    );
    console.log(
      `To:   ${startedAt.toISOString()}`
    );
    console.log("");


    await mongoose.connect(
      getMongoUri()
    );


    console.log(
      "MongoDB connected."
    );


    /*
     * Eligible real VRM installations.
     */

    const installations =
      await Installation.find({
        source:
          "VRM",

        syncEnabled:
          true,

        status: {
          $ne:
            "INACTIVE",
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
        (installation) =>
          installation._id
      );


    console.log(
      `Eligible installations: ${installations.length}`
    );


    /*
     * Pull recent telemetry.
     *
     * Only required fields are selected
     * to reduce memory usage.
     */

    const telemetryRecords =
      await Telemetry.find({
        source:
          "VRM",

        installation: {
          $in:
            installationIds,
        },

        timestamp: {
          $gte:
            lookbackStart,

          $lte:
            startedAt,
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
          timestamp:
            1,
        })
        .lean();


    console.log(
      `Telemetry records scanned: ${telemetryRecords.length}`
    );


    /*
     * Filter only grid-related candidates.
     */

    const candidateRecords =
      telemetryRecords.filter(
        matchesGridKeyword
      );


    console.log(
      `Grid-related candidate records: ${candidateRecords.length}`
    );


    /*
     * Map installations for readable output.
     */

    const installationMap =
      new Map(
        installations.map(
          (installation) => [
            String(
              installation._id
            ),

            installation,
          ]
        )
      );


    /*
     * Group by logical signal.
     */

    const signalGroups =
      new Map();


    for (
      const record
      of candidateRecords
    ) {
      const signalKey =
        buildSignalKey(
          record
        );

      if (
        !signalGroups.has(
          signalKey
        )
      ) {
        signalGroups.set(
          signalKey,
          {
            key:
              signalKey,

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

            samples:
              [],

            firstSeenAt:
              null,

            lastSeenAt:
              null,

            totalRecords:
              0,
          }
        );
      }


      const group =
        signalGroups.get(
          signalKey
        );


      group.totalRecords +=
        1;


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


      const valueKey =
        value === null ||
        value === undefined
          ? "NULL"
          : String(value);


      group.values.set(
        valueKey,
        (
          group.values.get(
            valueKey
          ) || 0
        ) + 1
      );


      const timestamp =
        safeDate(
          record.timestamp
        );


      if (timestamp) {
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
        group.samples.length <
        SAMPLE_LIMIT_PER_SIGNAL
      ) {
        const installation =
          installationMap.get(
            installationId
          );


        group.samples.push({
          vrmSiteId:
            installation
              ?.vrmSiteId ??
            null,

          installationName:
            installation
              ?.name ??
            null,

          timestamp,

          value,

          quality:
            record.quality ??
            null,
        });
      }
    }


    /*
     * Sort signals by fleet coverage,
     * then record count.
     */

    const sortedGroups =
      Array.from(
        signalGroups.values()
      )
        .sort(
          (a, b) => {
            const coverageDifference =
              b.installations.size -
              a.installations.size;

            if (
              coverageDifference !==
              0
            ) {
              return coverageDifference;
            }

            return (
              b.totalRecords -
              a.totalRecords
            );
          }
        );


    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "CANDIDATE SIGNALS"
    );
    console.log(
      "========================================"
    );


    if (
      !sortedGroups.length
    ) {
      console.log(
        "No candidate grid-related signals found."
      );

      return;
    }


    sortedGroups.forEach(
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
          `Device Type: ${group.deviceType ?? "--"}`
        );

        console.log(
          `Device Instance: ${group.deviceInstance ?? "--"}`
        );

        console.log(
          `Parameter: ${group.parameter ?? "--"}`
        );

        console.log(
          `Unit: ${group.unit ?? "--"}`
        );

        console.log(
          `Fleet Coverage: ${group.installations.size}/${installations.length}`
        );

        console.log(
          `Total Records: ${group.totalRecords}`
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


        /*
         * Show observed values and frequency.
         */

        const valueDistribution =
          Array.from(
            group.values.entries()
          )
            .sort(
              (
                [, countA],
                [, countB]
              ) =>
                countB -
                countA
            );


        console.log(
          "Observed Values:"
        );


        for (
          const [
            value,
            count,
          ]
          of valueDistribution
        ) {
          console.log(
            `  ${value}: ${count}`
          );
        }


        console.log(
          "Samples:"
        );


        for (
          const sample
          of group.samples
        ) {
          console.log(
            [
              "  ",
              sample.vrmSiteId ??
                "--",
              "|",
              sample.installationName ??
                "--",
              "|",
              sample.timestamp
                ?.toISOString() ??
                "--",
              "| value:",
              sample.value,
              "| quality:",
              sample.quality ??
                "--",
            ].join(" ")
          );
        }
      }
    );


    /*
     * Summary
     */

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "AUDIT SUMMARY"
    );
    console.log(
      "========================================"
    );

    console.log(
      `Signals discovered: ${sortedGroups.length}`
    );

    console.log(
      `Eligible installations: ${installations.length}`
    );

    console.log(
      `Candidate telemetry records: ${candidateRecords.length}`
    );

    console.log("");
    console.log(
      "No outage rules have been inferred."
    );

    console.log(
      "Use these observed parameters and value distributions to define the grid detector."
    );

    console.log("");
  };


/*
|--------------------------------------------------------------------------
| Execute
|--------------------------------------------------------------------------
*/

try {
  await runAudit();
} catch (error) {
  console.error("");
  console.error(
    "Grid signal audit failed:"
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