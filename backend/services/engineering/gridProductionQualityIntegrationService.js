// services/engineering/gridProductionQualityIntegrationService.js

import {
    GRID_QUALITY_ANALYTICS_STATUS,
    DEFAULT_GRID_QUALITY_ANALYTICS_CONFIG,
    calculateGridQualityAnalytics,
} from "./gridQualityAnalyticsService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6H-F
| Production Grid-Quality Integration
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Connect the Phase 8.6H production adapter to the already-validated
| Phase 8.6G-H pure grid-quality analytics orchestrator.
|
| INPUT
|
| - canonical H-E production grid result
| - H-A production telemetry records
| - H-C canonical source-state intervals
| - optional selected grid-quality deviceInstance
| - optional explicitly supplied threshold profile
| - optional quality-engine configuration
|
| OUTPUT
|
| - analytics.quality populated from canonical Phase 8.6G-H
| - phase advanced from 8.6H-E to 8.6H-F
|
| ARCHITECTURAL BOUNDARY
|
| This service DOES NOT:
|
| - query MongoDB
| - call VRM
| - persist telemetry
| - persist quality analytics
| - modify raw telemetry
| - modify Phase 7 OutageEvent
| - create outage events
| - infer outage from voltage/current/frequency quality
| - infer customer interruption
| - infer grid availability
| - infer voltage units
| - infer current units
| - infer frequency units
| - assume nominal voltage
| - assume nominal frequency
| - apply IEC / IEEE / EN / NERC / utility limits by default
| - claim standards compliance
| - claim standards certification
| - alter SAIDI / SAIFI eligibility
| - alter ENS eligibility
|--------------------------------------------------------------------------
*/


export const GRID_PRODUCTION_QUALITY_PHASE =
    "8.6H-F";


export const GRID_PRODUCTION_QUALITY_INTEGRATION_STATUS =
    Object.freeze({
        INTEGRATED:
            "INTEGRATED",
    });


