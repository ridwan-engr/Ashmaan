// ============================================================================
// ASHMAAN PHASE 14.2 — API LATENCY / RESPONSE-TIME BASELINE SERVICE
// ============================================================================
//
// Purpose:
// - Measure controlled sequential HTTP GET latency.
// - Produce baseline latency statistics.
// - Preserve Phase 13 security boundaries.
// - Perform no application/database mutation.
//
// This service:
// - uses GET only
// - uses finite request counts
// - uses finite timeouts
// - performs requests sequentially
// - does not retry failed requests
// - does not modify server configuration
//
// ============================================================================

import { performance } from "node:perf_hooks";

export const PHASE_14_API_LATENCY_BASELINE =
  Object.freeze({
    phase: "14.2",

    layer:
      "API_LATENCY_RESPONSE_TIME_BASELINE",

    category:
      "PERFORMANCE_BASELINE",

    mode:
      "MEASUREMENT_ONLY",

    defaults: Object.freeze({
      sampleCountPerEndpoint: 10,

      timeoutMs: 10_000,

      executionMode:
        "SEQUENTIAL",

      method:
        "GET",
    }),

    executionBoundary:
      Object.freeze({
        performsDatabaseMutation: false,

        performsDependencyMutation: false,

        performsSchedulerMutation: false,

        performsRuntimeConfigMutation:
          false,

        performsAuthenticationGrant:
          false,

        performsAuthorizationGrant:
          false,

        performsEquipmentControl: false,

        performsAutoDispatch: false,

        performsConcurrentFlood: false,
      }),
  });

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function isFinitePositiveNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function round(value, digits = 3) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor =
    10 ** digits;

  return (
    Math.round(
      value * factor
    ) / factor
  );
}

function percentile(
  sortedValues,
  percentileValue
) {
  if (
    !Array.isArray(sortedValues) ||
    sortedValues.length === 0
  ) {
    return null;
  }

  const rank =
    Math.ceil(
      percentileValue *
        sortedValues.length
    ) - 1;

  const boundedIndex =
    Math.min(
      sortedValues.length - 1,
      Math.max(0, rank)
    );

  return sortedValues[
    boundedIndex
  ];
}

function median(sortedValues) {
  if (
    !Array.isArray(sortedValues) ||
    sortedValues.length === 0
  ) {
    return null;
  }

  const length =
    sortedValues.length;

  const midpoint =
    Math.floor(
      length / 2
    );

  if (
    length % 2 === 1
  ) {
    return sortedValues[
      midpoint
    ];
  }

  return (
    (
      sortedValues[
        midpoint - 1
      ] +
      sortedValues[
        midpoint
      ]
    ) /
    2
  );
}

function normalizeHeaders(headers) {
  const normalized = {};

  if (
    !headers ||
    typeof headers.entries !==
      "function"
  ) {
    return normalized;
  }

  for (
    const [key, value]
    of headers.entries()
  ) {
    normalized[
      key.toLowerCase()
    ] = value;
  }

  return normalized;
}

function createTimeoutSignal(
  timeoutMs
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => {
        controller.abort();
      },
      timeoutMs
    );

  return {
    signal:
      controller.signal,

    cancel() {
      clearTimeout(timer);
    },
  };
}

// ---------------------------------------------------------------------------
// Single controlled probe
// ---------------------------------------------------------------------------

