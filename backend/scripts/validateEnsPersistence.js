// backend/scripts/validateEnsPersistence.js

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

import {
  buildEnsPersistencePatch,
} from "../services/events/ensPersistenceService.js";


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
  digits = 6
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


function sameNullableNumber(
  left,
  right
) {
  const leftEmpty =
    left === null ||
    left === undefined;

  const rightEmpty =
    right === null ||
    right === undefined;

  if (
    leftEmpty &&
    rightEmpty
  ) {
    return true;
  }

  if (
    leftEmpty ||
    rightEmpty
  ) {
    return false;
  }

  return Number(left) ===
    Number(right);
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
    "ASHMAAN ENS PERSISTENCE DRY RUN"
  );
  console.log(
    "================================================"
  );

  console.log(
    "Mode: DRY RUN"
  );

  console.log(
    "MongoDB writes: DISABLED"
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
    totalEvents: 0,

    wouldPersistQualifiedEns: 0,

    wouldPersistNullEns: 0,

    loadContinuityObserved: 0,

    insufficientEvidence: 0,

    openEvents: 0,

    alreadySameEnsValue: 0,

    ensValueWouldChange: 0,

    eligibleForEnsTrue: 0,

    eligibleForEnsFalse: 0,

    loadInterruptionTrue: 0,

    loadInterruptionFalse: 0,

    errors: 0,
  };


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ENS PERSISTENCE DRY-RUN RESULTS"
  );
  console.log(
    "================================================"
  );


  for (
    const event
    of events
  ) {
    summary.totalEvents += 1;


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
    | Verified load telemetry
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
    | Estimate
    |--------------------------------------------------------------------------
    */

    const estimate =
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
    | Persistence patch — DRY RUN ONLY
    |--------------------------------------------------------------------------
    */

    let patch;


    try {
      patch =
        buildEnsPersistencePatch({
          event,
          estimate,
          qualification,
        });
    } catch (error) {
      summary.errors += 1;

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
        `PATCH BUILD ERROR: ${error.message}`
      );

      continue;
    }


    /*
    |--------------------------------------------------------------------------
    | Summary classification
    |--------------------------------------------------------------------------
    */

    if (
      qualification
        .eligibleForEns === true
    ) {
      summary
        .eligibleForEnsTrue += 1;
    } else {
      summary
        .eligibleForEnsFalse += 1;
    }


    if (
      qualification
        .loadInterruptionConfirmed ===
      true
    ) {
      summary
        .loadInterruptionTrue += 1;
    } else {
      summary
        .loadInterruptionFalse += 1;
    }


    if (
      patch.energyNotSuppliedKwh ===
      null
    ) {
      summary
        .wouldPersistNullEns += 1;
    } else {
      summary
        .wouldPersistQualifiedEns += 1;
    }


    if (
      qualification.status ===
      "LOAD_CONTINUITY_OBSERVED"
    ) {
      summary
        .loadContinuityObserved += 1;
    }


    if (
      qualification.status ===
      "EVENT_NOT_RESTORED"
    ) {
      summary
        .openEvents += 1;
    }


    if (
      [
        "INSUFFICIENT_BASELINE",
        "INSUFFICIENT_OUTAGE_COVERAGE",
        "INSUFFICIENT_TIME_COVERAGE",
        "NO_ESTIMATE",
        "NO_LOAD_SIGNAL",
        "INSUFFICIENT_OUTAGE_DATA",
      ].includes(
        qualification.status
      )
    ) {
      summary
        .insufficientEvidence += 1;
    }


    const existingEns =
      event
        .energyNotSuppliedKwh ??
      null;


    const proposedEns =
      patch
        .energyNotSuppliedKwh ??
      null;


    if (
      sameNullableNumber(
        existingEns,
        proposedEns
      )
    ) {
      summary
        .alreadySameEnsValue += 1;
    } else {
      summary
        .ensValueWouldChange += 1;
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
      `Estimator status: ${estimate.status}`
    );


    console.log(
      `Qualification status: ${qualification.status}`
    );


    console.log(
      `Load interruption confirmed: ${qualification.loadInterruptionConfirmed}`
    );


    console.log(
      `ENS eligible: ${qualification.eligibleForEns}`
    );


    console.log(
      `Existing ENS: ${
        existingEns === null
          ? "null"
          : `${formatNumber(
              existingEns
            )} kWh`
      }`
    );


    console.log(
      `Proposed ENS: ${
        proposedEns === null
          ? "null"
          : `${formatNumber(
              proposedEns
            )} kWh`
      }`
    );


    console.log(
      `ENS value changes: ${
        sameNullableNumber(
          existingEns,
          proposedEns
        )
          ? "NO"
          : "YES"
      }`
    );


    console.log(
      `Raw estimated ENS: ${
        Number.isFinite(
          estimate?.ensKwh
        )
          ? `${estimate.ensKwh.toFixed(
              6
            )} kWh`
          : "--"
      }`
    );


    console.log(
      `Persistence qualification: ${
        patch.raw
          ?.ensQualification
          ?.qualificationStatus ??
        "--"
      }`
    );


    console.log(
      `Persistence eligibleForEns: ${
        patch.raw
          ?.eligibleForEns
      }`
    );


    console.log(
      `Persistence loadInterruptionConfirmed: ${
        patch.raw
          ?.loadInterruptionConfirmed
      }`
    );


    console.log(
      `Reason: ${
        patch.raw
          ?.ensQualification
          ?.qualificationReason ??
        "--"
      }`
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Summary output
  |--------------------------------------------------------------------------
  */

  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ENS PERSISTENCE DRY-RUN SUMMARY"
  );
  console.log(
    "================================================"
  );


  console.log(
    `Total events: ${summary.totalEvents}`
  );


  console.log(
    `Would persist qualified ENS: ${summary.wouldPersistQualifiedEns}`
  );


  console.log(
    `Would persist null ENS: ${summary.wouldPersistNullEns}`
  );


  console.log(
    `Load continuity observed: ${summary.loadContinuityObserved}`
  );


  console.log(
    `Insufficient evidence: ${summary.insufficientEvidence}`
  );


  console.log(
    `Open events: ${summary.openEvents}`
  );


  console.log(
    `ENS eligible = true: ${summary.eligibleForEnsTrue}`
  );


  console.log(
    `ENS eligible = false: ${summary.eligibleForEnsFalse}`
  );


  console.log(
    `Load interruption = true: ${summary.loadInterruptionTrue}`
  );


  console.log(
    `Load interruption = false: ${summary.loadInterruptionFalse}`
  );


  console.log(
    `Existing ENS already matches proposed: ${summary.alreadySameEnsValue}`
  );


  console.log(
    `ENS values that would change: ${summary.ensValueWouldChange}`
  );


  console.log(
    `Patch build errors: ${summary.errors}`
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
    "ENS persistence dry run failed:"
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