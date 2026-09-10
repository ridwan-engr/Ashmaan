// services/forecasting/forecastingContract.js

/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.1 — Forecasting Contract and Architecture Boundary
|--------------------------------------------------------------------------
|
| This module defines forecasting semantics only.
|
| It does NOT:
| - train a model
| - select an algorithm
| - calculate a prediction
| - persist a forecast
| - create an API
| - create a dashboard
| - perform Financial/BI calculations
| - perform Optimization/DSS calculations
|
|--------------------------------------------------------------------------
*/

export const FORECASTING_PHASE =
    "9.1";

export const FORECASTING_LAYER =
    "FORECASTING";

export const FORECASTING_REPORTING_SEMANTICS =
    "[start,end)";

export const FORECASTING_ARCHITECTURE =
    Object.freeze({
        upstream:
            Object.freeze([
                "VRM",
                "INGESTION",
                "RAW_TELEMETRY",
                "NORMALIZED_TELEMETRY",
                "EVENTS",
                "AGGREGATED_TIME_SERIES",
                "ENGINEERING_ANALYTICS",
                "KPI_DATABASE",
            ]),

        current:
            "FORECASTING",

        downstream:
            Object.freeze([
                "FINANCIAL_BI",
                "OPTIMIZATION_DSS",
            ]),
    });


/*
|--------------------------------------------------------------------------
| Forecast target contract
|--------------------------------------------------------------------------
|
| 9.1 defines target TYPES, not production models.
|
| Numeric targets require an explicit upstream engineering/data unit.
| State targets require an explicit controlled state domain.
|
|--------------------------------------------------------------------------
*/

export const FORECAST_TARGET_KIND =
    Object.freeze({
        NUMERIC:
            "NUMERIC",

        STATE:
            "STATE",

        PROBABILITY:
            "PROBABILITY",
    });


export const FORECAST_TARGET_FAMILY =
    Object.freeze({
        SITE_LOAD:
            "SITE_LOAD",

        SOLAR:
            "SOLAR",

        GRID:
            "GRID",

        BATTERY:
            "BATTERY",

        GENERATOR:
            "GENERATOR",
    });


export const FORECAST_OUTPUT_TYPE =
    Object.freeze({
        POINT:
            "POINT",

        INTERVAL:
            "INTERVAL",

        PROBABILISTIC:
            "PROBABILISTIC",

        STATE:
            "STATE",
    });


/*
|--------------------------------------------------------------------------
| Forecast lifecycle
|--------------------------------------------------------------------------
|
| NOT_EXECUTED is the only default state in Phase 9.1.
| Later checkpoints may produce calculated forecasts.
|
|--------------------------------------------------------------------------
*/

export const FORECAST_STATUS =
    Object.freeze({
        NOT_EXECUTED:
            "NOT_EXECUTED",

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",

        FAILED:
            "FAILED",
    });


export const FORECAST_INPUT_STATUS =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        PARTIALLY_QUALIFIED:
            "PARTIALLY_QUALIFIED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


/*
|--------------------------------------------------------------------------
| Forecasting semantic boundaries
|--------------------------------------------------------------------------
*/

export const FORECASTING_BOUNDARIES =
    Object.freeze({
        modelTrainingExecuted:
            false,

        forecastCalculated:
            false,

        algorithmSelected:
            false,

        hyperparametersSelected:
            false,

        featureEngineeringExecuted:
            false,

        missingTelemetryMeansZero:
            false,

        unavailableEngineeringMetricMeansZero:
            false,

        missingFamilyMeansUnavailable:
            false,

        unitsMayBeInferred:
            false,

        deviceTopologiesMayBeMerged:
            false,

        installedCapacityMayBeInferred:
            false,

        irradianceMayBeInferred:
            false,

        batteryCapacityMayBeInferred:
            false,

        batterySohMayBeInferred:
            false,

        generatorFuelMayBeInferred:
            false,

        gridDirectionMayBeInferred:
            false,

        futureDataMayEnterTrainingWindow:
            false,

        forecastHorizonMayOverlapTrainingWindow:
            false,

        interpolationMayBeSilentlyApplied:
            false,

        resamplingMayBeSilentlyApplied:
            false,

        outliersMayBeSilentlyRemoved:
            false,

        timezoneMayBeSilentlyChanged:
            false,

        engineeringAnalyticsMayBeMutated:
            false,

        telemetryMayBePersisted:
            false,

        eventsMayBeMutated:
            false,

        forecastPersistenceIncluded:
            false,

        forecastingApiIncluded:
            false,

        forecastingDashboardIncluded:
            false,

        financialBiIncluded:
            false,

        optimizationDssIncluded:
            false,
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeDate(
    value,
    label
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        throw new Error(
            `${label} is required.`
        );
    }

    const date =
        value instanceof Date
            ? new Date(
                value.getTime()
            )
            : new Date(
                value
            );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        throw new Error(
            `Invalid ${label}: ${value}`
        );
    }

    return date;
}


