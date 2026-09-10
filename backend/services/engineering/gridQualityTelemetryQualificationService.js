// services/engineering/gridQualityTelemetryQualificationService.js

import {
    GRID_SOURCE_STATE,
} from "./gridSourceStateService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6G-A
| Grid-Quality Telemetry Qualification
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Qualify VE.Bus active-input electrical measurements as GRID-associated
| quality telemetry only when their timestamp lies inside independently
| qualified attr471 = GRID source-state exposure.
|
| Candidate attributes:
|
| Voltage:
|   8  -> L1
|   9  -> L2
|   10 -> L3
|
| Current:
|   11 -> L1
|   12 -> L2
|   13 -> L3
|
| Frequency:
|   14 -> L1
|   15 -> L2
|   16 -> L3
|
| These measurements belong to the ACTIVE AC INPUT. They are therefore
| not inherently GRID measurements.
|
| This phase deliberately DOES NOT:
|
| - calculate voltage quality
| - calculate frequency quality
| - calculate current imbalance
| - calculate voltage unbalance
| - infer V / A / Hz from magnitude
| - use attr35 as GRID identity
| - use attr1664 as GRID identity
| - infer outage
| - infer availability
| - infer service interruption
|--------------------------------------------------------------------------
*/


export const GRID_QUALITY_QUANTITY =
    Object.freeze({
        VOLTAGE:
            "VOLTAGE",

        CURRENT:
            "CURRENT",

        FREQUENCY:
            "FREQUENCY",
    });


export const GRID_QUALITY_PHASE =
    Object.freeze({
        L1:
            "L1",

        L2:
            "L2",

        L3:
            "L3",
    });


export const GRID_QUALITY_ATTRIBUTE_MAP =
    Object.freeze({
        8: {
            quantity:
                GRID_QUALITY_QUANTITY
                    .VOLTAGE,

            phase:
                GRID_QUALITY_PHASE
                    .L1,
        },

        9: {
            quantity:
                GRID_QUALITY_QUANTITY
                    .VOLTAGE,

            phase:
                GRID_QUALITY_PHASE
                    .L2,
        },

        10: {
            quantity:
                GRID_QUALITY_QUANTITY
                    .VOLTAGE,

            phase:
                GRID_QUALITY_PHASE
                    .L3,
        },

        11: {
            quantity:
                GRID_QUALITY_QUANTITY
                    .CURRENT,

            phase:
                GRID_QUALITY_PHASE
                    .L1,
        },

        12: {
            quantity:
                GRID_QUALITY_QUANTITY
                    .CURRENT,

            phase:
                GRID_QUALITY_PHASE
                    .L2,
        },

        13: {
            quantity:
                GRID_QUALITY_QUANTITY
                    .CURRENT,

            phase:
                GRID_QUALITY_PHASE
                    .L3,
        },

        14: {
            quantity:
                GRID_QUALITY_QUANTITY
                    .FREQUENCY,

            phase:
                GRID_QUALITY_PHASE
                    .L1,
        },

        15: {
            quantity:
                GRID_QUALITY_QUANTITY
                    .FREQUENCY,

            phase:
                GRID_QUALITY_PHASE
                    .L2,
        },

        16: {
            quantity:
                GRID_QUALITY_QUANTITY
                    .FREQUENCY,

            phase:
                GRID_QUALITY_PHASE
                    .L3,
        },
    });


export const GRID_QUALITY_TELEMETRY_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GRID_QUALITY_TELEMETRY_REASON =
    Object.freeze({
        ALL_QUALITY_SAMPLES_GRID_QUALIFIED:
            "ALL_QUALITY_SAMPLES_GRID_QUALIFIED",

        QUALITY_SAMPLES_PARTIALLY_GRID_QUALIFIED:
            "QUALITY_SAMPLES_PARTIALLY_GRID_QUALIFIED",

        NO_QUALITY_TELEMETRY:
            "NO_QUALITY_TELEMETRY",

        NO_SOURCE_STATE_EVIDENCE:
            "NO_SOURCE_STATE_EVIDENCE",

        NO_GRID_QUALIFIED_QUALITY_SAMPLES:
            "NO_GRID_QUALIFIED_QUALITY_SAMPLES",

        MULTIPLE_QUALITY_DEVICES_AMBIGUOUS:
            "MULTIPLE_QUALITY_DEVICES_AMBIGUOUS",

        SELECTED_QUALITY_DEVICE_NOT_FOUND:
            "SELECTED_QUALITY_DEVICE_NOT_FOUND",
    });


