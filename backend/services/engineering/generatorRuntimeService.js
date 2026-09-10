// services/engineering/generatorRuntimeService.js

import {
    GENERATOR_OPERATING_STATE,
    GENERATOR_RUNTIME_SCALE,
    GENERATOR_RUNTIME_SEMANTIC_TYPE,
    classifyGeneratorStatus416,
    getGeneratorRuntimeSemantic,
} from "./generatorRuntimeStateSemantics.js";


/*
|--------------------------------------------------------------------------
| Phase 8.5C-C
| Pure Generator Runtime Calculation Engine
|--------------------------------------------------------------------------
|
| Priority:
|
| 1. Attr 416 qualified operating-state intervals
| 2. Attr 421 accumulated runtime counter
| 3. Attr 1029 accumulated runtime counter
|
| No production database access belongs in this file.
|--------------------------------------------------------------------------
*/


export const GENERATOR_RUNTIME_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GENERATOR_RUNTIME_REASON =
    Object.freeze({

        STATE_INTERVALS_QUALIFIED:
            "STATE_INTERVALS_QUALIFIED",

        STATE_INTERVALS_PARTIAL:
            "STATE_INTERVALS_PARTIAL",

        ACCUMULATED_COUNTER_QUALIFIED:
            "ACCUMULATED_COUNTER_QUALIFIED",

        ACCUMULATED_COUNTER_OBSERVED_SPAN_ONLY:
            "ACCUMULATED_COUNTER_OBSERVED_SPAN_ONLY",

        NO_GENERATOR_RUNTIME_EVIDENCE:
            "NO_GENERATOR_RUNTIME_EVIDENCE",

        INSUFFICIENT_STATE_INTERVALS:
            "INSUFFICIENT_STATE_INTERVALS",

        INSUFFICIENT_COUNTER_SAMPLES:
            "INSUFFICIENT_COUNTER_SAMPLES",

        COUNTER_DECREASE_OBSERVED:
            "COUNTER_DECREASE_OBSERVED",

        MULTIPLE_DEVICES_AMBIGUOUS:
            "MULTIPLE_DEVICES_AMBIGUOUS",

        NO_QUALIFIED_RUNTIME_SOURCE:
            "NO_QUALIFIED_RUNTIME_SOURCE",
    });


