// ASHMAAN Phase 13.11
// Database Security Controls Service

export const DATABASE_SECURITY_PHASE = "13.11";

export const DATABASE_SECURITY_LAYER =
  "DATABASE_SECURITY";

// ============================================================
// ENVIRONMENT / ACCESS TAXONOMY
// ============================================================

export const DATABASE_ENVIRONMENT =
  Object.freeze({
    DEVELOPMENT: "DEVELOPMENT",
    TEST: "TEST",
    PRODUCTION: "PRODUCTION",
  });

export const DATABASE_ACCESS_MODE =
  Object.freeze({
    READ: "READ",
    WRITE: "WRITE",
    ADMIN: "ADMIN",
  });

export const DATABASE_OPERATION =
  Object.freeze({
    FIND: "FIND",
    FIND_ONE: "FIND_ONE",
    AGGREGATE: "AGGREGATE",

    INSERT_ONE: "INSERT_ONE",
    INSERT_MANY: "INSERT_MANY",
    UPDATE_ONE: "UPDATE_ONE",
    UPDATE_MANY: "UPDATE_MANY",
    DELETE_ONE: "DELETE_ONE",
    DELETE_MANY: "DELETE_MANY",

    DROP_COLLECTION: "DROP_COLLECTION",
    DROP_DATABASE: "DROP_DATABASE",
  });

export const DATABASE_DECISION =
  Object.freeze({
    ALLOW: "ALLOW",
    DENY: "DENY",
    UNAVAILABLE: "UNAVAILABLE",
  });

export const DATABASE_DENIAL_REASON =
  Object.freeze({
    INVALID_ENVIRONMENT:
      "INVALID_ENVIRONMENT",

    INVALID_OPERATION:
      "INVALID_OPERATION",

    INVALID_ACCESS_MODE:
      "INVALID_ACCESS_MODE",

    DATABASE_UNAVAILABLE:
      "DATABASE_UNAVAILABLE",

    AUTHORIZATION_REQUIRED:
      "AUTHORIZATION_REQUIRED",

    WRITE_PERMISSION_REQUIRED:
      "WRITE_PERMISSION_REQUIRED",

    ADMIN_PERMISSION_REQUIRED:
      "ADMIN_PERMISSION_REQUIRED",

    DESTRUCTIVE_OPERATION_FORBIDDEN:
      "DESTRUCTIVE_OPERATION_FORBIDDEN",

    INSUFFICIENT_ACCESS_MODE:
      "INSUFFICIENT_ACCESS_MODE",

    PRODUCTION_TLS_REQUIRED:
      "PRODUCTION_TLS_REQUIRED",

    DATABASE_URI_INVALID:
      "DATABASE_URI_INVALID",
  });

// ============================================================
// OPERATION GROUPS
// ============================================================

export const DATABASE_READ_OPERATIONS =
  Object.freeze([
    DATABASE_OPERATION.FIND,
    DATABASE_OPERATION.FIND_ONE,
    DATABASE_OPERATION.AGGREGATE,
  ]);

export const DATABASE_WRITE_OPERATIONS =
  Object.freeze([
    DATABASE_OPERATION.INSERT_ONE,
    DATABASE_OPERATION.INSERT_MANY,
    DATABASE_OPERATION.UPDATE_ONE,
    DATABASE_OPERATION.UPDATE_MANY,
    DATABASE_OPERATION.DELETE_ONE,
    DATABASE_OPERATION.DELETE_MANY,
  ]);

export const DATABASE_DESTRUCTIVE_OPERATIONS =
  Object.freeze([
    DATABASE_OPERATION.DROP_COLLECTION,
    DATABASE_OPERATION.DROP_DATABASE,
  ]);

// ============================================================
// INVARIANTS
// ============================================================

export const DATABASE_SECURITY_INVARIANTS =
  Object.freeze({
    databaseCredentialsMustRemainSecret:
      true,

    databaseUriMustNotBeLogged:
      true,

    productionEncryptedTransportRequired:
      true,

    databaseUsersMustFollowLeastPrivilege:
      true,

    databaseAccessDoesNotImplyAuthorization:
      true,

    writeOperationsRequireExplicitAuthorization:
      true,

    adminOperationsRequireExplicitAuthorization:
      true,

    destructiveProductionOperationsForbiddenByDefault:
      true,

    unavailableDatabaseMustNotBecomeSuccessfulAccess:
      true,

    unknownOperationsMustBeDenied:
      true,

    unknownAccessModesMustBeDenied:
      true,

    clientInputMustNotDefineDatabasePrivilege:
      true,

    databaseSecurityFailureMustFailClosed:
      true,

    noDatabaseMutationPerformedByThisService:
      true,

    noIndexMutationPerformedByThisService:
      true,

    noRetentionPolicyMutationPerformedByThisService:
      true,

    databaseSecurityMustNotExecuteEquipmentControl:
      true,

    optimizationDssRemainsNonExecutable:
      true,

    optimizationDssAutoDispatchRemainsDisabled:
      true,
  });

