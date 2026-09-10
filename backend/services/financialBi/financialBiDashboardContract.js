// services/financialBi/financialBiDashboardContract.js

import {
    FINANCIAL_BI_API_RESPONSE_STATUS,
    FINANCIAL_BI_API_ENDPOINT,
}
    from "./financialBiApiContract.js";


export const FINANCIAL_BI_DASHBOARD_CONTRACT_PHASE =
    "10.11";

export const FINANCIAL_BI_DASHBOARD_CONTRACT_LAYER =
    "FINANCIAL_BI";

export const FINANCIAL_BI_DASHBOARD_CONTRACT_UPSTREAM_PHASE =
    "10.10";


export const FINANCIAL_BI_DASHBOARD_VIEW =
    Object.freeze({
        KPI_OVERVIEW:
            "KPI_OVERVIEW",

        KPI_TABLE:
            "KPI_TABLE",

        KPI_TREND:
            "KPI_TREND",
    });


export const FINANCIAL_BI_DASHBOARD_STATE =
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


export const FINANCIAL_BI_DASHBOARD_FILTER =
    Object.freeze({
        SCOPE:
            "scope",

        VRM_SITE_ID:
            "vrmSiteId",

        FLEET_ID:
            "fleetId",

        METRIC_NAME:
            "metricName",

        REPORTING_START:
            "reportingStart",

        REPORTING_END:
            "reportingEnd",

        TIMEZONE:
            "timezone",
    });


export const FINANCIAL_BI_DASHBOARD_TABLE_COLUMN =
    Object.freeze({
        METRIC_NAME:
            "metricName",

        SCOPE:
            "scope",

        SCOPE_IDENTITY:
            "scopeIdentity",

        REPORTING_START:
            "reportingStart",

        REPORTING_END:
            "reportingEnd",

        STATUS:
            "status",

        VALUE:
            "value",

        UNIT:
            "unit",

        CURRENCY:
            "currency",
    });


export const FINANCIAL_BI_DASHBOARD_CHART_FIELD =
    Object.freeze({
        X:
            "reportingStart",

        Y:
            "value",

        SERIES:
            "metricName",
    });


export const FINANCIAL_BI_DASHBOARD_CONTRACT_BOUNDARIES =
    Object.freeze({
        readOnly:
            true,

        apiReadRequired:
            true,

        upstreamApiPhaseRequired:
            "10.10",

        apiEndpoint:
            FINANCIAL_BI_API_ENDPOINT.LIST_KPIS,

        apiResponseStatusRequired:
            FINANCIAL_BI_API_RESPONSE_STATUS.OK,

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

        writeActionIncluded:
            false,

        deleteActionIncluded:
            false,

        persistenceMutationIncluded:
            false,

        forecastingMutationIncluded:
            false,

        engineeringAnalyticsMutationIncluded:
            false,

        telemetryMutationIncluded:
            false,

        eventMutationIncluded:
            false,

        reactImplementationIncluded:
            false,

        viteBuildIncluded:
            false,

        liveHttpValidationIncluded:
            false,

        optimizationDssIncluded:
            false,
    });


