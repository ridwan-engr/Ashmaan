// services/engineering/generatorStartStopService.js

import {
    GENERATOR_OPERATING_STATE,
    classifyGeneratorStatus416,
} from "./generatorRuntimeStateSemantics.js";


/*
|--------------------------------------------------------------------------
| Phase 8.5D
| Pure Generator Start / Stop Analytics
|--------------------------------------------------------------------------
|
| Qualified source:
|
|   VRM attr 416 — Generator Status
|
| Observed production semantic mapping:
|
|   0 = STOPPED
|   8 = RUNNING
|
| Start:
|
|   STOPPED -> RUNNING
|
| Stop:
|
|   RUNNING -> STOPPED
|
| IMPORTANT:
|
| These are OBSERVED state transitions.
|
| They must not be confused with:
|
| - a lifetime generator start counter
| - an autostart command
| - manual-start configuration
| - active source selection
| - positive generator power
| - generator availability
|
|--------------------------------------------------------------------------
*/


export const GENERATOR_START_STOP_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GENERATOR_START_STOP_REASON =
    Object.freeze({

        TRANSITIONS_QUALIFIED:
            "TRANSITIONS_QUALIFIED",

        TRANSITIONS_PARTIALLY_OBSERVED:
            "TRANSITIONS_PARTIALLY_OBSERVED",

        NO_STATE_EVIDENCE:
            "NO_STATE_EVIDENCE",

        INSUFFICIENT_STATE_SAMPLES:
            "INSUFFICIENT_STATE_SAMPLES",

        NO_QUALIFIED_STATE_TRANSITIONS:
            "NO_QUALIFIED_STATE_TRANSITIONS",

        MULTIPLE_DEVICES_AMBIGUOUS:
            "MULTIPLE_DEVICES_AMBIGUOUS",
    });


export const GENERATOR_TRANSITION_TYPE =
    Object.freeze({

        START:
            "START",

        STOP:
            "STOP",
    });


