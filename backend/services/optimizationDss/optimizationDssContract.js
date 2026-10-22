// services/optimizationDss/optimizationDssContract.js

export const OPTIMIZATION_DSS_CONTRACT_PHASE = "11.1";
export const OPTIMIZATION_DSS_CONTRACT_LAYER = "OPTIMIZATION_DSS";
export const OPTIMIZATION_DSS_CONTRACT_UPSTREAM_LAYER = "FINANCIAL_BI";
export const OPTIMIZATION_DSS_CONTRACT_DOWNSTREAM_LAYER = null;

export const OPTIMIZATION_DSS_OBJECTIVE_KIND = Object.freeze({
  MINIMIZE_COST: "MINIMIZE_COST",
  MINIMIZE_GRID_IMPORT: "MINIMIZE_GRID_IMPORT",
  MINIMIZE_GENERATOR_ENERGY: "MINIMIZE_GENERATOR_ENERGY",
  MINIMIZE_EMISSIONS: "MINIMIZE_EMISSIONS",
  MAXIMIZE_RENEWABLE_UTILIZATION: "MAXIMIZE_RENEWABLE_UTILIZATION",
  MAXIMIZE_SAVINGS: "MAXIMIZE_SAVINGS",
});

export const OPTIMIZATION_DSS_DECISION_VARIABLE_KIND = Object.freeze({
  GRID_POWER: "GRID_POWER",

  BATTERY_CHARGE_POWER:
    "BATTERY_CHARGE_POWER",

  BATTERY_DISCHARGE_POWER:
    "BATTERY_DISCHARGE_POWER",

  BATTERY_SOC:
    "BATTERY_SOC",

  GENERATOR_POWER:
    "GENERATOR_POWER",

  LOAD_SHED_POWER:
    "LOAD_SHED_POWER",
});

export const OPTIMIZATION_DSS_CONSTRAINT_KIND = Object.freeze({
  POWER_BALANCE: "POWER_BALANCE",
  GRID_LIMIT: "GRID_LIMIT",
  BATTERY_POWER_LIMIT: "BATTERY_POWER_LIMIT",
  BATTERY_SOC_LIMIT: "BATTERY_SOC_LIMIT",
  GENERATOR_LIMIT: "GENERATOR_LIMIT",
  LOAD_SHED_LIMIT: "LOAD_SHED_LIMIT",
});

export const OPTIMIZATION_DSS_EVIDENCE_STATUS = Object.freeze({
  QUALIFIED: "QUALIFIED",
  PARTIALLY_QUALIFIED: "PARTIALLY_QUALIFIED",
  UNAVAILABLE: "UNAVAILABLE",
});

export const OPTIMIZATION_DSS_RECOMMENDATION_STATUS = Object.freeze({
  CONTRACT_DEFINED: "CONTRACT_DEFINED",
  NOT_EVALUATED: "NOT_EVALUATED",
  RECOMMENDABLE: "RECOMMENDABLE",
  PARTIALLY_RECOMMENDABLE: "PARTIALLY_RECOMMENDABLE",
  UNAVAILABLE: "UNAVAILABLE",
});

export const OPTIMIZATION_DSS_SCOPE = Object.freeze({
  SITE: "SITE",
  FLEET: "FLEET",
});

export const OPTIMIZATION_DSS_TIME_SEMANTICS = "[start,end)";

export const OPTIMIZATION_DSS_CONTRACT_BOUNDARIES = Object.freeze({
  contractOnly: true,
  optimizationExecuted: false,
  solverIncluded: false,
  persistenceIncluded: false,
  apiIncluded: false,
  dashboardIncluded: false,
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
  futureObservedDataFabricationAllowed: false,
});

function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field}_REQUIRED`);
  }
  return value.trim();
}

function requireControlled(value, container, field) {
  if (!Object.values(container).includes(value)) {
    throw new Error(`${field}_INVALID`);
  }
  return value;
}

function normalizeTimestamp(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field}_INVALID`);
  }
  return date.toISOString();
}

export function buildOptimizationDssHorizon({
  start,
  end,
  timezone,
} = {}) {
  const normalizedStart = normalizeTimestamp(start, "HORIZON_START");
  const normalizedEnd = normalizeTimestamp(end, "HORIZON_END");

  if (new Date(normalizedEnd) <= new Date(normalizedStart)) {
    throw new Error("HORIZON_RANGE_INVALID");
  }

  return Object.freeze({
    start: normalizedStart,
    end: normalizedEnd,
    timezone: requireNonEmptyString(timezone, "HORIZON_TIMEZONE"),
    semantics: OPTIMIZATION_DSS_TIME_SEMANTICS,
  });
}

