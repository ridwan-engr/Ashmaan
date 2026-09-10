// services/engineering/generatorContributionService.js

import {
    GENERATOR_CONTRIBUTION_STATUS,
    GENERATOR_CONTRIBUTION_DENOMINATOR,
} from "./generatorContributionSemantics.js";


/*
|--------------------------------------------------------------------------
| Phase 8.5F-D
| Pure Interval-Aligned Generator Contribution Engine
|--------------------------------------------------------------------------
|
| Metric:
|
|                    Σ qualified generator energy
| contribution % = ---------------------------------- × 100
|                    Σ qualified served-load energy
|
| But ONLY across exact common qualified intervals.
|
| No:
| - independent aggregate division
| - coverage-hours-only matching
| - interpolation
| - proportional allocation
| - denominator fabrication
| - clamping to 100%
|--------------------------------------------------------------------------
*/


export const GENERATOR_CONTRIBUTION_REASON =
    Object.freeze({

        CONTRIBUTION_QUALIFIED:
            "CONTRIBUTION_QUALIFIED",

        CONTRIBUTION_PARTIAL:
            "CONTRIBUTION_PARTIAL",

        NO_GENERATOR_ENERGY_INTERVALS:
            "NO_GENERATOR_ENERGY_INTERVALS",

        NO_SERVED_LOAD_ENERGY_INTERVALS:
            "NO_SERVED_LOAD_ENERGY_INTERVALS",

        NO_COMMON_QUALIFIED_INTERVALS:
            "NO_COMMON_QUALIFIED_INTERVALS",

        ZERO_OR_NEGATIVE_SERVED_LOAD_DENOMINATOR:
            "ZERO_OR_NEGATIVE_SERVED_LOAD_DENOMINATOR",

        INVALID_INTERVAL:
            "INVALID_INTERVAL",
    });


function asDate(
    value
) {

    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function finite(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;
    }


    const numeric =
        Number(
            value
        );


    return Number.isFinite(
        numeric
    )
        ? numeric
        : null;
}


function intervalKey(
    start,
    end
) {

    return (
        `${start.getTime()}::${end.getTime()}`
    );
}


function normalizeIntervals(
    intervals
) {

    const valid =
        [];

    let invalidCount =
        0;


    for (
        const interval
        of intervals ?? []
    ) {

        const start =
            asDate(
                interval.start
            );


        const end =
            asDate(
                interval.end
            );


        const energyKWh =
            finite(
                interval.energyKWh
            );


        if (
            !start ||
            !end ||
            start >= end ||
            energyKWh === null
        ) {

            invalidCount +=
                1;

            continue;
        }


        valid.push({

            start,

            end,

            energyKWh,
        });
    }


    valid.sort(
        (
            a,
            b
        ) =>
            a.start -
            b.start ||
            a.end -
            b.end
    );


    return {

        valid,

        invalidCount,
    };
}


function buildUniqueIntervalMap(
    intervals
) {

    const map =
        new Map();


    const duplicateKeys =
        new Set();


    for (
        const interval
        of intervals
    ) {

        const key =
            intervalKey(
                interval.start,
                interval.end
            );


        if (
            map.has(
                key
            )
        ) {

            duplicateKeys.add(
                key
            );

            continue;
        }


        map.set(
            key,
            interval
        );
    }


    /*
     * Duplicate interval definitions are ambiguous.
     * Remove them rather than silently summing them.
     */

    for (
        const key
        of duplicateKeys
    ) {

        map.delete(
            key
        );
    }


    return {

        map,

        duplicateCount:
            duplicateKeys.size,
    };
}


function sumEnergy(
    intervals
) {

    return intervals.reduce(
        (
            sum,
            interval
        ) =>
            sum +
            interval.energyKWh,
        0
    );
}


function sumDurationHours(
    intervals
) {

    return intervals.reduce(
        (
            sum,
            interval
        ) =>
            sum +
            (
                interval.end -
                interval.start
            ) /
            3600000,
        0
    );
}


function unavailableMetric(
    reason,
    metadata = {}
) {

    return {

        status:
            GENERATOR_CONTRIBUTION_STATUS
                .UNAVAILABLE,

        value:
            null,

        unit:
            "PERCENT",

        reason,

        metadata,
    };
}


