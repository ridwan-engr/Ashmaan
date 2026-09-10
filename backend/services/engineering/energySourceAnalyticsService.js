// services/engineering/energySourceAnalyticsService.js

import {
    ENERGY_SOURCE,
    ENERGY_SOURCE_ATTRIBUTE_MAP,
} from "./energySourceAttributeMap.js";


/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

export const ENERGY_SOURCE_ANALYTICS_CONFIG =
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
    });


/*
|--------------------------------------------------------------------------
| Status
|--------------------------------------------------------------------------
*/

export const ENERGY_SOURCE_ANALYTICS_STATUS =
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

export const ENERGY_SOURCE_ANALYTICS_REASON =
    Object.freeze({

        SOURCE_SIGNAL_NOT_OBSERVED:
            "SOURCE_SIGNAL_NOT_OBSERVED",

        INSUFFICIENT_QUALIFIED_SAMPLES:
            "INSUFFICIENT_QUALIFIED_SAMPLES",

        INSUFFICIENT_TEMPORAL_COVERAGE:
            "INSUFFICIENT_TEMPORAL_COVERAGE",

        MULTIPLE_SOURCE_DEVICES_AMBIGUOUS:
            "MULTIPLE_SOURCE_DEVICES_AMBIGUOUS",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",

        BATTERY_SIGN_CONVENTION_NOT_ESTABLISHED:
            "BATTERY_SIGN_CONVENTION_NOT_ESTABLISHED",
    });


/*
|--------------------------------------------------------------------------
| Attribute IDs
|--------------------------------------------------------------------------
*/

const GRID_POWER_IDS =
    Object.freeze({

        L1:
            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GRID
                .DIRECT_POWER_L1
                .id,

        L2:
            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GRID
                .DIRECT_POWER_L2
                .id,

        L3:
            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GRID
                .DIRECT_POWER_L3
                .id,
    });


const GENERATOR_POWER_IDS =
    Object.freeze({

        TOTAL:
            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GENERATOR
                .TOTAL_POWER
                .id,

        L1:
            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GENERATOR
                .POWER_L1
                .id,

        L2:
            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GENERATOR
                .POWER_L2
                .id,

        L3:
            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GENERATOR
                .POWER_L3
                .id,
    });


const SOLAR_POWER_ID =
    ENERGY_SOURCE_ATTRIBUTE_MAP
        .SOLAR
        .TOTAL_POWER
        .id;


