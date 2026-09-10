// ASHMAAN Phase 13.1
// Security Hardening Contract
//
// Purpose:
// Define the security boundaries, control families, invariants,
// responsibilities, and prohibited behaviors for Phase 13.
//
// IMPORTANT:
// - Contract only.
// - No authentication implementation.
// - No authorization implementation.
// - No secret rotation.
// - No database mutation.
// - No external security scanner execution.
// - No automatic control/equipment action.

export const SECURITY_HARDENING_CONTRACT_PHASE = "13.1";

export const SECURITY_HARDENING_CONTRACT_LAYER =
  "SECURITY_HARDENING";

export const SECURITY_HARDENING_CONTRACT_UPSTREAM_LAYER =
  "END_TO_END_SYSTEM_INTEGRATION";

export const SECURITY_HARDENING_CONTRACT_DOWNSTREAM_LAYER =
  null;

export const SECURITY_HARDENING_CONTRACT_VERSION =
  "1.0.0";

// ============================================================
// SECURITY OBJECTIVES
// ============================================================

export const SECURITY_OBJECTIVES = Object.freeze({
  CONFIDENTIALITY: "CONFIDENTIALITY",
  INTEGRITY: "INTEGRITY",
  AVAILABILITY: "AVAILABILITY",
  AUTHENTICITY: "AUTHENTICITY",
  ACCOUNTABILITY: "ACCOUNTABILITY",
  LEAST_PRIVILEGE: "LEAST_PRIVILEGE",
  DEFENSE_IN_DEPTH: "DEFENSE_IN_DEPTH",
  FAIL_SAFE_DEFAULTS: "FAIL_SAFE_DEFAULTS",
});

// ============================================================
// TRUST BOUNDARIES
// ============================================================

export const SECURITY_TRUST_BOUNDARIES = Object.freeze({
  PUBLIC_CLIENT: "PUBLIC_CLIENT",
  AUTHENTICATED_CLIENT: "AUTHENTICATED_CLIENT",
  FRONTEND_APPLICATION: "FRONTEND_APPLICATION",
  BACKEND_API: "BACKEND_API",
  DATABASE: "DATABASE",
  VRM_EXTERNAL_SERVICE: "VRM_EXTERNAL_SERVICE",
  SCHEDULER: "SCHEDULER",
  INTERNAL_SERVICE: "INTERNAL_SERVICE",
  ADMINISTRATIVE_OPERATOR: "ADMINISTRATIVE_OPERATOR",
});

// ============================================================
// SECURITY CONTROL FAMILIES
// ============================================================

export const SECURITY_CONTROL_FAMILIES = Object.freeze({
  ENVIRONMENT_AND_SECRETS:
    "ENVIRONMENT_AND_SECRETS",

  AUTHENTICATION:
    "AUTHENTICATION",

  AUTHORIZATION_AND_RBAC:
    "AUTHORIZATION_AND_RBAC",

  INPUT_VALIDATION:
    "INPUT_VALIDATION",

  RATE_LIMITING_AND_ABUSE_PROTECTION:
    "RATE_LIMITING_AND_ABUSE_PROTECTION",

  HTTP_SECURITY_HEADERS:
    "HTTP_SECURITY_HEADERS",

  CORS:
    "CORS",

  AUDIT_LOGGING:
    "AUDIT_LOGGING",

  SENSITIVE_DATA_REDACTION:
    "SENSITIVE_DATA_REDACTION",

  DATABASE_SECURITY:
    "DATABASE_SECURITY",

  SESSION_AND_TOKEN_SECURITY:
    "SESSION_AND_TOKEN_SECURITY",

  SECURITY_ERROR_HANDLING:
    "SECURITY_ERROR_HANDLING",

  DEPENDENCY_SECURITY:
    "DEPENDENCY_SECURITY",

  RUNTIME_SECURITY_VALIDATION:
    "RUNTIME_SECURITY_VALIDATION",
});

// ============================================================
// IDENTITY CLASSES
// ============================================================

