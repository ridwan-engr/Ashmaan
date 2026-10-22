// services/optimizationDss/optimizationDssModelFormulationService.js

import {
  OPTIMIZATION_DSS_OBJECTIVE_KIND,
  OPTIMIZATION_DSS_DECISION_VARIABLE_KIND,
  OPTIMIZATION_DSS_CONSTRAINT_KIND,
} from "./optimizationDssContract.js";

import {
  OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE,
} from "./optimizationDssInputQualificationService.js";

import {
  OPTIMIZATION_DSS_MODEL_CONTRACT_PHASE,
  OPTIMIZATION_DSS_OBJECTIVE_SENSE,
  OPTIMIZATION_DSS_CONSTRAINT_OPERATOR,
  buildOptimizationTimeIndex,
  buildOptimizationObjectiveTerm,
  buildOptimizationVariableBinding,
  buildOptimizationConstraintBinding,
  createOptimizationDssModelContract,
} from "./optimizationDssModelContract.js";


export const OPTIMIZATION_DSS_MODEL_FORMULATION_PHASE =
  "11.2D";

export const OPTIMIZATION_DSS_MODEL_FORMULATION_LAYER =
  "OPTIMIZATION_DSS";


export const OPTIMIZATION_DSS_MODEL_FORMULATION_STATUS =
  Object.freeze({
    FORMULATED:
      "FORMULATED",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_MODEL_FORMULATION_REASON =
  Object.freeze({
    FORMULATED:
      "FORMULATED",

    INVALID_OPTIMIZATION_CONTRACT:
      "INVALID_OPTIMIZATION_CONTRACT",

    INVALID_QUALIFIED_INPUTS:
      "INVALID_QUALIFIED_INPUTS",

    OBJECTIVE_NOT_SUPPORTED:
      "OBJECTIVE_NOT_SUPPORTED",

    SITE_LOAD_POWER_REQUIRED:
      "SITE_LOAD_POWER_REQUIRED",

    SITE_LOAD_TIME_SERIES_REQUIRED:
      "SITE_LOAD_TIME_SERIES_REQUIRED",

    NO_CONSTRUCTIBLE_RESOURCE_PATH:
      "NO_CONSTRUCTIBLE_RESOURCE_PATH",

    GRID_IMPORT_LIMIT_REQUIRED:
      "GRID_IMPORT_LIMIT_REQUIRED",

    BATTERY_CONFIGURATION_INCOMPLETE:
      "BATTERY_CONFIGURATION_INCOMPLETE",

    BATTERY_OPERATIONAL_STATE_REQUIRED:
      "BATTERY_OPERATIONAL_STATE_REQUIRED",

    INVALID_BATTERY_CONFIGURATION:
      "INVALID_BATTERY_CONFIGURATION",

    INVALID_INITIAL_BATTERY_SOC:
      "INVALID_INITIAL_BATTERY_SOC",

    NON_UNIFORM_TIME_INTERVAL:
      "NON_UNIFORM_TIME_INTERVAL",

    INVALID_TIME_INTERVAL:
      "INVALID_TIME_INTERVAL",

    EVIDENCE_UNIT_MISMATCH:
      "EVIDENCE_UNIT_MISMATCH",

    EVIDENCE_VALUE_INVALID:
      "EVIDENCE_VALUE_INVALID",

    EVIDENCE_TIMESTAMP_INVALID:
      "EVIDENCE_TIMESTAMP_INVALID",

    EVIDENCE_TIMESTAMP_DUPLICATE:
      "EVIDENCE_TIMESTAMP_DUPLICATE",
  });


export const OPTIMIZATION_DSS_MODEL_FORMULATION_BOUNDARIES =
  Object.freeze({
    formulationOnly:
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

    topologyInferenceAllowed:
      false,

    resamplingAllowed:
      false,

    interpolationAllowed:
      false,

    observedMaximumUsedAsEngineeringLimit:
      false,

    syntheticEngineeringLimitsAllowed:
      false,

    gridOnlyFallbackAllowed:
      false,

    batterySocDynamicsRequired:
      true,

    initialBatterySocRequired:
      true,

    batteryEfficiencyRequired:
      true,

    uniformDispatchIntervalRequired:
      true,

    simultaneousBatteryChargeDischargeExplicitlyForbidden:
      false,
  });


const METRIC =
  Object.freeze({
    SITE_LOAD_POWER:
      "SITE_LOAD_POWER",

    GRID_IMPORT_LIMIT:
      "GRID_IMPORT_LIMIT",

    BATTERY_USABLE_CAPACITY:
      "BATTERY_USABLE_CAPACITY",

    BATTERY_MINIMUM_SOC:
      "BATTERY_MINIMUM_SOC",

    BATTERY_MAXIMUM_SOC:
      "BATTERY_MAXIMUM_SOC",

    BATTERY_MAX_CHARGE_POWER:
      "BATTERY_MAX_CHARGE_POWER",

    BATTERY_MAX_DISCHARGE_POWER:
      "BATTERY_MAX_DISCHARGE_POWER",

    BATTERY_CHARGE_EFFICIENCY:
      "BATTERY_CHARGE_EFFICIENCY",

    BATTERY_DISCHARGE_EFFICIENCY:
      "BATTERY_DISCHARGE_EFFICIENCY",

    INITIAL_BATTERY_SOC:
      "INITIAL_BATTERY_SOC",
  });


function unavailable(
  reason,
  diagnostics = {}
) {
  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_MODEL_FORMULATION_PHASE,

    layer:
      OPTIMIZATION_DSS_MODEL_FORMULATION_LAYER,

    status:
      OPTIMIZATION_DSS_MODEL_FORMULATION_STATUS
        .UNAVAILABLE,

    reason,

    modelContract:
      null,

    modelContractPhase:
      null,

    optimizationExecuted:
      false,

    diagnostics:
      Object.freeze({
        ...diagnostics,
      }),

    boundaries:
      OPTIMIZATION_DSS_MODEL_FORMULATION_BOUNDARIES,
  });
}


