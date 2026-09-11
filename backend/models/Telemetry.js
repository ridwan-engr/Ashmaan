import mongoose from "mongoose";

const telemetrySchema = new mongoose.Schema(
    {
        site: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Site",
        },

        installation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Installation",
            required: true,

        },

        device: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Device",

        },

        timestamp: {
            type: Date,
            required: true,

        },

        parameter: {
            type: String,
            required: true,
            trim: true,

        },

        code: {
            type: String,
            trim: true,

        },

        description: {
            type: String,
            trim: true,
        },

        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },

        numericValue: {
            type: Number,

        },

        unit: {
            type: String,
            trim: true,
        },

        formattedValue: {
            type: String,
        },

        quality: {
            type: String,
            enum: [
                "VALID",
                "MISSING",
                "INVALID",
                "STALE",
                "ESTIMATED",
                "OUTLIER",
            ],
            default: "VALID",
        },

        source: {
            type: String,
            default: "VRM",
        },

        aggregationLevel: {
            type: String,
            enum: [
                "RAW",
                "1_MIN",
                "15_MIN",
                "HOURLY",
                "DAILY",
                "MONTHLY",
                "YEARLY",
            ],
            default: "RAW",
        },

        vrmAttributeId: {
            type: Number,

        },

        deviceType: {
            type: String,

        },

        deviceInstance: {
            type: String,

        },

        dbusServiceType: {
            type: String,
            default: null,
        },

        dbusPath: {
            type: String,
            default: null,
        },

        formatWithUnit: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

telemetrySchema.index({
    installation: 1,
    timestamp: -1,
});

telemetrySchema.index({
    installation: 1,
    vrmAttributeId: 1,
    timestamp: 1,
});

telemetrySchema.index({
    timestamp: -1,
});

telemetrySchema.index(
    {
        installation: 1,
        deviceType: 1,
        deviceInstance: 1,
        vrmAttributeId: 1,
        timestamp: 1,
    },
    {
        unique: true,
    }
);

const Telemetry = mongoose.model(
    "Telemetry",
    telemetrySchema
);

export default Telemetry;


