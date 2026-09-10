// services/optimizationDss/optimizationDssModelBuildService.js

import {
  OPTIMIZATION_DSS_MODEL_CONTRACT_PHASE,
  OPTIMIZATION_DSS_MODEL_CONTRACT_LAYER,
  OPTIMIZATION_DSS_OBJECTIVE_SENSE,
} from "./optimizationDssModelContract.js";


export const OPTIMIZATION_DSS_MODEL_BUILD_PHASE =
  "11.4";

export const OPTIMIZATION_DSS_MODEL_BUILD_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_MODEL_BUILD_UPSTREAM_PHASE =
  "11.3";


export const OPTIMIZATION_DSS_MODEL_BUILD_STATUS =
  Object.freeze({
    BUILT:
      "BUILT",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_MODEL_BUILD_REASON =
  Object.freeze({
    BUILT:
      "BUILT",

    INVALID_MODEL_CONTRACT:
      "INVALID_MODEL_CONTRACT",

    INVALID_TIME_INDEX:
      "INVALID_TIME_INDEX",

    INVALID_VARIABLE_BINDING:
      "INVALID_VARIABLE_BINDING",

    INVALID_OBJECTIVE_TERM:
      "INVALID_OBJECTIVE_TERM",

    INVALID_CONSTRAINT_BINDING:
      "INVALID_CONSTRAINT_BINDING",
  });


export const OPTIMIZATION_DSS_MODEL_BUILD_BOUNDARIES =
  Object.freeze({
    buildOnly:
      true,

    solverIndependent:
      true,

    modelBuilt:
      true,

    solverIncluded:
      false,

    optimizationExecuted:
      false,

    feasibilityEvaluated:
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


function finiteNumber(
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


function buildExpandedVariables(
  modelContract
) {
  const rows =
    [];

  for (
    const binding of
    modelContract.variableBindings
  ) {
    if (
      !binding ||
      !binding.name ||
      !binding.unit
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON.INVALID_VARIABLE_BINDING
      );
    }

    finiteNumber(
      binding.lowerBound,
      "VARIABLE_LOWER_BOUND"
    );

    finiteNumber(
      binding.upperBound,
      "VARIABLE_UPPER_BOUND"
    );

    if (
      binding.upperBound <
        binding.lowerBound
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON.INVALID_VARIABLE_BINDING
      );
    }

    if (
      binding.timeIndexed
    ) {
      for (
        const timestamp of
        modelContract
          .timeIndex
          .timestamps
      ) {
        rows.push(
          Object.freeze({
            variableId:
              `${binding.name}@${timestamp}`,

            bindingName:
              binding.name,

            variableKind:
              binding.variableKind,

            timestamp,

            unit:
              binding.unit,

            lowerBound:
              binding.lowerBound,

            upperBound:
              binding.upperBound,

            value:
              null,

            optimized:
              false,
          })
        );
      }
    } else {
      rows.push(
        Object.freeze({
          variableId:
            binding.name,

          bindingName:
            binding.name,

          variableKind:
            binding.variableKind,

          timestamp:
            null,

          unit:
            binding.unit,

          lowerBound:
            binding.lowerBound,

          upperBound:
            binding.upperBound,

          value:
            null,

          optimized:
            false,
        })
      );
    }
  }

  return Object.freeze(
    rows
  );
}


function buildObjectiveRows(
  modelContract
) {
  const rows =
    [];

  for (
    const term of
    modelContract.objectiveTerms
  ) {
    if (
      !term ||
      !term.name ||
      !Object.values(
        OPTIMIZATION_DSS_OBJECTIVE_SENSE
      ).includes(
        term.sense
      )
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON.INVALID_OBJECTIVE_TERM
      );
    }

    finiteNumber(
      term.coefficient,
      "OBJECTIVE_COEFFICIENT"
    );

    const variableBinding =
      term.variableName ===
        null
        ? null
        : modelContract.variableBindings.find(
            binding =>
              binding.name ===
              term.variableName
          );

    if (
      term.variableName !==
        null &&
      !variableBinding
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON.INVALID_OBJECTIVE_TERM
      );
    }

    const timestamps =
      variableBinding?.timeIndexed
        ? modelContract.timeIndex.timestamps
        : [
            null,
          ];

    for (
      const timestamp of
      timestamps
    ) {
      rows.push(
        Object.freeze({
          objectiveRowId:
            timestamp ===
              null
              ? term.name
              : `${term.name}@${timestamp}`,

          termName:
            term.name,

          objectiveKind:
            term.objectiveKind,

          sense:
            term.sense,

          coefficient:
            term.coefficient,

          variableId:
            term.variableName ===
              null
              ? null
              : timestamp ===
                  null
                ? term.variableName
                : `${term.variableName}@${timestamp}`,

          evidenceMetricName:
            term.evidenceMetricName,

          unit:
            term.unit,

          currency:
            term.currency,

          value:
            null,

          evaluated:
            false,
        })
      );
    }
  }

  return Object.freeze(
    rows
  );
}


function buildConstraintRows(
  modelContract
) {
  const rows =
    [];

  for (
    const binding of
    modelContract.constraintBindings
  ) {
    if (
      !binding ||
      !binding.name ||
      !Array.isArray(
        binding.variableNames
      ) ||
      binding.variableNames.length ===
        0
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON.INVALID_CONSTRAINT_BINDING
      );
    }

    const boundVariables =
      binding.variableNames.map(
        name =>
          modelContract.variableBindings.find(
            variable =>
              variable.name ===
              name
          )
      );

    if (
      boundVariables.some(
        item =>
          !item
      )
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON.INVALID_CONSTRAINT_BINDING
      );
    }

    const timeIndexed =
      boundVariables.some(
        item =>
          item.timeIndexed
      );

    const timestamps =
      timeIndexed
        ? modelContract.timeIndex.timestamps
        : [
            null,
          ];

    for (
      const timestamp of
      timestamps
    ) {
      rows.push(
        Object.freeze({
          constraintRowId:
            timestamp ===
              null
              ? binding.name
              : `${binding.name}@${timestamp}`,

          bindingName:
            binding.name,

          constraintKind:
            binding.constraintKind,

          timestamp,

          variableIds:
            Object.freeze(
              binding.variableNames.map(
                name =>
                  timestamp ===
                    null
                    ? name
                    : `${name}@${timestamp}`
              )
            ),

          evidenceMetricNames:
            Object.freeze([
              ...binding.evidenceMetricNames,
            ]),

          parameters:
            Object.freeze({
              ...binding.parameters,
            }),

          required:
            binding.required,

          evaluated:
            false,

          satisfied:
            null,
        })
      );
    }
  }

  return Object.freeze(
    rows
  );
}


