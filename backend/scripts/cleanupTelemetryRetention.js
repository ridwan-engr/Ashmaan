import "dotenv/config";
import mongoose from "mongoose";
import dns from "node:dns";

dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);

const RETENTION_DAYS = 7;
const CONFIRM_FLAG = "--execute";

if (!process.env.MONGODB_URI) {
    throw new Error(
        "MONGODB_URI is not configured."
    );
}

async function main() {
    const execute =
        process.argv.includes(
            CONFIRM_FLAG
        );

    await mongoose.connect(
        process.env.MONGODB_URI
    );

    const telemetry =
        mongoose.connection.db.collection(
            "telemetries"
        );

    const cutoff =
        new Date(
            Date.now() -
            RETENTION_DAYS *
                24 *
                60 *
                60 *
                1000
        );

    const totalBefore =
        await telemetry.countDocuments();

    const deleteCandidateCount =
        await telemetry.countDocuments({
            timestamp: {
                $lt: cutoff,
            },
        });

    const retainCount =
        await telemetry.countDocuments({
            timestamp: {
                $gte: cutoff,
            },
        });

    console.log(
        "\nASHMAAN TELEMETRY RETENTION CLEANUP"
    );

    console.table([
        {
            retentionDays:
                RETENTION_DAYS,

            cutoff:
                cutoff.toISOString(),

            totalBefore,

            deleteCandidates:
                deleteCandidateCount,

            retained:
                retainCount,

            mode:
                execute
                    ? "EXECUTE"
                    : "DRY RUN",
        },
    ]);

    if (!execute) {
        console.log(
            "\nDRY RUN ONLY."
        );

        console.log(
            "No telemetry was deleted."
        );

        console.log(
            "\nTo execute after reviewing the counts:"
        );

        console.log(
            "node .\\scripts\\cleanupTelemetryRetention.js --execute"
        );

        await mongoose.disconnect();
        return;
    }

    if (deleteCandidateCount === 0) {
        console.log(
            "\nNo expired telemetry found."
        );

        await mongoose.disconnect();
        return;
    }

    console.log(
        `\nDeleting ${deleteCandidateCount} telemetry records older than ${cutoff.toISOString()}...`
    );

    const result =
        await telemetry.deleteMany({
            timestamp: {
                $lt: cutoff,
            },
        });

    const totalAfter =
        await telemetry.countDocuments();

    console.log(
        "\nCLEANUP RESULT"
    );

    console.table([
        {
            acknowledged:
                result.acknowledged,

            deleted:
                result.deletedCount,

            totalBefore,

            totalAfter,
        },
    ]);

    await mongoose.disconnect();

    console.log(
        "\nTelemetry retention cleanup complete.\n"
    );
}

main().catch(async (error) => {
    console.error(
        "\nTelemetry cleanup failed:",
        error
    );

    try {
        await mongoose.disconnect();
    } catch {}

    process.exitCode = 1;
});