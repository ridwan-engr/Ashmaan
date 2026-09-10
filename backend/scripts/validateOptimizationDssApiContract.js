// scripts/validateOptimizationDssApiContract.js

import assert from "node:assert/strict";

import {
  OPTIMIZATION_DSS_API_CONTRACT_PHASE,
  OPTIMIZATION_DSS_API_CONTRACT_LAYER,
  OPTIMIZATION_DSS_API_CONTRACT_UPSTREAM_PHASE,
  OPTIMIZATION_DSS_API_BASE_PATH,
  OPTIMIZATION_DSS_API_ENDPOINTS,
  OPTIMIZATION_DSS_API_RESPONSE_STATUS,
  OPTIMIZATION_DSS_API_SORT_DIRECTION,
  OPTIMIZATION_DSS_API_DEFAULTS,
  OPTIMIZATION_DSS_API_ALLOWED_SORT_FIELDS,
  OPTIMIZATION_DSS_API_FILTER_FIELDS,
  OPTIMIZATION_DSS_API_BOUNDARIES,
  buildOptimizationDssApiListRequest,
  buildOptimizationDssApiGetRequest,
  buildOptimizationDssApiEnvelope,
} from "../services/optimizationDss/optimizationDssApiContract.js";


let assertions = 0;

function pass(message) {
  assertions += 1;
  console.log(`PASS ${assertions}: ${message}`);
}

function expectThrow(
  fn,
  message
) {
  assert.throws(fn);
  pass(message);
}


console.log();
console.log("================================================");
console.log("ASHMAAN OPTIMIZATION/DSS API CONTRACT VALIDATION");
console.log("================================================");
console.log(`Phase: ${OPTIMIZATION_DSS_API_CONTRACT_PHASE}`);
console.log();


assert.equal(
  OPTIMIZATION_DSS_API_CONTRACT_PHASE,
  "11.12"
);
pass("11.12 phase identity is correct");

assert.equal(
  OPTIMIZATION_DSS_API_CONTRACT_LAYER,
  "OPTIMIZATION_DSS"
);
pass("11.12 remains inside Optimization/DSS");

assert.equal(
  OPTIMIZATION_DSS_API_CONTRACT_UPSTREAM_PHASE,
  "11.11"
);
pass("11.12 consumes validated Phase 11.11 persistence implementation");

assert.equal(
  OPTIMIZATION_DSS_API_BASE_PATH,
  "/api/optimization-dss"
);
pass("Optimization/DSS API base path is explicit");

assert.equal(
  OPTIMIZATION_DSS_API_ENDPOINTS
    .LIST_RECOMMENDATIONS
    .method,
  "GET"
);
pass("list recommendations endpoint is GET");

assert.equal(
  OPTIMIZATION_DSS_API_ENDPOINTS
    .LIST_RECOMMENDATIONS
    .fullPath,
  "/api/optimization-dss/recommendations"
);
pass("list recommendations endpoint path is explicit");

assert.equal(
  OPTIMIZATION_DSS_API_ENDPOINTS
    .GET_RECOMMENDATION
    .method,
  "GET"
);
pass("get recommendation endpoint is GET");

assert.equal(
  OPTIMIZATION_DSS_API_ENDPOINTS
    .GET_RECOMMENDATION
    .fullPath,
  "/api/optimization-dss/recommendations/:persistenceKey"
);
pass("get recommendation endpoint path is explicit");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_API_RESPONSE_STATUS
  ),
  [
    "OK",
    "NOT_FOUND",
    "INVALID_REQUEST",
    "UNAVAILABLE",
  ]
);
pass("API response statuses are controlled");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_API_SORT_DIRECTION
  ),
  [
    "asc",
    "desc",
  ]
);
pass("API sort directions are controlled");

assert.equal(
  OPTIMIZATION_DSS_API_DEFAULTS.page,
  1
);
pass("default page is explicit");

assert.equal(
  OPTIMIZATION_DSS_API_DEFAULTS.limit,
  25
);
pass("default page size is explicit");

assert.equal(
  OPTIMIZATION_DSS_API_DEFAULTS.maxLimit,
  100
);
pass("maximum page size is explicit");

assert.equal(
  OPTIMIZATION_DSS_API_DEFAULTS.sortBy,
  "createdAt"
);
pass("default sort field is explicit");

assert.equal(
  OPTIMIZATION_DSS_API_DEFAULTS.sortDirection,
  "desc"
);
pass("default sort direction is explicit");

assert.equal(
  OPTIMIZATION_DSS_API_ALLOWED_SORT_FIELDS.includes(
    "horizon.start"
  ),
  true
);
pass("horizon start is an allowed sort field");

