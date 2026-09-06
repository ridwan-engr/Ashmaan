import mongoose from "mongoose";

const installationSchema = new mongoose.Schema(
    {
        site: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Site",
            index: true,
        },

        vrmSiteId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        vrmUserId: {
            type: String,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        identifier: {
            type: String,
            trim: true,
            index: true,
        },

        timezone: {
            type: String,
        },

        lastSeenAt: {
            type: Date,
            index: true,
        },

        lastSyncAt: {
            type: Date,
            index: true,
        },

        status: {
            type: String,
            enum: [
                "ONLINE",
                "STALE",
                "OFFLINE",
                "UNKNOWN",
                "INACTIVE",
            ],
            default: "UNKNOWN",
            index: true,
        },

        source: {
            type: String,
            default: "VRM",
        },

        syncEnabled: {
            type: Boolean,
            default: true,
            index: true,
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

installationSchema.index({
    vrmSiteId: 1,
    lastSeenAt: -1,
});

const Installation = mongoose.model(
    "Installation",
    installationSchema
);

export default Installation;