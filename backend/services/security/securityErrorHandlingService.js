// ASHMAAN Phase 13.13
// Security Error Handling Service

export const SECURITY_ERROR_HANDLING_PHASE =
  "13.13";

export const SECURITY_ERROR_HANDLING_LAYER =
  "SECURITY_ERROR_HANDLING";

// ============================================================
// ERROR TAXONOMY
// ============================================================

export const SECURITY_ERROR_CATEGORY =
  Object.freeze({
    AUTHENTICATION:
      "AUTHENTICATION",

    AUTHORIZATION:
      "AUTHORIZATION",

    INPUT_VALIDATION:
      "INPUT_VALIDATION",

    RATE_LIMITING:
      "RATE_LIMITING",

    DATABASE:
      "DATABASE",

    DEPENDENCY:
      "DEPENDENCY",

    SECURITY_CONFIGURATION:
      "SECURITY_CONFIGURATION",

    INTERNAL:
      "INTERNAL",
  });

export const SECURITY_PUBLIC_ERROR_CODE =
  Object.freeze({
    AUTHENTICATION_REQUIRED:
      "AUTHENTICATION_REQUIRED",

    ACCESS_DENIED:
      "ACCESS_DENIED",

    INVALID_REQUEST:
      "INVALID_REQUEST",

    RATE_LIMITED:
      "RATE_LIMITED",

    SERVICE_UNAVAILABLE:
      "SERVICE_UNAVAILABLE",

    SECURITY_CONFIGURATION_ERROR:
      "SECURITY_CONFIGURATION_ERROR",

    INTERNAL_SERVER_ERROR:
      "INTERNAL_SERVER_ERROR",
  });

export const SECURITY_ERROR_STATUS =
  Object.freeze({
    HANDLED:
      "HANDLED",

    UNAVAILABLE:
      "UNAVAILABLE",

    INVALID:
      "INVALID",
  });

// ============================================================
// PUBLIC ERROR POLICY
// ============================================================

export const SECURITY_PUBLIC_ERROR_POLICY =
  Object.freeze({
    AUTHENTICATION:
      Object.freeze({
        statusCode: 401,

        code:
          SECURITY_PUBLIC_ERROR_CODE
            .AUTHENTICATION_REQUIRED,

        message:
          "Authentication is required.",
      }),

    AUTHORIZATION:
      Object.freeze({
        statusCode: 403,

        code:
          SECURITY_PUBLIC_ERROR_CODE
            .ACCESS_DENIED,

        message:
          "Access is denied.",
      }),

    INPUT_VALIDATION:
      Object.freeze({
        statusCode: 400,

        code:
          SECURITY_PUBLIC_ERROR_CODE
            .INVALID_REQUEST,

        message:
          "The request is invalid.",
      }),

    RATE_LIMITING:
      Object.freeze({
        statusCode: 429,

        code:
          SECURITY_PUBLIC_ERROR_CODE
            .RATE_LIMITED,

        message:
          "Too many requests.",
      }),

    DATABASE:
      Object.freeze({
        statusCode: 503,

        code:
          SECURITY_PUBLIC_ERROR_CODE
            .SERVICE_UNAVAILABLE,

        message:
          "The service is temporarily unavailable.",
      }),

    DEPENDENCY:
      Object.freeze({
        statusCode: 503,

        code:
          SECURITY_PUBLIC_ERROR_CODE
            .SERVICE_UNAVAILABLE,

        message:
          "The service is temporarily unavailable.",
      }),

    SECURITY_CONFIGURATION:
      Object.freeze({
        statusCode: 500,

        code:
          SECURITY_PUBLIC_ERROR_CODE
            .SECURITY_CONFIGURATION_ERROR,

        message:
          "A security configuration error occurred.",
      }),

    INTERNAL:
      Object.freeze({
        statusCode: 500,

        code:
          SECURITY_PUBLIC_ERROR_CODE
            .INTERNAL_SERVER_ERROR,

        message:
          "An internal server error occurred.",
      }),
  });

// ============================================================
// INVARIANTS
// ============================================================

