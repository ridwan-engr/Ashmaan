import assert from "node:assert/strict";

import {
  SENSITIVE_DATA_REDACTION_PHASE,
  SENSITIVE_DATA_REDACTION_LAYER,
  REDACTION_VALUE,
  SENSITIVE_FIELD_NAMES,
  SENSITIVE_HEADER_NAMES,
  SENSITIVE_DATA_REDACTION_INVARIANTS,
  isSensitiveFieldName,
  isSensitiveHeaderName,
  redactSensitiveData,
  redactSensitiveHeaders,
  createSafeLogRecord,
  deepFreeze,
} from "../services/security/sensitiveDataRedactionService.js";

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
  "ASHMAAN PHASE 13.10 — SENSITIVE-DATA / LOG REDACTION VALIDATION"
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
    SENSITIVE_DATA_REDACTION_PHASE ===
      "13.10",
    "phase identity is 13.10"
  );

  check(
    SENSITIVE_DATA_REDACTION_LAYER ===
      "SENSITIVE_DATA_REDACTION",
    "layer identity is SENSITIVE_DATA_REDACTION"
  );

  check(
    REDACTION_VALUE ===
      "[REDACTED]",
    "redaction marker is explicit"
  );

  // ============================================================
  // B. FIELD REGISTRY
  // ============================================================

  section(
    "B. Sensitive-field registry"
  );

  for (
    const field of [
      "password",
      "passwordHash",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "cookie",
      "secret",
      "clientSecret",
      "jwtSecret",
      "qrTokenSecret",
      "apiKey",
      "privateKey",
      "mongodbUri",
      "connectionString",
    ]
  ) {
    check(
      SENSITIVE_FIELD_NAMES.includes(
        field
      ),
      `sensitive field registered: ${field}`
    );
  }

  // ============================================================
  // C. HEADER REGISTRY
  // ============================================================

  section(
    "C. Sensitive-header registry"
  );

  for (
    const header of [
      "authorization",
      "proxy-authorization",
      "cookie",
      "set-cookie",
      "x-api-key",
    ]
  ) {
    check(
      SENSITIVE_HEADER_NAMES.includes(
        header
      ),
      `sensitive header registered: ${header}`
    );
  }

  // ============================================================
  // D. FIELD-NAME DETECTION
  // ============================================================

  section(
    "D. Sensitive-field detection"
  );

  check(
    isSensitiveFieldName(
      "password"
    ) === true,
    "password is detected as sensitive"
  );

  check(
    isSensitiveFieldName(
      "PASSWORD"
    ) === true,
    "field detection is case-insensitive"
  );

  check(
    isSensitiveFieldName(
      "access_token"
    ) === true,
    "snake_case access token is detected"
  );

  check(
    isSensitiveFieldName(
      "access-token"
    ) === true,
    "hyphenated access token is detected"
  );

  check(
    isSensitiveFieldName(
      "safeField"
    ) === false,
    "ordinary field is not marked sensitive"
  );

  // ============================================================
  // E. HEADER DETECTION
  // ============================================================

  section(
    "E. Sensitive-header detection"
  );

  check(
    isSensitiveHeaderName(
      "Authorization"
    ) === true,
    "Authorization header is detected case-insensitively"
  );

  check(
    isSensitiveHeaderName(
      "X-API-Key"
    ) === true,
    "X-API-Key header is detected case-insensitively"
  );

  check(
    isSensitiveHeaderName(
      "Content-Type"
    ) === false,
    "ordinary HTTP header is not marked sensitive"
  );

  // ============================================================
  // F. INVARIANTS
  // ============================================================

  section(
    "F. Core redaction invariants"
  );

  const invariantNames = [
    "rawPasswordsMustNotBeLogged",
    "passwordHashesMustNotBeLogged",
    "accessTokensMustNotBeLogged",
    "refreshTokensMustNotBeLogged",
    "bearerTokensMustNotBeLogged",
    "authorizationHeadersMustNotBeLogged",
    "cookiesMustNotBeLogged",
    "apiKeysMustNotBeLogged",
    "privateKeysMustNotBeLogged",
    "databaseCredentialsMustNotBeLogged",
    "knownSecretFieldsMustBeRedacted",
    "nestedSensitiveFieldsMustBeRedacted",
    "arrayContentsMustBeTraversed",
    "sourceInputMustNotBeMutated",
    "redactionOutputMustBeIndependent",
    "sensitiveHeaderNamesMustBeCaseInsensitive",
    "redactionFailureMustNotExposeOriginalPayload",
    "redactionMustNotGrantAuthorization",
    "redactionMustNotExecuteEquipmentControl",
    "optimizationDssRemainsNonExecutable",
    "optimizationDssAutoDispatchRemainsDisabled",
  ];

  for (
    const name of
      invariantNames
  ) {
    check(
      SENSITIVE_DATA_REDACTION_INVARIANTS[
        name
      ] === true,
      `redaction invariant enforced: ${name}`
    );
  }

  // ============================================================
  // G. TOP-LEVEL FIELD REDACTION
  // ============================================================

  section(
    "G. Top-level sensitive-field redaction"
  );

  const topLevel =
    redactSensitiveData({
      username:
        "operator",

      password:
        "plain-password",

      passwordHash:
        "$2b$hash",

      accessToken:
        "token-value",

      refreshToken:
        "refresh-value",

      secret:
        "secret-value",

      apiKey:
        "key-value",

      privateKey:
        "private-key-value",
    });

  check(
    topLevel.username ===
      "operator",
    "non-sensitive value is preserved"
  );

  check(
    topLevel.password ===
      REDACTION_VALUE,
    "password is redacted"
  );

  check(
    topLevel.passwordHash ===
      REDACTION_VALUE,
    "password hash is redacted"
  );

  check(
    topLevel.accessToken ===
      REDACTION_VALUE,
    "access token is redacted"
  );

  check(
    topLevel.refreshToken ===
      REDACTION_VALUE,
    "refresh token is redacted"
  );

  check(
    topLevel.secret ===
      REDACTION_VALUE,
    "secret is redacted"
  );

  check(
    topLevel.apiKey ===
      REDACTION_VALUE,
    "API key is redacted"
  );

  check(
    topLevel.privateKey ===
      REDACTION_VALUE,
    "private key field is redacted"
  );

  // ============================================================
  // H. NESTED REDACTION
  // ============================================================

  section(
    "H. Nested sensitive-field redaction"
  );

  const nested =
    redactSensitiveData({
      user: {
        id: "user-123",

        credentials: {
          password:
            "hidden",

          token:
            "hidden-token",
        },
      },

      system: {
        state:
          "READY",
      },
    });

  check(
    nested.user.id ===
      "user-123",
    "nested non-sensitive value is preserved"
  );

  check(
    nested.user.credentials
      .password ===
      REDACTION_VALUE,
    "nested password is redacted"
  );

  check(
    nested.user.credentials
      .token ===
      REDACTION_VALUE,
    "nested token is redacted"
  );

  check(
    nested.system.state ===
      "READY",
    "unrelated nested state is preserved"
  );

  // ============================================================
  // I. ARRAY REDACTION
  // ============================================================

  section(
    "I. Array traversal"
  );

  const arrayResult =
    redactSensitiveData([
      {
        id: 1,
        password:
          "secret-1",
      },
      {
        id: 2,
        accessToken:
          "secret-2",
      },
    ]);

  check(
    arrayResult[0]
      .password ===
      REDACTION_VALUE,
    "sensitive field inside first array entry is redacted"
  );

  check(
    arrayResult[1]
      .accessToken ===
      REDACTION_VALUE,
    "sensitive field inside second array entry is redacted"
  );

  check(
    arrayResult[0].id === 1,
    "non-sensitive array data is preserved"
  );

  // ============================================================
  // J. BEARER TOKEN REDACTION
  // ============================================================

  section(
    "J. Bearer-token value redaction"
  );

  check(
    redactSensitiveData(
      "Bearer abc.def.ghi"
    ) === REDACTION_VALUE,
    "standalone Bearer token string is redacted"
  );

  check(
    redactSensitiveData(
      "ordinary-text"
    ) === "ordinary-text",
    "ordinary standalone string is preserved"
  );

  // ============================================================
  // K. PRIVATE KEY VALUE REDACTION
  // ============================================================

  section(
    "K. Private-key value redaction"
  );

  const privateKeyText =
    [
      "-----BEGIN PRIVATE KEY-----",
      "abc123",
      "-----END PRIVATE KEY-----",
    ].join("\n");

  check(
    redactSensitiveData(
      privateKeyText
    ) === REDACTION_VALUE,
    "standalone private-key material is redacted"
  );

  // ============================================================
  // L. DATABASE URI REDACTION
  // ============================================================

  section(
    "L. Database-credential redaction"
  );

  check(
    redactSensitiveData(
      "mongodb+srv://user:password@cluster.example/db"
    ) === REDACTION_VALUE,
    "MongoDB URI containing credentials is redacted"
  );

  check(
    redactSensitiveData(
      "mongodb://user:password@localhost:27017/db"
    ) === REDACTION_VALUE,
    "MongoDB local URI containing credentials is redacted"
  );

  // ============================================================
  // M. HTTP HEADER REDACTION
  // ============================================================

  section(
    "M. HTTP header redaction"
  );

  const headerResult =
    redactSensitiveHeaders({
      Authorization:
        "Bearer secret-token",

      Cookie:
        "session=secret",

      "X-API-Key":
        "api-secret",

      "Content-Type":
        "application/json",
    });

  check(
    headerResult.valid ===
      true,
    "valid HTTP header map is accepted"
  );

  check(
    headerResult.headers
      .Authorization ===
      REDACTION_VALUE,
    "Authorization header is redacted"
  );

  check(
    headerResult.headers
      .Cookie ===
      REDACTION_VALUE,
    "Cookie header is redacted"
  );

  check(
    headerResult.headers[
      "X-API-Key"
    ] ===
      REDACTION_VALUE,
    "API key header is redacted"
  );

  check(
    headerResult.headers[
      "Content-Type"
    ] ===
      "application/json",
    "ordinary HTTP header is preserved"
  );

  // ============================================================
  // N. INVALID HEADER STRUCTURE
  // ============================================================

  section(
    "N. Invalid header structure"
  );

  const invalidHeaders =
    redactSensitiveHeaders(
      []
    );

  check(
    invalidHeaders.valid ===
      false,
    "array is rejected as HTTP header map"
  );

  check(
    invalidHeaders.headers ===
      null,
    "invalid HTTP header structure produces no partial header output"
  );

  check(
    invalidHeaders.error ===
      "INVALID_HEADERS",
    "invalid HTTP header structure is explicit"
  );

  // ============================================================
  // O. INPUT IMMUTABILITY
  // ============================================================

  section(
    "O. Source-input immutability"
  );

  const source = {
    username:
      "operator",

    credentials: {
      password:
        "source-password",

      token:
        "source-token",
    },
  };

  const sourceSnapshot =
    JSON.stringify(source);

  const safeCopy =
    redactSensitiveData(
      source
    );

  check(
    JSON.stringify(source) ===
      sourceSnapshot,
    "source object is not mutated during redaction"
  );

  check(
    source.credentials.password ===
      "source-password",
    "source password remains untouched"
  );

  check(
    safeCopy !== source,
    "redaction output is independent from source object"
  );

  check(
    safeCopy.credentials !==
      source.credentials,
    "nested redaction output is independently allocated"
  );

  // ============================================================
  // P. SAFE LOG RECORD
  // ============================================================

  section(
    "P. Safe log-record creation"
  );

  const safeLog =
    createSafeLogRecord({
      level: "info",

      message:
        "Authentication attempt",

      timestamp:
        "2026-09-10T15:30:00.000Z",

      context: {
        userId:
          "user-123",

        password:
          "secret",

        headers: {
          authorization:
            "Bearer xyz",
        },

        database: {
          mongodbUri:
            "mongodb+srv://user:pass@cluster/db",
        },
      },
    });

  check(
    safeLog.valid === true,
    "valid safe log record is created"
  );

  check(
    safeLog.record.level ===
      "INFO",
    "log level is normalized"
  );

  check(
    safeLog.record.message ===
      "Authentication attempt",
    "log message is preserved"
  );

  check(
    safeLog.record.timestamp ===
      "2026-09-10T15:30:00.000Z",
    "log timestamp is normalized to ISO"
  );

  check(
    safeLog.record.context
      .userId ===
      "user-123",
    "safe log context preserves non-sensitive identity"
  );

  check(
    safeLog.record.context
      .password ===
      REDACTION_VALUE,
    "safe log record redacts password"
  );

  check(
    safeLog.record.context
      .headers.authorization ===
      REDACTION_VALUE,
    "safe log record redacts nested authorization field"
  );

  check(
    safeLog.record.context
      .database.mongodbUri ===
      REDACTION_VALUE,
    "safe log record redacts database URI field"
  );

  // ============================================================
  // Q. INVALID LOG INPUT
  // ============================================================

  section(
    "Q. Invalid log-record behavior"
  );

  const invalidLog =
    createSafeLogRecord({
      level: "",

      message: "",

      context: [],

      timestamp:
        "not-a-date",
    });

  check(
    invalidLog.valid ===
      false,
    "invalid log record is rejected"
  );

  check(
    invalidLog.record ===
      null,
    "invalid log input emits no partial log record"
  );

  check(
    invalidLog.errors.includes(
      "INVALID_LEVEL"
    ),
    "invalid log level is explicit"
  );

  check(
    invalidLog.errors.includes(
      "INVALID_MESSAGE"
    ),
    "invalid log message is explicit"
  );

  check(
    invalidLog.errors.includes(
      "INVALID_CONTEXT"
    ),
    "invalid log context is explicit"
  );

  check(
    invalidLog.errors.includes(
      "INVALID_TIMESTAMP"
    ),
    "invalid log timestamp is explicit"
  );

  check(
    invalidLog.originalPayloadExposed ===
      false,
    "invalid log processing does not expose original payload"
  );

  // ============================================================
  // R. AUTHORIZATION SAFETY
  // ============================================================

  section(
    "R. Authorization safety"
  );

  check(
    safeLog.authorizationGranted ===
      false,
    "redaction service grants no authorization"
  );

  check(
    invalidLog.authorizationGranted ===
      false,
    "redaction failure grants no authorization"
  );

  // ============================================================
  // S. EQUIPMENT-CONTROL BOUNDARY
  // ============================================================

  section(
    "S. Safety boundary"
  );

  check(
    safeLog
      .equipmentControlExecuted ===
      false,
    "redaction service executes no equipment control"
  );

  check(
    safeLog
      .autoDispatchExecuted ===
      false,
    "redaction service executes no auto-dispatch"
  );

  check(
    invalidLog
      .equipmentControlExecuted ===
      false,
    "redaction failure executes no equipment control"
  );

  check(
    invalidLog
      .autoDispatchExecuted ===
      false,
    "redaction failure executes no auto-dispatch"
  );

  // ============================================================
  // T. RESULT CONTRACT
  // ============================================================

  section(
    "T. Result contract"
  );

  check(
    safeLog.phase ===
      "13.10",
    "redaction result preserves phase"
  );

  check(
    safeLog.layer ===
      "SENSITIVE_DATA_REDACTION",
    "redaction result preserves layer"
  );

  check(
    safeLog.errors.length ===
      0,
    "successful redaction result has zero errors"
  );

  check(
    safeLog.originalPayloadExposed ===
      false,
    "successful redaction does not expose original payload"
  );

  // ============================================================
  // U. DEEP FREEZE
  // ============================================================

  section(
    "U. Deep-freeze behavior"
  );

  const frozenSample =
    deepFreeze({
      a: {
        b: [
          {
            c: 1,
          },
        ],
      },
    });

  check(
    Object.isFrozen(
      frozenSample
    ),
    "deepFreeze freezes root object"
  );

  check(
    Object.isFrozen(
      frozenSample.a
    ),
    "deepFreeze freezes nested object"
  );

  check(
    Object.isFrozen(
      frozenSample.a.b
    ),
    "deepFreeze freezes nested array"
  );

  check(
    Object.isFrozen(
      frozenSample.a.b[0]
    ),
    "deepFreeze freezes object inside nested array"
  );

  // ============================================================
  // V. FROZEN CONTRACT STRUCTURES
  // ============================================================

  section(
    "V. Frozen structures"
  );

  check(
    Object.isFrozen(
      SENSITIVE_FIELD_NAMES
    ),
    "sensitive-field registry is frozen"
  );

  check(
    Object.isFrozen(
      SENSITIVE_HEADER_NAMES
    ),
    "sensitive-header registry is frozen"
  );

  check(
    Object.isFrozen(
      SENSITIVE_DATA_REDACTION_INVARIANTS
    ),
    "redaction invariants are frozen"
  );

  check(
    Object.isFrozen(
      safeLog
    ),
    "safe log result is frozen"
  );

  check(
    Object.isFrozen(
      safeLog.record
    ),
    "safe log record is frozen"
  );

  check(
    Object.isFrozen(
      safeLog.record.context
    ),
    "safe log context is frozen"
  );

  check(
    Object.isFrozen(
      safeLog.record.context.headers
    ),
    "nested safe log context is frozen"
  );

  check(
    Object.isFrozen(
      headerResult.headers
    ),
    "redacted HTTP header map is frozen"
  );

  // ============================================================
  // FINAL
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.10 SENSITIVE-DATA / LOG REDACTION RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Passwords              : REDACTED"
  );

  console.log(
    "Password hashes        : REDACTED"
  );

  console.log(
    "Access tokens          : REDACTED"
  );

  console.log(
    "Refresh tokens         : REDACTED"
  );

  console.log(
    "Bearer tokens          : REDACTED"
  );

  console.log(
    "Authorization headers  : REDACTED"
  );

  console.log(
    "Cookies                : REDACTED"
  );

  console.log(
    "API keys               : REDACTED"
  );

  console.log(
    "Private keys           : REDACTED"
  );

  console.log(
    "Database credentials   : REDACTED"
  );

  console.log(
    "Nested structures      : TRAVERSED"
  );

  console.log(
    "Source mutation        : NONE"
  );

  console.log(
    "Invalid log records    : REJECTED"
  );

  console.log(
    "Original payload leak  : FORBIDDEN"
  );

  console.log(
    "Authorization grant    : NONE"
  );

  console.log(
    "Equipment control      : NONE"
  );

  console.log(
    "Auto-dispatch          : DISABLED"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    `\nAssertions passed: ${passed}`
  );

  console.log(
    "ASHMAAN PHASE 13.10 SENSITIVE-DATA / LOG REDACTION VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.10 SENSITIVE-DATA / LOG REDACTION VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}