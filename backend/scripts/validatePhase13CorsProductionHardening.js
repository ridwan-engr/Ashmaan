import assert from "node:assert/strict";

import {
  CORS_HARDENING_PHASE,
  CORS_HARDENING_LAYER,
  CORS_ENVIRONMENT,
  CORS_DECISION,
  CORS_DENIAL_REASON,
  DEFAULT_ALLOWED_METHODS,
  DEFAULT_ALLOWED_HEADERS,
  DEFAULT_EXPOSED_HEADERS,
  CORS_HARDENING_INVARIANTS,
  isKnownCorsEnvironment,
  isValidOrigin,
  validateCorsPolicy,
  createCorsDecision,
  evaluateCorsOrigin,
  buildCorsConfiguration,
} from "../services/security/corsProductionHardeningService.js";

let passed = 0;

function check(condition, message) {
  assert.ok(condition, message);
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
  "ASHMAAN PHASE 13.8 — CORS PRODUCTION HARDENING VALIDATION"
);

console.log(
  "========================================================================"
);

try {
  // ============================================================
  // A. PHASE IDENTITY
  // ============================================================

  section("A. Phase identity");

  check(
    CORS_HARDENING_PHASE === "13.8",
    "phase identity is 13.8"
  );

  check(
    CORS_HARDENING_LAYER === "CORS",
    "layer identity is CORS"
  );

  // ============================================================
  // B. ENVIRONMENTS
  // ============================================================

  section("B. Environment taxonomy");

  for (const environment of [
    "DEVELOPMENT",
    "TEST",
    "PRODUCTION",
  ]) {
    check(
      Object.values(
        CORS_ENVIRONMENT
      ).includes(environment),
      `CORS environment exists: ${environment}`
    );
  }

  check(
    isKnownCorsEnvironment(
      "production"
    ) === true,
    "environment normalization is case-insensitive"
  );

  check(
    isKnownCorsEnvironment(
      "UNKNOWN"
    ) === false,
    "unknown environment is rejected"
  );

  // ============================================================
  // C. DECISIONS
  // ============================================================

  section("C. Decision taxonomy");

  check(
    CORS_DECISION.ALLOW === "ALLOW",
    "ALLOW CORS decision exists"
  );

  check(
    CORS_DECISION.DENY === "DENY",
    "DENY CORS decision exists"
  );

  check(
    CORS_DECISION.UNAVAILABLE ===
      "UNAVAILABLE",
    "UNAVAILABLE CORS decision exists"
  );

  // ============================================================
  // D. DENIAL REASONS
  // ============================================================

  section("D. Denial reason taxonomy");

  const requiredReasons = [
    "INVALID_ENVIRONMENT",
    "INVALID_POLICY",
    "ORIGIN_MISSING",
    "ORIGIN_INVALID",
    "ORIGIN_NOT_ALLOWED",
    "WILDCARD_FORBIDDEN_IN_PRODUCTION",
    "WILDCARD_WITH_CREDENTIALS_FORBIDDEN",
    "CORS_UNAVAILABLE",
  ];

  for (const reason of requiredReasons) {
    check(
      Object.values(
        CORS_DENIAL_REASON
      ).includes(reason),
      `CORS denial reason exists: ${reason}`
    );
  }

  // ============================================================
  // E. DEFAULT METHOD / HEADER POLICY
  // ============================================================

  section("E. Explicit method/header policy");

  for (const method of [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ]) {
    check(
      DEFAULT_ALLOWED_METHODS.includes(
        method
      ),
      `default method explicitly allowed: ${method}`
    );
  }

  check(
    DEFAULT_ALLOWED_HEADERS.includes(
      "Authorization"
    ),
    "Authorization header is explicitly allowed"
  );

  check(
    DEFAULT_ALLOWED_HEADERS.includes(
      "Content-Type"
    ),
    "Content-Type header is explicitly allowed"
  );

  check(
    Array.isArray(
      DEFAULT_EXPOSED_HEADERS
    ),
    "exposed headers are explicitly represented"
  );

  // ============================================================
  // F. ORIGIN VALIDATION
  // ============================================================

  section("F. Origin validation");

  check(
    isValidOrigin(
      "https://ashmaan.example"
    ) === true,
    "HTTPS origin is valid"
  );

  check(
    isValidOrigin(
      "http://localhost:5173"
    ) === true,
    "localhost development origin is valid"
  );

  check(
    isValidOrigin("*") === true,
    "wildcard token is structurally recognized"
  );

  check(
    isValidOrigin(
      "not-an-origin"
    ) === false,
    "malformed origin is rejected"
  );

  check(
    isValidOrigin(
      "https://ashmaan.example/path"
    ) === false,
    "origin containing path is rejected"
  );

  check(
    isValidOrigin(
      "ftp://ashmaan.example"
    ) === false,
    "non-HTTP origin scheme is rejected"
  );

  // ============================================================
  // G. INVARIANTS
  // ============================================================

  section("G. Core CORS invariants");

  const invariantNames = [
    "productionOriginsMustBeExplicit",
    "wildcardProductionOriginForbidden",
    "wildcardWithCredentialsForbidden",
    "unauthorizedOriginMustBeDenied",
    "missingOriginEvidenceMustNotBeInferred",
    "malformedOriginMustBeRejected",
    "originComparisonMustBeExact",
    "credentialsMustBeExplicit",
    "methodsMustBeExplicit",
    "headersMustBeExplicit",
    "corsUnavailableMustNotAllow",
    "corsFailureMustFailClosed",
    "corsPolicyMustNotExecuteEquipmentControl",
    "optimizationDssRemainsNonExecutable",
    "optimizationDssAutoDispatchRemainsDisabled",
  ];

  for (const name of invariantNames) {
    check(
      CORS_HARDENING_INVARIANTS[
        name
      ] === true,
      `CORS invariant enforced: ${name}`
    );
  }

  // ============================================================
  // H. VALID PRODUCTION POLICY
  // ============================================================

  section("H. Valid production policy");

  const productionPolicy =
    validateCorsPolicy({
      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "https://app.ashmaan.example",
      ],

      credentials: true,
    });

  check(
    productionPolicy.valid === true,
    "explicit production allow-list is valid"
  );

  check(
    productionPolicy.errors.length ===
      0,
    "valid production CORS policy has zero errors"
  );

  // ============================================================
  // I. VALID ALLOW CASE
  // ============================================================

  section("I. Explicit allow case");

  const allowed =
    evaluateCorsOrigin({
      origin:
        "https://app.ashmaan.example",

      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "https://app.ashmaan.example",
      ],

      credentials: true,
    });

  check(
    allowed.decision ===
      CORS_DECISION.ALLOW,
    "allow-listed production origin is allowed"
  );

  check(
    allowed.allowed === true,
    "allow-listed origin has allowed=true"
  );

  check(
    allowed.origin ===
      "https://app.ashmaan.example",
    "allowed origin is preserved exactly"
  );

  check(
    allowed.credentials === true,
    "credential setting is explicit"
  );

  check(
    allowed.reason === null,
    "allowed CORS decision has no denial reason"
  );

  // ============================================================
  // J. EXACT ORIGIN MATCH
  // ============================================================

  section("J. Exact origin matching");

  const caseMismatch =
    evaluateCorsOrigin({
      origin:
        "https://APP.ashmaan.example",

      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "https://app.ashmaan.example",
      ],
    });

  check(
    caseMismatch.allowed === false,
    "origin matching does not silently normalize configured origin"
  );

  check(
    caseMismatch.reason ===
      CORS_DENIAL_REASON
        .ORIGIN_NOT_ALLOWED,
    "exact-origin mismatch is explicitly denied"
  );

  const portMismatch =
    evaluateCorsOrigin({
      origin:
        "https://app.ashmaan.example:8443",

      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "https://app.ashmaan.example",
      ],
    });

  check(
    portMismatch.allowed === false,
    "different origin port is denied"
  );

  // ============================================================
  // K. UNAUTHORIZED ORIGIN
  // ============================================================

  section("K. Unauthorized origin");

  const unauthorized =
    evaluateCorsOrigin({
      origin:
        "https://evil.example",

      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "https://app.ashmaan.example",
      ],
    });

  check(
    unauthorized.decision ===
      CORS_DECISION.DENY,
    "unauthorized origin is denied"
  );

  check(
    unauthorized.allowed === false,
    "unauthorized origin has allowed=false"
  );

  check(
    unauthorized.reason ===
      CORS_DENIAL_REASON
        .ORIGIN_NOT_ALLOWED,
    "unauthorized-origin reason is explicit"
  );

  // ============================================================
  // L. MISSING ORIGIN
  // ============================================================

  section("L. Missing origin");

  const missingOrigin =
    evaluateCorsOrigin({
      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "https://app.ashmaan.example",
      ],
    });

  check(
    missingOrigin.allowed === false,
    "missing origin is not inferred or allowed"
  );

  check(
    missingOrigin.reason ===
      CORS_DENIAL_REASON.ORIGIN_MISSING,
    "missing-origin denial is explicit"
  );

  // ============================================================
  // M. MALFORMED ORIGIN
  // ============================================================

  section("M. Malformed origin");

  const malformedOrigin =
    evaluateCorsOrigin({
      origin: "bad-origin",

      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "https://app.ashmaan.example",
      ],
    });

  check(
    malformedOrigin.allowed ===
      false,
    "malformed request origin is denied"
  );

  check(
    malformedOrigin.reason ===
      CORS_DENIAL_REASON.ORIGIN_INVALID,
    "malformed-origin denial is explicit"
  );

  // ============================================================
  // N. PRODUCTION WILDCARD REJECTION
  // ============================================================

  section("N. Production wildcard rejection");

  const wildcardProduction =
    validateCorsPolicy({
      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: ["*"],

      credentials: false,
    });

  check(
    wildcardProduction.valid ===
      false,
    "wildcard production origin is rejected"
  );

  check(
    wildcardProduction.errors.includes(
      CORS_DENIAL_REASON
        .WILDCARD_FORBIDDEN_IN_PRODUCTION
    ),
    "production wildcard rejection is explicit"
  );

  // ============================================================
  // O. WILDCARD + CREDENTIALS
  // ============================================================

  section("O. Wildcard credential safety");

  const wildcardCredentials =
    validateCorsPolicy({
      environment:
        CORS_ENVIRONMENT.DEVELOPMENT,

      allowedOrigins: ["*"],

      credentials: true,
    });

  check(
    wildcardCredentials.valid ===
      false,
    "wildcard with credentials is rejected"
  );

  check(
    wildcardCredentials.errors.includes(
      CORS_DENIAL_REASON
        .WILDCARD_WITH_CREDENTIALS_FORBIDDEN
    ),
    "wildcard credential rejection is explicit"
  );

  // ============================================================
  // P. DEVELOPMENT WILDCARD WITHOUT CREDENTIALS
  // ============================================================

  section("P. Development wildcard behavior");

  const developmentWildcard =
    validateCorsPolicy({
      environment:
        CORS_ENVIRONMENT.DEVELOPMENT,

      allowedOrigins: ["*"],

      credentials: false,
    });

  check(
    developmentWildcard.valid ===
      true,
    "development wildcard without credentials is structurally allowed"
  );

  const developmentOrigin =
    evaluateCorsOrigin({
      origin:
        "http://localhost:5173",

      environment:
        CORS_ENVIRONMENT.DEVELOPMENT,

      allowedOrigins: ["*"],

      credentials: false,
    });

  check(
    developmentOrigin.allowed ===
      true,
    "development wildcard permits a valid origin"
  );

  // ============================================================
  // Q. EMPTY PRODUCTION ALLOW-LIST
  // ============================================================

  section("Q. Empty production allow-list");

  const emptyProduction =
    validateCorsPolicy({
      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [],

      credentials: false,
    });

  check(
    emptyProduction.valid ===
      false,
    "production policy requires explicit origin allow-list"
  );

  check(
    emptyProduction.errors.includes(
      CORS_DENIAL_REASON.INVALID_POLICY
    ),
    "empty production allow-list rejection is explicit"
  );

  // ============================================================
  // R. INVALID POLICY
  // ============================================================

  section("R. Invalid policy structures");

  const stringOrigins =
    validateCorsPolicy({
      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins:
        "https://app.ashmaan.example",
    });

  check(
    stringOrigins.valid === false,
    "string is rejected where origin array is required"
  );

  const invalidCredentials =
    validateCorsPolicy({
      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "https://app.ashmaan.example",
      ],

      credentials: "true",
    });

  check(
    invalidCredentials.valid ===
      false,
    "credential string is not silently coerced"
  );

  const malformedConfiguredOrigin =
    validateCorsPolicy({
      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "not-an-origin",
      ],
    });

  check(
    malformedConfiguredOrigin.valid ===
      false,
    "malformed configured origin is rejected"
  );

  check(
    malformedConfiguredOrigin.errors.includes(
      CORS_DENIAL_REASON.ORIGIN_INVALID
    ),
    "malformed configured origin rejection is explicit"
  );

  const duplicateOrigins =
    validateCorsPolicy({
      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "https://app.ashmaan.example",
        "https://app.ashmaan.example",
      ],
    });

  check(
    duplicateOrigins.valid ===
      false,
    "duplicate origin configuration is rejected"
  );

  // ============================================================
  // S. INVALID ENVIRONMENT
  // ============================================================

  section("S. Invalid environment");

  const invalidEnvironment =
    validateCorsPolicy({
      environment: "UNKNOWN",

      allowedOrigins: [
        "https://app.ashmaan.example",
      ],
    });

  check(
    invalidEnvironment.valid ===
      false,
    "unknown CORS environment is rejected"
  );

  check(
    invalidEnvironment.errors.includes(
      CORS_DENIAL_REASON
        .INVALID_ENVIRONMENT
    ),
    "invalid CORS environment is explicit"
  );

  // ============================================================
  // T. CORS UNAVAILABLE
  // ============================================================

  section("T. CORS unavailable");

  const unavailable =
    evaluateCorsOrigin({
      origin:
        "https://app.ashmaan.example",

      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "https://app.ashmaan.example",
      ],

      corsAvailable: false,
    });

  check(
    unavailable.decision ===
      CORS_DECISION.UNAVAILABLE,
    "CORS failure is represented as UNAVAILABLE"
  );

  check(
    unavailable.allowed === false,
    "UNAVAILABLE CORS state never becomes ALLOW"
  );

  check(
    unavailable.reason ===
      CORS_DENIAL_REASON
        .CORS_UNAVAILABLE,
    "CORS UNAVAILABLE reason is explicit"
  );

  // ============================================================
  // U. BUILD CONFIGURATION
  // ============================================================

  section("U. Configuration builder");

  const config =
    buildCorsConfiguration({
      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: [
        "https://app.ashmaan.example",
      ],

      credentials: true,
    });

  check(
    config.valid === true,
    "valid CORS configuration builds successfully"
  );

  check(
    config.config.environment ===
      "PRODUCTION",
    "built configuration preserves normalized environment"
  );

  check(
    config.config.allowedOrigins.length ===
      1,
    "built configuration preserves explicit allow-list"
  );

  check(
    config.config.credentials === true,
    "built configuration preserves credentials setting"
  );

  check(
    config.config.allowedMethods.includes(
      "OPTIONS"
    ),
    "built configuration preserves preflight method"
  );

  const invalidConfig =
    buildCorsConfiguration({
      environment:
        CORS_ENVIRONMENT.PRODUCTION,

      allowedOrigins: ["*"],
    });

  check(
    invalidConfig.valid === false,
    "invalid production CORS configuration fails"
  );

  check(
    invalidConfig.config === null,
    "invalid CORS policy emits no partial configuration"
  );

  // ============================================================
  // V. RESULT CONTRACT
  // ============================================================

  section("V. Result contract");

  check(
    allowed.phase === "13.8",
    "CORS result preserves phase"
  );

  check(
    allowed.layer === "CORS",
    "CORS result preserves layer"
  );

  check(
    allowed.allowed === true,
    "ALLOW decision preserves allowed=true"
  );

  const explicitDeny =
    createCorsDecision({
      decision:
        CORS_DECISION.DENY,

      origin:
        "https://evil.example",

      reason:
        CORS_DENIAL_REASON
          .ORIGIN_NOT_ALLOWED,
    });

  check(
    explicitDeny.allowed === false,
    "DENY result preserves allowed=false"
  );

  check(
    explicitDeny.reason ===
      "ORIGIN_NOT_ALLOWED",
    "DENY result preserves explicit reason"
  );

  // ============================================================
  // W. INVALID DECISION
  // ============================================================

  section("W. Invalid decision");

  let invalidDecisionRejected =
    false;

  try {
    createCorsDecision({
      decision: "INVALID",
    });
  } catch {
    invalidDecisionRejected = true;
  }

  check(
    invalidDecisionRejected,
    "unsupported CORS decision is rejected"
  );

  // ============================================================
  // X. SAFETY BOUNDARY
  // ============================================================

  section("X. Safety boundary");

  check(
    allowed.equipmentControlExecuted ===
      false,
    "CORS service executes no equipment control"
  );

  check(
    allowed.autoDispatchExecuted ===
      false,
    "CORS service executes no auto-dispatch"
  );

  check(
    unavailable
      .equipmentControlExecuted ===
      false,
    "CORS failure executes no equipment control"
  );

  check(
    unavailable
      .autoDispatchExecuted ===
      false,
    "CORS failure executes no auto-dispatch"
  );

  // ============================================================
  // Y. FROZEN STRUCTURES
  // ============================================================

  section("Y. Frozen structures");

  check(
    Object.isFrozen(
      CORS_ENVIRONMENT
    ),
    "CORS environment taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      CORS_DECISION
    ),
    "CORS decision taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      CORS_DENIAL_REASON
    ),
    "CORS denial taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DEFAULT_ALLOWED_METHODS
    ),
    "default allowed methods are frozen"
  );

  check(
    Object.isFrozen(
      DEFAULT_ALLOWED_HEADERS
    ),
    "default allowed headers are frozen"
  );

  check(
    Object.isFrozen(
      DEFAULT_EXPOSED_HEADERS
    ),
    "default exposed headers are frozen"
  );

  check(
    Object.isFrozen(
      CORS_HARDENING_INVARIANTS
    ),
    "CORS invariants are frozen"
  );

  check(
    Object.isFrozen(allowed),
    "CORS decision result is frozen"
  );

  check(
    Object.isFrozen(config),
    "CORS configuration result is frozen"
  );

  check(
    Object.isFrozen(
      config.config
    ),
    "built CORS configuration is frozen"
  );

  check(
    Object.isFrozen(
      config.config.allowedOrigins
    ),
    "built origin allow-list is frozen"
  );

  // ============================================================
  // FINAL
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.8 CORS PRODUCTION HARDENING RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Production origins        : EXPLICIT ALLOW-LIST"
  );

  console.log(
    "Production wildcard       : FORBIDDEN"
  );

  console.log(
    "Wildcard + credentials    : FORBIDDEN"
  );

  console.log(
    "Unauthorized origins      : DENIED"
  );

  console.log(
    "Missing origin evidence   : NOT INFERRED"
  );

  console.log(
    "Malformed origins         : REJECTED"
  );

  console.log(
    "Origin comparison         : EXACT"
  );

  console.log(
    "CORS unavailable          : NOT ALLOWED"
  );

  console.log(
    "Failure behavior          : FAIL CLOSED"
  );

  console.log(
    "Equipment control         : NONE"
  );

  console.log(
    "Auto-dispatch             : DISABLED"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    `\nAssertions passed: ${passed}`
  );

  console.log(
    "ASHMAAN PHASE 13.8 CORS PRODUCTION HARDENING VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.8 CORS PRODUCTION HARDENING VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}