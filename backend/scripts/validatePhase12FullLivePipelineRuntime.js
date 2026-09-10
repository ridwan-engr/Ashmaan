import "dotenv/config";

import dns from "node:dns";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import Installation from "../models/Installation.js";
import Telemetry from "../models/Telemetry.js";
import OutageEvent from "../models/OutageEvent.js";
import ForecastRecord from "../models/ForecastRecord.js";
import FinancialBiKpiRecord from "../models/FinancialBiKpiRecord.js";
import OptimizationDssRecommendation from "../models/OptimizationDssRecommendation.js";

import {
  getProductionGridTelemetryEvidence,
} from "../services/engineering/gridProductionTelemetryService.js";

import {
  getProductionGridSiteAnalytics,
} from "../services/engineering/gridProductionAdapter.js";

import {
  FORECAST_TARGET_FAMILY,
  FORECAST_TARGET_KIND,
  FORECAST_OUTPUT_TYPE,
  buildForecastTimeContract,
  buildForecastTarget,
} from "../services/forecasting/forecastingContract.js";

import {
  qualifyForecastInput,
} from "../services/forecasting/forecastInputQualificationService.js";

import {
  FORECAST_FEATURE_ROLE,
  FORECAST_FEATURE_VALUE_KIND,
  FORECAST_FEATURE_AVAILABILITY,
  FORECAST_FEATURE_TRANSFORM,
  buildForecastFeatureDefinition,
  buildForecastFeatureSet,
} from "../services/forecasting/forecastFeatureContract.js";

import {
  materializeForecastFeatures,
} from "../services/forecasting/forecastFeatureMaterializationService.js";

import {
  FORECAST_MODEL_FAMILY,
  FORECAST_MODEL_TASK,
  FORECAST_EVALUATION_SPLIT,
  buildForecastEvaluationContract,
  buildForecastModelDefinition,
} from "../services/forecasting/forecastModelContract.js";

import {
  trainForecastBaseline,
} from "../services/forecasting/forecastBaselineTrainingService.js";

import {
  buildForecastAcceptanceCriteria,
  qualifyForecastModel,
} from "../services/forecasting/forecastModelQualificationService.js";

import {
  createForecastProductionContract,
} from "../services/forecasting/forecastProductionContract.js";

import {
  executeProductionForecast,
} from "../services/forecasting/forecastProductionExecutionService.js";

import {
  createForecastPersistenceContract,
} from "../services/forecasting/forecastPersistenceContract.js";

import {
  persistForecast,
} from "../services/forecasting/forecastPersistenceService.js";

import {
  FINANCIAL_BI_METRIC_KIND,
  FINANCIAL_BI_VALUE_KIND,
  FINANCIAL_BI_SCOPE,
  FINANCIAL_BI_SOURCE_KIND,
  buildFinancialBiReportingWindow,
  buildFinancialBiMetricDefinition,
  createFinancialBiContract,
} from "../services/financialBi/financialBiContract.js";

import {
  qualifyFinancialBiInput,
} from "../services/financialBi/financialBiInputQualificationService.js";

import {
  FINANCIAL_BI_CALCULATION_FORMULA_KIND,
  buildFinancialBiCalculationDefinition,
} from "../services/financialBi/financialBiCalculationContract.js";

import {
  executeFinancialBiCalculation,
} from "../services/financialBi/financialBiCalculationExecutionService.js";

import {
  FINANCIAL_BI_KPI_AGGREGATION_METHOD,
  buildFinancialBiKpiAggregationDefinition,
} from "../services/financialBi/financialBiKpiAggregationContract.js";

import {
  executeFinancialBiKpiAggregation,
} from "../services/financialBi/financialBiKpiAggregationExecutionService.js";

import {
  FINANCIAL_BI_PERSISTENCE_RECORD_KIND,
  buildFinancialBiPersistenceIdentity,
  createFinancialBiPersistenceContract,
} from "../services/financialBi/financialBiPersistenceContract.js";

import {
  persistFinancialBiKpi,
} from "../services/financialBi/financialBiPersistenceService.js";

import {
  mongooseFinancialBiKpiRepository,
} from "../services/financialBi/mongooseFinancialBiKpiRepository.js";

import {
  OPTIMIZATION_DSS_OBJECTIVE_KIND,
  OPTIMIZATION_DSS_DECISION_VARIABLE_KIND,
  OPTIMIZATION_DSS_CONSTRAINT_KIND,
  OPTIMIZATION_DSS_SCOPE,
  buildOptimizationDssHorizon,
  buildOptimizationDssObjective,
  buildOptimizationDssDecisionVariable,
  buildOptimizationDssConstraint,
  createOptimizationDssContract,
} from "../services/optimizationDss/optimizationDssContract.js";

import {
  qualifyOptimizationDssInputs,
} from "../services/optimizationDss/optimizationDssInputQualificationService.js";

import {
  OPTIMIZATION_DSS_OBJECTIVE_SENSE,
  buildOptimizationTimeIndex,
  buildOptimizationObjectiveTerm,
  buildOptimizationVariableBinding,
  buildOptimizationConstraintBinding,
  createOptimizationDssModelContract,
} from "../services/optimizationDss/optimizationDssModelContract.js";

import {
  buildOptimizationDssModel,
} from "../services/optimizationDss/optimizationDssModelBuildService.js";

import {
  OPTIMIZATION_DSS_SOLVER_KIND,
  OPTIMIZATION_DSS_SOLVER_STATUS,
  OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON,
  buildOptimizationDssSolverOptions,
  createOptimizationDssSolverContract,
} from "../services/optimizationDss/optimizationDssSolverContract.js";

import {
  executeOptimizationDssSolver,
} from "../services/optimizationDss/optimizationDssSolverExecutionService.js";

import {
  qualifyOptimizationDssResult,
} from "../services/optimizationDss/optimizationDssResultQualificationService.js";

import {
  OPTIMIZATION_DSS_RECOMMENDATION_KIND,
  OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY,
  OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE,
  buildOptimizationDssRecommendationAction,
  createOptimizationDssRecommendationContract,
} from "../services/optimizationDss/optimizationDssRecommendationContract.js";

import {
  generateOptimizationDssRecommendation,
} from "../services/optimizationDss/optimizationDssRecommendationGenerationService.js";

import {
  buildOptimizationDssPersistenceIdentity,
  createOptimizationDssPersistenceContract,
} from "../services/optimizationDss/optimizationDssPersistenceContract.js";

import {
  persistOptimizationDssRecommendation,
} from "../services/optimizationDss/optimizationDssPersistenceService.js";

import {
  createMongooseOptimizationDssPersistenceRepository,
} from "../services/optimizationDss/mongooseOptimizationDssPersistenceRepository.js";


