import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";


import "../config/env.js";

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

dotenv.config();

const MB = 1024 * 1024;

const formatDate = (value) =>
  value
    ? new Date(value).toISOString()
    : null;

const printSection = (title) => {
  console.log(`\n${title}\n`);
};

const main = async () => {
  console.log(
    "=================================================="
  );
  console.log(
    "ASHMAAN TELEMETRY GROWTH FORENSICS"
  );
  console.log(
    "=================================================="
  );
  console.log("MODE: READ-ONLY\n");

  const uri =
    process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is required"
    );
  }

  await mongoose.connect(
    uri,
    {
      autoIndex: false,
    }
  );

  console.log(
    `MongoDB connected: ${mongoose.connection.host}`
  );

  const db =
    mongoose.connection.db;

  const telemetry =
    db.collection(
      "telemetries"
    );

  const now =
    new Date();

  const sevenDaysAgo =
    new Date(
      now.getTime() -
        7 *
          24 *
          60 *
          60 *
          1000
    );

  const fourteenDaysAgo =
    new Date(
      now.getTime() -
        14 *
          24 *
          60 *
          60 *
          1000
    );

  const total =
    await telemetry.countDocuments();

  const latestSevenDays =
    await telemetry.countDocuments({
      timestamp: {
        $gte: sevenDaysAgo,
      },
    });

  const sevenToFourteenDays =
    await telemetry.countDocuments({
      timestamp: {
        $gte: fourteenDaysAgo,
        $lt: sevenDaysAgo,
      },
    });

  const olderThanFourteen =
    await telemetry.countDocuments({
      timestamp: {
        $lt: fourteenDaysAgo,
      },
    });

  printSection(
    "POPULATION"
  );

  console.table([
    {
      population: "TOTAL",
      documents: total,
    },
    {
      population: "0-7 DAYS",
      documents:
        latestSevenDays,
    },
    {
      population: "7-14 DAYS",
      documents:
        sevenToFourteenDays,
    },
    {
      population: ">14 DAYS",
      documents:
        olderThanFourteen,
    },
  ]);

  /*
   * Daily distribution.
   */

  printSection(
    "DAILY TELEMETRY DISTRIBUTION — LAST 21 DAYS"
  );

  const daily =
    await telemetry
      .aggregate([
        {
          $match: {
            timestamp: {
              $gte:
                new Date(
                  now.getTime() -
                    21 *
                      24 *
                      60 *
                      60 *
                      1000
                ),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format:
                  "%Y-%m-%d",
                date:
                  "$timestamp",
                timezone:
                  "Africa/Lagos",
              },
            },
            documents: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ])
      .toArray();

  console.table(
    daily.map(
      (row) => ({
        day: row._id,
        documents:
          row.documents,
      })
    )
  );

  /*
   * Installation concentration.
   */

  printSection(
    "TOP INSTALLATIONS — LAST 14 DAYS"
  );

  const installations =
    await telemetry
      .aggregate([
        {
          $match: {
            timestamp: {
              $gte:
                fourteenDaysAgo,
            },
          },
        },
        {
          $group: {
            _id:
              "$installation",
            documents: {
              $sum: 1,
            },
            oldest: {
              $min:
                "$timestamp",
            },
            newest: {
              $max:
                "$timestamp",
            },
          },
        },
        {
          $sort: {
            documents: -1,
          },
        },
        {
          $limit: 25,
        },
      ])
      .toArray();

  console.table(
    installations.map(
      (row) => ({
        installation:
          String(
            row._id ?? "NULL"
          ),
        documents:
          row.documents,
        oldest:
          formatDate(
            row.oldest
          ),
        newest:
          formatDate(
            row.newest
          ),
      })
    )
  );

  /*
   * Source concentration.
   */

  printSection(
    "SOURCE DISTRIBUTION — LAST 14 DAYS"
  );

  const sources =
    await telemetry
      .aggregate([
        {
          $match: {
            timestamp: {
              $gte:
                fourteenDaysAgo,
            },
          },
        },
        {
          $group: {
            _id: "$source",
            documents: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            documents: -1,
          },
        },
      ])
      .toArray();

  console.table(
    sources.map(
      (row) => ({
        source:
          row._id ??
          "NULL",
        documents:
          row.documents,
      })
    )
  );

  /*
   * Aggregation level.
   */

  printSection(
    "AGGREGATION LEVEL — LAST 14 DAYS"
  );

  const aggregationLevels =
    await telemetry
      .aggregate([
        {
          $match: {
            timestamp: {
              $gte:
                fourteenDaysAgo,
            },
          },
        },
        {
          $group: {
            _id:
              "$aggregationLevel",
            documents: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            documents: -1,
          },
        },
      ])
      .toArray();

  console.table(
    aggregationLevels.map(
      (row) => ({
        aggregationLevel:
          row._id ??
          "NULL",
        documents:
          row.documents,
      })
    )
  );

  /*
   * Most common VRM attributes.
   */

  printSection(
    "TOP VRM ATTRIBUTES — LAST 14 DAYS"
  );

  const attributes =
    await telemetry
      .aggregate([
        {
          $match: {
            timestamp: {
              $gte:
                fourteenDaysAgo,
            },
          },
        },
        {
          $group: {
            _id:
              "$vrmAttributeId",
            documents: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            documents: -1,
          },
        },
        {
          $limit: 30,
        },
      ])
      .toArray();

  console.table(
    attributes.map(
      (row) => ({
        vrmAttributeId:
          row._id ??
          "NULL",
        documents:
          row.documents,
      })
    )
  );

  /*
   * Parameter concentration.
   */

  printSection(
    "TOP PARAMETERS — LAST 14 DAYS"
  );

  const parameters =
    await telemetry
      .aggregate([
        {
          $match: {
            timestamp: {
              $gte:
                fourteenDaysAgo,
            },
          },
        },
        {
          $group: {
            _id:
              "$parameter",
            documents: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            documents: -1,
          },
        },
        {
          $limit: 30,
        },
      ])
      .toArray();

  console.table(
    parameters.map(
      (row) => ({
        parameter:
          row._id ??
          "NULL",
        documents:
          row.documents,
      })
    )
  );

  /*
   * Device type concentration.
   */

  printSection(
    "DEVICE TYPES — LAST 14 DAYS"
  );

  const deviceTypes =
    await telemetry
      .aggregate([
        {
          $match: {
            timestamp: {
              $gte:
                fourteenDaysAgo,
            },
          },
        },
        {
          $group: {
            _id:
              "$deviceType",
            documents: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            documents: -1,
          },
        },
      ])
      .toArray();

  console.table(
    deviceTypes.map(
      (row) => ({
        deviceType:
          row._id ??
          "NULL",
        documents:
          row.documents,
      })
    )
  );

  /*
   * Check whether the logical ingestion
   * identity contains duplicates.
   *
   * The production unique index should
   * make this zero.
   */

  printSection(
    "INGESTION IDENTITY DUPLICATE CHECK — LAST 14 DAYS"
  );

  const duplicateGroups =
    await telemetry
      .aggregate([
        {
          $match: {
            timestamp: {
              $gte:
                fourteenDaysAgo,
            },
          },
        },
        {
          $group: {
            _id: {
              installation:
                "$installation",
              deviceType:
                "$deviceType",
              deviceInstance:
                "$deviceInstance",
              vrmAttributeId:
                "$vrmAttributeId",
              timestamp:
                "$timestamp",
            },
            count: {
              $sum: 1,
            },
          },
        },
        {
          $match: {
            count: {
              $gt: 1,
            },
          },
        },
        {
          $limit: 20,
        },
      ])
      .toArray();

  console.log(
    "Duplicate identity groups:",
    duplicateGroups.length
  );

  if (
    duplicateGroups.length >
    0
  ) {
    console.table(
      duplicateGroups
    );
  }

  /*
   * Collection statistics.
   */

  printSection(
    "CURRENT COLLECTION FOOTPRINT"
  );

  const stats =
    await db.command({
      collStats:
        "telemetries",
    });

  console.table([
    {
      documents:
        stats.count,
      logicalDataMB:
        Number(
          (
            stats.size /
            MB
          ).toFixed(2)
        ),
      storageMB:
        Number(
          (
            stats.storageSize /
            MB
          ).toFixed(2)
        ),
      indexesMB:
        Number(
          (
            stats.totalIndexSize /
            MB
          ).toFixed(2)
        ),
    },
  ]);

  console.log(
    "\nNo documents, collections, or indexes were modified."
  );

  console.log(
    "=================================================="
  );
};

main()
  .catch(
    (error) => {
      console.error(
        "\nFORENSICS FAILED:"
      );

      console.error(
        error?.stack ??
          error
      );

      process.exitCode = 1;
    }
  )
  .finally(
    async () => {
      if (
        mongoose.connection
          .readyState !== 0
      ) {
        await mongoose.disconnect();
      }
    }
  );