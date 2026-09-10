import assert from "node:assert/strict";

import {
  AUTHENTICATION_HARDENING_PHASE,
  AUTHENTICATION_HARDENING_LAYER,
  AUTHENTICATION_STATUS,
  AUTHENTICATION_METHODS,
  AUTHENTICATION_INVARIANTS,
  createAuthenticationResult,
  validatePasswordAuthenticationInput,
  validateTokenAuthenticationInput,
  createUnauthenticatedResult,
} from "../services/security/authenticationHardeningService.js";

let passed = 0;

function check(condition, message) {
  assert.ok(condition, message);
  passed += 1;
  console.log(`PASS ${passed}: ${message}`);
}

function section(title) {
  console.log(`\n--- ${title} ---`);
}

console.log(
  "\n========================================================================"
);
console.log(
  "ASHMAAN PHASE 13.3 — AUTHENTICATION HARDENING VALIDATION"
);
console.log(
  "========================================================================"
);

try {
  section("A. Identity");

  check(
    AUTHENTICATION_HARDENING_PHASE ===
      "13.3",
    "phase identity is 13.3"
  );

  check(
    AUTHENTICATION_HARDENING_LAYER ===
      "AUTHENTICATION",
    "layer identity is AUTHENTICATION"
  );

  section("B. Status taxonomy");

  const requiredStatuses = [
    "AUTHENTICATED",
    "UNAUTHENTICATED",
    "INVALID_CREDENTIALS",
    "TOKEN_EXPIRED",
    "TOKEN_INVALID",
    "UNAVAILABLE",
  ];

  for (const status of requiredStatuses) {
    check(
      Object.values(
        AUTHENTICATION_STATUS
      ).includes(status),
      `authentication status exists: ${status}`
    );
  }

  section("C. Authentication methods");

  check(
    AUTHENTICATION_METHODS.PASSWORD ===
      "PASSWORD",
    "PASSWORD authentication method exists"
  );

  check(
    AUTHENTICATION_METHODS.ACCESS_TOKEN ===
      "ACCESS_TOKEN",
    "ACCESS_TOKEN authentication method exists"
  );

  check(
    AUTHENTICATION_METHODS.SERVICE_TOKEN ===
      "SERVICE_TOKEN",
    "SERVICE_TOKEN authentication method exists"
  );

  section("D. Core authentication invariants");

  const invariantNames = [
    "authenticationDoesNotImplyAuthorization",
    "rawPasswordsMustNotBeLogged",
    "rawPasswordsMustNotBeReturned",
    "passwordHashesMustNotBeReturned",
    "accessTokensMustNotBeLogged",
    "invalidCredentialResponseMustNotRevealAccountExistence",
    "expiredTokensMustBeRejected",
    "invalidTokensMustBeRejected",
    "missingAuthenticationEvidenceMustNotAuthenticate",
    "unavailableAuthenticationMustNotAuthenticate",
    "tokenValidationMustBeExplicit",
    "credentialValidationMustBeExplicit",
  ];

  for (const name of invariantNames) {
    check(
      AUTHENTICATION_INVARIANTS[name] ===
        true,
      `authentication invariant enforced: ${name}`
    );
  }

  section("E. Authenticated result");

  const authenticated =
    createAuthenticationResult({
      status:
        AUTHENTICATION_STATUS.AUTHENTICATED,
      method:
        AUTHENTICATION_METHODS.ACCESS_TOKEN,
      identity: {
        id: "user-001",
        type: "USER",
        passwordHash:
          "must-not-be-returned",
      },
    });

  check(
    authenticated.authenticated ===
      true,
    "authenticated status produces authenticated=true"
  );

  check(
    authenticated.status ===
      "AUTHENTICATED",
    "authenticated result preserves status"
  );

  check(
    authenticated.method ===
      "ACCESS_TOKEN",
    "authenticated result preserves authentication method"
  );

  check(
    authenticated.identity.id ===
      "user-001",
    "authenticated identity ID is preserved"
  );

  check(
    authenticated.identity.type ===
      "USER",
    "authenticated identity type is preserved"
  );

  check(
    !Object.prototype.hasOwnProperty.call(
      authenticated.identity,
      "passwordHash"
    ),
    "password hash is not exposed in authenticated identity"
  );

  check(
    authenticated.authorizationGranted ===
      false,
    "authentication does not automatically grant authorization"
  );

  check(
    authenticated.reason === null,
    "successful authentication has no failure reason"
  );

  section("F. Invalid credential result");

  const invalidCredentials =
    createAuthenticationResult({
      status:
        AUTHENTICATION_STATUS.INVALID_CREDENTIALS,
      method:
        AUTHENTICATION_METHODS.PASSWORD,
      identity: {
        id: "user-001",
        type: "USER",
      },
      reason:
        "Invalid credentials",
    });

  check(
    invalidCredentials.authenticated ===
      false,
    "invalid credentials never authenticate"
  );

  check(
    invalidCredentials.identity ===
      null,
    "invalid credentials expose no identity"
  );

  check(
    invalidCredentials.authorizationGranted ===
      false,
    "invalid credentials grant no authorization"
  );

  section("G. Token failure behavior");

  const expired =
    createAuthenticationResult({
      status:
        AUTHENTICATION_STATUS.TOKEN_EXPIRED,
      method:
        AUTHENTICATION_METHODS.ACCESS_TOKEN,
    });

  check(
    expired.authenticated === false,
    "expired token is rejected"
  );

  check(
    expired.identity === null,
    "expired token exposes no identity"
  );

  const invalidToken =
    createAuthenticationResult({
      status:
        AUTHENTICATION_STATUS.TOKEN_INVALID,
      method:
        AUTHENTICATION_METHODS.ACCESS_TOKEN,
    });

  check(
    invalidToken.authenticated === false,
    "invalid token is rejected"
  );

  check(
    invalidToken.identity === null,
    "invalid token exposes no identity"
  );

  section("H. Missing authentication evidence");

  const unauthenticated =
    createUnauthenticatedResult({
      method:
        AUTHENTICATION_METHODS.ACCESS_TOKEN,
    });

  check(
    unauthenticated.status ===
      "UNAUTHENTICATED",
    "missing authentication evidence produces UNAUTHENTICATED"
  );

  check(
    unauthenticated.authenticated ===
      false,
    "missing authentication evidence does not authenticate"
  );

  check(
    unauthenticated.authorizationGranted ===
      false,
    "missing authentication evidence grants no authorization"
  );

  section("I. Password input validation");

  const validPasswordInput =
    validatePasswordAuthenticationInput({
      username: "ridwan@example.com",
      password: "Secret123!",
    });

  check(
    validPasswordInput.valid ===
      true,
    "valid password-auth input is accepted structurally"
  );

  check(
    validPasswordInput.usernamePresent ===
      true,
    "username presence is detected"
  );

  check(
    validPasswordInput.passwordPresent ===
      true,
    "password presence is detected"
  );

  check(
    validPasswordInput.passwordReturned ===
      false,
    "password is not returned"
  );

  check(
    validPasswordInput.passwordLogged ===
      false,
    "password is not logged"
  );

  const missingPasswordInput =
    validatePasswordAuthenticationInput({
      username: "ridwan@example.com",
    });

  check(
    missingPasswordInput.valid ===
      false,
    "missing password is rejected"
  );

  check(
    missingPasswordInput.passwordPresent ===
      false,
    "missing password is explicit"
  );

  section("J. Token input validation");

  const validTokenInput =
    validateTokenAuthenticationInput({
      token: "signed-token-value",
    });

  check(
    validTokenInput.valid === true,
    "present token is structurally accepted"
  );

  check(
    validTokenInput.tokenPresent ===
      true,
    "token presence is detected"
  );

  check(
    validTokenInput.tokenReturned ===
      false,
    "token value is not returned"
  );

  check(
    validTokenInput.tokenLogged ===
      false,
    "token value is not logged"
  );

  const missingTokenInput =
    validateTokenAuthenticationInput({});

  check(
    missingTokenInput.valid ===
      false,
    "missing token is rejected"
  );

  check(
    missingTokenInput.tokenPresent ===
      false,
    "missing token is explicit"
  );

  section("K. UNAVAILABLE behavior");

  const unavailable =
    createAuthenticationResult({
      status:
        AUTHENTICATION_STATUS.UNAVAILABLE,
      method:
        AUTHENTICATION_METHODS.ACCESS_TOKEN,
    });

  check(
    unavailable.authenticated ===
      false,
    "UNAVAILABLE authentication does not authenticate"
  );

  check(
    unavailable.authorizationGranted ===
      false,
    "UNAVAILABLE authentication grants no authorization"
  );

  section("L. Invalid status rejection");

  let invalidStatusRejected =
    false;

  try {
    createAuthenticationResult({
      status: "FAKE_STATUS",
    });
  } catch {
    invalidStatusRejected = true;
  }

  check(
    invalidStatusRejected,
    "unsupported authentication status is rejected"
  );

  section("M. Frozen security structures");

  check(
    Object.isFrozen(
      AUTHENTICATION_STATUS
    ),
    "authentication status taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      AUTHENTICATION_METHODS
    ),
    "authentication methods taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      AUTHENTICATION_INVARIANTS
    ),
    "authentication invariants are frozen"
  );

  check(
    Object.isFrozen(authenticated),
    "authentication result is frozen"
  );

  console.log(
    "\n------------------------------------------------------------------------"
  );
  console.log(
    "PHASE 13.3 AUTHENTICATION HARDENING RESULT"
  );
  console.log(
    "------------------------------------------------------------------------"
  );
  console.log(
    "Authentication required      : EXPLICIT"
  );
  console.log(
    "Authentication → authorization: FORBIDDEN"
  );
  console.log(
    "Raw password exposure        : FORBIDDEN"
  );
  console.log(
    "Password-hash exposure       : FORBIDDEN"
  );
  console.log(
    "Token logging                : FORBIDDEN"
  );
  console.log(
    "Expired token                : REJECTED"
  );
  console.log(
    "Invalid token                : REJECTED"
  );
  console.log(
    "Missing auth evidence        : UNAUTHENTICATED"
  );
  console.log(
    "Unavailable auth             : UNAUTHENTICATED"
  );
  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    `\nAssertions passed: ${passed}`
  );

  console.log(
    "ASHMAAN PHASE 13.3 AUTHENTICATION HARDENING VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );
  console.error(
    "ASHMAAN PHASE 13.3 AUTHENTICATION HARDENING VALIDATION FAILED"
  );
  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}