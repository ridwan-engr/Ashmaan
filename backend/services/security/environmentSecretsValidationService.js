// ASHMAAN Phase 13.2
// Environment / Secrets Validation Service

export const ENVIRONMENT_SECRETS_VALIDATION_PHASE = "13.2";
export const ENVIRONMENT_SECRETS_VALIDATION_LAYER =
  "ENVIRONMENT_AND_SECRETS";

export const SECRET_STATUS = Object.freeze({
  PRESENT: "PRESENT",
  MISSING: "MISSING",
  EMPTY: "EMPTY",
  INVALID: "INVALID",
  OPTIONAL_MISSING: "OPTIONAL_MISSING",
});

export const DEFAULT_REQUIRED_SECRET_NAMES = Object.freeze([
  "MONGODB_URI",
  "JWT_SECRET",
]);

export const DEFAULT_OPTIONAL_SECRET_NAMES = Object.freeze([
  "VRM_TOKEN",
  "QR_TOKEN_SECRET",
  "COOKIE_SECRET",
]);

export const SECRET_REDACTION_VALUE = "[REDACTED]";

function normalizeSecretName(name) {
  return typeof name === "string" ? name.trim() : "";
}

function classifySecretValue(value) {
  if (value === undefined || value === null) {
    return SECRET_STATUS.MISSING;
  }

  if (typeof value !== "string") {
    return SECRET_STATUS.INVALID;
  }

  if (value.trim().length === 0) {
    return SECRET_STATUS.EMPTY;
  }

  return SECRET_STATUS.PRESENT;
}

function buildSecretResult({
  name,
  value,
  required,
}) {
  const status =
    classifySecretValue(value);

  return Object.freeze({
    name,
    required,
    status:
      !required &&
      status === SECRET_STATUS.MISSING
        ? SECRET_STATUS.OPTIONAL_MISSING
        : status,

    present:
      status === SECRET_STATUS.PRESENT,

    redactedValue:
      status === SECRET_STATUS.PRESENT
        ? SECRET_REDACTION_VALUE
        : null,
  });
}

export function validateEnvironmentSecrets({
  environment = process.env,
  requiredSecretNames =
    DEFAULT_REQUIRED_SECRET_NAMES,
  optionalSecretNames =
    DEFAULT_OPTIONAL_SECRET_NAMES,
} = {}) {
  if (
    !environment ||
    typeof environment !== "object"
  ) {
    throw new TypeError(
      "environment must be an object"
    );
  }

  const normalizedRequired =
    requiredSecretNames.map(
      normalizeSecretName
    );

  const normalizedOptional =
    optionalSecretNames.map(
      normalizeSecretName
    );

  if (
    normalizedRequired.some(
      (name) => !name
    ) ||
    normalizedOptional.some(
      (name) => !name
    )
  ) {
    throw new TypeError(
      "secret names must be non-empty strings"
    );
  }

  const requiredResults =
    normalizedRequired.map(
      (name) =>
        buildSecretResult({
          name,
          value: environment[name],
          required: true,
        })
    );

  const optionalResults =
    normalizedOptional.map(
      (name) =>
        buildSecretResult({
          name,
          value: environment[name],
          required: false,
        })
    );

  const allResults = Object.freeze([
    ...requiredResults,
    ...optionalResults,
  ]);

  const missingRequired =
    requiredResults.filter(
      (result) =>
        result.status !==
        SECRET_STATUS.PRESENT
    );

  const valid =
    missingRequired.length === 0;

  return Object.freeze({
    phase:
      ENVIRONMENT_SECRETS_VALIDATION_PHASE,

    layer:
      ENVIRONMENT_SECRETS_VALIDATION_LAYER,

    valid,

    failFastRequired:
      !valid,

    secrets:
      allResults,

    required:
      Object.freeze(requiredResults),

    optional:
      Object.freeze(optionalResults),

    missingRequired:
      Object.freeze(missingRequired),

    invariants: Object.freeze({
      rawSecretValuesExposed: false,
      rawSecretValuesLogged: false,
      environmentModified: false,
      secretsRotated: false,
      missingRequiredSecretAccepted:
        false,
    }),
  });
}

export function redactSensitiveValue(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  return SECRET_REDACTION_VALUE;
}

export default validateEnvironmentSecrets;