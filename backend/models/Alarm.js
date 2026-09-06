import mongoose from "mongoose";

const alarmSchema = new mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      index: true,
    },

    installation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Installation",
      required: true,
      index: true,
    },

    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      index: true,
    },

    vrmAlarmId: {
      type: String,
      index: true,
    },

    alarmCode: {
      type: String,
      index: true,
    },

    title: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
      index: true,
    },

    severity: {
      type: String,
      enum: [
        "INFO",
        "WARNING",
        "MINOR",
        "MAJOR",
        "CRITICAL",
        "UNKNOWN",
      ],
      default: "UNKNOWN",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "ACKNOWLEDGED",
        "CLEARED",
        "UNKNOWN",
      ],
      default: "UNKNOWN",
      index: true,
    },

    startedAt: {
      type: Date,
      index: true,
    },

    acknowledgedAt: {
      type: Date,
    },

    clearedAt: {
      type: Date,
      index: true,
    },

    durationSeconds: {
      type: Number,
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

alarmSchema.index({
  installation: 1,
  startedAt: -1,
});

alarmSchema.index({
  installation: 1,
  status: 1,
  severity: 1,
});

alarmSchema.index({
  device: 1,
  startedAt: -1,
});

const Alarm = mongoose.model(
  "Alarm",
  alarmSchema
);

export default Alarm;