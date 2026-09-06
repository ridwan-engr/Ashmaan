import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import Installation from "../models/Installation.js";
import Telemetry from "../models/Telemetry.js";


dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


const LOOKBACK_DAYS = 30;
const TOP_LIMIT = 20;


/*
|--------------------------------------------------------------------------
| Candidate patterns
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
  /model/i,
  /custom name/i,
  /phase sequence/i,
  /vreglink/i,
  /battery to grid/i,
  /grid to battery/i,
  /history/i,
  /yield/i,
];


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const normalizeText = (value) =>
  value === null ||
  value === undefined
    ? ""
    : String(value)
        .trim()
        .toLowerCase();


const isCandidate = (record) => {
  const text = [
    record.parameter,
    record.description,
    record.deviceType,
  ]
    .map(normalizeText)
    .join(" ");

  const included =
    INCLUDE_PATTERNS.some(
      (pattern) =>
        pattern.test(text)
    );

  if (!included) {
    return false;
  }

  return !EXCLUDE_PATTERNS.some(
    (pattern) =>
      pattern.test(text)
  );
};


const getValue = (record) => {
  if (
    record.numericValue !== null &&
    record.numericValue !== undefined
  ) {
    return record.numericValue;
  }

  return record.value;
};


const buildSignalKey = (record) =>
  [
    record.deviceType ??
      "UNKNOWN_DEVICE",

    record.deviceInstance ??
      "UNKNOWN_INSTANCE",

    record.parameter ??
      record.description ??
      "UNKNOWN_PARAMETER",
  ].join("|");


/*
|--------------------------------------------------------------------------
| Main audit
|--------------------------------------------------------------------------
*/

