// scripts/validateOptimizationDssRecommendationGeneration.js

import assert from "node:assert/strict";

import {
  OPTIMIZATION_DSS_OBJECTIVE_KIND,
  OPTIMIZATION_DSS_DECISION_VARIABLE_KIND,
  OPTIMIZATION_DSS_CONSTRAINT_KIND,
  OPTIMIZATION_DSS_SCOPE,
  buildOptimizationDssHorizon,
  buildOptimizationDssObjective,
  buildOptimizationDssDecisionVariable,
  buildOptimizationDssConstraint,
  createOptimizationDssContract,
} from "../services/optimizationDss/optimizationDssContract.js";

import {
  qualifyOptimizationDssInputs,
} from "../services/optimizationDss/optimizationDssInputQualificationService.js";

import {
  OPTIMIZATION_DSS_OBJECTIVE_SENSE,
  buildOptimizationTimeIndex,
  buildOptimizationObjectiveTerm,
  buildOptimizationVariableBinding,
  buildOptimizationConstraintBinding,
  createOptimizationDssModelContract,
} from "../services/optimizationDss/optimizationDssModelContract.js";

import {
  buildOptimizationDssModel,
} from "../services/optimizationDss/optimizationDssModelBuildService.js";

import {
  OPTIMIZATION_DSS_SOLVER_KIND,
  OPTIMIZATION_DSS_SOLVER_STATUS,
  OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON,
  buildOptimizationDssSolverOptions,
  createOptimizationDssSolverContract,
} from "../services/optimizationDss/optimizationDssSolverContract.js";

import {
  executeOptimizationDssSolver,
} from "../services/optimizationDss/optimizationDssSolverExecutionService.js";

import {
  qualifyOptimizationDssResult,
} from "../services/optimizationDss/optimizationDssResultQualificationService.js";

import {
  OPTIMIZATION_DSS_RECOMMENDATION_KIND,
  OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY,
  OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE,
  buildOptimizationDssRecommendationAction,
  createOptimizationDssRecommendationContract,
} from "../services/optimizationDss/optimizationDssRecommendationContract.js";

import {
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_PHASE,
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_LAYER,
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_UPSTREAM_PHASE,
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS,
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON,
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_BOUNDARIES,
  generateOptimizationDssRecommendation,
} from "../services/optimizationDss/optimizationDssRecommendationGenerationService.js";


let assertions = 0;

function pass(message) {
  assertions += 1;
  console.log(`PASS ${assertions}: ${message}`);
}

function expectThrow(fn, message) {
  assert.throws(fn);
  pass(message);
}


console.log();
console.log("================================================");
console.log("ASHMAAN OPTIMIZATION/DSS RECOMMENDATION GENERATION VALIDATION");
console.log("================================================");
console.log(`Phase: ${OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_PHASE}`);
console.log();


assert.equal(
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_PHASE,
  "11.9"
);
pass("11.9 phase identity is correct");

assert.equal(
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_LAYER,
  "OPTIMIZATION_DSS"
);
pass("11.9 remains inside Optimization/DSS");

assert.equal(
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_UPSTREAM_PHASE,
  "11.8"
);
pass("11.9 consumes validated Phase 11.8 recommendation contract");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS
  ),
  [
    "GENERATED",
    "PARTIALLY_GENERATED",
    "UNAVAILABLE",
  ]
);
pass("recommendation-generation statuses are controlled");

assert.equal(
  Object.values(
    OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON
  ).includes(
    "ACTION_UNIT_MISMATCH"
  ),
  true
);
pass("action-unit mismatch reason is explicit");

assert.equal(
  Object.values(
    OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON
  ).includes(
    "EVIDENCE_REFERENCE_INVALID"
  ),
  true
);
pass("invalid evidence-reference reason is explicit");


const horizon =
  buildOptimizationDssHorizon({
    start:
      "2026-09-08T00:00:00Z",

    end:
      "2026-09-08T02:00:00Z",

    timezone:
      "Africa/Lagos",
  });


