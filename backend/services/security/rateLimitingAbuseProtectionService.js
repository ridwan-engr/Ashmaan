// ASHMAAN Phase 13.6
// Rate Limiting / Abuse Protection Service

export const RATE_LIMITING_PHASE = "13.6";

export const RATE_LIMITING_LAYER =
  "RATE_LIMITING_AND_ABUSE_PROTECTION";

export const RATE_LIMIT_DECISION = Object.freeze({
  ALLOW: "ALLOW",
  DENY: "DENY",
  UNAVAILABLE: "UNAVAILABLE",
});

export const RATE_LIMIT_SCOPE = Object.freeze({
  GLOBAL: "GLOBAL",
  IP: "IP",
  IDENTITY: "IDENTITY",
  ENDPOINT: "ENDPOINT",
});

export const RATE_LIMIT_DENIAL_REASON = Object.freeze({
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",
  INVALID_POLICY: "INVALID_POLICY",
  INVALID_COUNTER: "INVALID_COUNTER",
  LIMITER_UNAVAILABLE: "LIMITER_UNAVAILABLE",
});

export const DEFAULT_RATE_LIMIT_POLICY = Object.freeze({
  windowMs: 60_000,
  maxRequests: 100,
  scope: RATE_LIMIT_SCOPE.IP,
});

export const RATE_LIMITING_INVARIANTS = Object.freeze({
  publicAttackSurfaceRequiresRateLimiting: true,
  explicitWindowRequired: true,
  explicitLimitRequired: true,
  zeroOrNegativeWindowForbidden: true,
  zeroOrNegativeRequestLimitForbidden: true,
  negativeCounterForbidden: true,
  requestsAboveLimitMustBeDenied: true,
  limiterUnavailableMustNotAllow: true,
  limiterFailureMustFailClosed: true,
  counterMustNotBeSilentlyCoerced: true,
  policyMustNotBeSilentlyCoerced: true,
  rateLimiterMustNotExecuteEquipmentControl: true,
  optimizationDssRemainsNonExecutable: true,
  optimizationDssAutoDispatchRemainsDisabled: true,
});

function isPositiveInteger(value) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

function isNonNegativeInteger(value) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

export function validateRateLimitPolicy(
  policy = DEFAULT_RATE_LIMIT_POLICY
) {
  if (
    !policy ||
    typeof policy !== "object" ||
    Array.isArray(policy)
  ) {
    return Object.freeze({
      valid: false,
      reason:
        RATE_LIMIT_DENIAL_REASON.INVALID_POLICY,
    });
  }

  if (!isPositiveInteger(policy.windowMs)) {
    return Object.freeze({
      valid: false,
      reason:
        RATE_LIMIT_DENIAL_REASON.INVALID_POLICY,
    });
  }

  if (!isPositiveInteger(policy.maxRequests)) {
    return Object.freeze({
      valid: false,
      reason:
        RATE_LIMIT_DENIAL_REASON.INVALID_POLICY,
    });
  }

  if (
    !Object.values(
      RATE_LIMIT_SCOPE
    ).includes(policy.scope)
  ) {
    return Object.freeze({
      valid: false,
      reason:
        RATE_LIMIT_DENIAL_REASON.INVALID_POLICY,
    });
  }

  return Object.freeze({
    valid: true,
    reason: null,
  });
}

export function createRateLimitResult({
  decision,
  currentCount = null,
  maxRequests = null,
  remaining = null,
  retryAfterMs = null,
  reason = null,
} = {}) {
  if (
    !Object.values(
      RATE_LIMIT_DECISION
    ).includes(decision)
  ) {
    throw new TypeError(
      `Unsupported rate-limit decision: ${decision}`
    );
  }

  const allowed =
    decision ===
    RATE_LIMIT_DECISION.ALLOW;

  return Object.freeze({
    phase: RATE_LIMITING_PHASE,
    layer: RATE_LIMITING_LAYER,

    decision,
    allowed,

    currentCount,
    maxRequests,
    remaining,
    retryAfterMs,

    reason:
      allowed
        ? null
        : reason,

    equipmentControlExecuted: false,
    autoDispatchExecuted: false,

    invariants:
      RATE_LIMITING_INVARIANTS,
  });
}

export function evaluateRateLimit({
  currentCount,
  policy = DEFAULT_RATE_LIMIT_POLICY,
  limiterAvailable = true,
} = {}) {
  if (limiterAvailable !== true) {
    return createRateLimitResult({
      decision:
        RATE_LIMIT_DECISION.UNAVAILABLE,

      reason:
        RATE_LIMIT_DENIAL_REASON
          .LIMITER_UNAVAILABLE,
    });
  }

  const policyValidation =
    validateRateLimitPolicy(policy);

  if (!policyValidation.valid) {
    return createRateLimitResult({
      decision:
        RATE_LIMIT_DECISION.DENY,

      reason:
        RATE_LIMIT_DENIAL_REASON
          .INVALID_POLICY,
    });
  }

  if (!isNonNegativeInteger(currentCount)) {
    return createRateLimitResult({
      decision:
        RATE_LIMIT_DECISION.DENY,

      maxRequests:
        policy.maxRequests,

      reason:
        RATE_LIMIT_DENIAL_REASON
          .INVALID_COUNTER,
    });
  }

  const exceeded =
    currentCount >=
    policy.maxRequests;

  if (exceeded) {
    return createRateLimitResult({
      decision:
        RATE_LIMIT_DECISION.DENY,

      currentCount,
      maxRequests:
        policy.maxRequests,

      remaining: 0,

      retryAfterMs:
        policy.windowMs,

      reason:
        RATE_LIMIT_DENIAL_REASON
          .LIMIT_EXCEEDED,
    });
  }

  return createRateLimitResult({
    decision:
      RATE_LIMIT_DECISION.ALLOW,

    currentCount,
    maxRequests:
      policy.maxRequests,

    remaining:
      Math.max(
        policy.maxRequests -
          currentCount -
          1,
        0
      ),

    retryAfterMs: null,

    reason: null,
  });
}

export default evaluateRateLimit;