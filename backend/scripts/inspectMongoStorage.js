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
  throw new Error(
    "MONGODB_URI is missing"
  );
}

function mb(bytes) {
  if (
    typeof bytes !== "number" ||
    !Number.isFinite(bytes)
  ) {
    return null;
  }

  return Number(
    (
      bytes /
      1024 /
      1024
    ).toFixed(2)
  );
}

console.log("");
console.log("===============================================");
console.log("ASHMAAN MONGODB ATLAS STORAGE INSPECTION");
console.log("===============================================");
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

  console.log("");

  const db =
    mongoose.connection.db;

  const collections =
    await db
      .listCollections(
        {},
        {
          nameOnly:
            true,
        }
      )
      .toArray();

  const results =
    [];

  for (
    const item of collections
  ) {
    const name =
      item.name;

    const collection =
      db.collection(
        name
      );

    let estimatedCount =
      null;

    let dataSizeMb =
      null;

    let storageSizeMb =
      null;

    let totalIndexSizeMb =
      null;

    let totalSizeMb =
      null;

    let statsError =
      null;

    try {
      estimatedCount =
        await collection
          .estimatedDocumentCount();
    } catch (error) {
      estimatedCount =
        null;
    }

    try {
      const stats =
        await db.command({
          collStats:
            name,
        });

      dataSizeMb =
        mb(
          stats.size
        );

      storageSizeMb =
        mb(
          stats.storageSize
        );

      totalIndexSizeMb =
        mb(
          stats.totalIndexSize
        );

      totalSizeMb =
        mb(
          (
            stats.storageSize ??
            0
          ) +
          (
            stats.totalIndexSize ??
            0
          )
        );
    } catch (error) {
      statsError =
        error?.message ??
        String(error);
    }

    results.push({
      collection:
        name,

      estimatedDocuments:
        estimatedCount,

      dataSizeMB:
        dataSizeMb,

      storageSizeMB:
        storageSizeMb,

      indexSizeMB:
        totalIndexSizeMb,

      totalStorageMB:
        totalSizeMb,

      statsAvailable:
        statsError === null,

      statsError,
    });
  }

  results.sort(
    (
      a,
      b
    ) =>
      (
        b.totalStorageMB ??
        b.dataSizeMB ??
        -1
      ) -
      (
        a.totalStorageMB ??
        a.dataSizeMB ??
        -1
      )
  );

  console.table(
    results.map(
      ({
        collection,
        estimatedDocuments,
        dataSizeMB,
        storageSizeMB,
        indexSizeMB,
        totalStorageMB,
        statsAvailable,
      }) => ({
        collection,
        documents:
          estimatedDocuments,

        dataMB:
          dataSizeMB,

        storageMB:
          storageSizeMB,

        indexesMB:
          indexSizeMB,

        totalMB:
          totalStorageMB,

        stats:
          statsAvailable
            ? "OK"
            : "UNAVAILABLE",
      })
    )
  );

  console.log("");
  console.log(
    "IMPORTANT: This script is READ-ONLY."
  );

  console.log(
    "No documents, collections, or indexes were modified."
  );

  const unavailableStats =
    results.filter(
      (item) =>
        !item.statsAvailable
    );

  if (
    unavailableStats.length
  ) {
    console.log("");
    console.log(
      "Collection statistics unavailable for:"
    );

    for (
      const item of unavailableStats
    ) {
      console.log(
        `- ${item.collection}: ${item.statsError}`
      );
    }
  }
} catch (error) {
  console.error("");
  console.error(
    "STORAGE INSPECTION FAILED"
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