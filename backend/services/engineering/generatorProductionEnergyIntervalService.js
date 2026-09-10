// services/engineering/generatorProductionEnergyIntervalService.js

import {
    GENERATOR_PRODUCTION_POWER_SOURCE,
    GENERATOR_PRODUCTION_POWER_UNIT,
    GENERATOR_PRODUCTION_TOPOLOGY_STATUS,
} from "./generatorProductionAdapterSupport.js";

import {
    buildServedLoadSeries,
} from "./siteElectricalPerformanceService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.5I-B
| Production Power / Energy Interval Qualification
|--------------------------------------------------------------------------
|
| Purpose:
|
| 1. Convert an already-qualified production generator topology into a
|    timestamped generator kW series.
|
| 2. Convert qualified served-load telemetry into a timestamped kW series.
|
| 3. Construct a common temporal partition from BOTH raw power series.
|
| 4. Integrate generator and served-load power over the same exact
|    subintervals.
|
| This allows generatorContributionService.js to consume exact matching:
|
| {
|   start,
|   end,
|   energyKWh
| }
|
| intervals.
|
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This service DOES interpolate POWER between adjacent qualified power
| observations as required by trapezoidal integration.
|
| It DOES NOT:
|
| - prorate already-aggregated energy
| - divide independently aggregated kWh values
| - assume equal coverage hours means equal temporal coverage
| - bridge long telemetry gaps
| - extrapolate beyond observed power segments
| - infer W/kW from magnitude
| - clamp negative generator power
|--------------------------------------------------------------------------
*/


export const GENERATOR_PRODUCTION_INTERVAL_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GENERATOR_PRODUCTION_INTERVAL_REASON =
    Object.freeze({

        INTERVALS_QUALIFIED:
            "INTERVALS_QUALIFIED",

        INTERVALS_PARTIAL:
            "INTERVALS_PARTIAL",

        GENERATOR_TOPOLOGY_UNAVAILABLE:
            "GENERATOR_TOPOLOGY_UNAVAILABLE",

        GENERATOR_POWER_UNIT_UNRESOLVED:
            "GENERATOR_POWER_UNIT_UNRESOLVED",

        INSUFFICIENT_GENERATOR_POWER_SAMPLES:
            "INSUFFICIENT_GENERATOR_POWER_SAMPLES",

        INSUFFICIENT_SERVED_LOAD_SAMPLES:
            "INSUFFICIENT_SERVED_LOAD_SAMPLES",

        INCOMPLETE_GENERATOR_PHASE_SETS:
            "INCOMPLETE_GENERATOR_PHASE_SETS",

        NO_GENERATOR_POWER_SEGMENTS:
            "NO_GENERATOR_POWER_SEGMENTS",

        NO_SERVED_LOAD_POWER_SEGMENTS:
            "NO_SERVED_LOAD_POWER_SEGMENTS",

        NO_COMMON_QUALIFIED_INTERVALS:
            "NO_COMMON_QUALIFIED_INTERVALS",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",
    });


