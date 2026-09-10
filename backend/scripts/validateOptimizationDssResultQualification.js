// scripts/validateOptimizationDssResultQualification.js

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
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS,
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON,
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
  qualifyOptimizationDssResult,
} from "../services/optimizationDss/optimizationDssResultQualificationService.js";


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
console.log("ASHMAAN OPTIMIZATION/DSS RESULT QUALIFICATION VALIDATION");
console.log("================================================");
console.log(`Phase: ${OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE}`);
console.log();


assert.equal(
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,
  "11.7"
);
pass("11.7 phase identity is correct");

assert.equal(
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,
  "OPTIMIZATION_DSS"
);
pass("11.7 remains inside Optimization/DSS");

assert.equal(
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,
  "11.6"
);
pass("11.7 consumes validated Phase 11.6 solver execution");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS
  ),
  [
    "QUALIFIED",
    "PARTIALLY_QUALIFIED",
    "UNAVAILABLE",
    "INVALID",
  ]
);
pass("result qualification statuses are controlled");

assert.equal(
  Object.values(
    OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON
  ).includes(
    "CONSTRAINT_UNSATISFIED"
  ),
  true
);
pass("constraint-unsatisfied reason is explicit");


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
      buildOptimizationDssSolverOptions({
        feasibilityTolerance:
          0,

        optimalityTolerance:
          0,

        timeLimitSeconds:
          60,

        iterationLimit:
          1000,
      }),
  });


const executed =
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


assert.equal(
  executed.phase,
  "11.6"
);
pass("11.7 fixture consumes Phase 11.6 execution result");


const qualified =
  qualifyOptimizationDssResult({
    executionResult:
      executed,
  });


assert.equal(
  qualified.phase,
  "11.7"
);
pass("qualification preserves Phase 11.7 identity");

assert.equal(
  qualified.layer,
  "OPTIMIZATION_DSS"
);
pass("qualification remains inside Optimization/DSS");

assert.equal(
  qualified.upstreamPhase,
  "11.6"
);
pass("qualification preserves Phase 11.6 lineage");

assert.equal(
  qualified.executionResult,
  executed
);
pass("Phase 11.6 execution result is preserved by reference");

assert.equal(
  qualified.builtModel,
  builtModel
);
pass("Phase 11.4 built model is preserved by reference");

assert.equal(
  qualified.solverContract,
  solverContract
);
pass("Phase 11.5 solver contract is preserved by reference");

assert.equal(
  qualified.status,
  "QUALIFIED"
);
pass("complete feasible optimal solver result becomes QUALIFIED");

assert.equal(
  qualified.reason,
  "QUALIFIED"
);
pass("qualified-result reason is explicit");

assert.equal(
  qualified.qualified,
  true
);
pass("qualified-result boolean is explicit");

assert.equal(
  qualified.objectiveValue,
  0
);
pass("explicit zero objective value remains qualified");

assert.equal(
  qualified.variableResults.length,
  builtModel.variableCount
);
pass("qualified variable-result cardinality is exact");

assert.equal(
  qualified.variableResults[0].value,
  0
);
pass("explicit zero optimized variable remains qualified");

assert.equal(
  qualified.constraintResults.length,
  builtModel.constraintRowCount
);
pass("qualified constraint-result cardinality is exact");

assert.equal(
  qualified.constraintResults[0].residual,
  0
);
pass("explicit zero constraint residual remains qualified");

assert.equal(
  qualified.recommendation,
  null
);
pass("11.7 generates no recommendation");


const objectiveMissing =
  qualifyOptimizationDssResult({
    executionResult:
      {
        ...executed,

        solverResult:
          {
            ...executed.solverResult,

            objectiveValue:
              null,
          },
      },
  });


assert.equal(
  objectiveMissing.status,
  "PARTIALLY_QUALIFIED"
);
pass("missing objective value produces PARTIALLY_QUALIFIED");

assert.equal(
  objectiveMissing.reason,
  "OBJECTIVE_VALUE_MISSING"
);
pass("missing objective reason is explicit");


const variableMissing =
  qualifyOptimizationDssResult({
    executionResult:
      {
        ...executed,

        solverResult:
          {
            ...executed.solverResult,

            variableResults:
              null,
          },
      },
  });


assert.equal(
  variableMissing.status,
  "PARTIALLY_QUALIFIED"
);
pass("missing variable results produce PARTIALLY_QUALIFIED");

assert.equal(
  variableMissing.reason,
  "VARIABLE_RESULTS_MISSING"
);
pass("missing variable-results reason is explicit");


const variablePartial =
  qualifyOptimizationDssResult({
    executionResult:
      {
        ...executed,

        solverResult:
          {
            ...executed.solverResult,

            variableResults:
              executed
                .solverResult
                .variableResults
                .slice(
                  0,
                  1
                ),
          },
      },
  });


