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
    console.log("ASHMAAN TELEMETRY RAW DEPENDENCY ANALYSIS");
    console.log("================================================");

    const result =
      await collection.aggregate([
        {
          $group: {
            _id: null,

            total: {
              $sum: 1
            },

            rawPresent: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      {
                        $type: "$raw"
                      },
                      "object"
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            rawUnitPresent: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: [
                          {
                            $type: "$raw.unit"
                          },
                          "missing"
                        ]
                      },
                      {
                        $ne: [
                          "$raw.unit",
                          null
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            topLevelUnitPresent: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: [
                          {
                            $type: "$unit"
                          },
                          "missing"
                        ]
                      },
                      {
                        $ne: [
                          "$unit",
                          null
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            rawUnitOnly: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: [
                          {
                            $type: "$raw.unit"
                          },
                          "missing"
                        ]
                      },
                      {
                        $ne: [
                          "$raw.unit",
                          null
                        ]
                      },
                      {
                        $or: [
                          {
                            $eq: [
                              {
                                $type: "$unit"
                              },
                              "missing"
                            ]
                          },
                          {
                            $eq: [
                              "$unit",
                              null
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            rawAttributePresent: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: [
                          {
                            $type:
                              "$raw.idDataAttribute"
                          },
                          "missing"
                        ]
                      },
                      {
                        $ne: [
                          "$raw.idDataAttribute",
                          null
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            topLevelAttributePresent: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: [
                          {
                            $type:
                              "$vrmAttributeId"
                          },
                          "missing"
                        ]
                      },
                      {
                        $ne: [
                          "$vrmAttributeId",
                          null
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            attributeMismatch: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: [
                          {
                            $type:
                              "$raw.idDataAttribute"
                          },
                          "missing"
                        ]
                      },
                      {
                        $ne: [
                          {
                            $type:
                              "$vrmAttributeId"
                          },
                          "missing"
                        ]
                      },
                      {
                        $ne: [
                          "$raw.idDataAttribute",
                          "$vrmAttributeId"
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]).toArray();

    console.log("");

    console.dir(
      result[0],
      {
        depth: null
      }
    );

    console.log("");
    console.log("================================================");
    console.log("SAMPLE RAW.UNIT RECORDS");
    console.log("================================================");

    const unitSamples =
      await collection.find(
        {
          "raw.unit": {
            $exists: true,
            $ne: null
          }
        },
        {
          projection: {
            timestamp: 1,
            installation: 1,
            vrmAttributeId: 1,
            parameter: 1,
            unit: 1,
            "raw.unit": 1,
            "raw.idDataAttribute": 1
          }
        }
      )
      .limit(10)
      .toArray();

    console.dir(
      unitSamples,
      {
        depth: null
      }
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
