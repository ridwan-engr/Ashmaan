// services/engineering/gridActiveInputQualificationService.js

import {
    GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES,
} from "./gridAttributeMap.js";

import {
    GRID_SOURCE_STATE,
} from "./gridSourceStateService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6D-C
| Active-Input ↔ GRID Temporal Qualification
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Qualify VE.Bus active-input power telemetry as grid-associated evidence
| ONLY when the measurement timestamp lies inside an independently
| qualified GRID source-state interval produced by Phase 8.6C.
|
| Active-input power:
|
|   attr17 -> Active input L1 power
|   attr18 -> Active input L2 power
|   attr19 -> Active input L3 power
|
| These measurements describe whichever AC input is active.
|
| Therefore:
|
|   attr17/18/19 + qualified attr471 GRID interval
|       -> grid-associated active-input power evidence
|
|   attr17/18/19 + GENERATOR / SHORE / INVERTING /
|                  NOT_AVAILABLE / UNKNOWN / missing state
|       -> NOT grid-qualified
|
| This service deliberately DOES NOT:
|
| - sum phases
| - infer W or kW
| - infer import/export direction
| - calculate energy
| - infer outage
| - infer service interruption
| - infer grid availability
| - use attr35 as source identity
| - use attr1664 as source identity
|--------------------------------------------------------------------------
*/


export const GRID_ACTIVE_INPUT_PHASE =
    Object.freeze({
        L1: "L1",
        L2: "L2",
        L3: "L3",
    });


export const GRID_ACTIVE_INPUT_ATTRIBUTE_PHASE =
    Object.freeze({
        17:
            GRID_ACTIVE_INPUT_PHASE
                .L1,

        18:
            GRID_ACTIVE_INPUT_PHASE
                .L2,

        19:
            GRID_ACTIVE_INPUT_PHASE
                .L3,
    });


export const GRID_ACTIVE_INPUT_QUALIFICATION_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GRID_ACTIVE_INPUT_QUALIFICATION_REASON =
    Object.freeze({
        ALL_ACTIVE_INPUT_SAMPLES_GRID_QUALIFIED:
            "ALL_ACTIVE_INPUT_SAMPLES_GRID_QUALIFIED",

        ACTIVE_INPUT_SAMPLES_PARTIALLY_GRID_QUALIFIED:
            "ACTIVE_INPUT_SAMPLES_PARTIALLY_GRID_QUALIFIED",

        NO_ACTIVE_INPUT_POWER_EVIDENCE:
            "NO_ACTIVE_INPUT_POWER_EVIDENCE",

        NO_GRID_QUALIFIED_ACTIVE_INPUT_SAMPLES:
            "NO_GRID_QUALIFIED_ACTIVE_INPUT_SAMPLES",

        NO_SOURCE_STATE_EVIDENCE:
            "NO_SOURCE_STATE_EVIDENCE",

        MULTIPLE_ACTIVE_INPUT_DEVICES_AMBIGUOUS:
            "MULTIPLE_ACTIVE_INPUT_DEVICES_AMBIGUOUS",

        SELECTED_ACTIVE_INPUT_DEVICE_NOT_FOUND:
            "SELECTED_ACTIVE_INPUT_DEVICE_NOT_FOUND",
    });


export const GRID_ACTIVE_INPUT_REJECTION_REASON =
    Object.freeze({
        SOURCE_STATE_GENERATOR:
            "SOURCE_STATE_GENERATOR",

        SOURCE_STATE_SHORE:
            "SOURCE_STATE_SHORE",

        SOURCE_STATE_INVERTING:
            "SOURCE_STATE_INVERTING",

        SOURCE_STATE_NOT_AVAILABLE:
            "SOURCE_STATE_NOT_AVAILABLE",

        SOURCE_STATE_UNKNOWN:
            "SOURCE_STATE_UNKNOWN",

        NO_SOURCE_STATE_COVERAGE:
            "NO_SOURCE_STATE_COVERAGE",

        AMBIGUOUS_SOURCE_STATE_COVERAGE:
            "AMBIGUOUS_SOURCE_STATE_COVERAGE",
    });


/*
|--------------------------------------------------------------------------
| Basic helpers
|--------------------------------------------------------------------------
*/

function finiteNumber(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;
    }


    if (
        typeof value ===
        "boolean"
    ) {

        return null;
    }


    if (
        typeof value ===
            "string" &&
        value
            .trim() ===
            ""
    ) {

        return null;
    }


    const numeric =
        typeof value ===
            "number"
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


