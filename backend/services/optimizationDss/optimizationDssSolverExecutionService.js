// services/optimizationDss/optimizationDssSolverExecutionService.js

import {
  OPTIMIZATION_DSS_SOLVER_CONTRACT_PHASE,
  OPTIMIZATION_DSS_SOLVER_CONTRACT_LAYER,
  OPTIMIZATION_DSS_SOLVER_STATUS,
  OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON,
  buildOptimizationDssSolverResultEnvelope,
} from "./optimizationDssSolverContract.js";


export const OPTIMIZATION_DSS_SOLVER_EXECUTION_PHASE =
  "11.6";

export const OPTIMIZATION_DSS_SOLVER_EXECUTION_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_SOLVER_EXECUTION_UPSTREAM_PHASE =
  "11.5";


export const OPTIMIZATION_DSS_SOLVER_EXECUTION_STATUS =
  Object.freeze({
    EXECUTED:
      "EXECUTED",

    UNAVAILABLE:
      "UNAVAILABLE",

    ERROR:
      "ERROR",
  });


export const OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON =
  Object.freeze({
    EXECUTED:
      "EXECUTED",

    INVALID_SOLVER_CONTRACT:
      "INVALID_SOLVER_CONTRACT",

    SOLVER_ADAPTER_REQUIRED:
      "SOLVER_ADAPTER_REQUIRED",

    SOLVER_ADAPTER_RESULT_INVALID:
      "SOLVER_ADAPTER_RESULT_INVALID",

    VARIABLE_RESULT_ID_INVALID:
      "VARIABLE_RESULT_ID_INVALID",

    VARIABLE_RESULT_DUPLICATE:
      "VARIABLE_RESULT_DUPLICATE",

    VARIABLE_RESULT_VALUE_INVALID:
      "VARIABLE_RESULT_VALUE_INVALID",

    VARIABLE_RESULT_OUT_OF_BOUNDS:
      "VARIABLE_RESULT_OUT_OF_BOUNDS",

    CONSTRAINT_RESULT_ID_INVALID:
      "CONSTRAINT_RESULT_ID_INVALID",

    CONSTRAINT_RESULT_DUPLICATE:
      "CONSTRAINT_RESULT_DUPLICATE",

    STATUS_TERMINATION_MISMATCH:
      "STATUS_TERMINATION_MISMATCH",

    SOLVER_EXECUTION_ERROR:
      "SOLVER_EXECUTION_ERROR",
  });


export const OPTIMIZATION_DSS_SOLVER_EXECUTION_BOUNDARIES =
  Object.freeze({
    executionOnly:
      true,

    solverExecutionIncluded:
      true,

    optimizationExecuted:
      true,

    feasibilityMayBeEvaluated:
      true,

    objectiveMayBeEvaluated:
      true,

    optimizedDispatchMayBeProduced:
      true,

    recommendationGenerated:
      false,

    persistenceIncluded:
      false,

    apiIncluded:
      false,

    dashboardIncluded:
      false,

    financialBiMutationIncluded:
      false,

    forecastingMutationIncluded:
      false,

    engineeringAnalyticsMutationIncluded:
      false,

    telemetryMutationIncluded:
      false,

    eventMutationIncluded:
      false,

    missingMeansZero:
      false,

    unavailableMeansZero:
      false,

    unitInferenceAllowed:
      false,

    currencyInferenceAllowed:
      false,

    currencyConversionAllowed:
      false,

    tariffInferenceAllowed:
      false,

    emissionFactorInferenceAllowed:
      false,

    topologyInferenceAllowed:
      false,

    implicitTimeGridAllowed:
      false,

    implicitResamplingAllowed:
      false,

    interpolationAllowed:
      false,

    futureObservedDataFabricationAllowed:
      false,
  });


