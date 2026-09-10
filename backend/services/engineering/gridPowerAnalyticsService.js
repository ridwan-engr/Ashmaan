// services/engineering/gridPowerAnalyticsService.js

import {
    GRID_POWER_SOURCE,
    GRID_POWER_TOPOLOGY_STATUS,
    GRID_POWER_UNIT,
    GRID_POWER_DIRECTION_STATUS,
    selectGridPowerTopology,
    qualifyGridPowerUnit,
} from "./gridPowerTopologyService.js";

import {
    GRID_DIRECT_ALIGNMENT_STATUS,
    calculateDirectGridPowerAlignment,
} from "./gridDirectPowerAlignmentService.js";

import {
    GRID_ACTIVE_INPUT_QUALIFICATION_STATUS,
    calculateActiveInputGridQualification,
} from "./gridActiveInputQualificationService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6D-D
| Pure Grid Power Analytics
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Produce one canonical grid-power analytics result from the already
| validated evidence hierarchy:
|
| 1. Direct grid meter:
|       attrs379 / 380 / 381
|
| 2. GRID-qualified VE.Bus active input:
|       attrs17 / 18 / 19
|
| The two source families are NEVER mixed inside one power series.
|
| This service deliberately DOES NOT:
|
| - calculate grid energy
| - infer import/export direction
| - infer W/kW from magnitude
| - infer outage
| - infer service interruption
| - infer grid availability
| - treat zero power as an outage
| - treat negative power as export
|--------------------------------------------------------------------------
*/


export const GRID_POWER_ANALYTICS_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GRID_POWER_ANALYTICS_REASON =
    Object.freeze({
        DIRECT_GRID_POWER_QUALIFIED:
            "DIRECT_GRID_POWER_QUALIFIED",

        DIRECT_GRID_POWER_PARTIAL:
            "DIRECT_GRID_POWER_PARTIAL",

        ACTIVE_INPUT_GRID_POWER_QUALIFIED:
            "ACTIVE_INPUT_GRID_POWER_QUALIFIED",

        ACTIVE_INPUT_GRID_POWER_PARTIAL:
            "ACTIVE_INPUT_GRID_POWER_PARTIAL",

        NO_GRID_POWER_EVIDENCE:
            "NO_GRID_POWER_EVIDENCE",

        GRID_POWER_TOPOLOGY_AMBIGUOUS:
            "GRID_POWER_TOPOLOGY_AMBIGUOUS",

        DIRECT_GRID_PHASE_ALIGNMENT_UNAVAILABLE:
            "DIRECT_GRID_PHASE_ALIGNMENT_UNAVAILABLE",

        ACTIVE_INPUT_GRID_QUALIFICATION_UNAVAILABLE:
            "ACTIVE_INPUT_GRID_QUALIFICATION_UNAVAILABLE",

        ACTIVE_INPUT_PHASE_ALIGNMENT_UNAVAILABLE:
            "ACTIVE_INPUT_PHASE_ALIGNMENT_UNAVAILABLE",
    });


export const GRID_POWER_SAMPLE_SOURCE =
    Object.freeze({
        DIRECT_GRID_METER:
            "DIRECT_GRID_METER",

        GRID_QUALIFIED_ACTIVE_INPUT:
            "GRID_QUALIFIED_ACTIVE_INPUT",
    });


export const DEFAULT_GRID_POWER_ANALYTICS_CONFIG =
    Object.freeze({
        directAlignmentToleranceSeconds:
            60,

        activeInputAlignmentToleranceSeconds:
            60,
    });


/*
|--------------------------------------------------------------------------
| Date / device helpers
|--------------------------------------------------------------------------
*/

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
| Active-input qualified phase alignment
|--------------------------------------------------------------------------
|
| 8.6D-C attaches GRID semantics to individual attrs17/18/19 samples.
|
| This function performs the next required operation:
|
|   qualified L1 + qualified L2 + qualified L3
|       -> temporally aligned raw total power
|
| A phase sample cannot participate unless 8.6D-C already marked it as
| gridQualified === true.
|--------------------------------------------------------------------------
*/