function telemetryNumericValue(
    record
) {

    const numericValue =
        finiteNumber(
            record?.numericValue
        );


    if (
        numericValue !==
        null
    ) {

        return numericValue;
    }


    return finiteNumber(
        record?.value
    );
}


function asDate(
    value
) {

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


function normalizeDeviceInstance(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "NO_DEVICE_INSTANCE";
    }


    const normalized =
        String(
            value
        )
            .trim();


    return normalized ||
        "NO_DEVICE_INSTANCE";
}


/*
|--------------------------------------------------------------------------
| Active-input telemetry normalization
|--------------------------------------------------------------------------
*/

export function normalizeActiveInputPowerRecords(
    records = []
) {

    const allowedAttributes =
        new Set(
            GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES
        );


    return records
        .filter(
            (
                record
            ) => {

                const attributeId =
                    Number(
                        record
                            ?.vrmAttributeId
                    );


                if (
                    !allowedAttributes.has(
                        attributeId
                    )
                ) {

                    return false;
                }


                if (
                    record
                        ?.quality !==
                        undefined &&
                    record
                        ?.quality !==
                        "VALID"
                ) {

                    return false;
                }


                if (
                    record
                        ?.aggregationLevel !==
                        undefined &&
                    record
                        ?.aggregationLevel !==
                        "RAW"
                ) {

                    return false;
                }


                const timestamp =
                    asDate(
                        record
                            ?.timestamp
                    );


                if (
                    !timestamp
                ) {

                    return false;
                }


                return (
                    telemetryNumericValue(
                        record
                    ) !==
                    null
                );
            }
        )
        .map(
            (
                record
            ) => {

                const attributeId =
                    Number(
                        record
                            .vrmAttributeId
                    );


                return {
                    ...record,

                    timestamp:
                        asDate(
                            record
                                .timestamp
                        ),

                    vrmAttributeId:
                        attributeId,

                    phase:
                        GRID_ACTIVE_INPUT_ATTRIBUTE_PHASE[
                            attributeId
                        ],

                    numericValue:
                        telemetryNumericValue(
                            record
                        ),

                    deviceInstance:
                        normalizeDeviceInstance(
                            record
                                .deviceInstance
                        ),
                };
            }
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
| Duplicate handling
|--------------------------------------------------------------------------
|
| Same:
|   device + attribute + timestamp + same value
|
| -> retain one
|
| Same:
|   device + attribute + timestamp + conflicting values
|
| -> remove the entire ambiguous timestamp key
|--------------------------------------------------------------------------
*/

export function deduplicateActiveInputPowerRecords(
    records = []
) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        const key =
            [
                normalizeDeviceInstance(
                    record
                        .deviceInstance
                ),

                record
                    .vrmAttributeId,

                record
                    .timestamp
                    .toISOString(),
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
                record
            );
    }


    const output =
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
            group.length ===
            1
        ) {

            output.push(
                group[0]
            );

            continue;
        }


        const values =
            new Set(
                group.map(
                    (
                        record
                    ) =>
                        record
                            .numericValue
                )
            );


        if (
            values.size ===
            1
        ) {

            output.push(
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


    output.sort(
        (
            a,
            b
        ) =>
            a.timestamp -
            b.timestamp
    );


    return {
        records:
            output,

        duplicateCount,

        conflictingDuplicateCount,
    };
}


/*
|--------------------------------------------------------------------------
| Active-input device topology
|--------------------------------------------------------------------------
*/

function groupByDevice(
    records
) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        const deviceInstance =
            normalizeDeviceInstance(
                record
                    .deviceInstance
            );


        if (
            !groups.has(
                deviceInstance
            )
        ) {

            groups.set(
                deviceInstance,
                []
            );
        }


        groups
            .get(
                deviceInstance
            )
            .push(
                record
            );
    }


    return groups;
}


