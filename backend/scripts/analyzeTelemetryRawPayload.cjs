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
    console.log("ASHMAAN TELEMETRY RAW PAYLOAD ANALYSIS");
    console.log("================================================");

    const result =
      await collection.aggregate([
        {
          $project: {
            fullSize: {
              $bsonSize: "$$ROOT"
            },

            rawSize: {
              $cond: [
                {
                  $ne: [
                    {
                      $type: "$raw"
                    },
                    "missing"
                  ]
                },
                {
                  $bsonSize: {
                    raw: "$raw"
                  }
                },
                0
              ]
            }
          }
        },

        {
          $group: {
            _id: null,

            documents: {
              $sum: 1
            },

            totalFullBytes: {
              $sum: "$fullSize"
            },

            totalRawWrapperBytes: {
              $sum: "$rawSize"
            },

            avgFullBytes: {
              $avg: "$fullSize"
            },

            avgRawWrapperBytes: {
              $avg: "$rawSize"
            },

            maxFullBytes: {
              $max: "$fullSize"
            },

            maxRawWrapperBytes: {
              $max: "$rawSize"
            }
          }
        }
      ], {
        allowDiskUse: true
      }).toArray();

    if (!result.length) {
      throw new Error(
        "No telemetry documents found."
      );
    }

    const r =
      result[0];

    const MB =
      1024 * 1024;

    const rawPercent =
      r.totalFullBytes > 0
        ? (
            (
              r.totalRawWrapperBytes /
              r.totalFullBytes
            ) * 100
          ).toFixed(2)
        : "0.00";

    console.log("");
    console.log("Documents:");
    console.log(r.documents);

    console.log("");
    console.log("Logical BSON:");
    console.log(
      "Total document MB:",
      (
        r.totalFullBytes /
        MB
      ).toFixed(2)
    );

    console.log(
      "Approx raw-wrapper MB:",
      (
        r.totalRawWrapperBytes /
        MB
      ).toFixed(2)
    );

    console.log(
      "Approx raw share:",
      `${rawPercent}%`
    );

    console.log("");
    console.log("Average BSON size:");
    console.log(
      "Full document bytes:",
      Math.round(
        r.avgFullBytes
      )
    );

    console.log(
      "Raw wrapper bytes:",
      Math.round(
        r.avgRawWrapperBytes
      )
    );

    console.log("");
    console.log("Maximum BSON size:");
    console.log(
      "Full document bytes:",
      r.maxFullBytes
    );

    console.log(
      "Raw wrapper bytes:",
      r.maxRawWrapperBytes
    );

    console.log("");
    console.log("================================================");
    console.log("ANALYSIS COMPLETE");
    console.log(
      "No telemetry was modified or deleted."
    );
    console.log("================================================");

  } catch (error) {
    console.error(error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
})();
