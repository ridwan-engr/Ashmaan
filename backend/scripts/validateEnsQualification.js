// backend/scripts/validateEnsQualification.js

import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import OutageEvent from "../models/OutageEvent.js";
import Installation from "../models/Installation.js";
import Telemetry from "../models/Telemetry.js";

import {
  estimateEnsForGridEvent,
} from "../services/events/ensEstimatorService.js";

import {
  qualifyEnsEstimate,
} from "../services/events/ensQualificationService.js";


dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const BASELINE_MINUTES = 30;
const AFTER_RESTORATION_MINUTES = 5;


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function formatNumber(
  value,
  digits = 2
) {
  const numeric =
    Number(value);

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(numeric)
  ) {
    return "--";
  }

  return numeric.toFixed(
    digits
  );
}


function formatPercent(
  value
) {
  const numeric =
    Number(value);

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(numeric)
  ) {
    return "--";
  }

  return `${(
    numeric * 100
  ).toFixed(2)}%`;
}


/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

async function run() {
  if (
    !process.env.MONGODB_URI
  ) {
    throw new Error(
      "MONGODB_URI is not defined."
    );
  }


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ASHMAAN ENS QUALIFICATION VALIDATION"
  );
  console.log(
    "================================================"
  );
  console.log(
    `Baseline window: ${BASELINE_MINUTES} minutes`
  );
  console.log(
    "Mode: READ ONLY"
  );


  await mongoose.connect(
    process.env.MONGODB_URI
  );


  console.log(
    "MongoDB connected."
  );


  /*
  |--------------------------------------------------------------------------
  | Events
  |--------------------------------------------------------------------------
  */

  const events =
    await OutageEvent.find({
      eventType:
        "GRID_OUTAGE",

      source:
        "DERIVED",

      detectionMethod:
        "ACTIVE_SOURCE_TRANSITION",
    })
      .sort({
        startTime: 1,
      })
      .lean();


  /*
  |--------------------------------------------------------------------------
  | Installation lookup
  |--------------------------------------------------------------------------
  */

  const installationIds = [
    ...new Set(
      events.map(
        (event) =>
          String(
            event.installation
          )
      )
    ),
  ];


  const installations =
    await Installation.find({
      _id: {
        $in:
          installationIds,
      },
    })
      .select({
        _id: 1,
        vrmSiteId: 1,
        name: 1,
      })
      .lean();


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
  |--------------------------------------------------------------------------
  | Summary
  |--------------------------------------------------------------------------
  */

  const summary = {
    total: 0,

    qualifiedEstimate: 0,

    loadContinuityObserved: 0,

    insufficientBaseline: 0,

    insufficientOutageCoverage: 0,

    insufficientTimeCoverage: 0,

    eventNotRestored: 0,

    noEstimate: 0,

    other: 0,

    eligibleForEns: 0,

    loadInterruptionConfirmed: 0,

    totalQualifiedEnsKwh: 0,
  };


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ENS QUALIFICATION RESULTS"
  );
  console.log(
    "================================================"
  );


  /*
  |--------------------------------------------------------------------------
  | Process events
  |--------------------------------------------------------------------------
  */

  for (
    const event
    of events
  ) {
    summary.total += 1;


    const installation =
      installationMap.get(
        String(
          event.installation
        )
      );


    const eventStart =
      new Date(
        event.startTime
      );


    const eventEnd =
      event.restorationTime
        ? new Date(
            event.restorationTime
          )
        : null;


    const queryStart =
      new Date(
        eventStart.getTime() -
          BASELINE_MINUTES *
            60 *
            1000
      );


    const queryEnd =
      eventEnd
        ? new Date(
            eventEnd.getTime() +
              AFTER_RESTORATION_MINUTES *
                60 *
                1000
          )
        : new Date();


    /*
    |--------------------------------------------------------------------------
    | Load telemetry
    |--------------------------------------------------------------------------
    */

    const telemetryRecords =
      await Telemetry.find({
        installation:
          event.installation,

        source:
          "VRM",

        vrmAttributeId: {
          $in: [
            131,
            132,
            133,

            567,
            568,
            569,
          ],
        },

        timestamp: {
          $gte:
            queryStart,

          $lte:
            queryEnd,
        },
      })
        .select({
          _id: 1,
          installation: 1,
          deviceType: 1,
          deviceInstance: 1,
          vrmAttributeId: 1,
          parameter: 1,
          description: 1,
          numericValue: 1,
          value: 1,
          timestamp: 1,
          quality: 1,
          raw: 1,
        })
        .lean();


    /*
    |--------------------------------------------------------------------------
    | Raw estimator
    |--------------------------------------------------------------------------
    */

    const estimate =
      estimateEnsForGridEvent({
        event,

        telemetryRecords,

        config: {
          baselineMinutes:
            BASELINE_MINUTES,

          /*
           * Keep estimator permissive.
           *
           * Qualification layer applies
           * production-strength requirements.
           */
          minimumBaselineSamples:
            2,

          minimumOutageSamples:
            1,

          interruptionFractionThreshold:
            0.20,

          nearZeroPowerWatts:
            50,
        },
      });


    /*
    |--------------------------------------------------------------------------
    | Qualification
    |--------------------------------------------------------------------------
    */

    const qualification =
      qualifyEnsEstimate({
        event,
        estimate,
      });


    /*
    |--------------------------------------------------------------------------
    | Summary classification
    |--------------------------------------------------------------------------
    */

    switch (
      qualification.status
    ) {
      case "QUALIFIED_ESTIMATE":
        summary
          .qualifiedEstimate += 1;
        break;

      case "LOAD_CONTINUITY_OBSERVED":
        summary
          .loadContinuityObserved += 1;
        break;

      case "INSUFFICIENT_BASELINE":
        summary
          .insufficientBaseline += 1;
        break;

      case "INSUFFICIENT_OUTAGE_COVERAGE":
        summary
          .insufficientOutageCoverage += 1;
        break;

      case "INSUFFICIENT_TIME_COVERAGE":
        summary
          .insufficientTimeCoverage += 1;
        break;

      case "EVENT_NOT_RESTORED":
        summary
          .eventNotRestored += 1;
        break;

      case "NO_ESTIMATE":
      case "NO_LOAD_SIGNAL":
      case "INSUFFICIENT_OUTAGE_DATA":
        summary
          .noEstimate += 1;
        break;

      default:
        summary.other += 1;
    }


    if (
      qualification
        .eligibleForEns === true
    ) {
      summary
        .eligibleForEns += 1;
    }


    if (
      qualification
        .loadInterruptionConfirmed ===
      true
    ) {
      summary
        .loadInterruptionConfirmed += 1;
    }


    if (
      qualification
        .eligibleForEns === true &&
      Number.isFinite(
        qualification.ensKwh
      )
    ) {
      summary
        .totalQualifiedEnsKwh +=
        qualification.ensKwh;
    }


    /*
    |--------------------------------------------------------------------------
    | Output
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
      "------------------------------------------------"
    );


    console.log(
      `Site: ${installation?.vrmSiteId ?? "--"} | ${installation?.name ?? "--"}`
    );


    console.log(
      `Event ID: ${event._id}`
    );


    console.log(
      `Event status: ${event.status}`
    );


    console.log(
      `Start: ${eventStart.toISOString()}`
    );


    console.log(
      `Restoration: ${
        eventEnd
          ? eventEnd.toISOString()
          : "--"
      }`
    );


    console.log(
      `Estimator status: ${estimate.status}`
    );


    if (
      estimate.status ===
      "ESTIMATED"
    ) {
      console.log(
        `Signal family: ${estimate.family}`
      );


      console.log(
        `Phases: ${JSON.stringify(
          estimate.phases
        )}`
      );


      console.log(
        `Baseline samples: ${estimate.baselineSampleCount}`
      );


      console.log(
        `Outage samples: ${estimate.outageSampleCount}`
      );


      console.log(
        `Expected load: ${formatNumber(
          estimate.expectedLoadWatts,
          2
        )} W`
      );


      console.log(
        `Average served load: ${formatNumber(
          estimate.averageServedLoadWatts,
          2
        )} W`
      );


      console.log(
        `Load reduction: ${formatPercent(
          estimate.reductionFraction
        )}`
      );


      console.log(
        `Near-zero fraction: ${formatPercent(
          estimate.nearZeroFraction
        )}`
      );


      console.log(
        `Raw estimated ENS: ${formatNumber(
          estimate.ensKwh,
          6
        )} kWh`
      );
    }


    console.log("");
    console.log(
      `ENS qualification: ${qualification.status}`
    );


    console.log(
      `Load interruption confirmed: ${qualification.loadInterruptionConfirmed}`
    );


    console.log(
      `ENS eligible: ${qualification.eligibleForEns}`
    );


    console.log(
      `Qualified ENS: ${
        Number.isFinite(
          qualification.ensKwh
        )
          ? `${qualification.ensKwh.toFixed(
              6
            )} kWh`
          : "--"
      }`
    );


    if (
      Number.isFinite(
        qualification
          .maximumGapFraction
      )
    ) {
      console.log(
        `Maximum gap fraction: ${formatPercent(
          qualification
            .maximumGapFraction
        )}`
      );
    }


    console.log(
      `Reason: ${qualification.reason}`
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Final summary
  |--------------------------------------------------------------------------
  */

  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ENS QUALIFICATION SUMMARY"
  );
  console.log(
    "================================================"
  );


  console.log(
    `Total events: ${summary.total}`
  );


  console.log(
    `Qualified estimates: ${summary.qualifiedEstimate}`
  );


  console.log(
    `Load continuity observed: ${summary.loadContinuityObserved}`
  );


  console.log(
    `Insufficient baseline: ${summary.insufficientBaseline}`
  );


  console.log(
    `Insufficient outage coverage: ${summary.insufficientOutageCoverage}`
  );


  console.log(
    `Insufficient time coverage: ${summary.insufficientTimeCoverage}`
  );


  console.log(
    `Event not restored: ${summary.eventNotRestored}`
  );


  console.log(
    `No usable estimate: ${summary.noEstimate}`
  );


  console.log(
    `Other: ${summary.other}`
  );


  console.log(
    `Load interruptions confirmed: ${summary.loadInterruptionConfirmed}`
  );


  console.log(
    `ENS eligible events: ${summary.eligibleForEns}`
  );


  console.log(
    `Total qualified ENS: ${summary.totalQualifiedEnsKwh.toFixed(
      6
    )} kWh`
  );


  console.log("");
  console.log(
    "No OutageEvent records were modified."
  );
}


/*
|--------------------------------------------------------------------------
| Execute
|--------------------------------------------------------------------------
*/

try {
  await run();
} catch (error) {
  console.error("");
  console.error(
    "ENS qualification validation failed:"
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