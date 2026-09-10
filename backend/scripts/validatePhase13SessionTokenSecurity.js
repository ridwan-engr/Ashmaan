import assert from "node:assert/strict";

import {
  SESSION_TOKEN_SECURITY_PHASE,
  SESSION_TOKEN_SECURITY_LAYER,
  TOKEN_TYPE,
  TOKEN_STATUS,
  SESSION_STATUS,
  TOKEN_ALGORITHM,
  TOKEN_DENIAL_REASON,
  DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  MAX_CLOCK_SKEW_SECONDS,
  DEFAULT_SECURE_COOKIE_POLICY,
  SESSION_TOKEN_SECURITY_INVARIANTS,
  isKnownTokenType,
  isAllowedTokenAlgorithm,
  isSecureCookiePolicy,
  validateTokenPolicy,
  createTokenValidationResult,
  validateTokenClaims,
  validateRefreshOperation,
  validateSessionState,
} from "../services/security/sessionTokenSecurityService.js";

let passed = 0;

function check(
  condition,
  message
) {
  assert.ok(
    condition,
    message
  );

  passed += 1;

  console.log(
    `PASS ${passed}: ${message}`
  );
}

function section(title) {
  console.log(
    `\n--- ${title} ---`
  );
}

console.log(
  "\n========================================================================"
);

console.log(
  "ASHMAAN PHASE 13.12 — SESSION / TOKEN SECURITY VALIDATION"
);

console.log(
  "========================================================================"
);

