// backend/scripts/auditOutageEvents.js

import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import OutageEvent from "../models/OutageEvent.js";
import Installation from "../models/Installation.js";


dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


async function run() {
  if (
    !process.env.MONGODB_URI
  ) {
    throw new Error(
      "MONGODB_URI is not defined."
    );
  }


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
      events
        .map(
          (event) =>
            event.installation
        )
        .filter(Boolean)
        .map(String)
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
  | Duplicate audit
  |--------------------------------------------------------------------------
  */

  const identityCounts =
    new Map();


  for (
    const event
    of events
  ) {
    const key = [
      String(
        event.installation
      ),

      event.eventType,

      new Date(
        event.startTime
      ).toISOString(),
    ].join("|");


    identityCounts.set(
      key,
      (
        identityCounts.get(
          key
        ) || 0
      ) + 1
    );
  }


  const duplicates =
    [...identityCounts.entries()]
      .filter(
        ([, count]) =>
          count > 1
      );


  const open =
    events.filter(
      (event) =>
        event.status ===
        "OPEN"
    );


  const restored =
    events.filter(
      (event) =>
        event.status ===
        "RESTORED"
    );


  console.log("");
  console.log(
    "================================================"
  );

  console.log(
    "OUTAGE EVENT AUDIT"
  );

  console.log(
    "================================================"
  );


  console.log(
    `Total derived grid events: ${events.length}`
  );

  console.log(
    `Restored: ${restored.length}`
  );

  console.log(
    `Open: ${open.length}`
  );

  console.log(
    `Duplicate identities: ${duplicates.length}`
  );


  console.log("");
  console.log(
    "================================================"
  );

  console.log(
    "EVENT DETAILS"
  );

  console.log(
    "================================================"
  );


  for (
    const event
    of events
  ) {
    const installation =
      installationMap.get(
        String(
          event.installation
        )
      );


    console.log("");

    console.log(
      `Site: ${installation?.vrmSiteId ?? "--"} | ${installation?.name ?? "--"}`
    );

    console.log(
      `Event ID: ${event._id}`
    );

    console.log(
      `Start: ${new Date(event.startTime).toISOString()}`
    );

    console.log(
      `Status: ${event.status}`
    );

    console.log(
      `Restoration: ${
        event.restorationTime
          ? new Date(
              event.restorationTime
            ).toISOString()
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
      `Confidence: ${event.confidence}`
    );

    console.log(
      `SAIDI/SAIFI eligible: ${
        event.raw
          ?.eligibleForSaidiSaifi ===
        true
      }`
    );

    console.log(
      `ENS eligible: ${
        event.raw
          ?.eligibleForEns ===
        true
      }`
    );
  }
}


try {
  await run();
} catch (error) {
  console.error("");
  console.error(
    "Outage event audit failed:"
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