export const SECURITY_IDENTITY_CLASSES = Object.freeze({
  ANONYMOUS: "ANONYMOUS",
  USER: "USER",
  OPERATOR: "OPERATOR",
  ADMINISTRATOR: "ADMINISTRATOR",
  SERVICE: "SERVICE",
  SYSTEM: "SYSTEM",
});

// ============================================================
// RESOURCE ACCESS MODES
// ============================================================

export const SECURITY_ACCESS_MODES = Object.freeze({
  READ: "READ",
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  EXECUTE: "EXECUTE",
  ADMINISTER: "ADMINISTER",
});

// ============================================================
// SECURITY DECISION STATES
// ============================================================

export const SECURITY_DECISION_STATES = Object.freeze({
  ALLOW: "ALLOW",
  DENY: "DENY",
  UNAVAILABLE: "UNAVAILABLE",
  NOT_APPLICABLE: "NOT_APPLICABLE",
});

// ============================================================
// AUDIT EVENT CLASSES
// ============================================================

export const SECURITY_AUDIT_EVENT_CLASSES = Object.freeze({
  AUTHENTICATION_ATTEMPT:
    "AUTHENTICATION_ATTEMPT",

  AUTHENTICATION_SUCCESS:
    "AUTHENTICATION_SUCCESS",

  AUTHENTICATION_FAILURE:
    "AUTHENTICATION_FAILURE",

  AUTHORIZATION_DENIED:
    "AUTHORIZATION_DENIED",

  PRIVILEGED_ACTION:
    "PRIVILEGED_ACTION",

  SECURITY_CONFIGURATION_CHANGE:
    "SECURITY_CONFIGURATION_CHANGE",

  RATE_LIMIT_TRIGGERED:
    "RATE_LIMIT_TRIGGERED",

  VALIDATION_REJECTED:
    "VALIDATION_REJECTED",

  SECURITY_ERROR:
    "SECURITY_ERROR",

  ADMINISTRATIVE_ACTION:
    "ADMINISTRATIVE_ACTION",
});

// ============================================================
// SENSITIVE DATA CLASSES
// ============================================================

export const SECURITY_SENSITIVE_DATA_CLASSES = Object.freeze({
  PASSWORD:
    "PASSWORD",

  PASSWORD_HASH:
    "PASSWORD_HASH",

  ACCESS_TOKEN:
    "ACCESS_TOKEN",

  REFRESH_TOKEN:
    "REFRESH_TOKEN",

  JWT_SECRET:
    "JWT_SECRET",

  API_KEY:
    "API_KEY",

  DATABASE_URI:
    "DATABASE_URI",

  VRM_TOKEN:
    "VRM_TOKEN",

  COOKIE_SECRET:
    "COOKIE_SECRET",

  SESSION_IDENTIFIER:
    "SESSION_IDENTIFIER",
});

// ============================================================
// SECURITY ERROR CLASSES
// ============================================================

export const SECURITY_ERROR_CLASSES = Object.freeze({
  AUTHENTICATION_REQUIRED:
    "AUTHENTICATION_REQUIRED",

  INVALID_CREDENTIALS:
    "INVALID_CREDENTIALS",

  ACCESS_DENIED:
    "ACCESS_DENIED",

  INVALID_REQUEST:
    "INVALID_REQUEST",

  RATE_LIMITED:
    "RATE_LIMITED",

  SECURITY_CONFIGURATION_ERROR:
    "SECURITY_CONFIGURATION_ERROR",

  SECURITY_SERVICE_UNAVAILABLE:
    "SECURITY_SERVICE_UNAVAILABLE",
});

// ============================================================
// SECURITY INVARIANTS
// ============================================================

