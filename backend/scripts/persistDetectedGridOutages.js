// backend/scripts/persistDetectedGridOutages.js

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
    "ASHMAAN GRID OUTAGE EVENT PERSISTENCE"
  );
  console.log(
    "================================================"
  );

  console.log(
    "Mode: WRITE"
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


  /*
  |--------------------------------------------------------------------------
  | Eligible installations
  |--------------------------------------------------------------------------
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
  | Exact confirmed active-source telemetry
  |--------------------------------------------------------------------------
  |
  | vrmAttributeId 471:
  |
  | /Ac/ActiveIn/Source
  |
  | 0   Not available
  | 1   Grid
  | 2   Generator
  | 3   Shore
  | 240 Inverting
  |
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


  /*
  |--------------------------------------------------------------------------
  | Group telemetry per installation
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | Detect episodes
  |--------------------------------------------------------------------------
  */

  const episodes = [];

  const displayMap =
    [];


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
      episodes.push(
        episode
      );


      displayMap.push({
        vrmSiteId:
          installation?.vrmSiteId ??
          null,

        name:
          installation?.name ??
          null,
      });
    }
  }


  /*
  |--------------------------------------------------------------------------
  | Persist
  |--------------------------------------------------------------------------
  */

  const persistence =
    await persistGridEpisodes(
      episodes,
      {
        dryRun: false,
      }
    );


  /*
  |--------------------------------------------------------------------------
  | Result
  |--------------------------------------------------------------------------
  */

  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "PERSISTENCE SUMMARY"
  );
  console.log(
    "================================================"
  );


  console.log(
    `Detected episodes: ${episodes.length}`
  );


  console.log(
    JSON.stringify(
      persistence.summary,
      null,
      2
    )
  );


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "PERSISTED EVENT DETAILS"
  );
  console.log(
    "================================================"
  );


  for (
    let index = 0;
    index <
    persistence.results.length;
    index += 1
  ) {
    const result =
      persistence.results[index];

    const episode =
      episodes[index];

    const display =
      displayMap[index];


    console.log("");

    console.log(
      `Site: ${display?.vrmSiteId ?? "--"} | ${display?.name ?? "--"}`
    );

    console.log(
      `Action: ${result.action}`
    );


    if (
      result.matchedBy
    ) {
      console.log(
        `Matched by: ${result.matchedBy}`
      );
    }


    console.log(
      `Start: ${
        episode?.startTime
          ? episode.startTime.toISOString()
          : "--"
      }`
    );

    console.log(
      `Status: ${episode?.status ?? "--"}`
    );


    if (
      result.event?._id
    ) {
      console.log(
        `OutageEvent ID: ${result.event._id}`
      );
    }
  }


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "WRITE COMPLETE"
  );
  console.log(
    "================================================"
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
    "Grid outage persistence failed:"
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