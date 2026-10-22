import "dotenv/config";
import mongoose from "mongoose";
import dns from "node:dns";

dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);

if (!process.env.MONGODB_URI) {
    throw new Error(
        "MONGODB_URI is not configured."
    );
}

async function main() {
    await mongoose.connect(
        process.env.MONGODB_URI
    );

    const telemetry =
        mongoose.connection.db.collection(
            "telemetries"
        );

    console.log(
        "\nTELEMETRY DAILY DISTRIBUTION\n"
    );

    const daily =
        await telemetry.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$timestamp",
                            timezone: "UTC",
                        },
                    },
                    records: {
                        $sum: 1,
                    },
                    installations: {
                        $addToSet:
                            "$installation",
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    records: 1,
                    installations: {
                        $size:
                            "$installations",
                    },
                },
            },
            {
                $sort: {
                    date: 1,
                },
            },
        ]).toArray();

    console.table(daily);

    console.log(
        "\nRECENT INGESTION DENSITY — TOP 20 SITES\n"
    );

    const recentCutoff =
        new Date(
            Date.now() -
            14 * 24 * 60 * 60 * 1000
        );

    const recentBySite =
        await telemetry.aggregate([
            {
                $match: {
                    timestamp: {
                        $gte: recentCutoff,
                    },
                },
            },
            {
                $group: {
                    _id: "$installation",
                    records: {
                        $sum: 1,
                    },
                    firstTimestamp: {
                        $min: "$timestamp",
                    },
                    lastTimestamp: {
                        $max: "$timestamp",
                    },
                },
            },
            {
                $sort: {
                    records: -1,
                },
            },
            {
                $limit: 20,
            },
        ]).toArray();

    console.table(
        recentBySite.map(
            (row) => ({
                installation:
                    String(row._id),
                records:
                    row.records,
                firstTimestamp:
                    row.firstTimestamp,
                lastTimestamp:
                    row.lastTimestamp,
            })
        )
    );

    await mongoose.disconnect();

    console.log(
        "\nAudit complete. No data was modified.\n"
    );
}

main().catch(async (error) => {
    console.error(
        "\nTelemetry distribution audit failed:",
        error
    );

    try {
        await mongoose.disconnect();
    } catch {
        // Ignore disconnect failure.
    }

    process.exitCode = 1;
});