assert.equal(
  variablePartial.status,
  "PARTIALLY_QUALIFIED"
);
pass("incomplete variable results produce PARTIALLY_QUALIFIED");

assert.equal(
  variablePartial.reason,
  "PARTIAL_VARIABLE_RESULTS"
);
pass("partial variable-results reason is explicit");


const constraintMissing =
  qualifyOptimizationDssResult({
    executionResult:
      {
        ...executed,

        solverResult:
          {
            ...executed.solverResult,

            constraintResults:
              null,
          },
      },
  });


assert.equal(
  constraintMissing.status,
  "PARTIALLY_QUALIFIED"
);
pass("missing constraint results produce PARTIALLY_QUALIFIED");

assert.equal(
  constraintMissing.reason,
  "CONSTRAINT_RESULTS_MISSING"
);
pass("missing constraint-results reason is explicit");


const constraintPartial =
  qualifyOptimizationDssResult({
    executionResult:
      {
        ...executed,

        solverResult:
          {
            ...executed.solverResult,

            constraintResults:
              executed
                .solverResult
                .constraintResults
                .slice(
                  0,
                  1
                ),
          },
      },
  });


assert.equal(
  constraintPartial.status,
  "PARTIALLY_QUALIFIED"
);
pass("incomplete constraint results produce PARTIALLY_QUALIFIED");

assert.equal(
  constraintPartial.reason,
  "PARTIAL_CONSTRAINT_RESULTS"
);
pass("partial constraint-results reason is explicit");


const constraintFailed =
  qualifyOptimizationDssResult({
    executionResult:
      {
        ...executed,

        solverResult:
          {
            ...executed.solverResult,

            constraintResults:
              executed
                .solverResult
                .constraintResults
                .map(
                  (
                    item,
                    index
                  ) => ({
                    ...item,

                    satisfied:
                      index ===
                        0
                        ? false
                        : true,
                  })
                ),
          },
      },
  });


assert.equal(
  constraintFailed.status,
  "UNAVAILABLE"
);
pass("unsatisfied constraint prevents result qualification");

assert.equal(
  constraintFailed.reason,
  "CONSTRAINT_UNSATISFIED"
);
pass("unsatisfied-constraint reason is explicit");

assert.equal(
  constraintFailed.qualified,
  false
);
pass("unsatisfied constraint cannot be marked qualified");


const infeasible =
  qualifyOptimizationDssResult({
    executionResult:
      {
        ...executed,

        solverResult:
          {
            ...executed.solverResult,

            status:
              "INFEASIBLE",

            terminationReason:
              "INFEASIBLE_MODEL",

            feasible:
              false,

            objectiveValue:
              null,

            variableResults:
              null,

            constraintResults:
              null,
          },
      },
  });


assert.equal(
  infeasible.status,
  "UNAVAILABLE"
);
pass("infeasible solver result becomes UNAVAILABLE");

assert.equal(
  infeasible.reason,
  "SOLVER_NOT_FEASIBLE"
);
pass("infeasible-result reason is explicit");


const solverUnavailable =
  qualifyOptimizationDssResult({
    executionResult:
      {
        ...executed,

        solverResult:
          {
            ...executed.solverResult,

            status:
              "UNAVAILABLE",

            terminationReason:
              "SOLVER_UNAVAILABLE",

            feasible:
              null,

            objectiveValue:
              null,

            variableResults:
              null,

            constraintResults:
              null,
          },
      },
  });


assert.equal(
  solverUnavailable.status,
  "UNAVAILABLE"
);
pass("solver-unavailable result becomes UNAVAILABLE");

assert.equal(
  solverUnavailable.reason,
  "SOLVER_UNAVAILABLE"
);
pass("solver-unavailable reason is explicit");


const executionError =
  await executeOptimizationDssSolver({
    solverContract,

    solverAdapter:
      async () => {
        throw new Error(
          "fixture"
        );
      },
  });


const qualifiedError =
  qualifyOptimizationDssResult({
    executionResult:
      executionError,
  });


assert.equal(
  qualifiedError.status,
  "UNAVAILABLE"
);
pass("solver execution error becomes UNAVAILABLE");

assert.equal(
  qualifiedError.reason,
  "SOLVER_ERROR"
);
pass("solver execution error reason is explicit");

assert.equal(
  qualifiedError.objectiveValue,
  null
);
pass("solver error fabricates no objective value");

assert.equal(
  qualifiedError.variableResults,
  null
);
pass("solver error fabricates no variable results");

assert.equal(
  qualifiedError.constraintResults,
  null
);
pass("solver error fabricates no constraint results");

