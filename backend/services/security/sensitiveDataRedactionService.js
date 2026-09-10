// ASHMAAN Phase 13.10
// Sensitive-Data / Log Redaction Service

export const SENSITIVE_DATA_REDACTION_PHASE =
  "13.10";

export const SENSITIVE_DATA_REDACTION_LAYER =
  "SENSITIVE_DATA_REDACTION";

export const REDACTION_VALUE =
  "[REDACTED]";

// ============================================================
// SENSITIVE FIELD TAXONOMY
// ============================================================

export const SENSITIVE_FIELD_NAMES =
  Object.freeze([
    "password",
    "passwordHash",
    "password_hash",

    "token",
    "accessToken",
    "access_token",
    "refreshToken",
    "refresh_token",

    "authorization",
    "proxyAuthorization",

    "cookie",
    "setCookie",

    "secret",
    "clientSecret",
    "client_secret",
    "jwtSecret",
    "jwt_secret",
    "qrTokenSecret",
    "qr_token_secret",

    "apiKey",
    "api_key",

    "privateKey",
    "private_key",

    "mongodbUri",
    "mongodb_uri",
    "mongoUri",
    "mongo_uri",

    "connectionString",
    "connection_string",
  ]);

// ============================================================
// HEADER TAXONOMY
// ============================================================

export const SENSITIVE_HEADER_NAMES =
  Object.freeze([
    "authorization",
    "proxy-authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
  ]);

// ============================================================
// INVARIANTS
// ============================================================

export const SENSITIVE_DATA_REDACTION_INVARIANTS =
  Object.freeze({
    rawPasswordsMustNotBeLogged:
      true,

    passwordHashesMustNotBeLogged:
      true,

    accessTokensMustNotBeLogged:
      true,

    refreshTokensMustNotBeLogged:
      true,

    bearerTokensMustNotBeLogged:
      true,

    authorizationHeadersMustNotBeLogged:
      true,

    cookiesMustNotBeLogged:
      true,

    apiKeysMustNotBeLogged:
      true,

    privateKeysMustNotBeLogged:
      true,

    databaseCredentialsMustNotBeLogged:
      true,

    knownSecretFieldsMustBeRedacted:
      true,

    nestedSensitiveFieldsMustBeRedacted:
      true,

    arrayContentsMustBeTraversed:
      true,

    sourceInputMustNotBeMutated:
      true,

    redactionOutputMustBeIndependent:
      true,

    sensitiveHeaderNamesMustBeCaseInsensitive:
      true,

    redactionFailureMustNotExposeOriginalPayload:
      true,

    redactionMustNotGrantAuthorization:
      true,

    redactionMustNotExecuteEquipmentControl:
      true,

    optimizationDssRemainsNonExecutable:
      true,

    optimizationDssAutoDispatchRemainsDisabled:
      true,
  });

// ============================================================
// HELPERS
// ============================================================

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function normalizeSensitiveName(value) {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/[-_\s]/g, "")
    : "";
}

const NORMALIZED_SENSITIVE_FIELD_NAMES =
  new Set(
    SENSITIVE_FIELD_NAMES.map(
      normalizeSensitiveName
    )
  );

const NORMALIZED_SENSITIVE_HEADER_NAMES =
  new Set(
    SENSITIVE_HEADER_NAMES.map(
      normalizeSensitiveName
    )
  );

export function isSensitiveFieldName(
  fieldName
) {
  return (
    NORMALIZED_SENSITIVE_FIELD_NAMES
      .has(
        normalizeSensitiveName(
          fieldName
        )
      )
  );
}

export function isSensitiveHeaderName(
  headerName
) {
  return (
    NORMALIZED_SENSITIVE_HEADER_NAMES
      .has(
        normalizeSensitiveName(
          headerName
        )
      )
  );
}

function isBearerTokenString(value) {
  return (
    typeof value === "string" &&
    /^Bearer\s+\S+/i.test(
      value.trim()
    )
  );
}

function isPrivateKeyString(value) {
  return (
    typeof value === "string" &&
    /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/i.test(
      value
    )
  );
}

function isMongoCredentialUri(value) {
  if (typeof value !== "string") {
    return false;
  }

  return (
    /^mongodb(?:\+srv)?:\/\/[^/\s]*@/i.test(
      value.trim()
    )
  );
}

