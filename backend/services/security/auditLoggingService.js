// ASHMAAN Phase 13.9
// Audit Logging Service

export const AUDIT_LOGGING_PHASE =
  "13.9";

export const AUDIT_LOGGING_LAYER =
  "AUDIT_LOGGING";

// ============================================================
// EVENT TAXONOMY
// ============================================================

export const AUDIT_EVENT_CATEGORY =
  Object.freeze({
    AUTHENTICATION:
      "AUTHENTICATION",

    AUTHORIZATION:
      "AUTHORIZATION",

    SECURITY_CONFIGURATION:
      "SECURITY_CONFIGURATION",

    USER_MANAGEMENT:
      "USER_MANAGEMENT",

    DATA_ACCESS:
      "DATA_ACCESS",

    DATA_MUTATION:
      "DATA_MUTATION",

    SYSTEM:
      "SYSTEM",
  });

export const AUDIT_EVENT_OUTCOME =
  Object.freeze({
    SUCCESS:
      "SUCCESS",

    FAILURE:
      "FAILURE",

    DENIED:
      "DENIED",

    UNAVAILABLE:
      "UNAVAILABLE",
  });

export const AUDIT_ACTOR_TYPE =
  Object.freeze({
    USER:
      "USER",

    SERVICE:
      "SERVICE",

    SYSTEM:
      "SYSTEM",

    UNKNOWN:
      "UNKNOWN",
  });

// ============================================================
// SENSITIVE FIELD POLICY
// ============================================================

export const AUDIT_SENSITIVE_FIELD_NAMES =
  Object.freeze([
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
  ]);

export const AUDIT_REDACTION_VALUE =
  "[REDACTED]";

// ============================================================
// INVARIANTS
// ============================================================

