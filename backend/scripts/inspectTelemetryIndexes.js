import dns from "node:dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

const toMB = (bytes = 0) =>
  (
    Number(bytes) /
    1024 /
    1024
  ).toFixed(2);

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

  const db = mongoose.connection.db;
  const collection = db.collection("telemetries");

  console.log(
    "\n==============================================="
  );
  console.log(
    "ASHMAAN TELEMETRY INDEX INSPECTION"
  );
  console.log(
    "===============================================\n"
  );

  console.log(
    `Connected database: ${mongoose.connection.name}\n`
  );

  const indexes = await collection.indexes();

  const stats = await db.command({
    collStats: "telemetries",
  });

  const indexSizes = stats.indexSizes ?? {};

  const rows = indexes
    .map((index) => ({
      name: index.name,
      key: JSON.stringify(index.key),
      unique: index.unique === true,
      sparse: index.sparse === true,
      ttlSeconds: index.expireAfterSeconds ?? null,
      sizeMB: Number(
        toMB(indexSizes[index.name] ?? 0)
      ),
    }))
    .sort(
      (a, b) =>
        b.sizeMB - a.sizeMB
    );

  console.table(rows);

  console.log(
    `\nIndex count : ${indexes.length}`
  );

  console.log(
    `Total index : ${toMB(stats.totalIndexSize)} MB`
  );

  console.log(
    `Documents   : ${stats.count}`
  );

  console.log(
    `Data size   : ${toMB(stats.size)} MB`
  );

  console.log(
    `Storage     : ${toMB(stats.storageSize)} MB`
  );

  console.log(
    "\nREAD-ONLY: no documents or indexes modified."
  );
} catch (error) {
  console.error(
    "\nInspection failed:",
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