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


function timestampsForBinding(
  binding,
  modelContract
) {
  if (
    !binding.timeIndexed
  ) {
    return [
      null,
    ];
  }

  if (
    Array.isArray(
      binding.timestamps
    )
  ) {
    if (
      binding.timestamps.length ===
        0
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_VARIABLE_BINDING
      );
    }

    return binding.timestamps;
  }

  return modelContract
    .timeIndex
    .timestamps;
}


function variableIdForTimestamp(
  binding,
  timestamp
) {
  return binding.timeIndexed
    ? `${binding.name}@${timestamp}`
    : binding.name;
}


function findVariableBinding(
  modelContract,
  name
) {
  return modelContract
    .variableBindings
    .find(
      binding =>
        binding.name ===
        name
    ) ??
    null;
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
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_VARIABLE_BINDING
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
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_VARIABLE_BINDING
      );
    }

    const timestamps =
      timestampsForBinding(
        binding,
        modelContract
      );

    for (
      const timestamp of
      timestamps
    ) {
      rows.push(
        Object.freeze({
          variableId:
            variableIdForTimestamp(
              binding,
              timestamp
            ),

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
  }

  const variableIds =
    rows.map(
      row =>
        row.variableId
    );

  if (
    new Set(
      variableIds
    ).size !==
      variableIds.length
  ) {
    throw new Error(
      OPTIMIZATION_DSS_MODEL_BUILD_REASON
        .INVALID_VARIABLE_BINDING
    );
  }

  return Object.freeze(
    rows
  );
}


/*
|--------------------------------------------------------------------------
| Qualified evidence access
|--------------------------------------------------------------------------
*/

function qualifiedEvidenceArray(
  modelContract
) {
  const evidence =
    modelContract
      ?.qualifiedInputs
      ?.qualifiedEvidence;

  if (
    !Array.isArray(
      evidence
    )
  ) {
    return [];
  }

  return evidence;
}


/*
|--------------------------------------------------------------------------
| Evidence-backed RHS resolution
|--------------------------------------------------------------------------
|
| Time-indexed evidence must match the constraint timestamp exactly.
|
| No:
| - nearest-neighbour lookup
| - interpolation
| - resampling
| - missing-as-zero
| - duplicate selection
|
*/

function resolveEvidenceRightHandSide({
  modelContract,
  metricName,
  timestamp,
}) {
  if (
    typeof metricName !==
      "string" ||
    metricName.trim() ===
      ""
  ) {
    throw new Error(
      "CONSTRAINT_RHS_EVIDENCE_METRIC_INVALID"
    );
  }


  const evidence =
    qualifiedEvidenceArray(
      modelContract
    );


  const metricMatches =
    evidence.filter(
      item =>
        item?.metricName ===
        metricName
    );


  let matches;


  if (
    timestamp ===
      null
  ) {
    matches =
      metricMatches;
  } else {
    matches =
      metricMatches.filter(
        item =>
          item?.timestamp ===
          timestamp
      );
  }


  if (
    matches.length ===
      0
  ) {
    throw new Error(
      `CONSTRAINT_RHS_EVIDENCE_NOT_FOUND:${metricName}:${timestamp ?? "STATIC"}`
    );
  }


  if (
    matches.length >
      1
  ) {
    throw new Error(
      `CONSTRAINT_RHS_EVIDENCE_AMBIGUOUS:${metricName}:${timestamp ?? "STATIC"}`
    );
  }


  const evidenceItem =
    matches[0];

  const value =
    evidenceItem?.value;


  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
  ) {
    throw new Error(
      `CONSTRAINT_RHS_EVIDENCE_VALUE_INVALID:${metricName}:${timestamp ?? "STATIC"}`
    );
  }


  return Object.freeze({
    value,

    evidence:
      evidenceItem,
  });
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
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_OBJECTIVE_TERM
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
        : findVariableBinding(
            modelContract,
            term.variableName
          );

    if (
      term.variableName !==
        null &&
      !variableBinding
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_OBJECTIVE_TERM
      );
    }

    const timestamps =
      variableBinding
        ? timestampsForBinding(
            variableBinding,
            modelContract
          )
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
            variableBinding
              ? variableIdForTimestamp(
                  variableBinding,
                  timestamp
                )
              : null,

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


function resolveLegacyConstraintVariables({
  boundVariables,
  timestamp,
  modelContract,
}) {
  const variableIds =
    [];

  for (
    const variableBinding of
    boundVariables
  ) {
    if (
      !variableBinding.timeIndexed
    ) {
      variableIds.push(
        variableBinding.name
      );

      continue;
    }

    const availableTimestamps =
      timestampsForBinding(
        variableBinding,
        modelContract
      );

    if (
      !availableTimestamps.includes(
        timestamp
      )
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_CONSTRAINT_BINDING
      );
    }

    variableIds.push(
      variableIdForTimestamp(
        variableBinding,
        timestamp
      )
    );
  }

  return Object.freeze(
    variableIds
  );
}