export const SECURITY_INVARIANTS = Object.freeze({
  defaultDeny: true,

  leastPrivilegeRequired: true,

  authenticationDoesNotImplyAuthorization: true,

  authorizationRequiredForProtectedResources: true,

  privilegedActionsRequireExplicitPermission: true,

  secretsMustNotBeHardcoded: true,

  secretsMustNotBeReturnedByApi: true,

  secretsMustNotBeLogged: true,

  sensitiveValuesRequireRedaction: true,

  rawPasswordsMustNotBePersisted: true,

  rawPasswordsMustNotBeLogged: true,

  accessTokensMustNotBeLogged: true,

  refreshTokensMustNotBeLogged: true,

  jwtSecretsMustNotBeLogged: true,

  databaseCredentialsMustNotBeLogged: true,

  externalApiTokensMustNotBeLogged: true,

  inputMustBeValidatedBeforeUse: true,

  malformedInputMustBeRejected: true,

  unexpectedFieldsMayBeRejected: true,

  clientInputIsUntrusted: true,

  externalServiceInputIsUntrusted: true,

  databaseContentIsNotAutomaticallyTrusted: true,

  securityErrorsMustNotExposeStackTracesToClients: true,

  securityErrorsMustNotExposeSecrets: true,

  auditEventsMustNotContainRawSecrets: true,

  auditEventsMustBeTimestamped: true,

  auditEventsMustIdentifyEventClass: true,

  auditEventsMustPreserveOutcome: true,

  corsMustUseExplicitOriginsInProduction: true,

  wildcardCorsWithCredentialsForbidden: true,

  securityHeadersRequiredInProduction: true,

  rateLimitingRequiredForPublicAttackSurface: true,

  databaseAccessMustUseApplicationCredentials: true,

  databaseAuthorizationMustFollowLeastPrivilege: true,

  tokensRequireExpiry: true,

  authenticationFailureMustNotRevealCredentialExistence:
    true,

  securityControlFailureMustNotSilentlyAllowAccess: true,

  unavailableSecurityDecisionMustNotBecomeAllow: true,

  missingAuthorizationEvidenceMustNotBecomeAllow: true,

  missingAuthenticationEvidenceMustNotBecomeAuthenticated:
    true,
});

// ============================================================
// PHASE 12 SAFETY BOUNDARY PRESERVATION
// ============================================================

export const PHASE_12_SAFETY_BOUNDARY = Object.freeze({
  optimizationDssAdvisoryOnly: true,
  optimizationDssExecutable: false,
  optimizationDssAutoDispatch: false,

  securityPhaseMayNotEnableEquipmentControl: true,

  securityPhaseMayNotConvertAdvisoryOutputToCommand:
    true,

  securityPhaseMayNotCreateAutomaticDispatch:
    true,
});

// ============================================================
// READ / WRITE SECURITY BOUNDARY
// ============================================================

export const SECURITY_MUTATION_BOUNDARY = Object.freeze({
  contractDefinesControlsOnly: true,

  performsAuthentication: false,
  performsAuthorization: false,

  rotatesSecrets: false,
  modifiesEnvironment: false,

  modifiesDatabaseUsers: false,
  modifiesDatabasePrivileges: false,

  createsSessions: false,
  issuesTokens: false,

  writesAuditRecords: false,

  changesCorsConfiguration: false,
  changesRateLimits: false,
  changesSecurityHeaders: false,

  installsDependencies: false,
  executesSecurityScanner: false,

  executesEquipmentControl: false,
});

// ============================================================
// SECURITY CONTROL REQUIREMENTS
// ============================================================

