// models/User.js

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import {
  RBAC_ROLES,
  isKnownRole,
} from "../services/security/authorizationRbacService.js";


const USER_ACCOUNT_STATUS =
  Object.freeze({
    ACTIVE: "ACTIVE",
    DISABLED: "DISABLED",
  });


const normalizeEmail = (
  value
) => {
  if (
    typeof value !==
    "string"
  ) {
    return value;
  }

  return value
    .trim()
    .toLowerCase();
};


const userSchema =
  new mongoose.Schema(
    {
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      passwordHash: {
        type: String,
        required: true,
        select: false,
      },

      role: {
        type: String,
        required: true,
        default:
          RBAC_ROLES.USER,

        validate: {
          validator:
            (value) =>
              isKnownRole(
                value
              ),

          message:
            "Unknown RBAC role.",
        },
      },

      status: {
        type: String,
        required: true,
        enum:
          Object.values(
            USER_ACCOUNT_STATUS
          ),
        default:
          USER_ACCOUNT_STATUS.ACTIVE,
      },

      displayName: {
        type: String,
        trim: true,
        default: null,
      },

      lastLoginAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,

      versionKey: false,

      collection:
        "users",

      toJSON: {
        transform(
          _document,
          returned
        ) {
          delete returned.passwordHash;

          return returned;
        },
      },

      toObject: {
        transform(
          _document,
          returned
        ) {
          delete returned.passwordHash;

          return returned;
        },
      },
    }
  );


userSchema.index(
  {
    email: 1,
  },
  {
    unique: true,
  }
);


userSchema.pre(
  "validate",
  function normalizeIdentity() {
    if (
      typeof this.email ===
        "string"
    ) {
      this.email =
        normalizeEmail(
          this.email
        );
    }

    if (
      typeof this.role ===
        "string"
    ) {
      this.role =
        this.role
          .trim()
          .toUpperCase();
    }
  }
);


userSchema.methods.verifyPassword =
  async function verifyPassword(
    password
  ) {
    if (
      typeof password !==
        "string" ||
      password.length ===
        0 ||
      typeof this.passwordHash !==
        "string" ||
      this.passwordHash.length ===
        0
    ) {
      return false;
    }

    return bcrypt.compare(
      password,
      this.passwordHash
    );
  };


userSchema.statics.hashPassword =
  async function hashPassword(
    password
  ) {
    if (
      typeof password !==
        "string" ||
      password.length <
        12
    ) {
      throw new Error(
        "PASSWORD_MINIMUM_LENGTH_12"
      );
    }

    return bcrypt.hash(
      password,
      12
    );
  };


userSchema.statics.findForAuthentication =
  function findForAuthentication(
    email
  ) {
    const normalized =
      normalizeEmail(
        email
      );

    if (
      typeof normalized !==
        "string" ||
      normalized.length ===
        0
    ) {
      return null;
    }

    return this
      .findOne({
        email:
          normalized,
      })
      .select(
        "+passwordHash"
      );
  };


export {
  USER_ACCOUNT_STATUS,
  normalizeEmail,
};


const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    userSchema
  );


export default User;
