// services/financialBi/financialBiKpiAggregationContract.js

import {
    FINANCIAL_BI_SCOPE,
    FINANCIAL_BI_REPORTING_SEMANTICS,
}
    from "./financialBiContract.js";

import {
    FINANCIAL_BI_CALCULATION_EXECUTION_PHASE,
}
    from "./financialBiCalculationExecutionService.js";


export const FINANCIAL_BI_KPI_AGGREGATION_CONTRACT_PHASE =
    "10.5";

export const FINANCIAL_BI_KPI_AGGREGATION_CONTRACT_LAYER =
    "FINANCIAL_BI";

export const FINANCIAL_BI_KPI_AGGREGATION_CONTRACT_UPSTREAM_PHASE =
    FINANCIAL_BI_CALCULATION_EXECUTION_PHASE;


export const FINANCIAL_BI_KPI_AGGREGATION_STATUS =
    Object.freeze({
        CONTRACT_DEFINED: "CONTRACT_DEFINED",
        NOT_EXECUTED: "NOT_EXECUTED",
        AGGREGATED: "AGGREGATED",
        PARTIALLY_AGGREGATED: "PARTIALLY_AGGREGATED",
        UNAVAILABLE: "UNAVAILABLE",
    });


export const FINANCIAL_BI_KPI_AGGREGATION_METHOD =
    Object.freeze({
        SUM: "SUM",
        AVERAGE: "AVERAGE",
        MIN: "MIN",
        MAX: "MAX",
        COUNT: "COUNT",
        PASSTHROUGH: "PASSTHROUGH",
    });


export const FINANCIAL_BI_KPI_AGGREGATION_COMPLETENESS =
    Object.freeze({
        ALL_MEMBERS_REQUIRED: "ALL_MEMBERS_REQUIRED",
        PARTIAL_MEMBERS_ALLOWED: "PARTIAL_MEMBERS_ALLOWED",
    });


export const FINANCIAL_BI_KPI_AGGREGATION_BOUNDARIES =
    Object.freeze({
        aggregationExecuted: false,
        calculatedInputsRequired: true,
        reportingWindowPreserved: true,
        scopePreserved: true,
        unitInferenceAllowed: false,
        currencyInferenceAllowed: false,
        currencyConversionAllowed: false,
        missingMeansZero: false,
        unavailableMeansZero: false,
        partialMeansComplete: false,
        crossScopeMergeAllowed: false,
        crossWindowMergeAllowed: false,
        forecastMutationIncluded: false,
        engineeringAnalyticsMutationIncluded: false,
        telemetryMutationIncluded: false,
        eventMutationIncluded: false,
        persistenceIncluded: false,
        apiIncluded: false,
        dashboardIncluded: false,
        optimizationDssIncluded: false,
    });


function requireString(value, field) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${field}_REQUIRED`);
    }

    return value.trim();
}


function assertControlled(value, container, field) {
    if (!Object.values(container).includes(value)) {
        throw new Error(`${field}_INVALID`);
    }
}


export function buildFinancialBiKpiAggregationDefinition({
    name,
    scope,
    scopeIdentity = null,
    method,
    reportingWindow,
    members,
    outputMetric,
    completeness =
        FINANCIAL_BI_KPI_AGGREGATION_COMPLETENESS.ALL_MEMBERS_REQUIRED,
} = {}) {
    const normalizedName =
        requireString(name, "AGGREGATION_NAME");

    assertControlled(
        scope,
        FINANCIAL_BI_SCOPE,
        "AGGREGATION_SCOPE"
    );

    assertControlled(
        method,
        FINANCIAL_BI_KPI_AGGREGATION_METHOD,
        "AGGREGATION_METHOD"
    );

    assertControlled(
        completeness,
        FINANCIAL_BI_KPI_AGGREGATION_COMPLETENESS,
        "AGGREGATION_COMPLETENESS"
    );

    if (
        !reportingWindow ||
        reportingWindow.semantics !== FINANCIAL_BI_REPORTING_SEMANTICS
    ) {
        throw new Error("REPORTING_WINDOW_REQUIRED");
    }

    if (!outputMetric || typeof outputMetric !== "object") {
        throw new Error("OUTPUT_METRIC_REQUIRED");
    }

    if (!Array.isArray(members) || members.length === 0) {
        throw new Error("AGGREGATION_MEMBERS_REQUIRED");
    }

    const normalizedMembers =
        members.map((member, index) => {
            if (!member || typeof member !== "object") {
                throw new Error(`MEMBER_${index}_INVALID`);
            }

            return Object.freeze({
                name:
                    requireString(
                        member.name,
                        `MEMBER_${index}_NAME`
                    ),
                calculation:
                    member.calculation ?? null,
                required:
                    member.required !== false,
            });
        });

    const seen =
        new Set();

    for (const member of normalizedMembers) {
        if (seen.has(member.name)) {
            throw new Error("DUPLICATE_AGGREGATION_MEMBER_NAME");
        }

        seen.add(member.name);
    }

    let normalizedScopeIdentity =
        null;

    if (scope === FINANCIAL_BI_SCOPE.SITE) {
        normalizedScopeIdentity =
            Object.freeze({
                vrmSiteId:
                    requireString(
                        scopeIdentity?.vrmSiteId,
                        "VRM_SITE_ID"
                    ),
            });
    } else if (scopeIdentity !== null && scopeIdentity !== undefined) {
        normalizedScopeIdentity =
            Object.freeze({
                fleetId:
                    requireString(
                        scopeIdentity?.fleetId,
                        "FLEET_ID"
                    ),
            });
    }

    return Object.freeze({
        phase:
            FINANCIAL_BI_KPI_AGGREGATION_CONTRACT_PHASE,

        layer:
            FINANCIAL_BI_KPI_AGGREGATION_CONTRACT_LAYER,

        upstreamPhase:
            FINANCIAL_BI_KPI_AGGREGATION_CONTRACT_UPSTREAM_PHASE,

        name:
            normalizedName,

        scope,

        scopeIdentity:
            normalizedScopeIdentity,

        method,

        reportingWindow,

        members:
            Object.freeze(normalizedMembers),

        memberCount:
            normalizedMembers.length,

        outputMetric,

        completeness,

        status:
            FINANCIAL_BI_KPI_AGGREGATION_STATUS.CONTRACT_DEFINED,

        execution:
            Object.freeze({
                status:
                    FINANCIAL_BI_KPI_AGGREGATION_STATUS.NOT_EXECUTED,
                executed: false,
                value: null,
                unit: outputMetric.unit ?? null,
                currency: outputMetric.currency ?? null,
            }),

        boundaries:
            FINANCIAL_BI_KPI_AGGREGATION_BOUNDARIES,
    });
}