const runAudit = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not defined."
    );
  }


  const now = new Date();

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
    "=============================================="
  );
  console.log(
    "ASHMAAN COMPACT GRID SIGNAL AUDIT"
  );
  console.log(
    "=============================================="
  );
  console.log(
    `Lookback: ${LOOKBACK_DAYS} days`
  );


  await mongoose.connect(
    process.env.MONGODB_URI
  );


  console.log(
    "MongoDB connected."
  );


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
      })
      .lean();


  const installationIds =
    installations.map(
      (item) =>
        item._id
    );


  console.log(
    `Eligible installations: ${installations.length}`
  );


  const groups = new Map();


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


  let scanned = 0;
  let candidateRecords = 0;


  for await (const record of cursor) {
    scanned += 1;


    if (!isCandidate(record)) {
      continue;
    }


    candidateRecords += 1;


    const signalKey =
      buildSignalKey(record);


    if (!groups.has(signalKey)) {
      groups.set(
        signalKey,
        {
          signalKey,

          parameter:
            record.parameter ??
            record.description ??
            null,

          deviceType:
            record.deviceType ??
            null,

          deviceInstance:
            record.deviceInstance ??
            null,

          unit:
            record.unit ??
            null,

          installations:
            new Set(),

          values:
            new Map(),

          records: 0,

          transitions: 0,

          lastValueByInstallation:
            new Map(),
        }
      );
    }


    const group =
      groups.get(signalKey);


    group.records += 1;


    const installationId =
      String(
        record.installation
      );


    group.installations.add(
      installationId
    );


    const value =
      getValue(record);


    const valueString =
      value === null ||
      value === undefined
        ? "NULL"
        : String(value);


    group.values.set(
      valueString,
      (
        group.values.get(
          valueString
        ) || 0
      ) + 1
    );


    const previousValue =
      group
        .lastValueByInstallation
        .get(
          installationId
        );


    if (
      previousValue !== undefined &&
      previousValue !== valueString
    ) {
      group.transitions += 1;
    }


    group
      .lastValueByInstallation
      .set(
        installationId,
        valueString
      );
  }


  /*
  |--------------------------------------------------------------------------
  | Rank by fleet usefulness
  |--------------------------------------------------------------------------
  |
  | Highest fleet coverage first.
  | Then state/value transitions.
  | Then record count.
  |
  */


  const ranked =
    Array.from(
      groups.values()
    )
      .sort(
        (a, b) => {
          const coverage =
            b.installations.size -
            a.installations.size;

          if (coverage !== 0) {
            return coverage;
          }


          const transitionDifference =
            b.transitions -
            a.transitions;

          if (
            transitionDifference !== 0
          ) {
            return transitionDifference;
          }


          return (
            b.records -
            a.records
          );
        }
      );


  const topSignals =
    ranked.slice(
      0,
      TOP_LIMIT
    );


  console.log("");
  console.log(
    "=============================================="
  );
  console.log(
    `TOP ${TOP_LIMIT} GRID-RELATED SIGNALS`
  );
  console.log(
    "=============================================="
  );


  topSignals.forEach(
    (group, index) => {
      const values =
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


      /*
       * Only show the first 10 most
       * frequently observed values.
       */

      const displayedValues =
        values.slice(
          0,
          10
        );


      console.log("");
      console.log(
        `#${index + 1}`
      );

      console.log(
        `Signal: ${group.signalKey}`
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
        `Fleet Coverage: ${group.installations.size}/${installations.length}`
      );

      console.log(
        `Records: ${group.records}`
      );

      console.log(
        `Value Transitions: ${group.transitions}`
      );

      console.log(
        `Distinct Values: ${group.values.size}`
      );

      console.log(
        "Top Observed Values:"
      );


      for (
        const [
          value,
          count,
        ]
        of displayedValues
      ) {
        console.log(
          `  ${value}: ${count}`
        );
      }


      if (
        values.length >
        displayedValues.length
      ) {
        console.log(
          `  ... ${values.length - displayedValues.length} additional values omitted`
        );
      }
    }
  );


  /*
  |--------------------------------------------------------------------------
  | Coverage summary
  |--------------------------------------------------------------------------
  */


  const coverage50 =
    ranked.filter(
      (group) =>
        group.installations.size >=
        Math.ceil(
          installations.length *
            0.5
        )
    );


  const coverage25 =
    ranked.filter(
      (group) =>
        group.installations.size >=
        Math.ceil(
          installations.length *
            0.25
        )
    );


  const multiSite =
    ranked.filter(
      (group) =>
        group.installations.size >
        1
    );


  console.log("");
  console.log(
    "=============================================="
  );
  console.log(
    "FLEET COVERAGE SUMMARY"
  );
  console.log(
    "=============================================="
  );

  console.log(
    `Eligible installations: ${installations.length}`
  );

  console.log(
    `Telemetry scanned: ${scanned}`
  );

  console.log(
    `Candidate telemetry: ${candidateRecords}`
  );

  console.log(
    `Candidate signals: ${ranked.length}`
  );

  console.log(
    `Signals covering >= 50% fleet: ${coverage50.length}`
  );

  console.log(
    `Signals covering >= 25% fleet: ${coverage25.length}`
  );

  console.log(
    `Signals covering > 1 site: ${multiSite.length}`
  );


  /*
  |--------------------------------------------------------------------------
  | Best state-like candidates
  |--------------------------------------------------------------------------
  |
  | A state-like signal normally has a
  | relatively small number of distinct
  | values and at least one transition.
  |
  */


  const stateLike =
    ranked
      .filter(
        (group) =>
          group.values.size <= 20 &&
          group.transitions > 0
      )
      .slice(
        0,
        15
      );


  console.log("");
  console.log(
    "=============================================="
  );
  console.log(
    "STATE-LIKE CANDIDATES"
  );
  console.log(
    "=============================================="
  );


  if (!stateLike.length) {
    console.log(
      "No state-like candidates found."
    );
  } else {
    stateLike.forEach(
      (group, index) => {
        console.log("");

        console.log(
          `#${index + 1}`
        );

        console.log(
          `Signal: ${group.signalKey}`
        );

        console.log(
          `Coverage: ${group.installations.size}/${installations.length}`
        );

        console.log(
          `Transitions: ${group.transitions}`
        );

        console.log(
          `Distinct Values: ${group.values.size}`
        );

        console.log(
          `Values: ${Array.from(group.values.keys()).slice(0, 20).join(", ")}`
        );
      }
    );
  }


  console.log("");
  console.log(
    "=============================================="
  );
  console.log(
    "END OF COMPACT AUDIT"
  );
  console.log(
    "=============================================="
  );
};


try {
  await runAudit();
} catch (error) {
  console.error(
    "Compact grid audit failed:"
  );

  console.error(error);

  process.exitCode = 1;
} finally {
  await mongoose.disconnect();

  console.log(
    "MongoDB disconnected."
  );
}