
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
    record?.metricName,
    record?.attributeName,
    record?.name,
    record?.description,
    record?.normalized?.metric,
    record?.meta?.metric,
    record?.metadata?.metric,
    record?.vrmAttributeId,
  ];

  for (
    const candidate of candidates
  ) {
    const metric =
      safeString(candidate);

    if (metric) {
      return metric;
    }
  }

  return null;
}


function isGridPowerMetric(record) {
  const metric =
    getTelemetryMetric(record);

  const deviceType =
    safeString(
      record?.deviceType
    );

  const text = [
    metric,
    deviceType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const gridLike =
    /\bgrid\b|\bac input\b|\bshore\b/.test(
      text
    );

  const powerLike =
    /\bpower\b|\bwatt\b|\bkw\b|\bw\b/.test(
      text
    );

  return (
    gridLike &&
    powerLike
  );
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


function groupExplicitLiveGridPowerSeries(
  telemetryRecords,
  forecastOrigin
) {
  const groups =
    new Map();

  for (
    const raw of telemetryRecords
  ) {
    const record =
      asPlain(raw);

    if (
      !isGridPowerMetric(record)
    ) {
      continue;
    }

    const timestamp =
      getTelemetryTimestamp(record);

    const value =
      getTelemetryValue(record);

    const unit =
      getTelemetryUnit(record);

    const metric =
      getTelemetryMetric(record);

    if (
      !timestamp ||
      timestamp >= forecastOrigin ||
      value === null ||
      !unit ||
      !metric
    ) {
      continue;
    }

    const key =
      `${metric}::${unit}`;

    if (
      !groups.has(key)
    ) {
      groups.set(
        key,
        {
          metric,
          unit,
          observations: [],
          timestamps: new Set(),
          duplicateTimestamp: false,
        }
      );
    }

    const group =
      groups.get(key);

    const timestampKey =
      timestamp.toISOString();

    if (
      group.timestamps.has(
        timestampKey
      )
    ) {
      group.duplicateTimestamp =
        true;

      continue;
    }

    group.timestamps.add(
      timestampKey
    );

    group.observations.push(
      normalizeForecastObservation({
        timestamp,
        value,
        unit,
      })
    );
  }

  const eligible =
    [...groups.values()]
      .filter(group =>
        !group.duplicateTimestamp &&
        group.observations.length >=
          MIN_FORECAST_OBSERVATIONS
      )
      .sort(
        (a, b) =>
          b.observations.length -
          a.observations.length
      );

  if (
    eligible.length === 0
  ) {
    return null;
  }

  const selected =
    eligible[0];

  selected.observations.sort(
    (a, b) =>
      a.timestamp.getTime() -
      b.timestamp.getTime()
  );

  return Object.freeze({
    metric:
      selected.metric,

    unit:
      selected.unit,

    observations:
      Object.freeze(
        [...selected.observations]
      ),
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