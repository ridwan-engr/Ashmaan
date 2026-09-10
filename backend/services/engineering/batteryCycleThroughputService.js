// services/engineering/batteryCycleThroughputService.js

import {
    ENGINEERING_METRIC_STATUS,
    ENGINEERING_EVIDENCE_BASIS,
    ENGINEERING_DATA_QUALITY,
    ENGINEERING_OBSERVABILITY_STATUS,
    ENGINEERING_AGGREGATION_LEVEL,
    ENGINEERING_METRIC_FAMILY,
    ENGINEERING_SOURCE_TYPE,
    ENGINEERING_UNIT,

    buildEngineeringReportingWindow,
    buildEngineeringScope,
    buildEngineeringObservability,
    buildEngineeringDataQuality,
    buildCalculatedEngineeringMetric,
    buildUnavailableEngineeringMetric,
    buildPartialEngineeringMetric,
    buildEngineeringMetricFamily,
} from "./engineeringAnalyticsContract.js";


/*
|--------------------------------------------------------------------------
| Phase 8.4G-C1
| Battery Cycle / Throughput Cumulative-Series Engine
|--------------------------------------------------------------------------
|
| PURE CALCULATION SERVICE.
|
| No MongoDB.
| No API.
| No frontend.
|
| This phase calculates only:
|
| - observed charge-cycle counter delta
| - observed full-discharge counter delta
| - observed cumulative discharged-energy delta
| - observed cumulative charged-energy delta
|
| It also distinguishes:
|
| - exact reporting-window boundary coverage
| - partial reporting-window boundary coverage
| - observed-span-only evidence
|
| It DOES NOT calculate:
|
| - delta-energy sums from attrs 338 / 339
| - equivalent full cycles
| - SOC-derived cycles
| - power-derived charge/discharge energy
| - battery degradation
| - cycle life
| - battery availability
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Attribute IDs
|--------------------------------------------------------------------------
*/

export const BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE =
    Object.freeze({

        CHARGE_CYCLES:
            58,

        FULL_DISCHARGES:
            59,

        DISCHARGED_ENERGY_CUMULATIVE:
            244,

        CHARGED_ENERGY_CUMULATIVE:
            245,

        DISCHARGED_ENERGY_DELTA:
            338,

        CHARGED_ENERGY_DELTA:
            339,
    });


/*
|--------------------------------------------------------------------------
| Cumulative attribute definitions
|--------------------------------------------------------------------------
*/

export const BATTERY_CUMULATIVE_DEFINITION =
    Object.freeze({

        58: {
            attributeId:
                58,

            key:
                "chargeCycleCounterDelta",

            label:
                "Charge Cycle Counter Delta",

            unit:
                ENGINEERING_UNIT
                    .COUNT,

            semanticType:
                "CUMULATIVE_COUNTER",

            calculationMethod:
                "CUMULATIVE_COUNTER_DIFFERENCE",
        },

        59: {
            attributeId:
                59,

            key:
                "fullDischargeCounterDelta",

            label:
                "Full Discharge Counter Delta",

            unit:
                ENGINEERING_UNIT
                    .COUNT,

            semanticType:
                "CUMULATIVE_COUNTER",

            calculationMethod:
                "CUMULATIVE_COUNTER_DIFFERENCE",
        },

        244: {
            attributeId:
                244,

            key:
                "dischargedEnergyCounterDeltaKwh",

            label:
                "Discharged Energy Counter Delta",

            unit:
                ENGINEERING_UNIT
                    .KWH,

            semanticType:
                "CUMULATIVE_ENERGY",

            calculationMethod:
                "CUMULATIVE_ENERGY_COUNTER_DIFFERENCE",
        },

        245: {
            attributeId:
                245,

            key:
                "chargedEnergyCounterDeltaKwh",

            label:
                "Charged Energy Counter Delta",

            unit:
                ENGINEERING_UNIT
                    .KWH,

            semanticType:
                "CUMULATIVE_ENERGY",

            calculationMethod:
                "CUMULATIVE_ENERGY_COUNTER_DIFFERENCE",
        },
    });


export const BATTERY_CUMULATIVE_ATTRIBUTE_IDS =
    Object.freeze(
        Object.keys(
            BATTERY_CUMULATIVE_DEFINITION
        ).map(
            Number
        )
    );


/*
|--------------------------------------------------------------------------
| Status reasons
|--------------------------------------------------------------------------
*/

export const BATTERY_CYCLE_THROUGHPUT_REASON =
    Object.freeze({

        QUALIFIED:
            "QUALIFIED",

        EXACT_REPORTING_WINDOW_BOUNDARIES:
            "EXACT_REPORTING_WINDOW_BOUNDARIES",

        PARTIAL_REPORTING_WINDOW_BOUNDARIES:
            "PARTIAL_REPORTING_WINDOW_BOUNDARIES",

        OBSERVED_SPAN_ONLY:
            "OBSERVED_SPAN_ONLY",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",

        SIGNAL_NOT_OBSERVED:
            "SIGNAL_NOT_OBSERVED",

        INSUFFICIENT_QUALIFIED_SAMPLES:
            "INSUFFICIENT_QUALIFIED_SAMPLES",

        MULTIPLE_DEVICES_AMBIGUOUS:
            "MULTIPLE_DEVICES_AMBIGUOUS",

        COUNTER_DECREASE_OBSERVED:
            "COUNTER_DECREASE_OBSERVED",

        INVALID_NUMERIC_VALUE:
            "INVALID_NUMERIC_VALUE",

        START_BOUNDARY_NOT_ESTABLISHED:
            "START_BOUNDARY_NOT_ESTABLISHED",

        END_BOUNDARY_NOT_ESTABLISHED:
            "END_BOUNDARY_NOT_ESTABLISHED",

        BOUNDARY_TOLERANCE_NOT_ESTABLISHED:
            "BOUNDARY_TOLERANCE_NOT_ESTABLISHED",

        DELTA_ENERGY_SEMANTICS_NOT_ESTABLISHED:
            "DELTA_ENERGY_SEMANTICS_NOT_ESTABLISHED",

        CAPACITY_NOT_ESTABLISHED:
            "CAPACITY_NOT_ESTABLISHED",
    });


