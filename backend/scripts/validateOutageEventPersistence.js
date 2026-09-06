// backend/scripts/validateOutageEventPersistence.js

import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import Installation from "../models/Installation.js";
import Telemetry from "../models/Telemetry.js";

import {
  detectGridInterruptionEpisodes,
} from "../services/events/gridRestorationDetector.js";

import {
  persistGridEpisodes,
} from "../services/events/outageEventPersistenceService.js";


dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


const LOOKBACK_DAYS =
  Number(
    process.env.OUTAGE_PERSISTENCE_LOOKBACK_DAYS
  ) || 30;


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
    "ASHMAAN OUTAGE EVENT PERSISTENCE VALIDATION"
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
        site: 1,
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


  const installationIds =
    installations.map(
      (installation) =>
        installation._id
    );


  /*
  |--------------------------------------------------------------------------
  | Exact confirmed active-source signal
  |--------------------------------------------------------------------------
  */

  const records =
    await Telemetry.find({
      source: "VRM",

      installation: {
        $in:
          installationIds,
      },

      vrmAttributeId: 471,

      timestamp: {
        $gte: from,
        $lte: now,
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
      })
      .lean();


  const byInstallation =
    new Map();


  for (
    const record
    of records
  ) {
    const key =
      String(
        record.installation
      );


    if (
      !byInstallation.has(
        key
      )
    ) {
      byInstallation.set(
        key,
        []
      );
    }


    byInstallation
      .get(key)
      .push(record);
  }


  const episodes = [];


  for (
    const [
      installationId,
      siteRecords,
    ]
    of byInstallation
  ) {
    const installation =
      installationMap.get(
        installationId
      );


    const detected =
      detectGridInterruptionEpisodes({
        records:
          siteRecords,

        installation:
          installation?._id ??
          null,

        site:
          installation?.site ??
          null,

        minimumDurationSeconds:
          60,
      });


    for (
      const episode
      of detected.episodes
    ) {
      episodes.push({
        ...episode,

        _displaySite:
          installation?.vrmSiteId ??
          null,

        _displayName:
          installation?.name ??
          null,
      });
    }
  }


  /*
  |--------------------------------------------------------------------------
  | Remove display-only values before persistence mapping
  |--------------------------------------------------------------------------
  */

  const persistable =
    episodes.map(
      ({
        _displaySite,
        _displayName,
        ...episode
      }) => episode
    );


  const result =
    await persistGridEpisodes(
      persistable,
      {
        dryRun: true,
      }
    );


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "DRY-RUN RESULT"
  );
  console.log(
    "================================================"
  );


  console.log(
    `Detected episodes: ${episodes.length}`
  );


  console.log(
    JSON.stringify(
      result.summary,
      null,
      2
    )
  );


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "EVENT PREVIEW"
  );
  console.log(
    "================================================"
  );


  for (
    let index = 0;
    index <
    episodes.length;
    index += 1
  ) {
    const episode =
      episodes[index];

    const persistence =
      result.results[index];


    console.log("");

    console.log(
      `Site: ${episode._displaySite ?? "--"} | ${episode._displayName ?? "--"}`
    );

    console.log(
      `Action: ${persistence.action}`
    );

    console.log(
      `Start: ${episode.startTime.toISOString()}`
    );

    console.log(
      `Status: ${episode.status}`
    );

    console.log(
      `Restoration: ${
        episode.restorationTime
          ? episode.restorationTime.toISOString()
          : "--"
      }`
    );

    console.log(
      `Duration: ${
        Number.isFinite(
          episode.durationSeconds
        )
          ? `${episode.durationSeconds}s`
          : "OPEN"
      }`
    );

    console.log(
      `Confidence: ${episode.confidence}`
    );

    console.log(
      `Detection method: ACTIVE_SOURCE_TRANSITION`
    );

    console.log(
      `Load interruption confirmed: ${episode.loadInterruptionConfirmed}`
    );

    console.log(
      `Grid electrical absence confirmed: ${episode.gridElectricalAbsenceConfirmed}`
    );


    if (
      persistence.matchedBy
    ) {
      console.log(
        `Matched existing by: ${persistence.matchedBy}`
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
    "No OutageEvent records were created or updated."
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
    "Outage persistence validation failed:"
  );

  console.error(
    error
  );

  process.exitCode = 1;
} finally {
  await mongoose.disconnect();

  console.log("");

  console.log(
    "MongoDB disconnected."
  );
}