
// services/financialBi/financialBiApiContract.js

import {
    FINANCIAL_BI_SCOPE,
    FINANCIAL_BI_REPORTING_SEMANTICS,
}
    from "./financialBiContract.js";


export const FINANCIAL_BI_API_CONTRACT_PHASE =
    "10.9";

export const FINANCIAL_BI_API_CONTRACT_LAYER =
    "FINANCIAL_BI";

export const FINANCIAL_BI_API_CONTRACT_UPSTREAM_PHASE =
    "10.8";


export const FINANCIAL_BI_API_HTTP_METHOD =
    Object.freeze({
        GET:
            "GET",
    });


export const FINANCIAL_BI_API_ENDPOINT =
    Object.freeze({
        LIST_KPIS:
            "/api/financial-bi/kpis",

        GET_KPI_BY_PERSISTENCE_KEY:
            "/api/financial-bi/kpis/:persistenceKey",
    });


export const FINANCIAL_BI_API_RESPONSE_STATUS =
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


export const FINANCIAL_BI_API_SORT_DIRECTION =
    Object.freeze({
        ASC:
            "asc",

        DESC:
            "desc",
    });


export const FINANCIAL_BI_API_SORT_FIELD =
    Object.freeze({
        REPORTING_START:
            "reportingStart",

        REPORTING_END:
            "reportingEnd",

        METRIC_NAME:
            "metricName",

        CREATED_AT:
            "createdAt",
    });


export const FINANCIAL_BI_API_DEFAULTS =
    Object.freeze({
        page:
            1,

        limit:
            50,

        maxLimit:
            200,

        sortField:
            FINANCIAL_BI_API_SORT_FIELD.REPORTING_START,

        sortDirection:
            FINANCIAL_BI_API_SORT_DIRECTION.DESC,
    });


