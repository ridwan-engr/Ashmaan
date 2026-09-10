import {
  FINANCIAL_BI_PERSISTENCE_CONTRACT_PHASE,
} from "./financialBiPersistenceContract.js";

export const FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_PHASE = "10.8";
export const FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_LAYER = "FINANCIAL_BI";
export const FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE =
  FINANCIAL_BI_PERSISTENCE_CONTRACT_PHASE;

export const FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_STATUS = Object.freeze({
  PERSISTED: "PERSISTED",
  ALREADY_PERSISTED: "ALREADY_PERSISTED",
  UNAVAILABLE: "UNAVAILABLE",
});

export const FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_REASON = Object.freeze({
  INSERTED: "INSERTED",
  IDEMPOTENT_EXISTING_RECORD: "IDEMPOTENT_EXISTING_RECORD",
  SOURCE_UNAVAILABLE: "SOURCE_UNAVAILABLE",
  REPOSITORY_REJECTED: "REPOSITORY_REJECTED",
});

export const FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_BOUNDARIES = Object.freeze({
  persistenceExecuted: true,
  deterministicIdentityRequired: true,
  idempotentUpsertRequired: true,
  duplicateInsertAllowed: false,
  reportingWindowPreserved: true,
  scopePreserved: true,
  lineagePreserved: true,
  missingMeansZero: false,
  unavailableMeansZero: false,
  unitInferenceAllowed: false,
  currencyInferenceAllowed: false,
  currencyConversionAllowed: false,
  aggregationMutationIncluded: false,
  forecastMutationIncluded: false,
  engineeringAnalyticsMutationIncluded: false,
  telemetryMutationIncluded: false,
  eventMutationIncluded: false,
  apiIncluded: false,
  dashboardIncluded: false,
  optimizationDssIncluded: false,
});

function validateRepository(repository) {
  if (!repository || typeof repository.upsertByPersistenceKey !== "function") {
    throw new Error("FINANCIAL_BI_PERSISTENCE_REPOSITORY_REQUIRED");
  }
}

function buildDocument(contract) {
  return Object.freeze({
    persistenceKey: contract.persistenceKey,
    recordKind: contract.recordKind,
    metricName: contract.metricName,
    scope: contract.scope,
    scopeIdentity: contract.scopeIdentity,
    reportingWindow: contract.reportingWindow,
    lineage: contract.lineage,
    payload: contract.payload,
    phase: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_PHASE,
    upstreamPhase: contract.phase,
    layer: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_LAYER,
  });
}

export async function persistFinancialBiKpi({ contract, repository } = {}) {
  if (!contract || contract.phase !== FINANCIAL_BI_PERSISTENCE_CONTRACT_PHASE) {
    throw new Error("PHASE_10_7_PERSISTENCE_CONTRACT_REQUIRED");
  }

  if (typeof contract.persistenceKey !== "string" || contract.persistenceKey.length !== 64) {
    throw new Error("PERSISTENCE_KEY_INVALID");
  }

  validateRepository(repository);

  if (contract.payload.available !== true) {
    return Object.freeze({
      phase: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_PHASE,
      layer: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_LAYER,
      upstreamPhase: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE,
      contract,
      status: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_STATUS.UNAVAILABLE,
      reason: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_REASON.SOURCE_UNAVAILABLE,
      persistenceKey: contract.persistenceKey,
      document: null,
      persistence: Object.freeze({
        executed: false,
        inserted: false,
        existing: false,
        documentId: null,
      }),
      boundaries: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_BOUNDARIES,
    });
  }

  const document = buildDocument(contract);
  const result = await repository.upsertByPersistenceKey({
    persistenceKey: contract.persistenceKey,
    document,
  });

  if (!result || typeof result !== "object") {
    return Object.freeze({
      phase: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_PHASE,
      layer: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_LAYER,
      upstreamPhase: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE,
      contract,
      status: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_STATUS.UNAVAILABLE,
      reason: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_REASON.REPOSITORY_REJECTED,
      persistenceKey: contract.persistenceKey,
      document,
      persistence: Object.freeze({
        executed: true,
        inserted: false,
        existing: false,
        documentId: null,
      }),
      boundaries: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_BOUNDARIES,
    });
  }

  const inserted = result.inserted === true;

  return Object.freeze({
    phase: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_PHASE,
    layer: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_LAYER,
    upstreamPhase: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE,
    contract,
    status: inserted
      ? FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_STATUS.PERSISTED
      : FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_STATUS.ALREADY_PERSISTED,
    reason: inserted
      ? FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_REASON.INSERTED
      : FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_REASON.IDEMPOTENT_EXISTING_RECORD,
    persistenceKey: contract.persistenceKey,
    document,
    persistence: Object.freeze({
      executed: true,
      inserted,
      existing: result.existing === true || !inserted,
      documentId:
        result.documentId === undefined || result.documentId === null
          ? null
          : String(result.documentId),
    }),
    boundaries: FINANCIAL_BI_PERSISTENCE_IMPLEMENTATION_BOUNDARIES,
  });
}
