import dns from "node:dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);

const APPROVED_INDEXES = [
    {
        name:
            "installation_1_parameter_1_timestamp_-1",
        key: {
            installation: 1,
            parameter: 1,
            timestamp: -1,
        },
    },
    {
        name:
            "device_1_parameter_1_timestamp_-1",
        key: {
            device: 1,
            parameter: 1,
            timestamp: -1,
        },
    },
    {
        name:
            "vrmAttributeId_1",
        key: {
            vrmAttributeId: 1,
        },
    },
    {
        name:
            "parameter_1",
        key: {
            parameter: 1,
        },
    },
    {
        name:
            "device_1",
        key: {
            device: 1,
        },
    },
];

const PROTECTED_INDEXES = new Set([
    "_id_",

    "timestamp_1",

    "installation_1_timestamp_-1",

    "installation_1_vrmAttributeId_1_timestamp_1",

    "installation_1_deviceType_1_deviceInstance_1_vrmAttributeId_1_timestamp_1",
]);

const confirmed =
    process.env
        .ASHMAAN_CONFIRM_LEGACY_INDEX_DROP ===
    "YES";

const keysEqual = (
    actual,
    expected
) =>
    JSON.stringify(actual) ===
    JSON.stringify(expected);

try {
    if (!process.env.MONGODB_URI) {
        throw new Error(
            "MONGODB_URI is missing."
        );
    }

    await mongoose.connect(
        process.env.MONGODB_URI,
        {
            serverSelectionTimeoutMS:
                10000,

            connectTimeoutMS:
                10000,

            socketTimeoutMS:
                30000,

            maxPoolSize: 2,

            autoIndex: false,
        }
    );

    const db =
        mongoose.connection.db;

    const collection =
        db.collection(
            "telemetries"
        );

    console.log(
        "\n==============================================="
    );

    console.log(
        "ASHMAAN TELEMETRY LEGACY INDEX RECLAMATION"
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
        await collection.indexes();

    const stats =
        await db.command({
            collStats:
                "telemetries",
        });

    const indexSizes =
        stats.indexSizes ?? {};

    /*
     * First prove all protected
     * indexes still exist.
     */
    for (
        const protectedName of
        PROTECTED_INDEXES
    ) {
        const exists =
            indexes.some(
                (index) =>
                    index.name ===
                    protectedName
            );

        if (!exists) {
            throw new Error(
                `Protected index missing: ${protectedName}`
            );
        }
    }

    console.log(
        "Protected indexes verified: YES\n"
    );

    let reclaimableBytes = 0;

    const approvedExisting =
        [];

    for (
        const approved of
        APPROVED_INDEXES
    ) {
        const existing =
            indexes.find(
                (index) =>
                    index.name ===
                    approved.name
            );

        console.log(
            approved.name
        );

        if (!existing) {
            console.log(
                "  exists     : NO"
            );

            console.log(
                "  action     : SKIP"
            );

            console.log("");

            continue;
        }

        console.log(
            "  exists     : YES"
        );

        console.log(
            `  actual key : ${JSON.stringify(
                existing.key
            )}`
        );

        console.log(
            `  expected   : ${JSON.stringify(
                approved.key
            )}`
        );

        if (
            !keysEqual(
                existing.key,
                approved.key
            )
        ) {
            throw new Error(
                `Index key mismatch for ${approved.name}. Aborting before any drop.`
            );
        }

        const sizeBytes =
            Number(
                indexSizes[
                    approved.name
                ] ?? 0
            );

        reclaimableBytes +=
            sizeBytes;

        approvedExisting.push(
            approved
        );

        console.log(
            `  size       : ${(
                sizeBytes /
                1024 /
                1024
            ).toFixed(2)} MB`
        );

        console.log(
            `  action     : ${
                confirmed
                    ? "APPROVED TO DROP"
                    : "WOULD DROP"
            }`
        );

        console.log("");
    }

    console.log(
        "-----------------------------------------------"
    );

    console.log(
        `Approved indexes present : ${approvedExisting.length}`
    );

    console.log(
        `Estimated recovery        : ${(
            reclaimableBytes /
            1024 /
            1024
        ).toFixed(2)} MB`
    );

    /*
     * Important:
     * validation above completes
     * before mutation begins.
     */
    if (!confirmed) {
        console.log(
            "\nDRY RUN ONLY."
        );

        console.log(
            "No indexes were modified."
        );

        console.log(
            "\nTo execute:"
        );

        console.log(
            '$env:ASHMAAN_CONFIRM_LEGACY_INDEX_DROP = "YES"'
        );

        console.log(
            "node scripts\\reclaimTelemetryLegacyIndexes.js"
        );

        process.exitCode = 0;
    } else {
        console.log(
            "\nBeginning approved drops...\n"
        );

        for (
            const approved of
            approvedExisting
        ) {
            /*
             * Defensive protection
             * check immediately before
             * each mutation.
             */
            if (
                PROTECTED_INDEXES.has(
                    approved.name
                )
            ) {
                throw new Error(
                    `Refusing to drop protected index: ${approved.name}`
                );
            }

            await collection.dropIndex(
                approved.name
            );

            console.log(
                `DROPPED: ${approved.name}`
            );
        }

        /*
         * Verify resulting index set.
         */
        const after =
            await collection.indexes();

        for (
            const protectedName of
            PROTECTED_INDEXES
        ) {
            const stillExists =
                after.some(
                    (index) =>
                        index.name ===
                        protectedName
                );

            if (!stillExists) {
                throw new Error(
                    `Protected index missing after migration: ${protectedName}`
                );
            }
        }

        for (
            const approved of
            approvedExisting
        ) {
            const stillExists =
                after.some(
                    (index) =>
                        index.name ===
                        approved.name
                );

            if (stillExists) {
                throw new Error(
                    `Legacy index still exists after drop: ${approved.name}`
                );
            }
        }

        console.log(
            "\nPost-migration verification: PASS"
        );

        console.log(
            `Remaining index count: ${after.length}`
        );

        console.log(
            "\nOnly approved legacy indexes were removed."
        );
    }
} catch (error) {
    console.error(
        "\nLegacy-index reclamation failed:",
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