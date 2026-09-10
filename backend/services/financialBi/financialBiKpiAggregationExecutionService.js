// services/financialBi/financialBiKpiAggregationExecutionService.js

import {
    FINANCIAL_BI_KPI_AGGREGATION_CONTRACT_PHASE,
    FINANCIAL_BI_KPI_AGGREGATION_METHOD,
    FINANCIAL_BI_KPI_AGGREGATION_COMPLETENESS,
} from "./financialBiKpiAggregationContract.js";

import {
    FINANCIAL_BI_CALCULATION_EXECUTION_PHASE,
    FINANCIAL_BI_CALCULATION_EXECUTION_STATUS,
} from "./financialBiCalculationExecutionService.js";

export const FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_PHASE = "10.6";
export const FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_LAYER = "FINANCIAL_BI";
export const FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_UPSTREAM_PHASE =
    FINANCIAL_BI_KPI_AGGREGATION_CONTRACT_PHASE;

export const FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_STATUS = Object.freeze({
    AGGREGATED: "AGGREGATED",
    PARTIALLY_AGGREGATED: "PARTIALLY_AGGREGATED",
    UNAVAILABLE: "UNAVAILABLE",
});

export const FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON = Object.freeze({
    AGGREGATION_COMPLETE: "AGGREGATION_COMPLETE",
    PARTIAL_MEMBERS_USED: "PARTIAL_MEMBERS_USED",
    REQUIRED_MEMBER_UNAVAILABLE: "REQUIRED_MEMBER_UNAVAILABLE",
    NO_EXECUTABLE_MEMBERS: "NO_EXECUTABLE_MEMBERS",
    INVALID_MEMBER_PHASE: "INVALID_MEMBER_PHASE",
    INVALID_MEMBER_STATUS: "INVALID_MEMBER_STATUS",
    UNSUPPORTED_AGGREGATION_METHOD: "UNSUPPORTED_AGGREGATION_METHOD",
    PASSTHROUGH_MEMBER_COUNT_INVALID: "PASSTHROUGH_MEMBER_COUNT_INVALID",
});