function redactPrimitiveIfSensitive(
  value
) {
  if (
    isBearerTokenString(value) ||
    isPrivateKeyString(value) ||
    isMongoCredentialUri(value)
  ) {
    return REDACTION_VALUE;
  }

  return value;
}

// ============================================================
// GENERIC STRUCTURED REDACTION
// ============================================================

export function redactSensitiveData(
  value
) {
  if (Array.isArray(value)) {
    return value.map(
      (item) =>
        redactSensitiveData(item)
    );
  }

  if (isPlainObject(value)) {
    const output = {};

    for (
      const [
        key,
        nestedValue,
      ] of Object.entries(value)
    ) {
      if (
        isSensitiveFieldName(
          key
        )
      ) {
        output[key] =
          REDACTION_VALUE;

        continue;
      }

      output[key] =
        redactSensitiveData(
          nestedValue
        );
    }

    return output;
  }

  return redactPrimitiveIfSensitive(
    value
  );
}

// ============================================================
// HTTP HEADER REDACTION
// ============================================================

export function redactSensitiveHeaders(
  headers
) {
  if (!isPlainObject(headers)) {
    return Object.freeze({
      valid: false,

      headers: null,

      error:
        "INVALID_HEADERS",
    });
  }

  const redacted = {};

  for (
    const [
      key,
      value,
    ] of Object.entries(headers)
  ) {
    if (
      isSensitiveHeaderName(
        key
      )
    ) {
      redacted[key] =
        REDACTION_VALUE;

      continue;
    }

    redacted[key] =
      redactSensitiveData(
        value
      );
  }

  return Object.freeze({
    valid: true,

    headers:
      deepFreeze(redacted),

    error: null,
  });
}

// ============================================================
// LOG RECORD BUILDER
// ============================================================

export function createSafeLogRecord({
  level,
  message,
  context = {},
  timestamp,
} = {}) {
  const errors = [];

  if (
    typeof level !== "string" ||
    level.trim().length === 0
  ) {
    errors.push(
      "INVALID_LEVEL"
    );
  }

  if (
    typeof message !== "string" ||
    message.trim().length === 0
  ) {
    errors.push(
      "INVALID_MESSAGE"
    );
  }

  if (!isPlainObject(context)) {
    errors.push(
      "INVALID_CONTEXT"
    );
  }

  let normalizedTimestamp = null;

  if (
    timestamp !== undefined &&
    timestamp !== null
  ) {
    const parsed =
      timestamp instanceof Date
        ? timestamp
        : new Date(timestamp);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      errors.push(
        "INVALID_TIMESTAMP"
      );
    } else {
      normalizedTimestamp =
        parsed.toISOString();
    }
  }

  if (errors.length > 0) {
    return Object.freeze({
      phase:
        SENSITIVE_DATA_REDACTION_PHASE,

      layer:
        SENSITIVE_DATA_REDACTION_LAYER,

      valid: false,

      record: null,

      errors:
        Object.freeze([
          ...errors,
        ]),

      originalPayloadExposed:
        false,

      authorizationGranted:
        false,

      equipmentControlExecuted:
        false,

      autoDispatchExecuted:
        false,

      invariants:
        SENSITIVE_DATA_REDACTION_INVARIANTS,
    });
  }

  const safeContext =
    redactSensitiveData(
      context
    );

  const record =
    deepFreeze({
      level:
        level
          .trim()
          .toUpperCase(),

      message:
        message.trim(),

      timestamp:
        normalizedTimestamp,

      context:
        safeContext,
    });

  return Object.freeze({
    phase:
      SENSITIVE_DATA_REDACTION_PHASE,

    layer:
      SENSITIVE_DATA_REDACTION_LAYER,

    valid: true,

    record,

    errors:
      Object.freeze([]),

    originalPayloadExposed:
      false,

    authorizationGranted:
      false,

    equipmentControlExecuted:
      false,

    autoDispatchExecuted:
      false,

    invariants:
      SENSITIVE_DATA_REDACTION_INVARIANTS,
  });
}

// ============================================================
// DEEP FREEZE
// ============================================================

export function deepFreeze(
  value
) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  for (
    const nestedValue of
      Object.values(value)
  ) {
    deepFreeze(
      nestedValue
    );
  }

  return Object.freeze(
    value
  );
}

export default redactSensitiveData;