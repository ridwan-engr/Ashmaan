require("dotenv").config();

const dns = require("dns");

dns.setServers([
  "1.1.1.1",
  "8.8.8.8"
]);

const mongoose = require("mongoose");

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000
    });

    const db = mongoose.connection.db;

    const indexes = await db
      .collection("telemetries")
      .indexes();

    console.log("\nTELEMETRY INDEXES");
    console.log("----------------------------------------");
    console.log("Index count:", indexes.length);
    console.log("----------------------------------------");

    console.dir(indexes, {
      depth: null,
      colors: true
    });

  } catch (error) {
    console.error(error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
})();