export const DEFAULT_GENERATOR_START_STOP_CONFIG =
    Object.freeze({

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


function normalizeDeviceInstance(
    value
) {

    return String(
        value ??
        "UNKNOWN"
    );
}


function buildUnavailableMetric(
    reason,
    metadata = {}
) {

    return {

        status:
            GENERATOR_START_STOP_STATUS
                .UNAVAILABLE,

        starts:
            null,

        stops:
            null,

        reason,

        metadata,
    };
}


function buildCalculatedMetric({
    starts,
    stops,
    reason,
    metadata = {},
    partial = false,
}) {

    return {

        status:
            partial
                ? GENERATOR_START_STOP_STATUS
                    .PARTIALLY_CALCULATED
                : GENERATOR_START_STOP_STATUS
                    .CALCULATED,

        starts,

        stops,

        reason,

        metadata,
    };
}


/*
|--------------------------------------------------------------------------
| Reporting-window state records
|--------------------------------------------------------------------------
*/

function filterStateRecords(
    records,
    start,
    end
) {

    return records
        .filter(
            (
                record
            ) => {

                if (
                    Number(
                        record.vrmAttributeId
                    ) !==
                    416
                ) {

                    return false;
                }


                const timestamp =
                    asDate(
                        record.timestamp
                    );


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
| Device grouping
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


function selectDeviceSeries(
    records,
    selectedDeviceInstance = null
) {

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
            seriesRecords,
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
            seriesRecords,
    };
}


/*
|--------------------------------------------------------------------------
| Transition engine
|--------------------------------------------------------------------------
*/

function calculateTransitions({
    records,
    maxGapMinutes,
}) {

    const maxGapMs =
        Number(
            maxGapMinutes
        ) *
        60 *
        1000;


    const points =
        records
            .map(
                (
                    record
                ) => ({

                    timestamp:
                        asDate(
                            record.timestamp
                        ),

                    rawCode:
                        Number(
                            record.numericValue ??
                            record.value
                        ),

                    state:
                        classifyGeneratorStatus416(
                            record.numericValue ??
                            record.value
                        ),
                })
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


    if (
        points.length <
        2
    ) {

        return {

            starts:
                null,

            stops:
                null,

            transitions:
                [],

            qualifiedPairs:
                0,

            unchangedPairs:
                0,

            unknownPairs:
                0,

            longGapPairs:
                0,

            totalPairs:
                Math.max(
                    0,
                    points.length -
                        1
                ),

            reason:
                GENERATOR_START_STOP_REASON
                    .INSUFFICIENT_STATE_SAMPLES,
        };
    }


    let starts =
        0;

    let stops =
        0;

    let qualifiedPairs =
        0;

    let unchangedPairs =
        0;

    let unknownPairs =
        0;

    let longGapPairs =
        0;


    const transitions =
        [];


    for (
        let index = 1;
        index <
            points.length;
        index +=
            1
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


        /*
         * A transition across a long telemetry gap is not qualified.
         */

        if (
            gapMs >
            maxGapMs
        ) {

            longGapPairs +=
                1;

            continue;
        }


        /*
         * Unknown state destroys transition continuity.
         */

        if (
            previous.state ===
                GENERATOR_OPERATING_STATE
                    .UNKNOWN ||
            current.state ===
                GENERATOR_OPERATING_STATE
                    .UNKNOWN
        ) {

            unknownPairs +=
                1;

            continue;
        }


        qualifiedPairs +=
            1;


        /*
         * No change.
         */

        if (
            previous.state ===
            current.state
        ) {

            unchangedPairs +=
                1;

            continue;
        }


        /*
         * STOPPED -> RUNNING
         */

        if (
            previous.state ===
                GENERATOR_OPERATING_STATE
                    .STOPPED &&
            current.state ===
                GENERATOR_OPERATING_STATE
                    .RUNNING
        ) {

            starts +=
                1;


            transitions.push({

                type:
                    GENERATOR_TRANSITION_TYPE
                        .START,

                timestamp:
                    current.timestamp,

                previousTimestamp:
                    previous.timestamp,

                previousState:
                    previous.state,

                currentState:
                    current.state,

                previousCode:
                    previous.rawCode,

                currentCode:
                    current.rawCode,

                observationGapMinutes:
                    gapMs /
                    60000,
            });


            continue;
        }


        /*
         * RUNNING -> STOPPED
         */

        if (
            previous.state ===
                GENERATOR_OPERATING_STATE
                    .RUNNING &&
            current.state ===
                GENERATOR_OPERATING_STATE
                    .STOPPED
        ) {

            stops +=
                1;


            transitions.push({

                type:
                    GENERATOR_TRANSITION_TYPE
                        .STOP,

                timestamp:
                    current.timestamp,

                previousTimestamp:
                    previous.timestamp,

                previousState:
                    previous.state,

                currentState:
                    current.state,

                previousCode:
                    previous.rawCode,

                currentCode:
                    current.rawCode,

                observationGapMinutes:
                    gapMs /
                    60000,
            });
        }
    }


    if (
        qualifiedPairs ===
        0
    ) {

        return {

            starts:
                null,

            stops:
                null,

            transitions,

            qualifiedPairs,

            unchangedPairs,

            unknownPairs,

            longGapPairs,

            totalPairs:
                points.length -
                1,

            reason:
                GENERATOR_START_STOP_REASON
                    .NO_QUALIFIED_STATE_TRANSITIONS,
        };
    }


    return {

        starts,

        stops,

        transitions,

        qualifiedPairs,

        unchangedPairs,

        unknownPairs,

        longGapPairs,

        totalPairs:
            points.length -
            1,

        reason:
            GENERATOR_START_STOP_REASON
                .TRANSITIONS_QUALIFIED,
    };
}


/*
|--------------------------------------------------------------------------
| Main public calculation
|--------------------------------------------------------------------------
*/

export function calculateGeneratorStartStopAnalytics({
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
            "A valid [start,end) generator start/stop reporting window is required."
        );
    }


    const resolvedConfig =
        {
            ...DEFAULT_GENERATOR_START_STOP_CONFIG,
            ...config,
        };


    const stateRecords =
        filterStateRecords(
            records,
            reportingStart,
            reportingEnd
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


    /*
    |--------------------------------------------------------------------------
    | No attr 416 evidence
    |--------------------------------------------------------------------------
    */

    if (
        stateRecords.length ===
        0
    ) {

        return {

            family:
                "GENERATOR_START_STOP",

            status:
                GENERATOR_START_STOP_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics:
                buildUnavailableMetric(
                    GENERATOR_START_STOP_REASON
                        .NO_STATE_EVIDENCE
                ),

            events:
                [],

            source:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Device topology
    |--------------------------------------------------------------------------
    */

    const selection =
        selectDeviceSeries(
            stateRecords,
            selectedDeviceInstance
        );


    if (
        selection.status ===
        "AMBIGUOUS"
    ) {

        return {

            family:
                "GENERATOR_START_STOP",

            status:
                GENERATOR_START_STOP_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics:
                buildUnavailableMetric(
                    GENERATOR_START_STOP_REASON
                        .MULTIPLE_DEVICES_AMBIGUOUS,
                    {

                        attributeId:
                            416,

                        deviceInstances:
                            selection
                                .deviceInstances,
                    }
                ),

            events:
                [],

            source:
                null,
        };
    }


    const result =
        calculateTransitions({

            records:
                selection
                    .records,

            maxGapMinutes:
                resolvedConfig
                    .maxGapMinutes,
        });


    if (
        result.starts ===
            null ||
        result.stops ===
            null
    ) {

        return {

            family:
                "GENERATOR_START_STOP",

            status:
                GENERATOR_START_STOP_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics:
                buildUnavailableMetric(
                    result.reason,
                    {

                        qualifiedPairs:
                            result
                                .qualifiedPairs,

                        unchangedPairs:
                            result
                                .unchangedPairs,

                        unknownPairs:
                            result
                                .unknownPairs,

                        longGapPairs:
                            result
                                .longGapPairs,

                        totalPairs:
                            result
                                .totalPairs,
                    }
                ),

            events:
                result
                    .transitions,

            source: {

                attributeId:
                    416,

                type:
                    "QUALIFIED_STATE_TRANSITION",

                deviceInstance:
                    selection
                        .deviceInstance,
            },
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Evidence completeness
    |--------------------------------------------------------------------------
    |
    | Zero starts/stops is a legitimate calculated zero when state pairs
    | were actually observed.
    |
    | Unknown/long-gap pairs mean the transition observation is partial.
    |--------------------------------------------------------------------------
    */

    const partial =
        result
            .unknownPairs >
            0 ||
        result
            .longGapPairs >
            0;


    const reason =
        partial
            ? GENERATOR_START_STOP_REASON
                .TRANSITIONS_PARTIALLY_OBSERVED
            : GENERATOR_START_STOP_REASON
                .TRANSITIONS_QUALIFIED;


    const metrics =
        buildCalculatedMetric({

            starts:
                result.starts,

            stops:
                result.stops,

            reason,

            partial,

            metadata: {

                qualifiedPairs:
                    result
                        .qualifiedPairs,

                unchangedPairs:
                    result
                        .unchangedPairs,

                unknownPairs:
                    result
                        .unknownPairs,

                longGapPairs:
                    result
                        .longGapPairs,

                totalPairs:
                    result
                        .totalPairs,

                firstSampleIsNotCountedAsStart:
                    true,

                eventsAreObservedTransitions:
                    true,
            },
        });


    return {

        family:
            "GENERATOR_START_STOP",

        status:
            metrics.status,

        reportingWindow,

        metrics,

        events:
            result
                .transitions,

        source: {

            attributeId:
                416,

            type:
                "QUALIFIED_STATE_TRANSITION",

            deviceInstance:
                selection
                    .deviceInstance,
        },

        boundaries: {

            firstSampleAutomaticallyCountsAsStart:
                false,

            positivePowerCreatesStart:
                false,

            zeroPowerCreatesStop:
                false,

            activeSourceCreatesStart:
                false,

            attribute1166CreatesStop:
                false,

            longGapTransitionAllowed:
                false,

            unknownStateTransitionAllowed:
                false,

            observedTransitionEqualsLifetimeStartCounter:
                false,

            runningEqualsAvailable:
                false,

            stoppedEqualsUnavailable:
                false,
        },
    };
}


export default {

    GENERATOR_START_STOP_STATUS,

    GENERATOR_START_STOP_REASON,

    GENERATOR_TRANSITION_TYPE,

    DEFAULT_GENERATOR_START_STOP_CONFIG,

    calculateGeneratorStartStopAnalytics,
};