export const DEFAULT_GENERATOR_RUNTIME_CONFIG =
    Object.freeze({

        maxGapMinutes:
            30,

        boundaryToleranceMinutes:
            null,
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
        value ===
            null ||
        value ===
            undefined ||
        value ===
            ""
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


function metricUnavailable(
    reason,
    metadata = {}
) {

    return {

        status:
            GENERATOR_RUNTIME_STATUS
                .UNAVAILABLE,

        value:
            null,

        unit:
            "h",

        reason,

        metadata,
    };
}


function metricCalculated(
    value,
    reason,
    metadata = {}
) {

    return {

        status:
            GENERATOR_RUNTIME_STATUS
                .CALCULATED,

        value,

        unit:
            "h",

        reason,

        metadata,
    };
}


function metricPartial(
    value,
    reason,
    metadata = {}
) {

    return {

        status:
            GENERATOR_RUNTIME_STATUS
                .PARTIALLY_CALCULATED,

        value,

        unit:
            "h",

        reason,

        metadata,
    };
}


/*
|--------------------------------------------------------------------------
| Filter reporting window
|--------------------------------------------------------------------------
*/

function recordsWithinWindow(
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
| Group a single attribute by device
|--------------------------------------------------------------------------
*/

function groupAttributeByDevice(
    records,
    attributeId
) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        if (
            Number(
                record.vrmAttributeId
            ) !==
            Number(
                attributeId
            )
        ) {

            continue;
        }


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


/*
|--------------------------------------------------------------------------
| Select device series
|--------------------------------------------------------------------------
*/

function selectDeviceSeries(
    records,
    attributeId,
    selectedDeviceInstance = null
) {

    const groups =
        groupAttributeByDevice(
            records,
            attributeId
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
| Attr 416 state interval calculation
|--------------------------------------------------------------------------
|
| Piecewise-constant state:
|
| state at sample i applies until sample i+1.
|
| Long gaps are not bridged.
|--------------------------------------------------------------------------
*/

function calculateStateRuntime({
    records,
    start,
    end,
    maxGapMinutes,
}) {

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

            status:
                GENERATOR_RUNTIME_STATUS
                    .UNAVAILABLE,

            runtimeHours:
                null,

            qualifiedHours:
                0,

            runningHours:
                0,

            stoppedHours:
                0,

            unknownHours:
                0,

            intervalCount:
                0,

            reason:
                GENERATOR_RUNTIME_REASON
                    .INSUFFICIENT_STATE_INTERVALS,
        };
    }


    const maxGapMs =
        maxGapMinutes *
        60 *
        1000;


    let runningMs =
        0;

    let stoppedMs =
        0;

    let unknownMs =
        0;

    let qualifiedMs =
        0;

    let intervalCount =
        0;

    let longGapCount =
        0;


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


        const intervalStartMs =
            Math.max(
                current.timestamp.getTime(),
                start.getTime()
            );


        const intervalEndMs =
            Math.min(
                next.timestamp.getTime(),
                end.getTime()
            );


        const durationMs =
            intervalEndMs -
            intervalStartMs;


        if (
            durationMs <=
            0
        ) {

            continue;
        }


        if (
            sourceGapMs >
            maxGapMs
        ) {

            unknownMs +=
                durationMs;

            longGapCount +=
                1;

            continue;
        }


        if (
            current.state ===
            GENERATOR_OPERATING_STATE
                .RUNNING
        ) {

            runningMs +=
                durationMs;

            qualifiedMs +=
                durationMs;

            intervalCount +=
                1;

            continue;
        }


        if (
            current.state ===
            GENERATOR_OPERATING_STATE
                .STOPPED
        ) {

            stoppedMs +=
                durationMs;

            qualifiedMs +=
                durationMs;

            intervalCount +=
                1;

            continue;
        }


        unknownMs +=
            durationMs;
    }


    if (
        qualifiedMs <=
        0
    ) {

        return {

            status:
                GENERATOR_RUNTIME_STATUS
                    .UNAVAILABLE,

            runtimeHours:
                null,

            qualifiedHours:
                0,

            runningHours:
                0,

            stoppedHours:
                0,

            unknownHours:
                unknownMs /
                3600000,

            intervalCount,

            longGapCount,

            reason:
                GENERATOR_RUNTIME_REASON
                    .INSUFFICIENT_STATE_INTERVALS,
        };
    }


    const reportingWindowMs =
        end -
        start;


    const coverage =
        qualifiedMs /
        reportingWindowMs;


    const fullyCovered =
        coverage >=
        0.999999;


    return {

        status:
            fullyCovered
                ? GENERATOR_RUNTIME_STATUS
                    .CALCULATED
                : GENERATOR_RUNTIME_STATUS
                    .PARTIALLY_CALCULATED,

        runtimeHours:
            runningMs /
            3600000,

        runningHours:
            runningMs /
            3600000,

        stoppedHours:
            stoppedMs /
            3600000,

        qualifiedHours:
            qualifiedMs /
            3600000,

        unknownHours:
            unknownMs /
            3600000,

        intervalCount,

        longGapCount,

        coverageFraction:
            coverage,

        reason:
            fullyCovered
                ? GENERATOR_RUNTIME_REASON
                    .STATE_INTERVALS_QUALIFIED
                : GENERATOR_RUNTIME_REASON
                    .STATE_INTERVALS_PARTIAL,
    };
}


/*
|--------------------------------------------------------------------------
| Accumulated counter delta
|--------------------------------------------------------------------------
*/

function calculateAccumulatedRuntime({
    records,
    attributeId,
    start,
    end,
    boundaryToleranceMinutes,
}) {

    const semantic =
        getGeneratorRuntimeSemantic(
            attributeId
        );


    if (
        !semantic ||
        semantic.rawScale !==
            GENERATOR_RUNTIME_SCALE
                .SECONDS ||
        semantic.semanticType !==
            GENERATOR_RUNTIME_SEMANTIC_TYPE
                .ACCUMULATED
    ) {

        return {

            status:
                GENERATOR_RUNTIME_STATUS
                    .UNAVAILABLE,

            runtimeHours:
                null,

            reason:
                GENERATOR_RUNTIME_REASON
                    .NO_QUALIFIED_RUNTIME_SOURCE,
        };
    }


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

                    value:
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
                    point.value !==
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


    if (
        points.length <
        2
    ) {

        return {

            status:
                GENERATOR_RUNTIME_STATUS
                    .UNAVAILABLE,

            runtimeHours:
                null,

            reason:
                GENERATOR_RUNTIME_REASON
                    .INSUFFICIENT_COUNTER_SAMPLES,
        };
    }


    let decreases =
        0;


    for (
        let index = 1;
        index <
            points.length;
        index +=
            1
    ) {

        if (
            points[
                index
            ].value <
            points[
                index -
                1
            ].value
        ) {

            decreases +=
                1;
        }
    }


    if (
        decreases >
        0
    ) {

        return {

            status:
                GENERATOR_RUNTIME_STATUS
                    .UNAVAILABLE,

            runtimeHours:
                null,

            reason:
                GENERATOR_RUNTIME_REASON
                    .COUNTER_DECREASE_OBSERVED,

            metadata: {

                decreases,
            },
        };
    }


    const first =
        points[
            0
        ];


    const last =
        points[
            points.length -
                1
        ];


    const deltaSeconds =
        last.value -
        first.value;


    const runtimeHours =
        deltaSeconds /
        3600;


    /*
    |--------------------------------------------------------------------------
    | Reporting-window boundary qualification
    |--------------------------------------------------------------------------
    */

    const exactStart =
        first.timestamp.getTime() ===
        start.getTime();


    const exactEnd =
        last.timestamp.getTime() ===
        end.getTime();


    if (
        exactStart &&
        exactEnd
    ) {

        return {

            status:
                GENERATOR_RUNTIME_STATUS
                    .CALCULATED,

            runtimeHours,

            reason:
                GENERATOR_RUNTIME_REASON
                    .ACCUMULATED_COUNTER_QUALIFIED,

            metadata: {

                firstTimestamp:
                    first.timestamp,

                lastTimestamp:
                    last.timestamp,

                sampleCount:
                    points.length,

                reportingWindowDelta:
                    true,
            },
        };
    }


    if (
        boundaryToleranceMinutes !==
            null &&
        boundaryToleranceMinutes !==
            undefined
    ) {

        const toleranceMs =
            Number(
                boundaryToleranceMinutes
            ) *
            60 *
            1000;


        const startClose =
            Math.abs(
                first.timestamp -
                start
            ) <=
            toleranceMs;


        const endClose =
            Math.abs(
                end -
                last.timestamp
            ) <=
            toleranceMs;


        if (
            startClose &&
            endClose
        ) {

            return {

                status:
                    GENERATOR_RUNTIME_STATUS
                        .PARTIALLY_CALCULATED,

                runtimeHours,

                reason:
                    GENERATOR_RUNTIME_REASON
                        .ACCUMULATED_COUNTER_OBSERVED_SPAN_ONLY,

                metadata: {

                    firstTimestamp:
                        first.timestamp,

                    lastTimestamp:
                        last.timestamp,

                    sampleCount:
                        points.length,

                    boundaryToleranceMinutes,

                    reportingWindowDelta:
                        false,
                },
            };
        }
    }


    return {

        status:
            GENERATOR_RUNTIME_STATUS
                .PARTIALLY_CALCULATED,

        runtimeHours,

        reason:
            GENERATOR_RUNTIME_REASON
                .ACCUMULATED_COUNTER_OBSERVED_SPAN_ONLY,

        metadata: {

            firstTimestamp:
                first.timestamp,

            lastTimestamp:
                last.timestamp,

            sampleCount:
                points.length,

            reportingWindowDelta:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Main engine
|--------------------------------------------------------------------------
*/

export function calculateGeneratorRuntime({
    records = [],
    start,
    end,
    deviceSelection = {},
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
            "A valid [start,end) generator runtime reporting window is required."
        );
    }


    const resolvedConfig =
        {
            ...DEFAULT_GENERATOR_RUNTIME_CONFIG,
            ...config,
        };


    const windowRecords =
        recordsWithinWindow(
            records,
            reportingStart,
            reportingEnd
        );


    if (
        windowRecords.length ===
        0
    ) {

        return {

            family:
                "GENERATOR_RUNTIME",

            status:
                GENERATOR_RUNTIME_STATUS
                    .UNAVAILABLE,

            reportingWindow: {

                start:
                    reportingStart,

                end:
                    reportingEnd,

                semantics:
                    "[start,end)",
            },

            runtime:
                metricUnavailable(
                    GENERATOR_RUNTIME_REASON
                        .NO_GENERATOR_RUNTIME_EVIDENCE
                ),

            source:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | 1. Primary path — attr 416 state intervals
    |--------------------------------------------------------------------------
    */

    const stateSelection =
        selectDeviceSeries(
            windowRecords,
            416,
            deviceSelection[
                416
            ] ??
            null
        );


    if (
        stateSelection.status ===
        "AMBIGUOUS"
    ) {

        return {

            family:
                "GENERATOR_RUNTIME",

            status:
                GENERATOR_RUNTIME_STATUS
                    .UNAVAILABLE,

            reportingWindow: {

                start:
                    reportingStart,

                end:
                    reportingEnd,

                semantics:
                    "[start,end)",
            },

            runtime:
                metricUnavailable(
                    GENERATOR_RUNTIME_REASON
                        .MULTIPLE_DEVICES_AMBIGUOUS,
                    {

                        attributeId:
                            416,

                        deviceInstances:
                            stateSelection
                                .deviceInstances,
                    }
                ),

            source:
                null,
        };
    }


    if (
        stateSelection.records.length >
        0
    ) {

        const result =
            calculateStateRuntime({

                records:
                    stateSelection
                        .records,

                start:
                    reportingStart,

                end:
                    reportingEnd,

                maxGapMinutes:
                    resolvedConfig
                        .maxGapMinutes,
            });


        if (
            result.status !==
            GENERATOR_RUNTIME_STATUS
                .UNAVAILABLE
        ) {

            return {

                family:
                    "GENERATOR_RUNTIME",

                status:
                    result.status,

                reportingWindow: {

                    start:
                        reportingStart,

                    end:
                        reportingEnd,

                    semantics:
                        "[start,end)",
                },

                runtime:
                    result.status ===
                    GENERATOR_RUNTIME_STATUS
                        .CALCULATED
                        ? metricCalculated(
                            result.runtimeHours,
                            result.reason,
                            result
                        )
                        : metricPartial(
                            result.runtimeHours,
                            result.reason,
                            result
                        ),

                source: {

                    type:
                        "STATE_INTERVAL",

                    attributeId:
                        416,

                    deviceInstance:
                        stateSelection
                            .deviceInstance,
                },
            };
        }
    }


    /*
    |--------------------------------------------------------------------------
    | 2. Fallback attr 421
    |--------------------------------------------------------------------------
    */

    for (
        const attributeId
        of [
            421,
            1029,
        ]
    ) {

        const selection =
            selectDeviceSeries(
                windowRecords,
                attributeId,
                deviceSelection[
                    attributeId
                ] ??
                null
            );


        if (
            selection.status ===
            "AMBIGUOUS"
        ) {

            continue;
        }


        if (
            selection.records.length <
            2
        ) {

            continue;
        }


        const result =
            calculateAccumulatedRuntime({

                records:
                    selection.records,

                attributeId,

                start:
                    reportingStart,

                end:
                    reportingEnd,

                boundaryToleranceMinutes:
                    resolvedConfig
                        .boundaryToleranceMinutes,
            });


        if (
            result.status !==
            GENERATOR_RUNTIME_STATUS
                .UNAVAILABLE
        ) {

            return {

                family:
                    "GENERATOR_RUNTIME",

                status:
                    result.status,

                reportingWindow: {

                    start:
                        reportingStart,

                    end:
                        reportingEnd,

                    semantics:
                        "[start,end)",
                },

                runtime:
                    result.status ===
                    GENERATOR_RUNTIME_STATUS
                        .CALCULATED
                        ? metricCalculated(
                            result.runtimeHours,
                            result.reason,
                            result.metadata
                        )
                        : metricPartial(
                            result.runtimeHours,
                            result.reason,
                            result.metadata
                        ),

                source: {

                    type:
                        "ACCUMULATED_COUNTER",

                    attributeId,

                    deviceInstance:
                        selection
                            .deviceInstance,
                },
            };
        }
    }


    /*
    |--------------------------------------------------------------------------
    | No usable qualified source
    |--------------------------------------------------------------------------
    */

    return {

        family:
            "GENERATOR_RUNTIME",

        status:
            GENERATOR_RUNTIME_STATUS
                .UNAVAILABLE,

        reportingWindow: {

            start:
                reportingStart,

            end:
                reportingEnd,

            semantics:
                "[start,end)",
        },

        runtime:
            metricUnavailable(
                GENERATOR_RUNTIME_REASON
                    .NO_QUALIFIED_RUNTIME_SOURCE
            ),

        source:
            null,
    };
}


export default {

    GENERATOR_RUNTIME_STATUS,

    GENERATOR_RUNTIME_REASON,

    DEFAULT_GENERATOR_RUNTIME_CONFIG,

    calculateGeneratorRuntime,
};