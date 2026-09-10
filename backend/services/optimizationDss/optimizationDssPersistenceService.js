// services/optimizationDss/optimizationDssPersistenceService.js

import {
  OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_PHASE,
  OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_LAYER,
  OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS,
  OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE,
} from "./optimizationDssPersistenceContract.js";


export const OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_PHASE =
  "11.11";

export const OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE =
  "11.10";


export const OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_REASON =
  Object.freeze({
    PERSISTED:
      "PERSISTED",

    INVALID_PERSISTENCE_CONTRACT:
      "INVALID_PERSISTENCE_CONTRACT",

    REPOSITORY_REQUIRED:
      "REPOSITORY_REQUIRED",

    PERSISTENCE_ERROR:
      "PERSISTENCE_ERROR",
  });


export const OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_BOUNDARIES =
  Object.freeze({
    persistenceIncluded: true,
    mongoRepositoryImplemented: true,
    liveMongoValidated: false,
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


function validatePersistenceContract(
  persistenceContract
) {
  if (
    !persistenceContract ||
    persistenceContract.phase !==
      OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_PHASE ||
    persistenceContract.layer !==
      OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_LAYER ||
    persistenceContract.status !==
      OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS.CONTRACT_DEFINED ||
    persistenceContract.persisted !==
      false ||
    persistenceContract.writeMode !==
      OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE.UPSERT_BY_PERSISTENCE_KEY
  ) {
    throw new Error(
      OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_REASON.INVALID_PERSISTENCE_CONTRACT
    );
  }
}


function validateRepository(
  repository
) {
  if (
    !repository ||
    typeof repository.upsertByPersistenceKey !==
      "function"
  ) {
    throw new Error(
      OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_REASON.REPOSITORY_REQUIRED
    );
  }
}


export async function persistOptimizationDssRecommendation({
  persistenceContract,
  repository,
} = {}) {
  validatePersistenceContract(
    persistenceContract
  );

  validateRepository(
    repository
  );

  try {
    const persistedRecord =
      await repository.upsertByPersistenceKey({
        persistenceKey:
          persistenceContract
            .persistenceIdentity
            .persistenceKey,

        record:
          persistenceContract.record,
      });

    if (
      !persistedRecord ||
      persistedRecord.persistenceKey !==
        persistenceContract
          .persistenceIdentity
          .persistenceKey
    ) {
      throw new Error(
        "PERSISTED_RECORD_INVALID"
      );
    }

    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_PHASE,

      layer:
        OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE,

      persistenceContract,

      generationResult:
        persistenceContract.generationResult,

      recommendationContract:
        persistenceContract.recommendationContract,

      qualifiedResult:
        persistenceContract.qualifiedResult,

      executionResult:
        persistenceContract.executionResult,

      builtModel:
        persistenceContract.builtModel,

      persistenceIdentity:
        persistenceContract.persistenceIdentity,

      writeMode:
        persistenceContract.writeMode,

      status:
        OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS.PERSISTED,

      reason:
        OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_REASON.PERSISTED,

      persisted:
        true,

      persistenceResult:
        Object.freeze({
          persistenceKey:
            persistedRecord.persistenceKey,

          record:
            persistedRecord,
        }),

      recommendation:
        persistedRecord.recommendation ??
        null,

      boundaries:
        OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_BOUNDARIES,
    });
  } catch (error) {
    return Object.freeze({
      phase:
        OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_PHASE,

      layer:
        OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_LAYER,

      upstreamPhase:
        OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE,

      persistenceContract,

      status:
        OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS.ERROR,

      reason:
        OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_REASON.PERSISTENCE_ERROR,

      persisted:
        false,

      persistenceResult:
        null,

      recommendation:
        null,

      error:
        Object.freeze({
          message:
            error instanceof Error
              ? error.message
              : String(error),
        }),

      boundaries:
        OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_BOUNDARIES,
    });
  }
}
