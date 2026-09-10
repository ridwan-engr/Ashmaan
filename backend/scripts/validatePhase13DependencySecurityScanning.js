import assert from "node:assert/strict";

import {
  DEPENDENCY_SECURITY_SCAN_PHASE,
  DEPENDENCY_SECURITY_SCAN_LAYER,
  DEPENDENCY_SCAN_SOURCE,
  DEPENDENCY_SCOPE,
  VULNERABILITY_SEVERITY,
  DEPENDENCY_SCAN_DECISION,
  DEPENDENCY_SCAN_REASON,
  DEPENDENCY_SECURITY_POLICY,
  DEPENDENCY_SECURITY_SCAN_INVARIANTS,
  isKnownScanSource,
  isKnownDependencyScope,
  isKnownVulnerabilitySeverity,
  severityRank,
  validateDependencyFinding,
  normalizeDependencyFinding,
  evaluateDependencyFinding,
  summarizeDependencyFindings,
  evaluateDependencySecurityScan,
} from "../services/security/dependencySecurityScanningService.js";

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
  "ASHMAAN PHASE 13.14 — DEPENDENCY / SECURITY SCANNING VALIDATION"
);

console.log(
  "========================================================================"
);

try {
  // ============================================================
  // A. IDENTITY
  // ============================================================

  section("A. Phase identity");

  check(
    DEPENDENCY_SECURITY_SCAN_PHASE ===
      "13.14",
    "phase identity is 13.14"
  );

  check(
    DEPENDENCY_SECURITY_SCAN_LAYER ===
      "DEPENDENCY_SECURITY",
    "layer identity is DEPENDENCY_SECURITY"
  );

  // ============================================================
  // B. SCAN SOURCE
  // ============================================================

  section("B. Scan-source taxonomy");

  for (
    const source of [
      "NPM_AUDIT",
      "PACKAGE_LOCK",
      "MANUAL",
    ]
  ) {
    check(
      Object.values(
        DEPENDENCY_SCAN_SOURCE
      ).includes(source),
      `scan source exists: ${source}`
    );
  }

  check(
    isKnownScanSource(
      "npm_audit"
    ) === true,
    "scan-source detection is case-insensitive"
  );

  check(
    isKnownScanSource(
      "UNKNOWN"
    ) === false,
    "unknown scan source is rejected"
  );

  // ============================================================
  // C. DEPENDENCY SCOPE
  // ============================================================

  section("C. Dependency-scope taxonomy");

  for (
    const scope of [
      "PRODUCTION",
      "DEVELOPMENT",
      "UNKNOWN",
    ]
  ) {
    check(
      Object.values(
        DEPENDENCY_SCOPE
      ).includes(scope),
      `dependency scope exists: ${scope}`
    );
  }

  check(
    isKnownDependencyScope(
      "production"
    ) === true,
    "dependency-scope detection is case-insensitive"
  );

  check(
    isKnownDependencyScope(
      "INVALID"
    ) === false,
    "invalid dependency scope is rejected"
  );

  // ============================================================
  // D. SEVERITY
  // ============================================================

  section("D. Vulnerability severity taxonomy");

  for (
    const severity of [
      "INFO",
      "LOW",
      "MODERATE",
      "HIGH",
      "CRITICAL",
    ]
  ) {
    check(
      Object.values(
        VULNERABILITY_SEVERITY
      ).includes(severity),
      `vulnerability severity exists: ${severity}`
    );
  }

  check(
    isKnownVulnerabilitySeverity(
      "critical"
    ) === true,
    "severity detection is case-insensitive"
  );

  check(
    isKnownVulnerabilitySeverity(
      "EXTREME"
    ) === false,
    "unknown severity is rejected"
  );

  // ============================================================
  // E. SEVERITY RANK
  // ============================================================

  section("E. Severity ordering");

  check(
    severityRank("INFO") === 0,
    "INFO severity rank is 0"
  );

  check(
    severityRank("LOW") === 1,
    "LOW severity rank is 1"
  );

  check(
    severityRank("MODERATE") === 2,
    "MODERATE severity rank is 2"
  );

  check(
    severityRank("HIGH") === 3,
    "HIGH severity rank is 3"
  );

  check(
    severityRank("CRITICAL") === 4,
    "CRITICAL severity rank is 4"
  );

  check(
    severityRank("UNKNOWN") === -1,
    "unknown severity has invalid rank"
  );

  // ============================================================
  // F. DECISION TAXONOMY
  // ============================================================

  section("F. Scan-decision taxonomy");

  for (
    const decision of [
      "PASS",
      "REVIEW",
      "FAIL",
      "UNAVAILABLE",
      "INVALID",
    ]
  ) {
    check(
      Object.values(
        DEPENDENCY_SCAN_DECISION
      ).includes(decision),
      `scan decision exists: ${decision}`
    );
  }

  // ============================================================
  // G. REASON TAXONOMY
  // ============================================================

  section("G. Scan-reason taxonomy");

  for (
    const reason of [
      "NO_FINDINGS",
      "REVIEW_REQUIRED",
      "HIGH_RISK_PRODUCTION_FINDING",
      "CRITICAL_FINDING",
      "SCANNER_UNAVAILABLE",
      "INVALID_SCAN_INPUT",
      "INVALID_FINDING",
    ]
  ) {
    check(
      Object.values(
        DEPENDENCY_SCAN_REASON
      ).includes(reason),
      `scan reason exists: ${reason}`
    );
  }

  // ============================================================
  // H. POLICY
  // ============================================================

  section("H. Dependency security policy");

  check(
    DEPENDENCY_SECURITY_POLICY
      .production.INFO ===
      DEPENDENCY_SCAN_DECISION.PASS,
    "production INFO finding may pass"
  );

  check(
    DEPENDENCY_SECURITY_POLICY
      .production.LOW ===
      DEPENDENCY_SCAN_DECISION.PASS,
    "production LOW finding may pass"
  );

  check(
    DEPENDENCY_SECURITY_POLICY
      .production.MODERATE ===
      DEPENDENCY_SCAN_DECISION.REVIEW,
    "production MODERATE finding requires review"
  );

  check(
    DEPENDENCY_SECURITY_POLICY
      .production.HIGH ===
      DEPENDENCY_SCAN_DECISION.FAIL,
    "production HIGH finding blocks release"
  );

  check(
    DEPENDENCY_SECURITY_POLICY
      .production.CRITICAL ===
      DEPENDENCY_SCAN_DECISION.FAIL,
    "production CRITICAL finding blocks release"
  );

  check(
    DEPENDENCY_SECURITY_POLICY
      .development.HIGH ===
      DEPENDENCY_SCAN_DECISION.REVIEW,
    "development HIGH finding requires review"
  );

  check(
    DEPENDENCY_SECURITY_POLICY
      .development.CRITICAL ===
      DEPENDENCY_SCAN_DECISION.FAIL,
    "development CRITICAL finding blocks release"
  );

  check(
    DEPENDENCY_SECURITY_POLICY
      .unknown.HIGH ===
      DEPENDENCY_SCAN_DECISION.FAIL,
    "unknown-scope HIGH finding fails closed"
  );

  // ============================================================
  // I. INVARIANTS
  // ============================================================

  section(
    "I. Core dependency-security invariants"
  );

  const invariantNames = [
    "dependencyFindingsMustBeExplicit",
    "vulnerabilitySeverityMustBeExplicit",
    "dependencyScopeMustBeExplicit",
    "productionAndDevelopmentScopeMustRemainDistinct",
    "criticalFindingsMustNeverPassSilently",
    "highProductionFindingsMustNeverPassSilently",
    "moderateFindingsRequireExplicitReview",
    "unavailableScannerMustNotBecomePass",
    "malformedScannerOutputMustNotBecomePass",
    "unknownDependencyScopeMustNotBeAssumedProductionSafe",
    "dependencyNamesMayBeReported",
    "installedVersionsMayBeReported",
    "advisoryIdsMayBeReported",
    "secretsMustNotBeIncludedInFindings",
    "tokensMustNotBeIncludedInFindings",
    "databaseUrisMustNotBeIncludedInFindings",
    "scanServiceMustNotInstallDependencies",
    "scanServiceMustNotRemoveDependencies",
    "scanServiceMustNotUpgradeDependencies",
    "scanServiceMustNotModifyPackageJson",
    "scanServiceMustNotModifyPackageLock",
    "scanServiceMustNotRunAuditFix",
    "remediationMustRequireExplicitAction",
    "releaseGateMustFailClosedForBlockingFindings",
    "dependencySecurityMustNotGrantAuthorization",
    "dependencySecurityMustNotAuthenticate",
    "dependencySecurityMustNotMutateDatabase",
    "dependencySecurityMustNotExecuteEquipmentControl",
    "optimizationDssRemainsNonExecutable",
    "optimizationDssAutoDispatchRemainsDisabled",
  ];

  for (
    const name of
      invariantNames
  ) {
    check(
      DEPENDENCY_SECURITY_SCAN_INVARIANTS[
        name
      ] === true,
      `dependency-security invariant enforced: ${name}`
    );
  }

  // ============================================================
  // J. VALID FINDING
  // ============================================================

  section("J. Valid dependency finding");

  const validFinding = {
    dependency: "express",
    installedVersion: "5.1.0",
    severity: "LOW",
    scope: "PRODUCTION",
    advisoryId: "ADV-001",
    fixAvailable: true,
    direct: true,
  };

  const findingValidation =
    validateDependencyFinding(
      validFinding
    );

  check(
    findingValidation.valid === true,
    "valid dependency finding is accepted"
  );

  check(
    findingValidation.errors.length === 0,
    "valid dependency finding has zero errors"
  );

  // ============================================================
  // K. INVALID FINDING
  // ============================================================

  section("K. Invalid dependency finding");

  const invalidFinding =
    validateDependencyFinding({
      dependency: "",
      installedVersion: "",
      severity: "EXTREME",
      scope: "SYSTEM",
      advisoryId: "",
    });

  check(
    invalidFinding.valid === false,
    "invalid dependency finding is rejected"
  );

  check(
    invalidFinding.errors.includes(
      "DEPENDENCY_REQUIRED"
    ),
    "missing dependency name is explicit"
  );

  check(
    invalidFinding.errors.includes(
      "INSTALLED_VERSION_REQUIRED"
    ),
    "missing installed version is explicit"
  );

  check(
    invalidFinding.errors.includes(
      "INVALID_SEVERITY"
    ),
    "invalid severity is explicit"
  );

  check(
    invalidFinding.errors.includes(
      "INVALID_SCOPE"
    ),
    "invalid dependency scope is explicit"
  );

  check(
    invalidFinding.errors.includes(
      "INVALID_ADVISORY_ID"
    ),
    "invalid advisory id is explicit"
  );

  // ============================================================
  // L. NORMALIZATION
  // ============================================================

  section("L. Finding normalization");

  const normalized =
    normalizeDependencyFinding({
      dependency: "  mongoose ",
      installedVersion: " 9.1.0 ",
      severity: "high",
      scope: "production",
      advisoryId: " ADV-100 ",
      fixAvailable: true,
      direct: false,
    });

  check(
    normalized.valid === true,
    "normalizable finding is accepted"
  );

  check(
    normalized.finding.dependency ===
      "mongoose",
    "dependency name is trimmed"
  );

  check(
    normalized.finding.installedVersion ===
      "9.1.0",
    "installed version is trimmed"
  );

  check(
    normalized.finding.severity ===
      "HIGH",
    "severity is normalized"
  );

  check(
    normalized.finding.scope ===
      "PRODUCTION",
    "scope is normalized"
  );

  check(
    normalized.finding.advisoryId ===
      "ADV-100",
    "advisory id is trimmed"
  );

  check(
    normalized.finding.fixAvailable ===
      true,
    "fix availability is preserved explicitly"
  );

  check(
    normalized.finding.direct ===
      false,
    "transitive dependency remains explicit"
  );

  // ============================================================
  // M. LOW PRODUCTION FINDING
  // ============================================================

  section("M. Low production finding");

  const lowProduction =
    evaluateDependencyFinding({
      dependency: "pkg-low",
      installedVersion: "1.0.0",
      severity: "LOW",
      scope: "PRODUCTION",
    });

  check(
    lowProduction.decision ===
      DEPENDENCY_SCAN_DECISION.PASS,
    "LOW production finding passes current policy"
  );

  // ============================================================
  // N. MODERATE PRODUCTION FINDING
  // ============================================================

  section("N. Moderate production finding");

  const moderateProduction =
    evaluateDependencyFinding({
      dependency: "pkg-moderate",
      installedVersion: "1.0.0",
      severity: "MODERATE",
      scope: "PRODUCTION",
    });

  check(
    moderateProduction.decision ===
      DEPENDENCY_SCAN_DECISION.REVIEW,
    "MODERATE production finding requires review"
  );

  check(
    moderateProduction.reason ===
      DEPENDENCY_SCAN_REASON.REVIEW_REQUIRED,
    "moderate review reason is explicit"
  );

  // ============================================================
  // O. HIGH PRODUCTION FINDING
  // ============================================================

  section("O. High production finding");

  const highProduction =
    evaluateDependencyFinding({
      dependency: "pkg-high",
      installedVersion: "1.0.0",
      severity: "HIGH",
      scope: "PRODUCTION",
    });

  check(
    highProduction.decision ===
      DEPENDENCY_SCAN_DECISION.FAIL,
    "HIGH production finding blocks release"
  );

  check(
    highProduction.reason ===
      DEPENDENCY_SCAN_REASON
        .HIGH_RISK_PRODUCTION_FINDING,
    "high-risk production reason is explicit"
  );

  // ============================================================
  // P. CRITICAL DEVELOPMENT FINDING
  // ============================================================

  section("P. Critical development finding");

  const criticalDevelopment =
    evaluateDependencyFinding({
      dependency: "pkg-critical",
      installedVersion: "1.0.0",
      severity: "CRITICAL",
      scope: "DEVELOPMENT",
    });

  check(
    criticalDevelopment.decision ===
      DEPENDENCY_SCAN_DECISION.FAIL,
    "CRITICAL development finding blocks release"
  );

  check(
    criticalDevelopment.reason ===
      DEPENDENCY_SCAN_REASON.CRITICAL_FINDING,
    "critical finding reason is explicit"
  );

  // ============================================================
  // Q. UNKNOWN SCOPE
  // ============================================================

  section("Q. Unknown dependency scope");

  const unknownScope =
    evaluateDependencyFinding({
      dependency: "pkg-unknown",
      installedVersion: "1.0.0",
      severity: "HIGH",
      scope: "UNKNOWN",
    });

  check(
    unknownScope.decision ===
      DEPENDENCY_SCAN_DECISION.FAIL,
    "HIGH unknown-scope finding fails closed"
  );

  // ============================================================
  // R. SUMMARY
  // ============================================================

  section("R. Finding summary");

  const summaryResult =
    summarizeDependencyFindings([
      {
        dependency: "a",
        installedVersion: "1.0.0",
        severity: "LOW",
        scope: "PRODUCTION",
        direct: true,
        fixAvailable: true,
      },
      {
        dependency: "b",
        installedVersion: "2.0.0",
        severity: "MODERATE",
        scope: "DEVELOPMENT",
        direct: false,
        fixAvailable: false,
      },
      {
        dependency: "c",
        installedVersion: "3.0.0",
        severity: "HIGH",
        scope: "PRODUCTION",
        direct: false,
        fixAvailable: true,
      },
      {
        dependency: "d",
        installedVersion: "4.0.0",
        severity: "CRITICAL",
        scope: "UNKNOWN",
        direct: true,
        fixAvailable: false,
      },
    ]);

  check(
    summaryResult.valid === true,
    "valid finding array can be summarized"
  );

  check(
    summaryResult.summary.total === 4,
    "summary total is correct"
  );

  check(
    summaryResult.summary.LOW === 1,
    "summary LOW count is correct"
  );

  check(
    summaryResult.summary.MODERATE === 1,
    "summary MODERATE count is correct"
  );

  check(
    summaryResult.summary.HIGH === 1,
    "summary HIGH count is correct"
  );

  check(
    summaryResult.summary.CRITICAL === 1,
    "summary CRITICAL count is correct"
  );

  check(
    summaryResult.summary.production === 2,
    "summary production count is correct"
  );

  check(
    summaryResult.summary.development === 1,
    "summary development count is correct"
  );

  check(
    summaryResult.summary.unknown === 1,
    "summary unknown-scope count is correct"
  );

  check(
    summaryResult.summary.direct === 2,
    "summary direct dependency count is correct"
  );

  check(
    summaryResult.summary.transitive === 2,
    "summary transitive dependency count is correct"
  );

  check(
    summaryResult.summary.fixAvailable === 2,
    "summary fix-available count is correct"
  );

  // ============================================================
  // S. CLEAN SCAN
  // ============================================================

  section("S. Clean dependency scan");

  const cleanScan =
    evaluateDependencySecurityScan({
      source:
        DEPENDENCY_SCAN_SOURCE.NPM_AUDIT,
      findings: [],
      scannerAvailable: true,
    });

  check(
    cleanScan.decision ===
      DEPENDENCY_SCAN_DECISION.PASS,
    "scan with zero findings passes"
  );

  check(
    cleanScan.reason ===
      DEPENDENCY_SCAN_REASON.NO_FINDINGS,
    "clean scan reason is NO_FINDINGS"
  );

  check(
    cleanScan.releaseAllowed === true,
    "clean scan allows release"
  );

  check(
    cleanScan.summary.total === 0,
    "clean scan summary has zero findings"
  );

  // ============================================================
  // T. REVIEW SCAN
  // ============================================================

  section("T. Review-required scan");

  const reviewScan =
    evaluateDependencySecurityScan({
      source:
        DEPENDENCY_SCAN_SOURCE.NPM_AUDIT,
      findings: [
        {
          dependency: "review-package",
          installedVersion: "1.2.3",
          severity: "MODERATE",
          scope: "PRODUCTION",
        },
      ],
    });

  check(
    reviewScan.decision ===
      DEPENDENCY_SCAN_DECISION.REVIEW,
    "moderate scan requires REVIEW"
  );

  check(
    reviewScan.releaseAllowed === false,
    "REVIEW scan is not automatically release-approved"
  );

  check(
    reviewScan.reason ===
      DEPENDENCY_SCAN_REASON.REVIEW_REQUIRED,
    "review scan reason is explicit"
  );

  // ============================================================
  // U. BLOCKING SCAN
  // ============================================================

  section("U. Blocking security scan");

  const blockingScan =
    evaluateDependencySecurityScan({
      source:
        DEPENDENCY_SCAN_SOURCE.NPM_AUDIT,
      findings: [
        {
          dependency: "blocking-package",
          installedVersion: "5.0.0",
          severity: "HIGH",
          scope: "PRODUCTION",
          direct: true,
        },
      ],
    });

  check(
    blockingScan.decision ===
      DEPENDENCY_SCAN_DECISION.FAIL,
    "HIGH production scan fails"
  );

  check(
    blockingScan.releaseAllowed === false,
    "blocking finding prevents release approval"
  );

  check(
    blockingScan.reason ===
      DEPENDENCY_SCAN_REASON
        .HIGH_RISK_PRODUCTION_FINDING,
    "blocking scan reason is explicit"
  );

  // ============================================================
  // V. CRITICAL PRECEDENCE
  // ============================================================

  section("V. Critical finding precedence");

  const criticalScan =
    evaluateDependencySecurityScan({
      source:
        DEPENDENCY_SCAN_SOURCE.NPM_AUDIT,
      findings: [
        {
          dependency: "high-package",
          installedVersion: "1.0.0",
          severity: "HIGH",
          scope: "PRODUCTION",
        },
        {
          dependency: "critical-package",
          installedVersion: "2.0.0",
          severity: "CRITICAL",
          scope: "DEVELOPMENT",
        },
      ],
    });

  check(
    criticalScan.decision ===
      DEPENDENCY_SCAN_DECISION.FAIL,
    "critical scan fails"
  );

  check(
    criticalScan.reason ===
      DEPENDENCY_SCAN_REASON.CRITICAL_FINDING,
    "CRITICAL reason takes precedence"
  );

  // ============================================================
  // W. SCANNER UNAVAILABLE
  // ============================================================

  section("W. Scanner unavailable");

  const unavailableScan =
    evaluateDependencySecurityScan({
      source:
        DEPENDENCY_SCAN_SOURCE.NPM_AUDIT,
      scannerAvailable: false,
    });

  check(
    unavailableScan.decision ===
      DEPENDENCY_SCAN_DECISION.UNAVAILABLE,
    "scanner failure is represented as UNAVAILABLE"
  );

  check(
    unavailableScan.releaseAllowed === false,
    "unavailable scanner does not approve release"
  );

  check(
    unavailableScan.reason ===
      DEPENDENCY_SCAN_REASON.SCANNER_UNAVAILABLE,
    "scanner-unavailable reason is explicit"
  );

  // ============================================================
  // X. INVALID SCAN
  // ============================================================

  section("X. Invalid scanner input");

  const invalidScan =
    evaluateDependencySecurityScan({
      source: "UNKNOWN",
      findings: [],
    });

  check(
    invalidScan.decision ===
      DEPENDENCY_SCAN_DECISION.INVALID,
    "unknown scan source is invalid"
  );

  check(
    invalidScan.releaseAllowed === false,
    "invalid scan cannot approve release"
  );

  check(
    invalidScan.reason ===
      DEPENDENCY_SCAN_REASON.INVALID_SCAN_INPUT,
    "invalid scan reason is explicit"
  );

  const malformedFindings =
    evaluateDependencySecurityScan({
      source:
        DEPENDENCY_SCAN_SOURCE.NPM_AUDIT,
      findings: {},
    });

  check(
    malformedFindings.decision ===
      DEPENDENCY_SCAN_DECISION.INVALID,
    "non-array findings are rejected"
  );

  // ============================================================
  // Y. SIDE-EFFECT BOUNDARY
  // ============================================================

  section("Y. Side-effect safety boundary");

  check(
    cleanScan.remediationExecuted === false,
    "scan performs no automatic remediation"
  );

  check(
    cleanScan.packageJsonModified === false,
    "scan does not modify package.json"
  );

  check(
    cleanScan.packageLockModified === false,
    "scan does not modify package-lock.json"
  );

  check(
    cleanScan.dependencyMutationExecuted === false,
    "scan performs no dependency mutation"
  );

  check(
    blockingScan.remediationExecuted === false,
    "blocking finding performs no automatic remediation"
  );

  check(
    blockingScan.authorizationGranted === false,
    "dependency scanning grants no authorization"
  );

  check(
    blockingScan.authenticated === false,
    "dependency scanning establishes no authentication"
  );

  check(
    blockingScan.databaseMutationExecuted === false,
    "dependency scanning performs no database mutation"
  );

  check(
    blockingScan.equipmentControlExecuted === false,
    "dependency scanning executes no equipment control"
  );

  check(
    blockingScan.autoDispatchExecuted === false,
    "dependency scanning executes no auto-dispatch"
  );

  check(
    unavailableScan.equipmentControlExecuted === false,
    "scanner failure executes no equipment control"
  );

  check(
    unavailableScan.autoDispatchExecuted === false,
    "scanner failure executes no auto-dispatch"
  );

  // ============================================================
  // Z. RESULT CONTRACT
  // ============================================================

  section("Z. Result contract");

  check(
    cleanScan.phase === "13.14",
    "scan result preserves phase"
  );

  check(
    cleanScan.layer ===
      "DEPENDENCY_SECURITY",
    "scan result preserves layer"
  );

  check(
    cleanScan.source ===
      "NPM_AUDIT",
    "scan result preserves normalized source"
  );

  check(
    cleanScan.rawScannerOutputExposed === false,
    "raw scanner output is not exposed"
  );

  check(
    blockingScan.rawScannerOutputExposed === false,
    "blocking scan does not expose raw scanner output"
  );

  // ============================================================
  // AA. FROZEN STRUCTURES
  // ============================================================

  section("AA. Frozen structures");

  check(
    Object.isFrozen(
      DEPENDENCY_SCAN_SOURCE
    ),
    "scan-source taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DEPENDENCY_SCOPE
    ),
    "dependency-scope taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      VULNERABILITY_SEVERITY
    ),
    "severity taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DEPENDENCY_SCAN_DECISION
    ),
    "scan-decision taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DEPENDENCY_SCAN_REASON
    ),
    "scan-reason taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DEPENDENCY_SECURITY_POLICY
    ),
    "dependency security policy is frozen"
  );

  check(
    Object.isFrozen(
      DEPENDENCY_SECURITY_POLICY.production
    ),
    "production dependency policy is frozen"
  );

  check(
    Object.isFrozen(
      DEPENDENCY_SECURITY_POLICY.development
    ),
    "development dependency policy is frozen"
  );

  check(
    Object.isFrozen(
      DEPENDENCY_SECURITY_SCAN_INVARIANTS
    ),
    "dependency-security invariants are frozen"
  );

  check(
    Object.isFrozen(
      findingValidation
    ),
    "finding-validation result is frozen"
  );

  check(
    Object.isFrozen(
      findingValidation.errors
    ),
    "finding-validation errors are frozen"
  );

  check(
    Object.isFrozen(
      normalized
    ),
    "normalized finding result is frozen"
  );

  check(
    Object.isFrozen(
      normalized.finding
    ),
    "normalized dependency finding is frozen"
  );

  check(
    Object.isFrozen(
      summaryResult
    ),
    "summary result is frozen"
  );

  check(
    Object.isFrozen(
      summaryResult.summary
    ),
    "dependency summary is frozen"
  );

  check(
    Object.isFrozen(
      cleanScan
    ),
    "scan result is frozen"
  );

  check(
    Object.isFrozen(
      cleanScan.findings
    ),
    "scan findings array is frozen"
  );

  // ============================================================
  // FINAL
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.14 DEPENDENCY / SECURITY SCANNING RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Dependency scope        : EXPLICIT"
  );

  console.log(
    "Severity classification : EXPLICIT"
  );

  console.log(
    "Production HIGH         : BLOCKING"
  );

  console.log(
    "CRITICAL findings       : BLOCKING"
  );

  console.log(
    "MODERATE findings       : REVIEW REQUIRED"
  );

  console.log(
    "Unknown scope HIGH      : FAIL CLOSED"
  );

  console.log(
    "Scanner unavailable     : NOT PASS"
  );

  console.log(
    "Malformed scan data     : NOT PASS"
  );

  console.log(
    "Release gate            : FAIL CLOSED"
  );

  console.log(
    "Automatic npm audit fix : NONE"
  );

  console.log(
    "Dependency upgrades     : NONE"
  );

  console.log(
    "package.json mutation   : NONE"
  );

  console.log(
    "package-lock mutation   : NONE"
  );

  console.log(
    "Authorization grant     : NONE"
  );

  console.log(
    "Database mutation       : NONE"
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
    "ASHMAAN PHASE 13.14 DEPENDENCY / SECURITY SCANNING VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.14 DEPENDENCY / SECURITY SCANNING VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}