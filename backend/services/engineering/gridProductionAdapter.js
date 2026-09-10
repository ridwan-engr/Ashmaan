// services/engineering/gridProductionAdapter.js

import {
    getProductionGridTelemetryEvidence,
} from "./gridProductionTelemetryService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6H-B
| Per-Site Production Grid Adapter
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Establish the canonical per-site production GRID analytics shell.
|
| H-A owns:
|   - installation resolution
|   - MongoDB telemetry retrieval
|   - VALID / RAW filtering
|   - approved grid-attribute filtering
|   - reporting/query-window separation
|
| H-B owns:
|   - one canonical per-site production result
|   - evidence availability classification
|   - stable slots for later H-C through H-F integrations
|
| H-B does NOT:
|   - calculate source state
|   - calculate grid power
|   - calculate grid energy
|   - calculate interruptions
|   - calculate grid quality
|   - infer missing values
|   - infer units
|   - infer import/export
|   - mutate Phase 7 events
|--------------------------------------------------------------------------
*/


export const GRID_PRODUCTION_ADAPTER_STATUS =
    Object.freeze({
        EVIDENCE_AVAILABLE:
            "EVIDENCE_AVAILABLE",

        LOOKBACK_ONLY:
            "LOOKBACK_ONLY",

        NO_EVIDENCE:
            "NO_EVIDENCE",
    });


export const GRID_PRODUCTION_ADAPTER_REASON =
    Object.freeze({
        REPORTING_WINDOW_EVIDENCE_AVAILABLE:
            "REPORTING_WINDOW_EVIDENCE_AVAILABLE",

        LOOKBACK_EVIDENCE_ONLY:
            "LOOKBACK_EVIDENCE_ONLY",

        NO_PRODUCTION_GRID_EVIDENCE:
            "NO_PRODUCTION_GRID_EVIDENCE",
    });


export const GRID_PRODUCTION_COMPONENT_STATUS =
    Object.freeze({
        NOT_EVALUATED:
            "NOT_EVALUATED",
    });


/*
|--------------------------------------------------------------------------
| Evidence bundle validation
|--------------------------------------------------------------------------
*/