// ============================================================
// HELPERS
// ============================================================

function normalizeEnumValue(value) {
  return typeof value === "string"
    ? value.trim().toUpperCase()
    : "";
}

export function isKnownDatabaseEnvironment(
  environment
) {
  return Object.values(
    DATABASE_ENVIRONMENT
  ).includes(
    normalizeEnumValue(environment)
  );
}

export function isKnownDatabaseOperation(
  operation
) {
  return Object.values(
    DATABASE_OPERATION
  ).includes(
    normalizeEnumValue(operation)
  );
}

export function isKnownDatabaseAccessMode(
  accessMode
) {
  return Object.values(
    DATABASE_ACCESS_MODE
  ).includes(
    normalizeEnumValue(accessMode)
  );
}

export function isReadOperation(operation) {
  return DATABASE_READ_OPERATIONS.includes(
    normalizeEnumValue(operation)
  );
}

export function isWriteOperation(operation) {
  return DATABASE_WRITE_OPERATIONS.includes(
    normalizeEnumValue(operation)
  );
}

export function isDestructiveOperation(
  operation
) {
  return DATABASE_DESTRUCTIVE_OPERATIONS.includes(
    normalizeEnumValue(operation)
  );
}

// ============================================================
// URI VALIDATION
// ============================================================

export function validateDatabaseUri({
  uri,
  environment =
    DATABASE_ENVIRONMENT.PRODUCTION,
} = {}) {
  const normalizedEnvironment =
    normalizeEnumValue(environment);

  const errors = [];

  if (
    !isKnownDatabaseEnvironment(
      normalizedEnvironment
    )
  ) {
    errors.push(
      DATABASE_DENIAL_REASON
        .INVALID_ENVIRONMENT
    );
  }

  if (
    typeof uri !== "string" ||
    uri.trim().length === 0
  ) {
    errors.push(
      DATABASE_DENIAL_REASON
        .DATABASE_URI_INVALID
    );
  } else {
    const trimmed = uri.trim();

    const isMongoUri =
      /^mongodb(?:\+srv)?:\/\//i.test(
        trimmed
      );

    if (!isMongoUri) {
      errors.push(
        DATABASE_DENIAL_REASON
          .DATABASE_URI_INVALID
      );
    }

    if (
      normalizedEnvironment ===
        DATABASE_ENVIRONMENT.PRODUCTION &&
      !/^mongodb\+srv:\/\//i.test(
        trimmed
      )
    ) {
      errors.push(
        DATABASE_DENIAL_REASON
          .PRODUCTION_TLS_REQUIRED
      );
    }
  }

  return Object.freeze({
    phase:
      DATABASE_SECURITY_PHASE,

    layer:
      DATABASE_SECURITY_LAYER,

    valid:
      errors.length === 0,

    errors:
      Object.freeze([
        ...new Set(errors),
      ]),

    uriExposed: false,

    invariants:
      DATABASE_SECURITY_INVARIANTS,
  });
}

// ============================================================
// ACCESS DECISION RESULT
// ============================================================

export function createDatabaseSecurityDecision({
  decision,
  operation = null,
  accessMode = null,
  reason = null,
} = {}) {
  if (
    !Object.values(
      DATABASE_DECISION
    ).includes(decision)
  ) {
    throw new TypeError(
      `Unsupported database decision: ${decision}`
    );
  }

  const allowed =
    decision ===
    DATABASE_DECISION.ALLOW;

  return Object.freeze({
    phase:
      DATABASE_SECURITY_PHASE,

    layer:
      DATABASE_SECURITY_LAYER,

    decision,

    allowed,

    operation:
      typeof operation === "string"
        ? normalizeEnumValue(
            operation
          )
        : null,

    accessMode:
      typeof accessMode === "string"
        ? normalizeEnumValue(
            accessMode
          )
        : null,

    reason:
      allowed
        ? null
        : reason,

    authorizationGrantedByDatabaseLayer:
      false,

    databaseMutationExecuted:
      false,

    indexMutationExecuted:
      false,

    retentionPolicyMutationExecuted:
      false,

    equipmentControlExecuted:
      false,

    autoDispatchExecuted:
      false,

    invariants:
      DATABASE_SECURITY_INVARIANTS,
  });
}

// ============================================================
// DATABASE ACCESS POLICY
// ============================================================