function normalizeOptionalString(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalized =
        String(
            value
        ).trim();

    return normalized.length
        ? normalized
        : null;
}


function assertEnumValue(
    value,
    allowed,
    label
) {
    if (
        !Object.values(
            allowed
        ).includes(
            value
        )
    ) {
        throw new Error(
            `Unsupported ${label}: ${value}`
        );
    }

    return value;
}


/*
|--------------------------------------------------------------------------
| Time contract
|--------------------------------------------------------------------------
|
| training window:
|   [trainingStart, forecastOrigin)
|
| forecast horizon:
|   [forecastOrigin, forecastEnd)
|
| Therefore:
| - trainingEnd is canonically forecastOrigin
| - no future observation can enter training through this contract
| - horizon must be strictly positive
|
|--------------------------------------------------------------------------
*/

export function buildForecastTimeContract({
    trainingStart,
    forecastOrigin,
    forecastEnd,
    timezone = null,
} = {}) {
    const normalizedTrainingStart =
        normalizeDate(
            trainingStart,
            "forecast trainingStart"
        );

    const normalizedForecastOrigin =
        normalizeDate(
            forecastOrigin,
            "forecast forecastOrigin"
        );

    const normalizedForecastEnd =
        normalizeDate(
            forecastEnd,
            "forecast forecastEnd"
        );

    if (
        normalizedForecastOrigin <=
            normalizedTrainingStart
    ) {
        throw new Error(
            "Forecast origin must be later than training start."
        );
    }

    if (
        normalizedForecastEnd <=
            normalizedForecastOrigin
    ) {
        throw new Error(
            "Forecast end must be later than forecast origin."
        );
    }

    return {
        trainingWindow:
            {
                start:
                    normalizedTrainingStart,

                end:
                    normalizedForecastOrigin,

                semantics:
                    FORECASTING_REPORTING_SEMANTICS,
            },

        forecastOrigin:
            normalizedForecastOrigin,

        forecastHorizon:
            {
                start:
                    normalizedForecastOrigin,

                end:
                    normalizedForecastEnd,

                semantics:
                    FORECASTING_REPORTING_SEMANTICS,
            },

        timezone:
            normalizeOptionalString(
                timezone
            ),

        leakageBoundary:
            {
                futureDataAllowedInTraining:
                    false,

                trainingEndsAtForecastOrigin:
                    true,

                horizonStartsAtForecastOrigin:
                    true,

                trainingHorizonOverlapAllowed:
                    false,
            },
    };
}


/*
|--------------------------------------------------------------------------
| Target descriptor
|--------------------------------------------------------------------------
*/

export function buildForecastTarget({
    family,
    metric,
    kind,
    unit = null,
    stateDomain = null,
    installationId = null,
    vrmSiteId = null,
    assetId = null,
} = {}) {
    const normalizedFamily =
        assertEnumValue(
            family,
            FORECAST_TARGET_FAMILY,
            "forecast target family"
        );

    const normalizedKind =
        assertEnumValue(
            kind,
            FORECAST_TARGET_KIND,
            "forecast target kind"
        );

    const normalizedMetric =
        normalizeOptionalString(
            metric
        );

    if (
        !normalizedMetric
    ) {
        throw new Error(
            "Forecast target metric is required."
        );
    }

    const normalizedUnit =
        normalizeOptionalString(
            unit
        );

    if (
        normalizedKind ===
            FORECAST_TARGET_KIND.NUMERIC &&
        !normalizedUnit
    ) {
        throw new Error(
            "Numeric forecast target requires an explicit unit."
        );
    }

    if (
        normalizedKind !==
            FORECAST_TARGET_KIND.NUMERIC &&
        normalizedUnit
    ) {
        throw new Error(
            "Non-numeric forecast target cannot declare a numeric engineering unit."
        );
    }

    let normalizedStateDomain =
        null;

    if (
        stateDomain !==
            null &&
        stateDomain !==
            undefined
    ) {
        if (
            !Array.isArray(
                stateDomain
            ) ||
            !stateDomain.length
        ) {
            throw new Error(
                "Forecast stateDomain must be a non-empty array when supplied."
            );
        }

        normalizedStateDomain =
            Object.freeze(
                stateDomain.map(
                    (
                        value
                    ) => {
                        const normalized =
                            normalizeOptionalString(
                                value
                            );

                        if (
                            !normalized
                        ) {
                            throw new Error(
                                "Forecast stateDomain values must be non-empty strings."
                            );
                        }

                        return normalized;
                    }
                )
            );
    }

    if (
        normalizedKind ===
            FORECAST_TARGET_KIND.STATE &&
        !normalizedStateDomain
    ) {
        throw new Error(
            "State forecast target requires an explicit stateDomain."
        );
    }

    if (
        normalizedKind !==
            FORECAST_TARGET_KIND.STATE &&
        normalizedStateDomain
    ) {
        throw new Error(
            "stateDomain is reserved for STATE forecast targets."
        );
    }

    return {
        family:
            normalizedFamily,

        metric:
            normalizedMetric,

        kind:
            normalizedKind,

        unit:
            normalizedUnit,

        stateDomain:
            normalizedStateDomain,

        scope:
            {
                installationId:
                    normalizeOptionalString(
                        installationId
                    ),

                vrmSiteId:
                    normalizeOptionalString(
                        vrmSiteId
                    ),

                assetId:
                    normalizeOptionalString(
                        assetId
                    ),
            },
    };
}


