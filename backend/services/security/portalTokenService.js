// services/security/portalTokenService.js

import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import {
  isKnownRole,
} from "./authorizationRbacService.js";


export const PORTAL_TOKEN_TYPE =
  Object.freeze({
    ACCESS: "ACCESS",
    REFRESH: "REFRESH",
  });


export const PORTAL_TOKEN_ALGORITHM =
  "HS256";

export const PORTAL_ACCESS_TOKEN_TTL_SECONDS =
  15 * 60;

export const PORTAL_REFRESH_TOKEN_TTL_SECONDS =
  7 * 24 * 60 * 60;


function requireNonEmptyString(
  value,
  code
) {
  if (
    typeof value !==
      "string" ||
    value.trim() ===
      ""
  ) {
    throw new Error(
      code
    );
  }

  return value.trim();
}


function requireJwtSecret(
  secret
) {
  return requireNonEmptyString(
    secret,
    "JWT_SECRET_REQUIRED"
  );
}


function requireIssuer(
  issuer
) {
  return requireNonEmptyString(
    issuer,
    "JWT_ISSUER_REQUIRED"
  );
}


function requireAudience(
  audience
) {
  return requireNonEmptyString(
    audience,
    "JWT_AUDIENCE_REQUIRED"
  );
}


function validateIdentity({
  subject,
  role,
  sessionId,
}) {
  const normalizedSubject =
    requireNonEmptyString(
      subject,
      "TOKEN_SUBJECT_REQUIRED"
    );

  const normalizedRole =
    requireNonEmptyString(
      role,
      "TOKEN_ROLE_REQUIRED"
    )
      .toUpperCase();

  const normalizedSessionId =
    requireNonEmptyString(
      sessionId,
      "TOKEN_SESSION_ID_REQUIRED"
    );


  if (
    !isKnownRole(
      normalizedRole
    )
  ) {
    throw new Error(
      "TOKEN_ROLE_UNKNOWN"
    );
  }


  return Object.freeze({
    subject:
      normalizedSubject,

    role:
      normalizedRole,

    sessionId:
      normalizedSessionId,
  });
}


function signPortalToken({
  subject,
  role,
  sessionId,
  tokenType,
  expiresInSeconds,
  secret,
  issuer,
  audience,
}) {
  const identity =
    validateIdentity({
      subject,
      role,
      sessionId,
    });


  const signingSecret =
    requireJwtSecret(
      secret
    );

  const signingIssuer =
    requireIssuer(
      issuer
    );

  const signingAudience =
    requireAudience(
      audience
    );


  if (
    tokenType !==
      PORTAL_TOKEN_TYPE.ACCESS &&
    tokenType !==
      PORTAL_TOKEN_TYPE.REFRESH
  ) {
    throw new Error(
      "TOKEN_TYPE_INVALID"
    );
  }


  const tokenId =
    crypto.randomUUID();


  return jwt.sign(
    {
      role:
        identity.role,

      sid:
        identity.sessionId,

      type:
        tokenType,
    },
    signingSecret,
    {
      algorithm:
        PORTAL_TOKEN_ALGORITHM,

      subject:
        identity.subject,

      jwtid:
        tokenId,

      issuer:
        signingIssuer,

      audience:
        signingAudience,

      expiresIn:
        expiresInSeconds,
    }
  );
}


export function issueAccessToken({
  subject,
  role,
  sessionId,
  secret,
  issuer,
  audience,
}) {
  return signPortalToken({
    subject,
    role,
    sessionId,

    tokenType:
      PORTAL_TOKEN_TYPE.ACCESS,

    expiresInSeconds:
      PORTAL_ACCESS_TOKEN_TTL_SECONDS,

    secret,
    issuer,
    audience,
  });
}


export function issueRefreshToken({
  subject,
  role,
  sessionId,
  secret,
  issuer,
  audience,
}) {
  return signPortalToken({
    subject,
    role,
    sessionId,

    tokenType:
      PORTAL_TOKEN_TYPE.REFRESH,

    expiresInSeconds:
      PORTAL_REFRESH_TOKEN_TTL_SECONDS,

    secret,
    issuer,
    audience,
  });
}


function verifyPortalToken({
  token,
  expectedType,
  secret,
  issuer,
  audience,
}) {
  const normalizedToken =
    requireNonEmptyString(
      token,
      "TOKEN_REQUIRED"
    );

  const verificationSecret =
    requireJwtSecret(
      secret
    );

  const verificationIssuer =
    requireIssuer(
      issuer
    );

  const verificationAudience =
    requireAudience(
      audience
    );


  const payload =
    jwt.verify(
      normalizedToken,
      verificationSecret,
      {
        algorithms: [
          PORTAL_TOKEN_ALGORITHM,
        ],

        issuer:
          verificationIssuer,

        audience:
          verificationAudience,
      }
    );


  if (
    !payload ||
    typeof payload !==
      "object"
  ) {
    throw new Error(
      "TOKEN_PAYLOAD_INVALID"
    );
  }


  if (
    payload.type !==
      expectedType
  ) {
    throw new Error(
      "TOKEN_TYPE_MISMATCH"
    );
  }


  const subject =
    requireNonEmptyString(
      payload.sub,
      "TOKEN_SUBJECT_REQUIRED"
    );

  const role =
    requireNonEmptyString(
      payload.role,
      "TOKEN_ROLE_REQUIRED"
    )
      .toUpperCase();

  const sessionId =
    requireNonEmptyString(
      payload.sid,
      "TOKEN_SESSION_ID_REQUIRED"
    );

  const tokenId =
    requireNonEmptyString(
      payload.jti,
      "TOKEN_ID_REQUIRED"
    );


  if (
    !isKnownRole(
      role
    )
  ) {
    throw new Error(
      "TOKEN_ROLE_UNKNOWN"
    );
  }


  return Object.freeze({
    subject,
    role,
    sessionId,
    tokenId,

    type:
      payload.type,

    issuedAt:
      payload.iat,

    expiresAt:
      payload.exp,

    issuer:
      payload.iss,

    audience:
      payload.aud,
  });
}


export function verifyAccessToken(
  options
) {
  return verifyPortalToken({
    ...options,

    expectedType:
      PORTAL_TOKEN_TYPE.ACCESS,
  });
}


export function verifyRefreshToken(
  options
) {
  return verifyPortalToken({
    ...options,

    expectedType:
      PORTAL_TOKEN_TYPE.REFRESH,
  });
}
