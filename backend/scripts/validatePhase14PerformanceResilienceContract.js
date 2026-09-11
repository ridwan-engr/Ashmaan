// ============================================================================
// ASHMAAN PHASE 14.1 — PERFORMANCE & RESILIENCE CONTRACT VALIDATION
// ============================================================================

import assert from "node:assert/strict";

import performanceResilienceContract, {
  getPhase14PerformanceResilienceContract,
} from "../services/performance/performanceResilienceContract.js";

let assertionsPassed = 0;

function check(condition, message) {
  assert.ok(condition, message);

  assertionsPassed += 1;

  console.log(
    `PASS ${assertionsPassed}: ${message}`
  );
}

function section(name) {
  console.log("");
  console.log(`--- ${name} ---`);
}

console.log("");
console.log(
  "=".repeat(72)
);

console.log(
  "ASHMAAN PHASE 14.1 — PERFORMANCE & RESILIENCE CONTRACT VALIDATION"
);

console.log(
  "=".repeat(72)
);

try {
  // -------------------------------------------------------------------------
  // A. Identity
  // -------------------------------------------------------------------------

  section(
    "A. Phase identity"
  );

  check(
    performanceResilienceContract.phase ===
      "14.1",
    "phase identity is 14.1"
  );

  check(
    performanceResilienceContract.layer ===
      "PERFORMANCE_RESILIENCE_CONTRACT",
    "layer identity is PERFORMANCE_RESILIENCE_CONTRACT"
  );

  check(
    performanceResilienceContract.category ===
      "PERFORMANCE_SCALABILITY_RESILIENCE",
    "category identifies Phase 14 scope"
  );

  check(
    performanceResilienceContract.mode ===
      "DECLARATIVE_ONLY",
    "contract is declarative only"
  );

  check(
    Object.isFrozen(
      performanceResilienceContract
    ),
    "root contract is frozen"
  );

  check(
    getPhase14PerformanceResilienceContract() ===
      performanceResilienceContract,
    "contract accessor returns canonical contract"
  );

  // -------------------------------------------------------------------------
  // B. Global principles
  // -------------------------------------------------------------------------

  section(
    "B. Global performance principles"
  );

  const principles =
    performanceResilienceContract.principles;

  check(
    principles.correctnessBeforeOptimization ===
      true,
    "correctness takes precedence over optimization"
  );

  check(
    principles.measureBeforeOptimization ===
      true,
    "performance must be measured before optimization"
  );

  check(
    principles.explicitPerformanceEvidenceRequired ===
      true,
    "performance claims require explicit evidence"
  );

  check(
    principles.preserveExistingDomainSemantics ===
      true,
    "optimization preserves existing domain semantics"
  );

  check(
    principles.preserveSecurityControls ===
      true,
    "optimization preserves existing security controls"
  );

  check(
    principles.failSafely === true,
    "performance controls fail safely"
  );

  check(
    principles.boundedResourceConsumption ===
      true,
    "resource consumption must be bounded"
  );

  check(
    principles.controlledConcurrency ===
      true,
    "concurrency must be controlled"
  );

  check(
    principles.gracefulDegradation ===
      true,
    "graceful degradation is required"
  );

  check(
    principles.reversibleOptimizationChanges ===
      true,
    "optimization changes must be reversible"
  );

  // -------------------------------------------------------------------------
  // C. Engineering semantics
  // -------------------------------------------------------------------------

  section(
    "C. Engineering-data semantics"
  );

  const engineering =
    performanceResilienceContract.engineeringSemantics;

  check(
    engineering.missingTelemetryIsNotZero ===
      true,
    "missing telemetry is not zero"
  );

  check(
    engineering.unavailableIsNotZero ===
      true,
    "UNAVAILABLE is not zero"
  );

  check(
    engineering.zeroRemainsValidMeasurementWhenObserved ===
      true,
    "observed zero remains a valid measurement"
  );

  check(
    engineering.preserveHalfOpenTimeWindows ===
      true,
    "half-open time windows are preserved"
  );

  check(
    engineering.timeWindowConvention ===
      "[start,end)",
    "time-window convention remains [start,end)"
  );

  check(
    engineering.prohibitUnitInference ===
      true,
    "unit inference is prohibited"
  );

  check(
    engineering.prohibitTopologyInference ===
      true,
    "topology inference is prohibited"
  );

  check(
    engineering.prohibitSilentTopologyMerging ===
      true,
    "silent topology merging is prohibited"
  );

  check(
    engineering.prohibitSilentResampling ===
      true,
    "silent resampling is prohibited"
  );

  check(
    engineering.prohibitSilentInterpolation ===
      true,
    "silent interpolation is prohibited"
  );

  check(
    engineering.prohibitSilentOutlierRemoval ===
      true,
    "silent outlier removal is prohibited"
  );

  check(
    engineering.preserveExplicitUnavailableState ===
      true,
    "explicit UNAVAILABLE state is preserved"
  );

  // -------------------------------------------------------------------------
  // D. API performance
  // -------------------------------------------------------------------------

  section(
    "D. API performance contract"
  );

  const api =
    performanceResilienceContract.api;

  check(
    api.latencyMustBeMeasured === true,
    "API latency must be measured"
  );

  check(
    api.responseTimeBaselinesRequired ===
      true,
    "API response-time baseline is required"
  );

  check(
    api.timeoutMustBeFinite === true,
    "API timeout must be finite"
  );

  check(
    api.payloadSizeMustBeBounded ===
      true,
    "API payload size must be bounded"
  );

  check(
    api.paginationRequiredForUnboundedCollections ===
      true,
    "unbounded collections require pagination"
  );

  check(
    api.paginationLimitsMustBeBounded ===
      true,
    "pagination limits must be bounded"
  );

  check(
    api.malformedRequestsMustNotConsumeUnboundedResources ===
      true,
    "malformed requests cannot consume unbounded resources"
  );

  check(
    api.performanceOptimizationMustNotBypassValidation ===
      true,
    "performance optimization cannot bypass validation"
  );

  check(
    api.performanceOptimizationMustNotBypassAuthentication ===
      true,
    "performance optimization cannot bypass authentication"
  );

  check(
    api.performanceOptimizationMustNotBypassAuthorization ===
      true,
    "performance optimization cannot bypass authorization"
  );

  check(
    api.performanceOptimizationMustNotBypassRateLimiting ===
      true,
    "performance optimization cannot bypass rate limiting"
  );

  // -------------------------------------------------------------------------
  // E. Database
  // -------------------------------------------------------------------------

  section(
    "E. Database performance contract"
  );

  const database =
    performanceResilienceContract.database;

  check(
    database.queryPerformanceMustBeMeasured ===
      true,
    "database query performance must be measured"
  );

  check(
    database.indexChangesRequireEvidence ===
      true,
    "index changes require performance evidence"
  );

  check(
    database.indexChangesMustBeReversible ===
      true,
    "index changes must be reversible"
  );

  check(
    database.prohibitDestructivePerformanceTesting ===
      true,
    "destructive database performance testing is prohibited"
  );

  check(
    database.prohibitUnboundedProductionScans ===
      true,
    "unbounded production database scans are prohibited"
  );

  check(
    database.connectionPoolMustBeBounded ===
      true,
    "database connection pool must be bounded"
  );

  check(
    database.connectionFailuresMustFailSafely ===
      true,
    "database connection failures must fail safely"
  );

  check(
    database.databaseTimeoutsMustBeFinite ===
      true,
    "database timeouts must be finite"
  );

  check(
    database.performanceWorkMustPreserveDataIntegrity ===
      true,
    "database performance work preserves data integrity"
  );

  // -------------------------------------------------------------------------
  // F. Ingestion
  // -------------------------------------------------------------------------

  section(
    "F. Telemetry-ingestion scalability"
  );

  const ingestion =
    performanceResilienceContract.ingestion;

  check(
    ingestion.throughputMustBeMeasured ===
      true,
    "ingestion throughput must be measured"
  );

  check(
    ingestion.batchSizeMustBeBounded ===
      true,
    "ingestion batch size must be bounded"
  );

  check(
    ingestion.concurrencyMustBeBounded ===
      true,
    "ingestion concurrency must be bounded"
  );

  check(
    ingestion.duplicateProcessingMustBeControlled ===
      true,
    "duplicate ingestion processing must be controlled"
  );

  check(
    ingestion.backpressureMustBeSupported ===
      true,
    "ingestion requires backpressure support"
  );

  check(
    ingestion.failuresMustNotFabricateTelemetry ===
      true,
    "ingestion failures must not fabricate telemetry"
  );

  check(
    ingestion.partialFailureMustBeExplicit ===
      true,
    "partial ingestion failure must be explicit"
  );

  check(
    ingestion.ingestionOptimizationMustPreserveRawEvidence ===
      true,
    "ingestion optimization preserves raw telemetry evidence"
  );

  // -------------------------------------------------------------------------
  // G. Scheduler
  // -------------------------------------------------------------------------

  section(
    "G. Scheduler resilience"
  );

  const scheduler =
    performanceResilienceContract.scheduler;

  check(
    scheduler.overlappingRunsMustBePreventedOrControlled ===
      true,
    "scheduler overlap must be prevented or controlled"
  );

  check(
    scheduler.schedulerConcurrencyMustBeBounded ===
      true,
    "scheduler concurrency must be bounded"
  );

  check(
    scheduler.duplicateJobExecutionMustBeControlled ===
      true,
    "duplicate scheduler execution must be controlled"
  );

  check(
    scheduler.longRunningJobsMustBeObservable ===
      true,
    "long-running scheduler jobs must be observable"
  );

  check(
    scheduler.schedulerFailureMustNotCrashUnrelatedJobs ===
      true,
    "one scheduler failure must not crash unrelated jobs"
  );

  check(
    scheduler.schedulerRestartMustNotCreateUnboundedDuplicateWork ===
      true,
    "scheduler restart cannot create unbounded duplicate work"
  );

  // -------------------------------------------------------------------------
  // H. External dependencies
  // -------------------------------------------------------------------------

  section(
    "H. External dependency resilience"
  );

  const external =
    performanceResilienceContract.externalDependencies;

  check(
    external.timeoutRequired === true,
    "external dependencies require timeouts"
  );

  check(
    external.retryPolicyMustBeExplicit ===
      true,
    "retry policies must be explicit"
  );

  check(
    external.retriesMustBeBounded ===
      true,
    "external retries must be bounded"
  );

  check(
    external.retryBackoffRequired ===
      true,
    "retry backoff is required"
  );

  check(
    external.permanentFailuresMustNotRetryForever ===
      true,
    "permanent failures cannot retry forever"
  );

  check(
    external.dependencyFailureMustBeRepresentedExplicitly ===
      true,
    "dependency failure must be explicit"
  );

  check(
    external.staleOrMissingExternalDataMustNotBecomeZero ===
      true,
    "stale or missing external data cannot become zero"
  );

  // -------------------------------------------------------------------------
  // I. Runtime resources
  // -------------------------------------------------------------------------

  section(
    "I. Runtime resource controls"
  );

  const runtime =
    performanceResilienceContract.runtimeResources;

  check(
    runtime.memoryUsageMustBeMeasured ===
      true,
    "memory usage must be measured"
  );

  check(
    runtime.cpuUsageMustBeMeasured ===
      true,
    "CPU usage must be measured"
  );

  check(
    runtime.resourceGrowthMustBeBounded ===
      true,
    "resource growth must be bounded"
  );

  check(
    runtime.eventLoopBlockingMustBeMeasured ===
      true,
    "event-loop blocking must be measured"
  );

  check(
    runtime.unboundedInMemoryQueuesProhibited ===
      true,
    "unbounded in-memory queues are prohibited"
  );

  check(
    runtime.memoryLeakEvidenceMustBeInvestigatedBeforePatch ===
      true,
    "memory leak must be evidenced before patching"
  );

  // -------------------------------------------------------------------------
  // J. Lifecycle
  // -------------------------------------------------------------------------

  section(
    "J. Process lifecycle resilience"
  );

  const lifecycle =
    performanceResilienceContract.lifecycle;

  check(
    lifecycle.gracefulShutdownRequired ===
      true,
    "graceful shutdown is required"
  );

  check(
    lifecycle.newWorkShouldStopDuringShutdown ===
      true,
    "new work should stop during shutdown"
  );

  check(
    lifecycle.activeWorkShouldReceiveBoundedDrainTime ===
      true,
    "active work receives bounded drain time"
  );

  check(
    lifecycle.databaseConnectionsShouldCloseCleanly ===
      true,
    "database connections should close cleanly"
  );

  check(
    lifecycle.schedulerShutdownShouldBeControlled ===
      true,
    "scheduler shutdown should be controlled"
  );

  check(
    lifecycle.forcedTerminationMustRemainPossibleAfterTimeout ===
      true,
    "forced termination remains possible after shutdown timeout"
  );

  // -------------------------------------------------------------------------
  // K. Frontend
  // -------------------------------------------------------------------------

  section(
    "K. Frontend performance contract"
  );

  const frontend =
    performanceResilienceContract.frontend;

  check(
    frontend.bundleSizeMustBeMeasured ===
      true,
    "frontend bundle size must be measured"
  );

  check(
    frontend.largeBundleWarningsRequireInvestigation ===
      true,
    "large bundle warnings require investigation"
  );

  check(
    frontend.optimizationMustPreserveRenderingCorrectness ===
      true,
    "frontend optimization preserves rendering correctness"
  );

  check(
    frontend.avoidUnnecessaryRerenders ===
      true,
    "unnecessary rerenders should be avoided"
  );

  check(
    frontend.largeDatasetsRequireBoundedRenderingStrategy ===
      true,
    "large datasets require bounded rendering"
  );

  check(
    frontend.unavailableDataMustNotRenderAsZero ===
      true,
    "UNAVAILABLE frontend data must not render as zero"
  );

  // -------------------------------------------------------------------------
  // L. Validation
  // -------------------------------------------------------------------------

  section(
    "L. Performance validation rules"
  );

  const validation =
    performanceResilienceContract.validation;

  check(
    validation.baselineBeforeOptimizationRequired ===
      true,
    "baseline is required before optimization"
  );

  check(
    validation.loadTestsMustBeControlled ===
      true,
    "load tests must be controlled"
  );

  check(
    validation.stressTestsMustBeControlled ===
      true,
    "stress tests must be controlled"
  );

  check(
    validation.faultInjectionMustBeControlled ===
      true,
    "fault injection must be controlled"
  );

  check(
    validation.destructiveProductionLoadTestingProhibited ===
      true,
    "destructive production load testing is prohibited"
  );

  check(
    validation.testDataMustNotCorruptProductionData ===
      true,
    "performance test data cannot corrupt production data"
  );

  check(
    validation.performanceClaimsRequireRuntimeEvidence ===
      true,
    "performance claims require runtime evidence"
  );

  check(
    validation.resilienceClaimsRequireRuntimeEvidence ===
      true,
    "resilience claims require runtime evidence"
  );

  check(
    validation.regressionChecksRequiredAfterOptimization ===
      true,
    "regression checks are required after optimization"
  );

  // -------------------------------------------------------------------------
  // M. Security boundary
  // -------------------------------------------------------------------------

  section(
    "M. Phase 13 security preservation"
  );

  const security =
    performanceResilienceContract.securityBoundary;

  check(
    security.preservePhase13SecurityHardening ===
      true,
    "Phase 13 security hardening must be preserved"
  );

  check(
    security.noSecurityHeaderWeakening ===
      true,
    "security headers cannot be weakened"
  );

  check(
    security.noCorsWeakening === true,
    "CORS cannot be weakened"
  );

  check(
    security.noAuthenticationBypass ===
      true,
    "authentication cannot be bypassed"
  );

  check(
    security.noAuthorizationBypass ===
      true,
    "authorization cannot be bypassed"
  );

  check(
    security.noInputValidationBypass ===
      true,
    "input validation cannot be bypassed"
  );

  check(
    security.noRateLimitBypass ===
      true,
    "rate limiting cannot be bypassed"
  );

  check(
    security.noSensitiveDataLeakage ===
      true,
    "performance work cannot introduce sensitive-data leakage"
  );

  check(
    security.noStackTraceExposure ===
      true,
    "performance work cannot reintroduce stack-trace exposure"
  );

  // -------------------------------------------------------------------------
  // N. DSS safety boundary
  // -------------------------------------------------------------------------

  section(
    "N. Engineering decision-support safety boundary"
  );

  const decisionSupport =
    performanceResilienceContract.decisionSupportSafety;

  check(
    decisionSupport.advisoryOnly ===
      true,
    "DSS remains advisory-only"
  );

  check(
    decisionSupport.executable ===
      false,
    "DSS remains non-executable"
  );

  check(
    decisionSupport.autoDispatch ===
      false,
    "automatic dispatch remains disabled"
  );

  check(
    decisionSupport.equipmentControl ===
      false,
    "equipment control remains disabled"
  );

  check(
    decisionSupport.optimizationMustRemainNonExecuting ===
      true,
    "optimization remains non-executing"
  );

  // -------------------------------------------------------------------------
  // O. Forbidden shortcuts
  // -------------------------------------------------------------------------

  section(
    "O. Forbidden performance shortcuts"
  );

  const forbidden =
    performanceResilienceContract.forbidden;

  check(
    Object.isFrozen(forbidden),
    "forbidden shortcut list is frozen"
  );

  const requiredForbidden = [
    "TREAT_MISSING_AS_ZERO",
    "TREAT_UNAVAILABLE_AS_ZERO",
    "INFER_UNITS",
    "INFER_TOPOLOGY",
    "SILENTLY_MERGE_TOPOLOGIES",
    "SILENTLY_RESAMPLE",
    "SILENTLY_INTERPOLATE",
    "UNBOUNDED_RETRIES",
    "UNBOUNDED_CONCURRENCY",
    "UNBOUNDED_DATABASE_SCAN",
    "UNBOUNDED_PAYLOAD",
    "UNBOUNDED_PAGINATION",
    "UNBOUNDED_MEMORY_QUEUE",
    "BYPASS_AUTHENTICATION",
    "BYPASS_AUTHORIZATION",
    "BYPASS_INPUT_VALIDATION",
    "BYPASS_RATE_LIMITING",
    "WEAKEN_SECURITY_HEADERS",
    "WEAKEN_CORS",
    "EXPOSE_STACK_TRACE",
    "DESTRUCTIVE_PRODUCTION_LOAD_TEST",
    "AUTOMATIC_EQUIPMENT_CONTROL",
    "AUTOMATIC_DISPATCH",
  ];

  for (
    const forbiddenControl
    of requiredForbidden
  ) {
    check(
      forbidden.includes(
        forbiddenControl
      ),
      `forbidden shortcut includes ${forbiddenControl}`
    );
  }

  // -------------------------------------------------------------------------
  // P. Execution boundary
  // -------------------------------------------------------------------------

  section(
    "P. Contract execution boundary"
  );

  const execution =
    performanceResilienceContract.executionBoundary;

  check(
    execution.performsDatabaseMutation ===
      false,
    "14.1 performs no database mutation"
  );

  check(
    execution.performsIndexMutation ===
      false,
    "14.1 performs no index mutation"
  );

  check(
    execution.performsDependencyMutation ===
      false,
    "14.1 performs no dependency mutation"
  );

  check(
    execution.performsSchedulerMutation ===
      false,
    "14.1 performs no scheduler mutation"
  );

  check(
    execution.performsRuntimeConfigMutation ===
      false,
    "14.1 performs no runtime configuration mutation"
  );

  check(
    execution.performsAuthenticationGrant ===
      false,
    "14.1 performs no authentication grant"
  );

  check(
    execution.performsAuthorizationGrant ===
      false,
    "14.1 performs no authorization grant"
  );

  check(
    execution.performsEquipmentControl ===
      false,
    "14.1 performs no equipment control"
  );

  check(
    execution.performsAutoDispatch ===
      false,
    "14.1 performs no automatic dispatch"
  );

  // -------------------------------------------------------------------------
  // Final
  // -------------------------------------------------------------------------

  console.log("");
  console.log(
    "-".repeat(72)
  );

  console.log(
    "PHASE 14.1 PERFORMANCE & RESILIENCE CONTRACT RESULT"
  );

  console.log(
    "-".repeat(72)
  );

  console.log(
    "Correctness before optimization : ENFORCED"
  );

  console.log(
    "Measure before optimization     : ENFORCED"
  );

  console.log(
    "Bounded resources               : REQUIRED"
  );

  console.log(
    "Controlled concurrency          : REQUIRED"
  );

  console.log(
    "Graceful degradation            : REQUIRED"
  );

  console.log(
    "Phase 13 security preservation  : REQUIRED"
  );

  console.log(
    "Database mutation               : NONE"
  );

  console.log(
    "Equipment control               : NONE"
  );

  console.log(
    "Auto-dispatch                   : DISABLED"
  );

  console.log(
    "-".repeat(72)
  );

  console.log("");
  console.log(
    `Assertions passed: ${assertionsPassed}`
  );

  console.log(
    "ASHMAAN PHASE 14.1 PERFORMANCE & RESILIENCE CONTRACT VALIDATION PASSED"
  );

  process.exitCode = 0;
} catch (error) {
  console.error("");
  console.error(
    "=".repeat(72)
  );

  console.error(
    "ASHMAAN PHASE 14.1 PERFORMANCE & RESILIENCE CONTRACT VALIDATION FAILED"
  );

  console.error(
    "=".repeat(72)
  );

  console.error(error);

  console.error("");
  console.error(
    "Do not proceed to Phase 14.2 until the first failed 14.1 assertion is resolved."
  );

  process.exitCode = 1;
}