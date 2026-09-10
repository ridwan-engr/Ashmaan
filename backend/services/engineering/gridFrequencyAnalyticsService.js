// services/engineering/gridFrequencyAnalyticsService.js

import {
    GRID_QUALITY_QUANTITY,
    GRID_QUALITY_PHASE,
} from "./gridQualityTelemetryQualificationService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6G-D
| Grid Frequency Analytics
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Calculate descriptive per-phase frequency analytics from samples already
| qualified by Phase 8.6G-A as GRID-associated frequency evidence.
|
| This phase DOES NOT:
|
| - assume nominal frequency
| - apply frequency thresholds
| - classify under-frequency / over-frequency
| - calculate frequency compliance
| - infer outage from zero frequency
| - infer grid availability
| - infer service interruption
| - infer Hz from magnitude
|--------------------------------------------------------------------------
*/


export const GRID_FREQUENCY_ANALYTICS_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GRID_FREQUENCY_ANALYTICS_REASON =
    Object.freeze({
        FREQUENCY_ANALYTICS_QUALIFIED:
            "FREQUENCY_ANALYTICS_QUALIFIED",

        FREQUENCY_ANALYTICS_PARTIAL:
            "FREQUENCY_ANALYTICS_PARTIAL",

        NO_GRID_QUALIFIED_FREQUENCY_SAMPLES:
            "NO_GRID_QUALIFIED_FREQUENCY_SAMPLES",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",
    });


export const DEFAULT_GRID_FREQUENCY_ANALYTICS_CONFIG =
    Object.freeze({
        maxGapMinutes:
            30,
    });


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


function clampPercent(
    value
) {

    if (
        !Number.isFinite(
            value
        )
    ) {

        return 0;
    }


    return Math.max(
        0,
        Math.min(
            100,
            value
        )
    );
}


/*
|--------------------------------------------------------------------------
| Normalize qualified GRID frequency samples
|--------------------------------------------------------------------------
*/

