// ASHMAAN Phase 13.12
// Session / Token Security Service

export const SESSION_TOKEN_SECURITY_PHASE = "13.12";

export const SESSION_TOKEN_SECURITY_LAYER =
  "SESSION_AND_TOKEN_SECURITY";

// ============================================================
// TAXONOMIES
// ============================================================

export const TOKEN_TYPE = Object.freeze({
  ACCESS: "ACCESS",
  REFRESH: "REFRESH",
  SERVICE: "SERVICE",
});

export const TOKEN_STATUS = Object.freeze({
  VALID: "VALID",
  INVALID: "INVALID",
  EXPIRED: "EXPIRED",
  NOT_YET_VALID: "NOT_YET_VALID",
  REVOKED: "REVOKED",
  UNAVAILABLE: "UNAVAILABLE",
});

export const SESSION_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
  INVALID: "INVALID",
  UNAVAILABLE: "UNAVAILABLE",
});

export const TOKEN_ALGORITHM = Object.freeze({
  HS256: "HS256",
  RS256: "RS256",
});

export const TOKEN_DENIAL_REASON = Object.freeze({
  INVALID_TOKEN_TYPE: "INVALID_TOKEN_TYPE",
  INVALID_ALGORITHM: "INVALID_ALGORITHM",
  TOKEN_MISSING: "TOKEN_MISSING",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_NOT_YET_VALID: "TOKEN_NOT_YET_VALID",
  TOKEN_REVOKED: "TOKEN_REVOKED",
  TOKEN_INVALID: "TOKEN_INVALID",
  TOKEN_UNAVAILABLE: "TOKEN_UNAVAILABLE",
  ISSUER_MISMATCH: "ISSUER_MISMATCH",
  AUDIENCE_MISMATCH: "AUDIENCE_MISMATCH",
  SUBJECT_MISSING: "SUBJECT_MISSING",
  TOKEN_ID_MISSING: "TOKEN_ID_MISSING",
  EXPIRY_MISSING: "EXPIRY_MISSING",
  ISSUED_AT_MISSING: "ISSUED_AT_MISSING",
  REFRESH_TOKEN_REQUIRED: "REFRESH_TOKEN_REQUIRED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  SESSION_REVOKED: "SESSION_REVOKED",
  SESSION_INVALID: "SESSION_INVALID",
  SESSION_UNAVAILABLE: "SESSION_UNAVAILABLE",
});

// ============================================================
// DEFAULT SECURITY POLICY
// ============================================================

export const DEFAULT_ACCESS_TOKEN_TTL_SECONDS =
  15 * 60;

export const DEFAULT_REFRESH_TOKEN_TTL_SECONDS =
  7 * 24 * 60 * 60;

export const MAX_CLOCK_SKEW_SECONDS = 60;

export const DEFAULT_SECURE_COOKIE_POLICY =
  Object.freeze({
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });

// ============================================================
// INVARIANTS
// ============================================================

export const SESSION_TOKEN_SECURITY_INVARIANTS =
  Object.freeze({
    tokenExpiryMustBeExplicit: true,
    tokenIssuedAtMustBeExplicit: true,
    tokenTypeMustBeExplicit: true,
    tokenPurposeMustNotBeInferred: true,

    issuerMustBeExplicitlyValidated: true,
    audienceMustBeExplicitlyValidated: true,
    algorithmMustBeAllowListed: true,

    expiredTokensMustBeRejected: true,
    notYetValidTokensMustBeRejected: true,
    revokedTokensMustBeRejected: true,
    unavailableValidationMustNotAuthenticate: true,

    tokenSubjectMustBeExplicit: true,
    tokenIdMustBeExplicit: true,

    accessAndRefreshTokensMustRemainDistinct: true,
    refreshOperationRequiresRefreshToken: true,

    refreshTokensMustNotBeAcceptedAsAccessTokens: true,
    accessTokensMustNotBeAcceptedAsRefreshTokens: true,

    secureSessionCookiesMustBeHttpOnly: true,
    secureSessionCookiesMustUseSecureFlag: true,
    secureSessionCookiesMustUseExplicitSameSite: true,

    revokedSessionMustNotBecomeActive: true,
    expiredSessionMustNotBecomeActive: true,
    unavailableSessionMustNotBecomeActive: true,

    rawTokensMustNotBeLogged: true,
    rawTokensMustNotBeReturnedByValidation: true,

    sessionTokenLayerDoesNotGrantAuthorization: true,
    sessionTokenFailureMustFailClosed: true,

    sessionTokenSecurityMustNotExecuteEquipmentControl: true,
    optimizationDssRemainsNonExecutable: true,
    optimizationDssAutoDispatchRemainsDisabled: true,
  });

