// services/optimizationDss/optimizationDssApiContract.js

export const OPTIMIZATION_DSS_API_CONTRACT_PHASE =
  "11.12";

export const OPTIMIZATION_DSS_API_CONTRACT_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_API_CONTRACT_UPSTREAM_PHASE =
  "11.11";


export const OPTIMIZATION_DSS_API_BASE_PATH =
  "/api/optimization-dss";


export const OPTIMIZATION_DSS_API_ENDPOINTS =
  Object.freeze({
    LIST_RECOMMENDATIONS:
      Object.freeze({
        method:
          "GET",

        path:
          "/recommendations",

        fullPath:
          `${OPTIMIZATION_DSS_API_BASE_PATH}/recommendations`,
      }),

    GET_RECOMMENDATION:
      Object.freeze({
        method:
          "GET",

        path:
          "/recommendations/:persistenceKey",

        fullPath:
          `${OPTIMIZATION_DSS_API_BASE_PATH}/recommendations/:persistenceKey`,
      }),
  });


export const OPTIMIZATION_DSS_API_RESPONSE_STATUS =
  Object.freeze({
    OK:
      "OK",

    NOT_FOUND:
      "NOT_FOUND",

    INVALID_REQUEST:
      "INVALID_REQUEST",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_API_SORT_DIRECTION =
  Object.freeze({
    ASC:
      "asc",

    DESC:
      "desc",
  });


export const OPTIMIZATION_DSS_API_DEFAULTS =
  Object.freeze({
    page:
      1,

    limit:
      25,

    maxLimit:
      100,

    sortBy:
      "createdAt",

    sortDirection:
      "desc",
  });


export const OPTIMIZATION_DSS_API_ALLOWED_SORT_FIELDS =
  Object.freeze([
    "createdAt",
    "updatedAt",
    "recommendationKind",
    "generationStatus",
    "confidence",
    "horizon.start",
  ]);


export const OPTIMIZATION_DSS_API_FILTER_FIELDS =
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


export const OPTIMIZATION_DSS_API_BOUNDARIES =
  Object.freeze({
    contractOnly:
      true,

    readOnly:
      true,

    listEndpointIncluded:
      true,

    getByPersistenceKeyEndpointIncluded:
      true,

    createEndpointIncluded:
      false,

    updateEndpointIncluded:
      false,

    deleteEndpointIncluded:
      false,

    persistenceMutationIncluded:
      false,

    routeImplementationIncluded:
      false,

    controllerImplementationIncluded:
      false,

    serviceImplementationIncluded:
      false,

    serverMountIncluded:
      false,

    liveHttpValidated:
      false,

    dashboardIncluded:
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


function parsePositiveInteger(
  value,
  field,
  defaultValue
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  const numeric =
    Number(value);

  if (
    !Number.isInteger(numeric) ||
    numeric < 1
  ) {
    throw new Error(
      `${field}_INVALID`
    );
  }

  return numeric;
}


function parseOptionalIsoTimestamp(
  value,
  field
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      `${field}_INVALID`
    );
  }

  return parsed.toISOString();
}


function parseOptionalString(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !==
      "string"
  ) {
    throw new Error(
      "FILTER_VALUE_INVALID"
    );
  }

  return value.trim();
}


export function buildOptimizationDssApiListRequest({
  query = {},
} = {}) {
  const page =
    parsePositiveInteger(
      query.page,
      "PAGE",
      OPTIMIZATION_DSS_API_DEFAULTS.page
    );

  const limit =
    parsePositiveInteger(
      query.limit,
      "LIMIT",
      OPTIMIZATION_DSS_API_DEFAULTS.limit
    );

  if (
    limit >
      OPTIMIZATION_DSS_API_DEFAULTS.maxLimit
  ) {
    throw new Error(
      "LIMIT_EXCEEDS_MAX"
    );
  }

  const sortBy =
    query.sortBy ??
    OPTIMIZATION_DSS_API_DEFAULTS.sortBy;

  if (
    !OPTIMIZATION_DSS_API_ALLOWED_SORT_FIELDS.includes(
      sortBy
    )
  ) {
    throw new Error(
      "SORT_FIELD_INVALID"
    );
  }

  const sortDirection =
    query.sortDirection ??
    OPTIMIZATION_DSS_API_DEFAULTS.sortDirection;

  if (
    !Object.values(
      OPTIMIZATION_DSS_API_SORT_DIRECTION
    ).includes(
      sortDirection
    )
  ) {
    throw new Error(
      "SORT_DIRECTION_INVALID"
    );
  }

  const horizonStart =
    parseOptionalIsoTimestamp(
      query.horizonStart,
      "HORIZON_START"
    );

  const horizonEnd =
    parseOptionalIsoTimestamp(
      query.horizonEnd,
      "HORIZON_END"
    );

  if (
    horizonStart &&
    horizonEnd &&
    new Date(horizonEnd) <
      new Date(horizonStart)
  ) {
    throw new Error(
      "HORIZON_RANGE_INVALID"
    );
  }

  const filters =
    Object.freeze({
      scope:
        parseOptionalString(
          query.scope
        ),

      vrmSiteId:
        parseOptionalString(
          query.vrmSiteId
        ),

      fleetId:
        parseOptionalString(
          query.fleetId
        ),

      recommendationKind:
        parseOptionalString(
          query.recommendationKind
        ),

      generationStatus:
        parseOptionalString(
          query.generationStatus
        ),

      applicability:
        parseOptionalString(
          query.applicability
        ),

      confidence:
        parseOptionalString(
          query.confidence
        ),

      horizonStart,

      horizonEnd,
    });

  return Object.freeze({
    method:
      "GET",

    path:
      OPTIMIZATION_DSS_API_ENDPOINTS
        .LIST_RECOMMENDATIONS
        .fullPath,

    page,

    limit,

    offset:
      (page - 1) *
      limit,

    sort:
      Object.freeze({
        field:
          sortBy,

        direction:
          sortDirection,
      }),

    filters,
  });
}


export function buildOptimizationDssApiGetRequest({
  persistenceKey,
} = {}) {
  if (
    typeof persistenceKey !==
      "string" ||
    !/^[a-f0-9]{64}$/.test(
      persistenceKey
    )
  ) {
    throw new Error(
      "PERSISTENCE_KEY_INVALID"
    );
  }

  return Object.freeze({
    method:
      "GET",

    path:
      OPTIMIZATION_DSS_API_ENDPOINTS
        .GET_RECOMMENDATION
        .fullPath,

    persistenceKey,
  });
}


export function buildOptimizationDssApiEnvelope({
  status,
  data = null,
  meta = null,
  error = null,
} = {}) {
  if (
    !Object.values(
      OPTIMIZATION_DSS_API_RESPONSE_STATUS
    ).includes(
      status
    )
  ) {
    throw new Error(
      "API_STATUS_INVALID"
    );
  }

  if (
    status ===
      OPTIMIZATION_DSS_API_RESPONSE_STATUS.OK &&
    error !==
      null
  ) {
    throw new Error(
      "OK_ENVELOPE_CANNOT_INCLUDE_ERROR"
    );
  }

  if (
    status !==
      OPTIMIZATION_DSS_API_RESPONSE_STATUS.OK &&
    data !==
      null
  ) {
    throw new Error(
      "NON_OK_ENVELOPE_CANNOT_INCLUDE_DATA"
    );
  }

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_API_CONTRACT_PHASE,

    layer:
      OPTIMIZATION_DSS_API_CONTRACT_LAYER,

    status,

    data,

    meta,

    error,
  });
}