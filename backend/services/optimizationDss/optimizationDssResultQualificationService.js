// services/optimizationDss/optimizationDssResultQualificationService.js

import {
  OPTIMIZATION_DSS_SOLVER_STATUS,
} from "./optimizationDssSolverContract.js";

import {
  OPTIMIZATION_DSS_SOLVER_EXECUTION_PHASE,
  OPTIMIZATION_DSS_SOLVER_EXECUTION_LAYER,
  OPTIMIZATION_DSS_SOLVER_EXECUTION_STATUS,
} from "./optimizationDssSolverExecutionService.js";


export const OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE =
  "11.7";

export const OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE =
  "11.6";


export const OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS =
  Object.freeze({
    QUALIFIED:
      "QUALIFIED",

    PARTIALLY_QUALIFIED:
      "PARTIALLY_QUALIFIED",

    UNAVAILABLE:
      "UNAVAILABLE",

    INVALID:
      "INVALID",
  });


export const OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON =
  Object.freeze({
    QUALIFIED:
      "QUALIFIED",

    PARTIAL_VARIABLE_RESULTS:
      "PARTIAL_VARIABLE_RESULTS",

    PARTIAL_CONSTRAINT_RESULTS:
      "PARTIAL_CONSTRAINT_RESULTS",

    SOLVER_NOT_FEASIBLE:
      "SOLVER_NOT_FEASIBLE",

    SOLVER_UNAVAILABLE:
      "SOLVER_UNAVAILABLE",

    SOLVER_ERROR:
      "SOLVER_ERROR",

    EXECUTION_INVALID:
      "EXECUTION_INVALID",

    OBJECTIVE_VALUE_MISSING:
      "OBJECTIVE_VALUE_MISSING",

    VARIABLE_RESULTS_MISSING:
      "VARIABLE_RESULTS_MISSING",

    CONSTRAINT_RESULTS_MISSING:
      "CONSTRAINT_RESULTS_MISSING",

    VARIABLE_RESULT_ID_MISMATCH:
      "VARIABLE_RESULT_ID_MISMATCH",

    CONSTRAINT_RESULT_ID_MISMATCH:
      "CONSTRAINT_RESULT_ID_MISMATCH",

    CONSTRAINT_UNSATISFIED:
      "CONSTRAINT_UNSATISFIED",
  });


