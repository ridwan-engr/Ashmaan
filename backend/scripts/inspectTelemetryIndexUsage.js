import dns from "node:dns";
import "dotenv/config";
import mongoose from "mongoose";

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

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
    "ASHMAAN TELEMETRY INDEX USAGE"
  );
  console.log(
    "===============================================\n"
  );

  const usage =
    await collection
      .aggregate([
        {
          $indexStats: {},
        },
        {
          $project: {
            _id: 0,
            name: 1,
            key: 1,
            accesses: 1,
          },
        },
      ])
      .toArray();

  usage.sort(
    (a, b) =>
      Number(
        b.accesses?.ops ?? 0
      ) -
      Number(
        a.accesses?.ops ?? 0
      )
  );

  console.table(
    usage.map(
      (item) => ({
        name:
          item.name,

        key:
          JSON.stringify(
            item.key
          ),

        accesses:
          item.accesses
            ?.ops ?? 0,

        since:
          item.accesses
            ?.since ?? null,
      })
    )
  );

  console.log(
    "\nREAD-ONLY: no database changes made."
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