assert.equal(
  OPTIMIZATION_DSS_API_FILTER_FIELDS.includes(
    "vrmSiteId"
  ),
  true
);
pass("site filter is explicitly supported");

assert.equal(
  OPTIMIZATION_DSS_API_FILTER_FIELDS.includes(
    "fleetId"
  ),
  true
);
pass("fleet filter is explicitly supported");

assert.equal(
  OPTIMIZATION_DSS_API_FILTER_FIELDS.includes(
    "recommendationKind"
  ),
  true
);
pass("recommendation-kind filter is explicitly supported");

assert.equal(
  OPTIMIZATION_DSS_API_FILTER_FIELDS.includes(
    "generationStatus"
  ),
  true
);
pass("generation-status filter is explicitly supported");


const defaultListRequest =
  buildOptimizationDssApiListRequest();


assert.equal(
  defaultListRequest.method,
  "GET"
);
pass("list request remains read-only GET");

assert.equal(
  defaultListRequest.path,
  "/api/optimization-dss/recommendations"
);
pass("list request uses canonical endpoint");

assert.equal(
  defaultListRequest.page,
  1
);
pass("list request applies default page");

assert.equal(
  defaultListRequest.limit,
  25
);
pass("list request applies default limit");

assert.equal(
  defaultListRequest.offset,
  0
);
pass("first page offset is zero");

assert.equal(
  defaultListRequest.sort.field,
  "createdAt"
);
pass("list request applies default sort field");

assert.equal(
  defaultListRequest.sort.direction,
  "desc"
);
pass("list request applies default sort direction");

assert.equal(
  defaultListRequest.filters.scope,
  null
);
pass("missing scope filter remains null");

assert.equal(
  defaultListRequest.filters.vrmSiteId,
  null
);
pass("missing site filter remains null");

assert.equal(
  defaultListRequest.filters.horizonStart,
  null
);
pass("missing horizon start remains null");

assert.equal(
  defaultListRequest.filters.horizonEnd,
  null
);
pass("missing horizon end remains null");


const filteredListRequest =
  buildOptimizationDssApiListRequest({
    query: {
      page:
        "2",
      limit:
        "10",
      sortBy:
        "horizon.start",
      sortDirection:
        "asc",
      scope:
        "SITE",
      vrmSiteId:
        "vrm-site-001",
      recommendationKind:
        "DISPATCH_SETPOINT",
      generationStatus:
        "GENERATED",
      applicability:
        "APPLICABLE",
      confidence:
        "HIGH",
      horizonStart:
        "2026-09-08T00:00:00Z",
      horizonEnd:
        "2026-09-08T02:00:00Z",
    },
  });


assert.equal(
  filteredListRequest.page,
  2
);
pass("explicit page is parsed");

assert.equal(
  filteredListRequest.limit,
  10
);
pass("explicit limit is parsed");

assert.equal(
  filteredListRequest.offset,
  10
);
pass("pagination offset is deterministic");

assert.equal(
  filteredListRequest.sort.field,
  "horizon.start"
);
pass("explicit sort field is preserved");

assert.equal(
  filteredListRequest.sort.direction,
  "asc"
);
pass("explicit sort direction is preserved");

assert.equal(
  filteredListRequest.filters.scope,
  "SITE"
);
pass("scope filter is preserved");

assert.equal(
  filteredListRequest.filters.vrmSiteId,
  "vrm-site-001"
);
pass("site filter is preserved");

assert.equal(
  filteredListRequest.filters.recommendationKind,
  "DISPATCH_SETPOINT"
);
pass("recommendation-kind filter is preserved");

assert.equal(
  filteredListRequest.filters.generationStatus,
  "GENERATED"
);
pass("generation-status filter is preserved");

assert.equal(
  filteredListRequest.filters.applicability,
  "APPLICABLE"
);
pass("applicability filter is preserved");

assert.equal(
  filteredListRequest.filters.confidence,
  "HIGH"
);
pass("confidence filter is preserved");

assert.equal(
  filteredListRequest.filters.horizonStart,
  "2026-09-08T00:00:00.000Z"
);
pass("horizon start is normalized to ISO");

assert.equal(
  filteredListRequest.filters.horizonEnd,
  "2026-09-08T02:00:00.000Z"
);
pass("horizon end is normalized to ISO");


expectThrow(
  () =>
    buildOptimizationDssApiListRequest({
      query: {
        page:
          "0",
      },
    }),
  "page zero is rejected"
);

expectThrow(
  () =>
    buildOptimizationDssApiListRequest({
      query: {
        limit:
          "101",
      },
    }),
  "limit above maximum is rejected"
);

