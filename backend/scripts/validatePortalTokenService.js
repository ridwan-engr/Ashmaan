// scripts/validatePortalTokenService.js

import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import {
  RBAC_ROLES,
} from "../services/security/authorizationRbacService.js";

import {
  PORTAL_TOKEN_TYPE,
  PORTAL_TOKEN_ALGORITHM,
  PORTAL_ACCESS_TOKEN_TTL_SECONDS,
  PORTAL_REFRESH_TOKEN_TTL_SECONDS,
  issueAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../services/security/portalTokenService.js";


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


console.log(
  "\n================================================"
);

console.log(
  "ASHMAAN PORTAL P.1C — TOKEN SERVICE"
);

console.log(
  "================================================\n"
);


const secret =
  "portal-p1c-validator-secret-material";

const issuer =
  "ashmaan-api";

const audience =
  "ashmaan-portal";

const subject =
  "user-test-001";

const role =
  RBAC_ROLES.ADMINISTRATOR;

const sessionId =
  "session-test-001";


check(
  PORTAL_TOKEN_TYPE.ACCESS ===
    "ACCESS",
  "ACCESS token type exists"
);


check(
  PORTAL_TOKEN_TYPE.REFRESH ===
    "REFRESH",
  "REFRESH token type exists"
);


check(
  Object.isFrozen(
    PORTAL_TOKEN_TYPE
  ),
  "token-type taxonomy is frozen"
);


check(
  PORTAL_TOKEN_ALGORITHM ===
    "HS256",
  "token algorithm is HS256"
);


check(
  PORTAL_ACCESS_TOKEN_TTL_SECONDS ===
    900,
  "access-token TTL is 15 minutes"
);


check(
  PORTAL_REFRESH_TOKEN_TTL_SECONDS ===
    604800,
  "refresh-token TTL is 7 days"
);


const accessToken =
  issueAccessToken({
    subject,
    role,
    sessionId,
    secret,
    issuer,
    audience,
  });


const refreshToken =
  issueRefreshToken({
    subject,
    role,
    sessionId,
    secret,
    issuer,
    audience,
  });


check(
  typeof accessToken ===
    "string" &&
  accessToken.length >
    0,
  "access token is issued"
);


check(
  typeof refreshToken ===
    "string" &&
  refreshToken.length >
    0,
  "refresh token is issued"
);


check(
  accessToken !==
    refreshToken,
  "access and refresh tokens are distinct"
);


const accessHeader =
  jwt.decode(
    accessToken,
    {
      complete: true,
    }
  );


check(
  accessHeader
    ?.header
    ?.alg ===
    "HS256",
  "access token declares HS256"
);


const refreshHeader =
  jwt.decode(
    refreshToken,
    {
      complete: true,
    }
  );


check(
  refreshHeader
    ?.header
    ?.alg ===
    "HS256",
  "refresh token declares HS256"
);


const access =
  verifyAccessToken({
    token:
      accessToken,

    secret,
    issuer,
    audience,
  });


check(
  access.subject ===
    subject,
  "access token preserves subject"
);


check(
  access.role ===
    role,
  "access token preserves RBAC role"
);


check(
  access.sessionId ===
    sessionId,
  "access token preserves session identity"
);


check(
  access.type ===
    PORTAL_TOKEN_TYPE.ACCESS,
  "access token carries ACCESS type"
);


check(
  typeof access.tokenId ===
    "string" &&
  access.tokenId.length >
    0,
  "access token carries jti"
);


check(
  access.issuer ===
    issuer,
  "access token issuer is enforced"
);


check(
  access.audience ===
    audience,
  "access token audience is enforced"
);


check(
  (
    access.expiresAt -
    access.issuedAt
  ) ===
    PORTAL_ACCESS_TOKEN_TTL_SECONDS,
  "access token cryptographic lifetime is 15 minutes"
);


const refresh =
  verifyRefreshToken({
    token:
      refreshToken,

    secret,
    issuer,
    audience,
  });


check(
  refresh.subject ===
    subject,
  "refresh token preserves subject"
);


check(
  refresh.role ===
    role,
  "refresh token preserves RBAC role"
);


check(
  refresh.sessionId ===
    sessionId,
  "refresh token preserves session identity"
);


check(
  refresh.type ===
    PORTAL_TOKEN_TYPE.REFRESH,
  "refresh token carries REFRESH type"
);


check(
  typeof refresh.tokenId ===
    "string" &&
  refresh.tokenId.length >
    0,
  "refresh token carries jti"
);


check(
  refresh.tokenId !==
    access.tokenId,
  "access and refresh tokens have distinct jti values"
);


check(
  (
    refresh.expiresAt -
    refresh.issuedAt
  ) ===
    PORTAL_REFRESH_TOKEN_TTL_SECONDS,
  "refresh token cryptographic lifetime is 7 days"
);


let refreshAsAccessRejected =
  false;

try {
  verifyAccessToken({
    token:
      refreshToken,

    secret,
    issuer,
    audience,
  });
} catch (
  error
) {
  refreshAsAccessRejected =
    error?.message ===
      "TOKEN_TYPE_MISMATCH";
}


check(
  refreshAsAccessRejected,
  "refresh token cannot be used as access token"
);


let accessAsRefreshRejected =
  false;

try {
  verifyRefreshToken({
    token:
      accessToken,

    secret,
    issuer,
    audience,
  });
} catch (
  error
) {
  accessAsRefreshRejected =
    error?.message ===
      "TOKEN_TYPE_MISMATCH";
}


check(
  accessAsRefreshRejected,
  "access token cannot be used as refresh token"
);


let wrongIssuerRejected =
  false;

try {
  verifyAccessToken({
    token:
      accessToken,

    secret,
    issuer:
      "wrong-issuer",

    audience,
  });
} catch {
  wrongIssuerRejected =
    true;
}


check(
  wrongIssuerRejected,
  "wrong issuer is rejected"
);


let wrongAudienceRejected =
  false;

try {
  verifyAccessToken({
    token:
      accessToken,

    secret,
    issuer,

    audience:
      "wrong-audience",
  });
} catch {
  wrongAudienceRejected =
    true;
}


check(
  wrongAudienceRejected,
  "wrong audience is rejected"
);


let wrongSecretRejected =
  false;

try {
  verifyAccessToken({
    token:
      accessToken,

    secret:
      "different-validator-secret",

    issuer,
    audience,
  });
} catch {
  wrongSecretRejected =
    true;
}


check(
  wrongSecretRejected,
  "wrong signing secret is rejected"
);


let unknownRoleRejected =
  false;

try {
  issueAccessToken({
    subject,

    role:
      "SUPERUSER",

    sessionId,
    secret,
    issuer,
    audience,
  });
} catch (
  error
) {
  unknownRoleRejected =
    error?.message ===
      "TOKEN_ROLE_UNKNOWN";
}


check(
  unknownRoleRejected,
  "unknown RBAC role cannot receive token"
);


console.log(
  "\n------------------------------------------------"
);

console.log(
  `Assertions passed: ${passed}`
);

console.log(
  "P.1C TOKEN SERVICE VALIDATION PASSED"
);

console.log(
  "------------------------------------------------\n"
);
