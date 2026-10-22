import "dotenv/config";
import mongoose from "mongoose";
import dns from "node:dns";

dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
}

async function main() {
    await mongoose.connect(mongoUri);

    const db = mongoose.connection.db;
    const telemetry = db.collection("telemetries");

    console.log("\nTELEMETRY STORAGE ANALYSIS\n");

    const sample = await telemetry.findOne();

    console.log("SAMPLE FIELD NAMES");
    console.log(
        sample
            ? Object.keys(sample)
            : []
    );

    console.log("\nTELEMETRY INDEXES");

    const indexes = await telemetry.indexes();

    console.table(
        indexes.map((index) => ({
            name: index.name,
            key: JSON.stringify(index.key),
            unique: index.unique === true,
            sparse: index.sparse === true,
            expireAfterSeconds:
                index.expireAfterSeconds ?? null,
        }))
    );

    /*
     * Discover the timestamp field from the schema/data.
     * These are candidates only; no data is changed.
     */

    const timestampCandidates = [
        "timestamp",
        "createdAt",
        "time",
        "recordedAt",
        "receivedAt",
    ];

    let timestampField = null;

    for (const field of timestampCandidates) {
        if (
            sample &&
            Object.prototype.hasOwnProperty.call(
                sample,
                field
            )
        ) {
            timestampField = field;
            break;
        }
    }

    console.log(
        "\nDetected timestamp field:",
        timestampField ?? "NOT DETECTED"
    );

    if (!timestampField) {
        console.log(
            "\nNo timestamp field was automatically detected."
        );

        console.log(
            "No retention calculation has been attempted."
        );

        await mongoose.disconnect();
        return;
    }

    const oldest = await telemetry
        .find({
            [timestampField]: {
                $exists: true,
            },
        })
        .sort({
            [timestampField]: 1,
        })
        .limit(1)
        .toArray();

    const newest = await telemetry
        .find({
            [timestampField]: {
                $exists: true,
            },
        })
        .sort({
            [timestampField]: -1,
        })
        .limit(1)
        .toArray();

    console.log("\nDATE RANGE");

    console.table([
        {
            oldest:
                oldest[0]?.[timestampField] ??
                null,

            newest:
                newest[0]?.[timestampField] ??
                null,
        },
    ]);

    const now = new Date();

    const windows = [
        7,
        14,
        30,
        60,
        90,
        180,
    ];

    const counts = [];

    const total =
        await telemetry.countDocuments();

    for (const days of windows) {
        const cutoff =
            new Date(
                now.getTime() -
                days * 24 * 60 * 60 * 1000
            );

        const recent =
            await telemetry.countDocuments({
                [timestampField]: {
                    $gte: cutoff,
                },
            });

        counts.push({
            window: `${days} days`,
            cutoff,
            retained: recent,
            olderThanWindow:
                total - recent,
            retainedPercent:
                total === 0
                    ? 0
                    : Number(
                        (
                            recent /
                            total *
                            100
                        ).toFixed(2)
                    ),
        });
    }

    console.log("\nRETENTION ANALYSIS");

    console.log(
        `Total telemetry documents: ${total}`
    );

    console.table(counts);

    await mongoose.disconnect();

    console.log(
        "\nAudit complete. No telemetry was modified.\n"
    );
}

main().catch(async (error) => {
    console.error(
        "\nTelemetry audit failed:",
        error
    );

    try {
        await mongoose.disconnect();
    } catch {
        // Ignore disconnect failure.
    }

    process.exitCode = 1;
});
