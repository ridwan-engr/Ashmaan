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

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000
    });

    console.log("MongoDB connected.");

    const db = mongoose.connection.db;
    const name = "devices_backup_20260905101400414";

    const collections = await db
      .listCollections(
        { name },
        { nameOnly: true }
      )
      .toArray();

    if (collections.length === 0) {
      console.log(`Collection "${name}" does not exist.`);
      return;
    }

    const count = await db
      .collection(name)
      .countDocuments();

    console.log("----------------------------------------");
    console.log("Collection to drop:", name);
    console.log("Documents:", count);
    console.log("----------------------------------------");

    await db.collection(name).drop();

    console.log("SUCCESS: Backup collection dropped.");

  } catch (error) {
    console.error("FAILED:");
    console.error(error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
})();
