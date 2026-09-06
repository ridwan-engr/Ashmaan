// backend/scripts/validateGridOutageDetector.js

import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import Installation from "../models/Installation.js";
import Telemetry from "../models/Telemetry.js";

import {
  AC_INPUT_ROLE,
  resolveServiceTypeRole,
} from "../services/events/acInputRoleResolver.js";


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
    process.env.GRID_VALIDATION_LOOKBACK_DAYS
  ) || 30;


const CORRELATION_WINDOW_SECONDS =
  Number(
    process.env.GRID_VALIDATION_WINDOW_SECONDS
  ) || 180;


const MAX_EVENTS_PER_SITE = 20;


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase();
}


function parameterName(record) {
  return String(
    record.parameter ??
    record.description ??
    ""
  ).trim();
}


function getValue(record) {
  if (
    record.numericValue !== null &&
    record.numericValue !== undefined
  ) {
    return record.numericValue;
  }

  return record.value;
}


function timestampOf(record) {
  const date =
    new Date(
      record.timestamp
    );

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function secondsBetween(
  left,
  right
) {
  return Math.abs(
    left.getTime() -
    right.getTime()
  ) / 1000;
}


/*
|--------------------------------------------------------------------------
| Relevant telemetry
|--------------------------------------------------------------------------
*/

function isRelevant(record) {
  const parameter =
    normalizeText(
      parameterName(record)
    );


  return (
    parameter ===
      "ac input 1 connected" ||

    parameter ===
      "ac input 2 connected" ||

    parameter ===
      "ac input 1 service type" ||

    parameter ===
      "ac input 2 service type" ||

    parameter ===
      "ac input 1 source" ||

    parameter ===
      "ac input 2 source" ||

    parameter ===
      "active input service type" ||

    parameter ===
      "ac-input" ||

    parameter ===
      "active input" ||

    parameter.startsWith(
      "input frequency "
    ) ||

    (
      normalizeText(
        record.deviceType
      ) === "grid meter" &&
      (
        parameter.includes(
          "voltage"
        ) ||
        parameter.includes(
          "frequency"
        )
      )
    )
  );
}


/*
|--------------------------------------------------------------------------
| Find nearest context signal
|--------------------------------------------------------------------------
*/

function nearestRecord(
  records,
  targetTime,
  matcher
) {
  let best = null;
  let bestDifference =
    Infinity;


  for (
    const record
    of records
  ) {
    if (
      !matcher(record)
    ) {
      continue;
    }


    const time =
      timestampOf(record);


    if (!time) {
      continue;
    }


    const difference =
      secondsBetween(
        targetTime,
        time
      );


    if (
      difference <=
        CORRELATION_WINDOW_SECONDS &&
      difference <
        bestDifference
    ) {
      best =
        record;

      bestDifference =
        difference;
    }
  }


  return best;
}


/*
|--------------------------------------------------------------------------
| Input semantic context at timestamp
|--------------------------------------------------------------------------
*/

function getInputContext(
  records,
  targetTime,
  inputNumber
) {
  const connected =
    nearestRecord(
      records,
      targetTime,
      (record) =>
        normalizeText(
          parameterName(
            record
          )
        ) ===
        `ac input ${inputNumber} connected`
    );


  const serviceType =
    nearestRecord(
      records,
      targetTime,
      (record) =>
        normalizeText(
          parameterName(
            record
          )
        ) ===
        `ac input ${inputNumber} service type`
    );


  const source =
    nearestRecord(
      records,
      targetTime,
      (record) =>
        normalizeText(
          parameterName(
            record
          )
        ) ===
        `ac input ${inputNumber} source`
    );


  const serviceValue =
    serviceType
      ? getValue(
          serviceType
        )
      : null;


  return {
    inputNumber,

    connected:
      connected
        ? getValue(
            connected
          )
        : null,

    connectedTimestamp:
      connected
        ? timestampOf(
            connected
          )
        : null,

    serviceType:
      serviceValue,

    source:
      source
        ? getValue(source)
        : null,

    role:
      resolveServiceTypeRole(
        serviceValue
      ),
  };
}


/*
|--------------------------------------------------------------------------
| Grid meter context
|--------------------------------------------------------------------------
*/

function getGridMeterContext(
  records,
  targetTime
) {
  const voltage =
    nearestRecord(
      records,
      targetTime,
      (record) => {
        const parameter =
          normalizeText(
            parameterName(
              record
            )
          );

        return (
          normalizeText(
            record.deviceType
          ) === "grid meter" &&
          parameter.includes(
            "voltage"
          ) &&
          !parameter.includes(
            "protective earth"
          )
        );
      }
    );


  const frequency =
    nearestRecord(
      records,
      targetTime,
      (record) => {
        const parameter =
          normalizeText(
            parameterName(
              record
            )
          );

        return (
          normalizeText(
            record.deviceType
          ) === "grid meter" &&
          parameter.includes(
            "frequency"
          )
        );
      }
    );


  return {
    voltage:
      voltage
        ? getValue(
            voltage
          )
        : null,

    voltageTimestamp:
      voltage
        ? timestampOf(
            voltage
          )
        : null,

    frequency:
      frequency
        ? getValue(
            frequency
          )
        : null,

    frequencyTimestamp:
      frequency
        ? timestampOf(
            frequency
          )
        : null,
  };
}


/*
|--------------------------------------------------------------------------
| Electrical corroboration
|--------------------------------------------------------------------------
*/

function evaluateGridMeter(
  gridMeter
) {
  const voltage =
    Number(
      gridMeter.voltage
    );

  const frequency =
    Number(
      gridMeter.frequency
    );


  const voltageAvailable =
    Number.isFinite(
      voltage
    ) &&
    Math.abs(
      voltage
    ) >= 100;


  const voltageAbsent =
    Number.isFinite(
      voltage
    ) &&
    Math.abs(
      voltage
    ) <= 20;


  const frequencyAvailable =
    Number.isFinite(
      frequency
    ) &&
    frequency >= 40 &&
    frequency <= 70;


  const frequencyAbsent =
    Number.isFinite(
      frequency
    ) &&
    frequency <= 5;


  if (
    voltageAvailable &&
    frequencyAvailable
  ) {
    return "GRID_PRESENT";
  }


  if (
    voltageAbsent &&
    frequencyAbsent
  ) {
    return "GRID_ABSENT";
  }


  if (
    voltageAvailable ||
    frequencyAvailable
  ) {
    return "GRID_LIKELY_PRESENT";
  }


  if (
    voltageAbsent ||
    frequencyAbsent
  ) {
    return "GRID_LIKELY_ABSENT";
  }


  return "UNKNOWN";
}


/*
|--------------------------------------------------------------------------
| Validate explicit grid input
|--------------------------------------------------------------------------
*/

function validateGridObservations(
  site,
  records
) {
  const observations = [];


  const connectionRecords =
    records.filter(
      (record) => {
        const parameter =
          normalizeText(
            parameterName(
              record
            )
          );

        return (
          parameter ===
            "ac input 1 connected" ||
          parameter ===
            "ac input 2 connected"
        );
      }
    );


  for (
    const connectionRecord
    of connectionRecords
  ) {
    const time =
      timestampOf(
        connectionRecord
      );


    if (!time) {
      continue;
    }


    const parameter =
      normalizeText(
        parameterName(
          connectionRecord
        )
      );


    const inputNumber =
      parameter.includes(
        "input 1"
      )
        ? 1
        : 2;


    const input =
      getInputContext(
        records,
        time,
        inputNumber
      );


    /*
     * Only validate explicitly identified GRID inputs.
     */

    if (
      input.role !==
      AC_INPUT_ROLE.GRID
    ) {
      continue;
    }


    const connected =
      Number(
        input.connected
      );


    if (
      connected !== 0 &&
      connected !== 1
    ) {
      continue;
    }


    const gridMeter =
      getGridMeterContext(
        records,
        time
      );


    const meterAssessment =
      evaluateGridMeter(
        gridMeter
      );


    const connectionAssessment =
      connected === 1
        ? "GRID_PRESENT"
        : "GRID_ABSENT";


    let agreement =
      "NO_CORROBORATION";


    if (
      connectionAssessment ===
        "GRID_PRESENT" &&
      (
        meterAssessment ===
          "GRID_PRESENT" ||
        meterAssessment ===
          "GRID_LIKELY_PRESENT"
      )
    ) {
      agreement =
        "AGREE";
    }


    if (
      connectionAssessment ===
        "GRID_ABSENT" &&
      (
        meterAssessment ===
          "GRID_ABSENT" ||
        meterAssessment ===
          "GRID_LIKELY_ABSENT"
      )
    ) {
      agreement =
        "AGREE";
    }


    if (
      connectionAssessment ===
        "GRID_PRESENT" &&
      (
        meterAssessment ===
          "GRID_ABSENT" ||
        meterAssessment ===
          "GRID_LIKELY_ABSENT"
      )
    ) {
      agreement =
        "CONTRADICTION";
    }


    if (
      connectionAssessment ===
        "GRID_ABSENT" &&
      (
        meterAssessment ===
          "GRID_PRESENT" ||
        meterAssessment ===
          "GRID_LIKELY_PRESENT"
      )
    ) {
      agreement =
        "CONTRADICTION";
    }


    observations.push({
      timestamp:
        time,

      inputNumber,

      serviceType:
        input.serviceType,

      source:
        input.source,

      connected,

      connectionAssessment,

      gridMeter,

      meterAssessment,

      agreement,
    });


    if (
      observations.length >=
      MAX_EVENTS_PER_SITE
    ) {
      break;
    }
  }


  return observations;
}


/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

async function runValidation() {
  if (
    !process.env.MONGODB_URI
  ) {
    throw new Error(
      "MONGODB_URI is not defined."
    );
  }


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
    "================================================"
  );

  console.log(
    "ASHMAAN GRID OUTAGE DETECTOR VALIDATION"
  );

  console.log(
    "================================================"
  );

  console.log(
    `Lookback: ${LOOKBACK_DAYS} days`
  );

  console.log(
    `Correlation window: ±${CORRELATION_WINDOW_SECONDS}s`
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
        vrmSiteId: 1,
        name: 1,
      })
      .lean();


  const installationIds =
    installations.map(
      (installation) =>
        installation._id
    );


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


  const recordsBySite =
    new Map();


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

        quality: 1,
        timestamp: 1,
      })
      .lean()
      .cursor();


  let scanned = 0;
  let relevant = 0;


  for await (
    const record
    of cursor
  ) {
    scanned += 1;


    if (
      !isRelevant(
        record
      )
    ) {
      continue;
    }


    relevant += 1;


    const key =
      String(
        record.installation
      );


    if (
      !recordsBySite.has(
        key
      )
    ) {
      recordsBySite.set(
        key,
        []
      );
    }


    recordsBySite
      .get(key)
      .push(record);
  }


  let explicitGridSites = 0;
  let totalObservations = 0;
  let agreements = 0;
  let contradictions = 0;
  let noCorroboration = 0;


  const resultSites = [];


  for (
    const [
      installationId,
      records,
    ]
    of recordsBySite
  ) {
    records.sort(
      (a, b) =>
        timestampOf(a) -
        timestampOf(b)
    );


    const installation =
      installationMap.get(
        installationId
      );


    const observations =
      validateGridObservations(
        installation,
        records
      );


    if (
      !observations.length
    ) {
      continue;
    }


    explicitGridSites += 1;


    for (
      const observation
      of observations
    ) {
      totalObservations += 1;


      if (
        observation.agreement ===
        "AGREE"
      ) {
        agreements += 1;
      } else if (
        observation.agreement ===
        "CONTRADICTION"
      ) {
        contradictions += 1;
      } else {
        noCorroboration += 1;
      }
    }


    resultSites.push({
      installation,
      observations,
    });
  }


  console.log("");
  console.log(
    "================================================"
  );

  console.log(
    "VALIDATION SUMMARY"
  );

  console.log(
    "================================================"
  );


  console.log(
    `Telemetry scanned: ${scanned}`
  );

  console.log(
    `Relevant telemetry: ${relevant}`
  );

  console.log(
    `Sites with explicit GRID semantics: ${explicitGridSites}`
  );

  console.log(
    `Grid observations evaluated: ${totalObservations}`
  );

  console.log(
    `Agreements: ${agreements}`
  );

  console.log(
    `Contradictions: ${contradictions}`
  );

  console.log(
    `No corroboration: ${noCorroboration}`
  );


  console.log("");
  console.log(
    "================================================"
  );

  console.log(
    "EXPLICIT GRID SITE DETAILS"
  );

  console.log(
    "================================================"
  );


  for (
    const result
    of resultSites
  ) {
    console.log("");

    console.log(
      `Site: ${result.installation?.vrmSiteId ?? "--"} | ${result.installation?.name ?? "--"}`
    );


    for (
      const observation
      of result.observations
    ) {
      console.log("");

      console.log(
        `  Time: ${observation.timestamp.toISOString()}`
      );

      console.log(
        `  Grid input: AC Input ${observation.inputNumber}`
      );

      console.log(
        `  Connected: ${observation.connected}`
      );

      console.log(
        `  Input assessment: ${observation.connectionAssessment}`
      );

      console.log(
        `  Grid meter voltage: ${observation.gridMeter.voltage ?? "--"}`
      );

      console.log(
        `  Grid meter frequency: ${observation.gridMeter.frequency ?? "--"}`
      );

      console.log(
        `  Meter assessment: ${observation.meterAssessment}`
      );

      console.log(
        `  Result: ${observation.agreement}`
      );
    }
  }


  console.log("");
  console.log(
    "================================================"
  );

  console.log(
    "VALIDATION COMPLETE"
  );

  console.log(
    "================================================"
  );

  console.log(
    "No OutageEvent records were created."
  );
}


try {
  await runValidation();
} catch (error) {
  console.error("");
  console.error(
    "Grid detector validation failed:"
  );

  console.error(error);

  process.exitCode = 1;
} finally {
  await mongoose.disconnect();

  console.log("");
  console.log(
    "MongoDB disconnected."
  );
}