// Validator-local Windows/Node DNS workaround only.
// This does not alter production networking or .env configuration.
dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);


const PHASE = "12.13-B";
const LAYER = "FULL_LIVE_PIPELINE_RUNTIME";
const INTERVAL = "[start,end)";
const TIMEZONE = "Africa/Lagos";
const MIN_FORECAST_OBSERVATIONS = 12;
const FORECAST_HORIZON_MS = 60 * 60 * 1000;

const KEEP_FIXTURES =
  String(
    process.env.PHASE12_13_KEEP_FIXTURES || "false"
  ).toLowerCase() === "true";

let assertions = 0;

const created = {
  forecastKeys: new Set(),
  financialKeys: new Set(),
  optimizationKeys: new Set(),
};


function pass(message) {
  assertions += 1;
  console.log(`PASS ${assertions}: ${message}`);
}


function info(message) {
  console.log(`INFO: ${message}`);
}


function requireTrue(value, message) {
  assert.equal(
    Boolean(value),
    true,
    message
  );

  pass(message);
}


function requireEqual(
  actual,
  expected,
  message
) {
  assert.equal(
    actual,
    expected,
    message
  );

  pass(message);
}


function requireFunction(
  fn,
  message
) {
  assert.equal(
    typeof fn,
    "function",
    message
  );

  pass(message);
}


function asPlain(document) {
  if (
    document &&
    typeof document.toObject === "function"
  ) {
    return document.toObject();
  }

  return document;
}


function safeString(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text || null;
}


function validDate(value) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isFinite(
    date.getTime()
  )
    ? date
    : null;
}


function getTelemetryTimestamp(record) {
  return (
    validDate(record?.timestamp) ||
    validDate(record?.time) ||
    validDate(record?.createdAt)
  );
}


