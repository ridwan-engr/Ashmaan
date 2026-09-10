// services/engineering/batteryAnalyticsService.js

import {
    BATTERY_CALCULATION_ROLE,
    getPreferredSocAttributes,
    getBatteryAttributesByRole,
    BATTERY_ANALYTICS_BOUNDARIES,
} from "./batteryAttributeMap.js";


/*
|--------------------------------------------------------------------------
| Phase 8.4C
| Battery Analytics Calculation Engine
|--------------------------------------------------------------------------
|
| Pure calculation service.
|
| No MongoDB.
| No API.
| No frontend.
|
| Calculates:
|
| - SOC profile
| - voltage profile
| - signed current profile
| - temperature profile
| - signed battery-power profile
| - algebraic signed battery-energy integral
|
| Does NOT calculate:
|
| - charge energy from signed power
| - discharge energy from signed power
| - DoD
| - cycles
| - throughput
| - SOH where not directly observed
| - battery availability
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Status
|--------------------------------------------------------------------------
*/

export const BATTERY_ANALYTICS_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


/*
|--------------------------------------------------------------------------
| Reasons
|--------------------------------------------------------------------------
*/

export const BATTERY_ANALYTICS_REASON =
    Object.freeze({

        QUALIFIED:
            "QUALIFIED",

        PARTIAL_TEMPORAL_COVERAGE:
            "PARTIAL_TEMPORAL_COVERAGE",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",

        SIGNAL_NOT_OBSERVED:
            "SIGNAL_NOT_OBSERVED",

        INSUFFICIENT_QUALIFIED_SAMPLES:
            "INSUFFICIENT_QUALIFIED_SAMPLES",

        MULTIPLE_DEVICES_AMBIGUOUS:
            "MULTIPLE_DEVICES_AMBIGUOUS",

        INVALID_NUMERIC_VALUE:
            "INVALID_NUMERIC_VALUE",

        SOC_OUT_OF_RANGE:
            "SOC_OUT_OF_RANGE",

        TEMPERATURE_OUT_OF_PLAUSIBLE_RANGE:
            "TEMPERATURE_OUT_OF_PLAUSIBLE_RANGE",
    });


/*
|--------------------------------------------------------------------------
| Default configuration
|--------------------------------------------------------------------------
*/

export const DEFAULT_BATTERY_ANALYTICS_CONFIG =
    Object.freeze({

        bucketSeconds:
            60,

        maxInterpolationGapMinutes:
            30,

        goodCoveragePercent:
            80,

        partialCoveragePercent:
            20,

        minimumSamples:
            2,

        minimumSocPercent:
            0,

        maximumSocPercent:
            100,

        minimumPlausibleTemperatureC:
            -50,

        maximumPlausibleTemperatureC:
            100,
    });


/*
|--------------------------------------------------------------------------
| Units
|--------------------------------------------------------------------------
*/

