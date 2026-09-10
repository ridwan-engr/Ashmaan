// services/engineering/gridCurrentUnbalanceService.js

import {
    GRID_QUALITY_QUANTITY,
    GRID_QUALITY_PHASE,
} from "./gridQualityTelemetryQualificationService.js";


export const GRID_CURRENT_UNBALANCE_STATUS = Object.freeze({
    CALCULATED: "CALCULATED",
    PARTIALLY_CALCULATED: "PARTIALLY_CALCULATED",
    UNAVAILABLE: "UNAVAILABLE",
});


export const GRID_CURRENT_UNBALANCE_REASON = Object.freeze({
    CURRENT_UNBALANCE_FOUNDATION_QUALIFIED:
        "CURRENT_UNBALANCE_FOUNDATION_QUALIFIED",

    CURRENT_UNBALANCE_FOUNDATION_PARTIAL:
        "CURRENT_UNBALANCE_FOUNDATION_PARTIAL",

    NO_GRID_QUALIFIED_CURRENT_SAMPLES:
        "NO_GRID_QUALIFIED_CURRENT_SAMPLES",

    INSUFFICIENT_THREE_PHASE_ALIGNMENT:
        "INSUFFICIENT_THREE_PHASE_ALIGNMENT",

    ZERO_PHASE_AVERAGE_MAGNITUDE:
        "ZERO_PHASE_AVERAGE_MAGNITUDE",

    INVALID_ALIGNMENT_TOLERANCE:
        "INVALID_ALIGNMENT_TOLERANCE",
});


export const DEFAULT_GRID_CURRENT_UNBALANCE_CONFIG = Object.freeze({
    alignmentToleranceSeconds: 60,
});


function asDate(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const date =
        value instanceof Date
            ? new Date(value.getTime())
            : new Date(value);

    return Number.isFinite(date.getTime())
        ? date
        : null;
}


function finiteNumber(value) {
    if (
        value === null ||
        value === undefined ||
        typeof value === "boolean" ||
        (typeof value === "string" && value.trim() === "")
    ) {
        return null;
    }

    const numeric =
        typeof value === "number"
            ? value
            : Number(value);

    return Number.isFinite(numeric)
        ? numeric
        : null;
}


/*
|--------------------------------------------------------------------------
| Normalize qualified current samples
|--------------------------------------------------------------------------
*/

export function normalizeCurrentUnbalanceSamples(samples = []) {
    return samples
        .map((sample) => {
            if (sample?.gridQualified !== true) {
                return null;
            }

            if (
                sample?.quantity !==
                GRID_QUALITY_QUANTITY.CURRENT
            ) {
                return null;
            }

            if (
                ![
                    GRID_QUALITY_PHASE.L1,
                    GRID_QUALITY_PHASE.L2,
                    GRID_QUALITY_PHASE.L3,
                ].includes(sample?.phase)
            ) {
                return null;
            }

            const timestamp =
                asDate(sample?.timestamp);

            const numericValue =
                finiteNumber(sample?.numericValue);

            if (!timestamp || numericValue === null) {
                return null;
            }

            return {
                ...sample,
                timestamp,
                numericValue,
            };
        })
        .filter(Boolean)
        .sort(
            (a, b) =>
                a.timestamp - b.timestamp
        );
}


/*
|--------------------------------------------------------------------------
| Duplicate handling
|--------------------------------------------------------------------------
*/

export function deduplicateCurrentUnbalanceSamples(samples = []) {
    const groups = new Map();

    for (const sample of samples) {
        const key = [
            sample.phase,
            sample.timestamp.toISOString(),
        ].join("|");

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key).push(sample);
    }

    const records = [];

    let duplicateCount = 0;
    let conflictingDuplicateCount = 0;

    for (const group of groups.values()) {
        if (group.length === 1) {
            records.push(group[0]);
            continue;
        }

        const values =
            new Set(
                group.map(
                    (sample) =>
                        sample.numericValue
                )
            );

        if (values.size === 1) {
            records.push(group[0]);

            duplicateCount +=
                group.length - 1;

            continue;
        }

        conflictingDuplicateCount +=
            group.length;
    }

    records.sort(
        (a, b) =>
            a.timestamp - b.timestamp
    );

    return {
        records,
        duplicateCount,
        conflictingDuplicateCount,
    };
}


function splitByPhase(samples) {
    return {
        L1: samples.filter(
            (sample) =>
                sample.phase ===
                GRID_QUALITY_PHASE.L1
        ),

        L2: samples.filter(
            (sample) =>
                sample.phase ===
                GRID_QUALITY_PHASE.L2
        ),

        L3: samples.filter(
            (sample) =>
                sample.phase ===
                GRID_QUALITY_PHASE.L3
        ),
    };
}


/*
|--------------------------------------------------------------------------
| Three-phase temporal alignment
|--------------------------------------------------------------------------
*/

