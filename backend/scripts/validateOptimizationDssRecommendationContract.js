// scripts/validateOptimizationDssRecommendationContract.js

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
  OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_PHASE,
  OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_LAYER,
  OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_UPSTREAM_PHASE,
  OPTIMIZATION_DSS_RECOMMENDATION_KIND,
  OPTIMIZATION_DSS_RECOMMENDATION_STATUS,
  OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY,
  OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE,
  OPTIMIZATION_DSS_RECOMMENDATION_BOUNDARIES,
  buildOptimizationDssRecommendationAction,
  createOptimizationDssRecommendationContract,
} from "../services/optimizationDss/optimizationDssRecommendationContract.js";


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
console.log("ASHMAAN OPTIMIZATION/DSS RECOMMENDATION CONTRACT VALIDATION");
console.log("================================================");
console.log(`Phase: ${OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_PHASE}`);
console.log();


assert.equal(
  OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_PHASE,
  "11.8"
);
pass("11.8 phase identity is correct");

assert.equal(
  OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_LAYER,
  "OPTIMIZATION_DSS"
);
pass("11.8 remains inside Optimization/DSS");

assert.equal(
  OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_UPSTREAM_PHASE,
  "11.7"
);
pass("11.8 consumes validated Phase 11.7 result qualification");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_RECOMMENDATION_KIND
  ),
  [
    "DISPATCH_SETPOINT",
    "OPERATING_WINDOW",
    "LOAD_SHED_ADVISORY",
    "GENERATOR_USAGE_ADVISORY",
    "GRID_USAGE_ADVISORY",
    "BATTERY_USAGE_ADVISORY",
  ]
);
pass("recommendation kinds are controlled");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_RECOMMENDATION_STATUS
  ),
  [
    "CONTRACT_DEFINED",
    "NOT_GENERATED",
    "GENERATED",
    "PARTIALLY_GENERATED",
    "UNAVAILABLE",
  ]
);
pass("recommendation statuses are controlled");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY
  ),
  [
    "APPLICABLE",
    "PARTIALLY_APPLICABLE",
    "NOT_APPLICABLE",
    "UNAVAILABLE",
  ]
);
pass("recommendation applicability states are controlled");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE
  ),
  [
    "HIGH",
    "MEDIUM",
    "LOW",
    "UNAVAILABLE",
  ]
);
pass("recommendation confidence states are controlled");


const action =
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
      0,

    unit:
      "kW",

    lowerBound:
      0,

    upperBound:
      500,

    rationale:
      "Use the qualified optimized grid-power value.",
  });


assert.equal(
  action.actionId,
  "grid-setpoint-0"
);
pass("recommendation action ID is explicit");

assert.equal(
  action.kind,
  "DISPATCH_SETPOINT"
);
pass("recommendation action kind is explicit");

assert.equal(
  action.target,
  "grid-power"
);
pass("recommendation action target is explicit");

assert.equal(
  action.timestamp,
  "2026-09-08T00:00:00.000Z"
);
pass("recommendation action timestamp is normalized");

assert.equal(
  action.value,
  0
);
pass("explicit zero recommendation value is preserved");

assert.equal(
  action.unit,
  "kW"
);
pass("recommendation action unit is explicit");

assert.equal(
  action.lowerBound,
  0
);
pass("recommendation action preserves explicit zero lower bound");

assert.equal(
  action.upperBound,
  500
);
pass("recommendation action upper bound is explicit");

assert.equal(
  action.executable,
  false
);
pass("recommendation action is non-executable in 11.8");

assert.equal(
  action.autoDispatch,
  false
);
pass("recommendation action cannot auto-dispatch in 11.8");


expectThrow(
  () =>
    buildOptimizationDssRecommendationAction({
      actionId:
        "bad-action",

      kind:
        "UNKNOWN",

      target:
        "grid-power",

      rationale:
        "bad",
    }),
  "undeclared recommendation kind is rejected"
);


expectThrow(
  () =>
    buildOptimizationDssRecommendationAction({
      actionId:
        "bad-action",

      kind:
        "DISPATCH_SETPOINT",

      target:
        "grid-power",

      value:
        1,

      rationale:
        "missing unit",
    }),
  "numeric recommendation value requires explicit unit"
);


expectThrow(
  () =>
    buildOptimizationDssRecommendationAction({
      actionId:
        "bad-range",

      kind:
        "OPERATING_WINDOW",

      target:
        "grid-power",

      lowerBound:
        10,

      upperBound:
        5,

      rationale:
        "bad",
    }),
  "invalid recommendation range is rejected"
);


const horizon =
  buildOptimizationDssHorizon({
    start:
      "2026-09-08T00:00:00Z",

    end:
      "2026-09-08T01:00:00Z",

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


assert.equal(
  qualifiedResult.status,
  "QUALIFIED"
);
pass("11.8 fixture consumes QUALIFIED Phase 11.7 result");


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
        action,
      ],

    evidenceRefs:
      [
        builtModel.variables[0].variableId,
        builtModel.constraintRows[0].constraintRowId,
      ],

    rationale:
      "Recommendation contract is grounded in a fully qualified optimization result.",
  });


