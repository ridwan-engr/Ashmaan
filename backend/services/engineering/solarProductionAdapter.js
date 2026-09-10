// services/engineering/solarProductionAdapter.js

import {
    getProductionSolarTelemetryEvidence,
} from "./solarProductionTelemetryService.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 8.7H-B — Per-Site Production Solar Adapter
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Establish the canonical per-site production Solar analytics shell.
|
| H-A owns:
|
| - installation resolution
| - MongoDB telemetry retrieval
| - VALID / RAW filtering
| - approved Phase 8.7 attribute qualification
| - reporting/query-window separation
| - evidence classification
|
| H-B owns:
|
| - validating the H-A evidence bundle
| - exposing one stable production-site contract
| - classifying evidence availability
| - summarizing production diagnostics
| - creating unevaluated analytics placeholders
|
| H-B DOES NOT:
|
| - calculate PV power
| - calculate energy / yield
| - calculate operating state
| - calculate performance
| - calculate availability
| - infer units
| - infer installed capacity
| - infer irradiance
| - aggregate multiple Solar Chargers
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Identity
|--------------------------------------------------------------------------
*/

export const SOLAR_PRODUCTION_ADAPTER_PHASE =
    "8.7H-B";


export const SOLAR_PRODUCTION_FAMILY =
    "SOLAR";


export const SOLAR_PRODUCTION_LAYER =
    "PRODUCTION";


/*
|--------------------------------------------------------------------------
| Evidence availability
|--------------------------------------------------------------------------
*/

export const SOLAR_PRODUCTION_ADAPTER_STATUS =
    Object.freeze({
        EVIDENCE_AVAILABLE:
            "EVIDENCE_AVAILABLE",

        LOOKBACK_ONLY:
            "LOOKBACK_ONLY",

        NO_EVIDENCE:
            "NO_EVIDENCE",
    });


export const SOLAR_PRODUCTION_ADAPTER_REASON =
    Object.freeze({
        REPORTING_WINDOW_EVIDENCE_AVAILABLE:
            "REPORTING_WINDOW_EVIDENCE_AVAILABLE",

        LOOKBACK_EVIDENCE_ONLY:
            "LOOKBACK_EVIDENCE_ONLY",

        NO_PRODUCTION_SOLAR_EVIDENCE:
            "NO_PRODUCTION_SOLAR_EVIDENCE",
    });


/*
|--------------------------------------------------------------------------
| Component integration state
|--------------------------------------------------------------------------
*/

export const SOLAR_PRODUCTION_COMPONENT_STATUS =
    Object.freeze({
        NOT_EVALUATED:
            "NOT_EVALUATED",

        INTEGRATED:
            "INTEGRATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


/*
|--------------------------------------------------------------------------
| Evidence-bundle validation
|--------------------------------------------------------------------------
*/

export function validateSolarProductionEvidenceBundle(
    bundle
) {
    if (
        !bundle ||
        typeof bundle !==
            "object"
    ) {
        return {
            valid:
                false,

            reason:
                "EVIDENCE_BUNDLE_REQUIRED",
        };
    }


    if (
        bundle.family !==
        "SOLAR_PRODUCTION_TELEMETRY"
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_EVIDENCE_FAMILY",
        };
    }


    if (
        bundle.phase !==
        "8.7H-A"
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_EVIDENCE_PHASE",
        };
    }


    if (
        !bundle.installation ||
        typeof bundle
            .installation !==
            "object"
    ) {
        return {
            valid:
                false,

            reason:
                "INSTALLATION_REQUIRED",
        };
    }


    if (
        !bundle.installation
            .id ||
        !bundle.installation
            .vrmSiteId
    ) {
        return {
            valid:
                false,

            reason:
                "INSTALLATION_IDENTITY_REQUIRED",
        };
    }


    if (
        !bundle.reportingWindow ||
        typeof bundle
            .reportingWindow !==
            "object"
    ) {
        return {
            valid:
                false,

            reason:
                "REPORTING_WINDOW_REQUIRED",
        };
    }


    if (
        bundle.reportingWindow
            .semantics !==
        "[start,end)"
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_REPORTING_WINDOW_SEMANTICS",
        };
    }


    if (
        !bundle.queryWindow ||
        typeof bundle
            .queryWindow !==
            "object"
    ) {
        return {
            valid:
                false,

            reason:
                "QUERY_WINDOW_REQUIRED",
        };
    }


    if (
        !Array.isArray(
            bundle.records
        )
    ) {
        return {
            valid:
                false,

            reason:
                "PRODUCTION_RECORDS_REQUIRED",
        };
    }


    if (
        !Array.isArray(
            bundle.reportingRecords
        )
    ) {
        return {
            valid:
                false,

            reason:
                "REPORTING_RECORDS_REQUIRED",
        };
    }


    if (
        !bundle.evidence ||
        typeof bundle
            .evidence !==
            "object"
    ) {
        return {
            valid:
                false,

            reason:
                "EVIDENCE_SUMMARY_REQUIRED",
        };
    }


    return {
        valid:
            true,

        reason:
            "VALID_PRODUCTION_SOLAR_EVIDENCE_BUNDLE",
    };
}


