import mongoose from "mongoose";

const syncStateSchema =
  new mongoose.Schema(
    {
      installation: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Installation",

        required: true,

        index: true,
      },

      source: {
        type: String,

        enum: ["VRM"],

        default: "VRM",

        required: true,
      },

      syncType: {
        type: String,

        enum: [
          "TELEMETRY",
          "ALARMS",
          "STATISTICS",
          "DEVICES",
        ],

        required: true,
      },

      lastRecordTimestamp: {
        type: Date,

        default: null,
      },

      lastSuccessfulSyncAt: {
        type: Date,

        default: null,
      },

      lastAttemptAt: {
        type: Date,

        default: null,
      },

      status: {
        type: String,

        enum: [
          "NEVER_RUN",
          "SUCCESS",
          "PARTIAL",
          "FAILED",
        ],

        default: "NEVER_RUN",
      },

      recordsProcessed: {
        type: Number,

        default: 0,
      },

      lastError: {
        type: String,

        default: null,
      },

      metadata: {
        type: mongoose.Schema.Types.Mixed,

        default: {},
      },
    },
    {
      timestamps: true,
    }
  );


syncStateSchema.index(
  {
    installation: 1,
    source: 1,
    syncType: 1,
  },
  {
    unique: true,
  }
);


const SyncState =
  mongoose.model(
    "SyncState",
    syncStateSchema
  );


export default SyncState;