// services/engineering/gridVoltageUnbalanceService.js

import {
    GRID_QUALITY_QUANTITY,
    GRID_QUALITY_PHASE,
} from "./gridQualityTelemetryQualificationService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6G-E
| Voltage-Unbalance Foundation
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Build a magnitude-based three-phase voltage-unbalance foundation from
| GRID-qualified L1/L2/L3 voltage samples.
|
| Metric:
|
|     Vavg = (V1 + V2 + V3) / 3
|
|     maxDeviation =
|         max(
|             abs(V1 - Vavg),
|             abs(V2 - Vavg),
|             abs(V3 - Vavg)
|         )
|
|     unbalancePercent =
|         maxDeviation / abs(Vavg) * 100
|
| IMPORTANT
|
| This is a phase-voltage magnitude deviation metric.
|
| It is NOT:
|
| - IEC negative-sequence VUF = |V2| / |V1|
| - symmetrical-component analysis
| - a power-quality compliance decision
| - an undervoltage/overvoltage classification
|
| Phase-angle / phasor evidence is not available in the established
| Phase 8.6 telemetry contract.
|--------------------------------------------------------------------------
*/


export const GRID_VOLTAGE_UNBALANCE_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GRID_VOLTAGE_UNBALANCE_REASON =
    Object.freeze({
        VOLTAGE_UNBALANCE_FOUNDATION_QUALIFIED:
            "VOLTAGE_UNBALANCE_FOUNDATION_QUALIFIED",

        VOLTAGE_UNBALANCE_FOUNDATION_PARTIAL:
            "VOLTAGE_UNBALANCE_FOUNDATION_PARTIAL",

        NO_GRID_QUALIFIED_VOLTAGE_SAMPLES:
            "NO_GRID_QUALIFIED_VOLTAGE_SAMPLES",

        INSUFFICIENT_THREE_PHASE_ALIGNMENT:
            "INSUFFICIENT_THREE_PHASE_ALIGNMENT",

        ZERO_PHASE_AVERAGE:
            "ZERO_PHASE_AVERAGE",

        INVALID_ALIGNMENT_TOLERANCE:
            "INVALID_ALIGNMENT_TOLERANCE",
    });