expectThrow(
  () =>
    buildOptimizationDssApiListRequest({
      query: {
        sortBy:
          "objectiveValue",
      },
    }),
  "undeclared sort field is rejected"
);

expectThrow(
  () =>
    buildOptimizationDssApiListRequest({
      query: {
        sortDirection:
          "sideways",
      },
    }),
  "undeclared sort direction is rejected"
);

expectThrow(
  () =>
    buildOptimizationDssApiListRequest({
      query: {
        horizonStart:
          "invalid-date",
      },
    }),
  "invalid horizon start is rejected"
);

expectThrow(
  () =>
    buildOptimizationDssApiListRequest({
      query: {
        horizonStart:
          "2026-09-09T00:00:00Z",
        horizonEnd:
          "2026-09-08T00:00:00Z",
      },
    }),
  "reversed horizon range is rejected"
);


const persistenceKey =
  "a".repeat(64);

const getRequest =
  buildOptimizationDssApiGetRequest({
    persistenceKey,
  });


assert.equal(
  getRequest.method,
  "GET"
);
pass("get-by-key request remains read-only GET");

assert.equal(
  getRequest.path,
  "/api/optimization-dss/recommendations/:persistenceKey"
);
pass("get-by-key request uses canonical route template");

assert.equal(
  getRequest.persistenceKey,
  persistenceKey
);
pass("get-by-key request preserves persistence key");

expectThrow(
  () =>
    buildOptimizationDssApiGetRequest({
      persistenceKey:
        "not-a-key",
    }),
  "invalid persistence key is rejected"
);


const okListEnvelope =
  buildOptimizationDssApiEnvelope({
    status:
      "OK",
    data:
      [],
    meta: {
      page:
        1,
      limit:
        25,
      total:
        0,
    },
  });


assert.equal(
  okListEnvelope.phase,
  "11.12"
);
pass("API envelope preserves Phase 11.12 identity");

assert.equal(
  okListEnvelope.layer,
  "OPTIMIZATION_DSS"
);
pass("API envelope remains inside Optimization/DSS");

assert.equal(
  okListEnvelope.status,
  "OK"
);
pass("OK envelope status is explicit");

assert.deepEqual(
  okListEnvelope.data,
  []
);
pass("OK envelope preserves empty list as empty list");

assert.equal(
  okListEnvelope.meta.total,
  0
);
pass("explicit zero result count is preserved");

assert.equal(
  okListEnvelope.error,
  null
);
pass("OK envelope has no error");


const notFoundEnvelope =
  buildOptimizationDssApiEnvelope({
    status:
      "NOT_FOUND",
    error: {
      code:
        "RECOMMENDATION_NOT_FOUND",
    },
  });


assert.equal(
  notFoundEnvelope.status,
  "NOT_FOUND"
);
pass("NOT_FOUND envelope status is explicit");

assert.equal(
  notFoundEnvelope.data,
  null
);
pass("NOT_FOUND envelope fabricates no data");

assert.equal(
  notFoundEnvelope.error.code,
  "RECOMMENDATION_NOT_FOUND"
);
pass("NOT_FOUND envelope preserves explicit error code");


const unavailableEnvelope =
  buildOptimizationDssApiEnvelope({
    status:
      "UNAVAILABLE",
    error: {
      code:
        "READ_REPOSITORY_UNAVAILABLE",
    },
  });


assert.equal(
  unavailableEnvelope.status,
  "UNAVAILABLE"
);
pass("UNAVAILABLE envelope status is explicit");

assert.equal(
  unavailableEnvelope.data,
  null
);
pass("UNAVAILABLE envelope fabricates no data");


expectThrow(
  () =>
    buildOptimizationDssApiEnvelope({
      status:
        "UNKNOWN",
    }),
  "undeclared API status is rejected"
);

expectThrow(
  () =>
    buildOptimizationDssApiEnvelope({
      status:
        "OK",
      data: [],
      error: {
        code:
          "INVALID",
      },
    }),
  "OK envelope cannot contain error payload"
);

expectThrow(
  () =>
    buildOptimizationDssApiEnvelope({
      status:
        "NOT_FOUND",
      data: {},
      error: {
        code:
          "NOT_FOUND",
      },
    }),
  "non-OK envelope cannot contain data payload"
);