export function calculateGeneratorContribution({
    generatorIntervals = [],
    servedLoadIntervals = [],
} = {}) {

    const normalizedGenerator =
        normalizeIntervals(
            generatorIntervals
        );


    const normalizedServedLoad =
        normalizeIntervals(
            servedLoadIntervals
        );


    /*
    |--------------------------------------------------------------------------
    | Missing numerator
    |--------------------------------------------------------------------------
    */

    if (
        normalizedGenerator
            .valid
            .length ===
        0
    ) {

        return {

            family:
                "GENERATOR_CONTRIBUTION",

            status:
                GENERATOR_CONTRIBUTION_STATUS
                    .UNAVAILABLE,

            denominator:
                GENERATOR_CONTRIBUTION_DENOMINATOR
                    .SERVED_LOAD_ENERGY,

            metrics: {

                contributionPercent:
                    unavailableMetric(
                        GENERATOR_CONTRIBUTION_REASON
                            .NO_GENERATOR_ENERGY_INTERVALS
                    ),
            },
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Missing denominator
    |--------------------------------------------------------------------------
    */

    if (
        normalizedServedLoad
            .valid
            .length ===
        0
    ) {

        return {

            family:
                "GENERATOR_CONTRIBUTION",

            status:
                GENERATOR_CONTRIBUTION_STATUS
                    .UNAVAILABLE,

            denominator:
                GENERATOR_CONTRIBUTION_DENOMINATOR
                    .SERVED_LOAD_ENERGY,

            metrics: {

                contributionPercent:
                    unavailableMetric(
                        GENERATOR_CONTRIBUTION_REASON
                            .NO_SERVED_LOAD_ENERGY_INTERVALS
                    ),
            },
        };
    }


    const generatorMapResult =
        buildUniqueIntervalMap(
            normalizedGenerator
                .valid
        );


    const servedLoadMapResult =
        buildUniqueIntervalMap(
            normalizedServedLoad
                .valid
        );


    const generatorMap =
        generatorMapResult
            .map;


    const servedLoadMap =
        servedLoadMapResult
            .map;


    const alignedGenerator =
        [];

    const alignedServedLoad =
        [];


    for (
        const [
            key,
            generatorInterval,
        ]
        of generatorMap
    ) {

        const servedLoadInterval =
            servedLoadMap.get(
                key
            );


        if (
            !servedLoadInterval
        ) {

            continue;
        }


        alignedGenerator.push(
            generatorInterval
        );


        alignedServedLoad.push(
            servedLoadInterval
        );
    }


    /*
    |--------------------------------------------------------------------------
    | No common intervals
    |--------------------------------------------------------------------------
    */

    if (
        alignedGenerator.length ===
        0
    ) {

        return {

            family:
                "GENERATOR_CONTRIBUTION",

            status:
                GENERATOR_CONTRIBUTION_STATUS
                    .UNAVAILABLE,

            denominator:
                GENERATOR_CONTRIBUTION_DENOMINATOR
                    .SERVED_LOAD_ENERGY,

            metrics: {

                contributionPercent:
                    unavailableMetric(
                        GENERATOR_CONTRIBUTION_REASON
                            .NO_COMMON_QUALIFIED_INTERVALS
                    ),
            },

            evidence: {

                generatorIntervalCount:
                    normalizedGenerator
                        .valid
                        .length,

                servedLoadIntervalCount:
                    normalizedServedLoad
                        .valid
                        .length,

                commonIntervalCount:
                    0,
            },
        };
    }


    const alignedGeneratorEnergyKWh =
        sumEnergy(
            alignedGenerator
        );


    const alignedServedLoadEnergyKWh =
        sumEnergy(
            alignedServedLoad
        );


    const alignedCoverageHours =
        sumDurationHours(
            alignedGenerator
        );


    /*
    |--------------------------------------------------------------------------
    | Denominator safety
    |--------------------------------------------------------------------------
    */

    if (
        alignedServedLoadEnergyKWh <=
        0
    ) {

        return {

            family:
                "GENERATOR_CONTRIBUTION",

            status:
                GENERATOR_CONTRIBUTION_STATUS
                    .UNAVAILABLE,

            denominator:
                GENERATOR_CONTRIBUTION_DENOMINATOR
                    .SERVED_LOAD_ENERGY,

            metrics: {

                contributionPercent:
                    unavailableMetric(
                        GENERATOR_CONTRIBUTION_REASON
                            .ZERO_OR_NEGATIVE_SERVED_LOAD_DENOMINATOR,
                        {

                            alignedGeneratorEnergyKWh,

                            alignedServedLoadEnergyKWh,

                            alignedCoverageHours,
                        }
                    ),
            },
        };
    }


    const contributionPercent =
        (
            alignedGeneratorEnergyKWh /
            alignedServedLoadEnergyKWh
        ) *
        100;


    /*
    |--------------------------------------------------------------------------
    | Determine completeness
    |--------------------------------------------------------------------------
    |
    | Fully calculated only when every unique qualified interval from both
    | datasets participates in the exact common interval set.
    |--------------------------------------------------------------------------
    */

    const allGeneratorIntervalsAligned =
        alignedGenerator.length ===
        generatorMap.size;


    const allServedLoadIntervalsAligned =
        alignedServedLoad.length ===
        servedLoadMap.size;


    const noInvalidIntervals =
        normalizedGenerator
            .invalidCount ===
            0 &&
        normalizedServedLoad
            .invalidCount ===
            0;


    const noDuplicateIntervals =
        generatorMapResult
            .duplicateCount ===
            0 &&
        servedLoadMapResult
            .duplicateCount ===
            0;


    const complete =
        allGeneratorIntervalsAligned &&
        allServedLoadIntervalsAligned &&
        noInvalidIntervals &&
        noDuplicateIntervals;


    const status =
        complete
            ? GENERATOR_CONTRIBUTION_STATUS
                .CALCULATED
            : GENERATOR_CONTRIBUTION_STATUS
                .PARTIALLY_CALCULATED;


    const reason =
        complete
            ? GENERATOR_CONTRIBUTION_REASON
                .CONTRIBUTION_QUALIFIED
            : GENERATOR_CONTRIBUTION_REASON
                .CONTRIBUTION_PARTIAL;


    return {

        family:
            "GENERATOR_CONTRIBUTION",

        status,

        denominator:
            GENERATOR_CONTRIBUTION_DENOMINATOR
                .SERVED_LOAD_ENERGY,

        metrics: {

            contributionPercent: {

                status,

                value:
                    contributionPercent,

                unit:
                    "PERCENT",

                reason,

                metadata: {

                    alignedGeneratorEnergyKWh,

                    alignedServedLoadEnergyKWh,

                    alignedCoverageHours,
                },
            },
        },

        evidence: {

            generatorIntervalCount:
                normalizedGenerator
                    .valid
                    .length,

            servedLoadIntervalCount:
                normalizedServedLoad
                    .valid
                    .length,

            commonIntervalCount:
                alignedGenerator
                    .length,

            generatorInvalidIntervalCount:
                normalizedGenerator
                    .invalidCount,

            servedLoadInvalidIntervalCount:
                normalizedServedLoad
                    .invalidCount,

            generatorDuplicateIntervalCount:
                generatorMapResult
                    .duplicateCount,

            servedLoadDuplicateIntervalCount:
                servedLoadMapResult
                    .duplicateCount,

            alignedGeneratorEnergyKWh,

            alignedServedLoadEnergyKWh,

            alignedCoverageHours,
        },

        boundaries: {

            independentAggregatesDivided:
                false,

            coverageHoursAloneUsedForAlignment:
                false,

            interpolationApplied:
                false,

            proportionalIntervalSplittingApplied:
                false,

            genericKwhUsedAsDenominator:
                false,

            zeroDenominatorReturnsZero:
                false,

            contributionClampedTo100:
                false,

            ratioIsRuntimePercent:
                false,

            ratioIsAvailability:
                false,

            ratioIsUtilization:
                false,
        },
    };
}


export default {

    GENERATOR_CONTRIBUTION_REASON,

    calculateGeneratorContribution,
};