function finiteValue(
  evidenceItem
) {
  const value =
    evidenceItem?.value;

  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  )
    ? value
    : null;
}


function evidenceByMetric(
  qualifiedInputs,
  metricName
) {
  return qualifiedInputs
    .qualifiedEvidence
    .filter(
      item =>
        item?.metricName ===
        metricName
    );
}


function singleEvidenceValue(
  qualifiedInputs,
  metricName
) {
  const matches =
    evidenceByMetric(
      qualifiedInputs,
      metricName
    );

  if (
    matches.length !==
      1
  ) {
    return null;
  }

  return finiteValue(
    matches[0]
  );
}


function buildSiteLoadSeries(
  qualifiedInputs
) {
  const evidence =
    evidenceByMetric(
      qualifiedInputs,
      METRIC.SITE_LOAD_POWER
    );

  if (
    evidence.length ===
      0
  ) {
    return null;
  }

  const rows =
    evidence.map(
      item => {
        const timestamp =
          item?.timestamp;

        const value =
          finiteValue(
            item
          );

        if (
          !timestamp ||
          value ===
            null
        ) {
          return null;
        }

        const date =
          new Date(
            timestamp
          );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return null;
        }

        return Object.freeze({
          timestamp:
            date.toISOString(),

          value,

          unit:
            item.unit ??
            null,
        });
      }
    );

  if (
    rows.some(
      item =>
        item ===
        null
    )
  ) {
    return null;
  }

  rows.sort(
    (left, right) =>
      new Date(
        left.timestamp
      ) -
      new Date(
        right.timestamp
      )
  );

  const timestamps =
    rows.map(
      item =>
        item.timestamp
    );

  if (
    new Set(
      timestamps
    ).size !==
      timestamps.length
  ) {
    return null;
  }

  const units =
    new Set(
      rows.map(
        item =>
          item.unit
      )
    );

  if (
    units.size !==
      1 ||
    units.has(
      null
    )
  ) {
    return null;
  }

  return Object.freeze({
    rows:
      Object.freeze([
        ...rows,
      ]),

    timestamps:
      Object.freeze([
        ...timestamps,
      ]),

    unit:
      rows[0].unit,
  });
}