function resolveCrossTimeVariableTerms({
  binding,
  modelContract,
  baseTimestamp,
}) {
  if (
    !Array.isArray(
      binding.variableTerms
    ) ||
    binding.variableTerms.length ===
      0
  ) {
    throw new Error(
      OPTIMIZATION_DSS_MODEL_BUILD_REASON
        .INVALID_CONSTRAINT_BINDING
    );
  }

  const resolvedTerms =
    [];

  for (
    const term of
    binding.variableTerms
  ) {
    const variableBinding =
      findVariableBinding(
        modelContract,
        term.variableName
      );

    if (
      !variableBinding
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_CONSTRAINT_BINDING
      );
    }

    finiteNumber(
      term.coefficient,
      "CONSTRAINT_VARIABLE_TERM_COEFFICIENT"
    );

    if (
      !Number.isInteger(
        term.timeOffset
      )
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_CONSTRAINT_BINDING
      );
    }

    if (
      !variableBinding.timeIndexed
    ) {
      if (
        term.timeOffset !==
          0
      ) {
        throw new Error(
          OPTIMIZATION_DSS_MODEL_BUILD_REASON
            .INVALID_CONSTRAINT_BINDING
        );
      }

      resolvedTerms.push(
        Object.freeze({
          variableName:
            term.variableName,

          variableId:
            variableBinding.name,

          timestamp:
            null,

          timeOffset:
            0,

          coefficient:
            term.coefficient,
        })
      );

      continue;
    }

    const variableTimestamps =
      timestampsForBinding(
        variableBinding,
        modelContract
      );

    const baseVariableIndex =
      variableTimestamps.indexOf(
        baseTimestamp
      );

    if (
      baseVariableIndex <
        0
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_CONSTRAINT_BINDING
      );
    }

    const targetIndex =
      baseVariableIndex +
      term.timeOffset;

    if (
      targetIndex <
        0 ||
      targetIndex >=
        variableTimestamps.length
    ) {
      throw new Error(
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_CONSTRAINT_BINDING
      );
    }

    const targetTimestamp =
      variableTimestamps[
        targetIndex
      ];

    resolvedTerms.push(
      Object.freeze({
        variableName:
          term.variableName,

        variableId:
          variableIdForTimestamp(
            variableBinding,
            targetTimestamp
          ),

        timestamp:
          targetTimestamp,

        timeOffset:
          term.timeOffset,

        coefficient:
          term.coefficient,
      })
    );
  }

  return Object.freeze(
    resolvedTerms
  );
}


