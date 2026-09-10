import assert from "node:assert/strict";

import {
  DATABASE_SECURITY_PHASE,
  DATABASE_SECURITY_LAYER,
  DATABASE_ENVIRONMENT,
  DATABASE_ACCESS_MODE,
  DATABASE_OPERATION,
  DATABASE_DECISION,
  DATABASE_DENIAL_REASON,
  DATABASE_READ_OPERATIONS,
  DATABASE_WRITE_OPERATIONS,
  DATABASE_DESTRUCTIVE_OPERATIONS,
  DATABASE_SECURITY_INVARIANTS,
  isKnownDatabaseEnvironment,
  isKnownDatabaseOperation,
  isKnownDatabaseAccessMode,
  isReadOperation,
  isWriteOperation,
  isDestructiveOperation,
  validateDatabaseUri,
  createDatabaseSecurityDecision,
  evaluateDatabaseAccess,
} from "../services/security/databaseSecurityControlsService.js";

let passed = 0;

function check(condition, message) {
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
  "ASHMAAN PHASE 13.11 — DATABASE SECURITY CONTROLS VALIDATION"
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
    DATABASE_SECURITY_PHASE ===
      "13.11",
    "phase identity is 13.11"
  );

  check(
    DATABASE_SECURITY_LAYER ===
      "DATABASE_SECURITY",
    "layer identity is DATABASE_SECURITY"
  );

  // ============================================================
  // B. ENVIRONMENTS
  // ============================================================

  section(
    "B. Database environment taxonomy"
  );

  for (
    const environment of [
      "DEVELOPMENT",
      "TEST",
      "PRODUCTION",
    ]
  ) {
    check(
      Object.values(
        DATABASE_ENVIRONMENT
      ).includes(environment),
      `database environment exists: ${environment}`
    );
  }

  check(
    isKnownDatabaseEnvironment(
      "production"
    ) === true,
    "environment detection is case-insensitive"
  );

  check(
    isKnownDatabaseEnvironment(
      "unknown"
    ) === false,
    "unknown environment is rejected"
  );

  // ============================================================
  // C. ACCESS MODES
  // ============================================================

  section(
    "C. Database access-mode taxonomy"
  );

  for (
    const mode of [
      "READ",
      "WRITE",
      "ADMIN",
    ]
  ) {
    check(
      Object.values(
        DATABASE_ACCESS_MODE
      ).includes(mode),
      `database access mode exists: ${mode}`
    );
  }

  check(
    isKnownDatabaseAccessMode(
      "read"
    ) === true,
    "access-mode detection is case-insensitive"
  );

  check(
    isKnownDatabaseAccessMode(
      "unknown"
    ) === false,
    "unknown database access mode is rejected"
  );

  // ============================================================
  // D. OPERATION TAXONOMY
  // ============================================================

  section(
    "D. Database operation taxonomy"
  );

  const requiredOperations = [
    "FIND",
    "FIND_ONE",
    "AGGREGATE",

    "INSERT_ONE",
    "INSERT_MANY",
    "UPDATE_ONE",
    "UPDATE_MANY",
    "DELETE_ONE",
    "DELETE_MANY",

    "DROP_COLLECTION",
    "DROP_DATABASE",
  ];

  for (
    const operation of
      requiredOperations
  ) {
    check(
      Object.values(
        DATABASE_OPERATION
      ).includes(operation),
      `database operation exists: ${operation}`
    );
  }

  check(
    isKnownDatabaseOperation(
      "find"
    ) === true,
    "database operation detection is case-insensitive"
  );

  check(
    isKnownDatabaseOperation(
      "EXECUTE_SHELL"
    ) === false,
    "unknown database operation is rejected"
  );

  // ============================================================
  // E. DECISIONS
  // ============================================================

  section(
    "E. Database decision taxonomy"
  );

  check(
    DATABASE_DECISION.ALLOW ===
      "ALLOW",
    "ALLOW database decision exists"
  );

  check(
    DATABASE_DECISION.DENY ===
      "DENY",
    "DENY database decision exists"
  );

  check(
    DATABASE_DECISION.UNAVAILABLE ===
      "UNAVAILABLE",
    "UNAVAILABLE database decision exists"
  );

  // ============================================================
  // F. DENIAL REASONS
  // ============================================================

  section(
    "F. Database denial taxonomy"
  );

  const requiredReasons = [
    "INVALID_ENVIRONMENT",
    "INVALID_OPERATION",
    "INVALID_ACCESS_MODE",
    "DATABASE_UNAVAILABLE",
    "AUTHORIZATION_REQUIRED",
    "WRITE_PERMISSION_REQUIRED",
    "ADMIN_PERMISSION_REQUIRED",
    "DESTRUCTIVE_OPERATION_FORBIDDEN",
    "INSUFFICIENT_ACCESS_MODE",
    "PRODUCTION_TLS_REQUIRED",
    "DATABASE_URI_INVALID",
  ];

  for (
    const reason of
      requiredReasons
  ) {
    check(
      Object.values(
        DATABASE_DENIAL_REASON
      ).includes(reason),
      `database denial reason exists: ${reason}`
    );
  }

  // ============================================================
  // G. OPERATION GROUPS
  // ============================================================

  section(
    "G. Database operation groups"
  );

  check(
    DATABASE_READ_OPERATIONS.includes(
      "FIND"
    ),
    "FIND is classified as read"
  );

  check(
    DATABASE_READ_OPERATIONS.includes(
      "FIND_ONE"
    ),
    "FIND_ONE is classified as read"
  );

  check(
    DATABASE_READ_OPERATIONS.includes(
      "AGGREGATE"
    ),
    "AGGREGATE is classified as read"
  );

  check(
    DATABASE_WRITE_OPERATIONS.includes(
      "INSERT_ONE"
    ),
    "INSERT_ONE is classified as write"
  );

  check(
    DATABASE_WRITE_OPERATIONS.includes(
      "UPDATE_ONE"
    ),
    "UPDATE_ONE is classified as write"
  );

  check(
    DATABASE_WRITE_OPERATIONS.includes(
      "DELETE_ONE"
    ),
    "DELETE_ONE is classified as write"
  );

  check(
    DATABASE_DESTRUCTIVE_OPERATIONS.includes(
      "DROP_COLLECTION"
    ),
    "DROP_COLLECTION is classified as destructive"
  );

  check(
    DATABASE_DESTRUCTIVE_OPERATIONS.includes(
      "DROP_DATABASE"
    ),
    "DROP_DATABASE is classified as destructive"
  );

  check(
    isReadOperation("find") ===
      true,
    "read-operation helper recognizes FIND"
  );

  check(
    isWriteOperation(
      "update_one"
    ) === true,
    "write-operation helper recognizes UPDATE_ONE"
  );

  check(
    isDestructiveOperation(
      "drop_database"
    ) === true,
    "destructive-operation helper recognizes DROP_DATABASE"
  );

  // ============================================================
  // H. INVARIANTS
  // ============================================================

  section(
    "H. Core database-security invariants"
  );

  const invariantNames = [
    "databaseCredentialsMustRemainSecret",
    "databaseUriMustNotBeLogged",
    "productionEncryptedTransportRequired",
    "databaseUsersMustFollowLeastPrivilege",
    "databaseAccessDoesNotImplyAuthorization",
    "writeOperationsRequireExplicitAuthorization",
    "adminOperationsRequireExplicitAuthorization",
    "destructiveProductionOperationsForbiddenByDefault",
    "unavailableDatabaseMustNotBecomeSuccessfulAccess",
    "unknownOperationsMustBeDenied",
    "unknownAccessModesMustBeDenied",
    "clientInputMustNotDefineDatabasePrivilege",
    "databaseSecurityFailureMustFailClosed",
    "noDatabaseMutationPerformedByThisService",
    "noIndexMutationPerformedByThisService",
    "noRetentionPolicyMutationPerformedByThisService",
    "databaseSecurityMustNotExecuteEquipmentControl",
    "optimizationDssRemainsNonExecutable",
    "optimizationDssAutoDispatchRemainsDisabled",
  ];

  for (
    const name of
      invariantNames
  ) {
    check(
      DATABASE_SECURITY_INVARIANTS[
        name
      ] === true,
      `database-security invariant enforced: ${name}`
    );
  }

  // ============================================================
  // I. PRODUCTION URI
  // ============================================================

  section(
    "I. Production database URI validation"
  );

  const productionUri =
    validateDatabaseUri({
      uri:
        "mongodb+srv://user:password@cluster.example/database",

      environment:
        DATABASE_ENVIRONMENT.PRODUCTION,
    });

  check(
    productionUri.valid ===
      true,
    "MongoDB SRV URI is valid for production"
  );

  check(
    productionUri.errors.length ===
      0,
    "valid production URI reports zero errors"
  );

  check(
    productionUri.uriExposed ===
      false,
    "database URI is never returned by validator"
  );

  // ============================================================
  // J. PRODUCTION TRANSPORT
  // ============================================================

  section(
    "J. Production encrypted transport"
  );

  const insecureProduction =
    validateDatabaseUri({
      uri:
        "mongodb://user:password@localhost:27017/database",

      environment:
        DATABASE_ENVIRONMENT.PRODUCTION,
    });

  check(
    insecureProduction.valid ===
      false,
    "plain mongodb URI is rejected for production"
  );

  check(
    insecureProduction.errors.includes(
      DATABASE_DENIAL_REASON
        .PRODUCTION_TLS_REQUIRED
    ),
    "production transport requirement is explicit"
  );

  check(
    insecureProduction.uriExposed ===
      false,
    "invalid production URI is not exposed"
  );

  // ============================================================
  // K. DEVELOPMENT URI
  // ============================================================

  section(
    "K. Development database URI"
  );

  const developmentUri =
    validateDatabaseUri({
      uri:
        "mongodb://localhost:27017/ashmaan",

      environment:
        DATABASE_ENVIRONMENT.DEVELOPMENT,
    });

  check(
    developmentUri.valid ===
      true,
    "local MongoDB URI is permitted in development contract"
  );

  // ============================================================
  // L. INVALID URI
  // ============================================================

  section(
    "L. Invalid database URI"
  );

  const malformedUri =
    validateDatabaseUri({
      uri:
        "https://database.example",

      environment:
        DATABASE_ENVIRONMENT.PRODUCTION,
    });

  check(
    malformedUri.valid ===
      false,
    "non-MongoDB URI is rejected"
  );

  check(
    malformedUri.errors.includes(
      DATABASE_DENIAL_REASON
        .DATABASE_URI_INVALID
    ),
    "invalid URI reason is explicit"
  );

  const missingUri =
    validateDatabaseUri({
      environment:
        DATABASE_ENVIRONMENT.PRODUCTION,
    });

  check(
    missingUri.valid ===
      false,
    "missing database URI is rejected"
  );

  check(
    missingUri.errors.includes(
      DATABASE_DENIAL_REASON
        .DATABASE_URI_INVALID
    ),
    "missing database URI reason is explicit"
  );

  // ============================================================
  // M. VALID READ ACCESS
  // ============================================================

  section(
    "M. Authorized read access"
  );

  const readAccess =
    evaluateDatabaseAccess({
      operation:
        DATABASE_OPERATION.FIND,

      accessMode:
        DATABASE_ACCESS_MODE.READ,

      authenticated: true,
      authorized: true,
      databaseAvailable: true,
    });

  check(
    readAccess.decision ===
      DATABASE_DECISION.ALLOW,
    "authorized read operation is allowed"
  );

  check(
    readAccess.allowed ===
      true,
    "authorized read reports allowed=true"
  );

  check(
    readAccess.reason ===
      null,
    "allowed read has no denial reason"
  );

  // ============================================================
  // N. AUTHORIZATION REQUIRED
  // ============================================================

  section(
    "N. Authorization boundary"
  );

  const unauthenticated =
    evaluateDatabaseAccess({
      operation:
        DATABASE_OPERATION.FIND,

      accessMode:
        DATABASE_ACCESS_MODE.READ,

      authenticated: false,
      authorized: true,
    });

  check(
    unauthenticated.allowed ===
      false,
    "unauthenticated database access is denied"
  );

  check(
    unauthenticated.reason ===
      DATABASE_DENIAL_REASON
        .AUTHORIZATION_REQUIRED,
    "unauthenticated denial reason is explicit"
  );

  const unauthorized =
    evaluateDatabaseAccess({
      operation:
        DATABASE_OPERATION.FIND,

      accessMode:
        DATABASE_ACCESS_MODE.READ,

      authenticated: true,
      authorized: false,
    });

  check(
    unauthorized.allowed ===
      false,
    "authenticated but unauthorized database access is denied"
  );

  check(
    unauthorized.reason ===
      DATABASE_DENIAL_REASON
        .AUTHORIZATION_REQUIRED,
    "authorization remains explicitly required"
  );

  // ============================================================
  // O. WRITE AUTHORIZATION
  // ============================================================

  section(
    "O. Write authorization"
  );

  const unauthorizedWrite =
    evaluateDatabaseAccess({
      operation:
        DATABASE_OPERATION.UPDATE_ONE,

      accessMode:
        DATABASE_ACCESS_MODE.WRITE,

      authenticated: true,
      authorized: true,

      writeAuthorized: false,
    });

  check(
    unauthorizedWrite.allowed ===
      false,
    "write without explicit write permission is denied"
  );

  check(
    unauthorizedWrite.reason ===
      DATABASE_DENIAL_REASON
        .WRITE_PERMISSION_REQUIRED,
    "missing write permission is explicit"
  );

  const authorizedWrite =
    evaluateDatabaseAccess({
      operation:
        DATABASE_OPERATION.UPDATE_ONE,

      accessMode:
        DATABASE_ACCESS_MODE.WRITE,

      authenticated: true,
      authorized: true,

      writeAuthorized: true,
    });

  check(
    authorizedWrite.allowed ===
      true,
    "explicitly authorized write is allowed by policy"
  );

  check(
    authorizedWrite.decision ===
      DATABASE_DECISION.ALLOW,
    "authorized write returns ALLOW"
  );

  check(
    authorizedWrite.databaseMutationExecuted ===
      false,
    "policy decision itself performs no database mutation"
  );

  // ============================================================
  // P. READ MODE CANNOT WRITE
  // ============================================================

  section(
    "P. Least-privilege access mode"
  );

  const readModeWrite =
    evaluateDatabaseAccess({
      operation:
        DATABASE_OPERATION.DELETE_ONE,

      accessMode:
        DATABASE_ACCESS_MODE.READ,

      authenticated: true,
      authorized: true,

      writeAuthorized: true,
    });

  check(
    readModeWrite.allowed ===
      false,
    "READ access mode cannot perform write operation"
  );

  check(
    readModeWrite.reason ===
      DATABASE_DENIAL_REASON
        .INSUFFICIENT_ACCESS_MODE,
    "insufficient database access mode is explicit"
  );

  // ============================================================
  // Q. DESTRUCTIVE OPERATIONS
  // ============================================================

  section(
    "Q. Destructive-operation protection"
  );

  const dropCollection =
    evaluateDatabaseAccess({
      operation:
        DATABASE_OPERATION.DROP_COLLECTION,

      accessMode:
        DATABASE_ACCESS_MODE.ADMIN,

      authenticated: true,
      authorized: true,

      writeAuthorized: true,
      adminAuthorized: true,

      environment:
        DATABASE_ENVIRONMENT.PRODUCTION,
    });

  check(
    dropCollection.allowed ===
      false,
    "DROP_COLLECTION is forbidden by database security service"
  );

  check(
    dropCollection.reason ===
      DATABASE_DENIAL_REASON
        .DESTRUCTIVE_OPERATION_FORBIDDEN,
    "DROP_COLLECTION denial reason is explicit"
  );

  const dropDatabase =
    evaluateDatabaseAccess({
      operation:
        DATABASE_OPERATION.DROP_DATABASE,

      accessMode:
        DATABASE_ACCESS_MODE.ADMIN,

      authenticated: true,
      authorized: true,

      writeAuthorized: true,
      adminAuthorized: true,

      environment:
        DATABASE_ENVIRONMENT.PRODUCTION,
    });

  check(
    dropDatabase.allowed ===
      false,
    "DROP_DATABASE is forbidden by database security service"
  );

  check(
    dropDatabase.reason ===
      DATABASE_DENIAL_REASON
        .DESTRUCTIVE_OPERATION_FORBIDDEN,
    "DROP_DATABASE denial reason is explicit"
  );

  // ============================================================
  // R. DATABASE UNAVAILABLE
  // ============================================================

  section(
    "R. Database unavailable"
  );

  const unavailable =
    evaluateDatabaseAccess({
      operation:
        DATABASE_OPERATION.FIND,

      accessMode:
        DATABASE_ACCESS_MODE.READ,

      authenticated: true,
      authorized: true,

      databaseAvailable: false,
    });

  check(
    unavailable.decision ===
      DATABASE_DECISION.UNAVAILABLE,
    "database failure is represented as UNAVAILABLE"
  );

  check(
    unavailable.allowed ===
      false,
    "unavailable database never becomes successful access"
  );

  check(
    unavailable.reason ===
      DATABASE_DENIAL_REASON
        .DATABASE_UNAVAILABLE,
    "database unavailable reason is explicit"
  );

  // ============================================================
  // S. UNKNOWN OPERATION
  // ============================================================

  section(
    "S. Unknown operation"
  );

  const unknownOperation =
    evaluateDatabaseAccess({
      operation:
        "EXECUTE_SHELL",

      accessMode:
        DATABASE_ACCESS_MODE.ADMIN,

      authenticated: true,
      authorized: true,

      writeAuthorized: true,
      adminAuthorized: true,
    });

  check(
    unknownOperation.allowed ===
      false,
    "unknown database operation is denied"
  );

  check(
    unknownOperation.reason ===
      DATABASE_DENIAL_REASON
        .INVALID_OPERATION,
    "unknown database operation reason is explicit"
  );

  // ============================================================
  // T. UNKNOWN ACCESS MODE
  // ============================================================

  section(
    "T. Unknown access mode"
  );

  const unknownAccessMode =
    evaluateDatabaseAccess({
      operation:
        DATABASE_OPERATION.FIND,

      accessMode:
        "SUPERADMIN",

      authenticated: true,
      authorized: true,
    });

  check(
    unknownAccessMode.allowed ===
      false,
    "unknown database access mode is denied"
  );

  check(
    unknownAccessMode.reason ===
      DATABASE_DENIAL_REASON
        .INVALID_ACCESS_MODE,
    "unknown access-mode reason is explicit"
  );

  // ============================================================
  // U. INVALID ENVIRONMENT
  // ============================================================

  section(
    "U. Invalid environment"
  );

  const invalidEnvironment =
    evaluateDatabaseAccess({
      operation:
        DATABASE_OPERATION.FIND,

      accessMode:
        DATABASE_ACCESS_MODE.READ,

      environment:
        "UNKNOWN",

      authenticated: true,
      authorized: true,
    });

  check(
    invalidEnvironment.allowed ===
      false,
    "unknown database environment is denied"
  );

  check(
    invalidEnvironment.reason ===
      DATABASE_DENIAL_REASON
        .INVALID_ENVIRONMENT,
    "invalid database environment reason is explicit"
  );

  // ============================================================
  // V. RESULT CONTRACT
  // ============================================================

  section(
    "V. Result contract"
  );

  check(
    readAccess.phase ===
      "13.11",
    "database result preserves phase"
  );

  check(
    readAccess.layer ===
      "DATABASE_SECURITY",
    "database result preserves layer"
  );

  check(
    readAccess.authorizationGrantedByDatabaseLayer ===
      false,
    "database layer never grants authorization itself"
  );

  check(
    readAccess.databaseMutationExecuted ===
      false,
    "database security result executes no database mutation"
  );

  check(
    readAccess.indexMutationExecuted ===
      false,
    "database security result executes no index mutation"
  );

  check(
    readAccess.retentionPolicyMutationExecuted ===
      false,
    "database security result executes no retention-policy mutation"
  );

  // ============================================================
  // W. INVALID DECISION
  // ============================================================

  section(
    "W. Invalid decision"
  );

  let invalidDecisionRejected =
    false;

  try {
    createDatabaseSecurityDecision({
      decision:
        "INVALID",
    });
  } catch {
    invalidDecisionRejected =
      true;
  }

  check(
    invalidDecisionRejected,
    "unsupported database decision is rejected"
  );

  // ============================================================
  // X. SAFETY BOUNDARY
  // ============================================================

  section(
    "X. Safety boundary"
  );

  check(
    readAccess.equipmentControlExecuted ===
      false,
    "database security executes no equipment control"
  );

  check(
    readAccess.autoDispatchExecuted ===
      false,
    "database security executes no auto-dispatch"
  );

  check(
    unavailable.equipmentControlExecuted ===
      false,
    "database failure executes no equipment control"
  );

  check(
    unavailable.autoDispatchExecuted ===
      false,
    "database failure executes no auto-dispatch"
  );

  check(
    dropDatabase.databaseMutationExecuted ===
      false,
    "forbidden destructive operation executes no database mutation"
  );

  // ============================================================
  // Y. FROZEN STRUCTURES
  // ============================================================

  section(
    "Y. Frozen structures"
  );

  check(
    Object.isFrozen(
      DATABASE_ENVIRONMENT
    ),
    "database environment taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DATABASE_ACCESS_MODE
    ),
    "database access-mode taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DATABASE_OPERATION
    ),
    "database operation taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DATABASE_DECISION
    ),
    "database decision taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DATABASE_DENIAL_REASON
    ),
    "database denial taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DATABASE_READ_OPERATIONS
    ),
    "database read-operation registry is frozen"
  );

  check(
    Object.isFrozen(
      DATABASE_WRITE_OPERATIONS
    ),
    "database write-operation registry is frozen"
  );

  check(
    Object.isFrozen(
      DATABASE_DESTRUCTIVE_OPERATIONS
    ),
    "database destructive-operation registry is frozen"
  );

  check(
    Object.isFrozen(
      DATABASE_SECURITY_INVARIANTS
    ),
    "database security invariants are frozen"
  );

  check(
    Object.isFrozen(
      readAccess
    ),
    "database security decision is frozen"
  );

  check(
    Object.isFrozen(
      productionUri
    ),
    "database URI validation result is frozen"
  );

  check(
    Object.isFrozen(
      productionUri.errors
    ),
    "database URI validation errors are frozen"
  );

  // ============================================================
  // FINAL
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.11 DATABASE SECURITY CONTROLS RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Database credentials      : SECRET"
  );

  console.log(
    "Database URI logging      : FORBIDDEN"
  );

  console.log(
    "Production transport      : ENCRYPTED / SRV REQUIRED"
  );

  console.log(
    "Database privilege        : LEAST PRIVILEGE"
  );

  console.log(
    "Read access               : EXPLICITLY AUTHORIZED"
  );

  console.log(
    "Write access              : EXPLICIT WRITE PERMISSION"
  );

  console.log(
    "Destructive operations    : FORBIDDEN"
  );

  console.log(
    "Database unavailable      : NOT ALLOWED"
  );

  console.log(
    "Unknown operations        : DENIED"
  );

  console.log(
    "Database mutation here    : NONE"
  );

  console.log(
    "Index mutation here       : NONE"
  );

  console.log(
    "Retention-policy mutation : NONE"
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
    "ASHMAAN PHASE 13.11 DATABASE SECURITY CONTROLS VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.11 DATABASE SECURITY CONTROLS VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}