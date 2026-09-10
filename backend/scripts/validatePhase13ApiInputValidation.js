import assert from "node:assert/strict";

import {
  API_INPUT_VALIDATION_PHASE,
  API_INPUT_VALIDATION_LAYER,
  API_INPUT_VALIDATION_STATUS,
  API_INPUT_VALIDATION_ERROR,
  API_INPUT_VALIDATION_INVARIANTS,
  validateString,
  validateNumber,
  validateBoolean,
  validateEnum,
  validateObject,
  validateStrictObjectShape,
  validatePagination,
} from "../services/security/apiInputValidationService.js";

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
  "ASHMAAN PHASE 13.5 — API INPUT VALIDATION"
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
    API_INPUT_VALIDATION_PHASE ===
      "13.5",
    "phase identity is 13.5"
  );

  check(
    API_INPUT_VALIDATION_LAYER ===
      "INPUT_VALIDATION",
    "layer identity is INPUT_VALIDATION"
  );

  // ============================================================
  // B. STATUS / ERROR TAXONOMY
  // ============================================================

  section(
    "B. Validation taxonomy"
  );

  check(
    API_INPUT_VALIDATION_STATUS.VALID ===
      "VALID",
    "VALID status exists"
  );

  check(
    API_INPUT_VALIDATION_STATUS.INVALID ===
      "INVALID",
    "INVALID status exists"
  );

  const requiredErrors = [
    "REQUIRED",
    "TYPE_MISMATCH",
    "OUT_OF_RANGE",
    "INVALID_ENUM",
    "INVALID_FORMAT",
    "UNKNOWN_FIELD",
    "INVALID_STRUCTURE",
  ];

  for (
    const errorCode of requiredErrors
  ) {
    check(
      Object.values(
        API_INPUT_VALIDATION_ERROR
      ).includes(errorCode),
      `validation error exists: ${errorCode}`
    );
  }

  // ============================================================
  // C. INVARIANTS
  // ============================================================

  section(
    "C. Input-validation invariants"
  );

  const requiredInvariants = [
    "clientInputIsUntrusted",
    "explicitValidationRequired",
    "silentTypeCoercionForbidden",
    "malformedInputMustBeRejected",
    "unknownFieldsMayBeRejected",
    "missingRequiredFieldMustBeRejected",
    "invalidEnumMustBeRejected",
    "outOfRangeValueMustBeRejected",
    "invalidStructureMustBeRejected",
    "rawInputMustNotBeMutated",
    "missingValueMustNotBecomeZero",
    "missingValueMustNotBeInferred",
  ];

  for (
    const name of
      requiredInvariants
  ) {
    check(
      API_INPUT_VALIDATION_INVARIANTS[
        name
      ] === true,
      `input-validation invariant enforced: ${name}`
    );
  }

  // ============================================================
  // D. STRING VALIDATION
  // ============================================================

  section(
    "D. String validation"
  );

  const validString =
    validateString({
      field: "siteId",
      value: "39996",
      required: true,
      minLength: 1,
      maxLength: 20,
    });

  check(
    validString.valid === true,
    "valid string is accepted"
  );

  check(
    validString.value ===
      "39996",
    "valid string is preserved exactly"
  );

  const missingString =
    validateString({
      field: "siteId",
      required: true,
    });

  check(
    missingString.valid === false,
    "missing required string is rejected"
  );

  check(
    missingString.errors[0].code ===
      API_INPUT_VALIDATION_ERROR.REQUIRED,
    "missing required string reports REQUIRED"
  );

  const numericStringInput =
    validateString({
      field: "siteId",
      value: 39996,
      required: true,
    });

  check(
    numericStringInput.valid ===
      false,
    "numeric input is not silently coerced to string"
  );

  check(
    numericStringInput.errors[0]
      .code ===
      API_INPUT_VALIDATION_ERROR.TYPE_MISMATCH,
    "string type mismatch is explicit"
  );

  const invalidPattern =
    validateString({
      field: "key",
      value: "abc$",
      required: true,
      pattern: /^[a-z0-9-]+$/i,
    });

  check(
    invalidPattern.valid ===
      false,
    "invalid string format is rejected"
  );

  check(
    invalidPattern.errors[0]
      .code ===
      API_INPUT_VALIDATION_ERROR.INVALID_FORMAT,
    "invalid string format is explicit"
  );

  // ============================================================
  // E. NUMBER VALIDATION
  // ============================================================

  section(
    "E. Number validation"
  );

  const validNumber =
    validateNumber({
      field: "page",
      value: 1,
      required: true,
      min: 1,
      integer: true,
    });

  check(
    validNumber.valid === true,
    "valid number is accepted"
  );

  check(
    validNumber.value === 1,
    "valid number is preserved"
  );

  const stringNumber =
    validateNumber({
      field: "page",
      value: "1",
      required: true,
      integer: true,
    });

  check(
    stringNumber.valid === false,
    "numeric string is not silently coerced to number"
  );

  check(
    stringNumber.errors[0]
      .code ===
      API_INPUT_VALIDATION_ERROR.TYPE_MISMATCH,
    "numeric-string rejection is explicit"
  );

  const outOfRange =
    validateNumber({
      field: "limit",
      value: 101,
      required: true,
      min: 1,
      max: 100,
      integer: true,
    });

  check(
    outOfRange.valid === false,
    "out-of-range number is rejected"
  );

  check(
    outOfRange.errors[0]
      .code ===
      API_INPUT_VALIDATION_ERROR.OUT_OF_RANGE,
    "out-of-range rejection is explicit"
  );

  const nonInteger =
    validateNumber({
      field: "page",
      value: 1.5,
      required: true,
      integer: true,
    });

  check(
    nonInteger.valid === false,
    "non-integer value is rejected where integer required"
  );

  // ============================================================
  // F. BOOLEAN VALIDATION
  // ============================================================

  section(
    "F. Boolean validation"
  );

  const validBoolean =
    validateBoolean({
      field: "active",
      value: false,
      required: true,
    });

  check(
    validBoolean.valid === true,
    "explicit boolean false is valid"
  );

  check(
    validBoolean.value === false,
    "explicit false is preserved and not treated as missing"
  );

  const stringBoolean =
    validateBoolean({
      field: "active",
      value: "false",
      required: true,
    });

  check(
    stringBoolean.valid === false,
    "boolean string is not silently coerced"
  );

  // ============================================================
  // G. ENUM VALIDATION
  // ============================================================

  section(
    "G. Enum validation"
  );

  const validEnum =
    validateEnum({
      field: "status",
      value: "READY",
      required: true,
      allowedValues: [
        "READY",
        "UNAVAILABLE",
      ],
    });

  check(
    validEnum.valid === true,
    "allowed enum value is accepted"
  );

  const invalidEnum =
    validateEnum({
      field: "status",
      value: "FAKE",
      required: true,
      allowedValues: [
        "READY",
        "UNAVAILABLE",
      ],
    });

  check(
    invalidEnum.valid === false,
    "unsupported enum is rejected"
  );

  check(
    invalidEnum.errors[0]
      .code ===
      API_INPUT_VALIDATION_ERROR.INVALID_ENUM,
    "unsupported enum rejection is explicit"
  );

  // ============================================================
  // H. OBJECT VALIDATION
  // ============================================================

  section(
    "H. Object validation"
  );

  const validObject =
    validateObject({
      field: "body",
      value: {
        siteId: "39996",
      },
      required: true,
    });

  check(
    validObject.valid === true,
    "plain object is accepted"
  );

  const arrayAsObject =
    validateObject({
      field: "body",
      value: [],
      required: true,
    });

  check(
    arrayAsObject.valid === false,
    "array is rejected where object required"
  );

  check(
    arrayAsObject.errors[0]
      .code ===
      API_INPUT_VALIDATION_ERROR.INVALID_STRUCTURE,
    "invalid object structure is explicit"
  );

  // ============================================================
  // I. STRICT OBJECT SHAPE
  // ============================================================

  section(
    "I. Strict object shape"
  );

  const rawBody = {
    siteId: "39996",
    enabled: false,
  };

  const rawBodySnapshot =
    JSON.stringify(rawBody);

  const strictValid =
    validateStrictObjectShape({
      value: rawBody,
      allowedFields: [
        "siteId",
        "enabled",
      ],
      requiredFields: [
        "siteId",
      ],
    });

  check(
    strictValid.valid === true,
    "qualified strict object is accepted"
  );

  check(
    JSON.stringify(rawBody) ===
      rawBodySnapshot,
    "input object is not mutated"
  );

  check(
    strictValid.value.enabled ===
      false,
    "explicit false survives strict-object validation"
  );

  const unknownField =
    validateStrictObjectShape({
      value: {
        siteId: "39996",
        adminOverride: true,
      },
      allowedFields: [
        "siteId",
      ],
      requiredFields: [
        "siteId",
      ],
    });

  check(
    unknownField.valid === false,
    "unknown field is rejected"
  );

  check(
    unknownField.errors.some(
      (error) =>
        error.code ===
        API_INPUT_VALIDATION_ERROR.UNKNOWN_FIELD
    ),
    "unknown-field rejection is explicit"
  );

  const missingRequired =
    validateStrictObjectShape({
      value: {},
      allowedFields: [
        "siteId",
      ],
      requiredFields: [
        "siteId",
      ],
    });

  check(
    missingRequired.valid ===
      false,
    "missing required object field is rejected"
  );

  check(
    missingRequired.errors.some(
      (error) =>
        error.code ===
        API_INPUT_VALIDATION_ERROR.REQUIRED
    ),
    "missing required object field is explicit"
  );

  const malformedBody =
    validateStrictObjectShape({
      value: [],
      allowedFields: [],
      requiredFields: [],
    });

  check(
    malformedBody.valid ===
      false,
    "malformed request-body structure is rejected"
  );

  // ============================================================
  // J. PAGINATION
  // ============================================================

  section(
    "J. Pagination validation"
  );

  const validPagination =
    validatePagination({
      page: 1,
      limit: 25,
      maxLimit: 100,
    });

  check(
    validPagination.valid ===
      true,
    "valid pagination is accepted"
  );

  check(
    validPagination.value.page ===
      1,
    "pagination page is preserved"
  );

  check(
    validPagination.value.limit ===
      25,
    "pagination limit is preserved"
  );

  const invalidPage =
    validatePagination({
      page: 0,
      limit: 25,
    });

  check(
    invalidPage.valid ===
      false,
    "page below 1 is rejected"
  );

  const excessiveLimit =
    validatePagination({
      page: 1,
      limit: 101,
      maxLimit: 100,
    });

  check(
    excessiveLimit.valid ===
      false,
    "limit above maximum is rejected"
  );

  const stringPagination =
    validatePagination({
      page: "1",
      limit: "25",
    });

  check(
    stringPagination.valid ===
      false,
    "pagination strings are not silently coerced"
  );

  // ============================================================
  // K. MISSING ≠ ZERO
  // ============================================================

  section(
    "K. Missing-value safety"
  );

  const missingOptionalNumber =
    validateNumber({
      field: "value",
      value: undefined,
      required: false,
    });

  check(
    missingOptionalNumber.valid ===
      true,
    "missing optional numeric value may remain missing"
  );

  check(
    missingOptionalNumber.value ===
      undefined,
    "missing numeric value does not become zero"
  );

  const explicitZero =
    validateNumber({
      field: "value",
      value: 0,
      required: true,
    });

  check(
    explicitZero.valid === true,
    "explicit numeric zero remains valid"
  );

  check(
    explicitZero.value === 0,
    "explicit zero is preserved exactly"
  );

  // ============================================================
  // L. RESULT CONTRACT
  // ============================================================

  section(
    "L. Result contract"
  );

  check(
    validString.phase ===
      "13.5",
    "validation result preserves phase"
  );

  check(
    validString.layer ===
      "INPUT_VALIDATION",
    "validation result preserves layer"
  );

  check(
    validString.status ===
      "VALID",
    "successful validation result reports VALID"
  );

  check(
    missingString.status ===
      "INVALID",
    "failed validation result reports INVALID"
  );

  check(
    Object.isFrozen(
      validString
    ),
    "validation result is frozen"
  );

  check(
    Object.isFrozen(
      validString.errors
    ),
    "validation error collection is frozen"
  );

  // ============================================================
  // M. FROZEN CONTRACT STRUCTURES
  // ============================================================

  section(
    "M. Frozen contract structures"
  );

  check(
    Object.isFrozen(
      API_INPUT_VALIDATION_STATUS
    ),
    "validation-status taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      API_INPUT_VALIDATION_ERROR
    ),
    "validation-error taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      API_INPUT_VALIDATION_INVARIANTS
    ),
    "input-validation invariants are frozen"
  );

  // ============================================================
  // FINAL
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.5 API INPUT VALIDATION RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Client input               : UNTRUSTED"
  );

  console.log(
    "Type validation            : EXPLICIT"
  );

  console.log(
    "Range validation           : EXPLICIT"
  );

  console.log(
    "Enum validation            : EXPLICIT"
  );

  console.log(
    "Structural validation      : EXPLICIT"
  );

  console.log(
    "Silent type coercion       : FORBIDDEN"
  );

  console.log(
    "Unknown fields             : REJECTABLE"
  );

  console.log(
    "Malformed input            : REJECTED"
  );

  console.log(
    "Missing value → zero       : FORBIDDEN"
  );

  console.log(
    "Input mutation             : NONE"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    `\nAssertions passed: ${passed}`
  );

  console.log(
    "ASHMAAN PHASE 13.5 API INPUT VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.5 API INPUT VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}