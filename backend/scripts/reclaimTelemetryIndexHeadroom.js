import dns from "node:dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);

const TARGET_INDEXES = [
    {
        name: "numericValue_1",
        recreate: {
            numericValue: 1,
        },
    },
    {
        name: "deviceInstance_1",
        recreate: {
            deviceInstance: 1,
        },
    },
    {
        name: "installation_1",
        recreate: {
            installation: 1,
        },
    },
    {
        name: "deviceType_1",
        recreate: {
            deviceType: 1,
        },
    },
    {
        name: "code_1",
        recreate: {
            code: 1,
        },
    },
];

const confirmed =
    process.env.ASHMAAN_CONFIRM_INDEX_DROP ===
    "YES";

try {
    if (!process.env.MONGODB_URI) {
        throw new Error(
            "MONGODB_URI is missing."
        );
    }

    await mongoose.connect(
        process.env.MONGODB_URI,
        {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
            maxPoolSize: 2,
        }
    );

    const collection =
        mongoose.connection.db.collection(
            "telemetries"
        );

    console.log(
        "\n==============================================="
    );
    console.log(
        "ASHMAAN TELEMETRY INDEX HEADROOM RECLAMATION"
    );
    console.log(
        "===============================================\n"
    );

    console.log(
        `Mode: ${
            confirmed
                ? "CONFIRMED DROP"
                : "DRY RUN"
        }\n`
    );

    const indexes =
        await collection
            .indexes();

    const stats =
        await mongoose.connection.db
            .command({
                collStats:
                    "telemetries",
            });

    const indexSizes =
        stats.indexSizes ?? {};

    let estimatedBytes = 0;

    for (
        const target of
        TARGET_INDEXES
    ) {
        const existing =
            indexes.find(
                (index) =>
                    index.name ===
                    target.name
            );

        const bytes =
            Number(
                indexSizes[
                    target.name
                ] ?? 0
            );

        const mb =
            bytes /
            1024 /
            1024;

        console.log(
            `${target.name}`
        );

        console.log(
            `  exists     : ${
                existing
                    ? "YES"
                    : "NO"
            }`
        );

        console.log(
            `  size       : ${mb.toFixed(
                2
            )} MB`
        );

        console.log(
            `  recreate   : ${JSON.stringify(
                target.recreate
            )}`
        );

        if (existing) {
            estimatedBytes +=
                bytes;
        }

        if (
            confirmed &&
            existing
        ) {
            await collection
                .dropIndex(
                    target.name
                );

            console.log(
                "  action     : DROPPED"
            );
        } else {
            console.log(
                `  action     : ${
                    existing
                        ? "WOULD DROP"
                        : "SKIPPED"
                }`
            );
        }

        console.log("");
    }

    console.log(
        "-----------------------------------------------"
    );

    console.log(
        `Estimated reclaimable index space: ${(
            estimatedBytes /
            1024 /
            1024
        ).toFixed(2)} MB`
    );

    if (!confirmed) {
        console.log(
            "\nDRY RUN ONLY."
        );

        console.log(
            "No indexes were modified."
        );

        console.log(
            "\nTo execute the approved drop set:"
        );

        console.log(
            '$env:ASHMAAN_CONFIRM_INDEX_DROP = "YES"'
        );

        console.log(
            "node scripts\\reclaimTelemetryIndexHeadroom.js"
        );
    } else {
        console.log(
            "\nCONFIRMED MODE COMPLETE."
        );

        console.log(
            "Only the approved index allowlist was processed."
        );
    }
} catch (error) {
    console.error(
        "\nIndex reclamation failed:",
        error instanceof Error
            ? error.message
            : error
    );

    process.exitCode = 1;
} finally {
    await mongoose
        .disconnect()
        .catch(() => {});
}