export const AUDIT_LOGGING_INVARIANTS =
  Object.freeze({
    securityRelevantActionsMustBeAuditable:
      true,

    actorMustBeExplicit:
      true,

    actionMustBeExplicit:
      true,

    resourceMustBeExplicit:
      true,

    outcomeMustBeExplicit:
      true,

    timestampMustBeExplicit:
      true,

    rawPasswordsMustNotBeLogged:
      true,

    passwordHashesMustNotBeLogged:
      true,

    accessTokensMustNotBeLogged:
      true,

    refreshTokensMustNotBeLogged:
      true,

    authorizationHeadersMustNotBeLogged:
      true,

    secretsMustNotBeLogged:
      true,

    auditRecordMustNotMutateInput:
      true,

    auditRecordMustBeImmutable:
      true,

    auditFailureMustNotGrantAuthorization:
      true,

    auditLoggingMustNotExecuteEquipmentControl:
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
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function normalizeActorType(value) {
  return typeof value === "string"
    ? value.trim().toUpperCase()
    : "";
}

function normalizeCategory(value) {
  return typeof value === "string"
    ? value.trim().toUpperCase()
    : "";
}

function normalizeOutcome(value) {
  return typeof value === "string"
    ? value.trim().toUpperCase()
    : "";
}

function isSensitiveFieldName(key) {
  if (typeof key !== "string") {
    return false;
  }

  const normalized =
    key.toLowerCase();

  return AUDIT_SENSITIVE_FIELD_NAMES
    .some(
      (field) =>
        field.toLowerCase() ===
        normalized
    );
}

export function redactAuditMetadata(
  value
) {
  if (Array.isArray(value)) {
    return value.map(
      (item) =>
        redactAuditMetadata(item)
    );
  }

  if (isPlainObject(value)) {
    const result = {};

    for (
      const [
        key,
        nestedValue,
      ] of Object.entries(value)
    ) {
      if (
        isSensitiveFieldName(key)
      ) {
        result[key] =
          AUDIT_REDACTION_VALUE;

        continue;
      }

      result[key] =
        redactAuditMetadata(
          nestedValue
        );
    }

    return result;
  }

  return value;
}

// ============================================================
// CONTRACT VALIDATION
// ============================================================

export function validateAuditEventInput({
  category,
  action,
  actor,
  resource,
  outcome,
  timestamp,
  metadata = {},
} = {}) {
  const errors = [];

  const normalizedCategory =
    normalizeCategory(category);

  const normalizedOutcome =
    normalizeOutcome(outcome);

  if (
    !Object.values(
      AUDIT_EVENT_CATEGORY
    ).includes(
      normalizedCategory
    )
  ) {
    errors.push(
      "INVALID_CATEGORY"
    );
  }

  if (
    !isNonEmptyString(action)
  ) {
    errors.push(
      "INVALID_ACTION"
    );
  }

  if (
    !isPlainObject(actor)
  ) {
    errors.push(
      "INVALID_ACTOR"
    );
  } else {
    const actorType =
      normalizeActorType(
        actor.type
      );

    if (
      !Object.values(
        AUDIT_ACTOR_TYPE
      ).includes(
        actorType
      )
    ) {
      errors.push(
        "INVALID_ACTOR_TYPE"
      );
    }

    if (
      actorType !==
        AUDIT_ACTOR_TYPE.UNKNOWN &&
      !isNonEmptyString(
        actor.id
      )
    ) {
      errors.push(
        "INVALID_ACTOR_ID"
      );
    }
  }

  if (
    !isPlainObject(resource) ||
    !isNonEmptyString(
      resource.type
    ) ||
    !isNonEmptyString(
      resource.id
    )
  ) {
    errors.push(
      "INVALID_RESOURCE"
    );
  }

  if (
    !Object.values(
      AUDIT_EVENT_OUTCOME
    ).includes(
      normalizedOutcome
    )
  ) {
    errors.push(
      "INVALID_OUTCOME"
    );
  }

  const parsedTimestamp =
    timestamp instanceof Date
      ? timestamp
      : new Date(timestamp);

  if (
    Number.isNaN(
      parsedTimestamp.getTime()
    )
  ) {
    errors.push(
      "INVALID_TIMESTAMP"
    );
  }

  if (
    !isPlainObject(metadata)
  ) {
    errors.push(
      "INVALID_METADATA"
    );
  }

  return Object.freeze({
    phase:
      AUDIT_LOGGING_PHASE,

    layer:
      AUDIT_LOGGING_LAYER,

    valid:
      errors.length === 0,

    errors:
      Object.freeze([
        ...errors,
      ]),

    invariants:
      AUDIT_LOGGING_INVARIANTS,
  });
}

// ============================================================
// AUDIT EVENT BUILDER
// ============================================================

export function createAuditEvent({
  eventId,
  category,
  action,
  actor,
  resource,
  outcome,
  timestamp,
  metadata = {},
} = {}) {
  const validation =
    validateAuditEventInput({
      category,
      action,
      actor,
      resource,
      outcome,
      timestamp,
      metadata,
    });

  if (!validation.valid) {
    return Object.freeze({
      phase:
        AUDIT_LOGGING_PHASE,

      layer:
        AUDIT_LOGGING_LAYER,

      valid: false,

      event: null,

      errors:
        validation.errors,

      authorizationGranted:
        false,

      equipmentControlExecuted:
        false,

      autoDispatchExecuted:
        false,

      invariants:
        AUDIT_LOGGING_INVARIANTS,
    });
  }

  const safeMetadata =
    redactAuditMetadata(
      metadata
    );

  const normalizedActorType =
    normalizeActorType(
      actor.type
    );

  const event = Object.freeze({
    eventId:
      isNonEmptyString(
        eventId
      )
        ? eventId
        : null,

    category:
      normalizeCategory(
        category
      ),

    action:
      action.trim(),

    actor:
      Object.freeze({
        id:
          normalizedActorType ===
            AUDIT_ACTOR_TYPE.UNKNOWN
            ? null
            : actor.id.trim(),

        type:
          normalizedActorType,
      }),

    resource:
      Object.freeze({
        type:
          resource.type.trim(),

        id:
          resource.id.trim(),
      }),

    outcome:
      normalizeOutcome(
        outcome
      ),

    timestamp:
      new Date(
        timestamp
      ).toISOString(),

    metadata:
      Object.freeze(
        safeMetadata
      ),
  });

  return Object.freeze({
    phase:
      AUDIT_LOGGING_PHASE,

    layer:
      AUDIT_LOGGING_LAYER,

    valid: true,

    event,

    errors:
      Object.freeze([]),

    authorizationGranted:
      false,

    equipmentControlExecuted:
      false,

    autoDispatchExecuted:
      false,

    invariants:
      AUDIT_LOGGING_INVARIANTS,
  });
}

export default createAuditEvent;