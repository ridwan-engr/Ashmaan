// backend/scripts/persistEnsQualification.js

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
  persistEnsQualification,
} from "../services/events/ensPersistenceService.js";


dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


const BASELINE_MINUTES = 30;
const AFTER_RESTORATION_MINUTES = 5;


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
    "ASHMAAN ENS QUALIFICATION PERSISTENCE"
  );
  console.log(
    "================================================"
  );

  console.log(
    "Mode: WRITE"
  );


  await mongoose.connect(
    process.env.MONGODB_URI
  );


  console.log(
    "MongoDB connected."
  );


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


  const summary = {
    total: 0,
    written: 0,
    errors: 0,

    qualified: 0,
    unqualified: 0,

    loadInterruptionConfirmed: 0,

    persistedEnsValues: 0,
    persistedNullEns: 0,
  };


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ENS PERSISTENCE RESULTS"
  );
  console.log(
    "================================================"
  );


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


    const qualification =
      qualifyEnsEstimate({
        event,
        estimate,
      });


    try {
      const updated =
        await persistEnsQualification({
          event,
          estimate,
          qualification,
        });


      summary.written += 1;


      if (
        qualification
          .eligibleForEns === true
      ) {
        summary.qualified += 1;
      } else {
        summary.unqualified += 1;
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
        updated
          .energyNotSuppliedKwh ===
          null ||
        updated
          .energyNotSuppliedKwh ===
          undefined
      ) {
        summary
          .persistedNullEns += 1;
      } else {
        summary
          .persistedEnsValues += 1;
      }


      console.log("");
      console.log(
        "------------------------------------------------"
      );


      console.log(
        `Site: ${installation?.vrmSiteId ?? "--"} | ${installation?.name ?? "--"}`
      );


      console.log(
        `Event ID: ${updated._id}`
      );


      console.log(
        `Qualification: ${qualification.status}`
      );


      console.log(
        `Load interruption confirmed: ${qualification.loadInterruptionConfirmed}`
      );


      console.log(
        `ENS eligible: ${qualification.eligibleForEns}`
      );


      console.log(
        `Persisted ENS: ${
          updated
            .energyNotSuppliedKwh ===
            null ||
          updated
            .energyNotSuppliedKwh ===
            undefined
            ? "null"
            : `${formatNumber(
                updated
                  .energyNotSuppliedKwh
              )} kWh`
        }`
      );


      console.log(
        `Persisted qualification: ${
          updated.raw
            ?.ensQualification
            ?.qualificationStatus ??
          "--"
        }`
      );


      console.log(
        `Persisted eligibleForEns: ${
          updated.raw
            ?.eligibleForEns
        }`
      );


      console.log(
        `Persisted loadInterruptionConfirmed: ${
          updated.raw
            ?.loadInterruptionConfirmed
        }`
      );
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
        `WRITE ERROR: ${error.message}`
      );
    }
  }


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ENS PERSISTENCE SUMMARY"
  );
  console.log(
    "================================================"
  );


  console.log(
    `Total events: ${summary.total}`
  );


  console.log(
    `Successfully written: ${summary.written}`
  );


  console.log(
    `Errors: ${summary.errors}`
  );


  console.log(
    `Qualified: ${summary.qualified}`
  );


  console.log(
    `Unqualified: ${summary.unqualified}`
  );


  console.log(
    `Load interruptions confirmed: ${summary.loadInterruptionConfirmed}`
  );


  console.log(
    `Persisted ENS values: ${summary.persistedEnsValues}`
  );


  console.log(
    `Persisted null ENS: ${summary.persistedNullEns}`
  );
}


try {
  await run();
} catch (error) {
  console.error("");
  console.error(
    "ENS persistence failed:"
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