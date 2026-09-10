// ASHMAAN Phase 13.14
// Dependency / Security Scanning Service

export const DEPENDENCY_SECURITY_SCAN_PHASE = "13.14";

export const DEPENDENCY_SECURITY_SCAN_LAYER =
  "DEPENDENCY_SECURITY";

// ============================================================
// TAXONOMIES
// ============================================================

export const DEPENDENCY_SCAN_SOURCE = Object.freeze({
  NPM_AUDIT: "NPM_AUDIT",
  PACKAGE_LOCK: "PACKAGE_LOCK",
  MANUAL: "MANUAL",
});

export const DEPENDENCY_SCOPE = Object.freeze({
  PRODUCTION: "PRODUCTION",
  DEVELOPMENT: "DEVELOPMENT",
  UNKNOWN: "UNKNOWN",
});

export const VULNERABILITY_SEVERITY = Object.freeze({
  INFO: "INFO",
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

export const DEPENDENCY_SCAN_DECISION = Object.freeze({
  PASS: "PASS",
  REVIEW: "REVIEW",
  FAIL: "FAIL",
  UNAVAILABLE: "UNAVAILABLE",
  INVALID: "INVALID",
});

export const DEPENDENCY_SCAN_REASON = Object.freeze({
  NO_FINDINGS: "NO_FINDINGS",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  HIGH_RISK_PRODUCTION_FINDING:
    "HIGH_RISK_PRODUCTION_FINDING",
  CRITICAL_FINDING: "CRITICAL_FINDING",
  SCANNER_UNAVAILABLE: "SCANNER_UNAVAILABLE",
  INVALID_SCAN_INPUT: "INVALID_SCAN_INPUT",
  INVALID_FINDING: "INVALID_FINDING",
});

// ============================================================
// SECURITY POLICY
// ============================================================

export const DEPENDENCY_SECURITY_POLICY = Object.freeze({
  production: Object.freeze({
    INFO: DEPENDENCY_SCAN_DECISION.PASS,
    LOW: DEPENDENCY_SCAN_DECISION.PASS,
    MODERATE: DEPENDENCY_SCAN_DECISION.REVIEW,
    HIGH: DEPENDENCY_SCAN_DECISION.FAIL,
    CRITICAL: DEPENDENCY_SCAN_DECISION.FAIL,
  }),

  development: Object.freeze({
    INFO: DEPENDENCY_SCAN_DECISION.PASS,
    LOW: DEPENDENCY_SCAN_DECISION.PASS,
    MODERATE: DEPENDENCY_SCAN_DECISION.REVIEW,
    HIGH: DEPENDENCY_SCAN_DECISION.REVIEW,
    CRITICAL: DEPENDENCY_SCAN_DECISION.FAIL,
  }),

  unknown: Object.freeze({
    INFO: DEPENDENCY_SCAN_DECISION.REVIEW,
    LOW: DEPENDENCY_SCAN_DECISION.REVIEW,
    MODERATE: DEPENDENCY_SCAN_DECISION.REVIEW,
    HIGH: DEPENDENCY_SCAN_DECISION.FAIL,
    CRITICAL: DEPENDENCY_SCAN_DECISION.FAIL,
  }),
});

// ============================================================
// INVARIANTS
// ============================================================

export const DEPENDENCY_SECURITY_SCAN_INVARIANTS =
  Object.freeze({
    dependencyFindingsMustBeExplicit: true,
    vulnerabilitySeverityMustBeExplicit: true,
    dependencyScopeMustBeExplicit: true,
    productionAndDevelopmentScopeMustRemainDistinct: true,

    criticalFindingsMustNeverPassSilently: true,
    highProductionFindingsMustNeverPassSilently: true,
    moderateFindingsRequireExplicitReview: true,

    unavailableScannerMustNotBecomePass: true,
    malformedScannerOutputMustNotBecomePass: true,
    unknownDependencyScopeMustNotBeAssumedProductionSafe: true,

    dependencyNamesMayBeReported: true,
    installedVersionsMayBeReported: true,
    advisoryIdsMayBeReported: true,

    secretsMustNotBeIncludedInFindings: true,
    tokensMustNotBeIncludedInFindings: true,
    databaseUrisMustNotBeIncludedInFindings: true,

    scanServiceMustNotInstallDependencies: true,
    scanServiceMustNotRemoveDependencies: true,
    scanServiceMustNotUpgradeDependencies: true,
    scanServiceMustNotModifyPackageJson: true,
    scanServiceMustNotModifyPackageLock: true,
    scanServiceMustNotRunAuditFix: true,

    remediationMustRequireExplicitAction: true,
    releaseGateMustFailClosedForBlockingFindings: true,

    dependencySecurityMustNotGrantAuthorization: true,
    dependencySecurityMustNotAuthenticate: true,
    dependencySecurityMustNotMutateDatabase: true,
    dependencySecurityMustNotExecuteEquipmentControl: true,

    optimizationDssRemainsNonExecutable: true,
    optimizationDssAutoDispatchRemainsDisabled: true,
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

export function isKnownScanSource(value) {
  return Object.values(
    DEPENDENCY_SCAN_SOURCE
  ).includes(normalize(value));
}

export function isKnownDependencyScope(value) {
  return Object.values(
    DEPENDENCY_SCOPE
  ).includes(normalize(value));
}

export function isKnownVulnerabilitySeverity(value) {
  return Object.values(
    VULNERABILITY_SEVERITY
  ).includes(normalize(value));
}

export function severityRank(value) {
  const normalized = normalize(value);

  switch (normalized) {
    case VULNERABILITY_SEVERITY.INFO:
      return 0;

    case VULNERABILITY_SEVERITY.LOW:
      return 1;

    case VULNERABILITY_SEVERITY.MODERATE:
      return 2;

    case VULNERABILITY_SEVERITY.HIGH:
      return 3;

    case VULNERABILITY_SEVERITY.CRITICAL:
      return 4;

    default:
      return -1;
  }
}

// ============================================================
// FINDING VALIDATION
// ============================================================

export function validateDependencyFinding(
  finding
) {
  const errors = [];

  if (!isPlainObject(finding)) {
    return Object.freeze({
      valid: false,
      errors: Object.freeze([
        DEPENDENCY_SCAN_REASON.INVALID_FINDING,
      ]),
    });
  }

  if (
    !isNonEmptyString(
      finding.dependency
    )
  ) {
    errors.push("DEPENDENCY_REQUIRED");
  }

  if (
    !isNonEmptyString(
      finding.installedVersion
    )
  ) {
    errors.push("INSTALLED_VERSION_REQUIRED");
  }

  if (
    !isKnownVulnerabilitySeverity(
      finding.severity
    )
  ) {
    errors.push("INVALID_SEVERITY");
  }

  if (
    !isKnownDependencyScope(
      finding.scope
    )
  ) {
    errors.push("INVALID_SCOPE");
  }

  if (
    finding.advisoryId !== undefined &&
    finding.advisoryId !== null &&
    !isNonEmptyString(
      finding.advisoryId
    )
  ) {
    errors.push("INVALID_ADVISORY_ID");
  }

  return Object.freeze({
    valid:
      errors.length === 0,

    errors:
      Object.freeze([
        ...errors,
      ]),
  });
}

// ============================================================
// FINDING NORMALIZATION
// ============================================================

export function normalizeDependencyFinding(
  finding
) {
  const validation =
    validateDependencyFinding(
      finding
    );

  if (!validation.valid) {
    return Object.freeze({
      valid: false,
      finding: null,
      errors:
        validation.errors,
    });
  }

  const normalized =
    Object.freeze({
      dependency:
        finding.dependency.trim(),

      installedVersion:
        finding.installedVersion.trim(),

      severity:
        normalize(
          finding.severity
        ),

      scope:
        normalize(
          finding.scope
        ),

      advisoryId:
        finding.advisoryId ===
          undefined ||
        finding.advisoryId ===
          null
          ? null
          : finding.advisoryId.trim(),

      fixAvailable:
        finding.fixAvailable === true,

      direct:
        finding.direct === true,
    });

  return Object.freeze({
    valid: true,
    finding: normalized,
    errors: Object.freeze([]),
  });
}

// ============================================================
// FINDING POLICY DECISION
// ============================================================

export function evaluateDependencyFinding(
  finding
) {
  const normalizedResult =
    normalizeDependencyFinding(
      finding
    );

  if (!normalizedResult.valid) {
    return Object.freeze({
      decision:
        DEPENDENCY_SCAN_DECISION.INVALID,

      reason:
        DEPENDENCY_SCAN_REASON
          .INVALID_FINDING,

      finding: null,
    });
  }

  const normalizedFinding =
    normalizedResult.finding;

  let policy;

  switch (
    normalizedFinding.scope
  ) {
    case DEPENDENCY_SCOPE.PRODUCTION:
      policy =
        DEPENDENCY_SECURITY_POLICY
          .production;
      break;

    case DEPENDENCY_SCOPE.DEVELOPMENT:
      policy =
        DEPENDENCY_SECURITY_POLICY
          .development;
      break;

    default:
      policy =
        DEPENDENCY_SECURITY_POLICY
          .unknown;
      break;
  }

  const decision =
    policy[
      normalizedFinding.severity
    ];

  let reason =
    DEPENDENCY_SCAN_REASON
      .NO_FINDINGS;

  if (
    normalizedFinding.severity ===
    VULNERABILITY_SEVERITY.CRITICAL
  ) {
    reason =
      DEPENDENCY_SCAN_REASON
        .CRITICAL_FINDING;
  } else if (
    normalizedFinding.scope ===
      DEPENDENCY_SCOPE.PRODUCTION &&
    normalizedFinding.severity ===
      VULNERABILITY_SEVERITY.HIGH
  ) {
    reason =
      DEPENDENCY_SCAN_REASON
        .HIGH_RISK_PRODUCTION_FINDING;
  } else if (
    decision ===
      DEPENDENCY_SCAN_DECISION.REVIEW
  ) {
    reason =
      DEPENDENCY_SCAN_REASON
        .REVIEW_REQUIRED;
  }

  return Object.freeze({
    decision,
    reason,
    finding:
      normalizedFinding,
  });
}

// ============================================================
// SCAN SUMMARY
// ============================================================

export function summarizeDependencyFindings(
  findings
) {
  if (!Array.isArray(findings)) {
    return Object.freeze({
      valid: false,
      summary: null,
      errors: Object.freeze([
        DEPENDENCY_SCAN_REASON
          .INVALID_SCAN_INPUT,
      ]),
    });
  }

  const summary = {
    total: 0,
    INFO: 0,
    LOW: 0,
    MODERATE: 0,
    HIGH: 0,
    CRITICAL: 0,

    production: 0,
    development: 0,
    unknown: 0,

    direct: 0,
    transitive: 0,

    fixAvailable: 0,
  };

  for (const finding of findings) {
    const result =
      normalizeDependencyFinding(
        finding
      );

    if (!result.valid) {
      return Object.freeze({
        valid: false,
        summary: null,
        errors:
          result.errors,
      });
    }

    const normalized =
      result.finding;

    summary.total += 1;

    summary[
      normalized.severity
    ] += 1;

    if (
      normalized.scope ===
      DEPENDENCY_SCOPE.PRODUCTION
    ) {
      summary.production += 1;
    } else if (
      normalized.scope ===
      DEPENDENCY_SCOPE.DEVELOPMENT
    ) {
      summary.development += 1;
    } else {
      summary.unknown += 1;
    }

    if (normalized.direct) {
      summary.direct += 1;
    } else {
      summary.transitive += 1;
    }

    if (
      normalized.fixAvailable
    ) {
      summary.fixAvailable += 1;
    }
  }

  return Object.freeze({
    valid: true,

    summary:
      Object.freeze({
        ...summary,
      }),

    errors:
      Object.freeze([]),
  });
}

// ============================================================
// COMPLETE SCAN DECISION
// ============================================================

export function evaluateDependencySecurityScan({
  source,
  findings = [],
  scannerAvailable = true,
} = {}) {
  if (
    scannerAvailable !== true
  ) {
    return Object.freeze({
      phase:
        DEPENDENCY_SECURITY_SCAN_PHASE,

      layer:
        DEPENDENCY_SECURITY_SCAN_LAYER,

      decision:
        DEPENDENCY_SCAN_DECISION
          .UNAVAILABLE,

      reason:
        DEPENDENCY_SCAN_REASON
          .SCANNER_UNAVAILABLE,

      releaseAllowed: false,

      summary: null,

      findings:
        Object.freeze([]),

      rawScannerOutputExposed:
        false,

      remediationExecuted:
        false,

      packageJsonModified:
        false,

      packageLockModified:
        false,

      dependencyMutationExecuted:
        false,

      authorizationGranted:
        false,

      authenticated:
        false,

      databaseMutationExecuted:
        false,

      equipmentControlExecuted:
        false,

      autoDispatchExecuted:
        false,

      invariants:
        DEPENDENCY_SECURITY_SCAN_INVARIANTS,
    });
  }

  if (
    !isKnownScanSource(source) ||
    !Array.isArray(findings)
  ) {
    return Object.freeze({
      phase:
        DEPENDENCY_SECURITY_SCAN_PHASE,

      layer:
        DEPENDENCY_SECURITY_SCAN_LAYER,

      decision:
        DEPENDENCY_SCAN_DECISION
          .INVALID,

      reason:
        DEPENDENCY_SCAN_REASON
          .INVALID_SCAN_INPUT,

      releaseAllowed: false,

      summary: null,

      findings:
        Object.freeze([]),

      rawScannerOutputExposed:
        false,

      remediationExecuted:
        false,

      packageJsonModified:
        false,

      packageLockModified:
        false,

      dependencyMutationExecuted:
        false,

      authorizationGranted:
        false,

      authenticated:
        false,

      databaseMutationExecuted:
        false,

      equipmentControlExecuted:
        false,

      autoDispatchExecuted:
        false,

      invariants:
        DEPENDENCY_SECURITY_SCAN_INVARIANTS,
    });
  }

  const normalizedFindings = [];
  const evaluations = [];

  for (const finding of findings) {
    const normalized =
      normalizeDependencyFinding(
        finding
      );

    if (!normalized.valid) {
      return Object.freeze({
        phase:
          DEPENDENCY_SECURITY_SCAN_PHASE,

        layer:
          DEPENDENCY_SECURITY_SCAN_LAYER,

        decision:
          DEPENDENCY_SCAN_DECISION
            .INVALID,

        reason:
          DEPENDENCY_SCAN_REASON
            .INVALID_FINDING,

        releaseAllowed: false,

        summary: null,

        findings:
          Object.freeze([]),

        rawScannerOutputExposed:
          false,

        remediationExecuted:
          false,

        packageJsonModified:
          false,

        packageLockModified:
          false,

        dependencyMutationExecuted:
          false,

        authorizationGranted:
          false,

        authenticated:
          false,

        databaseMutationExecuted:
          false,

        equipmentControlExecuted:
          false,

        autoDispatchExecuted:
          false,

        invariants:
          DEPENDENCY_SECURITY_SCAN_INVARIANTS,
      });
    }

    normalizedFindings.push(
      normalized.finding
    );

    evaluations.push(
      evaluateDependencyFinding(
        normalized.finding
      )
    );
  }

  const summaryResult =
    summarizeDependencyFindings(
      normalizedFindings
    );

  let decision =
    DEPENDENCY_SCAN_DECISION.PASS;

  let reason =
    DEPENDENCY_SCAN_REASON.NO_FINDINGS;

  if (
    evaluations.some(
      (item) =>
        item.decision ===
        DEPENDENCY_SCAN_DECISION.FAIL
    )
  ) {
    decision =
      DEPENDENCY_SCAN_DECISION.FAIL;

    if (
      normalizedFindings.some(
        (item) =>
          item.severity ===
          VULNERABILITY_SEVERITY
            .CRITICAL
      )
    ) {
      reason =
        DEPENDENCY_SCAN_REASON
          .CRITICAL_FINDING;
    } else {
      reason =
        DEPENDENCY_SCAN_REASON
          .HIGH_RISK_PRODUCTION_FINDING;
    }
  } else if (
    evaluations.some(
      (item) =>
        item.decision ===
        DEPENDENCY_SCAN_DECISION.REVIEW
    )
  ) {
    decision =
      DEPENDENCY_SCAN_DECISION.REVIEW;

    reason =
      DEPENDENCY_SCAN_REASON
        .REVIEW_REQUIRED;
  }

  return Object.freeze({
    phase:
      DEPENDENCY_SECURITY_SCAN_PHASE,

    layer:
      DEPENDENCY_SECURITY_SCAN_LAYER,

    source:
      normalize(source),

    decision,

    reason,

    releaseAllowed:
      decision ===
      DEPENDENCY_SCAN_DECISION.PASS,

    summary:
      summaryResult.summary,

    findings:
      Object.freeze([
        ...normalizedFindings,
      ]),

    rawScannerOutputExposed:
      false,

    remediationExecuted:
      false,

    packageJsonModified:
      false,

    packageLockModified:
      false,

    dependencyMutationExecuted:
      false,

    authorizationGranted:
      false,

    authenticated:
      false,

    databaseMutationExecuted:
      false,

    equipmentControlExecuted:
      false,

    autoDispatchExecuted:
      false,

    invariants:
      DEPENDENCY_SECURITY_SCAN_INVARIANTS,
  });
}

export default evaluateDependencySecurityScan;