const objective =
  buildOptimizationDssObjective({
    name:
      "minimize-energy-cost",

    kind:
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_COST,

    currency:
      "NGN",

    sourceMetricName:
      "siteEnergyCost",
  });


const variable =
  buildOptimizationDssDecisionVariable({
    name:
      "grid-power",

    kind:
      OPTIMIZATION_DSS_DECISION_VARIABLE_KIND.GRID_POWER,

    unit:
      "kW",

    lowerBound:
      0,

    upperBound:
      500,
  });


const constraint =
  buildOptimizationDssConstraint({
    name:
      "grid-limit",

    kind:
      OPTIMIZATION_DSS_CONSTRAINT_KIND.GRID_LIMIT,

    parameters:
      {
        maxPower:
          500,
      },
  });


const optimizationContract =
  createOptimizationDssContract({
    horizon,

    scope:
      OPTIMIZATION_DSS_SCOPE.SITE,

    scopeIdentity:
      {
        vrmSiteId:
          "vrm-site-001",
      },

    objectives:
      [
        objective,
      ],

    decisionVariables:
      [
        variable,
      ],

    constraints:
      [
        constraint,
      ],

    financialBiEvidence:
      [],
  });


const qualifiedInputs =
  qualifyOptimizationDssInputs({
    contract:
      optimizationContract,

    financialBiEvidence:
      [
        {
          metricName:
            "siteEnergyCost",

          scope:
            "SITE",

          scopeIdentity:
            {
              vrmSiteId:
                "vrm-site-001",
            },

          reportingWindow:
            {
              start:
                "2026-09-08T00:00:00Z",

              end:
                "2026-09-08T01:00:00Z",
            },

          payload:
            {
              value:
                1000,

              unit:
                null,

              currency:
                "NGN",
            },
        },
      ],
  });


const timeIndex =
  buildOptimizationTimeIndex({
    timestamps:
      [
        "2026-09-08T00:00:00Z",
        "2026-09-08T01:00:00Z",
      ],
  });


const variableBinding =
  buildOptimizationVariableBinding({
    name:
      "grid-power",

    variableKind:
      OPTIMIZATION_DSS_DECISION_VARIABLE_KIND.GRID_POWER,

    unit:
      "kW",

    lowerBound:
      0,

    upperBound:
      500,

    timeIndexed:
      true,
  });


const objectiveTerm =
  buildOptimizationObjectiveTerm({
    name:
      "grid-cost-term",

    objectiveKind:
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_COST,

    sense:
      OPTIMIZATION_DSS_OBJECTIVE_SENSE.MINIMIZE,

    coefficient:
      1,

    currency:
      "NGN",

    variableName:
      "grid-power",

    evidenceMetricName:
      "siteEnergyCost",
  });


const constraintBinding =
  buildOptimizationConstraintBinding({
    name:
      "grid-limit-binding",

    constraintKind:
      OPTIMIZATION_DSS_CONSTRAINT_KIND.GRID_LIMIT,

    variableNames:
      [
        "grid-power",
      ],

    evidenceMetricNames:
      [
        "siteEnergyCost",
      ],

    parameters:
      {
        maxPower:
          500,
      },
  });


const modelContract =
  createOptimizationDssModelContract({
    optimizationContract,

    qualifiedInputs,

    timeIndex,

    variableBindings:
      [
        variableBinding,
      ],

    objectiveTerms:
      [
        objectiveTerm,
      ],

    constraintBindings:
      [
        constraintBinding,
      ],
  });


const builtModel =
  buildOptimizationDssModel({
    modelContract,
  });


const solverContract =
  createOptimizationDssSolverContract({
    builtModel,

    solverKind:
      OPTIMIZATION_DSS_SOLVER_KIND.GENERIC_LINEAR,

    options:
      buildOptimizationDssSolverOptions(),
  });