export const SECURITY_ERROR_HANDLING_INVARIANTS =
  Object.freeze({
    securityErrorsMustFailClosed:
      true,

    clientErrorsMustUseSafePublicMessages:
      true,

    internalExceptionMessagesMustNotBeReturned:
      true,

    stackTracesMustNotBeReturned:
      true,

    rawErrorsMustNotBeReturned:
      true,

    passwordsMustNotBeReturned:
      true,

    passwordHashesMustNotBeReturned:
      true,

    accessTokensMustNotBeReturned:
      true,

    refreshTokensMustNotBeReturned:
      true,

    authorizationHeadersMustNotBeReturned:
      true,

    cookiesMustNotBeReturned:
      true,

    secretsMustNotBeReturned:
      true,

    apiKeysMustNotBeReturned:
      true,

    privateKeysMustNotBeReturned:
      true,

    databaseUrisMustNotBeReturned:
      true,

    internalFilePathsMustNotBeReturned:
      true,

    databaseFailureMustNotRevealDatabaseDetails:
      true,

    dependencyFailureMustNotRevealDependencyDetails:
      true,

    authenticationFailureMustNotRevealAccountExistence:
      true,

    authorizationFailureMustNotRevealProtectedResourceDetails:
      true,

    correlationIdMayBeReturnedWhenExplicit:
      true,

    retryAfterMustBeExplicitAndBounded:
      true,

    errorHandlingFailureMustNotGrantAuthorization:
      true,

    errorHandlingMustNotAuthenticate:
      true,

    errorHandlingMustNotMutateDatabase:
      true,

    errorHandlingMustNotExecuteEquipmentControl:
      true,

    optimizationDssRemainsNonExecutable:
      true,

    optimizationDssAutoDispatchRemainsDisabled:
      true,
  });

// ============================================================
// HELPERS
// ============================================================

function normalize(value) {
  return typeof value === "string"
    ? value.trim().toUpperCase()
    : "";
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export function isKnownSecurityErrorCategory(
  category
) {
  return Object.values(
    SECURITY_ERROR_CATEGORY
  ).includes(
    normalize(category)
  );
}

export function isKnownPublicErrorCode(
  code
) {
  return Object.values(
    SECURITY_PUBLIC_ERROR_CODE
  ).includes(
    normalize(code)
  );
}

export function getPublicErrorPolicy(
  category
) {
  const normalizedCategory =
    normalize(category);

  if (
    !isKnownSecurityErrorCategory(
      normalizedCategory
    )
  ) {
    return null;
  }

  return SECURITY_PUBLIC_ERROR_POLICY[
    normalizedCategory
  ];
}

export function validateRetryAfterSeconds(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return Object.freeze({
      valid: true,
      value: null,
    });
  }

  const valid =
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 86400;

  return Object.freeze({
    valid,

    value:
      valid
        ? value
        : null,
  });
}

// ============================================================
// SAFE INTERNAL DIAGNOSTIC DESCRIPTOR
// ============================================================

export function describeInternalError(
  error
) {
  if (
    error === null ||
    error === undefined
  ) {
    return Object.freeze({
      present: false,

      name: null,

      rawMessageExposed:
        false,

      stackExposed:
        false,

      rawErrorExposed:
        false,
    });
  }

  const name =
    error instanceof Error &&
    isNonEmptyString(
      error.name
    )
      ? error.name.trim()
      : "Error";

  return Object.freeze({
    present: true,

    name,

    rawMessageExposed:
      false,

    stackExposed:
      false,

    rawErrorExposed:
      false,
  });
}

// ============================================================
// INPUT VALIDATION
// ============================================================

export function validateSecurityErrorInput({
  category,
  correlationId = null,
  retryAfterSeconds = null,
} = {}) {
  const errors = [];

  if (
    !isKnownSecurityErrorCategory(
      category
    )
  ) {
    errors.push(
      "INVALID_CATEGORY"
    );
  }

  if (
    correlationId !== null &&
    !isNonEmptyString(
      correlationId
    )
  ) {
    errors.push(
      "INVALID_CORRELATION_ID"
    );
  }

  const retryValidation =
    validateRetryAfterSeconds(
      retryAfterSeconds
    );

  if (
    !retryValidation.valid
  ) {
    errors.push(
      "INVALID_RETRY_AFTER"
    );
  }

  return Object.freeze({
    phase:
      SECURITY_ERROR_HANDLING_PHASE,

    layer:
      SECURITY_ERROR_HANDLING_LAYER,

    valid:
      errors.length === 0,

    errors:
      Object.freeze([
        ...errors,
      ]),

    invariants:
      SECURITY_ERROR_HANDLING_INVARIANTS,
  });
}

