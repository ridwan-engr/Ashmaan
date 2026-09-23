// models/Session.js

import crypto from "node:crypto";
import mongoose from "mongoose";


export const SESSION_STATUS =
  Object.freeze({
    ACTIVE: "ACTIVE",
    REVOKED: "REVOKED",
    EXPIRED: "EXPIRED",
  });


export function hashSessionToken(
  token
) {
  if (
    typeof token !==
    "string" ||
    token.length ===
    0
  ) {
    throw new Error(
      "SESSION_TOKEN_REQUIRED"
    );
  }

  return crypto
    .createHash(
      "sha256"
    )
    .update(
      token,
      "utf8"
    )
    .digest(
      "hex"
    );
}


const sessionSchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "User",
        required:
          true,
        index:
          true,
      },

      sessionId: {
        type:
          String,
        required:
          true,
        unique:
          true,
        immutable:
          true,
      },

      refreshTokenHash: {
        type:
          String,
        required:
          true,
        select:
          false,
      },

      status: {
        type:
          String,
        required:
          true,
        enum:
          Object.values(
            SESSION_STATUS
          ),
        default:
          SESSION_STATUS.ACTIVE,
      },

      expiresAt: {
        type:
          Date,
        required:
          true,
      },

      lastUsedAt: {
        type:
          Date,
        default:
          null,
      },

      revokedAt: {
        type:
          Date,
        default:
          null,
      },

      revocationReason: {
        type:
          String,
        trim:
          true,
        default:
          null,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,

      collection:
        "sessions",

      toJSON: {
        transform(
          _document,
          returned
        ) {
          delete returned
            .refreshTokenHash;

          return returned;
        },
      },

      toObject: {
        transform(
          _document,
          returned
        ) {
          delete returned
            .refreshTokenHash;

          return returned;
        },
      },
    }
  );


sessionSchema.index(
  {
    user: 1,
    status: 1,
  }
);


sessionSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds:
      0,
  }
);


sessionSchema.methods.matchesRefreshToken =
  function matchesRefreshToken(
    token
  ) {
    if (
      typeof token !==
      "string" ||
      token.length ===
      0 ||
      typeof this
        .refreshTokenHash !==
      "string" ||
      this
        .refreshTokenHash
        .length ===
      0
    ) {
      return false;
    }

    const candidate =
      hashSessionToken(
        token
      );

    const storedBuffer =
      Buffer.from(
        this.refreshTokenHash,
        "hex"
      );

    const candidateBuffer =
      Buffer.from(
        candidate,
        "hex"
      );

    if (
      storedBuffer.length !==
      candidateBuffer.length
    ) {
      return false;
    }

    return crypto
      .timingSafeEqual(
        storedBuffer,
        candidateBuffer
      );
  };


sessionSchema.methods.isUsable =
  function isUsable(
    now =
      new Date()
  ) {
    if (
      this.status !==
      SESSION_STATUS.ACTIVE
    ) {
      return false;
    }

    if (
      !(this.expiresAt instanceof Date) ||
      Number.isNaN(
        this.expiresAt.getTime()
      )
    ) {
      return false;
    }

    return (
      this.expiresAt.getTime() >
      now.getTime()
    );
  };


sessionSchema.methods.revoke =
  function revoke(
    reason =
      "LOGOUT",
    now =
      new Date()
  ) {
    this.status =
      SESSION_STATUS.REVOKED;

    this.revokedAt =
      now;

    this.revocationReason =
      reason;

    return this;
  };


sessionSchema.statics.findForRefresh =
  function findForRefresh(
    sessionId
  ) {
    if (
      typeof sessionId !==
      "string" ||
      sessionId.trim() ===
      ""
    ) {
      return null;
    }

    return this
      .findOne({
        sessionId:
          sessionId.trim(),
      })
      .select(
        "+refreshTokenHash"
      );
  };

sessionSchema.statics.rotateRefreshToken =
  function rotateRefreshToken({
    sessionId,
    userId,
    currentRefreshToken,
    nextRefreshToken,
    now =
    new Date(),
  }) {
    if (
      typeof sessionId !==
      "string" ||
      sessionId.trim() ===
      "" ||
      userId == null ||
      typeof currentRefreshToken !==
      "string" ||
      currentRefreshToken.length ===
      0 ||
      typeof nextRefreshToken !==
      "string" ||
      nextRefreshToken.length ===
      0 ||
      !(now instanceof Date) ||
      Number.isNaN(
        now.getTime()
      )
    ) {
      return null;
    }


    const currentHash =
      hashSessionToken(
        currentRefreshToken
      );

    const nextHash =
      hashSessionToken(
        nextRefreshToken
      );


    return this.findOneAndUpdate(
      {
        sessionId:
          sessionId.trim(),

        user:
          userId,

        status:
          SESSION_STATUS.ACTIVE,

        expiresAt: {
          $gt:
            now,
        },

        refreshTokenHash:
          currentHash,
      },

      {
        $set: {
          refreshTokenHash:
            nextHash,

          lastUsedAt:
            now,
        },
      },

      {
        new:
          true,
      }
    );
  };


const Session =
  mongoose.models.Session ||
  mongoose.model(
    "Session",
    sessionSchema
  );


export default Session;
