// scripts/validateOptimizationDssDashboardContract.js

import assert from "node:assert/strict";

import {
  OPTIMIZATION_DSS_DASHBOARD_CONTRACT_PHASE,
  OPTIMIZATION_DSS_DASHBOARD_CONTRACT_LAYER,
  OPTIMIZATION_DSS_DASHBOARD_CONTRACT_UPSTREAM_PHASE,
  OPTIMIZATION_DSS_DASHBOARD_VIEW,
  OPTIMIZATION_DSS_DASHBOARD_STATE,
  OPTIMIZATION_DSS_DASHBOARD_FILTERS,
  OPTIMIZATION_DSS_DASHBOARD_TABLE_COLUMNS,
  OPTIMIZATION_DSS_DASHBOARD_TIMELINE,
  OPTIMIZATION_DSS_DASHBOARD_API_DEPENDENCY,
  OPTIMIZATION_DSS_DASHBOARD_DISPLAY,
  OPTIMIZATION_DSS_DASHBOARD_BOUNDARIES,
  buildOptimizationDssDashboardFilterState,
  formatOptimizationDssDashboardValue,
  buildOptimizationDssDashboardTimelinePoint,
} from "../services/optimizationDss/optimizationDssDashboardContract.js";


let assertions = 0;

function pass(
  message
) {
  assertions += 1;
  console.log(
    `PASS ${assertions}: ${message}`
  );
}


console.log();
console.log("================================================");
console.log("ASHMAAN OPTIMIZATION/DSS DASHBOARD CONTRACT VALIDATION");
console.log("================================================");
console.log(`Phase: ${OPTIMIZATION_DSS_DASHBOARD_CONTRACT_PHASE}`);
console.log();


assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_CONTRACT_PHASE,
  "11.14"
);
pass("11.14 phase identity is correct");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_CONTRACT_LAYER,
  "OPTIMIZATION_DSS"
);
pass("11.14 remains inside Optimization/DSS");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_CONTRACT_UPSTREAM_PHASE,
  "11.13"
);
pass("11.14 consumes validated Phase 11.13 API implementation");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_DASHBOARD_VIEW
  ),
  [
    "RECOMMENDATION_OVERVIEW",
    "RECOMMENDATION_TABLE",
    "RECOMMENDATION_TIMELINE",
    "RECOMMENDATION_DETAIL",
  ]
);
pass("dashboard views are controlled");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_DASHBOARD_STATE
  ),
  [
    "IDLE",
    "LOADING",
    "READY",
    "EMPTY",
    "ERROR",
  ]
);
pass("dashboard states are controlled");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_FILTERS.includes(
    "scope"
  ),
  true
);
pass("dashboard supports scope filter");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_FILTERS.includes(
    "vrmSiteId"
  ),
  true
);
pass("dashboard supports site filter");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_FILTERS.includes(
    "fleetId"
  ),
  true
);
pass("dashboard supports fleet filter");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_FILTERS.includes(
    "recommendationKind"
  ),
  true
);
pass("dashboard supports recommendation-kind filter");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_FILTERS.includes(
    "generationStatus"
  ),
  true
);
pass("dashboard supports generation-status filter");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_FILTERS.includes(
    "applicability"
  ),
  true
);
pass("dashboard supports applicability filter");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_FILTERS.includes(
    "confidence"
  ),
  true
);
pass("dashboard supports confidence filter");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_FILTERS.includes(
    "horizonStart"
  ),
  true
);
pass("dashboard supports horizon-start filter");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_FILTERS.includes(
    "horizonEnd"
  ),
  true
);
pass("dashboard supports horizon-end filter");


for (
  const column of
  [
    "persistenceKey",
    "recommendationKind",
    "scope",
    "scopeIdentity",
    "horizonStart",
    "horizonEnd",
    "generationStatus",
    "applicability",
    "confidence",
    "objectiveValue",
    "generatedActionCount",
    "unavailableActionCount",
    "advisoryOnly",
  ]
) {
  assert.equal(
    OPTIMIZATION_DSS_DASHBOARD_TABLE_COLUMNS.includes(
      column
    ),
    true
  );

  pass(
    `dashboard table includes ${column}`
  );
}


assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_TIMELINE.xField,
  "timestamp"
);
pass("timeline X field is explicit timestamp");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_TIMELINE.yField,
  "value"
);
pass("timeline Y field is explicit value");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_TIMELINE.seriesField,
  "target"
);
pass("timeline series field is explicit target");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_TIMELINE.unitField,
  "unit"
);
pass("timeline unit field is explicit");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_TIMELINE.connectNulls,
  false
);
pass("timeline never connects missing points");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_TIMELINE.missingPointBehavior,
  "GAP"
);
pass("missing timeline data renders as gap");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_TIMELINE.unavailablePointBehavior,
  "GAP"
);
pass("UNAVAILABLE timeline data renders as gap");


assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_API_DEPENDENCY.contractPhase,
  "11.12"
);
pass("dashboard preserves API contract phase dependency");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_API_DEPENDENCY.basePath,
  "/api/optimization-dss"
);
pass("dashboard API base path is explicit");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_API_DEPENDENCY.list.method,
  "GET"
);
pass("dashboard list dependency is GET");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_API_DEPENDENCY.list.path,
  "/api/optimization-dss/recommendations"
);
pass("dashboard list endpoint is canonical");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_API_DEPENDENCY.getByPersistenceKey.method,
  "GET"
);
pass("dashboard detail dependency is GET");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_API_DEPENDENCY.getByPersistenceKey.path,
  "/api/optimization-dss/recommendations/:persistenceKey"
);
pass("dashboard detail endpoint is canonical");


assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_DISPLAY.unavailableLabel,
  "UNAVAILABLE"
);
pass("UNAVAILABLE label is explicit");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_DISPLAY.missingLabel,
  "—"
);
pass("missing-value label is explicit");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_DISPLAY.zeroLabel,
  "0"
);
pass("explicit zero label is distinct");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_DISPLAY.advisoryBadge,
  "ADVISORY ONLY"
);
pass("advisory-only badge is explicit");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_DISPLAY.executableLabel,
  "NON-EXECUTABLE"
);
pass("non-executable label is explicit");

assert.equal(
  OPTIMIZATION_DSS_DASHBOARD_DISPLAY.autoDispatchLabel,
  "NO AUTO-DISPATCH"
);
pass("no-auto-dispatch label is explicit");


const emptyFilters =
  buildOptimizationDssDashboardFilterState();


for (
  const key of
  OPTIMIZATION_DSS_DASHBOARD_FILTERS
) {
  assert.equal(
    emptyFilters[key],
    null
  );

  pass(
    `missing ${key} filter remains null`
  );
}


const populatedFilters =
  buildOptimizationDssDashboardFilterState({
    filters:
      {
        scope:
          "SITE",

        vrmSiteId:
          "vrm-site-001",

        fleetId:
          "",

        recommendationKind:
          "DISPATCH_SETPOINT",

        generationStatus:
          "GENERATED",

        applicability:
          "APPLICABLE",

        confidence:
          "HIGH",

        horizonStart:
          "2026-09-08T00:00:00.000Z",

        horizonEnd:
          "2026-09-08T02:00:00.000Z",
      },
  });


assert.equal(
  populatedFilters.scope,
  "SITE"
);
pass("scope filter is preserved");

assert.equal(
  populatedFilters.vrmSiteId,
  "vrm-site-001"
);
pass("site filter is preserved");

assert.equal(
  populatedFilters.fleetId,
  null
);
pass("empty fleet filter remains null");

assert.equal(
  populatedFilters.recommendationKind,
  "DISPATCH_SETPOINT"
);
pass("recommendation-kind filter is preserved");

assert.equal(
  populatedFilters.generationStatus,
  "GENERATED"
);
pass("generation-status filter is preserved");