export const DEFAULT_GENERATOR_PRODUCTION_INTERVAL_CONFIG =
    Object.freeze({

        maxGapMinutes:
            30,

        phaseAlignmentToleranceSeconds:
            60,

        servedLoadBucketSeconds:
            60,
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

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


function durationHours(
    start,
    end
) {

    return (
        end.getTime() -
        start.getTime()
    ) /
    3_600_000;
}


function unavailableResult(
    reason,
    metadata = {}
) {

    return {

        status:
            GENERATOR_PRODUCTION_INTERVAL_STATUS
                .UNAVAILABLE,

        reason,

        metadata,
    };
}


/*
|--------------------------------------------------------------------------
| Normalize a power unit to production kW
|--------------------------------------------------------------------------
*/

function convertPowerToKw(
    value,
    powerUnit
) {

    const numeric =
        finite(
            value
        );


    if (
        numeric ===
        null
    ) {

        return null;
    }


    if (
        powerUnit ===
        GENERATOR_PRODUCTION_POWER_UNIT
            .W
    ) {

        return numeric /
            1000;
    }


    if (
        powerUnit ===
        GENERATOR_PRODUCTION_POWER_UNIT
            .KW
    ) {

        return numeric;
    }


    return null;
}


/*
|--------------------------------------------------------------------------
| Remove duplicate timestamps from an already-built power series
|--------------------------------------------------------------------------
|
| Identical timestamp + identical kW:
|     keep one.
|
| Identical timestamp + different kW:
|     remove that timestamp entirely as ambiguous.
|--------------------------------------------------------------------------
*/

function normalizePowerSamples(
    samples = []
) {

    const groups =
        new Map();


    for (
        const sample
        of samples
    ) {

        const timestamp =
            asDate(
                sample?.timestamp
            );


        const kw =
            finite(
                sample?.kw
            );


        if (
            !timestamp ||
            kw ===
            null
        ) {

            continue;
        }


        const key =
            String(
                timestamp.getTime()
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
            .push({

                timestamp,

                kw,
            });
    }


    const output =
        [];

    let duplicateTimestampCount =
        0;

    let conflictingTimestampCount =
        0;


    for (
        const entries
        of groups.values()
    ) {

        if (
            entries.length ===
            1
        ) {

            output.push(
                entries[0]
            );

            continue;
        }


        const values =
            new Set(
                entries.map(
                    (entry) =>
                        entry.kw
                )
            );


        if (
            values.size ===
            1
        ) {

            duplicateTimestampCount +=
                1;

            output.push(
                entries[0]
            );

            continue;
        }


        conflictingTimestampCount +=
            1;
    }


    output.sort(
        (
            a,
            b
        ) =>
            a.timestamp -
            b.timestamp
    );


    return {

        samples:
            output,

        evidence: {

            duplicateTimestampCount,

            conflictingTimestampCount,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Direct total attr 1742 power series
|--------------------------------------------------------------------------
*/

function buildDirectGeneratorSeries(
    records,
    powerUnit
) {

    const samples =
        records
            .filter(
                (record) =>
                    Number(
                        record
                            ?.vrmAttributeId
                    ) ===
                    1742
            )
            .map(
                (record) => {

                    const timestamp =
                        asDate(
                            record?.timestamp
                        );


                    const kw =
                        convertPowerToKw(
                            record?.numericValue ??
                            record?.value,
                            powerUnit
                        );


                    return {

                        timestamp,

                        kw,
                    };
                }
            )
            .filter(
                (sample) =>
                    sample.timestamp &&
                    sample.kw !==
                        null
            );


    return normalizePowerSamples(
        samples
    );
}


/*
|--------------------------------------------------------------------------
| Complete generator phase-family construction
|--------------------------------------------------------------------------
|
| Matches the existing generatorEnergyService design:
|
| - first phase is anchor
| - nearest unused record from other phases
| - must be within alignment tolerance
| - each phase observation can only be consumed once
| - total generator power is the phase sum
| - timestamp is mean timestamp of the selected phase observations
|--------------------------------------------------------------------------
*/

function buildGeneratorPhaseSeries({
    records,
    attributeIds,
    powerUnit,
    toleranceSeconds,
}) {

    const toleranceMs =
        Number(
            toleranceSeconds
        ) *
        1000;


    const phaseSeries =
        new Map();


    for (
        const attributeId
        of attributeIds
    ) {

        const points =
            records
                .filter(
                    (record) =>
                        Number(
                            record
                                ?.vrmAttributeId
                        ) ===
                        attributeId
                )
                .map(
                    (record) => ({

                        timestamp:
                            asDate(
                                record?.timestamp
                            ),

                        kw:
                            convertPowerToKw(
                                record?.numericValue ??
                                record?.value,
                                powerUnit
                            ),

                        used:
                            false,
                    })
                )
                .filter(
                    (point) =>
                        point.timestamp &&
                        point.kw !==
                            null
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.timestamp -
                        b.timestamp
                );


        phaseSeries.set(
            attributeId,
            points
        );
    }


    const anchorAttribute =
        attributeIds[
            0
        ];


    const anchors =
        phaseSeries.get(
            anchorAttribute
        ) ??
        [];


    const samples =
        [];

    let incompleteAnchorCount =
        0;


    for (
        const anchor
        of anchors
    ) {

        if (
            anchor.used
        ) {

            continue;
        }


        const selected =
            [
                {
                    attributeId:
                        anchorAttribute,

                    point:
                        anchor,
                },
            ];


        let complete =
            true;


        for (
            const attributeId
            of attributeIds.slice(
                1
            )
        ) {

            const candidates =
                phaseSeries.get(
                    attributeId
                ) ??
                [];


            let nearest =
                null;

            let nearestDistance =
                Infinity;


            for (
                const candidate
                of candidates
            ) {

                if (
                    candidate.used
                ) {

                    continue;
                }


                const distance =
                    Math.abs(
                        candidate
                            .timestamp -
                        anchor
                            .timestamp
                    );


                if (
                    distance <=
                        toleranceMs &&
                    distance <
                        nearestDistance
                ) {

                    nearest =
                        candidate;

                    nearestDistance =
                        distance;
                }
            }


            if (
                !nearest
            ) {

                complete =
                    false;

                break;
            }


            selected.push({

                attributeId,

                point:
                    nearest,
            });
        }


        if (
            !complete
        ) {

            incompleteAnchorCount +=
                1;

            continue;
        }


        for (
            const item
            of selected
        ) {

            item.point.used =
                true;
        }


        const averageTimestampMs =
            selected.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    item
                        .point
                        .timestamp
                        .getTime(),
                0
            ) /
            selected.length;


        const totalKw =
            selected.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    item
                        .point
                        .kw,
                0
            );


        samples.push({

            timestamp:
                new Date(
                    averageTimestampMs
                ),

            kw:
                totalKw,
        });
    }


    const normalized =
        normalizePowerSamples(
            samples
        );


    return {

        samples:
            normalized.samples,

        incompleteAnchorCount,

        duplicateTimestampCount:
            normalized
                .evidence
                .duplicateTimestampCount,

        conflictingTimestampCount:
            normalized
                .evidence
                .conflictingTimestampCount,
    };
}


/*
|--------------------------------------------------------------------------
| Public generator production power-series construction
|--------------------------------------------------------------------------
*/

export function buildGeneratorProductionPowerSeries({
    topology,
    powerUnit =
        GENERATOR_PRODUCTION_POWER_UNIT
            .UNRESOLVED,
    config = {},
} = {}) {

    const resolvedConfig = {

        ...DEFAULT_GENERATOR_PRODUCTION_INTERVAL_CONFIG,

        ...config,
    };


    if (
        !topology ||
        topology.status !==
            GENERATOR_PRODUCTION_TOPOLOGY_STATUS
                .QUALIFIED
    ) {

        return {

            ...unavailableResult(
                GENERATOR_PRODUCTION_INTERVAL_REASON
                    .GENERATOR_TOPOLOGY_UNAVAILABLE
            ),

            samples:
                [],
        };
    }


    if (
        powerUnit !==
            GENERATOR_PRODUCTION_POWER_UNIT
                .W &&
        powerUnit !==
            GENERATOR_PRODUCTION_POWER_UNIT
                .KW
    ) {

        return {

            ...unavailableResult(
                GENERATOR_PRODUCTION_INTERVAL_REASON
                    .GENERATOR_POWER_UNIT_UNRESOLVED
            ),

            samples:
                [],
        };
    }


    let result;


    if (
        topology.source ===
        GENERATOR_PRODUCTION_POWER_SOURCE
            .TOTAL_1742
    ) {

        result =
            buildDirectGeneratorSeries(
                topology.records ??
                    [],
                powerUnit
            );


        if (
            result.samples.length <
            2
        ) {

            return {

                ...unavailableResult(
                    GENERATOR_PRODUCTION_INTERVAL_REASON
                        .INSUFFICIENT_GENERATOR_POWER_SAMPLES
                ),

                samples:
                    result.samples,
            };
        }


        return {

            status:
                GENERATOR_PRODUCTION_INTERVAL_STATUS
                    .CALCULATED,

            reason:
                GENERATOR_PRODUCTION_INTERVAL_REASON
                    .INTERVALS_QUALIFIED,

            source:
                topology.source,

            deviceInstance:
                topology
                    .deviceInstance,

            powerUnit,

            samples:
                result.samples,

            evidence: {

                sampleCount:
                    result.samples
                        .length,

                duplicateTimestampCount:
                    result
                        .evidence
                        .duplicateTimestampCount,

                conflictingTimestampCount:
                    result
                        .evidence
                        .conflictingTimestampCount,

                sourceFamily:
                    topology.source,
            },
        };
    }


    let phaseAttributes;


    if (
        topology.source ===
        GENERATOR_PRODUCTION_POWER_SOURCE
            .PHASE_428_434_438
    ) {

        phaseAttributes =
            [
                428,
                434,
                438,
            ];
    }


    else if (
        topology.source ===
        GENERATOR_PRODUCTION_POWER_SOURCE
            .PHASE_137_138_139
    ) {

        phaseAttributes =
            [
                137,
                138,
                139,
            ];
    }


    else {

        return {

            ...unavailableResult(
                GENERATOR_PRODUCTION_INTERVAL_REASON
                    .GENERATOR_TOPOLOGY_UNAVAILABLE
            ),

            samples:
                [],
        };
    }


    result =
        buildGeneratorPhaseSeries({

            records:
                topology.records ??
                [],

            attributeIds:
                phaseAttributes,

            powerUnit,

            toleranceSeconds:
                resolvedConfig
                    .phaseAlignmentToleranceSeconds,
        });


    if (
        result.samples.length <
        2
    ) {

        return {

            ...unavailableResult(
                result.incompleteAnchorCount >
                    0
                    ? GENERATOR_PRODUCTION_INTERVAL_REASON
                        .INCOMPLETE_GENERATOR_PHASE_SETS
                    : GENERATOR_PRODUCTION_INTERVAL_REASON
                        .INSUFFICIENT_GENERATOR_POWER_SAMPLES,
                {
                    incompleteAnchorCount:
                        result
                            .incompleteAnchorCount,
                }
            ),

            samples:
                result.samples,
        };
    }


    return {

        status:
            GENERATOR_PRODUCTION_INTERVAL_STATUS
                .CALCULATED,

        reason:
            GENERATOR_PRODUCTION_INTERVAL_REASON
                .INTERVALS_QUALIFIED,

        source:
            topology.source,

        deviceInstance:
            topology
                .deviceInstance,

        powerUnit,

        samples:
            result.samples,

        evidence: {

            sampleCount:
                result.samples
                    .length,

            incompleteAnchorCount:
                result
                    .incompleteAnchorCount,

            duplicateTimestampCount:
                result
                    .duplicateTimestampCount,

            conflictingTimestampCount:
                result
                    .conflictingTimestampCount,

            phaseAlignmentToleranceSeconds:
                resolvedConfig
                    .phaseAlignmentToleranceSeconds,

            sourceFamily:
                topology.source,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Served-load production power series
|--------------------------------------------------------------------------
|
| Existing siteElectricalPerformanceService already:
|
| - detects PRIMARY or OUTPUT served-load phases
| - requires complete known phase evidence per bucket
| - sums phases
| - converts watts -> kW
| - preserves genuine zero
|--------------------------------------------------------------------------
*/

export function buildServedLoadProductionPowerSeries({
    records = [],
    family = "PRIMARY",
    config = {},
} = {}) {

    const resolvedConfig = {

        ...DEFAULT_GENERATOR_PRODUCTION_INTERVAL_CONFIG,

        ...config,
    };


    const result =
        buildServedLoadSeries(
            records,
            {
                family,

                bucketSeconds:
                    resolvedConfig
                        .servedLoadBucketSeconds,
            }
        );


    const normalized =
        normalizePowerSamples(
            result.samples.map(
                (sample) => ({

                    timestamp:
                        sample.timestamp,

                    kw:
                        sample.kw,
                })
            )
        );


    if (
        normalized.samples.length <
        2
    ) {

        return {

            status:
                GENERATOR_PRODUCTION_INTERVAL_STATUS
                    .UNAVAILABLE,

            reason:
                GENERATOR_PRODUCTION_INTERVAL_REASON
                    .INSUFFICIENT_SERVED_LOAD_SAMPLES,

            family:
                result.family,

            phases:
                result.phases,

            samples:
                normalized.samples,

            evidence: {

                rejectedBuckets:
                    result
                        .rejectedBuckets,

                sampleCount:
                    normalized.samples
                        .length,
            },
        };
    }


    return {

        status:
            GENERATOR_PRODUCTION_INTERVAL_STATUS
                .CALCULATED,

        reason:
            GENERATOR_PRODUCTION_INTERVAL_REASON
                .INTERVALS_QUALIFIED,

        family:
            result.family,

        phases:
            result.phases,

        samples:
            normalized.samples,

        evidence: {

            rejectedBuckets:
                result
                    .rejectedBuckets,

            sampleCount:
                normalized.samples
                    .length,

            duplicateTimestampCount:
                normalized
                    .evidence
                    .duplicateTimestampCount,

            conflictingTimestampCount:
                normalized
                    .evidence
                    .conflictingTimestampCount,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Build qualified piecewise-linear power segments
|--------------------------------------------------------------------------
|
| Each adjacent power pair defines a valid segment only if:
|
| - timestamps increase
| - source gap <= maxGapMinutes
|
| No long-gap bridging.
|--------------------------------------------------------------------------
*/

function buildPowerSegments(
    samples,
    maxGapMinutes
) {

    const sorted =
        [
            ...samples,
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    a.timestamp -
                    b.timestamp
            );


    const maxGapMs =
        Number(
            maxGapMinutes
        ) *
        60 *
        1000;


    const segments =
        [];

    let longGapCount =
        0;

    let invalidPairCount =
        0;


    for (
        let index = 1;
        index < sorted.length;
        index += 1
    ) {

        const previous =
            sorted[
                index -
                1
            ];


        const current =
            sorted[
                index
            ];


        const gapMs =
            current.timestamp -
            previous.timestamp;


        if (
            !Number.isFinite(
                gapMs
            ) ||
            gapMs <=
            0
        ) {

            invalidPairCount +=
                1;

            continue;
        }


        if (
            gapMs >
            maxGapMs
        ) {

            longGapCount +=
                1;

            continue;
        }


        segments.push({

            start:
                previous.timestamp,

            end:
                current.timestamp,

            startKw:
                previous.kw,

            endKw:
                current.kw,
        });
    }


    return {

        segments,

        longGapCount,

        invalidPairCount,
    };
}


/*
|--------------------------------------------------------------------------
| Linear power interpolation inside a QUALIFIED raw-power segment
|--------------------------------------------------------------------------
|
| This is not energy prorating.
|
| It evaluates the same piecewise-linear power curve implied by
| trapezoidal integration.
|--------------------------------------------------------------------------
*/

function powerAt(
    segment,
    timestamp
) {

    const time =
        asDate(
            timestamp
        );


    if (
        !time
    ) {

        return null;
    }


    const totalMs =
        segment.end -
        segment.start;


    if (
        totalMs <=
        0
    ) {

        return null;
    }


    const offsetMs =
        time -
        segment.start;


    const fraction =
        offsetMs /
        totalMs;


    return (
        segment.startKw +
        (
            segment.endKw -
            segment.startKw
        ) *
        fraction
    );
}


/*
|--------------------------------------------------------------------------
| Integrate one linear power segment over a subinterval
|--------------------------------------------------------------------------
*/

function integrateSegmentSubinterval(
    segment,
    start,
    end
) {

    const startKw =
        powerAt(
            segment,
            start
        );


    const endKw =
        powerAt(
            segment,
            end
        );


    if (
        startKw ===
            null ||
        endKw ===
            null
    ) {

        return null;
    }


    const hours =
        durationHours(
            start,
            end
        );


    if (
        hours <=
        0
    ) {

        return null;
    }


    return {

        startKw,

        endKw,

        averageKw:
            (
                startKw +
                endKw
            ) /
            2,

        energyKWh:
            (
                (
                    startKw +
                    endKw
                ) /
                2
            ) *
            hours,

        durationHours:
            hours,
    };
}


/*
|--------------------------------------------------------------------------
| Common temporal energy interval engine
|--------------------------------------------------------------------------
|
| Generator and served-load power segments may have different telemetry
| timestamps.
|
| We intersect the qualified raw-power segments and generate exact common
| subintervals.
|
| Example:
|
| Generator:
| 00:00 ------------ 01:00
|
| Load:
| 00:00 ----- 00:30 ------------ 01:00
|
| Common output:
| 00:00 -> 00:30
| 00:30 -> 01:00
|
| Generator power is evaluated on its qualified linear power segment at
| 00:30. No aggregated generator kWh is prorated.
|--------------------------------------------------------------------------
*/

export function buildCommonQualifiedEnergyIntervals({
    generatorSamples = [],
    servedLoadSamples = [],
    start,
    end,
    config = {},
} = {}) {

    const reportingStart =
        asDate(
            start
        );


    const reportingEnd =
        asDate(
            end
        );


    if (
        !reportingStart ||
        !reportingEnd ||
        reportingStart >=
            reportingEnd
    ) {

        return {

            ...unavailableResult(
                GENERATOR_PRODUCTION_INTERVAL_REASON
                    .INVALID_REPORTING_WINDOW
            ),

            generatorIntervals:
                [],

            servedLoadIntervals:
                [],
        };
    }


    const resolvedConfig = {

        ...DEFAULT_GENERATOR_PRODUCTION_INTERVAL_CONFIG,

        ...config,
    };


    const generatorSegmentResult =
        buildPowerSegments(
            generatorSamples,
            resolvedConfig
                .maxGapMinutes
        );


    const loadSegmentResult =
        buildPowerSegments(
            servedLoadSamples,
            resolvedConfig
                .maxGapMinutes
        );


    if (
        generatorSegmentResult
            .segments
            .length ===
        0
    ) {

        return {

            ...unavailableResult(
                GENERATOR_PRODUCTION_INTERVAL_REASON
                    .NO_GENERATOR_POWER_SEGMENTS
            ),

            generatorIntervals:
                [],

            servedLoadIntervals:
                [],

            evidence: {

                generatorLongGapCount:
                    generatorSegmentResult
                        .longGapCount,
            },
        };
    }


    if (
        loadSegmentResult
            .segments
            .length ===
        0
    ) {

        return {

            ...unavailableResult(
                GENERATOR_PRODUCTION_INTERVAL_REASON
                    .NO_SERVED_LOAD_POWER_SEGMENTS
            ),

            generatorIntervals:
                [],

            servedLoadIntervals:
                [],

            evidence: {

                servedLoadLongGapCount:
                    loadSegmentResult
                        .longGapCount,
            },
        };
    }


    const generatorIntervals =
        [];

    const servedLoadIntervals =
        [];


    let generatorIndex =
        0;

    let loadIndex =
        0;


    while (
        generatorIndex <
            generatorSegmentResult
                .segments
                .length &&
        loadIndex <
            loadSegmentResult
                .segments
                .length
    ) {

        const generatorSegment =
            generatorSegmentResult
                .segments[
                    generatorIndex
                ];


        const loadSegment =
            loadSegmentResult
                .segments[
                    loadIndex
                ];


        const overlapStart =
            new Date(
                Math.max(
                    generatorSegment
                        .start
                        .getTime(),

                    loadSegment
                        .start
                        .getTime(),

                    reportingStart
                        .getTime()
                )
            );


        const overlapEnd =
            new Date(
                Math.min(
                    generatorSegment
                        .end
                        .getTime(),

                    loadSegment
                        .end
                        .getTime(),

                    reportingEnd
                        .getTime()
                )
            );


        if (
            overlapStart <
            overlapEnd
        ) {

            const generatorEnergy =
                integrateSegmentSubinterval(
                    generatorSegment,
                    overlapStart,
                    overlapEnd
                );


            const loadEnergy =
                integrateSegmentSubinterval(
                    loadSegment,
                    overlapStart,
                    overlapEnd
                );


            if (
                generatorEnergy &&
                loadEnergy
            ) {

                generatorIntervals.push({

                    start:
                        overlapStart,

                    end:
                        overlapEnd,

                    energyKWh:
                        generatorEnergy
                            .energyKWh,
                });


                servedLoadIntervals.push({

                    start:
                        overlapStart,

                    end:
                        overlapEnd,

                    energyKWh:
                        loadEnergy
                            .energyKWh,
                });
            }
        }


        /*
         * Move whichever source segment ends first.
         */

        if (
            generatorSegment.end <
            loadSegment.end
        ) {

            generatorIndex +=
                1;
        }


        else if (
            loadSegment.end <
            generatorSegment.end
        ) {

            loadIndex +=
                1;
        }


        else {

            generatorIndex +=
                1;

            loadIndex +=
                1;
        }
    }


    if (
        generatorIntervals.length ===
        0
    ) {

        return {

            status:
                GENERATOR_PRODUCTION_INTERVAL_STATUS
                    .UNAVAILABLE,

            reason:
                GENERATOR_PRODUCTION_INTERVAL_REASON
                    .NO_COMMON_QUALIFIED_INTERVALS,

            generatorIntervals:
                [],

            servedLoadIntervals:
                [],

            evidence: {

                generatorSegmentCount:
                    generatorSegmentResult
                        .segments
                        .length,

                servedLoadSegmentCount:
                    loadSegmentResult
                        .segments
                        .length,

                generatorLongGapCount:
                    generatorSegmentResult
                        .longGapCount,

                servedLoadLongGapCount:
                    loadSegmentResult
                        .longGapCount,
            },
        };
    }


    const alignedCoverageHours =
        generatorIntervals.reduce(
            (
                sum,
                interval
            ) =>
                sum +
                durationHours(
                    interval.start,
                    interval.end
                ),
            0
        );


    const reportingHours =
        durationHours(
            reportingStart,
            reportingEnd
        );


    const fullCoverage =
        Math.abs(
            alignedCoverageHours -
            reportingHours
        ) <=
        1e-9;


    const status =
        fullCoverage
            ? GENERATOR_PRODUCTION_INTERVAL_STATUS
                .CALCULATED
            : GENERATOR_PRODUCTION_INTERVAL_STATUS
                .PARTIALLY_CALCULATED;


    const reason =
        fullCoverage
            ? GENERATOR_PRODUCTION_INTERVAL_REASON
                .INTERVALS_QUALIFIED
            : GENERATOR_PRODUCTION_INTERVAL_REASON
                .INTERVALS_PARTIAL;


    const alignedGeneratorEnergyKWh =
        generatorIntervals.reduce(
            (
                sum,
                interval
            ) =>
                sum +
                interval.energyKWh,
            0
        );


    const alignedServedLoadEnergyKWh =
        servedLoadIntervals.reduce(
            (
                sum,
                interval
            ) =>
                sum +
                interval.energyKWh,
            0
        );


    return {

        status,

        reason,

        reportingWindow: {

            start:
                reportingStart,

            end:
                reportingEnd,

            semantics:
                "[start,end)",
        },

        generatorIntervals,

        servedLoadIntervals,

        totals: {

            alignedGeneratorEnergyKWh,

            alignedServedLoadEnergyKWh,

            alignedCoverageHours,

            reportingHours,

            coveragePercent:
                (
                    alignedCoverageHours /
                    reportingHours
                ) *
                100,
        },

        evidence: {

            commonIntervalCount:
                generatorIntervals
                    .length,

            generatorSegmentCount:
                generatorSegmentResult
                    .segments
                    .length,

            servedLoadSegmentCount:
                loadSegmentResult
                    .segments
                    .length,

            generatorLongGapCount:
                generatorSegmentResult
                    .longGapCount,

            servedLoadLongGapCount:
                loadSegmentResult
                    .longGapCount,

            generatorInvalidPairCount:
                generatorSegmentResult
                    .invalidPairCount,

            servedLoadInvalidPairCount:
                loadSegmentResult
                    .invalidPairCount,
        },

        boundaries: {

            independentlyAggregatedEnergyDivided:
                false,

            aggregateCoverageHoursUsedForAlignment:
                false,

            aggregatedEnergyProrated:
                false,

            rawPowerInterpolationUsed:
                true,

            interpolationBasis:
                "PIECEWISE_LINEAR_TRAPEZOIDAL_POWER",

            longGapsBridged:
                false,

            powerExtrapolatedBeyondObservedSegments:
                false,

            generatorNegativePowerClamped:
                false,

            exactCommonOutputIntervals:
                true,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Composite production interval qualification
|--------------------------------------------------------------------------
*/

export function qualifyGeneratorProductionEnergyIntervals({
    topology,
    powerUnit,
    servedLoadRecords = [],
    servedLoadFamily = "PRIMARY",
    start,
    end,
    config = {},
} = {}) {

    const generatorSeries =
        buildGeneratorProductionPowerSeries({

            topology,

            powerUnit,

            config,
        });


    if (
        generatorSeries.status ===
        GENERATOR_PRODUCTION_INTERVAL_STATUS
            .UNAVAILABLE
    ) {

        return {

            family:
                "GENERATOR_PRODUCTION_ENERGY_INTERVALS",

            status:
                GENERATOR_PRODUCTION_INTERVAL_STATUS
                    .UNAVAILABLE,

            reason:
                generatorSeries.reason,

            generatorSeries,

            servedLoadSeries:
                null,

            generatorIntervals:
                [],

            servedLoadIntervals:
                [],
        };
    }


    const servedLoadSeries =
        buildServedLoadProductionPowerSeries({

            records:
                servedLoadRecords,

            family:
                servedLoadFamily,

            config,
        });


    if (
        servedLoadSeries.status ===
        GENERATOR_PRODUCTION_INTERVAL_STATUS
            .UNAVAILABLE
    ) {

        return {

            family:
                "GENERATOR_PRODUCTION_ENERGY_INTERVALS",

            status:
                GENERATOR_PRODUCTION_INTERVAL_STATUS
                    .UNAVAILABLE,

            reason:
                servedLoadSeries.reason,

            generatorSeries,

            servedLoadSeries,

            generatorIntervals:
                [],

            servedLoadIntervals:
                [],
        };
    }


    const intervals =
        buildCommonQualifiedEnergyIntervals({

            generatorSamples:
                generatorSeries.samples,

            servedLoadSamples:
                servedLoadSeries.samples,

            start,

            end,

            config,
        });


    return {

        family:
            "GENERATOR_PRODUCTION_ENERGY_INTERVALS",

        status:
            intervals.status,

        reason:
            intervals.reason,

        reportingWindow:
            intervals.reportingWindow ??
            null,

        generatorSeries,

        servedLoadSeries,

        generatorIntervals:
            intervals.generatorIntervals,

        servedLoadIntervals:
            intervals.servedLoadIntervals,

        totals:
            intervals.totals ??
            null,

        evidence:
            intervals.evidence ??
            null,

        boundaries:
            intervals.boundaries ??
            null,
    };
}


export default {

    GENERATOR_PRODUCTION_INTERVAL_STATUS,

    GENERATOR_PRODUCTION_INTERVAL_REASON,

    DEFAULT_GENERATOR_PRODUCTION_INTERVAL_CONFIG,

    buildGeneratorProductionPowerSeries,

    buildServedLoadProductionPowerSeries,

    buildCommonQualifiedEnergyIntervals,

    qualifyGeneratorProductionEnergyIntervals,
};