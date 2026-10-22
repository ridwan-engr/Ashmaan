// services/optimizationDss/optimizationDssInputQualificationService.js

import {
  OPTIMIZATION_DSS_CONTRACT_PHASE,
  OPTIMIZATION_DSS_CONTRACT_LAYER,
  OPTIMIZATION_DSS_EVIDENCE_STATUS,
  OPTIMIZATION_DSS_SCOPE,
} from "./optimizationDssContract.js";


export const OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE =
  "11.2";

export const OPTIMIZATION_DSS_INPUT_QUALIFICATION_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_INPUT_QUALIFICATION_UPSTREAM_PHASE =
  "11.1";


export const OPTIMIZATION_DSS_INPUT_REASON =
  Object.freeze({
    QUALIFIED:
      "QUALIFIED",

    PARTIALLY_QUALIFIED:
      "PARTIALLY_QUALIFIED",

    EMPTY_EVIDENCE:
      "EMPTY_EVIDENCE",

    INVALID_CONTRACT:
      "INVALID_CONTRACT",

    INVALID_EVIDENCE:
      "INVALID_EVIDENCE",

    OUTSIDE_HORIZON:
      "OUTSIDE_HORIZON",

    SCOPE_MISMATCH:
      "SCOPE_MISMATCH",

    METRIC_MISMATCH:
      "METRIC_MISMATCH",

    UNIT_MISSING:
      "UNIT_MISSING",

    UNIT_MISMATCH:
      "UNIT_MISMATCH",

    CURRENCY_MISSING:
      "CURRENCY_MISSING",

    CURRENCY_MISMATCH:
      "CURRENCY_MISMATCH",

    VALUE_INVALID:
      "VALUE_INVALID",
  });


export const OPTIMIZATION_DSS_INPUT_BOUNDARIES =
  Object.freeze({
    qualificationOnly:
      true,

    solverIncluded:
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

    resamplingAllowed:
      false,

    interpolationAllowed:
      false,

    duplicateMergeAllowed:
      false,
  });


function normalizeTimestamp(
  value
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date
    .toISOString();
}


function insideHorizon(
  timestamp,
  horizon
) {
  const normalized =
    normalizeTimestamp(
      timestamp
    );

  if (
    normalized ===
      null
  ) {
    return false;
  }

  return (
    new Date(
      normalized
    ) >=
      new Date(
        horizon.start
      ) &&
    new Date(
      normalized
    ) <
      new Date(
        horizon.end
      )
  );
}

function expectedMetricContracts(
  contract
) {
  const objectiveContracts =
    contract.objectives
      .filter(
        objective =>
          objective
            ?.sourceMetricName
      )
      .map(
        objective => ({
          metricName:
            objective
              .sourceMetricName,

          unit:
            objective
              .unit,

          currency:
            objective
              .currency,

          evidenceRole:
            "OBJECTIVE",
        })
      );

  const constraintContracts =
    contract.constraints
      .flatMap(
        constraint => {
          if (
            Array.isArray(
              constraint
                ?.evidenceContracts
            ) &&
            constraint
              .evidenceContracts
              .length >
              0
          ) {
            return constraint
              .evidenceContracts
              .map(
                evidenceContract => ({
                  metricName:
                    evidenceContract
                      .metricName,

                  unit:
                    evidenceContract
                      .unit ??
                    null,

                  currency:
                    evidenceContract
                      .currency ??
                    null,

                  evidenceRole:
                    "CONSTRAINT",
                })
              );
          }

          return [];
        }
      );

  const combined = [
    ...objectiveContracts,
    ...constraintContracts,
  ];

  const unique =
    new Map();

  for (
    const metricContract of
    combined
  ) {
    const existing =
      unique.get(
        metricContract.metricName
      );

    if (!existing) {
      unique.set(
        metricContract.metricName,
        metricContract
      );

      continue;
    }

    if (
      existing.unit !==
        metricContract.unit ||
      existing.currency !==
        metricContract.currency
    ) {
      throw new Error(
        "EVIDENCE_METRIC_CONTRACT_CONFLICT"
      );
    }
  }

  return [
    ...unique.values(),
  ];
}

function scopeMatches(
  evidence,
  contract
) {
  if (
    evidence?.scope !==
      contract.scope
  ) {
    return false;
  }

  if (
    contract.scope ===
      OPTIMIZATION_DSS_SCOPE.SITE
  ) {
    return (
      evidence
        ?.scopeIdentity
        ?.vrmSiteId ===
      contract
        .scopeIdentity
        .vrmSiteId
    );
  }

  if (
    contract.scope ===
      OPTIMIZATION_DSS_SCOPE.FLEET
  ) {
    return (
      evidence
        ?.scopeIdentity
        ?.fleetId ===
      contract
        .scopeIdentity
        .fleetId
    );
  }

  return false;
}


