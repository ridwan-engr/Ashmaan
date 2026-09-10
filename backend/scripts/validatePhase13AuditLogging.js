import assert from "node:assert/strict";

import {
  AUDIT_LOGGING_PHASE,
  AUDIT_LOGGING_LAYER,
  AUDIT_EVENT_CATEGORY,
  AUDIT_EVENT_OUTCOME,
  AUDIT_ACTOR_TYPE,
  AUDIT_SENSITIVE_FIELD_NAMES,
  AUDIT_REDACTION_VALUE,
  AUDIT_LOGGING_INVARIANTS,
  redactAuditMetadata,
  validateAuditEventInput,
  createAuditEvent,
} from "../services/security/auditLoggingService.js";

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
  "ASHMAAN PHASE 13.9 — AUDIT LOGGING VALIDATION"
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
    AUDIT_LOGGING_PHASE ===
      "13.9",
    "phase identity is 13.9"
  );

  check(
    AUDIT_LOGGING_LAYER ===
      "AUDIT_LOGGING",
    "layer identity is AUDIT_LOGGING"
  );

  // ============================================================
  // B. CATEGORY TAXONOMY
  // ============================================================

  section(
    "B. Audit category taxonomy"
  );

  const requiredCategories = [
    "AUTHENTICATION",
    "AUTHORIZATION",
    "SECURITY_CONFIGURATION",
    "USER_MANAGEMENT",
    "DATA_ACCESS",
    "DATA_MUTATION",
    "SYSTEM",
  ];

  for (
    const category of
      requiredCategories
  ) {
    check(
      Object.values(
        AUDIT_EVENT_CATEGORY
      ).includes(
        category
      ),
      `audit category exists: ${category}`
    );
  }

  // ============================================================
  // C. OUTCOME TAXONOMY
  // ============================================================

  section(
    "C. Audit outcome taxonomy"
  );

  for (
    const outcome of [
      "SUCCESS",
      "FAILURE",
      "DENIED",
      "UNAVAILABLE",
    ]
  ) {
    check(
      Object.values(
        AUDIT_EVENT_OUTCOME
      ).includes(
        outcome
      ),
      `audit outcome exists: ${outcome}`
    );
  }

  // ============================================================
  // D. ACTOR TAXONOMY
  // ============================================================

  section(
    "D. Actor taxonomy"
  );

  for (
    const actorType of [
      "USER",
      "SERVICE",
      "SYSTEM",
      "UNKNOWN",
    ]
  ) {
    check(
      Object.values(
        AUDIT_ACTOR_TYPE
      ).includes(
        actorType
      ),
      `audit actor type exists: ${actorType}`
    );
  }

  // ============================================================
  // E. SENSITIVE FIELD POLICY
  // ============================================================

  section(
    "E. Sensitive-field policy"
  );

  const requiredSensitiveFields = [
    "password",
    "passwordHash",
    "token",
    "accessToken",
    "refreshToken",
    "authorization",
    "cookie",
    "secret",
    "jwt",
    "apiKey",
    "privateKey",
  ];

  for (
    const field of
      requiredSensitiveFields
  ) {
    check(
      AUDIT_SENSITIVE_FIELD_NAMES.includes(
        field
      ),
      `sensitive audit field registered: ${field}`
    );
  }

  check(
    AUDIT_REDACTION_VALUE ===
      "[REDACTED]",
    "audit redaction marker is explicit"
  );

  // ============================================================
  // F. INVARIANTS
  // ============================================================

  section(
    "F. Core audit invariants"
  );

  const invariantNames = [
    "securityRelevantActionsMustBeAuditable",
    "actorMustBeExplicit",
    "actionMustBeExplicit",
    "resourceMustBeExplicit",
    "outcomeMustBeExplicit",
    "timestampMustBeExplicit",
    "rawPasswordsMustNotBeLogged",
    "passwordHashesMustNotBeLogged",
    "accessTokensMustNotBeLogged",
    "refreshTokensMustNotBeLogged",
    "authorizationHeadersMustNotBeLogged",
    "secretsMustNotBeLogged",
    "auditRecordMustNotMutateInput",
    "auditRecordMustBeImmutable",
    "auditFailureMustNotGrantAuthorization",
    "auditLoggingMustNotExecuteEquipmentControl",
    "optimizationDssRemainsNonExecutable",
    "optimizationDssAutoDispatchRemainsDisabled",
  ];

  for (
    const name of
      invariantNames
  ) {
    check(
      AUDIT_LOGGING_INVARIANTS[
        name
      ] === true,
      `audit invariant enforced: ${name}`
    );
  }

  // ============================================================
  // G. VALID EVENT INPUT
  // ============================================================

  section(
    "G. Valid audit-event input"
  );

  const validInput =
    validateAuditEventInput({
      category:
        AUDIT_EVENT_CATEGORY
          .AUTHORIZATION,

      action:
        "READ_AUDIT_LOG",

      actor: {
        id: "user-123",
        type:
          AUDIT_ACTOR_TYPE.USER,
      },

      resource: {
        type: "audit-log",
        id: "security",
      },

      outcome:
        AUDIT_EVENT_OUTCOME
          .SUCCESS,

      timestamp:
        "2026-09-10T15:00:00.000Z",

      metadata: {
        source: "api",
      },
    });

  check(
    validInput.valid === true,
    "valid audit-event input is accepted"
  );

  check(
    validInput.errors.length ===
      0,
    "valid audit-event input reports zero errors"
  );

  // ============================================================
  // H. EVENT CREATION
  // ============================================================

  section(
    "H. Audit-event creation"
  );

  const result =
    createAuditEvent({
      eventId:
        "audit-001",

      category:
        "authorization",

      action:
        "READ_AUDIT_LOG",

      actor: {
        id: "user-123",
        type: "user",
      },

      resource: {
        type: "audit-log",
        id: "security",
      },

      outcome:
        "success",

      timestamp:
        "2026-09-10T15:00:00.000Z",

      metadata: {
        source: "api",
      },
    });

  check(
    result.valid === true,
    "valid audit event is created"
  );

  check(
    result.event !== null,
    "valid result contains audit event"
  );

  check(
    result.event.category ===
      "AUTHORIZATION",
    "audit category is normalized"
  );

  check(
    result.event.actor.type ===
      "USER",
    "audit actor type is normalized"
  );

  check(
    result.event.outcome ===
      "SUCCESS",
    "audit outcome is normalized"
  );

  check(
    result.event.action ===
      "READ_AUDIT_LOG",
    "audit action is preserved"
  );

  check(
    result.event.resource.type ===
      "audit-log",
    "audit resource type is preserved"
  );

  check(
    result.event.resource.id ===
      "security",
    "audit resource id is preserved"
  );

  check(
    result.event.timestamp ===
      "2026-09-10T15:00:00.000Z",
    "audit timestamp is normalized to ISO"
  );

  // ============================================================
  // I. SECRET REDACTION
  // ============================================================

  section(
    "I. Sensitive metadata redaction"
  );

  const sensitiveMetadata = {
    username:
      "operator@example.com",

    password:
      "super-secret-password",

    passwordHash:
      "$2b$10$hash",

    accessToken:
      "access-token-value",

    refreshToken:
      "refresh-token-value",

    authorization:
      "Bearer abc123",

    secret:
      "internal-secret",

    nested: {
      apiKey:
        "api-key-value",

      safe:
        "preserve-this",
    },
  };

  const redacted =
    redactAuditMetadata(
      sensitiveMetadata
    );

  check(
    redacted.password ===
      AUDIT_REDACTION_VALUE,
    "raw password is redacted"
  );

  check(
    redacted.passwordHash ===
      AUDIT_REDACTION_VALUE,
    "password hash is redacted"
  );

  check(
    redacted.accessToken ===
      AUDIT_REDACTION_VALUE,
    "access token is redacted"
  );

  check(
    redacted.refreshToken ===
      AUDIT_REDACTION_VALUE,
    "refresh token is redacted"
  );

  check(
    redacted.authorization ===
      AUDIT_REDACTION_VALUE,
    "authorization header is redacted"
  );

  check(
    redacted.secret ===
      AUDIT_REDACTION_VALUE,
    "secret value is redacted"
  );

  check(
    redacted.nested.apiKey ===
      AUDIT_REDACTION_VALUE,
    "nested API key is redacted"
  );

  check(
    redacted.nested.safe ===
      "preserve-this",
    "non-sensitive nested metadata is preserved"
  );

  // ============================================================
  // J. EVENT REDACTION
  // ============================================================

  section(
    "J. Redaction inside audit event"
  );

  const sensitiveEvent =
    createAuditEvent({
      category:
        AUDIT_EVENT_CATEGORY
          .AUTHENTICATION,

      action:
        "LOGIN_ATTEMPT",

      actor: {
        id: "user-123",
        type:
          AUDIT_ACTOR_TYPE.USER,
      },

      resource: {
        type: "session",
        id: "login",
      },

      outcome:
        AUDIT_EVENT_OUTCOME
          .FAILURE,

      timestamp:
        "2026-09-10T15:10:00.000Z",

      metadata:
        sensitiveMetadata,
    });

  check(
    sensitiveEvent.valid === true,
    "event containing sensitive metadata is safely created"
  );

  check(
    sensitiveEvent.event.metadata
      .password ===
      AUDIT_REDACTION_VALUE,
    "event stores redacted password"
  );

  check(
    sensitiveEvent.event.metadata
      .accessToken ===
      AUDIT_REDACTION_VALUE,
    "event stores redacted access token"
  );

  check(
    sensitiveEvent.event.metadata
      .nested.apiKey ===
      AUDIT_REDACTION_VALUE,
    "event stores redacted nested API key"
  );

  // ============================================================
  // K. INPUT IMMUTABILITY
  // ============================================================

  section(
    "K. Input immutability"
  );

  const originalMetadata = {
    safe: "value",
    token: "secret-token",
  };

  const originalSnapshot =
    JSON.stringify(
      originalMetadata
    );

  createAuditEvent({
    category:
      AUDIT_EVENT_CATEGORY
        .SYSTEM,

    action:
      "SECURITY_CHECK",

    actor: {
      id: "system",
      type:
        AUDIT_ACTOR_TYPE.SYSTEM,
    },

    resource: {
      type: "security",
      id: "phase13",
    },

    outcome:
      AUDIT_EVENT_OUTCOME
        .SUCCESS,

    timestamp:
      "2026-09-10T15:20:00.000Z",

    metadata:
      originalMetadata,
  });

  check(
    JSON.stringify(
      originalMetadata
    ) ===
      originalSnapshot,
    "audit-event creation does not mutate input metadata"
  );

  check(
    originalMetadata.token ===
      "secret-token",
    "source metadata remains unchanged after redaction"
  );

  // ============================================================
  // L. UNKNOWN ACTOR
  // ============================================================

  section(
    "L. Unknown actor handling"
  );

  const unknownActor =
    createAuditEvent({
      category:
        AUDIT_EVENT_CATEGORY
          .AUTHENTICATION,

      action:
        "INVALID_TOKEN",

      actor: {
        type:
          AUDIT_ACTOR_TYPE.UNKNOWN,
      },

      resource: {
        type: "authentication",
        id: "access-token",
      },

      outcome:
        AUDIT_EVENT_OUTCOME
          .DENIED,

      timestamp:
        "2026-09-10T15:30:00.000Z",
    });

  check(
    unknownActor.valid === true,
    "explicit UNKNOWN actor is permitted"
  );

  check(
    unknownActor.event.actor.id ===
      null,
    "UNKNOWN actor does not invent identity"
  );

  check(
    unknownActor.event.actor.type ===
      "UNKNOWN",
    "UNKNOWN actor type is explicit"
  );

  // ============================================================
  // M. INVALID CATEGORY
  // ============================================================

  section(
    "M. Invalid category"
  );

  const invalidCategory =
    validateAuditEventInput({
      category:
        "UNKNOWN_CATEGORY",

      action:
        "ACTION",

      actor: {
        id: "system",
        type: "SYSTEM",
      },

      resource: {
        type: "security",
        id: "test",
      },

      outcome:
        "SUCCESS",

      timestamp:
        "2026-09-10T15:40:00.000Z",
    });

  check(
    invalidCategory.valid ===
      false,
    "unknown audit category is rejected"
  );

  check(
    invalidCategory.errors.includes(
      "INVALID_CATEGORY"
    ),
    "invalid audit category is explicit"
  );

  // ============================================================
  // N. INVALID ACTOR
  // ============================================================

  section(
    "N. Invalid actor"
  );

  const missingActorId =
    validateAuditEventInput({
      category:
        "AUTHORIZATION",

      action:
        "MANAGE_SECURITY",

      actor: {
        type: "USER",
      },

      resource: {
        type: "security",
        id: "policy",
      },

      outcome:
        "SUCCESS",

      timestamp:
        "2026-09-10T15:50:00.000Z",
    });

  check(
    missingActorId.valid ===
      false,
    "identified actor without id is rejected"
  );

  check(
    missingActorId.errors.includes(
      "INVALID_ACTOR_ID"
    ),
    "missing actor id rejection is explicit"
  );

  const invalidActorType =
    validateAuditEventInput({
      category:
        "AUTHORIZATION",

      action:
        "MANAGE_SECURITY",

      actor: {
        id: "user-123",
        type: "SUPERUSER",
      },

      resource: {
        type: "security",
        id: "policy",
      },

      outcome:
        "SUCCESS",

      timestamp:
        "2026-09-10T15:50:00.000Z",
    });

  check(
    invalidActorType.valid ===
      false,
    "unknown actor type is rejected"
  );

  check(
    invalidActorType.errors.includes(
      "INVALID_ACTOR_TYPE"
    ),
    "invalid actor type rejection is explicit"
  );

  // ============================================================
  // O. INVALID RESOURCE
  // ============================================================

  section(
    "O. Invalid resource"
  );

  const invalidResource =
    validateAuditEventInput({
      category:
        "DATA_ACCESS",

      action:
        "READ",

      actor: {
        id: "user-123",
        type: "USER",
      },

      resource: {
        type: "telemetry",
      },

      outcome:
        "SUCCESS",

      timestamp:
        "2026-09-10T16:00:00.000Z",
    });

  check(
    invalidResource.valid ===
      false,
    "resource without id is rejected"
  );

  check(
    invalidResource.errors.includes(
      "INVALID_RESOURCE"
    ),
    "invalid resource rejection is explicit"
  );

  // ============================================================
  // P. INVALID OUTCOME
  // ============================================================

  section(
    "P. Invalid outcome"
  );

  const invalidOutcome =
    validateAuditEventInput({
      category:
        "DATA_ACCESS",

      action:
        "READ",

      actor: {
        id: "user-123",
        type: "USER",
      },

      resource: {
        type: "telemetry",
        id: "39996",
      },

      outcome:
        "UNKNOWN",

      timestamp:
        "2026-09-10T16:10:00.000Z",
    });

  check(
    invalidOutcome.valid ===
      false,
    "unknown audit outcome is rejected"
  );

  check(
    invalidOutcome.errors.includes(
      "INVALID_OUTCOME"
    ),
    "invalid audit outcome is explicit"
  );

  // ============================================================
  // Q. INVALID TIMESTAMP
  // ============================================================

  section(
    "Q. Invalid timestamp"
  );

  const invalidTimestamp =
    validateAuditEventInput({
      category:
        "SYSTEM",

      action:
        "CHECK",

      actor: {
        id: "system",
        type: "SYSTEM",
      },

      resource: {
        type: "security",
        id: "phase13",
      },

      outcome:
        "SUCCESS",

      timestamp:
        "not-a-date",
    });

  check(
    invalidTimestamp.valid ===
      false,
    "malformed timestamp is rejected"
  );

  check(
    invalidTimestamp.errors.includes(
      "INVALID_TIMESTAMP"
    ),
    "invalid timestamp rejection is explicit"
  );

  // ============================================================
  // R. INVALID EVENT FAILS CLOSED
  // ============================================================

  section(
    "R. Invalid audit event behavior"
  );

  const invalidEvent =
    createAuditEvent({
      category:
        "INVALID",

      action:
        "",

      actor:
        null,

      resource:
        null,

      outcome:
        "INVALID",

      timestamp:
        "bad-date",
    });

  check(
    invalidEvent.valid ===
      false,
    "invalid audit event is rejected"
  );

  check(
    invalidEvent.event ===
      null,
    "invalid audit event creates no partial event"
  );

  check(
    invalidEvent.authorizationGranted ===
      false,
    "audit failure never grants authorization"
  );

  // ============================================================
  // S. SAFETY BOUNDARY
  // ============================================================

  section(
    "S. Safety boundary"
  );

  check(
    result
      .equipmentControlExecuted ===
      false,
    "audit logging executes no equipment control"
  );

  check(
    result
      .autoDispatchExecuted ===
      false,
    "audit logging executes no auto-dispatch"
  );

  check(
    invalidEvent
      .equipmentControlExecuted ===
      false,
    "audit failure executes no equipment control"
  );

  check(
    invalidEvent
      .autoDispatchExecuted ===
      false,
    "audit failure executes no auto-dispatch"
  );

  // ============================================================
  // T. RESULT CONTRACT
  // ============================================================

  section(
    "T. Result contract"
  );

  check(
    result.phase ===
      "13.9",
    "audit result preserves phase"
  );

  check(
    result.layer ===
      "AUDIT_LOGGING",
    "audit result preserves layer"
  );

  check(
    result.errors.length ===
      0,
    "successful audit result has zero errors"
  );

  // ============================================================
  // U. FROZEN STRUCTURES
  // ============================================================

  section(
    "U. Frozen structures"
  );

  check(
    Object.isFrozen(
      AUDIT_EVENT_CATEGORY
    ),
    "audit category taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      AUDIT_EVENT_OUTCOME
    ),
    "audit outcome taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      AUDIT_ACTOR_TYPE
    ),
    "audit actor taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      AUDIT_SENSITIVE_FIELD_NAMES
    ),
    "sensitive-field registry is frozen"
  );

  check(
    Object.isFrozen(
      AUDIT_LOGGING_INVARIANTS
    ),
    "audit invariants are frozen"
  );

  check(
    Object.isFrozen(
      result
    ),
    "audit result is frozen"
  );

  check(
    Object.isFrozen(
      result.event
    ),
    "audit event is frozen"
  );

  check(
    Object.isFrozen(
      result.event.actor
    ),
    "audit actor structure is frozen"
  );

  check(
    Object.isFrozen(
      result.event.resource
    ),
    "audit resource structure is frozen"
  );

  check(
    Object.isFrozen(
      result.event.metadata
    ),
    "audit metadata structure is frozen"
  );

  // ============================================================
  // FINAL
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.9 AUDIT LOGGING RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Security actions        : AUDITABLE"
  );

  console.log(
    "Actor identity          : EXPLICIT"
  );

  console.log(
    "Action                  : EXPLICIT"
  );

  console.log(
    "Resource                : EXPLICIT"
  );

  console.log(
    "Outcome                 : EXPLICIT"
  );

  console.log(
    "Timestamp               : EXPLICIT"
  );

  console.log(
    "Passwords               : REDACTED"
  );

  console.log(
    "Tokens                  : REDACTED"
  );

  console.log(
    "Authorization headers   : REDACTED"
  );

  console.log(
    "Secrets                 : REDACTED"
  );

  console.log(
    "Invalid audit event     : REJECTED"
  );

  console.log(
    "Authorization on failure: NOT GRANTED"
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
    "ASHMAAN PHASE 13.9 AUDIT LOGGING VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.9 AUDIT LOGGING VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}