import mongoose from "mongoose";

const energyRecordSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },

    source: {
      type: String,
      enum: ["VRM"],
      default: "VRM",
      required: true,
    },

    metric: {
      type: String,
      required: true,
      index: true,
    },

    timestamp: {
      type: Date,
      required: true,
      index: true,
    },

    value: {
      type: Number,
      required: true,
    },

    interval: {
      type: String,
      default: null,
      index: true,
    },

    statisticType: {
      type: String,
      default: null,
      index: true,
    },

    unit: {
      type: String,
      default: null,
    },

    raw: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

energyRecordSchema.index(
  {
    installation: 1,
    metric: 1,
    timestamp: 1,
    interval: 1,
    statisticType: 1,
  },
  {
    unique: true,
  }
);

const EnergyRecord =
  mongoose.model(
    "EnergyRecord",
    energyRecordSchema
  );

export default EnergyRecord;