try {
  // ============================================================
  // A. IDENTITY
  // ============================================================

  section(
    "A. Phase identity"
  );

  check(
    SESSION_TOKEN_SECURITY_PHASE ===
      "13.12",
    "phase identity is 13.12"
  );

  check(
    SESSION_TOKEN_SECURITY_LAYER ===
      "SESSION_AND_TOKEN_SECURITY",
    "layer identity is SESSION_AND_TOKEN_SECURITY"
  );

  // ============================================================
  // B. TOKEN TYPE
  // ============================================================

  section(
    "B. Token-type taxonomy"
  );

  for (
    const type of [
      "ACCESS",
      "REFRESH",
      "SERVICE",
    ]
  ) {
    check(
      Object.values(
        TOKEN_TYPE
      ).includes(type),
      `token type exists: ${type}`
    );
  }

  check(
    isKnownTokenType(
      "access"
    ) === true,
    "token-type detection is case-insensitive"
  );

  check(
    isKnownTokenType(
      "unknown"
    ) === false,
    "unknown token type is rejected"
  );

  // ============================================================
  // C. TOKEN STATUS
  // ============================================================

  section(
    "C. Token-status taxonomy"
  );

  for (
    const status of [
      "VALID",
      "INVALID",
      "EXPIRED",
      "NOT_YET_VALID",
      "REVOKED",
      "UNAVAILABLE",
    ]
  ) {
    check(
      Object.values(
        TOKEN_STATUS
      ).includes(status),
      `token status exists: ${status}`
    );
  }

  // ============================================================
  // D. SESSION STATUS
  // ============================================================

  section(
    "D. Session-status taxonomy"
  );

  for (
    const status of [
      "ACTIVE",
      "EXPIRED",
      "REVOKED",
      "INVALID",
      "UNAVAILABLE",
    ]
  ) {
    check(
      Object.values(
        SESSION_STATUS
      ).includes(status),
      `session status exists: ${status}`
    );
  }

  // ============================================================
  // E. ALGORITHMS
  // ============================================================

  section(
    "E. Token algorithm allow-list"
  );

  check(
    TOKEN_ALGORITHM.HS256 ===
      "HS256",
    "HS256 algorithm is explicitly allowed"
  );

  check(
    TOKEN_ALGORITHM.RS256 ===
      "RS256",
    "RS256 algorithm is explicitly allowed"
  );

  check(
    isAllowedTokenAlgorithm(
      "hs256"
    ) === true,
    "algorithm detection is case-insensitive"
  );

  check(
    isAllowedTokenAlgorithm(
      "none"
    ) === false,
    "none algorithm is rejected"
  );

  check(
    isAllowedTokenAlgorithm(
      "HS512"
    ) === false,
    "non-allow-listed algorithm is rejected"
  );

  // ============================================================
  // F. DENIAL TAXONOMY
  // ============================================================

  section(
    "F. Token denial taxonomy"
  );

  const requiredReasons = [
    "INVALID_TOKEN_TYPE",
    "INVALID_ALGORITHM",
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "TOKEN_NOT_YET_VALID",
    "TOKEN_REVOKED",
    "TOKEN_INVALID",
    "TOKEN_UNAVAILABLE",
    "ISSUER_MISMATCH",
    "AUDIENCE_MISMATCH",
    "SUBJECT_MISSING",
    "TOKEN_ID_MISSING",
    "EXPIRY_MISSING",
    "ISSUED_AT_MISSING",
    "REFRESH_TOKEN_REQUIRED",
    "SESSION_EXPIRED",
    "SESSION_REVOKED",
    "SESSION_INVALID",
    "SESSION_UNAVAILABLE",
  ];

  for (
    const reason of
      requiredReasons
  ) {
    check(
      Object.values(
        TOKEN_DENIAL_REASON
      ).includes(reason),
      `token denial reason exists: ${reason}`
    );
  }

  // ============================================================
  // G. DEFAULT TTL / CLOCK POLICY
  // ============================================================

  section(
    "G. Token lifetime policy"
  );

  check(
    DEFAULT_ACCESS_TOKEN_TTL_SECONDS ===
      900,
    "default access-token TTL is explicit"
  );

  check(
    DEFAULT_REFRESH_TOKEN_TTL_SECONDS ===
      604800,
    "default refresh-token TTL is explicit"
  );

  check(
    DEFAULT_REFRESH_TOKEN_TTL_SECONDS >
      DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    "refresh-token TTL exceeds access-token TTL"
  );

  check(
    MAX_CLOCK_SKEW_SECONDS ===
      60,
    "maximum clock skew is explicit"
  );

  // ============================================================
  // H. COOKIE POLICY
  // ============================================================

  section(
    "H. Secure cookie policy"
  );

  check(
    DEFAULT_SECURE_COOKIE_POLICY
      .httpOnly === true,
    "default session cookie is HttpOnly"
  );

  check(
    DEFAULT_SECURE_COOKIE_POLICY
      .secure === true,
    "default session cookie uses Secure flag"
  );

  check(
    DEFAULT_SECURE_COOKIE_POLICY
      .sameSite === "strict",
    "default SameSite policy is strict"
  );

  check(
    DEFAULT_SECURE_COOKIE_POLICY
      .path === "/",
    "cookie path is explicit"
  );

  check(
    isSecureCookiePolicy(
      DEFAULT_SECURE_COOKIE_POLICY
    ) === true,
    "default cookie policy passes security validation"
  );

  check(
    isSecureCookiePolicy({
      httpOnly: false,
      secure: true,
      sameSite: "strict",
      path: "/",
    }) === false,
    "cookie without HttpOnly is rejected"
  );

  check(
    isSecureCookiePolicy({
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
    }) === false,
    "cookie without Secure flag is rejected"
  );

  // ============================================================
  // I. INVARIANTS
  // ============================================================

  section(
    "I. Core session/token invariants"
  );

  const invariantNames = [
    "tokenExpiryMustBeExplicit",
    "tokenIssuedAtMustBeExplicit",
    "tokenTypeMustBeExplicit",
    "tokenPurposeMustNotBeInferred",
    "issuerMustBeExplicitlyValidated",
    "audienceMustBeExplicitlyValidated",
    "algorithmMustBeAllowListed",
    "expiredTokensMustBeRejected",
    "notYetValidTokensMustBeRejected",
    "revokedTokensMustBeRejected",
    "unavailableValidationMustNotAuthenticate",
    "tokenSubjectMustBeExplicit",
    "tokenIdMustBeExplicit",
    "accessAndRefreshTokensMustRemainDistinct",
    "refreshOperationRequiresRefreshToken",
    "refreshTokensMustNotBeAcceptedAsAccessTokens",
    "accessTokensMustNotBeAcceptedAsRefreshTokens",
    "secureSessionCookiesMustBeHttpOnly",
    "secureSessionCookiesMustUseSecureFlag",
    "secureSessionCookiesMustUseExplicitSameSite",
    "revokedSessionMustNotBecomeActive",
    "expiredSessionMustNotBecomeActive",
    "unavailableSessionMustNotBecomeActive",
    "rawTokensMustNotBeLogged",
    "rawTokensMustNotBeReturnedByValidation",
    "sessionTokenLayerDoesNotGrantAuthorization",
    "sessionTokenFailureMustFailClosed",
    "sessionTokenSecurityMustNotExecuteEquipmentControl",
    "optimizationDssRemainsNonExecutable",
    "optimizationDssAutoDispatchRemainsDisabled",
  ];

  for (
    const name of
      invariantNames
  ) {
    check(
      SESSION_TOKEN_SECURITY_INVARIANTS[
        name
      ] === true,
      `session/token invariant enforced: ${name}`
    );
  }

  // ============================================================
  // J. TOKEN POLICY
  // ============================================================

  section(
    "J. Valid token policy"
  );

  const accessPolicy =
    validateTokenPolicy({
      tokenType:
        TOKEN_TYPE.ACCESS,

      algorithm:
        TOKEN_ALGORITHM.HS256,

      issuer:
        "ashmaan-api",

      audience:
        "ashmaan-client",

      ttlSeconds:
        DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    });

  check(
    accessPolicy.valid ===
      true,
    "valid access-token policy is accepted"
  );

  check(
    accessPolicy.errors.length ===
      0,
    "valid token policy reports zero errors"
  );

  check(
    accessPolicy.rawTokenExposed ===
      false,
    "token policy exposes no raw token"
  );

  // ============================================================
  // K. INVALID TOKEN POLICY
  // ============================================================

  section(
    "K. Invalid token policy"
  );

  const invalidPolicy =
    validateTokenPolicy({
      tokenType:
        "UNKNOWN",

      algorithm:
        "none",

      issuer: "",

      audience: "",

      ttlSeconds: 0,
    });

  check(
    invalidPolicy.valid ===
      false,
    "invalid token policy is rejected"
  );

  check(
    invalidPolicy.errors.includes(
      TOKEN_DENIAL_REASON
        .INVALID_TOKEN_TYPE
    ),
    "invalid token type is explicit"
  );

  check(
    invalidPolicy.errors.includes(
      TOKEN_DENIAL_REASON
        .INVALID_ALGORITHM
    ),
    "invalid token algorithm is explicit"
  );

  check(
    invalidPolicy.errors.includes(
      "INVALID_ISSUER"
    ),
    "missing issuer is explicit"
  );

  check(
    invalidPolicy.errors.includes(
      "INVALID_AUDIENCE"
    ),
    "missing audience is explicit"
  );

  check(
    invalidPolicy.errors.includes(
      "INVALID_TTL"
    ),
    "invalid TTL is explicit"
  );

  // ============================================================
  // L. VALID ACCESS TOKEN
  // ============================================================

  section(
    "L. Valid access-token claims"
  );

  const now = 1_800_000_000;

  const validAccess =
    validateTokenClaims({
      tokenType:
        TOKEN_TYPE.ACCESS,

      expectedTokenType:
        TOKEN_TYPE.ACCESS,

      algorithm:
        TOKEN_ALGORITHM.HS256,

      issuer:
        "ashmaan-api",

      expectedIssuer:
        "ashmaan-api",

      audience:
        "ashmaan-client",

      expectedAudience:
        "ashmaan-client",

      subject:
        "user-123",

      tokenId:
        "token-001",

      issuedAt:
        now - 60,

      expiresAt:
        now + 840,

      nowSeconds:
        now,

      clockSkewSeconds: 0,
    });

  check(
    validAccess.status ===
      TOKEN_STATUS.VALID,
    "valid access token is accepted"
  );

  check(
    validAccess.valid ===
      true,
    "valid access token reports valid=true"
  );

  check(
    validAccess.authenticated ===
      true,
    "valid token may establish authentication"
  );

  check(
    validAccess.subject ===
      "user-123",
    "valid token preserves subject"
  );

  check(
    validAccess.tokenId ===
      "token-001",
    "valid token preserves token id"
  );

  check(
    validAccess.authorizationGranted ===
      false,
    "valid token does not itself grant authorization"
  );

  check(
    validAccess.rawTokenExposed ===
      false,
    "valid token result exposes no raw token"
  );

  // ============================================================
  // M. MISSING TOKEN
  // ============================================================

  section(
    "M. Missing token"
  );

  const missingToken =
    validateTokenClaims({
      tokenPresent: false,

      tokenType:
        TOKEN_TYPE.ACCESS,
    });

  check(
    missingToken.valid ===
      false,
    "missing token is rejected"
  );

  check(
    missingToken.reason ===
      TOKEN_DENIAL_REASON
        .TOKEN_MISSING,
    "missing token reason is explicit"
  );

  check(
    missingToken.authenticated ===
      false,
    "missing token does not authenticate"
  );

  // ============================================================
  // N. EXPIRED TOKEN
  // ============================================================

  section(
    "N. Expired token"
  );

  const expired =
    validateTokenClaims({
      tokenType:
        TOKEN_TYPE.ACCESS,

      expectedTokenType:
        TOKEN_TYPE.ACCESS,

      algorithm:
        TOKEN_ALGORITHM.HS256,

      issuer:
        "ashmaan-api",

      expectedIssuer:
        "ashmaan-api",

      audience:
        "ashmaan-client",

      expectedAudience:
        "ashmaan-client",

      subject:
        "user-123",

      tokenId:
        "expired-001",

      issuedAt:
        now - 1000,

      expiresAt:
        now - 1,

      nowSeconds:
        now,

      clockSkewSeconds: 0,
    });

  check(
    expired.status ===
      TOKEN_STATUS.EXPIRED,
    "expired token is explicitly EXPIRED"
  );

  check(
    expired.valid ===
      false,
    "expired token is rejected"
  );

  check(
    expired.reason ===
      TOKEN_DENIAL_REASON
        .TOKEN_EXPIRED,
    "expired-token reason is explicit"
  );

  check(
    expired.authenticated ===
      false,
    "expired token does not authenticate"
  );

  // ============================================================
  // O. NOT-YET-VALID TOKEN
  // ============================================================

  section(
    "O. Not-yet-valid token"
  );

  const notYetValid =
    validateTokenClaims({
      tokenType:
        TOKEN_TYPE.ACCESS,

      expectedTokenType:
        TOKEN_TYPE.ACCESS,

      algorithm:
        TOKEN_ALGORITHM.HS256,

      issuer:
        "ashmaan-api",

      expectedIssuer:
        "ashmaan-api",

      audience:
        "ashmaan-client",

      expectedAudience:
        "ashmaan-client",

      subject:
        "user-123",

      tokenId:
        "future-001",

      issuedAt:
        now,

      expiresAt:
        now + 1000,

      notBefore:
        now + 300,

      nowSeconds:
        now,

      clockSkewSeconds: 0,
    });

  check(
    notYetValid.status ===
      TOKEN_STATUS.NOT_YET_VALID,
    "future token is explicitly NOT_YET_VALID"
  );

  check(
    notYetValid.reason ===
      TOKEN_DENIAL_REASON
        .TOKEN_NOT_YET_VALID,
    "not-yet-valid reason is explicit"
  );

  check(
    notYetValid.authenticated ===
      false,
    "not-yet-valid token does not authenticate"
  );

  // ============================================================
  // P. REVOKED TOKEN
  // ============================================================

  section(
    "P. Revoked token"
  );

  const revoked =
    validateTokenClaims({
      tokenType:
        TOKEN_TYPE.ACCESS,

      expectedTokenType:
        TOKEN_TYPE.ACCESS,

      algorithm:
        TOKEN_ALGORITHM.HS256,

      issuer:
        "ashmaan-api",

      expectedIssuer:
        "ashmaan-api",

      audience:
        "ashmaan-client",

      expectedAudience:
        "ashmaan-client",

      subject:
        "user-123",

      tokenId:
        "revoked-001",

      issuedAt:
        now - 10,

      expiresAt:
        now + 1000,

      nowSeconds:
        now,

      revoked: true,
    });

  check(
    revoked.status ===
      TOKEN_STATUS.REVOKED,
    "revoked token is explicitly REVOKED"
  );

  check(
    revoked.valid ===
      false,
    "revoked token is rejected"
  );

  check(
    revoked.reason ===
      TOKEN_DENIAL_REASON
        .TOKEN_REVOKED,
    "revoked-token reason is explicit"
  );

  // ============================================================
  // Q. TYPE SEPARATION
  // ============================================================

  section(
    "Q. Access / refresh token separation"
  );

  const refreshAsAccess =
    validateTokenClaims({
      tokenType:
        TOKEN_TYPE.REFRESH,

      expectedTokenType:
        TOKEN_TYPE.ACCESS,

      algorithm:
        TOKEN_ALGORITHM.HS256,

      issuer:
        "ashmaan-api",

      expectedIssuer:
        "ashmaan-api",

      audience:
        "ashmaan-client",

      expectedAudience:
        "ashmaan-client",

      subject:
        "user-123",

      tokenId:
        "refresh-001",

      issuedAt:
        now - 10,

      expiresAt:
        now + 1000,

      nowSeconds:
        now,
    });

  check(
    refreshAsAccess.valid ===
      false,
    "refresh token is not accepted as access token"
  );

  check(
    refreshAsAccess.reason ===
      TOKEN_DENIAL_REASON
        .INVALID_TOKEN_TYPE,
    "refresh/access mismatch is explicit"
  );

  const accessAsRefresh =
    validateTokenClaims({
      tokenType:
        TOKEN_TYPE.ACCESS,

      expectedTokenType:
        TOKEN_TYPE.REFRESH,

      algorithm:
        TOKEN_ALGORITHM.HS256,

      issuer:
        "ashmaan-api",

      expectedIssuer:
        "ashmaan-api",

      audience:
        "ashmaan-client",

      expectedAudience:
        "ashmaan-client",

      subject:
        "user-123",

      tokenId:
        "access-001",

      issuedAt:
        now - 10,

      expiresAt:
        now + 1000,

      nowSeconds:
        now,
    });

  check(
    accessAsRefresh.valid ===
      false,
    "access token is not accepted as refresh token"
  );

  // ============================================================
  // R. ISSUER / AUDIENCE
  // ============================================================

  section(
    "R. Issuer and audience validation"
  );

  const issuerMismatch =
    validateTokenClaims({
      tokenType: "ACCESS",
      expectedTokenType: "ACCESS",
      algorithm: "HS256",

      issuer:
        "unexpected-api",

      expectedIssuer:
        "ashmaan-api",

      audience:
        "ashmaan-client",

      expectedAudience:
        "ashmaan-client",

      subject:
        "user-123",

      tokenId:
        "token-issuer",

      issuedAt:
        now - 10,

      expiresAt:
        now + 1000,

      nowSeconds:
        now,
    });

  check(
    issuerMismatch.reason ===
      TOKEN_DENIAL_REASON
        .ISSUER_MISMATCH,
    "issuer mismatch is rejected explicitly"
  );

  const audienceMismatch =
    validateTokenClaims({
      tokenType: "ACCESS",
      expectedTokenType: "ACCESS",
      algorithm: "HS256",

      issuer:
        "ashmaan-api",

      expectedIssuer:
        "ashmaan-api",

      audience:
        "wrong-client",

      expectedAudience:
        "ashmaan-client",

      subject:
        "user-123",

      tokenId:
        "token-audience",

      issuedAt:
        now - 10,

      expiresAt:
        now + 1000,

      nowSeconds:
        now,
    });

  check(
    audienceMismatch.reason ===
      TOKEN_DENIAL_REASON
        .AUDIENCE_MISMATCH,
    "audience mismatch is rejected explicitly"
  );

  // ============================================================
  // S. REQUIRED CLAIMS
  // ============================================================

  section(
    "S. Required token claims"
  );

  const missingSubject =
    validateTokenClaims({
      tokenType: "ACCESS",
      expectedTokenType: "ACCESS",
      algorithm: "HS256",
      issuer: "ashmaan-api",
      expectedIssuer: "ashmaan-api",
      audience: "ashmaan-client",
      expectedAudience: "ashmaan-client",
      subject: "",
      tokenId: "token-1",
      issuedAt: now - 10,
      expiresAt: now + 1000,
      nowSeconds: now,
    });

  check(
    missingSubject.reason ===
      TOKEN_DENIAL_REASON
        .SUBJECT_MISSING,
    "missing subject is rejected explicitly"
  );

  const missingTokenId =
    validateTokenClaims({
      tokenType: "ACCESS",
      expectedTokenType: "ACCESS",
      algorithm: "HS256",
      issuer: "ashmaan-api",
      expectedIssuer: "ashmaan-api",
      audience: "ashmaan-client",
      expectedAudience: "ashmaan-client",
      subject: "user-123",
      tokenId: "",
      issuedAt: now - 10,
      expiresAt: now + 1000,
      nowSeconds: now,
    });

  check(
    missingTokenId.reason ===
      TOKEN_DENIAL_REASON
        .TOKEN_ID_MISSING,
    "missing token id is rejected explicitly"
  );

  const missingIssuedAt =
    validateTokenClaims({
      tokenType: "ACCESS",
      expectedTokenType: "ACCESS",
      algorithm: "HS256",
      issuer: "ashmaan-api",
      expectedIssuer: "ashmaan-api",
      audience: "ashmaan-client",
      expectedAudience: "ashmaan-client",
      subject: "user-123",
      tokenId: "token-1",
      expiresAt: now + 1000,
      nowSeconds: now,
    });

  check(
    missingIssuedAt.reason ===
      TOKEN_DENIAL_REASON
        .ISSUED_AT_MISSING,
    "missing issued-at claim is rejected explicitly"
  );

  const missingExpiry =
    validateTokenClaims({
      tokenType: "ACCESS",
      expectedTokenType: "ACCESS",
      algorithm: "HS256",
      issuer: "ashmaan-api",
      expectedIssuer: "ashmaan-api",
      audience: "ashmaan-client",
      expectedAudience: "ashmaan-client",
      subject: "user-123",
      tokenId: "token-1",
      issuedAt: now - 10,
      nowSeconds: now,
    });

  check(
    missingExpiry.reason ===
      TOKEN_DENIAL_REASON
        .EXPIRY_MISSING,
    "missing expiry claim is rejected explicitly"
  );

  // ============================================================
  // T. VALID REFRESH TOKEN
  // ============================================================

  section(
    "T. Refresh-token operation"
  );

  const validRefresh =
    validateTokenClaims({
      tokenType:
        TOKEN_TYPE.REFRESH,

      expectedTokenType:
        TOKEN_TYPE.REFRESH,

      algorithm:
        TOKEN_ALGORITHM.HS256,

      issuer:
        "ashmaan-api",

      expectedIssuer:
        "ashmaan-api",

      audience:
        "ashmaan-client",

      expectedAudience:
        "ashmaan-client",

      subject:
        "user-123",

      tokenId:
        "refresh-valid",

      issuedAt:
        now - 100,

      expiresAt:
        now + 10_000,

      nowSeconds:
        now,
    });

  const refreshOperation =
    validateRefreshOperation({
      tokenValidationResult:
        validRefresh,
    });

  check(
    validRefresh.valid ===
      true,
    "valid refresh token passes token validation"
  );

  check(
    refreshOperation.valid ===
      true,
    "validated refresh token is accepted for refresh operation"
  );

  check(
    refreshOperation.reason ===
      null,
    "valid refresh operation has no denial reason"
  );

  const invalidRefreshOperation =
    validateRefreshOperation({
      tokenValidationResult:
        validAccess,
    });

  check(
    invalidRefreshOperation.valid ===
      false,
    "access token cannot perform refresh operation"
  );

  check(
    invalidRefreshOperation.reason ===
      TOKEN_DENIAL_REASON
        .REFRESH_TOKEN_REQUIRED,
    "refresh operation explicitly requires refresh token"
  );

  // ============================================================
  // U. VALIDATION UNAVAILABLE
  // ============================================================

  section(
    "U. Token validation unavailable"
  );

  const unavailable =
    validateTokenClaims({
      validationAvailable: false,

      tokenType:
        TOKEN_TYPE.ACCESS,
    });

  check(
    unavailable.status ===
      TOKEN_STATUS.UNAVAILABLE,
    "token validation failure is represented as UNAVAILABLE"
  );

  check(
    unavailable.valid ===
      false,
    "unavailable validation never becomes valid"
  );

  check(
    unavailable.authenticated ===
      false,
    "unavailable token validation does not authenticate"
  );

  check(
    unavailable.reason ===
      TOKEN_DENIAL_REASON
        .TOKEN_UNAVAILABLE,
    "token validation unavailable reason is explicit"
  );

  // ============================================================
  // V. SESSION STATE
  // ============================================================

  section(
    "V. Session-state validation"
  );

  const activeSession =
    validateSessionState({
      status:
        SESSION_STATUS.ACTIVE,
    });

  check(
    activeSession.active ===
      true,
    "ACTIVE session remains active"
  );

  check(
    activeSession.reason ===
      null,
    "active session has no denial reason"
  );

  const expiredSession =
    validateSessionState({
      status:
        SESSION_STATUS.EXPIRED,
    });

  check(
    expiredSession.active ===
      false,
    "expired session is inactive"
  );

  check(
    expiredSession.reason ===
      TOKEN_DENIAL_REASON
        .SESSION_EXPIRED,
    "expired session reason is explicit"
  );

  const revokedSession =
    validateSessionState({
      status:
        SESSION_STATUS.REVOKED,
    });

  check(
    revokedSession.active ===
      false,
    "revoked session is inactive"
  );

  check(
    revokedSession.reason ===
      TOKEN_DENIAL_REASON
        .SESSION_REVOKED,
    "revoked session reason is explicit"
  );

  const unavailableSession =
    validateSessionState({
      status:
        SESSION_STATUS.UNAVAILABLE,
    });

  check(
    unavailableSession.active ===
      false,
    "unavailable session is inactive"
  );

  check(
    unavailableSession.reason ===
      TOKEN_DENIAL_REASON
        .SESSION_UNAVAILABLE,
    "unavailable session reason is explicit"
  );

  const invalidSession =
    validateSessionState({
      status:
        "UNKNOWN",
    });

  check(
    invalidSession.active ===
      false,
    "unknown session state is inactive"
  );

  check(
    invalidSession.reason ===
      TOKEN_DENIAL_REASON
        .SESSION_INVALID,
    "unknown session state is explicitly invalid"
  );

  // ============================================================
  // W. RESULT CONTRACT
  // ============================================================

  section(
    "W. Result contract"
  );

  check(
    validAccess.phase ===
      "13.12",
    "token validation result preserves phase"
  );

  check(
    validAccess.layer ===
      "SESSION_AND_TOKEN_SECURITY",
    "token validation result preserves layer"
  );

  check(
    validAccess.authorizationGranted ===
      false,
    "session/token layer grants no authorization"
  );

  check(
    expired.authorizationGranted ===
      false,
    "expired-token result grants no authorization"
  );

  check(
    validAccess.equipmentControlExecuted ===
      false,
    "token validation executes no equipment control"
  );

  check(
    validAccess.autoDispatchExecuted ===
      false,
    "token validation executes no auto-dispatch"
  );

  // ============================================================
  // X. INVALID RESULT STATUS
  // ============================================================

  section(
    "X. Invalid token status"
  );

  let invalidStatusRejected =
    false;

  try {
    createTokenValidationResult({
      status: "UNKNOWN",
    });
  } catch {
    invalidStatusRejected =
      true;
  }

  check(
    invalidStatusRejected,
    "unsupported token status is rejected"
  );

  // ============================================================
  // Y. SAFETY BOUNDARY
  // ============================================================

  section(
    "Y. Safety boundary"
  );

  check(
    expired.equipmentControlExecuted ===
      false,
    "expired token executes no equipment control"
  );

  check(
    expired.autoDispatchExecuted ===
      false,
    "expired token executes no auto-dispatch"
  );

  check(
    unavailable.equipmentControlExecuted ===
      false,
    "token validation failure executes no equipment control"
  );

  check(
    unavailable.autoDispatchExecuted ===
      false,
    "token validation failure executes no auto-dispatch"
  );

  check(
    refreshOperation.authorizationGranted ===
      false,
    "refresh validation grants no authorization"
  );

  // ============================================================
  // Z. FROZEN STRUCTURES
  // ============================================================

  section(
    "Z. Frozen structures"
  );

  check(
    Object.isFrozen(
      TOKEN_TYPE
    ),
    "token-type taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      TOKEN_STATUS
    ),
    "token-status taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      SESSION_STATUS
    ),
    "session-status taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      TOKEN_ALGORITHM
    ),
    "token-algorithm taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      TOKEN_DENIAL_REASON
    ),
    "token-denial taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DEFAULT_SECURE_COOKIE_POLICY
    ),
    "default secure-cookie policy is frozen"
  );

  check(
    Object.isFrozen(
      SESSION_TOKEN_SECURITY_INVARIANTS
    ),
    "session/token invariants are frozen"
  );

  check(
    Object.isFrozen(
      validAccess
    ),
    "token-validation result is frozen"
  );

  check(
    Object.isFrozen(
      accessPolicy
    ),
    "token-policy validation result is frozen"
  );

  check(
    Object.isFrozen(
      accessPolicy.errors
    ),
    "token-policy validation errors are frozen"
  );

  check(
    Object.isFrozen(
      refreshOperation
    ),
    "refresh-operation result is frozen"
  );

  check(
    Object.isFrozen(
      activeSession
    ),
    "session-validation result is frozen"
  );

  // ============================================================
  // FINAL
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.12 SESSION / TOKEN SECURITY RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Token types             : EXPLICIT"
  );

  console.log(
    "Access / refresh split  : ENFORCED"
  );

  console.log(
    "Token expiry            : REQUIRED"
  );

  console.log(
    "Issued-at claim         : REQUIRED"
  );

  console.log(
    "Issuer validation       : EXPLICIT"
  );

  console.log(
    "Audience validation     : EXPLICIT"
  );

  console.log(
    "Algorithm policy        : ALLOW-LISTED"
  );

  console.log(
    "Expired tokens          : REJECTED"
  );

  console.log(
    "Future tokens           : REJECTED"
  );

  console.log(
    "Revoked tokens          : REJECTED"
  );

  console.log(
    "Refresh operation       : REFRESH TOKEN REQUIRED"
  );

  console.log(
    "Secure cookies          : HTTPONLY + SECURE"
  );

  console.log(
    "Unavailable validation  : FAIL CLOSED"
  );

  console.log(
    "Raw token exposure      : NONE"
  );

  console.log(
    "Authorization grant     : NONE"
  );

  console.log(
    "Equipment control       : NONE"
  );

  console.log(
    "Auto-dispatch           : DISABLED"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    `\nAssertions passed: ${passed}`
  );

  console.log(
    "ASHMAAN PHASE 13.12 SESSION / TOKEN SECURITY VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.12 SESSION / TOKEN SECURITY VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}