export const GRID_QUALITY_REJECTION_REASON =
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
| Helpers
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
        value.trim() ===
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
            record
                ?.numericValue
        );


    if (
        numericValue !==
        null
    ) {

        return numericValue;
    }


    return finiteNumber(
        record
            ?.value
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
| Unit normalization
|--------------------------------------------------------------------------
|
| Units remain evidence-driven.
|
| Attribute semantics establish the physical quantity family, but this
| service will not invent explicit V/A/Hz metadata when stored metadata
| is absent.
|--------------------------------------------------------------------------
*/

function normalizeExplicitUnit(
    record
) {

    const candidates =
        [
            record?.unit,
            record?.formatWithUnit,
        ];


    for (
        const candidate
        of candidates
    ) {

        if (
            candidate === null ||
            candidate === undefined
        ) {

            continue;
        }


        const normalized =
            String(
                candidate
            )
                .trim()
                .toLowerCase();


        if (
            normalized ===
                "v" ||
            normalized ===
                "volt" ||
            normalized ===
                "volts"
        ) {

            return "V";
        }


        if (
            normalized ===
                "a" ||
            normalized ===
                "amp" ||
            normalized ===
                "amps" ||
            normalized ===
                "ampere" ||
            normalized ===
                "amperes"
        ) {

            return "A";
        }


        if (
            normalized ===
                "hz" ||
            normalized ===
                "hertz"
        ) {

            return "Hz";
        }
    }


    return null;
}


/*
|--------------------------------------------------------------------------
| Telemetry normalization
|--------------------------------------------------------------------------
*/

export function normalizeGridQualityTelemetry(
    records = []
) {

    return records
        .map(
            (
                record
            ) => {

                const attributeId =
                    Number(
                        record
                            ?.vrmAttributeId
                    );


                const semantic =
                    GRID_QUALITY_ATTRIBUTE_MAP[
                        attributeId
                    ];


                if (
                    !semantic
                ) {

                    return null;
                }


                if (
                    record
                        ?.quality !==
                        undefined &&
                    record
                        ?.quality !==
                        "VALID"
                ) {

                    return null;
                }


                if (
                    record
                        ?.aggregationLevel !==
                        undefined &&
                    record
                        ?.aggregationLevel !==
                        "RAW"
                ) {

                    return null;
                }


                const timestamp =
                    asDate(
                        record
                            ?.timestamp
                    );


                const numericValue =
                    telemetryNumericValue(
                        record
                    );


                if (
                    !timestamp ||
                    numericValue ===
                        null
                ) {

                    return null;
                }


                return {
                    ...record,

                    timestamp,

                    vrmAttributeId:
                        attributeId,

                    numericValue,

                    quantity:
                        semantic
                            .quantity,

                    phase:
                        semantic
                            .phase,

                    deviceInstance:
                        normalizeDeviceInstance(
                            record
                                ?.deviceInstance
                        ),

                    explicitUnit:
                        normalizeExplicitUnit(
                            record
                        ),
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
| Duplicate handling
|--------------------------------------------------------------------------
*/

export function deduplicateGridQualityTelemetry(
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
                record
                    .deviceInstance,

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


    const deduplicated =
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

            deduplicated.push(
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

            deduplicated.push(
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


    deduplicated.sort(
        (
            a,
            b
        ) =>
            a.timestamp -
            b.timestamp
    );


    return {
        records:
            deduplicated,

        duplicateCount,

        conflictingDuplicateCount,
    };
}


/*
|--------------------------------------------------------------------------
| Source-state interval normalization
|--------------------------------------------------------------------------
*/

export function normalizeGridQualitySourceIntervals(
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
| Resolve source state at one quality sample
|--------------------------------------------------------------------------
*/

export function resolveGridQualitySourceAtTimestamp({
    timestamp,
    sourceStateIntervals = [],
} = {}) {

    const target =
        asDate(
            timestamp
        );


    if (
        !target
    ) {

        return {
            observable:
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
        sourceStateIntervals.filter(
            (
                interval
            ) =>
                target >=
                    interval.start &&
                target <
                    interval.end
        );


    if (
        covering.length ===
        0
    ) {

        return {
            observable:
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
                ) =>
                    interval
                        .qualified ===
                        true
                        ? interval
                            .state
                        : GRID_SOURCE_STATE
                            .UNKNOWN
            )
        );


    if (
        semanticStates.size >
        1
    ) {

        return {
            observable:
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


    return {
        observable:
            true,

        ambiguous:
            false,

        state,

        qualified:
            state !==
            GRID_SOURCE_STATE
                .UNKNOWN,

        interval:
            covering[0],
    };
}


/*
|--------------------------------------------------------------------------
| Rejection mapping
|--------------------------------------------------------------------------
*/

function rejectionReason(
    resolution
) {

    if (
        resolution
            .ambiguous
    ) {

        return GRID_QUALITY_REJECTION_REASON
            .AMBIGUOUS_SOURCE_STATE_COVERAGE;
    }


    if (
        resolution
            .observable !==
        true
    ) {

        return GRID_QUALITY_REJECTION_REASON
            .NO_SOURCE_STATE_COVERAGE;
    }


    switch (
        resolution
            .state
    ) {

        case GRID_SOURCE_STATE
            .GENERATOR:

            return GRID_QUALITY_REJECTION_REASON
                .SOURCE_STATE_GENERATOR;


        case GRID_SOURCE_STATE
            .SHORE:

            return GRID_QUALITY_REJECTION_REASON
                .SOURCE_STATE_SHORE;


        case GRID_SOURCE_STATE
            .INVERTING:

            return GRID_QUALITY_REJECTION_REASON
                .SOURCE_STATE_INVERTING;


        case GRID_SOURCE_STATE
            .NOT_AVAILABLE:

            return GRID_QUALITY_REJECTION_REASON
                .SOURCE_STATE_NOT_AVAILABLE;


        case GRID_SOURCE_STATE
            .UNKNOWN:

        default:

            return GRID_QUALITY_REJECTION_REASON
                .SOURCE_STATE_UNKNOWN;
    }
}


/*
|--------------------------------------------------------------------------
| Device selection
|--------------------------------------------------------------------------
*/

function selectQualityDevice({
    records = [],
    selectedDeviceInstance = null,
} = {}) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        if (
            !groups.has(
                record.deviceInstance
            )
        ) {

            groups.set(
                record.deviceInstance,
                []
            );
        }


        groups
            .get(
                record.deviceInstance
            )
            .push(
                record
            );
    }


    if (
        selectedDeviceInstance !==
            null &&
        selectedDeviceInstance !==
            undefined
    ) {

        const selected =
            normalizeDeviceInstance(
                selectedDeviceInstance
            );


        if (
            !groups.has(
                selected
            )
        ) {

            return {
                status:
                    "NOT_FOUND",

                deviceInstance:
                    selected,

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
                selected,

            deviceInstances:
                Array.from(
                    groups.keys()
                ),

            records:
                groups.get(
                    selected
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
| Qualification
|--------------------------------------------------------------------------
*/

export function qualifyGridQualitySamples({
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
            resolveGridQualitySourceAtTimestamp({
                timestamp:
                    record.timestamp,

                sourceStateIntervals,
            });


        if (
            resolution.observable ===
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
                rejectionReason(
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
| Quantity counts
|--------------------------------------------------------------------------
*/

function countByQuantity(
    samples = []
) {

    return {
        voltage:
            samples.filter(
                (
                    sample
                ) =>
                    sample.quantity ===
                    GRID_QUALITY_QUANTITY
                        .VOLTAGE
            ).length,

        current:
            samples.filter(
                (
                    sample
                ) =>
                    sample.quantity ===
                    GRID_QUALITY_QUANTITY
                        .CURRENT
            ).length,

        frequency:
            samples.filter(
                (
                    sample
                ) =>
                    sample.quantity ===
                    GRID_QUALITY_QUANTITY
                        .FREQUENCY
            ).length,
    };
}


/*
|--------------------------------------------------------------------------
| Semantics
|--------------------------------------------------------------------------
*/

function buildSemantics() {

    return {
        activeInputQualityIsInherentlyGrid:
            false,

        attr471GridQualificationRequired:
            true,

        attr35CanEstablishGrid:
            false,

        attr1664CanEstablishGrid:
            false,

        voltageQuantityIdentityEstablished:
            true,

        currentQuantityIdentityEstablished:
            true,

        frequencyQuantityIdentityEstablished:
            true,

        explicitPhysicalUnitRequiresMetadata:
            true,

        unitInferredFromMagnitude:
            false,

        qualityThresholdsApplied:
            false,

        voltageDeviationCalculated:
            false,

        voltageUnbalanceCalculated:
            false,

        currentUnbalanceCalculated:
            false,

        frequencyDeviationCalculated:
            false,

        outageEstablished:
            false,

        gridAvailabilityEstablished:
            false,

        serviceInterruptionEstablished:
            false,

        zeroVoltageMeansOutage:
            false,

        zeroCurrentMeansOutage:
            false,

        zeroFrequencyMeansOutage:
            false,

        negativeCurrentMeansExport:
            false,

        intervalSemantics:
            "[start,end)",
    };
}


/*
|--------------------------------------------------------------------------
| Public service
|--------------------------------------------------------------------------
*/

export function calculateGridQualityTelemetryQualification({
    records = [],
    sourceStateIntervals = [],
    selectedDeviceInstance = null,
} = {}) {

    const normalized =
        normalizeGridQualityTelemetry(
            records
        );


    if (
        normalized.length ===
        0
    ) {

        return {
            family:
                "GRID_QUALITY_TELEMETRY",

            status:
                GRID_QUALITY_TELEMETRY_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_TELEMETRY_REASON
                    .NO_QUALITY_TELEMETRY,

            qualifiedSamples:
                [],

            rejectedSamples:
                [],

            metrics: {
                inputSampleCount:
                    0,

                qualifiedSampleCount:
                    0,

                rejectedSampleCount:
                    0,

                qualifiedPercent:
                    0,
            },

            semantics:
                buildSemantics(),
        };
    }


    const deduplicated =
        deduplicateGridQualityTelemetry(
            normalized
        );


    const topology =
        selectQualityDevice({
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
                "GRID_QUALITY_TELEMETRY",

            status:
                GRID_QUALITY_TELEMETRY_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_TELEMETRY_REASON
                    .MULTIPLE_QUALITY_DEVICES_AMBIGUOUS,

            topology,

            qualifiedSamples:
                [],

            rejectedSamples:
                [],

            metrics: {
                inputSampleCount:
                    0,

                qualifiedSampleCount:
                    0,

                rejectedSampleCount:
                    0,

                qualifiedPercent:
                    0,
            },

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    normalized.length,

                duplicateCount:
                    deduplicated
                        .duplicateCount,

                conflictingDuplicateCount:
                    deduplicated
                        .conflictingDuplicateCount,
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
                "GRID_QUALITY_TELEMETRY",

            status:
                GRID_QUALITY_TELEMETRY_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_TELEMETRY_REASON
                    .SELECTED_QUALITY_DEVICE_NOT_FOUND,

            topology,

            qualifiedSamples:
                [],

            rejectedSamples:
                [],

            metrics: {
                inputSampleCount:
                    0,

                qualifiedSampleCount:
                    0,

                rejectedSampleCount:
                    0,

                qualifiedPercent:
                    0,
            },

            semantics:
                buildSemantics(),
        };
    }


    const normalizedIntervals =
        normalizeGridQualitySourceIntervals(
            sourceStateIntervals
        );


    if (
        normalizedIntervals.length ===
        0
    ) {

        return {
            family:
                "GRID_QUALITY_TELEMETRY",

            status:
                GRID_QUALITY_TELEMETRY_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_TELEMETRY_REASON
                    .NO_SOURCE_STATE_EVIDENCE,

            topology,

            qualifiedSamples:
                [],

            rejectedSamples:
                topology.records.map(
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
                            GRID_QUALITY_REJECTION_REASON
                                .NO_SOURCE_STATE_COVERAGE,
                    })
                ),

            metrics: {
                inputSampleCount:
                    topology
                        .records
                        .length,

                qualifiedSampleCount:
                    0,

                rejectedSampleCount:
                    topology
                        .records
                        .length,

                qualifiedPercent:
                    0,
            },

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    normalized.length,

                selectedRecordCount:
                    topology
                        .records
                        .length,

                sourceIntervalCount:
                    0,
            },

            semantics:
                buildSemantics(),
        };
    }


    const qualification =
        qualifyGridQualitySamples({
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


    const qualifiedPercent =
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
                "GRID_QUALITY_TELEMETRY",

            status:
                GRID_QUALITY_TELEMETRY_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_QUALITY_TELEMETRY_REASON
                    .NO_GRID_QUALIFIED_QUALITY_SAMPLES,

            topology,

            qualifiedSamples:
                [],

            rejectedSamples:
                qualification
                    .rejectedSamples,

            metrics: {
                inputSampleCount:
                    totalSamples,

                qualifiedSampleCount:
                    0,

                rejectedSampleCount:
                    rejectedCount,

                qualifiedPercent:
                    0,

                qualifiedByQuantity:
                    countByQuantity(
                        []
                    ),
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
            "GRID_QUALITY_TELEMETRY",

        status:
            fullyQualified
                ? GRID_QUALITY_TELEMETRY_STATUS
                    .CALCULATED
                : GRID_QUALITY_TELEMETRY_STATUS
                    .PARTIALLY_CALCULATED,

        reason:
            fullyQualified
                ? GRID_QUALITY_TELEMETRY_REASON
                    .ALL_QUALITY_SAMPLES_GRID_QUALIFIED
                : GRID_QUALITY_TELEMETRY_REASON
                    .QUALITY_SAMPLES_PARTIALLY_GRID_QUALIFIED,

        topology,

        qualifiedSamples:
            qualification
                .qualifiedSamples,

        rejectedSamples:
            qualification
                .rejectedSamples,

        metrics: {
            inputSampleCount:
                totalSamples,

            qualifiedSampleCount:
                qualifiedCount,

            rejectedSampleCount:
                rejectedCount,

            qualifiedPercent,

            qualifiedByQuantity:
                countByQuantity(
                    qualification
                        .qualifiedSamples
                ),
        },

        evidence: {
            inputRecordCount:
                records.length,

            relevantRecordCount:
                normalized.length,

            selectedRecordCount:
                totalSamples,

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
    GRID_QUALITY_QUANTITY,
    GRID_QUALITY_PHASE,
    GRID_QUALITY_ATTRIBUTE_MAP,
    GRID_QUALITY_TELEMETRY_STATUS,
    GRID_QUALITY_TELEMETRY_REASON,
    GRID_QUALITY_REJECTION_REASON,
    normalizeGridQualityTelemetry,
    deduplicateGridQualityTelemetry,
    normalizeGridQualitySourceIntervals,
    resolveGridQualitySourceAtTimestamp,
    qualifyGridQualitySamples,
    calculateGridQualityTelemetryQualification,
};