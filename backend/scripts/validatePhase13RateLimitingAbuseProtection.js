import assert from "node:assert/strict";

import {
  RATE_LIMITING_PHASE,
  RATE_LIMITING_LAYER,
  RATE_LIMIT_DECISION,
  RATE_LIMIT_SCOPE,
  RATE_LIMIT_DENIAL_REASON,
  DEFAULT_RATE_LIMIT_POLICY,
  RATE_LIMITING_INVARIANTS,
  validateRateLimitPolicy,
  createRateLimitResult,
  evaluateRateLimit,
} from "../services/security/rateLimitingAbuseProtectionService.js";

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
  "ASHMAAN PHASE 13.6 — RATE LIMITING / ABUSE PROTECTION VALIDATION"
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
    RATE_LIMITING_PHASE === "13.6",
    "phase identity is 13.6"
  );

  check(
    RATE_LIMITING_LAYER ===
      "RATE_LIMITING_AND_ABUSE_PROTECTION",
    "layer identity is RATE_LIMITING_AND_ABUSE_PROTECTION"
  );

  // ============================================================
  // B. DECISION TAXONOMY
  // ============================================================

  section("B. Decision taxonomy");

  check(
    RATE_LIMIT_DECISION.ALLOW ===
      "ALLOW",
    "ALLOW decision exists"
  );

  check(
    RATE_LIMIT_DECISION.DENY ===
      "DENY",
    "DENY decision exists"
  );

  check(
    RATE_LIMIT_DECISION.UNAVAILABLE ===
      "UNAVAILABLE",
    "UNAVAILABLE decision exists"
  );

  // ============================================================
  // C. SCOPE TAXONOMY
  // ============================================================

  section("C. Scope taxonomy");

  for (const scope of [
    "GLOBAL",
    "IP",
    "IDENTITY",
    "ENDPOINT",
  ]) {
    check(
      Object.values(
        RATE_LIMIT_SCOPE
      ).includes(scope),
      `rate-limit scope exists: ${scope}`
    );
  }

  // ============================================================
  // D. DENIAL REASONS
  // ============================================================

  section("D. Denial reasons");

  for (const reason of [
    "LIMIT_EXCEEDED",
    "INVALID_POLICY",
    "INVALID_COUNTER",
    "LIMITER_UNAVAILABLE",
  ]) {
    check(
      Object.values(
        RATE_LIMIT_DENIAL_REASON
      ).includes(reason),
      `rate-limit denial reason exists: ${reason}`
    );
  }

  // ============================================================
  // E. DEFAULT POLICY
  // ============================================================

  section("E. Default policy");

  check(
    DEFAULT_RATE_LIMIT_POLICY.windowMs ===
      60_000,
    "default rate-limit window is explicit"
  );

  check(
    DEFAULT_RATE_LIMIT_POLICY.maxRequests ===
      100,
    "default request limit is explicit"
  );

  check(
    DEFAULT_RATE_LIMIT_POLICY.scope ===
      RATE_LIMIT_SCOPE.IP,
    "default rate-limit scope is IP"
  );

  // ============================================================
  // F. POLICY VALIDATION
  // ============================================================

  section("F. Policy validation");

  const validPolicy =
    validateRateLimitPolicy({
      windowMs: 60_000,
      maxRequests: 50,
      scope:
        RATE_LIMIT_SCOPE.ENDPOINT,
    });

  check(
    validPolicy.valid === true,
    "valid rate-limit policy is accepted"
  );

  check(
    validPolicy.reason === null,
    "valid policy has no failure reason"
  );

  const zeroWindow =
    validateRateLimitPolicy({
      windowMs: 0,
      maxRequests: 10,
      scope: RATE_LIMIT_SCOPE.IP,
    });

  check(
    zeroWindow.valid === false,
    "zero-length rate-limit window is rejected"
  );

  const negativeWindow =
    validateRateLimitPolicy({
      windowMs: -1,
      maxRequests: 10,
      scope: RATE_LIMIT_SCOPE.IP,
    });

  check(
    negativeWindow.valid === false,
    "negative rate-limit window is rejected"
  );

  const zeroLimit =
    validateRateLimitPolicy({
      windowMs: 60_000,
      maxRequests: 0,
      scope: RATE_LIMIT_SCOPE.IP,
    });

  check(
    zeroLimit.valid === false,
    "zero request limit is rejected"
  );

  const stringLimit =
    validateRateLimitPolicy({
      windowMs: 60_000,
      maxRequests: "100",
      scope: RATE_LIMIT_SCOPE.IP,
    });

  check(
    stringLimit.valid === false,
    "string request limit is not silently coerced"
  );

  const invalidScope =
    validateRateLimitPolicy({
      windowMs: 60_000,
      maxRequests: 100,
      scope: "UNKNOWN_SCOPE",
    });

  check(
    invalidScope.valid === false,
    "unknown rate-limit scope is rejected"
  );

  const arrayPolicy =
    validateRateLimitPolicy([]);

  check(
    arrayPolicy.valid === false,
    "array is rejected as rate-limit policy"
  );

  // ============================================================
  // G. CORE INVARIANTS
  // ============================================================

  section("G. Core invariants");

  const invariantNames = [
    "publicAttackSurfaceRequiresRateLimiting",
    "explicitWindowRequired",
    "explicitLimitRequired",
    "zeroOrNegativeWindowForbidden",
    "zeroOrNegativeRequestLimitForbidden",
    "negativeCounterForbidden",
    "requestsAboveLimitMustBeDenied",
    "limiterUnavailableMustNotAllow",
    "limiterFailureMustFailClosed",
    "counterMustNotBeSilentlyCoerced",
    "policyMustNotBeSilentlyCoerced",
    "rateLimiterMustNotExecuteEquipmentControl",
    "optimizationDssRemainsNonExecutable",
    "optimizationDssAutoDispatchRemainsDisabled",
  ];

  for (const name of invariantNames) {
    check(
      RATE_LIMITING_INVARIANTS[
        name
      ] === true,
      `rate-limiting invariant enforced: ${name}`
    );
  }

  // ============================================================
  // H. ALLOW CASE
  // ============================================================

  section("H. Allow case");

  const allowed =
    evaluateRateLimit({
      currentCount: 10,
      policy: {
        windowMs: 60_000,
        maxRequests: 100,
        scope: RATE_LIMIT_SCOPE.IP,
      },
    });

  check(
    allowed.decision ===
      RATE_LIMIT_DECISION.ALLOW,
    "request below rate limit is allowed"
  );

  check(
    allowed.allowed === true,
    "allowed rate-limit result has allowed=true"
  );

  check(
    allowed.currentCount === 10,
    "current request count is preserved"
  );

  check(
    allowed.maxRequests === 100,
    "maximum request count is preserved"
  );

  check(
    allowed.remaining === 89,
    "remaining request budget is calculated explicitly"
  );

  check(
    allowed.reason === null,
    "allowed request has no denial reason"
  );

  // ============================================================
  // I. BOUNDARY CASE
  // ============================================================

  section("I. Limit boundary");

  const boundary =
    evaluateRateLimit({
      currentCount: 99,
      policy: {
        windowMs: 60_000,
        maxRequests: 100,
        scope: RATE_LIMIT_SCOPE.IP,
      },
    });

  check(
    boundary.allowed === true,
    "final permitted request is allowed"
  );

  check(
    boundary.remaining === 0,
    "final permitted request leaves zero remaining"
  );

  // ============================================================
  // J. LIMIT EXCEEDED
  // ============================================================

  section("J. Limit exceeded");

  const exceeded =
    evaluateRateLimit({
      currentCount: 100,
      policy: {
        windowMs: 60_000,
        maxRequests: 100,
        scope: RATE_LIMIT_SCOPE.IP,
      },
    });

  check(
    exceeded.decision ===
      RATE_LIMIT_DECISION.DENY,
    "request at exhausted limit is denied"
  );

  check(
    exceeded.allowed === false,
    "exhausted rate limit has allowed=false"
  );

  check(
    exceeded.reason ===
      RATE_LIMIT_DENIAL_REASON
        .LIMIT_EXCEEDED,
    "rate-limit exhaustion reason is explicit"
  );

  check(
    exceeded.remaining === 0,
    "denied request has zero remaining budget"
  );

  check(
    exceeded.retryAfterMs ===
      60_000,
    "retry interval reflects policy window"
  );

  const farExceeded =
    evaluateRateLimit({
      currentCount: 150,
      policy: {
        windowMs: 60_000,
        maxRequests: 100,
        scope: RATE_LIMIT_SCOPE.IP,
      },
    });

  check(
    farExceeded.allowed === false,
    "request count above threshold remains denied"
  );

  // ============================================================
  // K. INVALID COUNTER
  // ============================================================

  section("K. Invalid counter");

  const negativeCounter =
    evaluateRateLimit({
      currentCount: -1,
    });

  check(
    negativeCounter.allowed ===
      false,
    "negative request counter is denied"
  );

  check(
    negativeCounter.reason ===
      RATE_LIMIT_DENIAL_REASON
        .INVALID_COUNTER,
    "negative counter denial is explicit"
  );

  const stringCounter =
    evaluateRateLimit({
      currentCount: "10",
    });

  check(
    stringCounter.allowed ===
      false,
    "string counter is not silently coerced"
  );

  check(
    stringCounter.reason ===
      RATE_LIMIT_DENIAL_REASON
        .INVALID_COUNTER,
    "string counter rejection is explicit"
  );

  const fractionalCounter =
    evaluateRateLimit({
      currentCount: 1.5,
    });

  check(
    fractionalCounter.allowed ===
      false,
    "fractional request counter is denied"
  );

  // ============================================================
  // L. INVALID POLICY
  // ============================================================

  section("L. Invalid policy");

  const invalidPolicyResult =
    evaluateRateLimit({
      currentCount: 0,
      policy: {
        windowMs: 0,
        maxRequests: 100,
        scope: RATE_LIMIT_SCOPE.IP,
      },
    });

  check(
    invalidPolicyResult.allowed ===
      false,
    "invalid rate-limit policy cannot allow traffic"
  );

  check(
    invalidPolicyResult.reason ===
      RATE_LIMIT_DENIAL_REASON
        .INVALID_POLICY,
    "invalid rate-limit policy is explicit"
  );

  // ============================================================
  // M. LIMITER UNAVAILABLE
  // ============================================================

  section("M. Limiter unavailable");

  const unavailable =
    evaluateRateLimit({
      currentCount: 0,
      limiterAvailable: false,
    });

  check(
    unavailable.decision ===
      RATE_LIMIT_DECISION.UNAVAILABLE,
    "unavailable limiter produces UNAVAILABLE decision"
  );

  check(
    unavailable.allowed === false,
    "unavailable limiter does not silently allow traffic"
  );

  check(
    unavailable.reason ===
      RATE_LIMIT_DENIAL_REASON
        .LIMITER_UNAVAILABLE,
    "unavailable limiter reason is explicit"
  );

  // ============================================================
  // N. SAFETY BOUNDARY
  // ============================================================

  section("N. Safety boundary");

  check(
    allowed.equipmentControlExecuted ===
      false,
    "rate limiter executes no equipment control"
  );

  check(
    allowed.autoDispatchExecuted ===
      false,
    "rate limiter executes no auto-dispatch"
  );

  check(
    exceeded.equipmentControlExecuted ===
      false,
    "rate-limit denial executes no equipment control"
  );

  check(
    exceeded.autoDispatchExecuted ===
      false,
    "rate-limit denial executes no auto-dispatch"
  );

  // ============================================================
  // O. RESULT CONTRACT
  // ============================================================

  section("O. Result contract");

  const explicitResult =
    createRateLimitResult({
      decision:
        RATE_LIMIT_DECISION.DENY,
      currentCount: 100,
      maxRequests: 100,
      remaining: 0,
      retryAfterMs: 60_000,
      reason:
        RATE_LIMIT_DENIAL_REASON
          .LIMIT_EXCEEDED,
    });

  check(
    explicitResult.phase === "13.6",
    "rate-limit result preserves phase"
  );

  check(
    explicitResult.layer ===
      "RATE_LIMITING_AND_ABUSE_PROTECTION",
    "rate-limit result preserves layer"
  );

  check(
    explicitResult.allowed === false,
    "DENY result preserves allowed=false"
  );

  check(
    explicitResult.reason ===
      "LIMIT_EXCEEDED",
    "DENY result preserves reason"
  );

  // ============================================================
  // P. INVALID DECISION
  // ============================================================

  section("P. Invalid decision");

  let invalidDecisionRejected =
    false;

  try {
    createRateLimitResult({
      decision:
        "INVALID_DECISION",
    });
  } catch {
    invalidDecisionRejected = true;
  }

  check(
    invalidDecisionRejected,
    "unsupported rate-limit decision is rejected"
  );

  // ============================================================
  // Q. FROZEN STRUCTURES
  // ============================================================

  section("Q. Frozen structures");

  check(
    Object.isFrozen(
      RATE_LIMIT_DECISION
    ),
    "rate-limit decision taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      RATE_LIMIT_SCOPE
    ),
    "rate-limit scope taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      RATE_LIMIT_DENIAL_REASON
    ),
    "rate-limit denial taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DEFAULT_RATE_LIMIT_POLICY
    ),
    "default rate-limit policy is frozen"
  );

  check(
    Object.isFrozen(
      RATE_LIMITING_INVARIANTS
    ),
    "rate-limiting invariants are frozen"
  );

  check(
    Object.isFrozen(allowed),
    "rate-limit result is frozen"
  );

  // ============================================================
  // FINAL
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.6 RATE LIMITING / ABUSE PROTECTION RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Public attack surface      : RATE LIMITED"
  );

  console.log(
    "Rate-limit window          : EXPLICIT"
  );

  console.log(
    "Request threshold          : EXPLICIT"
  );

  console.log(
    "Negative counters          : FORBIDDEN"
  );

  console.log(
    "Silent counter coercion    : FORBIDDEN"
  );

  console.log(
    "Limit exhaustion           : DENIED"
  );

  console.log(
    "Limiter unavailable        : NOT ALLOWED"
  );

  console.log(
    "Limiter failure behavior   : FAIL CLOSED"
  );

  console.log(
    "Equipment control          : NONE"
  );

  console.log(
    "Auto-dispatch              : DISABLED"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    `\nAssertions passed: ${passed}`
  );

  console.log(
    "ASHMAAN PHASE 13.6 RATE LIMITING / ABUSE PROTECTION VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.6 RATE LIMITING / ABUSE PROTECTION VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}