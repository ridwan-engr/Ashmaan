require("dotenv").config();

const dns = require("dns");

dns.setServers([
  "1.1.1.1",
  "8.8.8.8"
]);

const mongoose = require("mongoose");

(async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI,
      {
        serverSelectionTimeoutMS: 15000
      }
    );

    const collection =
      mongoose.connection.db.collection(
        "telemetries"
      );

    const sample =
      await collection.findOne(
        {
          installation: {
            $ne: null
          },
          vrmAttributeId: {
            $ne: null
          }
        },
        {
          projection: {
            installation: 1,
            vrmAttributeId: 1,
            timestamp: 1,
            parameter: 1
          }
        }
      );

    console.log(sample);

  } catch (error) {
    console.error(error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
})();