const STATUS_TO_TERMINATION =
  Object.freeze({
    [OPTIMIZATION_DSS_SOLVER_STATUS.OPTIMAL]:
      OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.OPTIMAL_SOLUTION,

    [OPTIMIZATION_DSS_SOLVER_STATUS.FEASIBLE]:
      OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.FEASIBLE_SOLUTION,

    [OPTIMIZATION_DSS_SOLVER_STATUS.INFEASIBLE]:
      OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.INFEASIBLE_MODEL,

    [OPTIMIZATION_DSS_SOLVER_STATUS.UNBOUNDED]:
      OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.UNBOUNDED_MODEL,

    [OPTIMIZATION_DSS_SOLVER_STATUS.TIME_LIMIT]:
      OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.TIME_LIMIT_REACHED,

    [OPTIMIZATION_DSS_SOLVER_STATUS.ITERATION_LIMIT]:
      OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.ITERATION_LIMIT_REACHED,

    [OPTIMIZATION_DSS_SOLVER_STATUS.ERROR]:
      OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.SOLVER_ERROR,

    [OPTIMIZATION_DSS_SOLVER_STATUS.UNAVAILABLE]:
      OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.SOLVER_UNAVAILABLE,
  });


function validateStatusTermination(
  status,
  terminationReason
) {
  const expected =
    STATUS_TO_TERMINATION[
      status
    ];

  if (
    expected &&
    expected !==
      terminationReason
  ) {
    throw new Error(
      OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.STATUS_TERMINATION_MISMATCH
    );
  }
}


function validateVariableResults(
  builtModel,
  variableResults
) {
  if (
    variableResults ===
      null
  ) {
    return null;
  }

  if (
    !Array.isArray(
      variableResults
    )
  ) {
    throw new Error(
      OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.SOLVER_ADAPTER_RESULT_INVALID
    );
  }

  const expected =
    new Map(
      builtModel.variables.map(
        variable => [
          variable.variableId,
          variable,
        ]
      )
    );

  const seen =
    new Set();

  const normalized =
    variableResults.map(
      result => {
        if (
          !result ||
          typeof result !==
            "object"
        ) {
          throw new Error(
            OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.SOLVER_ADAPTER_RESULT_INVALID
          );
        }

        const variable =
          expected.get(
            result.variableId
          );

        if (
          !variable
        ) {
          throw new Error(
            OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.VARIABLE_RESULT_ID_INVALID
          );
        }

        if (
          seen.has(
            result.variableId
          )
        ) {
          throw new Error(
            OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.VARIABLE_RESULT_DUPLICATE
          );
        }

        seen.add(
          result.variableId
        );

        if (
          typeof result.value !==
            "number" ||
          !Number.isFinite(
            result.value
          )
        ) {
          throw new Error(
            OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.VARIABLE_RESULT_VALUE_INVALID
          );
        }

        if (
          result.value <
            variable.lowerBound ||
          result.value >
            variable.upperBound
        ) {
          throw new Error(
            OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.VARIABLE_RESULT_OUT_OF_BOUNDS
          );
        }

        return Object.freeze({
          variableId:
            result.variableId,

          value:
            result.value,

          unit:
            variable.unit,

          timestamp:
            variable.timestamp,

          bindingName:
            variable.bindingName,
        });
      }
    );

  return Object.freeze(
    normalized
  );
}


function validateConstraintResults(
  builtModel,
  constraintResults
) {
  if (
    constraintResults ===
      null
  ) {
    return null;
  }

  if (
    !Array.isArray(
      constraintResults
    )
  ) {
    throw new Error(
      OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.SOLVER_ADAPTER_RESULT_INVALID
    );
  }

  const expected =
    new Set(
      builtModel.constraintRows.map(
        constraint =>
          constraint.constraintRowId
      )
    );

  const seen =
    new Set();

  const normalized =
    constraintResults.map(
      result => {
        if (
          !result ||
          typeof result !==
            "object" ||
          !expected.has(
            result.constraintRowId
          )
        ) {
          throw new Error(
            OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.CONSTRAINT_RESULT_ID_INVALID
          );
        }

        if (
          seen.has(
            result.constraintRowId
          )
        ) {
          throw new Error(
            OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.CONSTRAINT_RESULT_DUPLICATE
          );
        }

        seen.add(
          result.constraintRowId
        );

        return Object.freeze({
          constraintRowId:
            result.constraintRowId,

          satisfied:
            result.satisfied ===
              null
              ? null
              : Boolean(
                  result.satisfied
                ),

          residual:
            result.residual ===
              null ||
            result.residual ===
              undefined
              ? null
              : Number(
                  result.residual
                ),
        });
      }
    );

  return Object.freeze(
    normalized
  );
}


