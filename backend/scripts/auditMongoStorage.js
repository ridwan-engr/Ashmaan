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

function mb(bytes) {
    if (!Number.isFinite(bytes)) {
        return null;
    }

    return Number(
        (bytes / 1024 / 1024).toFixed(2)
    );
}

async function main() {
    await mongoose.connect(mongoUri);

    console.log("\nConnected to MongoDB.");

    const db = mongoose.connection.db;

    const databaseStats = await db.command({
        dbStats: 1,
    });

    console.log("\nDATABASE STORAGE");

    console.table([
        {
            database: databaseStats.db,
            collections: databaseStats.collections,
            objects: databaseStats.objects,
            dataMB: mb(databaseStats.dataSize),
            storageMB: mb(databaseStats.storageSize),
            indexesMB: mb(databaseStats.indexSize),
            totalMB: mb(
                (databaseStats.storageSize ?? 0) +
                (databaseStats.indexSize ?? 0)
            ),
        },
    ]);

    const collections = await db
        .listCollections(
            {},
            {
                nameOnly: true,
            }
        )
        .toArray();

    const rows = [];

    for (const collectionInfo of collections) {
        const name = collectionInfo.name;

        try {
            const stats = await db.command({
                collStats: name,
            });

            rows.push({
                collection: name,
                documents: stats.count ?? 0,
                dataMB: mb(stats.size),
                storageMB: mb(stats.storageSize),
                indexes: stats.nindexes ?? 0,
                indexesMB: mb(stats.totalIndexSize),
                totalMB: mb(
                    (stats.storageSize ?? 0) +
                    (stats.totalIndexSize ?? 0)
                ),
            });
        } catch (error) {
            rows.push({
                collection: name,
                documents: null,
                dataMB: null,
                storageMB: null,
                indexes: null,
                indexesMB: null,
                totalMB: null,
                error: error?.message ?? String(error),
            });
        }
    }

    rows.sort(
        (a, b) =>
            (b.totalMB ?? -1) -
            (a.totalMB ?? -1)
    );

    console.log(
        "\nCOLLECTION STORAGE — LARGEST FIRST"
    );

    console.table(rows);

    console.log("\nTOP 10 COLLECTIONS");

    console.table(
        rows.slice(0, 10)
    );

    await mongoose.disconnect();

    console.log(
        "\nAudit complete. No data was modified.\n"
    );
}

main().catch(async (error) => {
    console.error(
        "\nMongoDB storage audit failed:",
        error
    );

    try {
        await mongoose.disconnect();
    } catch {
        // Ignore disconnect failure.
    }

    process.exitCode = 1;
});

