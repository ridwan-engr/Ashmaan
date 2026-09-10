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

    console.log("");
    console.log("================================================");
    console.log("ASHMAAN TELEMETRY QUERY PLAN ANALYSIS");
    console.log("================================================");

    const plan =
      await collection
        .find({
          source: "VRM"
        })
        .sort({
          timestamp: -1
        })
        .limit(1)
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
