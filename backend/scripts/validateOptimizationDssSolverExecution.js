// scripts/validateOptimizationDssSolverExecution.js

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
  OPTIMIZATION_DSS_SOLVER_EXECUTION_PHASE,
  OPTIMIZATION_DSS_SOLVER_EXECUTION_LAYER,
  OPTIMIZATION_DSS_SOLVER_EXECUTION_UPSTREAM_PHASE,
  OPTIMIZATION_DSS_SOLVER_EXECUTION_STATUS,
  OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON,
  OPTIMIZATION_DSS_SOLVER_EXECUTION_BOUNDARIES,
  executeOptimizationDssSolver,
} from "../services/optimizationDss/optimizationDssSolverExecutionService.js";


let assertions =
  0;


function pass(
  message
) {
  assertions +=
    1;

  console.log(
    `PASS ${assertions}: ${message}`
  );
}


async function expectThrowAsync(
  fn,
  message
) {
  await assert.rejects(
    fn
  );

  pass(
    message
  );
}


console.log();
console.log(
  "================================================"
);
console.log(
  "ASHMAAN OPTIMIZATION/DSS SOLVER EXECUTION VALIDATION"
);
console.log(
  "================================================"
);
console.log(
  `Phase: ${OPTIMIZATION_DSS_SOLVER_EXECUTION_PHASE}`
);
console.log();


assert.equal(
  OPTIMIZATION_DSS_SOLVER_EXECUTION_PHASE,
  "11.6"
);
pass(
  "11.6 phase identity is correct"
);


assert.equal(
  OPTIMIZATION_DSS_SOLVER_EXECUTION_LAYER,
  "OPTIMIZATION_DSS"
);
pass(
  "11.6 remains inside Optimization/DSS"
);


assert.equal(
  OPTIMIZATION_DSS_SOLVER_EXECUTION_UPSTREAM_PHASE,
  "11.5"
);
pass(
  "11.6 consumes validated Phase 11.5 solver contract"
);


assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_SOLVER_EXECUTION_STATUS
  ),
  [
    "EXECUTED",
    "UNAVAILABLE",
    "ERROR",
  ]
);
pass(
  "solver-execution statuses are controlled"
);


assert.equal(
  Object.values(
    OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON
  ).includes(
    "VARIABLE_RESULT_OUT_OF_BOUNDS"
  ),
  true
);
pass(
  "out-of-bounds variable-result reason is explicit"
);


assert.equal(
  Object.values(
    OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON
  ).includes(
    "STATUS_TERMINATION_MISMATCH"
  ),
  true
);
pass(
  "status/termination mismatch reason is explicit"
);


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


const options =
  buildOptimizationDssSolverOptions({
    feasibilityTolerance:
      0,

    optimalityTolerance:
      0,

    timeLimitSeconds:
      60,

    iterationLimit:
      1000,
  });


const solverContract =
  createOptimizationDssSolverContract({
    builtModel,

    solverKind:
      OPTIMIZATION_DSS_SOLVER_KIND.GENERIC_LINEAR,

    options,
  });


assert.equal(
  solverContract.phase,
  "11.5"
);
pass(
  "11.6 fixture consumes Phase 11.5 solver contract"
);


let adapterCallCount =
  0;


const optimalAdapter =
  async ({
    solverKind,
    options,
    builtModel,
  }) => {
    adapterCallCount +=
      1;

    assert.equal(
      solverKind,
      "GENERIC_LINEAR"
    );

    assert.equal(
      options.feasibilityTolerance,
      0
    );

    assert.equal(
      builtModel.variableCount,
      2
    );

    return {
      status:
        OPTIMIZATION_DSS_SOLVER_STATUS.OPTIMAL,

      terminationReason:
        OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.OPTIMAL_SOLUTION,

      solverCompleted:
        true,

      feasible:
        true,

      objectiveValue:
        0,

      variableResults:
        builtModel.variables.map(
          variable => ({
            variableId:
              variable.variableId,

            value:
              0,
          })
        ),

      constraintResults:
        builtModel.constraintRows.map(
          constraint => ({
            constraintRowId:
              constraint.constraintRowId,

            satisfied:
              true,

            residual:
              0,
          })
        ),

      solverMetadata:
        {
          solverName:
            "ASHMAAN_REFERENCE_ADAPTER",

          deterministic:
            true,
        },
    };
  };