export function alignCurrentPhaseSamples({
    samples = [],
    alignmentToleranceSeconds = 60,
} = {}) {
    const toleranceSeconds =
        Number(alignmentToleranceSeconds);

    if (
        !Number.isFinite(toleranceSeconds) ||
        toleranceSeconds < 0
    ) {
        return {
            valid: false,
            aligned: [],
            rejectedSampleCount: samples.length,
        };
    }

    const toleranceMs =
        toleranceSeconds * 1000;

    const phases =
        splitByPhase(samples);

    let i1 = 0;
    let i2 = 0;
    let i3 = 0;

    let rejectedSampleCount = 0;

    const aligned = [];

    while (
        i1 < phases.L1.length &&
        i2 < phases.L2.length &&
        i3 < phases.L3.length
    ) {
        const l1 = phases.L1[i1];
        const l2 = phases.L2[i2];
        const l3 = phases.L3[i3];

        const times = [
            l1.timestamp.getTime(),
            l2.timestamp.getTime(),
            l3.timestamp.getTime(),
        ];

        const minimumTime =
            Math.min(...times);

        const maximumTime =
            Math.max(...times);

        if (
            maximumTime - minimumTime <=
            toleranceMs
        ) {
            aligned.push({
                timestamp:
                    new Date(maximumTime),

                L1: l1,
                L2: l2,
                L3: l3,

                alignmentSpreadSeconds:
                    (maximumTime - minimumTime) /
                    1000,
            });

            i1 += 1;
            i2 += 1;
            i3 += 1;

            continue;
        }

        /*
        | Discard only the oldest unmatched observation.
        */

        if (
            l1.timestamp.getTime() ===
            minimumTime
        ) {
            i1 += 1;
        } else if (
            l2.timestamp.getTime() ===
            minimumTime
        ) {
            i2 += 1;
        } else {
            i3 += 1;
        }

        rejectedSampleCount += 1;
    }

    rejectedSampleCount +=
        (phases.L1.length - i1) +
        (phases.L2.length - i2) +
        (phases.L3.length - i3);

    return {
        valid: true,
        aligned,
        rejectedSampleCount,
    };
}


/*
|--------------------------------------------------------------------------
| Calculate one aligned current-unbalance point
|--------------------------------------------------------------------------
|
| Raw signed current is retained.
|
| Magnitudes are used only for the unbalance calculation because current
| direction/import-export semantics have not been established.
|--------------------------------------------------------------------------
*/

export function calculateCurrentUnbalancePoint(
    alignedPoint
) {
    if (!alignedPoint) {
        return null;
    }

    const rawL1 =
        finiteNumber(
            alignedPoint?.L1?.numericValue
        );

    const rawL2 =
        finiteNumber(
            alignedPoint?.L2?.numericValue
        );

    const rawL3 =
        finiteNumber(
            alignedPoint?.L3?.numericValue
        );

    if (
        rawL1 === null ||
        rawL2 === null ||
        rawL3 === null
    ) {
        return null;
    }

    const magnitudeL1 =
        Math.abs(rawL1);

    const magnitudeL2 =
        Math.abs(rawL2);

    const magnitudeL3 =
        Math.abs(rawL3);

    const averageMagnitude =
        (
            magnitudeL1 +
            magnitudeL2 +
            magnitudeL3
        ) /
        3;

    const deviationsMagnitude = {
        L1:
            Math.abs(
                magnitudeL1 -
                averageMagnitude
            ),

        L2:
            Math.abs(
                magnitudeL2 -
                averageMagnitude
            ),

        L3:
            Math.abs(
                magnitudeL3 -
                averageMagnitude
            ),
    };

    const maxDeviationMagnitude =
        Math.max(
            deviationsMagnitude.L1,
            deviationsMagnitude.L2,
            deviationsMagnitude.L3
        );

    const unbalancePercent =
        averageMagnitude !== 0
            ? (
                maxDeviationMagnitude /
                averageMagnitude
            ) * 100
            : null;

    return {
        timestamp:
            alignedPoint.timestamp,

        rawSignedCurrent: {
            L1: rawL1,
            L2: rawL2,
            L3: rawL3,
        },

        currentMagnitude: {
            L1: magnitudeL1,
            L2: magnitudeL2,
            L3: magnitudeL3,
        },

        averageMagnitude,

        deviationsMagnitude,

        maxDeviationMagnitude,

        unbalancePercent,

        percentageAvailable:
            unbalancePercent !== null,

        alignmentSpreadSeconds:
            alignedPoint
                .alignmentSpreadSeconds,
    };
}