export async function measureApiRequest({
  url,
  timeoutMs =
    PHASE_14_API_LATENCY_BASELINE
      .defaults.timeoutMs,
} = {}) {
  if (
    typeof url !== "string" ||
    url.trim() === ""
  ) {
    throw new TypeError(
      "url must be a non-empty string"
    );
  }

  if (
    !isFinitePositiveNumber(
      timeoutMs
    )
  ) {
    throw new TypeError(
      "timeoutMs must be a finite positive number"
    );
  }

  const timeout =
    createTimeoutSignal(
      timeoutMs
    );

  const startedAt =
    performance.now();

  try {
    const response =
      await fetch(
        url,
        {
          method: "GET",

          signal:
            timeout.signal,

          headers: {
            Accept:
              "application/json",
          },

          redirect:
            "manual",
        }
      );

    const completedAt =
      performance.now();

    const latencyMs =
      completedAt -
      startedAt;

    const responseText =
      await response.text();

    return {
      url,

      method:
        "GET",

      reachable:
        true,

      timedOut:
        false,

      status:
        response.status,

      ok:
        response.ok,

      latencyMs:
        round(
          latencyMs
        ),

      headers:
        normalizeHeaders(
          response.headers
        ),

      responseBytes:
        Buffer.byteLength(
          responseText,
          "utf8"
        ),

      error:
        null,
    };
  } catch (error) {
    const completedAt =
      performance.now();

    const latencyMs =
      completedAt -
      startedAt;

    const timedOut =
      timeout.signal.aborted;

    return {
      url,

      method:
        "GET",

      reachable:
        false,

      timedOut,

      status:
        null,

      ok:
        false,

      latencyMs:
        round(
          latencyMs
        ),

      headers:
        {},

      responseBytes:
        0,

      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  } finally {
    timeout.cancel();
  }
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export function calculateLatencyStatistics(
  samples
) {
  if (
    !Array.isArray(samples)
  ) {
    throw new TypeError(
      "samples must be an array"
    );
  }

  const reachableSamples =
    samples.filter(
      (sample) =>
        sample.reachable ===
          true &&
        Number.isFinite(
          sample.latencyMs
        )
    );

  const values =
    reachableSamples
      .map(
        (sample) =>
          sample.latencyMs
      )
      .sort(
        (a, b) =>
          a - b
      );

  if (
    values.length === 0
  ) {
    return {
      sampleCount:
        samples.length,

      measuredCount:
        0,

      minMs:
        null,

      maxMs:
        null,

      meanMs:
        null,

      medianMs:
        null,

      p95Ms:
        null,

      p99Ms:
        null,
    };
  }

  const sum =
    values.reduce(
      (total, value) =>
        total + value,
      0
    );

  return {
    sampleCount:
      samples.length,

    measuredCount:
      values.length,

    minMs:
      round(values[0]),

    maxMs:
      round(
        values[
          values.length - 1
        ]
      ),

    meanMs:
      round(
        sum /
          values.length
      ),

    medianMs:
      round(
        median(values)
      ),

    p95Ms:
      round(
        percentile(
          values,
          0.95
        )
      ),

    p99Ms:
      round(
        percentile(
          values,
          0.99
        )
      ),
  };
}

function buildStatusDistribution(
  samples
) {
  const distribution = {};

  for (
    const sample
    of samples
  ) {
    const key =
      sample.status == null
        ? "NO_RESPONSE"
        : String(
            sample.status
          );

    distribution[key] =
      (
        distribution[
          key
        ] ?? 0
      ) + 1;
  }

  return distribution;
}

function inspectSecurityHeaders(
  samples
) {
  const reachableSamples =
    samples.filter(
      (sample) =>
        sample.reachable ===
        true
    );

  const requiredHeaders = [
    "content-security-policy",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
    "cross-origin-opener-policy",
    "cross-origin-resource-policy",
  ];

  const headerPresence = {};

  for (
    const headerName
    of requiredHeaders
  ) {
    headerPresence[
      headerName
    ] =
      reachableSamples.filter(
        (sample) =>
          typeof sample
            .headers[
              headerName
            ] ===
          "string"
      ).length;
  }

  const noPoweredByCount =
    reachableSamples.filter(
      (sample) =>
        !Object.prototype
          .hasOwnProperty.call(
            sample.headers,
            "x-powered-by"
          )
    ).length;

  return {
    reachableSampleCount:
      reachableSamples.length,

    requiredHeaders,

    headerPresence,

    noPoweredByCount,

    allReachableResponsesPreserveRequiredHeaders:
      reachableSamples.length >
        0 &&
      requiredHeaders.every(
        (headerName) =>
          headerPresence[
            headerName
          ] ===
          reachableSamples.length
      ),

    allReachableResponsesHidePoweredBy:
      reachableSamples.length >
        0 &&
      noPoweredByCount ===
        reachableSamples.length,
  };
}

// ---------------------------------------------------------------------------
// Endpoint baseline
// ---------------------------------------------------------------------------

export async function measureEndpointBaseline({
  name,
  url,
  expectedStatus = null,
  sampleCount =
    PHASE_14_API_LATENCY_BASELINE
      .defaults
      .sampleCountPerEndpoint,
  timeoutMs =
    PHASE_14_API_LATENCY_BASELINE
      .defaults.timeoutMs,
} = {}) {
  if (
    typeof name !== "string" ||
    name.trim() === ""
  ) {
    throw new TypeError(
      "name must be a non-empty string"
    );
  }

  if (
    typeof url !== "string" ||
    url.trim() === ""
  ) {
    throw new TypeError(
      "url must be a non-empty string"
    );
  }

  if (
    !Number.isInteger(
      sampleCount
    ) ||
    sampleCount < 1 ||
    sampleCount > 100
  ) {
    throw new RangeError(
      "sampleCount must be an integer between 1 and 100"
    );
  }

  if (
    !isFinitePositiveNumber(
      timeoutMs
    )
  ) {
    throw new TypeError(
      "timeoutMs must be a finite positive number"
    );
  }

  const samples = [];

  // Sequential by design.
  for (
    let index = 0;
    index < sampleCount;
    index += 1
  ) {
    const sample =
      await measureApiRequest({
        url,
        timeoutMs,
      });

    samples.push({
      sample:
        index + 1,

      ...sample,
    });
  }

  const reachableCount =
    samples.filter(
      (sample) =>
        sample.reachable ===
        true
    ).length;

  const successfulHttpCount =
    samples.filter(
      (sample) =>
        typeof sample.status ===
          "number" &&
        sample.status >= 200 &&
        sample.status < 400
    ).length;

  const timeoutCount =
    samples.filter(
      (sample) =>
        sample.timedOut ===
        true
    ).length;

  const errorCount =
    samples.filter(
      (sample) =>
        sample.reachable !==
        true
    ).length;

  const expectedStatusCount =
    expectedStatus == null
      ? null
      : samples.filter(
          (sample) =>
            sample.status ===
            expectedStatus
        ).length;

  return {
    name,

    url,

    method:
      "GET",

    expectedStatus,

    sampleCount,

    timeoutMs,

    executionMode:
      "SEQUENTIAL",

    reachableCount,

    successfulHttpCount,

    expectedStatusCount,

    timeoutCount,

    errorCount,

    statusDistribution:
      buildStatusDistribution(
        samples
      ),

    latency:
      calculateLatencyStatistics(
        samples
      ),

    security:
      inspectSecurityHeaders(
        samples
      ),

    samples,
  };
}

// ---------------------------------------------------------------------------
// Multi-endpoint baseline
// ---------------------------------------------------------------------------

export async function runApiLatencyBaseline({
  endpoints,
  sampleCount =
    PHASE_14_API_LATENCY_BASELINE
      .defaults
      .sampleCountPerEndpoint,
  timeoutMs =
    PHASE_14_API_LATENCY_BASELINE
      .defaults.timeoutMs,
} = {}) {
  if (
    !Array.isArray(
      endpoints
    ) ||
    endpoints.length === 0
  ) {
    throw new TypeError(
      "endpoints must be a non-empty array"
    );
  }

  if (
    endpoints.length > 10
  ) {
    throw new RangeError(
      "at most 10 endpoints may be measured per baseline"
    );
  }

  const results = [];

  // Endpoint execution is also sequential.
  for (
    const endpoint
    of endpoints
  ) {
    const result =
      await measureEndpointBaseline({
        ...endpoint,

        sampleCount,

        timeoutMs,
      });

    results.push(
      result
    );
  }

  const allSamples =
    results.flatMap(
      (result) =>
        result.samples
    );

  return {
    phase:
      PHASE_14_API_LATENCY_BASELINE.phase,

    layer:
      PHASE_14_API_LATENCY_BASELINE.layer,

    mode:
      PHASE_14_API_LATENCY_BASELINE.mode,

    endpointCount:
      results.length,

    sampleCountPerEndpoint:
      sampleCount,

    totalRequestCount:
      allSamples.length,

    timeoutMs,

    executionMode:
      "SEQUENTIAL",

    method:
      "GET",

    reachableCount:
      allSamples.filter(
        (sample) =>
          sample.reachable ===
          true
      ).length,

    timeoutCount:
      allSamples.filter(
        (sample) =>
          sample.timedOut ===
          true
      ).length,

    errorCount:
      allSamples.filter(
        (sample) =>
          sample.reachable !==
          true
      ).length,

    latency:
      calculateLatencyStatistics(
        allSamples
      ),

    endpoints:
      results,

    executionBoundary:
      PHASE_14_API_LATENCY_BASELINE
        .executionBoundary,
  };
}

export default
PHASE_14_API_LATENCY_BASELINE;