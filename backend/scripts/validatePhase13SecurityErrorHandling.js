import assert from "node:assert/strict";

import {
  SECURITY_ERROR_HANDLING_PHASE,
  SECURITY_ERROR_HANDLING_LAYER,
  SECURITY_ERROR_CATEGORY,
  SECURITY_PUBLIC_ERROR_CODE,
  SECURITY_ERROR_STATUS,
  SECURITY_PUBLIC_ERROR_POLICY,
  SECURITY_ERROR_HANDLING_INVARIANTS,
  isKnownSecurityErrorCategory,
  isKnownPublicErrorCode,
  getPublicErrorPolicy,
  validateRetryAfterSeconds,
  describeInternalError,
  validateSecurityErrorInput,
  createSecurityErrorResponse,
  serializeSecurityErrorResponse,
} from "../services/security/securityErrorHandlingService.js";

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
  "ASHMAAN PHASE 13.13 — SECURITY ERROR HANDLING VALIDATION"
);

console.log(
  "========================================================================"
);

try {
  // ============================================================
  // A. PHASE IDENTITY
  // ============================================================

  section(
    "A. Phase identity"
  );

  check(
    SECURITY_ERROR_HANDLING_PHASE ===
      "13.13",
    "phase identity is 13.13"
  );

  check(
    SECURITY_ERROR_HANDLING_LAYER ===
      "SECURITY_ERROR_HANDLING",
    "layer identity is SECURITY_ERROR_HANDLING"
  );

  // ============================================================
  // B. ERROR CATEGORY TAXONOMY
  // ============================================================

  section(
    "B. Security-error category taxonomy"
  );

  for (
    const category of [
      "AUTHENTICATION",
      "AUTHORIZATION",
      "INPUT_VALIDATION",
      "RATE_LIMITING",
      "DATABASE",
      "DEPENDENCY",
      "SECURITY_CONFIGURATION",
      "INTERNAL",
    ]
  ) {
    check(
      Object.values(
        SECURITY_ERROR_CATEGORY
      ).includes(
        category
      ),
      `security-error category exists: ${category}`
    );
  }

  check(
    isKnownSecurityErrorCategory(
      "authentication"
    ) === true,
    "security-error category detection is case-insensitive"
  );

  check(
    isKnownSecurityErrorCategory(
      "UNKNOWN"
    ) === false,
    "unknown security-error category is rejected"
  );

  // ============================================================
  // C. PUBLIC ERROR CODE TAXONOMY
  // ============================================================

  section(
    "C. Public error-code taxonomy"
  );

  for (
    const code of [
      "AUTHENTICATION_REQUIRED",
      "ACCESS_DENIED",
      "INVALID_REQUEST",
      "RATE_LIMITED",
      "SERVICE_UNAVAILABLE",
      "SECURITY_CONFIGURATION_ERROR",
      "INTERNAL_SERVER_ERROR",
    ]
  ) {
    check(
      Object.values(
        SECURITY_PUBLIC_ERROR_CODE
      ).includes(
        code
      ),
      `public error code exists: ${code}`
    );
  }

  check(
    isKnownPublicErrorCode(
      "access_denied"
    ) === true,
    "public error-code detection is case-insensitive"
  );

  check(
    isKnownPublicErrorCode(
      "UNKNOWN_ERROR"
    ) === false,
    "unknown public error code is rejected"
  );

  // ============================================================
  // D. STATUS TAXONOMY
  // ============================================================

  section(
    "D. Error-handling status taxonomy"
  );

  check(
    SECURITY_ERROR_STATUS.HANDLED ===
      "HANDLED",
    "HANDLED status exists"
  );

  check(
    SECURITY_ERROR_STATUS.UNAVAILABLE ===
      "UNAVAILABLE",
    "UNAVAILABLE status exists"
  );

  check(
    SECURITY_ERROR_STATUS.INVALID ===
      "INVALID",
    "INVALID status exists"
  );

  // ============================================================
  // E. PUBLIC POLICY
  // ============================================================

  section(
    "E. Public error policy"
  );

  check(
    SECURITY_PUBLIC_ERROR_POLICY
      .AUTHENTICATION
      .statusCode === 401,
    "authentication failure maps to HTTP 401"
  );

  check(
    SECURITY_PUBLIC_ERROR_POLICY
      .AUTHORIZATION
      .statusCode === 403,
    "authorization failure maps to HTTP 403"
  );

  check(
    SECURITY_PUBLIC_ERROR_POLICY
      .INPUT_VALIDATION
      .statusCode === 400,
    "input-validation failure maps to HTTP 400"
  );

  check(
    SECURITY_PUBLIC_ERROR_POLICY
      .RATE_LIMITING
      .statusCode === 429,
    "rate-limiting failure maps to HTTP 429"
  );

  check(
    SECURITY_PUBLIC_ERROR_POLICY
      .DATABASE
      .statusCode === 503,
    "database failure maps to HTTP 503"
  );

  check(
    SECURITY_PUBLIC_ERROR_POLICY
      .DEPENDENCY
      .statusCode === 503,
    "dependency failure maps to HTTP 503"
  );

  check(
    SECURITY_PUBLIC_ERROR_POLICY
      .SECURITY_CONFIGURATION
      .statusCode === 500,
    "security-configuration failure maps to HTTP 500"
  );

  check(
    SECURITY_PUBLIC_ERROR_POLICY
      .INTERNAL
      .statusCode === 500,
    "internal failure maps to HTTP 500"
  );

  check(
    getPublicErrorPolicy(
      "authorization"
    ) ===
      SECURITY_PUBLIC_ERROR_POLICY
        .AUTHORIZATION,
    "public error policy lookup is case-insensitive"
  );

  check(
    getPublicErrorPolicy(
      "UNKNOWN"
    ) === null,
    "unknown category has no public policy"
  );

  // ============================================================
  // F. CORE INVARIANTS
  // ============================================================

  section(
    "F. Core security-error invariants"
  );

  const invariantNames = [
    "securityErrorsMustFailClosed",
    "clientErrorsMustUseSafePublicMessages",
    "internalExceptionMessagesMustNotBeReturned",
    "stackTracesMustNotBeReturned",
    "rawErrorsMustNotBeReturned",
    "passwordsMustNotBeReturned",
    "passwordHashesMustNotBeReturned",
    "accessTokensMustNotBeReturned",
    "refreshTokensMustNotBeReturned",
    "authorizationHeadersMustNotBeReturned",
    "cookiesMustNotBeReturned",
    "secretsMustNotBeReturned",
    "apiKeysMustNotBeReturned",
    "privateKeysMustNotBeReturned",
    "databaseUrisMustNotBeReturned",
    "internalFilePathsMustNotBeReturned",
    "databaseFailureMustNotRevealDatabaseDetails",
    "dependencyFailureMustNotRevealDependencyDetails",
    "authenticationFailureMustNotRevealAccountExistence",
    "authorizationFailureMustNotRevealProtectedResourceDetails",
    "correlationIdMayBeReturnedWhenExplicit",
    "retryAfterMustBeExplicitAndBounded",
    "errorHandlingFailureMustNotGrantAuthorization",
    "errorHandlingMustNotAuthenticate",
    "errorHandlingMustNotMutateDatabase",
    "errorHandlingMustNotExecuteEquipmentControl",
    "optimizationDssRemainsNonExecutable",
    "optimizationDssAutoDispatchRemainsDisabled",
  ];

  for (
    const name of
      invariantNames
  ) {
    check(
      SECURITY_ERROR_HANDLING_INVARIANTS[
        name
      ] === true,
      `security-error invariant enforced: ${name}`
    );
  }

  // ============================================================
  // G. RETRY-AFTER VALIDATION
  // ============================================================

  section(
    "G. Retry-After validation"
  );

  const noRetry =
    validateRetryAfterSeconds();

  check(
    noRetry.valid === true,
    "missing Retry-After is permitted"
  );

  check(
    noRetry.value === null,
    "missing Retry-After remains null"
  );

  const zeroRetry =
    validateRetryAfterSeconds(
      0
    );

  check(
    zeroRetry.valid === true,
    "zero Retry-After is valid"
  );

  check(
    zeroRetry.value === 0,
    "zero Retry-After is preserved"
  );

  const boundedRetry =
    validateRetryAfterSeconds(
      120
    );

  check(
    boundedRetry.valid === true,
    "bounded Retry-After is accepted"
  );

  check(
    boundedRetry.value === 120,
    "Retry-After value is preserved"
  );

  check(
    validateRetryAfterSeconds(
      -1
    ).valid === false,
    "negative Retry-After is rejected"
  );

  check(
    validateRetryAfterSeconds(
      86401
    ).valid === false,
    "Retry-After above one day is rejected"
  );

  check(
    validateRetryAfterSeconds(
      "60"
    ).valid === false,
    "Retry-After string is rejected without coercion"
  );

  // ============================================================
  // H. SAFE INTERNAL DIAGNOSTIC
  // ============================================================

  section(
    "H. Internal-error diagnostic safety"
  );

  const rawError =
    new Error(
      "MongoServerError mongodb+srv://user:secret@cluster/db"
    );

  rawError.stack =
    "Error: database failure\n" +
    "at C:\\Users\\owner\\ASHMAAN\\backend\\server.js:10:1";

  const diagnostic =
    describeInternalError(
      rawError
    );

  check(
    diagnostic.present ===
      true,
    "internal error presence may be recorded"
  );

  check(
    diagnostic.name ===
      "Error",
    "safe diagnostic may preserve exception class name"
  );

  check(
    diagnostic.rawMessageExposed ===
      false,
    "raw exception message is not exposed"
  );

  check(
    diagnostic.stackExposed ===
      false,
    "stack trace is not exposed"
  );

  check(
    diagnostic.rawErrorExposed ===
      false,
    "raw error object is not exposed"
  );

  const noDiagnostic =
    describeInternalError(
      null
    );

  check(
    noDiagnostic.present ===
      false,
    "missing internal error is represented explicitly"
  );

  // ============================================================
  // I. VALID INPUT
  // ============================================================

  section(
    "I. Valid security-error input"
  );

  const validInput =
    validateSecurityErrorInput({
      category:
        SECURITY_ERROR_CATEGORY
          .AUTHENTICATION,

      correlationId:
        "req-123",

      retryAfterSeconds:
        30,
    });

  check(
    validInput.valid ===
      true,
    "valid security-error input is accepted"
  );

  check(
    validInput.errors.length ===
      0,
    "valid security-error input reports zero errors"
  );

  // ============================================================
  // J. INVALID INPUT
  // ============================================================

  section(
    "J. Invalid security-error input"
  );

  const invalidInput =
    validateSecurityErrorInput({
      category:
        "UNKNOWN",

      correlationId:
        "",

      retryAfterSeconds:
        -1,
    });

  check(
    invalidInput.valid ===
      false,
    "invalid security-error input is rejected"
  );

  check(
    invalidInput.errors.includes(
      "INVALID_CATEGORY"
    ),
    "invalid category is explicit"
  );

  check(
    invalidInput.errors.includes(
      "INVALID_CORRELATION_ID"
    ),
    "invalid correlation id is explicit"
  );

  check(
    invalidInput.errors.includes(
      "INVALID_RETRY_AFTER"
    ),
    "invalid Retry-After is explicit"
  );

  // ============================================================
  // K. AUTHENTICATION ERROR
  // ============================================================

  section(
    "K. Authentication error response"
  );

  const authenticationError =
    createSecurityErrorResponse({
      category:
        SECURITY_ERROR_CATEGORY
          .AUTHENTICATION,

      correlationId:
        "auth-001",

      internalError:
        new Error(
          "User admin@example.com does not exist; token=secret"
        ),

      internalContext: {
        username:
          "admin@example.com",

        token:
          "secret-token",
      },
    });

  check(
    authenticationError.handled ===
      true,
    "authentication error is handled"
  );

  check(
    authenticationError.status ===
      SECURITY_ERROR_STATUS
        .HANDLED,
    "authentication error status is HANDLED"
  );

  check(
    authenticationError.statusCode ===
      401,
    "authentication error returns HTTP 401"
  );

  check(
    authenticationError.response
      .error.code ===
      SECURITY_PUBLIC_ERROR_CODE
        .AUTHENTICATION_REQUIRED,
    "authentication public code is safe and explicit"
  );

  check(
    authenticationError.response
      .error.message ===
      "Authentication is required.",
    "authentication response uses generic public message"
  );

  check(
    authenticationError.response
      .error.correlationId ===
      "auth-001",
    "explicit correlation id is preserved"
  );

  check(
    authenticationError
      .internalContextExposed ===
      false,
    "authentication internal context is not exposed"
  );

  check(
    authenticationError
      .rawErrorExposed ===
      false,
    "authentication raw error is not exposed"
  );

  check(
    authenticationError
      .stackTraceExposed ===
      false,
    "authentication stack trace is not exposed"
  );

  check(
    authenticationError
      .sensitiveDataExposed ===
      false,
    "authentication sensitive data is not exposed"
  );

  check(
    JSON.stringify(
      authenticationError.response
    ).includes(
      "admin@example.com"
    ) === false,
    "authentication response does not reveal account identifier"
  );

  check(
    JSON.stringify(
      authenticationError.response
    ).includes(
      "secret-token"
    ) === false,
    "authentication response does not reveal token"
  );

  // ============================================================
  // L. AUTHORIZATION ERROR
  // ============================================================

  section(
    "L. Authorization error response"
  );

  const authorizationError =
    createSecurityErrorResponse({
      category:
        SECURITY_ERROR_CATEGORY
          .AUTHORIZATION,

      internalError:
        new Error(
          "User attempted unauthorized access to /admin/security"
        ),
    });

  check(
    authorizationError.statusCode ===
      403,
    "authorization error returns HTTP 403"
  );

  check(
    authorizationError.response
      .error.code ===
      SECURITY_PUBLIC_ERROR_CODE
        .ACCESS_DENIED,
    "authorization public code is ACCESS_DENIED"
  );

  check(
    authorizationError.response
      .error.message ===
      "Access is denied.",
    "authorization response does not reveal protected-resource details"
  );

  check(
    JSON.stringify(
      authorizationError.response
    ).includes(
      "/admin/security"
    ) === false,
    "protected resource path is not leaked"
  );

  // ============================================================
  // M. INPUT VALIDATION ERROR
  // ============================================================

  section(
    "M. Input-validation error response"
  );

  const validationError =
    createSecurityErrorResponse({
      category:
        SECURITY_ERROR_CATEGORY
          .INPUT_VALIDATION,
    });

  check(
    validationError.statusCode ===
      400,
    "input-validation error returns HTTP 400"
  );

  check(
    validationError.response
      .error.code ===
      SECURITY_PUBLIC_ERROR_CODE
        .INVALID_REQUEST,
    "input-validation code is INVALID_REQUEST"
  );

  check(
    validationError.response
      .error.message ===
      "The request is invalid.",
    "input-validation message is safe"
  );

  // ============================================================
  // N. RATE LIMIT ERROR
  // ============================================================

  section(
    "N. Rate-limit error response"
  );

  const rateLimitError =
    createSecurityErrorResponse({
      category:
        SECURITY_ERROR_CATEGORY
          .RATE_LIMITING,

      retryAfterSeconds:
        60,
    });

  check(
    rateLimitError.statusCode ===
      429,
    "rate-limit error returns HTTP 429"
  );

  check(
    rateLimitError.response
      .error.code ===
      SECURITY_PUBLIC_ERROR_CODE
        .RATE_LIMITED,
    "rate-limit public code is RATE_LIMITED"
  );

  check(
    rateLimitError.retryAfterSeconds ===
      60,
    "valid Retry-After is preserved"
  );

  // ============================================================
  // O. DATABASE ERROR
  // ============================================================

  section(
    "O. Database error response"
  );

  const databaseError =
    createSecurityErrorResponse({
      category:
        SECURITY_ERROR_CATEGORY
          .DATABASE,

      internalError:
        new Error(
          "MongoNetworkError mongodb+srv://dbuser:password@cluster.example/ashmaan"
        ),

      internalContext: {
        mongodbUri:
          "mongodb+srv://dbuser:password@cluster.example/ashmaan",

        collection:
          "telemetry",
      },
    });

  check(
    databaseError.status ===
      SECURITY_ERROR_STATUS
        .UNAVAILABLE,
    "database failure is represented as UNAVAILABLE"
  );

  check(
    databaseError.statusCode ===
      503,
    "database failure returns HTTP 503"
  );

  check(
    databaseError.response
      .error.code ===
      SECURITY_PUBLIC_ERROR_CODE
        .SERVICE_UNAVAILABLE,
    "database public code is SERVICE_UNAVAILABLE"
  );

  check(
    databaseError.response
      .error.message ===
      "The service is temporarily unavailable.",
    "database failure uses generic public message"
  );

  check(
    JSON.stringify(
      databaseError.response
    ).includes(
      "mongodb"
    ) === false,
    "database response does not reveal MongoDB details"
  );

  check(
    JSON.stringify(
      databaseError.response
    ).includes(
      "telemetry"
    ) === false,
    "database response does not reveal collection details"
  );

  check(
    databaseError
      .internalContextExposed ===
      false,
    "database internal context is not exposed"
  );

  // ============================================================
  // P. DEPENDENCY ERROR
  // ============================================================

  section(
    "P. Dependency error response"
  );

  const dependencyError =
    createSecurityErrorResponse({
      category:
        SECURITY_ERROR_CATEGORY
          .DEPENDENCY,

      internalError:
        new Error(
          "VRM upstream API token rejected"
        ),

      internalContext: {
        provider:
          "VRM",

        accessToken:
          "vrm-secret",
      },
    });

  check(
    dependencyError.status ===
      SECURITY_ERROR_STATUS
        .UNAVAILABLE,
    "dependency failure is represented as UNAVAILABLE"
  );

  check(
    dependencyError.statusCode ===
      503,
    "dependency failure returns HTTP 503"
  );

  check(
    dependencyError.response
      .error.code ===
      SECURITY_PUBLIC_ERROR_CODE
        .SERVICE_UNAVAILABLE,
    "dependency public code is SERVICE_UNAVAILABLE"
  );

  check(
    JSON.stringify(
      dependencyError.response
    ).includes(
      "VRM"
    ) === false,
    "dependency identity is not leaked in public response"
  );

  check(
    JSON.stringify(
      dependencyError.response
    ).includes(
      "vrm-secret"
    ) === false,
    "dependency credential is not leaked"
  );

  // ============================================================
  // Q. SECURITY CONFIGURATION ERROR
  // ============================================================

  section(
    "Q. Security-configuration error"
  );

  const configurationError =
    createSecurityErrorResponse({
      category:
        SECURITY_ERROR_CATEGORY
          .SECURITY_CONFIGURATION,

      internalError:
        new Error(
          "JWT_SECRET is missing from C:\\Users\\owner\\ASHMAAN\\backend\\.env"
        ),
    });

  check(
    configurationError.statusCode ===
      500,
    "security-configuration error returns HTTP 500"
  );

  check(
    configurationError.response
      .error.code ===
      SECURITY_PUBLIC_ERROR_CODE
        .SECURITY_CONFIGURATION_ERROR,
    "security-configuration public code is explicit"
  );

  check(
    JSON.stringify(
      configurationError.response
    ).includes(
      "JWT_SECRET"
    ) === false,
    "security configuration does not reveal secret name"
  );

  check(
    JSON.stringify(
      configurationError.response
    ).includes(
      "C:\\Users"
    ) === false,
    "security configuration does not reveal internal file path"
  );

  // ============================================================
  // R. INTERNAL ERROR
  // ============================================================

  section(
    "R. Internal error response"
  );

  const internalError =
    createSecurityErrorResponse({
      category:
        SECURITY_ERROR_CATEGORY
          .INTERNAL,

      internalError:
        new Error(
          "Unexpected failure password=secret apiKey=abc123"
        ),
    });

  check(
    internalError.statusCode ===
      500,
    "internal error returns HTTP 500"
  );

  check(
    internalError.response
      .error.code ===
      SECURITY_PUBLIC_ERROR_CODE
        .INTERNAL_SERVER_ERROR,
    "internal public code is INTERNAL_SERVER_ERROR"
  );

  check(
    internalError.response
      .error.message ===
      "An internal server error occurred.",
    "internal exception message is replaced with generic message"
  );

  check(
    JSON.stringify(
      internalError.response
    ).includes(
      "password"
    ) === false,
    "internal response does not expose password material"
  );

  check(
    JSON.stringify(
      internalError.response
    ).includes(
      "abc123"
    ) === false,
    "internal response does not expose API key material"
  );

  // ============================================================
  // S. INVALID ERROR INPUT FAILS CLOSED
  // ============================================================

  section(
    "S. Invalid error input"
  );

  const invalidResult =
    createSecurityErrorResponse({
      category:
        "UNKNOWN_CATEGORY",

      correlationId:
        "",

      retryAfterSeconds:
        100000,
    });

  check(
    invalidResult.handled ===
      false,
    "invalid error contract is not treated as normally handled"
  );

  check(
    invalidResult.status ===
      SECURITY_ERROR_STATUS
        .INVALID,
    "invalid error contract reports INVALID"
  );

  check(
    invalidResult.statusCode ===
      500,
    "invalid error contract fails to HTTP 500"
  );

  check(
    invalidResult.response
      .error.code ===
      SECURITY_PUBLIC_ERROR_CODE
        .INTERNAL_SERVER_ERROR,
    "invalid error contract falls back to safe internal error"
  );

  check(
    invalidResult.response
      .error.correlationId ===
      null,
    "invalid correlation id is not returned"
  );

  check(
    invalidResult
      .validationErrors
      .includes(
        "INVALID_CATEGORY"
      ),
    "invalid category remains observable internally"
  );

  check(
    invalidResult
      .validationErrors
      .includes(
        "INVALID_CORRELATION_ID"
      ),
    "invalid correlation id remains observable internally"
  );

  check(
    invalidResult
      .validationErrors
      .includes(
        "INVALID_RETRY_AFTER"
      ),
    "invalid Retry-After remains observable internally"
  );

  // ============================================================
  // T. SAFE SERIALIZATION
  // ============================================================

  section(
    "T. Safe error serialization"
  );

  const serialized =
    serializeSecurityErrorResponse(
      authenticationError
    );

  check(
    serialized.valid ===
      true,
    "valid security error can be serialized"
  );

  check(
    serialized.body ===
      authenticationError.response,
    "serializer preserves only safe public response body"
  );

  check(
    serialized.rawErrorExposed ===
      false,
    "serializer exposes no raw error"
  );

  check(
    serialized.stackTraceExposed ===
      false,
    "serializer exposes no stack trace"
  );

  check(
    serialized.sensitiveDataExposed ===
      false,
    "serializer exposes no sensitive data"
  );

  const invalidSerialization =
    serializeSecurityErrorResponse(
      null
    );

  check(
    invalidSerialization.valid ===
      false,
    "invalid serialization input is rejected"
  );

  check(
    invalidSerialization.body
      .error.code ===
      SECURITY_PUBLIC_ERROR_CODE
        .INTERNAL_SERVER_ERROR,
    "invalid serialization fails to generic internal error"
  );

  check(
    invalidSerialization
      .rawErrorExposed ===
      false,
    "invalid serialization exposes no raw error"
  );

  // ============================================================
  // U. AUTHENTICATION / AUTHORIZATION SAFETY
  // ============================================================

  section(
    "U. Authentication and authorization safety"
  );

  check(
    authenticationError.authenticated ===
      false,
    "error handling never establishes authentication"
  );

  check(
    authenticationError.authorizationGranted ===
      false,
    "authentication error handling grants no authorization"
  );

  check(
    authorizationError.authorizationGranted ===
      false,
    "authorization error handling grants no authorization"
  );

  check(
    invalidResult.authenticated ===
      false,
    "invalid error handling never authenticates"
  );

  check(
    invalidResult.authorizationGranted ===
      false,
    "invalid error handling grants no authorization"
  );

  // ============================================================
  // V. DATABASE / EQUIPMENT SAFETY
  // ============================================================

  section(
    "V. Side-effect safety boundary"
  );

  check(
    databaseError.databaseMutationExecuted ===
      false,
    "database error handling performs no database mutation"
  );

  check(
    authenticationError
      .databaseMutationExecuted ===
      false,
    "authentication error handling performs no database mutation"
  );

  check(
    internalError
      .equipmentControlExecuted ===
      false,
    "internal error handling executes no equipment control"
  );

  check(
    internalError
      .autoDispatchExecuted ===
      false,
    "internal error handling executes no auto-dispatch"
  );

  check(
    invalidResult
      .equipmentControlExecuted ===
      false,
    "invalid error handling executes no equipment control"
  );

  check(
    invalidResult
      .autoDispatchExecuted ===
      false,
    "invalid error handling executes no auto-dispatch"
  );

  // ============================================================
  // W. RESULT CONTRACT
  // ============================================================

  section(
    "W. Result contract"
  );

  check(
    authenticationError.phase ===
      "13.13",
    "security-error result preserves phase"
  );

  check(
    authenticationError.layer ===
      "SECURITY_ERROR_HANDLING",
    "security-error result preserves layer"
  );

  check(
    authenticationError
      .validationErrors.length ===
      0,
    "valid security-error result has zero validation errors"
  );

  check(
    authenticationError
      .response.error
      .correlationId ===
      "auth-001",
    "result preserves explicit correlation id"
  );

  check(
    authenticationError
      .internalDiagnostic
      .rawMessageExposed ===
      false,
    "result diagnostic exposes no raw exception message"
  );

  // ============================================================
  // X. NO CORRELATION ID INFERENCE
  // ============================================================

  section(
    "X. Correlation-id behavior"
  );

  const noCorrelation =
    createSecurityErrorResponse({
      category:
        SECURITY_ERROR_CATEGORY
          .INTERNAL,
    });

  check(
    noCorrelation.response
      .error.correlationId ===
      null,
    "missing correlation id remains null"
  );

  // ============================================================
  // Y. FROZEN STRUCTURES
  // ============================================================

  section(
    "Y. Frozen structures"
  );

  check(
    Object.isFrozen(
      SECURITY_ERROR_CATEGORY
    ),
    "security-error category taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      SECURITY_PUBLIC_ERROR_CODE
    ),
    "public error-code taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      SECURITY_ERROR_STATUS
    ),
    "security-error status taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      SECURITY_PUBLIC_ERROR_POLICY
    ),
    "public error policy is frozen"
  );

  check(
    Object.isFrozen(
      SECURITY_PUBLIC_ERROR_POLICY
        .AUTHENTICATION
    ),
    "authentication public policy is frozen"
  );

  check(
    Object.isFrozen(
      SECURITY_ERROR_HANDLING_INVARIANTS
    ),
    "security-error invariants are frozen"
  );

  check(
    Object.isFrozen(
      authenticationError
    ),
    "security-error result is frozen"
  );

  check(
    Object.isFrozen(
      authenticationError.response
    ),
    "security-error response structure is frozen"
  );

  check(
    Object.isFrozen(
      authenticationError.response
        .error
    ),
    "security-error public body is frozen"
  );

  check(
    Object.isFrozen(
      authenticationError
        .validationErrors
    ),
    "validation-error array is frozen"
  );

  check(
    Object.isFrozen(
      authenticationError
        .internalDiagnostic
    ),
    "internal diagnostic is frozen"
  );

  check(
    Object.isFrozen(
      serialized
    ),
    "serialized error result is frozen"
  );

  check(
    Object.isFrozen(
      invalidSerialization.body
    ),
    "fallback serialization body is frozen"
  );

  // ============================================================
  // FINAL
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.13 SECURITY ERROR HANDLING RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Authentication failures : SAFE HTTP 401"
  );

  console.log(
    "Authorization failures  : SAFE HTTP 403"
  );

  console.log(
    "Validation failures     : SAFE HTTP 400"
  );

  console.log(
    "Rate-limit failures     : SAFE HTTP 429"
  );

  console.log(
    "Database failures       : SAFE HTTP 503"
  );

  console.log(
    "Dependency failures     : SAFE HTTP 503"
  );

  console.log(
    "Internal failures       : SAFE HTTP 500"
  );

  console.log(
    "Raw exception messages  : HIDDEN"
  );

  console.log(
    "Stack traces            : HIDDEN"
  );

  console.log(
    "Sensitive values        : HIDDEN"
  );

  console.log(
    "Database details        : HIDDEN"
  );

  console.log(
    "Internal file paths     : HIDDEN"
  );

  console.log(
    "Correlation ID          : EXPLICIT ONLY"
  );

  console.log(
    "Retry-After             : VALIDATED / BOUNDED"
  );

  console.log(
    "Failure behavior        : FAIL CLOSED"
  );

  console.log(
    "Authentication grant    : NONE"
  );

  console.log(
    "Authorization grant     : NONE"
  );

  console.log(
    "Database mutation       : NONE"
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
    "ASHMAAN PHASE 13.13 SECURITY ERROR HANDLING VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.13 SECURITY ERROR HANDLING VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}