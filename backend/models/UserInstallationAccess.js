// models/UserInstallationAccess.js

import mongoose from "mongoose";

const userInstallationAccessSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      installation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Installation",
        required: true,
        index: true,
      },

      active: {
        type: Boolean,
        default: true,
        index: true,
      },

      grantedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

userInstallationAccessSchema.index(
  {
    user: 1,
    installation: 1,
  },
  {
    unique: true,
  }
);

userInstallationAccessSchema.index({
  user: 1,
  active: 1,
});

userInstallationAccessSchema.index({
  installation: 1,
  active: 1,
});

const UserInstallationAccess =
  mongoose.model(
    "UserInstallationAccess",
    userInstallationAccessSchema
  );

export default UserInstallationAccess;