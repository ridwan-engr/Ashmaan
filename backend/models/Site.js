import mongoose from "mongoose";

const siteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
    },

    location: {
      country: {
        type: String,
        trim: true,
      },

      state: {
        type: String,
        trim: true,
      },

      city: {
        type: String,
        trim: true,
      },

      address: {
        type: String,
        trim: true,
      },

      latitude: {
        type: Number,
      },

      longitude: {
        type: Number,
      },
    },

    timezone: {
      type: String,
      default: "Africa/Lagos",
    },

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "INACTIVE",
        "MAINTENANCE",
        "DECOMMISSIONED",
      ],
      default: "ACTIVE",
      index: true,
    },

    source: {
      type: String,
      enum: ["VRM", "MANUAL", "IMPORT"],
      default: "VRM",
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

siteSchema.index({ name: 1 });
siteSchema.index({ "location.country": 1 });
siteSchema.index({ "location.state": 1 });
siteSchema.index({ "location.city": 1 });

const Site = mongoose.model("Site", siteSchema);

export default Site;