const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");
require("dotenv").config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    const telemetry =
        mongoose.connection.db.collection("telemetries");

    const since =
        new Date(Date.now() - 60 * 60 * 1000);

    const result = await telemetry.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: since
                }
            }
        },
        {
            $project: {
                hasRaw: {
                    $ne: [
                        { $type: "$raw" },
                        "missing"
                    ]
                },
                rawSize: {
                    $cond: [
                        {
                            $eq: [
                                { $type: "$raw" },
                                "object"
                            ]
                        },
                        {
                            $bsonSize: "$raw"
                        },
                        null
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
                rawPresent: {
                    $sum: {
                        $cond: [
                            "$hasRaw",
                            1,
                            0
                        ]
                    }
                },
                emptyOrTinyRaw: {
                    $sum: {
                        $cond: [
                            {
                                $lte: [
                                    "$rawSize",
                                    5
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                averageRawBytes: {
                    $avg: "$rawSize"
                }
            }
        }
    ]).toArray();

    console.dir(
        result[0] ?? {
            documents: 0
        },
        { depth: 5 }
    );
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
