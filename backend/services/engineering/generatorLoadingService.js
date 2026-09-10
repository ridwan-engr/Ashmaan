// services/engineering/generatorLoadingService.js

import {
    GENERATOR_ENGINE_LOAD_419,
    GENERATOR_ELECTRICAL_LOADING_SEMANTICS,
    isQualifiedGeneratorEngineLoadAttribute,
} from "./generatorLoadingSemantics.js";

import {
    GENERATOR_OPERATING_STATE,
    classifyGeneratorStatus416,
} from "./generatorRuntimeStateSemantics.js";


/*
|--------------------------------------------------------------------------
| Phase 8.5E-C
| Pure Generator Loading Analytics Engine
|--------------------------------------------------------------------------
|
| Supported:
|
| - direct attr 419 raw engine-load statistics
| - running-state engine-load statistics
| - observed zero values
| - data coverage / observability
|
| Explicitly NOT supported:
|
| - engine-load %
| - electrical loading %
| - rated-kW utilization
| - rated-kVA utilization
| - overload classification
|--------------------------------------------------------------------------
*/


export const GENERATOR_LOADING_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GENERATOR_LOADING_REASON =
    Object.freeze({

        ENGINE_LOAD_QUALIFIED:
            "ENGINE_LOAD_QUALIFIED",

        ENGINE_LOAD_PARTIAL:
            "ENGINE_LOAD_PARTIAL",

        NO_ENGINE_LOAD_EVIDENCE:
            "NO_ENGINE_LOAD_EVIDENCE",

        INSUFFICIENT_ENGINE_LOAD_SAMPLES:
            "INSUFFICIENT_ENGINE_LOAD_SAMPLES",

        MULTIPLE_ENGINE_LOAD_DEVICES_AMBIGUOUS:
            "MULTIPLE_ENGINE_LOAD_DEVICES_AMBIGUOUS",

        RUNNING_STATE_NOT_ESTABLISHED:
            "RUNNING_STATE_NOT_ESTABLISHED",

        ELECTRICAL_LOADING_RATED_CAPACITY_UNAVAILABLE:
            "ELECTRICAL_LOADING_RATED_CAPACITY_UNAVAILABLE",
    });


