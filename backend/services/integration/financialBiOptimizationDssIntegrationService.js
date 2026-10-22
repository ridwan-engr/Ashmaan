// services/integration/financialBiOptimizationDssIntegrationService.js

import {
    FINANCIAL_BI_PERSISTENCE_CONTRACT_PHASE,
    FINANCIAL_BI_PERSISTENCE_CONTRACT_LAYER,
} from "../financialBi/financialBiPersistenceContract.js";

import {
    OPTIMIZATION_DSS_CONTRACT_PHASE,
    OPTIMIZATION_DSS_CONTRACT_LAYER,
    OPTIMIZATION_DSS_CONTRACT_UPSTREAM_LAYER,
    OPTIMIZATION_DSS_SCOPE,
    OPTIMIZATION_DSS_TIME_SEMANTICS,
    buildOptimizationDssHorizon,
    createOptimizationDssContract,
} from "../optimizationDss/optimizationDssContract.js";

import {
    OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE,
    OPTIMIZATION_DSS_INPUT_QUALIFICATION_LAYER,
    qualifyOptimizationDssInputs,
} from "../optimizationDss/optimizationDssInputQualificationService.js";


export const FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_PHASE =
    "12.7";

export const FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_LAYER =
    "FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION";

export const FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_PHASE =
    FINANCIAL_BI_PERSISTENCE_CONTRACT_PHASE;

export const FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_LAYER =
    FINANCIAL_BI_PERSISTENCE_CONTRACT_LAYER;

export const FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_PHASE =
    OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE;

export const FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_LAYER =
    OPTIMIZATION_DSS_INPUT_QUALIFICATION_LAYER;

export const FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_INTERVAL =
    OPTIMIZATION_DSS_TIME_SEMANTICS;


export const FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS =
    Object.freeze({
        QUALIFIED: "QUALIFIED",
        EXECUTED: "EXECUTED",
        ERROR: "ERROR",
    });


export const FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES =
    Object.freeze({
        usesExistingFinancialBiEvidence: true,
        usesExistingOptimizationDssContract: true,
        usesExistingOptimizationDssInputQualification: true,

        createsParallelFinancialBiEngine: false,
        createsParallelOptimizationQualification: false,

        financialBiCalculationIncluded: false,
        financialBiAggregationIncluded: false,
        financialBiPersistenceExecuted: false,
        financialBiApiIncluded: false,
        financialBiDashboardIncluded: false,

        optimizationModelBuildIncluded: false,
        solverIncluded: false,
        optimizationExecuted: false,
        recommendationGenerated: false,
        recommendationPersistenceIncluded: false,
        optimizationApiIncluded: false,
        optimizationDashboardIncluded: false,

        timestampInferenceAllowed: false,
        unitInferenceAllowed: false,
        currencyInferenceAllowed: false,
        currencyConversionAllowed: false,
        tariffInferenceAllowed: false,
        emissionFactorInferenceAllowed: false,
        topologyInferenceAllowed: false,
        resamplingAllowed: false,
        interpolationAllowed: false,
        duplicateMergeAllowed: false,

        missingMeansZero: false,
        unavailableMeansZero: false,
        invalidMeansZero: false,

        preserveFinancialBiEvidence: true,
        preserveFinancialBiPayload: true,
        preserveFinancialBiLineage: true,
        preserveScopeIdentity: true,
        preserveReportingWindow: true,

        advisoryOnly: true,
        executableControl: false,
        autoDispatch: false,
    });


function requireObject(value, field) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        throw new Error(`${field}_REQUIRED`);
    }

    return value;
}


function requireNonEmptyArray(value, field) {
    if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`${field}_REQUIRED`);
    }

    return value;
}


function sameInstant(left, right) {
    const leftDate = new Date(left);
    const rightDate = new Date(right);

    return (
        !Number.isNaN(leftDate.getTime()) &&
        !Number.isNaN(rightDate.getTime()) &&
        leftDate.getTime() === rightDate.getTime()
    );
}


