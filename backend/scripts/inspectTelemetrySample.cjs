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

    const sample = await db
      .collection("telemetries")
      .findOne();

    console.log("\nTELEMETRY SAMPLE");
    console.log("----------------------------------------");

    console.dir(sample, {
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
