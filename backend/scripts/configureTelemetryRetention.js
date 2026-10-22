import "dotenv/config";
import mongoose from "mongoose";
import dns from "node:dns";

dns.setServers([
    "1.1.1.1",
    "1.0.0.1",
]);

const TTL_SECONDS = 7 * 24 * 60 * 60;

if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
}

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    const db = mongoose.connection.db;
    const telemetry = db.collection("telemetries");

    console.log("\nCURRENT TELEMETRY INDEXES");

    const before = await telemetry.indexes();

    console.table(
        before.map((index) => ({
            name: index.name,
            key: JSON.stringify(index.key),
            unique: index.unique === true,
            expireAfterSeconds:
                index.expireAfterSeconds ?? null,
        }))
    );

    const timestampIndex =
        before.find(
            (index) =>
                index.name === "timestamp_1"
        );

    if (!timestampIndex) {
        throw new Error(
            "Required timestamp_1 index was not found."
        );
    }

    console.log(
        "\nConverting timestamp_1 to 7-day TTL..."
    );

    const result = await db.command({
        collMod: "telemetries",
        index: {
            name: "timestamp_1",
            expireAfterSeconds:
                TTL_SECONDS,
        },
    });

    console.log(
        "\nCOLLMOD RESULT"
    );

    console.log(result);

    const after =
        await telemetry.indexes();

    console.log(
        "\nUPDATED TELEMETRY INDEXES"
    );

    console.table(
        after.map((index) => ({
            name: index.name,
            key: JSON.stringify(index.key),
            unique: index.unique === true,
            expireAfterSeconds:
                index.expireAfterSeconds ?? null,
        }))
    );

    const configured =
        after.find(
            (index) =>
                index.name ===
                "timestamp_1"
        );

    if (
        configured?.expireAfterSeconds !==
        TTL_SECONDS
    ) {
        throw new Error(
            "TTL configuration verification failed."
        );
    }

    console.log(
        `\nPASS: timestamp_1 TTL = ${TTL_SECONDS} seconds (7 days).`
    );

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(
        "\nTelemetry retention configuration failed:",
        error
    );

    try {
        await mongoose.disconnect();
    } catch {}

    process.exitCode = 1;
});
