// services/engineering/gridSourceStateService.js

import {
    GRID_ACTIVE_SOURCE,
    activeSourceCodeToName,
} from "./gridAttributeMap.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6C
| Grid Source-State Qualification Engine
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Convert qualified attr471 telemetry into temporally bounded source-state
| intervals.
|
| Supported states:
|
|   GRID
|   GENERATOR
|   SHORE
|   INVERTING
|   NOT_AVAILABLE
|   UNKNOWN
|
| CRITICAL BOUNDARIES
|
| - source identity is NOT grid availability
| - GENERATOR does not automatically mean grid outage
| - INVERTING does not automatically mean service interruption
| - NOT_AVAILABLE does not automatically mean customer outage
| - missing attr471 does not become NOT_AVAILABLE
| - long telemetry gaps are not bridged
| - no endpoint extrapolation
| - no future extrapolation
| - state evidence remains [start,end)
|--------------------------------------------------------------------------
*/


export const GRID_SOURCE_STATE = Object.freeze({
    GRID:
        "GRID",

    GENERATOR:
        "GENERATOR",

    SHORE:
        "SHORE",

    INVERTING:
        "INVERTING",

    NOT_AVAILABLE:
        "NOT_AVAILABLE",

    UNKNOWN:
        "UNKNOWN",
});


export const GRID_SOURCE_STATE_STATUS = Object.freeze({
    CALCULATED:
        "CALCULATED",

    PARTIALLY_CALCULATED:
        "PARTIALLY_CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
});


export const GRID_SOURCE_STATE_REASON = Object.freeze({
    SOURCE_STATE_QUALIFIED:
        "SOURCE_STATE_QUALIFIED",

    SOURCE_STATE_PARTIAL:
        "SOURCE_STATE_PARTIAL",

    NO_ACTIVE_SOURCE_EVIDENCE:
        "NO_ACTIVE_SOURCE_EVIDENCE",

    INSUFFICIENT_ACTIVE_SOURCE_INTERVALS:
        "INSUFFICIENT_ACTIVE_SOURCE_INTERVALS",

    NO_QUALIFIED_SOURCE_EXPOSURE:
        "NO_QUALIFIED_SOURCE_EXPOSURE",

    MULTIPLE_SOURCE_DEVICES_AMBIGUOUS:
        "MULTIPLE_SOURCE_DEVICES_AMBIGUOUS",

    SELECTED_SOURCE_DEVICE_NOT_FOUND:
        "SELECTED_SOURCE_DEVICE_NOT_FOUND",
});


export const DEFAULT_GRID_SOURCE_STATE_CONFIG = Object.freeze({
    maxGapMinutes:
        30,
});