export const DEFAULT_GRID_VOLTAGE_UNBALANCE_CONFIG =
    Object.freeze({
        alignmentToleranceSeconds:
            60,
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


function finiteNumber(
    value
) {

    if (
        value === null ||
        value === undefined ||
        typeof value === "boolean" ||
        (
            typeof value === "string" &&
            value.trim() === ""
        )
    ) {

        return null;
    }


    const numeric =
        typeof value === "number"
            ? value
            : Number(
                value
            );


    return Number.isFinite(
        numeric
    )
        ? numeric
        : null;
}


/*
|--------------------------------------------------------------------------
| Qualified voltage normalization
|--------------------------------------------------------------------------
*/

export function normalizeVoltageUnbalanceSamples(
    samples = []
) {

    return samples
        .map(
            (
                sample
            ) => {

                if (
                    sample?.gridQualified !== true
                ) {

                    return null;
                }


                if (
                    sample?.quantity !==
                    GRID_QUALITY_QUANTITY
                        .VOLTAGE
                ) {

                    return null;
                }


                if (
                    ![
                        GRID_QUALITY_PHASE.L1,
                        GRID_QUALITY_PHASE.L2,
                        GRID_QUALITY_PHASE.L3,
                    ].includes(
                        sample?.phase
                    )
                ) {

                    return null;
                }


                const timestamp =
                    asDate(
                        sample?.timestamp
                    );


                const numericValue =
                    finiteNumber(
                        sample?.numericValue
                    );


                if (
                    !timestamp ||
                    numericValue === null
                ) {

                    return null;
                }


                return {
                    ...sample,

                    timestamp,

                    numericValue,
                };
            }
        )
        .filter(
            Boolean
        )
        .sort(
            (
                a,
                b
            ) =>
                a.timestamp -
                b.timestamp
        );
}


/*
|--------------------------------------------------------------------------
| Same-phase duplicate handling
|--------------------------------------------------------------------------
|
| Identical timestamp/value duplicates are collapsed.
|
| Conflicting same-phase / same-timestamp values are removed rather than
| arbitrarily selecting one.
|--------------------------------------------------------------------------
*/

export function deduplicateVoltageUnbalanceSamples(
    samples = []
) {

    const groups =
        new Map();


    for (
        const sample
        of samples
    ) {

        const key =
            [
                sample.phase,
                sample.timestamp.toISOString(),
            ].join(
                "|"
            );


        if (
            !groups.has(
                key
            )
        ) {

            groups.set(
                key,
                []
            );
        }


        groups
            .get(
                key
            )
            .push(
                sample
            );
    }


    const records =
        [];


    let duplicateCount =
        0;


    let conflictingDuplicateCount =
        0;


    for (
        const group
        of groups.values()
    ) {

        if (
            group.length === 1
        ) {

            records.push(
                group[0]
            );

            continue;
        }


        const values =
            new Set(
                group.map(
                    (
                        sample
                    ) =>
                        sample.numericValue
                )
            );


        if (
            values.size === 1
        ) {

            records.push(
                group[0]
            );


            duplicateCount +=
                group.length -
                1;


            continue;
        }


        conflictingDuplicateCount +=
            group.length;
    }


    records.sort(
        (
            a,
            b
        ) =>
            a.timestamp -
                b.timestamp
    );


    return {
        records,

        duplicateCount,

        conflictingDuplicateCount,
    };
}


/*
|--------------------------------------------------------------------------
| Phase grouping
|--------------------------------------------------------------------------
*/

function splitByPhase(
    samples
) {

    return {
        L1:
            samples.filter(
                (
                    sample
                ) =>
                    sample.phase ===
                    GRID_QUALITY_PHASE.L1
            ),

        L2:
            samples.filter(
                (
                    sample
                ) =>
                    sample.phase ===
                    GRID_QUALITY_PHASE.L2
            ),

        L3:
            samples.filter(
                (
                    sample
                ) =>
                    sample.phase ===
                    GRID_QUALITY_PHASE.L3
            ),
    };
}


/*
|--------------------------------------------------------------------------
| Three-phase temporal alignment
|--------------------------------------------------------------------------
|
| Queue-style alignment:
|
| - one observation from each phase
| - latest timestamp minus earliest timestamp must be <= tolerance
| - matched observations are consumed once
| - no phase is zero-filled
| - no cross-window extrapolation
|--------------------------------------------------------------------------
*/

export function alignVoltagePhaseSamples({
    samples = [],
    alignmentToleranceSeconds = 60,
} = {}) {

    const toleranceSeconds =
        Number(
            alignmentToleranceSeconds
        );


    if (
        !Number.isFinite(
            toleranceSeconds
        ) ||
        toleranceSeconds < 0
    ) {

        return {
            valid:
                false,

            aligned:
                [],

            rejectedSampleCount:
                samples.length,
        };
    }


    const toleranceMs =
        toleranceSeconds *
        1000;


    const phases =
        splitByPhase(
            samples
        );


    let i1 =
        0;

    let i2 =
        0;

    let i3 =
        0;


    const aligned =
        [];


    let rejectedSampleCount =
        0;


    while (
        i1 < phases.L1.length &&
        i2 < phases.L2.length &&
        i3 < phases.L3.length
    ) {

        const l1 =
            phases.L1[i1];

        const l2 =
            phases.L2[i2];

        const l3 =
            phases.L3[i3];


        const times =
            [
                l1.timestamp.getTime(),
                l2.timestamp.getTime(),
                l3.timestamp.getTime(),
            ];


        const minimumTime =
            Math.min(
                ...times
            );


        const maximumTime =
            Math.max(
                ...times
            );


        if (
            maximumTime -
                minimumTime <=
            toleranceMs
        ) {

            aligned.push({
                timestamp:
                    new Date(
                        maximumTime
                    ),

                L1:
                    l1,

                L2:
                    l2,

                L3:
                    l3,

                alignmentSpreadSeconds:
                    (
                        maximumTime -
                        minimumTime
                    ) /
                    1000,
            });


            i1 += 1;
            i2 += 1;
            i3 += 1;

            continue;
        }


        /*
        | Advance only the oldest phase sample.
        */

        if (
            l1.timestamp.getTime() ===
            minimumTime
        ) {

            i1 += 1;
        }

        else if (
            l2.timestamp.getTime() ===
            minimumTime
        ) {

            i2 += 1;
        }

        else {

            i3 += 1;
        }


        rejectedSampleCount +=
            1;
    }


    rejectedSampleCount +=
        (
            phases.L1.length -
            i1
        ) +
        (
            phases.L2.length -
            i2
        ) +
        (
            phases.L3.length -
            i3
        );


    return {
        valid:
            true,

        aligned,

        rejectedSampleCount,
    };
}


/*
|--------------------------------------------------------------------------
| Single aligned triplet
|--------------------------------------------------------------------------
*/

export function calculateVoltageUnbalancePoint(
    alignedPoint
) {

    if (
        !alignedPoint
    ) {

        return null;
    }


    const l1 =
        finiteNumber(
            alignedPoint
                ?.L1
                ?.numericValue
        );


    const l2 =
        finiteNumber(
            alignedPoint
                ?.L2
                ?.numericValue
        );


    const l3 =
        finiteNumber(
            alignedPoint
                ?.L3
                ?.numericValue
        );


    if (
        l1 === null ||
        l2 === null ||
        l3 === null
    ) {

        return null;
    }


    const averageRawVoltage =
        (
            l1 +
            l2 +
            l3
        ) /
        3;


    const deviations =
        {
            L1:
                Math.abs(
                    l1 -
                    averageRawVoltage
                ),

            L2:
                Math.abs(
                    l2 -
                    averageRawVoltage
                ),

            L3:
                Math.abs(
                    l3 -
                    averageRawVoltage
                ),
        };


    const maxDeviationRaw =
        Math.max(
            deviations.L1,
            deviations.L2,
            deviations.L3
        );


    /*
    |--------------------------------------------------------------------------
    | Zero-average protection
    |--------------------------------------------------------------------------
    |
    | Percentage unbalance is mathematically undefined when the denominator
    | is zero.
    |--------------------------------------------------------------------------
    */

    const unbalancePercent =
        averageRawVoltage !== 0
            ? (
                maxDeviationRaw /
                Math.abs(
                    averageRawVoltage
                )
            ) *
                100
            : null;


    return {
        timestamp:
            alignedPoint
                .timestamp,

        phases: {
            L1:
                l1,

            L2:
                l2,

            L3:
                l3,
        },

        averageRawVoltage,

        deviationsRaw:
            deviations,

        maxDeviationRaw,

        unbalancePercent,

        percentageAvailable:
            unbalancePercent !==
            null,

        alignmentSpreadSeconds:
            alignedPoint
                .alignmentSpreadSeconds,
    };
}


/*
|--------------------------------------------------------------------------
| Aggregate statistics
|--------------------------------------------------------------------------
*/

function calculateUnbalanceStatistics(
    points
) {

    const available =
        points.filter(
            (
                point
            ) =>
                Number.isFinite(
                    point
                        .unbalancePercent
                )
        );


    if (
        available.length === 0
    ) {

        return {
            sampleCount:
                0,

            minimumPercent:
                null,

            maximumPercent:
                null,

            meanPercent:
                null,

            rmsPercent:
                null,

            firstTimestamp:
                null,

            lastTimestamp:
                null,
        };
    }


    const values =
        available.map(
            (
                point
            ) =>
                point
                    .unbalancePercent
        );


    const minimumPercent =
        Math.min(
            ...values
        );


    const maximumPercent =
        Math.max(
            ...values
        );


    const meanPercent =
        values.reduce(
            (
                total,
                value
            ) =>
                total +
                value,
            0
        ) /
        values.length;


    const rmsPercent =
        Math.sqrt(
            values.reduce(
                (
                    total,
                    value
                ) =>
                    total +
                    value *
                    value,
                0
            ) /
            values.length
        );


    return {
        sampleCount:
            values.length,

        minimumPercent,

        maximumPercent,

        meanPercent,

        rmsPercent,

        firstTimestamp:
            available[0]
                .timestamp,

        lastTimestamp:
            available[
                available.length -
                1
            ]
                .timestamp,
    };
}


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

function buildSemantics() {

    return {
        gridQualifiedVoltageRequired:
            true,

        simultaneousThreePhaseEvidenceRequired:
            true,

        missingPhaseAssumedZero:
            false,

        crossPhaseTemporalAlignmentRequired:
            true,

        voltageMagnitudeDeviationMetricCalculated:
            true,

        percentageMetricDimensionless:
            true,

        voltageUnitRequiredForPercentageRatio:
            false,

        voltageUnitInferredFromMagnitude:
            false,

        phaseAngleAvailable:
            false,

        symmetricalComponentsCalculated:
            false,

        negativeSequenceVoltageCalculated:
            false,

        positiveSequenceVoltageCalculated:
            false,

        iecVoltageUnbalanceFactorCalculated:
            false,

        standardsComplianceEstablished:
            false,

        acceptableUnbalanceThresholdEstablished:
            false,

        qualityClassificationEstablished:
            false,

        nominalVoltageEstablished:
            false,

        zeroAverageProducesZeroUnbalance:
            false,

        zeroAveragePercentageUndefined:
            true,

        outageEstablished:
            false,

        gridAvailabilityEstablished:
            false,

        serviceInterruptionEstablished:
            false,
    };
}


/*
|--------------------------------------------------------------------------
| Public service
|--------------------------------------------------------------------------
*/

export function calculateGridVoltageUnbalance({
    qualifiedSamples = [],
    config = {},
} = {}) {

    const resolvedConfig =
        {
            ...DEFAULT_GRID_VOLTAGE_UNBALANCE_CONFIG,
            ...config,
        };


    const alignmentToleranceSeconds =
        Number(
            resolvedConfig
                .alignmentToleranceSeconds
        );


    if (
        !Number.isFinite(
            alignmentToleranceSeconds
        ) ||
        alignmentToleranceSeconds < 0
    ) {

        return {
            family:
                "GRID_VOLTAGE_UNBALANCE",

            status:
                GRID_VOLTAGE_UNBALANCE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_VOLTAGE_UNBALANCE_REASON
                    .INVALID_ALIGNMENT_TOLERANCE,

            points:
                [],

            semantics:
                buildSemantics(),
        };
    }


    const normalized =
        normalizeVoltageUnbalanceSamples(
            qualifiedSamples
        );


    if (
        normalized.length === 0
    ) {

        return {
            family:
                "GRID_VOLTAGE_UNBALANCE",

            status:
                GRID_VOLTAGE_UNBALANCE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_VOLTAGE_UNBALANCE_REASON
                    .NO_GRID_QUALIFIED_VOLTAGE_SAMPLES,

            points:
                [],

            semantics:
                buildSemantics(),
        };
    }


    const deduplicated =
        deduplicateVoltageUnbalanceSamples(
            normalized
        );


    const alignment =
        alignVoltagePhaseSamples({
            samples:
                deduplicated
                    .records,

            alignmentToleranceSeconds,
        });


    if (
        alignment.aligned.length === 0
    ) {

        return {
            family:
                "GRID_VOLTAGE_UNBALANCE",

            status:
                GRID_VOLTAGE_UNBALANCE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_VOLTAGE_UNBALANCE_REASON
                    .INSUFFICIENT_THREE_PHASE_ALIGNMENT,

            points:
                [],

            evidence: {
                inputSampleCount:
                    qualifiedSamples.length,

                normalizedSampleCount:
                    normalized.length,

                deduplicatedSampleCount:
                    deduplicated
                        .records
                        .length,

                alignedTripletCount:
                    0,

                rejectedAlignmentSampleCount:
                    alignment
                        .rejectedSampleCount,

                duplicateCount:
                    deduplicated
                        .duplicateCount,

                conflictingDuplicateCount:
                    deduplicated
                        .conflictingDuplicateCount,

                alignmentToleranceSeconds,
            },

            semantics:
                buildSemantics(),
        };
    }


    const points =
        alignment
            .aligned
            .map(
                calculateVoltageUnbalancePoint
            )
            .filter(
                Boolean
            );


    const percentagePoints =
        points.filter(
            (
                point
            ) =>
                point
                    .percentageAvailable ===
                true
        );


    const statistics =
        calculateUnbalanceStatistics(
            points
        );


    if (
        percentagePoints.length === 0
    ) {

        return {
            family:
                "GRID_VOLTAGE_UNBALANCE",

            status:
                GRID_VOLTAGE_UNBALANCE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_VOLTAGE_UNBALANCE_REASON
                    .ZERO_PHASE_AVERAGE,

            points,

            statistics,

            evidence: {
                inputSampleCount:
                    qualifiedSamples.length,

                normalizedSampleCount:
                    normalized.length,

                alignedTripletCount:
                    points.length,

                percentagePointCount:
                    0,

                alignmentToleranceSeconds,
            },

            semantics:
                buildSemantics(),
        };
    }


    const allAlignedPointsHavePercentage =
        percentagePoints.length ===
        points.length;


    return {
        family:
            "GRID_VOLTAGE_UNBALANCE",

        status:
            allAlignedPointsHavePercentage
                ? GRID_VOLTAGE_UNBALANCE_STATUS
                    .CALCULATED
                : GRID_VOLTAGE_UNBALANCE_STATUS
                    .PARTIALLY_CALCULATED,

        reason:
            allAlignedPointsHavePercentage
                ? GRID_VOLTAGE_UNBALANCE_REASON
                    .VOLTAGE_UNBALANCE_FOUNDATION_QUALIFIED
                : GRID_VOLTAGE_UNBALANCE_REASON
                    .VOLTAGE_UNBALANCE_FOUNDATION_PARTIAL,

        points,

        statistics,

        metrics: {
            alignedTripletCount:
                points.length,

            percentagePointCount:
                percentagePoints
                    .length,

            percentageAvailabilityPercent:
                (
                    percentagePoints.length /
                    points.length
                ) *
                100,
        },

        evidence: {
            inputSampleCount:
                qualifiedSamples.length,

            normalizedSampleCount:
                normalized.length,

            deduplicatedSampleCount:
                deduplicated
                    .records
                    .length,

            rejectedAlignmentSampleCount:
                alignment
                    .rejectedSampleCount,

            duplicateCount:
                deduplicated
                    .duplicateCount,

            conflictingDuplicateCount:
                deduplicated
                    .conflictingDuplicateCount,

            alignmentToleranceSeconds,
        },

        semantics:
            buildSemantics(),
    };
}


export default {
    GRID_VOLTAGE_UNBALANCE_STATUS,
    GRID_VOLTAGE_UNBALANCE_REASON,
    DEFAULT_GRID_VOLTAGE_UNBALANCE_CONFIG,
    normalizeVoltageUnbalanceSamples,
    deduplicateVoltageUnbalanceSamples,
    alignVoltagePhaseSamples,
    calculateVoltageUnbalancePoint,
    calculateGridVoltageUnbalance,
};