export function normalizeQualifiedGridFrequencySamples(
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
                        .FREQUENCY
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
| Reporting window
|--------------------------------------------------------------------------
*/

export function resolveGridFrequencyReportingWindow({
    samples = [],
    start = null,
    end = null,
} = {}) {

    const explicitStart =
        start !== null &&
        start !== undefined;


    const explicitEnd =
        end !== null &&
        end !== undefined;


    if (
        explicitStart !== explicitEnd
    ) {

        return {
            valid:
                false,

            explicit:
                true,

            start:
                null,

            end:
                null,

            reportingHours:
                0,
        };
    }


    if (
        explicitStart &&
        explicitEnd
    ) {

        const startDate =
            asDate(
                start
            );


        const endDate =
            asDate(
                end
            );


        if (
            !startDate ||
            !endDate ||
            startDate >= endDate
        ) {

            return {
                valid:
                    false,

                explicit:
                    true,

                start:
                    startDate,

                end:
                    endDate,

                reportingHours:
                    0,
            };
        }


        return {
            valid:
                true,

            explicit:
                true,

            start:
                startDate,

            end:
                endDate,

            reportingHours:
                (
                    endDate -
                    startDate
                ) /
                3_600_000,
        };
    }


    if (
        samples.length === 0
    ) {

        return {
            valid:
                true,

            explicit:
                false,

            start:
                null,

            end:
                null,

            reportingHours:
                0,
        };
    }


    const inferredStart =
        samples[0]
            .timestamp;


    const inferredEnd =
        samples[
            samples.length -
            1
        ]
            .timestamp;


    return {
        valid:
            true,

        explicit:
            false,

        start:
            inferredStart,

        end:
            inferredEnd,

        reportingHours:
            (
                inferredEnd -
                inferredStart
            ) /
            3_600_000,
    };
}


/*
|--------------------------------------------------------------------------
| Descriptive statistics
|--------------------------------------------------------------------------
*/

function calculateStatistics(
    samples
) {

    if (
        samples.length === 0
    ) {

        return {
            sampleCount:
                0,

            minimum:
                null,

            maximum:
                null,

            mean:
                null,

            rms:
                null,

            standardDeviation:
                null,

            firstTimestamp:
                null,

            lastTimestamp:
                null,
        };
    }


    const values =
        samples.map(
            (
                sample
            ) =>
                sample.numericValue
        );


    const minimum =
        Math.min(
            ...values
        );


    const maximum =
        Math.max(
            ...values
        );


    const mean =
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


    const meanSquare =
        values.reduce(
            (
                total,
                value
            ) =>
                total +
                (
                    value *
                    value
                ),
            0
        ) /
        values.length;


    const rms =
        Math.sqrt(
            meanSquare
        );


    const variance =
        values.reduce(
            (
                total,
                value
            ) =>
                total +
                (
                    (
                        value -
                        mean
                    ) ** 2
                ),
            0
        ) /
        values.length;


    const standardDeviation =
        Math.sqrt(
            variance
        );


    return {
        sampleCount:
            values.length,

        minimum,

        maximum,

        mean,

        rms,

        standardDeviation,

        firstTimestamp:
            samples[0]
                .timestamp,

        lastTimestamp:
            samples[
                samples.length -
                1
            ]
                .timestamp,
    };
}


/*
|--------------------------------------------------------------------------
| Temporal coverage
|--------------------------------------------------------------------------
*/

function calculatePhaseCoverage({
    samples,
    reportingWindow,
    maxGapMinutes,
}) {

    if (
        samples.length < 2
    ) {

        return {
            observedHours:
                0,

            reportingHours:
                reportingWindow
                    .reportingHours,

            coveragePercent:
                0,

            acceptedIntervalCount:
                0,

            rejectedGapCount:
                0,
        };
    }


    const maxGapMs =
        maxGapMinutes *
        60_000;


    let observedHours =
        0;


    let acceptedIntervalCount =
        0;


    let rejectedGapCount =
        0;


    for (
        let index = 0;
        index <
            samples.length -
            1;
        index += 1
    ) {

        const first =
            samples[index];


        const second =
            samples[
                index +
                1
            ];


        if (
            reportingWindow.explicit &&
            (
                first.timestamp <
                    reportingWindow.start ||
                second.timestamp >
                    reportingWindow.end
            )
        ) {

            continue;
        }


        const deltaMs =
            second.timestamp -
            first.timestamp;


        if (
            deltaMs <= 0
        ) {

            continue;
        }


        if (
            deltaMs >
            maxGapMs
        ) {

            rejectedGapCount += 1;

            continue;
        }


        observedHours +=
            deltaMs /
            3_600_000;


        acceptedIntervalCount += 1;
    }


    const reportingHours =
        reportingWindow
            .reportingHours;


    const coveragePercent =
        reportingHours > 0
            ? clampPercent(
                (
                    observedHours /
                    reportingHours
                ) *
                100
            )
            : 0;


    return {
        observedHours,

        reportingHours,

        coveragePercent,

        acceptedIntervalCount,

        rejectedGapCount,
    };
}


/*
|--------------------------------------------------------------------------
| Per-phase analytics
|--------------------------------------------------------------------------
*/

function calculatePhaseAnalytics({
    samples,
    phase,
    reportingWindow,
    maxGapMinutes,
}) {

    const phaseSamples =
        samples.filter(
            (
                sample
            ) =>
                sample.phase ===
                phase
        );


    return {
        phase,

        statistics:
            calculateStatistics(
                phaseSamples
            ),

        coverage:
            calculatePhaseCoverage({
                samples:
                    phaseSamples,

                reportingWindow,

                maxGapMinutes,
            }),

        samples:
            phaseSamples,
    };
}


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

function buildSemantics() {

    return {
        gridQualifiedInputRequired:
            true,

        onlyFrequencyQuantityAccepted:
            true,

        nominalFrequencyEstablished:
            false,

        acceptableFrequencyRangeEstablished:
            false,

        frequencyDeviationCalculated:
            false,

        underFrequencyEstablished:
            false,

        overFrequencyEstablished:
            false,

        frequencyComplianceCalculated:
            false,

        rmsIsSampleRms:
            true,

        waveformFrequencyQualityEstablished:
            false,

        phaseFrequencyDifferenceCalculated:
            false,

        missingPhaseAssumedZero:
            false,

        missingTelemetryBridged:
            false,

        longGapBridged:
            false,

        zeroFrequencyPreserved:
            true,

        zeroFrequencyMeansOutage:
            false,

        outageEstablished:
            false,

        gridAvailabilityEstablished:
            false,

        serviceInterruptionEstablished:
            false,

        unitInferredFromMagnitude:
            false,
    };
}


/*
|--------------------------------------------------------------------------
| Public service
|--------------------------------------------------------------------------
*/

export function calculateGridFrequencyAnalytics({
    qualifiedSamples = [],
    start = null,
    end = null,
    config = {},
} = {}) {

    const resolvedConfig =
        {
            ...DEFAULT_GRID_FREQUENCY_ANALYTICS_CONFIG,
            ...config,
        };


    const maxGapMinutes =
        Number(
            resolvedConfig
                .maxGapMinutes
        );


    if (
        !Number.isFinite(
            maxGapMinutes
        ) ||
        maxGapMinutes <= 0
    ) {

        throw new Error(
            "maxGapMinutes must be a finite number > 0."
        );
    }


    const samples =
        normalizeQualifiedGridFrequencySamples(
            qualifiedSamples
        );


    if (
        samples.length === 0
    ) {

        return {
            family:
                "GRID_FREQUENCY_ANALYTICS",

            status:
                GRID_FREQUENCY_ANALYTICS_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_FREQUENCY_ANALYTICS_REASON
                    .NO_GRID_QUALIFIED_FREQUENCY_SAMPLES,

            phases: {
                L1:
                    null,

                L2:
                    null,

                L3:
                    null,
            },

            semantics:
                buildSemantics(),
        };
    }


    const reportingWindow =
        resolveGridFrequencyReportingWindow({
            samples,
            start,
            end,
        });


    if (
        reportingWindow.valid !== true
    ) {

        return {
            family:
                "GRID_FREQUENCY_ANALYTICS",

            status:
                GRID_FREQUENCY_ANALYTICS_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_FREQUENCY_ANALYTICS_REASON
                    .INVALID_REPORTING_WINDOW,

            phases: {
                L1:
                    null,

                L2:
                    null,

                L3:
                    null,
            },

            semantics:
                buildSemantics(),
        };
    }


    const phaseAnalytics =
        {
            L1:
                calculatePhaseAnalytics({
                    samples,

                    phase:
                        GRID_QUALITY_PHASE
                            .L1,

                    reportingWindow,

                    maxGapMinutes,
                }),

            L2:
                calculatePhaseAnalytics({
                    samples,

                    phase:
                        GRID_QUALITY_PHASE
                            .L2,

                    reportingWindow,

                    maxGapMinutes,
                }),

            L3:
                calculatePhaseAnalytics({
                    samples,

                    phase:
                        GRID_QUALITY_PHASE
                            .L3,

                    reportingWindow,

                    maxGapMinutes,
                }),
        };


    const availablePhaseCount =
        Object.values(
            phaseAnalytics
        )
            .filter(
                (
                    phase
                ) =>
                    phase
                        .statistics
                        .sampleCount >
                    0
            )
            .length;


    const completePhasePopulation =
        availablePhaseCount ===
        3;


    const allPhaseCoverageComplete =
        completePhasePopulation &&
        Object.values(
            phaseAnalytics
        )
            .every(
                (
                    phase
                ) =>
                    phase
                        .coverage
                        .reportingHours >
                        0 &&
                    Math.abs(
                        phase
                            .coverage
                            .coveragePercent -
                        100
                    ) <
                        1e-9
            );


    const fullyCalculated =
        completePhasePopulation &&
        allPhaseCoverageComplete;


    return {
        family:
            "GRID_FREQUENCY_ANALYTICS",

        status:
            fullyCalculated
                ? GRID_FREQUENCY_ANALYTICS_STATUS
                    .CALCULATED
                : GRID_FREQUENCY_ANALYTICS_STATUS
                    .PARTIALLY_CALCULATED,

        reason:
            fullyCalculated
                ? GRID_FREQUENCY_ANALYTICS_REASON
                    .FREQUENCY_ANALYTICS_QUALIFIED
                : GRID_FREQUENCY_ANALYTICS_REASON
                    .FREQUENCY_ANALYTICS_PARTIAL,

        reportingWindow: {
            ...reportingWindow,

            semantics:
                "[start,end)",
        },

        phases:
            phaseAnalytics,

        metrics: {
            availablePhaseCount,

            completePhasePopulation,

            allPhaseCoverageComplete,

            totalQualifiedFrequencySamples:
                samples.length,
        },

        evidence: {
            qualifiedInputSampleCount:
                qualifiedSamples
                    .length,

            normalizedFrequencySampleCount:
                samples.length,

            maxGapMinutes,
        },

        semantics:
            buildSemantics(),
    };
}


export default {
    GRID_FREQUENCY_ANALYTICS_STATUS,
    GRID_FREQUENCY_ANALYTICS_REASON,
    DEFAULT_GRID_FREQUENCY_ANALYTICS_CONFIG,
    normalizeQualifiedGridFrequencySamples,
    resolveGridFrequencyReportingWindow,
    calculateGridFrequencyAnalytics,
};