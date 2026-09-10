require("dotenv").config();

const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");

const mb = value =>
  (Number(value || 0) / 1024 / 1024).toFixed(2);

(async () => {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000
    });

    console.log("MongoDB connected.");

    const db = mongoose.connection.db;
    const col = db.collection("telemetries");

    console.log("\n================================================");
    console.log("ASHMAAN TELEMETRY STORAGE ANALYSIS");
    console.log("================================================");

    const total = await col.countDocuments();

    console.log("\n1. DOCUMENT COUNT");
    console.log("----------------------------------------");
    console.log("Total telemetry documents:", total);

    const oldest = await col
      .find(
        { timestamp: { $type: "date" } },
        { projection: { timestamp: 1, createdAt: 1 } }
      )
      .sort({ timestamp: 1 })
      .limit(1)
      .toArray();

    const newest = await col
      .find(
        { timestamp: { $type: "date" } },
        { projection: { timestamp: 1, createdAt: 1 } }
      )
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    console.log("\n2. TELEMETRY DATE RANGE");
    console.log("----------------------------------------");

    console.log(
      "Oldest timestamp:",
      oldest[0]?.timestamp?.toISOString?.() || "NONE"
    );

    console.log(
      "Newest timestamp:",
      newest[0]?.timestamp?.toISOString?.() || "NONE"
    );

    const now = new Date();

    console.log("\n3. RETENTION COUNTS");
    console.log("----------------------------------------");

    for (const days of [7, 14, 30, 60, 90]) {
      const cutoff = new Date(
        now.getTime() - days * 24 * 60 * 60 * 1000
      );

      const oldCount = await col.countDocuments({
        timestamp: { $lt: cutoff }
      });

      console.log(
        `${days} days | cutoff ${cutoff.toISOString()} | older: ${oldCount} | remaining: ${total - oldCount}`
      );
    }

    const fields = [
      "installation",
      "device",
      "timestamp",
      "site",
      "parameter",
      "code",
      "numericValue",
      "quality",
      "source",
      "aggregationLevel",
      "vrmAttributeId",
      "deviceType",
      "deviceInstance"
    ];

    console.log("\n4. INDEXED FIELD COVERAGE");
    console.log("----------------------------------------");

    for (const field of fields) {
      const existsCount = await col.countDocuments({
        [field]: { $exists: true }
      });

      const nonNullCount = await col.countDocuments({
        [field]: { $exists: true, $ne: null }
      });

      const percentage = total
        ? ((nonNullCount / total) * 100).toFixed(2)
        : "0.00";

      console.log(
        `${field.padEnd(20)} exists=${String(existsCount).padEnd(8)} nonNull=${String(nonNullCount).padEnd(8)} coverage=${percentage}%`
      );
    }

    console.log("\n5. DISTINCT VALUE COUNTS");
    console.log("----------------------------------------");

    for (const field of [
      "quality",
      "source",
      "aggregationLevel",
      "deviceType",
      "deviceInstance"
    ]) {
      try {
        const values = await col.distinct(field);

        console.log(
          `${field}: ${values.length} distinct values`
        );

        if (values.length <= 25) {
          console.log("  Values:", values);
        }
      } catch (error) {
        console.log(`${field}: unable to inspect`);
      }
    }

    console.log("\n6. COLLECTION + INDEX STORAGE");
    console.log("----------------------------------------");

    const stats = await db.command({
      collStats: "telemetries"
    });

    console.log("Documents       :", stats.count);
    console.log("Logical data MB :", mb(stats.size));
    console.log("Storage MB      :", mb(stats.storageSize));
    console.log("Total index MB  :", mb(stats.totalIndexSize));
    console.log("Indexes         :", stats.nindexes);

    console.log("\n7. INDIVIDUAL INDEX STORAGE");
    console.log("----------------------------------------");

    if (stats.indexSizes) {
      const sortedIndexes = Object.entries(stats.indexSizes)
        .sort((a, b) => b[1] - a[1]);

      for (const [name, bytes] of sortedIndexes) {
        console.log(
          `${name.padEnd(85)} ${mb(bytes)} MB`
        );
      }
    }

    console.log("\n================================================");
    console.log("ANALYSIS COMPLETE");
    console.log("No telemetry was modified or deleted.");
    console.log("================================================");

  } catch (error) {
    console.error("\nAnalysis failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
