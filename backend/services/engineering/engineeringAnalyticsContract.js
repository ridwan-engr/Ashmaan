// services/engineering/engineeringAnalyticsContract.js

/*
|--------------------------------------------------------------------------
| ASHMAAN Engineering Analytics Data Contract
|--------------------------------------------------------------------------
|
| Phase 8.1
|
| This module defines the canonical representation of engineering
| analytics metrics throughout ASHMAAN.
|
| It deliberately separates:
|
| - metric value
| - engineering availability
| - data quality
| - evidence basis
| - observability
| - calculation method
| - time window
| - scope
|
| IMPORTANT:
|
| null / UNAVAILABLE is never equivalent to zero.
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Metric availability states
|--------------------------------------------------------------------------
*/

export const ENGINEERING_METRIC_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


/*
|--------------------------------------------------------------------------
| Evidence basis
|--------------------------------------------------------------------------
|
| MEASURED
|     Directly supported by telemetry / meter / equipment data.
|
| DERIVED
|     Calculated from measured or otherwise validated source data.
|
| MODELLED
|     Obtained from an explicitly defined engineering model.
|
| ESTIMATED
|     Approximation from incomplete but qualified evidence.
|
| NOT_ESTABLISHED
|     Required evidence foundation does not exist.
|
|--------------------------------------------------------------------------
*/

export const ENGINEERING_EVIDENCE_BASIS =
    Object.freeze({
        MEASURED:
            "MEASURED",

        DERIVED:
            "DERIVED",

        MODELLED:
            "MODELLED",

        ESTIMATED:
            "ESTIMATED",

        NOT_ESTABLISHED:
            "NOT_ESTABLISHED",
    });


/*
|--------------------------------------------------------------------------
| Data quality states
|--------------------------------------------------------------------------
*/

export const ENGINEERING_DATA_QUALITY =
    Object.freeze({
        GOOD:
            "GOOD",

        PARTIAL:
            "PARTIAL",

        DEGRADED:
            "DEGRADED",

        INSUFFICIENT:
            "INSUFFICIENT",

        UNKNOWN:
            "UNKNOWN",
    });


/*
|--------------------------------------------------------------------------
| Observability states
|--------------------------------------------------------------------------
*/

export const ENGINEERING_OBSERVABILITY_STATUS =
    Object.freeze({
        ESTABLISHED:
            "ESTABLISHED",

        PARTIAL:
            "PARTIAL",

        NOT_ESTABLISHED:
            "NOT_ESTABLISHED",
    });


/*
|--------------------------------------------------------------------------
| Aggregation levels
|--------------------------------------------------------------------------
*/

export const ENGINEERING_AGGREGATION_LEVEL =
    Object.freeze({
        INTERVAL:
            "INTERVAL",

        SITE:
            "SITE",

        REGION:
            "REGION",

        FLEET:
            "FLEET",
    });


/*
|--------------------------------------------------------------------------
| Metric families
|--------------------------------------------------------------------------
*/

export const ENGINEERING_METRIC_FAMILY =
    Object.freeze({
        ELECTRICAL_PERFORMANCE:
            "ELECTRICAL_PERFORMANCE",

        ENERGY_SOURCE:
            "ENERGY_SOURCE",

        BATTERY:
            "BATTERY",

        GENERATOR:
            "GENERATOR",

        GRID:
            "GRID",

        SOLAR:
            "SOLAR",

        FLEET:
            "FLEET",
    });


/*
|--------------------------------------------------------------------------
| Engineering source types
|--------------------------------------------------------------------------
*/

export const ENGINEERING_SOURCE_TYPE =
    Object.freeze({
        VRM_TELEMETRY:
            "VRM_TELEMETRY",

        VRM_STATISTICS:
            "VRM_STATISTICS",

        VRM_ALARM:
            "VRM_ALARM",

        OUTAGE_EVENT:
            "OUTAGE_EVENT",

        FAILURE_EVENT:
            "FAILURE_EVENT",

        SITE_CONFIGURATION:
            "SITE_CONFIGURATION",

        ASSET_CONFIGURATION:
            "ASSET_CONFIGURATION",

        DERIVED_INTERVAL:
            "DERIVED_INTERVAL",

        ENGINEERING_MODEL:
            "ENGINEERING_MODEL",
    });