export async function executeOptimizationDssSolver({
  solverContract,
  solverAdapter,
} = {}) {
  if (
    !solverContract ||
    solverContract.phase !==
      OPTIMIZATION_DSS_SOLVER_CONTRACT_PHASE ||
    solverContract.layer !==
      OPTIMIZATION_DSS_SOLVER_CONTRACT_LAYER
  ) {
    throw new Error(
      OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.INVALID_SOLVER_CONTRACT
    );
  }

  if (
    typeof solverAdapter !==
      "function"
  ) {
    throw new Error(
      OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.SOLVER_ADAPTER_REQUIRED
    );
  }

  let rawResult;

  try {
    rawResult =
      await solverAdapter({
        solverKind:
          solverContract.solverKind,

        options:
          solverContract.options,

        builtModel:
          solverContract.builtModel,
      });
  } catch (
    error
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_SOLVER_EXECUTION_PHASE,

      layer:
        OPTIMIZATION_DSS_SOLVER_EXECUTION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_SOLVER_EXECUTION_UPSTREAM_PHASE,

      solverContract,

      status:
        OPTIMIZATION_DSS_SOLVER_EXECUTION_STATUS.ERROR,

      reason:
        OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.SOLVER_EXECUTION_ERROR,

      solverResult:
        buildOptimizationDssSolverResultEnvelope({
          solverContract,

          status:
            OPTIMIZATION_DSS_SOLVER_STATUS.ERROR,

          terminationReason:
            OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.SOLVER_ERROR,

          solverStarted:
            true,

          solverCompleted:
            false,

          solverMetadata:
            {
              message:
                error instanceof Error
                  ? error.message
                  : String(
                      error
                    ),
            },
        }),

      recommendation:
        null,

      boundaries:
        OPTIMIZATION_DSS_SOLVER_EXECUTION_BOUNDARIES,
    });
  }

  if (
    !rawResult ||
    typeof rawResult !==
      "object" ||
    Array.isArray(
      rawResult
    )
  ) {
    throw new Error(
      OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.SOLVER_ADAPTER_RESULT_INVALID
    );
  }

  validateStatusTermination(
    rawResult.status,
    rawResult.terminationReason
  );

  const variableResults =
    validateVariableResults(
      solverContract.builtModel,
      rawResult.variableResults ??
        null
    );

  const constraintResults =
    validateConstraintResults(
      solverContract.builtModel,
      rawResult.constraintResults ??
        null
    );

  const envelope =
    buildOptimizationDssSolverResultEnvelope({
      solverContract,

      status:
        rawResult.status,

      terminationReason:
        rawResult.terminationReason,

      solverStarted:
        true,

      solverCompleted:
        rawResult.solverCompleted ??
        true,

      feasible:
        rawResult.feasible ??
        null,

      objectiveValue:
        rawResult.objectiveValue ??
        null,

      variableResults,

      constraintResults,

      solverMetadata:
        rawResult.solverMetadata ??
        null,
    });

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_SOLVER_EXECUTION_PHASE,

    layer:
      OPTIMIZATION_DSS_SOLVER_EXECUTION_LAYER,

    upstreamPhase:
      OPTIMIZATION_DSS_SOLVER_EXECUTION_UPSTREAM_PHASE,

    solverContract,

    builtModel:
      solverContract.builtModel,

    status:
      OPTIMIZATION_DSS_SOLVER_EXECUTION_STATUS.EXECUTED,

    reason:
      OPTIMIZATION_DSS_SOLVER_EXECUTION_REASON.EXECUTED,

    solverResult:
      envelope,

    recommendation:
      null,

    boundaries:
      OPTIMIZATION_DSS_SOLVER_EXECUTION_BOUNDARIES,
  });
}
