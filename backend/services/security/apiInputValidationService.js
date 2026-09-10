// ASHMAAN Phase 13.5
// API Input Validation Service

export const API_INPUT_VALIDATION_PHASE = "13.5";

export const API_INPUT_VALIDATION_LAYER =
  "INPUT_VALIDATION";

export const API_INPUT_VALIDATION_STATUS = Object.freeze({
  VALID: "VALID",
  INVALID: "INVALID",
});

export const API_INPUT_VALIDATION_ERROR = Object.freeze({
  REQUIRED:
    "REQUIRED",

  TYPE_MISMATCH:
    "TYPE_MISMATCH",

  OUT_OF_RANGE:
    "OUT_OF_RANGE",

  INVALID_ENUM:
    "INVALID_ENUM",

  INVALID_FORMAT:
    "INVALID_FORMAT",

  UNKNOWN_FIELD:
    "UNKNOWN_FIELD",

  INVALID_STRUCTURE:
    "INVALID_STRUCTURE",
});

export const API_INPUT_VALIDATION_INVARIANTS =
  Object.freeze({
    clientInputIsUntrusted: true,

    explicitValidationRequired: true,

    silentTypeCoercionForbidden: true,

    malformedInputMustBeRejected: true,

    unknownFieldsMayBeRejected: true,

    missingRequiredFieldMustBeRejected: true,

    invalidEnumMustBeRejected: true,

    outOfRangeValueMustBeRejected: true,

    invalidStructureMustBeRejected: true,

    rawInputMustNotBeMutated: true,

    missingValueMustNotBecomeZero: true,

    missingValueMustNotBeInferred: true,
  });

// ============================================================
// HELPERS
// ============================================================

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function buildValidationResult({
  valid,
  value = undefined,
  errors = [],
}) {
  return Object.freeze({
    phase:
      API_INPUT_VALIDATION_PHASE,

    layer:
      API_INPUT_VALIDATION_LAYER,

    status:
      valid
        ? API_INPUT_VALIDATION_STATUS.VALID
        : API_INPUT_VALIDATION_STATUS.INVALID,

    valid,

    value:
      valid
        ? value
        : undefined,

    errors: Object.freeze([
      ...errors,
    ]),

    invariants:
      API_INPUT_VALIDATION_INVARIANTS,
  });
}

function validationError({
  field,
  code,
  message,
}) {
  return Object.freeze({
    field,
    code,
    message,
  });
}

// ============================================================
// STRING VALIDATION
// ============================================================

export function validateString({
  field,
  value,
  required = false,
  minLength = 0,
  maxLength = Infinity,
  pattern = null,
} = {}) {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      return buildValidationResult({
        valid: false,
        errors: [
          validationError({
            field,
            code:
              API_INPUT_VALIDATION_ERROR.REQUIRED,
            message:
              `${field} is required`,
          }),
        ],
      });
    }

    return buildValidationResult({
      valid: true,
      value,
    });
  }

  if (typeof value !== "string") {
    return buildValidationResult({
      valid: false,
      errors: [
        validationError({
          field,
          code:
            API_INPUT_VALIDATION_ERROR.TYPE_MISMATCH,
          message:
            `${field} must be a string`,
        }),
      ],
    });
  }

  if (
    value.length < minLength ||
    value.length > maxLength
  ) {
    return buildValidationResult({
      valid: false,
      errors: [
        validationError({
          field,
          code:
            API_INPUT_VALIDATION_ERROR.OUT_OF_RANGE,
          message:
            `${field} length is outside allowed range`,
        }),
      ],
    });
  }

  if (
    pattern instanceof RegExp &&
    !pattern.test(value)
  ) {
    return buildValidationResult({
      valid: false,
      errors: [
        validationError({
          field,
          code:
            API_INPUT_VALIDATION_ERROR.INVALID_FORMAT,
          message:
            `${field} has invalid format`,
        }),
      ],
    });
  }

  return buildValidationResult({
    valid: true,
    value,
  });
}

// ============================================================
// NUMBER VALIDATION
// ============================================================

export function validateNumber({
  field,
  value,
  required = false,
  min = -Infinity,
  max = Infinity,
  integer = false,
} = {}) {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      return buildValidationResult({
        valid: false,
        errors: [
          validationError({
            field,
            code:
              API_INPUT_VALIDATION_ERROR.REQUIRED,
            message:
              `${field} is required`,
          }),
        ],
      });
    }

    return buildValidationResult({
      valid: true,
      value,
    });
  }

  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return buildValidationResult({
      valid: false,
      errors: [
        validationError({
          field,
          code:
            API_INPUT_VALIDATION_ERROR.TYPE_MISMATCH,
          message:
            `${field} must be a finite number`,
        }),
      ],
    });
  }

  if (
    integer &&
    !Number.isInteger(value)
  ) {
    return buildValidationResult({
      valid: false,
      errors: [
        validationError({
          field,
          code:
            API_INPUT_VALIDATION_ERROR.TYPE_MISMATCH,
          message:
            `${field} must be an integer`,
        }),
      ],
    });
  }

  if (
    value < min ||
    value > max
  ) {
    return buildValidationResult({
      valid: false,
      errors: [
        validationError({
          field,
          code:
            API_INPUT_VALIDATION_ERROR.OUT_OF_RANGE,
          message:
            `${field} is outside allowed range`,
        }),
      ],
    });
  }

  return buildValidationResult({
    valid: true,
    value,
  });
}