function findObjective(
  optimizationContract,
  kind
) {
  return optimizationContract
    .objectives
    .find(
      objective =>
        objective?.kind ===
        kind
    ) ??
    null;
}


function deriveUniformInterval(
  loadSeries
) {
  const timestamps =
    loadSeries.timestamps;

  if (
    timestamps.length <
      2
  ) {
    return null;
  }

  const intervalsMs =
    [];

  for (
    let index = 1;
    index <
      timestamps.length;
    index += 1
  ) {
    const intervalMs =
      new Date(
        timestamps[index]
      ).getTime() -
      new Date(
        timestamps[index - 1]
      ).getTime();

    if (
      !Number.isFinite(
        intervalMs
      ) ||
      intervalMs <=
        0
    ) {
      return null;
    }

    intervalsMs.push(
      intervalMs
    );
  }

  const firstIntervalMs =
    intervalsMs[0];

  if (
    intervalsMs.some(
      intervalMs =>
        intervalMs !==
        firstIntervalMs
    )
  ) {
    return Object.freeze({
      uniform:
        false,

      intervalHours:
        null,

      intervalMilliseconds:
        null,
    });
  }

  const intervalHours =
    firstIntervalMs /
    3_600_000;

  if (
    !Number.isFinite(
      intervalHours
    ) ||
    intervalHours <=
      0
  ) {
    return null;
  }

  return Object.freeze({
    uniform:
      true,

    intervalHours,

    intervalMilliseconds:
      firstIntervalMs,
  });
}


function buildBatterySocTimestamps({
  loadSeries,
  intervalMilliseconds,
}) {
  const timestamps =
    [
      ...loadSeries.timestamps,
    ];

  const lastTimestamp =
    new Date(
      timestamps[
        timestamps.length - 1
      ]
    ).getTime();

  const terminalTimestamp =
    new Date(
      lastTimestamp +
      intervalMilliseconds
    ).toISOString();

  return Object.freeze([
    ...timestamps,
    terminalTimestamp,
  ]);
}