function selectActiveInputDevice({
    records,
    selectedDeviceInstance = null,
}) {

    const groups =
        groupByDevice(
            records
        );


    if (
        selectedDeviceInstance !==
            null &&
        selectedDeviceInstance !==
            undefined
    ) {

        const selectedKey =
            normalizeDeviceInstance(
                selectedDeviceInstance
            );


        if (
            !groups.has(
                selectedKey
            )
        ) {

            return {
                status:
                    "NOT_FOUND",

                deviceInstance:
                    selectedKey,

                deviceInstances:
                    Array.from(
                        groups.keys()
                    ),

                records:
                    [],
            };
        }


        return {
            status:
                "SELECTED",

            deviceInstance:
                selectedKey,

            deviceInstances:
                Array.from(
                    groups.keys()
                ),

            records:
                groups.get(
                    selectedKey
                ),
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

            deviceInstances:
                [],

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

            deviceInstances:
                Array.from(
                    groups.keys()
                ),

            records:
                [],
        };
    }


    const [
        [
            deviceInstance,
            selectedRecords,
        ],
    ] =
        Array.from(
            groups.entries()
        );


    return {
        status:
            "SELECTED",

        deviceInstance,

        deviceInstances: [
            deviceInstance,
        ],

        records:
            selectedRecords,
    };
}


/*
|--------------------------------------------------------------------------
| Source-state interval normalization
|--------------------------------------------------------------------------
|
| This accepts the interval output of Phase 8.6C.
|
| Only intervals with valid timestamps are considered.
|
| Exact semantics remain:
|
|     [start,end)
|--------------------------------------------------------------------------
*/

