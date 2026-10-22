import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import Device from "../models/Device.js";

dns.setServers([
  "1.1.1.1",
  "1.0.0.1",
]);

try {
  console.log("Connecting to MongoDB...");

  await mongoose.connect(
    process.env.MONGODB_URI
  );

  console.log("MONGODB CONNECTION: PASS");

  const installationId =
    new mongoose.Types.ObjectId(
      "6a9ad973e107b5d6d6628cb7"
    );

  const devices =
    await Device.find({
      installation:
        installationId,

      $or: [
        {
          deviceType:
            "VE.Bus System",

          deviceInstance:
            "0",
        },
        {
          deviceType:
            "Battery Monitor",

          deviceInstance:
            "256",
        },
        {
          deviceType:
            "Gateway",

          deviceInstance:
            "0",
        },
      ],
    })
      .select({
        _id: 0,
        deviceType: 1,
        deviceInstance: 1,
        name: 1,
        productName: 1,
        productId: 1,
        firmwareVersion: 1,
        serialNumber: 1,
        lastSeenAt: 1,
        raw: 1,
      })
      .sort({
        deviceType: 1,
        deviceInstance: 1,
      })
      .lean();

  console.log(
    JSON.stringify(
      {
        installationId:
          installationId.toString(),

        deviceCount:
          devices.length,

        devices,
      },
      null,
      2
    )
  );
}
catch (error) {
  console.error(
    "CURRENT DEVICE RAW QUERY FAILED:",
    error
  );

  process.exitCode = 1;
}
finally {
  await mongoose.disconnect();
}