const METRIC_UNIT =
    Object.freeze({

        PERCENT:
            "%",

        VOLT:
            "V",

        AMPERE:
            "A",

        CELSIUS:
            "°C",

        KW:
            "kW",

        KWH:
            "kWh",
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function finite(
    value
) {

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


function numericTelemetryValue(
    record
) {

    const candidate =
        record?.numericValue ??
        record?.value;


    return finite(
        candidate
    );
}


function normalizedDeviceInstance(
    record
) {

    return String(
        record?.deviceInstance ??
        "UNKNOWN"
    );
}


function validReportingWindow(
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


    return {

        start:
            startDate,

        end:
            endDate,

        semantics:
            "[start,end)",
    };
}


function getAttributeId(
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


/*
|--------------------------------------------------------------------------
| Metric builders
|--------------------------------------------------------------------------
*/

function unavailableMetric({
    key,
    label,
    unit,
    reason,
    evidence = {},
} = {}) {

    return {

        key,

        label,

        unit,

        status:
            BATTERY_ANALYTICS_STATUS
                .UNAVAILABLE,

        reason,

        value:
            null,

        evidence,
    };
}


function availableMetric({
    key,
    label,
    unit,
    value,
    status,
    reason,
    evidence = {},
} = {}) {

    return {

        key,

        label,

        unit,

        status,

        reason,

        value:
            round(
                value
            ),

        evidence,
    };
}


/*
|--------------------------------------------------------------------------
| Resolve device selection
|--------------------------------------------------------------------------
|
| Never combine multiple same-role battery devices implicitly.
|
|--------------------------------------------------------------------------
*/

function resolveDeviceRecords({
    records,
    attributeId,
    selectedDeviceInstance,
} = {}) {

    const attributeRecords =
        records.filter(
            (
                record
            ) =>
                getAttributeId(
                    record
                ) ===
                Number(
                    attributeId
                )
        );


    if (
        attributeRecords.length ===
        0
    ) {

        return {

            records:
                [],

            status:
                "NOT_OBSERVED",

            selectedDeviceInstance:
                null,

            deviceInstances:
                [],
        };
    }


    const devices =
        Array.from(
            new Set(
                attributeRecords.map(
                    normalizedDeviceInstance
                )
            )
        );


    if (
        selectedDeviceInstance !==
        undefined &&
        selectedDeviceInstance !==
        null
    ) {

        const selected =
            String(
                selectedDeviceInstance
            );


        return {

            records:
                attributeRecords.filter(
                    (
                        record
                    ) =>
                        normalizedDeviceInstance(
                            record
                        ) ===
                        selected
                ),

            status:
                "SELECTED",

            selectedDeviceInstance:
                selected,

            deviceInstances:
                devices,
        };
    }


    if (
        devices.length >
        1
    ) {

        return {

            records:
                [],

            status:
                "AMBIGUOUS",

            selectedDeviceInstance:
                null,

            deviceInstances:
                devices,
        };
    }


    return {

        records:
            attributeRecords,

        status:
            "UNAMBIGUOUS",

        selectedDeviceInstance:
            devices[0] ??
            null,

        deviceInstances:
            devices,
    };
}


/*
|--------------------------------------------------------------------------
| Resolve preferred telemetry attribute
|--------------------------------------------------------------------------
*/

function resolvePreferredAttribute({
    records,
    definitions,
    deviceSelection = {},
} = {}) {

    for (
        const definition
        of definitions
    ) {

        const attributeId =
            definition
                .attributeId;


        const resolved =
            resolveDeviceRecords({

                records,

                attributeId,

                selectedDeviceInstance:
                    deviceSelection[
                        attributeId
                    ],
            });


        /*
         * If a higher-priority signal exists but is ambiguous, do not
         * silently skip to a lower-priority signal. That could select a
         * different battery identity.
         */

        if (
            resolved.status ===
            "AMBIGUOUS"
        ) {

            return {

                definition,

                ...resolved,
            };
        }


        if (
            resolved.records.length >
            0
        ) {

            return {

                definition,

                ...resolved,
            };
        }
    }


    return {

        definition:
            null,

        records:
            [],

        status:
            "NOT_OBSERVED",

        selectedDeviceInstance:
            null,

        deviceInstances:
            [],
    };
}


/*
|--------------------------------------------------------------------------
| Bucket scalar time series
|--------------------------------------------------------------------------
*/

function buildScalarSeries({
    records,
    start,
    end,
    bucketSeconds,
    validator = null,
} = {}) {

    const bucketMs =
        bucketSeconds *
        1000;


    const buckets =
        new Map();


    let rejectedValues =
        0;


    for (
        const record
        of records
    ) {

        const timestamp =
            asDate(
                record.timestamp
            );


        if (
            !timestamp ||
            timestamp <
                start ||
            timestamp >=
                end
        ) {

            continue;
        }


        const value =
            numericTelemetryValue(
                record
            );


        if (
            value ===
            null
        ) {

            rejectedValues +=
                1;

            continue;
        }


        if (
            validator &&
            validator(
                value
            ) !==
            true
        ) {

            rejectedValues +=
                1;

            continue;
        }


        const bucketTimestamp =
            Math.floor(
                timestamp.getTime() /
                bucketMs
            ) *
            bucketMs;


        if (
            !buckets.has(
                bucketTimestamp
            )
        ) {

            buckets.set(
                bucketTimestamp,
                []
            );
        }


        buckets
            .get(
                bucketTimestamp
            )
            .push(
                value
            );
    }


    const series =
        Array.from(
            buckets.entries()
        )
            .map(
                (
                    [
                        timestamp,
                        values,
                    ]
                ) => ({

                    timestamp:
                        new Date(
                            Number(
                                timestamp
                            )
                        ),

                    value:
                        values.reduce(
                            (
                                total,
                                value
                            ) =>
                                total +
                                value,
                            0
                        ) /
                        values.length,
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


    return {

        series,

        rejectedValues,
    };
}


/*
|--------------------------------------------------------------------------
| Integrate / summarize scalar series
|--------------------------------------------------------------------------
*/

function summarizeScalarSeries({
    series,
    reportingWindow,
    maxInterpolationGapMinutes,
} = {}) {

    if (
        !Array.isArray(
            series
        ) ||
        series.length <
        2
    ) {

        return null;
    }


    const maxGapMs =
        maxInterpolationGapMinutes *
        60 *
        1000;


    let weightedIntegral =
        0;


    let observedSeconds =
        0;


    let minValue =
        Infinity;


    let maxValue =
        -Infinity;


    let qualifiedIntervals =
        0;


    for (
        const point
        of series
    ) {

        minValue =
            Math.min(
                minValue,
                point.value
            );


        maxValue =
            Math.max(
                maxValue,
                point.value
            );
    }


    for (
        let index = 1;
        index <
        series.length;
        index += 1
    ) {

        const previous =
            series[
                index -
                1
            ];


        const current =
            series[
                index
            ];


        const gapMs =
            current.timestamp
                .getTime() -
            previous.timestamp
                .getTime();


        if (
            gapMs <=
            0 ||
            gapMs >
            maxGapMs
        ) {

            continue;
        }


        const gapSeconds =
            gapMs /
            1000;


        const averageIntervalValue =
            (
                previous.value +
                current.value
            ) /
            2;


        weightedIntegral +=
            averageIntervalValue *
            gapSeconds;


        observedSeconds +=
            gapSeconds;


        qualifiedIntervals +=
            1;
    }


    if (
        observedSeconds <=
        0
    ) {

        return null;
    }


    const reportingSeconds =
        (
            reportingWindow.end -
            reportingWindow.start
        ) /
        1000;


    const temporalCoveragePercent =
        reportingSeconds >
        0
            ? (
                observedSeconds /
                reportingSeconds *
                100
            )
            : 0;


    return {

        sampleCount:
            series.length,

        qualifiedIntervals,

        observedSeconds,

        observedHours:
            observedSeconds /
            3600,

        temporalCoveragePercent,

        minimum:
            minValue,

        maximum:
            maxValue,

        average:
            weightedIntegral /
            observedSeconds,

        integralValueSeconds:
            weightedIntegral,
    };
}


/*
|--------------------------------------------------------------------------
| Evidence status
|--------------------------------------------------------------------------
*/

function determineStatus({
    sampleCount,
    temporalCoveragePercent,
    config,
} = {}) {

    if (
        sampleCount <
        config.minimumSamples
    ) {

        return {

            status:
                BATTERY_ANALYTICS_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_ANALYTICS_REASON
                    .INSUFFICIENT_QUALIFIED_SAMPLES,
        };
    }


    if (
        temporalCoveragePercent >=
        config.goodCoveragePercent
    ) {

        return {

            status:
                BATTERY_ANALYTICS_STATUS
                    .CALCULATED,

            reason:
                BATTERY_ANALYTICS_REASON
                    .QUALIFIED,
        };
    }


    if (
        temporalCoveragePercent >=
        config.partialCoveragePercent
    ) {

        return {

            status:
                BATTERY_ANALYTICS_STATUS
                    .PARTIALLY_CALCULATED,

            reason:
                BATTERY_ANALYTICS_REASON
                    .PARTIAL_TEMPORAL_COVERAGE,
        };
    }


    return {

        status:
            BATTERY_ANALYTICS_STATUS
                .UNAVAILABLE,

        reason:
            BATTERY_ANALYTICS_REASON
                .INSUFFICIENT_QUALIFIED_SAMPLES,
    };
}


/*
|--------------------------------------------------------------------------
| Scalar family calculation
|--------------------------------------------------------------------------
*/

function calculateScalarFamily({
    records,
    definition,
    reportingWindow,
    config,
    validator,
    metricDefinitions,
    deviceEvidence,
} = {}) {

    if (
        !definition
    ) {

        return {

            status:
                BATTERY_ANALYTICS_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_ANALYTICS_REASON
                    .SIGNAL_NOT_OBSERVED,

            attributeId:
                null,

            metrics:
                metricDefinitions.map(
                    (
                        metric
                    ) =>
                        unavailableMetric({

                            ...metric,

                            reason:
                                BATTERY_ANALYTICS_REASON
                                    .SIGNAL_NOT_OBSERVED,
                        })
                ),
        };
    }


    if (
        deviceEvidence
            ?.status ===
        "AMBIGUOUS"
    ) {

        return {

            status:
                BATTERY_ANALYTICS_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_ANALYTICS_REASON
                    .MULTIPLE_DEVICES_AMBIGUOUS,

            attributeId:
                definition
                    .attributeId,

            metrics:
                metricDefinitions.map(
                    (
                        metric
                    ) =>
                        unavailableMetric({

                            ...metric,

                            reason:
                                BATTERY_ANALYTICS_REASON
                                    .MULTIPLE_DEVICES_AMBIGUOUS,

                            evidence: {
                                deviceInstances:
                                    deviceEvidence
                                        .deviceInstances,
                            },
                        })
                ),
        };
    }


    const {
        series,
        rejectedValues,
    } =
        buildScalarSeries({

            records,

            start:
                reportingWindow
                    .start,

            end:
                reportingWindow
                    .end,

            bucketSeconds:
                config
                    .bucketSeconds,

            validator,
        });


    const summary =
        summarizeScalarSeries({

            series,

            reportingWindow,

            maxInterpolationGapMinutes:
                config
                    .maxInterpolationGapMinutes,
        });


    if (!summary) {

        return {

            status:
                BATTERY_ANALYTICS_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_ANALYTICS_REASON
                    .INSUFFICIENT_QUALIFIED_SAMPLES,

            attributeId:
                definition
                    .attributeId,

            metrics:
                metricDefinitions.map(
                    (
                        metric
                    ) =>
                        unavailableMetric({

                            ...metric,

                            reason:
                                BATTERY_ANALYTICS_REASON
                                    .INSUFFICIENT_QUALIFIED_SAMPLES,

                            evidence: {
                                samples:
                                    series.length,

                                rejectedValues,
                            },
                        })
                ),
        };
    }


    const state =
        determineStatus({

            sampleCount:
                summary
                    .sampleCount,

            temporalCoveragePercent:
                summary
                    .temporalCoveragePercent,

            config,
        });


    const commonEvidence = {

        attributeId:
            definition
                .attributeId,

        label:
            definition
                .label,

        selectedDeviceInstance:
            deviceEvidence
                ?.selectedDeviceInstance ??
            null,

        sampleCount:
            summary
                .sampleCount,

        qualifiedIntervals:
            summary
                .qualifiedIntervals,

        observedHours:
            round(
                summary
                    .observedHours
            ),

        temporalCoveragePercent:
            round(
                summary
                    .temporalCoveragePercent,
                3
            ),

        rejectedValues,
    };


    if (
        state.status ===
        BATTERY_ANALYTICS_STATUS
            .UNAVAILABLE
    ) {

        return {

            status:
                state.status,

            reason:
                state.reason,

            attributeId:
                definition
                    .attributeId,

            metrics:
                metricDefinitions.map(
                    (
                        metric
                    ) =>
                        unavailableMetric({

                            ...metric,

                            reason:
                                state.reason,

                            evidence:
                                commonEvidence,
                        })
                ),
        };
    }


    const values = {

        minimum:
            summary
                .minimum,

        maximum:
            summary
                .maximum,

        average:
            summary
                .average,
    };


    return {

        status:
            state.status,

        reason:
            state.reason,

        attributeId:
            definition
                .attributeId,

        metrics:
            metricDefinitions.map(
                (
                    metric
                ) =>
                    availableMetric({

                        ...metric,

                        value:
                            values[
                                metric
                                    .source
                            ],

                        status:
                            state.status,

                        reason:
                            state.reason,

                        evidence:
                            commonEvidence,
                    })
            ),
    };
}


/*
|--------------------------------------------------------------------------
| Public calculation engine
|--------------------------------------------------------------------------
*/

export function calculateBatteryAnalytics({
    records = [],
    start,
    end,
    deviceSelection = {},
    config = {},
} = {}) {

    const effectiveConfig = {

        ...DEFAULT_BATTERY_ANALYTICS_CONFIG,

        ...config,
    };


    const reportingWindow =
        validReportingWindow(
            start,
            end
        );


    if (!reportingWindow) {

        return {

            family:
                "BATTERY",

            status:
                BATTERY_ANALYTICS_STATUS
                    .UNAVAILABLE,

            reason:
                BATTERY_ANALYTICS_REASON
                    .INVALID_REPORTING_WINDOW,

            reportingWindow:
                null,

            profiles:
                {},

            boundaries:
                BATTERY_ANALYTICS_BOUNDARIES,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | SOC
    |--------------------------------------------------------------------------
    */

    const socResolved =
        resolvePreferredAttribute({

            records,

            definitions:
                getPreferredSocAttributes(),

            deviceSelection,
        });


    const soc =
        calculateScalarFamily({

            records:
                socResolved
                    .records,

            definition:
                socResolved
                    .definition,

            deviceEvidence:
                socResolved,

            reportingWindow,

            config:
                effectiveConfig,

            validator:
                (
                    value
                ) =>
                    value >=
                        effectiveConfig
                            .minimumSocPercent &&
                    value <=
                        effectiveConfig
                            .maximumSocPercent,

            metricDefinitions: [
                {
                    key:
                        "minimumSocPercent",

                    label:
                        "Minimum SOC",

                    unit:
                        METRIC_UNIT
                            .PERCENT,

                    source:
                        "minimum",
                },
                {
                    key:
                        "maximumSocPercent",

                    label:
                        "Maximum SOC",

                    unit:
                        METRIC_UNIT
                            .PERCENT,

                    source:
                        "maximum",
                },
                {
                    key:
                        "averageSocPercent",

                    label:
                        "Average SOC",

                    unit:
                        METRIC_UNIT
                            .PERCENT,

                    source:
                        "average",
                },
            ],
        });


    /*
    |--------------------------------------------------------------------------
    | Voltage
    |--------------------------------------------------------------------------
    */

    const voltageDefinition =
        getBatteryAttributesByRole(
            BATTERY_CALCULATION_ROLE
                .VOLTAGE
        )[0] ??
        null;


    const voltageResolved =
        voltageDefinition
            ? resolveDeviceRecords({

                records,

                attributeId:
                    voltageDefinition
                        .attributeId,

                selectedDeviceInstance:
                    deviceSelection[
                        voltageDefinition
                            .attributeId
                    ],
            })
            : {
                records:
                    [],

                status:
                    "NOT_OBSERVED",
            };


    const voltage =
        calculateScalarFamily({

            records:
                voltageResolved
                    .records,

            definition:
                voltageDefinition,

            deviceEvidence:
                voltageResolved,

            reportingWindow,

            config:
                effectiveConfig,

            validator:
                (
                    value
                ) =>
                    Number.isFinite(
                        value
                    ) &&
                    value >=
                    0,

            metricDefinitions: [
                {
                    key:
                        "minimumVoltageV",

                    label:
                        "Minimum Battery Voltage",

                    unit:
                        METRIC_UNIT
                            .VOLT,

                    source:
                        "minimum",
                },
                {
                    key:
                        "maximumVoltageV",

                    label:
                        "Maximum Battery Voltage",

                    unit:
                        METRIC_UNIT
                            .VOLT,

                    source:
                        "maximum",
                },
                {
                    key:
                        "averageVoltageV",

                    label:
                        "Average Battery Voltage",

                    unit:
                        METRIC_UNIT
                            .VOLT,

                    source:
                        "average",
                },
            ],
        });


    /*
    |--------------------------------------------------------------------------
    | Current
    |--------------------------------------------------------------------------
    */

    const currentDefinition =
        getBatteryAttributesByRole(
            BATTERY_CALCULATION_ROLE
                .CURRENT
        )[0] ??
        null;


    const currentResolved =
        currentDefinition
            ? resolveDeviceRecords({

                records,

                attributeId:
                    currentDefinition
                        .attributeId,

                selectedDeviceInstance:
                    deviceSelection[
                        currentDefinition
                            .attributeId
                    ],
            })
            : {
                records:
                    [],

                status:
                    "NOT_OBSERVED",
            };


    const current =
        calculateScalarFamily({

            records:
                currentResolved
                    .records,

            definition:
                currentDefinition,

            deviceEvidence:
                currentResolved,

            reportingWindow,

            config:
                effectiveConfig,

            validator:
                (
                    value
                ) =>
                    Number.isFinite(
                        value
                    ),

            metricDefinitions: [
                {
                    key:
                        "minimumSignedCurrentA",

                    label:
                        "Minimum Signed Battery Current",

                    unit:
                        METRIC_UNIT
                            .AMPERE,

                    source:
                        "minimum",
                },
                {
                    key:
                        "maximumSignedCurrentA",

                    label:
                        "Maximum Signed Battery Current",

                    unit:
                        METRIC_UNIT
                            .AMPERE,

                    source:
                        "maximum",
                },
                {
                    key:
                        "averageSignedCurrentA",

                    label:
                        "Average Signed Battery Current",

                    unit:
                        METRIC_UNIT
                            .AMPERE,

                    source:
                        "average",
                },
            ],
        });


    /*
    |--------------------------------------------------------------------------
    | Temperature
    |--------------------------------------------------------------------------
    */

    const temperatureDefinitions =
        getBatteryAttributesByRole(
            BATTERY_CALCULATION_ROLE
                .TEMPERATURE
        )
            .sort(
                (
                    a,
                    b
                ) =>
                    (
                        a.preferredPriority ??
                        Number.MAX_SAFE_INTEGER
                    ) -
                    (
                        b.preferredPriority ??
                        Number.MAX_SAFE_INTEGER
                    )
            );


    const temperatureResolved =
        resolvePreferredAttribute({

            records,

            definitions:
                temperatureDefinitions,

            deviceSelection,
        });


    const temperature =
        calculateScalarFamily({

            records:
                temperatureResolved
                    .records,

            definition:
                temperatureResolved
                    .definition,

            deviceEvidence:
                temperatureResolved,

            reportingWindow,

            config:
                effectiveConfig,

            validator:
                (
                    value
                ) =>
                    value >=
                        effectiveConfig
                            .minimumPlausibleTemperatureC &&
                    value <=
                        effectiveConfig
                            .maximumPlausibleTemperatureC,

            metricDefinitions: [
                {
                    key:
                        "minimumTemperatureC",

                    label:
                        "Minimum Battery Temperature",

                    unit:
                        METRIC_UNIT
                            .CELSIUS,

                    source:
                        "minimum",
                },
                {
                    key:
                        "maximumTemperatureC",

                    label:
                        "Maximum Battery Temperature",

                    unit:
                        METRIC_UNIT
                            .CELSIUS,

                    source:
                        "maximum",
                },
                {
                    key:
                        "averageTemperatureC",

                    label:
                        "Average Battery Temperature",

                    unit:
                        METRIC_UNIT
                            .CELSIUS,

                    source:
                        "average",
                },
            ],
        });


    /*
    |--------------------------------------------------------------------------
    | Signed Battery Power
    |--------------------------------------------------------------------------
    */

    const powerDefinition =
        getBatteryAttributesByRole(
            BATTERY_CALCULATION_ROLE
                .SIGNED_POWER
        )[0] ??
        null;


    const powerResolved =
        powerDefinition
            ? resolveDeviceRecords({

                records,

                attributeId:
                    powerDefinition
                        .attributeId,

                selectedDeviceInstance:
                    deviceSelection[
                        powerDefinition
                            .attributeId
                    ],
            })
            : {
                records:
                    [],

                status:
                    "NOT_OBSERVED",
            };


    const powerBase =
        calculateScalarFamily({

            records:
                powerResolved
                    .records,

            definition:
                powerDefinition,

            deviceEvidence:
                powerResolved,

            reportingWindow,

            config:
                effectiveConfig,

            validator:
                (
                    value
                ) =>
                    Number.isFinite(
                        value
                    ),

            metricDefinitions: [
                {
                    key:
                        "minimumSignedBatteryPowerW",

                    label:
                        "Minimum Signed Battery Power",

                    unit:
                        "W",

                    source:
                        "minimum",
                },
                {
                    key:
                        "maximumSignedBatteryPowerW",

                    label:
                        "Maximum Signed Battery Power",

                    unit:
                        "W",

                    source:
                        "maximum",
                },
                {
                    key:
                        "averageSignedBatteryPowerW",

                    label:
                        "Average Signed Battery Power",

                    unit:
                        "W",

                    source:
                        "average",
                },
            ],
        });


    /*
    |--------------------------------------------------------------------------
    | Algebraic signed energy
    |--------------------------------------------------------------------------
    |
    | This is NOT charge energy and NOT discharge energy.
    |
    |--------------------------------------------------------------------------
    */

    let signedEnergyMetric =
        unavailableMetric({

            key:
                "signedBatteryEnergyKwh",

            label:
                "Signed Battery Energy",

            unit:
                METRIC_UNIT
                    .KWH,

            reason:
                powerBase
                    .reason,
        });


    if (
        powerBase.status !==
        BATTERY_ANALYTICS_STATUS
            .UNAVAILABLE &&
        powerResolved.records
            .length >=
        effectiveConfig
            .minimumSamples
    ) {

        const {
            series,
        } =
            buildScalarSeries({

                records:
                    powerResolved
                        .records,

                start:
                    reportingWindow
                        .start,

                end:
                    reportingWindow
                        .end,

                bucketSeconds:
                    effectiveConfig
                        .bucketSeconds,

                validator:
                    (
                        value
                    ) =>
                        Number.isFinite(
                            value
                        ),
            });


        const powerSummary =
            summarizeScalarSeries({

                series,

                reportingWindow,

                maxInterpolationGapMinutes:
                    effectiveConfig
                        .maxInterpolationGapMinutes,
            });


        if (
            powerSummary
        ) {

            /*
             * W·s → kWh
             */

            const signedEnergyKwh =
                powerSummary
                    .integralValueSeconds /
                3_600_000;


            signedEnergyMetric =
                availableMetric({

                    key:
                        "signedBatteryEnergyKwh",

                    label:
                        "Signed Battery Energy",

                    unit:
                        METRIC_UNIT
                            .KWH,

                    value:
                        signedEnergyKwh,

                    status:
                        powerBase
                            .status,

                    reason:
                        powerBase
                            .reason,

                    evidence: {

                        attributeId:
                            powerDefinition
                                ?.attributeId ??
                            null,

                        directionEstablished:
                            false,

                        interpretation:
                            "ALGEBRAIC_SIGNED_ENERGY_ONLY",

                        chargeEnergyDerived:
                            false,

                        dischargeEnergyDerived:
                            false,

                        observedHours:
                            round(
                                powerSummary
                                    .observedHours
                            ),

                        temporalCoveragePercent:
                            round(
                                powerSummary
                                    .temporalCoveragePercent,
                                3
                            ),
                    },
                });
        }
    }


    const power = {

        ...powerBase,

        metrics: [
            ...powerBase
                .metrics,

            signedEnergyMetric,
        ],
    };


    /*
    |--------------------------------------------------------------------------
    | Family status
    |--------------------------------------------------------------------------
    */

    const profiles = {

        soc,

        voltage,

        current,

        temperature,

        power,
    };


    const profileStatuses =
        Object
            .values(
                profiles
            )
            .map(
                (
                    profile
                ) =>
                    profile.status
            );


    let familyStatus =
        BATTERY_ANALYTICS_STATUS
            .UNAVAILABLE;


    if (
        profileStatuses.some(
            (
                status
            ) =>
                status ===
                BATTERY_ANALYTICS_STATUS
                    .CALCULATED
        ) &&
        profileStatuses.every(
            (
                status
            ) =>
                status ===
                BATTERY_ANALYTICS_STATUS
                    .CALCULATED
        )
    ) {

        familyStatus =
            BATTERY_ANALYTICS_STATUS
                .CALCULATED;

    }
    else if (
        profileStatuses.some(
            (
                status
            ) =>
                status !==
                BATTERY_ANALYTICS_STATUS
                    .UNAVAILABLE
        )
    ) {

        familyStatus =
            BATTERY_ANALYTICS_STATUS
                .PARTIALLY_CALCULATED;
    }


    return {

        family:
            "BATTERY",

        status:
            familyStatus,

        reportingWindow,

        config:
            effectiveConfig,

        profiles,

        boundaries: {

            ...BATTERY_ANALYTICS_BOUNDARIES,

            SIGNED_POWER_INTERPRETATION:
                "ALGEBRAIC_ONLY",

            SIGNED_POWER_SPLIT_TO_CHARGE_DISCHARGE:
                false,

            DOD_CALCULATED:
                false,

            CYCLE_ANALYTICS_CALCULATED:
                false,

            THROUGHPUT_CALCULATED:
                false,

            BATTERY_AVAILABILITY_CALCULATED:
                false,
        },
    };
}