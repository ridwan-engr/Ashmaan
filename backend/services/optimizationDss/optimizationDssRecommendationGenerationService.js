// services/optimizationDss/optimizationDssRecommendationGenerationService.js

import {
  OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_PHASE,
  OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_LAYER,
  OPTIMIZATION_DSS_RECOMMENDATION_STATUS,
  OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY,
} from "./optimizationDssRecommendationContract.js";


export const OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_PHASE =
  "11.9";

export const OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_UPSTREAM_PHASE =
  "11.8";


export const OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS =
  Object.freeze({
    GENERATED:
      "GENERATED",

    PARTIALLY_GENERATED:
      "PARTIALLY_GENERATED",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON =
  Object.freeze({
    GENERATED:
      "GENERATED",

    PARTIAL_ACTION_COVERAGE:
      "PARTIAL_ACTION_COVERAGE",

    NOT_APPLICABLE:
      "NOT_APPLICABLE",

    CONTRACT_INVALID:
      "CONTRACT_INVALID",

    QUALIFIED_RESULT_REQUIRED:
      "QUALIFIED_RESULT_REQUIRED",

    ACTION_RESULT_NOT_FOUND:
      "ACTION_RESULT_NOT_FOUND",

    ACTION_VALUE_OUT_OF_BOUNDS:
      "ACTION_VALUE_OUT_OF_BOUNDS",

    ACTION_UNIT_MISMATCH:
      "ACTION_UNIT_MISMATCH",

    EVIDENCE_REFERENCE_INVALID:
      "EVIDENCE_REFERENCE_INVALID",
  });


export const OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_BOUNDARIES =
  Object.freeze({
    generationOnly:
      true,

    recommendationGenerated:
      true,

    advisoryOnly:
      true,

    automatedControlIncluded:
      false,

    automaticDispatchAllowed:
      false,

    executableActionProduced:
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

    implicitTimeGridAllowed:
      false,

    implicitResamplingAllowed:
      false,

    interpolationAllowed:
      false,

    futureObservedDataFabricationAllowed:
      false,
  });


function validateContract(
  recommendationContract
) {
  if (
    !recommendationContract ||
    recommendationContract.phase !==
      OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_PHASE ||
    recommendationContract.layer !==
      OPTIMIZATION_DSS_RECOMMENDATION_CONTRACT_LAYER ||
    recommendationContract.status !==
      OPTIMIZATION_DSS_RECOMMENDATION_STATUS.CONTRACT_DEFINED
  ) {
    throw new Error(
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON.CONTRACT_INVALID
    );
  }

  if (
    !recommendationContract.qualifiedResult ||
    recommendationContract.qualifiedResult.qualified !==
      true
  ) {
    throw new Error(
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON.QUALIFIED_RESULT_REQUIRED
    );
  }
}


function buildEvidenceUniverse(
  recommendationContract
) {
  const qualifiedResult =
    recommendationContract.qualifiedResult;

  const variableIds =
    new Set(
      (qualifiedResult.variableResults ?? []).map(
        item =>
          item.variableId
      )
    );

  const constraintIds =
    new Set(
      (qualifiedResult.constraintResults ?? []).map(
        item =>
          item.constraintRowId
      )
    );

  return {
    variableIds,
    constraintIds,
  };
}


function validateEvidenceRefs(
  recommendationContract
) {
  const {
    variableIds,
    constraintIds,
  } =
    buildEvidenceUniverse(
      recommendationContract
    );

  for (
    const ref of
    recommendationContract.evidenceRefs
  ) {
    if (
      !variableIds.has(
        ref
      ) &&
      !constraintIds.has(
        ref
      )
    ) {
      throw new Error(
        OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON.EVIDENCE_REFERENCE_INVALID
      );
    }
  }
}


function findQualifiedVariableResult(
  recommendationContract,
  action
) {
  const results =
    recommendationContract
      .qualifiedResult
      .variableResults ??
    [];

  return results.find(
    result =>
      result.bindingName ===
        action.target &&
      (
        action.timestamp ===
          null ||
        result.timestamp ===
          action.timestamp
      )
  ) ?? null;
}


function generateAction(
  recommendationContract,
  action
) {
  if (
    action.kind ===
      "DISPATCH_SETPOINT"
  ) {
    const result =
      findQualifiedVariableResult(
        recommendationContract,
        action
      );

    if (
      !result
    ) {
      return Object.freeze({
        actionId:
          action.actionId,

        status:
          "UNAVAILABLE",

        reason:
          OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON.ACTION_RESULT_NOT_FOUND,

        advisory:
          null,

        executable:
          false,

        autoDispatch:
          false,
      });
    }

    if (
      action.unit !==
        result.unit
    ) {
      throw new Error(
        OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON.ACTION_UNIT_MISMATCH
      );
    }

    if (
      action.lowerBound !==
        null &&
      result.value <
        action.lowerBound
    ) {
      throw new Error(
        OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON.ACTION_VALUE_OUT_OF_BOUNDS
      );
    }

    if (
      action.upperBound !==
        null &&
      result.value >
        action.upperBound
    ) {
      throw new Error(
        OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON.ACTION_VALUE_OUT_OF_BOUNDS
      );
    }

    return Object.freeze({
      actionId:
        action.actionId,

      status:
        "GENERATED",

      reason:
        "QUALIFIED_RESULT_BOUND",

      advisory:
        Object.freeze({
          kind:
            action.kind,

          target:
            action.target,

          timestamp:
            action.timestamp,

          value:
            result.value,

          unit:
            result.unit,

          lowerBound:
            action.lowerBound,

          upperBound:
            action.upperBound,

          rationale:
            action.rationale,

          sourceVariableId:
            result.variableId,
        }),

      executable:
        false,

      autoDispatch:
        false,
    });
  }

  return Object.freeze({
    actionId:
      action.actionId,

    status:
      "GENERATED",

    reason:
      "CONTRACT_ACTION_PRESERVED",

    advisory:
      Object.freeze({
        kind:
          action.kind,

        target:
          action.target,

        timestamp:
          action.timestamp,

        value:
          action.value,

        unit:
          action.unit,

        lowerBound:
          action.lowerBound,

        upperBound:
          action.upperBound,

        rationale:
          action.rationale,
      }),

    executable:
      false,

    autoDispatch:
      false,
  });
}


export function generateOptimizationDssRecommendation({
  recommendationContract,
} = {}) {
  validateContract(
    recommendationContract
  );

  validateEvidenceRefs(
    recommendationContract
  );

  if (
    recommendationContract.applicability ===
      OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY.NOT_APPLICABLE ||
    recommendationContract.applicability ===
      OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY.UNAVAILABLE
  ) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_PHASE,

      layer:
        OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_UPSTREAM_PHASE,

      recommendationContract,

      qualifiedResult:
        recommendationContract.qualifiedResult,

      status:
        OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS.UNAVAILABLE,

      reason:
        OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON.NOT_APPLICABLE,

      recommendation:
        null,

      actionResults:
        Object.freeze([]),

      generatedActionCount:
        0,

      unavailableActionCount:
        recommendationContract.actions.length,

      boundaries:
        OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_BOUNDARIES,
    });
  }

  const actionResults =
    Object.freeze(
      recommendationContract.actions.map(
        action =>
          generateAction(
            recommendationContract,
            action
          )
      )
    );

  const generatedActionCount =
    actionResults.filter(
      item =>
        item.status ===
        "GENERATED"
    ).length;

  const unavailableActionCount =
    actionResults.length -
    generatedActionCount;

  const status =
    unavailableActionCount ===
      0
      ? OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS.GENERATED
      : generatedActionCount >
          0
        ? OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS.PARTIALLY_GENERATED
        : OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS.UNAVAILABLE;

  const reason =
    status ===
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS.GENERATED
      ? OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON.GENERATED
      : status ===
          OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS.PARTIALLY_GENERATED
        ? OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON.PARTIAL_ACTION_COVERAGE
        : OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_REASON.ACTION_RESULT_NOT_FOUND;

  const recommendation =
    generatedActionCount ===
      0
      ? null
      : Object.freeze({
          recommendationKind:
            recommendationContract.recommendationKind,

          applicability:
            recommendationContract.applicability,

          confidence:
            recommendationContract.confidence,

          rationale:
            recommendationContract.rationale,

          horizon:
            recommendationContract.horizon,

          scope:
            recommendationContract.scope,

          scopeIdentity:
            recommendationContract.scopeIdentity,

          evidenceRefs:
            Object.freeze([
              ...recommendationContract.evidenceRefs,
            ]),

          actions:
            Object.freeze(
              actionResults
                .filter(
                  item =>
                    item.status ===
                    "GENERATED"
                )
                .map(
                  item =>
                    item.advisory
                )
            ),

          advisoryOnly:
            true,

          executable:
            false,

          autoDispatch:
            false,
        });

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_PHASE,

    layer:
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_LAYER,

    upstreamPhase:
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_UPSTREAM_PHASE,

    recommendationContract,

    qualifiedResult:
      recommendationContract.qualifiedResult,

    executionResult:
      recommendationContract.executionResult,

    builtModel:
      recommendationContract.builtModel,

    status,

    reason,

    recommendation,

    actionResults,

    generatedActionCount,

    unavailableActionCount,

    boundaries:
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_BOUNDARIES,
  });
}
