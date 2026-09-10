// services/engineering/gridProductionSourceStateIntegrationService.js

import {
    GRID_SOURCE_STATE_STATUS,
    GRID_SOURCE_STATE_REASON,
    DEFAULT_GRID_SOURCE_STATE_CONFIG,
    calculateGridSourceStateAnalytics,
} from "./gridSourceStateService.js";

import {
    buildProductionGridSiteResult,
} from "./gridProductionAdapter.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6H-C
| Production Grid Source-State Integration
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Connect the H-A/H-B production evidence boundary to the already-validated
| Phase 8.6C grid source-state calculation service.
|
| Important:
|
| - H-C does NOT implement source-state calculations itself.
| - attr471 interpretation remains owned by 8.6C.
| - the complete H-A evidence record set is supplied to 8.6C.
| - reporting-window semantics remain [start,end).
| - lookback evidence remains available to the underlying service but H-C
|   does not independently extrapolate or reinterpret it.
|
| H-C must NOT:
|
| - infer GRID when attr471 is absent
| - infer outage from GENERATOR / INVERTING
| - infer grid availability
| - infer customer interruption
| - calculate power or energy
| - mutate Phase 7 events
|--------------------------------------------------------------------------
*/


export const GRID_PRODUCTION_SOURCE_STATE_PHASE =
    "8.6H-C";


