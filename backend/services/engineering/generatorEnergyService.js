// services/engineering/generatorEnergyService.js

import {
    GENERATOR_POWER_SOURCE,
    GENERATOR_POWER_SOURCE_PRIORITY,
    GENERATOR_ENERGY_SEMANTICS,
} from "./generatorEnergySemantics.js";


/*
|--------------------------------------------------------------------------
| Phase 8.5F-B
| Pure Generator Electrical-Energy Integration Engine
|--------------------------------------------------------------------------
|
| Qualified power-source priority:
|
| 1. attr 1742              direct total generator active power
| 2. attrs 428/434/438      complete three-phase fallback
| 3. attrs 137/138/139      secondary complete three-phase fallback
|
| Rules:
|
| - source families are alternatives, never additive
| - incomplete phase sets are not treated as total power
| - multiple generator devices are not silently combined
| - integration uses trapezoidal time weighting
| - telemetry gaps > maxGapMinutes are not bridged
| - reporting window is [start,end)
| - zero power remains a genuine measured zero
| - negative power is preserved, never automatically clamped
| - raw power unit must be explicitly qualified before kWh conversion
|--------------------------------------------------------------------------
*/


export const GENERATOR_ENERGY_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GENERATOR_ENERGY_REASON =
    Object.freeze({

        ENERGY_QUALIFIED:
            "ENERGY_QUALIFIED",

        ENERGY_PARTIAL:
            "ENERGY_PARTIAL",

        NO_GENERATOR_POWER_EVIDENCE:
            "NO_GENERATOR_POWER_EVIDENCE",

        INSUFFICIENT_POWER_SAMPLES:
            "INSUFFICIENT_POWER_SAMPLES",

        MULTIPLE_GENERATOR_DEVICES_AMBIGUOUS:
            "MULTIPLE_GENERATOR_DEVICES_AMBIGUOUS",

        INCOMPLETE_PHASE_POWER:
            "INCOMPLETE_PHASE_POWER",

        POWER_UNIT_UNRESOLVED:
            "POWER_UNIT_UNRESOLVED",

        NO_INTEGRABLE_INTERVALS:
            "NO_INTEGRABLE_INTERVALS",

        LONG_GAPS_EXCLUDED:
            "LONG_GAPS_EXCLUDED",
    });


export const GENERATOR_POWER_UNIT =
    Object.freeze({

        W:
            "W",

        KW:
            "KW",

        UNRESOLVED:
            "UNRESOLVED",
    });


export const DEFAULT_GENERATOR_ENERGY_CONFIG =
    Object.freeze({

        maxGapMinutes:
            GENERATOR_ENERGY_SEMANTICS
                .defaultMaximumGapMinutes,

        phaseAlignmentToleranceSeconds:
            60,
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


function normalizeDeviceInstance(
    value
) {

    return String(
        value ??
        "UNKNOWN"
    );
}


function normalizePowerUnit(
    value
) {

    const unit =
        String(
            value ??
            ""
        )
            .trim()
            .toUpperCase();


    if (
        unit ===
        GENERATOR_POWER_UNIT.W
    ) {

        return GENERATOR_POWER_UNIT.W;
    }


    if (
        unit ===
        GENERATOR_POWER_UNIT.KW
    ) {

        return GENERATOR_POWER_UNIT.KW;
    }


    return GENERATOR_POWER_UNIT
        .UNRESOLVED;
}


function wattsToKwh(
    wattHours
) {

    return wattHours /
        1000;
}


function convertIntegratedPowerHoursToKwh(
    rawPowerHours,
    powerUnit
) {

    if (
        powerUnit ===
        GENERATOR_POWER_UNIT.W
    ) {

        return wattsToKwh(
            rawPowerHours
        );
    }


    if (
        powerUnit ===
        GENERATOR_POWER_UNIT.KW
    ) {

        return rawPowerHours;
    }


    return null;
}


function filterWindow(
    records,
    start,
    end
) {

    return records.filter(
        (
            record
        ) => {

            const timestamp =
                asDate(
                    record.timestamp
                );


            return (
                timestamp &&
                timestamp >= start &&
                timestamp < end
            );
        }
    );
}


function relevantGeneratorPowerRecords(
    records
) {

    const allowed =
        new Set(
            GENERATOR_POWER_SOURCE_PRIORITY
                .flatMap(
                    (
                        source
                    ) =>
                        source.attributes
                )
        );


    return records.filter(
        (
            record
        ) =>
            allowed.has(
                Number(
                    record.vrmAttributeId
                )
            )
    );
}


function groupByDevice(
    records
) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        const key =
            normalizeDeviceInstance(
                record.deviceInstance
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
                record
            );
    }


    return groups;
}


