// services/optimizationDss/optimizationDssDashboardContract.js

import {
  OPTIMIZATION_DSS_API_CONTRACT_PHASE,
  OPTIMIZATION_DSS_API_BASE_PATH,
  OPTIMIZATION_DSS_API_ENDPOINTS,
} from "./optimizationDssApiContract.js";


export const OPTIMIZATION_DSS_DASHBOARD_CONTRACT_PHASE =
  "11.14";

export const OPTIMIZATION_DSS_DASHBOARD_CONTRACT_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_DASHBOARD_CONTRACT_UPSTREAM_PHASE =
  "11.13";


export const OPTIMIZATION_DSS_DASHBOARD_VIEW =
  Object.freeze({
    RECOMMENDATION_OVERVIEW:
      "RECOMMENDATION_OVERVIEW",

    RECOMMENDATION_TABLE:
      "RECOMMENDATION_TABLE",

    RECOMMENDATION_TIMELINE:
      "RECOMMENDATION_TIMELINE",

    RECOMMENDATION_DETAIL:
      "RECOMMENDATION_DETAIL",
  });


export const OPTIMIZATION_DSS_DASHBOARD_STATE =
  Object.freeze({
    IDLE:
      "IDLE",

    LOADING:
      "LOADING",

    READY:
      "READY",

    EMPTY:
      "EMPTY",

    ERROR:
      "ERROR",
  });


export const OPTIMIZATION_DSS_DASHBOARD_FILTERS =
  Object.freeze([
    "scope",
    "vrmSiteId",
    "fleetId",
    "recommendationKind",
    "generationStatus",
    "applicability",
    "confidence",
    "horizonStart",
    "horizonEnd",
  ]);


export const OPTIMIZATION_DSS_DASHBOARD_TABLE_COLUMNS =
  Object.freeze([
    "persistenceKey",
    "recommendationKind",
    "scope",
    "scopeIdentity",
    "horizonStart",
    "horizonEnd",
    "generationStatus",
    "applicability",
    "confidence",
    "objectiveValue",
    "generatedActionCount",
    "unavailableActionCount",
    "advisoryOnly",
  ]);


export const OPTIMIZATION_DSS_DASHBOARD_TIMELINE =
  Object.freeze({
    xField:
      "timestamp",

    yField:
      "value",

    seriesField:
      "target",

    unitField:
      "unit",

    connectNulls:
      false,

    missingPointBehavior:
      "GAP",

    unavailablePointBehavior:
      "GAP",
  });


export const OPTIMIZATION_DSS_DASHBOARD_API_DEPENDENCY =
  Object.freeze({
    contractPhase:
      OPTIMIZATION_DSS_API_CONTRACT_PHASE,

    basePath:
      OPTIMIZATION_DSS_API_BASE_PATH,

    list:
      Object.freeze({
        method:
          OPTIMIZATION_DSS_API_ENDPOINTS
            .LIST_RECOMMENDATIONS
            .method,

        path:
          OPTIMIZATION_DSS_API_ENDPOINTS
            .LIST_RECOMMENDATIONS
            .fullPath,
      }),

    getByPersistenceKey:
      Object.freeze({
        method:
          OPTIMIZATION_DSS_API_ENDPOINTS
            .GET_RECOMMENDATION
            .method,

        path:
          OPTIMIZATION_DSS_API_ENDPOINTS
            .GET_RECOMMENDATION
            .fullPath,
      }),
  });


export const OPTIMIZATION_DSS_DASHBOARD_DISPLAY =
  Object.freeze({
    unavailableLabel:
      "UNAVAILABLE",

    missingLabel:
      "—",

    zeroLabel:
      "0",

    advisoryBadge:
      "ADVISORY ONLY",

    executableLabel:
      "NON-EXECUTABLE",

    autoDispatchLabel:
      "NO AUTO-DISPATCH",
  });


export const OPTIMIZATION_DSS_DASHBOARD_BOUNDARIES =
  Object.freeze({
    contractOnly:
      true,

    dashboardImplementationIncluded:
      false,

    reactComponentIncluded:
      false,

    apiReadIncluded:
      false,

    apiWriteIncluded:
      false,

    persistenceMutationIncluded:
      false,

    serverMountIncluded:
      false,

    liveHttpValidated:
      false,

    automatedControlIncluded:
      false,

    automaticDispatchAllowed:
      false,

    executableActionProduced:
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

    controllabilityInferenceAllowed:
      false,

    implicitTimeGridAllowed:
      false,

    implicitResamplingAllowed:
      false,

    interpolationAllowed:
      false,

    futureObservedDataFabricationAllowed:
      false,
  });


export function buildOptimizationDssDashboardFilterState({
  filters = {},
} = {}) {
  const state = {};

  for (
    const key of
    OPTIMIZATION_DSS_DASHBOARD_FILTERS
  ) {
    const value =
      filters[key];

    state[key] =
      value ===
        undefined ||
      value ===
        null ||
      value ===
        ""
        ? null
        : value;
  }

  return Object.freeze(
    state
  );
}


export function formatOptimizationDssDashboardValue({
  value,
  status =
    null,
} = {}) {
  if (
    status ===
      "UNAVAILABLE"
  ) {
    return Object.freeze({
      display:
        OPTIMIZATION_DSS_DASHBOARD_DISPLAY
          .unavailableLabel,

      semantic:
        "UNAVAILABLE",

      numeric:
        null,
    });
  }

  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return Object.freeze({
      display:
        OPTIMIZATION_DSS_DASHBOARD_DISPLAY
          .missingLabel,

      semantic:
        "MISSING",

      numeric:
        null,
    });
  }

  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  ) {
    return Object.freeze({
      display:
        String(
          value
        ),

      semantic:
        "VALUE",

      numeric:
        value,
    });
  }

  return Object.freeze({
    display:
      String(
        value
      ),

    semantic:
      "VALUE",

    numeric:
      null,
  });
}


export function buildOptimizationDssDashboardTimelinePoint({
  timestamp,
  target,
  value,
  unit,
  status =
    null,
} = {}) {
  const formatted =
    formatOptimizationDssDashboardValue({
      value,
      status,
    });

  return Object.freeze({
    timestamp:
      timestamp ??
      null,

    target:
      target ??
      null,

    value:
      formatted.numeric,

    unit:
      unit ??
      null,

    semantic:
      formatted.semantic,

    display:
      formatted.display,
  });
}
