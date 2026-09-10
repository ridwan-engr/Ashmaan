// services/engineering/gridQualityAnalyticsService.js

import {
    GRID_QUALITY_TELEMETRY_STATUS,
    calculateGridQualityTelemetryQualification,
} from "./gridQualityTelemetryQualificationService.js";

import {
    GRID_VOLTAGE_ANALYTICS_STATUS,
    calculateGridVoltageAnalytics,
} from "./gridVoltageAnalyticsService.js";

import {
    GRID_CURRENT_ANALYTICS_STATUS,
    calculateGridCurrentAnalytics,
} from "./gridCurrentAnalyticsService.js";

import {
    GRID_FREQUENCY_ANALYTICS_STATUS,
    calculateGridFrequencyAnalytics,
} from "./gridFrequencyAnalyticsService.js";

import {
    GRID_VOLTAGE_UNBALANCE_STATUS,
    calculateGridVoltageUnbalance,
} from "./gridVoltageUnbalanceService.js";

import {
    GRID_CURRENT_UNBALANCE_STATUS,
    calculateGridCurrentUnbalance,
} from "./gridCurrentUnbalanceService.js";

import {
    GRID_QUALITY_THRESHOLD_METRIC,
    GRID_QUALITY_THRESHOLD_STATUS,
    classifyGridQualityMetrics,
} from "./gridQualityThresholdService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6G-H
| Pure Grid-Quality Analytics Orchestrator
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Combine the already-validated Phase 8.6G-A through 8.6G-G services into
| one pure grid-quality analytics result.
|
| This service does NOT:
|
| - query MongoDB
| - call VRM
| - persist analytics
| - modify Phase 7 outage events
| - create new quality formulas
| - create new power-quality standards
| - fabricate missing units
| - infer outage from electrical-quality values
|--------------------------------------------------------------------------
*/


export const GRID_QUALITY_ANALYTICS_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GRID_QUALITY_ANALYTICS_REASON =
    Object.freeze({
        GRID_QUALITY_ANALYTICS_QUALIFIED:
            "GRID_QUALITY_ANALYTICS_QUALIFIED",

        GRID_QUALITY_ANALYTICS_PARTIAL:
            "GRID_QUALITY_ANALYTICS_PARTIAL",

        NO_GRID_QUALITY_EVIDENCE:
            "NO_GRID_QUALITY_EVIDENCE",

        GRID_QUALITY_QUALIFICATION_UNAVAILABLE:
            "GRID_QUALITY_QUALIFICATION_UNAVAILABLE",
    });


export const DEFAULT_GRID_QUALITY_ANALYTICS_CONFIG =
    Object.freeze({
        voltage: {
            maxGapMinutes:
                30,
        },

        current: {
            maxGapMinutes:
                30,
        },

        frequency: {
            maxGapMinutes:
                30,
        },

        voltageUnbalance: {
            alignmentToleranceSeconds:
                60,
        },

        currentUnbalance: {
            alignmentToleranceSeconds:
                60,
        },
    });


/*
|--------------------------------------------------------------------------
| Status normalization
|--------------------------------------------------------------------------
*/

function normalizeComponentStatus(
    status
) {
    if (
        status === "CALCULATED"
    ) {
        return GRID_QUALITY_ANALYTICS_STATUS
            .CALCULATED;
    }


    if (
        status ===
        "PARTIALLY_CALCULATED"
    ) {
        return GRID_QUALITY_ANALYTICS_STATUS
            .PARTIALLY_CALCULATED;
    }


    return GRID_QUALITY_ANALYTICS_STATUS
        .UNAVAILABLE;
}


/*
|--------------------------------------------------------------------------
| Child-component status roll-up
|--------------------------------------------------------------------------
*/