function assertNonEmptyString(
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


function assertControlledValue({
    value,
    container,
    field,
} = {}) {
    if (
        !Object.values(
            container
        ).includes(
            value
        )
    ) {
        throw new Error(
            `${field}_INVALID`
        );
    }
}


export function buildFinancialBiDashboardCard({
    id,
    label,
    metricName,
    valueField = "value",
    unitField = "unit",
    currencyField = "currency",
    statusField = "status",
} = {}) {
    return Object.freeze({
        id:
            assertNonEmptyString(
                id,
                "CARD_ID"
            ),

        label:
            assertNonEmptyString(
                label,
                "CARD_LABEL"
            ),

        metricName:
            assertNonEmptyString(
                metricName,
                "CARD_METRIC_NAME"
            ),

        valueField:
            assertNonEmptyString(
                valueField,
                "CARD_VALUE_FIELD"
            ),

        unitField:
            assertNonEmptyString(
                unitField,
                "CARD_UNIT_FIELD"
            ),

        currencyField:
            assertNonEmptyString(
                currencyField,
                "CARD_CURRENCY_FIELD"
            ),

        statusField:
            assertNonEmptyString(
                statusField,
                "CARD_STATUS_FIELD"
            ),

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,
    });
}


export function buildFinancialBiDashboardContract({
    title,
    views,
    filters,
    cards,
    tableColumns,
    chart,
    api,
} = {}) {
    const normalizedTitle =
        assertNonEmptyString(
            title,
            "DASHBOARD_TITLE"
        );

    if (
        !Array.isArray(
            views
        ) ||
        views.length ===
            0
    ) {
        throw new Error(
            "DASHBOARD_VIEWS_REQUIRED"
        );
    }

    for (
        const view of
        views
    ) {
        assertControlledValue({
            value:
                view,

            container:
                FINANCIAL_BI_DASHBOARD_VIEW,

            field:
                "DASHBOARD_VIEW",
        });
    }

    if (
        new Set(
            views
        ).size !==
            views.length
    ) {
        throw new Error(
            "DUPLICATE_DASHBOARD_VIEW"
        );
    }

    if (
        !Array.isArray(
            filters
        )
    ) {
        throw new Error(
            "DASHBOARD_FILTERS_REQUIRED"
        );
    }

    for (
        const filter of
        filters
    ) {
        assertControlledValue({
            value:
                filter,

            container:
                FINANCIAL_BI_DASHBOARD_FILTER,

            field:
                "DASHBOARD_FILTER",
        });
    }

    if (
        new Set(
            filters
        ).size !==
            filters.length
    ) {
        throw new Error(
            "DUPLICATE_DASHBOARD_FILTER"
        );
    }

    if (
        !Array.isArray(
            cards
        ) ||
        cards.length ===
            0
    ) {
        throw new Error(
            "DASHBOARD_CARDS_REQUIRED"
        );
    }

    const cardIds =
        cards.map(
            card =>
                card?.id
        );

    if (
        new Set(
            cardIds
        ).size !==
            cardIds.length
    ) {
        throw new Error(
            "DUPLICATE_DASHBOARD_CARD_ID"
        );
    }

    if (
        !Array.isArray(
            tableColumns
        ) ||
        tableColumns.length ===
            0
    ) {
        throw new Error(
            "DASHBOARD_TABLE_COLUMNS_REQUIRED"
        );
    }

    for (
        const column of
        tableColumns
    ) {
        assertControlledValue({
            value:
                column,

            container:
                FINANCIAL_BI_DASHBOARD_TABLE_COLUMN,

            field:
                "DASHBOARD_TABLE_COLUMN",
        });
    }

    if (
        !chart ||
        typeof chart !==
            "object"
    ) {
        throw new Error(
            "DASHBOARD_CHART_REQUIRED"
        );
    }

    if (
        chart.xField !==
            FINANCIAL_BI_DASHBOARD_CHART_FIELD.X ||
        chart.yField !==
            FINANCIAL_BI_DASHBOARD_CHART_FIELD.Y ||
        chart.seriesField !==
            FINANCIAL_BI_DASHBOARD_CHART_FIELD.SERIES
    ) {
        throw new Error(
            "DASHBOARD_CHART_FIELDS_INVALID"
        );
    }

    if (
        !api ||
        api.endpoint !==
            FINANCIAL_BI_API_ENDPOINT.LIST_KPIS ||
        api.method !==
            "GET" ||
        api.responseStatus !==
            FINANCIAL_BI_API_RESPONSE_STATUS.OK
    ) {
        throw new Error(
            "DASHBOARD_API_CONTRACT_INVALID"
        );
    }

    return Object.freeze({
        phase:
            FINANCIAL_BI_DASHBOARD_CONTRACT_PHASE,

        layer:
            FINANCIAL_BI_DASHBOARD_CONTRACT_LAYER,

        upstreamPhase:
            FINANCIAL_BI_DASHBOARD_CONTRACT_UPSTREAM_PHASE,

        title:
            normalizedTitle,

        views:
            Object.freeze(
                [...views]
            ),

        filters:
            Object.freeze(
                [...filters]
            ),

        cards:
            Object.freeze(
                [...cards]
            ),

        table:
            Object.freeze({
                columns:
                    Object.freeze(
                        [...tableColumns]
                    ),

                readOnly:
                    true,
            }),

        chart:
            Object.freeze({
                xField:
                    chart.xField,

                yField:
                    chart.yField,

                seriesField:
                    chart.seriesField,

                missingMeansZero:
                    false,

                unavailableMeansZero:
                    false,
            }),

        api:
            Object.freeze({
                endpoint:
                    api.endpoint,

                method:
                    api.method,

                responseStatus:
                    api.responseStatus,

                dataPath:
                    api.dataPath ??
                    "data.items",

                metaPath:
                    api.metaPath ??
                    "meta",
            }),

        states:
            Object.freeze(
                Object.values(
                    FINANCIAL_BI_DASHBOARD_STATE
                )
            ),

        actions:
            Object.freeze({
                read:
                    true,

                write:
                    false,

                delete:
                    false,
            }),

        boundaries:
            FINANCIAL_BI_DASHBOARD_CONTRACT_BOUNDARIES,
    });
}

