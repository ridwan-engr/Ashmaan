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

export const OPTIMIZATION_DSS_CONSTRAINT_OPERATOR =
  Object.freeze({
    EQUAL:
      "EQUAL",

    LESS_THAN_OR_EQUAL:
      "LESS_THAN_OR_EQUAL",

    GREATER_THAN_OR_EQUAL:
      "GREATER_THAN_OR_EQUAL",
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
  timestamps = null,
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

  const normalizedTimeIndexed =
    Boolean(
      timeIndexed
    );

  let normalizedTimestamps =
    null;

  if (
    timestamps !==
    null
  ) {
    if (
      !normalizedTimeIndexed
    ) {
      throw new Error(
        "VARIABLE_BINDING_TIMESTAMPS_REQUIRE_TIME_INDEX"
      );
    }

    if (
      !Array.isArray(
        timestamps
      ) ||
      timestamps.length ===
      0
    ) {
      throw new Error(
        "VARIABLE_BINDING_TIMESTAMPS_INVALID"
      );
    }

    normalizedTimestamps =
      timestamps.map(
        timestamp =>
          normalizeTimestamp(
            timestamp,
            "VARIABLE_BINDING_TIMESTAMP"
          )
      );

    if (
      new Set(
        normalizedTimestamps
      ).size !==
      normalizedTimestamps.length
    ) {
      throw new Error(
        "VARIABLE_BINDING_TIMESTAMP_DUPLICATE"
      );
    }

    for (
      let index = 1;
      index <
      normalizedTimestamps.length;
      index += 1
    ) {
      if (
        new Date(
          normalizedTimestamps[
          index
          ]
        ) <=
        new Date(
          normalizedTimestamps[
          index - 1
          ]
        )
      ) {
        throw new Error(
          "VARIABLE_BINDING_TIMESTAMPS_NOT_STRICTLY_ASCENDING"
        );
      }
    }
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
      normalizedTimeIndexed,

    timestamps:
      normalizedTimestamps ===
        null
        ? null
        : Object.freeze([
          ...normalizedTimestamps,
        ]),

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
  coefficients = null,
  variableTerms = null,
  operator = null,
  rightHandSide = null,
  rightHandSideEvidenceMetricName = null,
  timestamps = null,
} = {}) {

  /*
  |--------------------------------------------------------------------------
  | Constraint identity
  |--------------------------------------------------------------------------
  */

  const normalizedName =
    requireNonEmptyString(
      name,
      "CONSTRAINT_BINDING_NAME"
    );


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


  /*
  |--------------------------------------------------------------------------
  | Declared variables
  |--------------------------------------------------------------------------
  */

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


  const normalizedVariableNames =
    variableNames.map(
      variableName =>
        requireNonEmptyString(
          variableName,
          "CONSTRAINT_BINDING_VARIABLE"
        )
    );


  if (
    new Set(
      normalizedVariableNames
    ).size !==
      normalizedVariableNames.length
  ) {
    throw new Error(
      "CONSTRAINT_BINDING_VARIABLE_DUPLICATE"
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Evidence metrics
  |--------------------------------------------------------------------------
  */

  if (
    !Array.isArray(
      evidenceMetricNames
    )
  ) {
    throw new Error(
      "CONSTRAINT_BINDING_EVIDENCE_ARRAY_REQUIRED"
    );
  }


  const normalizedEvidenceMetricNames =
    evidenceMetricNames.map(
      metricName =>
        requireNonEmptyString(
          metricName,
          "CONSTRAINT_BINDING_EVIDENCE_METRIC"
        )
    );


  if (
    new Set(
      normalizedEvidenceMetricNames
    ).size !==
      normalizedEvidenceMetricNames.length
  ) {
    throw new Error(
      "CONSTRAINT_BINDING_EVIDENCE_DUPLICATE"
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Parameters
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | Constraint-specific timestamps
  |--------------------------------------------------------------------------
  |
  | A constraint may optionally apply to only a subset of the model time
  | index.
  |
  | Example:
  |
  |   batteryInitialSoc -> first dispatch timestamp only
  |
  | This is intentionally independent of variableTerms so timestamp scope
  | is available to both legacy coefficient constraints and cross-time
  | constraints.
  |
  */

  let normalizedTimestamps =
    null;


  if (
    timestamps !==
      null
  ) {
    if (
      !Array.isArray(
        timestamps
      ) ||
      timestamps.length ===
        0
    ) {
      throw new Error(
        "CONSTRAINT_BINDING_TIMESTAMPS_INVALID"
      );
    }


    normalizedTimestamps =
      timestamps.map(
        timestamp =>
          normalizeTimestamp(
            timestamp,
            "CONSTRAINT_BINDING_TIMESTAMP"
          )
      );


    if (
      new Set(
        normalizedTimestamps
      ).size !==
        normalizedTimestamps.length
    ) {
      throw new Error(
        "CONSTRAINT_BINDING_TIMESTAMP_DUPLICATE"
      );
    }


    for (
      let index = 1;
      index <
        normalizedTimestamps.length;
      index += 1
    ) {
      if (
        new Date(
          normalizedTimestamps[
            index
          ]
        ).getTime() <=
        new Date(
          normalizedTimestamps[
            index - 1
          ]
        ).getTime()
      ) {
        throw new Error(
          "CONSTRAINT_BINDING_TIMESTAMPS_NOT_STRICTLY_ASCENDING"
        );
      }
    }
  }


  /*
  |--------------------------------------------------------------------------
  | Cross-time variable terms
  |--------------------------------------------------------------------------
  |
  | variableTerms is the algebraic representation required for constraints
  | such as:
  |
  |   SOC[t+1]
  |   - SOC[t]
  |   - chargeFactor * Pcharge[t]
  |   + dischargeFactor * Pdischarge[t]
  |   = 0
  |
  */

  let normalizedVariableTerms =
    null;


  if (
    variableTerms !==
      null
  ) {
    if (
      !Array.isArray(
        variableTerms
      ) ||
      variableTerms.length ===
        0
    ) {
      throw new Error(
        "CONSTRAINT_BINDING_VARIABLE_TERMS_INVALID"
      );
    }


    normalizedVariableTerms =
      variableTerms.map(
        (
          term,
          index
        ) => {

          if (
            !term ||
            typeof term !==
              "object" ||
            Array.isArray(
              term
            )
          ) {
            throw new Error(
              "CONSTRAINT_BINDING_VARIABLE_TERM_INVALID"
            );
          }


          const variableName =
            requireNonEmptyString(
              term.variableName,
              `CONSTRAINT_BINDING_VARIABLE_TERM_${index}`
            );


          if (
            !normalizedVariableNames.includes(
              variableName
            )
          ) {
            throw new Error(
              "CONSTRAINT_BINDING_VARIABLE_TERM_NOT_DECLARED"
            );
          }


          const timeOffset =
            term.timeOffset ??
            0;


          if (
            !Number.isInteger(
              timeOffset
            )
          ) {
            throw new Error(
              "CONSTRAINT_BINDING_VARIABLE_TERM_TIME_OFFSET_INVALID"
            );
          }


          const coefficient =
            requireFiniteNumber(
              term.coefficient,
              "CONSTRAINT_BINDING_VARIABLE_TERM_COEFFICIENT"
            );


          return Object.freeze({
            variableName,
            timeOffset,
            coefficient,
          });
        }
      );
  }


  /*
  |--------------------------------------------------------------------------
  | Algebraic representation
  |--------------------------------------------------------------------------
  |
  | Two variable-expression modes are supported:
  |
  | 1. Legacy same-time mode
  |
  |    coefficients[i] * variableNames[i]
  |
  | 2. Cross-time mode
  |
  |    variableTerms:
  |      {
  |        variableName,
  |        timeOffset,
  |        coefficient
  |      }
  |
  | Exactly one mode must be supplied for an algebraic constraint.
  |
  | RHS must also use exactly one source:
  |
  |   - explicit finite rightHandSide
  |   - rightHandSideEvidenceMetricName
  |
  */

  const algebraicRequested =
    coefficients !==
      null ||
    variableTerms !==
      null ||
    operator !==
      null ||
    rightHandSide !==
      null ||
    rightHandSideEvidenceMetricName !==
      null;


  let normalizedCoefficients =
    null;

  let normalizedOperator =
    null;

  let normalizedRightHandSide =
    null;

  let normalizedRightHandSideEvidenceMetricName =
    null;


  if (
    algebraicRequested
  ) {

    /*
     * Determine which variable-expression mode
     * has been requested.
     */

    const usesVariableTerms =
      normalizedVariableTerms !==
      null;

    const usesLegacyCoefficients =
      coefficients !==
      null;


    /*
     * Exactly one representation must be used.
     *
     * true / true  -> invalid
     * false / false -> invalid
     * true / false -> valid
     * false / true -> valid
     */

    if (
      usesVariableTerms ===
        usesLegacyCoefficients
    ) {
      throw new Error(
        "CONSTRAINT_BINDING_ALGEBRAIC_VARIABLE_MODE_INVALID"
      );
    }


    /*
     * Legacy coefficient representation.
     */

    if (
      usesLegacyCoefficients
    ) {
      if (
        !Array.isArray(
          coefficients
        ) ||
        coefficients.length !==
          normalizedVariableNames.length
      ) {
        throw new Error(
          "CONSTRAINT_BINDING_COEFFICIENTS_INVALID"
        );
      }


      normalizedCoefficients =
        coefficients.map(
          coefficient =>
            requireFiniteNumber(
              coefficient,
              "CONSTRAINT_BINDING_COEFFICIENT"
            )
        );
    }


    /*
     * Operator is mandatory for every
     * algebraic constraint.
     */

    if (
      !Object.values(
        OPTIMIZATION_DSS_CONSTRAINT_OPERATOR
      ).includes(
        operator
      )
    ) {
      throw new Error(
        "CONSTRAINT_BINDING_OPERATOR_INVALID"
      );
    }


    normalizedOperator =
      operator;


    /*
     * RHS mode.
     */

    const hasExplicitRightHandSide =
      rightHandSide !==
      null;

    const hasEvidenceRightHandSide =
      rightHandSideEvidenceMetricName !==
      null;


    /*
     * Exactly one RHS source must exist.
     */

    if (
      hasExplicitRightHandSide ===
        hasEvidenceRightHandSide
    ) {
      throw new Error(
        "CONSTRAINT_BINDING_RHS_MODE_INVALID"
      );
    }


    /*
     * Explicit numerical RHS.
     */

    if (
      hasExplicitRightHandSide
    ) {
      normalizedRightHandSide =
        requireFiniteNumber(
          rightHandSide,
          "CONSTRAINT_BINDING_RHS"
        );
    }


    /*
     * Evidence-backed RHS.
     */

    if (
      hasEvidenceRightHandSide
    ) {
      normalizedRightHandSideEvidenceMetricName =
        requireNonEmptyString(
          rightHandSideEvidenceMetricName,
          "CONSTRAINT_BINDING_RHS_EVIDENCE_METRIC"
        );


      /*
       * Evidence used as RHS must already be
       * declared in evidenceMetricNames.
       */

      if (
        !normalizedEvidenceMetricNames.includes(
          normalizedRightHandSideEvidenceMetricName
        )
      ) {
        throw new Error(
          "CONSTRAINT_BINDING_RHS_EVIDENCE_NOT_DECLARED"
        );
      }
    }
  }


  /*
  |--------------------------------------------------------------------------
  | Immutable contract
  |--------------------------------------------------------------------------
  */

  return Object.freeze({
    name:
      normalizedName,

    constraintKind,

    variableNames:
      Object.freeze([
        ...normalizedVariableNames,
      ]),

    evidenceMetricNames:
      Object.freeze([
        ...normalizedEvidenceMetricNames,
      ]),

    parameters:
      Object.freeze({
        ...parameters,
      }),

    required:
      Boolean(
        required
      ),

    timestamps:
      normalizedTimestamps ===
        null
        ? null
        : Object.freeze([
            ...normalizedTimestamps,
          ]),

    algebraic:
      algebraicRequested,

    coefficients:
      normalizedCoefficients ===
        null
        ? null
        : Object.freeze([
            ...normalizedCoefficients,
          ]),

    variableTerms:
      normalizedVariableTerms ===
        null
        ? null
        : Object.freeze(
            normalizedVariableTerms.map(
              term =>
                Object.freeze({
                  ...term,
                })
            )
          ),

    operator:
      normalizedOperator,

    rightHandSide:
      normalizedRightHandSide,

    rightHandSideEvidenceMetricName:
      normalizedRightHandSideEvidenceMetricName,

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