export function alignGridQualifiedActiveInputPhases({
    qualifiedSamples = [],
    alignmentToleranceSeconds =
        DEFAULT_GRID_POWER_ANALYTICS_CONFIG
            .activeInputAlignmentToleranceSeconds,
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


    const usableSamples =
        qualifiedSamples
            .filter(
                (
                    sample
                ) => {

                    if (
                        sample
                            ?.gridQualified !==
                        true
                    ) {

                        return false;
                    }


                    if (
                        ![
                            "L1",
                            "L2",
                            "L3",
                        ].includes(
                            sample?.phase
                        )
                    ) {

                        return false;
                    }


                    const timestamp =
                        asDate(
                            sample
                                ?.timestamp
                        );


                    if (
                        !timestamp
                    ) {

                        return false;
                    }


                    return Number.isFinite(
                        Number(
                            sample
                                ?.numericValue
                        )
                    );
                }
            )
            .map(
                (
                    sample
                ) => ({
                    ...sample,

                    timestamp:
                        asDate(
                            sample
                                .timestamp
                        ),

                    numericValue:
                        Number(
                            sample
                                .numericValue
                        ),

                    deviceInstance:
                        normalizeDeviceInstance(
                            sample
                                .deviceInstance
                        ),
                })
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.timestamp -
                    b.timestamp
            );


    /*
     * The qualification service should already have isolated one
     * active-input device. Re-check here as a defensive semantic guard.
     */

    const devices =
        new Set(
            usableSamples.map(
                (
                    sample
                ) =>
                    normalizeDeviceInstance(
                        sample
                            .deviceInstance
                    )
            )
        );


    if (
        devices.size >
        1
    ) {

        return {
            ambiguous:
                true,

            deviceInstance:
                null,

            alignedSamples:
                [],

            rejectedSamples:
                usableSamples.map(
                    (
                        sample
                    ) => ({
                        ...sample,

                        rejectionReason:
                            "MULTIPLE_ACTIVE_INPUT_DEVICES",
                    })
                ),
        };
    }


    const queues =
        {
            L1: [],
            L2: [],
            L3: [],
        };


    for (
        const sample
        of usableSamples
    ) {

        queues[
            sample.phase
        ].push(
            sample
        );
    }


    const alignedSamples =
        [];


    const rejectedSamples =
        [];


    while (
        queues.L1.length >
            0 &&
        queues.L2.length >
            0 &&
        queues.L3.length >
            0
    ) {

        const l1 =
            queues.L1[0];


        const l2 =
            queues.L2[0];


        const l3 =
            queues.L3[0];


        const timestamps =
            [
                l1.timestamp.getTime(),
                l2.timestamp.getTime(),
                l3.timestamp.getTime(),
            ];


        const earliestMs =
            Math.min(
                ...timestamps
            );


        const latestMs =
            Math.max(
                ...timestamps
            );


        const spreadMs =
            latestMs -
            earliestMs;


        if (
            spreadMs <=
            toleranceMs
        ) {

            queues.L1.shift();
            queues.L2.shift();
            queues.L3.shift();


            alignedSamples.push({
                timestamp:
                    new Date(
                        latestMs
                    ),

                qualificationTimestamp:
                    new Date(
                        latestMs
                    ),

                earliestPhaseTimestamp:
                    new Date(
                        earliestMs
                    ),

                alignmentSpanSeconds:
                    spreadMs /
                    1000,

                deviceInstance:
                    l1.deviceInstance,

                source:
                    GRID_POWER_SAMPLE_SOURCE
                        .GRID_QUALIFIED_ACTIVE_INPUT,

                sourceState:
                    "GRID",

                gridQualified:
                    true,

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
            });


            continue;
        }


        /*
         * Reject only the earliest observation and attempt to form a
         * later valid triplet.
         */

        const earliestPhase =
            timestamps[0] ===
                earliestMs
                ? "L1"
                : timestamps[1] ===
                    earliestMs
                    ? "L2"
                    : "L3";


        const rejected =
            queues[
                earliestPhase
            ].shift();


        rejectedSamples.push({
            ...rejected,

            rejectionReason:
                "ACTIVE_INPUT_PHASE_ALIGNMENT_TOLERANCE_EXCEEDED",
        });
    }


    /*
     * Any remaining samples cannot form a full three-phase triplet.
     */

    for (
        const phase
        of [
            "L1",
            "L2",
            "L3",
        ]
    ) {

        while (
            queues[
                phase
            ].length >
            0
        ) {

            rejectedSamples.push({
                ...queues[
                    phase
                ].shift(),

                rejectionReason:
                    "NO_COMPLETE_ACTIVE_INPUT_PHASE_TRIPLET",
            });
        }
    }


    alignedSamples.sort(
        (
            a,
            b
        ) =>
            a.timestamp -
            b.timestamp
    );


    rejectedSamples.sort(
        (
            a,
            b
        ) =>
            a.timestamp -
            b.timestamp
    );


    return {
        ambiguous:
            false,

        deviceInstance:
            devices.size ===
            1
                ? Array.from(
                    devices
                )[0]
                : null,

        alignedSamples,

        rejectedSamples,
    };
}


/*
|--------------------------------------------------------------------------
| Canonical direct-grid sample conversion
|--------------------------------------------------------------------------
*/

function canonicalizeDirectSamples(
    samples = []
) {

    return samples.map(
        (
            sample
        ) => ({
            timestamp:
                sample.timestamp,

            qualificationTimestamp:
                sample
                    .qualificationTimestamp,

            earliestPhaseTimestamp:
                sample
                    .earliestPhaseTimestamp,

            alignmentSpanSeconds:
                sample
                    .alignmentSpanSeconds,

            deviceInstance:
                sample
                    .deviceInstance,

            source:
                GRID_POWER_SAMPLE_SOURCE
                    .DIRECT_GRID_METER,

            sourceState:
                null,

            gridQualified:
                true,

            phases: {
                ...sample.phases,
            },

            phaseTimestamps: {
                ...sample
                    .phaseTimestamps,
            },

            phaseAttributes: {
                ...sample
                    .phaseAttributes,
            },

            totalRawPower:
                sample
                    .totalRawPower,

            phaseCount:
                3,

            complete:
                true,
        })
    );
}


/*
|--------------------------------------------------------------------------
| Unit helper
|--------------------------------------------------------------------------
*/

function resolvePowerUnit(
    records = []
) {

    const result =
        qualifyGridPowerUnit(
            records
        );


    return {
        status:
            result.status,

        unit:
            result.unit,

        observedUnits:
            result
                .observedUnits,
    };
}


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

function buildSemantics() {

    return {
        sourceFamiliesMixed:
            false,

        directGridHasPriority:
            true,

        directGridRequiresAttr471:
            false,

        activeInputRequiresAttr471Grid:
            true,

        missingPhaseAssumedZero:
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

        importExportDirectionEstablished:
            false,

        powerUnitRequiresEvidence:
            true,

        magnitudeUsedToInferUnit:
            false,

        energyEstablished:
            false,

        outageEstablished:
            false,

        serviceInterruptionEstablished:
            false,

        gridAvailabilityEstablished:
            false,

        servedLoadUsedAsGridPower:
            false,

        attr35UsedAsSourceIdentity:
            false,

        attr1664UsedAsSourceIdentity:
            false,
    };
}


/*
|--------------------------------------------------------------------------
| Unavailable-result helper
|--------------------------------------------------------------------------
*/

function unavailableResult({
    reason,
    topology = null,
    source =
        GRID_POWER_SOURCE
            .NONE,
    powerUnit = null,
    evidence = {},
    diagnostics = {},
}) {

    return {
        family:
            "GRID_POWER_ANALYTICS",

        status:
            GRID_POWER_ANALYTICS_STATUS
                .UNAVAILABLE,

        reason,

        source,

        topology,

        power: {
            samples:
                [],

            sampleCount:
                0,

            unit:
                powerUnit?.unit ??
                GRID_POWER_UNIT
                    .UNRESOLVED,

            unitStatus:
                powerUnit?.status ??
                "UNRESOLVED",

            directionStatus:
                GRID_POWER_DIRECTION_STATUS
                    .UNRESOLVED,
        },

        evidence,

        diagnostics,

        semantics:
            buildSemantics(),
    };
}


/*
|--------------------------------------------------------------------------
| Public pure grid-power analytics
|--------------------------------------------------------------------------
*/

export function calculateGridPowerAnalytics({
    records = [],
    sourceStateIntervals = [],
    config = {},
} = {}) {

    const resolvedConfig =
        {
            ...DEFAULT_GRID_POWER_ANALYTICS_CONFIG,
            ...config,
        };


    /*
     * --------------------------------------------------------------
     * 1. Determine which evidence family owns this analytics result.
     * --------------------------------------------------------------
     */

    const topology =
        selectGridPowerTopology({
            records,
        });


    /*
     * --------------------------------------------------------------
     * No usable topology
     * --------------------------------------------------------------
     */

    if (
        topology.status ===
        GRID_POWER_TOPOLOGY_STATUS
            .UNAVAILABLE &&
        topology.source ===
        GRID_POWER_SOURCE
            .NONE
    ) {

        return unavailableResult({
            reason:
                GRID_POWER_ANALYTICS_REASON
                    .NO_GRID_POWER_EVIDENCE,

            topology,

            source:
                GRID_POWER_SOURCE
                    .NONE,

            evidence: {
                inputRecordCount:
                    records.length,
            },
        });
    }


    /*
     * --------------------------------------------------------------
     * Ambiguous topology
     * --------------------------------------------------------------
     */

    if (
        topology.status ===
        GRID_POWER_TOPOLOGY_STATUS
            .AMBIGUOUS
    ) {

        return unavailableResult({
            reason:
                GRID_POWER_ANALYTICS_REASON
                    .GRID_POWER_TOPOLOGY_AMBIGUOUS,

            topology,

            source:
                topology.source,

            evidence: {
                inputRecordCount:
                    records.length,

                topologyEvidence:
                    topology.evidence,
            },
        });
    }


    /*
     * ==============================================================
     * PATH A
     * DIRECT GRID METER 379 / 380 / 381
     * ==============================================================
     */

    if (
        topology.source ===
        GRID_POWER_SOURCE
            .DIRECT_GRID_METER
    ) {

        const directAlignment =
            calculateDirectGridPowerAlignment({
                records:
                    topology.records,

                selectedDeviceInstance:
                    topology
                        .topology
                        ?.selectedDeviceInstance,

                config: {
                    alignmentToleranceSeconds:
                        resolvedConfig
                            .directAlignmentToleranceSeconds,
                },
            });


        const unit =
            resolvePowerUnit(
                topology.records
            );


        /*
         * A higher-priority direct-grid topology was selected.
         *
         * If its phase alignment is unusable we DO NOT silently switch
         * to the lower-priority active-input family.
         */

        if (
            directAlignment.status ===
            GRID_DIRECT_ALIGNMENT_STATUS
                .UNAVAILABLE ||
            directAlignment
                .alignedSamples
                .length ===
            0
        ) {

            return unavailableResult({
                reason:
                    GRID_POWER_ANALYTICS_REASON
                        .DIRECT_GRID_PHASE_ALIGNMENT_UNAVAILABLE,

                topology,

                source:
                    GRID_POWER_SOURCE
                        .DIRECT_GRID_METER,

                powerUnit:
                    unit,

                evidence: {
                    inputRecordCount:
                        records.length,

                    selectedSourceRecordCount:
                        topology
                            .records
                            .length,

                    directAlignmentEvidence:
                        directAlignment
                            .evidence,
                },

                diagnostics: {
                    directAlignmentStatus:
                        directAlignment
                            .status,

                    directAlignmentReason:
                        directAlignment
                            .reason,

                    fallbackToActiveInput:
                        false,
                },
            });
        }


        const samples =
            canonicalizeDirectSamples(
                directAlignment
                    .alignedSamples
            );


        const partial =
            directAlignment.status ===
            GRID_DIRECT_ALIGNMENT_STATUS
                .PARTIALLY_CALCULATED;


        return {
            family:
                "GRID_POWER_ANALYTICS",

            status:
                partial
                    ? GRID_POWER_ANALYTICS_STATUS
                        .PARTIALLY_CALCULATED
                    : GRID_POWER_ANALYTICS_STATUS
                        .CALCULATED,

            reason:
                partial
                    ? GRID_POWER_ANALYTICS_REASON
                        .DIRECT_GRID_POWER_PARTIAL
                    : GRID_POWER_ANALYTICS_REASON
                        .DIRECT_GRID_POWER_QUALIFIED,

            source:
                GRID_POWER_SOURCE
                    .DIRECT_GRID_METER,

            topology,

            power: {
                samples,

                sampleCount:
                    samples.length,

                unit:
                    unit.unit,

                unitStatus:
                    unit.status,

                directionStatus:
                    GRID_POWER_DIRECTION_STATUS
                        .UNRESOLVED,
            },

            evidence: {
                inputRecordCount:
                    records.length,

                selectedSourceRecordCount:
                    topology
                        .records
                        .length,

                alignedSampleCount:
                    samples.length,

                rejectedPhaseSampleCount:
                    directAlignment
                        .rejectedSamples
                        .length,

                topologyEvidence:
                    topology.evidence,

                directAlignmentEvidence:
                    directAlignment
                        .evidence,
            },

            diagnostics: {
                sourcePriority:
                    1,

                sourceIdentityRequired:
                    false,

                fallbackToActiveInput:
                    false,

                directAlignmentStatus:
                    directAlignment
                        .status,

                directAlignmentReason:
                    directAlignment
                        .reason,
            },

            semantics:
                buildSemantics(),
        };
    }


    /*
     * ==============================================================
     * PATH B
     * GRID-QUALIFIED ACTIVE INPUT 17 / 18 / 19
     * ==============================================================
     */

    if (
        topology.source ===
        GRID_POWER_SOURCE
            .ACTIVE_INPUT_CONDITIONAL
    ) {

        const activeQualification =
            calculateActiveInputGridQualification({
                records:
                    topology.records,

                sourceStateIntervals,

                selectedDeviceInstance:
                    topology
                        .topology
                        ?.selectedDeviceInstance,
            });


        const unit =
            resolvePowerUnit(
                topology.records
            );


        if (
            activeQualification.status ===
            GRID_ACTIVE_INPUT_QUALIFICATION_STATUS
                .UNAVAILABLE ||
            activeQualification
                .qualifiedSamples
                .length ===
            0
        ) {

            return unavailableResult({
                reason:
                    GRID_POWER_ANALYTICS_REASON
                        .ACTIVE_INPUT_GRID_QUALIFICATION_UNAVAILABLE,

                topology,

                source:
                    GRID_POWER_SOURCE
                        .ACTIVE_INPUT_CONDITIONAL,

                powerUnit:
                    unit,

                evidence: {
                    inputRecordCount:
                        records.length,

                    selectedSourceRecordCount:
                        topology
                            .records
                            .length,

                    activeQualificationEvidence:
                        activeQualification
                            .evidence,
                },

                diagnostics: {
                    activeQualificationStatus:
                        activeQualification
                            .status,

                    activeQualificationReason:
                        activeQualification
                            .reason,
                },
            });
        }


        /*
         * Only samples that 8.6D-C already proved occurred during
         * qualified GRID exposure are allowed into phase alignment.
         */

        const activeAlignment =
            alignGridQualifiedActiveInputPhases({
                qualifiedSamples:
                    activeQualification
                        .qualifiedSamples,

                alignmentToleranceSeconds:
                    resolvedConfig
                        .activeInputAlignmentToleranceSeconds,
            });


        if (
            activeAlignment
                .ambiguous ===
                true ||
            activeAlignment
                .alignedSamples
                .length ===
            0
        ) {

            return unavailableResult({
                reason:
                    GRID_POWER_ANALYTICS_REASON
                        .ACTIVE_INPUT_PHASE_ALIGNMENT_UNAVAILABLE,

                topology,

                source:
                    GRID_POWER_SOURCE
                        .ACTIVE_INPUT_CONDITIONAL,

                powerUnit:
                    unit,

                evidence: {
                    inputRecordCount:
                        records.length,

                    gridQualifiedPhaseSampleCount:
                        activeQualification
                            .qualifiedSamples
                            .length,

                    rejectedGridQualificationCount:
                        activeQualification
                            .rejectedSamples
                            .length,

                    rejectedPhaseAlignmentCount:
                        activeAlignment
                            .rejectedSamples
                            .length,
                },

                diagnostics: {
                    activeQualificationStatus:
                        activeQualification
                            .status,

                    activeQualificationReason:
                        activeQualification
                            .reason,

                    phaseAlignmentAmbiguous:
                        activeAlignment
                            .ambiguous,
                },
            });
        }


        /*
         * Overall result is partial when either:
         *
         * - some active-input observations failed GRID qualification, or
         * - some GRID-qualified observations failed phase alignment.
         */

        const partial =
            activeQualification.status ===
                GRID_ACTIVE_INPUT_QUALIFICATION_STATUS
                    .PARTIALLY_CALCULATED ||
            activeAlignment
                .rejectedSamples
                .length >
            0;


        const samples =
            activeAlignment
                .alignedSamples;


        return {
            family:
                "GRID_POWER_ANALYTICS",

            status:
                partial
                    ? GRID_POWER_ANALYTICS_STATUS
                        .PARTIALLY_CALCULATED
                    : GRID_POWER_ANALYTICS_STATUS
                        .CALCULATED,

            reason:
                partial
                    ? GRID_POWER_ANALYTICS_REASON
                        .ACTIVE_INPUT_GRID_POWER_PARTIAL
                    : GRID_POWER_ANALYTICS_REASON
                        .ACTIVE_INPUT_GRID_POWER_QUALIFIED,

            source:
                GRID_POWER_SOURCE
                    .ACTIVE_INPUT_CONDITIONAL,

            topology,

            power: {
                samples,

                sampleCount:
                    samples.length,

                unit:
                    unit.unit,

                unitStatus:
                    unit.status,

                directionStatus:
                    GRID_POWER_DIRECTION_STATUS
                        .UNRESOLVED,
            },

            evidence: {
                inputRecordCount:
                    records.length,

                selectedSourceRecordCount:
                    topology
                        .records
                        .length,

                gridQualifiedPhaseSampleCount:
                    activeQualification
                        .qualifiedSamples
                        .length,

                rejectedGridQualificationCount:
                    activeQualification
                        .rejectedSamples
                        .length,

                alignedSampleCount:
                    samples.length,

                rejectedPhaseAlignmentCount:
                    activeAlignment
                        .rejectedSamples
                        .length,

                topologyEvidence:
                    topology.evidence,

                activeQualificationEvidence:
                    activeQualification
                        .evidence,
            },

            diagnostics: {
                sourcePriority:
                    2,

                sourceIdentityRequired:
                    true,

                requiredSourceState:
                    "GRID",

                activeQualificationStatus:
                    activeQualification
                        .status,

                activeQualificationReason:
                    activeQualification
                        .reason,

                activeInputDeviceInstance:
                    activeAlignment
                        .deviceInstance,
            },

            semantics:
                buildSemantics(),
        };
    }


    /*
     * Conservative final guard.
     */

    return unavailableResult({
        reason:
            GRID_POWER_ANALYTICS_REASON
                .NO_GRID_POWER_EVIDENCE,

        topology,

        source:
            topology.source,

        evidence: {
            inputRecordCount:
                records.length,
        },
    });
}


export default {
    GRID_POWER_ANALYTICS_STATUS,
    GRID_POWER_ANALYTICS_REASON,
    GRID_POWER_SAMPLE_SOURCE,
    DEFAULT_GRID_POWER_ANALYTICS_CONFIG,
    alignGridQualifiedActiveInputPhases,
    calculateGridPowerAnalytics,
};