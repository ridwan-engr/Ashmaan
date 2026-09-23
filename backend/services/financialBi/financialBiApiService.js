// services/financialBi/financialBiApiService.js

import {
    FINANCIAL_BI_API_CONTRACT_PHASE,
    FINANCIAL_BI_API_RESPONSE_STATUS,
    buildFinancialBiKpiListQuery,
    buildFinancialBiKpiByKeyQuery,
    buildFinancialBiApiEnvelope,
}
    from "./financialBiApiContract.js";

import {
    authorizeFinancialBiRecord,
    FINANCIAL_BI_AUTHORIZATION_STATUS,
}
    from "../security/financialBiRecordAuthorizationService.js";
import {
    resolveFinancialBiCollectionScope,
    FINANCIAL_BI_COLLECTION_SCOPE_STATUS,
}
    from "../security/financialBiCollectionScopeService.js";

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
    userId = null,
    repository,

    resolveCollectionScope =
    resolveFinancialBiCollectionScope,
} = {}) {
    validateRepository(
        repository
    );

    if (
        typeof resolveCollectionScope !==
        "function"
    ) {
        throw new Error(
            "FINANCIAL_BI_COLLECTION_SCOPE_RESOLVER_REQUIRED"
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Preserve the existing public query contract
    |--------------------------------------------------------------------------
    */

    const apiQuery =
        buildFinancialBiKpiListQuery(
            query
        );

    /*
    |--------------------------------------------------------------------------
    | Resolve row-level collection authorization
    |--------------------------------------------------------------------------
    */

    let authorization;

    try {
        authorization =
            await resolveCollectionScope({
                userId,

                requestedScope:
                    apiQuery.filters
                        .scope ??
                    null,

                requestedVrmSiteId:
                    apiQuery.filters
                        .vrmSiteId ??
                    null,
            });
    } catch {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS
                    .UNAVAILABLE,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_AUTHORIZATION_UNAVAILABLE",
                }),
        });
    }

    /*
    |--------------------------------------------------------------------------
    | EMPTY
    |--------------------------------------------------------------------------
    |
    | Empty entitlement is a successful empty collection.
    |
    | CRITICAL:
    | repository.listKpis() must not execute.
    |
    |--------------------------------------------------------------------------
    */

    if (
        authorization?.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .EMPTY
    ) {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS
                    .OK,

            data:
                Object.freeze({
                    items:
                        Object.freeze([]),
                }),

            meta:
                Object.freeze({
                    page:
                        apiQuery.pagination
                            .page,

                    limit:
                        apiQuery.pagination
                            .limit,

                    offset:
                        apiQuery.pagination
                            .offset,

                    total:
                        0,

                    sort:
                        apiQuery.sort,

                    filters:
                        apiQuery.filters,
                }),
        });
    }

    /*
    |--------------------------------------------------------------------------
    | FORBIDDEN
    |--------------------------------------------------------------------------
    */

    if (
        authorization?.status ===
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .FORBIDDEN
    ) {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS
                    .INVALID_REQUEST,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_ACCESS_DENIED",

                    reason:
                        authorization.reason ??
                        null,
                }),
        });
    }

    /*
    |--------------------------------------------------------------------------
    | UNAVAILABLE / malformed authorization result
    |--------------------------------------------------------------------------
    */

    if (
        authorization?.status !==
        FINANCIAL_BI_COLLECTION_SCOPE_STATUS
            .RESOLVED ||
        !Array.isArray(
            authorization
                ?.authorizedVrmSiteIds
        )
    ) {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS
                    .UNAVAILABLE,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_AUTHORIZATION_UNAVAILABLE",

                    reason:
                        authorization?.reason ??
                        null,
                }),
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Defense against malformed RESOLVED + empty entitlement
    |--------------------------------------------------------------------------
    */

    if (
        authorization
            .authorizedVrmSiteIds
            .length === 0
    ) {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS
                    .UNAVAILABLE,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_AUTHORIZATION_UNAVAILABLE",

                    reason:
                        "RESOLVED_SCOPE_EMPTY",
                }),
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Repository query
    |--------------------------------------------------------------------------
    |
    | Public filters remain intact, while authorizedVrmSiteIds is injected
    | as an internal repository-only security constraint.
    |
    |--------------------------------------------------------------------------
    */

    const repositoryFilters =
        Object.freeze({
            ...apiQuery.filters,

            authorizedVrmSiteIds:
                authorization
                    .authorizedVrmSiteIds,
        });

    const result =
        await repository
            .listKpis({
                filters:
                    repositoryFilters,

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
                FINANCIAL_BI_API_RESPONSE_STATUS
                    .UNAVAILABLE,

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
            FINANCIAL_BI_API_RESPONSE_STATUS
                .OK,

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

                /*
                 * Keep meta.filters as the PUBLIC query
                 * contract. Do not expose authorization
                 * site sets in the API response.
                 */
                filters:
                    apiQuery.filters,
            }),
    });
}