assert.equal(
  populatedFilters.applicability,
  "APPLICABLE"
);
pass("applicability filter is preserved");

assert.equal(
  populatedFilters.confidence,
  "HIGH"
);
pass("confidence filter is preserved");

assert.equal(
  populatedFilters.horizonStart,
  "2026-09-08T00:00:00.000Z"
);
pass("horizon-start filter is preserved");

assert.equal(
  populatedFilters.horizonEnd,
  "2026-09-08T02:00:00.000Z"
);
pass("horizon-end filter is preserved");


const zeroValue =
  formatOptimizationDssDashboardValue({
    value:
      0,
  });


assert.equal(
  zeroValue.display,
  "0"
);
pass("explicit numeric zero renders as zero");

assert.equal(
  zeroValue.semantic,
  "VALUE"
);
pass("explicit numeric zero remains VALUE");

assert.equal(
  zeroValue.numeric,
  0
);
pass("explicit numeric zero remains numeric zero");


const missingValue =
  formatOptimizationDssDashboardValue({
    value:
      null,
  });


assert.equal(
  missingValue.display,
  "—"
);
pass("missing value renders with missing label");

assert.equal(
  missingValue.semantic,
  "MISSING"
);
pass("missing value remains semantically MISSING");

assert.equal(
  missingValue.numeric,
  null
);
pass("missing value never becomes numeric zero");


const unavailableValue =
  formatOptimizationDssDashboardValue({
    value:
      0,

    status:
      "UNAVAILABLE",
  });


assert.equal(
  unavailableValue.display,
  "UNAVAILABLE"
);
pass("UNAVAILABLE overrides numeric presentation");

assert.equal(
  unavailableValue.semantic,
  "UNAVAILABLE"
);
pass("UNAVAILABLE remains semantically explicit");

assert.equal(
  unavailableValue.numeric,
  null
);
pass("UNAVAILABLE never becomes numeric zero");


const zeroPoint =
  buildOptimizationDssDashboardTimelinePoint({
    timestamp:
      "2026-09-08T00:00:00.000Z",

    target:
      "grid-power",

    value:
      0,

    unit:
      "kW",
  });


assert.equal(
  zeroPoint.value,
  0
);
pass("timeline preserves explicit zero setpoint");

assert.equal(
  zeroPoint.unit,
  "kW"
);
pass("timeline preserves explicit unit");

assert.equal(
  zeroPoint.semantic,
  "VALUE"
);
pass("zero timeline point remains VALUE");


const missingPoint =
  buildOptimizationDssDashboardTimelinePoint({
    timestamp:
      "2026-09-08T01:00:00.000Z",

    target:
      "grid-power",

    value:
      null,

    unit:
      "kW",
  });


assert.equal(
  missingPoint.value,
  null
);
pass("missing timeline point remains null");

assert.equal(
  missingPoint.semantic,
  "MISSING"
);
pass("missing timeline point remains MISSING");


const unavailablePoint =
  buildOptimizationDssDashboardTimelinePoint({
    timestamp:
      "2026-09-08T02:00:00.000Z",

    target:
      "grid-power",

    value:
      0,

    unit:
      "kW",

    status:
      "UNAVAILABLE",
  });


assert.equal(
  unavailablePoint.value,
  null
);
pass("UNAVAILABLE timeline point remains null");

assert.equal(
  unavailablePoint.semantic,
  "UNAVAILABLE"
);
pass("UNAVAILABLE timeline point remains explicit");


