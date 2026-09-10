import dns from "node:dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

const mongoUri =
  process.env.MONGODB_URI?.trim();

if (!mongoUri) {
  throw new Error("MONGODB_URI is missing");
}

console.log("");
console.log("================================================");
console.log("ASHMAAN TELEMETRY RETENTION INSPECTION");
console.log("================================================");
console.log("");

try {
  await mongoose.connect(
    mongoUri,
    {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    }
  );

  const db =
    mongoose.connection.db;

  const telemetry =
    db.collection("telemetries");

  const count =
    await telemetry.estimatedDocumentCount();

  console.log(
    `Telemetry documents: ${count}`
  );

  /*
   * Inspect one sample first so we know the actual
   * timestamp field names present in production.
   */
  const sample =
    await telemetry.findOne({});

  console.log("");
  console.log("Sample telemetry keys:");
  console.log(
    Object.keys(sample ?? {}).sort()
  );

  /*
   * Probe common timestamp candidates without
   * assuming the schema.
   */
  const timestampCandidates = [
    "timestamp",
    "recordedAt",
    "createdAt",
    "updatedAt",
    "time",
    "datetime",
  ];

  console.log("");
  console.log("Timestamp field inspection:");
  console.log("");

  for (
    const field of timestampCandidates
  ) {
    const existing =
      await telemetry.countDocuments({
        [field]: {
          $exists: true,
          $ne: null,
        },
      });

    if (
      existing === 0
    ) {
      continue;
    }

    const oldest =
      await telemetry
        .find({
          [field]: {
            $exists: true,
            $ne: null,
          },
        })
        .sort({
          [field]: 1,
        })
        .limit(1)
        .toArray();

    const newest =
      await telemetry
        .find({
          [field]: {
            $exists: true,
            $ne: null,
          },
        })
        .sort({
          [field]: -1,
        })
        .limit(1)
        .toArray();

    console.log(
      `${field}:`
    );

    console.log(
      `  documents = ${existing}`
    );

    console.log(
      `  oldest    = ${oldest?.[0]?.[field] ?? null}`
    );

    console.log(
      `  newest    = ${newest?.[0]?.[field] ?? null}`
    );

    console.log("");
  }

  /*
   * Index inventory.
   */
  const indexes =
    await telemetry
      .indexes();

  console.log("Telemetry indexes:");
  console.table(
    indexes.map(
      (index) => ({
        name:
          index.name,

        key:
          JSON.stringify(
            index.key
          ),

        unique:
          index.unique === true,

        sparse:
          index.sparse === true,

        partial:
          Boolean(
            index.partialFilterExpression
          ),
      })
    )
  );

  /*
   * Approximate age buckets based on timestamp,
   * only if timestamp exists.
   */
  const timestampExists =
    await telemetry.countDocuments(
      {
        timestamp: {
          $exists: true,
          $ne: null,
        },
      },
      {
        limit: 1,
      }
    );

  if (
    timestampExists
  ) {
    const now =
      new Date();

    const daysAgo =
      (days) =>
        new Date(
          now.getTime() -
          days *
            24 *
            60 *
            60 *
            1000
        );

    const buckets = [
      1,
      3,
      7,
      14,
      30,
      60,
      90,
    ];

    console.log("");
    console.log(
      "Telemetry retention counts using timestamp:"
    );

    console.log("");

    for (
      const days of buckets
    ) {
      const cutoff =
        daysAgo(days);

      const recent =
        await telemetry.countDocuments({
          timestamp: {
            $gte:
              cutoff,
          },
        });

      const older =
        await telemetry.countDocuments({
          timestamp: {
            $lt:
              cutoff,
          },
        });

      console.log(
        `${days} days: recent=${recent}, older=${older}, cutoff=${cutoff.toISOString()}`
      );
    }
  }

  console.log("");
  console.log(
    "IMPORTANT: inspection only — no telemetry was deleted or modified."
  );
} catch (error) {
  console.error("");
  console.error(
    "TELEMETRY RETENTION INSPECTION FAILED"
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