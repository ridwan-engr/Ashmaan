// services/optimizationDss/optimizationDssPersistenceContract.js

import crypto from "node:crypto";

import {
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_PHASE,
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_LAYER,
} from "./optimizationDssRecommendationGenerationService.js";


export const OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_PHASE =
  "11.10";

export const OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_UPSTREAM_PHASE =
  "11.9";


export const OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS =
  Object.freeze({
    CONTRACT_DEFINED:
      "CONTRACT_DEFINED",

    NOT_PERSISTED:
      "NOT_PERSISTED",

    PERSISTED:
      "PERSISTED",

    UNAVAILABLE:
      "UNAVAILABLE",

    ERROR:
      "ERROR",
  });


export const OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE =
  Object.freeze({
    UPSERT_BY_PERSISTENCE_KEY:
      "UPSERT_BY_PERSISTENCE_KEY",
  });


export const OPTIMIZATION_DSS_PERSISTENCE_BOUNDARIES =
  Object.freeze({
    contractOnly: true,
    persistenceIncluded: false,
    mongoWriteIncluded: false,
    repositoryImplementationIncluded: false,
    apiIncluded: false,
    dashboardIncluded: false,
    automatedControlIncluded: false,
    automaticDispatchAllowed: false,
    executableActionProduced: false,
    financialBiMutationIncluded: false,
    forecastingMutationIncluded: false,
    engineeringAnalyticsMutationIncluded: false,
    telemetryMutationIncluded: false,
    eventMutationIncluded: false,
    missingMeansZero: false,
    unavailableMeansZero: false,
    unitInferenceAllowed: false,
    currencyInferenceAllowed: false,
    currencyConversionAllowed: false,
    tariffInferenceAllowed: false,
    emissionFactorInferenceAllowed: false,
    topologyInferenceAllowed: false,
    controllabilityInferenceAllowed: false,
    implicitTimeGridAllowed: false,
    implicitResamplingAllowed: false,
    interpolationAllowed: false,
    futureObservedDataFabricationAllowed: false,
  });


function requireNonEmptyString(value, field) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(`${field}_REQUIRED`);
  }

  return value.trim();
}


function stableStringify(value) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const keys =
    Object.keys(value).sort();

  return `{${keys
    .map(
      key =>
        `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )
    .join(",")}}`;
}


export function buildOptimizationDssPersistenceIdentity({
  generationResult,
  recordType = "OPTIMIZATION_DSS_RECOMMENDATION",
} = {}) {
  if (
    !generationResult ||
    generationResult.phase !==
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_PHASE ||
    generationResult.layer !==
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_LAYER
  ) {
    throw new Error("GENERATION_RESULT_INVALID");
  }

  requireNonEmptyString(
    recordType,
    "RECORD_TYPE"
  );

  const recommendationContract =
    generationResult.recommendationContract;

  if (!recommendationContract) {
    throw new Error(
      "RECOMMENDATION_CONTRACT_REQUIRED"
    );
  }

  const identityPayload =
    Object.freeze({
      recordType,

      phase:
        OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_PHASE,

      scope:
        recommendationContract.scope,

      scopeIdentity:
        recommendationContract.scopeIdentity,

      horizon:
        recommendationContract.horizon,

      recommendationKind:
        recommendationContract.recommendationKind,

      applicability:
        recommendationContract.applicability,

      confidence:
        recommendationContract.confidence,

      evidenceRefs:
        recommendationContract.evidenceRefs,

      generationStatus:
        generationResult.status,
    });

  const persistenceKey =
    crypto
      .createHash("sha256")
      .update(
        stableStringify(
          identityPayload
        )
      )
      .digest("hex");

  return Object.freeze({
    recordType,
    persistenceKey,
    deterministic: true,
    identityPayload,
  });
}


export function createOptimizationDssPersistenceContract({
  generationResult,
  persistenceIdentity,
  writeMode =
    OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE.UPSERT_BY_PERSISTENCE_KEY,
} = {}) {
  if (
    !generationResult ||
    generationResult.phase !==
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_PHASE ||
    generationResult.layer !==
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_LAYER
  ) {
    throw new Error("GENERATION_RESULT_INVALID");
  }

  if (
    !Object.values(
      OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE
    ).includes(writeMode)
  ) {
    throw new Error("WRITE_MODE_INVALID");
  }

  if (
    !persistenceIdentity ||
    typeof persistenceIdentity.persistenceKey !==
      "string" ||
    persistenceIdentity.persistenceKey.length !==
      64
  ) {
    throw new Error(
      "PERSISTENCE_IDENTITY_INVALID"
    );
  }

  const recommendationContract =
    generationResult.recommendationContract;

  const qualifiedResult =
    generationResult.qualifiedResult;

  const record =
    Object.freeze({
      persistenceKey:
        persistenceIdentity.persistenceKey,

      recordType:
        persistenceIdentity.recordType,

      phase:
        OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_PHASE,

      layer:
        OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_LAYER,

      scope:
        recommendationContract.scope,

      scopeIdentity:
        recommendationContract.scopeIdentity,

      horizon:
        recommendationContract.horizon,

      recommendationKind:
        recommendationContract.recommendationKind,

      applicability:
        recommendationContract.applicability,

      confidence:
        recommendationContract.confidence,

      generationStatus:
        generationResult.status,

      generationReason:
        generationResult.reason,

      recommendation:
        generationResult.recommendation,

      actionResults:
        generationResult.actionResults,

      generatedActionCount:
        generationResult.generatedActionCount,

      unavailableActionCount:
        generationResult.unavailableActionCount,

      objectiveValue:
        qualifiedResult.objectiveValue,

      evidenceRefs:
        recommendationContract.evidenceRefs,

      advisoryOnly:
        generationResult.recommendation?.advisoryOnly ??
        true,

      executable:
        false,

      autoDispatch:
        false,
    });

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_PHASE,

    layer:
      OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_LAYER,

    upstreamPhase:
      OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_UPSTREAM_PHASE,

    generationResult,

    recommendationContract,

    qualifiedResult,

    executionResult:
      generationResult.executionResult,

    builtModel:
      generationResult.builtModel,

    persistenceIdentity,

    writeMode,

    record,

    status:
      OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS.CONTRACT_DEFINED,

    persisted:
      false,

    persistenceResult:
      null,

    boundaries:
      OPTIMIZATION_DSS_PERSISTENCE_BOUNDARIES,
  });
}
