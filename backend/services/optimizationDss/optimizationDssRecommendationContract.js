// services/optimizationDss/optimizationDssRecommendationContract.js

import {
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE,
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER,
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS,
} from "./optimizationDssResultQualificationService.js";


export const OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_PHASE =
  "11.8";

export const OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_UPSTREAM_PHASE =
  "11.7";


export const OPTIMIZATION_DSS_RECOMMENDATION_KIND =
  Object.freeze({
    DISPATCH_SETPOINT:
      "DISPATCH_SETPOINT",

    OPERATING_WINDOW:
      "OPERATING_WINDOW",

    LOAD_SHED_ADVISORY:
      "LOAD_SHED_ADVISORY",

    GENERATOR_USAGE_ADVISORY:
      "GENERATOR_USAGE_ADVISORY",

    GRID_USAGE_ADVISORY:
      "GRID_USAGE_ADVISORY",

    BATTERY_USAGE_ADVISORY:
      "BATTERY_USAGE_ADVISORY",
  });


export const OPTIMIZATION_DSS_RECOMMENDATION_STATUS =
  Object.freeze({
    CONTRACT_DEFINED:
      "CONTRACT_DEFINED",

    NOT_GENERATED:
      "NOT_GENERATED",

    GENERATED:
      "GENERATED",

    PARTIALLY_GENERATED:
      "PARTIALLY_GENERATED",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY =
  Object.freeze({
    APPLICABLE:
      "APPLICABLE",

    PARTIALLY_APPLICABLE:
      "PARTIALLY_APPLICABLE",

    NOT_APPLICABLE:
      "NOT_APPLICABLE",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE =
  Object.freeze({
    HIGH:
      "HIGH",

    MEDIUM:
      "MEDIUM",

    LOW:
      "LOW",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_RECOMMENDATION_BOUNDARIES =
  Object.freeze({
    contractOnly:
      true,

    recommendationGenerated:
      false,

    automatedControlIncluded:
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

    controllabilityInferenceAllowed:
      false,

    automaticDispatchAllowed:
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


function requireNonEmptyString(
  value,
  field
) {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${field}_REQUIRED`
    );
  }

  return value.trim();
}


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


export function buildOptimizationDssRecommendationAction({
  actionId,
  kind,
  target,
  timestamp = null,
  value = null,
  unit = null,
  lowerBound = null,
  upperBound = null,
  rationale,
} = {}) {
  if (
    !Object.values(
      OPTIMIZATION_DSS_RECOMMENDATION_KIND
    ).includes(
      kind
    )
  ) {
    throw new Error(
      "RECOMMENDATION_KIND_INVALID"
    );
  }

  if (
    value !==
      null
  ) {
    requireFiniteNumber(
      value,
      "RECOMMENDATION_VALUE"
    );
  }

  if (
    lowerBound !==
      null
  ) {
    requireFiniteNumber(
      lowerBound,
      "RECOMMENDATION_LOWER_BOUND"
    );
  }

  if (
    upperBound !==
      null
  ) {
    requireFiniteNumber(
      upperBound,
      "RECOMMENDATION_UPPER_BOUND"
    );
  }

  if (
    lowerBound !==
      null &&
    upperBound !==
      null &&
    upperBound <
      lowerBound
  ) {
    throw new Error(
      "RECOMMENDATION_RANGE_INVALID"
    );
  }

  if (
    value !==
      null &&
    !unit
  ) {
    throw new Error(
      "RECOMMENDATION_UNIT_REQUIRED"
    );
  }

  return Object.freeze({
    actionId:
      requireNonEmptyString(
        actionId,
        "ACTION_ID"
      ),

    kind,

    target:
      requireNonEmptyString(
        target,
        "TARGET"
      ),

    timestamp:
      timestamp ===
        null
        ? null
        : new Date(
            timestamp
          ).toISOString(),

    value,

    unit:
      unit ===
        null
        ? null
        : requireNonEmptyString(
            unit,
            "UNIT"
          ),

    lowerBound,

    upperBound,

    rationale:
      requireNonEmptyString(
        rationale,
        "RATIONALE"
      ),

    executable:
      false,

    autoDispatch:
      false,
  });
}


export function createOptimizationDssRecommendationContract({
  qualifiedResult,
  recommendationKind,
  applicability,
  confidence,
  actions,
  evidenceRefs,
  rationale,
} = {}) {
  if (
    !qualifiedResult ||
    qualifiedResult.phase !==
      OPTIMIZATION_DSS_RESULT_QUALIFICATION_PHASE ||
    qualifiedResult.layer !==
      OPTIMIZATION_DSS_RESULT_QUALIFICATION_LAYER
  ) {
    throw new Error(
      "QUALIFIED_RESULT_INVALID"
    );
  }

  if (
    qualifiedResult.status !==
      OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS.QUALIFIED
  ) {
    throw new Error(
      "QUALIFIED_RESULT_REQUIRED"
    );
  }

  if (
    !Object.values(
      OPTIMIZATION_DSS_RECOMMENDATION_KIND
    ).includes(
      recommendationKind
    )
  ) {
    throw new Error(
      "RECOMMENDATION_KIND_INVALID"
    );
  }

  if (
    !Object.values(
      OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY
    ).includes(
      applicability
    )
  ) {
    throw new Error(
      "RECOMMENDATION_APPLICABILITY_INVALID"
    );
  }

  if (
    !Object.values(
      OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE
    ).includes(
      confidence
    )
  ) {
    throw new Error(
      "RECOMMENDATION_CONFIDENCE_INVALID"
    );
  }

  if (
    !Array.isArray(
      actions
    )
  ) {
    throw new Error(
      "RECOMMENDATION_ACTIONS_REQUIRED"
    );
  }

  if (
    !Array.isArray(
      evidenceRefs
    ) ||
    evidenceRefs.length ===
      0
  ) {
    throw new Error(
      "RECOMMENDATION_EVIDENCE_REQUIRED"
    );
  }

  const actionIds =
    actions.map(
      action =>
        action?.actionId
    );

  if (
    new Set(
      actionIds
    ).size !==
      actionIds.length
  ) {
    throw new Error(
      "DUPLICATE_RECOMMENDATION_ACTION_ID"
    );
  }

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_PHASE,

    layer:
      OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_LAYER,

    upstreamPhase:
      OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_UPSTREAM_PHASE,

    qualifiedResult,

    executionResult:
      qualifiedResult.executionResult,

    solverContract:
      qualifiedResult.solverContract,

    builtModel:
      qualifiedResult.builtModel,

    horizon:
      qualifiedResult
        .executionResult
        .solverContract
        .horizon,

    scope:
      qualifiedResult
        .executionResult
        .solverContract
        .scope,

    scopeIdentity:
      qualifiedResult
        .executionResult
        .solverContract
        .scopeIdentity,

    recommendationKind,

    applicability,

    confidence,

    actions:
      Object.freeze([
        ...actions,
      ]),

    evidenceRefs:
      Object.freeze([
        ...evidenceRefs,
      ]),

    rationale:
      requireNonEmptyString(
        rationale,
        "RECOMMENDATION_RATIONALE"
      ),

    status:
      OPTIMIZATION_DSS_RECOMMENDATION_STATUS.CONTRACT_DEFINED,

    generated:
      false,

    recommendation:
      null,

    boundaries:
      OPTIMIZATION_DSS_RECOMMENDATION_BOUNDARIES,
  });
}