// ============================================================
// SAFE ERROR RESPONSE
// ============================================================

export function createSecurityErrorResponse({
  category,
  correlationId = null,
  retryAfterSeconds = null,
  internalError = null,
  internalContext = null,
} = {}) {
  const validation =
    validateSecurityErrorInput({
      category,
      correlationId,
      retryAfterSeconds,
    });

  const internalDiagnostic =
    describeInternalError(
      internalError
    );

  if (!validation.valid) {
    return Object.freeze({
      phase:
        SECURITY_ERROR_HANDLING_PHASE,

      layer:
        SECURITY_ERROR_HANDLING_LAYER,

      status:
        SECURITY_ERROR_STATUS.INVALID,

      handled: false,

      statusCode: 500,

      response:
        Object.freeze({
          error:
            Object.freeze({
              code:
                SECURITY_PUBLIC_ERROR_CODE
                  .INTERNAL_SERVER_ERROR,

              message:
                "An internal server error occurred.",

              correlationId:
                null,
            }),
        }),

      retryAfterSeconds:
        null,

      validationErrors:
        validation.errors,

      internalDiagnostic,

      internalContextExposed:
        false,

      rawErrorExposed:
        false,

      stackTraceExposed:
        false,

      sensitiveDataExposed:
        false,

      authenticated:
        false,

      authorizationGranted:
        false,

      databaseMutationExecuted:
        false,

      equipmentControlExecuted:
        false,

      autoDispatchExecuted:
        false,

      invariants:
        SECURITY_ERROR_HANDLING_INVARIANTS,
    });
  }

  const normalizedCategory =
    normalize(category);

  const policy =
    getPublicErrorPolicy(
      normalizedCategory
    );

  const retryValidation =
    validateRetryAfterSeconds(
      retryAfterSeconds
    );

  const status =
    (
      normalizedCategory ===
        SECURITY_ERROR_CATEGORY.DATABASE ||
      normalizedCategory ===
        SECURITY_ERROR_CATEGORY.DEPENDENCY
    )
      ? SECURITY_ERROR_STATUS
          .UNAVAILABLE
      : SECURITY_ERROR_STATUS
          .HANDLED;

  const response =
    Object.freeze({
      error:
        Object.freeze({
          code:
            policy.code,

          message:
            policy.message,

          correlationId:
            correlationId === null
              ? null
              : correlationId.trim(),
        }),
    });

  return Object.freeze({
    phase:
      SECURITY_ERROR_HANDLING_PHASE,

    layer:
      SECURITY_ERROR_HANDLING_LAYER,

    status,

    handled: true,

    statusCode:
      policy.statusCode,

    response,

    retryAfterSeconds:
      retryValidation.value,

    validationErrors:
      Object.freeze([]),

    internalDiagnostic,

    internalContextExposed:
      false,

    rawErrorExposed:
      false,

    stackTraceExposed:
      false,

    sensitiveDataExposed:
      false,

    authenticated:
      false,

    authorizationGranted:
      false,

    databaseMutationExecuted:
      false,

    equipmentControlExecuted:
      false,

    autoDispatchExecuted:
      false,

    invariants:
      SECURITY_ERROR_HANDLING_INVARIANTS,
  });
}

// ============================================================
// SAFE ERROR SERIALIZATION
// ============================================================

export function serializeSecurityErrorResponse(
  result
) {
  if (
    !isPlainObject(result) ||
    !isPlainObject(
      result.response
    ) ||
    !isPlainObject(
      result.response.error
    )
  ) {
    return Object.freeze({
      valid: false,

      body:
        Object.freeze({
          error:
            Object.freeze({
              code:
                SECURITY_PUBLIC_ERROR_CODE
                  .INTERNAL_SERVER_ERROR,

              message:
                "An internal server error occurred.",

              correlationId:
                null,
            }),
        }),

      rawErrorExposed:
        false,

      stackTraceExposed:
        false,

      sensitiveDataExposed:
        false,
    });
  }

  return Object.freeze({
    valid: true,

    body:
      result.response,

    rawErrorExposed:
      false,

    stackTraceExposed:
      false,

    sensitiveDataExposed:
      false,
  });
}

export default createSecurityErrorResponse;