require("dotenv").config();

const dns = require("dns");

dns.setServers([
  "1.1.1.1",
  "8.8.8.8"
]);

const mongoose = require("mongoose");

const TARGET_INDEXES = [
  "quality_1",
  "aggregationLevel_1"
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

    console.log("");
    console.log("================================================");
    console.log("ASHMAAN TELEMETRY LOW-VALUE INDEX CLEANUP");
    console.log("================================================");

    const before =
      await collection.indexes();

    console.log("");
    console.log("Indexes before cleanup:");
    console.log("----------------------------------------");

    for (const index of before) {
      console.log(index.name);
    }

    for (const indexName of TARGET_INDEXES) {
      const exists =
        before.some(
          index =>
            index.name === indexName
        );

      console.log("");
      console.log(`Target: ${indexName}`);

      if (!exists) {
        console.log("Status: already absent");
        continue;
      }

      await collection.dropIndex(
        indexName
      );

      console.log(
        "Status: successfully dropped"
      );
    }

    const after =
      await collection.indexes();

    console.log("");
    console.log("Indexes after cleanup:");
    console.log("----------------------------------------");

    for (const index of after) {
      console.log(index.name);
    }

    const remaining =
      TARGET_INDEXES.filter(
        name =>
          after.some(
            index =>
              index.name === name
          )
      );

    console.log("");
    console.log("================================================");

    if (remaining.length === 0) {
      console.log(
        "SUCCESS: Both low-value indexes are absent."
      );
    } else {
      console.log(
        "WARNING: Some target indexes remain:"
      );
      console.log(remaining);
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