export function buildOptimizationDssModel({
  modelContract,
} = {}) {
  if (
    !modelContract ||
    modelContract.phase !==
      OPTIMIZATION_DSS_MODEL_CONTRACT_PHASE ||
    modelContract.layer !==
      OPTIMIZATION_DSS_MODEL_CONTRACT_LAYER
  ) {
    throw new Error(
      OPTIMIZATION_DSS_MODEL_BUILD_REASON.INVALID_MODEL_CONTRACT
    );
  }

  if (
    !modelContract.timeIndex ||
    !Array.isArray(
      modelContract
        .timeIndex
        .timestamps
    ) ||
    modelContract
      .timeIndex
      .timestamps
      .length ===
      0
  ) {
    throw new Error(
      OPTIMIZATION_DSS_MODEL_BUILD_REASON.INVALID_TIME_INDEX
    );
  }

  const variables =
    buildExpandedVariables(
      modelContract
    );

  const objectiveRows =
    buildObjectiveRows(
      modelContract
    );

  const constraintRows =
    buildConstraintRows(
      modelContract
    );

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_MODEL_BUILD_PHASE,

    layer:
      OPTIMIZATION_DSS_MODEL_BUILD_LAYER,

    upstreamPhase:
      OPTIMIZATION_DSS_MODEL_BUILD_UPSTREAM_PHASE,

    modelContract,

    optimizationContract:
      modelContract.optimizationContract,

    qualifiedInputs:
      modelContract.qualifiedInputs,

    horizon:
      modelContract.horizon,

    scope:
      modelContract.scope,

    scopeIdentity:
      modelContract.scopeIdentity,

    timeIndex:
      modelContract.timeIndex,

    status:
      OPTIMIZATION_DSS_MODEL_BUILD_STATUS.BUILT,

    reason:
      OPTIMIZATION_DSS_MODEL_BUILD_REASON.BUILT,

    variables,

    variableCount:
      variables.length,

    objectiveRows,

    objectiveRowCount:
      objectiveRows.length,

    constraintRows,

    constraintRowCount:
      constraintRows.length,

    solver:
      null,

    optimizationExecuted:
      false,

    feasibilityEvaluated:
      false,

    feasible:
      null,

    objectiveValue:
      null,

    recommendation:
      null,

    boundaries:
      OPTIMIZATION_DSS_MODEL_BUILD_BOUNDARIES,
  });
}
