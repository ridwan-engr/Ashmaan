// ASHMAAN Phase 13.1
// Security Hardening Contract Validator

import assert from "node:assert/strict";

import {
  SECURITY_HARDENING_CONTRACT_PHASE,
  SECURITY_HARDENING_CONTRACT_LAYER,
  SECURITY_HARDENING_CONTRACT_UPSTREAM_LAYER,
  SECURITY_HARDENING_CONTRACT_DOWNSTREAM_LAYER,
  SECURITY_HARDENING_CONTRACT_VERSION,

  SECURITY_OBJECTIVES,
  SECURITY_TRUST_BOUNDARIES,
  SECURITY_CONTROL_FAMILIES,
  SECURITY_IDENTITY_CLASSES,
  SECURITY_ACCESS_MODES,
  SECURITY_DECISION_STATES,
  SECURITY_AUDIT_EVENT_CLASSES,
  SECURITY_SENSITIVE_DATA_CLASSES,
  SECURITY_ERROR_CLASSES,
  SECURITY_INVARIANTS,
  PHASE_12_SAFETY_BOUNDARY,
  SECURITY_MUTATION_BOUNDARY,
  SECURITY_CONTROL_REQUIREMENTS,
  SECURITY_PROHIBITED_BEHAVIORS,

  createSecurityHardeningContract,
} from "../services/security/securityHardeningContract.js";

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
  "ASHMAAN PHASE 13.1 — SECURITY HARDENING CONTRACT VALIDATION"
);

console.log(
  "========================================================================"
);