const executed =
  await executeOptimizationDssSolver({
    solverContract,

    solverAdapter:
      optimalAdapter,
  });


assert.equal(
  adapterCallCount,
  1
);
pass(
  "solver adapter executes exactly once"
);


assert.equal(
  executed.phase,
  "11.6"
);
pass(
  "solver execution preserves Phase 11.6 identity"
);


assert.equal(
  executed.layer,
  "OPTIMIZATION_DSS"
);
pass(
  "solver execution remains inside Optimization/DSS"
);


assert.equal(
  executed.upstreamPhase,
  "11.5"
);
pass(
  "solver execution preserves Phase 11.5 lineage"
);


assert.equal(
  executed.solverContract,
  solverContract
);
pass(
  "Phase 11.5 solver contract is preserved by reference"
);


assert.equal(
  executed.builtModel,
  builtModel
);
pass(
  "Phase 11.4 built model is preserved by reference"
);


assert.equal(
  executed.status,
  "EXECUTED"
);
pass(
  "solver execution status is EXECUTED"
);


assert.equal(
  executed.reason,
  "EXECUTED"
);
pass(
  "solver execution reason is explicit"
);


assert.equal(
  executed.solverResult.status,
  "OPTIMAL"
);
pass(
  "solver result preserves OPTIMAL status"
);


assert.equal(
  executed.solverResult.terminationReason,
  "OPTIMAL_SOLUTION"
);
pass(
  "solver result preserves OPTIMAL termination"
);


assert.equal(
  executed.solverResult.solverStarted,
  true
);
pass(
  "solver execution records solverStarted=true"
);


assert.equal(
  executed.solverResult.solverCompleted,
  true
);
pass(
  "solver execution records solverCompleted=true"
);


assert.equal(
  executed.solverResult.feasible,
  true
);
pass(
  "solver execution records explicit feasible=true"
);


assert.equal(
  executed.solverResult.objectiveValue,
  0
);
pass(
  "explicit zero objective value is preserved"
);


assert.equal(
  executed.solverResult.variableResults.length,
  2
);
pass(
  "variable-result cardinality is exact"
);


assert.equal(
  executed.solverResult.variableResults[0].value,
  0
);
pass(
  "explicit zero optimized variable value is preserved"
);


assert.equal(
  executed.solverResult.variableResults[0].unit,
  "kW"
);
pass(
  "optimized variable unit comes from built-model contract"
);


assert.equal(
  executed.solverResult.constraintResults.length,
  2
);
pass(
  "constraint-result cardinality is exact"
);


assert.equal(
  executed.solverResult.constraintResults[0].satisfied,
  true
);
pass(
  "constraint satisfaction is explicitly preserved"
);


assert.equal(
  executed.solverResult.constraintResults[0].residual,
  0
);
pass(
  "explicit zero constraint residual is preserved"
);


assert.equal(
  executed.solverResult.solverMetadata.solverName,
  "ASHMAAN_REFERENCE_ADAPTER"
);
pass(
  "solver metadata is explicitly preserved"
);


assert.equal(
  executed.recommendation,
  null
);
pass(
  "11.6 generates no DSS recommendation"
);


await expectThrowAsync(
  () =>
    executeOptimizationDssSolver({
      solverContract:
        {
          phase:
            "11.4",

          layer:
            "OPTIMIZATION_DSS",
        },

      solverAdapter:
        optimalAdapter,
    }),
  "pre-11.5 contract cannot enter solver execution"
);


await expectThrowAsync(
  () =>
    executeOptimizationDssSolver({
      solverContract,

      solverAdapter:
        null,
    }),
  "solver adapter is mandatory for execution"
);


await expectThrowAsync(
  () =>
    executeOptimizationDssSolver({
      solverContract,

      solverAdapter:
        async () => ({
          status:
            "OPTIMAL",

          terminationReason:
            "INFEASIBLE_MODEL",
        }),
    }),
  "status/termination mismatch is rejected"
);


await expectThrowAsync(
  () =>
    executeOptimizationDssSolver({
      solverContract,

      solverAdapter:
        async () => ({
          status:
            "OPTIMAL",

          terminationReason:
            "OPTIMAL_SOLUTION",

          feasible:
            true,

          objectiveValue:
            0,

          variableResults:
            [
              {
                variableId:
                  "unknown-variable",

                value:
                  0,
              },
            ],

          constraintResults:
            [],
        }),
    }),
  "unknown variable-result identity is rejected"
);