function formulateGridBattery({
  optimizationContract,
  qualifiedInputs,
  loadSeries,
  objective,
  gridImportLimit,
  batteryUsableCapacity,
  batteryMinimumSoc,
  batteryMaximumSoc,
  batteryMaxChargePower,
  batteryMaxDischargePower,
  batteryChargeEfficiency,
  batteryDischargeEfficiency,
  initialBatterySoc,
  intervalHours,
  intervalMilliseconds,
}) {
  const powerUnit =
    loadSeries.unit;

  const socUnit =
    "PERCENT";

  const batterySocTimestamps =
    buildBatterySocTimestamps({
      loadSeries,
      intervalMilliseconds,
    });


  const variableBindings = [
    buildOptimizationVariableBinding({
      name:
        "gridPower",

      variableKind:
        OPTIMIZATION_DSS_DECISION_VARIABLE_KIND
          .GRID_POWER,

      unit:
        powerUnit,

      lowerBound:
        0,

      upperBound:
        gridImportLimit,

      timeIndexed:
        true,
    }),

    buildOptimizationVariableBinding({
      name:
        "batteryChargePower",

      variableKind:
        OPTIMIZATION_DSS_DECISION_VARIABLE_KIND
          .BATTERY_CHARGE_POWER,

      unit:
        powerUnit,

      lowerBound:
        0,

      upperBound:
        batteryMaxChargePower,

      timeIndexed:
        true,
    }),

    buildOptimizationVariableBinding({
      name:
        "batteryDischargePower",

      variableKind:
        OPTIMIZATION_DSS_DECISION_VARIABLE_KIND
          .BATTERY_DISCHARGE_POWER,

      unit:
        powerUnit,

      lowerBound:
        0,

      upperBound:
        batteryMaxDischargePower,

      timeIndexed:
        true,
    }),

    buildOptimizationVariableBinding({
      name:
        "batterySoc",

      variableKind:
        OPTIMIZATION_DSS_DECISION_VARIABLE_KIND
          .BATTERY_SOC,

      unit:
        socUnit,

      lowerBound:
        batteryMinimumSoc,

      upperBound:
        batteryMaximumSoc,

      timeIndexed:
        true,

      timestamps:
        batterySocTimestamps,
    }),
  ];


  const objectiveTerms = [
    buildOptimizationObjectiveTerm({
      name:
        "minimizeGridImport",

      objectiveKind:
        OPTIMIZATION_DSS_OBJECTIVE_KIND
          .MINIMIZE_GRID_IMPORT,

      sense:
        OPTIMIZATION_DSS_OBJECTIVE_SENSE
          .MINIMIZE,

      /*
       * Power is converted into interval
       * energy contribution by delta-t.
       */
      coefficient:
        objective.weight *
        intervalHours,

      unit:
        powerUnit,

      currency:
        null,

      variableName:
        "gridPower",

      evidenceMetricName:
        METRIC.SITE_LOAD_POWER,
    }),
  ];


  /*
   * SOC is represented as percentage.
   *
   * SOC[t+1] =
   *   SOC[t]
   *   + 100 * etaCharge * Pcharge[t] * dt / Eusable
   *   - 100 * Pdischarge[t] * dt
   *       / (etaDischarge * Eusable)
   */
  const chargeSocCoefficient =
    -(
      100 *
      batteryChargeEfficiency *
      intervalHours /
      batteryUsableCapacity
    );

  const dischargeSocCoefficient =
    100 *
    intervalHours /
    (
      batteryDischargeEfficiency *
      batteryUsableCapacity
    );


  const constraintBindings = [
    buildOptimizationConstraintBinding({
      name:
        "sitePowerBalance",

      constraintKind:
        OPTIMIZATION_DSS_CONSTRAINT_KIND
          .POWER_BALANCE,

      variableNames: [
        "gridPower",
        "batteryDischargePower",
        "batteryChargePower",
      ],

      evidenceMetricNames: [
        METRIC.SITE_LOAD_POWER,
      ],

      coefficients: [
        1,
        1,
        -1,
      ],

      operator:
        OPTIMIZATION_DSS_CONSTRAINT_OPERATOR
          .EQUAL,

      rightHandSideEvidenceMetricName:
        METRIC.SITE_LOAD_POWER,

      parameters: {},

      required:
        true,
    }),


    buildOptimizationConstraintBinding({
      name:
        "gridImportLimit",

      constraintKind:
        OPTIMIZATION_DSS_CONSTRAINT_KIND
          .GRID_LIMIT,

      variableNames: [
        "gridPower",
      ],

      evidenceMetricNames: [
        METRIC.GRID_IMPORT_LIMIT,
      ],

      coefficients: [
        1,
      ],

      operator:
        OPTIMIZATION_DSS_CONSTRAINT_OPERATOR
          .LESS_THAN_OR_EQUAL,

      rightHandSide:
        gridImportLimit,

      parameters: {
        engineeringMetricName:
          METRIC.GRID_IMPORT_LIMIT,
      },

      required:
        true,
    }),


    buildOptimizationConstraintBinding({
      name:
        "batteryChargePowerLimit",

      constraintKind:
        OPTIMIZATION_DSS_CONSTRAINT_KIND
          .BATTERY_POWER_LIMIT,

      variableNames: [
        "batteryChargePower",
      ],

      evidenceMetricNames: [
        METRIC.BATTERY_MAX_CHARGE_POWER,
      ],

      coefficients: [
        1,
      ],

      operator:
        OPTIMIZATION_DSS_CONSTRAINT_OPERATOR
          .LESS_THAN_OR_EQUAL,

      rightHandSide:
        batteryMaxChargePower,

      parameters: {
        engineeringMetricName:
          METRIC.BATTERY_MAX_CHARGE_POWER,
      },

      required:
        true,
    }),


    buildOptimizationConstraintBinding({
      name:
        "batteryDischargePowerLimit",

      constraintKind:
        OPTIMIZATION_DSS_CONSTRAINT_KIND
          .BATTERY_POWER_LIMIT,

      variableNames: [
        "batteryDischargePower",
      ],

      evidenceMetricNames: [
        METRIC.BATTERY_MAX_DISCHARGE_POWER,
      ],

      coefficients: [
        1,
      ],

      operator:
        OPTIMIZATION_DSS_CONSTRAINT_OPERATOR
          .LESS_THAN_OR_EQUAL,

      rightHandSide:
        batteryMaxDischargePower,

      parameters: {
        engineeringMetricName:
          METRIC.BATTERY_MAX_DISCHARGE_POWER,
      },

      required:
        true,
    }),


    /*
     * Initial state:
     *
     * SOC[0] = measured initial SOC.
     *
     * This constraint is intentionally
     * generated only at the first dispatch
     * timestamp.
     */
    buildOptimizationConstraintBinding({
      name:
        "batteryInitialSoc",

      constraintKind:
        OPTIMIZATION_DSS_CONSTRAINT_KIND
          .BATTERY_SOC_LIMIT,

      variableNames: [
        "batterySoc",
      ],

      evidenceMetricNames: [
        METRIC.INITIAL_BATTERY_SOC,
      ],

      variableTerms: [
        {
          variableName:
            "batterySoc",

          timeOffset:
            0,

          coefficient:
            1,
        },
      ],

      operator:
        OPTIMIZATION_DSS_CONSTRAINT_OPERATOR
          .EQUAL,

      rightHandSide:
        initialBatterySoc,

      parameters: {
        initialStateConstraint:
          true,
      },

      timestamps: [
        loadSeries.timestamps[0],
      ],

      required:
        true,
    }),


    /*
     * SOC[t+1] - SOC[t]
     * - chargeFactor * Pcharge[t]
     * + dischargeFactor * Pdischarge[t]
     * = 0
     */
    buildOptimizationConstraintBinding({
      name:
        "batterySocDynamics",

      constraintKind:
        OPTIMIZATION_DSS_CONSTRAINT_KIND
          .BATTERY_SOC_LIMIT,

      variableNames: [
        "batterySoc",
        "batteryChargePower",
        "batteryDischargePower",
      ],

      evidenceMetricNames: [
        METRIC.BATTERY_USABLE_CAPACITY,
        METRIC.BATTERY_CHARGE_EFFICIENCY,
        METRIC.BATTERY_DISCHARGE_EFFICIENCY,
      ],

      variableTerms: [
        {
          variableName:
            "batterySoc",

          timeOffset:
            1,

          coefficient:
            1,
        },

        {
          variableName:
            "batterySoc",

          timeOffset:
            0,

          coefficient:
            -1,
        },

        {
          variableName:
            "batteryChargePower",

          timeOffset:
            0,

          coefficient:
            chargeSocCoefficient,
        },

        {
          variableName:
            "batteryDischargePower",

          timeOffset:
            0,

          coefficient:
            dischargeSocCoefficient,
        },
      ],

      operator:
        OPTIMIZATION_DSS_CONSTRAINT_OPERATOR
          .EQUAL,

      rightHandSide:
        0,

      parameters: {
        intervalHours,
        batteryUsableCapacity,
        batteryChargeEfficiency,
        batteryDischargeEfficiency,
      },

      required:
        true,
    }),
  ];


  const timeIndex =
    buildOptimizationTimeIndex({
      timestamps:
        loadSeries.timestamps,
    });


  return createOptimizationDssModelContract({
    optimizationContract,
    qualifiedInputs,
    timeIndex,
    variableBindings,
    objectiveTerms,
    constraintBindings,
  });
}