assert.equal(
  recommendationContract.phase,
  "11.8"
);
pass("recommendation contract preserves Phase 11.8 identity");

assert.equal(
  recommendationContract.layer,
  "OPTIMIZATION_DSS"
);
pass("recommendation contract remains inside Optimization/DSS");

assert.equal(
  recommendationContract.upstreamPhase,
  "11.7"
);
pass("recommendation contract preserves Phase 11.7 lineage");

assert.equal(
  recommendationContract.qualifiedResult,
  qualifiedResult
);
pass("Phase 11.7 qualified result is preserved by reference");

assert.equal(
  recommendationContract.executionResult,
  executionResult
);
pass("Phase 11.6 execution result is preserved by reference");

assert.equal(
  recommendationContract.solverContract,
  solverContract
);
pass("Phase 11.5 solver contract is preserved by reference");

assert.equal(
  recommendationContract.builtModel,
  builtModel
);
pass("Phase 11.4 built model is preserved by reference");

assert.equal(
  recommendationContract.horizon,
  horizon
);
pass("recommendation horizon is preserved by reference");

assert.equal(
  recommendationContract.scope,
  "SITE"
);
pass("recommendation scope is preserved");

assert.equal(
  recommendationContract.scopeIdentity,
  optimizationContract.scopeIdentity
);
pass("recommendation scope identity is preserved by reference");

assert.equal(
  recommendationContract.recommendationKind,
  "DISPATCH_SETPOINT"
);
pass("recommendation kind is explicit");

assert.equal(
  recommendationContract.applicability,
  "APPLICABLE"
);
pass("recommendation applicability is explicit");

assert.equal(
  recommendationContract.confidence,
  "HIGH"
);
pass("recommendation confidence is explicit");

assert.equal(
  recommendationContract.actions.length,
  1
);
pass("recommendation action count is exact");

assert.equal(
  recommendationContract.evidenceRefs.length,
  2
);
pass("recommendation evidence references are explicit");

assert.equal(
  recommendationContract.status,
  "CONTRACT_DEFINED"
);
pass("recommendation remains contract-defined");

assert.equal(
  recommendationContract.generated,
  false
);
pass("11.8 generates no recommendation");

assert.equal(
  recommendationContract.recommendation,
  null
);
pass("11.8 fabricates no recommendation payload");


expectThrow(
  () =>
    createOptimizationDssRecommendationContract({
      qualifiedResult:
        {
          phase:
            "11.6",

          layer:
            "OPTIMIZATION_DSS",
        },

      recommendationKind:
        "DISPATCH_SETPOINT",

      applicability:
        "APPLICABLE",

      confidence:
        "HIGH",

      actions:
        [],

      evidenceRefs:
        [
          "x",
        ],

      rationale:
        "bad",
    }),
  "pre-11.7 result cannot enter recommendation contract"
);


expectThrow(
  () =>
    createOptimizationDssRecommendationContract({
      qualifiedResult:
        {
          ...qualifiedResult,

          status:
            "PARTIALLY_QUALIFIED",
        },

      recommendationKind:
        "DISPATCH_SETPOINT",

      applicability:
        "APPLICABLE",

      confidence:
        "HIGH",

      actions:
        [],

      evidenceRefs:
        [
          "x",
        ],

      rationale:
        "bad",
    }),
  "non-QUALIFIED optimization result cannot enter recommendation contract"
);


expectThrow(
  () =>
    createOptimizationDssRecommendationContract({
      qualifiedResult,

      recommendationKind:
        "UNKNOWN",

      applicability:
        "APPLICABLE",

      confidence:
        "HIGH",

      actions:
        [],

      evidenceRefs:
        [
          "x",
        ],

      rationale:
        "bad",
    }),
  "undeclared recommendation kind is rejected by contract"
);


expectThrow(
  () =>
    createOptimizationDssRecommendationContract({
      qualifiedResult,

      recommendationKind:
        "DISPATCH_SETPOINT",

      applicability:
        "UNKNOWN",

      confidence:
        "HIGH",

      actions:
        [],

      evidenceRefs:
        [
          "x",
        ],

      rationale:
        "bad",
    }),
  "undeclared recommendation applicability is rejected"
);


expectThrow(
  () =>
    createOptimizationDssRecommendationContract({
      qualifiedResult,

      recommendationKind:
        "DISPATCH_SETPOINT",

      applicability:
        "APPLICABLE",

      confidence:
        "UNKNOWN",

      actions:
        [],

      evidenceRefs:
        [
          "x",
        ],

      rationale:
        "bad",
    }),
  "undeclared recommendation confidence is rejected"
);


