// services/financialBi/financialBiPersistenceContract.js

import crypto from "node:crypto";

import {
    FINANCIAL_BI_SCOPE,
    FINANCIAL_BI_REPORTING_SEMANTICS,
}
    from "./financialBiContract.js";

import {
    FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_PHASE,
    FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_STATUS,
}
    from "./financialBiKpiAggregationExecutionService.js";


export const FINANCIAL_BI_PERSISTENCE_CONTRACT_PHASE =
    "10.7";

export const FINANCIAL_BI_PERSISTENCE_CONTRACT_LAYER =
    "FINANCIAL_BI";

export const FINANCIAL_BI_PERSISTENCE_CONTRACT_UPSTREAM_PHASE =
    FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_PHASE;


export const FINANCIAL_BI_PERSISTENCE_STATUS =
    Object.freeze({
        CONTRACT_DEFINED:
            "CONTRACT_DEFINED",

        NOT_PERSISTED:
            "NOT_PERSISTED",

        PERSISTED:
            "PERSISTED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const FINANCIAL_BI_PERSISTENCE_RECORD_KIND =
    Object.freeze({
        KPI_AGGREGATION:
            "KPI_AGGREGATION",
    });


export const FINANCIAL_BI_PERSISTENCE_CONTRACT_BOUNDARIES =
    Object.freeze({
        persistenceExecuted:
            false,

        mongoWriteIncluded:
            false,

        deterministicIdentityRequired:
            true,

        idempotencyRequired:
            true,

        reportingWindowPreserved:
            true,

        scopePreserved:
            true,

        lineagePreserved:
            true,

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

        aggregationMutationIncluded:
            false,

        forecastMutationIncluded:
            false,

        engineeringAnalyticsMutationIncluded:
            false,

        telemetryMutationIncluded:
            false,

        eventMutationIncluded:
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


function stableSerialize(
    value
) {
    if (
        value ===
            null ||
        typeof value !==
            "object"
    ) {
        return JSON.stringify(
            value
        );
    }

    if (
        value instanceof Date
    ) {
        return JSON.stringify(
            value.toISOString()
        );
    }

    if (
        Array.isArray(
            value
        )
    ) {
        return `[${value.map(stableSerialize).join(",")}]`;
    }

    const keys =
        Object.keys(
            value
        )
            .sort();

    return `{${keys
        .map(
            key =>
                `${JSON.stringify(key)}:${stableSerialize(value[key])}`
        )
        .join(",")}}`;
}


export function buildFinancialBiPersistenceIdentity({
    recordKind,
    metricName,
    scope,
    scopeIdentity,
    reportingWindow,
} = {}) {
    if (
        recordKind !==
            FINANCIAL_BI_PERSISTENCE_RECORD_KIND.KPI_AGGREGATION
    ) {
        throw new Error(
            "RECORD_KIND_INVALID"
        );
    }

    const normalizedMetricName =
        requireNonEmptyString(
            metricName,
            "METRIC_NAME"
        );

    if (
        !Object.values(
            FINANCIAL_BI_SCOPE
        ).includes(
            scope
        )
    ) {
        throw new Error(
            "SCOPE_INVALID"
        );
    }

    if (
        !reportingWindow ||
        reportingWindow.semantics !==
            FINANCIAL_BI_REPORTING_SEMANTICS
    ) {
        throw new Error(
            "REPORTING_WINDOW_INVALID"
        );
    }

    const start =
        normalizeDate(
            reportingWindow.start,
            "REPORTING_WINDOW_START"
        );

    const end =
        normalizeDate(
            reportingWindow.end,
            "REPORTING_WINDOW_END"
        );

    if (
        end <=
            start
    ) {
        throw new Error(
            "REPORTING_WINDOW_INVALID"
        );
    }

    const timezone =
        requireNonEmptyString(
            reportingWindow.timezone,
            "REPORTING_TIMEZONE"
        );

    let normalizedScopeIdentity;

    if (
        scope ===
            FINANCIAL_BI_SCOPE.SITE
    ) {
        normalizedScopeIdentity =
            Object.freeze({
                vrmSiteId:
                    requireNonEmptyString(
                        scopeIdentity?.vrmSiteId,
                        "VRM_SITE_ID"
                    )
            });
    } else {
        normalizedScopeIdentity =
            Object.freeze({
                fleetId:
                    requireNonEmptyString(
                        scopeIdentity?.fleetId,
                        "FLEET_ID"
                    )
            });
    }

    const canonicalIdentity =
        Object.freeze({
            recordKind,

            metricName:
                normalizedMetricName,

            scope,

            scopeIdentity:
                normalizedScopeIdentity,

            reportingWindow:
                Object.freeze({
                    start,
                    end,
                    timezone,
                    semantics:
                        FINANCIAL_BI_REPORTING_SEMANTICS
                })
        });

    const persistenceKey =
        crypto
            .createHash(
                "sha256"
            )
            .update(
                stableSerialize(
                    canonicalIdentity
                )
            )
            .digest(
                "hex"
            );

    return Object.freeze({
        ...canonicalIdentity,
        persistenceKey
    });
}


export function createFinancialBiPersistenceContract({
    aggregationResult,
    identity,
} = {}) {
    if (
        !aggregationResult ||
        aggregationResult.phase !==
            FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_PHASE
    ) {
        throw new Error(
            "PHASE_10_6_AGGREGATION_RESULT_REQUIRED"
        );
    }

    if (
        !Object.values(
            FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_STATUS
        ).includes(
            aggregationResult.status
        )
    ) {
        throw new Error(
            "AGGREGATION_STATUS_INVALID"
        );
    }

    if (
        !identity ||
        typeof identity.persistenceKey !==
            "string" ||
        !identity.persistenceKey
    ) {
        throw new Error(
            "PERSISTENCE_IDENTITY_REQUIRED"
        );
    }

    const outputMetric =
        aggregationResult.definition?.outputMetric;

    if (
        !outputMetric ||
        outputMetric.name !==
            identity.metricName
    ) {
        throw new Error(
            "METRIC_IDENTITY_MISMATCH"
        );
    }

    if (
        aggregationResult.definition?.scope !==
            identity.scope
    ) {
        throw new Error(
            "SCOPE_IDENTITY_MISMATCH"
        );
    }

    const resultWindow =
        aggregationResult.definition?.reportingWindow;

    if (
        !resultWindow ||
        resultWindow.semantics !==
            FINANCIAL_BI_REPORTING_SEMANTICS
    ) {
        throw new Error(
            "AGGREGATION_REPORTING_WINDOW_INVALID"
        );
    }

    if (
        resultWindow.start.getTime() !==
            identity.reportingWindow.start.getTime() ||
        resultWindow.end.getTime() !==
            identity.reportingWindow.end.getTime() ||
        resultWindow.timezone !==
            identity.reportingWindow.timezone
    ) {
        throw new Error(
            "REPORTING_WINDOW_IDENTITY_MISMATCH"
        );
    }

    const aggregationAvailable =
        aggregationResult.status ===
            FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_STATUS.AGGREGATED ||
        aggregationResult.status ===
            FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_STATUS.PARTIALLY_AGGREGATED;

    const value =
        aggregationAvailable
            ? aggregationResult.result.value
            : null;

    const unit =
        aggregationResult.result.unit ??
        null;

    const currency =
        aggregationResult.result.currency ??
        null;

    const lineage =
        Object.freeze({
            phase10_6:
                aggregationResult.phase,

            phase10_5:
                aggregationResult.upstreamPhase,

            aggregationDefinitionName:
                aggregationResult.definition.name,

            aggregationStatus:
                aggregationResult.status,

            aggregationReason:
                aggregationResult.reason
        });

    return Object.freeze({
        phase:
            FINANCIAL_BI_PERSISTENCE_CONTRACT_PHASE,

        layer:
            FINANCIAL_BI_PERSISTENCE_CONTRACT_LAYER,

        upstreamPhase:
            FINANCIAL_BI_PERSISTENCE_CONTRACT_UPSTREAM_PHASE,

        identity,

        persistenceKey:
            identity.persistenceKey,

        recordKind:
            identity.recordKind,

        metricName:
            identity.metricName,

        scope:
            identity.scope,

        scopeIdentity:
            identity.scopeIdentity,

        reportingWindow:
            identity.reportingWindow,

        sourceAggregation:
            aggregationResult,

        lineage,

        payload:
            Object.freeze({
                status:
                    aggregationResult.status,

                reason:
                    aggregationResult.reason,

                value,

                unit,

                currency,

                available:
                    aggregationAvailable
            }),

        persistence:
            Object.freeze({
                status:
                    FINANCIAL_BI_PERSISTENCE_STATUS.NOT_PERSISTED,

                executed:
                    false,

                documentId:
                    null,

                inserted:
                    false,

                updated:
                    false
            }),

        status:
            FINANCIAL_BI_PERSISTENCE_STATUS.CONTRACT_DEFINED,

        boundaries:
            FINANCIAL_BI_PERSISTENCE_CONTRACT_BOUNDARIES
    });
}