const executionResult =
  await executeOptimizationDssSolver({
    solverContract,

    solverAdapter:
      async ({
        builtModel,
      }) => ({
        status:
          OPTIMIZATION_DSS_SOLVER_STATUS.OPTIMAL,

        terminationReason:
          OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.OPTIMAL_SOLUTION,

        feasible:
          true,

        objectiveValue:
          0,

        variableResults:
          builtModel.variables.map(
            item => ({
              variableId:
                item.variableId,

              value:
                0,
            })
          ),

        constraintResults:
          builtModel.constraintRows.map(
            item => ({
              constraintRowId:
                item.constraintRowId,

              satisfied:
                true,

              residual:
                0,
            })
          ),
      }),
  });


const qualifiedResult =
  qualifyOptimizationDssResult({
    executionResult,
  });


const action0 =
  buildOptimizationDssRecommendationAction({
    actionId:
      "grid-setpoint-0",

    kind:
      OPTIMIZATION_DSS_RECOMMENDATION_KIND.DISPATCH_SETPOINT,

    target:
      "grid-power",

    timestamp:
      "2026-09-08T00:00:00Z",

    value:
      null,

    unit:
      "kW",

    lowerBound:
      0,

    upperBound:
      500,

    rationale:
      "Advisory setpoint from qualified solver output.",
  });


const action1 =
  buildOptimizationDssRecommendationAction({
    actionId:
      "grid-setpoint-1",

    kind:
      OPTIMIZATION_DSS_RECOMMENDATION_KIND.DISPATCH_SETPOINT,

    target:
      "grid-power",

    timestamp:
      "2026-09-08T01:00:00Z",

    value:
      null,

    unit:
      "kW",

    lowerBound:
      0,

    upperBound:
      500,

    rationale:
      "Advisory setpoint from qualified solver output.",
  });


const recommendationContract =
  createOptimizationDssRecommendationContract({
    qualifiedResult,

    recommendationKind:
      OPTIMIZATION_DSS_RECOMMENDATION_KIND.DISPATCH_SETPOINT,

    applicability:
      OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY.APPLICABLE,

    confidence:
      OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE.HIGH,

    actions:
      [
        action0,
        action1,
      ],

    evidenceRefs:
      [
        builtModel.variables[0].variableId,
        builtModel.variables[1].variableId,
        builtModel.constraintRows[0].constraintRowId,
        builtModel.constraintRows[1].constraintRowId,
      ],

    rationale:
      "Generate advisory-only grid-power setpoints from qualified solver results.",
  });


assert.equal(
  recommendationContract.phase,
  "11.8"
);
pass("11.9 fixture consumes Phase 11.8 recommendation contract");


const generated =
  generateOptimizationDssRecommendation({
    recommendationContract,
  });


assert.equal(
  generated.phase,
  "11.9"
);
pass("recommendation generation preserves Phase 11.9 identity");

assert.equal(
  generated.layer,
  "OPTIMIZATION_DSS"
);
pass("recommendation generation remains inside Optimization/DSS");

assert.equal(
  generated.upstreamPhase,
  "11.8"
);
pass("recommendation generation preserves Phase 11.8 lineage");

assert.equal(
  generated.recommendationContract,
  recommendationContract
);
pass("Phase 11.8 recommendation contract is preserved by reference");

assert.equal(
  generated.qualifiedResult,
  qualifiedResult
);
pass("Phase 11.7 qualified result is preserved by reference");

assert.equal(
  generated.executionResult,
  executionResult
);
pass("Phase 11.6 execution result is preserved by reference");

assert.equal(
  generated.builtModel,
  builtModel
);
pass("Phase 11.4 built model is preserved by reference");

assert.equal(
  generated.status,
  "GENERATED"
);
pass("fully covered recommendation becomes GENERATED");

assert.equal(
  generated.reason,
  "GENERATED"
);
pass("generated recommendation reason is explicit");