export const DEFAULT_GENERATOR_LOADING_CONFIG =
    Object.freeze({

        minimumSamples:
            2,

        stateCorrelationToleranceMinutes:
            10,
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


function mean(
    values
) {

    if (!values.length) {

        return null;
    }


    return values.reduce(
        (
            sum,
            value
        ) =>
            sum + value,
        0
    ) /
    values.length;
}


function median(
    values
) {

    if (!values.length) {

        return null;
    }


    const sorted =
        [...values]
            .sort(
                (
                    a,
                    b
                ) =>
                    a - b
            );


    const middle =
        Math.floor(
            sorted.length / 2
        );


    if (
        sorted.length % 2 ===
        0
    ) {

        return (
            sorted[
                middle - 1
            ] +
            sorted[
                middle
            ]
        ) / 2;
    }


    return sorted[
        middle
    ];
}


function standardDeviation(
    values
) {

    if (
        values.length <
        2
    ) {

        return null;
    }


    const average =
        mean(
            values
        );


    const variance =
        values.reduce(
            (
                sum,
                value
            ) => {

                const difference =
                    value -
                    average;


                return sum +
                    difference *
                    difference;
            },
            0
        ) /
        values.length;


    return Math.sqrt(
        variance
    );
}


function coefficientOfVariation(
    values
) {

    const average =
        mean(
            values
        );


    const deviation =
        standardDeviation(
            values
        );


    if (
        average === null ||
        deviation === null ||
        average === 0
    ) {

        return null;
    }


    return deviation /
        average;
}


function normalizeDeviceInstance(
    value
) {

    return String(
        value ??
        "UNKNOWN"
    );
}


function percentage(
    numerator,
    denominator
) {

    if (!denominator) {

        return null;
    }


    return Number(
        (
            numerator /
            denominator *
            100
        ).toFixed(
            4
        )
    );
}


/*
|--------------------------------------------------------------------------
| Reporting window
|--------------------------------------------------------------------------
*/

function filterReportingWindow(
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


/*
|--------------------------------------------------------------------------
| Engine-load device grouping
|--------------------------------------------------------------------------
*/

function groupEngineLoadByDevice(
    records
) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        if (
            !isQualifiedGeneratorEngineLoadAttribute(
                record.vrmAttributeId
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


function selectEngineLoadSeries(
    records,
    selectedDeviceInstance = null
) {

    const groups =
        groupEngineLoadByDevice(
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
| Nearest qualified generator state
|--------------------------------------------------------------------------
*/

function nearestState(
    stateRecords,
    targetTimestamp,
    toleranceMs
) {

    let best =
        null;

    let bestDistance =
        Infinity;


    for (
        const record
        of stateRecords
    ) {

        const timestamp =
            asDate(
                record.timestamp
            );


        if (!timestamp) {

            continue;
        }


        const distance =
            Math.abs(
                timestamp -
                targetTimestamp
            );


        if (
            distance <= toleranceMs &&
            distance < bestDistance
        ) {

            best =
                record;

            bestDistance =
                distance;
        }
    }


    if (!best) {

        return GENERATOR_OPERATING_STATE
            .UNKNOWN;
    }


    return classifyGeneratorStatus416(
        best.numericValue ??
        best.value
    );
}


/*
|--------------------------------------------------------------------------
| Metric builders
|--------------------------------------------------------------------------
*/

function unavailableMetric(
    reason,
    metadata = {}
) {

    return {

        status:
            GENERATOR_LOADING_STATUS
                .UNAVAILABLE,

        value:
            null,

        unit:
            null,

        reason,

        metadata,
    };
}


function calculatedMetric(
    value,
    metadata = {}
) {

    return {

        status:
            GENERATOR_LOADING_STATUS
                .CALCULATED,

        value,

        unit:
            null,

        reason:
            GENERATOR_LOADING_REASON
                .ENGINE_LOAD_QUALIFIED,

        metadata,
    };
}


function partialMetric(
    value,
    metadata = {}
) {

    return {

        status:
            GENERATOR_LOADING_STATUS
                .PARTIALLY_CALCULATED,

        value,

        unit:
            null,

        reason:
            GENERATOR_LOADING_REASON
                .ENGINE_LOAD_PARTIAL,

        metadata,
    };
}


/*
|--------------------------------------------------------------------------
| Main calculation
|--------------------------------------------------------------------------
*/

export function calculateGeneratorLoadingAnalytics({
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
        reportingStart >= reportingEnd
    ) {

        throw new Error(
            "A valid [start,end) generator loading reporting window is required."
        );
    }


    const resolvedConfig =
        {
            ...DEFAULT_GENERATOR_LOADING_CONFIG,
            ...config,
        };


    const windowRecords =
        filterReportingWindow(
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


    const engineLoadSelection =
        selectEngineLoadSeries(
            windowRecords,
            selectedDeviceInstance
        );


    /*
    |--------------------------------------------------------------------------
    | No engine-load evidence
    |--------------------------------------------------------------------------
    */

    if (
        engineLoadSelection.status ===
        "NONE"
    ) {

        return {

            family:
                "GENERATOR_LOADING",

            status:
                GENERATOR_LOADING_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics: {

                averageEngineLoad:
                    unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .NO_ENGINE_LOAD_EVIDENCE
                    ),

                medianEngineLoad:
                    unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .NO_ENGINE_LOAD_EVIDENCE
                    ),

                minimumEngineLoad:
                    unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .NO_ENGINE_LOAD_EVIDENCE
                    ),

                maximumEngineLoad:
                    unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .NO_ENGINE_LOAD_EVIDENCE
                    ),

                runningAverageEngineLoad:
                    unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .NO_ENGINE_LOAD_EVIDENCE
                    ),

                electricalLoadingPercent:
                    unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .ELECTRICAL_LOADING_RATED_CAPACITY_UNAVAILABLE
                    ),
            },

            source:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Multiple generator engine-load devices
    |--------------------------------------------------------------------------
    */

    if (
        engineLoadSelection.status ===
        "AMBIGUOUS"
    ) {

        return {

            family:
                "GENERATOR_LOADING",

            status:
                GENERATOR_LOADING_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics: {

                averageEngineLoad:
                    unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .MULTIPLE_ENGINE_LOAD_DEVICES_AMBIGUOUS,
                        {

                            deviceInstances:
                                engineLoadSelection
                                    .deviceInstances,
                        }
                    ),

                electricalLoadingPercent:
                    unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .ELECTRICAL_LOADING_RATED_CAPACITY_UNAVAILABLE
                    ),
            },

            source:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Numeric engine-load observations
    |--------------------------------------------------------------------------
    */

    const samples =
        engineLoadSelection
            .records
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
                    sample
                ) =>
                    sample.timestamp &&
                    sample.value !== null
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
        samples.length <
        resolvedConfig.minimumSamples
    ) {

        return {

            family:
                "GENERATOR_LOADING",

            status:
                GENERATOR_LOADING_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            metrics: {

                averageEngineLoad:
                    unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .INSUFFICIENT_ENGINE_LOAD_SAMPLES,
                        {

                            sampleCount:
                                samples.length,
                        }
                    ),

                electricalLoadingPercent:
                    unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .ELECTRICAL_LOADING_RATED_CAPACITY_UNAVAILABLE
                    ),
            },

            source: {

                attributeId:
                    419,

                deviceInstance:
                    engineLoadSelection
                        .deviceInstance,

                basis:
                    "DIRECT_ENGINE_LOAD_MEASUREMENT",
            },
        };
    }


    const values =
        samples.map(
            (
                sample
            ) =>
                sample.value
        );


    /*
    |--------------------------------------------------------------------------
    | Qualified running-state subset
    |--------------------------------------------------------------------------
    */

    const stateRecords =
        windowRecords.filter(
            (
                record
            ) =>
                Number(
                    record.vrmAttributeId
                ) ===
                416
        );


    const toleranceMs =
        Number(
            resolvedConfig
                .stateCorrelationToleranceMinutes
        ) *
        60 *
        1000;


    const runningValues =
        [];

    let stateMatchedSamples =
        0;

    let stoppedMatchedSamples =
        0;

    let unknownStateSamples =
        0;


    for (
        const sample
        of samples
    ) {

        const state =
            nearestState(
                stateRecords,
                sample.timestamp,
                toleranceMs
            );


        if (
            state ===
            GENERATOR_OPERATING_STATE
                .RUNNING
        ) {

            stateMatchedSamples +=
                1;


            runningValues.push(
                sample.value
            );


            continue;
        }


        if (
            state ===
            GENERATOR_OPERATING_STATE
                .STOPPED
        ) {

            stoppedMatchedSamples +=
                1;


            continue;
        }


        unknownStateSamples +=
            1;
    }


    /*
    |--------------------------------------------------------------------------
    | Overall raw engine-load statistics
    |--------------------------------------------------------------------------
    */

    const average =
        mean(
            values
        );


    const med =
        median(
            values
        );


    const minimum =
        Math.min(
            ...values
        );


    const maximum =
        Math.max(
            ...values
        );


    const deviation =
        standardDeviation(
            values
        );


    const variation =
        coefficientOfVariation(
            values
        );


    const stateCoveragePercent =
        percentage(
            stateMatchedSamples +
                stoppedMatchedSamples,
            samples.length
        );


    const partial =
        unknownStateSamples >
        0;


    const metricBuilder =
        partial
            ? partialMetric
            : calculatedMetric;


    /*
    |--------------------------------------------------------------------------
    | Running-only values
    |--------------------------------------------------------------------------
    */

    const runningAverage =
        runningValues.length
            ? mean(
                runningValues
            )
            : null;


    const runningMedian =
        runningValues.length
            ? median(
                runningValues
            )
            : null;


    const runningMinimum =
        runningValues.length
            ? Math.min(
                ...runningValues
            )
            : null;


    const runningMaximum =
        runningValues.length
            ? Math.max(
                ...runningValues
            )
            : null;


    /*
    |--------------------------------------------------------------------------
    | Final result
    |--------------------------------------------------------------------------
    */

    return {

        family:
            "GENERATOR_LOADING",

        status:
            partial
                ? GENERATOR_LOADING_STATUS
                    .PARTIALLY_CALCULATED
                : GENERATOR_LOADING_STATUS
                    .CALCULATED,

        reportingWindow,

        metrics: {

            averageEngineLoad:
                metricBuilder(
                    average,
                    {

                        sampleCount:
                            samples.length,
                    }
                ),

            medianEngineLoad:
                metricBuilder(
                    med,
                    {

                        sampleCount:
                            samples.length,
                    }
                ),

            minimumEngineLoad:
                metricBuilder(
                    minimum,
                    {

                        sampleCount:
                            samples.length,
                    }
                ),

            maximumEngineLoad:
                metricBuilder(
                    maximum,
                    {

                        sampleCount:
                            samples.length,
                    }
                ),

            engineLoadStandardDeviation:
                metricBuilder(
                    deviation,
                    {

                        sampleCount:
                            samples.length,
                    }
                ),

            engineLoadCoefficientOfVariation:
                metricBuilder(
                    variation,
                    {

                        sampleCount:
                            samples.length,
                    }
                ),

            runningAverageEngineLoad:
                runningAverage === null
                    ? unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .RUNNING_STATE_NOT_ESTABLISHED
                    )
                    : metricBuilder(
                        runningAverage,
                        {

                            runningSampleCount:
                                runningValues.length,
                        }
                    ),

            runningMedianEngineLoad:
                runningMedian === null
                    ? unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .RUNNING_STATE_NOT_ESTABLISHED
                    )
                    : metricBuilder(
                        runningMedian,
                        {

                            runningSampleCount:
                                runningValues.length,
                        }
                    ),

            runningMinimumEngineLoad:
                runningMinimum === null
                    ? unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .RUNNING_STATE_NOT_ESTABLISHED
                    )
                    : metricBuilder(
                        runningMinimum,
                        {

                            runningSampleCount:
                                runningValues.length,
                        }
                    ),

            runningMaximumEngineLoad:
                runningMaximum === null
                    ? unavailableMetric(
                        GENERATOR_LOADING_REASON
                            .RUNNING_STATE_NOT_ESTABLISHED
                    )
                    : metricBuilder(
                        runningMaximum,
                        {

                            runningSampleCount:
                                runningValues.length,
                        }
                    ),

            stateCorrelationCoveragePercent:
                metricBuilder(
                    stateCoveragePercent,
                    {

                        matchedRunningSamples:
                            stateMatchedSamples,

                        matchedStoppedSamples:
                            stoppedMatchedSamples,

                        unknownStateSamples,

                        totalSamples:
                            samples.length,
                    }
                ),

            /*
             * Explicitly unavailable.
             */

            electricalLoadingPercent:
                unavailableMetric(
                    GENERATOR_LOADING_REASON
                        .ELECTRICAL_LOADING_RATED_CAPACITY_UNAVAILABLE,
                    {

                        ratedActivePowerEstablished:
                            GENERATOR_ELECTRICAL_LOADING_SEMANTICS
                                .ratedActivePowerEstablished,
                    }
                ),

            kvaLoadingPercent:
                unavailableMetric(
                    GENERATOR_LOADING_REASON
                        .ELECTRICAL_LOADING_RATED_CAPACITY_UNAVAILABLE,
                    {

                        ratedApparentPowerEstablished:
                            GENERATOR_ELECTRICAL_LOADING_SEMANTICS
                                .ratedApparentPowerEstablished,
                    }
                ),
        },

        evidence: {

            attributeId:
                GENERATOR_ENGINE_LOAD_419
                    .attributeId,

            rawUnitEstablished:
                false,

            percentQualified:
                false,

            sampleCount:
                samples.length,

            runningSampleCount:
                runningValues.length,

            stoppedMatchedSamples,

            unknownStateSamples,

            stateCoveragePercent,
        },

        source: {

            attributeId:
                419,

            deviceInstance:
                engineLoadSelection
                    .deviceInstance,

            basis:
                "DIRECT_ENGINE_LOAD_MEASUREMENT",
        },

        boundaries: {

            engineLoadUnitEstablished:
                false,

            engineLoadPercent:
                false,

            engineLoadEqualsElectricalLoading:
                false,

            ratedGeneratorKWEstablished:
                false,

            ratedGeneratorKVAEstablished:
                false,

            electricalLoadingPercentCalculable:
                false,

            overloadThresholdEstablished:
                false,

            zeroEngineLoadMeansFailure:
                false,

            zeroEngineLoadMeansUnavailable:
                false,
        },
    };
}


export default {

    GENERATOR_LOADING_STATUS,

    GENERATOR_LOADING_REASON,

    DEFAULT_GENERATOR_LOADING_CONFIG,

    calculateGeneratorLoadingAnalytics,
};