import assert from "node:assert/strict";

import {
  ENVIRONMENT_SECRETS_VALIDATION_PHASE,
  ENVIRONMENT_SECRETS_VALIDATION_LAYER,
  SECRET_STATUS,
  DEFAULT_REQUIRED_SECRET_NAMES,
  DEFAULT_OPTIONAL_SECRET_NAMES,
  SECRET_REDACTION_VALUE,
  validateEnvironmentSecrets,
  redactSensitiveValue,
} from "../services/security/environmentSecretsValidationService.js";

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
  "ASHMAAN PHASE 13.2 — ENVIRONMENT / SECRETS VALIDATION"
);
console.log(
  "========================================================================"
);

try {
  section("A. Contract identity");

  check(
    ENVIRONMENT_SECRETS_VALIDATION_PHASE ===
      "13.2",
    "phase identity is 13.2"
  );

  check(
    ENVIRONMENT_SECRETS_VALIDATION_LAYER ===
      "ENVIRONMENT_AND_SECRETS",
    "layer identity is ENVIRONMENT_AND_SECRETS"
  );

  section("B. Secret taxonomy");

  check(
    SECRET_STATUS.PRESENT === "PRESENT",
    "PRESENT secret status exists"
  );

  check(
    SECRET_STATUS.MISSING === "MISSING",
    "MISSING secret status exists"
  );

  check(
    SECRET_STATUS.EMPTY === "EMPTY",
    "EMPTY secret status exists"
  );

  check(
    SECRET_STATUS.INVALID === "INVALID",
    "INVALID secret status exists"
  );

  check(
    SECRET_STATUS.OPTIONAL_MISSING ===
      "OPTIONAL_MISSING",
    "OPTIONAL_MISSING secret status exists"
  );

  check(
    DEFAULT_REQUIRED_SECRET_NAMES.includes(
      "MONGODB_URI"
    ),
    "MONGODB_URI is required"
  );

  check(
    DEFAULT_REQUIRED_SECRET_NAMES.includes(
      "JWT_SECRET"
    ),
    "JWT_SECRET is required"
  );

  check(
    DEFAULT_OPTIONAL_SECRET_NAMES.includes(
      "VRM_TOKEN"
    ),
    "VRM_TOKEN is classified"
  );

  check(
    SECRET_REDACTION_VALUE ===
      "[REDACTED]",
    "redaction token is explicit"
  );

  section("C. Qualified environment");

  const qualified =
    validateEnvironmentSecrets({
      environment: {
        MONGODB_URI:
          "mongodb+srv://example",
        JWT_SECRET:
          "super-secret-value",
        VRM_TOKEN:
          "vrm-secret",
      },
    });

  check(
    qualified.valid === true,
    "qualified environment is valid"
  );

  check(
    qualified.failFastRequired ===
      false,
    "qualified environment does not require fail-fast"
  );

  check(
    qualified.missingRequired.length ===
      0,
    "qualified environment has no missing required secrets"
  );

  check(
    qualified.required.every(
      (item) =>
        item.status ===
        SECRET_STATUS.PRESENT
    ),
    "all required secrets are PRESENT"
  );

  check(
    qualified.secrets.every(
      (item) =>
        !Object.prototype.hasOwnProperty.call(
          item,
          "value"
        )
    ),
    "raw secret values are not returned"
  );

  check(
    qualified.secrets
      .filter(
        (item) => item.present
      )
      .every(
        (item) =>
          item.redactedValue ===
          "[REDACTED]"
      ),
    "present secrets expose redaction only"
  );

  section("D. Missing required secret");

  const missing =
    validateEnvironmentSecrets({
      environment: {
        JWT_SECRET:
          "present-secret",
      },
    });

  check(
    missing.valid === false,
    "missing required secret makes validation invalid"
  );

  check(
    missing.failFastRequired ===
      true,
    "missing required secret requires fail-fast"
  );

  check(
    missing.missingRequired.some(
      (item) =>
        item.name ===
          "MONGODB_URI" &&
        item.status ===
          SECRET_STATUS.MISSING
    ),
    "missing MONGODB_URI is detected"
  );

  section("E. Empty required secret");

  const empty =
    validateEnvironmentSecrets({
      environment: {
        MONGODB_URI:
          "mongodb://example",
        JWT_SECRET:
          "   ",
      },
    });

  check(
    empty.valid === false,
    "empty required secret makes validation invalid"
  );

  check(
    empty.missingRequired.some(
      (item) =>
        item.name ===
          "JWT_SECRET" &&
        item.status ===
          SECRET_STATUS.EMPTY
    ),
    "empty JWT_SECRET is detected"
  );

  section("F. Optional secret behavior");

  const optional =
    validateEnvironmentSecrets({
      environment: {
        MONGODB_URI:
          "mongodb://example",
        JWT_SECRET:
          "secret",
      },
    });

  check(
    optional.valid === true,
    "missing optional secrets do not invalidate environment"
  );

  check(
    optional.optional.every(
      (item) =>
        item.status ===
          SECRET_STATUS.OPTIONAL_MISSING ||
        item.status ===
          SECRET_STATUS.PRESENT
    ),
    "optional missing secrets are explicit"
  );

  section("G. Redaction");

  check(
    redactSensitiveValue(
      "my-secret"
    ) === "[REDACTED]",
    "sensitive string is redacted"
  );

  check(
    redactSensitiveValue(
      "mongodb+srv://user:password@host"
    ) === "[REDACTED]",
    "database URI is redacted"
  );

  check(
    redactSensitiveValue(null) ===
      null,
    "null remains null during redaction"
  );

  check(
    redactSensitiveValue(undefined) ===
      undefined,
    "undefined remains undefined during redaction"
  );

  section("H. Security invariants");

  check(
    qualified.invariants
      .rawSecretValuesExposed ===
      false,
    "raw secrets are not exposed"
  );

  check(
    qualified.invariants
      .rawSecretValuesLogged ===
      false,
    "raw secrets are not logged"
  );

  check(
    qualified.invariants
      .environmentModified ===
      false,
    "validation does not modify environment"
  );

  check(
    qualified.invariants
      .secretsRotated === false,
    "validation does not rotate secrets"
  );

  check(
    qualified.invariants
      .missingRequiredSecretAccepted ===
      false,
    "missing required secrets are never accepted"
  );

  section("I. Input rejection");

  let invalidEnvironmentRejected =
    false;

  try {
    validateEnvironmentSecrets({
      environment: null,
    });
  } catch {
    invalidEnvironmentRejected =
      true;
  }

  check(
    invalidEnvironmentRejected,
    "invalid environment input is rejected"
  );

  let invalidNameRejected = false;

  try {
    validateEnvironmentSecrets({
      environment: {},
      requiredSecretNames: [""],
    });
  } catch {
    invalidNameRejected = true;
  }

  check(
    invalidNameRejected,
    "empty secret name is rejected"
  );

  console.log(
    "\n------------------------------------------------------------------------"
  );
  console.log(
    "PHASE 13.2 ENVIRONMENT / SECRETS RESULT"
  );
  console.log(
    "------------------------------------------------------------------------"
  );
  console.log(
    "Required secret presence : VALIDATED"
  );
  console.log(
    "Missing required secret  : FAIL-FAST"
  );
  console.log(
    "Raw secret disclosure    : FORBIDDEN"
  );
  console.log(
    "Secret logging           : FORBIDDEN"
  );
  console.log(
    "Environment mutation     : NONE"
  );
  console.log(
    "Secret rotation          : NONE"
  );
  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    `\nAssertions passed: ${passed}`
  );

  console.log(
    "ASHMAAN PHASE 13.2 ENVIRONMENT / SECRETS VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );
  console.error(
    "ASHMAAN PHASE 13.2 ENVIRONMENT / SECRETS VALIDATION FAILED"
  );
  console.error(
    "========================================================================"
  );
  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}