import dns from "node:dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);

const formatMB = (bytes = 0) =>
  (Number(bytes) / 1024 / 1024).toFixed(2);

const main = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing.");
    }

    await mongoose.connect(
      process.env.MONGODB_URI,
      {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 15000,
        maxPoolSize: 2,
      }
    );

    console.log("MongoDB connected.");
    console.log(
      `Database: ${mongoose.connection.name}`
    );

    const db =
      mongoose.connection.db;

    const collections =
      await db
        .listCollections(
          {},
          {
            nameOnly: true,
          }
        )
        .toArray();

    const results = [];

    for (
      const collectionInfo
      of collections
    ) {
      const name =
        collectionInfo.name;

      try {
        const stats =
          await db.command({
            collStats: name,
            scale: 1,
          });

        results.push({
          collection:
            name,

          count:
            Number(
              stats.count ?? 0
            ),

          dataMB:
            formatMB(
              stats.size
            ),

          storageMB:
            formatMB(
              stats.storageSize
            ),

          indexesMB:
            formatMB(
              stats.totalIndexSize
            ),

          totalMB:
            formatMB(
              Number(
                stats.storageSize ?? 0
              ) +
              Number(
                stats.totalIndexSize ?? 0
              )
            ),
        });
      } catch (
        error
      ) {
        results.push({
          collection:
            name,

          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    results.sort(
      (
        left,
        right
      ) =>
        Number(
          right.totalMB ?? 0
        ) -
        Number(
          left.totalMB ?? 0
        )
    );

    console.table(
      results
    );

    const dbStats =
      await db.command({
        dbStats: 1,
        scale: 1024 * 1024,
      });

    console.log(
      "\nDatabase totals:"
    );

    console.table({
      collections:
        dbStats.collections,

      objects:
        dbStats.objects,

      dataMB:
        Number(
          dbStats.dataSize ?? 0
        ).toFixed(2),

      storageMB:
        Number(
          dbStats.storageSize ?? 0
        ).toFixed(2),

      indexesMB:
        Number(
          dbStats.indexSize ?? 0
        ).toFixed(2),

      totalMB:
        (
          Number(
            dbStats.storageSize ?? 0
          ) +
          Number(
            dbStats.indexSize ?? 0
          )
        ).toFixed(2),
    });
  } catch (
    error
  ) {
    console.error(
      "Storage inspection failed:",
      error instanceof Error
        ? error.message
        : error
    );

    process.exitCode = 1;
  } finally {
    await mongoose
      .disconnect()
      .catch(() => {});
  }
};

await main();