export function buildOptimizationDssObjective({
  name,
  kind,
  unit = null,
  currency = null,
  weight = 1,
  sourceMetricName = null,
} = {}) {
  requireControlled(kind, OPTIMIZATION_DSS_OBJECTIVE_KIND, "OBJECTIVE_KIND");

  if (
    typeof weight !== "number" ||
    !Number.isFinite(weight) ||
    weight <= 0
  ) {
    throw new Error("OBJECTIVE_WEIGHT_INVALID");
  }

  const isCostLike =
    kind === OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_COST ||
    kind === OPTIMIZATION_DSS_OBJECTIVE_KIND.MAXIMIZE_SAVINGS;

  if (isCostLike && !currency) {
    throw new Error("OBJECTIVE_CURRENCY_REQUIRED");
  }

  if (!isCostLike && !unit) {
    throw new Error("OBJECTIVE_UNIT_REQUIRED");
  }

  return Object.freeze({
    name: requireNonEmptyString(name, "OBJECTIVE_NAME"),
    kind,
    unit: unit === null ? null : requireNonEmptyString(unit, "OBJECTIVE_UNIT"),
    currency:
      currency === null
        ? null
        : requireNonEmptyString(currency, "OBJECTIVE_CURRENCY"),
    weight,
    sourceMetricName:
      sourceMetricName === null
        ? null
        : requireNonEmptyString(
          sourceMetricName,
          "OBJECTIVE_SOURCE_METRIC"
        ),
    evaluated: false,
    value: null,
  });
}

export function buildOptimizationDssDecisionVariable({
  name,
  kind,
  unit,
  lowerBound,
  upperBound,
} = {}) {
  requireControlled(
    kind,
    OPTIMIZATION_DSS_DECISION_VARIABLE_KIND,
    "DECISION_VARIABLE_KIND"
  );

  if (
    typeof lowerBound !== "number" ||
    !Number.isFinite(lowerBound)
  ) {
    throw new Error("DECISION_VARIABLE_LOWER_BOUND_INVALID");
  }

  if (
    typeof upperBound !== "number" ||
    !Number.isFinite(upperBound)
  ) {
    throw new Error("DECISION_VARIABLE_UPPER_BOUND_INVALID");
  }

  if (upperBound < lowerBound) {
    throw new Error("DECISION_VARIABLE_RANGE_INVALID");
  }

  return Object.freeze({
    name: requireNonEmptyString(name, "DECISION_VARIABLE_NAME"),
    kind,
    unit: requireNonEmptyString(unit, "DECISION_VARIABLE_UNIT"),
    lowerBound,
    upperBound,
    optimized: false,
    value: null,
  });
}

export function buildOptimizationDssConstraint({
  name,
  kind,
  required = true,
  parameters = {},
  sourceMetricNames = [],
  evidenceContracts = [],
} = {}) {
  requireControlled(
    kind,
    OPTIMIZATION_DSS_CONSTRAINT_KIND,
    "CONSTRAINT_KIND"
  );

  if (
    !parameters ||
    typeof parameters !== "object" ||
    Array.isArray(parameters)
  ) {
    throw new Error(
      "CONSTRAINT_PARAMETERS_INVALID"
    );
  }

  if (
    !Array.isArray(sourceMetricNames)
  ) {
    throw new Error(
      "CONSTRAINT_SOURCE_METRICS_INVALID"
    );
  }

  if (
    !Array.isArray(evidenceContracts)
  ) {
    throw new Error(
      "CONSTRAINT_EVIDENCE_CONTRACTS_INVALID"
    );
  }

  const normalizedSourceMetricNames =
    sourceMetricNames.map(
      metricName =>
        requireNonEmptyString(
          metricName,
          "CONSTRAINT_SOURCE_METRIC"
        )
    );

  if (
    new Set(
      normalizedSourceMetricNames
    ).size !==
    normalizedSourceMetricNames.length
  ) {
    throw new Error(
      "CONSTRAINT_SOURCE_METRIC_DUPLICATE"
    );
  }

  const normalizedEvidenceContracts =
    evidenceContracts.map(
      (
        evidenceContract,
        index
      ) => {
        if (
          !evidenceContract ||
          typeof evidenceContract !== "object" ||
          Array.isArray(evidenceContract)
        ) {
          throw new Error(
            "CONSTRAINT_EVIDENCE_CONTRACT_INVALID"
          );
        }

        const metricName =
          requireNonEmptyString(
            evidenceContract.metricName,
            `CONSTRAINT_EVIDENCE_METRIC_${index}`
          );

        const unit =
          evidenceContract.unit === null ||
            evidenceContract.unit === undefined
            ? null
            : requireNonEmptyString(
              evidenceContract.unit,
              `CONSTRAINT_EVIDENCE_UNIT_${index}`
            );

        const currency =
          evidenceContract.currency === null ||
            evidenceContract.currency === undefined
            ? null
            : requireNonEmptyString(
              evidenceContract.currency,
              `CONSTRAINT_EVIDENCE_CURRENCY_${index}`
            );

        return Object.freeze({
          metricName,
          unit,
          currency,
        });
      }
    );

  const evidenceMetricNames =
    normalizedEvidenceContracts.map(
      item =>
        item.metricName
    );

  if (
    new Set(
      evidenceMetricNames
    ).size !==
    evidenceMetricNames.length
  ) {
    throw new Error(
      "CONSTRAINT_EVIDENCE_METRIC_DUPLICATE"
    );
  }

  return Object.freeze({
    name:
      requireNonEmptyString(
        name,
        "CONSTRAINT_NAME"
      ),

    kind,

    required:
      Boolean(required),

    parameters:
      Object.freeze({
        ...parameters,
      }),

    sourceMetricNames:
      Object.freeze([
        ...normalizedSourceMetricNames,
      ]),

    evidenceContracts:
      Object.freeze([
        ...normalizedEvidenceContracts,
      ]),

    evaluated:
      false,

    satisfied:
      null,
  });
}

