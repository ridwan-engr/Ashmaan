// ============================================================================
// ASHMAAN PHASE 14.2 — API LATENCY / RESPONSE-TIME BASELINE VALIDATION
// ============================================================================
//
// Controlled live runtime measurement.
//
// Requirements:
// - backend must already be running
// - GET-only
// - 10 samples per endpoint
// - 3 endpoints
// - 30 requests total
// - sequential execution
// - 10 second timeout per request
//
// ============================================================================

import assert from "node:assert/strict";

import apiLatencyContract, {
  calculateLatencyStatistics,
  runApiLatencyBaseline,
} from "../services/performance/apiLatencyBaselineService.js";

const BASE_URL =
  process.env
    .ASHMAAN_RUNTIME_URL ??
  "http://localhost:5000";

const API_BASE =
  process.env
    .ASHMAAN_API_BASE ??
  "/api/v1";

const SAMPLE_COUNT =
  10;

const TIMEOUT_MS =
  10_000;

const UNKNOWN_ROUTE =
  `${API_BASE}/phase14-latency-probe-not-found`;

let assertionsPassed = 0;

function check(
  condition,
  message
) {
  assert.ok(
    condition,
    message
  );

  assertionsPassed += 1;

  console.log(
    `PASS ${assertionsPassed}: ${message}`
  );
}

function section(
  title
) {
  console.log("");
  console.log(
    `--- ${title} ---`
  );
}

function formatMs(
  value
) {
  if (
    value == null
  ) {
    return "N/A";
  }

  return `${value.toFixed(
    3
  )} ms`;
}

function printEndpointResult(
  result
) {
  console.log("");
  console.log(
    `[${result.name}]`
  );

  console.log(
    `URL                 : ${result.url}`
  );

  console.log(
    `Requests            : ${result.sampleCount}`
  );

  console.log(
    `Reachable           : ${result.reachableCount}/${result.sampleCount}`
  );

  console.log(
    `Expected status     : ${
      result.expectedStatus ??
      "N/A"
    }`
  );

  console.log(
    `Status distribution : ${JSON.stringify(
      result.statusDistribution
    )}`
  );

  console.log(
    `Timeouts            : ${result.timeoutCount}`
  );

  console.log(
    `Errors              : ${result.errorCount}`
  );

  console.log(
    `Min                 : ${formatMs(
      result.latency.minMs
    )}`
  );

  console.log(
    `Max                 : ${formatMs(
      result.latency.maxMs
    )}`
  );

  console.log(
    `Mean                : ${formatMs(
      result.latency.meanMs
    )}`
  );

  console.log(
    `Median              : ${formatMs(
      result.latency.medianMs
    )}`
  );

  console.log(
    `P95                 : ${formatMs(
      result.latency.p95Ms
    )}`
  );

  console.log(
    `P99                 : ${formatMs(
      result.latency.p99Ms
    )}`
  );

  console.log(
    `Security headers    : ${
      result.security
        .allReachableResponsesPreserveRequiredHeaders
        ? "PRESERVED"
        : "NOT FULLY PRESERVED"
    }`
  );

  console.log(
    `X-Powered-By hidden : ${
      result.security
        .allReachableResponsesHidePoweredBy
        ? "YES"
        : "NO"
    }`
  );
}

console.log("");
console.log(
  "=".repeat(72)
);

console.log(
  "ASHMAAN PHASE 14.2 — API LATENCY / RESPONSE-TIME BASELINE VALIDATION"
);

console.log(
  "=".repeat(72)
);

console.log(
  `Backend URL         : ${BASE_URL}`
);

console.log(
  `API base            : ${API_BASE}`
);

console.log(
  `Samples / endpoint  : ${SAMPLE_COUNT}`
);

console.log(
  `Timeout / request   : ${TIMEOUT_MS} ms`
);

console.log(
  "Execution           : SEQUENTIAL"
);

console.log(
  "Method              : GET ONLY"
);

