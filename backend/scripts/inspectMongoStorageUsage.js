import mongoose from "mongoose";

import connectDatabase
  from "../config/database.js";

const BYTES_PER_MB =
  1024 * 1024;

const toMb =
  (bytes) => {
    const value =
      Number(bytes);

    if (
      !Number.isFinite(value)
    ) {
      return 0;
    }

    return Number(
      (
        value /
        BYTES_PER_MB
      ).toFixed(2)
    );
  };

const main =
  async () => {
    console.log(
      "=================================================="
    );

    console.log(
      "ASHMAAN MONGODB STORAGE INSPECTION"
    );

    console.log(
      "=================================================="
    );

    console.log(
      "MODE: READ-ONLY"
    );

    console.log();


    await connectDatabase();


    const db =
      mongoose.connection.db;

    if (
      !db
    ) {
      throw new Error(
        "MongoDB database handle is unavailable."
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Database-level statistics
    |--------------------------------------------------------------------------
    */

    try {
      const databaseStats =
        await db.command({
          dbStats:
            1,

          scale:
            1,
        });


      console.log(
        "DATABASE"
      );

      console.log(
        `Name       : ${db.databaseName}`
      );

      console.log(
        `Collections: ${databaseStats.collections ?? "UNKNOWN"}`
      );

      console.log(
        `Objects    : ${databaseStats.objects ?? "UNKNOWN"}`
      );

      console.log(
        `Data size  : ${toMb(databaseStats.dataSize)} MB`
      );

      console.log(
        `Storage    : ${toMb(databaseStats.storageSize)} MB`
      );

      console.log(
        `Indexes    : ${toMb(databaseStats.indexSize)} MB`
      );

      console.log(
        `Total est. : ${toMb(
          Number(
            databaseStats.storageSize ||
            0
          ) +
          Number(
            databaseStats.indexSize ||
            0
          )
        )} MB`
      );

      console.log();
    } catch (
      error
    ) {
      console.warn(
        `[Mongo Storage Inspection] dbStats unavailable: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );

      console.log();
    }


    /*
    |--------------------------------------------------------------------------
    | Collection discovery
    |--------------------------------------------------------------------------
    */

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


    /*
    |--------------------------------------------------------------------------
    | Per-collection statistics
    |--------------------------------------------------------------------------
    */

    for (
      const collectionInfo
      of collections
    ) {
      const collectionName =
        collectionInfo.name;

      try {
        const stats =
          await db.command({
            collStats:
              collectionName,

            scale:
              1,
          });


        const storageBytes =
          Number(
            stats.storageSize ||
            0
          );

        const indexBytes =
          Number(
            stats.totalIndexSize ||
            0
          );


        results.push({
          collection:
            collectionName,

          count:
            Number(
              stats.count ||
              0
            ),

          dataMB:
            toMb(
              stats.size
            ),

          storageMB:
            toMb(
              storageBytes
            ),

          indexesMB:
            toMb(
              indexBytes
            ),

          totalMB:
            toMb(
              storageBytes +
              indexBytes
            ),
        });
      } catch (
        error
      ) {
        results.push({
          collection:
            collectionName,

          count:
            null,

          dataMB:
            null,

          storageMB:
            null,

          indexesMB:
            null,

          totalMB:
            null,

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
          right.totalMB ||
          0
        ) -
        Number(
          left.totalMB ||
          0
        )
    );


    console.log(
      "COLLECTION STORAGE"
    );

    console.log();


    console.table(
      results
    );


    const totals =
      results.reduce(
        (
          accumulator,
          current
        ) => {
          accumulator.storageMB +=
            Number(
              current.storageMB ||
              0
            );

          accumulator.indexesMB +=
            Number(
              current.indexesMB ||
              0
            );

          accumulator.totalMB +=
            Number(
              current.totalMB ||
              0
            );

          return accumulator;
        },
        {
          storageMB:
            0,

          indexesMB:
            0,

          totalMB:
            0,
        }
      );


    console.log();

    console.log(
      "COLLECTION TOTALS"
    );

    console.log(
      `Storage : ${totals.storageMB.toFixed(2)} MB`
    );

    console.log(
      `Indexes : ${totals.indexesMB.toFixed(2)} MB`
    );

    console.log(
      `Total   : ${totals.totalMB.toFixed(2)} MB`
    );


    console.log();

    console.log(
      "No documents, collections, or indexes were modified."
    );

    console.log(
      "=================================================="
    );
  };


try {
  await main();
} catch (
  error
) {
  console.error(
    "[Mongo Storage Inspection] FAILED:",
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exitCode =
    1;
} finally {
  try {
    if (
      mongoose
        .connection
        .readyState !==
      0
    ) {
      await mongoose.disconnect();
    }
  } catch (
    disconnectError
  ) {
    console.error(
      "[Mongo Storage Inspection] Disconnect failed:",
      disconnectError instanceof Error
        ? disconnectError.message
        : String(disconnectError)
    );

    process.exitCode =
      1;
  }
}