try {
  // ============================================================
  // A. CONTRACT IDENTITY
  // ============================================================

  section(
    "A. Contract identity"
  );

  check(
    SECURITY_HARDENING_CONTRACT_PHASE ===
      "13.1",
    "phase identity is 13.1"
  );

  check(
    SECURITY_HARDENING_CONTRACT_LAYER ===
      "SECURITY_HARDENING",
    "layer identity is SECURITY_HARDENING"
  );

  check(
    SECURITY_HARDENING_CONTRACT_UPSTREAM_LAYER ===
      "END_TO_END_SYSTEM_INTEGRATION",
    "upstream layer is Phase 12 end-to-end integration"
  );

  check(
    SECURITY_HARDENING_CONTRACT_DOWNSTREAM_LAYER ===
      null,
    "contract declares no downstream layer"
  );

  check(
    SECURITY_HARDENING_CONTRACT_VERSION ===
      "1.0.0",
    "contract version is explicit"
  );

  // ============================================================
  // B. SECURITY OBJECTIVES
  // ============================================================

  section(
    "B. Security objectives"
  );

  const requiredObjectives = [
    "CONFIDENTIALITY",
    "INTEGRITY",
    "AVAILABILITY",
    "AUTHENTICITY",
    "ACCOUNTABILITY",
    "LEAST_PRIVILEGE",
    "DEFENSE_IN_DEPTH",
    "FAIL_SAFE_DEFAULTS",
  ];

  for (
    const objective of requiredObjectives
  ) {
    check(
      Object.values(
        SECURITY_OBJECTIVES
      ).includes(objective),
      `security objective exists: ${objective}`
    );
  }

  // ============================================================
  // C. TRUST BOUNDARIES
  // ============================================================

  section(
    "C. Trust boundaries"
  );

  const requiredTrustBoundaries = [
    "PUBLIC_CLIENT",
    "AUTHENTICATED_CLIENT",
    "FRONTEND_APPLICATION",
    "BACKEND_API",
    "DATABASE",
    "VRM_EXTERNAL_SERVICE",
    "SCHEDULER",
    "INTERNAL_SERVICE",
    "ADMINISTRATIVE_OPERATOR",
  ];

  for (
    const boundary of requiredTrustBoundaries
  ) {
    check(
      Object.values(
        SECURITY_TRUST_BOUNDARIES
      ).includes(boundary),
      `trust boundary exists: ${boundary}`
    );
  }

  // ============================================================
  // D. CONTROL FAMILIES
  // ============================================================

  section(
    "D. Security control families"
  );

  const requiredControlFamilies = [
    "ENVIRONMENT_AND_SECRETS",
    "AUTHENTICATION",
    "AUTHORIZATION_AND_RBAC",
    "INPUT_VALIDATION",
    "RATE_LIMITING_AND_ABUSE_PROTECTION",
    "HTTP_SECURITY_HEADERS",
    "CORS",
    "AUDIT_LOGGING",
    "SENSITIVE_DATA_REDACTION",
    "DATABASE_SECURITY",
    "SESSION_AND_TOKEN_SECURITY",
    "SECURITY_ERROR_HANDLING",
    "DEPENDENCY_SECURITY",
    "RUNTIME_SECURITY_VALIDATION",
  ];

  for (
    const family of requiredControlFamilies
  ) {
    check(
      Object.values(
        SECURITY_CONTROL_FAMILIES
      ).includes(family),
      `security control family exists: ${family}`
    );
  }

  // ============================================================
  // E. IDENTITY / ACCESS / DECISION MODEL
  // ============================================================

  section(
    "E. Identity, access and decision model"
  );

  check(
    SECURITY_IDENTITY_CLASSES.ANONYMOUS ===
      "ANONYMOUS",
    "anonymous identity class exists"
  );

  check(
    SECURITY_IDENTITY_CLASSES.USER ===
      "USER",
    "user identity class exists"
  );

  check(
    SECURITY_IDENTITY_CLASSES.OPERATOR ===
      "OPERATOR",
    "operator identity class exists"
  );

  check(
    SECURITY_IDENTITY_CLASSES.ADMINISTRATOR ===
      "ADMINISTRATOR",
    "administrator identity class exists"
  );

  check(
    SECURITY_IDENTITY_CLASSES.SERVICE ===
      "SERVICE",
    "service identity class exists"
  );

  check(
    SECURITY_IDENTITY_CLASSES.SYSTEM ===
      "SYSTEM",
    "system identity class exists"
  );

  const requiredAccessModes = [
    "READ",
    "CREATE",
    "UPDATE",
    "DELETE",
    "EXECUTE",
    "ADMINISTER",
  ];

  for (
    const mode of requiredAccessModes
  ) {
    check(
      Object.values(
        SECURITY_ACCESS_MODES
      ).includes(mode),
      `access mode exists: ${mode}`
    );
  }

  check(
    SECURITY_DECISION_STATES.ALLOW ===
      "ALLOW",
    "ALLOW decision state exists"
  );

  check(
    SECURITY_DECISION_STATES.DENY ===
      "DENY",
    "DENY decision state exists"
  );

  check(
    SECURITY_DECISION_STATES.UNAVAILABLE ===
      "UNAVAILABLE",
    "UNAVAILABLE decision state exists"
  );

  check(
    SECURITY_DECISION_STATES.NOT_APPLICABLE ===
      "NOT_APPLICABLE",
    "NOT_APPLICABLE decision state exists"
  );

  // ============================================================
  // F. AUDIT / SENSITIVE DATA / ERROR MODEL
  // ============================================================

  section(
    "F. Audit, sensitive-data and security-error model"
  );

  check(
    Object.keys(
      SECURITY_AUDIT_EVENT_CLASSES
    ).length >= 8,
    "audit event taxonomy is defined"
  );

  check(
    Object.keys(
      SECURITY_SENSITIVE_DATA_CLASSES
    ).length >= 8,
    "sensitive data taxonomy is defined"
  );

  check(
    Object.keys(
      SECURITY_ERROR_CLASSES
    ).length >= 6,
    "security error taxonomy is defined"
  );

  check(
    SECURITY_SENSITIVE_DATA_CLASSES.ACCESS_TOKEN ===
      "ACCESS_TOKEN",
    "access token is classified as sensitive"
  );

  check(
    SECURITY_SENSITIVE_DATA_CLASSES.JWT_SECRET ===
      "JWT_SECRET",
    "JWT secret is classified as sensitive"
  );

  check(
    SECURITY_SENSITIVE_DATA_CLASSES.DATABASE_URI ===
      "DATABASE_URI",
    "database URI is classified as sensitive"
  );

  check(
    SECURITY_ERROR_CLASSES.ACCESS_DENIED ===
      "ACCESS_DENIED",
    "ACCESS_DENIED error class exists"
  );

  check(
    SECURITY_ERROR_CLASSES.RATE_LIMITED ===
      "RATE_LIMITED",
    "RATE_LIMITED error class exists"
  );

  // ============================================================
  // G. CORE SECURITY INVARIANTS
  // ============================================================

  section(
    "G. Core security invariants"
  );

  check(
    SECURITY_INVARIANTS.defaultDeny ===
      true,
    "default-deny security model is required"
  );

  check(
    SECURITY_INVARIANTS.leastPrivilegeRequired ===
      true,
    "least privilege is required"
  );

  check(
    SECURITY_INVARIANTS.authenticationDoesNotImplyAuthorization ===
      true,
    "authentication does not imply authorization"
  );

  check(
    SECURITY_INVARIANTS.authorizationRequiredForProtectedResources ===
      true,
    "protected resources require authorization"
  );

  check(
    SECURITY_INVARIANTS.secretsMustNotBeHardcoded ===
      true,
    "hardcoded secrets are prohibited"
  );

  check(
    SECURITY_INVARIANTS.secretsMustNotBeReturnedByApi ===
      true,
    "API secret disclosure is prohibited"
  );

  check(
    SECURITY_INVARIANTS.secretsMustNotBeLogged ===
      true,
    "secret logging is prohibited"
  );

  check(
    SECURITY_INVARIANTS.rawPasswordsMustNotBePersisted ===
      true,
    "raw passwords may not be persisted"
  );

  check(
    SECURITY_INVARIANTS.rawPasswordsMustNotBeLogged ===
      true,
    "raw passwords may not be logged"
  );

  check(
    SECURITY_INVARIANTS.accessTokensMustNotBeLogged ===
      true,
    "access tokens may not be logged"
  );

  check(
    SECURITY_INVARIANTS.refreshTokensMustNotBeLogged ===
      true,
    "refresh tokens may not be logged"
  );

  check(
    SECURITY_INVARIANTS.jwtSecretsMustNotBeLogged ===
      true,
    "JWT secrets may not be logged"
  );

  check(
    SECURITY_INVARIANTS.databaseCredentialsMustNotBeLogged ===
      true,
    "database credentials may not be logged"
  );

  check(
    SECURITY_INVARIANTS.externalApiTokensMustNotBeLogged ===
      true,
    "external API tokens may not be logged"
  );

  check(
    SECURITY_INVARIANTS.inputMustBeValidatedBeforeUse ===
      true,
    "input validation is mandatory"
  );

  check(
    SECURITY_INVARIANTS.malformedInputMustBeRejected ===
      true,
    "malformed input must be rejected"
  );

  check(
    SECURITY_INVARIANTS.clientInputIsUntrusted ===
      true,
    "client input is untrusted"
  );

  check(
    SECURITY_INVARIANTS.externalServiceInputIsUntrusted ===
      true,
    "external service input is untrusted"
  );

  check(
    SECURITY_INVARIANTS.databaseContentIsNotAutomaticallyTrusted ===
      true,
    "database content is not automatically trusted"
  );

  check(
    SECURITY_INVARIANTS.securityErrorsMustNotExposeStackTracesToClients ===
      true,
    "client-facing security errors must not expose stack traces"
  );

  check(
    SECURITY_INVARIANTS.securityErrorsMustNotExposeSecrets ===
      true,
    "client-facing security errors must not expose secrets"
  );

  check(
    SECURITY_INVARIANTS.auditEventsMustNotContainRawSecrets ===
      true,
    "audit events must not contain raw secrets"
  );

  check(
    SECURITY_INVARIANTS.corsMustUseExplicitOriginsInProduction ===
      true,
    "production CORS requires explicit origins"
  );

  check(
    SECURITY_INVARIANTS.wildcardCorsWithCredentialsForbidden ===
      true,
    "wildcard CORS with credentials is forbidden"
  );

  check(
    SECURITY_INVARIANTS.securityHeadersRequiredInProduction ===
      true,
    "production security headers are required"
  );

  check(
    SECURITY_INVARIANTS.rateLimitingRequiredForPublicAttackSurface ===
      true,
    "public attack surface requires rate limiting"
  );

  check(
    SECURITY_INVARIANTS.tokensRequireExpiry ===
      true,
    "security tokens require expiry"
  );

  check(
    SECURITY_INVARIANTS.securityControlFailureMustNotSilentlyAllowAccess ===
      true,
    "security-control failure cannot silently allow access"
  );

  check(
    SECURITY_INVARIANTS.unavailableSecurityDecisionMustNotBecomeAllow ===
      true,
    "UNAVAILABLE security decision cannot become ALLOW"
  );

  check(
    SECURITY_INVARIANTS.missingAuthorizationEvidenceMustNotBecomeAllow ===
      true,
    "missing authorization evidence cannot become ALLOW"
  );

  check(
    SECURITY_INVARIANTS.missingAuthenticationEvidenceMustNotBecomeAuthenticated ===
      true,
    "missing authentication evidence cannot become authenticated"
  );

  // ============================================================
  // H. PHASE 12 SAFETY PRESERVATION
  // ============================================================

  section(
    "H. Phase 12 safety-boundary preservation"
  );

  check(
    PHASE_12_SAFETY_BOUNDARY.optimizationDssAdvisoryOnly ===
      true,
    "Optimization/DSS remains advisory-only"
  );

  check(
    PHASE_12_SAFETY_BOUNDARY.optimizationDssExecutable ===
      false,
    "Optimization/DSS remains non-executable"
  );

  check(
    PHASE_12_SAFETY_BOUNDARY.optimizationDssAutoDispatch ===
      false,
    "Optimization/DSS automatic dispatch remains disabled"
  );

  check(
    PHASE_12_SAFETY_BOUNDARY.securityPhaseMayNotEnableEquipmentControl ===
      true,
    "Phase 13 may not enable equipment control"
  );

  check(
    PHASE_12_SAFETY_BOUNDARY.securityPhaseMayNotConvertAdvisoryOutputToCommand ===
      true,
    "Phase 13 may not convert advisory outputs into commands"
  );

  check(
    PHASE_12_SAFETY_BOUNDARY.securityPhaseMayNotCreateAutomaticDispatch ===
      true,
    "Phase 13 may not create automatic dispatch"
  );

  // ============================================================
  // I. CONTRACT MUTATION BOUNDARY
  // ============================================================

  section(
    "I. Contract mutation boundary"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.contractDefinesControlsOnly ===
      true,
    "13.1 defines security controls only"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.performsAuthentication ===
      false,
    "13.1 performs no authentication"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.performsAuthorization ===
      false,
    "13.1 performs no authorization"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.rotatesSecrets ===
      false,
    "13.1 rotates no secrets"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.modifiesEnvironment ===
      false,
    "13.1 modifies no environment configuration"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.modifiesDatabaseUsers ===
      false,
    "13.1 modifies no database users"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.modifiesDatabasePrivileges ===
      false,
    "13.1 modifies no database privileges"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.createsSessions ===
      false,
    "13.1 creates no sessions"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.issuesTokens ===
      false,
    "13.1 issues no tokens"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.writesAuditRecords ===
      false,
    "13.1 writes no audit records"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.installsDependencies ===
      false,
    "13.1 installs no dependencies"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.executesSecurityScanner ===
      false,
    "13.1 executes no vulnerability scanner"
  );

  check(
    SECURITY_MUTATION_BOUNDARY.executesEquipmentControl ===
      false,
    "13.1 executes no equipment control"
  );

  // ============================================================
  // J. REQUIRED CONTROL GROUPS
  // ============================================================

  section(
    "J. Required security control groups"
  );

  const controlGroups =
    Object.values(
      SECURITY_CONTROL_REQUIREMENTS
    );

  check(
    controlGroups.length === 14,
    "14 required security control groups are defined"
  );

  for (
    const group of controlGroups
  ) {
    check(
      group.required === true,
      `${group.family} is required`
    );

    check(
      Array.isArray(
        group.requirements
      ) &&
        group.requirements.length >
          0,
      `${group.family} has explicit requirements`
    );
  }

  // ============================================================
  // K. PROHIBITED BEHAVIORS
  // ============================================================

  section(
    "K. Prohibited security behaviors"
  );

  const requiredProhibitions = [
    "ALLOW_BY_DEFAULT",

    "HARDCODE_PRODUCTION_SECRET",

    "RETURN_SECRET_TO_CLIENT",

    "LOG_RAW_PASSWORD",

    "LOG_ACCESS_TOKEN",

    "LOG_REFRESH_TOKEN",

    "PERSIST_RAW_PASSWORD",

    "SILENT_SECURITY_FAILURE",

    "SECURITY_UNAVAILABLE_TO_ALLOW",

    "WILDCARD_CORS_WITH_CREDENTIALS",

    "CLIENT_STACK_TRACE_DISCLOSURE",

    "SECURITY_PHASE_ENABLE_EQUIPMENT_CONTROL",

    "SECURITY_PHASE_ENABLE_AUTO_DISPATCH",
  ];

  for (
    const prohibition of requiredProhibitions
  ) {
    check(
      SECURITY_PROHIBITED_BEHAVIORS.includes(
        prohibition
      ),
      `prohibited behavior exists: ${prohibition}`
    );
  }

  // ============================================================
  // L. FACTORY OUTPUT
  // ============================================================

  section(
    "L. Contract factory output"
  );

  const contract =
    createSecurityHardeningContract();

  check(
    contract.phase === "13.1",
    "factory returns Phase 13.1"
  );

  check(
    contract.layer ===
      "SECURITY_HARDENING",
    "factory returns security-hardening layer"
  );

  check(
    contract.upstreamLayer ===
      "END_TO_END_SYSTEM_INTEGRATION",
    "factory preserves upstream Phase 12 boundary"
  );

  check(
    contract.downstreamLayer ===
      null,
    "factory exposes no downstream layer"
  );

  check(
    contract.invariants
      .defaultDeny === true,
    "factory preserves default-deny invariant"
  );

  check(
    contract.invariants
      .leastPrivilegeRequired ===
      true,
    "factory preserves least-privilege invariant"
  );

  check(
    contract.phase12SafetyBoundary
      .optimizationDssExecutable ===
      false,
    "factory preserves non-executable Optimization/DSS boundary"
  );

  check(
    contract.phase12SafetyBoundary
      .optimizationDssAutoDispatch ===
      false,
    "factory preserves no-auto-dispatch boundary"
  );

  check(
    contract.mutationBoundary
      .contractDefinesControlsOnly ===
      true,
    "factory remains contract-only"
  );

  check(
    contract.mutationBoundary
      .executesEquipmentControl ===
      false,
    "factory cannot execute equipment control"
  );

  check(
    Object.isFrozen(
      contract
    ),
    "returned contract is frozen"
  );

  check(
    Object.isFrozen(
      SECURITY_INVARIANTS
    ),
    "security invariants are frozen"
  );

  check(
    Object.isFrozen(
      SECURITY_CONTROL_REQUIREMENTS
    ),
    "security control requirements are frozen"
  );

  check(
    Object.isFrozen(
      SECURITY_PROHIBITED_BEHAVIORS
    ),
    "security prohibited behaviors are frozen"
  );

  // ============================================================
  // FINAL RESULT
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.1 SECURITY HARDENING CONTRACT RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Default deny                 : REQUIRED"
  );

  console.log(
    "Least privilege              : REQUIRED"
  );

  console.log(
    "Secrets in API/logs          : FORBIDDEN"
  );

  console.log(
    "Raw password persistence     : FORBIDDEN"
  );

  console.log(
    "Unvalidated external input   : UNTRUSTED"
  );

  console.log(
    "Security unavailable → allow : FORBIDDEN"
  );

  console.log(
    "Optimization/DSS execution   : DISABLED"
  );

  console.log(
    "Auto-dispatch                : DISABLED"
  );

  console.log(
    "13.1 implementation mutation : NONE"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    `\nAssertions passed: ${passed}`
  );

  console.log(
    "ASHMAAN PHASE 13.1 SECURITY HARDENING CONTRACT VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.1 SECURITY HARDENING CONTRACT VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}