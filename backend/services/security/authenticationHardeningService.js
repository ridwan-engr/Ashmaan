// ASHMAAN Phase 13.3
// Authentication Hardening Service

export const AUTHENTICATION_HARDENING_PHASE = "13.3";
export const AUTHENTICATION_HARDENING_LAYER = "AUTHENTICATION";

export const AUTHENTICATION_STATUS = Object.freeze({
  AUTHENTICATED: "AUTHENTICATED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  UNAVAILABLE: "UNAVAILABLE",
});

export const AUTHENTICATION_METHODS = Object.freeze({
  PASSWORD: "PASSWORD",
  ACCESS_TOKEN: "ACCESS_TOKEN",
  SERVICE_TOKEN: "SERVICE_TOKEN",
});

export const AUTHENTICATION_INVARIANTS = Object.freeze({
  authenticationDoesNotImplyAuthorization: true,
  rawPasswordsMustNotBeLogged: true,
  rawPasswordsMustNotBeReturned: true,
  passwordHashesMustNotBeReturned: true,
  accessTokensMustNotBeLogged: true,
  invalidCredentialResponseMustNotRevealAccountExistence: true,
  expiredTokensMustBeRejected: true,
  invalidTokensMustBeRejected: true,
  missingAuthenticationEvidenceMustNotAuthenticate: true,
  unavailableAuthenticationMustNotAuthenticate: true,
  tokenValidationMustBeExplicit: true,
  credentialValidationMustBeExplicit: true,
});

export function createAuthenticationResult({
  status,
  method = null,
  identity = null,
  reason = null,
} = {}) {
  const allowedStatuses =
    Object.values(AUTHENTICATION_STATUS);

  if (!allowedStatuses.includes(status)) {
    throw new TypeError(
      `Unsupported authentication status: ${status}`
    );
  }

  const authenticated =
    status === AUTHENTICATION_STATUS.AUTHENTICATED;

  return Object.freeze({
    phase: AUTHENTICATION_HARDENING_PHASE,
    layer: AUTHENTICATION_HARDENING_LAYER,

    status,
    method,
    authenticated,

    identity:
      authenticated && identity
        ? Object.freeze({
            id: identity.id ?? null,
            type: identity.type ?? null,
          })
        : null,

    reason:
      authenticated
        ? null
        : reason ?? status,

    authorizationGranted: false,

    invariants:
      AUTHENTICATION_INVARIANTS,
  });
}

export function validatePasswordAuthenticationInput({
  username,
  password,
} = {}) {
  const usernamePresent =
    typeof username === "string" &&
    username.trim().length > 0;

  const passwordPresent =
    typeof password === "string" &&
    password.length > 0;

  return Object.freeze({
    valid:
      usernamePresent &&
      passwordPresent,

    usernamePresent,
    passwordPresent,

    passwordReturned: false,
    passwordLogged: false,
  });
}

export function validateTokenAuthenticationInput({
  token,
} = {}) {
  const tokenPresent =
    typeof token === "string" &&
    token.trim().length > 0;

  return Object.freeze({
    valid: tokenPresent,
    tokenPresent,
    tokenReturned: false,
    tokenLogged: false,
  });
}

export function createUnauthenticatedResult({
  method = null,
  reason = AUTHENTICATION_STATUS.UNAUTHENTICATED,
} = {}) {
  return createAuthenticationResult({
    status:
      AUTHENTICATION_STATUS.UNAUTHENTICATED,
    method,
    identity: null,
    reason,
  });
}

export default createAuthenticationResult;