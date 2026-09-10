// services/optimizationDss/optimizationDssSolverContract.js

import {
  OPTIMIZATION_DSS_MODEL_BUILD_PHASE,
  OPTIMIZATION_DSS_MODEL_BUILD_LAYER,
  OPTIMIZATION_DSS_MODEL_BUILD_STATUS,
} from "./optimizationDssModelBuildService.js";


export const OPTIMIZATION_DSS_SOLVER_CONTRACT_PHASE =
  "11.5";

export const OPTIMIZATION_DSS_SOLVER_CONTRACT_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_SOLVER_CONTRACT_UPSTREAM_PHASE =
  "11.4";


export const OPTIMIZATION_DSS_SOLVER_KIND =
  Object.freeze({
    GENERIC_LINEAR:
      "GENERIC_LINEAR",

    GENERIC_MIXED_INTEGER_LINEAR:
      "GENERIC_MIXED_INTEGER_LINEAR",
  });


export const OPTIMIZATION_DSS_SOLVER_STATUS =
  Object.freeze({
    CONTRACT_DEFINED:
      "CONTRACT_DEFINED",

    NOT_STARTED:
      "NOT_STARTED",

    OPTIMAL:
      "OPTIMAL",

    FEASIBLE:
      "FEASIBLE",

    INFEASIBLE:
      "INFEASIBLE",

    UNBOUNDED:
      "UNBOUNDED",

    TIME_LIMIT:
      "TIME_LIMIT",

    ITERATION_LIMIT:
      "ITERATION_LIMIT",

    ERROR:
      "ERROR",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON =
  Object.freeze({
    NOT_STARTED:
      "NOT_STARTED",

    OPTIMAL_SOLUTION:
      "OPTIMAL_SOLUTION",

    FEASIBLE_SOLUTION:
      "FEASIBLE_SOLUTION",

    INFEASIBLE_MODEL:
      "INFEASIBLE_MODEL",

    UNBOUNDED_MODEL:
      "UNBOUNDED_MODEL",

    TIME_LIMIT_REACHED:
      "TIME_LIMIT_REACHED",

    ITERATION_LIMIT_REACHED:
      "ITERATION_LIMIT_REACHED",

    SOLVER_ERROR:
      "SOLVER_ERROR",

    SOLVER_UNAVAILABLE:
      "SOLVER_UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_SOLVER_BOUNDARIES =
  Object.freeze({
    contractOnly:
      true,

    solverInterfaceDefined:
      true,

    solverImplementationIncluded:
      false,

    solverExecutionIncluded:
      false,

    optimizationExecuted:
      false,

    feasibilityEvaluated:
      false,

    optimizedDispatchProduced:
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


function requireFiniteNumber(
  value,
  field
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
  ) {
    throw new Error(
      `${field}_INVALID`
    );
  }

  return value;
}


function requirePositiveInteger(
  value,
  field
) {
  if (
    !Number.isInteger(
      value
    ) ||
    value <=
      0
  ) {
    throw new Error(
      `${field}_INVALID`
    );
  }

  return value;
}


export function buildOptimizationDssSolverOptions({
  feasibilityTolerance = 1e-6,
  optimalityTolerance = 1e-6,
  timeLimitSeconds = 60,
  iterationLimit = 100000,
  mipGap = null,
} = {}) {
  requireFiniteNumber(
    feasibilityTolerance,
    "FEASIBILITY_TOLERANCE"
  );

  requireFiniteNumber(
    optimalityTolerance,
    "OPTIMALITY_TOLERANCE"
  );

  if (
    feasibilityTolerance <
      0 ||
    optimalityTolerance <
      0
  ) {
    throw new Error(
      "SOLVER_TOLERANCE_NEGATIVE"
    );
  }

  requirePositiveInteger(
    timeLimitSeconds,
    "TIME_LIMIT_SECONDS"
  );

  requirePositiveInteger(
    iterationLimit,
    "ITERATION_LIMIT"
  );

  if (
    mipGap !==
      null
  ) {
    requireFiniteNumber(
      mipGap,
      "MIP_GAP"
    );

    if (
      mipGap <
        0
    ) {
      throw new Error(
        "MIP_GAP_NEGATIVE"
      );
    }
  }

  return Object.freeze({
    feasibilityTolerance,

    optimalityTolerance,

    timeLimitSeconds,

    iterationLimit,

    mipGap,
  });
}


export function createOptimizationDssSolverContract({
  builtModel,
  solverKind,
  options,
} = {}) {
  if (
    !builtModel ||
    builtModel.phase !==
      OPTIMIZATION_DSS_MODEL_BUILD_PHASE ||
    builtModel.layer !==
      OPTIMIZATION_DSS_MODEL_BUILD_LAYER ||
    builtModel.status !==
      OPTIMIZATION_DSS_MODEL_BUILD_STATUS.BUILT
  ) {
    throw new Error(
      "BUILT_MODEL_INVALID"
    );
  }

  if (
    !Object.values(
      OPTIMIZATION_DSS_SOLVER_KIND
    ).includes(
      solverKind
    )
  ) {
    throw new Error(
      "SOLVER_KIND_INVALID"
    );
  }

  if (
    !options ||
    typeof options !==
      "object" ||
    Array.isArray(
      options
    )
  ) {
    throw new Error(
      "SOLVER_OPTIONS_REQUIRED"
    );
  }

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_SOLVER_CONTRACT_PHASE,

    layer:
      OPTIMIZATION_DSS_SOLVER_CONTRACT_LAYER,

    upstreamPhase:
      OPTIMIZATION_DSS_SOLVER_CONTRACT_UPSTREAM_PHASE,

    builtModel,

    modelContract:
      builtModel.modelContract,

    optimizationContract:
      builtModel.optimizationContract,

    qualifiedInputs:
      builtModel.qualifiedInputs,

    horizon:
      builtModel.horizon,

    scope:
      builtModel.scope,

    scopeIdentity:
      builtModel.scopeIdentity,

    solverKind,

    options,

    inputSummary:
      Object.freeze({
        variableCount:
          builtModel.variableCount,

        objectiveRowCount:
          builtModel.objectiveRowCount,

        constraintRowCount:
          builtModel.constraintRowCount,
      }),

    status:
      OPTIMIZATION_DSS_SOLVER_STATUS.CONTRACT_DEFINED,

    terminationReason:
      OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.NOT_STARTED,

    solverStarted:
      false,

    solverCompleted:
      false,

    feasibilityEvaluated:
      false,

    feasible:
      null,

    objectiveValue:
      null,

    variableResults:
      null,

    constraintResults:
      null,

    recommendation:
      null,

    solverMetadata:
      null,

    boundaries:
      OPTIMIZATION_DSS_SOLVER_BOUNDARIES,
  });
}


export function buildOptimizationDssSolverResultEnvelope({
  solverContract,
  status,
  terminationReason,
  solverStarted,
  solverCompleted,
  feasible = null,
  objectiveValue = null,
  variableResults = null,
  constraintResults = null,
  solverMetadata = null,
} = {}) {
  if (
    !solverContract ||
    solverContract.phase !==
      OPTIMIZATION_DSS_SOLVER_CONTRACT_PHASE
  ) {
    throw new Error(
      "SOLVER_CONTRACT_INVALID"
    );
  }

  if (
    !Object.values(
      OPTIMIZATION_DSS_SOLVER_STATUS
    ).includes(
      status
    )
  ) {
    throw new Error(
      "SOLVER_STATUS_INVALID"
    );
  }

  if (
    !Object.values(
      OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON
    ).includes(
      terminationReason
    )
  ) {
    throw new Error(
      "SOLVER_TERMINATION_REASON_INVALID"
    );
  }

  if (
    objectiveValue !==
      null
  ) {
    requireFiniteNumber(
      objectiveValue,
      "OBJECTIVE_VALUE"
    );
  }

  if (
    variableResults !==
      null &&
    !Array.isArray(
      variableResults
    )
  ) {
    throw new Error(
      "VARIABLE_RESULTS_INVALID"
    );
  }

  if (
    constraintResults !==
      null &&
    !Array.isArray(
      constraintResults
    )
  ) {
    throw new Error(
      "CONSTRAINT_RESULTS_INVALID"
    );
  }

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_SOLVER_CONTRACT_PHASE,

    layer:
      OPTIMIZATION_DSS_SOLVER_CONTRACT_LAYER,

    solverContract,

    status,

    terminationReason,

    solverStarted:
      Boolean(
        solverStarted
      ),

    solverCompleted:
      Boolean(
        solverCompleted
      ),

    feasible:
      feasible ===
        null
        ? null
        : Boolean(
            feasible
          ),

    objectiveValue,

    variableResults:
      variableResults ===
        null
        ? null
        : Object.freeze([
            ...variableResults,
          ]),

    constraintResults:
      constraintResults ===
        null
        ? null
        : Object.freeze([
            ...constraintResults,
          ]),

    solverMetadata:
      solverMetadata ===
        null
        ? null
        : Object.freeze({
            ...solverMetadata,
          }),
  });
}
