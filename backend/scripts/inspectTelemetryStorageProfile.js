import mongoose from "mongoose";

import connectDatabase
  from "../config/database.js";

const main =
  async () => {
    console.log(
      "=================================================="
    );

    console.log(
      "ASHMAAN TELEMETRY STORAGE PROFILE"
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


    const telemetry =
      db.collection(
        "telemetries"
      );


    /*
    |--------------------------------------------------------------------------
    | Overall telemetry population
    |--------------------------------------------------------------------------
    */

    const totalCount =
      await telemetry.estimatedDocumentCount();


    const oldest =
      await telemetry.findOne(
        {},
        {
          projection: {
            timestamp:
              1,

            installation:
              1,

            vrmAttributeId:
              1,
          },

          sort: {
            timestamp:
              1,
          },
        }
      );


    const newest =
      await telemetry.findOne(
        {},
        {
          projection: {
            timestamp:
              1,

            installation:
              1,

            vrmAttributeId:
              1,
          },

          sort: {
            timestamp:
              -1,
          },
        }
      );


    console.log(
      "TELEMETRY POPULATION"
    );

    console.log(
      `Documents : ${totalCount}`
    );

    console.log(
      `Oldest    : ${oldest?.timestamp ?? "UNKNOWN"}`
    );

    console.log(
      `Newest    : ${newest?.timestamp ?? "UNKNOWN"}`
    );

    console.log();


    /*
    |--------------------------------------------------------------------------
    | Retention-age profile
    |--------------------------------------------------------------------------
    */

    const now =
      new Date();


    const retentionWindows =
      [
        7,
        14,
        30,
        60,
        90,
        180,
        365,
      ];


    const retentionResults =
      [];


    for (
      const days
      of retentionWindows
    ) {
      const cutoff =
        new Date(
          now.getTime() -
          days *
            24 *
            60 *
            60 *
            1000
        );


      const newerThanCutoff =
        await telemetry.countDocuments({
          timestamp: {
            $gte:
              cutoff,
          },
        });


      const olderThanCutoff =
        totalCount -
        newerThanCutoff;


      retentionResults.push({
        window:
          `${days} days`,

        cutoff:
          cutoff.toISOString(),

        retained:
          newerThanCutoff,

        older:
          olderThanCutoff,

        olderPercent:
          totalCount > 0
            ? Number(
                (
                  olderThanCutoff /
                  totalCount *
                  100
                ).toFixed(
                  2
                )
              )
            : 0,
      });
    }


    console.log(
      "AGE PROFILE"
    );

    console.log();


    console.table(
      retentionResults
    );


    /*
    |--------------------------------------------------------------------------
    | Telemetry indexes
    |--------------------------------------------------------------------------
    */

    const indexes =
      await telemetry
        .listIndexes()
        .toArray();


    console.log();

    console.log(
      "TELEMETRY INDEX DEFINITIONS"
    );

    console.log();


    for (
      const index
      of indexes
    ) {
      console.log(
        JSON.stringify(
          {
            name:
              index.name,

            key:
              index.key,

            unique:
              index.unique ===
              true,

            sparse:
              index.sparse ===
              true,

            partialFilterExpression:
              index.partialFilterExpression ??
              null,
          },
          null,
          2
        )
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Index sizes
    |--------------------------------------------------------------------------
    */

    try {
      const stats =
        await db.command({
          collStats:
            "telemetries",

          scale:
            1,
        });


      const indexSizes =
        stats.indexSizes ??
        {};


      const indexRows =
        Object.entries(
          indexSizes
        )
          .map(
            (
              [
                name,
                bytes,
              ]
            ) => ({
              index:
                name,

              sizeMB:
                Number(
                  (
                    Number(bytes) /
                    1024 /
                    1024
                  ).toFixed(
                    2
                  )
                ),
            })
          )
          .sort(
            (
              left,
              right
            ) =>
              right.sizeMB -
              left.sizeMB
          );


      console.log();

      console.log(
        "TELEMETRY INDEX SIZES"
      );

      console.log();


      console.table(
        indexRows
      );
    } catch (
      error
    ) {
      console.warn(
        `[Telemetry Storage Profile] Index-size inspection unavailable: ${
          error instanceof Error
            ? error.message
            : String(
                error
              )
        }`
      );
    }


    console.log();

    console.log(
      "No documents or indexes were modified."
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
    "[Telemetry Storage Profile] FAILED:",
    error instanceof Error
      ? error.message
      : String(
          error
        )
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
    error
  ) {
    console.error(
      "[Telemetry Storage Profile] Disconnect failed:",
      error instanceof Error
        ? error.message
        : String(
            error
          )
    );

    process.exitCode =
      1;
  }
}