export function formulateOptimizationDssModel({
  optimizationContract,
  qualifiedInputs,
} = {}) {
  if (
    !optimizationContract ||
    !Array.isArray(
      optimizationContract.objectives
    )
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .INVALID_OPTIMIZATION_CONTRACT
    );
  }


  if (
    !qualifiedInputs ||
    qualifiedInputs.phase !==
      OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE ||
    qualifiedInputs.contract !==
      optimizationContract ||
    !Array.isArray(
      qualifiedInputs.qualifiedEvidence
    )
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .INVALID_QUALIFIED_INPUTS
    );
  }


  const objective =
    findObjective(
      optimizationContract,
      OPTIMIZATION_DSS_OBJECTIVE_KIND
        .MINIMIZE_GRID_IMPORT
    );

  if (
    !objective
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .OBJECTIVE_NOT_SUPPORTED
    );
  }


  const loadSeries =
    buildSiteLoadSeries(
      qualifiedInputs
    );

  if (
    !loadSeries
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .SITE_LOAD_TIME_SERIES_REQUIRED
    );
  }


  const interval =
    deriveUniformInterval(
      loadSeries
    );

  if (
    !interval
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .INVALID_TIME_INTERVAL
    );
  }

  if (
    !interval.uniform
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .NON_UNIFORM_TIME_INTERVAL
    );
  }


  const gridImportLimit =
    singleEvidenceValue(
      qualifiedInputs,
      METRIC.GRID_IMPORT_LIMIT
    );

  if (
    gridImportLimit ===
      null
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .GRID_IMPORT_LIMIT_REQUIRED
    );
  }


  const batteryUsableCapacity =
    singleEvidenceValue(
      qualifiedInputs,
      METRIC.BATTERY_USABLE_CAPACITY
    );

  const batteryMinimumSoc =
    singleEvidenceValue(
      qualifiedInputs,
      METRIC.BATTERY_MINIMUM_SOC
    );

  const batteryMaximumSoc =
    singleEvidenceValue(
      qualifiedInputs,
      METRIC.BATTERY_MAXIMUM_SOC
    );

  const batteryMaxChargePower =
    singleEvidenceValue(
      qualifiedInputs,
      METRIC.BATTERY_MAX_CHARGE_POWER
    );

  const batteryMaxDischargePower =
    singleEvidenceValue(
      qualifiedInputs,
      METRIC.BATTERY_MAX_DISCHARGE_POWER
    );

  const batteryChargeEfficiency =
    singleEvidenceValue(
      qualifiedInputs,
      METRIC.BATTERY_CHARGE_EFFICIENCY
    );

  const batteryDischargeEfficiency =
    singleEvidenceValue(
      qualifiedInputs,
      METRIC.BATTERY_DISCHARGE_EFFICIENCY
    );

  const initialBatterySoc =
    singleEvidenceValue(
      qualifiedInputs,
      METRIC.INITIAL_BATTERY_SOC
    );


  const batteryEngineeringValues = [
    batteryUsableCapacity,
    batteryMinimumSoc,
    batteryMaximumSoc,
    batteryMaxChargePower,
    batteryMaxDischargePower,
    batteryChargeEfficiency,
    batteryDischargeEfficiency,
  ];


  if (
    !batteryEngineeringValues.every(
      value =>
        value !==
        null
    )
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .BATTERY_CONFIGURATION_INCOMPLETE,
      {
        missingMetrics:
          [
            [
              METRIC.BATTERY_USABLE_CAPACITY,
              batteryUsableCapacity,
            ],
            [
              METRIC.BATTERY_MINIMUM_SOC,
              batteryMinimumSoc,
            ],
            [
              METRIC.BATTERY_MAXIMUM_SOC,
              batteryMaximumSoc,
            ],
            [
              METRIC.BATTERY_MAX_CHARGE_POWER,
              batteryMaxChargePower,
            ],
            [
              METRIC.BATTERY_MAX_DISCHARGE_POWER,
              batteryMaxDischargePower,
            ],
            [
              METRIC.BATTERY_CHARGE_EFFICIENCY,
              batteryChargeEfficiency,
            ],
            [
              METRIC.BATTERY_DISCHARGE_EFFICIENCY,
              batteryDischargeEfficiency,
            ],
          ]
            .filter(
              ([, value]) =>
                value ===
                null
            )
            .map(
              ([metricName]) =>
                metricName
            ),
      }
    );
  }


  if (
    initialBatterySoc ===
      null
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .BATTERY_OPERATIONAL_STATE_REQUIRED
    );
  }


  if (
    gridImportLimit <
      0 ||
    batteryUsableCapacity <=
      0 ||
    batteryMinimumSoc <
      0 ||
    batteryMaximumSoc >
      100 ||
    batteryMinimumSoc >
      batteryMaximumSoc ||
    batteryMaxChargePower <
      0 ||
    batteryMaxDischargePower <
      0 ||
    batteryChargeEfficiency <=
      0 ||
    batteryChargeEfficiency >
      1 ||
    batteryDischargeEfficiency <=
      0 ||
    batteryDischargeEfficiency >
      1
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .INVALID_BATTERY_CONFIGURATION
    );
  }


  if (
    initialBatterySoc <
      batteryMinimumSoc ||
    initialBatterySoc >
      batteryMaximumSoc
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .INVALID_INITIAL_BATTERY_SOC,
      {
        initialBatterySoc,
        batteryMinimumSoc,
        batteryMaximumSoc,
      }
    );
  }


  const modelContract =
    formulateGridBattery({
      optimizationContract,
      qualifiedInputs,
      loadSeries,
      objective,
      gridImportLimit,
      batteryUsableCapacity,
      batteryMinimumSoc,
      batteryMaximumSoc,
      batteryMaxChargePower,
      batteryMaxDischargePower,
      batteryChargeEfficiency,
      batteryDischargeEfficiency,
      initialBatterySoc,
      intervalHours:
        interval.intervalHours,
      intervalMilliseconds:
        interval.intervalMilliseconds,
    });


  if (
    modelContract.phase !==
      OPTIMIZATION_DSS_MODEL_CONTRACT_PHASE
  ) {
    return unavailable(
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .NO_CONSTRUCTIBLE_RESOURCE_PATH
    );
  }


  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_MODEL_FORMULATION_PHASE,

    layer:
      OPTIMIZATION_DSS_MODEL_FORMULATION_LAYER,

    status:
      OPTIMIZATION_DSS_MODEL_FORMULATION_STATUS
        .FORMULATED,

    reason:
      OPTIMIZATION_DSS_MODEL_FORMULATION_REASON
        .FORMULATED,

    objectiveKind:
      OPTIMIZATION_DSS_OBJECTIVE_KIND
        .MINIMIZE_GRID_IMPORT,

    resourcePath:
      "GRID_BATTERY",

    timePointCount:
      loadSeries.timestamps.length,

    dispatchIntervalCount:
      loadSeries.timestamps.length,

    batterySocStateCount:
      loadSeries.timestamps.length +
      1,

    intervalHours:
      interval.intervalHours,

    modelContract,

    modelContractPhase:
      modelContract.phase,

    optimizationExecuted:
      false,

    diagnostics:
      Object.freeze({
        loadMetricName:
          METRIC.SITE_LOAD_POWER,

        loadUnit:
          loadSeries.unit,

        gridImportLimit,

        batteryUsableCapacity,

        batteryMinimumSoc,

        batteryMaximumSoc,

        batteryMaxChargePower,

        batteryMaxDischargePower,

        batteryChargeEfficiency,

        batteryDischargeEfficiency,

        initialBatterySoc,
      }),

    boundaries:
      OPTIMIZATION_DSS_MODEL_FORMULATION_BOUNDARIES,
  });
}


export default
  formulateOptimizationDssModel;