export const FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_BOUNDARIES = Object.freeze({
    calculatedInputsRequired: true,
    reportingWindowPreserved: true,
    scopePreserved: true,
    missingMeansZero: false,
    unavailableMeansZero: false,
    partialMeansComplete: false,
    unitInferenceAllowed: false,
    currencyInferenceAllowed: false,
    currencyConversionAllowed: false,
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

function unavailable(definition, reason, diagnostics = []) {
    return Object.freeze({
        phase: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_PHASE,
        layer: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_LAYER,
        upstreamPhase: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_UPSTREAM_PHASE,
        definition,
        status: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_STATUS.UNAVAILABLE,
        reason,
        result: Object.freeze({
            value: null,
            unit: definition?.outputMetric?.unit ?? null,
            currency: definition?.outputMetric?.currency ?? null,
            aggregated: false,
        }),
        diagnostics: Object.freeze(diagnostics),
        boundaries: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_BOUNDARIES,
    });
}

function aggregate(method, values) {
    switch (method) {
        case FINANCIAL_BI_KPI_AGGREGATION_METHOD.SUM:
            return values.reduce((a, b) => a + b, 0);
        case FINANCIAL_BI_KPI_AGGREGATION_METHOD.AVERAGE:
            return values.reduce((a, b) => a + b, 0) / values.length;
        case FINANCIAL_BI_KPI_AGGREGATION_METHOD.MIN:
            return Math.min(...values);
        case FINANCIAL_BI_KPI_AGGREGATION_METHOD.MAX:
            return Math.max(...values);
        case FINANCIAL_BI_KPI_AGGREGATION_METHOD.COUNT:
            return values.length;
        case FINANCIAL_BI_KPI_AGGREGATION_METHOD.PASSTHROUGH:
            return values.length === 1
                ? values[0]
                : { error: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON.PASSTHROUGH_MEMBER_COUNT_INVALID };
        default:
            return { error: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON.UNSUPPORTED_AGGREGATION_METHOD };
    }
}

export function executeFinancialBiKpiAggregation({ definition } = {}) {
    if (!definition || definition.phase !== FINANCIAL_BI_KPI_AGGREGATION_CONTRACT_PHASE) {
        throw new Error("FINANCIAL_BI_KPI_AGGREGATION_CONTRACT_REQUIRED");
    }

    const values = [];
    const diagnostics = [];
    let partial = false;

    for (const member of definition.members) {
        const calculation = member.calculation;

        if (!calculation || calculation.phase !== FINANCIAL_BI_CALCULATION_EXECUTION_PHASE) {
            if (member.required) {
                return unavailable(
                    definition,
                    FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON.INVALID_MEMBER_PHASE,
                    diagnostics
                );
            }

            partial = true;
            diagnostics.push(Object.freeze({
                name: member.name,
                used: false,
                reason: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON.INVALID_MEMBER_PHASE,
            }));
            continue;
        }

        const usable =
            calculation.status === FINANCIAL_BI_CALCULATION_EXECUTION_STATUS.CALCULATED ||
            calculation.status === FINANCIAL_BI_CALCULATION_EXECUTION_STATUS.PARTIALLY_CALCULATED;

        const value = calculation.result?.value;

        if (!usable || typeof value !== "number" || !Number.isFinite(value)) {
            if (
                member.required ||
                definition.completeness ===
                    FINANCIAL_BI_KPI_AGGREGATION_COMPLETENESS.ALL_MEMBERS_REQUIRED
            ) {
                return unavailable(
                    definition,
                    FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON.REQUIRED_MEMBER_UNAVAILABLE,
                    diagnostics
                );
            }

            partial = true;
            diagnostics.push(Object.freeze({
                name: member.name,
                used: false,
                reason: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON.INVALID_MEMBER_STATUS,
            }));
            continue;
        }

        if (
            calculation.status ===
                FINANCIAL_BI_CALCULATION_EXECUTION_STATUS.PARTIALLY_CALCULATED
        ) {
            if (
                member.required &&
                definition.completeness ===
                    FINANCIAL_BI_KPI_AGGREGATION_COMPLETENESS.ALL_MEMBERS_REQUIRED
            ) {
                return unavailable(
                    definition,
                    FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON.REQUIRED_MEMBER_UNAVAILABLE,
                    diagnostics
                );
            }
            partial = true;
        }

        values.push(value);
        diagnostics.push(Object.freeze({
            name: member.name,
            used: true,
            calculationStatus: calculation.status,
            value,
        }));
    }

    if (!values.length) {
        return unavailable(
            definition,
            FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON.NO_EXECUTABLE_MEMBERS,
            diagnostics
        );
    }

    const value = aggregate(definition.method, values);

    if (value && typeof value === "object" && value.error) {
        return unavailable(definition, value.error, diagnostics);
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
        return unavailable(
            definition,
            FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON.NO_EXECUTABLE_MEMBERS,
            diagnostics
        );
    }

    return Object.freeze({
        phase: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_PHASE,
        layer: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_LAYER,
        upstreamPhase: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_UPSTREAM_PHASE,
        definition,
        status: partial
            ? FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_STATUS.PARTIALLY_AGGREGATED
            : FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_STATUS.AGGREGATED,
        reason: partial
            ? FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON.PARTIAL_MEMBERS_USED
            : FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_REASON.AGGREGATION_COMPLETE,
        result: Object.freeze({
            value,
            unit: definition.outputMetric.unit ?? null,
            currency: definition.outputMetric.currency ?? null,
            aggregated: true,
        }),
        diagnostics: Object.freeze(diagnostics),
        boundaries: FINANCIAL_BI_KPI_AGGREGATION_EXECUTION_BOUNDARIES,
    });
}