assert.equal(
  qualifiedError.recommendation,
  null
);
pass("solver error fabricates no recommendation");


expectThrow(
  () =>
    qualifyOptimizationDssResult({
      executionResult:
        {
          phase:
            "11.5",

          layer:
            "OPTIMIZATION_DSS",
        },
    }),
  "pre-11.6 result cannot enter result qualification"
);


const boundaryChecks =
  [
    ["qualificationOnly", true, "11.7 remains result-qualification-only"],
    ["solverExecutionIncluded", false, "11.7 executes no solver"],
    ["optimizationExecuted", false, "11.7 performs no new optimization"],
    ["recommendationGenerated", false, "11.7 generates no DSS recommendation"],
    ["persistenceIncluded", false, "Optimization/DSS persistence remains excluded"],
    ["apiIncluded", false, "Optimization/DSS API remains excluded"],
    ["dashboardIncluded", false, "Optimization/DSS dashboard remains excluded"],
    ["financialBiMutationIncluded", false, "11.7 cannot mutate Financial/BI"],
    ["forecastingMutationIncluded", false, "11.7 cannot mutate Forecasting"],
    ["engineeringAnalyticsMutationIncluded", false, "11.7 cannot mutate Engineering Analytics"],
    ["telemetryMutationIncluded", false, "11.7 cannot mutate telemetry"],
    ["eventMutationIncluded", false, "11.7 cannot mutate events"],
    ["missingMeansZero", false, "missing result evidence never means zero"],
    ["unavailableMeansZero", false, "UNAVAILABLE result evidence never means zero"],
    ["invalidMeansZero", false, "invalid result evidence never means zero"],
    ["unitInferenceAllowed", false, "11.7 performs no unit inference"],
    ["currencyInferenceAllowed", false, "11.7 performs no currency inference"],
    ["currencyConversionAllowed", false, "11.7 performs no currency conversion"],
    ["tariffInferenceAllowed", false, "11.7 performs no tariff inference"],
    ["emissionFactorInferenceAllowed", false, "11.7 performs no emission-factor inference"],
    ["topologyInferenceAllowed", false, "11.7 performs no topology inference"],
    ["implicitTimeGridAllowed", false, "11.7 performs no implicit time-grid generation"],
    ["implicitResamplingAllowed", false, "11.7 performs no implicit resampling"],
    ["interpolationAllowed", false, "11.7 performs no interpolation"],
    ["futureObservedDataFabricationAllowed", false, "11.7 prohibits future observed-data fabrication"],
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
    OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES[
      key
    ],
    expected
  );

  pass(
    message
  );
}


assert.equal(
  executed.solverResult.objectiveValue,
  0
);
pass("11.7 does not mutate Phase 11.6 objective result");

assert.equal(
  executed.solverResult.variableResults[0].value,
  0
);
pass("11.7 does not mutate Phase 11.6 variable result");

assert.equal(
  executed.solverResult.constraintResults[0].residual,
  0
);
pass("11.7 does not mutate Phase 11.6 constraint result");

assert.equal(
  builtModel.variables[0].value,
  null
);
pass("11.7 does not mutate Phase 11.4 built model");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      qualified
    )
);
pass("11.7 qualified result is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      qualifiedError
    )
);
pass("11.7 unavailable result is JSON serializable");


if (
  assertions !==
    76
) {
  throw new Error(
    `Expected 76 pre-final assertions, received ${assertions}.`
  );
}


pass(
  "11.7 validation assertion plan completed exactly"
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
  "OPTIMIZATION/DSS RESULT QUALIFICATION VALIDATION PASSED"
);
console.log(
  "================================================"
);
console.log();

console.log(
  "Validated Phase 11.7 semantics:"
);
console.log(
  "- Phase 11.7 consumes only validated Phase 11.6 solver execution results"
);
console.log(
  "- complete feasible OPTIMAL/FEASIBLE results with exact variable and constraint coverage can qualify"
);
console.log(
  "- missing or incomplete objective, variable or constraint outputs remain explicit and never become zero"
);
console.log(
  "- infeasible, solver-unavailable and solver-error outcomes remain UNAVAILABLE"
);
console.log(
  "- unsatisfied constraints prevent result qualification"
);
console.log(
  "- explicit zero objective, dispatch and residual values remain legitimate qualified solver results"
);
console.log(
  "- 11.7 executes no solver and performs no new optimization"
);
console.log(
  "- no DSS recommendation, persistence, API or dashboard occurs in 11.7"
);
console.log(
  "- upstream Financial/BI, Forecasting, Engineering Analytics, telemetry and event evidence remains immutable"
);
console.log(
  "- Phase 11.8 Optimization/DSS Recommendation Contract remains the next checkpoint"
);