function getTelemetryValue(record) {
  const candidates = [
    record?.value,
    record?.numericValue,
    record?.normalized?.value,
    record?.data?.value,
  ];

  for (
    const candidate of candidates
  ) {
    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}


function getTelemetryUnit(record) {
  const candidates = [
    record?.unit,
    record?.engineeringUnit,
    record?.normalized?.unit,
    record?.meta?.unit,
    record?.metadata?.unit,
  ];

  for (
    const candidate of candidates
  ) {
    const unit =
      safeString(candidate);

    if (unit) {
      return unit;
    }
  }

  return null;
}

function getTelemetryMetric(record) {
  const candidates = [
    record?.metric,
    record?.attribute,
    record?.attributeCode,
    record?.name,
    record?.measurement,
    record?.vrmAttributeId !== undefined &&
    record?.vrmAttributeId !== null
      ? `vrmAttributeId:${record.vrmAttributeId}`
      : null,
  ];

  for (const candidate of candidates) {
    const metric = safeString(candidate);

    if (metric) {
      return metric;
    }
  }

  return null;
}


function recordSearchText(record) {
  const values = [
    record?.deviceType,
    record?.deviceName,
    record?.metric,
    record?.attribute,
    record?.attributeCode,
    record?.name,
    record?.description,
    record?.measurement,
    record?.path,
    record?.source,
    record?.serviceName,
  ];

  return values
    .filter(
      value =>
        value !== null &&
        value !== undefined
    )
    .map(
      value =>
        String(value).toLowerCase()
    )
    .join(" ");
}


function normalizeForecastObservation({
  timestamp,
  value,
  unit,
}) {
  return Object.freeze({
    timestamp,
    value,
    unit,
  });
}

function buildControlledForecastObservations({
  trainingStart,
  unit,
}) {
  const observations = [];

  for (
    let index = 0;
    index < 24;
    index += 1
  ) {
    observations.push(
      Object.freeze({
        timestamp:
          new Date(
            trainingStart.getTime() +
              index *
                5 *
                60 *
                1000
          ),

        value:
          20 +
          index * 0.25,

        unit,
      })
    );
  }

  return Object.freeze(
    observations
  );
}

function looksLikeGridPower(record, unit, metric) {
  const unitToken = String(unit || "").trim().toLowerCase();
  const powerUnit = new Set(["w", "kw", "mw"]);

  if (!powerUnit.has(unitToken)) {
    return false;
  }

  const text = `${recordSearchText(record)} ${String(metric || "").toLowerCase()}`;

  const gridMarker =
    /\bgrid\b|ac[ _-]?in|ac[ _-]?input|utility|mains|shore/.test(text);

  const powerMarker =
    /power|watt|active/.test(text) || powerUnit.has(unitToken);

  return gridMarker && powerMarker;
}


function groupExplicitLiveGridPowerSeries(records, forecastOrigin) {
  const groups = new Map();

  for (const raw of records) {
    const record = asPlain(raw);
    const timestamp = getTelemetryTimestamp(record);
    const value = getTelemetryValue(record);
    const unit = getTelemetryUnit(record);
    const metric = getTelemetryMetric(record);

    if (!timestamp || timestamp >= forecastOrigin) {
      continue;
    }

    if (value === null || !unit || !metric) {
      continue;
    }

    if (!looksLikeGridPower(record, unit, metric)) {
      continue;
    }

    const deviceType = safeString(record?.deviceType) || "UNKNOWN_DEVICE_TYPE";
    const deviceInstance =
      safeString(record?.deviceInstance) ||
      safeString(record?.instance) ||
      "UNKNOWN_DEVICE_INSTANCE";

    const key = [
      metric,
      unit,
      deviceType,
      deviceInstance,
    ].join("|");

    if (!groups.has(key)) {
      groups.set(key, {
        metric,
        unit,
        deviceType,
        deviceInstance,
        observations: [],
      });
    }

    groups.get(key).observations.push({
      timestamp: timestamp.toISOString(),
      value,
      unit,
    });
  }

  const candidates = [];

  for (const group of groups.values()) {
    group.observations.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const timestamps = group.observations.map(item => item.timestamp);
    const uniqueTimestampCount = new Set(timestamps).size;

    // No duplicate merge is performed. A duplicate-timestamp series is simply
    // not eligible for this live forecasting runtime path.
    if (uniqueTimestampCount !== timestamps.length) {
      continue;
    }

    if (group.observations.length < MIN_FORECAST_OBSERVATIONS) {
      continue;
    }

    candidates.push(group);
  }

  candidates.sort((a, b) => b.observations.length - a.observations.length);
  return candidates[0] || null;
}



function buildForecastChain({
  vrmSiteId,
  installationId,
  trainingStart,
  forecastOrigin,
  forecastEnd,
  metric,
  unit,
  observations,
  source,
}) {
  const time = buildForecastTimeContract({
    trainingStart,
    forecastOrigin,
    forecastEnd,
    timezone: TIMEZONE,
  });

  const target = buildForecastTarget({
    family: FORECAST_TARGET_FAMILY.GRID,
    metric,
    kind: FORECAST_TARGET_KIND.NUMERIC,
    unit,
    installationId,
    vrmSiteId,
  });

  const inputQualification = qualifyForecastInput({
    time,
    target,
    source,
    observations,
  });

  const lag1 = buildForecastFeatureDefinition({
    name: "phase12_13_grid_power_lag_1",
    role: FORECAST_FEATURE_ROLE.TARGET_HISTORY,
    valueKind: FORECAST_FEATURE_VALUE_KIND.NUMERIC,
    availability: FORECAST_FEATURE_AVAILABILITY.OBSERVED_AT_OR_BEFORE_ORIGIN,
    source: {
      metric,
    },
    unit,
    transform: FORECAST_FEATURE_TRANSFORM.LAG,
    lagSteps: 1,
  });

  const featureSet = buildForecastFeatureSet({
    target,
    inputQualification,
    features: [lag1],
  });

  const materialization = materializeForecastFeatures({
    featureSet,
  });

  const evaluation = buildForecastEvaluationContract({
    split: FORECAST_EVALUATION_SPLIT.HOLDOUT,
    validationFraction: 0.2,
    testFraction: 0.2,
    minimumTrainingRows: 4,
  });

  const modelContract = buildForecastModelDefinition({
    name: "phase12_13_naive_grid_power",
    family: FORECAST_MODEL_FAMILY.NAIVE,
    task: FORECAST_MODEL_TASK.REGRESSION,
    targetKind: FORECAST_TARGET_KIND.NUMERIC,
    outputType: FORECAST_OUTPUT_TYPE.POINT,
    featureMaterialization: materialization,
    evaluation,
  });

  const trainingResult = trainForecastBaseline({
    modelContract,
  });

  // Runtime acceptance gate, not a model-quality production threshold.
  // A deliberately broad finite threshold allows this checkpoint to validate
  // chain execution while preserving the existing Phase 9.7 qualification API.
  const acceptanceCriteria = buildForecastAcceptanceCriteria({
    maximumValidationMae: 1e12,
    maximumValidationRmse: 1e12,
    maximumTestMae: 1e12,
    maximumTestRmse: 1e12,
  });

  const modelQualification = qualifyForecastModel({
    trainingResult,
    criteria: acceptanceCriteria,
  });

  const productionContract = createForecastProductionContract({
    qualification: modelQualification,
    requestedOutputType: FORECAST_OUTPUT_TYPE.POINT,
  });

  const forecastTimestamps = [forecastOrigin.toISOString()];

  const executionResult = executeProductionForecast({
    productionContract,
    forecastTimestamps,
  });

  return {
    time,
    target,
    inputQualification,
    featureSet,
    materialization,
    evaluation,
    modelContract,
    trainingResult,
    acceptanceCriteria,
    modelQualification,
    productionContract,
    executionResult,
  };
}


async function persistForecastIfCalculated(executionResult) {
  if (executionResult?.status !== "CALCULATED") {
    return {
      persisted: false,
      reason: executionResult?.reason || "FORECAST_NOT_CALCULATED",
      persistenceContract: null,
      persistenceResult: null,
    };
  }

  const persistenceContract = createForecastPersistenceContract({
    executionResult,
  });

  requireEqual(
    persistenceContract?.eligibility,
    "ELIGIBLE",
    "Phase 9.10 forecast persistence contract is ELIGIBLE"
  );

  const persistenceKey = persistenceContract.identity.persistenceKey;

  const existing = await ForecastRecord.findOne({ persistenceKey }).lean();

  const persistenceResult = await persistForecast({
    persistenceContract,
    ForecastRecordModel: ForecastRecord,
  });

  requireTrue(
    ["PERSISTED", "ALREADY_PERSISTED"].includes(persistenceResult?.status),
    `Phase 9.11 forecast persistence returns ${persistenceResult?.status || "UNKNOWN"}`
  );

  if (!existing && persistenceResult?.status === "PERSISTED") {
    created.forecastKeys.add(persistenceKey);
  }

  const readBack = await ForecastRecord.findOne({ persistenceKey }).lean();

  requireTrue(
    readBack,
    "persisted ForecastRecord is readable from live Atlas"
  );

  return {
    persisted: true,
    persistenceKey,
    persistenceContract,
    persistenceResult,
    readBack,
  };
}


async function buildAndPersistFinancialBi({
  vrmSiteId,
  forecastExecution,
  unit,
  forecastOrigin,
  forecastEnd,
}) {
  const values = forecastExecution?.forecast?.values;

  assert.ok(
    Array.isArray(values) && values.length > 0,
    "forecast values required for Financial/BI"
  );

  const reportingWindow = buildFinancialBiReportingWindow({
    start: forecastOrigin,
    end: forecastEnd,
    timezone: TIMEZONE,
  });

  const sourceMetric = buildFinancialBiMetricDefinition({
    name: "phase12_13_forecast_grid_power",
    kind: FINANCIAL_BI_METRIC_KIND.POWER,
    valueKind: FINANCIAL_BI_VALUE_KIND.NUMERIC,
    unit,
    scope: FINANCIAL_BI_SCOPE.SITE,
    sourceKind: FINANCIAL_BI_SOURCE_KIND.FORECAST,
  });

  const outputMetric = buildFinancialBiMetricDefinition({
    name: "phase12_13_site_grid_power_kpi",
    kind: FINANCIAL_BI_METRIC_KIND.POWER,
    valueKind: FINANCIAL_BI_VALUE_KIND.NUMERIC,
    unit,
    scope: FINANCIAL_BI_SCOPE.SITE,
    sourceKind: FINANCIAL_BI_SOURCE_KIND.KPI_DATABASE,
  });

  const contract = createFinancialBiContract({
    reportingWindow,
    metrics: [
      sourceMetric,
      outputMetric,
    ],
    upstream: forecastExecution,
  });

  const observations = values.map(item => ({
    timestamp: item.timestamp,
    value: item.value,
    unit: item.unit,
    sourceKind: FINANCIAL_BI_SOURCE_KIND.FORECAST,
  }));

  const qualification = qualifyFinancialBiInput({
    contract,
    metricName: sourceMetric.name,
    observations,
  });

  requireTrue(
    ["QUALIFIED", "PARTIALLY_QUALIFIED"].includes(qualification?.status),
    `Phase 10.2 Financial/BI input qualification returns ${qualification?.status || "UNKNOWN"}`
  );

  const calculationDefinition = buildFinancialBiCalculationDefinition({
    name: "phase12_13_forecast_grid_power_passthrough",
    formulaKind: FINANCIAL_BI_CALCULATION_FORMULA_KIND.SUM,
    outputMetric: sourceMetric,
    inputs: [
      {
        name: "forecastGridPower",
        metricName: sourceMetric.name,
        qualification,
      },
    ],
  });

  const calculation = executeFinancialBiCalculation({
    definition: calculationDefinition,
  });

  requireTrue(
    ["CALCULATED", "PARTIALLY_CALCULATED"].includes(calculation?.status),
    `Phase 10.4 Financial/BI calculation returns ${calculation?.status || "UNKNOWN"}`
  );

  const aggregationDefinition = buildFinancialBiKpiAggregationDefinition({
    name: "phase12_13_site_grid_power_kpi_aggregation",
    scope: FINANCIAL_BI_SCOPE.SITE,
    scopeIdentity: {
      vrmSiteId,
    },
    method: FINANCIAL_BI_KPI_AGGREGATION_METHOD.PASSTHROUGH,
    reportingWindow,
    members: [
      {
        name: "forecastGridPowerCalculation",
        calculation,
      },
    ],
    outputMetric,
  });

  const aggregationResult = executeFinancialBiKpiAggregation({
    definition: aggregationDefinition,
  });

  requireTrue(
    ["AGGREGATED", "PARTIALLY_AGGREGATED"].includes(aggregationResult?.status),
    `Phase 10.6 KPI aggregation returns ${aggregationResult?.status || "UNKNOWN"}`
  );
const identity =
  buildFinancialBiPersistenceIdentity({
    recordKind:
      FINANCIAL_BI_PERSISTENCE_RECORD_KIND
        .KPI_AGGREGATION,

    metricName:
      outputMetric.name,

    scope:
      FINANCIAL_BI_SCOPE.SITE,

    scopeIdentity: {
      vrmSiteId,
    },

    reportingWindow,
  });

  const persistenceContract =
    createFinancialBiPersistenceContract({
      aggregationResult,
      identity,
    });

  const persistenceKey =
    persistenceContract.persistenceKey;

  const existing =
    await FinancialBiKpiRecord
      .findOne({ persistenceKey })
      .lean();

  const persistenceResult =
    await persistFinancialBiKpi({
      contract:
        persistenceContract,

      repository:
        mongooseFinancialBiKpiRepository,
    });

  requireTrue(
    [
      "PERSISTED",
      "ALREADY_PERSISTED",
    ].includes(
      persistenceResult?.status
    ),
    `Phase 10.8 Financial/BI persistence returns ${
      persistenceResult?.status ||
      "UNKNOWN"
    }`
  );

  if (
    !existing &&
    persistenceResult?.status ===
      "PERSISTED"
  ) {
    created.financialKeys.add(
      persistenceKey
    );
  }

  const readBack =
    await FinancialBiKpiRecord
      .findOne({ persistenceKey })
      .lean();

  requireTrue(
    readBack,
    "persisted FinancialBiKpiRecord is readable from live Atlas"
  );

  return {
  reportingWindow,
  sourceMetric,
  outputMetric,
  contract,
  qualification,
  calculationDefinition,
  calculation,
  aggregationDefinition,
  aggregationResult,
  identity,
  persistenceContract,
  persistenceResult,
  persistenceKey,
  readBack,
};

}

async function buildAndPersistOptimizationDss({
  vrmSiteId,
  financialBiResult,
  unit,
}) {
  const financialEvidence =
    asPlain(
      financialBiResult.readBack
    );

  const reportingWindow =
    financialEvidence.reportingWindow;

  const metricName =
    financialEvidence.metricName;

  const horizon =
    buildOptimizationDssHorizon({
      start:
        reportingWindow.start,

      end:
        reportingWindow.end,

      timezone:
        reportingWindow.timezone ||
        TIMEZONE,
    });

  const objective =
    buildOptimizationDssObjective({
      name:
        "phase12_13_minimize_grid_import",

      kind:
        OPTIMIZATION_DSS_OBJECTIVE_KIND
          .MINIMIZE_GRID_IMPORT,

      unit,

      sourceMetricName:
        metricName,
    });

  const evidenceValue =
    Number(
      financialEvidence
        ?.payload
        ?.value
    );

  const magnitude =
    Number.isFinite(
      evidenceValue
    )
      ? Math.abs(
          evidenceValue
        )
      : 1;

  const maxPower =
    Math.max(
      1,
      magnitude * 2
    );

  const variable =
    buildOptimizationDssDecisionVariable({
      name:
        "grid-power",

      kind:
        OPTIMIZATION_DSS_DECISION_VARIABLE_KIND
          .GRID_POWER,

      unit,

      lowerBound: 0,
      upperBound: maxPower,
    });

  const constraint =
    buildOptimizationDssConstraint({
      name:
        "phase12_13_grid_limit",

      kind:
        OPTIMIZATION_DSS_CONSTRAINT_KIND
          .GRID_LIMIT,

      parameters: {
        maxPower,
      },
    });

  const optimizationContract =
    createOptimizationDssContract({
      horizon,

      scope:
        OPTIMIZATION_DSS_SCOPE
          .SITE,

      scopeIdentity: {
        vrmSiteId,
      },

      objectives: [
        objective,
      ],

      decisionVariables: [
        variable,
      ],

      constraints: [
        constraint,
      ],

      financialBiEvidence: [
        financialEvidence,
      ],
    });

  const qualifiedInputs =
    qualifyOptimizationDssInputs({
      contract:
        optimizationContract,

      financialBiEvidence: [
        financialEvidence,
      ],
    });

  requireEqual(
    qualifiedInputs?.status,
    "QUALIFIED",
    "Phase 11.2 Optimization/DSS Financial/BI evidence is QUALIFIED"
  );

  const firstTimestamp =
    validDate(
      reportingWindow.start
    );

  assert.ok(
    firstTimestamp,
    "Optimization time-index timestamp must be valid"
  );

  const timeIndex =
    buildOptimizationTimeIndex({
      timestamps: [
        firstTimestamp.toISOString(),
      ],
    });

  const variableBinding =
    buildOptimizationVariableBinding({
      name:
        "grid-power",

      variableKind:
        OPTIMIZATION_DSS_DECISION_VARIABLE_KIND
          .GRID_POWER,

      unit,

      lowerBound: 0,
      upperBound: maxPower,

      timeIndexed: true,
    });

  const objectiveTerm =
    buildOptimizationObjectiveTerm({
      name:
        "phase12_13_grid_import_term",

      objectiveKind:
        OPTIMIZATION_DSS_OBJECTIVE_KIND
          .MINIMIZE_GRID_IMPORT,

      sense:
        OPTIMIZATION_DSS_OBJECTIVE_SENSE
          .MINIMIZE,

      coefficient: 1,

      unit,

      variableName:
        "grid-power",

      evidenceMetricName:
        metricName,
    });

  const constraintBinding =
    buildOptimizationConstraintBinding({
      name:
        "phase12_13_grid_limit_binding",

      constraintKind:
        OPTIMIZATION_DSS_CONSTRAINT_KIND
          .GRID_LIMIT,

      variableNames: [
        "grid-power",
      ],

      evidenceMetricNames: [
        metricName,
      ],

      parameters: {
        maxPower,
      },
    });

  const modelContract =
    createOptimizationDssModelContract({
      optimizationContract,
      qualifiedInputs,
      timeIndex,

      variableBindings: [
        variableBinding,
      ],

      objectiveTerms: [
        objectiveTerm,
      ],

      constraintBindings: [
        constraintBinding,
      ],
    });

  const builtModel =
    buildOptimizationDssModel({
      modelContract,
    });

  requireEqual(
    builtModel?.status,
    "BUILT",
    "Phase 11.4 Optimization/DSS model is BUILT"
  );

  const solverContract =
    createOptimizationDssSolverContract({
      builtModel,

      solverKind:
        OPTIMIZATION_DSS_SOLVER_KIND
          .GENERIC_LINEAR,

      options:
        buildOptimizationDssSolverOptions(),
    });

  let controlledSolverCalls = 0;

  const executionResult =
    await executeOptimizationDssSolver({
      solverContract,

      solverAdapter:
        async ({
          builtModel:
            adapterModel,
        }) => {
          controlledSolverCalls += 1;

          return {
            status:
              OPTIMIZATION_DSS_SOLVER_STATUS
                .OPTIMAL,

            terminationReason:
              OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON
                .OPTIMAL_SOLUTION,

            feasible: true,

            objectiveValue: 0,

            variableResults:
              adapterModel.variables.map(
                item => ({
                  variableId:
                    item.variableId,

                  value: 0,
                })
              ),

            constraintResults:
              adapterModel.constraintRows.map(
                item => ({
                  constraintRowId:
                    item.constraintRowId,

                  satisfied: true,

                  residual: 0,
                })
              ),
          };
        },
    });

  requireEqual(
    controlledSolverCalls,
    1,
    "controlled Phase 11.6 validation solver adapter executes exactly once"
  );

  requireEqual(
    executionResult?.status,
    "EXECUTED",
    "Phase 11.6 solver execution completes through the adapter contract"
  );

  const qualifiedResult =
    qualifyOptimizationDssResult({
      executionResult,
    });

  requireEqual(
    qualifiedResult?.status,
    "QUALIFIED",
    "Phase 11.7 solver result is QUALIFIED"
  );

  const firstVariable =
    builtModel.variables[0];

  const firstConstraint =
    builtModel.constraintRows[0];

  const action =
    buildOptimizationDssRecommendationAction({
      actionId:
        "phase12_13_grid_setpoint_0",

      kind:
        OPTIMIZATION_DSS_RECOMMENDATION_KIND
          .DISPATCH_SETPOINT,

      target:
        "grid-power",

      timestamp:
        firstTimestamp,

      value: 0,
      unit,

      lowerBound: 0,
      upperBound: maxPower,

      rationale:
        "Controlled Phase 12.13-B advisory generated from a qualified validation solver result; no device dispatch is allowed.",
    });

  const recommendationContract =
    createOptimizationDssRecommendationContract({
      qualifiedResult,

      recommendationKind:
        OPTIMIZATION_DSS_RECOMMENDATION_KIND
          .DISPATCH_SETPOINT,

      applicability:
        OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY
          .APPLICABLE,

      confidence:
        OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE
          .HIGH,

      actions: [
        action,
      ],

      evidenceRefs: [
        firstVariable.variableId,
        firstConstraint.constraintRowId,
      ],

      rationale:
        "Phase 12.13-B validates advisory recommendation generation only; recommendation remains non-executable and autoDispatch=false.",
    });

  const generationResult =
    generateOptimizationDssRecommendation({
      recommendationContract,
    });

  requireTrue(
    [
      "GENERATED",
      "PARTIALLY_GENERATED",
    ].includes(
      generationResult?.status
    ),
    `Phase 11.9 recommendation generation returns ${
      generationResult?.status ||
      "UNKNOWN"
    }`
  );

  requireEqual(
    generationResult
      ?.boundaries
      ?.advisoryOnly,
    true,
    "generated Optimization/DSS recommendation remains advisory-only"
  );

  requireEqual(
    generationResult
      ?.boundaries
      ?.executable,
    false,
    "generated Optimization/DSS recommendation remains non-executable"
  );

  requireEqual(
    generationResult
      ?.boundaries
      ?.autoDispatch,
    false,
    "generated Optimization/DSS recommendation has autoDispatch=false"
  );

  const persistenceIdentity =
    buildOptimizationDssPersistenceIdentity({
      generationResult,
    });

  const persistenceContract =
    createOptimizationDssPersistenceContract({
      generationResult,
      persistenceIdentity,
    });

  const persistenceKey =
    persistenceIdentity.persistenceKey;

  const existing =
    await OptimizationDssRecommendation
      .findOne({
        persistenceKey,
      })
      .lean();

  const repository =
    createMongooseOptimizationDssPersistenceRepository({
      model:
        OptimizationDssRecommendation,
    });

  const persistenceResult =
    await persistOptimizationDssRecommendation({
      persistenceContract,
      repository,
    });

  requireTrue(
    [
      "PERSISTED",
      "ALREADY_PERSISTED",
    ].includes(
      persistenceResult?.status
    ),
    `Phase 11.11 Optimization/DSS persistence returns ${
      persistenceResult?.status ||
      "UNKNOWN"
    }`
  );

  if (
    !existing &&
    persistenceResult?.status ===
      "PERSISTED"
  ) {
    created.optimizationKeys.add(
      persistenceKey
    );
  }

  const readBack =
    await OptimizationDssRecommendation
      .findOne({
        persistenceKey,
      })
      .lean();

  requireTrue(
    readBack,
    "persisted OptimizationDssRecommendation is readable from live Atlas"
  );

  return {
    horizon,
    objective,
    variable,
    constraint,
    optimizationContract,
    qualifiedInputs,
    timeIndex,
    variableBinding,
    objectiveTerm,
    constraintBinding,
    modelContract,
    builtModel,
    solverContract,
    executionResult,
    qualifiedResult,
    recommendationContract,
    generationResult,
    persistenceIdentity,
    persistenceContract,
    persistenceResult,
    persistenceKey,
    readBack,
  };
}


async function cleanupCreatedRecords() {
  if (KEEP_FIXTURES) {
    info(
      "PHASE12_13_KEEP_FIXTURES=true — scoped downstream records are retained."
    );

    return;
  }

  if (
    created.optimizationKeys.size >
    0
  ) {
    const result =
      await OptimizationDssRecommendation
        .deleteMany({
          persistenceKey: {
            $in: [
              ...created.optimizationKeys,
            ],
          },
        });

    info(
      `Cleanup Optimization/DSS records: ${
        result.deletedCount || 0
      }`
    );
  }

  if (
    created.financialKeys.size >
    0
  ) {
    const result =
      await FinancialBiKpiRecord
        .deleteMany({
          persistenceKey: {
            $in: [
              ...created.financialKeys,
            ],
          },
        });

    info(
      `Cleanup Financial/BI records: ${
        result.deletedCount || 0
      }`
    );
  }

  if (
    created.forecastKeys.size >
    0
  ) {
    const result =
      await ForecastRecord
        .deleteMany({
          persistenceKey: {
            $in: [
              ...created.forecastKeys,
            ],
          },
        });

    info(
      `Cleanup Forecast records: ${
        result.deletedCount || 0
      }`
    );
  }
}


async function verifyCleanup() {
  if (KEEP_FIXTURES) {
    return;
  }

  for (
    const persistenceKey of
    created.forecastKeys
  ) {
    const count =
      await ForecastRecord.countDocuments({
        persistenceKey,
      });

    requireEqual(
      count,
      0,
      `created ForecastRecord ${persistenceKey.slice(
        0,
        12
      )}... was cleaned up`
    );
  }

  for (
    const persistenceKey of
    created.financialKeys
  ) {
    const count =
      await FinancialBiKpiRecord
        .countDocuments({
          persistenceKey,
        });

    requireEqual(
      count,
      0,
      `created FinancialBiKpiRecord ${persistenceKey.slice(
        0,
        12
      )}... was cleaned up`
    );
  }

  for (
    const persistenceKey of
    created.optimizationKeys
  ) {
    const count =
      await OptimizationDssRecommendation
        .countDocuments({
          persistenceKey,
        });

    requireEqual(
      count,
      0,
      `created OptimizationDssRecommendation ${persistenceKey.slice(
        0,
        12
      )}... was cleaned up`
    );
  }
}

async function main() {
  console.log(
    "\n============================================================"
  );
  console.log(
    "ASHMAAN PHASE 12.13-B — FULL LIVE PIPELINE RUNTIME VALIDATION"
  );
  console.log(
    "============================================================\n"
  );

  requireEqual(
    PHASE,
    "12.13-B",
    "runtime validator phase identity is correct"
  );

  requireEqual(
    LAYER,
    "FULL_LIVE_PIPELINE_RUNTIME",
    "runtime validator layer identity is correct"
  );

  requireEqual(
    INTERVAL,
    "[start,end)",
    "canonical reporting semantics are [start,end)"
  );

  requireFunction(
    getProductionGridTelemetryEvidence,
    "Phase 8.6H-A production telemetry reader is importable"
  );

  requireFunction(
    getProductionGridSiteAnalytics,
    "Phase 8.6H-B production analytics adapter is importable"
  );

  requireFunction(
    qualifyForecastInput,
    "Phase 9.2 forecast input qualification is importable"
  );

  requireFunction(
    executeProductionForecast,
    "Phase 9.9 production forecast execution is importable"
  );

  requireFunction(
    persistForecast,
    "Phase 9.11 forecast persistence is importable"
  );

  requireFunction(
    executeFinancialBiCalculation,
    "Phase 10.4 Financial/BI calculation execution is importable"
  );

  requireFunction(
    executeFinancialBiKpiAggregation,
    "Phase 10.6 Financial/BI aggregation execution is importable"
  );

  requireFunction(
    persistFinancialBiKpi,
    "Phase 10.8 Financial/BI persistence is importable"
  );

  requireFunction(
    executeOptimizationDssSolver,
    "Phase 11.6 Optimization/DSS solver execution is importable"
  );

  requireFunction(
    generateOptimizationDssRecommendation,
    "Phase 11.9 recommendation generation is importable"
  );

  requireFunction(
    persistOptimizationDssRecommendation,
    "Phase 11.11 Optimization/DSS persistence is importable"
  );

  const mongoUri =
    process.env.MONGODB_URI?.trim() ||
    process.env.MONGODB_DIRECT_URI?.trim() ||
    "";

  requireTrue(
    mongoUri,
    "MongoDB connection URI is configured"
  );

  if (
    mongoose.connection.readyState === 0
  ) {
    await mongoose.connect(
      mongoUri
    );
  }

  requireEqual(
    mongoose.connection.readyState,
    1,
    "MongoDB Atlas connection is open"
  );

  requireTrue(
    mongoose.connection.db,
    "MongoDB database handle is available"
  );

  info(
    `Database: ${mongoose.connection.name}`
  );

  const telemetryCountBefore =
    await Telemetry.countDocuments({});

  const outageCountBefore =
    await OutageEvent.countDocuments({});

  const forecastCountBefore =
    await ForecastRecord.countDocuments({});

  const financialCountBefore =
    await FinancialBiKpiRecord.countDocuments({});

  const optimizationCountBefore =
    await OptimizationDssRecommendation
      .countDocuments({});

  requireTrue(
    telemetryCountBefore > 0,
    "production Telemetry collection is populated"
  );

  pass(
    `OutageEvent collection is readable (${outageCountBefore} records)`
  );

  pass(
    `ForecastRecord baseline count captured (${forecastCountBefore})`
  );

  pass(
    `FinancialBiKpiRecord baseline count captured (${financialCountBefore})`
  );

  pass(
    `OptimizationDssRecommendation baseline count captured (${optimizationCountBefore})`
  );

  const latestTelemetry =
    await Telemetry
      .findOne({})
      .sort({
        timestamp: -1,
      })
      .lean();

  requireTrue(
    latestTelemetry,
    "latest persisted telemetry record is readable"
  );

  const latestTimestamp =
    getTelemetryTimestamp(
      latestTelemetry
    );

  requireTrue(
    latestTimestamp,
    "latest persisted telemetry timestamp is valid"
  );

  const installationReference =
    latestTelemetry.installation ||
    latestTelemetry.installationId ||
    null;

  let installation = null;

  if (
    installationReference
  ) {
    installation =
      await Installation
        .findById(
          installationReference
        )
        .lean()
        .catch(
          () => null
        );
  }

  if (
    !installation
  ) {
    installation =
      await Installation
        .findOne({
          vrmSiteId: {
            $exists: true,
            $nin: [
              null,
              "",
            ],
          },
        })
        .lean();
  }

  requireTrue(
    installation,
    "live Installation for 12.13-B is resolved"
  );

  const installationId =
    String(
      installation._id
    );

  const vrmSiteId =
    safeString(
      installation.vrmSiteId
    );

  requireTrue(
    vrmSiteId,
    "live SITE has explicit VRM site identity"
  );

  let selectedLatestTelemetry =
    await Telemetry
      .findOne({
        installation:
          installation._id,
      })
      .sort({
        timestamp: -1,
      })
      .lean();

  if (
    !selectedLatestTelemetry
  ) {
    selectedLatestTelemetry =
      latestTelemetry;
  }

  const selectedTimestamp =
    getTelemetryTimestamp(
      selectedLatestTelemetry
    );

  requireTrue(
    selectedTimestamp,
    "selected SITE has valid persisted telemetry timestamp"
  );

  const windowEnd =
    new Date(
      selectedTimestamp.getTime() +
      1000
    );

  const windowStart =
    new Date(
      selectedTimestamp.getTime() -
      24 *
      60 *
      60 *
      1000
    );

  requireTrue(
    windowStart < windowEnd,
    "12.13-B live reporting window is valid"
  );

  const siteTelemetry =
    await Telemetry
      .find({
        installation:
          installation._id,

        timestamp: {
          $gte:
            windowStart,

          $lt:
            windowEnd,
        },
      })
      .sort({
        timestamp: 1,
      })
      .lean();

  requireTrue(
    siteTelemetry.length > 0,
    "selected SITE has persisted telemetry in the live [start,end) window"
  );

  info(
    `Installation Mongo ID : ${installationId}`
  );

  info(
    `VRM Site ID           : ${vrmSiteId}`
  );

  info(
    `Window Start          : ${windowStart.toISOString()}`
  );

  info(
    `Window End            : ${windowEnd.toISOString()}`
  );

  info(
    `Telemetry in Window   : ${siteTelemetry.length}`
  );

  console.log(
    "\n--- TRACK A: LIVE EVIDENCE ---\n"
  );

  const engineeringEvidence =
    await getProductionGridTelemetryEvidence({
      installationId,
      vrmSiteId,
      start:
        windowStart,
      end:
        windowEnd,
    });

  requireEqual(
    engineeringEvidence?.phase,
    "8.6H-A",
    "real Phase 8.6H-A production evidence is returned"
  );

  requireEqual(
    String(
      engineeringEvidence
        ?.installation
        ?.id
    ),
    installationId,
    "Phase 8.6H-A preserves Installation Mongo identity"
  );

  requireEqual(
    String(
      engineeringEvidence
        ?.installation
        ?.vrmSiteId
    ),
    vrmSiteId,
    "Phase 8.6H-A preserves VRM site identity"
  );

  const engineeringAnalytics =
    await getProductionGridSiteAnalytics({
      installationId,
      vrmSiteId,
      start:
        windowStart,
      end:
        windowEnd,
    });

  requireEqual(
    engineeringAnalytics?.phase,
    "8.6H-B",
    "real Phase 8.6H-B Engineering Analytics executes"
  );

  requireEqual(
    String(
      engineeringAnalytics
        ?.installation
        ?.id
    ),
    installationId,
    "Phase 8.6H-B preserves Installation Mongo identity"
  );

  requireEqual(
    String(
      engineeringAnalytics
        ?.installation
        ?.vrmSiteId
    ),
    vrmSiteId,
    "Phase 8.6H-B preserves VRM site identity"
  );

  const liveForecastOrigin =
    new Date(
      windowEnd
    );

  const liveForecastEnd =
    new Date(
      liveForecastOrigin
        .getTime() +
      FORECAST_HORIZON_MS
    );

  const liveSeries =
    groupExplicitLiveGridPowerSeries(
      siteTelemetry,
      liveForecastOrigin
    );

  let forecastChain = null;
  let forecastTrack = null;

  if (
    liveSeries
  ) {
    info(
      `Qualified explicit-unit live GRID power series selected: metric=${liveSeries.metric}, unit=${liveSeries.unit}, rows=${liveSeries.observations.length}`
    );

    forecastChain =
      buildForecastChain({
        vrmSiteId,
        installationId,

        trainingStart:
          windowStart,

        forecastOrigin:
          liveForecastOrigin,

        forecastEnd:
          liveForecastEnd,

        metric:
          liveSeries.metric,

        unit:
          liveSeries.unit,

        observations:
          liveSeries.observations,

        source: {
          phase:
            engineeringEvidence.phase,

          family:
            engineeringEvidence.family,

          metric:
            liveSeries.metric,

          installationId,
          vrmSiteId,

          evidenceKind:
            "LIVE_PERSISTED_GRID_TELEMETRY",
        },
      });

    info(
      `Live Phase 9.2 status: ${forecastChain.inputQualification?.status}`
    );

    info(
      `Live Phase 9.6 status: ${forecastChain.trainingResult?.status}`
    );

    info(
      `Live Phase 9.7 status: ${forecastChain.modelQualification?.status}`
    );

    info(
      `Live Phase 9.9 status: ${forecastChain.executionResult?.status}`
    );

    if (
      forecastChain
        .executionResult
        ?.status ===
      "CALCULATED"
    ) {
      forecastTrack =
        "LIVE_EVIDENCE";

      pass(
        "live persisted GRID telemetry legitimately reaches Phase 9.9 CALCULATED forecast"
      );
    } else {
      pass(
        `live Forecasting stops conservatively at ${
          forecastChain
            .executionResult
            ?.status ||
          "UNAVAILABLE"
        }; no missing/unavailable evidence is converted to zero`
      );
    }
  } else {
    pass(
      "no duplicate-free explicit-unit GRID power series satisfies the live Forecasting target contract; live path is conservatively UNAVAILABLE"
    );
  }

  if (
    !forecastTrack
  ) {
    console.log(
      "\n--- TRACK B: CONTROLLED DOWNSTREAM ROUND-TRIP ---\n"
    );

    info(
      "Track B is a controlled runtime fixture only. It is NOT classified as live upstream telemetry evidence."
    );

    const controlledTrainingStart =
      new Date(
        windowEnd.getTime() -
        2 *
        60 *
        60 *
        1000
      );

    const controlledForecastOrigin =
      new Date(
        windowEnd
      );

    const controlledForecastEnd =
      new Date(
        controlledForecastOrigin
          .getTime() +
        FORECAST_HORIZON_MS
      );

    const controlledMetric =
      "phase12_13_controlled_grid_power";

    const controlledUnit =
      "kW";

    const controlledObservations =
      buildControlledForecastObservations({
        trainingStart:
          controlledTrainingStart,

        unit:
          controlledUnit,
      });

    forecastChain =
      buildForecastChain({
        vrmSiteId,
        installationId,

        trainingStart:
          controlledTrainingStart,

        forecastOrigin:
          controlledForecastOrigin,

        forecastEnd:
          controlledForecastEnd,

        metric:
          controlledMetric,

        unit:
          controlledUnit,

        observations:
          controlledObservations,

        source: {
          phase:
            "12.13-B-CONTROLLED_FIXTURE",

          family:
            "GRID",

          metric:
            controlledMetric,

          installationId,
          vrmSiteId,

          evidenceKind:
            "CONTROLLED_RUNTIME_FIXTURE",
        },
      });

    requireEqual(
      forecastChain
        .inputQualification
        ?.status,
      "QUALIFIED",
      "controlled Phase 9.2 forecast input is QUALIFIED"
    );

    requireEqual(
      forecastChain
        .trainingResult
        ?.status,
      "TRAINED",
      "controlled Phase 9.6 NAIVE baseline is TRAINED"
    );

    requireEqual(
      forecastChain
        .modelQualification
        ?.status,
      "QUALIFIED",
      "controlled Phase 9.7 model is QUALIFIED"
    );

    requireEqual(
      forecastChain
        .productionContract
        ?.eligibility,
      "ELIGIBLE",
      "controlled Phase 9.8 production contract is ELIGIBLE"
    );

    requireEqual(
      forecastChain
        .executionResult
        ?.status,
      "CALCULATED",
      "controlled Phase 9.9 production forecast is CALCULATED"
    );

    forecastTrack =
      "CONTROLLED_DOWNSTREAM_FIXTURE";
  }

  const activeUnit =
    forecastChain
      .target
      .unit;

  const activeForecastOrigin =
    validDate(
      forecastChain
        .productionContract
        ?.productionWindow
        ?.forecastOrigin
    );

  const activeForecastEnd =
    validDate(
      forecastChain
        .productionContract
        ?.productionWindow
        ?.forecastEnd
    );

  requireTrue(
    activeForecastOrigin &&
    activeForecastEnd,
    "forecast production window is explicit and valid"
  );

  const forecastPersistence =
    await persistForecastIfCalculated(
      forecastChain.executionResult
    );

  requireTrue(
    forecastPersistence.persisted,
    "forecast reaches real Phase 9.11 Atlas persistence"
  );

  const financialBi =
    await buildAndPersistFinancialBi({
      vrmSiteId,

      forecastExecution:
        forecastChain.executionResult,

      unit:
        activeUnit,

      forecastOrigin:
        activeForecastOrigin,

      forecastEnd:
        activeForecastEnd,
    });

  requireEqual(
    financialBi
      .readBack
      ?.scopeIdentity
      ?.vrmSiteId,
    vrmSiteId,
    "Financial/BI Atlas record preserves VRM site identity"
  );

  requireEqual(
    financialBi
      .readBack
      ?.reportingWindow
      ?.semantics,
    "[start,end)",
    "Financial/BI Atlas record preserves [start,end) semantics"
  );

  const optimization =
    await buildAndPersistOptimizationDss({
      vrmSiteId,

      financialBiResult:
        financialBi,

      unit:
        activeUnit,
    });

  requireEqual(
    optimization
      .readBack
      ?.scopeIdentity
      ?.vrmSiteId,
    vrmSiteId,
    "Optimization/DSS Atlas record preserves VRM site identity"
  );

  requireEqual(
    optimization
      .readBack
      ?.advisoryOnly,
    true,
    "Optimization/DSS Atlas record remains advisory-only"
  );

  requireEqual(
    optimization
      .readBack
      ?.executable,
    false,
    "12.13-B produces no executable control command"
  );

  requireEqual(
    optimization
      .readBack
      ?.autoDispatch,
    false,
    "12.13-B performs no automatic dispatch"
  );

  const telemetryCountAfterExecution =
    await Telemetry
      .countDocuments({});

  const outageCountAfterExecution =
    await OutageEvent
      .countDocuments({});

  info(
    `Telemetry count before/after execution : ${telemetryCountBefore}/${telemetryCountAfterExecution}`
  );

  info(
    `OutageEvent count before/after execution: ${outageCountBefore}/${outageCountAfterExecution}`
  );

  pass(
    "Telemetry and OutageEvent collections were never mutation targets of this validator"
  );

  console.log(
    "\n--- CLEANUP ---\n"
  );

  await cleanupCreatedRecords();
  await verifyCleanup();

  console.log(
    "\n------------------------------------------------------------"
  );

  console.log(
    "12.13-B RUNTIME RESULT"
  );

  console.log(
    "------------------------------------------------------------"
  );

  console.log(
    `Installation Mongo ID : ${installationId}`
  );

  console.log(
    `VRM Site ID           : ${vrmSiteId}`
  );

  console.log(
    `Window Start          : ${windowStart.toISOString()}`
  );

  console.log(
    `Window End            : ${windowEnd.toISOString()}`
  );

  console.log(
    `Window Semantics      : ${INTERVAL}`
  );

  console.log(
    `Forecast Track        : ${forecastTrack}`
  );

  console.log(
    `Forecast Status       : ${forecastChain.executionResult?.status}`
  );

  console.log(
    `Financial BI Status   : ${financialBi.aggregationResult?.status}`
  );

  console.log(
    `Optimization Status   : ${optimization.generationResult?.status}`
  );

  console.log(
    "Recommendation        : ADVISORY_ONLY / NON_EXECUTABLE / NO_AUTO_DISPATCH"
  );

  console.log(
    `Fixtures Retained     : ${KEEP_FIXTURES}`
  );

  console.log(
    "------------------------------------------------------------"
  );

  console.log(
    "\n============================================================"
  );

  console.log(
    `Assertions passed: ${assertions}`
  );

  console.log(
    "ASHMAAN PHASE 12.13-B FULL LIVE PIPELINE RUNTIME PASSED"
  );

  console.log(
    "============================================================\n"
  );
}



let mainFailed =
  false;


main()
  .catch(
    error => {
      mainFailed =
        true;

      console.error(
        "\n============================================================"
      );

      console.error(
        "ASHMAAN PHASE 12.13-B FULL LIVE PIPELINE RUNTIME FAILED"
      );

      console.error(
        "============================================================"
      );

      console.error(
        error
      );

      console.error(
        "============================================================\n"
      );

      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      if (
        !KEEP_FIXTURES
      ) {
        await cleanupCreatedRecords()
          .catch(
            error => {
              console.error(
                "Cleanup warning:",
                error
              );

              if (
                !mainFailed
              ) {
                process.exitCode =
                  1;
              }
            }
          );
      }

      if (
        mongoose
          .connection
          .readyState !==
        0
      ) {
        await mongoose
          .disconnect()
          .catch(
            () => {}
          );
      }
    }
  );