export function validateFinancialBiOptimizationEvidence(
    financialBiEvidence
) {
    requireNonEmptyArray(
        financialBiEvidence,
        "FINANCIAL_BI_EVIDENCE"
    );

    const first = financialBiEvidence[0];

    for (
        let index = 0;
        index < financialBiEvidence.length;
        index += 1
    ) {
        const evidence =
            requireObject(
                financialBiEvidence[index],
                `FINANCIAL_BI_EVIDENCE_${index}`
            );

        if (
            evidence.phase !==
            FINANCIAL_BI_PERSISTENCE_CONTRACT_PHASE
        ) {
            throw new Error(
                `FINANCIAL_BI_EVIDENCE_${index}_PHASE_INVALID`
            );
        }

        if (
            evidence.layer !==
            FINANCIAL_BI_PERSISTENCE_CONTRACT_LAYER
        ) {
            throw new Error(
                `FINANCIAL_BI_EVIDENCE_${index}_LAYER_INVALID`
            );
        }

        if (
            typeof evidence.metricName !== "string" ||
            !evidence.metricName.trim()
        ) {
            throw new Error(
                `FINANCIAL_BI_EVIDENCE_${index}_METRIC_NAME_REQUIRED`
            );
        }

        if (
            !Object.values(
                OPTIMIZATION_DSS_SCOPE
            ).includes(evidence.scope)
        ) {
            throw new Error(
                `FINANCIAL_BI_EVIDENCE_${index}_SCOPE_INVALID`
            );
        }

        if (
            evidence.scope ===
            OPTIMIZATION_DSS_SCOPE.SITE &&
            !evidence.scopeIdentity?.vrmSiteId
        ) {
            throw new Error(
                `FINANCIAL_BI_EVIDENCE_${index}_VRM_SITE_ID_REQUIRED`
            );
        }

        if (
            evidence.scope ===
            OPTIMIZATION_DSS_SCOPE.FLEET &&
            !evidence.scopeIdentity?.fleetId
        ) {
            throw new Error(
                `FINANCIAL_BI_EVIDENCE_${index}_FLEET_ID_REQUIRED`
            );
        }

        const reportingWindow =
            evidence.reportingWindow;

        if (
            !reportingWindow ||
            reportingWindow.semantics !==
            OPTIMIZATION_DSS_TIME_SEMANTICS
        ) {
            throw new Error(
                `FINANCIAL_BI_EVIDENCE_${index}_REPORTING_WINDOW_INVALID`
            );
        }

        const start =
            new Date(reportingWindow.start);

        const end =
            new Date(reportingWindow.end);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            end <= start
        ) {
            throw new Error(
                `FINANCIAL_BI_EVIDENCE_${index}_REPORTING_WINDOW_INVALID`
            );
        }

        if (
            typeof reportingWindow.timezone !== "string" ||
            !reportingWindow.timezone.trim()
        ) {
            throw new Error(
                `FINANCIAL_BI_EVIDENCE_${index}_TIMEZONE_REQUIRED`
            );
        }

        /*
         * Cross-evidence identity/window consistency only.
         *
         * Do NOT qualify value/unit/currency here.
         * Phase 11.2 owns those classifications.
         */
        if (index > 0) {
            if (evidence.scope !== first.scope) {
                throw new Error(
                    "FINANCIAL_BI_EVIDENCE_SCOPE_MISMATCH"
                );
            }

            if (
                evidence.scope ===
                OPTIMIZATION_DSS_SCOPE.SITE &&
                evidence.scopeIdentity?.vrmSiteId !==
                first.scopeIdentity?.vrmSiteId
            ) {
                throw new Error(
                    "FINANCIAL_BI_EVIDENCE_SCOPE_IDENTITY_MISMATCH"
                );
            }

            if (
                evidence.scope ===
                OPTIMIZATION_DSS_SCOPE.FLEET &&
                evidence.scopeIdentity?.fleetId !==
                first.scopeIdentity?.fleetId
            ) {
                throw new Error(
                    "FINANCIAL_BI_EVIDENCE_SCOPE_IDENTITY_MISMATCH"
                );
            }

            if (
                !sameInstant(
                    reportingWindow.start,
                    first.reportingWindow.start
                ) ||
                !sameInstant(
                    reportingWindow.end,
                    first.reportingWindow.end
                ) ||
                reportingWindow.timezone !==
                first.reportingWindow.timezone
            ) {
                throw new Error(
                    "FINANCIAL_BI_EVIDENCE_REPORTING_WINDOW_MISMATCH"
                );
            }
        }
    }

    return Object.freeze({
        financialBiEvidence,
        scope: first.scope,

        scopeIdentity:
            first.scope === OPTIMIZATION_DSS_SCOPE.SITE
                ? Object.freeze({
                    vrmSiteId:
                        first.scopeIdentity.vrmSiteId,
                    fleetId: null,
                })
                : Object.freeze({
                    vrmSiteId: null,
                    fleetId:
                        first.scopeIdentity.fleetId,
                }),

        reportingWindow:
            first.reportingWindow,
    });
}


