const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");
require("dotenv").config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    const telemetry =
        mongoose.connection.db.collection("telemetries");

    const total =
        await telemetry.countDocuments({});

    const withRaw =
        await telemetry.countDocuments({
            raw: { $exists: true }
        });

    const withoutRaw =
        await telemetry.countDocuments({
            raw: { $exists: false }
        });

    const rawStats = await telemetry.aggregate([
        {
            $match: {
                raw: {
                    $exists: true
                }
            }
        },
        {
            $project: {
                rawBytes: {
                    $bsonSize: "$raw"
                }
            }
        },
        {
            $group: {
                _id: null,
                documents: {
                    $sum: 1
                },
                totalRawBytes: {
                    $sum: "$rawBytes"
                },
                averageRawBytes: {
                    $avg: "$rawBytes"
                },
                maxRawBytes: {
                    $max: "$rawBytes"
                }
            }
        }
    ]).toArray();

    const stats =
        rawStats[0] ?? {};

    console.log(
        "HISTORICAL RAW INVENTORY"
    );
    console.log(
        "========================"
    );

    console.log(
        "Total telemetry:",
        total
    );

    console.log(
        "Documents with raw:",
        withRaw
    );

    console.log(
        "Documents without raw:",
        withoutRaw
    );

    console.log(
        "Raw logical MB:",
        stats.totalRawBytes
            ? (
                stats.totalRawBytes /
                1024 /
                1024
              ).toFixed(2)
            : "0.00"
    );

    console.log(
        "Average raw bytes:",
        stats.averageRawBytes
            ?.toFixed(2) ??
            "0"
    );

    console.log(
        "Maximum raw bytes:",
        stats.maxRawBytes ??
            0
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