/*
|--------------------------------------------------------------------------
| Metric units
|--------------------------------------------------------------------------
|
| This is intentionally controlled.
|
| More units can be added later when an engineering KPI genuinely
| requires them.
|
|--------------------------------------------------------------------------
*/

export const ENGINEERING_UNIT =
    Object.freeze({
        KW:
            "kW",

        KWH:
            "kWh",

        KVA:
            "kVA",

        KVAR:
            "kVAr",

        VOLT:
            "V",

        AMPERE:
            "A",

        HERTZ:
            "Hz",

        PERCENT:
            "%",

        HOUR:
            "h",

        MINUTE:
            "min",

        COUNT:
            "count",

        RATIO:
            "ratio",

        NONE:
            null,
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function isFiniteNumber(
    value
) {
    return (
        typeof value ===
            "number" &&
        Number.isFinite(
            value
        )
    );
}


function normalizeDate(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }


    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        throw new Error(
            `Invalid engineering analytics date: ${value}`
        );
    }


    return date;
}


function normalizeSources(
    sources = []
) {

    if (
        !Array.isArray(
            sources
        )
    ) {
        throw new Error(
            "Engineering analytics sources must be an array."
        );
    }


    return sources.map(
        (
            source,
            index
        ) => {

            if (
                !source ||
                typeof source !==
                    "object"
            ) {
                throw new Error(
                    `Engineering analytics source at index ${index} must be an object.`
                );
            }


            return {
                type:
                    source.type ??
                    null,

                collection:
                    source.collection ??
                    null,

                field:
                    source.field ??
                    null,

                metric:
                    source.metric ??
                    null,

                description:
                    source.description ??
                    null,
            };
        }
    );
}


/*
|--------------------------------------------------------------------------
| Reporting-window builder
|--------------------------------------------------------------------------
*/

export function buildEngineeringReportingWindow({
    start,
    end,
    interval = null,
} = {}) {

    const normalizedStart =
        normalizeDate(
            start
        );


    const normalizedEnd =
        normalizeDate(
            end
        );


    if (
        normalizedStart &&
        normalizedEnd &&
        normalizedEnd <=
            normalizedStart
    ) {
        throw new Error(
            "Engineering analytics reporting-window end must be later than start."
        );
    }


    return {
        start:
            normalizedStart,

        end:
            normalizedEnd,

        semantics:
            "[start,end)",

        interval,
    };
}


/*
|--------------------------------------------------------------------------
| Scope builder
|--------------------------------------------------------------------------
*/

export function buildEngineeringScope({
    aggregationLevel =
        ENGINEERING_AGGREGATION_LEVEL.SITE,

    installationId = null,

    vrmSiteId = null,

    region = null,

    assetId = null,

    assetType = null,
} = {}) {

    if (
        !Object.values(
            ENGINEERING_AGGREGATION_LEVEL
        ).includes(
            aggregationLevel
        )
    ) {
        throw new Error(
            `Unsupported engineering aggregation level: ${aggregationLevel}`
        );
    }


    return {
        aggregationLevel,

        installationId,

        vrmSiteId,

        region,

        assetId,

        assetType,
    };
}


/*
|--------------------------------------------------------------------------
| Observability builder
|--------------------------------------------------------------------------
*/

export function buildEngineeringObservability({
    status =
        ENGINEERING_OBSERVABILITY_STATUS.NOT_ESTABLISHED,

    requiredFields = [],

    observedFields = [],

    missingFields = [],

    coveragePercent = null,

    reason = null,
} = {}) {

    if (
        !Object.values(
            ENGINEERING_OBSERVABILITY_STATUS
        ).includes(
            status
        )
    ) {
        throw new Error(
            `Unsupported engineering observability status: ${status}`
        );
    }


    if (
        coveragePercent !==
            null &&
        (
            !isFiniteNumber(
                coveragePercent
            ) ||
            coveragePercent <
                0 ||
            coveragePercent >
                100
        )
    ) {
        throw new Error(
            "Engineering observability coveragePercent must be between 0 and 100."
        );
    }


    return {
        status,

        requiredFields:
            Array.isArray(
                requiredFields
            )
                ? requiredFields
                : [],

        observedFields:
            Array.isArray(
                observedFields
            )
                ? observedFields
                : [],

        missingFields:
            Array.isArray(
                missingFields
            )
                ? missingFields
                : [],

        coveragePercent,

        reason,
    };
}


/*
|--------------------------------------------------------------------------
| Data-quality builder
|--------------------------------------------------------------------------
*/

