// services/optimizationDss/optimizationDssExecutionService.js

import FinancialBiKpiRecord
    from "../../models/FinancialBiKpiRecord.js";

import {
    getInitialBatterySocDssEvidence,
} from "./batterySocDssEvidenceAdapter.js";

import {
    getSiteLoadForecastDssEvidence,
} from "./forecastingDssEvidenceAdapter.js";

import {
    getEngineeringDssEvidence,
} from "./engineeringDssEvidenceAdapter.js";

import {
    getVrmConfigurationDssEvidence,
} from "./vrmConfigurationDssEvidenceAdapter.js";

import {
    composeOptimizationDssEvidence,
    OPTIMIZATION_DSS_EVIDENCE_SOURCE,
} from "./optimizationDssEvidenceCompositionService.js";

import {
    OPTIMIZATION_DSS_OBJECTIVE_KIND,
} from "./optimizationDssContract.js";

import {
    preflightOptimizationDssEvidence,
} from "./optimizationDssProblemDefinitionService.js";

import {
    buildOptimizationDssRuntimeRequest,
} from "./optimizationDssRuntimeRequestBuilder.js";

import {
    runOptimizationDssRuntime,
} from "./optimizationDssRuntimeService.js";

import {
    createMongooseOptimizationDssPersistenceRepository,
} from "./mongooseOptimizationDssPersistenceRepository.js";


export const
    OPTIMIZATION_DSS_EXECUTION_STATUS =
        Object.freeze({
            READY:
                "READY",

            UNAVAILABLE:
                "UNAVAILABLE",
        });


export const
    OPTIMIZATION_DSS_EXECUTION_STAGE =
        Object.freeze({
            FINANCIAL_BI_EVIDENCE:
                "FINANCIAL_BI_EVIDENCE",

            PROBLEM_DEFINITION_PREFLIGHT:
                "PROBLEM_DEFINITION_PREFLIGHT",

            RUNTIME_REQUEST_BUILD:
                "RUNTIME_REQUEST_BUILD",

            OPTIMIZATION_RUNTIME:
                "OPTIMIZATION_RUNTIME",
        });


function normalizeVrmSiteId(
    value
) {
    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        const error =
            new TypeError(
                "VRM_SITE_ID_REQUIRED"
            );

        error.statusCode =
            400;

        error.code =
            "VRM_SITE_ID_REQUIRED";

        throw error;
    }

    return String(
        value
    ).trim();
}


function normalizeObjectiveKind(
    value
) {
    const objectiveKind =
        value ??
        OPTIMIZATION_DSS_OBJECTIVE_KIND
            .MINIMIZE_GRID_IMPORT;

    if (
        !Object.values(
            OPTIMIZATION_DSS_OBJECTIVE_KIND
        ).includes(
            objectiveKind
        )
    ) {
        const error =
            new TypeError(
                "OPTIMIZATION_DSS_OBJECTIVE_KIND_INVALID"
            );

        error.statusCode =
            400;

        error.code =
            "OPTIMIZATION_DSS_OBJECTIVE_KIND_INVALID";

        error.details = {
            objectiveKind,
        };

        throw error;
    }

    return objectiveKind;
}


function selectComposedEvidence(
    composition,
    evidenceSource
) {
    if (
        !composition ||
        !Array.isArray(
            composition.evidence
        )
    ) {
        return [];
    }

    return composition.evidence.filter(
        (item) =>
            item?.evidenceSource ===
            evidenceSource
    );
}


function buildUnavailableResult({
    stage,
    reason,
    vrmSiteId,
    objectiveKind,
    reportingWindow = null,
    optimizationHorizon = null,
    evidenceComposition = null,
    preflight = null,
    diagnostics = null,
} = {}) {
    return Object.freeze({
        status:
            OPTIMIZATION_DSS_EXECUTION_STATUS
                .UNAVAILABLE,

        stage,

        reason,

        vrmSiteId,

        objectiveKind,

        reportingWindow,

        optimizationHorizon,

        evidenceComposition,

        preflight,

        diagnostics,

        optimizationExecutable:
            false,

        optimizationExecuted:
            false,

        solverExecuted:
            false,

        recommendationGenerated:
            false,

        persistenceExecuted:
            false,

        executionGate:
            Object.freeze({
                runtimeReady:
                    false,

                blockedAt:
                    stage,

                reason,

                noFabricationApplied:
                    true,
            }),
    });
}