assert.equal(
  generated.generatedActionCount,
  2
);
pass("generated action count is exact");

assert.equal(
  generated.unavailableActionCount,
  0
);
pass("fully covered recommendation has zero unavailable actions");

assert.equal(
  generated.actionResults.length,
  2
);
pass("action-result cardinality is exact");

assert.equal(
  generated.actionResults[0].status,
  "GENERATED"
);
pass("first advisory action is generated");

assert.equal(
  generated.actionResults[0].advisory.value,
  0
);
pass("explicit zero optimized dispatch becomes advisory value");

assert.equal(
  generated.actionResults[0].advisory.unit,
  "kW"
);
pass("advisory unit is preserved from qualified result");

assert.equal(
  generated.actionResults[0].advisory.sourceVariableId,
  builtModel.variables[0].variableId
);
pass("advisory preserves exact source variable provenance");

assert.equal(
  generated.actionResults[0].executable,
  false
);
pass("generated action remains non-executable");

assert.equal(
  generated.actionResults[0].autoDispatch,
  false
);
pass("generated action cannot auto-dispatch");

assert.equal(
  generated.recommendation.recommendationKind,
  "DISPATCH_SETPOINT"
);
pass("recommendation kind is preserved");

assert.equal(
  generated.recommendation.applicability,
  "APPLICABLE"
);
pass("recommendation applicability is preserved");

assert.equal(
  generated.recommendation.confidence,
  "HIGH"
);
pass("recommendation confidence is preserved");

assert.equal(
  generated.recommendation.scope,
  "SITE"
);
pass("recommendation scope is preserved");

assert.equal(
  generated.recommendation.scopeIdentity,
  optimizationContract.scopeIdentity
);
pass("recommendation scope identity is preserved by reference");

assert.equal(
  generated.recommendation.actions.length,
  2
);
pass("recommendation payload action count is exact");

assert.equal(
  generated.recommendation.actions[0].value,
  0
);
pass("recommendation payload preserves explicit zero setpoint");

assert.equal(
  generated.recommendation.advisoryOnly,
  true
);
pass("recommendation payload is advisory-only");

assert.equal(
  generated.recommendation.executable,
  false
);
pass("recommendation payload is non-executable");

assert.equal(
  generated.recommendation.autoDispatch,
  false
);
pass("recommendation payload cannot auto-dispatch");


const partialContract =
  createOptimizationDssRecommendationContract({
    qualifiedResult,

    recommendationKind:
      OPTIMIZATION_DSS_RECOMMENDATION_KIND.DISPATCH_SETPOINT,

    applicability:
      OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY.APPLICABLE,

    confidence:
      OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE.MEDIUM,

    actions:
      [
        action0,
        buildOptimizationDssRecommendationAction({
          actionId:
            "missing-setpoint",

          kind:
            OPTIMIZATION_DSS_RECOMMENDATION_KIND.DISPATCH_SETPOINT,

          target:
            "grid-power",

          timestamp:
            "2026-09-08T01:30:00Z",

          value:
            null,

          unit:
            "kW",

          lowerBound:
            0,

          upperBound:
            500,

          rationale:
            "No exact qualified result exists at this timestamp.",
        }),
      ],

    evidenceRefs:
      [
        builtModel.variables[0].variableId,
      ],

    rationale:
      "Partial coverage fixture.",
  });


const partialGenerated =
  generateOptimizationDssRecommendation({
    recommendationContract:
      partialContract,
  });


assert.equal(
  partialGenerated.status,
  "PARTIALLY_GENERATED"
);
pass("partial qualified action coverage becomes PARTIALLY_GENERATED");

assert.equal(
  partialGenerated.reason,
  "PARTIAL_ACTION_COVERAGE"
);
pass("partial action coverage reason is explicit");

assert.equal(
  partialGenerated.generatedActionCount,
  1
);
pass("partial generation preserves exact generated count");

