// services/optimizationDss/forecastingDssEvidenceAdapter.js
import ForecastRecord
  from "../../models/ForecastRecord.js";

import {
  createForecastingApiService,
} from "../forecasting/forecastingApiService.js";


export const FORECASTING_DSS_EVIDENCE_ADAPTER_PHASE =
  "11.2B";

export const FORECASTING_DSS_EVIDENCE_ADAPTER_LAYER =
  "OPTIMIZATION_DSS";


export const FORECASTING_DSS_EVIDENCE_STATUS =
  Object.freeze({
    QUALIFIED:
      "QUALIFIED",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const FORECASTING_DSS_EVIDENCE_REASON =
  Object.freeze({
    QUALIFIED:
      "QUALIFIED",

    FORECAST_NOT_FOUND:
      "FORECAST_NOT_FOUND",

    FORECAST_IDENTITY_MISMATCH:
      "FORECAST_IDENTITY_MISMATCH",

    FORECAST_OUTPUT_TYPE_UNSUPPORTED:
      "FORECAST_OUTPUT_TYPE_UNSUPPORTED",

    FORECAST_VALUES_EMPTY:
      "FORECAST_VALUES_EMPTY",

    FORECAST_VALUE_INVALID:
      "FORECAST_VALUE_INVALID",

    FORECAST_UNIT_MISSING:
      "FORECAST_UNIT_MISSING",

    FORECAST_UNIT_INCONSISTENT:
      "FORECAST_UNIT_INCONSISTENT",

    FORECAST_WINDOW_INVALID:
      "FORECAST_WINDOW_INVALID",
  });


export const FORECASTING_DSS_EVIDENCE_METRIC =
  Object.freeze({
    SITE_LOAD_POWER:
      "SITE_LOAD_POWER",
  });


function unavailable({
  vrmSiteId,
  reason,
  forecastRecord = null,
} = {}) {
  return Object.freeze({
    phase:
      FORECASTING_DSS_EVIDENCE_ADAPTER_PHASE,

    layer:
      FORECASTING_DSS_EVIDENCE_ADAPTER_LAYER,

    status:
      FORECASTING_DSS_EVIDENCE_STATUS
        .UNAVAILABLE,

    reason,

    metricName:
      FORECASTING_DSS_EVIDENCE_METRIC
        .SITE_LOAD_POWER,

    vrmSiteId:
      String(vrmSiteId),

    unit:
      null,

    window:
      forecastRecord?.window ??
      null,

    values:
      Object.freeze([]),

    sourceForecast:
      forecastRecord,

    boundaries:
      Object.freeze({
        readOnly:
          true,

        missingMeansZero:
          false,

        unavailableMeansZero:
          false,

        unitInferenceAllowed:
          false,

        timestampInferenceAllowed:
          false,

        interpolationAllowed:
          false,

        resamplingAllowed:
          false,

        zeroFillAllowed:
          false,

        forecastMutationAllowed:
          false,

        financialBiMutationAllowed:
          false,

        optimizationExecuted:
          false,
      }),
  });
}


export async function getSiteLoadForecastDssEvidence({
  vrmSiteId,
  forecastingApiService = null,
} = {}) {
  if (
    vrmSiteId === undefined ||
    vrmSiteId === null ||
    String(vrmSiteId).trim() === ""
  ) {
    throw new Error(
      "VRM_SITE_ID_REQUIRED"
    );
  }

  const normalizedVrmSiteId =
    String(vrmSiteId);

  const apiService =
    forecastingApiService ??
    createForecastingApiService({
      ForecastRecordModel:
        ForecastRecord,
    });

  const record =
    await apiService
      .getLatestSiteTargetForecast({
        vrmSiteId:
          normalizedVrmSiteId,

        targetFamily:
          "SITE_LOAD",

        targetMetric:
          "activePower",
      });

  if (!record) {
    return unavailable({
      vrmSiteId:
        normalizedVrmSiteId,

      reason:
        FORECASTING_DSS_EVIDENCE_REASON
          .FORECAST_NOT_FOUND,
    });
  }

  if (
    String(
      record?.identity?.vrmSiteId
    ) !==
    normalizedVrmSiteId ||
    record?.identity?.targetFamily !==
    "SITE_LOAD" ||
    record?.identity?.targetMetric !==
    "activePower"
  ) {
    return unavailable({
      vrmSiteId:
        normalizedVrmSiteId,

      reason:
        FORECASTING_DSS_EVIDENCE_REASON
          .FORECAST_IDENTITY_MISMATCH,

      forecastRecord:
        record,
    });
  }

  const outputType =
    record?.forecast?.outputType ??
    record?.model?.outputType ??
    record?.identity?.outputType ??
    null;

  if (
    outputType !==
    "POINT"
  ) {
    return unavailable({
      vrmSiteId:
        normalizedVrmSiteId,

      reason:
        FORECASTING_DSS_EVIDENCE_REASON
          .FORECAST_OUTPUT_TYPE_UNSUPPORTED,

      forecastRecord:
        record,
    });
  }

  const rawValues =
    record?.forecast?.values;

  if (
    !Array.isArray(rawValues) ||
    rawValues.length === 0
  ) {
    return unavailable({
      vrmSiteId:
        normalizedVrmSiteId,

      reason:
        FORECASTING_DSS_EVIDENCE_REASON
          .FORECAST_VALUES_EMPTY,

      forecastRecord:
        record,
    });
  }

  const targetUnit =
    record?.target?.unit ??
    null;

  if (
    typeof targetUnit !== "string" ||
    !targetUnit.trim()
  ) {
    return unavailable({
      vrmSiteId:
        normalizedVrmSiteId,

      reason:
        FORECASTING_DSS_EVIDENCE_REASON
          .FORECAST_UNIT_MISSING,

      forecastRecord:
        record,
    });
  }

  const normalizedValues =
    [];

  for (
    const point of
    rawValues
  ) {
    const timestamp =
      point?.timestamp;

    const value =
      point?.value;

    const pointUnit =
      point?.unit ??
      targetUnit;

    const parsedTimestamp =
      new Date(timestamp);

    if (
      Number.isNaN(
        parsedTimestamp.getTime()
      ) ||
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      return unavailable({
        vrmSiteId:
          normalizedVrmSiteId,

        reason:
          FORECASTING_DSS_EVIDENCE_REASON
            .FORECAST_VALUE_INVALID,

        forecastRecord:
          record,
      });
    }

    if (
      pointUnit !==
      targetUnit
    ) {
      return unavailable({
        vrmSiteId:
          normalizedVrmSiteId,

        reason:
          FORECASTING_DSS_EVIDENCE_REASON
            .FORECAST_UNIT_INCONSISTENT,

        forecastRecord:
          record,
      });
    }

    normalizedValues.push(
      Object.freeze({
        timestamp:
          parsedTimestamp
            .toISOString(),

        value,

        unit:
          targetUnit,

        provenance:
          point?.provenance ??
          null,
      })
    );
  }

  const forecastOrigin =
    new Date(
      record?.window
        ?.forecastOrigin
    );

  const forecastEnd =
    new Date(
      record?.window
        ?.forecastEnd
    );

  if (
    Number.isNaN(
      forecastOrigin.getTime()
    ) ||
    Number.isNaN(
      forecastEnd.getTime()
    ) ||
    forecastEnd <=
    forecastOrigin ||
    record?.window?.semantics !==
    "[forecastOrigin,forecastEnd)"
  ) {
    return unavailable({
      vrmSiteId:
        normalizedVrmSiteId,

      reason:
        FORECASTING_DSS_EVIDENCE_REASON
          .FORECAST_WINDOW_INVALID,

      forecastRecord:
        record,
    });
  }

  return Object.freeze({
    phase:
      FORECASTING_DSS_EVIDENCE_ADAPTER_PHASE,

    layer:
      FORECASTING_DSS_EVIDENCE_ADAPTER_LAYER,

    status:
      FORECASTING_DSS_EVIDENCE_STATUS
        .QUALIFIED,

    reason:
      FORECASTING_DSS_EVIDENCE_REASON
        .QUALIFIED,

    metricName:
      FORECASTING_DSS_EVIDENCE_METRIC
        .SITE_LOAD_POWER,

    vrmSiteId:
      normalizedVrmSiteId,

    targetFamily:
      "SITE_LOAD",

    targetMetric:
      "activePower",

    unit:
      targetUnit,

    window:
      Object.freeze({
        forecastOrigin:
          forecastOrigin.toISOString(),

        forecastEnd:
          forecastEnd.toISOString(),

        timezone:
          record?.window?.timezone ??
          null,

        semantics:
          record?.window?.semantics,
      }),

    values:
      Object.freeze(
        normalizedValues
      ),

    valueCount:
      normalizedValues.length,

    source:
      Object.freeze({
        layer:
          "FORECASTING",

        persistenceKey:
          record.persistenceKey ??
          null,

        phase:
          record.phase ??
          null,

        modelName:
          record?.model?.name ??
          record?.identity?.modelName ??
          null,

        modelFamily:
          record?.model?.family ??
          record?.identity?.modelFamily ??
          null,

        outputType,

        persistedAt:
          record.persistedAt ??
          null,
      }),

    sourceForecast:
      record,

    boundaries:
      Object.freeze({
        readOnly:
          true,

        missingMeansZero:
          false,

        unavailableMeansZero:
          false,

        unitInferenceAllowed:
          false,

        timestampInferenceAllowed:
          false,

        interpolationAllowed:
          false,

        resamplingAllowed:
          false,

        zeroFillAllowed:
          false,

        forecastMutationAllowed:
          false,

        financialBiMutationAllowed:
          false,

        optimizationExecuted:
          false,
      }),
  });
}


export default Object.freeze({
  getSiteLoadForecastDssEvidence,
});
