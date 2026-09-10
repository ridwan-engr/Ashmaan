require("dotenv").config();

const dns = require("dns");
dns.setServers([
  "1.1.1.1",
  "8.8.8.8"
]);

const mongoose = require("mongoose");

const TARGET_INDEXES = [
  "site_1",
  "site_1_timestamp_-1"
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

    const db =
      mongoose.connection.db;

    const col =
      db.collection(
        "telemetries"
      );

    console.log("");
    console.log("================================================");
    console.log("ASHMAAN TELEMETRY SITE INDEX CLEANUP");
    console.log("================================================");

    const before =
      await col.indexes();

    console.log("");
    console.log("Indexes before cleanup:");
    console.log("----------------------------------------");

    for (const index of before) {
      console.log(index.name);
    }

    for (
      const indexName
      of TARGET_INDEXES
    ) {
      const exists =
        before.some(
          index =>
            index.name ===
            indexName
        );

      console.log("");
      console.log(
        `Target: ${indexName}`
      );

      if (!exists) {
        console.log(
          "Status: already absent"
        );
        continue;
      }

      console.log(
        "Status: dropping..."
      );

      await col.dropIndex(
        indexName
      );

      console.log(
        "Status: successfully dropped"
      );
    }

    const after =
      await col.indexes();

    console.log("");
    console.log("Indexes after cleanup:");
    console.log("----------------------------------------");

    for (const index of after) {
      console.log(index.name);
    }

    const remainingTargets =
      TARGET_INDEXES.filter(
        name =>
          after.some(
            index =>
              index.name ===
              name
          )
      );

    console.log("");
    console.log("================================================");

    if (
      remainingTargets.length ===
      0
    ) {
      console.log(
        "SUCCESS: Both obsolete site indexes are absent."
      );
    } else {
      console.log(
        "WARNING: Some target indexes remain:"
      );

      console.log(
        remainingTargets
      );
    }

    console.log(
      "No telemetry documents were modified or deleted."
    );

    console.log("================================================");

  } catch (error) {
    console.error("");
    console.error(
      "Index cleanup failed:"
    );
    console.error(error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
})();