/*
|--------------------------------------------------------------------------
| Calculation boundaries
|--------------------------------------------------------------------------
*/

export const BATTERY_CYCLE_THROUGHPUT_BOUNDARIES =
    Object.freeze({

        REPORTING_WINDOW_SEMANTICS:
            "[start,end)",

        MISSING_TELEMETRY_EQUALS_ZERO:
            false,

        SINGLE_SAMPLE_EQUALS_ZERO_DELTA:
            false,

        COUNTER_DECREASE_EQUALS_RESET:
            false,

        MULTIPLE_DEVICES_AUTOMATICALLY_COMBINED:
            false,

        OBSERVED_SPAN_EQUALS_REPORTING_WINDOW:
            false,

        SOC_OSCILLATION_EQUALS_CYCLE:
            false,

        SIGNED_POWER_SPLIT_TO_CHARGE_DISCHARGE:
            false,

        DELTA_ENERGY_SUMMATION_ENABLED:
            false,

        ATTRIBUTE_413_CAPACITY_QUALIFIED:
            false,

        EQUIVALENT_FULL_CYCLES_ENABLED:
            false,

        BATTERY_DEGRADATION_INFERRED:
            false,
    });


/*
|--------------------------------------------------------------------------
| Default configuration
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| No default boundary tolerance is fabricated.
|
| The caller must explicitly provide:
|
|     boundaryToleranceMinutes
|
| before approximate reporting-window boundary qualification is allowed.
|
|--------------------------------------------------------------------------
*/

