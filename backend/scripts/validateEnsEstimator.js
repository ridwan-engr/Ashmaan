// backend/scripts/validateEnsEstimator.js

import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import OutageEvent from "../models/OutageEvent.js";
import Installation from "../models/Installation.js";
import Telemetry from "../models/Telemetry.js";

import {
  estimateEnsForGridEvent,
} from "../services/events/ensEstimatorService.js";


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
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "--";
  }

  return Number(
    value
  ).toFixed(
    digits
  );
}


function formatPercent(
  value
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "--";
  }

  return `${(
    Number(value) *
    100
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
    "ASHMAAN ENS ESTIMATOR VALIDATION"
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
      events
        .map(
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
  | Validation counters
  |--------------------------------------------------------------------------
  */

  const summary = {
    totalEvents: 0,

    restoredEvents: 0,

    openEvents: 0,

    estimated: 0,

    insufficientBaseline: 0,

    insufficientOutageData: 0,

    noLoadSignal: 0,

    other: 0,

    detectedLoadInterruptions: 0,

    totalEstimatedEnsKwh: 0,
  };


  /*
  |--------------------------------------------------------------------------
  | Per-event validation
  |--------------------------------------------------------------------------
  */

  console.log("");
  console.log(
    "================================================"
  );

  console.log(
    "ENS EVENT RESULTS"
  );

  console.log(
    "================================================"
  );


  for (
    const event
    of events
  ) {
    summary.totalEvents += 1;


    if (
      event.status ===
      "RESTORED"
    ) {
      summary.restoredEvents += 1;
    }


    if (
      event.status ===
      "OPEN"
    ) {
      summary.openEvents += 1;
    }


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


    /*
     * For OPEN events the estimator will reject final ENS anyway.
     * Querying only until now is enough.
     */

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
    | Verified power signals only
    |--------------------------------------------------------------------------
    |
    | Primary:
    | 131 / 132 / 133
    | /Ac/Consumption/Lx/Power
    |
    | Fallback:
    | 567 / 568 / 569
    | /Ac/ConsumptionOnOutput/Lx/Power
    |
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


    const result =
      estimateEnsForGridEvent({
        event,

        telemetryRecords,

        config: {
          baselineMinutes:
            BASELINE_MINUTES,

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
    | Summary classification
    |--------------------------------------------------------------------------
    */

    switch (
      result.status
    ) {
      case "ESTIMATED":
        summary.estimated += 1;

        if (
          result.loadInterruptionDetected ===
          true
        ) {
          summary
            .detectedLoadInterruptions += 1;
        }

        if (
          Number.isFinite(
            result.ensKwh
          )
        ) {
          summary
            .totalEstimatedEnsKwh +=
            result.ensKwh;
        }

        break;


      case "OPEN_EVENT":
        break;


      case "INSUFFICIENT_BASELINE":
        summary
          .insufficientBaseline += 1;

        break;


      case "INSUFFICIENT_OUTAGE_DATA":
        summary
          .insufficientOutageData += 1;

        break;


      case "NO_LOAD_SIGNAL":
        summary
          .noLoadSignal += 1;

        break;


      default:
        summary.other += 1;
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
      `Duration: ${
        Number.isFinite(
          event.durationSeconds
        )
          ? `${event.durationSeconds}s`
          : "OPEN"
      }`
    );


    console.log(
      `Estimator status: ${result.status}`
    );


    if (
      result.reason
    ) {
      console.log(
        `Reason: ${result.reason}`
      );
    }


    if (
      result.status ===
      "ESTIMATED"
    ) {
      console.log(
        `Signal family: ${result.family}`
      );


      console.log(
        `Detected phases: ${JSON.stringify(result.phases)}`
      );


      console.log(
        `Baseline samples: ${result.baselineSampleCount}`
      );


      console.log(
        `Expected load: ${formatNumber(
          result.expectedLoadWatts,
          2
        )} W`
      );


      console.log(
        `Outage samples: ${result.outageSampleCount}`
      );


      console.log(
        `Average served load: ${formatNumber(
          result.averageServedLoadWatts,
          2
        )} W`
      );


      console.log(
        `Served fraction: ${formatPercent(
          result.servedFraction
        )}`
      );


      console.log(
        `Load reduction: ${formatPercent(
          result.reductionFraction
        )}`
      );


      console.log(
        `Near-zero fraction: ${formatPercent(
          result.nearZeroFraction
        )}`
      );


      console.log(
        `Load interruption detected: ${
          result.loadInterruptionDetected
        }`
      );


      console.log(
        `Estimated ENS: ${formatNumber(
          result.ensKwh,
          6
        )} kWh`
      );
    } else {
      console.log(
        `Estimated ENS: ${
          result.ensKwh ??
          "--"
        }`
      );
    }
  }


  /*
  |--------------------------------------------------------------------------
  | Validation summary
  |--------------------------------------------------------------------------
  */

  console.log("");
  console.log(
    "================================================"
  );

  console.log(
    "ENS VALIDATION SUMMARY"
  );

  console.log(
    "================================================"
  );


  console.log(
    `Total events: ${summary.totalEvents}`
  );


  console.log(
    `Restored events: ${summary.restoredEvents}`
  );


  console.log(
    `Open events: ${summary.openEvents}`
  );


  console.log(
    `Successfully estimated: ${summary.estimated}`
  );


  console.log(
    `Insufficient baseline: ${summary.insufficientBaseline}`
  );


  console.log(
    `Insufficient outage data: ${summary.insufficientOutageData}`
  );


  console.log(
    `No load signal: ${summary.noLoadSignal}`
  );


  console.log(
    `Other status: ${summary.other}`
  );


  console.log(
    `Load interruptions detected: ${summary.detectedLoadInterruptions}`
  );


  console.log(
    `Total estimated ENS: ${summary.totalEstimatedEnsKwh.toFixed(
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
    "ENS estimator validation failed:"
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