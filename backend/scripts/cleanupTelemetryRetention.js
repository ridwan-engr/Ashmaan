import dns from "node:dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

const RETENTION_DAYS = 3;

const EXECUTE =
  process.argv.includes("--execute");

const BATCH_SIZE = 5000;

const mongoUri =
  process.env.MONGODB_URI?.trim();

if (!mongoUri) {
  throw new Error(
    "MONGODB_URI is missing"
  );
}

function cutoffDate() {
  return new Date(
    Date.now() -
      RETENTION_DAYS *
        24 *
        60 *
        60 *
        1000
  );
}

console.log("");
console.log(
  "================================================"
);
console.log(
  "ASHMAAN TELEMETRY RETENTION CLEANUP"
);
console.log(
  "================================================"
);
console.log("");

console.log(
  `Retention: last ${RETENTION_DAYS} days`
);

console.log(
  `Mode: ${EXECUTE ? "EXECUTE" : "DRY RUN"}`
);

console.log("");

try {
  await mongoose.connect(
    mongoUri,
    {
      serverSelectionTimeoutMS:
        10000,

      connectTimeoutMS:
        10000,
    }
  );

  console.log(
    `Connected database: ${mongoose.connection.name}`
  );

  const telemetry =
    mongoose.connection.db.collection(
      "telemetries"
    );

  const cutoff =
    cutoffDate();

  console.log(
    `Cutoff timestamp: ${cutoff.toISOString()}`
  );

  console.log("");

  const totalBefore =
    await telemetry
      .estimatedDocumentCount();

  const deleteCandidateCount =
    await telemetry.countDocuments({
      timestamp: {
        $lt:
          cutoff,
      },
    });

  const retainedCount =
    await telemetry.countDocuments({
      timestamp: {
        $gte:
          cutoff,
      },
    });

  console.log(
    `Total telemetry before : ${totalBefore}`
  );

  console.log(
    `Delete candidates       : ${deleteCandidateCount}`
  );

  console.log(
    `Expected retained       : ${retainedCount}`
  );

  console.log("");

  if (!EXECUTE) {
    console.log(
      "DRY RUN ONLY."
    );

    console.log(
      "No telemetry documents were modified."
    );

    console.log("");

    console.log(
      "If these counts are acceptable, run:"
    );

    console.log("");

    console.log(
      "node .\\scripts\\cleanupTelemetryRetention.js --execute"
    );

    process.exitCode = 0;
  } else {
    if (
      deleteCandidateCount === 0
    ) {
      console.log(
        "No telemetry records require deletion."
      );
    } else {
      console.log(
        "Starting controlled batched deletion..."
      );

      console.log("");

      let deletedTotal =
        0;

      let batchNumber =
        0;

      while (true) {
        /*
         * Select only _id values for the next
         * retention batch.
         */
        const candidates =
          await telemetry
            .find(
              {
                timestamp: {
                  $lt:
                    cutoff,
                },
              },
              {
                projection: {
                  _id:
                    1,
                },
              }
            )
            .limit(
              BATCH_SIZE
            )
            .toArray();

        if (
          candidates.length === 0
        ) {
          break;
        }

        const ids =
          candidates.map(
            (record) =>
              record._id
          );

        const result =
          await telemetry.deleteMany({
            _id: {
              $in:
                ids,
            },
          });

        batchNumber +=
          1;

        deletedTotal +=
          result.deletedCount;

        console.log(
          `Batch ${batchNumber}: deleted ${result.deletedCount}; cumulative=${deletedTotal}`
        );

        if (
          result.deletedCount === 0
        ) {
          throw new Error(
            "Deletion made no progress; aborting to avoid infinite loop."
          );
        }
      }

      console.log("");
      console.log(
        `Deletion complete: ${deletedTotal} telemetry documents removed`
      );
    }

    const totalAfter =
      await telemetry
        .estimatedDocumentCount();

    const staleAfter =
      await telemetry.countDocuments({
        timestamp: {
          $lt:
            cutoff,
        },
      });

    console.log("");
    console.log(
      `Telemetry after cleanup : ${totalAfter}`
    );

    console.log(
      `Older than cutoff remain : ${staleAfter}`
    );

    if (
      staleAfter !== 0
    ) {
      throw new Error(
        `${staleAfter} telemetry documents older than cutoff remain`
      );
    }

    console.log("");
    console.log(
      "==============================================="
    );

    console.log(
      "ASHMAAN TELEMETRY RETENTION CLEANUP PASSED"
    );

    console.log(
      "==============================================="
    );
  }
} catch (error) {
  console.error("");
  console.error(
    "==============================================="
  );

  console.error(
    "ASHMAAN TELEMETRY RETENTION CLEANUP FAILED"
  );

  console.error(
    "==============================================="
  );

  console.error(
    error?.stack ??
      error
  );

  process.exitCode =
    1;
} finally {
  if (
    mongoose.connection.readyState !==
    0
  ) {
    await mongoose.disconnect();
  }
}