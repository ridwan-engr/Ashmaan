import dns from "node:dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);

const INDEX_NAME =
    "installation_1_vrmAttributeId_1_timestamp_1";

const INDEX_KEY = {
    installation: 1,
    vrmAttributeId: 1,
    timestamp: 1,
};

const confirmed =
    process.env
        .ASHMAAN_CONFIRM_INDEX_CREATE ===
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
            socketTimeoutMS: 60000,
            maxPoolSize: 2,
            autoIndex: false,
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
        "ASHMAAN ENGINEERING TELEMETRY INDEX MIGRATION"
    );
    console.log(
        "===============================================\n"
    );

    console.log(
        `Mode: ${
            confirmed
                ? "CONFIRMED CREATE"
                : "DRY RUN"
        }\n`
    );

    const existingIndexes =
        await collection.indexes();

    const existing =
        existingIndexes.find(
            (index) =>
                index.name === INDEX_NAME
        );

    console.log(
        `Index name : ${INDEX_NAME}`
    );

    console.log(
        `Index key  : ${JSON.stringify(
            INDEX_KEY
        )}`
    );

    console.log(
        `Exists     : ${
            existing ? "YES" : "NO"
        }`
    );

    if (existing) {
        console.log(
            "\nNo action required."
        );

        console.log(
            "The replacement index already exists."
        );
    } else if (!confirmed) {
        console.log(
            "\nAction     : WOULD CREATE"
        );

        console.log(
            "\nDRY RUN ONLY."
        );

        console.log(
            "No database changes were made."
        );

        console.log(
            "\nTo execute:"
        );

        console.log(
            '$env:ASHMAAN_CONFIRM_INDEX_CREATE = "YES"'
        );

        console.log(
            "node scripts\\createTelemetryEngineeringIndex.js"
        );
    } else {
        console.log(
            "\nCreating index..."
        );

        const created =
            await collection.createIndex(
                INDEX_KEY,
                {
                    name: INDEX_NAME,
                }
            );

        console.log(
            `Created    : ${created}`
        );

        const afterIndexes =
            await collection.indexes();

        const verified =
            afterIndexes.find(
                (index) =>
                    index.name ===
                    INDEX_NAME
            );

        if (!verified) {
            throw new Error(
                "Index creation returned but verification failed."
            );
        }

        console.log(
            "Verified   : YES"
        );

        console.log(
            `Verified key: ${JSON.stringify(
                verified.key
            )}`
        );
    }
} catch (error) {
    console.error(
        "\nIndex migration failed:",
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