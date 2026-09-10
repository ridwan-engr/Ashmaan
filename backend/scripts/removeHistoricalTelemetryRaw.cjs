const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");
require("dotenv").config();

const BATCH_SIZE = 1000;
const PAUSE_MS = 250;

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    const telemetry =
        mongoose.connection.db.collection("telemetries");

    const startingCount =
        await telemetry.countDocuments({
            raw: { $exists: true }
        });

    console.log("HISTORICAL TELEMETRY RAW CLEANUP");
    console.log("================================");
    console.log("Starting raw documents:", startingCount);
    console.log("Batch size:", BATCH_SIZE);
    console.log("");

    let lastId = null;
    let batch = 0;
    let totalMatched = 0;
    let totalModified = 0;

    while (true) {
        const filter = {
            raw: { $exists: true }
        };

        if (lastId !== null) {
            filter._id = {
                $gt: lastId
            };
        }

        const docs = await telemetry
            .find(
                filter,
                {
                    projection: {
                        _id: 1
                    }
                }
            )
            .sort({
                _id: 1
            })
            .limit(BATCH_SIZE)
            .toArray();

        if (docs.length === 0) {
            break;
        }

        const ids =
            docs.map(
                (doc) => doc._id
            );

        lastId =
            ids[ids.length - 1];

        const result =
            await telemetry.updateMany(
                {
                    _id: {
                        $in: ids
                    },
                    raw: {
                        $exists: true
                    }
                },
                {
                    $unset: {
                        raw: ""
                    }
                }
            );

        batch += 1;
        totalMatched += result.matchedCount;
        totalModified += result.modifiedCount;

        console.log(
            `Batch ${batch}: selected=${ids.length} matched=${result.matchedCount} modified=${result.modifiedCount} totalModified=${totalModified}`
        );

        if (
            result.matchedCount > 0 &&
            result.modifiedCount === 0
        ) {
            throw new Error(
                "Matched telemetry documents but modified none. Cleanup stopped for safety."
            );
        }

        await new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    PAUSE_MS
                )
        );
    }

    const remaining =
        await telemetry.countDocuments({
            raw: {
                $exists: true
            }
        });

    const withoutRaw =
        await telemetry.countDocuments({
            raw: {
                $exists: false
            }
        });

    console.log("");
    console.log("CLEANUP SUMMARY");
    console.log("===============");
    console.log("Starting raw documents:", startingCount);
    console.log("Matched:", totalMatched);
    console.log("Modified:", totalModified);
    console.log("Raw remaining:", remaining);
    console.log("Documents without raw:", withoutRaw);

    if (remaining === 0) {
        console.log("");
        console.log(
            "PASS: Historical telemetry raw payload has been removed."
        );
    } else {
        console.log("");
        console.log(
            "WARNING: Some telemetry documents still contain raw."
        );
        process.exitCode = 2;
    }
}

main()
    .catch((error) => {
        console.error("");
        console.error("CLEANUP FAILED");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
