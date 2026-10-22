// scripts/validatePortalAccessTokenMiddleware.js

import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import env from "../config/env.js";

import {
  RBAC_ROLES,
} from "../services/security/authorizationRbacService.js";

import {
  issueAccessToken,
  issueRefreshToken,
  PORTAL_TOKEN_ALGORITHM,
  PORTAL_TOKEN_TYPE,
} from "../services/security/portalTokenService.js";

import authenticatePortalAccessToken, {
  extractPortalBearerToken,
} from "../middleware/authenticatePortalAccessToken.js";


let passed = 0;


function check(
  condition,
  description
) {
  assert.equal(
    Boolean(condition),
    true,
    description
  );

  passed += 1;

  console.log(
    `PASS ${passed}: ${description}`
  );
}


function createResponse() {
  return {
    statusCode:
      200,

    body:
      null,

    status(
      code
    ) {
      this.statusCode =
        code;

      return this;
    },

    json(
      body
    ) {
      this.body =
        body;

      return this;
    },
  };
}


function executeMiddleware(
  authorization
) {
  const req = {
    headers: {},
  };

  if (
    authorization !==
      undefined
  ) {
    req.headers.authorization =
      authorization;
  }

  const res =
    createResponse();

  let nextCalled =
    false;

  authenticatePortalAccessToken(
    req,
    res,
    () => {
      nextCalled =
        true;
    }
  );

  return {
    req,
    res,
    nextCalled,
  };
}


console.log(
  "\n================================================"
);

console.log(
  "ASHMAAN PORTAL P.1F-A — ACCESS TOKEN MIDDLEWARE"
);

console.log(
  "================================================\n"
);


check(
  extractPortalBearerToken(
    undefined
  ) ===
    null,
  "missing Authorization header yields no token"
);


check(
  extractPortalBearerToken(
    "Basic abc"
  ) ===
    null,
  "non-Bearer authorization is rejected"
);


check(
  extractPortalBearerToken(
    "Bearer abc.def.ghi"
  ) ===
    "abc.def.ghi",
  "Bearer token extraction is deterministic"
);


const subject =
  "portal-user-001";

const role =
  RBAC_ROLES.ADMINISTRATOR;

const sessionId =
  "portal-session-001";


const accessToken =
  issueAccessToken({
    subject,
    role,
    sessionId,

    secret:
      env.jwtSecret,

    issuer:
      env.jwtIssuer,

    audience:
      env.jwtAudience,
  });


const valid =
  executeMiddleware(
    `Bearer ${accessToken}`
  );


check(
  valid.nextCalled ===
    true,
  "valid ACCESS token reaches next middleware"
);


check(
  valid.res.statusCode ===
    200,
  "valid ACCESS token does not emit authentication error"
);


check(
  valid.req.auth
    ?.authenticated ===
    true,
  "valid ACCESS token creates authenticated request identity"
);


check(
  valid.req.auth
    ?.userId ===
    subject,
  "request auth preserves token subject"
);


check(
  valid.req.auth
    ?.identity?.id ===
    subject,
  "authentication identity preserves subject"
);


check(
  valid.req.auth
    ?.role ===
    role,
  "request auth preserves authoritative RBAC role"
);


check(
  valid.req.auth
    ?.identity?.type ===
    role,
  "authentication identity preserves RBAC role"
);


check(
  valid.req.auth
    ?.sessionId ===
    sessionId,
  "request auth preserves session identity"
);


check(
  typeof valid.req.auth
    ?.tokenId ===
    "string" &&
  valid.req.auth.tokenId
    .trim() !==
    "",
  "request auth preserves mandatory token jti"
);


check(
  Object.isFrozen(
    valid.req.auth
  ),
  "request authentication context is frozen"
);


const missing =
  executeMiddleware(
    undefined
  );


check(
  missing.nextCalled ===
    false &&
  missing.res.statusCode ===
    401,
  "missing Bearer token fails with 401"
);


const malformed =
  executeMiddleware(
    "Bearer not-a-jwt"
  );


check(
  malformed.nextCalled ===
    false &&
  malformed.res.statusCode ===
    401,
  "malformed JWT fails with 401"
);


const refreshToken =
  issueRefreshToken({
    subject,
    role,
    sessionId,

    secret:
      env.jwtSecret,

    issuer:
      env.jwtIssuer,

    audience:
      env.jwtAudience,
  });


const refreshAsAccess =
  executeMiddleware(
    `Bearer ${refreshToken}`
  );


check(
  refreshAsAccess.nextCalled ===
    false &&
  refreshAsAccess.res.statusCode ===
    401,
  "REFRESH token cannot authenticate as ACCESS token"
);