try {
  // -------------------------------------------------------------------------
  // A. Contract identity
  // -------------------------------------------------------------------------

  section(
    "A. Phase identity and contract"
  );

  check(
    apiLatencyContract.phase ===
      "14.2",
    "phase identity is 14.2"
  );

  check(
    apiLatencyContract.layer ===
      "API_LATENCY_RESPONSE_TIME_BASELINE",
    "layer identity is API_LATENCY_RESPONSE_TIME_BASELINE"
  );

  check(
    apiLatencyContract.category ===
      "PERFORMANCE_BASELINE",
    "category is PERFORMANCE_BASELINE"
  );

  check(
    apiLatencyContract.mode ===
      "MEASUREMENT_ONLY",
    "14.2 is measurement-only"
  );

  check(
    apiLatencyContract.defaults
      .method === "GET",
    "default HTTP method is GET"
  );

  check(
    apiLatencyContract.defaults
      .executionMode ===
      "SEQUENTIAL",
    "default execution mode is sequential"
  );

  check(
    apiLatencyContract.defaults
      .sampleCountPerEndpoint ===
      10,
    "default sample count is bounded at 10 per endpoint"
  );

  check(
    apiLatencyContract.defaults
      .timeoutMs ===
      10_000,
    "default request timeout is finite at 10000 ms"
  );

  // -------------------------------------------------------------------------
  // B. Statistics helper validation
  // -------------------------------------------------------------------------

  section(
    "B. Latency statistics helper"
  );

  const syntheticSamples = [
    {
      reachable: true,
      latencyMs: 10,
    },
    {
      reachable: true,
      latencyMs: 20,
    },
    {
      reachable: true,
      latencyMs: 30,
    },
    {
      reachable: true,
      latencyMs: 40,
    },
    {
      reachable: true,
      latencyMs: 50,
    },
  ];

  const synthetic =
    calculateLatencyStatistics(
      syntheticSamples
    );

  check(
    synthetic.sampleCount ===
      5,
    "statistics preserve sample count"
  );

  check(
    synthetic.measuredCount ===
      5,
    "statistics preserve measured count"
  );

  check(
    synthetic.minMs ===
      10,
    "minimum latency calculation is correct"
  );

  check(
    synthetic.maxMs ===
      50,
    "maximum latency calculation is correct"
  );

  check(
    synthetic.meanMs ===
      30,
    "mean latency calculation is correct"
  );

  check(
    synthetic.medianMs ===
      30,
    "median latency calculation is correct"
  );

  check(
    synthetic.p95Ms ===
      50,
    "P95 calculation is deterministic"
  );

  check(
    synthetic.p99Ms ===
      50,
    "P99 calculation is deterministic"
  );

  // -------------------------------------------------------------------------
  // C. Execution boundary
  // -------------------------------------------------------------------------

  section(
    "C. Measurement safety boundary"
  );

  const boundary =
    apiLatencyContract
      .executionBoundary;

  check(
    boundary.performsDatabaseMutation ===
      false,
    "baseline performs no database mutation"
  );

  check(
    boundary.performsDependencyMutation ===
      false,
    "baseline performs no dependency mutation"
  );

  check(
    boundary.performsSchedulerMutation ===
      false,
    "baseline performs no scheduler mutation"
  );

  check(
    boundary.performsRuntimeConfigMutation ===
      false,
    "baseline performs no runtime configuration mutation"
  );

  check(
    boundary.performsAuthenticationGrant ===
      false,
    "baseline performs no authentication grant"
  );

  check(
    boundary.performsAuthorizationGrant ===
      false,
    "baseline performs no authorization grant"
  );

  check(
    boundary.performsEquipmentControl ===
      false,
    "baseline performs no equipment control"
  );

  check(
    boundary.performsAutoDispatch ===
      false,
    "baseline performs no automatic dispatch"
  );

  check(
    boundary.performsConcurrentFlood ===
      false,
    "baseline performs no concurrent request flood"
  );

  // -------------------------------------------------------------------------
  // D. Execute live baseline
  // -------------------------------------------------------------------------

  section(
    "D. Live API latency baseline"
  );

  const baseline =
    await runApiLatencyBaseline({
      endpoints: [
        {
          name:
            "ROOT_HEALTH",

          url:
            `${BASE_URL}/`,

          expectedStatus:
            200,
        },

        {
          name:
            "API_BASE",

          url:
            `${BASE_URL}${API_BASE}`,

          // We intentionally do not assume
          // that /api/v1 itself has a route.
          expectedStatus:
            null,
        },

        {
          name:
            "SAFE_404",

          url:
            `${BASE_URL}${UNKNOWN_ROUTE}`,

          expectedStatus:
            404,
        },
      ],

      sampleCount:
        SAMPLE_COUNT,

      timeoutMs:
        TIMEOUT_MS,
    });

  check(
    baseline.phase ===
      "14.2",
    "live baseline identifies Phase 14.2"
  );

  check(
    baseline.layer ===
      "API_LATENCY_RESPONSE_TIME_BASELINE",
    "live baseline identifies correct performance layer"
  );

  check(
    baseline.mode ===
      "MEASUREMENT_ONLY",
    "live baseline remains measurement-only"
  );

  check(
    baseline.endpointCount ===
      3,
    "exactly three controlled endpoints were measured"
  );

  check(
    baseline.sampleCountPerEndpoint ===
      10,
    "exactly ten samples were executed per endpoint"
  );

  check(
    baseline.totalRequestCount ===
      30,
    "exactly thirty controlled requests were executed"
  );

  check(
    baseline.executionMode ===
      "SEQUENTIAL",
    "live baseline executed sequentially"
  );

  check(
    baseline.method ===
      "GET",
    "live baseline used GET only"
  );

  check(
    baseline.timeoutMs ===
      10_000,
    "live request timeout remained bounded at 10000 ms"
  );

  check(
    baseline.reachableCount ===
      30,
    "all thirty baseline requests reached the backend"
  );

  check(
    baseline.timeoutCount ===
      0,
    "baseline produced no request timeouts"
  );

  check(
    baseline.errorCount ===
      0,
    "baseline produced no transport errors"
  );

  check(
    baseline.latency.measuredCount ===
      30,
    "all thirty requests contributed latency measurements"
  );

  check(
    Number.isFinite(
      baseline.latency.minMs
    ) &&
      baseline.latency.minMs >=
        0,
    "aggregate minimum latency is finite"
  );

  check(
    Number.isFinite(
      baseline.latency.maxMs
    ) &&
      baseline.latency.maxMs >=
        baseline.latency.minMs,
    "aggregate maximum latency is finite and ordered"
  );

  check(
    Number.isFinite(
      baseline.latency.meanMs
    ),
    "aggregate mean latency is finite"
  );

  check(
    Number.isFinite(
      baseline.latency.medianMs
    ),
    "aggregate median latency is finite"
  );

  check(
    Number.isFinite(
      baseline.latency.p95Ms
    ),
    "aggregate P95 latency is finite"
  );

  check(
    Number.isFinite(
      baseline.latency.p99Ms
    ),
    "aggregate P99 latency is finite"
  );

  // -------------------------------------------------------------------------
  // E. Endpoint-specific validation
  // -------------------------------------------------------------------------

  section(
    "E. Endpoint-specific baseline integrity"
  );

  const root =
    baseline.endpoints.find(
      (result) =>
        result.name ===
        "ROOT_HEALTH"
    );

  const apiBase =
    baseline.endpoints.find(
      (result) =>
        result.name ===
        "API_BASE"
    );

  const safe404 =
    baseline.endpoints.find(
      (result) =>
        result.name ===
        "SAFE_404"
    );

  check(
    root != null,
    "root baseline result exists"
  );

  check(
    apiBase != null,
    "API-base baseline result exists"
  );

  check(
    safe404 != null,
    "safe-404 baseline result exists"
  );

  check(
    root.expectedStatusCount ===
      10,
    "root endpoint returned HTTP 200 for all ten probes"
  );

  check(
    safe404.expectedStatusCount ===
      10,
    "safe unknown route returned HTTP 404 for all ten probes"
  );

  check(
    apiBase.reachableCount ===
      10,
    "API base remained reachable for all ten probes"
  );

  for (
    const result
    of baseline.endpoints
  ) {
    check(
      result.sampleCount ===
        10,
      `${result.name} contains exactly ten samples`
    );

    check(
      result.reachableCount ===
        10,
      `${result.name} was reachable for every sample`
    );

    check(
      result.timeoutCount ===
        0,
      `${result.name} produced no timeouts`
    );

    check(
      result.errorCount ===
        0,
      `${result.name} produced no transport errors`
    );

    check(
      result.latency.measuredCount ===
        10,
      `${result.name} produced ten latency measurements`
    );

    check(
      Number.isFinite(
        result.latency.minMs
      ),
      `${result.name} minimum latency is finite`
    );

    check(
      Number.isFinite(
        result.latency.maxMs
      ),
      `${result.name} maximum latency is finite`
    );

    check(
      Number.isFinite(
        result.latency.meanMs
      ),
      `${result.name} mean latency is finite`
    );

    check(
      Number.isFinite(
        result.latency.medianMs
      ),
      `${result.name} median latency is finite`
    );

    check(
      Number.isFinite(
        result.latency.p95Ms
      ),
      `${result.name} P95 latency is finite`
    );

    check(
      Number.isFinite(
        result.latency.p99Ms
      ),
      `${result.name} P99 latency is finite`
    );
  }

  // -------------------------------------------------------------------------
  // F. Phase 13 security preservation
  // -------------------------------------------------------------------------

  section(
    "F. Phase 13 runtime security preservation"
  );

  for (
    const result
    of baseline.endpoints
  ) {
    check(
      result.security
        .allReachableResponsesPreserveRequiredHeaders ===
        true,
      `${result.name} preserved required security headers`
    );

    check(
      result.security
        .allReachableResponsesHidePoweredBy ===
        true,
      `${result.name} does not disclose X-Powered-By`
    );
  }

  // -------------------------------------------------------------------------
  // G. Report measured values
  // -------------------------------------------------------------------------

  section(
    "G. Measured baseline"
  );

  for (
    const result
    of baseline.endpoints
  ) {
    printEndpointResult(
      result
    );
  }

  console.log("");
  console.log(
    "[AGGREGATE]"
  );

  console.log(
    `Requests            : ${baseline.totalRequestCount}`
  );

  console.log(
    `Reachable           : ${baseline.reachableCount}/${baseline.totalRequestCount}`
  );

  console.log(
    `Timeouts            : ${baseline.timeoutCount}`
  );

  console.log(
    `Errors              : ${baseline.errorCount}`
  );

  console.log(
    `Min                 : ${formatMs(
      baseline.latency.minMs
    )}`
  );

  console.log(
    `Max                 : ${formatMs(
      baseline.latency.maxMs
    )}`
  );

  console.log(
    `Mean                : ${formatMs(
      baseline.latency.meanMs
    )}`
  );

  console.log(
    `Median              : ${formatMs(
      baseline.latency.medianMs
    )}`
  );

  console.log(
    `P95                 : ${formatMs(
      baseline.latency.p95Ms
    )}`
  );

  console.log(
    `P99                 : ${formatMs(
      baseline.latency.p99Ms
    )}`
  );

  // -------------------------------------------------------------------------
  // H. Final safety confirmation
  // -------------------------------------------------------------------------

  section(
    "H. Final safety confirmation"
  );

  check(
    baseline.executionBoundary
      .performsDatabaseMutation ===
      false,
    "live baseline performed no database mutation by contract"
  );

  check(
    baseline.executionBoundary
      .performsEquipmentControl ===
      false,
    "live baseline performed no equipment control"
  );

  check(
    baseline.executionBoundary
      .performsAutoDispatch ===
      false,
    "live baseline performed no automatic dispatch"
  );

  check(
    baseline.executionBoundary
      .performsConcurrentFlood ===
      false,
    "live baseline remained non-concurrent"
  );

  // -------------------------------------------------------------------------
  // Final result
  // -------------------------------------------------------------------------

  console.log("");
  console.log(
    "-".repeat(72)
  );

  console.log(
    "PHASE 14.2 API LATENCY BASELINE RESULT"
  );

  console.log(
    "-".repeat(72)
  );

  console.log(
    `Endpoint count       : ${baseline.endpointCount}`
  );

  console.log(
    `Requests             : ${baseline.totalRequestCount}`
  );

  console.log(
    `Reachable            : ${baseline.reachableCount}/${baseline.totalRequestCount}`
  );

  console.log(
    `Timeouts             : ${baseline.timeoutCount}`
  );

  console.log(
    `Transport errors     : ${baseline.errorCount}`
  );

  console.log(
    `Aggregate min        : ${formatMs(
      baseline.latency.minMs
    )}`
  );

  console.log(
    `Aggregate max        : ${formatMs(
      baseline.latency.maxMs
    )}`
  );

  console.log(
    `Aggregate mean       : ${formatMs(
      baseline.latency.meanMs
    )}`
  );

  console.log(
    `Aggregate median     : ${formatMs(
      baseline.latency.medianMs
    )}`
  );

  console.log(
    `Aggregate P95        : ${formatMs(
      baseline.latency.p95Ms
    )}`
  );

  console.log(
    `Aggregate P99        : ${formatMs(
      baseline.latency.p99Ms
    )}`
  );

  console.log(
    "Execution mode       : SEQUENTIAL"
  );

  console.log(
    "HTTP method          : GET ONLY"
  );

  console.log(
    "Database mutation    : NONE"
  );

  console.log(
    "Equipment control    : NONE"
  );

  console.log(
    "Auto-dispatch        : DISABLED"
  );

  console.log(
    "-".repeat(72)
  );

  console.log("");
  console.log(
    `Assertions passed: ${assertionsPassed}`
  );

  console.log(
    "ASHMAAN PHASE 14.2 API LATENCY / RESPONSE-TIME BASELINE VALIDATION PASSED"
  );

  process.exitCode = 0;
} catch (error) {
  console.error("");
  console.error(
    "=".repeat(72)
  );

  console.error(
    "ASHMAAN PHASE 14.2 API LATENCY / RESPONSE-TIME BASELINE VALIDATION FAILED"
  );

  console.error(
    "=".repeat(72)
  );

  console.error(error);

  console.error("");
  console.error(
    "Do not optimize or patch production runtime based on assumptions."
  );

  console.error(
    "Use the first failed assertion and measured runtime evidence only."
  );

  process.exitCode = 1;
}