export async function getFinancialBiKpiByPersistenceKey({
    persistenceKey,
    userId = null,
    repository,
    authorizeRecord =
        authorizeFinancialBiRecord,
} = {}) {
    validateRepository(
        repository
    );

    if (
        typeof authorizeRecord !==
        "function"
    ) {
        throw new Error(
            "FINANCIAL_BI_RECORD_AUTHORIZER_REQUIRED"
        );
    }

    const apiQuery =
        buildFinancialBiKpiByKeyQuery({
            persistenceKey,
        });

    /*
    |--------------------------------------------------------------------------
    | Opaque persistence-key lookup
    |--------------------------------------------------------------------------
    |
    | persistenceKey does not contain an authoritative authorization identity.
    | The record must therefore be resolved before SITE/FLEET authorization.
    |
    |--------------------------------------------------------------------------
    */

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
                FINANCIAL_BI_API_RESPONSE_STATUS
                    .NOT_FOUND,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_KPI_NOT_FOUND",

                    persistenceKey:
                        apiQuery.persistenceKey,
                }),
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Record authorization
    |--------------------------------------------------------------------------
    |
    | No retrieved record may be normalized or returned before authorization.
    |
    |--------------------------------------------------------------------------
    */

    let authorization;

    try {
        authorization =
            await authorizeRecord({
                userId,

                scope:
                    record.scope,

                scopeIdentity:
                    record.scopeIdentity ??
                    {},
            });
    } catch {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS
                    .UNAVAILABLE,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_AUTHORIZATION_UNAVAILABLE",
                }),
        });
    }

    /*
    |--------------------------------------------------------------------------
    | FORBIDDEN
    |--------------------------------------------------------------------------
    */

    if (
        authorization?.status ===
        FINANCIAL_BI_AUTHORIZATION_STATUS
            .FORBIDDEN
    ) {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS
                    .INVALID_REQUEST,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_ACCESS_DENIED",

                    reason:
                        authorization.reason ??
                        null,
                }),
        });
    }

    /*
    |--------------------------------------------------------------------------
    | UNAVAILABLE / malformed authorization result
    |--------------------------------------------------------------------------
    */

    if (
        authorization?.status !==
            FINANCIAL_BI_AUTHORIZATION_STATUS
                .AUTHORIZED ||
        authorization?.authorized !==
            true
    ) {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS
                    .UNAVAILABLE,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_AUTHORIZATION_UNAVAILABLE",

                    reason:
                        authorization?.reason ??
                        null,
                }),
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Authorized response
    |--------------------------------------------------------------------------
    */

    const normalized =
        normalizeRecord(
            record
        );

    if (
        !normalized
    ) {
        return buildFinancialBiApiEnvelope({
            status:
                FINANCIAL_BI_API_RESPONSE_STATUS
                    .UNAVAILABLE,

            error:
                Object.freeze({
                    code:
                        "FINANCIAL_BI_REPOSITORY_UNAVAILABLE",
                }),
        });
    }

    return buildFinancialBiApiEnvelope({
        status:
            FINANCIAL_BI_API_RESPONSE_STATUS
                .OK,

        data:
            normalized,
    });
}