export const SECURITY_CONTROL_REQUIREMENTS =
  Object.freeze({
    environmentAndSecrets: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES.ENVIRONMENT_AND_SECRETS,

      required: true,

      requirements: Object.freeze([
        "REQUIRED_SECRETS_VALIDATED",
        "NO_HARDCODED_PRODUCTION_SECRETS",
        "NO_SECRET_DISCLOSURE",
        "FAIL_FAST_FOR_REQUIRED_SECRET_MISSING",
      ]),
    }),

    authentication: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES.AUTHENTICATION,

      required: true,

      requirements: Object.freeze([
        "IDENTITY_VERIFICATION",
        "PASSWORD_SECURITY",
        "CREDENTIAL_FAILURE_HANDLING",
        "TOKEN_OR_SESSION_VALIDATION",
      ]),
    }),

    authorizationAndRbac: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES.AUTHORIZATION_AND_RBAC,

      required: true,

      requirements: Object.freeze([
        "DEFAULT_DENY",
        "LEAST_PRIVILEGE",
        "ROLE_PERMISSION_MAPPING",
        "PROTECTED_RESOURCE_ENFORCEMENT",
      ]),
    }),

    inputValidation: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES.INPUT_VALIDATION,

      required: true,

      requirements: Object.freeze([
        "TYPE_VALIDATION",
        "RANGE_VALIDATION",
        "ENUM_VALIDATION",
        "STRUCTURAL_VALIDATION",
        "MALFORMED_INPUT_REJECTION",
      ]),
    }),

    rateLimiting: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES
          .RATE_LIMITING_AND_ABUSE_PROTECTION,

      required: true,

      requirements: Object.freeze([
        "PUBLIC_API_RATE_LIMIT",
        "AUTHENTICATION_RATE_LIMIT",
        "ABUSE_REJECTION",
        "SAFE_RETRY_RESPONSE",
      ]),
    }),

    securityHeaders: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES.HTTP_SECURITY_HEADERS,

      required: true,

      requirements: Object.freeze([
        "HELMET_OR_EQUIVALENT",
        "CONTENT_TYPE_PROTECTION",
        "FRAME_PROTECTION",
        "REFERRER_POLICY",
      ]),
    }),

    cors: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES.CORS,

      required: true,

      requirements: Object.freeze([
        "EXPLICIT_PRODUCTION_ORIGINS",
        "NO_UNQUALIFIED_WILDCARD",
        "CREDENTIAL_POLICY",
        "REJECT_UNAPPROVED_ORIGIN",
      ]),
    }),

    auditLogging: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES.AUDIT_LOGGING,

      required: true,

      requirements: Object.freeze([
        "SECURITY_EVENT_CLASS",
        "TIMESTAMP",
        "OUTCOME",
        "ACTOR_WHEN_AVAILABLE",
        "RESOURCE_WHEN_AVAILABLE",
        "NO_RAW_SECRET",
      ]),
    }),

    redaction: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES.SENSITIVE_DATA_REDACTION,

      required: true,

      requirements: Object.freeze([
        "SECRET_REDACTION",
        "TOKEN_REDACTION",
        "CREDENTIAL_REDACTION",
        "DATABASE_URI_REDACTION",
        "SAFE_LOGGING",
      ]),
    }),

    databaseSecurity: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES.DATABASE_SECURITY,

      required: true,

      requirements: Object.freeze([
        "APPLICATION_DATABASE_IDENTITY",
        "LEAST_PRIVILEGE_DATABASE_ACCESS",
        "NO_CREDENTIAL_DISCLOSURE",
        "SECURE_CONNECTION_CONFIGURATION",
      ]),
    }),

    tokenSecurity: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES
          .SESSION_AND_TOKEN_SECURITY,

      required: true,

      requirements: Object.freeze([
        "TOKEN_EXPIRY",
        "TOKEN_SIGNATURE_VALIDATION",
        "INVALID_TOKEN_REJECTION",
        "TOKEN_SECRET_PROTECTION",
      ]),
    }),

    securityErrors: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES.SECURITY_ERROR_HANDLING,

      required: true,

      requirements: Object.freeze([
        "SAFE_CLIENT_MESSAGE",
        "NO_STACK_TRACE_DISCLOSURE",
        "NO_SECRET_DISCLOSURE",
        "CONSISTENT_SECURITY_STATUS",
      ]),
    }),

    dependencySecurity: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES.DEPENDENCY_SECURITY,

      required: true,

      requirements: Object.freeze([
        "DEPENDENCY_AUDIT",
        "KNOWN_VULNERABILITY_REVIEW",
        "LOCKFILE_PRESERVED",
        "CONTROLLED_UPGRADE_PROCESS",
      ]),
    }),

    runtimeValidation: Object.freeze({
      family:
        SECURITY_CONTROL_FAMILIES
          .RUNTIME_SECURITY_VALIDATION,

      required: true,

      requirements: Object.freeze([
        "LIVE_AUTHENTICATION_TEST",
        "LIVE_AUTHORIZATION_TEST",
        "LIVE_CORS_TEST",
        "LIVE_RATE_LIMIT_TEST",
        "LIVE_SECURITY_HEADER_TEST",
        "LIVE_ERROR_DISCLOSURE_TEST",
        "LIVE_READ_ONLY_BOUNDARY_TEST",
      ]),
    }),
  });