export function evaluateDatabaseAccess({
  operation,
  accessMode,
  environment =
    DATABASE_ENVIRONMENT.PRODUCTION,

  authenticated = false,
  authorized = false,

  writeAuthorized = false,
  adminAuthorized = false,

  databaseAvailable = true,
} = {}) {
  const normalizedOperation =
    normalizeEnumValue(operation);

  const normalizedAccessMode =
    normalizeEnumValue(accessMode);

  const normalizedEnvironment =
    normalizeEnumValue(environment);

  if (
    databaseAvailable !== true
  ) {
    return createDatabaseSecurityDecision({
      decision:
        DATABASE_DECISION.UNAVAILABLE,

      operation:
        normalizedOperation,

      accessMode:
        normalizedAccessMode,

      reason:
        DATABASE_DENIAL_REASON
          .DATABASE_UNAVAILABLE,
    });
  }

  if (
    !isKnownDatabaseEnvironment(
      normalizedEnvironment
    )
  ) {
    return createDatabaseSecurityDecision({
      decision:
        DATABASE_DECISION.DENY,

      operation:
        normalizedOperation,

      accessMode:
        normalizedAccessMode,

      reason:
        DATABASE_DENIAL_REASON
          .INVALID_ENVIRONMENT,
    });
  }

  if (
    !isKnownDatabaseOperation(
      normalizedOperation
    )
  ) {
    return createDatabaseSecurityDecision({
      decision:
        DATABASE_DECISION.DENY,

      operation:
        normalizedOperation,

      accessMode:
        normalizedAccessMode,

      reason:
        DATABASE_DENIAL_REASON
          .INVALID_OPERATION,
    });
  }

  if (
    !isKnownDatabaseAccessMode(
      normalizedAccessMode
    )
  ) {
    return createDatabaseSecurityDecision({
      decision:
        DATABASE_DECISION.DENY,

      operation:
        normalizedOperation,

      accessMode:
        normalizedAccessMode,

      reason:
        DATABASE_DENIAL_REASON
          .INVALID_ACCESS_MODE,
    });
  }

  if (
    authenticated !== true ||
    authorized !== true
  ) {
    return createDatabaseSecurityDecision({
      decision:
        DATABASE_DECISION.DENY,

      operation:
        normalizedOperation,

      accessMode:
        normalizedAccessMode,

      reason:
        DATABASE_DENIAL_REASON
          .AUTHORIZATION_REQUIRED,
    });
  }

  if (
    isDestructiveOperation(
      normalizedOperation
    )
  ) {
    return createDatabaseSecurityDecision({
      decision:
        DATABASE_DECISION.DENY,

      operation:
        normalizedOperation,

      accessMode:
        normalizedAccessMode,

      reason:
        DATABASE_DENIAL_REASON
          .DESTRUCTIVE_OPERATION_FORBIDDEN,
    });
  }

  if (
    isReadOperation(
      normalizedOperation
    )
  ) {
    return createDatabaseSecurityDecision({
      decision:
        DATABASE_DECISION.ALLOW,

      operation:
        normalizedOperation,

      accessMode:
        normalizedAccessMode,
    });
  }

  if (
    isWriteOperation(
      normalizedOperation
    )
  ) {
    if (
      normalizedAccessMode ===
        DATABASE_ACCESS_MODE.READ
    ) {
      return createDatabaseSecurityDecision({
        decision:
          DATABASE_DECISION.DENY,

        operation:
          normalizedOperation,

        accessMode:
          normalizedAccessMode,

        reason:
          DATABASE_DENIAL_REASON
            .INSUFFICIENT_ACCESS_MODE,
      });
    }

    if (
      writeAuthorized !== true
    ) {
      return createDatabaseSecurityDecision({
        decision:
          DATABASE_DECISION.DENY,

        operation:
          normalizedOperation,

        accessMode:
          normalizedAccessMode,

        reason:
          DATABASE_DENIAL_REASON
            .WRITE_PERMISSION_REQUIRED,
      });
    }

    return createDatabaseSecurityDecision({
      decision:
        DATABASE_DECISION.ALLOW,

      operation:
        normalizedOperation,

      accessMode:
        normalizedAccessMode,
    });
  }

  if (
    normalizedAccessMode ===
      DATABASE_ACCESS_MODE.ADMIN &&
    adminAuthorized !== true
  ) {
    return createDatabaseSecurityDecision({
      decision:
        DATABASE_DECISION.DENY,

      operation:
        normalizedOperation,

      accessMode:
        normalizedAccessMode,

      reason:
        DATABASE_DENIAL_REASON
          .ADMIN_PERMISSION_REQUIRED,
    });
  }

  return createDatabaseSecurityDecision({
    decision:
      DATABASE_DECISION.DENY,

    operation:
      normalizedOperation,

    accessMode:
      normalizedAccessMode,

    reason:
      DATABASE_DENIAL_REASON
        .INVALID_OPERATION,
  });
}

export default evaluateDatabaseAccess;