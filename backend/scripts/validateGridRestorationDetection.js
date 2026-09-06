// backend/scripts/validateGridRestorationDetection.js

import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import Installation from "../models/Installation.js";
import Telemetry from "../models/Telemetry.js";

import {
  detectGridInterruptionEpisodes,
  summarizeGridEpisodes,
} from "../services/events/gridRestorationDetector.js";


dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


const LOOKBACK_DAYS =
  Number(
    process.env.GRID_RESTORATION_LOOKBACK_DAYS
  ) || 30;


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
    "ASHMAAN GRID RESTORATION VALIDATION"
  );
  console.log(
    "================================================"
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
  | Exact confirmed signal only
  |--------------------------------------------------------------------------
  */

  const records =
    await Telemetry.find({
      installation: {
        $in: installationIds,
      },

      source: "VRM",

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


  const allEpisodes = [];


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "GRID INTERRUPTION EPISODES"
  );
  console.log(
    "================================================"
  );


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


    const {
      episodes,
      diagnostics,
    } =
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


    if (
      episodes.length === 0
    ) {
      continue;
    }


    console.log("");
    console.log(
      `Site: ${installation?.vrmSiteId ?? "--"} | ${installation?.name ?? "--"}`
    );

    console.log(
      `Transitions: ${diagnostics.transitions}`
    );

    console.log(
      `Episodes: ${episodes.length}`
    );


    for (
      const episode
      of episodes
    ) {
      allEpisodes.push({
        ...episode,

        vrmSiteId:
          installation?.vrmSiteId ??
          null,

        installationName:
          installation?.name ??
          null,
      });


      console.log("");
      console.log(
        `  Start: ${episode.startTime.toISOString()}`
      );

      console.log(
        `  First alternate source: ${episode.firstAlternativeSourceName}`
      );

      console.log(
        `  Status: ${episode.status}`
      );


      if (
        episode.restorationTime
      ) {
        console.log(
          `  Restored: ${episode.restorationTime.toISOString()}`
        );
      } else {
        console.log(
          "  Restored: --"
        );
      }


      if (
        Number.isFinite(
          episode.durationSeconds
        )
      ) {
        console.log(
          `  Duration: ${episode.durationSeconds}s (${(
            episode.durationSeconds /
            60
          ).toFixed(2)} min)`
        );
      } else {
        console.log(
          "  Duration: OPEN"
        );
      }


      console.log(
        `  Confidence: ${episode.confidenceLevel} (${episode.confidence})`
      );


      console.log(
        `  Intermediate source transitions: ${episode.intermediateTransitions.length}`
      );


      for (
        const transition
        of episode.intermediateTransitions
      ) {
        console.log(
          `    ${transition.fromName} -> ${transition.toName} @ ${transition.timestamp.toISOString()}`
        );
      }
    }
  }


  const summary =
    summarizeGridEpisodes(
      allEpisodes
    );


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "RESTORATION SUMMARY"
  );
  console.log(
    "================================================"
  );


  console.log(
    `Active-source records: ${records.length}`
  );

  console.log(
    `Sites with active-source data: ${byInstallation.size}`
  );

  console.log(
    `Grid-interruption episodes: ${summary.total}`
  );

  console.log(
    `Restored episodes: ${summary.restored}`
  );

  console.log(
    `Open episodes: ${summary.open}`
  );

  console.log(
    `Total restored duration: ${(summary.totalDurationSeconds / 60).toFixed(2)} minutes`
  );


  console.log("");
  console.log(
    "No OutageEvent records were created."
  );
}


try {
  await run();
} catch (error) {
  console.error("");
  console.error(
    "Grid restoration validation failed:"
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