const boundaryChecks =
  [
    ["contractOnly", true, "11.14 remains dashboard-contract-only"],
    ["dashboardImplementationIncluded", false, "dashboard implementation remains excluded"],
    ["reactComponentIncluded", false, "React component implementation remains excluded"],
    ["apiReadIncluded", false, "11.14 performs no API read"],
    ["apiWriteIncluded", false, "11.14 performs no API write"],
    ["persistenceMutationIncluded", false, "11.14 performs no persistence mutation"],
    ["serverMountIncluded", false, "server.js mount remains outside dashboard contract"],
    ["liveHttpValidated", false, "live HTTP success is not claimed"],
    ["automatedControlIncluded", false, "automated control remains excluded"],
    ["automaticDispatchAllowed", false, "11.14 cannot auto-dispatch"],
    ["executableActionProduced", false, "11.14 produces no executable control action"],
    ["financialBiMutationIncluded", false, "11.14 cannot mutate Financial/BI"],
    ["forecastingMutationIncluded", false, "11.14 cannot mutate Forecasting"],
    ["engineeringAnalyticsMutationIncluded", false, "11.14 cannot mutate Engineering Analytics"],
    ["telemetryMutationIncluded", false, "11.14 cannot mutate telemetry"],
    ["eventMutationIncluded", false, "11.14 cannot mutate events"],
    ["missingMeansZero", false, "missing dashboard data never means zero"],
    ["unavailableMeansZero", false, "UNAVAILABLE dashboard data never means zero"],
    ["unitInferenceAllowed", false, "11.14 performs no unit inference"],
    ["currencyInferenceAllowed", false, "11.14 performs no currency inference"],
    ["currencyConversionAllowed", false, "11.14 performs no currency conversion"],
    ["tariffInferenceAllowed", false, "11.14 performs no tariff inference"],
    ["emissionFactorInferenceAllowed", false, "11.14 performs no emission-factor inference"],
    ["topologyInferenceAllowed", false, "11.14 performs no topology inference"],
    ["controllabilityInferenceAllowed", false, "11.14 performs no controllability inference"],
    ["implicitTimeGridAllowed", false, "11.14 performs no implicit time-grid generation"],
    ["implicitResamplingAllowed", false, "11.14 performs no implicit resampling"],
    ["interpolationAllowed", false, "11.14 performs no interpolation"],
    ["futureObservedDataFabricationAllowed", false, "11.14 prohibits future observed-data fabrication"],
  ];


for (
  const [
    key,
    expected,
    message,
  ] of
  boundaryChecks
) {
  assert.equal(
    OPTIMIZATION_DSS_DASHBOARD_BOUNDARIES[
      key
    ],
    expected
  );

  pass(
    message
  );
}


assert.doesNotThrow(
  () =>
    JSON.stringify(
      emptyFilters
    )
);
pass("dashboard filter state is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      zeroValue
    )
);
pass("dashboard value representation is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      zeroPoint
    )
);
pass("dashboard timeline point is JSON serializable");


if (
  assertions !==
    112
) {
  throw new Error(
    `Expected 112 pre-final assertions, received ${assertions}.`
  );
}


pass(
  "11.14 validation assertion plan completed exactly"
);


console.log();
console.log(
  `Assertions passed: ${assertions}`
);
console.log();

console.log("================================================");
console.log("OPTIMIZATION/DSS DASHBOARD CONTRACT VALIDATION PASSED");
console.log("================================================");
console.log();

console.log("Validated Phase 11.14 semantics:");
console.log("- Phase 11.14 consumes the validated Phase 11.13 read-only API implementation");
console.log("- dashboard views include overview, table, timeline and detail");
console.log("- dashboard states distinguish IDLE, LOADING, READY, EMPTY and ERROR");
console.log("- filters align with the validated Optimization/DSS read-only API contract");
console.log("- table and timeline fields preserve persisted recommendation provenance and advisory semantics");
console.log("- explicit zero values remain zero, while missing and UNAVAILABLE values remain distinct and never become zero");
console.log("- timeline gaps are preserved with connectNulls=false semantics");
console.log("- advisory-only, non-executable and no-auto-dispatch presentation requirements are explicit");
console.log("- no React implementation, API call, persistence mutation, server mount or live HTTP validation occurs in 11.14");
console.log("- Phase 11.15 Optimization/DSS Dashboard Implementation remains the next checkpoint");
