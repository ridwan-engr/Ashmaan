// services/engineering/gridDirectPowerAlignmentService.js

import {
    GRID_DIRECT_POWER_ATTRIBUTES,
} from "./gridAttributeMap.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6D-B
| Direct Grid-Meter Phase Alignment
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Align direct grid-meter phase-power evidence:
|
|   attr379 -> L1
|   attr380 -> L2
|   attr381 -> L3
|
| before phase summation.
|
| This service deliberately DOES NOT:
|
| - infer W or kW
| - infer import/export direction
| - calculate grid energy
| - infer outage
| - infer grid availability
| - use attr471
| - use VE.Bus active-input attrs17/18/19
| - fill a missing phase with zero
| - sum across different devices
|--------------------------------------------------------------------------
*/


export const GRID_DIRECT_POWER_PHASE = Object.freeze({
    L1: "L1",
    L2: "L2",
    L3: "L3",
});


export const GRID_DIRECT_POWER_ATTRIBUTE_PHASE = Object.freeze({
    379: GRID_DIRECT_POWER_PHASE.L1,
    380: GRID_DIRECT_POWER_PHASE.L2,
    381: GRID_DIRECT_POWER_PHASE.L3,
});


export const GRID_DIRECT_ALIGNMENT_STATUS = Object.freeze({
    CALCULATED: "CALCULATED",
    PARTIALLY_CALCULATED: "PARTIALLY_CALCULATED",
    UNAVAILABLE: "UNAVAILABLE",
});


export const GRID_DIRECT_ALIGNMENT_REASON = Object.freeze({
    PHASE_ALIGNMENT_QUALIFIED:
        "PHASE_ALIGNMENT_QUALIFIED",

    PHASE_ALIGNMENT_PARTIAL:
        "PHASE_ALIGNMENT_PARTIAL",

    NO_DIRECT_GRID_POWER_EVIDENCE:
        "NO_DIRECT_GRID_POWER_EVIDENCE",

    INCOMPLETE_PHASE_FAMILY:
        "INCOMPLETE_PHASE_FAMILY",

    NO_ALIGNED_THREE_PHASE_SAMPLES:
        "NO_ALIGNED_THREE_PHASE_SAMPLES",

    MULTIPLE_GRID_METERS_AMBIGUOUS:
        "MULTIPLE_GRID_METERS_AMBIGUOUS",

    SELECTED_GRID_METER_NOT_FOUND:
        "SELECTED_GRID_METER_NOT_FOUND",
});


export const DEFAULT_GRID_DIRECT_ALIGNMENT_CONFIG =
    Object.freeze({
        alignmentToleranceSeconds: 60,
    });


/*
|--------------------------------------------------------------------------
| Numeric helpers
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
        typeof value === "boolean"
    ) {

        return null;
    }


    if (
        typeof value === "string" &&
        value.trim() === ""
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


function telemetryNumericValue(
    record
) {

    const numericValue =
        finiteNumber(
            record?.numericValue
        );


    if (
        numericValue !== null
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
| Direct-grid record normalization
|--------------------------------------------------------------------------
*/