export function normalizeSourceStateIntervals(
    intervals = []
) {

    return intervals
        .map(
            (
                interval
            ) => {

                const start =
                    asDate(
                        interval
                            ?.start
                    );


                const end =
                    asDate(
                        interval
                            ?.end
                    );


                if (
                    !start ||
                    !end ||
                    start >=
                        end
                ) {

                    return null;
                }


                const state =
                    Object.values(
                        GRID_SOURCE_STATE
                    ).includes(
                        interval
                            ?.state
                    )
                        ? interval
                            .state
                        : GRID_SOURCE_STATE
                            .UNKNOWN;


                return {
                    ...interval,

                    start,

                    end,

                    state,

                    qualified:
                        interval
                            ?.qualified ===
                            true,
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
                a.start -
                b.start
        );
}


/*
|--------------------------------------------------------------------------
| Source-state lookup
|--------------------------------------------------------------------------
|
| A measurement belongs to an interval only when:
|
|     timestamp >= interval.start
|     timestamp <  interval.end
|
| If overlapping intervals disagree on source state, qualification is
| rejected conservatively rather than selecting an arbitrary interval.
|--------------------------------------------------------------------------
*/

export function resolveSourceStateAtTimestamp({
    timestamp,
    intervals = [],
} = {}) {

    const measurementTimestamp =
        asDate(
            timestamp
        );


    if (
        !measurementTimestamp
    ) {

        return {
            resolved:
                false,

            ambiguous:
                false,

            state:
                GRID_SOURCE_STATE
                    .UNKNOWN,

            qualified:
                false,

            interval:
                null,
        };
    }


    const covering =
        intervals.filter(
            (
                interval
            ) =>
                measurementTimestamp >=
                    interval.start &&
                measurementTimestamp <
                    interval.end
        );


    if (
        covering.length ===
        0
    ) {

        return {
            resolved:
                false,

            ambiguous:
                false,

            state:
                GRID_SOURCE_STATE
                    .UNKNOWN,

            qualified:
                false,

            interval:
                null,
        };
    }


    const semanticStates =
        new Set(
            covering.map(
                (
                    interval
                ) => {

                    if (
                        interval
                            .qualified !==
                            true
                    ) {

                        return GRID_SOURCE_STATE
                            .UNKNOWN;
                    }


                    return interval
                        .state;
                }
            )
        );


    if (
        semanticStates.size >
        1
    ) {

        return {
            resolved:
                false,

            ambiguous:
                true,

            state:
                GRID_SOURCE_STATE
                    .UNKNOWN,

            qualified:
                false,

            interval:
                null,
        };
    }


    const [
        state,
    ] =
        Array.from(
            semanticStates
        );


    const representative =
        covering[0];


    return {
        resolved:
            true,

        ambiguous:
            false,

        state,

        qualified:
            representative
                .qualified ===
                true &&
            state !==
                GRID_SOURCE_STATE
                    .UNKNOWN,

        interval:
            representative,
    };
}


/*
|--------------------------------------------------------------------------
| Rejection mapping
|--------------------------------------------------------------------------
*/

function rejectionReasonForSourceResolution(
    resolution
) {

    if (
        resolution
            .ambiguous ===
            true
    ) {

        return GRID_ACTIVE_INPUT_REJECTION_REASON
            .AMBIGUOUS_SOURCE_STATE_COVERAGE;
    }


    if (
        resolution
            .resolved !==
            true
    ) {

        return GRID_ACTIVE_INPUT_REJECTION_REASON
            .NO_SOURCE_STATE_COVERAGE;
    }


    switch (
        resolution
            .state
    ) {

        case GRID_SOURCE_STATE
            .GENERATOR:

            return GRID_ACTIVE_INPUT_REJECTION_REASON
                .SOURCE_STATE_GENERATOR;


        case GRID_SOURCE_STATE
            .SHORE:

            return GRID_ACTIVE_INPUT_REJECTION_REASON
                .SOURCE_STATE_SHORE;


        case GRID_SOURCE_STATE
            .INVERTING:

            return GRID_ACTIVE_INPUT_REJECTION_REASON
                .SOURCE_STATE_INVERTING;


        case GRID_SOURCE_STATE
            .NOT_AVAILABLE:

            return GRID_ACTIVE_INPUT_REJECTION_REASON
                .SOURCE_STATE_NOT_AVAILABLE;


        case GRID_SOURCE_STATE
            .UNKNOWN:

        default:

            return GRID_ACTIVE_INPUT_REJECTION_REASON
                .SOURCE_STATE_UNKNOWN;
    }
}


/*
|--------------------------------------------------------------------------
| Measurement qualification
|--------------------------------------------------------------------------
*/

export function qualifyActiveInputSamplesAgainstGrid({
    records = [],
    sourceStateIntervals = [],
} = {}) {

    const qualifiedSamples =
        [];


    const rejectedSamples =
        [];


    for (
        const record
        of records
    ) {

        const resolution =
            resolveSourceStateAtTimestamp({
                timestamp:
                    record.timestamp,

                intervals:
                    sourceStateIntervals,
            });


        if (
            resolution.resolved ===
                true &&
            resolution.qualified ===
                true &&
            resolution.state ===
                GRID_SOURCE_STATE
                    .GRID
        ) {

            qualifiedSamples.push({
                ...record,

                gridQualified:
                    true,

                sourceState:
                    GRID_SOURCE_STATE
                        .GRID,

                sourceStateInterval: {
                    start:
                        resolution
                            .interval
                            .start,

                    end:
                        resolution
                            .interval
                            .end,

                    semantics:
                        "[start,end)",
                },
            });


            continue;
        }


        rejectedSamples.push({
            ...record,

            gridQualified:
                false,

            sourceState:
                resolution.state,

            rejectionReason:
                rejectionReasonForSourceResolution(
                    resolution
                ),
        });
    }


    return {
        qualifiedSamples,

        rejectedSamples,
    };
}


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

function buildSemantics() {

    return {
        activeInputIsInherentlyGrid:
            false,

        attr471Required:
            true,

        attr35CanEstablishGrid:
            false,

        attr1664CanEstablishGrid:
            false,

        gridStateRequired:
            true,

        sourceIntervalSemantics:
            "[start,end)",

        phaseSummationPerformed:
            false,

        crossDeviceSummationAllowed:
            false,

        negativePowerPreserved:
            true,

        negativeMeansExport:
            false,

        zeroPowerPreserved:
            true,

        zeroMeansOutage:
            false,

        powerUnitEstablished:
            false,

        energyEstablished:
            false,

        outageEstablished:
            false,

        serviceInterruptionEstablished:
            false,

        gridAvailabilityEstablished:
            false,

        generatorMeansGridOutage:
            false,

        invertingMeansServiceInterruption:
            false,

        notAvailableMeansCustomerOutage:
            false,
    };
}


/*
|--------------------------------------------------------------------------
| Public analytics service
|--------------------------------------------------------------------------
*/

export function calculateActiveInputGridQualification({
    records = [],
    sourceStateIntervals = [],
    selectedDeviceInstance = null,
} = {}) {

    const normalized =
        normalizeActiveInputPowerRecords(
            records
        );


    if (
        normalized.length ===
        0
    ) {

        return {
            family:
                "ACTIVE_INPUT_GRID_QUALIFICATION",

            status:
                GRID_ACTIVE_INPUT_QUALIFICATION_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_ACTIVE_INPUT_QUALIFICATION_REASON
                    .NO_ACTIVE_INPUT_POWER_EVIDENCE,

            topology: {
                status:
                    "NONE",

                deviceInstance:
                    null,

                deviceInstances:
                    [],
            },

            metrics: {
                inputSampleCount:
                    0,

                gridQualifiedSampleCount:
                    0,

                rejectedSampleCount:
                    0,

                gridQualifiedPercent:
                    0,
            },

            qualifiedSamples:
                [],

            rejectedSamples:
                [],

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    0,

                duplicateCount:
                    0,

                conflictingDuplicateCount:
                    0,

                sourceIntervalCount:
                    0,
            },

            semantics:
                buildSemantics(),
        };
    }


    const deduplicated =
        deduplicateActiveInputPowerRecords(
            normalized
        );


    const topology =
        selectActiveInputDevice({
            records:
                deduplicated
                    .records,

            selectedDeviceInstance,
        });


    if (
        topology.status ===
        "AMBIGUOUS"
    ) {

        return {
            family:
                "ACTIVE_INPUT_GRID_QUALIFICATION",

            status:
                GRID_ACTIVE_INPUT_QUALIFICATION_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_ACTIVE_INPUT_QUALIFICATION_REASON
                    .MULTIPLE_ACTIVE_INPUT_DEVICES_AMBIGUOUS,

            topology,

            metrics: {
                inputSampleCount:
                    0,

                gridQualifiedSampleCount:
                    0,

                rejectedSampleCount:
                    0,

                gridQualifiedPercent:
                    0,
            },

            qualifiedSamples:
                [],

            rejectedSamples:
                [],

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    normalized.length,

                deduplicatedRecordCount:
                    deduplicated
                        .records
                        .length,

                duplicateCount:
                    deduplicated
                        .duplicateCount,

                conflictingDuplicateCount:
                    deduplicated
                        .conflictingDuplicateCount,

                sourceIntervalCount:
                    0,
            },

            semantics:
                buildSemantics(),
        };
    }


    if (
        topology.status ===
        "NOT_FOUND"
    ) {

        return {
            family:
                "ACTIVE_INPUT_GRID_QUALIFICATION",

            status:
                GRID_ACTIVE_INPUT_QUALIFICATION_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_ACTIVE_INPUT_QUALIFICATION_REASON
                    .SELECTED_ACTIVE_INPUT_DEVICE_NOT_FOUND,

            topology,

            metrics: {
                inputSampleCount:
                    0,

                gridQualifiedSampleCount:
                    0,

                rejectedSampleCount:
                    0,

                gridQualifiedPercent:
                    0,
            },

            qualifiedSamples:
                [],

            rejectedSamples:
                [],

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    normalized.length,

                deduplicatedRecordCount:
                    deduplicated
                        .records
                        .length,

                duplicateCount:
                    deduplicated
                        .duplicateCount,

                conflictingDuplicateCount:
                    deduplicated
                        .conflictingDuplicateCount,

                sourceIntervalCount:
                    0,
            },

            semantics:
                buildSemantics(),
        };
    }


    const normalizedIntervals =
        normalizeSourceStateIntervals(
            sourceStateIntervals
        );


    if (
        normalizedIntervals.length ===
        0
    ) {

        return {
            family:
                "ACTIVE_INPUT_GRID_QUALIFICATION",

            status:
                GRID_ACTIVE_INPUT_QUALIFICATION_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_ACTIVE_INPUT_QUALIFICATION_REASON
                    .NO_SOURCE_STATE_EVIDENCE,

            topology,

            metrics: {
                inputSampleCount:
                    topology
                        .records
                        .length,

                gridQualifiedSampleCount:
                    0,

                rejectedSampleCount:
                    topology
                        .records
                        .length,

                gridQualifiedPercent:
                    0,
            },

            qualifiedSamples:
                [],

            rejectedSamples:
                topology
                    .records
                    .map(
                        (
                            record
                        ) => ({
                            ...record,

                            gridQualified:
                                false,

                            sourceState:
                                GRID_SOURCE_STATE
                                    .UNKNOWN,

                            rejectionReason:
                                GRID_ACTIVE_INPUT_REJECTION_REASON
                                    .NO_SOURCE_STATE_COVERAGE,
                        })
                    ),

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    normalized.length,

                selectedRecordCount:
                    topology
                        .records
                        .length,

                deduplicatedRecordCount:
                    deduplicated
                        .records
                        .length,

                duplicateCount:
                    deduplicated
                        .duplicateCount,

                conflictingDuplicateCount:
                    deduplicated
                        .conflictingDuplicateCount,

                sourceIntervalCount:
                    0,
            },

            semantics:
                buildSemantics(),
        };
    }


    const qualification =
        qualifyActiveInputSamplesAgainstGrid({
            records:
                topology.records,

            sourceStateIntervals:
                normalizedIntervals,
        });


    const totalSamples =
        topology
            .records
            .length;


    const qualifiedCount =
        qualification
            .qualifiedSamples
            .length;


    const rejectedCount =
        qualification
            .rejectedSamples
            .length;


    const gridQualifiedPercent =
        totalSamples >
        0
            ? (
                qualifiedCount /
                totalSamples
            ) *
            100
            : 0;


    if (
        qualifiedCount ===
        0
    ) {

        return {
            family:
                "ACTIVE_INPUT_GRID_QUALIFICATION",

            status:
                GRID_ACTIVE_INPUT_QUALIFICATION_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_ACTIVE_INPUT_QUALIFICATION_REASON
                    .NO_GRID_QUALIFIED_ACTIVE_INPUT_SAMPLES,

            topology,

            metrics: {
                inputSampleCount:
                    totalSamples,

                gridQualifiedSampleCount:
                    0,

                rejectedSampleCount:
                    rejectedCount,

                gridQualifiedPercent:
                    0,
            },

            qualifiedSamples:
                [],

            rejectedSamples:
                qualification
                    .rejectedSamples,

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    normalized.length,

                selectedRecordCount:
                    totalSamples,

                deduplicatedRecordCount:
                    deduplicated
                        .records
                        .length,

                duplicateCount:
                    deduplicated
                        .duplicateCount,

                conflictingDuplicateCount:
                    deduplicated
                        .conflictingDuplicateCount,

                sourceIntervalCount:
                    normalizedIntervals
                        .length,
            },

            semantics:
                buildSemantics(),
        };
    }


    const fullyQualified =
        qualifiedCount ===
        totalSamples;


    return {
        family:
            "ACTIVE_INPUT_GRID_QUALIFICATION",

        status:
            fullyQualified
                ? GRID_ACTIVE_INPUT_QUALIFICATION_STATUS
                    .CALCULATED
                : GRID_ACTIVE_INPUT_QUALIFICATION_STATUS
                    .PARTIALLY_CALCULATED,

        reason:
            fullyQualified
                ? GRID_ACTIVE_INPUT_QUALIFICATION_REASON
                    .ALL_ACTIVE_INPUT_SAMPLES_GRID_QUALIFIED
                : GRID_ACTIVE_INPUT_QUALIFICATION_REASON
                    .ACTIVE_INPUT_SAMPLES_PARTIALLY_GRID_QUALIFIED,

        topology,

        metrics: {
            inputSampleCount:
                totalSamples,

            gridQualifiedSampleCount:
                qualifiedCount,

            rejectedSampleCount:
                rejectedCount,

            gridQualifiedPercent,
        },

        qualifiedSamples:
            qualification
                .qualifiedSamples,

        rejectedSamples:
            qualification
                .rejectedSamples,

        evidence: {
            inputRecordCount:
                records.length,

            relevantRecordCount:
                normalized.length,

            selectedRecordCount:
                totalSamples,

            deduplicatedRecordCount:
                deduplicated
                    .records
                    .length,

            duplicateCount:
                deduplicated
                    .duplicateCount,

            conflictingDuplicateCount:
                deduplicated
                    .conflictingDuplicateCount,

            sourceIntervalCount:
                normalizedIntervals
                    .length,
        },

        semantics:
            buildSemantics(),
    };
}


export default {
    GRID_ACTIVE_INPUT_PHASE,
    GRID_ACTIVE_INPUT_ATTRIBUTE_PHASE,
    GRID_ACTIVE_INPUT_QUALIFICATION_STATUS,
    GRID_ACTIVE_INPUT_QUALIFICATION_REASON,
    GRID_ACTIVE_INPUT_REJECTION_REASON,
    normalizeActiveInputPowerRecords,
    deduplicateActiveInputPowerRecords,
    normalizeSourceStateIntervals,
    resolveSourceStateAtTimestamp,
    qualifyActiveInputSamplesAgainstGrid,
    calculateActiveInputGridQualification,
};