expectThrow(
  () =>
    createOptimizationDssRecommendationContract({
      qualifiedResult,

      recommendationKind:
        "DISPATCH_SETPOINT",

      applicability:
        "APPLICABLE",

      confidence:
        "HIGH",

      actions:
        [
          action,
          action,
        ],

      evidenceRefs:
        [
          "x",
        ],

      rationale:
        "bad",
    }),
  "duplicate recommendation action IDs are rejected"
);


expectThrow(
  () =>
    createOptimizationDssRecommendationContract({
      qualifiedResult,

      recommendationKind:
        "DISPATCH_SETPOINT",

      applicability:
        "APPLICABLE",

      confidence:
        "HIGH",

      actions:
        [],

      evidenceRefs:
        [],

      rationale:
        "bad",
    }),
  "recommendation evidence references are mandatory"
);


const boundaryChecks =
  [
    ["contractOnly", true, "11.8 remains recommendation-contract-only"],
    ["recommendationGenerated", false, "11.8 generates no recommendation"],
    ["automatedControlIncluded", false, "automated control remains excluded"],
    ["persistenceIncluded", false, "Optimization/DSS persistence remains excluded"],
    ["apiIncluded", false, "Optimization/DSS API remains excluded"],
    ["dashboardIncluded", false, "Optimization/DSS dashboard remains excluded"],
    ["financialBiMutationIncluded", false, "11.8 cannot mutate Financial/BI"],
    ["forecastingMutationIncluded", false, "11.8 cannot mutate Forecasting"],
    ["engineeringAnalyticsMutationIncluded", false, "11.8 cannot mutate Engineering Analytics"],
    ["telemetryMutationIncluded", false, "11.8 cannot mutate telemetry"],
    ["eventMutationIncluded", false, "11.8 cannot mutate events"],
    ["missingMeansZero", false, "missing recommendation evidence never means zero"],
    ["unavailableMeansZero", false, "UNAVAILABLE recommendation evidence never means zero"],
    ["unitInferenceAllowed", false, "11.8 performs no unit inference"],
    ["currencyInferenceAllowed", false, "11.8 performs no currency inference"],
    ["currencyConversionAllowed", false, "11.8 performs no currency conversion"],
    ["tariffInferenceAllowed", false, "11.8 performs no tariff inference"],
    ["emissionFactorInferenceAllowed", false, "11.8 performs no emission-factor inference"],
    ["topologyInferenceAllowed", false, "11.8 performs no topology inference"],
    ["controllabilityInferenceAllowed", false, "11.8 performs no controllability inference"],
    ["automaticDispatchAllowed", false, "11.8 cannot perform automatic dispatch"],
    ["implicitTimeGridAllowed", false, "11.8 performs no implicit time-grid generation"],
    ["implicitResamplingAllowed", false, "11.8 performs no implicit resampling"],
    ["interpolationAllowed", false, "11.8 performs no interpolation"],
    ["futureObservedDataFabricationAllowed", false, "11.8 prohibits future observed-data fabrication"],
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
    OPTIMIZATION_DSS_RECOMMENDATION_BOUNDARIES[
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
pass("11.8 does not mutate Phase 11.7 objective value");

assert.equal(
  qualifiedResult.variableResults[0].value,
  0
);
pass("11.8 does not mutate Phase 11.7 variable result");

assert.equal(
  builtModel.variables[0].value,
  null
);
pass("11.8 does not mutate Phase 11.4 built model");

assert.equal(
  action.value,
  0
);
pass("11.8 does not mutate explicit zero recommendation action");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      recommendationContract
    )
);
pass("11.8 recommendation contract is JSON serializable");


if (
  assertions !==
    76
) {
  throw new Error(
    `Expected 76 pre-final assertions, received ${assertions}.`
  );
}


pass(
  "11.8 validation assertion plan completed exactly"
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
  "OPTIMIZATION/DSS RECOMMENDATION CONTRACT VALIDATION PASSED"
);
console.log(
  "================================================"
);
console.log();

console.log(
  "Validated Phase 11.8 semantics:"
);
console.log(
  "- Phase 11.8 consumes only fully QUALIFIED Phase 11.7 optimization results"
);
console.log(
  "- recommendation kind, applicability, confidence, action payload and evidence references are explicit"
);
console.log(
  "- explicit zero setpoints and operating bounds remain legitimate contract data"
);
console.log(
  "- recommendation actions are non-executable and cannot auto-dispatch"
);
console.log(
  "- no recommendation payload is generated in 11.8"
);
console.log(
  "- no automated control, persistence, API or dashboard occurs in 11.8"
);
console.log(
  "- no unit, currency, tariff, emission-factor, topology or controllability inference occurs"
);
console.log(
  "- upstream Financial/BI, Forecasting, Engineering Analytics, telemetry and event evidence remains immutable"
);
console.log(
  "- Phase 11.9 Optimization/DSS Recommendation Generation remains the next checkpoint"
);
