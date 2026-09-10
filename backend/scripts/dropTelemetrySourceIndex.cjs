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

    const target =
      "source_1";

    const before =
      await collection.indexes();

    console.log("");
    console.log("================================================");
    console.log("ASHMAAN TELEMETRY SOURCE INDEX CLEANUP");
    console.log("================================================");

    console.log("");
    console.log(
      `Indexes before: ${before.length}`
    );

    const exists =
      before.some(
        index =>
          index.name === target
      );

    if (!exists) {
      console.log(
        `${target}: already absent`
      );
    } else {
      console.log(
        `${target}: dropping...`
      );

      await collection.dropIndex(
        target
      );

      console.log(
        `${target}: successfully dropped`
      );
    }

    const after =
      await collection.indexes();

    const remains =
      after.some(
        index =>
          index.name === target
      );

    console.log("");
    console.log(
      `Indexes after: ${after.length}`
    );

    console.log(
      `source_1 present: ${remains}`
    );

    console.log("");
    console.log("================================================");

    if (!remains) {
      console.log(
        "SUCCESS: source_1 is absent."
      );
    } else {
      console.log(
        "WARNING: source_1 still exists."
      );
    }

    console.log(
      "No telemetry documents were modified or deleted."
    );

    console.log("================================================");

  } catch (error) {
    console.error(error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
})();