export function normalizeDirectGridPowerRecords(
    records = []
) {

    const allowedAttributes =
        new Set(
            GRID_DIRECT_POWER_ATTRIBUTES
        );


    return records
        .filter(
            (
                record
            ) => {

                const attributeId =
                    Number(
                        record?.vrmAttributeId
                    );


                if (
                    !allowedAttributes.has(
                        attributeId
                    )
                ) {

                    return false;
                }


                if (
                    record?.quality !== undefined &&
                    record?.quality !== "VALID"
                ) {

                    return false;
                }


                if (
                    record?.aggregationLevel !== undefined &&
                    record?.aggregationLevel !== "RAW"
                ) {

                    return false;
                }


                const timestamp =
                    asDate(
                        record?.timestamp
                    );


                if (
                    !timestamp
                ) {

                    return false;
                }


                return (
                    telemetryNumericValue(
                        record
                    ) !== null
                );
            }
        )
        .map(
            (
                record
            ) => {

                const attributeId =
                    Number(
                        record.vrmAttributeId
                    );


                return {
                    ...record,

                    timestamp:
                        asDate(
                            record.timestamp
                        ),

                    vrmAttributeId:
                        attributeId,

                    phase:
                        GRID_DIRECT_POWER_ATTRIBUTE_PHASE[
                            attributeId
                        ],

                    numericValue:
                        telemetryNumericValue(
                            record
                        ),

                    deviceInstance:
                        normalizeDeviceInstance(
                            record.deviceInstance
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
|   device + phase + timestamp + same numeric value
|
| -> safe duplicate: retain one
|
| Same:
|   device + phase + timestamp + conflicting numeric values
|
| -> ambiguous: discard that phase timestamp completely
|--------------------------------------------------------------------------
*/

export function deduplicateDirectGridPowerRecords(
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
                    record.deviceInstance
                ),
                record.vrmAttributeId,
                record.timestamp.toISOString(),
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
            group.length === 1
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
                        record.numericValue
                )
            );


        if (
            values.size === 1
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
| Device topology selection
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
                record.deviceInstance
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


function observedPhaseSet(
    records
) {

    return new Set(
        records.map(
            (
                record
            ) =>
                record.phase
        )
    );
}


function hasCompletePhaseFamily(
    records
) {

    const phases =
        observedPhaseSet(
            records
        );


    return (
        phases.has(
            GRID_DIRECT_POWER_PHASE.L1
        ) &&
        phases.has(
            GRID_DIRECT_POWER_PHASE.L2
        ) &&
        phases.has(
            GRID_DIRECT_POWER_PHASE.L3
        )
    );
}


function selectGridMeterDevice({
    records,
    selectedDeviceInstance = null,
}) {

    const groups =
        groupByDevice(
            records
        );


    if (
        selectedDeviceInstance !== null &&
        selectedDeviceInstance !== undefined
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
        groups.size === 0
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


    /*
     * Only devices containing the complete phase family qualify as
     * candidates for three-phase total-power alignment.
     */

    const completeDevices =
        [];


    for (
        const [
            deviceInstance,
            deviceRecords,
        ]
        of groups.entries()
    ) {

        if (
            hasCompletePhaseFamily(
                deviceRecords
            )
        ) {

            completeDevices.push({
                deviceInstance,
                records:
                    deviceRecords,
            });
        }
    }


    if (
        completeDevices.length > 1
    ) {

        return {
            status:
                "AMBIGUOUS",

            deviceInstance:
                null,

            deviceInstances:
                completeDevices.map(
                    (
                        item
                    ) =>
                        item.deviceInstance
                ),

            records:
                [],
        };
    }


    if (
        completeDevices.length === 1
    ) {

        return {
            status:
                "SELECTED",

            deviceInstance:
                completeDevices[0]
                    .deviceInstance,

            deviceInstances:
                Array.from(
                    groups.keys()
                ),

            records:
                completeDevices[0]
                    .records,
        };
    }


    /*
     * There is telemetry, but no device owns all L1/L2/L3 evidence.
     */

    if (
        groups.size === 1
    ) {

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
                "INCOMPLETE",

            deviceInstance,

            deviceInstances: [
                deviceInstance,
            ],

            records:
                deviceRecords,
        };
    }


    return {
        status:
            "INCOMPLETE",

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


/*
|--------------------------------------------------------------------------
| Phase queues
|--------------------------------------------------------------------------
*/

function buildPhaseQueues(
    records
) {

    const queues =
        {
            L1: [],
            L2: [],
            L3: [],
        };


    for (
        const record
        of records
    ) {

        if (
            queues[
                record.phase
            ]
        ) {

            queues[
                record.phase
            ]
                .push(
                    record
                );
        }
    }


    for (
        const phase
        of Object.keys(
            queues
        )
    ) {

        queues[
            phase
        ].sort(
            (
                a,
                b
            ) =>
                a.timestamp -
                b.timestamp
        );
    }


    return queues;
}


/*
|--------------------------------------------------------------------------
| Three-phase temporal alignment
|--------------------------------------------------------------------------
|
| Algorithm:
|
| - inspect the earliest remaining sample from L1/L2/L3
| - if max(timestamp)-min(timestamp) <= tolerance:
|       align and consume all three
|
| - otherwise:
|       discard ONLY the earliest phase sample as temporally unaligned,
|       then try again
|
| This avoids fixed-clock-bucket boundary errors.
|
| Example:
|
|   L1 00:00:59
|   L2 00:01:00
|   L3 00:01:01
|
| with tolerance = 60 s
|
| -> valid alignment, despite crossing a minute boundary.
|--------------------------------------------------------------------------
*/

export function alignDirectGridPowerPhases({
    records = [],
    alignmentToleranceSeconds =
        DEFAULT_GRID_DIRECT_ALIGNMENT_CONFIG
            .alignmentToleranceSeconds,
} = {}) {

    const tolerance =
        Number(
            alignmentToleranceSeconds
        );


    if (
        !Number.isFinite(
            tolerance
        ) ||
        tolerance < 0
    ) {

        throw new Error(
            "alignmentToleranceSeconds must be a finite number >= 0."
        );
    }


    const toleranceMs =
        tolerance *
        1000;


    const queues =
        buildPhaseQueues(
            records
        );


    const aligned =
        [];


    const rejected =
        [];


    while (
        queues.L1.length > 0 &&
        queues.L2.length > 0 &&
        queues.L3.length > 0
    ) {

        const current =
            {
                L1:
                    queues.L1[0],

                L2:
                    queues.L2[0],

                L3:
                    queues.L3[0],
            };


        const timestamps =
            [
                current.L1.timestamp.getTime(),
                current.L2.timestamp.getTime(),
                current.L3.timestamp.getTime(),
            ];


        const earliestMs =
            Math.min(
                ...timestamps
            );


        const latestMs =
            Math.max(
                ...timestamps
            );


        const alignmentSpanMs =
            latestMs -
            earliestMs;


        if (
            alignmentSpanMs <=
            toleranceMs
        ) {

            const l1 =
                queues.L1.shift();


            const l2 =
                queues.L2.shift();


            const l3 =
                queues.L3.shift();


            /*
             * We use the latest phase timestamp as the qualification
             * timestamp because by then all three phase measurements
             * have actually been observed.
             */

            const qualificationTimestamp =
                new Date(
                    Math.max(
                        l1.timestamp.getTime(),
                        l2.timestamp.getTime(),
                        l3.timestamp.getTime()
                    )
                );


            const earliestTimestamp =
                new Date(
                    Math.min(
                        l1.timestamp.getTime(),
                        l2.timestamp.getTime(),
                        l3.timestamp.getTime()
                    )
                );


            aligned.push({
                timestamp:
                    qualificationTimestamp,

                qualificationTimestamp,

                earliestPhaseTimestamp:
                    earliestTimestamp,

                alignmentSpanSeconds:
                    alignmentSpanMs /
                    1000,

                deviceInstance:
                    l1.deviceInstance,

                phases: {
                    L1:
                        l1.numericValue,

                    L2:
                        l2.numericValue,

                    L3:
                        l3.numericValue,
                },

                phaseTimestamps: {
                    L1:
                        l1.timestamp,

                    L2:
                        l2.timestamp,

                    L3:
                        l3.timestamp,
                },

                phaseAttributes: {
                    L1:
                        l1.vrmAttributeId,

                    L2:
                        l2.vrmAttributeId,

                    L3:
                        l3.vrmAttributeId,
                },

                totalRawPower:
                    l1.numericValue +
                    l2.numericValue +
                    l3.numericValue,

                phaseCount:
                    3,

                complete:
                    true,

                qualified:
                    true,
            });


            continue;
        }


        /*
         * Temporal spread is too wide.
         *
         * Reject only the earliest sample and continue searching.
         */

        const earliestPhase =
            timestamps[0] === earliestMs
                ? GRID_DIRECT_POWER_PHASE.L1
                : timestamps[1] === earliestMs
                    ? GRID_DIRECT_POWER_PHASE.L2
                    : GRID_DIRECT_POWER_PHASE.L3;


        const rejectedRecord =
            queues[
                earliestPhase
            ]
                .shift();


        rejected.push({
            ...rejectedRecord,

            rejectionReason:
                "PHASE_ALIGNMENT_TOLERANCE_EXCEEDED",
        });
    }


    /*
     * Anything remaining can no longer form a complete triplet.
     */

    for (
        const phase
        of [
            GRID_DIRECT_POWER_PHASE.L1,
            GRID_DIRECT_POWER_PHASE.L2,
            GRID_DIRECT_POWER_PHASE.L3,
        ]
    ) {

        while (
            queues[
                phase
            ].length > 0
        ) {

            rejected.push({
                ...queues[
                    phase
                ].shift(),

                rejectionReason:
                    "NO_COMPLETE_PHASE_TRIPLET",
            });
        }
    }


    aligned.sort(
        (
            a,
            b
        ) =>
            a.timestamp -
            b.timestamp
    );


    rejected.sort(
        (
            a,
            b
        ) =>
            a.timestamp -
            b.timestamp
    );


    return {
        aligned,

        rejected,
    };
}


/*
|--------------------------------------------------------------------------
| Public direct-grid phase alignment analytics
|--------------------------------------------------------------------------
*/

export function calculateDirectGridPowerAlignment({
    records = [],
    selectedDeviceInstance = null,
    config = {},
} = {}) {

    const resolvedConfig =
        {
            ...DEFAULT_GRID_DIRECT_ALIGNMENT_CONFIG,
            ...config,
        };


    const normalized =
        normalizeDirectGridPowerRecords(
            records
        );


    if (
        normalized.length === 0
    ) {

        return {
            family:
                "DIRECT_GRID_POWER_ALIGNMENT",

            status:
                GRID_DIRECT_ALIGNMENT_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_DIRECT_ALIGNMENT_REASON
                    .NO_DIRECT_GRID_POWER_EVIDENCE,

            topology: {
                status:
                    "NONE",

                deviceInstance:
                    null,

                deviceInstances:
                    [],
            },

            metrics: {
                alignedSampleCount:
                    0,

                rejectedSampleCount:
                    0,

                completePhaseFamily:
                    false,

                alignmentCoveragePercent:
                    0,
            },

            alignedSamples:
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
            },

            semantics:
                buildSemantics(),
        };
    }


    const deduplicated =
        deduplicateDirectGridPowerRecords(
            normalized
        );


    const topology =
        selectGridMeterDevice({
            records:
                deduplicated.records,

            selectedDeviceInstance,
        });


    if (
        topology.status ===
        "AMBIGUOUS"
    ) {

        return {
            family:
                "DIRECT_GRID_POWER_ALIGNMENT",

            status:
                GRID_DIRECT_ALIGNMENT_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_DIRECT_ALIGNMENT_REASON
                    .MULTIPLE_GRID_METERS_AMBIGUOUS,

            topology,

            metrics: {
                alignedSampleCount:
                    0,

                rejectedSampleCount:
                    0,

                completePhaseFamily:
                    false,

                alignmentCoveragePercent:
                    0,
            },

            alignedSamples:
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
                "DIRECT_GRID_POWER_ALIGNMENT",

            status:
                GRID_DIRECT_ALIGNMENT_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_DIRECT_ALIGNMENT_REASON
                    .SELECTED_GRID_METER_NOT_FOUND,

            topology,

            metrics: {
                alignedSampleCount:
                    0,

                rejectedSampleCount:
                    0,

                completePhaseFamily:
                    false,

                alignmentCoveragePercent:
                    0,
            },

            alignedSamples:
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
            },

            semantics:
                buildSemantics(),
        };
    }


    if (
        topology.status ===
        "INCOMPLETE"
    ) {

        return {
            family:
                "DIRECT_GRID_POWER_ALIGNMENT",

            status:
                GRID_DIRECT_ALIGNMENT_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_DIRECT_ALIGNMENT_REASON
                    .INCOMPLETE_PHASE_FAMILY,

            topology,

            metrics: {
                alignedSampleCount:
                    0,

                rejectedSampleCount:
                    topology.records.length,

                completePhaseFamily:
                    false,

                alignmentCoveragePercent:
                    0,
            },

            alignedSamples:
                [],

            rejectedSamples:
                topology.records,

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    normalized.length,

                selectedRecordCount:
                    topology.records.length,

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
            },

            semantics:
                buildSemantics(),
        };
    }


    if (
        !hasCompletePhaseFamily(
            topology.records
        )
    ) {

        return {
            family:
                "DIRECT_GRID_POWER_ALIGNMENT",

            status:
                GRID_DIRECT_ALIGNMENT_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_DIRECT_ALIGNMENT_REASON
                    .INCOMPLETE_PHASE_FAMILY,

            topology,

            metrics: {
                alignedSampleCount:
                    0,

                rejectedSampleCount:
                    topology.records.length,

                completePhaseFamily:
                    false,

                alignmentCoveragePercent:
                    0,
            },

            alignedSamples:
                [],

            rejectedSamples:
                topology.records,

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    normalized.length,

                selectedRecordCount:
                    topology.records.length,

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
            },

            semantics:
                buildSemantics(),
        };
    }


    const alignment =
        alignDirectGridPowerPhases({
            records:
                topology.records,

            alignmentToleranceSeconds:
                resolvedConfig
                    .alignmentToleranceSeconds,
        });


    if (
        alignment.aligned.length === 0
    ) {

        return {
            family:
                "DIRECT_GRID_POWER_ALIGNMENT",

            status:
                GRID_DIRECT_ALIGNMENT_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_DIRECT_ALIGNMENT_REASON
                    .NO_ALIGNED_THREE_PHASE_SAMPLES,

            topology,

            metrics: {
                alignedSampleCount:
                    0,

                rejectedSampleCount:
                    alignment
                        .rejected
                        .length,

                completePhaseFamily:
                    true,

                alignmentCoveragePercent:
                    0,
            },

            alignedSamples:
                [],

            rejectedSamples:
                alignment.rejected,

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    normalized.length,

                selectedRecordCount:
                    topology.records.length,

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
            },

            semantics:
                buildSemantics(),
        };
    }


    /*
     * Each aligned sample consumes 3 phase records.
     */

    const alignedPhaseRecordCount =
        alignment.aligned.length *
        3;


    const consideredRecordCount =
        alignedPhaseRecordCount +
        alignment.rejected.length;


    const alignmentCoveragePercent =
        consideredRecordCount > 0
            ? (
                alignedPhaseRecordCount /
                consideredRecordCount
            ) *
            100
            : 0;


    const fullyAligned =
        alignment.rejected.length ===
        0;


    return {
        family:
            "DIRECT_GRID_POWER_ALIGNMENT",

        status:
            fullyAligned
                ? GRID_DIRECT_ALIGNMENT_STATUS
                    .CALCULATED
                : GRID_DIRECT_ALIGNMENT_STATUS
                    .PARTIALLY_CALCULATED,

        reason:
            fullyAligned
                ? GRID_DIRECT_ALIGNMENT_REASON
                    .PHASE_ALIGNMENT_QUALIFIED
                : GRID_DIRECT_ALIGNMENT_REASON
                    .PHASE_ALIGNMENT_PARTIAL,

        topology,

        config: {
            alignmentToleranceSeconds:
                Number(
                    resolvedConfig
                        .alignmentToleranceSeconds
                ),
        },

        metrics: {
            alignedSampleCount:
                alignment.aligned.length,

            alignedPhaseRecordCount,

            rejectedSampleCount:
                alignment.rejected.length,

            completePhaseFamily:
                true,

            alignmentCoveragePercent,
        },

        alignedSamples:
            alignment.aligned,

        rejectedSamples:
            alignment.rejected,

        evidence: {
            inputRecordCount:
                records.length,

            relevantRecordCount:
                normalized.length,

            selectedRecordCount:
                topology.records.length,

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
        },

        semantics:
            buildSemantics(),
    };
}


/*
|--------------------------------------------------------------------------
| Engineering semantic boundaries
|--------------------------------------------------------------------------
*/

function buildSemantics() {

    return {
        directGridMeasurement:
            true,

        sourceIdentityRequired:
            false,

        phasesRemainExplicit:
            true,

        missingPhaseAssumedZero:
            false,

        crossDeviceSummationAllowed:
            false,

        negativePowerPreserved:
            true,

        negativeMeansExport:
            false,

        zeroMeansOutage:
            false,

        powerUnitEstablished:
            false,

        energyEstablished:
            false,

        outageEstablished:
            false,

        availabilityEstablished:
            false,

        missingTimestampBridged:
            false,
    };
}


export default {
    GRID_DIRECT_POWER_PHASE,
    GRID_DIRECT_POWER_ATTRIBUTE_PHASE,
    GRID_DIRECT_ALIGNMENT_STATUS,
    GRID_DIRECT_ALIGNMENT_REASON,
    DEFAULT_GRID_DIRECT_ALIGNMENT_CONFIG,
    normalizeDirectGridPowerRecords,
    deduplicateDirectGridPowerRecords,
    alignDirectGridPowerPhases,
    calculateDirectGridPowerAlignment,
};