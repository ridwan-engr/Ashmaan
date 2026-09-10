const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");
require("dotenv").config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    const telemetry = mongoose.connection.db.collection("telemetries");

    const since = new Date(Date.now() - 30 * 60 * 1000);

    const docs = await telemetry
        .find(
            { createdAt: { $gte: since } },
            {
                projection: {
                    _id: 1,
                    timestamp: 1,
                    createdAt: 1,
                    installation: 1,
                    vrmAttributeId: 1,
                    deviceType: 1,
                    deviceInstance: 1,
                    parameter: 1,
                    raw: 1
                }
            }
        )
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

    console.log("Recent documents:", docs.length);

    for (const doc of docs) {
        console.log({
            _id: doc._id,
            timestamp: doc.timestamp,
            createdAt: doc.createdAt,
            parameter: doc.parameter,
            hasRaw: Object.prototype.hasOwnProperty.call(doc, "raw")
        });
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