assert.equal(
  partialGenerated.unavailableActionCount,
  1
);
pass("partial generation preserves exact unavailable count");

assert.equal(
  partialGenerated.recommendation.actions.length,
  1
);
pass("partial recommendation includes only generated advisory actions");

assert.equal(
  partialGenerated.actionResults[1].reason,
  "ACTION_RESULT_NOT_FOUND"
);
pass("missing qualified variable result is explicit");


const notApplicableContract =
  createOptimizationDssRecommendationContract({
    qualifiedResult,

    recommendationKind:
      OPTIMIZATION_DSS_RECOMMENDATION_KIND.GRID_USAGE_ADVISORY,

    applicability:
      OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY.NOT_APPLICABLE,

    confidence:
      OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE.HIGH,

    actions:
      [],

    evidenceRefs:
      [
        builtModel.variables[0].variableId,
      ],

    rationale:
      "Recommendation is explicitly not applicable.",
  });


const unavailable =
  generateOptimizationDssRecommendation({
    recommendationContract:
      notApplicableContract,
  });


assert.equal(
  unavailable.status,
  "UNAVAILABLE"
);
pass("NOT_APPLICABLE contract generates UNAVAILABLE outcome");

assert.equal(
  unavailable.reason,
  "NOT_APPLICABLE"
);
pass("not-applicable reason is explicit");

assert.equal(
  unavailable.recommendation,
  null
);
pass("not-applicable contract fabricates no recommendation");

assert.equal(
  unavailable.generatedActionCount,
  0
);
pass("not-applicable contract generates zero actions");


expectThrow(
  () =>
    generateOptimizationDssRecommendation({
      recommendationContract:
        {
          phase:
            "11.7",

          layer:
            "OPTIMIZATION_DSS",

          status:
            "CONTRACT_DEFINED",
        },
    }),
  "pre-11.8 contract cannot enter recommendation generation"
);


expectThrow(
  () =>
    generateOptimizationDssRecommendation({
      recommendationContract:
        {
          ...recommendationContract,

          qualifiedResult:
            {
              ...qualifiedResult,

              qualified:
                false,
            },
        },
    }),
  "non-qualified result cannot enter recommendation generation"
);


expectThrow(
  () =>
    generateOptimizationDssRecommendation({
      recommendationContract:
        {
          ...recommendationContract,

          evidenceRefs:
            [
              "unknown-evidence",
            ],
        },
    }),
  "unknown recommendation evidence reference is rejected"
);


expectThrow(
  () =>
    generateOptimizationDssRecommendation({
      recommendationContract:
        {
          ...recommendationContract,

          actions:
            [
              {
                ...action0,

                unit:
                  "W",
              },
            ],
        },
    }),
  "recommendation action unit mismatch is rejected"
);


expectThrow(
  () =>
    generateOptimizationDssRecommendation({
      recommendationContract:
        {
          ...recommendationContract,

          actions:
            [
              {
                ...action0,

                upperBound:
                  -1,
              },
            ],
        },
    }),
  "qualified action value outside contracted advisory bound is rejected"
);