/*
|--------------------------------------------------------------------------
| Helpers
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


function finiteNumber(
    value
) {

    /*
     * Do NOT allow JavaScript coercion to convert missing values
     * into valid source codes.
     *
     * Number(null) === 0
     * Number("")   === 0
     *
     * Both would incorrectly turn missing evidence into
     * attr471 code 0 = NOT_AVAILABLE.
     */

    if (
        value ===
            null ||
        value ===
            undefined
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
            .trim()
            .length ===
            0
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

function normalizeDeviceInstance(
    value
) {

    if (
        value ===
            null ||
        value ===
            undefined
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


function telemetryValue(
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


/*
|--------------------------------------------------------------------------
| Source code classification
|--------------------------------------------------------------------------
*/

export function classifyGridSourceState(
    value
) {

    const code =
        finiteNumber(
            value
        );


    if (
        code ===
        null
    ) {

        return GRID_SOURCE_STATE
            .UNKNOWN;
    }


    switch (
        code
    ) {

        case GRID_ACTIVE_SOURCE.GRID:
            return GRID_SOURCE_STATE
                .GRID;


        case GRID_ACTIVE_SOURCE.GENERATOR:
            return GRID_SOURCE_STATE
                .GENERATOR;


        case GRID_ACTIVE_SOURCE.SHORE:
            return GRID_SOURCE_STATE
                .SHORE;


        case GRID_ACTIVE_SOURCE.INVERTING:
            return GRID_SOURCE_STATE
                .INVERTING;


        case GRID_ACTIVE_SOURCE.NOT_AVAILABLE:
            return GRID_SOURCE_STATE
                .NOT_AVAILABLE;


        default:
            return GRID_SOURCE_STATE
                .UNKNOWN;
    }
}


/*
|--------------------------------------------------------------------------
| Relevant attr471 records
|--------------------------------------------------------------------------
*/

function filterSourceRecords({
    records,
    start,
    end,
}) {

    return records
        .filter(
            (
                record
            ) => {

                if (
                    Number(
                        record
                            ?.vrmAttributeId
                    ) !==
                    471
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


                /*
                 * Source-state engine itself uses [start,end).
                 *
                 * A query adapter may retrieve an exact end-boundary sample,
                 * but this pure service does not treat it as exposure.
                 */
                return (
                    timestamp &&
                    timestamp >=
                        start &&
                    timestamp <
                        end
                );
            }
        );
}


/*
|--------------------------------------------------------------------------
| Deduplicate source points
|--------------------------------------------------------------------------
|
| Same device + same timestamp + same value:
|     deduplicate
|
| Same device + same timestamp + conflicting values:
|     discard the ambiguous timestamp entirely
|--------------------------------------------------------------------------
*/

function deduplicateSourceRecords(
    records
) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        const timestamp =
            asDate(
                record
                    ?.timestamp
            );


        if (
            !timestamp
        ) {

            continue;
        }


        const deviceInstance =
            normalizeDeviceInstance(
                record
                    ?.deviceInstance
            );


        const key =
            `${deviceInstance}|${timestamp.toISOString()}`;


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
                        telemetryValue(
                            record
                        )
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

function selectSourceDevice({
    records,
    selectedDeviceInstance = null,
}) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        const deviceInstance =
            normalizeDeviceInstance(
                record
                    ?.deviceInstance
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


        const selectedRecords =
            groups.get(
                selectedKey
            );


        if (
            !selectedRecords
        ) {

            return {
                status:
                    "NOT_FOUND",

                deviceInstance:
                    selectedKey,

                records:
                    [],

                deviceInstances:
                    Array.from(
                        groups.keys()
                    ),
            };
        }


        return {
            status:
                "SELECTED",

            deviceInstance:
                selectedKey,

            records:
                selectedRecords,

            deviceInstances:
                Array.from(
                    groups.keys()
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

            records:
                [],

            deviceInstances:
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

        records:
            selectedRecords,

        deviceInstances: [
            deviceInstance,
        ],
    };
}


/*
|--------------------------------------------------------------------------
| Build qualified source points
|--------------------------------------------------------------------------
*/

function buildSourcePoints(
    records
) {

    return records
        .map(
            (
                record
            ) => {

                const timestamp =
                    asDate(
                        record
                            ?.timestamp
                    );


                const rawCode =
                    telemetryValue(
                        record
                    );


                return {
                    timestamp,

                    rawCode,

                    rawName:
                        activeSourceCodeToName(
                            rawCode
                        ),

                    state:
                        classifyGridSourceState(
                            rawCode
                        ),

                    deviceInstance:
                        normalizeDeviceInstance(
                            record
                                ?.deviceInstance
                        ),
                };
            }
        )
        .filter(
            (
                point
            ) =>
                point.timestamp
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
| Interval construction
|--------------------------------------------------------------------------
|
| Each interval uses the LEFT-HAND source state:
|
|     point[i] -> point[i+1]
|
| Only intervals whose source sample gap <= maxGapMinutes are qualified.
|
| Long gaps are UNKNOWN exposure and are not bridged.
|--------------------------------------------------------------------------
*/

function buildSourceIntervals({
    points,
    start,
    end,
    maxGapMinutes,
}) {

    const intervals =
        [];


    const maxGapMs =
        maxGapMinutes *
        60 *
        1000;


    let qualifiedHours =
        0;


    let unknownHours =
        0;


    let longGapCount =
        0;


    let qualifiedIntervalCount =
        0;


    let unknownStateIntervalCount =
        0;


    if (
        points.length <
        2
    ) {

        return {
            intervals,

            qualifiedHours,

            unknownHours,

            longGapCount,

            qualifiedIntervalCount,

            unknownStateIntervalCount,
        };
    }


    for (
        let index = 0;
        index <
            points.length -
            1;
        index +=
            1
    ) {

        const current =
            points[
                index
            ];


        const next =
            points[
                index +
                1
            ];


        const sourceGapMs =
            next.timestamp -
            current.timestamp;


        if (
            !Number.isFinite(
                sourceGapMs
            ) ||
            sourceGapMs <=
                0
        ) {

            continue;
        }


        const intervalStart =
            new Date(
                Math.max(
                    current
                        .timestamp
                        .getTime(),

                    start
                        .getTime()
                )
            );


        const intervalEnd =
            new Date(
                Math.min(
                    next
                        .timestamp
                        .getTime(),

                    end
                        .getTime()
                )
            );


        const durationMs =
            intervalEnd -
            intervalStart;


        if (
            durationMs <=
            0
        ) {

            continue;
        }


        const durationHours =
            durationMs /
            3_600_000;


        /*
         * Long telemetry gaps are explicitly unqualified.
         */
        if (
            sourceGapMs >
            maxGapMs
        ) {

            intervals.push({
                start:
                    intervalStart,

                end:
                    intervalEnd,

                durationHours,

                state:
                    GRID_SOURCE_STATE
                        .UNKNOWN,

                rawCode:
                    null,

                sourceEvidenceState:
                    current.state,

                qualified:
                    false,

                reason:
                    "LONG_TELEMETRY_GAP",

                sourceGapMinutes:
                    sourceGapMs /
                    60_000,
            });


            unknownHours +=
                durationHours;


            longGapCount +=
                1;


            continue;
        }


        /*
         * Unknown code remains unknown exposure.
         */
        if (
            current.state ===
            GRID_SOURCE_STATE
                .UNKNOWN
        ) {

            intervals.push({
                start:
                    intervalStart,

                end:
                    intervalEnd,

                durationHours,

                state:
                    GRID_SOURCE_STATE
                        .UNKNOWN,

                rawCode:
                    current.rawCode,

                qualified:
                    false,

                reason:
                    "UNKNOWN_SOURCE_CODE",

                sourceGapMinutes:
                    sourceGapMs /
                    60_000,
            });


            unknownHours +=
                durationHours;


            unknownStateIntervalCount +=
                1;


            continue;
        }


        intervals.push({
            start:
                intervalStart,

            end:
                intervalEnd,

            durationHours,

            state:
                current.state,

            rawCode:
                current.rawCode,

            rawName:
                current.rawName,

            qualified:
                true,

            reason:
                "SOURCE_STATE_QUALIFIED",

            sourceGapMinutes:
                sourceGapMs /
                60_000,
        });


        qualifiedHours +=
            durationHours;


        qualifiedIntervalCount +=
            1;
    }


    return {
        intervals,

        qualifiedHours,

        unknownHours,

        longGapCount,

        qualifiedIntervalCount,

        unknownStateIntervalCount,
    };
}


/*
|--------------------------------------------------------------------------
| State exposure aggregation
|--------------------------------------------------------------------------
*/

function aggregateSourceExposure(
    intervals
) {

    const hours =
        {
            GRID:
                0,

            GENERATOR:
                0,

            SHORE:
                0,

            INVERTING:
                0,

            NOT_AVAILABLE:
                0,

            UNKNOWN:
                0,
        };


    for (
        const interval
        of intervals
    ) {

        const duration =
            Number(
                interval
                    ?.durationHours
            );


        if (
            !Number.isFinite(
                duration
            ) ||
            duration <=
                0
        ) {

            continue;
        }


        if (
            interval
                ?.qualified ===
                true &&
            Object.prototype
                .hasOwnProperty
                .call(
                    hours,
                    interval.state
                )
        ) {

            hours[
                interval.state
            ] +=
                duration;
        }


        else {

            hours.UNKNOWN +=
                duration;
        }
    }


    return hours;
}


/*
|--------------------------------------------------------------------------
| Public source-state calculation
|--------------------------------------------------------------------------
*/

export function calculateGridSourceStateAnalytics({
    records = [],
    start,
    end,
    selectedDeviceInstance = null,
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

        throw new Error(
            "A valid [start,end) grid source-state reporting window is required."
        );
    }


    const resolvedConfig =
        {
            ...DEFAULT_GRID_SOURCE_STATE_CONFIG,
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
        maxGapMinutes <=
            0
    ) {

        throw new Error(
            "grid source-state maxGapMinutes must be greater than zero."
        );
    }


    const reportingHours =
        (
            reportingEnd -
            reportingStart
        ) /
        3_600_000;


    const filtered =
        filterSourceRecords({
            records,
            start:
                reportingStart,
            end:
                reportingEnd,
        });


    if (
        filtered.length ===
        0
    ) {

        return {
            family:
                "GRID_SOURCE_STATE",

            status:
                GRID_SOURCE_STATE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_SOURCE_STATE_REASON
                    .NO_ACTIVE_SOURCE_EVIDENCE,

            reportingWindow: {
                start:
                    reportingStart,

                end:
                    reportingEnd,

                semantics:
                    "[start,end)",
            },

            topology: {
                status:
                    "NONE",

                deviceInstance:
                    null,

                deviceInstances:
                    [],
            },

            metrics: {
                reportingHours,

                qualifiedHours:
                    0,

                unknownHours:
                    reportingHours,

                coveragePercent:
                    0,

                exposureHours: {
                    GRID:
                        0,

                    GENERATOR:
                        0,

                    SHORE:
                        0,

                    INVERTING:
                        0,

                    NOT_AVAILABLE:
                        0,

                    UNKNOWN:
                        reportingHours,
                },
            },

            points:
                [],

            intervals:
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

            boundaries: {
                sourceIdentityIsAvailability:
                    false,

                generatorMeansGridOutage:
                    false,

                invertingMeansServiceInterruption:
                    false,

                notAvailableMeansCustomerOutage:
                    false,

                missingMeansNotAvailable:
                    false,

                longGapBridged:
                    false,

                endpointExtrapolated:
                    false,

                futureExtrapolated:
                    false,
            },
        };
    }


    const deduplicated =
        deduplicateSourceRecords(
            filtered
        );


    const topology =
        selectSourceDevice({
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
                "GRID_SOURCE_STATE",

            status:
                GRID_SOURCE_STATE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_SOURCE_STATE_REASON
                    .MULTIPLE_SOURCE_DEVICES_AMBIGUOUS,

            reportingWindow: {
                start:
                    reportingStart,

                end:
                    reportingEnd,

                semantics:
                    "[start,end)",
            },

            topology,

            metrics: {
                reportingHours,

                qualifiedHours:
                    0,

                unknownHours:
                    reportingHours,

                coveragePercent:
                    0,

                exposureHours: {
                    GRID:
                        0,

                    GENERATOR:
                        0,

                    SHORE:
                        0,

                    INVERTING:
                        0,

                    NOT_AVAILABLE:
                        0,

                    UNKNOWN:
                        reportingHours,
                },
            },

            points:
                [],

            intervals:
                [],

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    filtered.length,

                duplicateCount:
                    deduplicated
                        .duplicateCount,

                conflictingDuplicateCount:
                    deduplicated
                        .conflictingDuplicateCount,
            },

            boundaries: {
                sourceIdentityIsAvailability:
                    false,

                generatorMeansGridOutage:
                    false,

                invertingMeansServiceInterruption:
                    false,

                notAvailableMeansCustomerOutage:
                    false,

                missingMeansNotAvailable:
                    false,

                longGapBridged:
                    false,

                endpointExtrapolated:
                    false,

                futureExtrapolated:
                    false,
            },
        };
    }


    if (
        topology.status ===
        "NOT_FOUND"
    ) {

        return {
            family:
                "GRID_SOURCE_STATE",

            status:
                GRID_SOURCE_STATE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_SOURCE_STATE_REASON
                    .SELECTED_SOURCE_DEVICE_NOT_FOUND,

            reportingWindow: {
                start:
                    reportingStart,

                end:
                    reportingEnd,

                semantics:
                    "[start,end)",
            },

            topology,

            metrics: {
                reportingHours,

                qualifiedHours:
                    0,

                unknownHours:
                    reportingHours,

                coveragePercent:
                    0,

                exposureHours: {
                    GRID:
                        0,

                    GENERATOR:
                        0,

                    SHORE:
                        0,

                    INVERTING:
                        0,

                    NOT_AVAILABLE:
                        0,

                    UNKNOWN:
                        reportingHours,
                },
            },

            points:
                [],

            intervals:
                [],

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    filtered.length,

                duplicateCount:
                    deduplicated
                        .duplicateCount,

                conflictingDuplicateCount:
                    deduplicated
                        .conflictingDuplicateCount,
            },

            boundaries: {
                sourceIdentityIsAvailability:
                    false,

                generatorMeansGridOutage:
                    false,

                invertingMeansServiceInterruption:
                    false,

                notAvailableMeansCustomerOutage:
                    false,

                missingMeansNotAvailable:
                    false,

                longGapBridged:
                    false,

                endpointExtrapolated:
                    false,

                futureExtrapolated:
                    false,
            },
        };
    }


    const points =
        buildSourcePoints(
            topology.records
        );


    if (
        points.length <
        2
    ) {

        return {
            family:
                "GRID_SOURCE_STATE",

            status:
                GRID_SOURCE_STATE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_SOURCE_STATE_REASON
                    .INSUFFICIENT_ACTIVE_SOURCE_INTERVALS,

            reportingWindow: {
                start:
                    reportingStart,

                end:
                    reportingEnd,

                semantics:
                    "[start,end)",
            },

            topology,

            metrics: {
                reportingHours,

                qualifiedHours:
                    0,

                unknownHours:
                    reportingHours,

                coveragePercent:
                    0,

                exposureHours: {
                    GRID:
                        0,

                    GENERATOR:
                        0,

                    SHORE:
                        0,

                    INVERTING:
                        0,

                    NOT_AVAILABLE:
                        0,

                    UNKNOWN:
                        reportingHours,
                },
            },

            points,

            intervals:
                [],

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    filtered.length,

                selectedRecordCount:
                    topology
                        .records
                        .length,

                pointCount:
                    points.length,

                duplicateCount:
                    deduplicated
                        .duplicateCount,

                conflictingDuplicateCount:
                    deduplicated
                        .conflictingDuplicateCount,
            },

            boundaries: {
                sourceIdentityIsAvailability:
                    false,

                generatorMeansGridOutage:
                    false,

                invertingMeansServiceInterruption:
                    false,

                notAvailableMeansCustomerOutage:
                    false,

                missingMeansNotAvailable:
                    false,

                longGapBridged:
                    false,

                endpointExtrapolated:
                    false,

                futureExtrapolated:
                    false,
            },
        };
    }


    const intervalResult =
        buildSourceIntervals({
            points,

            start:
                reportingStart,

            end:
                reportingEnd,

            maxGapMinutes,
        });


    const exposureHours =
        aggregateSourceExposure(
            intervalResult
                .intervals
        );


    if (
        intervalResult
            .qualifiedHours <=
        0
    ) {

        return {
            family:
                "GRID_SOURCE_STATE",

            status:
                GRID_SOURCE_STATE_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_SOURCE_STATE_REASON
                    .NO_QUALIFIED_SOURCE_EXPOSURE,

            reportingWindow: {
                start:
                    reportingStart,

                end:
                    reportingEnd,

                semantics:
                    "[start,end)",
            },

            topology,

            metrics: {
                reportingHours,

                qualifiedHours:
                    0,

                unknownHours:
                    reportingHours,

                coveragePercent:
                    0,

                exposureHours,
            },

            points,

            intervals:
                intervalResult
                    .intervals,

            evidence: {
                inputRecordCount:
                    records.length,

                relevantRecordCount:
                    filtered.length,

                selectedRecordCount:
                    topology
                        .records
                        .length,

                pointCount:
                    points.length,

                qualifiedIntervalCount:
                    0,

                longGapCount:
                    intervalResult
                        .longGapCount,

                unknownStateIntervalCount:
                    intervalResult
                        .unknownStateIntervalCount,

                duplicateCount:
                    deduplicated
                        .duplicateCount,

                conflictingDuplicateCount:
                    deduplicated
                        .conflictingDuplicateCount,
            },

            boundaries: {
                sourceIdentityIsAvailability:
                    false,

                generatorMeansGridOutage:
                    false,

                invertingMeansServiceInterruption:
                    false,

                notAvailableMeansCustomerOutage:
                    false,

                missingMeansNotAvailable:
                    false,

                longGapBridged:
                    false,

                endpointExtrapolated:
                    false,

                futureExtrapolated:
                    false,
            },
        };
    }


    const coveragePercent =
        reportingHours >
        0
            ? (
                intervalResult
                    .qualifiedHours /
                reportingHours
            ) *
            100
            : 0;


    const fullyCovered =
        Math.abs(
            intervalResult
                .qualifiedHours -
            reportingHours
        ) <=
        1e-9;


    const status =
        fullyCovered
            ? GRID_SOURCE_STATE_STATUS
                .CALCULATED
            : GRID_SOURCE_STATE_STATUS
                .PARTIALLY_CALCULATED;


    const reason =
        fullyCovered
            ? GRID_SOURCE_STATE_REASON
                .SOURCE_STATE_QUALIFIED
            : GRID_SOURCE_STATE_REASON
                .SOURCE_STATE_PARTIAL;


    return {
        family:
            "GRID_SOURCE_STATE",

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

        topology,

        metrics: {
            reportingHours,

            qualifiedHours:
                intervalResult
                    .qualifiedHours,

            /*
             * Unknown includes both explicitly unknown intervals and all
             * unobserved reporting-window exposure.
             */
            unknownHours:
                Math.max(
                    0,
                    reportingHours -
                    intervalResult
                        .qualifiedHours
                ),

            coveragePercent,

            exposureHours: {
                ...exposureHours,

                UNKNOWN:
                    Math.max(
                        0,
                        reportingHours -
                        intervalResult
                            .qualifiedHours
                    ),
            },
        },

        points,

        intervals:
            intervalResult
                .intervals,

        evidence: {
            inputRecordCount:
                records.length,

            relevantRecordCount:
                filtered.length,

            selectedRecordCount:
                topology
                    .records
                    .length,

            pointCount:
                points.length,

            qualifiedIntervalCount:
                intervalResult
                    .qualifiedIntervalCount,

            longGapCount:
                intervalResult
                    .longGapCount,

            unknownStateIntervalCount:
                intervalResult
                    .unknownStateIntervalCount,

            duplicateCount:
                deduplicated
                    .duplicateCount,

            conflictingDuplicateCount:
                deduplicated
                    .conflictingDuplicateCount,
        },

        boundaries: {
            sourceIdentityIsAvailability:
                false,

            generatorMeansGridOutage:
                false,

            invertingMeansServiceInterruption:
                false,

            notAvailableMeansCustomerOutage:
                false,

            missingMeansNotAvailable:
                false,

            longGapBridged:
                false,

            endpointExtrapolated:
                false,

            futureExtrapolated:
                false,
        },
    };
}


export default {
    GRID_SOURCE_STATE,
    GRID_SOURCE_STATE_STATUS,
    GRID_SOURCE_STATE_REASON,
    DEFAULT_GRID_SOURCE_STATE_CONFIG,
    classifyGridSourceState,
    calculateGridSourceStateAnalytics,
};