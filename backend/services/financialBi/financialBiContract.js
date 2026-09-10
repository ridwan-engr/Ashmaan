// services/financialBi/financialBiContract.js

/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 10.1 — Financial/BI Contract and Architecture Boundary
|--------------------------------------------------------------------------
|
| Architecture:
|
| VRM
| → ingestion
| → raw telemetry
| → normalized telemetry
| → events
| → aggregated time-series
| → analytics
| → KPI database
| → Forecasting
| → Financial/BI
|
| Optimization/DSS remains downstream and excluded from this checkpoint.
|
|--------------------------------------------------------------------------
*/

export const FINANCIAL_BI_PHASE =
    "10.1";

export const FINANCIAL_BI_LAYER =
    "FINANCIAL_BI";

export const FINANCIAL_BI_UPSTREAM_LAYER =
    "FORECASTING";

export const FINANCIAL_BI_DOWNSTREAM_LAYER =
    "OPTIMIZATION_DSS";

export const FINANCIAL_BI_REPORTING_SEMANTICS =
    "[start,end)";


export const FINANCIAL_BI_STATUS =
    Object.freeze({
        CONTRACT_DEFINED:
            "CONTRACT_DEFINED",

        NOT_CALCULATED:
            "NOT_CALCULATED",

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const FINANCIAL_BI_INPUT_STATUS =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        PARTIALLY_QUALIFIED:
            "PARTIALLY_QUALIFIED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const FINANCIAL_BI_METRIC_KIND =
    Object.freeze({
        ENERGY:
            "ENERGY",

        POWER:
            "POWER",

        COST:
            "COST",

        REVENUE:
            "REVENUE",

        SAVINGS:
            "SAVINGS",

        UTILIZATION:
            "UTILIZATION",

        RELIABILITY:
            "RELIABILITY",

        PERFORMANCE:
            "PERFORMANCE",

        EMISSIONS:
            "EMISSIONS",

        COUNT:
            "COUNT",

        DURATION:
            "DURATION",

        RATIO:
            "RATIO",
    });


export const FINANCIAL_BI_VALUE_KIND =
    Object.freeze({
        NUMERIC:
            "NUMERIC",

        CURRENCY:
            "CURRENCY",

        PERCENTAGE:
            "PERCENTAGE",

        DURATION:
            "DURATION",

        COUNT:
            "COUNT",
    });


export const FINANCIAL_BI_SCOPE =
    Object.freeze({
        SITE:
            "SITE",

        FLEET:
            "FLEET",
    });


export const FINANCIAL_BI_SOURCE_KIND =
    Object.freeze({
        KPI_DATABASE:
            "KPI_DATABASE",

        FORECAST:
            "FORECAST",

        ENGINEERING_ANALYTICS:
            "ENGINEERING_ANALYTICS",

        EXPLICIT_FINANCIAL_INPUT:
            "EXPLICIT_FINANCIAL_INPUT",
    });


export const FINANCIAL_BI_BOUNDARIES =
    Object.freeze({
        upstreamForecastingRequired:
            true,

        reportingSemanticsPreserved:
            true,

        calculationExecuted:
            false,

        aggregationExecuted:
            false,

        currencyConversionExecuted:
            false,

        tariffInferenceAllowed:
            false,

        currencyInferenceAllowed:
            false,

        unitInferenceAllowed:
            false,

        taxInferenceAllowed:
            false,

        escalationInferenceAllowed:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        forecastMutationIncluded:
            false,

        engineeringAnalyticsMutationIncluded:
            false,

        telemetryMutationIncluded:
            false,

        eventMutationIncluded:
            false,

        persistenceIncluded:
            false,

        apiIncluded:
            false,

        dashboardIncluded:
            false,

        optimizationDssIncluded:
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


function normalizeDate(
    value,
    field
) {
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
            `${field}_INVALID`
        );
    }

    return date;
}


function assertControlledValue({
    value,
    values,
    field,
} = {}) {
    if (
        !Object.values(
            values
        ).includes(
            value
        )
    ) {
        throw new Error(
            `${field}_INVALID`
        );
    }
}


export function buildFinancialBiReportingWindow({
    start,
    end,
    timezone,
} = {}) {
    const normalizedStart =
        normalizeDate(
            start,
            "REPORTING_START"
        );

    const normalizedEnd =
        normalizeDate(
            end,
            "REPORTING_END"
        );

    if (
        normalizedEnd <=
            normalizedStart
    ) {
        throw new Error(
            "REPORTING_WINDOW_INVALID"
        );
    }

    return Object.freeze({
        start:
            normalizedStart,

        end:
            normalizedEnd,

        timezone:
            requireNonEmptyString(
                timezone,
                "REPORTING_TIMEZONE"
            ),

        semantics:
            FINANCIAL_BI_REPORTING_SEMANTICS,
    });
}


export function buildFinancialBiMetricDefinition({
    name,
    kind,
    valueKind,
    unit = null,
    currency = null,
    scope = FINANCIAL_BI_SCOPE.SITE,
    sourceKind,
} = {}) {
    const normalizedName =
        requireNonEmptyString(
            name,
            "METRIC_NAME"
        );

    assertControlledValue({
        value:
            kind,

        values:
            FINANCIAL_BI_METRIC_KIND,

        field:
            "METRIC_KIND",
    });

    assertControlledValue({
        value:
            valueKind,

        values:
            FINANCIAL_BI_VALUE_KIND,

        field:
            "VALUE_KIND",
    });

    assertControlledValue({
        value:
            scope,

        values:
            FINANCIAL_BI_SCOPE,

        field:
            "SCOPE",
    });

    assertControlledValue({
        value:
            sourceKind,

        values:
            FINANCIAL_BI_SOURCE_KIND,

        field:
            "SOURCE_KIND",
    });

    let normalizedUnit =
        null;

    let normalizedCurrency =
        null;

    if (
        valueKind ===
            FINANCIAL_BI_VALUE_KIND.CURRENCY
    ) {
        normalizedCurrency =
            requireNonEmptyString(
                currency,
                "CURRENCY"
            );

        if (
            unit !==
                null &&
            unit !==
                undefined
        ) {
            normalizedUnit =
                requireNonEmptyString(
                    unit,
                    "UNIT"
                );
        }
    } else {
        if (
            currency !==
                null &&
            currency !==
                undefined
        ) {
            throw new Error(
                "CURRENCY_NOT_ALLOWED_FOR_NON_CURRENCY_METRIC"
            );
        }

        if (
            valueKind ===
                FINANCIAL_BI_VALUE_KIND.NUMERIC ||
            valueKind ===
                FINANCIAL_BI_VALUE_KIND.DURATION
        ) {
            normalizedUnit =
                requireNonEmptyString(
                    unit,
                    "UNIT"
                );
        } else if (
            unit !==
                null &&
            unit !==
                undefined
        ) {
            normalizedUnit =
                requireNonEmptyString(
                    unit,
                    "UNIT"
                );
        }
    }

    return Object.freeze({
        name:
            normalizedName,

        kind,

        valueKind,

        unit:
            normalizedUnit,

        currency:
            normalizedCurrency,

        scope,

        sourceKind,

        calculated:
            false,

        status:
            FINANCIAL_BI_STATUS.CONTRACT_DEFINED,
    });
}


export function createFinancialBiContract({
    reportingWindow,
    metrics,
    upstream = null,
} = {}) {
    if (
        !reportingWindow ||
        reportingWindow.semantics !==
            FINANCIAL_BI_REPORTING_SEMANTICS
    ) {
        throw new Error(
            "REPORTING_WINDOW_REQUIRED"
        );
    }

    if (
        !Array.isArray(
            metrics
        )
    ) {
        throw new Error(
            "METRICS_ARRAY_REQUIRED"
        );
    }

    const names =
        new Set();

    for (
        const metric of
        metrics
    ) {
        if (
            !metric ||
            metric.status !==
                FINANCIAL_BI_STATUS.CONTRACT_DEFINED
        ) {
            throw new Error(
                "METRIC_DEFINITION_INVALID"
            );
        }

        if (
            names.has(
                metric.name
            )
        ) {
            throw new Error(
                "DUPLICATE_METRIC_NAME"
            );
        }

        names.add(
            metric.name
        );
    }

    return Object.freeze({
        phase:
            FINANCIAL_BI_PHASE,

        layer:
            FINANCIAL_BI_LAYER,

        architecture:
            Object.freeze({
                upstream:
                    FINANCIAL_BI_UPSTREAM_LAYER,

                current:
                    FINANCIAL_BI_LAYER,

                downstream:
                    FINANCIAL_BI_DOWNSTREAM_LAYER,
            }),

        reportingWindow,

        metrics,

        metricCount:
            metrics.length,

        upstream,

        status:
            FINANCIAL_BI_STATUS.CONTRACT_DEFINED,

        calculation:
            Object.freeze({
                executed:
                    false,

                status:
                    FINANCIAL_BI_STATUS.NOT_CALCULATED,

                values:
                    null,
            }),

        boundaries:
            FINANCIAL_BI_BOUNDARIES,
    });
}