export function buildEngineeringDataQuality({
    status =
        ENGINEERING_DATA_QUALITY.UNKNOWN,

    sampleCount = null,

    validSampleCount = null,

    invalidSampleCount = null,

    coveragePercent = null,

    reason = null,
} = {}) {

    if (
        !Object.values(
            ENGINEERING_DATA_QUALITY
        ).includes(
            status
        )
    ) {
        throw new Error(
            `Unsupported engineering data-quality status: ${status}`
        );
    }


    return {
        status,

        sampleCount,

        validSampleCount,

        invalidSampleCount,

        coveragePercent,

        reason,
    };
}


/*
|--------------------------------------------------------------------------
| Canonical metric builder
|--------------------------------------------------------------------------
*/

export function buildEngineeringMetric({
    key,

    label,

    family,

    status,

    reason = null,

    value = null,

    unit = null,

    evidenceBasis =
        ENGINEERING_EVIDENCE_BASIS.NOT_ESTABLISHED,

    calculationMethod = null,

    reportingWindow = null,

    scope = null,

    observability = null,

    dataQuality = null,

    sources = [],

    metadata = {},
} = {}) {

    /*
    |--------------------------------------------------------------------------
    | Required identity
    |--------------------------------------------------------------------------
    */

    if (
        !key ||
        typeof key !==
            "string"
    ) {
        throw new Error(
            "Engineering analytics metric key is required."
        );
    }


    if (
        !label ||
        typeof label !==
            "string"
    ) {
        throw new Error(
            `Engineering analytics label is required for metric ${key}.`
        );
    }


    if (
        !Object.values(
            ENGINEERING_METRIC_FAMILY
        ).includes(
            family
        )
    ) {
        throw new Error(
            `Unsupported engineering metric family for ${key}: ${family}`
        );
    }


    if (
        !Object.values(
            ENGINEERING_METRIC_STATUS
        ).includes(
            status
        )
    ) {
        throw new Error(
            `Unsupported engineering metric status for ${key}: ${status}`
        );
    }


    if (
        !Object.values(
            ENGINEERING_EVIDENCE_BASIS
        ).includes(
            evidenceBasis
        )
    ) {
        throw new Error(
            `Unsupported evidence basis for ${key}: ${evidenceBasis}`
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Critical null / zero semantic protection
    |--------------------------------------------------------------------------
    |
    | CALCULATED metrics require a finite numeric value.
    |
    | UNAVAILABLE metrics must contain null.
    |
    | Therefore:
    |
    |     UNAVAILABLE !== 0
    |
    |--------------------------------------------------------------------------
    */

    if (
        status ===
            ENGINEERING_METRIC_STATUS.CALCULATED &&
        !isFiniteNumber(
            value
        )
    ) {
        throw new Error(
            `Calculated engineering metric ${key} requires a finite numeric value.`
        );
    }


    if (
        status ===
            ENGINEERING_METRIC_STATUS.UNAVAILABLE &&
        value !==
            null
    ) {
        throw new Error(
            `Unavailable engineering metric ${key} must have value=null.`
        );
    }


    if (
        status ===
            ENGINEERING_METRIC_STATUS.UNAVAILABLE &&
        !reason
    ) {
        throw new Error(
            `Unavailable engineering metric ${key} requires an explicit reason.`
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Canonical result
    |--------------------------------------------------------------------------
    */

    return {
        key,

        label,

        family,

        status,

        reason,

        value,

        unit,

        evidence: {
            basis:
                evidenceBasis,

            sources:
                normalizeSources(
                    sources
                ),
        },

        calculation: {
            method:
                calculationMethod,
        },

        reportingWindow,

        scope,

        observability,

        dataQuality,

        metadata:
            metadata &&
            typeof metadata ===
                "object"
                ? metadata
                : {},

        generatedAt:
            new Date(),
    };
}


/*
|--------------------------------------------------------------------------
| Calculated metric convenience builder
|--------------------------------------------------------------------------
*/

export function buildCalculatedEngineeringMetric(
    options = {}
) {

    return buildEngineeringMetric({
        ...options,

        status:
            ENGINEERING_METRIC_STATUS.CALCULATED,
    });
}


/*
|--------------------------------------------------------------------------
| Unavailable metric convenience builder
|--------------------------------------------------------------------------
*/

export function buildUnavailableEngineeringMetric(
    options = {}
) {

    return buildEngineeringMetric({
        ...options,

        status:
            ENGINEERING_METRIC_STATUS.UNAVAILABLE,

        value:
            null,
    });
}


/*
|--------------------------------------------------------------------------
| Partial metric convenience builder
|--------------------------------------------------------------------------
*/

export function buildPartialEngineeringMetric(
    options = {}
) {

    return buildEngineeringMetric({
        ...options,

        status:
            ENGINEERING_METRIC_STATUS.PARTIALLY_CALCULATED,
    });
}


/*
|--------------------------------------------------------------------------
| Metric-family response builder
|--------------------------------------------------------------------------
*/

export function buildEngineeringMetricFamily({
    family,

    metrics = [],

    reportingWindow = null,

    scope = null,

    boundary = null,
} = {}) {

    if (
        !Object.values(
            ENGINEERING_METRIC_FAMILY
        ).includes(
            family
        )
    ) {
        throw new Error(
            `Unsupported engineering metric family: ${family}`
        );
    }


    if (
        !Array.isArray(
            metrics
        )
    ) {
        throw new Error(
            "Engineering analytics family metrics must be an array."
        );
    }


    const calculatedCount =
        metrics.filter(
            (metric) =>
                metric?.status ===
                ENGINEERING_METRIC_STATUS.CALCULATED
        ).length;


    const partialCount =
        metrics.filter(
            (metric) =>
                metric?.status ===
                ENGINEERING_METRIC_STATUS.PARTIALLY_CALCULATED
        ).length;


    const unavailableCount =
        metrics.filter(
            (metric) =>
                metric?.status ===
                ENGINEERING_METRIC_STATUS.UNAVAILABLE
        ).length;


    let status;


    if (
        metrics.length ===
            0 ||
        unavailableCount ===
            metrics.length
    ) {
        status =
            ENGINEERING_METRIC_STATUS.UNAVAILABLE;
    }
    else if (
        calculatedCount ===
            metrics.length
    ) {
        status =
            ENGINEERING_METRIC_STATUS.CALCULATED;
    }
    else {
        status =
            ENGINEERING_METRIC_STATUS.PARTIALLY_CALCULATED;
    }


    return {
        family,

        status,

        metricCount:
            metrics.length,

        calculatedCount,

        partialCount,

        unavailableCount,

        reportingWindow,

        scope,

        boundary,

        metrics,
    };
}


/*
|--------------------------------------------------------------------------
| Contract metadata
|--------------------------------------------------------------------------
*/

export const ENGINEERING_ANALYTICS_CONTRACT =
    Object.freeze({
        name:
            "ASHMAAN_ENGINEERING_ANALYTICS",

        version:
            "1.0.0",

        reportingWindowSemantics:
            "[start,end)",

        nullSemantics:
            "UNAVAILABLE_METRIC_VALUE_IS_NULL_NOT_ZERO",

        statusValues:
            Object.values(
                ENGINEERING_METRIC_STATUS
            ),

        evidenceBasisValues:
            Object.values(
                ENGINEERING_EVIDENCE_BASIS
            ),

        dataQualityValues:
            Object.values(
                ENGINEERING_DATA_QUALITY
            ),

        observabilityValues:
            Object.values(
                ENGINEERING_OBSERVABILITY_STATUS
            ),

        aggregationLevels:
            Object.values(
                ENGINEERING_AGGREGATION_LEVEL
            ),

        metricFamilies:
            Object.values(
                ENGINEERING_METRIC_FAMILY
            ),
    });


export default {
    ENGINEERING_METRIC_STATUS,

    ENGINEERING_EVIDENCE_BASIS,

    ENGINEERING_DATA_QUALITY,

    ENGINEERING_OBSERVABILITY_STATUS,

    ENGINEERING_AGGREGATION_LEVEL,

    ENGINEERING_METRIC_FAMILY,

    ENGINEERING_SOURCE_TYPE,

    ENGINEERING_UNIT,

    ENGINEERING_ANALYTICS_CONTRACT,

    buildEngineeringReportingWindow,

    buildEngineeringScope,

    buildEngineeringObservability,

    buildEngineeringDataQuality,

    buildEngineeringMetric,

    buildCalculatedEngineeringMetric,

    buildUnavailableEngineeringMetric,

    buildPartialEngineeringMetric,

    buildEngineeringMetricFamily,
};