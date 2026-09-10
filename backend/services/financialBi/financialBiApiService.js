// services/financialBi/financialBiApiService.js

import {
    FINANCIAL_BI_API_CONTRACT_PHASE,
    FINANCIAL_BI_API_RESPONSE_STATUS,
    buildFinancialBiKpiListQuery,
    buildFinancialBiKpiByKeyQuery,
    buildFinancialBiApiEnvelope,
}
    from "./financialBiApiContract.js";


export const FINANCIAL_BI_API_IMPLEMENTATION_PHASE =
    "10.10";

export const FINANCIAL_BI_API_IMPLEMENTATION_LAYER =
    "FINANCIAL_BI";

export const FINANCIAL_BI_API_IMPLEMENTATION_UPSTREAM_PHASE =
    FINANCIAL_BI_API_CONTRACT_PHASE;


export const FINANCIAL_BI_API_IMPLEMENTATION_BOUNDARIES =
    Object.freeze({
        readOnly:
            true,

        persistedRecordsOnly:
            true,

        repositoryReadIncluded:
            true,

        repositoryWriteIncluded:
            false,

        repositoryDeleteIncluded:
            false,

        expressRouterDefined:
            true,

        serverMountIncluded:
            false,

        liveHttpExecutionValidated:
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

        forecastMutationIncluded:
            false,

        engineeringAnalyticsMutationIncluded:
            false,

        telemetryMutationIncluded:
            false,

        eventMutationIncluded:
            false,

        dashboardIncluded:
            false,

        optimizationDssIncluded:
            false,
    });


function validateRepository(
    repository
) {
    if (
        !repository ||
        typeof repository.listKpis !==
            "function" ||
        typeof repository.findByPersistenceKey !==
            "function"
    ) {
        throw new Error(
            "FINANCIAL_BI_READ_REPOSITORY_REQUIRED"
        );
    }
}


function normalizeRecord(
    record
) {
    if (
        !record ||
        typeof record !==
            "object"
    ) {
        return null;
    }

    return Object.freeze({
        id:
            record._id ===
                undefined ||
            record._id ===
                null
                ? null
                : String(
                    record._id
                ),

        persistenceKey:
            record.persistenceKey,

        recordKind:
            record.recordKind,

        metricName:
            record.metricName,

        scope:
            record.scope,

        scopeIdentity:
            record.scopeIdentity,

        reportingWindow:
            record.reportingWindow,

        lineage:
            record.lineage,

        payload:
            record.payload,

        phase:
            record.phase,

        upstreamPhase:
            record.upstreamPhase,

        layer:
            record.layer,

        createdAt:
            record.createdAt ??
            null,

        updatedAt:
            record.updatedAt ??
            null,
    });
}


export async function listFinancialBiKpis({
    query = {},
    repository,
} = {}) {
    validateRepository(
        repository
    );

    const apiQuery =
        buildFinancialBiKpiListQuery(
            query
        );

    const result =
        await repository
            .listKpis({
                filters:
                    apiQuery.filters,

                pagination:
                    apiQuery.pagination,

                sort:
                    apiQuery.sort,
            });

    if (
        !result ||
        !Array.isArray(
            result.items
        ) ||
        !Number.isInteger(
            result.total
        ) ||
        result.total <
            0
    ) {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS.UNAVAILABLE,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_REPOSITORY_UNAVAILABLE",
                }),
        });
    }

    const items =
        result.items
            .map(
                normalizeRecord
            )
            .filter(
                Boolean
            );

    return buildFinancialBiApiEnvelope({
        status:
            FINANCIAL_BI_API_RESPONSE_STATUS.OK,

        data:
            Object.freeze({
                items:
                    Object.freeze(
                        items
                    ),
            }),

        meta:
            Object.freeze({
                page:
                    apiQuery.pagination.page,

                limit:
                    apiQuery.pagination.limit,

                offset:
                    apiQuery.pagination.offset,

                total:
                    result.total,

                sort:
                    apiQuery.sort,

                filters:
                    apiQuery.filters,
            }),
    });
}


export async function getFinancialBiKpiByPersistenceKey({
    persistenceKey,
    repository,
} = {}) {
    validateRepository(
        repository
    );

    const apiQuery =
        buildFinancialBiKpiByKeyQuery({
            persistenceKey,
        });

    const record =
        await repository
            .findByPersistenceKey({
                persistenceKey:
                    apiQuery.persistenceKey,
            });

    if (
        record ===
            null ||
        record ===
            undefined
    ) {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS.NOT_FOUND,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_KPI_NOT_FOUND",

                    persistenceKey:
                        apiQuery.persistenceKey,
                }),
        });
    }

    const normalized =
        normalizeRecord(
            record
        );

    if (
        !normalized
    ) {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS.UNAVAILABLE,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_REPOSITORY_UNAVAILABLE",
                }),
        });
    }

    return buildFinancialBiApiEnvelope({
        status:
            FINANCIAL_BI_API_RESPONSE_STATUS.OK,

        data:
            normalized,
    });
}