export const GRID_PRODUCTION_QUALITY_REASON =
    Object.freeze({
        INTEGRATION_EXECUTED:
            "INTEGRATION_EXECUTED",
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function asDate(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }


    const date =
        value instanceof Date
            ? new Date(
                value.getTime()
            )
            : new Date(
                value
            );


    return Number.isFinite(
        date.getTime()
    )
        ? date
        : null;
}


function cloneProductionGridResult(
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

            sourceState: {
                ...siteResult
                    .analytics
                    ?.sourceState,
            },

            power: {
                ...siteResult
                    .analytics
                    ?.power,
            },

            energy: {
                ...siteResult
                    .analytics
                    ?.energy,
            },

            interruptions: {
                ...siteResult
                    .analytics
                    ?.interruptions,
            },
        },

        boundaries: {
            ...siteResult.boundaries,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Input validation
|--------------------------------------------------------------------------
*/

export function validateProductionGridQualityInput(
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
        siteResult.phase !==
        "8.6H-E"
    ) {
        return {
            valid:
                false,

            reason:
                "PHASE_8_6H_E_REQUIRED",
        };
    }


    const start =
        asDate(
            siteResult
                ?.reportingWindow
                ?.start
        );


    const end =
        asDate(
            siteResult
                ?.reportingWindow
                ?.end
        );


    if (
        !start ||
        !end ||
        start >= end
    ) {
        return {
            valid:
                false,

            reason:
                "VALID_REPORTING_WINDOW_REQUIRED",
        };
    }


    if (
        siteResult
            ?.reportingWindow
            ?.semantics !==
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
                ?.evidence
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


    const sourceState =
        siteResult
            ?.analytics
            ?.sourceState
            ?.value;


    if (
        !sourceState ||
        sourceState.family !==
            "GRID_SOURCE_STATE"
    ) {
        return {
            valid:
                false,

            reason:
                "GRID_SOURCE_STATE_RESULT_REQUIRED",
        };
    }


    if (
        !Array.isArray(
            sourceState.intervals
        )
    ) {
        return {
            valid:
                false,

            reason:
                "SOURCE_STATE_INTERVALS_REQUIRED",
        };
    }


    /*
     * H-F must not skip preceding production stages.
     */

    if (
        siteResult
            ?.analytics
            ?.power
            ?.status !==
        "INTEGRATED"
    ) {
        return {
            valid:
                false,

            reason:
                "POWER_INTEGRATION_REQUIRED",
        };
    }


    if (
        siteResult
            ?.analytics
            ?.energy
            ?.status !==
        "INTEGRATED"
    ) {
        return {
            valid:
                false,

            reason:
                "ENERGY_INTEGRATION_REQUIRED",
        };
    }


    if (
        siteResult
            ?.analytics
            ?.interruptions
            ?.status !==
        "INTEGRATED"
    ) {
        return {
            valid:
                false,

            reason:
                "INTERRUPTION_INTEGRATION_REQUIRED",
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
| Canonical production quality evidence
|--------------------------------------------------------------------------
*/

export function getProductionGridQualityEvidence(
    siteResult
) {
    const validation =
        validateProductionGridQualityInput(
            siteResult
        );


    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid H-E production grid result: ${validation.reason}`
        );
    }


    return {
        records:
            siteResult
                .evidence
                .records,

        sourceState:
            siteResult
                .analytics
                .sourceState
                .value,

        sourceStateIntervals:
            siteResult
                .analytics
                .sourceState
                .value
                .intervals,

        start:
            asDate(
                siteResult
                    .reportingWindow
                    .start
            ),

        end:
            asDate(
                siteResult
                    .reportingWindow
                    .end
            ),

        reportingWindowSemantics:
            "[start,end)",
    };
}


/*
|--------------------------------------------------------------------------
| Delegate to canonical 8.6G-H engine
|--------------------------------------------------------------------------
*/

export function calculateProductionGridQuality({
    records = [],

    sourceStateIntervals = [],

    selectedDeviceInstance = null,

    start = null,

    end = null,

    thresholdProfile = null,

    config = {},

    qualityCalculator =
        calculateGridQualityAnalytics,
} = {}) {
    if (
        typeof qualityCalculator !==
        "function"
    ) {
        throw new Error(
            "qualityCalculator must be a function."
        );
    }


    return qualityCalculator({
        records,

        sourceStateIntervals,

        selectedDeviceInstance,

        start,

        end,

        thresholdProfile,

        config,
    });
}


/*
|--------------------------------------------------------------------------
| Diagnostics
|--------------------------------------------------------------------------
*/

export function buildProductionGridQualityDiagnostics({
    evidence,

    qualityResult,

    selectedDeviceInstance =
        null,

    thresholdProfile =
        null,
} = {}) {
    return {
        telemetryRecordCount:
            Array.isArray(
                evidence
                    ?.records
            )
                ? evidence
                    .records
                    .length
                : 0,

        sourceStateIntervalCount:
            Array.isArray(
                evidence
                    ?.sourceStateIntervals
            )
                ? evidence
                    .sourceStateIntervals
                    .length
                : 0,

        sourceStateStatus:
            evidence
                ?.sourceState
                ?.status ??
            null,

        sourceStateReason:
            evidence
                ?.sourceState
                ?.reason ??
            null,

        qualityStatus:
            qualityResult
                ?.status ??
            null,

        qualityReason:
            qualityResult
                ?.reason ??
            null,

        selectedDeviceInstance:
            selectedDeviceInstance ??
            null,

        thresholdProfileProvided:
            thresholdProfile !==
            null,

        thresholdProfileApplied:
            qualityResult
                ?.evidence
                ?.thresholdProfileApplied ??
            qualityResult
                ?.thresholds
                ?.enabled ??
            false,

        thresholdOutsideLimitsCount:
            qualityResult
                ?.evidence
                ?.thresholdOutsideLimitsCount ??
            qualityResult
                ?.thresholds
                ?.metrics
                ?.outsideLimitsCount ??
            null,

        canonicalGridQualityEngine:
            "8.6G-H",

        sourceStateCorroborativeQualification:
            true,
    };
}


/*
|--------------------------------------------------------------------------
| Main production integration
|--------------------------------------------------------------------------
*/

export function integrateProductionGridQuality({
    siteResult,

    selectedDeviceInstance =
        null,

    thresholdProfile =
        null,

    config = {},

    qualityCalculator =
        calculateGridQualityAnalytics,
} = {}) {
    const validation =
        validateProductionGridQualityInput(
            siteResult
        );


    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid H-E production grid result: ${validation.reason}`
        );
    }


    if (
        typeof qualityCalculator !==
        "function"
    ) {
        throw new Error(
            "qualityCalculator must be a function."
        );
    }


    const evidence =
        getProductionGridQualityEvidence(
            siteResult
        );


    const qualityResult =
        calculateProductionGridQuality({
            records:
                evidence.records,

            sourceStateIntervals:
                evidence
                    .sourceStateIntervals,

            selectedDeviceInstance,

            start:
                evidence.start,

            end:
                evidence.end,

            thresholdProfile,

            config,

            qualityCalculator,
        });


    const output =
        cloneProductionGridResult(
            siteResult
        );


    output.phase =
        GRID_PRODUCTION_QUALITY_PHASE;


    output.analytics.quality =
        {
            status:
                GRID_PRODUCTION_QUALITY_INTEGRATION_STATUS
                    .INTEGRATED,

            phase:
                GRID_PRODUCTION_QUALITY_PHASE,

            reason:
                qualityResult
                    ?.reason ??
                GRID_PRODUCTION_QUALITY_REASON
                    .INTEGRATION_EXECUTED,

            value:
                qualityResult,
        };


    output.evidence
        .qualityDiagnostics =
        buildProductionGridQualityDiagnostics({
            evidence,

            qualityResult,

            selectedDeviceInstance,

            thresholdProfile,
        });


    /*
    |--------------------------------------------------------------------------
    | Production boundary state
    |--------------------------------------------------------------------------
    */

    output.boundaries
        .gridQualityCalculated =
        true;


    /*
     * H-F is an analytics adapter only.
     */

    output.boundaries
        .phase7EventsModified =
        false;

    output.boundaries
        .rawTelemetryModified =
        false;

    output.boundaries
        .telemetryPersisted =
        false;


    /*
     * No outage / reliability inference from quality measurements.
     */

    output.boundaries
        .qualityOutageInferred =
        false;

    output.boundaries
        .gridAvailabilityEstablishedByQuality =
        false;

    output.boundaries
        .customerInterruptionEstablishedByQuality =
        false;

    output.boundaries
        .reliabilityStateModifiedByQuality =
        false;

    output.boundaries
        .saidiSaifiEligibilityChanged =
        false;

    output.boundaries
        .ensEligibilityChanged =
        false;


    /*
     * No unit or direction semantics are fabricated.
     */

    output.boundaries
        .voltageUnitInferred =
        false;

    output.boundaries
        .currentUnitInferred =
        false;

    output.boundaries
        .frequencyUnitInferred =
        false;

    output.boundaries
        .negativeCurrentMeansExport =
        false;


    /*
     * No electrical nominal assumptions.
     */

    output.boundaries
        .nominalVoltageAssumed =
        false;

    output.boundaries
        .nominalFrequencyAssumed =
        false;


    /*
     * Threshold profile is optional and externally supplied.
     */

    output.boundaries
        .defaultThresholdProfileApplied =
        false;

    output.boundaries
        .thresholdProfileOptional =
        true;

    output.boundaries
        .missingThresholdProfileMeansQualityUnavailable =
        false;


    /*
     * Threshold classification is operational classification only.
     */

    output.boundaries
        .standardsComplianceEstablished =
        false;

    output.boundaries
        .standardsCertificationEstablished =
        false;


    /*
     * Do not mislabel magnitude-deviation unbalance as
     * negative-sequence VUF.
     */

    output.boundaries
        .voltageUnbalanceEqualsNegativeSequenceVUF =
        false;


    return output;
}


/*
|--------------------------------------------------------------------------
| Engineering availability helper
|--------------------------------------------------------------------------
*/

export function isProductionGridQualityAvailable(
    result
) {
    const status =
        result
            ?.analytics
            ?.quality
            ?.value
            ?.status;


    return (
        status ===
            GRID_QUALITY_ANALYTICS_STATUS
                .CALCULATED ||
        status ===
            GRID_QUALITY_ANALYTICS_STATUS
                .PARTIALLY_CALCULATED
    );
}


/*
|--------------------------------------------------------------------------
| Boundary audit
|--------------------------------------------------------------------------
*/

export function auditProductionGridQualityBoundaries(
    result
) {
    return {
        qualityIntegrationExecuted:
            result
                ?.boundaries
                ?.gridQualityCalculated ===
            true,

        phase7Immutable:
            result
                ?.boundaries
                ?.phase7EventsModified ===
            false,

        rawTelemetryImmutable:
            result
                ?.boundaries
                ?.rawTelemetryModified ===
            false,

        qualityDoesNotCreateOutage:
            result
                ?.boundaries
                ?.qualityOutageInferred ===
            false,

        gridAvailabilityNotEstablished:
            result
                ?.boundaries
                ?.gridAvailabilityEstablishedByQuality ===
            false,

        serviceInterruptionNotEstablished:
            result
                ?.boundaries
                ?.customerInterruptionEstablishedByQuality ===
            false,

        reliabilityStateUnchanged:
            result
                ?.boundaries
                ?.reliabilityStateModifiedByQuality ===
            false,

        saidiSaifiEligibilityUnchanged:
            result
                ?.boundaries
                ?.saidiSaifiEligibilityChanged ===
            false,

        ensEligibilityUnchanged:
            result
                ?.boundaries
                ?.ensEligibilityChanged ===
            false,

        voltageUnitNotInferred:
            result
                ?.boundaries
                ?.voltageUnitInferred ===
            false,

        currentUnitNotInferred:
            result
                ?.boundaries
                ?.currentUnitInferred ===
            false,

        frequencyUnitNotInferred:
            result
                ?.boundaries
                ?.frequencyUnitInferred ===
            false,

        nominalVoltageNotAssumed:
            result
                ?.boundaries
                ?.nominalVoltageAssumed ===
            false,

        nominalFrequencyNotAssumed:
            result
                ?.boundaries
                ?.nominalFrequencyAssumed ===
            false,

        negativeCurrentNotExport:
            result
                ?.boundaries
                ?.negativeCurrentMeansExport ===
            false,

        noDefaultThresholdProfile:
            result
                ?.boundaries
                ?.defaultThresholdProfileApplied ===
            false,

        thresholdProfileOptional:
            result
                ?.boundaries
                ?.thresholdProfileOptional ===
            true,

        missingThresholdProfileDoesNotInvalidateQuality:
            result
                ?.boundaries
                ?.missingThresholdProfileMeansQualityUnavailable ===
            false,

        standardsComplianceNotEstablished:
            result
                ?.boundaries
                ?.standardsComplianceEstablished ===
            false,

        standardsCertificationNotEstablished:
            result
                ?.boundaries
                ?.standardsCertificationEstablished ===
            false,

        magnitudeUnbalanceNotNegativeSequenceVuf:
            result
                ?.boundaries
                ?.voltageUnbalanceEqualsNegativeSequenceVUF ===
            false,
    };
}


export default {
    GRID_PRODUCTION_QUALITY_PHASE,
    GRID_PRODUCTION_QUALITY_INTEGRATION_STATUS,
    GRID_PRODUCTION_QUALITY_REASON,

    validateProductionGridQualityInput,
    getProductionGridQualityEvidence,
    calculateProductionGridQuality,
    buildProductionGridQualityDiagnostics,
    integrateProductionGridQuality,
    isProductionGridQualityAvailable,
    auditProductionGridQualityBoundaries,

    DEFAULT_GRID_QUALITY_ANALYTICS_CONFIG,
};