const BATTERY_POWER_ID =
    ENERGY_SOURCE_ATTRIBUTE_MAP
        .BATTERY
        .POWER
        .id;


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function toDate(
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


function getNumericValue(
    record
) {

    const candidate =
        record?.numericValue ??
        record?.value;


    const numeric =
        Number(
            candidate
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
        undefined ||
        value ===
        ""
    ) {
        return "UNSPECIFIED";
    }


    return String(
        value
    );
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


    const factor =
        10 **
        decimals;


    return Math.round(
        value *
        factor
    ) /
    factor;
}


function calculateWindowHours(
    start,
    end
) {

    return (
        end.getTime() -
        start.getTime()
    ) /
    3_600_000;
}


function calculateStatus({
    temporalCoveragePercent,
    sampleCount,
    config,
} = {}) {

    if (
        sampleCount <
        config.minimumSamples
    ) {

        return {
            status:
                ENERGY_SOURCE_ANALYTICS_STATUS
                    .UNAVAILABLE,

            reason:
                ENERGY_SOURCE_ANALYTICS_REASON
                    .INSUFFICIENT_QUALIFIED_SAMPLES,
        };
    }


    if (
        temporalCoveragePercent >=
        config.goodCoveragePercent
    ) {

        return {
            status:
                ENERGY_SOURCE_ANALYTICS_STATUS
                    .CALCULATED,

            reason:
                null,
        };
    }


    if (
        temporalCoveragePercent >=
        config.partialCoveragePercent
    ) {

        return {
            status:
                ENERGY_SOURCE_ANALYTICS_STATUS
                    .PARTIALLY_CALCULATED,

            reason:
                ENERGY_SOURCE_ANALYTICS_REASON
                    .INSUFFICIENT_TEMPORAL_COVERAGE,
        };
    }


    return {
        status:
            ENERGY_SOURCE_ANALYTICS_STATUS
                .UNAVAILABLE,

        reason:
            ENERGY_SOURCE_ANALYTICS_REASON
                .INSUFFICIENT_TEMPORAL_COVERAGE,
    };
}


/*
|--------------------------------------------------------------------------
| Filter records
|--------------------------------------------------------------------------
*/

function filterRecords({
    records,
    attributeIds,
    start,
    end,
} = {}) {

    const idSet =
        new Set(
            attributeIds
        );


    return (
        Array.isArray(
            records
        )
            ? records
            : []
    )
        .filter(
            (record) => {

                const attributeId =
                    Number(
                        record
                            ?.vrmAttributeId
                    );


                if (
                    !idSet.has(
                        attributeId
                    )
                ) {
                    return false;
                }


                const timestamp =
                    toDate(
                        record
                            ?.timestamp
                    );


                if (!timestamp) {
                    return false;
                }


                if (
                    timestamp <
                    start ||
                    timestamp >=
                    end
                ) {
                    return false;
                }


                return (
                    getNumericValue(
                        record
                    ) !==
                    null
                );
            }
        );
}


/*
|--------------------------------------------------------------------------
| Resolve source device
|--------------------------------------------------------------------------
*/

function resolveDeviceRecords({
    records,
    selectedDeviceInstance = null,
} = {}) {

    const deviceMap =
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
            !deviceMap.has(
                deviceInstance
            )
        ) {

            deviceMap.set(
                deviceInstance,
                []
            );
        }


        deviceMap
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

        const key =
            normalizeDeviceInstance(
                selectedDeviceInstance
            );


        return {
            ambiguous:
                false,

            selectedDeviceInstance:
                key,

            records:
                deviceMap.get(
                    key
                ) ??
                [],

            observedDeviceInstances:
                [
                    ...deviceMap.keys(),
                ],
        };
    }


    const observedDeviceInstances =
        [
            ...deviceMap.keys(),
        ];


    if (
        observedDeviceInstances.length >
        1
    ) {

        return {
            ambiguous:
                true,

            selectedDeviceInstance:
                null,

            records:
                [],

            observedDeviceInstances,
        };
    }


    return {
        ambiguous:
            false,

        selectedDeviceInstance:
            observedDeviceInstances[
                0
            ] ??
            null,

        records:
            observedDeviceInstances.length ===
                1
                ? deviceMap.get(
                    observedDeviceInstances[
                        0
                    ]
                )
                : [],

        observedDeviceInstances,
    };
}


/*
|--------------------------------------------------------------------------
| Bucket timestamp
|--------------------------------------------------------------------------
*/

function getBucketTimestamp(
    timestamp,
    bucketSeconds
) {

    const bucketMs =
        bucketSeconds *
        1000;


    return new Date(
        Math.floor(
            timestamp.getTime() /
            bucketMs
        ) *
        bucketMs
    );
}


/*
|--------------------------------------------------------------------------
| Build single-signal power series
|--------------------------------------------------------------------------
*/