export function validateGridProductionEvidenceBundle(
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
        "GRID_PRODUCTION_TELEMETRY"
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
        "8.6H-A"
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
        !bundle.installation.id ||
        !bundle.installation.vrmSiteId
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
        !bundle.reportingWindow.start ||
        !bundle.reportingWindow.end
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
        !Array.isArray(
            bundle.records
        )
    ) {
        return {
            valid:
                false,

            reason:
                "TELEMETRY_RECORDS_REQUIRED",
        };
    }


    if (
        !bundle.evidence ||
        typeof bundle.evidence !==
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
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Evidence availability
|--------------------------------------------------------------------------
|
| Important:
|
| NO_EVIDENCE does NOT mean:
|   - grid unavailable
|   - grid failed
|   - grid absent
|   - zero power
|   - zero voltage
|
| LOOKBACK_ONLY means historical context exists but there is no qualifying
| record inside the requested reporting window.
|--------------------------------------------------------------------------
*/

export function classifyGridProductionEvidenceAvailability(
    evidence
) {
    const totalRecordCount =
        Number(
            evidence
                ?.totalRecordCount ??
            0
        );


    const reportingWindowRecordCount =
        Number(
            evidence
                ?.reportingWindowRecordCount ??
            0
        );


    const lookbackRecordCount =
        Number(
            evidence
                ?.lookbackRecordCount ??
            0
        );


    if (
        reportingWindowRecordCount >
        0
    ) {
        return {
            status:
                GRID_PRODUCTION_ADAPTER_STATUS
                    .EVIDENCE_AVAILABLE,

            reason:
                GRID_PRODUCTION_ADAPTER_REASON
                    .REPORTING_WINDOW_EVIDENCE_AVAILABLE,
        };
    }


    if (
        totalRecordCount >
            0 &&
        lookbackRecordCount >
            0
    ) {
        return {
            status:
                GRID_PRODUCTION_ADAPTER_STATUS
                    .LOOKBACK_ONLY,

            reason:
                GRID_PRODUCTION_ADAPTER_REASON
                    .LOOKBACK_EVIDENCE_ONLY,
        };
    }


    return {
        status:
            GRID_PRODUCTION_ADAPTER_STATUS
                .NO_EVIDENCE,

        reason:
            GRID_PRODUCTION_ADAPTER_REASON
                .NO_PRODUCTION_GRID_EVIDENCE,
    };
}


/*
|--------------------------------------------------------------------------
| Component placeholder
|--------------------------------------------------------------------------
|
| These stable component slots will be populated sequentially:
|
| H-C sourceState
| H-D power / energy
| H-E interruptions
| H-F quality
|--------------------------------------------------------------------------
*/

export function buildUnevaluatedGridProductionComponent({
    phase,
    reason =
        "NOT_YET_INTEGRATED",
} = {}) {
    return {
        status:
            GRID_PRODUCTION_COMPONENT_STATUS
                .NOT_EVALUATED,

        phase,

        reason,

        value:
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Evidence diagnostics
|--------------------------------------------------------------------------
*/

export function buildGridProductionDiagnostics(
    evidence
) {
    const groupSummary =
        evidence
            ?.groupSummary ??
        {};


    const count = (
        group
    ) =>
        Number(
            groupSummary[
                group
            ]
                ?.recordCount ??
            0
        );


    const reportingCount = (
        group
    ) =>
        Number(
            groupSummary[
                group
            ]
                ?.reportingWindowRecordCount ??
            0
        );


    return {
        totalRecordCount:
            Number(
                evidence
                    ?.totalRecordCount ??
                0
            ),

        reportingWindowRecordCount:
            Number(
                evidence
                    ?.reportingWindowRecordCount ??
                0
            ),

        lookbackRecordCount:
            Number(
                evidence
                    ?.lookbackRecordCount ??
                0
            ),

        unknownRecordCount:
            Number(
                evidence
                    ?.unknownRecordCount ??
                0
            ),

        sourceIdentity: {
            total:
                count(
                    "ACTIVE_SOURCE"
                ),

            reportingWindow:
                reportingCount(
                    "ACTIVE_SOURCE"
                ),
        },

        inputContext: {
            total:
                count(
                    "INPUT_CONTEXT"
                ),

            reportingWindow:
                reportingCount(
                    "INPUT_CONTEXT"
                ),
        },

        directGridPower: {
            total:
                count(
                    "DIRECT_GRID_POWER"
                ),

            reportingWindow:
                reportingCount(
                    "DIRECT_GRID_POWER"
                ),
        },

        activeInputPower: {
            total:
                count(
                    "ACTIVE_INPUT_POWER"
                ),

            reportingWindow:
                reportingCount(
                    "ACTIVE_INPUT_POWER"
                ),
        },

        qualityVoltage: {
            total:
                count(
                    "GRID_QUALITY_VOLTAGE"
                ),

            reportingWindow:
                reportingCount(
                    "GRID_QUALITY_VOLTAGE"
                ),
        },

        qualityCurrent: {
            total:
                count(
                    "GRID_QUALITY_CURRENT"
                ),

            reportingWindow:
                reportingCount(
                    "GRID_QUALITY_CURRENT"
                ),
        },

        qualityFrequency: {
            total:
                count(
                    "GRID_QUALITY_FREQUENCY"
                ),

            reportingWindow:
                reportingCount(
                    "GRID_QUALITY_FREQUENCY"
                ),
        },
    };
}


/*
|--------------------------------------------------------------------------
| Canonical production site result builder
|--------------------------------------------------------------------------
*/

export function buildProductionGridSiteResult({
    evidenceBundle,
} = {}) {
    const validation =
        validateGridProductionEvidenceBundle(
            evidenceBundle
        );


    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid Phase 8.6H-A evidence bundle: ${validation.reason}`
        );
    }


    const availability =
        classifyGridProductionEvidenceAvailability(
            evidenceBundle.evidence
        );


    const diagnostics =
        buildGridProductionDiagnostics(
            evidenceBundle.evidence
        );


    return {
        family:
            "GRID",

        layer:
            "PRODUCTION",

        phase:
            "8.6H-B",

        status:
            availability.status,

        reason:
            availability.reason,


        /*
        |--------------------------------------------------------------------------
        | Installation identity
        |--------------------------------------------------------------------------
        */

        installation: {
            id:
                String(
                    evidenceBundle
                        .installation
                        .id
                ),

            vrmSiteId:
                String(
                    evidenceBundle
                        .installation
                        .vrmSiteId
                ),

            name:
                evidenceBundle
                    .installation
                    .name ??
                null,

            status:
                evidenceBundle
                    .installation
                    .status ??
                null,

            syncEnabled:
                evidenceBundle
                    .installation
                    .syncEnabled ??
                null,
        },


        /*
        |--------------------------------------------------------------------------
        | Reporting period
        |--------------------------------------------------------------------------
        */

        reportingWindow: {
            start:
                evidenceBundle
                    .reportingWindow
                    .start,

            end:
                evidenceBundle
                    .reportingWindow
                    .end,

            semantics:
                "[start,end)",
        },


        /*
        |--------------------------------------------------------------------------
        | Database query context
        |--------------------------------------------------------------------------
        */

        queryWindow: {
            start:
                evidenceBundle
                    .queryWindow
                    ?.start ??
                null,

            end:
                evidenceBundle
                    .queryWindow
                    ?.end ??
                evidenceBundle
                    .reportingWindow
                    .end,

            lookbackMinutes:
                evidenceBundle
                    .queryWindow
                    ?.lookbackMinutes ??
                null,
        },


        /*
        |--------------------------------------------------------------------------
        | Production evidence
        |--------------------------------------------------------------------------
        |
        | Preserve the raw selected MongoDB documents.
        |
        | Nothing here converts absence to zero or reinterprets values.
        |--------------------------------------------------------------------------
        */

        evidence: {
            records:
                evidenceBundle
                    .records,

            summary:
                evidenceBundle
                    .evidence,

            diagnostics,
        },


        /*
        |--------------------------------------------------------------------------
        | Downstream integration slots
        |--------------------------------------------------------------------------
        */

        analytics: {
            sourceState:
                buildUnevaluatedGridProductionComponent({
                    phase:
                        "8.6H-C",
                }),

            power:
                buildUnevaluatedGridProductionComponent({
                    phase:
                        "8.6H-D",
                }),

            energy:
                buildUnevaluatedGridProductionComponent({
                    phase:
                        "8.6H-D",
                }),

            interruptions:
                buildUnevaluatedGridProductionComponent({
                    phase:
                        "8.6H-E",
                }),

            quality:
                buildUnevaluatedGridProductionComponent({
                    phase:
                        "8.6H-F",
                }),
        },


        /*
        |--------------------------------------------------------------------------
        | Semantic boundaries
        |--------------------------------------------------------------------------
        */

        boundaries: {
            productionDataRetrieved:
                true,

            sourceStateCalculated:
                false,

            gridPowerCalculated:
                false,

            gridEnergyCalculated:
                false,

            interruptionsIntegrated:
                false,

            gridQualityCalculated:
                false,

            phase7EventsModified:
                false,

            telemetryPersisted:
                false,

            rawTelemetryModified:
                false,

            missingMeansZero:
                false,

            noEvidenceMeansGridUnavailable:
                false,

            lookbackOnlyMeansGridAvailable:
                false,

            unitInferenceAllowed:
                false,

            directionInferenceAllowed:
                false,

            importExportEstablished:
                false,

            customerInterruptionEstablished:
                false,

            saidiSaifiEligibilityChanged:
                false,

            ensEligibilityChanged:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Production adapter
|--------------------------------------------------------------------------
|
| evidenceLoader is injectable purely for deterministic validation.
|
| In production the default loader is H-A's actual MongoDB-backed service.
|--------------------------------------------------------------------------
*/

export async function getProductionGridSiteAnalytics({
    installationId = null,
    vrmSiteId = null,

    start = null,
    end = null,

    lookbackMinutes = 30,

    evidenceLoader =
        getProductionGridTelemetryEvidence,
} = {}) {
    if (
        typeof evidenceLoader !==
        "function"
    ) {
        throw new Error(
            "Production grid evidenceLoader must be a function."
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


    return buildProductionGridSiteResult({
        evidenceBundle,
    });
}


export default {
    GRID_PRODUCTION_ADAPTER_STATUS,
    GRID_PRODUCTION_ADAPTER_REASON,
    GRID_PRODUCTION_COMPONENT_STATUS,

    validateGridProductionEvidenceBundle,
    classifyGridProductionEvidenceAvailability,
    buildUnevaluatedGridProductionComponent,
    buildGridProductionDiagnostics,
    buildProductionGridSiteResult,
    getProductionGridSiteAnalytics,
};