/*
|--------------------------------------------------------------------------
| Evidence availability
|--------------------------------------------------------------------------
*/

export function classifySolarProductionEvidenceAvailability(
    evidence
) {
    const totalRecords =
        Number(
            evidence
                ?.totalRecords ??
            0
        );


    const reportingWindowRecords =
        Number(
            evidence
                ?.reportingWindowRecords ??
            0
        );


    if (
        reportingWindowRecords >
        0
    ) {
        return {
            status:
                SOLAR_PRODUCTION_ADAPTER_STATUS
                    .EVIDENCE_AVAILABLE,

            reason:
                SOLAR_PRODUCTION_ADAPTER_REASON
                    .REPORTING_WINDOW_EVIDENCE_AVAILABLE,
        };
    }


    if (
        totalRecords >
        0
    ) {
        return {
            status:
                SOLAR_PRODUCTION_ADAPTER_STATUS
                    .LOOKBACK_ONLY,

            reason:
                SOLAR_PRODUCTION_ADAPTER_REASON
                    .LOOKBACK_EVIDENCE_ONLY,
        };
    }


    return {
        status:
            SOLAR_PRODUCTION_ADAPTER_STATUS
                .NO_EVIDENCE,

        reason:
            SOLAR_PRODUCTION_ADAPTER_REASON
                .NO_PRODUCTION_SOLAR_EVIDENCE,
    };
}


/*
|--------------------------------------------------------------------------
| Unevaluated downstream component
|--------------------------------------------------------------------------
*/

