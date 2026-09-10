require("dotenv").config();

const dns = require("dns");

dns.setServers([
  "1.1.1.1",
  "8.8.8.8"
]);

const mongoose = require("mongoose");

(async () => {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(
      process.env.MONGODB_URI,
      {
        serverSelectionTimeoutMS: 15000
      }
    );

    console.log("MongoDB connected.");

    const collection =
      mongoose.connection.db.collection(
        "telemetries"
      );

    /*
     * Anchor the test to the newest telemetry actually
     * present in the database rather than wall-clock time.
     */
    const newest =
      await collection.findOne(
        {},
        {
          projection: {
            timestamp: 1
          },
          sort: {
            timestamp: -1
          }
        }
      );

    if (!newest?.timestamp) {
      throw new Error(
        "No telemetry timestamp found."
      );
    }

    const sevenDaysAgo =
      new Date(
        newest.timestamp.getTime() -
        (7 * 24 * 60 * 60 * 1000)
      );

    console.log("");
    console.log("Newest telemetry:");
    console.log(
      newest.timestamp.toISOString()
    );

    console.log(
      "Analysis start:",
      sevenDaysAgo.toISOString()
    );

    /*
     * Find the installation with the most telemetry
     * during this recent period.
     */
    const busiest =
      await collection.aggregate([
        {
          $match: {
            timestamp: {
              $gte: sevenDaysAgo,
              $lte: newest.timestamp
            },
            installation: {
              $ne: null
            }
          }
        },
        {
          $group: {
            _id: "$installation",
            documentCount: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            documentCount: -1
          }
        },
        {
          $limit: 1
        }
      ]).toArray();

    if (!busiest.length) {
      throw new Error(
        "No recent installation telemetry found."
      );
    }

    const installationId =
      busiest[0]._id;

    console.log("");
    console.log("================================================");
    console.log("BUSIEST RECENT INSTALLATION");
    console.log("================================================");

    console.log(
      "Installation:",
      installationId.toString()
    );

    console.log(
      "7-day documents:",
      busiest[0].documentCount
    );

    /*
     * Find the most common attributes for that installation.
     */
    const attributes =
      await collection.aggregate([
        {
          $match: {
            installation:
              installationId,

            timestamp: {
              $gte: sevenDaysAgo,
              $lte: newest.timestamp
            },

            vrmAttributeId: {
              $ne: null
            }
          }
        },
        {
          $group: {
            _id: "$vrmAttributeId",
            documents: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            documents: -1
          }
        },
        {
          $limit: 10
        }
      ]).toArray();

    const attributeIds =
      attributes.map(
        row => row._id
      );

    console.log("");
    console.log("Top attribute IDs:");
    console.table(
      attributes.map(
        row => ({
          vrmAttributeId:
            row._id,

          documents:
            row.documents
        })
      )
    );

    if (!attributeIds.length) {
      throw new Error(
        "No VRM attribute IDs found."
      );
    }

    /*
     * Benchmark the most recent 24-hour engineering
     * telemetry window.
     */
    const windowEnd =
      newest.timestamp;

    const windowStart =
      new Date(
        windowEnd.getTime() -
        (24 * 60 * 60 * 1000)
      );

    const query = {
      installation:
        installationId,

      vrmAttributeId: {
        $in: attributeIds
      },

      timestamp: {
        $gte: windowStart,
        $lt: windowEnd
      }
    };

    console.log("");
    console.log("================================================");
    console.log("REPRESENTATIVE ENGINEERING QUERY");
    console.log("================================================");

    console.log(
      "Window start:",
      windowStart.toISOString()
    );

    console.log(
      "Window end:",
      windowEnd.toISOString()
    );

    console.log(
      "Attributes:",
      attributeIds
    );

    const plan =
      await collection
        .find(query)
        .sort({
          timestamp: 1
        })
        .explain(
          "executionStats"
        );

    const stats =
      plan.executionStats;

    console.log("");
    console.log("Execution statistics:");
    console.log("----------------------------------------");

    console.log(
      "Returned:",
      stats.nReturned
    );

    console.log(
      "Execution time ms:",
      stats.executionTimeMillis
    );

    console.log(
      "Keys examined:",
      stats.totalKeysExamined
    );

    console.log(
      "Documents examined:",
      stats.totalDocsExamined
    );

    const keyRatio =
      stats.nReturned > 0
        ? (
            stats.totalKeysExamined /
            stats.nReturned
          ).toFixed(2)
        : "N/A";

    const docRatio =
      stats.nReturned > 0
        ? (
            stats.totalDocsExamined /
            stats.nReturned
          ).toFixed(2)
        : "N/A";

    console.log("");
    console.log(
      "Keys examined / returned:",
      keyRatio
    );

    console.log(
      "Docs examined / returned:",
      docRatio
    );

    console.log("");
    console.log("Winning plan:");
    console.log("----------------------------------------");

    console.dir(
      plan.queryPlanner.winningPlan,
      {
        depth: null
      }
    );

    console.log("");
    console.log("================================================");
    console.log("BENCHMARK COMPLETE");
    console.log(
      "No telemetry was modified."
    );
    console.log("================================================");

  } catch (error) {
    console.error(error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
})();