function selectDeviceRecords(
    records,
    selectedDeviceInstance = null
) {

    const groups =
        groupByDevice(
            records
        );


    if (
        selectedDeviceInstance !== null &&
        selectedDeviceInstance !== undefined
    ) {

        const key =
            String(
                selectedDeviceInstance
            );


        return {

            status:
                "SELECTED",

            deviceInstance:
                key,

            records:
                groups.get(
                    key
                ) ??
                [],
        };
    }


    if (
        groups.size ===
        0
    ) {

        return {

            status:
                "NONE",

            deviceInstance:
                null,

            records:
                [],
        };
    }


    if (
        groups.size >
        1
    ) {

        return {

            status:
                "AMBIGUOUS",

            deviceInstance:
                null,

            records:
                [],

            deviceInstances:
                Array.from(
                    groups.keys()
                ),
        };
    }


    const [
        [
            deviceInstance,
            deviceRecords,
        ],
    ] =
        Array.from(
            groups.entries()
        );


    return {

        status:
            "SELECTED",

        deviceInstance,

        records:
            deviceRecords,
    };
}


function buildDirectTotalSeries(
    records
) {

    return records
        .filter(
            (
                record
            ) =>
                Number(
                    record.vrmAttributeId
                ) ===
                1742
        )
        .map(
            (
                record
            ) => ({

                timestamp:
                    asDate(
                        record.timestamp
                    ),

                power:
                    finite(
                        record.numericValue ??
                        record.value
                    ),
            })
        )
        .filter(
            (
                point
            ) =>
                point.timestamp &&
                point.power !== null
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
| Complete phase-family construction
|--------------------------------------------------------------------------
|
| The first phase record becomes the anchor. Other phases must be observed
| within the configured alignment tolerance.
|
| A phase record may be consumed only once.
|--------------------------------------------------------------------------
*/

function buildCompletePhaseSeries(
    records,
    attributeIds,
    toleranceSeconds
) {

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

        phaseSeries.set(
            attributeId,
            records
                .filter(
                    (
                        record
                    ) =>
                        Number(
                            record.vrmAttributeId
                        ) ===
                        attributeId
                )
                .map(
                    (
                        record,
                        index
                    ) => ({

                        index,

                        timestamp:
                            asDate(
                                record.timestamp
                            ),

                        power:
                            finite(
                                record.numericValue ??
                                record.value
                            ),

                        used:
                            false,
                    })
                )
                .filter(
                    (
                        point
                    ) =>
                        point.timestamp &&
                        point.power !== null
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.timestamp -
                        b.timestamp
                )
        );
    }


    const anchorAttributeId =
        attributeIds[0];


    const anchors =
        phaseSeries.get(
            anchorAttributeId
        ) ??
        [];


    const output =
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
                        anchorAttributeId,

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
                        candidate.timestamp -
                        anchor.timestamp
                    );


                if (
                    distance <= toleranceMs &&
                    distance < nearestDistance
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
                    item.point.timestamp.getTime(),
                0
            ) /
            selected.length;


        const totalPower =
            selected.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    item.point.power,
                0
            );


        output.push({

            timestamp:
                new Date(
                    averageTimestampMs
                ),

            power:
                totalPower,
        });
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

        points:
            output,

        incompleteAnchorCount,
    };
}


/*
|--------------------------------------------------------------------------
| Source selection
|--------------------------------------------------------------------------
*/