export function buildUnevaluatedSolarProductionComponent({
    phase,
    reason =
        "NOT_YET_INTEGRATED",
} = {}) {
    return {
        status:
            SOLAR_PRODUCTION_COMPONENT_STATUS
                .NOT_EVALUATED,

        phase,

        reason,

        value:
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Diagnostics
|--------------------------------------------------------------------------
*/

function groupCount(
    evidence,
    group
) {
    return Number(
        evidence
            ?.groups
            ?.[
                group
            ]
            ?.recordCount ??
        0
    );
}


function reportingGroupCount(
    evidence,
    group
) {
    return Number(
        evidence
            ?.groups
            ?.[
                group
            ]
            ?.reportingWindowRecordCount ??
        0
    );
}


export function buildSolarProductionDiagnostics(
    evidence
) {
    const totalRecords =
        Number(
            evidence
                ?.totalRecords ??
            0
        );


    const reportingWindowRecords =
        Number(
            evidence
                ?.reportingWindowRecords ??
            0
        );


    const lookbackOnlyRecords =
        Number(
            evidence
                ?.lookbackOnlyRecords ??
            Math.max(
                totalRecords -
                reportingWindowRecords,
                0
            )
        );


    const observedAttributeIds =
        Array.isArray(
            evidence
                ?.observedAttributeIds
        )
            ? [
                ...evidence
                    .observedAttributeIds,
            ]
            : [];


    const reportingObservedAttributeIds =
        Array.isArray(
            evidence
                ?.reportingObservedAttributeIds
        )
            ? [
                ...evidence
                    .reportingObservedAttributeIds,
            ]
            : [];


    const observedDeviceInstances =
        Array.isArray(
            evidence
                ?.observedDeviceInstances
        )
            ? [
                ...evidence
                    .observedDeviceInstances,
            ]
            : [];


    return {
        totalRecords,

        reportingWindowRecords,

        lookbackOnlyRecords,

        observedAttributeCount:
            observedAttributeIds
                .length,

        reportingObservedAttributeCount:
            reportingObservedAttributeIds
                .length,

        observedAttributeIds,

        reportingObservedAttributeIds,

        observedDeviceInstances,

        observedDeviceCount:
            observedDeviceInstances
                .length,

        solarChargerRecordCount:
            Number(
                evidence
                    ?.solarChargerRecordCount ??
                0
            ),

        generationEvidenceRecordCount:
            Number(
                evidence
                    ?.generationEvidenceRecordCount ??
                0
            ),

        hasAnyApprovedSolarEvidence:
            evidence
                ?.hasAnyApprovedSolarEvidence ===
            true,

        hasSolarChargerTelemetry:
            evidence
                ?.hasSolarChargerTelemetry ===
            true,

        hasGenerationEvidence:
            evidence
                ?.hasGenerationEvidence ===
            true,

        groupCounts: {
            pvPower:
                groupCount(
                    evidence,
                    "PV_POWER"
                ),

            pvElectrical:
                groupCount(
                    evidence,
                    "PV_ELECTRICAL"
                ),

            yieldHistory:
                groupCount(
                    evidence,
                    "YIELD_HISTORY"
                ),

            performanceHistory:
                groupCount(
                    evidence,
                    "PERFORMANCE_HISTORY"
                ),

            operatingState:
                groupCount(
                    evidence,
                    "OPERATING_STATE"
                ),

            flowContext:
                groupCount(
                    evidence,
                    "FLOW_CONTEXT"
                ),

            settingsContext:
                groupCount(
                    evidence,
                    "SETTINGS_CONTEXT"
                ),

            deviceContext:
                groupCount(
                    evidence,
                    "DEVICE_CONTEXT"
                ),
        },

        reportingGroupCounts: {
            pvPower:
                reportingGroupCount(
                    evidence,
                    "PV_POWER"
                ),

            pvElectrical:
                reportingGroupCount(
                    evidence,
                    "PV_ELECTRICAL"
                ),

            yieldHistory:
                reportingGroupCount(
                    evidence,
                    "YIELD_HISTORY"
                ),

            performanceHistory:
                reportingGroupCount(
                    evidence,
                    "PERFORMANCE_HISTORY"
                ),

            operatingState:
                reportingGroupCount(
                    evidence,
                    "OPERATING_STATE"
                ),

            flowContext:
                reportingGroupCount(
                    evidence,
                    "FLOW_CONTEXT"
                ),

            settingsContext:
                reportingGroupCount(
                    evidence,
                    "SETTINGS_CONTEXT"
                ),

            deviceContext:
                reportingGroupCount(
                    evidence,
                    "DEVICE_CONTEXT"
                ),
        },

        /*
         * Critical semantic distinction.
         */
        contextOnlyEvidence:
            totalRecords >
                0 &&
            evidence
                ?.hasGenerationEvidence !==
                true &&
            evidence
                ?.hasSolarChargerTelemetry !==
                true,

        generationEstablished:
            evidence
                ?.hasGenerationEvidence ===
            true,

        availabilityEstablished:
            false,

        performanceEstablished:
            false,
    };
}


/*
|--------------------------------------------------------------------------
| Build canonical per-site shell
|--------------------------------------------------------------------------
*/

export function buildProductionSolarSiteResult({
    evidenceBundle,
} = {}) {
    const validation =
        validateSolarProductionEvidenceBundle(
            evidenceBundle
        );


    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid Phase 8.7H-A evidence bundle: ${validation.reason}`
        );
    }


    const availability =
        classifySolarProductionEvidenceAvailability(
            evidenceBundle
                .evidence
        );


    const diagnostics =
        buildSolarProductionDiagnostics(
            evidenceBundle
                .evidence
        );


    return {
        family:
            SOLAR_PRODUCTION_FAMILY,

        layer:
            SOLAR_PRODUCTION_LAYER,

        phase:
            SOLAR_PRODUCTION_ADAPTER_PHASE,

        status:
            availability
                .status,

        reason:
            availability
                .reason,

        installation: {
            ...evidenceBundle
                .installation,
        },

        reportingWindow: {
            ...evidenceBundle
                .reportingWindow,
        },

        queryWindow: {
            ...evidenceBundle
                .queryWindow,
        },

        evidence: {
            /*
             * H-A records are preserved so H-C through H-F can consume
             * exactly the production evidence already qualified by H-A.
             */
            records:
                evidenceBundle
                    .records,

            reportingRecords:
                evidenceBundle
                    .reportingRecords,

            summary:
                evidenceBundle
                    .evidence,

            diagnostics,
        },

        analytics: {
            power:
                buildUnevaluatedSolarProductionComponent({
                    phase:
                        "8.7H-C",
                }),

            energyYield:
                buildUnevaluatedSolarProductionComponent({
                    phase:
                        "8.7H-D",
                }),

            operatingState:
                buildUnevaluatedSolarProductionComponent({
                    phase:
                        "8.7H-E",
                }),

            performance:
                buildUnevaluatedSolarProductionComponent({
                    phase:
                        "8.7H-F",
                }),

            availability:
                buildUnevaluatedSolarProductionComponent({
                    phase:
                        "8.7H-F",
                }),
        },

        boundaries: {
            productionDataRetrieved:
                true,

            analyticsCalculated:
                false,

            powerCalculated:
                false,

            energyYieldCalculated:
                false,

            operatingStateCalculated:
                false,

            performanceCalculated:
                false,

            availabilityCalculated:
                false,

            rawTelemetryPreserved:
                true,

            reportingWindowSemanticsPreserved:
                true,

            lookbackAutomaticallyPromotedToReportingEvidence:
                false,

            settingsContextEstablishesGeneration:
                false,

            flowContextEstablishesGeneration:
                false,

            generationEstablishesAvailability:
                false,

            telemetryObservabilityEstablishesAvailability:
                false,

            missingMeansZero:
                false,

            noTelemetryMeansNoSolarInstallation:
                false,

            unitInferenceAllowed:
                false,

            installedCapacityInferenceAllowed:
                false,

            irradianceInferenceAllowed:
                false,

            multipleSolarChargersAutomaticallyAggregated:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Public production adapter
|--------------------------------------------------------------------------
*/

export async function getProductionSolarSiteAnalytics({
    installationId = null,
    vrmSiteId = null,
    start = null,
    end = null,
    lookbackMinutes = 30,

    evidenceLoader =
        getProductionSolarTelemetryEvidence,
} = {}) {
    if (
        typeof evidenceLoader !==
        "function"
    ) {
        throw new Error(
            "Production solar evidenceLoader must be a function."
        );
    }


    const evidenceBundle =
        await evidenceLoader({
            installationId,
            vrmSiteId,
            start,
            end,
            lookbackMinutes,
        });


    return buildProductionSolarSiteResult({
        evidenceBundle,
    });
}


export default Object.freeze({
    SOLAR_PRODUCTION_ADAPTER_PHASE,
    SOLAR_PRODUCTION_FAMILY,
    SOLAR_PRODUCTION_LAYER,
    SOLAR_PRODUCTION_ADAPTER_STATUS,
    SOLAR_PRODUCTION_ADAPTER_REASON,
    SOLAR_PRODUCTION_COMPONENT_STATUS,

    validateSolarProductionEvidenceBundle,
    classifySolarProductionEvidenceAvailability,
    buildUnevaluatedSolarProductionComponent,
    buildSolarProductionDiagnostics,
    buildProductionSolarSiteResult,
    getProductionSolarSiteAnalytics,
});