const wrongIssuerToken =
  issueAccessToken({
    subject,
    role,
    sessionId,

    secret:
      env.jwtSecret,

    issuer:
      "wrong-issuer",

    audience:
      env.jwtAudience,
  });


const wrongIssuer =
  executeMiddleware(
    `Bearer ${wrongIssuerToken}`
  );


check(
  wrongIssuer.nextCalled ===
    false &&
  wrongIssuer.res.statusCode ===
    401,
  "wrong token issuer fails with 401"
);


const wrongAudienceToken =
  issueAccessToken({
    subject,
    role,
    sessionId,

    secret:
      env.jwtSecret,

    issuer:
      env.jwtIssuer,

    audience:
      "wrong-audience",
  });


const wrongAudience =
  executeMiddleware(
    `Bearer ${wrongAudienceToken}`
  );


check(
  wrongAudience.nextCalled ===
    false &&
  wrongAudience.res.statusCode ===
    401,
  "wrong token audience fails with 401"
);


const wrongSignatureToken =
  issueAccessToken({
    subject,
    role,
    sessionId,

    secret:
      "wrong-signing-secret",

    issuer:
      env.jwtIssuer,

    audience:
      env.jwtAudience,
  });


const wrongSignature =
  executeMiddleware(
    `Bearer ${wrongSignatureToken}`
  );


check(
  wrongSignature.nextCalled ===
    false &&
  wrongSignature.res.statusCode ===
    401,
  "wrong token signature fails with 401"
);


const expiredToken =
  jwt.sign(
    {
      role,
      sid:
        sessionId,

      type:
        PORTAL_TOKEN_TYPE.ACCESS,
    },
    env.jwtSecret,
    {
      algorithm:
        PORTAL_TOKEN_ALGORITHM,

      subject,

      jwtid:
        "expired-token-jti",

      issuer:
        env.jwtIssuer,

      audience:
        env.jwtAudience,

      expiresIn:
        -1,
    }
  );


const expired =
  executeMiddleware(
    `Bearer ${expiredToken}`
  );


check(
  expired.nextCalled ===
    false &&
  expired.res.statusCode ===
    401,
  "expired ACCESS token fails with 401"
);


const missingJtiToken =
  jwt.sign(
    {
      role,
      sid:
        sessionId,

      type:
        PORTAL_TOKEN_TYPE.ACCESS,
    },
    env.jwtSecret,
    {
      algorithm:
        PORTAL_TOKEN_ALGORITHM,

      subject,

      issuer:
        env.jwtIssuer,

      audience:
        env.jwtAudience,

      expiresIn:
        300,
    }
  );


const missingJti =
  executeMiddleware(
    `Bearer ${missingJtiToken}`
  );


check(
  missingJti.nextCalled ===
    false &&
  missingJti.res.statusCode ===
    401,
  "ACCESS token without jti fails with 401"
);


const missingSessionToken =
  jwt.sign(
    {
      role,

      type:
        PORTAL_TOKEN_TYPE.ACCESS,
    },
    env.jwtSecret,
    {
      algorithm:
        PORTAL_TOKEN_ALGORITHM,

      subject,

      jwtid:
        "missing-session-jti",

      issuer:
        env.jwtIssuer,

      audience:
        env.jwtAudience,

      expiresIn:
        300,
    }
  );


const missingSession =
  executeMiddleware(
    `Bearer ${missingSessionToken}`
  );


check(
  missingSession.nextCalled ===
    false &&
  missingSession.res.statusCode ===
    401,
  "ACCESS token without session identity fails with 401"
);


const unknownRoleToken =
  jwt.sign(
    {
      role:
        "UNKNOWN_ROLE",

      sid:
        sessionId,

      type:
        PORTAL_TOKEN_TYPE.ACCESS,
    },
    env.jwtSecret,
    {
      algorithm:
        PORTAL_TOKEN_ALGORITHM,

      subject,

      jwtid:
        "unknown-role-jti",

      issuer:
        env.jwtIssuer,

      audience:
        env.jwtAudience,

      expiresIn:
        300,
    }
  );


const unknownRole =
  executeMiddleware(
    `Bearer ${unknownRoleToken}`
  );


check(
  unknownRole.nextCalled ===
    false &&
  unknownRole.res.statusCode ===
    401,
  "ACCESS token with unknown RBAC role fails with 401"
);


check(
  missing.res.body
    ?.success ===
    false &&
  malformed.res.body
    ?.success ===
    false &&
  refreshAsAccess.res.body
    ?.success ===
    false,
  "authentication failures use fail-closed response shape"
);


console.log(
  "\n------------------------------------------------"
);

console.log(
  `Assertions passed: ${passed}`
);

console.log(
  "P.1F-A ACCESS TOKEN MIDDLEWARE VALIDATION PASSED"
);

console.log(
  "------------------------------------------------\n"
);