function selectPowerSeries(
    records,
    config
) {

    const directTotal =
        buildDirectTotalSeries(
            records
        );


    if (
        directTotal.length >=
        2
    ) {

        return {

            source:
                GENERATOR_POWER_SOURCE
                    .TOTAL_1742,

            mode:
                "DIRECT_TOTAL",

            points:
                directTotal,

            incompletePhaseSets:
                0,
        };
    }


    const firstPhaseFamily =
        buildCompletePhaseSeries(
            records,
            [
                428,
                434,
                438,
            ],
            config
                .phaseAlignmentToleranceSeconds
        );


    if (
        firstPhaseFamily
            .points
            .length >=
        2
    ) {

        return {

            source:
                GENERATOR_POWER_SOURCE
                    .PHASE_FAMILY_428_434_438,

            mode:
                "THREE_PHASE_SUM",

            points:
                firstPhaseFamily
                    .points,

            incompletePhaseSets:
                firstPhaseFamily
                    .incompleteAnchorCount,
        };
    }


    const secondPhaseFamily =
        buildCompletePhaseSeries(
            records,
            [
                137,
                138,
                139,
            ],
            config
                .phaseAlignmentToleranceSeconds
        );


    if (
        secondPhaseFamily
            .points
            .length >=
        2
    ) {

        return {

            source:
                GENERATOR_POWER_SOURCE
                    .PHASE_FAMILY_137_138_139,

            mode:
                "THREE_PHASE_SUM",

            points:
                secondPhaseFamily
                    .points,

            incompletePhaseSets:
                secondPhaseFamily
                    .incompleteAnchorCount,
        };
    }


    return {

        source:
            GENERATOR_POWER_SOURCE
                .NONE,

        mode:
            null,

        points:
            [],

        incompletePhaseSets:
            firstPhaseFamily
                .incompleteAnchorCount +
            secondPhaseFamily
                .incompleteAnchorCount,
    };
}


/*
|--------------------------------------------------------------------------
| Trapezoidal integration
|--------------------------------------------------------------------------
*/

function integratePowerSeries(
    points,
    maxGapMinutes
) {

    const maxGapMs =
        Number(
            maxGapMinutes
        ) *
        60 *
        1000;


    let rawPowerHours =
        0;

    let integratedHours =
        0;

    let integrableIntervals =
        0;

    let longGapIntervals =
        0;

    let zeroPowerIntervals =
        0;

    let negativePowerIntervals =
        0;


    for (
        let index = 1;
        index < points.length;
        index += 1
    ) {

        const previous =
            points[
                index -
                1
            ];


        const current =
            points[
                index
            ];


        const gapMs =
            current.timestamp -
            previous.timestamp;


        if (
            gapMs <= 0
        ) {

            continue;
        }


        if (
            gapMs >
            maxGapMs
        ) {

            longGapIntervals +=
                1;

            continue;
        }


        const durationHours =
            gapMs /
            3600000;


        const averagePower =
            (
                previous.power +
                current.power
            ) /
            2;


        rawPowerHours +=
            averagePower *
            durationHours;


        integratedHours +=
            durationHours;


        integrableIntervals +=
            1;


        if (
            previous.power === 0 &&
            current.power === 0
        ) {

            zeroPowerIntervals +=
                1;
        }


        if (
            previous.power < 0 ||
            current.power < 0
        ) {

            negativePowerIntervals +=
                1;
        }
    }


    return {

        rawPowerHours,

        integratedHours,

        integrableIntervals,

        longGapIntervals,

        zeroPowerIntervals,

        negativePowerIntervals,
    };
}


function unavailableMetric(
    reason,
    metadata = {}
) {

    return {

        status:
            GENERATOR_ENERGY_STATUS
                .UNAVAILABLE,

        value:
            null,

        unit:
            null,

        reason,

        metadata,
    };
}


function calculatedEnergyMetric(
    value,
    reason,
    metadata = {},
    partial = false
) {

    return {

        status:
            partial
                ? GENERATOR_ENERGY_STATUS
                    .PARTIALLY_CALCULATED
                : GENERATOR_ENERGY_STATUS
                    .CALCULATED,

        value,

        unit:
            "kWh",

        reason,

        metadata,
    };
}


/*
|--------------------------------------------------------------------------
| Public calculation
|--------------------------------------------------------------------------
*/