const boundaryChecks =
  [
    ["generationOnly", true, "11.9 remains recommendation-generation-only"],
    ["recommendationGenerated", true, "11.9 explicitly generates advisory recommendation payloads"],
    ["advisoryOnly", true, "11.9 recommendations remain advisory-only"],
    ["automatedControlIncluded", false, "automated control remains excluded"],
    ["automaticDispatchAllowed", false, "11.9 cannot auto-dispatch"],
    ["executableActionProduced", false, "11.9 produces no executable control action"],
    ["persistenceIncluded", false, "Optimization/DSS persistence remains excluded"],
    ["apiIncluded", false, "Optimization/DSS API remains excluded"],
    ["dashboardIncluded", false, "Optimization/DSS dashboard remains excluded"],
    ["financialBiMutationIncluded", false, "11.9 cannot mutate Financial/BI"],
    ["forecastingMutationIncluded", false, "11.9 cannot mutate Forecasting"],
    ["engineeringAnalyticsMutationIncluded", false, "11.9 cannot mutate Engineering Analytics"],
    ["telemetryMutationIncluded", false, "11.9 cannot mutate telemetry"],
    ["eventMutationIncluded", false, "11.9 cannot mutate events"],
    ["missingMeansZero", false, "missing recommendation evidence never means zero"],
    ["unavailableMeansZero", false, "UNAVAILABLE recommendation evidence never means zero"],
    ["unitInferenceAllowed", false, "11.9 performs no unit inference"],
    ["currencyInferenceAllowed", false, "11.9 performs no currency inference"],
    ["currencyConversionAllowed", false, "11.9 performs no currency conversion"],
    ["tariffInferenceAllowed", false, "11.9 performs no tariff inference"],
    ["emissionFactorInferenceAllowed", false, "11.9 performs no emission-factor inference"],
    ["topologyInferenceAllowed", false, "11.9 performs no topology inference"],
    ["controllabilityInferenceAllowed", false, "11.9 performs no controllability inference"],
    ["implicitTimeGridAllowed", false, "11.9 performs no implicit time-grid generation"],
    ["implicitResamplingAllowed", false, "11.9 performs no implicit resampling"],
    ["interpolationAllowed", false, "11.9 performs no interpolation"],
    ["futureObservedDataFabricationAllowed", false, "11.9 prohibits future observed-data fabrication"],
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
    OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_BOUNDARIES[
      key
    ],
    expected
  );

  pass(
    message
  );
}


assert.equal(
  qualifiedResult.objectiveValue,
  0
);
pass("11.9 does not mutate Phase 11.7 objective value");

assert.equal(
  qualifiedResult.variableResults[0].value,
  0
);
pass("11.9 does not mutate Phase 11.7 variable result");

assert.equal(
  recommendationContract.generated,
  false
);
pass("11.9 does not mutate Phase 11.8 recommendation contract");

assert.equal(
  builtModel.variables[0].value,
  null
);
pass("11.9 does not mutate Phase 11.4 built model");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      generated
    )
);
pass("11.9 generated recommendation is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      partialGenerated
    )
);
pass("11.9 partial recommendation is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      unavailable
    )
);
pass("11.9 unavailable recommendation is JSON serializable");


if (
  assertions !==
    84
) {
  throw new Error(
    `Expected 84 pre-final assertions, received ${assertions}.`
  );
}


pass(
  "11.9 validation assertion plan completed exactly"
);


console.log();
console.log(
  `Assertions passed: ${assertions}`
);
console.log();

console.log(
  "================================================"
);
console.log(
  "OPTIMIZATION/DSS RECOMMENDATION GENERATION VALIDATION PASSED"
);
console.log(
  "================================================"
);
console.log();

console.log(
  "Validated Phase 11.9 semantics:"
);
console.log(
  "- Phase 11.9 consumes only validated Phase 11.8 recommendation contracts grounded in qualified Phase 11.7 results"
);
console.log(
  "- dispatch-setpoint advisories are bound to exact qualified variable-result identities and timestamps"
);
console.log(
  "- recommendation evidence references must resolve to qualified variable or constraint results"
);
console.log(
  "- explicit zero optimized setpoints remain legitimate advisory recommendation values"
);
console.log(
  "- partial action coverage remains explicit and never fabricates missing recommendations"
);
console.log(
  "- generated recommendations are advisory-only, non-executable and cannot auto-dispatch"
);
console.log(
  "- no persistence, API, dashboard or automated control occurs in 11.9"
);
console.log(
  "- no unit, currency, tariff, emission-factor, topology or controllability inference occurs"
);
console.log(
  "- upstream Financial/BI, Forecasting, Engineering Analytics, telemetry and event evidence remains immutable"
);
console.log(
  "- Phase 11.10 Optimization/DSS Persistence Contract remains the next checkpoint"
);