export const GRID_PRODUCTION_SOURCE_STATE_INTEGRATION_STATUS =
    Object.freeze({
        INTEGRATED:
            "INTEGRATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function cloneSiteShell(
    siteResult
) {
    return {
        ...siteResult,

        installation: {
            ...siteResult.installation,
        },

        reportingWindow: {
            ...siteResult.reportingWindow,
        },

        queryWindow: {
            ...siteResult.queryWindow,
        },

        evidence: {
            ...siteResult.evidence,

            diagnostics: {
                ...siteResult
                    .evidence
                    ?.diagnostics,
            },
        },

        analytics: {
            ...siteResult.analytics,
        },

        boundaries: {
            ...siteResult.boundaries,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Site-result validation
|--------------------------------------------------------------------------
*/

export function validateProductionGridSiteShell(
    siteResult
) {
    if (
        !siteResult ||
        typeof siteResult !==
            "object"
    ) {
        return {
            valid:
                false,

            reason:
                "PRODUCTION_GRID_SITE_RESULT_REQUIRED",
        };
    }


    if (
        siteResult.family !==
        "GRID"
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_GRID_FAMILY",
        };
    }


    if (
        siteResult.layer !==
        "PRODUCTION"
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_PRODUCTION_LAYER",
        };
    }


    if (
        !siteResult.installation
            ?.id ||
        !siteResult.installation
            ?.vrmSiteId
    ) {
        return {
            valid:
                false,

            reason:
                "INSTALLATION_IDENTITY_REQUIRED",
        };
    }


    if (
        !siteResult.reportingWindow
            ?.start ||
        !siteResult.reportingWindow
            ?.end
    ) {
        return {
            valid:
                false,

            reason:
                "REPORTING_WINDOW_REQUIRED",
        };
    }


    if (
        siteResult.reportingWindow
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
            siteResult
                .evidence
                ?.records
        )
    ) {
        return {
            valid:
                false,

            reason:
                "PRODUCTION_TELEMETRY_RECORDS_REQUIRED",
        };
    }


    if (
        !siteResult.analytics ||
        typeof siteResult.analytics !==
            "object"
    ) {
        return {
            valid:
                false,

            reason:
                "ANALYTICS_SHELL_REQUIRED",
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
| Extract active-source evidence
|--------------------------------------------------------------------------
|
| We explicitly expose attr471 diagnostics here, but calculation ownership
| remains with gridSourceStateService.
|--------------------------------------------------------------------------
*/

export function extractProductionActiveSourceRecords(
    records = []
) {
    if (
        !Array.isArray(
            records
        )
    ) {
        return [];
    }


    return records.filter(
        (
            record
        ) =>
            Number(
                record
                    ?.vrmAttributeId
            ) ===
            471
    );
}


/*
|--------------------------------------------------------------------------
| Build integration diagnostics
|--------------------------------------------------------------------------
*/

export function buildProductionSourceStateDiagnostics({
    allRecords = [],
    sourceRecords = [],
    sourceState = null,
    selectedDeviceInstance = null,
    config = {},
} = {}) {
    return {
        productionRecordCount:
            Array.isArray(
                allRecords
            )
                ? allRecords.length
                : 0,

        activeSourceRecordCount:
            Array.isArray(
                sourceRecords
            )
                ? sourceRecords.length
                : 0,

        selectedDeviceInstance:
            selectedDeviceInstance ??
            null,

        configuredMaxGapMinutes:
            Number(
                config
                    ?.maxGapMinutes ??
                DEFAULT_GRID_SOURCE_STATE_CONFIG
                    .maxGapMinutes
            ),

        calculatorFamily:
            sourceState
                ?.family ??
            null,

        calculatorStatus:
            sourceState
                ?.status ??
            null,

        calculatorReason:
            sourceState
                ?.reason ??
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Integrate Phase 8.6C into one H-B site result
|--------------------------------------------------------------------------
*/

export function integrateProductionGridSourceState({
    siteResult,

    selectedDeviceInstance = null,

    config = {},

    sourceStateCalculator =
        calculateGridSourceStateAnalytics,
} = {}) {
    const validation =
        validateProductionGridSiteShell(
            siteResult
        );


    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid production GRID site shell: ${validation.reason}`
        );
    }


    if (
        typeof sourceStateCalculator !==
        "function"
    ) {
        throw new Error(
            "sourceStateCalculator must be a function."
        );
    }


    const records =
        siteResult
            .evidence
            .records;


    const sourceRecords =
        extractProductionActiveSourceRecords(
            records
        );


    /*
    |--------------------------------------------------------------------------
    | Important
    |--------------------------------------------------------------------------
    |
    | Pass the COMPLETE H-A production evidence record set.
    |
    | The validated 8.6C service owns filtering of attr471, quality, RAW
    | evidence, topology and reporting-window exposure.
    |
    | H-C must not reproduce that logic.
    |--------------------------------------------------------------------------
    */

    const sourceState =
        sourceStateCalculator({
            records,

            start:
                siteResult
                    .reportingWindow
                    .start,

            end:
                siteResult
                    .reportingWindow
                    .end,

            selectedDeviceInstance,

            config,
        });


    const output =
        cloneSiteShell(
            siteResult
        );


    output.phase =
        GRID_PRODUCTION_SOURCE_STATE_PHASE;


    output.analytics
        .sourceState =
        {
            status:
                GRID_PRODUCTION_SOURCE_STATE_INTEGRATION_STATUS
                    .INTEGRATED,

            phase:
                GRID_PRODUCTION_SOURCE_STATE_PHASE,

            reason:
                sourceState
                    ?.reason ??
                null,

            value:
                sourceState,

            diagnostics:
                buildProductionSourceStateDiagnostics({
                    allRecords:
                        records,

                    sourceRecords,

                    sourceState,

                    selectedDeviceInstance,

                    config,
                }),
        };


    output.boundaries
        .sourceStateCalculated =
        true;


    /*
    |--------------------------------------------------------------------------
    | Explicitly preserve all downstream boundaries
    |--------------------------------------------------------------------------
    */

    output.boundaries
        .gridPowerCalculated =
        false;

    output.boundaries
        .gridEnergyCalculated =
        false;

    output.boundaries
        .interruptionsIntegrated =
        false;

    output.boundaries
        .gridQualityCalculated =
        false;

    output.boundaries
        .phase7EventsModified =
        false;

    output.boundaries
        .customerInterruptionEstablished =
        false;

    output.boundaries
        .saidiSaifiEligibilityChanged =
        false;

    output.boundaries
        .ensEligibilityChanged =
        false;

    output.boundaries
        .unitInferenceAllowed =
        false;

    output.boundaries
        .directionInferenceAllowed =
        false;

    output.boundaries
        .importExportEstablished =
        false;


    return output;
}


/*
|--------------------------------------------------------------------------
| Build H-C directly from an H-A evidence bundle
|--------------------------------------------------------------------------
|
| Useful for deterministic tests and later production orchestration.
|--------------------------------------------------------------------------
*/

export function buildProductionGridSourceStateFromEvidence({
    evidenceBundle,

    selectedDeviceInstance = null,

    config = {},

    sourceStateCalculator =
        calculateGridSourceStateAnalytics,
} = {}) {
    const siteResult =
        buildProductionGridSiteResult({
            evidenceBundle,
        });


    return integrateProductionGridSourceState({
        siteResult,

        selectedDeviceInstance,

        config,

        sourceStateCalculator,
    });
}


/*
|--------------------------------------------------------------------------
| Status helpers
|--------------------------------------------------------------------------
*/

export function isProductionSourceStateAvailable(
    sourceStateResult
) {
    const status =
        sourceStateResult
            ?.analytics
            ?.sourceState
            ?.value
            ?.status;


    return (
        status ===
            GRID_SOURCE_STATE_STATUS
                .CALCULATED ||
        status ===
            GRID_SOURCE_STATE_STATUS
                .PARTIALLY_CALCULATED
    );
}


export function isProductionSourceStateUnavailable(
    sourceStateResult
) {
    return (
        sourceStateResult
            ?.analytics
            ?.sourceState
            ?.value
            ?.status ===
        GRID_SOURCE_STATE_STATUS
            .UNAVAILABLE
    );
}


/*
|--------------------------------------------------------------------------
| Semantic audit
|--------------------------------------------------------------------------
*/

export function auditProductionSourceStateBoundaries(
    result
) {
    return {
        sourceStateIntegrated:
            result
                ?.boundaries
                ?.sourceStateCalculated ===
            true,

        powerStillUnevaluated:
            result
                ?.boundaries
                ?.gridPowerCalculated ===
            false,

        energyStillUnevaluated:
            result
                ?.boundaries
                ?.gridEnergyCalculated ===
            false,

        interruptionsStillUnevaluated:
            result
                ?.boundaries
                ?.interruptionsIntegrated ===
            false,

        qualityStillUnevaluated:
            result
                ?.boundaries
                ?.gridQualityCalculated ===
            false,

        phase7Immutable:
            result
                ?.boundaries
                ?.phase7EventsModified ===
            false,

        customerInterruptionNotInferred:
            result
                ?.boundaries
                ?.customerInterruptionEstablished ===
            false,

        reliabilityEligibilityUnchanged:
            (
                result
                    ?.boundaries
                    ?.saidiSaifiEligibilityChanged ===
                false
            ) &&
            (
                result
                    ?.boundaries
                    ?.ensEligibilityChanged ===
                false
            ),

        unitInferenceBlocked:
            result
                ?.boundaries
                ?.unitInferenceAllowed ===
            false,

        directionInferenceBlocked:
            result
                ?.boundaries
                ?.directionInferenceAllowed ===
            false,
    };
}


export default {
    GRID_PRODUCTION_SOURCE_STATE_PHASE,
    GRID_PRODUCTION_SOURCE_STATE_INTEGRATION_STATUS,

    validateProductionGridSiteShell,
    extractProductionActiveSourceRecords,
    buildProductionSourceStateDiagnostics,
    integrateProductionGridSourceState,
    buildProductionGridSourceStateFromEvidence,
    isProductionSourceStateAvailable,
    isProductionSourceStateUnavailable,
    auditProductionSourceStateBoundaries,
};