function classifyEvidence(
  evidence,
  contract,
  metricContracts
) {
  if (
    !evidence ||
    typeof evidence !==
      "object" ||
    Array.isArray(
      evidence
    )
  ) {
    return {
      valid:
        false,

      reason:
        OPTIMIZATION_DSS_INPUT_REASON.INVALID_EVIDENCE,

      evidence,
    };
  }

  if (
    !scopeMatches(
      evidence,
      contract
    )
  ) {
    return {
      valid:
        false,

      reason:
        OPTIMIZATION_DSS_INPUT_REASON.SCOPE_MISMATCH,

      evidence,
    };
  }

  const metricContract =
    metricContracts.find(
      item =>
        item.metricName ===
        evidence.metricName
    );

  if (
    !metricContract
  ) {
    return {
      valid:
        false,

      reason:
        OPTIMIZATION_DSS_INPUT_REASON.METRIC_MISMATCH,

      evidence,
    };
  }

  const timestamp =
    evidence
      ?.reportingWindow
      ?.start ??
    evidence
      ?.timestamp ??
    null;

  if (
    !insideHorizon(
      timestamp,
      contract.horizon
    )
  ) {
    return {
      valid:
        false,

      reason:
        OPTIMIZATION_DSS_INPUT_REASON.OUTSIDE_HORIZON,

      evidence,
    };
  }

  const value =
    evidence
      ?.payload
      ?.value ??
    evidence
      ?.value;

  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
  ) {
    return {
      valid:
        false,

      reason:
        OPTIMIZATION_DSS_INPUT_REASON.VALUE_INVALID,

      evidence,
    };
  }

  const unit =
    evidence
      ?.payload
      ?.unit ??
    evidence
      ?.unit ??
    null;

  const currency =
    evidence
      ?.payload
      ?.currency ??
    evidence
      ?.currency ??
    null;

  if (
    metricContract.unit !==
      null
  ) {
    if (
      !unit
    ) {
      return {
        valid:
          false,

        reason:
          OPTIMIZATION_DSS_INPUT_REASON.UNIT_MISSING,

        evidence,
      };
    }

    if (
      unit !==
        metricContract.unit
    ) {
      return {
        valid:
          false,

        reason:
          OPTIMIZATION_DSS_INPUT_REASON.UNIT_MISMATCH,

        evidence,
      };
    }
  }

  if (
    metricContract.currency !==
      null
  ) {
    if (
      !currency
    ) {
      return {
        valid:
          false,

        reason:
          OPTIMIZATION_DSS_INPUT_REASON.CURRENCY_MISSING,

        evidence,
      };
    }

    if (
      currency !==
        metricContract.currency
    ) {
      return {
        valid:
          false,

        reason:
          OPTIMIZATION_DSS_INPUT_REASON.CURRENCY_MISMATCH,

        evidence,
      };
    }
  }

  return {
    valid:
      true,

    reason:
      OPTIMIZATION_DSS_INPUT_REASON.QUALIFIED,

    metricName:
      evidence.metricName,

    timestamp:
      normalizeTimestamp(
        timestamp
      ),

    value,

    unit,

    currency,

    evidence,
  };
}


export function qualifyOptimizationDssInputs({
  contract,
  financialBiEvidence,
} = {}) {
  if (
    !contract ||
    contract.phase !==
      OPTIMIZATION_DSS_CONTRACT_PHASE ||
    contract.layer !==
      OPTIMIZATION_DSS_CONTRACT_LAYER
  ) {
    throw new Error(
      OPTIMIZATION_DSS_INPUT_REASON.INVALID_CONTRACT
    );
  }

  if (
    !Array.isArray(
      financialBiEvidence
    )
  ) {
    throw new Error(
      "FINANCIAL_BI_EVIDENCE_ARRAY_REQUIRED"
    );
  }

  const metricContracts =
    expectedMetricContracts(
      contract
    );

  const diagnostics =
    financialBiEvidence.map(
      evidence =>
        classifyEvidence(
          evidence,
          contract,
          metricContracts
        )
    );

  const qualifiedEvidence =
    diagnostics.filter(
      item =>
        item.valid
    );

  const invalidEvidence =
    diagnostics.filter(
      item =>
        !item.valid
    );

  let status =
    OPTIMIZATION_DSS_EVIDENCE_STATUS.UNAVAILABLE;

  let reason =
    OPTIMIZATION_DSS_INPUT_REASON.EMPTY_EVIDENCE;

  if (
    financialBiEvidence.length >
      0 &&
    qualifiedEvidence.length ===
      financialBiEvidence.length
  ) {
    status =
      OPTIMIZATION_DSS_EVIDENCE_STATUS.QUALIFIED;

    reason =
      OPTIMIZATION_DSS_INPUT_REASON.QUALIFIED;
  } else if (
    qualifiedEvidence.length >
      0
  ) {
    status =
      OPTIMIZATION_DSS_EVIDENCE_STATUS.PARTIALLY_QUALIFIED;

    reason =
      OPTIMIZATION_DSS_INPUT_REASON.PARTIALLY_QUALIFIED;
  } else if (
    financialBiEvidence.length >
      0
  ) {
    status =
      OPTIMIZATION_DSS_EVIDENCE_STATUS.UNAVAILABLE;

    reason =
      OPTIMIZATION_DSS_INPUT_REASON.INVALID_EVIDENCE;
  }

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE,

    layer:
      OPTIMIZATION_DSS_INPUT_QUALIFICATION_LAYER,

    upstreamPhase:
      OPTIMIZATION_DSS_INPUT_QUALIFICATION_UPSTREAM_PHASE,

    contract,

    horizon:
      contract.horizon,

    scope:
      contract.scope,

    scopeIdentity:
      contract.scopeIdentity,

    sourceEvidence:
      financialBiEvidence,

    totalEvidenceCount:
      financialBiEvidence.length,

    qualifiedEvidenceCount:
      qualifiedEvidence.length,

    invalidEvidenceCount:
      invalidEvidence.length,

    status,

    reason,

    qualifiedEvidence:
      Object.freeze([
        ...qualifiedEvidence,
      ]),

    invalidEvidence:
      Object.freeze([
        ...invalidEvidence,
      ]),

    optimizationExecuted:
      false,

    recommendation:
      null,

    boundaries:
      OPTIMIZATION_DSS_INPUT_BOUNDARIES,
  });
}
