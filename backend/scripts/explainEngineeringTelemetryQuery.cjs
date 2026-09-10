require("dotenv").config();

const dns = require("dns");

dns.setServers([
  "1.1.1.1",
  "8.8.8.8"
]);

const mongoose = require("mongoose");

const INSTALLATION_ID =
  "6a9ad965e107b5d6d6628c88";

const ATTRIBUTE_IDS = [
  1
];

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

    const newest =
      await collection.findOne(
        {
          installation:
            new mongoose.Types.ObjectId(
              INSTALLATION_ID
            ),
          vrmAttributeId: {
            $in: ATTRIBUTE_IDS
          }
        },
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
        "No matching telemetry found for sample installation/attribute."
      );
    }

    const windowEnd =
      new Date(
        newest.timestamp
      );

    const windowStart =
      new Date(
        windowEnd.getTime() -
        (24 * 60 * 60 * 1000)
      );

    console.log("");
    console.log("================================================");
    console.log("ASHMAAN ENGINEERING QUERY PLAN ANALYSIS");
    console.log("================================================");

    console.log("");
    console.log("Installation :", INSTALLATION_ID);
    console.log("Attribute IDs:", ATTRIBUTE_IDS);
    console.log("Window start :", windowStart.toISOString());
    console.log("Window end   :", windowEnd.toISOString());

    const plan =
      await collection
        .find({
          installation:
            new mongoose.Types.ObjectId(
              INSTALLATION_ID
            ),

          vrmAttributeId: {
            $in: ATTRIBUTE_IDS
          },

          timestamp: {
            $gte: windowStart,
            $lte: windowEnd
          }
        })
        .sort({
          timestamp: 1
        })
        .explain(
          "executionStats"
        );

    const execution =
      plan.executionStats;

    console.log("");
    console.log("Execution summary:");
    console.log("----------------------------------------");

    console.log(
      "Returned:",
      execution.nReturned
    );

    console.log(
      "Execution time ms:",
      execution.executionTimeMillis
    );

    console.log(
      "Total keys examined:",
      execution.totalKeysExamined
    );

    console.log(
      "Total docs examined:",
      execution.totalDocsExamined
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
    console.log("Rejected plans:");
    console.log("----------------------------------------");

    console.dir(
      plan.queryPlanner.rejectedPlans,
      {
        depth: null
      }
    );

    console.log("");
    console.log("================================================");
    console.log("ANALYSIS COMPLETE");
    console.log("No telemetry was modified.");
    console.log("================================================");

  } catch (error) {
    console.error(error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
})();