const boundaryChecks =
  [
    ["contractOnly", true, "11.12 remains API-contract-only"],
    ["readOnly", true, "Optimization/DSS API contract is read-only"],
    ["listEndpointIncluded", true, "list endpoint is included"],
    ["getByPersistenceKeyEndpointIncluded", true, "get-by-persistence-key endpoint is included"],
    ["createEndpointIncluded", false, "create endpoint remains excluded"],
    ["updateEndpointIncluded", false, "update endpoint remains excluded"],
    ["deleteEndpointIncluded", false, "delete endpoint remains excluded"],
    ["persistenceMutationIncluded", false, "API contract cannot mutate persisted Optimization/DSS records"],
    ["routeImplementationIncluded", false, "route implementation remains excluded"],
    ["controllerImplementationIncluded", false, "controller implementation remains excluded"],
    ["serviceImplementationIncluded", false, "API service implementation remains excluded"],
    ["serverMountIncluded", false, "server.js route mount remains excluded"],
    ["liveHttpValidated", false, "live HTTP success is not claimed"],
    ["dashboardIncluded", false, "Optimization/DSS dashboard remains excluded"],
    ["automatedControlIncluded", false, "automated control remains excluded"],
    ["automaticDispatchAllowed", false, "11.12 cannot auto-dispatch"],
    ["executableActionProduced", false, "11.12 produces no executable control action"],
    ["financialBiMutationIncluded", false, "11.12 cannot mutate Financial/BI"],
    ["forecastingMutationIncluded", false, "11.12 cannot mutate Forecasting"],
    ["engineeringAnalyticsMutationIncluded", false, "11.12 cannot mutate Engineering Analytics"],
    ["telemetryMutationIncluded", false, "11.12 cannot mutate telemetry"],
    ["eventMutationIncluded", false, "11.12 cannot mutate events"],
    ["missingMeansZero", false, "missing API data never means zero"],
    ["unavailableMeansZero", false, "UNAVAILABLE API data never means zero"],
    ["unitInferenceAllowed", false, "11.12 performs no unit inference"],
    ["currencyInferenceAllowed", false, "11.12 performs no currency inference"],
    ["currencyConversionAllowed", false, "11.12 performs no currency conversion"],
    ["tariffInferenceAllowed", false, "11.12 performs no tariff inference"],
    ["emissionFactorInferenceAllowed", false, "11.12 performs no emission-factor inference"],
    ["topologyInferenceAllowed", false, "11.12 performs no topology inference"],
    ["controllabilityInferenceAllowed", false, "11.12 performs no controllability inference"],
    ["implicitTimeGridAllowed", false, "11.12 performs no implicit time-grid generation"],
    ["implicitResamplingAllowed", false, "11.12 performs no implicit resampling"],
    ["interpolationAllowed", false, "11.12 performs no interpolation"],
    ["futureObservedDataFabricationAllowed", false, "11.12 prohibits future observed-data fabrication"],
  ];


for (
  const [
    key,
    expected,
    message,
  ] of boundaryChecks
) {
  assert.equal(
    OPTIMIZATION_DSS_API_BOUNDARIES[
      key
    ],
    expected
  );
  pass(message);
}


assert.doesNotThrow(
  () =>
    JSON.stringify(
      defaultListRequest
    )
);
pass("default list request is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      filteredListRequest
    )
);
pass("filtered list request is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      getRequest
    )
);
pass("get-by-key request is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      okListEnvelope
    )
);
pass("OK API envelope is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      unavailableEnvelope
    )
);
pass("UNAVAILABLE API envelope is JSON serializable");


if (
  assertions !==
    108
) {
  throw new Error(
    `Expected 108 pre-final assertions, received ${assertions}.`
  );
}


pass(
  "11.12 validation assertion plan completed exactly"
);


console.log();
console.log(
  `Assertions passed: ${assertions}`
);
console.log();

console.log("================================================");
console.log("OPTIMIZATION/DSS API CONTRACT VALIDATION PASSED");
console.log("================================================");
console.log();

console.log("Validated Phase 11.12 semantics:");
console.log("- Phase 11.12 consumes validated Phase 11.11 persistence implementation");
console.log("- Optimization/DSS exposes only read-only GET contract endpoints for list and get-by-persistence-key");
console.log("- pagination, sorting and supported filters are explicit and validated");
console.log("- response envelopes distinguish OK, NOT_FOUND, INVALID_REQUEST and UNAVAILABLE");
console.log("- explicit zero counts and persisted zero recommendation values remain legitimate data");
console.log("- no create, update, delete or persistence mutation endpoint exists");
console.log("- no route/controller/service implementation or server.js mount occurs in 11.12");
console.log("- live HTTP success is not claimed by this contract validation");
console.log("- no dashboard, automated control or auto-dispatch occurs");
console.log("- upstream Financial/BI, Forecasting, Engineering Analytics, telemetry and event evidence remains immutable");
console.log("- Phase 11.13 Optimization/DSS API Implementation remains the next checkpoint");