export function createOptimizationDssContract({
  horizon,
  scope,
  scopeIdentity,
  objectives,
  decisionVariables,
  constraints,
  financialBiEvidence,
} = {}) {
  requireControlled(scope, OPTIMIZATION_DSS_SCOPE, "OPTIMIZATION_SCOPE");

  if (!horizon || horizon.semantics !== OPTIMIZATION_DSS_TIME_SEMANTICS) {
    throw new Error("OPTIMIZATION_HORIZON_INVALID");
  }

  if (
    scope === OPTIMIZATION_DSS_SCOPE.SITE &&
    !scopeIdentity?.vrmSiteId
  ) {
    throw new Error("VRM_SITE_ID_REQUIRED");
  }

  if (
    scope === OPTIMIZATION_DSS_SCOPE.FLEET &&
    !scopeIdentity?.fleetId
  ) {
    throw new Error("FLEET_ID_REQUIRED");
  }

  if (!Array.isArray(objectives) || objectives.length === 0) {
    throw new Error("OPTIMIZATION_OBJECTIVES_REQUIRED");
  }

  if (!Array.isArray(decisionVariables) || decisionVariables.length === 0) {
    throw new Error("OPTIMIZATION_DECISION_VARIABLES_REQUIRED");
  }

  if (!Array.isArray(constraints) || constraints.length === 0) {
    throw new Error("OPTIMIZATION_CONSTRAINTS_REQUIRED");
  }

  if (!Array.isArray(financialBiEvidence)) {
    throw new Error("FINANCIAL_BI_EVIDENCE_REQUIRED");
  }

  const objectiveNames = objectives.map((objective) => objective?.name);
  if (new Set(objectiveNames).size !== objectiveNames.length) {
    throw new Error("DUPLICATE_OBJECTIVE_NAME");
  }

  const variableNames = decisionVariables.map((variable) => variable?.name);
  if (new Set(variableNames).size !== variableNames.length) {
    throw new Error("DUPLICATE_DECISION_VARIABLE_NAME");
  }

  const constraintNames = constraints.map((constraint) => constraint?.name);
  if (new Set(constraintNames).size !== constraintNames.length) {
    throw new Error("DUPLICATE_CONSTRAINT_NAME");
  }

  return Object.freeze({
    phase: OPTIMIZATION_DSS_CONTRACT_PHASE,
    layer: OPTIMIZATION_DSS_CONTRACT_LAYER,
    architecture: Object.freeze({
      upstream: OPTIMIZATION_DSS_CONTRACT_UPSTREAM_LAYER,
      current: OPTIMIZATION_DSS_CONTRACT_LAYER,
      downstream: OPTIMIZATION_DSS_CONTRACT_DOWNSTREAM_LAYER,
    }),
    horizon,
    scope,
    scopeIdentity: Object.freeze({
      vrmSiteId: scopeIdentity?.vrmSiteId ?? null,
      fleetId: scopeIdentity?.fleetId ?? null,
    }),
    objectives: Object.freeze([...objectives]),
    decisionVariables: Object.freeze([...decisionVariables]),
    constraints: Object.freeze([...constraints]),
    financialBiEvidence: Object.freeze([...financialBiEvidence]),
    evidenceStatus: OPTIMIZATION_DSS_EVIDENCE_STATUS.UNAVAILABLE,
    recommendationStatus:
      OPTIMIZATION_DSS_RECOMMENDATION_STATUS.CONTRACT_DEFINED,
    evaluated: false,
    recommendation: null,
    boundaries: OPTIMIZATION_DSS_CONTRACT_BOUNDARIES,
  });
}