/*
|--------------------------------------------------------------------------
| Input qualification shell
|--------------------------------------------------------------------------
|
| This preserves upstream evidence/status identity.
| It does not transform, fill, infer, resample or clean observations.
|
|--------------------------------------------------------------------------
*/

export function buildForecastInputQualification({
    status,
    source,
    observations = null,
    reason = null,
} = {}) {
    const normalizedStatus =
        assertEnumValue(
            status,
            FORECAST_INPUT_STATUS,
            "forecast input status"
        );

    if (
        source === null ||
        source === undefined ||
        typeof source !==
            "object"
    ) {
        throw new Error(
            "Forecast input source must be an object."
        );
    }

    if (
        observations !==
            null &&
        !Array.isArray(
            observations
        )
    ) {
        throw new Error(
            "Forecast observations must be an array or null."
        );
    }

    return {
        status:
            normalizedStatus,

        source,

        observations,

        reason:
            normalizeOptionalString(
                reason
            ),

        boundaries:
            {
                sourcePreservedByReference:
                    true,

                observationsPreservedByReference:
                    observations !==
                        null,

                missingMeansZero:
                    false,

                unitsInferred:
                    false,

                resampled:
                    false,

                interpolated:
                    false,

                outliersRemoved:
                    false,

                topologyMerged:
                    false,
            },
    };
}


/*
|--------------------------------------------------------------------------
| Phase 9.1 contract shell
|--------------------------------------------------------------------------
*/

export function createForecastingContract({
    time,
    target,
    inputQualification,
} = {}) {
    if (
        !time ||
        typeof time !==
            "object"
    ) {
        throw new Error(
            "Forecasting contract requires a time contract."
        );
    }

    if (
        !target ||
        typeof target !==
            "object"
    ) {
        throw new Error(
            "Forecasting contract requires a target descriptor."
        );
    }

    if (
        !inputQualification ||
        typeof inputQualification !==
            "object"
    ) {
        throw new Error(
            "Forecasting contract requires input qualification."
        );
    }

    return {
        phase:
            FORECASTING_PHASE,

        layer:
            FORECASTING_LAYER,

        architecture:
            FORECASTING_ARCHITECTURE,

        time,

        target,

        inputQualification,

        forecast:
            {
                status:
                    FORECAST_STATUS.NOT_EXECUTED,

                outputType:
                    null,

                values:
                    null,

                model:
                    null,

                metrics:
                    null,

                reason:
                    "PHASE_9_1_CONTRACT_ONLY",
            },

        boundaries:
            FORECASTING_BOUNDARIES,
    };
}


export default Object.freeze({
    FORECASTING_PHASE,
    FORECASTING_LAYER,
    FORECASTING_REPORTING_SEMANTICS,
    FORECASTING_ARCHITECTURE,
    FORECAST_TARGET_KIND,
    FORECAST_TARGET_FAMILY,
    FORECAST_OUTPUT_TYPE,
    FORECAST_STATUS,
    FORECAST_INPUT_STATUS,
    FORECASTING_BOUNDARIES,
    buildForecastTimeContract,
    buildForecastTarget,
    buildForecastInputQualification,
    createForecastingContract,
});