export const DEFAULT_BATTERY_CYCLE_THROUGHPUT_CONFIG =
    Object.freeze({

        minimumSamples:
            2,

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


    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number
        : null;
}


function round(
    value,
    decimals = 6
) {

    if (
        !Number.isFinite(
            value
        )
    ) {

        return null;
    }


    return Number(
        value.toFixed(
            decimals
        )
    );
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


function attributeIdOf(
    record
) {

    const id =
        Number(
            record
                ?.vrmAttributeId
        );


    return Number.isFinite(
        id
    )
        ? id
        : null;
}


function deviceInstanceOf(
    record
) {

    return String(
        record
            ?.deviceInstance ??
        "UNKNOWN"
    );
}


function numericValueOf(
    record
) {

    return finite(
        record
            ?.numericValue ??
        record
            ?.value
    );
}


function hoursBetween(
    start,
    end
) {

    if (
        !start ||
        !end
    ) {

        return null;
    }


    return (
        end.getTime() -
        start.getTime()
    ) /
    3_600_000;
}


/*
|--------------------------------------------------------------------------
| Validate reporting window
|--------------------------------------------------------------------------
*/

function resolveReportingWindow(
    start,
    end
) {

    const startDate =
        asDate(
            start
        );


    const endDate =
        asDate(
            end
        );


    if (
        !startDate ||
        !endDate ||
        endDate <=
            startDate
    ) {

        return null;
    }


    return buildEngineeringReportingWindow({

        start:
            startDate,

        end:
            endDate,
    });
}


/*
|--------------------------------------------------------------------------
| Scope
|--------------------------------------------------------------------------
*/

function resolveScope({
    installationId = null,
    vrmSiteId = null,
} = {}) {

    return buildEngineeringScope({

        aggregationLevel:
            ENGINEERING_AGGREGATION_LEVEL
                .SITE,

        installationId,

        vrmSiteId,
    });
}


/*
|--------------------------------------------------------------------------
| Filter attribute
|--------------------------------------------------------------------------
*/

function getAttributeRecords({
    records,
    attributeId,
} = {}) {

    return (
        Array.isArray(
            records
        )
            ? records
            : []
    ).filter(
        (
            record
        ) =>
            attributeIdOf(
                record
            ) ===
            Number(
                attributeId
            )
    );
}


/*
|--------------------------------------------------------------------------
| Resolve device
|--------------------------------------------------------------------------
|
| Same principle as batteryAnalyticsService.js:
|
| Never silently combine battery devices.
|
|--------------------------------------------------------------------------
*/

function resolveDeviceSeries({
    records,
    attributeId,
    selectedDeviceInstance = null,
} = {}) {

    const attributeRecords =
        getAttributeRecords({

            records,

            attributeId,
        });


    if (
        attributeRecords.length ===
        0
    ) {

        return {

            status:
                "NOT_OBSERVED",

            records:
                [],

            deviceInstances:
                [],

            selectedDeviceInstance:
                null,
        };
    }


    const deviceInstances =
        Array.from(
            new Set(
                attributeRecords.map(
                    deviceInstanceOf
                )
            )
        );


    if (
        selectedDeviceInstance !==
        null &&
        selectedDeviceInstance !==
        undefined
    ) {

        const selected =
            String(
                selectedDeviceInstance
            );


        const selectedRecords =
            attributeRecords.filter(
                (
                    record
                ) =>
                    deviceInstanceOf(
                        record
                    ) ===
                    selected
            );


        if (
            selectedRecords.length ===
            0
        ) {

            return {

                status:
                    "NOT_OBSERVED",

                records:
                    [],

                deviceInstances,

                selectedDeviceInstance:
                    selected,
            };
        }


        return {

            status:
                "SELECTED",

            records:
                selectedRecords,

            deviceInstances,

            selectedDeviceInstance:
                selected,
        };
    }


    if (
        deviceInstances.length >
        1
    ) {

        return {

            status:
                "AMBIGUOUS",

            records:
                [],

            deviceInstances,

            selectedDeviceInstance:
                null,
        };
    }


    return {

        status:
            "UNAMBIGUOUS",

        records:
            attributeRecords,

        deviceInstances,

        selectedDeviceInstance:
            deviceInstances[
                0
            ] ??
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Prepare ordered numeric cumulative series
|--------------------------------------------------------------------------
*/

function prepareCumulativeSeries(
    records = []
) {

    let rejectedValues =
        0;


    const series =
        records
            .map(
                (
                    record
                ) => {

                    const timestamp =
                        asDate(
                            record
                                ?.timestamp
                        );


                    const value =
                        numericValueOf(
                            record
                        );


                    if (
                        !timestamp ||
                        value ===
                        null
                    ) {

                        rejectedValues +=
                            1;

                        return null;
                    }


                    return {

                        timestamp,

                        value,
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


    return {

        series,

        rejectedValues,
    };
}


/*
|--------------------------------------------------------------------------
| Detect counter decreases
|--------------------------------------------------------------------------
*/

function analyseMonotonicity(
    series
) {

    let decreases =
        0;

    let increases =
        0;

    let unchanged =
        0;

    let largestDecrease =
        null;


    for (
        let index = 1;
        index <
            series.length;
        index +=
            1
    ) {

        const difference =
            series[
                index
            ]
                .value -
            series[
                index -
                1
            ]
                .value;


        if (
            difference <
            0
        ) {

            decreases +=
                1;


            largestDecrease =
                largestDecrease ===
                null
                    ? difference
                    : Math.min(
                        largestDecrease,
                        difference
                    );

        }
        else if (
            difference >
            0
        ) {

            increases +=
                1;

        }
        else {

            unchanged +=
                1;
        }
    }


    return {

        decreases,

        increases,

        unchanged,

        largestDecrease,
    };
}


/*
|--------------------------------------------------------------------------
| Observed-span calculation
|--------------------------------------------------------------------------
|
| This calculates:
|
|     latestValue - firstValue
|
| over the actual qualified observation span.
|
| It is NOT automatically a full reporting-window KPI.
|
|--------------------------------------------------------------------------
*/

function calculateObservedSpan(
    series
) {

    if (
        !Array.isArray(
            series
        ) ||
        series.length <
        2
    ) {

        return null;
    }


    const first =
        series[
            0
        ];


    const latest =
        series[
            series.length -
                1
        ];


    return {

        firstValue:
            first.value,

        latestValue:
            latest.value,

        delta:
            latest.value -
            first.value,

        firstTimestamp:
            first.timestamp,

        latestTimestamp:
            latest.timestamp,

        observedSpanHours:
            hoursBetween(
                first.timestamp,
                latest.timestamp
            ),
    };
}


/*
|--------------------------------------------------------------------------
| Exact boundary search
|--------------------------------------------------------------------------
*/

function findExactSample(
    series,
    boundary
) {

    const targetMs =
        boundary
            .getTime();


    return (
        series.find(
            (
                point
            ) =>
                point.timestamp
                    .getTime() ===
                targetMs
        ) ??
        null
    );
}


/*
|--------------------------------------------------------------------------
| Nearest prior sample
|--------------------------------------------------------------------------
|
| Counter state at a boundary is represented only by a sample at or before
| that boundary.
|
| We do not use a future value to represent an earlier boundary.
|
|--------------------------------------------------------------------------
*/

function findNearestPriorSample(
    series,
    boundary
) {

    const targetMs =
        boundary
            .getTime();


    let candidate =
        null;


    for (
        const point
        of series
    ) {

        if (
            point.timestamp
                .getTime() >
            targetMs
        ) {

            break;
        }


        candidate =
            point;
    }


    return candidate;
}


/*
|--------------------------------------------------------------------------
| Boundary distance
|--------------------------------------------------------------------------
*/

function boundaryDistanceMinutes(
    point,
    boundary
) {

    if (
        !point ||
        !boundary
    ) {

        return null;
    }


    return (
        boundary.getTime() -
        point.timestamp.getTime()
    ) /
    60_000;
}


/*
|--------------------------------------------------------------------------
| Reporting-window boundary qualification
|--------------------------------------------------------------------------
|
| Exact boundaries:
|
|     sample timestamp == reporting boundary
|
| Approximate boundary:
|
|     latest sample at/before boundary
|     AND within explicit caller-provided tolerance
|
| No tolerance is invented.
|
|--------------------------------------------------------------------------
*/

function qualifyReportingBoundaries({
    series,
    reportingWindow,
    boundaryToleranceMinutes,
} = {}) {

    const start =
        reportingWindow
            .start;


    const end =
        reportingWindow
            .end;


    const exactStart =
        findExactSample(
            series,
            start
        );


    const exactEnd =
        findExactSample(
            series,
            end
        );


    if (
        exactStart &&
        exactEnd
    ) {

        return {

            status:
                ENGINEERING_METRIC_STATUS
                    .CALCULATED,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .EXACT_REPORTING_WINDOW_BOUNDARIES,

            startPoint:
                exactStart,

            endPoint:
                exactEnd,

            startExact:
                true,

            endExact:
                true,

            startBoundaryGapMinutes:
                0,

            endBoundaryGapMinutes:
                0,
        };
    }


    if (
        boundaryToleranceMinutes ===
        null ||
        boundaryToleranceMinutes ===
        undefined ||
        !Number.isFinite(
            Number(
                boundaryToleranceMinutes
            )
        ) ||
        Number(
            boundaryToleranceMinutes
        ) <
        0
    ) {

        return {

            status:
                ENGINEERING_METRIC_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .BOUNDARY_TOLERANCE_NOT_ESTABLISHED,

            startPoint:
                null,

            endPoint:
                null,

            startExact:
                Boolean(
                    exactStart
                ),

            endExact:
                Boolean(
                    exactEnd
                ),

            startBoundaryGapMinutes:
                null,

            endBoundaryGapMinutes:
                null,
        };
    }


    const tolerance =
        Number(
            boundaryToleranceMinutes
        );


    const startPoint =
        exactStart ??
        findNearestPriorSample(
            series,
            start
        );


    const endPoint =
        exactEnd ??
        findNearestPriorSample(
            series,
            end
        );


    if (
        !startPoint
    ) {

        return {

            status:
                ENGINEERING_METRIC_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .START_BOUNDARY_NOT_ESTABLISHED,

            startPoint:
                null,

            endPoint,

            startExact:
                false,

            endExact:
                Boolean(
                    exactEnd
                ),

            startBoundaryGapMinutes:
                null,

            endBoundaryGapMinutes:
                boundaryDistanceMinutes(
                    endPoint,
                    end
                ),
        };
    }


    if (
        !endPoint
    ) {

        return {

            status:
                ENGINEERING_METRIC_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .END_BOUNDARY_NOT_ESTABLISHED,

            startPoint,

            endPoint:
                null,

            startExact:
                Boolean(
                    exactStart
                ),

            endExact:
                false,

            startBoundaryGapMinutes:
                boundaryDistanceMinutes(
                    startPoint,
                    start
                ),

            endBoundaryGapMinutes:
                null,
        };
    }


    const startGap =
        boundaryDistanceMinutes(
            startPoint,
            start
        );


    const endGap =
        boundaryDistanceMinutes(
            endPoint,
            end
        );


    if (
        startGap >
        tolerance
    ) {

        return {

            status:
                ENGINEERING_METRIC_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .START_BOUNDARY_NOT_ESTABLISHED,

            startPoint,

            endPoint,

            startExact:
                Boolean(
                    exactStart
                ),

            endExact:
                Boolean(
                    exactEnd
                ),

            startBoundaryGapMinutes:
                startGap,

            endBoundaryGapMinutes:
                endGap,
        };
    }


    if (
        endGap >
        tolerance
    ) {

        return {

            status:
                ENGINEERING_METRIC_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .END_BOUNDARY_NOT_ESTABLISHED,

            startPoint,

            endPoint,

            startExact:
                Boolean(
                    exactStart
                ),

            endExact:
                Boolean(
                    exactEnd
                ),

            startBoundaryGapMinutes:
                startGap,

            endBoundaryGapMinutes:
                endGap,
        };
    }


    /*
     * Approximate boundary coverage is deliberately PARTIAL.
     */

    return {

        status:
            ENGINEERING_METRIC_STATUS
                .PARTIALLY_CALCULATED,

        reason:
            BATTERY_CYCLE_THROUGHPUT_REASON
                .PARTIAL_REPORTING_WINDOW_BOUNDARIES,

        startPoint,

        endPoint,

        startExact:
            Boolean(
                exactStart
            ),

        endExact:
            Boolean(
                exactEnd
            ),

        startBoundaryGapMinutes:
            startGap,

        endBoundaryGapMinutes:
            endGap,
    };
}


/*
|--------------------------------------------------------------------------
| Observability
|--------------------------------------------------------------------------
*/

function buildCounterObservability({
    sampleCount,
    deviceStatus,
} = {}) {

    if (
        deviceStatus ===
        "AMBIGUOUS"
    ) {

        return buildEngineeringObservability({

            status:
                ENGINEERING_OBSERVABILITY_STATUS
                    .PARTIAL,

            requiredFields: [
                "timestamp",
                "numericValue",
                "deviceInstance",
            ],

            observedFields: [
                "timestamp",
                "numericValue",
            ],

            missingFields: [
                "unambiguousBatteryIdentity",
            ],

            coveragePercent:
                null,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .MULTIPLE_DEVICES_AMBIGUOUS,
        });
    }


    if (
        sampleCount >=
        2
    ) {

        return buildEngineeringObservability({

            status:
                ENGINEERING_OBSERVABILITY_STATUS
                    .ESTABLISHED,

            requiredFields: [
                "timestamp",
                "numericValue",
                "deviceInstance",
            ],

            observedFields: [
                "timestamp",
                "numericValue",
                "deviceInstance",
            ],

            missingFields:
                [],

            coveragePercent:
                100,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .QUALIFIED,
        });
    }


    return buildEngineeringObservability({

        status:
            ENGINEERING_OBSERVABILITY_STATUS
                .NOT_ESTABLISHED,

        requiredFields: [
            "timestamp",
            "numericValue",
            "deviceInstance",
        ],

        observedFields:
            sampleCount >
            0
                ? [
                    "timestamp",
                    "numericValue",
                    "deviceInstance",
                ]
                : [],

        missingFields:
            sampleCount >
            0
                ? [
                    "secondQualifiedObservation",
                ]
                : [
                    "qualifiedTelemetry",
                ],

        coveragePercent:
            null,

        reason:
            sampleCount >
            0
                ? BATTERY_CYCLE_THROUGHPUT_REASON
                    .INSUFFICIENT_QUALIFIED_SAMPLES
                : BATTERY_CYCLE_THROUGHPUT_REASON
                    .SIGNAL_NOT_OBSERVED,
    });
}


/*
|--------------------------------------------------------------------------
| Data quality
|--------------------------------------------------------------------------
*/

function buildCounterDataQuality({
    sampleCount,
    rejectedValues,
    decreases,
    status,
} = {}) {

    let quality =
        ENGINEERING_DATA_QUALITY
            .UNKNOWN;


    if (
        status ===
        ENGINEERING_METRIC_STATUS
            .CALCULATED
    ) {

        quality =
            ENGINEERING_DATA_QUALITY
                .GOOD;

    }
    else if (
        status ===
        ENGINEERING_METRIC_STATUS
            .PARTIALLY_CALCULATED
    ) {

        quality =
            ENGINEERING_DATA_QUALITY
                .PARTIAL;

    }
    else if (
        decreases >
        0
    ) {

        quality =
            ENGINEERING_DATA_QUALITY
                .DEGRADED;

    }
    else {

        quality =
            ENGINEERING_DATA_QUALITY
                .INSUFFICIENT;
    }


    return buildEngineeringDataQuality({

        status:
            quality,

        sampleCount:
            sampleCount +
            rejectedValues,

        validSampleCount:
            sampleCount,

        invalidSampleCount:
            rejectedValues,

        coveragePercent:
            null,

        reason:
            decreases >
            0
                ? BATTERY_CYCLE_THROUGHPUT_REASON
                    .COUNTER_DECREASE_OBSERVED
                : null,
    });
}


/*
|--------------------------------------------------------------------------
| Build metric source
|--------------------------------------------------------------------------
*/

function metricSources(
    attributeId
) {

    return [
        {
            type:
                ENGINEERING_SOURCE_TYPE
                    .VRM_TELEMETRY,

            collection:
                "Telemetry",

            field:
                "numericValue",

            metric:
                `vrmAttributeId:${attributeId}`,

            description:
                "Direct VRM cumulative battery counter telemetry.",
        },
    ];
}


/*
|--------------------------------------------------------------------------
| Calculate one cumulative attribute
|--------------------------------------------------------------------------
*/

export function calculateBatteryCumulativeMetric({
    records = [],
    attributeId,
    start,
    end,
    selectedDeviceInstance = null,
    installationId = null,
    vrmSiteId = null,
    config = {},
} = {}) {

    const definition =
        BATTERY_CUMULATIVE_DEFINITION[
            Number(
                attributeId
            )
        ];


    if (
        !definition
    ) {

        throw new Error(
            `Unsupported cumulative battery attribute: ${attributeId}`
        );
    }


    const effectiveConfig = {

        ...DEFAULT_BATTERY_CYCLE_THROUGHPUT_CONFIG,

        ...config,
    };


    const reportingWindow =
        resolveReportingWindow(
            start,
            end
        );


    const scope =
        resolveScope({

            installationId,

            vrmSiteId,
        });


    if (
        !reportingWindow
    ) {

        return buildUnavailableEngineeringMetric({

            key:
                definition.key,

            label:
                definition.label,

            family:
                ENGINEERING_METRIC_FAMILY
                    .BATTERY,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .INVALID_REPORTING_WINDOW,

            unit:
                definition.unit,

            evidenceBasis:
                ENGINEERING_EVIDENCE_BASIS
                    .NOT_ESTABLISHED,

            calculationMethod:
                definition
                    .calculationMethod,

            reportingWindow:
                null,

            scope,

            observability:
                buildEngineeringObservability({

                    status:
                        ENGINEERING_OBSERVABILITY_STATUS
                            .NOT_ESTABLISHED,

                    reason:
                        BATTERY_CYCLE_THROUGHPUT_REASON
                            .INVALID_REPORTING_WINDOW,
                }),

            dataQuality:
                buildEngineeringDataQuality({

                    status:
                        ENGINEERING_DATA_QUALITY
                            .INSUFFICIENT,

                    reason:
                        BATTERY_CYCLE_THROUGHPUT_REASON
                            .INVALID_REPORTING_WINDOW,
                }),

            sources:
                metricSources(
                    attributeId
                ),

            metadata: {

                attributeId:
                    Number(
                        attributeId
                    ),
            },
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Device resolution
    |--------------------------------------------------------------------------
    */

    const deviceResolution =
        resolveDeviceSeries({

            records,

            attributeId,

            selectedDeviceInstance,
        });


    if (
        deviceResolution.status ===
        "NOT_OBSERVED"
    ) {

        return buildUnavailableEngineeringMetric({

            key:
                definition.key,

            label:
                definition.label,

            family:
                ENGINEERING_METRIC_FAMILY
                    .BATTERY,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .SIGNAL_NOT_OBSERVED,

            unit:
                definition.unit,

            evidenceBasis:
                ENGINEERING_EVIDENCE_BASIS
                    .NOT_ESTABLISHED,

            calculationMethod:
                definition
                    .calculationMethod,

            reportingWindow,

            scope,

            observability:
                buildCounterObservability({

                    sampleCount:
                        0,

                    deviceStatus:
                        deviceResolution
                            .status,
                }),

            dataQuality:
                buildCounterDataQuality({

                    sampleCount:
                        0,

                    rejectedValues:
                        0,

                    decreases:
                        0,

                    status:
                        ENGINEERING_METRIC_STATUS
                            .UNAVAILABLE,
                }),

            sources:
                metricSources(
                    attributeId
                ),

            metadata: {

                attributeId:
                    Number(
                        attributeId
                    ),

                selectedDeviceInstance:
                    null,

                deviceInstances:
                    [],
            },
        });
    }


    if (
        deviceResolution.status ===
        "AMBIGUOUS"
    ) {

        return buildUnavailableEngineeringMetric({

            key:
                definition.key,

            label:
                definition.label,

            family:
                ENGINEERING_METRIC_FAMILY
                    .BATTERY,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .MULTIPLE_DEVICES_AMBIGUOUS,

            unit:
                definition.unit,

            evidenceBasis:
                ENGINEERING_EVIDENCE_BASIS
                    .NOT_ESTABLISHED,

            calculationMethod:
                definition
                    .calculationMethod,

            reportingWindow,

            scope,

            observability:
                buildCounterObservability({

                    sampleCount:
                        0,

                    deviceStatus:
                        deviceResolution
                            .status,
                }),

            dataQuality:
                buildCounterDataQuality({

                    sampleCount:
                        0,

                    rejectedValues:
                        0,

                    decreases:
                        0,

                    status:
                        ENGINEERING_METRIC_STATUS
                            .UNAVAILABLE,
                }),

            sources:
                metricSources(
                    attributeId
                ),

            metadata: {

                attributeId:
                    Number(
                        attributeId
                    ),

                selectedDeviceInstance:
                    null,

                deviceInstances:
                    deviceResolution
                        .deviceInstances,
            },
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Numeric series
    |--------------------------------------------------------------------------
    */

    const {
        series,
        rejectedValues,
    } =
        prepareCumulativeSeries(
            deviceResolution
                .records
        );


    if (
        series.length <
        effectiveConfig
            .minimumSamples
    ) {

        return buildUnavailableEngineeringMetric({

            key:
                definition.key,

            label:
                definition.label,

            family:
                ENGINEERING_METRIC_FAMILY
                    .BATTERY,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .INSUFFICIENT_QUALIFIED_SAMPLES,

            unit:
                definition.unit,

            evidenceBasis:
                ENGINEERING_EVIDENCE_BASIS
                    .MEASURED,

            calculationMethod:
                definition
                    .calculationMethod,

            reportingWindow,

            scope,

            observability:
                buildCounterObservability({

                    sampleCount:
                        series.length,

                    deviceStatus:
                        deviceResolution
                            .status,
                }),

            dataQuality:
                buildCounterDataQuality({

                    sampleCount:
                        series.length,

                    rejectedValues,

                    decreases:
                        0,

                    status:
                        ENGINEERING_METRIC_STATUS
                            .UNAVAILABLE,
                }),

            sources:
                metricSources(
                    attributeId
                ),

            metadata: {

                attributeId:
                    Number(
                        attributeId
                    ),

                semanticType:
                    definition
                        .semanticType,

                sampleCount:
                    series.length,

                rejectedValues,

                selectedDeviceInstance:
                    deviceResolution
                        .selectedDeviceInstance,

                deviceInstances:
                    deviceResolution
                        .deviceInstances,

                observedDelta:
                    null,
            },
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Monotonicity
    |--------------------------------------------------------------------------
    */

    const monotonicity =
        analyseMonotonicity(
            series
        );


    if (
        monotonicity.decreases >
        0
    ) {

        return buildUnavailableEngineeringMetric({

            key:
                definition.key,

            label:
                definition.label,

            family:
                ENGINEERING_METRIC_FAMILY
                    .BATTERY,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .COUNTER_DECREASE_OBSERVED,

            unit:
                definition.unit,

            evidenceBasis:
                ENGINEERING_EVIDENCE_BASIS
                    .MEASURED,

            calculationMethod:
                definition
                    .calculationMethod,

            reportingWindow,

            scope,

            observability:
                buildCounterObservability({

                    sampleCount:
                        series.length,

                    deviceStatus:
                        deviceResolution
                            .status,
                }),

            dataQuality:
                buildCounterDataQuality({

                    sampleCount:
                        series.length,

                    rejectedValues,

                    decreases:
                        monotonicity
                            .decreases,

                    status:
                        ENGINEERING_METRIC_STATUS
                            .UNAVAILABLE,
                }),

            sources:
                metricSources(
                    attributeId
                ),

            metadata: {

                attributeId:
                    Number(
                        attributeId
                    ),

                semanticType:
                    definition
                        .semanticType,

                sampleCount:
                    series.length,

                rejectedValues,

                selectedDeviceInstance:
                    deviceResolution
                        .selectedDeviceInstance,

                decreases:
                    monotonicity
                        .decreases,

                largestDecrease:
                    round(
                        monotonicity
                            .largestDecrease
                    ),

                counterResetAssumed:
                    false,

                observedDelta:
                    null,
            },
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Observed-span evidence
    |--------------------------------------------------------------------------
    */

    const observed =
        calculateObservedSpan(
            series
        );


    /*
    |--------------------------------------------------------------------------
    | Reporting-window boundary qualification
    |--------------------------------------------------------------------------
    */

    const boundaryQualification =
        qualifyReportingBoundaries({

            series,

            reportingWindow,

            boundaryToleranceMinutes:
                effectiveConfig
                    .boundaryToleranceMinutes,
        });


    /*
    |--------------------------------------------------------------------------
    | Exact reporting-window result
    |--------------------------------------------------------------------------
    */

    if (
        boundaryQualification.status ===
        ENGINEERING_METRIC_STATUS
            .CALCULATED
    ) {

        const delta =
            boundaryQualification
                .endPoint
                .value -
            boundaryQualification
                .startPoint
                .value;


        return buildCalculatedEngineeringMetric({

            key:
                definition.key,

            label:
                definition.label,

            family:
                ENGINEERING_METRIC_FAMILY
                    .BATTERY,

            reason:
                boundaryQualification
                    .reason,

            value:
                round(
                    delta
                ),

            unit:
                definition.unit,

            evidenceBasis:
                ENGINEERING_EVIDENCE_BASIS
                    .DERIVED,

            calculationMethod:
                definition
                    .calculationMethod,

            reportingWindow,

            scope,

            observability:
                buildCounterObservability({

                    sampleCount:
                        series.length,

                    deviceStatus:
                        deviceResolution
                            .status,
                }),

            dataQuality:
                buildCounterDataQuality({

                    sampleCount:
                        series.length,

                    rejectedValues,

                    decreases:
                        0,

                    status:
                        ENGINEERING_METRIC_STATUS
                            .CALCULATED,
                }),

            sources:
                metricSources(
                    attributeId
                ),

            metadata: {

                attributeId:
                    Number(
                        attributeId
                    ),

                semanticType:
                    definition
                        .semanticType,

                selectedDeviceInstance:
                    deviceResolution
                        .selectedDeviceInstance,

                sampleCount:
                    series.length,

                rejectedValues,

                reportingWindowDelta:
                    round(
                        delta
                    ),

                observedSpanDelta:
                    round(
                        observed
                            .delta
                    ),

                observedSpanHours:
                    round(
                        observed
                            .observedSpanHours
                    ),

                startBoundaryValue:
                    boundaryQualification
                        .startPoint
                        .value,

                endBoundaryValue:
                    boundaryQualification
                        .endPoint
                        .value,

                startBoundaryExact:
                    true,

                endBoundaryExact:
                    true,

                startBoundaryGapMinutes:
                    0,

                endBoundaryGapMinutes:
                    0,
            },
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Partial reporting-window result
    |--------------------------------------------------------------------------
    |
    | Caller explicitly established a tolerance and both boundaries fall
    | within it.
    |
    | This is PARTIALLY_CALCULATED, never CALCULATED.
    |
    |--------------------------------------------------------------------------
    */

    if (
        boundaryQualification.status ===
        ENGINEERING_METRIC_STATUS
            .PARTIALLY_CALCULATED
    ) {

        const delta =
            boundaryQualification
                .endPoint
                .value -
            boundaryQualification
                .startPoint
                .value;


        return buildPartialEngineeringMetric({

            key:
                definition.key,

            label:
                definition.label,

            family:
                ENGINEERING_METRIC_FAMILY
                    .BATTERY,

            reason:
                boundaryQualification
                    .reason,

            value:
                round(
                    delta
                ),

            unit:
                definition.unit,

            evidenceBasis:
                ENGINEERING_EVIDENCE_BASIS
                    .DERIVED,

            calculationMethod:
                definition
                    .calculationMethod,

            reportingWindow,

            scope,

            observability:
                buildCounterObservability({

                    sampleCount:
                        series.length,

                    deviceStatus:
                        deviceResolution
                            .status,
                }),

            dataQuality:
                buildCounterDataQuality({

                    sampleCount:
                        series.length,

                    rejectedValues,

                    decreases:
                        0,

                    status:
                        ENGINEERING_METRIC_STATUS
                            .PARTIALLY_CALCULATED,
                }),

            sources:
                metricSources(
                    attributeId
                ),

            metadata: {

                attributeId:
                    Number(
                        attributeId
                    ),

                semanticType:
                    definition
                        .semanticType,

                selectedDeviceInstance:
                    deviceResolution
                        .selectedDeviceInstance,

                sampleCount:
                    series.length,

                rejectedValues,

                reportingWindowDelta:
                    round(
                        delta
                    ),

                observedSpanDelta:
                    round(
                        observed
                            .delta
                    ),

                observedSpanHours:
                    round(
                        observed
                            .observedSpanHours
                    ),

                startBoundaryValue:
                    boundaryQualification
                        .startPoint
                        .value,

                endBoundaryValue:
                    boundaryQualification
                        .endPoint
                        .value,

                startBoundaryExact:
                    boundaryQualification
                        .startExact,

                endBoundaryExact:
                    boundaryQualification
                        .endExact,

                startBoundaryGapMinutes:
                    round(
                        boundaryQualification
                            .startBoundaryGapMinutes
                    ),

                endBoundaryGapMinutes:
                    round(
                        boundaryQualification
                            .endBoundaryGapMinutes
                    ),

                boundaryToleranceMinutes:
                    effectiveConfig
                        .boundaryToleranceMinutes,
            },
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Observed-span-only result
    |--------------------------------------------------------------------------
    |
    | This is deliberately PARTIALLY_CALCULATED.
    |
    | The value is real measured-span evidence, but the complete requested
    | reporting window has not been established.
    |
    |--------------------------------------------------------------------------
    */

    return buildPartialEngineeringMetric({

        key:
            definition.key,

        label:
            definition.label,

        family:
            ENGINEERING_METRIC_FAMILY
                .BATTERY,

        reason:
            BATTERY_CYCLE_THROUGHPUT_REASON
                .OBSERVED_SPAN_ONLY,

        value:
            round(
                observed
                    .delta
            ),

        unit:
            definition.unit,

        evidenceBasis:
            ENGINEERING_EVIDENCE_BASIS
                .DERIVED,

        calculationMethod:
            definition
                .calculationMethod,

        reportingWindow,

        scope,

        observability:
            buildCounterObservability({

                sampleCount:
                    series.length,

                deviceStatus:
                    deviceResolution
                        .status,
            }),

        dataQuality:
            buildCounterDataQuality({

                sampleCount:
                    series.length,

                rejectedValues,

                decreases:
                    0,

                status:
                    ENGINEERING_METRIC_STATUS
                        .PARTIALLY_CALCULATED,
            }),

        sources:
            metricSources(
                attributeId
            ),

        metadata: {

            attributeId:
                Number(
                    attributeId
                ),

            semanticType:
                definition
                    .semanticType,

            selectedDeviceInstance:
                deviceResolution
                    .selectedDeviceInstance,

            sampleCount:
                series.length,

            rejectedValues,

            observedSpanDelta:
                round(
                    observed
                        .delta
                ),

            observedSpanHours:
                round(
                    observed
                        .observedSpanHours
                ),

            observedSpanStart:
                observed
                    .firstTimestamp,

            observedSpanEnd:
                observed
                    .latestTimestamp,

            reportingWindowDelta:
                null,

            reportingWindowQualified:
                false,

            reportingWindowQualificationReason:
                boundaryQualification
                    .reason,

            boundaryToleranceMinutes:
                effectiveConfig
                    .boundaryToleranceMinutes,
        },
    });
}


/*
|--------------------------------------------------------------------------
| Public cumulative family engine
|--------------------------------------------------------------------------
*/

export function calculateBatteryCycleThroughputCumulative({
    records = [],
    start,
    end,
    deviceSelection = {},
    installationId = null,
    vrmSiteId = null,
    config = {},
} = {}) {

    const reportingWindow =
        resolveReportingWindow(
            start,
            end
        );


    const scope =
        resolveScope({

            installationId,

            vrmSiteId,
        });


    const metrics =
        BATTERY_CUMULATIVE_ATTRIBUTE_IDS
            .map(
                (
                    attributeId
                ) =>
                    calculateBatteryCumulativeMetric({

                        records,

                        attributeId,

                        start,

                        end,

                        selectedDeviceInstance:
                            deviceSelection[
                                attributeId
                            ] ??
                            null,

                        installationId,

                        vrmSiteId,

                        config,
                    })
            );


    return {

        ...buildEngineeringMetricFamily({

            family:
                ENGINEERING_METRIC_FAMILY
                    .BATTERY,

            metrics,

            reportingWindow,

            scope,

            boundary:
                BATTERY_CYCLE_THROUGHPUT_BOUNDARIES,
        }),

        category:
            "BATTERY_CYCLE_THROUGHPUT_CUMULATIVE",

        boundaries:
            BATTERY_CYCLE_THROUGHPUT_BOUNDARIES,

        config: {

            ...DEFAULT_BATTERY_CYCLE_THROUGHPUT_CONFIG,

            ...config,
        },

        deltaEnergy: {

            attributes: [
                BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                    .DISCHARGED_ENERGY_DELTA,

                BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE
                    .CHARGED_ENERGY_DELTA,
            ],

            calculationEnabled:
                false,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .DELTA_ENERGY_SEMANTICS_NOT_ESTABLISHED,
        },

        equivalentFullCycles: {

            calculationEnabled:
                false,

            reason:
                BATTERY_CYCLE_THROUGHPUT_REASON
                    .CAPACITY_NOT_ESTABLISHED,
        },
    };
}


export default {

    BATTERY_CYCLE_THROUGHPUT_ATTRIBUTE,

    BATTERY_CUMULATIVE_DEFINITION,

    BATTERY_CUMULATIVE_ATTRIBUTE_IDS,

    BATTERY_CYCLE_THROUGHPUT_REASON,

    BATTERY_CYCLE_THROUGHPUT_BOUNDARIES,

    DEFAULT_BATTERY_CYCLE_THROUGHPUT_CONFIG,

    calculateBatteryCumulativeMetric,

    calculateBatteryCycleThroughputCumulative,
};