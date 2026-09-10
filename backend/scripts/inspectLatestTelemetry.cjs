const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");
require("dotenv").config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    const db = mongoose.connection.db;
    const telemetry = db.collection("telemetries");

    const doc = await telemetry.findOne(
        {},
        {
            sort: { createdAt: -1 },
            projection: {
                _id: 1,
                timestamp: 1,
                createdAt: 1,
                installation: 1,
                vrmAttributeId: 1,
                deviceType: 1,
                deviceInstance: 1,
                parameter: 1,
                numericValue: 1,
                value: 1,
                source: 1,
                aggregationLevel: 1,
                raw: 1
            }
        }
    );

    if (!doc) {
        console.log("No telemetry document found.");
        return;
    }

    console.log("Latest telemetry:");
    console.dir(doc, { depth: 5 });

    console.log("");
    console.log("Has raw field:", Object.prototype.hasOwnProperty.call(doc, "raw"));
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
