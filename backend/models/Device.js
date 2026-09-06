import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    installation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Installation",
      required: true,
      index: true,
    },

    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      index: true,
    },

    vrmDeviceId: {
      type: String,
      index: true,
    },

    deviceInstance: {
      type: String,
      index: true,
    },

    name: {
      type: String,
      trim: true,
    },

    productName: {
      type: String,
      trim: true,
    },

    productId: {
      type: String,
      trim: true,
    },

    deviceType: {
      type: String,
      trim: true,
      index: true,
    },

    firmwareVersion: {
      type: String,
      trim: true,
    },

    serialNumber: {
      type: String,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "ONLINE",
        "OFFLINE",
        "FAULT",
        "UNKNOWN",
      ],
      default: "UNKNOWN",
      index: true,
    },

    lastSeenAt: {
      type: Date,
      index: true,
    },

    source: {
      type: String,
      default: "VRM",
    },

    raw: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

deviceSchema.index({
  installation: 1,
  vrmDeviceId: 1,
});

deviceSchema.index({
  installation: 1,
  serialNumber: 1,
});

deviceSchema.index({
  installation: 1,
  deviceInstance: 1,
  deviceType: 1,
}, 
{
    unique: true,
    name: "uniq_installation_deviceType_deviceInstance",
  }
);

const Device = mongoose.model(
  "Device",
  deviceSchema
);

export default Device;