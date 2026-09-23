// services/security/portalAuthenticationService.js

import crypto from "node:crypto";

import env from "../../config/env.js";

import User, {
  USER_ACCOUNT_STATUS,
  normalizeEmail,
} from "../../models/User.js";

import Session, {
  SESSION_STATUS,
  hashSessionToken,
} from "../../models/Session.js";

import {
  PORTAL_REFRESH_TOKEN_TTL_SECONDS,
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
} from "./portalTokenService.js";


export const PORTAL_AUTH_ERROR =
  Object.freeze({
    INVALID_CREDENTIALS:
      "INVALID_CREDENTIALS",

    ACCOUNT_DISABLED:
      "ACCOUNT_DISABLED",

    SESSION_INVALID:
      "SESSION_INVALID",

    REFRESH_TOKEN_INVALID:
      "REFRESH_TOKEN_INVALID",

    CONFIGURATION_UNAVAILABLE:
      "CONFIGURATION_UNAVAILABLE",
  });


function createAuthError(
  code
) {
  const error =
    new Error(
      code
    );

  error.code =
    code;

  return error;
}


function requireConfiguration({
  secret,
  issuer,
  audience,
}) {
  if (
    typeof secret !==
      "string" ||
    secret.trim() ===
      "" ||
    typeof issuer !==
      "string" ||
    issuer.trim() ===
      "" ||
    typeof audience !==
      "string" ||
    audience.trim() ===
      ""
  ) {
    throw createAuthError(
      PORTAL_AUTH_ERROR
        .CONFIGURATION_UNAVAILABLE
    );
  }
}


function publicUser(
  user
) {
  return Object.freeze({
    id:
      String(
        user._id
      ),

    email:
      user.email,

    displayName:
      user.displayName ??
      null,

    role:
      user.role,

    status:
      user.status,
  });
}


export function createPortalAuthenticationService({
  UserModel =
    User,

  SessionModel =
    Session,

  secret =
    env.jwtSecret,

  issuer =
    env.jwtIssuer,

  audience =
    env.jwtAudience,

  now =
    () =>
      new Date(),

  createSessionId =
    () =>
      crypto.randomUUID(),
} = {}) {
  requireConfiguration({
    secret,
    issuer,
    audience,
  });


  async function login({
    email,
    password,
  }) {
    const normalizedEmail =
      normalizeEmail(
        email
      );


    if (
      typeof normalizedEmail !==
        "string" ||
      normalizedEmail ===
        "" ||
      typeof password !==
        "string" ||
      password ===
        ""
    ) {
      throw createAuthError(
        PORTAL_AUTH_ERROR
          .INVALID_CREDENTIALS
      );
    }


    const user =
      await UserModel
        .findForAuthentication(
          normalizedEmail
        );


    if (
      !user ||
      !await user
        .verifyPassword(
          password
        )
    ) {
      throw createAuthError(
        PORTAL_AUTH_ERROR
          .INVALID_CREDENTIALS
      );
    }


    if (
      user.status !==
        USER_ACCOUNT_STATUS.ACTIVE
    ) {
      throw createAuthError(
        PORTAL_AUTH_ERROR
          .ACCOUNT_DISABLED
      );
    }


    const sessionId =
      createSessionId();

    const issuedAt =
      now();

    const expiresAt =
      new Date(
        issuedAt.getTime() +
        (
          PORTAL_REFRESH_TOKEN_TTL_SECONDS *
          1000
        )
      );


    const accessToken =
      issueAccessToken({
        subject:
          String(
            user._id
          ),

        role:
          user.role,

        sessionId,
        secret,
        issuer,
        audience,
      });


    const refreshToken =
      issueRefreshToken({
        subject:
          String(
            user._id
          ),

        role:
          user.role,

        sessionId,
        secret,
        issuer,
        audience,
      });


    await SessionModel.create({
      user:
        user._id,

      sessionId,

      refreshTokenHash:
        hashSessionToken(
          refreshToken
        ),

      status:
        SESSION_STATUS.ACTIVE,

      expiresAt,
    });


    user.lastLoginAt =
      issuedAt;

    await user.save();


    return Object.freeze({
      accessToken,
      refreshToken,
      user:
        publicUser(
          user
        ),
    });
  }


  async function refresh({
    refreshToken,
  }) {
    let tokenIdentity;

    try {
      tokenIdentity =
        verifyRefreshToken({
          token:
            refreshToken,

          secret,
          issuer,
          audience,
        });
    } catch {
      throw createAuthError(
        PORTAL_AUTH_ERROR
          .REFRESH_TOKEN_INVALID
      );
    }


    const session =
      await SessionModel
        .findForRefresh(
          tokenIdentity
            .sessionId
        );


    if (
      !session ||
      !session.isUsable(
        now()
      ) ||
      String(
        session.user
      ) !==
        tokenIdentity.subject ||
      !session
        .matchesRefreshToken(
          refreshToken
        )
    ) {
      throw createAuthError(
        PORTAL_AUTH_ERROR
          .SESSION_INVALID
      );
    }


    const user =
      await UserModel
        .findById(
          tokenIdentity.subject
        );


    if (
      !user ||
      user.status !==
        USER_ACCOUNT_STATUS.ACTIVE
    ) {
      session.revoke(
        "USER_UNAVAILABLE",
        now()
      );

      await session.save();

      throw createAuthError(
        PORTAL_AUTH_ERROR
          .ACCOUNT_DISABLED
      );
    }


    const accessToken =
      issueAccessToken({
        subject:
          String(
            user._id
          ),

        role:
          user.role,

        sessionId:
          session.sessionId,

        secret,
        issuer,
        audience,
      });


    const rotatedRefreshToken =
      issueRefreshToken({
        subject:
          String(
            user._id
          ),

        role:
          user.role,

        sessionId:
          session.sessionId,

        secret,
        issuer,
        audience,
      });


        const rotationTime =
      now();


    const rotatedSession =
      await SessionModel
        .rotateRefreshToken({
          sessionId:
            session.sessionId,

          userId:
            user._id,

          currentRefreshToken:
            refreshToken,

          nextRefreshToken:
            rotatedRefreshToken,

          now:
            rotationTime,
        });


    if (
      !rotatedSession
    ) {
      throw createAuthError(
        PORTAL_AUTH_ERROR
          .SESSION_INVALID
      );
    }


    return Object.freeze({
      accessToken,

      refreshToken:
        rotatedRefreshToken,

      user:
        publicUser(
          user
        ),
    });
  }


  async function logout({
    sessionId,
  }) {
    if (
      typeof sessionId !==
        "string" ||
      sessionId.trim() ===
        ""
    ) {
      return false;
    }


    const session =
      await SessionModel
        .findOne({
          sessionId:
            sessionId.trim(),
        });


    if (
      !session
    ) {
      return false;
    }


    if (
      session.status !==
        SESSION_STATUS.REVOKED
    ) {
      session.revoke(
        "LOGOUT",
        now()
      );

      await session.save();
    }


    return true;
  }


  async function getCurrentUser({
    userId,
  }) {
    if (
      typeof userId !==
        "string" ||
      userId.trim() ===
        ""
    ) {
      return null;
    }


    const user =
      await UserModel
        .findById(
          userId.trim()
        );


    if (
      !user ||
      user.status !==
        USER_ACCOUNT_STATUS.ACTIVE
    ) {
      return null;
    }


    return publicUser(
      user
    );
  }


  return Object.freeze({
    login,
    refresh,
    logout,
    getCurrentUser,
  });
}


export default
  createPortalAuthenticationService;
