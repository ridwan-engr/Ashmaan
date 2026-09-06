import mongoose from "mongoose";

const alarmRuleSchema =
  new mongoose.Schema(
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

      device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
        default: null,
        index: true,
      },

      source: {
        type: String,
        enum: ["VRM"],
        default: "VRM",
        required: true,
      },

      vrmSiteId: {
        type: String,
        required: true,
        index: true,
      },

      vrmRuleId: {
        type: String,
        required: true,
      },

      ruleType: {
        type: String,
        enum: [
          "THRESHOLD",
          "ENUM",
        ],
        required: true,
      },

      vrmAttributeId: {
        type: Number,
        required: true,
        index: true,
      },

      deviceInstance: {
        type: String,
        required: true,
        index: true,
      },

      deviceTypeId: {
        type: Number,
        default: null,
        index: true,
      },

      deviceName: {
        type: String,
        default: null,
      },

      attributeName: {
        type: String,
        default: null,
      },

      enabled: {
        type: Boolean,
        default: true,
      },

      notifyAfterSeconds: {
        type: Number,
        default: 0,
      },

      lowAlarm: {
        type: Number,
        default: null,
      },

      lowAlarmHysteresis: {
        type: Number,
        default: null,
      },

      highAlarm: {
        type: Number,
        default: null,
      },

      highAlarmHysteresis: {
        type: Number,
        default: null,
      },

      activeValues: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },

      alarmActive: {
        type: Boolean,
        default: false,
      },

      vrmStatus: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },

      lastSyncAt: {
        type: Date,
        default: null,
      },

      raw: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

alarmRuleSchema.index(
  {
    installation: 1,
    vrmRuleId: 1,
  },
  {
    unique: true,
  }
);

alarmRuleSchema.index({
  installation: 1,
  vrmAttributeId: 1,
  deviceInstance: 1,
});

const AlarmRule =
  mongoose.model(
    "AlarmRule",
    alarmRuleSchema
  );

export default AlarmRule;