await expectThrowAsync(
  () =>
    executeOptimizationDssSolver({
      solverContract,

      solverAdapter:
        async () => ({
          status:
            "OPTIMAL",

          terminationReason:
            "OPTIMAL_SOLUTION",

          feasible:
            true,

          objectiveValue:
            0,

          variableResults:
            [
              {
                variableId:
                  builtModel.variables[0].variableId,

                value:
                  0,
              },

              {
                variableId:
                  builtModel.variables[0].variableId,

                value:
                  0,
              },
            ],

          constraintResults:
            [],
        }),
    }),
  "duplicate variable-result identity is rejected"
);


await expectThrowAsync(
  () =>
    executeOptimizationDssSolver({
      solverContract,

      solverAdapter:
        async () => ({
          status:
            "OPTIMAL",

          terminationReason:
            "OPTIMAL_SOLUTION",

          feasible:
            true,

          objectiveValue:
            0,

          variableResults:
            [
              {
                variableId:
                  builtModel.variables[0].variableId,

                value:
                  501,
              },
            ],

          constraintResults:
            [],
        }),
    }),
  "out-of-bounds variable result is rejected"
);


await expectThrowAsync(
  () =>
    executeOptimizationDssSolver({
      solverContract,

      solverAdapter:
        async () => ({
          status:
            "OPTIMAL",

          terminationReason:
            "OPTIMAL_SOLUTION",

          feasible:
            true,

          objectiveValue:
            0,

          variableResults:
            [],

          constraintResults:
            [
              {
                constraintRowId:
                  "unknown-constraint",

                satisfied:
                  true,

                residual:
                  0,
              },
            ],
        }),
    }),
  "unknown constraint-result identity is rejected"
);


await expectThrowAsync(
  () =>
    executeOptimizationDssSolver({
      solverContract,

      solverAdapter:
        async () => ({
          status:
            "OPTIMAL",

          terminationReason:
            "OPTIMAL_SOLUTION",

          feasible:
            true,

          objectiveValue:
            0,

          variableResults:
            [],

          constraintResults:
            [
              {
                constraintRowId:
                  builtModel.constraintRows[0].constraintRowId,

                satisfied:
                  true,

                residual:
                  0,
              },

              {
                constraintRowId:
                  builtModel.constraintRows[0].constraintRowId,

                satisfied:
                  true,

                residual:
                  0,
              },
            ],
        }),
    }),
  "duplicate constraint-result identity is rejected"
);


const errorExecution =
  await executeOptimizationDssSolver({
    solverContract,

    solverAdapter:
      async () => {
        throw new Error(
          "fixture solver failure"
        );
      },
  });


assert.equal(
  errorExecution.status,
  "ERROR"
);
pass(
  "solver adapter exception is converted to execution ERROR"
);


assert.equal(
  errorExecution.reason,
  "SOLVER_EXECUTION_ERROR"
);
pass(
  "solver adapter exception reason is explicit"
);


assert.equal(
  errorExecution.solverResult.status,
  "ERROR"
);
pass(
  "solver adapter exception produces ERROR solver status"
);


assert.equal(
  errorExecution.solverResult.terminationReason,
  "SOLVER_ERROR"
);
pass(
  "solver adapter exception produces SOLVER_ERROR termination"
);


assert.equal(
  errorExecution.solverResult.solverStarted,
  true
);
pass(
  "failed adapter execution records solverStarted=true"
);


assert.equal(
  errorExecution.solverResult.solverCompleted,
  false
);
pass(
  "failed adapter execution records solverCompleted=false"
);


assert.equal(
  errorExecution.solverResult.objectiveValue,
  null
);
pass(
  "failed adapter execution fabricates no objective value"
);


assert.equal(
  errorExecution.recommendation,
  null
);
pass(
  "failed adapter execution fabricates no recommendation"
);