// ============================================================
// HELPERS
// ============================================================

function normalize(value) {
  return typeof value === "string"
    ? value.trim().toUpperCase()
    : "";
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isFiniteTimestampSeconds(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

export function isKnownTokenType(value) {
  return Object.values(
    TOKEN_TYPE
  ).includes(
    normalize(value)
  );
}

export function isAllowedTokenAlgorithm(
  value
) {
  return Object.values(
    TOKEN_ALGORITHM
  ).includes(
    normalize(value)
  );
}

export function isSecureCookiePolicy(
  policy
) {
  return (
    policy !== null &&
    typeof policy === "object" &&
    !Array.isArray(policy) &&
    policy.httpOnly === true &&
    policy.secure === true &&
    ["strict", "lax", "none"].includes(
      String(
        policy.sameSite ?? ""
      ).toLowerCase()
    ) &&
    typeof policy.path === "string" &&
    policy.path.startsWith("/")
  );
}

// ============================================================
// TOKEN POLICY VALIDATION
// ============================================================

export function validateTokenPolicy({
  tokenType,
  algorithm,
  issuer,
  audience,
  ttlSeconds,
} = {}) {
  const errors = [];

  const normalizedType =
    normalize(tokenType);

  const normalizedAlgorithm =
    normalize(algorithm);

  if (
    !isKnownTokenType(
      normalizedType
    )
  ) {
    errors.push(
      TOKEN_DENIAL_REASON
        .INVALID_TOKEN_TYPE
    );
  }

  if (
    !isAllowedTokenAlgorithm(
      normalizedAlgorithm
    )
  ) {
    errors.push(
      TOKEN_DENIAL_REASON
        .INVALID_ALGORITHM
    );
  }

  if (
    !isNonEmptyString(issuer)
  ) {
    errors.push(
      "INVALID_ISSUER"
    );
  }

  if (
    !isNonEmptyString(audience)
  ) {
    errors.push(
      "INVALID_AUDIENCE"
    );
  }

  if (
    typeof ttlSeconds !== "number" ||
    !Number.isInteger(ttlSeconds) ||
    ttlSeconds <= 0
  ) {
    errors.push(
      "INVALID_TTL"
    );
  }

  return Object.freeze({
    phase:
      SESSION_TOKEN_SECURITY_PHASE,

    layer:
      SESSION_TOKEN_SECURITY_LAYER,

    valid:
      errors.length === 0,

    tokenType:
      normalizedType || null,

    algorithm:
      normalizedAlgorithm || null,

    errors:
      Object.freeze([
        ...errors,
      ]),

    rawTokenExposed: false,

    invariants:
      SESSION_TOKEN_SECURITY_INVARIANTS,
  });
}

// ============================================================
// TOKEN VALIDATION RESULT
// ============================================================

export function createTokenValidationResult({
  status,
  tokenType = null,
  subject = null,
  tokenId = null,
  reason = null,
} = {}) {
  if (
    !Object.values(
      TOKEN_STATUS
    ).includes(status)
  ) {
    throw new TypeError(
      `Unsupported token status: ${status}`
    );
  }

  const valid =
    status ===
    TOKEN_STATUS.VALID;

  return Object.freeze({
    phase:
      SESSION_TOKEN_SECURITY_PHASE,

    layer:
      SESSION_TOKEN_SECURITY_LAYER,

    status,

    valid,

    tokenType:
      tokenType === null
        ? null
        : normalize(tokenType),

    subject:
      valid
        ? subject
        : null,

    tokenId:
      valid
        ? tokenId
        : null,

    reason:
      valid
        ? null
        : reason,

    rawTokenExposed:
      false,

    authenticated:
      valid,

    authorizationGranted:
      false,

    equipmentControlExecuted:
      false,

    autoDispatchExecuted:
      false,

    invariants:
      SESSION_TOKEN_SECURITY_INVARIANTS,
  });
}

// ============================================================
// TOKEN CLAIM VALIDATION
// ============================================================

export function validateTokenClaims({
  tokenPresent = true,

  tokenType,
  expectedTokenType,

  algorithm,
  issuer,
  expectedIssuer,

  audience,
  expectedAudience,

  subject,
  tokenId,

  issuedAt,
  expiresAt,
  notBefore = null,

  nowSeconds =
    Math.floor(
      Date.now() / 1000
    ),

  clockSkewSeconds =
    MAX_CLOCK_SKEW_SECONDS,

  revoked = false,
  validationAvailable = true,
} = {}) {
  if (
    validationAvailable !== true
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.UNAVAILABLE,

      tokenType,

      reason:
        TOKEN_DENIAL_REASON
          .TOKEN_UNAVAILABLE,
    });
  }

  if (
    tokenPresent !== true
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType,

      reason:
        TOKEN_DENIAL_REASON
          .TOKEN_MISSING,
    });
  }

  const normalizedTokenType =
    normalize(tokenType);

  const normalizedExpectedType =
    normalize(expectedTokenType);

  if (
    !isKnownTokenType(
      normalizedTokenType
    ) ||
    !isKnownTokenType(
      normalizedExpectedType
    )
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .INVALID_TOKEN_TYPE,
    });
  }

  if (
    normalizedTokenType !==
    normalizedExpectedType
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .INVALID_TOKEN_TYPE,
    });
  }

  if (
    !isAllowedTokenAlgorithm(
      algorithm
    )
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .INVALID_ALGORITHM,
    });
  }

  if (
    !isNonEmptyString(
      expectedIssuer
    ) ||
    issuer !== expectedIssuer
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .ISSUER_MISMATCH,
    });
  }

  if (
    !isNonEmptyString(
      expectedAudience
    ) ||
    audience !== expectedAudience
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .AUDIENCE_MISMATCH,
    });
  }

  if (
    !isNonEmptyString(
      subject
    )
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .SUBJECT_MISSING,
    });
  }

  if (
    !isNonEmptyString(
      tokenId
    )
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .TOKEN_ID_MISSING,
    });
  }

  if (
    !isFiniteTimestampSeconds(
      issuedAt
    )
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .ISSUED_AT_MISSING,
    });
  }

  if (
    !isFiniteTimestampSeconds(
      expiresAt
    )
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .EXPIRY_MISSING,
    });
  }

  if (
    !isFiniteTimestampSeconds(
      nowSeconds
    ) ||
    !isFiniteTimestampSeconds(
      clockSkewSeconds
    ) ||
    clockSkewSeconds < 0
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .TOKEN_INVALID,
    });
  }

  if (revoked === true) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.REVOKED,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .TOKEN_REVOKED,
    });
  }

  if (
    notBefore !== null
  ) {
    if (
      !isFiniteTimestampSeconds(
        notBefore
      )
    ) {
      return createTokenValidationResult({
        status:
          TOKEN_STATUS.INVALID,

        tokenType:
          normalizedTokenType,

        reason:
          TOKEN_DENIAL_REASON
            .TOKEN_INVALID,
      });
    }

    if (
      nowSeconds +
        clockSkewSeconds <
      notBefore
    ) {
      return createTokenValidationResult({
        status:
          TOKEN_STATUS
            .NOT_YET_VALID,

        tokenType:
          normalizedTokenType,

        reason:
          TOKEN_DENIAL_REASON
            .TOKEN_NOT_YET_VALID,
      });
    }
  }

  if (
    nowSeconds -
      clockSkewSeconds >=
    expiresAt
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.EXPIRED,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .TOKEN_EXPIRED,
    });
  }

  if (
    issuedAt >
    nowSeconds +
      clockSkewSeconds
  ) {
    return createTokenValidationResult({
      status:
        TOKEN_STATUS.INVALID,

      tokenType:
        normalizedTokenType,

      reason:
        TOKEN_DENIAL_REASON
          .TOKEN_INVALID,
    });
  }

  return createTokenValidationResult({
    status:
      TOKEN_STATUS.VALID,

    tokenType:
      normalizedTokenType,

    subject:
      subject.trim(),

    tokenId:
      tokenId.trim(),
  });
}