export const OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES =
  Object.freeze({
    qualificationOnly:
      true,

    solverExecutionIncluded:
      false,

    optimizationExecuted:
      false,

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

    invalidMeansZero:
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


function idsEqual(
  expectedIds,
  actualIds
) {
  if (
    expectedIds.length !==
      actualIds.length
  ) {
    return false;
  }

  const expected =
    new Set(
      expectedIds
    );

  return actualIds.every(
    id =>
      expected.has(
        id
      )
  );
}


function uniqueCount(
  values
) {
  return new Set(
    values
  ).size;
}


export function qualifyOptimizationDssResult({
  executionResult,
} = {}) {
  if (
    !executionResult ||
    executionResult.phase !==
      OPTIMIZATION_DSS_SOLVER_EXECUTION_PHASE ||
    executionResult.layer !==
      OPTIMIZATION_DSS_SOLVER_EXECUTION_LAYER
  ) {
    throw new Error(
      OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.EXECUTION_INVALID
    );
  }

  const solverResult =
    executionResult.solverResult;

  const builtModel =
    executionResult.builtModel ??
    executionResult
      .solverContract
      ?.builtModel ??
    null;

  if (
    !solverResult ||
    !builtModel
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,

      layer:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,

      executionResult,

      status:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.INVALID,

      reason:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.EXECUTION_INVALID,

      qualified:
        false,

      objectiveValue:
        null,

      variableResults:
        null,

      constraintResults:
        null,

      recommendation:
        null,

      boundaries:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
    });
  }

  if (
    executionResult.status ===
      OPTIMIZATION_DSS_SOLVER_EXECUTION_STATUS.ERROR ||
    solverResult.status ===
      OPTIMIZATION_DSS_SOLVER_STATUS.ERROR
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,

      layer:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,

      executionResult,

      status:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.UNAVAILABLE,

      reason:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.SOLVER_ERROR,

      qualified:
        false,

      objectiveValue:
        null,

      variableResults:
        null,

      constraintResults:
        null,

      recommendation:
        null,

      boundaries:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
    });
  }

  if (
    solverResult.status ===
      OPTIMIZATION_DSS_SOLVER_STATUS.UNAVAILABLE
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,

      layer:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,

      executionResult,

      status:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.UNAVAILABLE,

      reason:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.SOLVER_UNAVAILABLE,

      qualified:
        false,

      objectiveValue:
        null,

      variableResults:
        null,

      constraintResults:
        null,

      recommendation:
        null,

      boundaries:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
    });
  }

  if (
    solverResult.feasible !==
      true ||
    ![
      OPTIMIZATION_DSS_SOLVER_STATUS.OPTIMAL,
      OPTIMIZATION_DSS_SOLVER_STATUS.FEASIBLE,
    ].includes(
      solverResult.status
    )
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,

      layer:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,

      executionResult,

      status:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.UNAVAILABLE,

      reason:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.SOLVER_NOT_FEASIBLE,

      qualified:
        false,

      objectiveValue:
        null,

      variableResults:
        null,

      constraintResults:
        null,

      recommendation:
        null,

      boundaries:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
    });
  }

  if (
    typeof solverResult.objectiveValue !==
      "number" ||
    !Number.isFinite(
      solverResult.objectiveValue
    )
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,

      layer:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,

      executionResult,

      status:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.PARTIALLY_QUALIFIED,

      reason:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.OBJECTIVE_VALUE_MISSING,

      qualified:
        false,

      objectiveValue:
        null,

      variableResults:
        solverResult.variableResults,

      constraintResults:
        solverResult.constraintResults,

      recommendation:
        null,

      boundaries:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
    });
  }

  if (
    !Array.isArray(
      solverResult.variableResults
    )
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,

      layer:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,

      executionResult,

      status:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.PARTIALLY_QUALIFIED,

      reason:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.VARIABLE_RESULTS_MISSING,

      qualified:
        false,

      objectiveValue:
        solverResult.objectiveValue,

      variableResults:
        null,

      constraintResults:
        solverResult.constraintResults,

      recommendation:
        null,

      boundaries:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
    });
  }

  const expectedVariableIds =
    builtModel.variables.map(
      item =>
        item.variableId
    );

  const actualVariableIds =
    solverResult.variableResults.map(
      item =>
        item.variableId
    );

  if (
    uniqueCount(
      actualVariableIds
    ) !==
      actualVariableIds.length ||
    !idsEqual(
      expectedVariableIds,
      actualVariableIds
    )
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,

      layer:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,

      executionResult,

      status:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.PARTIALLY_QUALIFIED,

      reason:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.PARTIAL_VARIABLE_RESULTS,

      qualified:
        false,

      objectiveValue:
        solverResult.objectiveValue,

      variableResults:
        solverResult.variableResults,

      constraintResults:
        solverResult.constraintResults,

      recommendation:
        null,

      boundaries:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
    });
  }

  if (
    !Array.isArray(
      solverResult.constraintResults
    )
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,

      layer:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,

      executionResult,

      status:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.PARTIALLY_QUALIFIED,

      reason:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.CONSTRAINT_RESULTS_MISSING,

      qualified:
        false,

      objectiveValue:
        solverResult.objectiveValue,

      variableResults:
        solverResult.variableResults,

      constraintResults:
        null,

      recommendation:
        null,

      boundaries:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
    });
  }

  const expectedConstraintIds =
    builtModel.constraintRows.map(
      item =>
        item.constraintRowId
    );

  const actualConstraintIds =
    solverResult.constraintResults.map(
      item =>
        item.constraintRowId
    );

  if (
    uniqueCount(
      actualConstraintIds
    ) !==
      actualConstraintIds.length ||
    !idsEqual(
      expectedConstraintIds,
      actualConstraintIds
    )
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,

      layer:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,

      executionResult,

      status:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.PARTIALLY_QUALIFIED,

      reason:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.PARTIAL_CONSTRAINT_RESULTS,

      qualified:
        false,

      objectiveValue:
        solverResult.objectiveValue,

      variableResults:
        solverResult.variableResults,

      constraintResults:
        solverResult.constraintResults,

      recommendation:
        null,

      boundaries:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
    });
  }

  if (
    solverResult.constraintResults.some(
      item =>
        item.satisfied !==
          true
    )
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,

      layer:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,

      executionResult,

      status:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.UNAVAILABLE,

      reason:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.CONSTRAINT_UNSATISFIED,

      qualified:
        false,

      objectiveValue:
        solverResult.objectiveValue,

      variableResults:
        solverResult.variableResults,

      constraintResults:
        solverResult.constraintResults,

      recommendation:
        null,

      boundaries:
        OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
    });
  }

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,

    layer:
      OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,

    upstreamPhase:
      OPTIMIZATION_DSS_RESULT_QUALIFICATION_UPSTREAM_PHASE,

    executionResult,

    builtModel,

    solverContract:
      executionResult.solverContract,

    status:
      OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.QUALIFIED,

    reason:
      OPTIMIZATION_DSS_RESULT_QUALIFICATION_REASON.QUALIFIED,

    qualified:
      true,

    objectiveValue:
      solverResult.objectiveValue,

    variableResults:
      solverResult.variableResults,

    constraintResults:
      solverResult.constraintResults,

    recommendation:
      null,

    boundaries:
      OPTIMIZATION_DSS_RESULT_QUALIFICATION_BOUNDARIES,
  });
}