// ============================================================
// BOOLEAN VALIDATION
// ============================================================

export function validateBoolean({
  field,
  value,
  required = false,
} = {}) {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      return buildValidationResult({
        valid: false,
        errors: [
          validationError({
            field,
            code:
              API_INPUT_VALIDATION_ERROR.REQUIRED,
            message:
              `${field} is required`,
          }),
        ],
      });
    }

    return buildValidationResult({
      valid: true,
      value,
    });
  }

  if (typeof value !== "boolean") {
    return buildValidationResult({
      valid: false,
      errors: [
        validationError({
          field,
          code:
            API_INPUT_VALIDATION_ERROR.TYPE_MISMATCH,
          message:
            `${field} must be a boolean`,
        }),
      ],
    });
  }

  return buildValidationResult({
    valid: true,
    value,
  });
}

// ============================================================
// ENUM VALIDATION
// ============================================================

export function validateEnum({
  field,
  value,
  allowedValues = [],
  required = false,
} = {}) {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      return buildValidationResult({
        valid: false,
        errors: [
          validationError({
            field,
            code:
              API_INPUT_VALIDATION_ERROR.REQUIRED,
            message:
              `${field} is required`,
          }),
        ],
      });
    }

    return buildValidationResult({
      valid: true,
      value,
    });
  }

  if (!allowedValues.includes(value)) {
    return buildValidationResult({
      valid: false,
      errors: [
        validationError({
          field,
          code:
            API_INPUT_VALIDATION_ERROR.INVALID_ENUM,
          message:
            `${field} has unsupported value`,
        }),
      ],
    });
  }

  return buildValidationResult({
    valid: true,
    value,
  });
}

// ============================================================
// OBJECT VALIDATION
// ============================================================

export function validateObject({
  field,
  value,
  required = false,
} = {}) {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      return buildValidationResult({
        valid: false,
        errors: [
          validationError({
            field,
            code:
              API_INPUT_VALIDATION_ERROR.REQUIRED,
            message:
              `${field} is required`,
          }),
        ],
      });
    }

    return buildValidationResult({
      valid: true,
      value,
    });
  }

  if (!isPlainObject(value)) {
    return buildValidationResult({
      valid: false,
      errors: [
        validationError({
          field,
          code:
            API_INPUT_VALIDATION_ERROR.INVALID_STRUCTURE,
          message:
            `${field} must be an object`,
        }),
      ],
    });
  }

  return buildValidationResult({
    valid: true,
    value,
  });
}

// ============================================================
// STRICT OBJECT SHAPE
// ============================================================

export function validateStrictObjectShape({
  value,
  allowedFields = [],
  requiredFields = [],
} = {}) {
  if (!isPlainObject(value)) {
    return buildValidationResult({
      valid: false,
      errors: [
        validationError({
          field: "$",
          code:
            API_INPUT_VALIDATION_ERROR.INVALID_STRUCTURE,
          message:
            "request body must be an object",
        }),
      ],
    });
  }

  const errors = [];

  for (const field of requiredFields) {
    if (
      !Object.prototype.hasOwnProperty.call(
        value,
        field
      )
    ) {
      errors.push(
        validationError({
          field,
          code:
            API_INPUT_VALIDATION_ERROR.REQUIRED,
          message:
            `${field} is required`,
        })
      );
    }
  }

  for (
    const field of Object.keys(value)
  ) {
    if (
      !allowedFields.includes(field)
    ) {
      errors.push(
        validationError({
          field,
          code:
            API_INPUT_VALIDATION_ERROR.UNKNOWN_FIELD,
          message:
            `${field} is not allowed`,
        })
      );
    }
  }

  return buildValidationResult({
    valid:
      errors.length === 0,

    value:
      errors.length === 0
        ? value
        : undefined,

    errors,
  });
}

// ============================================================
// PAGINATION VALIDATION
// ============================================================

export function validatePagination({
  page,
  limit,
  maxLimit = 100,
} = {}) {
  const pageResult =
    validateNumber({
      field: "page",
      value: page,
      required: true,
      min: 1,
      integer: true,
    });

  const limitResult =
    validateNumber({
      field: "limit",
      value: limit,
      required: true,
      min: 1,
      max: maxLimit,
      integer: true,
    });

  const errors = [
    ...pageResult.errors,
    ...limitResult.errors,
  ];

  return buildValidationResult({
    valid:
      errors.length === 0,

    value:
      errors.length === 0
        ? Object.freeze({
            page,
            limit,
          })
        : undefined,

    errors,
  });
}

export default Object.freeze({
  validateString,
  validateNumber,
  validateBoolean,
  validateEnum,
  validateObject,
  validateStrictObjectShape,
  validatePagination,
});