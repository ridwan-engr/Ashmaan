// services/optimizationDss/optimizationDssModelContract.js

import {
  OPTIMIZATION_DSS_CONTRACT_PHASE,
  OPTIMIZATION_DSS_CONTRACT_LAYER,
  OPTIMIZATION_DSS_OBJECTIVE_KIND,
  OPTIMIZATION_DSS_DECISION_VARIABLE_KIND,
  OPTIMIZATION_DSS_CONSTRAINT_KIND,
} from "./optimizationDssContract.js";

import {
  OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE,
} from "./optimizationDssInputQualificationService.js";


export const OPTIMIZATION_DSS_MODEL_CONTRACT_PHASE =
  "11.3";

export const OPTIMIZATION_DSS_MODEL_CONTRACT_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_MODEL_CONTRACT_UPSTREAM_PHASE =
  "11.2";


export const OPTIMIZATION_DSS_MODEL_STATUS =
  Object.freeze({
    CONTRACT_DEFINED:
      "CONTRACT_DEFINED",

    NOT_BUILT:
      "NOT_BUILT",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_TIME_INDEX_KIND =
  Object.freeze({
    EXPLICIT_TIMESTAMPS:
      "EXPLICIT_TIMESTAMPS",
  });


export const OPTIMIZATION_DSS_OBJECTIVE_SENSE =
  Object.freeze({
    MINIMIZE:
      "MINIMIZE",

    MAXIMIZE:
      "MAXIMIZE",
  });


export const OPTIMIZATION_DSS_MODEL_BOUNDARIES =
  Object.freeze({
    contractOnly:
      true,

    solverIndependent:
      true,

    modelBuilt:
      false,

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


function normalizeTimestamp(
  value,
  field
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
    throw new Error(
      `${field}_INVALID`
    );
  }

  return date.toISOString();
}


export function buildOptimizationTimeIndex({
  timestamps,
} = {}) {
  if (
    !Array.isArray(
      timestamps
    ) ||
    timestamps.length ===
      0
  ) {
    throw new Error(
      "TIME_INDEX_TIMESTAMPS_REQUIRED"
    );
  }

  const normalized =
    timestamps.map(
      timestamp =>
        normalizeTimestamp(
          timestamp,
          "TIME_INDEX_TIMESTAMP"
        )
    );

  const unique =
    new Set(
      normalized
    );

  if (
    unique.size !==
      normalized.length
  ) {
    throw new Error(
      "TIME_INDEX_DUPLICATE_TIMESTAMP"
    );
  }

  for (
    let index =
      1;
    index <
      normalized.length;
    index +=
      1
  ) {
    if (
      new Date(
        normalized[index]
      ) <=
      new Date(
        normalized[index - 1]
      )
    ) {
      throw new Error(
        "TIME_INDEX_NOT_STRICTLY_ASCENDING"
      );
    }
  }

  return Object.freeze({
    kind:
      OPTIMIZATION_DSS_TIME_INDEX_KIND.EXPLICIT_TIMESTAMPS,

    timestamps:
      Object.freeze([
        ...normalized,
      ]),

    count:
      normalized.length,

    inferred:
      false,
  });
}


export function buildOptimizationObjectiveTerm({
  name,
  objectiveKind,
  sense,
  coefficient,
  unit = null,
  currency = null,
  variableName = null,
  evidenceMetricName = null,
} = {}) {
  if (
    !Object.values(
      OPTIMIZATION_DSS_OBJECTIVE_KIND
    ).includes(
      objectiveKind
    )
  ) {
    throw new Error(
      "OBJECTIVE_TERM_KIND_INVALID"
    );
  }

  if (
    !Object.values(
      OPTIMIZATION_DSS_OBJECTIVE_SENSE
    ).includes(
      sense
    )
  ) {
    throw new Error(
      "OBJECTIVE_TERM_SENSE_INVALID"
    );
  }

  requireFiniteNumber(
    coefficient,
    "OBJECTIVE_TERM_COEFFICIENT"
  );

  if (
    variableName ===
      null &&
    evidenceMetricName ===
      null
  ) {
    throw new Error(
      "OBJECTIVE_TERM_BINDING_REQUIRED"
    );
  }

  return Object.freeze({
    name:
      requireNonEmptyString(
        name,
        "OBJECTIVE_TERM_NAME"
      ),

    objectiveKind,

    sense,

    coefficient,

    unit:
      unit ===
        null
        ? null
        : requireNonEmptyString(
            unit,
            "OBJECTIVE_TERM_UNIT"
          ),

    currency:
      currency ===
        null
        ? null
        : requireNonEmptyString(
            currency,
            "OBJECTIVE_TERM_CURRENCY"
          ),

    variableName:
      variableName ===
        null
        ? null
        : requireNonEmptyString(
            variableName,
            "OBJECTIVE_TERM_VARIABLE"
          ),

    evidenceMetricName:
      evidenceMetricName ===
        null
        ? null
        : requireNonEmptyString(
            evidenceMetricName,
            "OBJECTIVE_TERM_EVIDENCE_METRIC"
          ),

    evaluated:
      false,

    value:
      null,
  });
}


export function buildOptimizationVariableBinding({
  name,
  variableKind,
  unit,
  lowerBound,
  upperBound,
  timeIndexed = true,
} = {}) {
  if (
    !Object.values(
      OPTIMIZATION_DSS_DECISION_VARIABLE_KIND
    ).includes(
      variableKind
    )
  ) {
    throw new Error(
      "VARIABLE_BINDING_KIND_INVALID"
    );
  }

  requireFiniteNumber(
    lowerBound,
    "VARIABLE_BINDING_LOWER_BOUND"
  );

  requireFiniteNumber(
    upperBound,
    "VARIABLE_BINDING_UPPER_BOUND"
  );

  if (
    upperBound <
      lowerBound
  ) {
    throw new Error(
      "VARIABLE_BINDING_RANGE_INVALID"
    );
  }

  return Object.freeze({
    name:
      requireNonEmptyString(
        name,
        "VARIABLE_BINDING_NAME"
      ),

    variableKind,

    unit:
      requireNonEmptyString(
        unit,
        "VARIABLE_BINDING_UNIT"
      ),

    lowerBound,

    upperBound,

    timeIndexed:
      Boolean(
        timeIndexed
      ),

    values:
      null,

    optimized:
      false,
  });
}


export function buildOptimizationConstraintBinding({
  name,
  constraintKind,
  variableNames,
  evidenceMetricNames = [],
  parameters = {},
  required = true,
} = {}) {
  if (
    !Object.values(
      OPTIMIZATION_DSS_CONSTRAINT_KIND
    ).includes(
      constraintKind
    )
  ) {
    throw new Error(
      "CONSTRAINT_BINDING_KIND_INVALID"
    );
  }

  if (
    !Array.isArray(
      variableNames
    ) ||
    variableNames.length ===
      0
  ) {
    throw new Error(
      "CONSTRAINT_BINDING_VARIABLES_REQUIRED"
    );
  }

  if (
    !Array.isArray(
      evidenceMetricNames
    )
  ) {
    throw new Error(
      "CONSTRAINT_BINDING_EVIDENCE_ARRAY_REQUIRED"
    );
  }

  if (
    !parameters ||
    typeof parameters !==
      "object" ||
    Array.isArray(
      parameters
    )
  ) {
    throw new Error(
      "CONSTRAINT_BINDING_PARAMETERS_INVALID"
    );
  }

  return Object.freeze({
    name:
      requireNonEmptyString(
        name,
        "CONSTRAINT_BINDING_NAME"
      ),

    constraintKind,

    variableNames:
      Object.freeze([
        ...variableNames,
      ]),

    evidenceMetricNames:
      Object.freeze([
        ...evidenceMetricNames,
      ]),

    parameters:
      Object.freeze({
        ...parameters,
      }),

    required:
      Boolean(
        required
      ),

    evaluated:
      false,

    satisfied:
      null,
  });
}


export function createOptimizationDssModelContract({
  optimizationContract,
  qualifiedInputs,
  timeIndex,
  variableBindings,
  objectiveTerms,
  constraintBindings,
} = {}) {
  if (
    !optimizationContract ||
    optimizationContract.phase !==
      OPTIMIZATION_DSS_CONTRACT_PHASE ||
    optimizationContract.layer !==
      OPTIMIZATION_DSS_CONTRACT_LAYER
  ) {
    throw new Error(
      "OPTIMIZATION_CONTRACT_INVALID"
    );
  }

  if (
    !qualifiedInputs ||
    qualifiedInputs.phase !==
      OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE ||
    qualifiedInputs.contract !==
      optimizationContract
  ) {
    throw new Error(
      "QUALIFIED_INPUTS_INVALID"
    );
  }

  if (
    !timeIndex ||
    timeIndex.kind !==
      OPTIMIZATION_DSS_TIME_INDEX_KIND.EXPLICIT_TIMESTAMPS
  ) {
    throw new Error(
      "TIME_INDEX_INVALID"
    );
  }

  if (
    !Array.isArray(
      variableBindings
    ) ||
    variableBindings.length ===
      0
  ) {
    throw new Error(
      "VARIABLE_BINDINGS_REQUIRED"
    );
  }

  if (
    !Array.isArray(
      objectiveTerms
    ) ||
    objectiveTerms.length ===
      0
  ) {
    throw new Error(
      "OBJECTIVE_TERMS_REQUIRED"
    );
  }

  if (
    !Array.isArray(
      constraintBindings
    ) ||
    constraintBindings.length ===
      0
  ) {
    throw new Error(
      "CONSTRAINT_BINDINGS_REQUIRED"
    );
  }

  const variableNames =
    variableBindings.map(
      item =>
        item?.name
    );

  if (
    new Set(
      variableNames
    ).size !==
      variableNames.length
  ) {
    throw new Error(
      "DUPLICATE_VARIABLE_BINDING_NAME"
    );
  }

  const objectiveNames =
    objectiveTerms.map(
      item =>
        item?.name
    );

  if (
    new Set(
      objectiveNames
    ).size !==
      objectiveNames.length
  ) {
    throw new Error(
      "DUPLICATE_OBJECTIVE_TERM_NAME"
    );
  }

  const constraintNames =
    constraintBindings.map(
      item =>
        item?.name
    );

  if (
    new Set(
      constraintNames
    ).size !==
      constraintNames.length
  ) {
    throw new Error(
      "DUPLICATE_CONSTRAINT_BINDING_NAME"
    );
  }

  const variableNameSet =
    new Set(
      variableNames
    );

  for (
    const term of
    objectiveTerms
  ) {
    if (
      term.variableName !==
        null &&
      !variableNameSet.has(
        term.variableName
      )
    ) {
      throw new Error(
        "OBJECTIVE_TERM_VARIABLE_NOT_BOUND"
      );
    }
  }

  for (
    const constraint of
    constraintBindings
  ) {
    for (
      const variableName of
      constraint.variableNames
    ) {
      if (
        !variableNameSet.has(
          variableName
        )
      ) {
        throw new Error(
          "CONSTRAINT_VARIABLE_NOT_BOUND"
        );
      }
    }
  }

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_MODEL_CONTRACT_PHASE,

    layer:
      OPTIMIZATION_DSS_MODEL_CONTRACT_LAYER,

    upstreamPhase:
      OPTIMIZATION_DSS_MODEL_CONTRACT_UPSTREAM_PHASE,

    optimizationContract,

    qualifiedInputs,

    horizon:
      optimizationContract.horizon,

    scope:
      optimizationContract.scope,

    scopeIdentity:
      optimizationContract.scopeIdentity,

    timeIndex,

    variableBindings:
      Object.freeze([
        ...variableBindings,
      ]),

    objectiveTerms:
      Object.freeze([
        ...objectiveTerms,
      ]),

    constraintBindings:
      Object.freeze([
        ...constraintBindings,
      ]),

    status:
      OPTIMIZATION_DSS_MODEL_STATUS.CONTRACT_DEFINED,

    modelBuilt:
      false,

    feasibilityEvaluated:
      false,

    feasible:
      null,

    objectiveValue:
      null,

    solver:
      null,

    recommendation:
      null,

    boundaries:
      OPTIMIZATION_DSS_MODEL_BOUNDARIES,
  });
}