function buildSinglePowerSeries({
    records,
    attributeId,
    bucketSeconds,
} = {}) {

    const bucketMap =
        new Map();


    for (
        const record
        of records
    ) {

        if (
            Number(
                record.vrmAttributeId
            ) !==
            attributeId
        ) {
            continue;
        }


        const timestamp =
            toDate(
                record.timestamp
            );


        const value =
            getNumericValue(
                record
            );


        if (
            !timestamp ||
            value ===
            null
        ) {
            continue;
        }


        const bucket =
            getBucketTimestamp(
                timestamp,
                bucketSeconds
            );


        const key =
            bucket.toISOString();


        if (
            !bucketMap.has(
                key
            )
        ) {

            bucketMap.set(
                key,
                {
                    timestamp:
                        bucket,

                    values:
                        [],
                }
            );
        }


        bucketMap
            .get(
                key
            )
            .values
            .push(
                value
            );
    }


    return [
        ...bucketMap.values(),
    ]
        .map(
            (bucket) => ({

                timestamp:
                    bucket.timestamp,

                powerW:
                    bucket.values.reduce(
                        (
                            sum,
                            value
                        ) =>
                            sum +
                            value,
                        0
                    ) /
                    bucket.values.length,
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
}


/*
|--------------------------------------------------------------------------
| Build phase-summed series
|--------------------------------------------------------------------------
*/

function buildPhasePowerSeries({
    records,
    phaseAttributes,
    bucketSeconds,
} = {}) {

    const observedPhases =
        Object.entries(
            phaseAttributes
        )
            .filter(
                (
                    [
                        ,
                        attributeId,
                    ]
                ) =>
                    records.some(
                        (record) =>
                            Number(
                                record
                                    .vrmAttributeId
                            ) ===
                            attributeId
                    )
            );


    if (
        observedPhases.length ===
        0
    ) {
        return [];
    }


    const bucketMap =
        new Map();


    for (
        const record
        of records
    ) {

        const phaseEntry =
            observedPhases.find(
                (
                    [
                        ,
                        attributeId,
                    ]
                ) =>
                    attributeId ===
                    Number(
                        record
                            .vrmAttributeId
                    )
            );


        if (!phaseEntry) {
            continue;
        }


        const [
            phase,
        ] =
            phaseEntry;


        const timestamp =
            toDate(
                record.timestamp
            );


        const value =
            getNumericValue(
                record
            );


        if (
            !timestamp ||
            value ===
            null
        ) {
            continue;
        }


        const bucket =
            getBucketTimestamp(
                timestamp,
                bucketSeconds
            );


        const key =
            bucket.toISOString();


        if (
            !bucketMap.has(
                key
            )
        ) {

            bucketMap.set(
                key,
                {
                    timestamp:
                        bucket,

                    phases:
                        new Map(),
                }
            );
        }


        const entry =
            bucketMap.get(
                key
            );


        if (
            !entry.phases.has(
                phase
            )
        ) {

            entry.phases.set(
                phase,
                []
            );
        }


        entry.phases
            .get(
                phase
            )
            .push(
                value
            );
    }


    const requiredPhases =
        observedPhases.map(
            (
                [
                    phase,
                ]
            ) =>
                phase
        );


    return [
        ...bucketMap.values(),
    ]
        .filter(
            (bucket) =>
                requiredPhases.every(
                    (phase) =>
                        bucket.phases.has(
                            phase
                        )
                )
        )
        .map(
            (bucket) => {

                const powerW =
                    requiredPhases.reduce(
                        (
                            total,
                            phase
                        ) => {

                            const values =
                                bucket.phases.get(
                                    phase
                                );


                            const average =
                                values.reduce(
                                    (
                                        sum,
                                        value
                                    ) =>
                                        sum +
                                        value,
                                    0
                                ) /
                                values.length;


                            return (
                                total +
                                average
                            );
                        },
                        0
                    );


                return {
                    timestamp:
                        bucket.timestamp,

                    powerW,
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
| Integrate power series
|--------------------------------------------------------------------------
*/

export function integratePowerSeries({
    series,
    maxInterpolationGapMinutes =
        ENERGY_SOURCE_ANALYTICS_CONFIG
            .maxInterpolationGapMinutes,
} = {}) {

    const sorted =
        [
            ...(
                Array.isArray(
                    series
                )
                    ? series
                    : []
            ),
        ]
            .filter(
                (sample) =>
                    sample
                        ?.timestamp &&
                    Number.isFinite(
                        sample
                            ?.powerW
                    )
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(
                        a.timestamp
                    ) -
                    new Date(
                        b.timestamp
                    )
            );


    let energyWh =
        0;

    let qualifiedDurationHours =
        0;

    let qualifiedIntervals =
        0;


    const maxGapHours =
        maxInterpolationGapMinutes /
        60;


    for (
        let index = 1;
        index <
        sorted.length;
        index += 1
    ) {

        const previous =
            sorted[
                index -
                1
            ];

        const current =
            sorted[
                index
            ];


        const previousTime =
            new Date(
                previous.timestamp
            );

        const currentTime =
            new Date(
                current.timestamp
            );


        const durationHours =
            (
                currentTime.getTime() -
                previousTime.getTime()
            ) /
            3_600_000;


        if (
            durationHours <=
            0 ||
            durationHours >
            maxGapHours
        ) {
            continue;
        }


        energyWh +=
            (
                previous.powerW +
                current.powerW
            ) /
            2 *
            durationHours;


        qualifiedDurationHours +=
            durationHours;

        qualifiedIntervals +=
            1;
    }


    return {

        energyWh,

        energyKwh:
            energyWh /
            1000,

        qualifiedDurationHours,

        qualifiedIntervals,
    };
}


/*
|--------------------------------------------------------------------------
| Calculate metrics from one power series
|--------------------------------------------------------------------------
*/

function calculatePowerSeriesMetrics({
    source,
    series,
    start,
    end,
    config,
    selectedDeviceInstance,
    observedDeviceInstances,
    batterySigned = false,
} = {}) {

    if (
        !series ||
        series.length ===
        0
    ) {

        return buildUnavailableSourceResult({
            source,

            reason:
                ENERGY_SOURCE_ANALYTICS_REASON
                    .SOURCE_SIGNAL_NOT_OBSERVED,

            selectedDeviceInstance,

            observedDeviceInstances,
        });
    }


    const integration =
        integratePowerSeries({
            series,

            maxInterpolationGapMinutes:
                config
                    .maxInterpolationGapMinutes,
        });


    const reportingHours =
        calculateWindowHours(
            start,
            end
        );


    const temporalCoveragePercent =
        reportingHours >
        0
            ? (
                integration
                    .qualifiedDurationHours /
                reportingHours *
                100
            )
            : 0;


    const statusResult =
        calculateStatus({
            temporalCoveragePercent,

            sampleCount:
                series.length,

            config,
        });


    if (
        statusResult.status ===
        ENERGY_SOURCE_ANALYTICS_STATUS
            .UNAVAILABLE
    ) {

        return buildUnavailableSourceResult({
            source,

            reason:
                statusResult.reason,

            selectedDeviceInstance,

            observedDeviceInstances,

            sampleCount:
                series.length,

            temporalCoveragePercent,
        });
    }


    const powersKw =
        series.map(
            (sample) =>
                sample.powerW /
                1000
        );


    const peakPowerKw =
        Math.max(
            ...powersKw
        );


    const minimumPowerKw =
        Math.min(
            ...powersKw
        );


    const peakAbsolutePowerKw =
        Math.max(
            ...powersKw.map(
                (value) =>
                    Math.abs(
                        value
                    )
            )
        );


    const averagePowerKw =
        integration
            .qualifiedDurationHours >
        0
            ? (
                integration
                    .energyKwh /
                integration
                    .qualifiedDurationHours
            )
            : null;


    return {

        source,

        status:
            statusResult.status,

        reason:
            statusResult.reason,

        selectedDeviceInstance,

        observedDeviceInstances,

        evidence: {

            sampleCount:
                series.length,

            qualifiedIntervals:
                integration
                    .qualifiedIntervals,

            qualifiedDurationHours:
                round(
                    integration
                        .qualifiedDurationHours
                ),

            reportingWindowHours:
                round(
                    reportingHours
                ),

            temporalCoveragePercent:
                round(
                    temporalCoveragePercent,
                    3
                ),
        },

        metrics: {

            energyKwh:
                round(
                    integration
                        .energyKwh
                ),

            averagePowerKw:
                round(
                    averagePowerKw
                ),

            peakPowerKw:
                round(
                    peakPowerKw
                ),

            minimumPowerKw:
                round(
                    minimumPowerKw
                ),

            peakAbsolutePowerKw:
                round(
                    peakAbsolutePowerKw
                ),
        },

        semantics: {

            batterySignedPower:
                batterySigned,

            batteryChargeDirectionEstablished:
                false,

            batteryDischargeDirectionEstablished:
                false,

            missingTelemetryMeansZero:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Unavailable result
|--------------------------------------------------------------------------
*/

function buildUnavailableSourceResult({
    source,
    reason,
    selectedDeviceInstance = null,
    observedDeviceInstances = [],
    sampleCount = 0,
    temporalCoveragePercent = null,
} = {}) {

    return {

        source,

        status:
            ENERGY_SOURCE_ANALYTICS_STATUS
                .UNAVAILABLE,

        reason,

        selectedDeviceInstance,

        observedDeviceInstances,

        evidence: {

            sampleCount,

            qualifiedIntervals:
                0,

            qualifiedDurationHours:
                null,

            reportingWindowHours:
                null,

            temporalCoveragePercent:
                temporalCoveragePercent ??
                null,
        },

        metrics: {

            energyKwh:
                null,

            averagePowerKw:
                null,

            peakPowerKw:
                null,

            minimumPowerKw:
                null,

            peakAbsolutePowerKw:
                null,
        },

        semantics: {

            batterySignedPower:
                source ===
                ENERGY_SOURCE
                    .BATTERY,

            batteryChargeDirectionEstablished:
                false,

            batteryDischargeDirectionEstablished:
                false,

            missingTelemetryMeansZero:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Prepare direct source records
|--------------------------------------------------------------------------
*/

function prepareSourceRecords({
    records,
    attributeIds,
    start,
    end,
    selectedDeviceInstance,
} = {}) {

    const filtered =
        filterRecords({
            records,
            attributeIds,
            start,
            end,
        });


    const deviceResolution =
        resolveDeviceRecords({
            records:
                filtered,

            selectedDeviceInstance,
        });


    return {
        filtered,
        ...deviceResolution,
    };
}


/*
|--------------------------------------------------------------------------
| Grid analytics
|--------------------------------------------------------------------------
*/

function calculateGridAnalytics({
    records,
    start,
    end,
    config,
    selectedDeviceInstance,
} = {}) {

    const attributeIds =
        Object.values(
            GRID_POWER_IDS
        );


    const prepared =
        prepareSourceRecords({
            records,
            attributeIds,
            start,
            end,
            selectedDeviceInstance,
        });


    if (
        prepared.ambiguous
    ) {

        return buildUnavailableSourceResult({
            source:
                ENERGY_SOURCE
                    .GRID,

            reason:
                ENERGY_SOURCE_ANALYTICS_REASON
                    .MULTIPLE_SOURCE_DEVICES_AMBIGUOUS,

            observedDeviceInstances:
                prepared
                    .observedDeviceInstances,
        });
    }


    const series =
        buildPhasePowerSeries({
            records:
                prepared.records,

            phaseAttributes:
                GRID_POWER_IDS,

            bucketSeconds:
                config
                    .bucketSeconds,
        });


    return calculatePowerSeriesMetrics({
        source:
            ENERGY_SOURCE
                .GRID,

        series,
        start,
        end,
        config,

        selectedDeviceInstance:
            prepared
                .selectedDeviceInstance,

        observedDeviceInstances:
            prepared
                .observedDeviceInstances,
    });
}


/*
|--------------------------------------------------------------------------
| Generator analytics
|--------------------------------------------------------------------------
*/

function calculateGeneratorAnalytics({
    records,
    start,
    end,
    config,
    selectedDeviceInstance,
} = {}) {

    const attributeIds = [
        GENERATOR_POWER_IDS
            .TOTAL,

        GENERATOR_POWER_IDS
            .L1,

        GENERATOR_POWER_IDS
            .L2,

        GENERATOR_POWER_IDS
            .L3,
    ];


    const prepared =
        prepareSourceRecords({
            records,
            attributeIds,
            start,
            end,
            selectedDeviceInstance,
        });


    if (
        prepared.ambiguous
    ) {

        return buildUnavailableSourceResult({
            source:
                ENERGY_SOURCE
                    .GENERATOR,

            reason:
                ENERGY_SOURCE_ANALYTICS_REASON
                    .MULTIPLE_SOURCE_DEVICES_AMBIGUOUS,

            observedDeviceInstances:
                prepared
                    .observedDeviceInstances,
        });
    }


    const hasTotalPower =
        prepared.records.some(
            (record) =>
                Number(
                    record
                        .vrmAttributeId
                ) ===
                GENERATOR_POWER_IDS
                    .TOTAL
        );


    const series =
        hasTotalPower
            ? buildSinglePowerSeries({
                records:
                    prepared.records,

                attributeId:
                    GENERATOR_POWER_IDS
                        .TOTAL,

                bucketSeconds:
                    config
                        .bucketSeconds,
            })
            : buildPhasePowerSeries({
                records:
                    prepared.records,

                phaseAttributes: {
                    L1:
                        GENERATOR_POWER_IDS
                            .L1,

                    L2:
                        GENERATOR_POWER_IDS
                            .L2,

                    L3:
                        GENERATOR_POWER_IDS
                            .L3,
                },

                bucketSeconds:
                    config
                        .bucketSeconds,
            });


    return calculatePowerSeriesMetrics({
        source:
            ENERGY_SOURCE
                .GENERATOR,

        series,
        start,
        end,
        config,

        selectedDeviceInstance:
            prepared
                .selectedDeviceInstance,

        observedDeviceInstances:
            prepared
                .observedDeviceInstances,
    });
}


/*
|--------------------------------------------------------------------------
| Solar analytics
|--------------------------------------------------------------------------
*/

function calculateSolarAnalytics({
    records,
    start,
    end,
    config,
    selectedDeviceInstance,
} = {}) {

    const prepared =
        prepareSourceRecords({
            records,

            attributeIds: [
                SOLAR_POWER_ID,
            ],

            start,
            end,

            selectedDeviceInstance,
        });


    if (
        prepared.ambiguous
    ) {

        return buildUnavailableSourceResult({
            source:
                ENERGY_SOURCE
                    .SOLAR,

            reason:
                ENERGY_SOURCE_ANALYTICS_REASON
                    .MULTIPLE_SOURCE_DEVICES_AMBIGUOUS,

            observedDeviceInstances:
                prepared
                    .observedDeviceInstances,
        });
    }


    const series =
        buildSinglePowerSeries({
            records:
                prepared.records,

            attributeId:
                SOLAR_POWER_ID,

            bucketSeconds:
                config
                    .bucketSeconds,
        });


    return calculatePowerSeriesMetrics({
        source:
            ENERGY_SOURCE
                .SOLAR,

        series,
        start,
        end,
        config,

        selectedDeviceInstance:
            prepared
                .selectedDeviceInstance,

        observedDeviceInstances:
            prepared
                .observedDeviceInstances,
    });
}


/*
|--------------------------------------------------------------------------
| Battery analytics
|--------------------------------------------------------------------------
*/

function calculateBatteryAnalytics({
    records,
    start,
    end,
    config,
    selectedDeviceInstance,
} = {}) {

    const prepared =
        prepareSourceRecords({
            records,

            attributeIds: [
                BATTERY_POWER_ID,
            ],

            start,
            end,

            selectedDeviceInstance,
        });


    if (
        prepared.ambiguous
    ) {

        return buildUnavailableSourceResult({
            source:
                ENERGY_SOURCE
                    .BATTERY,

            reason:
                ENERGY_SOURCE_ANALYTICS_REASON
                    .MULTIPLE_SOURCE_DEVICES_AMBIGUOUS,

            observedDeviceInstances:
                prepared
                    .observedDeviceInstances,
        });
    }


    const series =
        buildSinglePowerSeries({
            records:
                prepared.records,

            attributeId:
                BATTERY_POWER_ID,

            bucketSeconds:
                config
                    .bucketSeconds,
        });


    const result =
        calculatePowerSeriesMetrics({
            source:
                ENERGY_SOURCE
                    .BATTERY,

            series,
            start,
            end,
            config,

            selectedDeviceInstance:
                prepared
                    .selectedDeviceInstance,

            observedDeviceInstances:
                prepared
                    .observedDeviceInstances,

            batterySigned:
                true,
        });


    /*
     * Important:
     *
     * energyKwh here is an algebraic integral of the signed Battery Power
     * signal. It MUST NOT yet be labelled "charge energy" or
     * "discharge energy".
     */

    return {
        ...result,

        semantics: {
            ...result.semantics,

            signedNetEnergyOnly:
                result.status !==
                ENERGY_SOURCE_ANALYTICS_STATUS
                    .UNAVAILABLE,

            directionalEnergyCalculationAllowed:
                false,

            directionalEnergyBlockedReason:
                ENERGY_SOURCE_ANALYTICS_REASON
                    .BATTERY_SIGN_CONVENTION_NOT_ESTABLISHED,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Public calculator
|--------------------------------------------------------------------------
*/

export function calculateEnergySourceAnalytics({
    records = [],
    start,
    end,

    deviceSelection = {},

    config = {},
} = {}) {

    const reportingStart =
        toDate(
            start
        );

    const reportingEnd =
        toDate(
            end
        );


    if (
        !reportingStart ||
        !reportingEnd ||
        reportingEnd <=
        reportingStart
    ) {

        throw new Error(
            ENERGY_SOURCE_ANALYTICS_REASON
                .INVALID_REPORTING_WINDOW
        );
    }


    const resolvedConfig = {
        ...ENERGY_SOURCE_ANALYTICS_CONFIG,
        ...config,
    };


    const grid =
        calculateGridAnalytics({
            records,

            start:
                reportingStart,

            end:
                reportingEnd,

            config:
                resolvedConfig,

            selectedDeviceInstance:
                deviceSelection
                    ?.GRID ??
                null,
        });


    const generator =
        calculateGeneratorAnalytics({
            records,

            start:
                reportingStart,

            end:
                reportingEnd,

            config:
                resolvedConfig,

            selectedDeviceInstance:
                deviceSelection
                    ?.GENERATOR ??
                null,
        });


    const solar =
        calculateSolarAnalytics({
            records,

            start:
                reportingStart,

            end:
                reportingEnd,

            config:
                resolvedConfig,

            selectedDeviceInstance:
                deviceSelection
                    ?.SOLAR ??
                null,
        });


    const battery =
        calculateBatteryAnalytics({
            records,

            start:
                reportingStart,

            end:
                reportingEnd,

            config:
                resolvedConfig,

            selectedDeviceInstance:
                deviceSelection
                    ?.BATTERY ??
                null,
        });


    return {

        family:
            "ENERGY_SOURCE",

        reportingWindow: {

            start:
                reportingStart,

            end:
                reportingEnd,

            semantics:
                "[start,end)",
        },

        config:
            resolvedConfig,

        sources: {
            grid,
            generator,
            solar,
            battery,
        },

        boundaries: {

            missingTelemetryMeansZero:
                false,

            acInputPowerUsed:
                false,

            blockedSystemOverviewFlowsUsed:
                false,

            genericKwhUsed:
                false,

            batterySignConventionEstablished:
                false,

            batteryDirectionalEnergyCalculated:
                false,

            multipleSourceDevicesAutomaticallySummed:
                false,
        },
    };
}