export function
    createOptimizationDssExecutionService({
        FinancialBiModel =
        FinancialBiKpiRecord,

        getForecastEvidence =
        getSiteLoadForecastDssEvidence,

        getBatterySocEvidence =
        getInitialBatterySocDssEvidence,

        getEngineeringEvidence =
        getEngineeringDssEvidence,

        getVrmConfigurationEvidence =
        getVrmConfigurationDssEvidence,

        composeEvidence =
        composeOptimizationDssEvidence,

        preflightEvidence =
        preflightOptimizationDssEvidence,

        buildRuntimeRequest =
        buildOptimizationDssRuntimeRequest,

        executeRuntime =
        runOptimizationDssRuntime,

        createPersistenceRepository =
        createMongooseOptimizationDssPersistenceRepository,
    } = {}) {

    async function run({
        vrmSiteId,

        objectiveKind =
        OPTIMIZATION_DSS_OBJECTIVE_KIND
            .MINIMIZE_GRID_IMPORT,
    } = {}) {
        const normalizedSiteId =
            normalizeVrmSiteId(
                vrmSiteId
            );

        const normalizedObjectiveKind =
            normalizeObjectiveKind(
                objectiveKind
            );


        /*
         * --------------------------------------------------
         * 1. FINANCIAL BI
         * --------------------------------------------------
         */

        const latestRecord =
            await FinancialBiModel
                .findOne({
                    scope:
                        "SITE",

                    "scopeIdentity.vrmSiteId":
                        normalizedSiteId,
                })
                .sort({
                    "reportingWindow.end":
                        -1,

                    updatedAt:
                        -1,

                    createdAt:
                        -1,
                })
                .lean();


        if (!latestRecord) {
            return buildUnavailableResult({
                stage:
                    OPTIMIZATION_DSS_EXECUTION_STAGE
                        .FINANCIAL_BI_EVIDENCE,

                reason:
                    "NO_FINANCIAL_BI_EVIDENCE",

                vrmSiteId:
                    normalizedSiteId,

                objectiveKind:
                    normalizedObjectiveKind,
            });
        }


        const windowStart =
            latestRecord
                ?.reportingWindow
                ?.start;

        const windowEnd =
            latestRecord
                ?.reportingWindow
                ?.end;


        if (
            !windowStart ||
            !windowEnd
        ) {
            return buildUnavailableResult({
                stage:
                    OPTIMIZATION_DSS_EXECUTION_STAGE
                        .FINANCIAL_BI_EVIDENCE,

                reason:
                    "INVALID_FINANCIAL_BI_REPORTING_WINDOW",

                vrmSiteId:
                    normalizedSiteId,

                objectiveKind:
                    normalizedObjectiveKind,

                reportingWindow:
                    latestRecord
                        ?.reportingWindow ??
                    null,
            });
        }


        const financialBiEvidence =
            await FinancialBiModel
                .find({
                    scope:
                        "SITE",

                    "scopeIdentity.vrmSiteId":
                        normalizedSiteId,

                    "reportingWindow.start":
                        windowStart,

                    "reportingWindow.end":
                        windowEnd,
                })
                .sort({
                    metricName:
                        1,
                })
                .lean();


        /*
         * --------------------------------------------------
         * 2. FORECAST
         * --------------------------------------------------
         */

        const siteLoadForecastEvidence =
            await getForecastEvidence({
                vrmSiteId:
                    normalizedSiteId,
            });


        const forecastEvidence =
            siteLoadForecastEvidence
                ?.status ===
                "QUALIFIED"
                ? siteLoadForecastEvidence
                : null;


        const optimizationHorizonStart =
            siteLoadForecastEvidence
                ?.status ===
                "QUALIFIED"
                ? siteLoadForecastEvidence
                    ?.window
                    ?.forecastOrigin ??
                null
                : null;


        const optimizationHorizon =
            siteLoadForecastEvidence
                ?.status ===
                "QUALIFIED"
                ? {
                    start:
                        siteLoadForecastEvidence
                            ?.window
                            ?.forecastOrigin ??
                        null,

                    end:
                        siteLoadForecastEvidence
                            ?.window
                            ?.forecastEnd ??
                        null,

                    timezone:
                        siteLoadForecastEvidence
                            ?.window
                            ?.timezone ??
                        null,

                    semantics:
                        siteLoadForecastEvidence
                            ?.window
                            ?.semantics ??
                        null,
                }
                : null;


        /*
         * --------------------------------------------------
         * 3. OPERATIONAL BATTERY STATE
         * --------------------------------------------------
         */

        let batterySocEvidenceResult =
            null;


        if (
            optimizationHorizonStart
        ) {
            batterySocEvidenceResult =
                await getBatterySocEvidence({
                    vrmSiteId:
                        normalizedSiteId,

                    horizonStart:
                        optimizationHorizonStart,

                    maxAgeMinutes:
                        60,
                });
        }


        /*
         * --------------------------------------------------
         * 4. ENGINEERING CONFIGURATION
         * --------------------------------------------------
         */

        const engineeringEvidenceResult =
            await getEngineeringEvidence({
                vrmSiteId:
                    normalizedSiteId,
            });


        /*
         * --------------------------------------------------
         * 5. VRM CONFIGURATION
         * --------------------------------------------------
         */

        const vrmConfigurationEvidenceResult =
            await getVrmConfigurationEvidence({
                vrmSiteId:
                    normalizedSiteId,
            });


        /*
         * --------------------------------------------------
         * 6. CANONICAL EVIDENCE COMPOSITION
         * --------------------------------------------------
         */

        const evidenceComposition =
            composeEvidence({
                vrmSiteId:
                    normalizedSiteId,

                financialBiEvidence,

                forecastEvidence,

                engineeringEvidence:
                    engineeringEvidenceResult,

                vrmConfigurationEvidence:
                    vrmConfigurationEvidenceResult,

                operationalEvidence:
                    batterySocEvidenceResult,
            });


        /*
         * --------------------------------------------------
         * 7. PREFLIGHT CHANNELS
         * --------------------------------------------------
         */

        const composedFinancialBiEvidence =
            selectComposedEvidence(
                evidenceComposition,

                OPTIMIZATION_DSS_EVIDENCE_SOURCE
                    .FINANCIAL_BI
            );


        const composedForecastEvidence =
            selectComposedEvidence(
                evidenceComposition,

                OPTIMIZATION_DSS_EVIDENCE_SOURCE
                    .FORECASTING
            );


        const composedManualEngineeringEvidence =
            selectComposedEvidence(
                evidenceComposition,

                OPTIMIZATION_DSS_EVIDENCE_SOURCE
                    .ENGINEERING_CONFIGURATION
            );


        const composedVrmConfigurationEvidence =
            selectComposedEvidence(
                evidenceComposition,

                OPTIMIZATION_DSS_EVIDENCE_SOURCE
                    .VRM_CONFIGURATION
            );


        const composedEngineeringEvidence =
            [
                ...composedManualEngineeringEvidence,
                ...composedVrmConfigurationEvidence,
            ];


        const composedOperationalEvidence =
            selectComposedEvidence(
                evidenceComposition,

                OPTIMIZATION_DSS_EVIDENCE_SOURCE
                    .OPERATIONAL
            );


        /*
         * --------------------------------------------------
         * 8. PROBLEM-DEFINITION PREFLIGHT
         * --------------------------------------------------
         */

        const preflight =
            preflightEvidence({
                financialBiEvidence:
                    composedFinancialBiEvidence,

                forecastEvidence:
                    composedForecastEvidence,

                engineeringEvidence:
                    composedEngineeringEvidence,

                operationalEvidence:
                    composedOperationalEvidence,

                objectiveKind:
                    normalizedObjectiveKind,
            });


        const runtimeReady =
            preflight
                ?.optimizationRequestConstructible ===
            true &&
            preflight
                ?.resourceFormulationConstructible ===
            true &&
            Array.isArray(
                preflight
                    ?.constructibleResourcePaths
            ) &&
            preflight
                .constructibleResourcePaths
                .length >
            0 &&
            Boolean(
                optimizationHorizon
                    ?.start
            ) &&
            Boolean(
                optimizationHorizon
                    ?.end
            ) &&
            Boolean(
                optimizationHorizon
                    ?.timezone
            );


        const diagnostics = {
            composedEvidenceCounts: {
                financialBi:
                    composedFinancialBiEvidence
                        .length,

                forecasting:
                    composedForecastEvidence
                        .length,

                manualEngineering:
                    composedManualEngineeringEvidence
                        .length,

                vrmConfiguration:
                    composedVrmConfigurationEvidence
                        .length,

                engineeringTotal:
                    composedEngineeringEvidence
                        .length,

                operational:
                    composedOperationalEvidence
                        .length,
            },

            forecastingEvidence: {
                status:
                    siteLoadForecastEvidence
                        ?.status ??
                    null,

                reason:
                    siteLoadForecastEvidence
                        ?.reason ??
                    null,

                metricName:
                    siteLoadForecastEvidence
                        ?.metricName ??
                    null,

                valueCount:
                    Array.isArray(
                        siteLoadForecastEvidence
                            ?.values
                    )
                        ? siteLoadForecastEvidence
                            .values
                            .length
                        : 0,

                unit:
                    siteLoadForecastEvidence
                        ?.unit ??
                    null,
            },

            engineeringConfiguration: {
                status:
                    engineeringEvidenceResult
                        ?.status ??
                    null,

                reason:
                    engineeringEvidenceResult
                        ?.reason ??
                    null,

                evidenceCount:
                    engineeringEvidenceResult
                        ?.evidenceCount ??
                    0,

                availableEvidenceMetricNames:
                    engineeringEvidenceResult
                        ?.availableEvidenceMetricNames ??
                    [],
            },

            vrmConfiguration: {
                phase:
                    vrmConfigurationEvidenceResult
                        ?.phase ??
                    null,

                status:
                    vrmConfigurationEvidenceResult
                        ?.status ??
                    null,

                reason:
                    vrmConfigurationEvidenceResult
                        ?.reason ??
                    null,

                evidenceCount:
                    vrmConfigurationEvidenceResult
                        ?.evidenceCount ??
                    0,

                availableMetricNames:
                    vrmConfigurationEvidenceResult
                        ?.availableMetricNames ??
                    [],
            },

            batteryOperationalState: {
                status:
                    batterySocEvidenceResult
                        ?.status ??
                    null,

                reason:
                    batterySocEvidenceResult
                        ?.reason ??
                    null,

                metricName:
                    batterySocEvidenceResult
                        ?.evidence
                        ?.metricName ??
                    batterySocEvidenceResult
                        ?.metricName ??
                    null,

                value:
                    batterySocEvidenceResult
                        ?.evidence
                        ?.value ??
                    null,

                unit:
                    batterySocEvidenceResult
                        ?.evidence
                        ?.unit ??
                    null,

                timestamp:
                    batterySocEvidenceResult
                        ?.evidence
                        ?.timestamp ??
                    null,
            },
        };


        /*
         * --------------------------------------------------
         * 9. CONTROLLED EXECUTION GATE
         * --------------------------------------------------
         */

        if (!runtimeReady) {
            return buildUnavailableResult({
                stage:
                    OPTIMIZATION_DSS_EXECUTION_STAGE
                        .PROBLEM_DEFINITION_PREFLIGHT,

                reason:
                    preflight
                        ?.reason ??
                    "NO_CONSTRUCTIBLE_RESOURCE_FORMULATION",

                vrmSiteId:
                    normalizedSiteId,

                objectiveKind:
                    normalizedObjectiveKind,

                reportingWindow:
                    latestRecord
                        .reportingWindow,

                optimizationHorizon,

                evidenceComposition: {
                    phase:
                        evidenceComposition
                            ?.phase ??
                        null,

                    status:
                        evidenceComposition
                            ?.status ??
                        null,

                    evidenceCount:
                        evidenceComposition
                            ?.evidenceCount ??
                        0,

                    availableMetricNames:
                        evidenceComposition
                            ?.availableMetricNames ??
                        [],

                    sourceCounts:
                        evidenceComposition
                            ?.sourceCounts ??
                        {},
                },

                preflight,

                diagnostics,
            });
        }


        /*
         * --------------------------------------------------
         * 10. EVIDENCE-BACKED PHASE 11.1 REQUEST BUILD
         * --------------------------------------------------
         *
         * This branch is reachable only after preflight has
         * proved that the optimization request and at least
         * one resource formulation are constructible.
         *
         * No engineering limit, efficiency, topology or
         * missing operational value is inferred here.
         */

        const runtimeRequestBuild =
            buildRuntimeRequest({
                objectiveKind:
                    normalizedObjectiveKind,

                optimizationEvidence:
                    evidenceComposition.evidence,

                preflight,
            });


        if (
            !runtimeRequestBuild ||
            runtimeRequestBuild.status !==
            "READY" ||
            !runtimeRequestBuild
                .optimizationRequest
        ) {
            return buildUnavailableResult({
                stage:
                    OPTIMIZATION_DSS_EXECUTION_STAGE
                        .RUNTIME_REQUEST_BUILD,

                reason:
                    runtimeRequestBuild?.reason ??
                    "RUNTIME_REQUEST_BUILD_UNAVAILABLE",

                vrmSiteId:
                    normalizedSiteId,

                objectiveKind:
                    normalizedObjectiveKind,

                reportingWindow:
                    latestRecord.reportingWindow,

                optimizationHorizon,

                evidenceComposition:
                    Object.freeze({
                        phase:
                            evidenceComposition?.phase ??
                            null,

                        status:
                            evidenceComposition?.status ??
                            null,

                        evidenceCount:
                            evidenceComposition
                                ?.evidenceCount ??
                            0,

                        availableMetricNames:
                            evidenceComposition
                                ?.availableMetricNames ??
                            [],

                        sourceCounts:
                            evidenceComposition
                                ?.sourceCounts ??
                            {},
                    }),

                preflight,

                diagnostics:
                    Object.freeze({
                        ...diagnostics,

                        runtimeRequestBuild,
                    }),
            });
        }


        /*
         * --------------------------------------------------
         * 11. COMPLETE OPTIMIZATION DSS RUNTIME
         * --------------------------------------------------
         */

        const persistenceRepository =
            createPersistenceRepository();


        const runtimeOptimizationRequest =
            Object.freeze({
                ...runtimeRequestBuild.optimizationRequest,

                optimizationHorizon:
                    Object.freeze({
                        start:
                            optimizationHorizon.start,

                        end:
                            optimizationHorizon.end,

                        timezone:
                            optimizationHorizon.timezone,
                    }),
            });


        /*
         * --------------------------------------------------
         * 12. HTTP EXECUTION ENVELOPE
         * --------------------------------------------------
         */

        const solverExecuted =
            runtimeResult
                ?.solverExecution
                ?.solverResult
                ?.solverStarted ===
            true;


        const recommendationGenerated =
            runtimeResult
                ?.recommendationGeneration !=
            null;


        const persistenceExecuted =
            runtimeResult
                ?.persistence !=
            null;


        return Object.freeze({
            status:
                runtimeResult?.status ??
                OPTIMIZATION_DSS_EXECUTION_STATUS
                    .UNAVAILABLE,

            stage:
                OPTIMIZATION_DSS_EXECUTION_STAGE
                    .OPTIMIZATION_RUNTIME,

            reason:
                runtimeResult?.reason ??
                null,

            vrmSiteId:
                normalizedSiteId,

            objectiveKind:
                normalizedObjectiveKind,

            reportingWindow:
                latestRecord.reportingWindow,

            optimizationHorizon,

            evidenceComposition:
                Object.freeze({
                    phase:
                        evidenceComposition?.phase ??
                        null,

                    status:
                        evidenceComposition?.status ??
                        null,

                    evidenceCount:
                        evidenceComposition
                            ?.evidenceCount ??
                        0,

                    availableMetricNames:
                        evidenceComposition
                            ?.availableMetricNames ??
                        [],

                    sourceCounts:
                        evidenceComposition
                            ?.sourceCounts ??
                        {},
                }),

            preflight,

            runtimeRequestBuild,

            runtime:
                runtimeResult,

            optimizationExecutable:
                true,

            optimizationExecuted:
                solverExecuted,

            solverExecuted,

            recommendationGenerated,

            persistenceExecuted,

            executionGate:
                Object.freeze({
                    runtimeReady:
                        true,

                    blockedAt:
                        null,

                    runtimeInvocationDeferred:
                        false,

                    noFabricationApplied:
                        true,
                }),

            diagnostics:
                Object.freeze({
                    ...diagnostics,

                    selectedResourcePath:
                        runtimeRequestBuild
                            ?.selectedResourcePath ??
                        null,
                }),
        });
    }


    return Object.freeze({
        run,
    });
}


export default
    createOptimizationDssExecutionService;