import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import OutageEvent from "../models/OutageEvent.js";
import Installation from "../models/Installation.js";

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);


function formatValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "null";
  }

  return String(value);
}


async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not defined."
    );
  }

  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ASHMAAN ENS PERSISTENCE AUDIT"
  );
  console.log(
    "================================================"
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
        $in: installationIds,
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

    metadataPresent: 0,
    metadataMissing: 0,

    eligibleTrue: 0,
    eligibleFalse: 0,

    interruptionTrue: 0,
    interruptionFalse: 0,

    ensNull: 0,
    ensNumeric: 0,

    qualifiedStatus: 0,

    inconsistentEligibleWithoutEns: 0,
    inconsistentEnsWithoutEligible: 0,
    inconsistentQualifiedWithoutInterruption: 0,

    errors: 0,
  };


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ENS AUDIT RESULTS"
  );
  console.log(
    "================================================"
  );


  for (const event of events) {
    summary.total += 1;

    const installation =
      installationMap.get(
        String(
          event.installation
        )
      );


    const metadata =
      event.raw
        ?.ensQualification;


    const eligible =
      event.raw
        ?.eligibleForEns === true;


    const interruption =
      event.raw
        ?.loadInterruptionConfirmed ===
      true;


    const hasEns =
      event.energyNotSuppliedKwh !==
        null &&
      event.energyNotSuppliedKwh !==
        undefined &&
      Number.isFinite(
        Number(
          event.energyNotSuppliedKwh
        )
      );


    const status =
      metadata
        ?.qualificationStatus ??
      null;


    if (metadata) {
      summary.metadataPresent += 1;
    } else {
      summary.metadataMissing += 1;
    }


    if (eligible) {
      summary.eligibleTrue += 1;
    } else {
      summary.eligibleFalse += 1;
    }


    if (interruption) {
      summary.interruptionTrue += 1;
    } else {
      summary.interruptionFalse += 1;
    }


    if (hasEns) {
      summary.ensNumeric += 1;
    } else {
      summary.ensNull += 1;
    }


    if (
      status ===
      "QUALIFIED_ESTIMATE"
    ) {
      summary.qualifiedStatus += 1;
    }


    const inconsistencies = [];


    if (
      eligible &&
      !hasEns
    ) {
      summary
        .inconsistentEligibleWithoutEns +=
        1;

      inconsistencies.push(
        "eligibleForEns=true but ENS is null"
      );
    }


    if (
      hasEns &&
      !eligible
    ) {
      summary
        .inconsistentEnsWithoutEligible +=
        1;

      inconsistencies.push(
        "ENS exists but eligibleForEns=false"
      );
    }


    if (
      status ===
        "QUALIFIED_ESTIMATE" &&
      !interruption
    ) {
      summary
        .inconsistentQualifiedWithoutInterruption +=
        1;

      inconsistencies.push(
        "QUALIFIED_ESTIMATE without confirmed interruption"
      );
    }


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
      `ENS: ${formatValue(
        event.energyNotSuppliedKwh
      )}`
    );

    console.log(
      `Qualification status: ${status ?? "--"}`
    );

    console.log(
      `eligibleForEns: ${eligible}`
    );

    console.log(
      `loadInterruptionConfirmed: ${interruption}`
    );

    console.log(
      `Raw estimated ENS: ${formatValue(
        metadata
          ?.rawEstimatedEnsKwh
      )}`
    );

    console.log(
      `Qualified ENS: ${formatValue(
        metadata
          ?.qualifiedEnsKwh
      )}`
    );

    console.log(
      `Baseline samples: ${formatValue(
        metadata
          ?.baselineSampleCount
      )}`
    );

    console.log(
      `Outage samples: ${formatValue(
        metadata
          ?.outageSampleCount
      )}`
    );


    if (
      inconsistencies.length
    ) {
      summary.errors += 1;

      console.log(
        `INCONSISTENCY: ${inconsistencies.join(
          "; "
        )}`
      );
    } else {
      console.log(
        "Consistency: OK"
      );
    }
  }


  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ENS PERSISTENCE AUDIT SUMMARY"
  );
  console.log(
    "================================================"
  );

  console.log(
    `Total events: ${summary.total}`
  );

  console.log(
    `ENS metadata present: ${summary.metadataPresent}`
  );

  console.log(
    `ENS metadata missing: ${summary.metadataMissing}`
  );

  console.log(
    `eligibleForEns = true: ${summary.eligibleTrue}`
  );

  console.log(
    `eligibleForEns = false: ${summary.eligibleFalse}`
  );

  console.log(
    `loadInterruptionConfirmed = true: ${summary.interruptionTrue}`
  );

  console.log(
    `loadInterruptionConfirmed = false: ${summary.interruptionFalse}`
  );

  console.log(
    `ENS null: ${summary.ensNull}`
  );

  console.log(
    `ENS numeric: ${summary.ensNumeric}`
  );

  console.log(
    `QUALIFIED_ESTIMATE status: ${summary.qualifiedStatus}`
  );

  console.log(
    `Eligible without ENS: ${summary.inconsistentEligibleWithoutEns}`
  );

  console.log(
    `ENS without eligibility: ${summary.inconsistentEnsWithoutEligible}`
  );

  console.log(
    `Qualified without interruption: ${summary.inconsistentQualifiedWithoutInterruption}`
  );

  console.log(
    `Events with inconsistencies: ${summary.errors}`
  );
}


try {
  await run();
} catch (error) {
  console.error("");
  console.error(
    "ENS persistence audit failed:"
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