function calculateUnbalanceStatistics(points) {
    const available =
        points.filter(
            (point) =>
                Number.isFinite(
                    point.unbalancePercent
                )
        );

    if (available.length === 0) {
        return {
            sampleCount: 0,
            minimumPercent: null,
            maximumPercent: null,
            meanPercent: null,
            rmsPercent: null,
            firstTimestamp: null,
            lastTimestamp: null,
        };
    }

    const values =
        available.map(
            (point) =>
                point.unbalancePercent
        );

    const minimumPercent =
        Math.min(...values);

    const maximumPercent =
        Math.max(...values);

    const meanPercent =
        values.reduce(
            (total, value) =>
                total + value,
            0
        ) /
        values.length;

    const rmsPercent =
        Math.sqrt(
            values.reduce(
                (total, value) =>
                    total +
                    value * value,
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
            available[0].timestamp,

        lastTimestamp:
            available[
                available.length - 1
            ].timestamp,
    };
}


function buildSemantics() {
    return {
        gridQualifiedCurrentRequired:
            true,

        simultaneousThreePhaseEvidenceRequired:
            true,

        missingPhaseAssumedZero:
            false,

        crossPhaseTemporalAlignmentRequired:
            true,

        signedCurrentPreserved:
            true,

        magnitudeUsedForUnbalanceCalculation:
            true,

        negativeCurrentMeansExport:
            false,

        currentDirectionEstablished:
            false,

        currentMagnitudeDeviationMetricCalculated:
            true,

        percentageMetricDimensionless:
            true,

        currentUnitRequiredForPercentageRatio:
            false,

        currentUnitInferredFromMagnitude:
            false,

        phaseAngleAvailable:
            false,

        symmetricalComponentsCalculated:
            false,

        negativeSequenceCurrentCalculated:
            false,

        positiveSequenceCurrentCalculated:
            false,

        standardsCurrentUnbalanceFactorCalculated:
            false,

        ratedCurrentEstablished:
            false,

        loadingPercentageEstablished:
            false,

        acceptableUnbalanceThresholdEstablished:
            false,

        qualityClassificationEstablished:
            false,

        zeroAverageMagnitudeProducesZeroUnbalance:
            false,

        zeroAverageMagnitudePercentageUndefined:
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

export function calculateGridCurrentUnbalance({
    qualifiedSamples = [],
    config = {},
} = {}) {
    const resolvedConfig = {
        ...DEFAULT_GRID_CURRENT_UNBALANCE_CONFIG,
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
                "GRID_CURRENT_UNBALANCE",

            status:
                GRID_CURRENT_UNBALANCE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_CURRENT_UNBALANCE_REASON
                    .INVALID_ALIGNMENT_TOLERANCE,

            points: [],

            semantics:
                buildSemantics(),
        };
    }

    const normalized =
        normalizeCurrentUnbalanceSamples(
            qualifiedSamples
        );

    if (normalized.length === 0) {
        return {
            family:
                "GRID_CURRENT_UNBALANCE",

            status:
                GRID_CURRENT_UNBALANCE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_CURRENT_UNBALANCE_REASON
                    .NO_GRID_QUALIFIED_CURRENT_SAMPLES,

            points: [],

            semantics:
                buildSemantics(),
        };
    }

    const deduplicated =
        deduplicateCurrentUnbalanceSamples(
            normalized
        );

    const alignment =
        alignCurrentPhaseSamples({
            samples:
                deduplicated.records,

            alignmentToleranceSeconds,
        });

    if (
        alignment.aligned.length === 0
    ) {
        return {
            family:
                "GRID_CURRENT_UNBALANCE",

            status:
                GRID_CURRENT_UNBALANCE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_CURRENT_UNBALANCE_REASON
                    .INSUFFICIENT_THREE_PHASE_ALIGNMENT,

            points: [],

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
        alignment.aligned
            .map(
                calculateCurrentUnbalancePoint
            )
            .filter(Boolean);

    const percentagePoints =
        points.filter(
            (point) =>
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
                "GRID_CURRENT_UNBALANCE",

            status:
                GRID_CURRENT_UNBALANCE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_CURRENT_UNBALANCE_REASON
                    .ZERO_PHASE_AVERAGE_MAGNITUDE,

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
            "GRID_CURRENT_UNBALANCE",

        status:
            allAlignedPointsHavePercentage
                ? GRID_CURRENT_UNBALANCE_STATUS
                    .CALCULATED
                : GRID_CURRENT_UNBALANCE_STATUS
                    .PARTIALLY_CALCULATED,

        reason:
            allAlignedPointsHavePercentage
                ? GRID_CURRENT_UNBALANCE_REASON
                    .CURRENT_UNBALANCE_FOUNDATION_QUALIFIED
                : GRID_CURRENT_UNBALANCE_REASON
                    .CURRENT_UNBALANCE_FOUNDATION_PARTIAL,

        points,

        statistics,

        metrics: {
            alignedTripletCount:
                points.length,

            percentagePointCount:
                percentagePoints.length,

            percentageAvailabilityPercent:
                (
                    percentagePoints.length /
                    points.length
                ) * 100,
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
    GRID_CURRENT_UNBALANCE_STATUS,
    GRID_CURRENT_UNBALANCE_REASON,
    DEFAULT_GRID_CURRENT_UNBALANCE_CONFIG,
    normalizeCurrentUnbalanceSamples,
    deduplicateCurrentUnbalanceSamples,
    alignCurrentPhaseSamples,
    calculateCurrentUnbalancePoint,
    calculateGridCurrentUnbalance,
};