export function calculateGeneratorElectricalEnergy({
    records = [],
    start,
    end,
    selectedDeviceInstance = null,
    powerUnit = GENERATOR_POWER_UNIT.UNRESOLVED,
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
        reportingStart >= reportingEnd
    ) {

        throw new Error(
            "A valid [start,end) generator-energy reporting window is required."
        );
    }


    const resolvedConfig =
        {
            ...DEFAULT_GENERATOR_ENERGY_CONFIG,
            ...config,
        };


    const resolvedPowerUnit =
        normalizePowerUnit(
            powerUnit
        );


    const windowRecords =
        relevantGeneratorPowerRecords(
            filterWindow(
                records,
                reportingStart,
                reportingEnd
            )
        );


    const reportingWindow =
        {

            start:
                reportingStart,

            end:
                reportingEnd,

            semantics:
                "[start,end)",
        };


    if (
        windowRecords.length ===
        0
    ) {

        return {

            family:
                "GENERATOR_ENERGY",

            status:
                GENERATOR_ENERGY_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics: {

                electricalEnergy:
                    unavailableMetric(
                        GENERATOR_ENERGY_REASON
                            .NO_GENERATOR_POWER_EVIDENCE
                    ),
            },

            source:
                null,
        };
    }


    const deviceSelection =
        selectDeviceRecords(
            windowRecords,
            selectedDeviceInstance
        );


    if (
        deviceSelection.status ===
        "AMBIGUOUS"
    ) {

        return {

            family:
                "GENERATOR_ENERGY",

            status:
                GENERATOR_ENERGY_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics: {

                electricalEnergy:
                    unavailableMetric(
                        GENERATOR_ENERGY_REASON
                            .MULTIPLE_GENERATOR_DEVICES_AMBIGUOUS,
                        {

                            deviceInstances:
                                deviceSelection
                                    .deviceInstances,
                        }
                    ),
            },

            source:
                null,
        };
    }


    if (
        deviceSelection.records.length ===
        0
    ) {

        return {

            family:
                "GENERATOR_ENERGY",

            status:
                GENERATOR_ENERGY_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics: {

                electricalEnergy:
                    unavailableMetric(
                        GENERATOR_ENERGY_REASON
                            .NO_GENERATOR_POWER_EVIDENCE
                    ),
            },

            source:
                null,
        };
    }


    const powerSeries =
        selectPowerSeries(
            deviceSelection.records,
            resolvedConfig
        );


    if (
        powerSeries.source ===
        GENERATOR_POWER_SOURCE.NONE
    ) {

        return {

            family:
                "GENERATOR_ENERGY",

            status:
                GENERATOR_ENERGY_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics: {

                electricalEnergy:
                    unavailableMetric(
                        powerSeries
                            .incompletePhaseSets >
                            0
                            ? GENERATOR_ENERGY_REASON
                                .INCOMPLETE_PHASE_POWER
                            : GENERATOR_ENERGY_REASON
                                .INSUFFICIENT_POWER_SAMPLES,
                        {

                            incompletePhaseSets:
                                powerSeries
                                    .incompletePhaseSets,
                        }
                    ),
            },

            source:
                null,
        };
    }


    const integration =
        integratePowerSeries(
            powerSeries.points,
            resolvedConfig
                .maxGapMinutes
        );


    if (
        integration.integrableIntervals ===
        0
    ) {

        return {

            family:
                "GENERATOR_ENERGY",

            status:
                GENERATOR_ENERGY_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics: {

                electricalEnergy:
                    unavailableMetric(
                        integration
                            .longGapIntervals >
                            0
                            ? GENERATOR_ENERGY_REASON
                                .LONG_GAPS_EXCLUDED
                            : GENERATOR_ENERGY_REASON
                                .NO_INTEGRABLE_INTERVALS,
                        {

                            sampleCount:
                                powerSeries
                                    .points
                                    .length,

                            longGapIntervals:
                                integration
                                    .longGapIntervals,
                        }
                    ),
            },

            source: {

                powerSource:
                    powerSeries
                        .source,

                mode:
                    powerSeries
                        .mode,

                deviceInstance:
                    deviceSelection
                        .deviceInstance,
            },
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Unit qualification
    |--------------------------------------------------------------------------
    |
    | Power evidence can be semantically valid while kWh remains unavailable.
    |--------------------------------------------------------------------------
    */

    if (
        resolvedPowerUnit ===
        GENERATOR_POWER_UNIT
            .UNRESOLVED
    ) {

        return {

            family:
                "GENERATOR_ENERGY",

            status:
                GENERATOR_ENERGY_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics: {

                electricalEnergy:
                    unavailableMetric(
                        GENERATOR_ENERGY_REASON
                            .POWER_UNIT_UNRESOLVED,
                        {

                            rawIntegratedPowerHours:
                                integration
                                    .rawPowerHours,

                            rawPowerUnit:
                                null,

                            integrableIntervals:
                                integration
                                    .integrableIntervals,

                            integratedHours:
                                integration
                                    .integratedHours,

                            longGapIntervals:
                                integration
                                    .longGapIntervals,
                        }
                    ),
            },

            source: {

                powerSource:
                    powerSeries
                        .source,

                mode:
                    powerSeries
                        .mode,

                deviceInstance:
                    deviceSelection
                        .deviceInstance,
            },

            evidence: {

                powerEvidenceQualified:
                    true,

                powerUnitQualified:
                    false,
            },
        };
    }


    const energyKwh =
        convertIntegratedPowerHoursToKwh(
            integration.rawPowerHours,
            resolvedPowerUnit
        );


    const partial =
        integration
            .longGapIntervals >
            0 ||
        powerSeries
            .incompletePhaseSets >
            0;


    const reason =
        partial
            ? GENERATOR_ENERGY_REASON
                .ENERGY_PARTIAL
            : GENERATOR_ENERGY_REASON
                .ENERGY_QUALIFIED;


    const electricalEnergy =
        calculatedEnergyMetric(
            energyKwh,
            reason,
            {

                rawPowerUnit:
                    resolvedPowerUnit,

                powerSampleCount:
                    powerSeries
                        .points
                        .length,

                integrableIntervals:
                    integration
                        .integrableIntervals,

                integratedHours:
                    integration
                        .integratedHours,

                longGapIntervals:
                    integration
                        .longGapIntervals,

                incompletePhaseSets:
                    powerSeries
                        .incompletePhaseSets,

                zeroPowerIntervals:
                    integration
                        .zeroPowerIntervals,

                negativePowerIntervals:
                    integration
                        .negativePowerIntervals,
            },
            partial
        );


    return {

        family:
            "GENERATOR_ENERGY",

        status:
            electricalEnergy
                .status,

        reportingWindow,

        metrics: {

            electricalEnergy,

            contributionPercent:
                unavailableMetric(
                    "QUALIFIED_DENOMINATOR_REQUIRED"
                ),
        },

        source: {

            powerSource:
                powerSeries
                    .source,

            mode:
                powerSeries
                    .mode,

            deviceInstance:
                deviceSelection
                    .deviceInstance,

            powerUnit:
                resolvedPowerUnit,
        },

        evidence: {

            powerEvidenceQualified:
                true,

            powerUnitQualified:
                true,

            sourcePriorityApplied:
                true,

            totalAndPhaseSourcesCombined:
                false,

            phaseFamiliesCombined:
                false,

            negativePowerClamped:
                false,
        },

        boundaries: {

            missingPowerMeansZero:
                false,

            zeroPowerMeansUnavailable:
                false,

            positivePowerDefinesRuntime:
                false,

            generatorEnergyEqualsRuntime:
                false,

            generatorEnergyEqualsFuel:
                false,

            contributionPercentAutomaticallyAvailable:
                false,

            multipleDevicesAutomaticallyCombined:
                false,

            longGapsBridged:
                false,
        },
    };
}


export default {

    GENERATOR_ENERGY_STATUS,

    GENERATOR_ENERGY_REASON,

    GENERATOR_POWER_UNIT,

    DEFAULT_GENERATOR_ENERGY_CONFIG,

    calculateGeneratorElectricalEnergy,
};