export function resolveGridQualityFamilyStatus({
    voltage,
    current,
    frequency,
    voltageUnbalance,
    currentUnbalance,
} = {}) {
    const statuses =
        [
            voltage,
            current,
            frequency,
            voltageUnbalance,
            currentUnbalance,
        ]
            .map(
                (
                    component
                ) =>
                    normalizeComponentStatus(
                        component?.status
                    )
            );


    const calculatedCount =
        statuses.filter(
            (
                status
            ) =>
                status ===
                GRID_QUALITY_ANALYTICS_STATUS
                    .CALCULATED
        )
            .length;


    const partialCount =
        statuses.filter(
            (
                status
            ) =>
                status ===
                GRID_QUALITY_ANALYTICS_STATUS
                    .PARTIALLY_CALCULATED
        )
            .length;


    const unavailableCount =
        statuses.filter(
            (
                status
            ) =>
                status ===
                GRID_QUALITY_ANALYTICS_STATUS
                    .UNAVAILABLE
        )
            .length;


    /*
    |--------------------------------------------------------------------------
    | Fully calculated
    |--------------------------------------------------------------------------
    |
    | Every core engineering-quality family must be CALCULATED.
    |--------------------------------------------------------------------------
    */

    if (
        calculatedCount ===
        statuses.length
    ) {
        return {
            status:
                GRID_QUALITY_ANALYTICS_STATUS
                    .CALCULATED,

            reason:
                GRID_QUALITY_ANALYTICS_REASON
                    .GRID_QUALITY_ANALYTICS_QUALIFIED,

            calculatedCount,

            partialCount,

            unavailableCount,

            totalComponentCount:
                statuses.length,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Entire family unavailable
    |--------------------------------------------------------------------------
    */

    if (
        unavailableCount ===
        statuses.length
    ) {
        return {
            status:
                GRID_QUALITY_ANALYTICS_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_ANALYTICS_REASON
                    .NO_GRID_QUALITY_EVIDENCE,

            calculatedCount,

            partialCount,

            unavailableCount,

            totalComponentCount:
                statuses.length,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Any mixture of calculated / partial / unavailable is partial.
    |--------------------------------------------------------------------------
    */

    return {
        status:
            GRID_QUALITY_ANALYTICS_STATUS
                .PARTIALLY_CALCULATED,

        reason:
            GRID_QUALITY_ANALYTICS_REASON
                .GRID_QUALITY_ANALYTICS_PARTIAL,

        calculatedCount,

        partialCount,

        unavailableCount,

        totalComponentCount:
            statuses.length,
    };
}


/*
|--------------------------------------------------------------------------
| Safe descriptive statistic extraction
|--------------------------------------------------------------------------
*/

function finiteOrNull(
    value
) {
    return (
        typeof value ===
            "number" &&
        Number.isFinite(
            value
        )
    )
        ? value
        : null;
}


/*
|--------------------------------------------------------------------------
| Threshold input builder
|--------------------------------------------------------------------------
|
| Threshold classification is optional.
|
| Voltage / frequency:
|     classify observed per-phase minima and maxima.
|
| Why extrema rather than only mean?
|
| A mean could hide excursions that already exist in the descriptive
| analytics. This builder therefore exposes already-calculated extrema
| without recalculating the source telemetry.
|
| Unbalance:
|     classify the already-derived maximum observed percentage.
|
| Current raw magnitude has no independent operating-limit framework here;
| only current-unbalance percentage is thresholded in Phase 8.6G-G.
|--------------------------------------------------------------------------
*/

export function buildGridQualityThresholdInputs({
    voltage,
    frequency,
    voltageUnbalance,
    currentUnbalance,
} = {}) {
    const inputs =
        [];


    for (
        const phase
        of [
            "L1",
            "L2",
            "L3",
        ]
    ) {
        const statistics =
            voltage
                ?.phases
                ?.[phase]
                ?.statistics;


        const minimum =
            finiteOrNull(
                statistics
                    ?.minimum
            );


        const maximum =
            finiteOrNull(
                statistics
                    ?.maximum
            );


        if (
            minimum !==
            null
        ) {
            inputs.push({
                metric:
                    GRID_QUALITY_THRESHOLD_METRIC
                        .VOLTAGE,

                value:
                    minimum,

                context: {
                    phase,

                    statistic:
                        "MINIMUM",
                },
            });
        }


        if (
            maximum !==
            null
        ) {
            inputs.push({
                metric:
                    GRID_QUALITY_THRESHOLD_METRIC
                        .VOLTAGE,

                value:
                    maximum,

                context: {
                    phase,

                    statistic:
                        "MAXIMUM",
                },
            });
        }
    }


    for (
        const phase
        of [
            "L1",
            "L2",
            "L3",
        ]
    ) {
        const statistics =
            frequency
                ?.phases
                ?.[phase]
                ?.statistics;


        const minimum =
            finiteOrNull(
                statistics
                    ?.minimum
            );


        const maximum =
            finiteOrNull(
                statistics
                    ?.maximum
            );


        if (
            minimum !==
            null
        ) {
            inputs.push({
                metric:
                    GRID_QUALITY_THRESHOLD_METRIC
                        .FREQUENCY,

                value:
                    minimum,

                context: {
                    phase,

                    statistic:
                        "MINIMUM",
                },
            });
        }


        if (
            maximum !==
            null
        ) {
            inputs.push({
                metric:
                    GRID_QUALITY_THRESHOLD_METRIC
                        .FREQUENCY,

                value:
                    maximum,

                context: {
                    phase,

                    statistic:
                        "MAXIMUM",
                },
            });
        }
    }


    const maximumVoltageUnbalance =
        finiteOrNull(
            voltageUnbalance
                ?.statistics
                ?.maximumPercent
        );


    if (
        maximumVoltageUnbalance !==
        null
    ) {
        inputs.push({
            metric:
                GRID_QUALITY_THRESHOLD_METRIC
                    .VOLTAGE_UNBALANCE_PERCENT,

            value:
                maximumVoltageUnbalance,

            context: {
                statistic:
                    "MAXIMUM_PERCENT",
            },
        });
    }


    const maximumCurrentUnbalance =
        finiteOrNull(
            currentUnbalance
                ?.statistics
                ?.maximumPercent
        );


    if (
        maximumCurrentUnbalance !==
        null
    ) {
        inputs.push({
            metric:
                GRID_QUALITY_THRESHOLD_METRIC
                    .CURRENT_UNBALANCE_PERCENT,

            value:
                maximumCurrentUnbalance,

            context: {
                statistic:
                    "MAXIMUM_PERCENT",
            },
        });
    }


    return inputs;
}


/*
|--------------------------------------------------------------------------
| Attach threshold context
|--------------------------------------------------------------------------
*/

function mergeThresholdContext({
    thresholdInputs,
    thresholdResults,
}) {
    return thresholdResults.map(
        (
            result,
            index
        ) => ({
            ...result,

            context:
                thresholdInputs[
                    index
                ]
                    ?.context ??
                null,
        })
    );
}


/*
|--------------------------------------------------------------------------
| Threshold orchestration
|--------------------------------------------------------------------------
*/

export function calculateGridQualityThresholdSummary({
    voltage,
    frequency,
    voltageUnbalance,
    currentUnbalance,
    thresholdProfile = null,
} = {}) {
    /*
    |--------------------------------------------------------------------------
    | No profile
    |--------------------------------------------------------------------------
    |
    | This is NOT an error and must not degrade the engineering-quality
    | family status. Threshold classification is optional configuration.
    |--------------------------------------------------------------------------
    */

    if (
        !thresholdProfile
    ) {
        return {
            enabled:
                false,

            status:
                GRID_QUALITY_THRESHOLD_STATUS
                    .UNAVAILABLE,

            reason:
                "NO_THRESHOLD_PROFILE",

            results:
                [],

            semantics: {
                optionalThresholdLayer:
                    true,

                absenceDegradesEngineeringAnalytics:
                    false,

                standardsComplianceEstablished:
                    false,
            },
        };
    }


    const thresholdInputs =
        buildGridQualityThresholdInputs({
            voltage,
            frequency,
            voltageUnbalance,
            currentUnbalance,
        });


    const classification =
        classifyGridQualityMetrics({
            metrics:
                thresholdInputs.map(
                    (
                        input
                    ) => ({
                        metric:
                            input.metric,

                        value:
                            input.value,
                    })
                ),

            profile:
                thresholdProfile,
        });


    return {
        ...classification,

        enabled:
            true,

        results:
            mergeThresholdContext({
                thresholdInputs,

                thresholdResults:
                    classification
                        .results ??
                    [],
            }),

        evidence: {
            classificationInputCount:
                thresholdInputs
                    .length,

            classificationBasis:
                "ALREADY_DERIVED_DESCRIPTIVE_EXTREMA",

            rawTelemetryReclassified:
                false,

            newElectricalFormulaIntroduced:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

function buildSemantics() {
    return {
        pureService:
            true,

        databaseAccess:
            false,

        vrmApiAccess:
            false,

        persistencePerformed:
            false,

        phase7EventsModified:
            false,

        duplicateOutageDetectorCreated:
            false,

        rawTelemetryModified:
            false,

        gridSourceQualificationDelegatedTo8_6GA:
            true,

        voltageAnalyticsDelegatedTo8_6GB:
            true,

        currentAnalyticsDelegatedTo8_6GC:
            true,

        frequencyAnalyticsDelegatedTo8_6GD:
            true,

        voltageUnbalanceDelegatedTo8_6GE:
            true,

        currentUnbalanceDelegatedTo8_6GF:
            true,

        thresholdClassificationDelegatedTo8_6GG:
            true,

        thresholdProfileOptional:
            true,

        missingThresholdProfileMeansQualityUnavailable:
            false,

        missingThresholdProfileMeansCompliancePassed:
            false,

        standardsComplianceEstablished:
            false,

        standardsCertificationEstablished:
            false,

        voltageUnitInferred:
            false,

        currentUnitInferred:
            false,

        frequencyUnitInferred:
            false,

        nominalVoltageAssumed:
            false,

        nominalFrequencyAssumed:
            false,

        negativeCurrentMeansExport:
            false,

        voltageUnbalanceEqualsNegativeSequenceVUF:
            false,

        outageEstablished:
            false,

        gridAvailabilityEstablished:
            false,

        serviceInterruptionEstablished:
            false,

        reliabilityStateModified:
            false,

        unavailableMeansZero:
            false,
    };
}


/*
|--------------------------------------------------------------------------
| Public orchestration service
|--------------------------------------------------------------------------
*/

export function calculateGridQualityAnalytics({
    records = [],
    sourceStateIntervals = [],

    selectedDeviceInstance = null,

    start = null,
    end = null,

    thresholdProfile = null,

    config = {},
} = {}) {
    const effectiveConfig =
        {
            voltage: {
                ...DEFAULT_GRID_QUALITY_ANALYTICS_CONFIG
                    .voltage,

                ...(
                    config
                        ?.voltage ??
                    {}
                ),
            },

            current: {
                ...DEFAULT_GRID_QUALITY_ANALYTICS_CONFIG
                    .current,

                ...(
                    config
                        ?.current ??
                    {}
                ),
            },

            frequency: {
                ...DEFAULT_GRID_QUALITY_ANALYTICS_CONFIG
                    .frequency,

                ...(
                    config
                        ?.frequency ??
                    {}
                ),
            },

            voltageUnbalance: {
                ...DEFAULT_GRID_QUALITY_ANALYTICS_CONFIG
                    .voltageUnbalance,

                ...(
                    config
                        ?.voltageUnbalance ??
                    {}
                ),
            },

            currentUnbalance: {
                ...DEFAULT_GRID_QUALITY_ANALYTICS_CONFIG
                    .currentUnbalance,

                ...(
                    config
                        ?.currentUnbalance ??
                    {}
                ),
            },
        };


    /*
    |--------------------------------------------------------------------------
    | 8.6G-A
    |--------------------------------------------------------------------------
    */

    const qualification =
        calculateGridQualityTelemetryQualification({
            records,

            sourceStateIntervals,

            selectedDeviceInstance,
        });


    /*
    |--------------------------------------------------------------------------
    | No qualified GRID-quality evidence
    |--------------------------------------------------------------------------
    */

    if (
        qualification.status ===
            GRID_QUALITY_TELEMETRY_STATUS
                .UNAVAILABLE ||
        qualification
            .qualifiedSamples
            ?.length ===
            0
    ) {
        return {
            family:
                "GRID_QUALITY",

            status:
                GRID_QUALITY_ANALYTICS_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_ANALYTICS_REASON
                    .GRID_QUALITY_QUALIFICATION_UNAVAILABLE,

            qualification,

            analytics: {
                voltage:
                    null,

                current:
                    null,

                frequency:
                    null,

                voltageUnbalance:
                    null,

                currentUnbalance:
                    null,
            },

            thresholds:
                calculateGridQualityThresholdSummary({
                    thresholdProfile,
                }),

            semantics:
                buildSemantics(),
        };
    }


    const qualifiedSamples =
        qualification
            .qualifiedSamples;


    /*
    |--------------------------------------------------------------------------
    | 8.6G-B
    |--------------------------------------------------------------------------
    */

    const voltage =
        calculateGridVoltageAnalytics({
            qualifiedSamples,

            start,

            end,

            config:
                effectiveConfig
                    .voltage,
        });


    /*
    |--------------------------------------------------------------------------
    | 8.6G-C
    |--------------------------------------------------------------------------
    */

    const current =
        calculateGridCurrentAnalytics({
            qualifiedSamples,

            start,

            end,

            config:
                effectiveConfig
                    .current,
        });


    /*
    |--------------------------------------------------------------------------
    | 8.6G-D
    |--------------------------------------------------------------------------
    */

    const frequency =
        calculateGridFrequencyAnalytics({
            qualifiedSamples,

            start,

            end,

            config:
                effectiveConfig
                    .frequency,
        });


    /*
    |--------------------------------------------------------------------------
    | 8.6G-E
    |--------------------------------------------------------------------------
    */

    const voltageUnbalance =
        calculateGridVoltageUnbalance({
            qualifiedSamples,

            config:
                effectiveConfig
                    .voltageUnbalance,
        });


    /*
    |--------------------------------------------------------------------------
    | 8.6G-F
    |--------------------------------------------------------------------------
    */

    const currentUnbalance =
        calculateGridCurrentUnbalance({
            qualifiedSamples,

            config:
                effectiveConfig
                    .currentUnbalance,
        });


    /*
    |--------------------------------------------------------------------------
    | Core family status
    |--------------------------------------------------------------------------
    */

    const familyStatus =
        resolveGridQualityFamilyStatus({
            voltage,
            current,
            frequency,
            voltageUnbalance,
            currentUnbalance,
        });


    /*
    |--------------------------------------------------------------------------
    | 8.6G-G
    |--------------------------------------------------------------------------
    */

    const thresholds =
        calculateGridQualityThresholdSummary({
            voltage,
            frequency,
            voltageUnbalance,
            currentUnbalance,

            thresholdProfile,
        });


    /*
    |--------------------------------------------------------------------------
    | Final unified result
    |--------------------------------------------------------------------------
    */

    return {
        family:
            "GRID_QUALITY",

        status:
            familyStatus
                .status,

        reason:
            familyStatus
                .reason,

        qualification,

        analytics: {
            voltage,

            current,

            frequency,

            voltageUnbalance,

            currentUnbalance,
        },

        thresholds,

        summary: {
            qualifiedSampleCount:
                qualification
                    .qualifiedSamples
                    .length,

            rejectedSampleCount:
                qualification
                    .rejectedSamples
                    .length,

            calculatedComponentCount:
                familyStatus
                    .calculatedCount,

            partialComponentCount:
                familyStatus
                    .partialCount,

            unavailableComponentCount:
                familyStatus
                    .unavailableCount,

            componentCount:
                familyStatus
                    .totalComponentCount,

            thresholdProfileApplied:
                thresholds
                    .enabled ===
                true,

            thresholdOutsideLimitsCount:
                thresholds
                    ?.metrics
                    ?.outsideLimitsCount ??
                null,
        },

        config:
            effectiveConfig,

        semantics:
            buildSemantics(),
    };
}


export default {
    GRID_QUALITY_ANALYTICS_STATUS,
    GRID_QUALITY_ANALYTICS_REASON,
    DEFAULT_GRID_QUALITY_ANALYTICS_CONFIG,

    resolveGridQualityFamilyStatus,
    buildGridQualityThresholdInputs,
    calculateGridQualityThresholdSummary,
    calculateGridQualityAnalytics,
};