export const FINANCIAL_BI_API_CONTRACT_BOUNDARIES =
    Object.freeze({
        readOnly:
            true,

        persistedRecordsOnly:
            true,

        upstreamPhaseRequired:
            "10.8",

        reportingWindowSemantics:
            FINANCIAL_BI_REPORTING_SEMANTICS,

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

        queryMutationIncluded:
            false,

        persistenceWriteIncluded:
            false,

        persistenceDeleteIncluded:
            false,

        forecastMutationIncluded:
            false,

        engineeringAnalyticsMutationIncluded:
            false,

        telemetryMutationIncluded:
            false,

        eventMutationIncluded:
            false,

        expressRouteMountIncluded:
            false,

        liveHttpExecutionIncluded:
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


function normalizeOptionalString(
    value
) {
    if (
        value ===
            undefined ||
        value ===
            null ||
        value ===
            ""
    ) {
        return null;
    }

    if (
        typeof value !==
            "string"
    ) {
        throw new Error(
            "STRING_FILTER_INVALID"
        );
    }

    return value.trim() ||
        null;
}


function normalizeDate(
    value,
    field
) {
    if (
        value ===
            undefined ||
        value ===
            null ||
        value ===
            ""
    ) {
        return null;
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
            `${field}_INVALID`
        );
    }

    return date;
}


function normalizePositiveInteger({
    value,
    defaultValue,
    maxValue = null,
    field,
} = {}) {
    if (
        value ===
            undefined ||
        value ===
            null ||
        value ===
            ""
    ) {
        return defaultValue;
    }

    const number =
        typeof value ===
            "number"
            ? value
            : Number(
                value
            );

    if (
        !Number.isInteger(
            number
        ) ||
        number <
            1
    ) {
        throw new Error(
            `${field}_INVALID`
        );
    }

    if (
        maxValue !==
            null &&
        number >
            maxValue
    ) {
        throw new Error(
            `${field}_EXCEEDS_MAXIMUM`
        );
    }

    return number;
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


export function buildFinancialBiKpiListQuery({
    scope = null,
    vrmSiteId = null,
    fleetId = null,
    metricName = null,
    reportingStart = null,
    reportingEnd = null,
    timezone = null,
    page = FINANCIAL_BI_API_DEFAULTS.page,
    limit = FINANCIAL_BI_API_DEFAULTS.limit,
    sortField = FINANCIAL_BI_API_DEFAULTS.sortField,
    sortDirection = FINANCIAL_BI_API_DEFAULTS.sortDirection,
} = {}) {
    const normalizedScope =
        normalizeOptionalString(
            scope
        );

    if (
        normalizedScope !==
            null
    ) {
        assertControlledValue({
            value:
                normalizedScope,

            container:
                FINANCIAL_BI_SCOPE,

            field:
                "SCOPE",
        });
    }

    const normalizedSiteId =
        normalizeOptionalString(
            vrmSiteId
        );

    const normalizedFleetId =
        normalizeOptionalString(
            fleetId
        );

    if (
        normalizedScope ===
            FINANCIAL_BI_SCOPE.SITE &&
        !normalizedSiteId
    ) {
        throw new Error(
            "VRM_SITE_ID_REQUIRED_FOR_SITE_SCOPE"
        );
    }

    if (
        normalizedScope ===
            FINANCIAL_BI_SCOPE.FLEET &&
        !normalizedFleetId
    ) {
        throw new Error(
            "FLEET_ID_REQUIRED_FOR_FLEET_SCOPE"
        );
    }

    if (
        normalizedSiteId &&
        normalizedFleetId
    ) {
        throw new Error(
            "SITE_AND_FLEET_FILTERS_MUTUALLY_EXCLUSIVE"
        );
    }

    if (
        normalizedSiteId &&
        normalizedScope ===
            FINANCIAL_BI_SCOPE.FLEET
    ) {
        throw new Error(
            "SITE_ID_INVALID_FOR_FLEET_SCOPE"
        );
    }

    if (
        normalizedFleetId &&
        normalizedScope ===
            FINANCIAL_BI_SCOPE.SITE
    ) {
        throw new Error(
            "FLEET_ID_INVALID_FOR_SITE_SCOPE"
        );
    }

    const start =
        normalizeDate(
            reportingStart,
            "REPORTING_START"
        );

    const end =
        normalizeDate(
            reportingEnd,
            "REPORTING_END"
        );

    if (
        start &&
        end &&
        end <=
            start
    ) {
        throw new Error(
            "REPORTING_WINDOW_INVALID"
        );
    }

    const normalizedPage =
        normalizePositiveInteger({
            value:
                page,

            defaultValue:
                FINANCIAL_BI_API_DEFAULTS.page,

            field:
                "PAGE",
        });

    const normalizedLimit =
        normalizePositiveInteger({
            value:
                limit,

            defaultValue:
                FINANCIAL_BI_API_DEFAULTS.limit,

            maxValue:
                FINANCIAL_BI_API_DEFAULTS.maxLimit,

            field:
                "LIMIT",
        });

    assertControlledValue({
        value:
            sortField,

        container:
            FINANCIAL_BI_API_SORT_FIELD,

        field:
            "SORT_FIELD",
    });

    assertControlledValue({
        value:
            sortDirection,

        container:
            FINANCIAL_BI_API_SORT_DIRECTION,

        field:
            "SORT_DIRECTION",
    });

    return Object.freeze({
        phase:
            FINANCIAL_BI_API_CONTRACT_PHASE,

        layer:
            FINANCIAL_BI_API_CONTRACT_LAYER,

        upstreamPhase:
            FINANCIAL_BI_API_CONTRACT_UPSTREAM_PHASE,

        endpoint:
            FINANCIAL_BI_API_ENDPOINT.LIST_KPIS,

        method:
            FINANCIAL_BI_API_HTTP_METHOD.GET,

        filters:
            Object.freeze({
                scope:
                    normalizedScope,

                vrmSiteId:
                    normalizedSiteId,

                fleetId:
                    normalizedFleetId,

                metricName:
                    normalizeOptionalString(
                        metricName
                    ),

                reportingStart:
                    start,

                reportingEnd:
                    end,

                timezone:
                    normalizeOptionalString(
                        timezone
                    ),

                reportingSemantics:
                    FINANCIAL_BI_REPORTING_SEMANTICS,
            }),

        pagination:
            Object.freeze({
                page:
                    normalizedPage,

                limit:
                    normalizedLimit,

                offset:
                    (
                        normalizedPage -
                        1
                    ) *
                    normalizedLimit,
            }),

        sort:
            Object.freeze({
                field:
                    sortField,

                direction:
                    sortDirection,
            }),

        readOnly:
            true,

        boundaries:
            FINANCIAL_BI_API_CONTRACT_BOUNDARIES,
    });
}


export function buildFinancialBiKpiByKeyQuery({
    persistenceKey,
} = {}) {
    const normalizedPersistenceKey =
        requireNonEmptyString(
            persistenceKey,
            "PERSISTENCE_KEY"
        );

    if (
        normalizedPersistenceKey.length !==
            64 ||
        !/^[a-f0-9]{64}$/i.test(
            normalizedPersistenceKey
        )
    ) {
        throw new Error(
            "PERSISTENCE_KEY_INVALID"
        );
    }

    return Object.freeze({
        phase:
            FINANCIAL_BI_API_CONTRACT_PHASE,

        layer:
            FINANCIAL_BI_API_CONTRACT_LAYER,

        upstreamPhase:
            FINANCIAL_BI_API_CONTRACT_UPSTREAM_PHASE,

        endpoint:
            FINANCIAL_BI_API_ENDPOINT.GET_KPI_BY_PERSISTENCE_KEY,

        method:
            FINANCIAL_BI_API_HTTP_METHOD.GET,

        persistenceKey:
            normalizedPersistenceKey.toLowerCase(),

        readOnly:
            true,

        boundaries:
            FINANCIAL_BI_API_CONTRACT_BOUNDARIES,
    });
}


export function buildFinancialBiApiEnvelope({
    status,
    data = null,
    meta = null,
    error = null,
} = {}) {
    assertControlledValue({
        value:
            status,

        container:
            FINANCIAL_BI_API_RESPONSE_STATUS,

        field:
            "RESPONSE_STATUS",
    });

    if (
        status ===
            FINANCIAL_BI_API_RESPONSE_STATUS.OK &&
        error !==
            null
    ) {
        throw new Error(
            "OK_RESPONSE_CANNOT_CONTAIN_ERROR"
        );
    }

    if (
        status !==
            FINANCIAL_BI_API_RESPONSE_STATUS.OK &&
        data !==
            null
    ) {
        throw new Error(
            "NON_OK_RESPONSE_CANNOT_CONTAIN_DATA"
        );
    }

    return Object.freeze({
        phase:
            FINANCIAL_BI_API_CONTRACT_PHASE,

        layer:
            FINANCIAL_BI_API_CONTRACT_LAYER,

        status,

        data,

        meta,

        error,

        readOnly:
            true,
    });
}