export function validateFinancialBiOptimizationRequest(
    optimizationRequest
) {
    requireObject(
        optimizationRequest,
        "OPTIMIZATION_REQUEST"
    );

    requireNonEmptyArray(
        optimizationRequest.objectives,
        "OPTIMIZATION_OBJECTIVES"
    );

    requireNonEmptyArray(
        optimizationRequest.decisionVariables,
        "OPTIMIZATION_DECISION_VARIABLES"
    );

    requireNonEmptyArray(
        optimizationRequest.constraints,
        "OPTIMIZATION_CONSTRAINTS"
    );

    /*
 * Optional explicit dispatch/optimization horizon.
 *
 * Financial BI reportingWindow and Optimization DSS horizon
 * are intentionally separate concepts.
 *
 * When absent, Phase 12.7 retains its historical behaviour
 * and falls back to the Financial BI reporting window.
 */
    let optimizationHorizon =
        null;

    if (
        optimizationRequest
            .optimizationHorizon !==
        undefined &&
        optimizationRequest
            .optimizationHorizon !==
        null
    ) {
        const requestedHorizon =
            requireObject(
                optimizationRequest
                    .optimizationHorizon,
                "OPTIMIZATION_HORIZON"
            );

        const start =
            new Date(
                requestedHorizon.start
            );

        const end =
            new Date(
                requestedHorizon.end
            );

        if (
            Number.isNaN(
                start.getTime()
            ) ||
            Number.isNaN(
                end.getTime()
            ) ||
            end <= start
        ) {
            throw new Error(
                "OPTIMIZATION_HORIZON_INVALID"
            );
        }

        if (
            typeof requestedHorizon
                .timezone !== "string" ||
            !requestedHorizon
                .timezone.trim()
        ) {
            throw new Error(
                "OPTIMIZATION_HORIZON_TIMEZONE_REQUIRED"
            );
        }

        optimizationHorizon =
            Object.freeze({
                start:
                    start.toISOString(),

                end:
                    end.toISOString(),

                timezone:
                    requestedHorizon
                        .timezone
                        .trim(),
            });
    }

    return Object.freeze({
        objectives:
            optimizationRequest.objectives,

        decisionVariables:
            optimizationRequest.decisionVariables,

        constraints:
            optimizationRequest.constraints,

        optimizationHorizon,

    });
}


export function qualifyFinancialBiOptimizationDssIntegration({
    financialBiEvidence,
    optimizationRequest,

    horizonBuilder =
    buildOptimizationDssHorizon,

    contractBuilder =
    createOptimizationDssContract,

    inputQualifier =
    qualifyOptimizationDssInputs,
} = {}) {
    const evidence =
        validateFinancialBiOptimizationEvidence(
            financialBiEvidence
        );

    const request =
        validateFinancialBiOptimizationRequest(
            optimizationRequest
        );

    if (typeof horizonBuilder !== "function") {
        throw new Error(
            "OPTIMIZATION_HORIZON_BUILDER_REQUIRED"
        );
    }

    if (typeof contractBuilder !== "function") {
        throw new Error(
            "OPTIMIZATION_CONTRACT_BUILDER_REQUIRED"
        );
    }

    if (typeof inputQualifier !== "function") {
        throw new Error(
            "OPTIMIZATION_INPUT_QUALIFIER_REQUIRED"
        );
    }

    return Object.freeze({
        phase:
            FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_PHASE,

        layer:
            FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_LAYER,

        upstreamPhase:
            FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_PHASE,

        upstreamLayer:
            FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_LAYER,

        targetPhase:
            FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_PHASE,

        targetLayer:
            FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_LAYER,

        status:
            FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS.QUALIFIED,

        scope:
            evidence.scope,

        scopeIdentity:
            evidence.scopeIdentity,

        reportingWindow:
            evidence.reportingWindow,

        financialBiEvidence:
            evidence.financialBiEvidence,

        optimizationRequest:
            request,

        horizonBuilder,
        contractBuilder,
        inputQualifier,

        executed: false,

        boundaries:
            FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES,
    });
}