// ============================================================
// PROHIBITED BEHAVIORS
// ============================================================

export const SECURITY_PROHIBITED_BEHAVIORS =
  Object.freeze([
    "ALLOW_BY_DEFAULT",

    "AUTHENTICATION_AS_AUTHORIZATION",

    "HARDCODE_PRODUCTION_SECRET",

    "RETURN_SECRET_TO_CLIENT",

    "LOG_RAW_PASSWORD",

    "LOG_ACCESS_TOKEN",

    "LOG_REFRESH_TOKEN",

    "LOG_JWT_SECRET",

    "LOG_DATABASE_CREDENTIAL",

    "LOG_EXTERNAL_API_TOKEN",

    "PERSIST_RAW_PASSWORD",

    "TRUST_UNVALIDATED_CLIENT_INPUT",

    "TRUST_UNVALIDATED_EXTERNAL_INPUT",

    "SILENT_SECURITY_FAILURE",

    "SECURITY_UNAVAILABLE_TO_ALLOW",

    "MISSING_AUTHENTICATION_TO_AUTHENTICATED",

    "MISSING_AUTHORIZATION_TO_ALLOW",

    "WILDCARD_CORS_WITH_CREDENTIALS",

    "CLIENT_STACK_TRACE_DISCLOSURE",

    "CLIENT_SECRET_DISCLOSURE",

    "SECURITY_PHASE_ENABLE_EQUIPMENT_CONTROL",

    "SECURITY_PHASE_ENABLE_AUTO_DISPATCH",
  ]);

// ============================================================
// CONTRACT FACTORY
// ============================================================

export function createSecurityHardeningContract() {
  return Object.freeze({
    phase:
      SECURITY_HARDENING_CONTRACT_PHASE,

    layer:
      SECURITY_HARDENING_CONTRACT_LAYER,

    upstreamLayer:
      SECURITY_HARDENING_CONTRACT_UPSTREAM_LAYER,

    downstreamLayer:
      SECURITY_HARDENING_CONTRACT_DOWNSTREAM_LAYER,

    version:
      SECURITY_HARDENING_CONTRACT_VERSION,

    objectives:
      SECURITY_OBJECTIVES,

    trustBoundaries:
      SECURITY_TRUST_BOUNDARIES,

    controlFamilies:
      SECURITY_CONTROL_FAMILIES,

    identityClasses:
      SECURITY_IDENTITY_CLASSES,

    accessModes:
      SECURITY_ACCESS_MODES,

    decisionStates:
      SECURITY_DECISION_STATES,

    auditEventClasses:
      SECURITY_AUDIT_EVENT_CLASSES,

    sensitiveDataClasses:
      SECURITY_SENSITIVE_DATA_CLASSES,

    errorClasses:
      SECURITY_ERROR_CLASSES,

    invariants:
      SECURITY_INVARIANTS,

    phase12SafetyBoundary:
      PHASE_12_SAFETY_BOUNDARY,

    mutationBoundary:
      SECURITY_MUTATION_BOUNDARY,

    controlRequirements:
      SECURITY_CONTROL_REQUIREMENTS,

    prohibitedBehaviors:
      SECURITY_PROHIBITED_BEHAVIORS,
  });
}

export default createSecurityHardeningContract;