function buildConstraintRows(
  modelContract
) {
  const rows =
    [];

  const timeIndex =
    modelContract
      .timeIndex
      .timestamps;

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
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_CONSTRAINT_BINDING
      );
    }


    const boundVariables =
      binding.variableNames.map(
        name =>
          findVariableBinding(
            modelContract,
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
        OPTIMIZATION_DSS_MODEL_BUILD_REASON
          .INVALID_CONSTRAINT_BINDING
      );
    }


    const timeIndexed =
      boundVariables.some(
        item =>
          item.timeIndexed
      );


    /*
     * Explicit constraint timestamps are preferred.
     *
     * initialStateConstraint remains only as a
     * backward-compatible safeguard.
     */
    const timestamps =
      timeIndexed
        ? Array.isArray(
            binding.timestamps
          )
          ? binding.timestamps
          : binding.parameters
                ?.initialStateConstraint ===
              true
            ? [
                timeIndex[0],
              ]
            : timeIndex
        : [
            null,
          ];


    for (
      const timestamp of
      timestamps
    ) {
      const usesVariableTerms =
        Array.isArray(
          binding.variableTerms
        );


      const resolvedVariableTerms =
        usesVariableTerms
          ? resolveCrossTimeVariableTerms({
              binding,
              modelContract,
              baseTimestamp:
                timestamp,
            })
          : null;


      const variableIds =
        usesVariableTerms
          ? Object.freeze(
              resolvedVariableTerms.map(
                term =>
                  term.variableId
              )
            )
          : resolveLegacyConstraintVariables({
              boundVariables,
              timestamp,
              modelContract,
            });


      const coefficients =
        usesVariableTerms
          ? Object.freeze(
              resolvedVariableTerms.map(
                term =>
                  term.coefficient
              )
            )
          : Array.isArray(
              binding.coefficients
            )
            ? Object.freeze([
                ...binding.coefficients,
              ])
            : null;


      /*
       * Resolve the numerical RHS.
       *
       * Explicit RHS:
       *   preserve the contract value.
       *
       * Evidence-backed RHS:
       *   resolve exactly one qualified evidence
       *   point at the constraint timestamp.
       */
      let resolvedRightHandSide =
        binding.rightHandSide ??
        null;

      let resolvedRightHandSideEvidence =
        null;


      if (
        binding.rightHandSideEvidenceMetricName !==
          null &&
        binding.rightHandSideEvidenceMetricName !==
          undefined
      ) {
        const resolution =
          resolveEvidenceRightHandSide({
            modelContract,

            metricName:
              binding
                .rightHandSideEvidenceMetricName,

            timestamp,
          });


        resolvedRightHandSide =
          resolution.value;

        resolvedRightHandSideEvidence =
          resolution.evidence;
      }


      /*
       * Every algebraic built row must have
       * a concrete finite RHS by this point.
       */
      if (
        binding.algebraic ===
          true &&
        (
          typeof resolvedRightHandSide !==
            "number" ||
          !Number.isFinite(
            resolvedRightHandSide
          )
        )
      ) {
        throw new Error(
          `CONSTRAINT_RHS_UNRESOLVED:${binding.name}:${timestamp ?? "STATIC"}`
        );
      }


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

          variableIds,

          variableTerms:
            resolvedVariableTerms,

          evidenceMetricNames:
            Object.freeze([
              ...binding.evidenceMetricNames,
            ]),

          parameters:
            Object.freeze({
              ...binding.parameters,
            }),

          algebraic:
            binding.algebraic ===
              true,

          coefficients,

          operator:
            binding.operator ??
            null,

          rightHandSide:
            resolvedRightHandSide,

          rightHandSideEvidenceMetricName:
            binding
              .rightHandSideEvidenceMetricName ??
            null,

          rightHandSideEvidence:
            resolvedRightHandSideEvidence,

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
      OPTIMIZATION_DSS_MODEL_BUILD_REASON
        .INVALID_MODEL_CONTRACT
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
      OPTIMIZATION_DSS_MODEL_BUILD_REASON
        .INVALID_TIME_INDEX
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


export default
  buildOptimizationDssModel;