const boundaryChecks =
  [
    ["executionOnly", true, "11.6 remains solver-execution-only"],
    ["solverExecutionIncluded", true, "11.6 explicitly executes solver adapter"],
    ["optimizationExecuted", true, "11.6 explicitly records optimization execution"],
    ["feasibilityMayBeEvaluated", true, "11.6 permits explicit solver feasibility output"],
    ["objectiveMayBeEvaluated", true, "11.6 permits explicit objective output"],
    ["optimizedDispatchMayBeProduced", true, "11.6 permits explicit optimized variable output"],
    ["recommendationGenerated", false, "11.6 generates no DSS recommendation"],
    ["persistenceIncluded", false, "Optimization/DSS persistence remains excluded"],
    ["apiIncluded", false, "Optimization/DSS API remains excluded"],
    ["dashboardIncluded", false, "Optimization/DSS dashboard remains excluded"],
    ["financialBiMutationIncluded", false, "11.6 cannot mutate Financial/BI"],
    ["forecastingMutationIncluded", false, "11.6 cannot mutate Forecasting"],
    ["engineeringAnalyticsMutationIncluded", false, "11.6 cannot mutate Engineering Analytics"],
    ["telemetryMutationIncluded", false, "11.6 cannot mutate telemetry"],
    ["eventMutationIncluded", false, "11.6 cannot mutate events"],
    ["missingMeansZero", false, "missing solver result never means zero"],
    ["unavailableMeansZero", false, "UNAVAILABLE solver result never means zero"],
    ["unitInferenceAllowed", false, "11.6 performs no unit inference"],
    ["currencyInferenceAllowed", false, "11.6 performs no currency inference"],
    ["currencyConversionAllowed", false, "11.6 performs no currency conversion"],
    ["tariffInferenceAllowed", false, "11.6 performs no tariff inference"],
    ["emissionFactorInferenceAllowed", false, "11.6 performs no emission-factor inference"],
    ["topologyInferenceAllowed", false, "11.6 performs no topology inference"],
    ["implicitTimeGridAllowed", false, "11.6 performs no implicit time-grid generation"],
    ["implicitResamplingAllowed", false, "11.6 performs no implicit resampling"],
    ["interpolationAllowed", false, "11.6 performs no interpolation"],
    ["futureObservedDataFabricationAllowed", false, "11.6 prohibits future observed-data fabrication"],
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
    OPTIMIZATION_DSS_SOLVER_EXECUTION_BOUNDARIES[
      key
    ],
    expected
  );

  pass(
    message
  );
}


assert.equal(
  builtModel.variables[0].value,
  null
);
pass(
  "11.6 does not mutate built-model variable values"
);


assert.equal(
  solverContract.objectiveValue,
  null
);
pass(
  "11.6 does not mutate Phase 11.5 solver contract"
);


assert.equal(
  qualifiedInputs.qualifiedEvidence[0].value,
  1000
);
pass(
  "11.6 does not mutate qualified Financial/BI evidence"
);


assert.doesNotThrow(
  () =>
    JSON.stringify(
      executed
    )
);
pass(
  "11.6 successful execution result is JSON serializable"
);


assert.doesNotThrow(
  () =>
    JSON.stringify(
      errorExecution
    )
);
pass(
  "11.6 error execution result is JSON serializable"
);


if (
  assertions !==
    77
) {
  throw new Error(
    `Expected 77 pre-final assertions, received ${assertions}.`
  );
}


pass(
  "11.6 validation assertion plan completed exactly"
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
  "OPTIMIZATION/DSS SOLVER EXECUTION VALIDATION PASSED"
);
console.log(
  "================================================"
);
console.log();

console.log(
  "Validated Phase 11.6 semantics:"
);
console.log(
  "- Phase 11.6 executes only validated Phase 11.5 solver contracts through an explicit solver adapter"
);
console.log(
  "- solver adapter receives solver kind, explicit options and the validated Phase 11.4 built model"
);
console.log(
  "- returned variable and constraint identities are validated against built-model rows"
);
console.log(
  "- optimized variable values must be finite and remain within explicit contracted bounds"
);
console.log(
  "- solver status and termination reason combinations are validated"
);
console.log(
  "- explicit zero objective, dispatch and residual values remain legitimate solver results"
);
console.log(
  "- solver failures are represented explicitly and do not fabricate optimization results"
);
console.log(
  "- no DSS recommendation, persistence, API or dashboard occurs in 11.6"
);
console.log(
  "- upstream Financial/BI, Forecasting, Engineering Analytics, telemetry and event evidence remains immutable"
);
console.log(
  "- Phase 11.7 Optimization/DSS Result Qualification remains the next checkpoint"
);