// ============================================================
// REFRESH OPERATION
// ============================================================

export function validateRefreshOperation({
  tokenValidationResult,
} = {}) {
  if (
    !tokenValidationResult ||
    typeof tokenValidationResult !==
      "object"
  ) {
    return Object.freeze({
      valid: false,

      reason:
        TOKEN_DENIAL_REASON
          .REFRESH_TOKEN_REQUIRED,

      authorizationGranted:
        false,

      equipmentControlExecuted:
        false,

      autoDispatchExecuted:
        false,
    });
  }

  const valid =
    tokenValidationResult.valid ===
      true &&
    tokenValidationResult.tokenType ===
      TOKEN_TYPE.REFRESH;

  return Object.freeze({
    valid,

    reason:
      valid
        ? null
        : TOKEN_DENIAL_REASON
            .REFRESH_TOKEN_REQUIRED,

    authorizationGranted:
      false,

    equipmentControlExecuted:
      false,

    autoDispatchExecuted:
      false,
  });
}

// ============================================================
// SESSION VALIDATION
// ============================================================

export function validateSessionState({
  status,
} = {}) {
  const normalizedStatus =
    normalize(status);

  if (
    !Object.values(
      SESSION_STATUS
    ).includes(
      normalizedStatus
    )
  ) {
    return Object.freeze({
      status:
        SESSION_STATUS.INVALID,

      active: false,

      reason:
        TOKEN_DENIAL_REASON
          .SESSION_INVALID,
    });
  }

  switch (normalizedStatus) {
    case SESSION_STATUS.ACTIVE:
      return Object.freeze({
        status:
          SESSION_STATUS.ACTIVE,

        active: true,

        reason: null,
      });

    case SESSION_STATUS.EXPIRED:
      return Object.freeze({
        status:
          SESSION_STATUS.EXPIRED,

        active: false,

        reason:
          TOKEN_DENIAL_REASON
            .SESSION_EXPIRED,
      });

    case SESSION_STATUS.REVOKED:
      return Object.freeze({
        status:
          SESSION_STATUS.REVOKED,

        active: false,

        reason:
          TOKEN_DENIAL_REASON
            .SESSION_REVOKED,
      });

    case SESSION_STATUS.UNAVAILABLE:
      return Object.freeze({
        status:
          SESSION_STATUS.UNAVAILABLE,

        active: false,

        reason:
          TOKEN_DENIAL_REASON
            .SESSION_UNAVAILABLE,
      });

    default:
      return Object.freeze({
        status:
          SESSION_STATUS.INVALID,

        active: false,

        reason:
          TOKEN_DENIAL_REASON
            .SESSION_INVALID,
      });
  }
}

export default validateTokenClaims;