export function executeFinancialBiOptimizationDssIntegration({
    qualifiedIntegration,
} = {}) {
    if (
        !qualifiedIntegration ||
        qualifiedIntegration.phase !==
        FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_PHASE ||
        qualifiedIntegration.layer !==
        FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_LAYER ||
        qualifiedIntegration.status !==
        FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS.QUALIFIED
    ) {
        throw new Error(
            "QUALIFIED_PHASE_12_7_INTEGRATION_REQUIRED"
        );
    }

    const q =
        qualifiedIntegration;

    try {
        /*
 * Optimization horizon is independent of the Financial BI
 * reporting window.
 *
 * New production callers provide optimizationHorizon from
 * the qualified forecast horizon.
 *
 * The reporting-window fallback preserves backward
 * compatibility for existing Phase 12.7 callers.
 */
        const requestedHorizon =
            q.optimizationRequest
                .optimizationHorizon ??
            q.reportingWindow;

        const horizon =
            q.horizonBuilder({
                start:
                    requestedHorizon.start,

                end:
                    requestedHorizon.end,

                timezone:
                    requestedHorizon.timezone,
            });
        const contract =
            q.contractBuilder({
                horizon,

                scope:
                    q.scope,

                scopeIdentity:
                    q.scopeIdentity,

                objectives:
                    q.optimizationRequest.objectives,

                decisionVariables:
                    q.optimizationRequest
                        .decisionVariables,

                constraints:
                    q.optimizationRequest.constraints,

                financialBiEvidence:
                    q.financialBiEvidence,
            });

        if (
            contract.phase !==
            OPTIMIZATION_DSS_CONTRACT_PHASE ||
            contract.layer !==
            OPTIMIZATION_DSS_CONTRACT_LAYER ||
            contract.architecture?.upstream !==
            OPTIMIZATION_DSS_CONTRACT_UPSTREAM_LAYER
        ) {
            throw new Error(
                "PHASE_11_1_CONTRACT_INVALID"
            );
        }

        const inputQualification =
            q.inputQualifier({
                contract,

                financialBiEvidence:
                    q.financialBiEvidence,
            });

        return Object.freeze({
            phase:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_PHASE,

            layer:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_LAYER,

            upstreamPhase:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_PHASE,

            upstreamLayer:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_LAYER,

            targetPhase:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_PHASE,

            targetLayer:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_LAYER,

            status:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS.EXECUTED,

            scope:
                q.scope,

            scopeIdentity:
                q.scopeIdentity,

            reportingWindow:
                q.reportingWindow,

            horizon,

            financialBiEvidence:
                q.financialBiEvidence,

            optimizationRequest:
                q.optimizationRequest,

            contract,

            inputQualification,

            executed: true,

            error: null,

            boundaries:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES,
        });
    } catch (error) {
        return Object.freeze({
            phase:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_PHASE,

            layer:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_LAYER,

            upstreamPhase:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_PHASE,

            upstreamLayer:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_LAYER,

            targetPhase:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_PHASE,

            targetLayer:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_LAYER,

            status:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS.ERROR,

            scope:
                q.scope,

            scopeIdentity:
                q.scopeIdentity,

            reportingWindow:
                q.reportingWindow,

            financialBiEvidence:
                q.financialBiEvidence,

            optimizationRequest:
                q.optimizationRequest,

            contract: null,

            inputQualification: null,

            executed: false,

            error:
                Object.freeze({
                    name:
                        error?.name ??
                        "Error",

                    message:
                        error?.message ??
                        String(error),
                }),

            boundaries:
                FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES,
        });
    }
}