// services/engineering/siteElectricalPerformanceService.js

import {
    ENGINEERING_AGGREGATION_LEVEL,
    ENGINEERING_DATA_QUALITY,
    ENGINEERING_EVIDENCE_BASIS,
    ENGINEERING_METRIC_FAMILY,
    ENGINEERING_OBSERVABILITY_STATUS,
    ENGINEERING_SOURCE_TYPE,
    ENGINEERING_UNIT,

    buildCalculatedEngineeringMetric,
    buildEngineeringDataQuality,
    buildEngineeringMetricFamily,
    buildEngineeringObservability,
    buildEngineeringReportingWindow,
    buildEngineeringScope,
    buildPartialEngineeringMetric,
    buildUnavailableEngineeringMetric,
} from "./engineeringAnalyticsContract.js";


/*
|--------------------------------------------------------------------------
| VRM served-load signal definitions
|--------------------------------------------------------------------------
|
| PRIMARY:
|
| 131 = AC Consumption L1
| 132 = AC Consumption L2
| 133 = AC Consumption L3
|
| OUTPUT:
|
| 567 = AC Consumption on Output L1
| 568 = AC Consumption on Output L2
| 569 = AC Consumption on Output L3
|
|--------------------------------------------------------------------------
*/

export const SERVED_LOAD_ATTRIBUTES =
    Object.freeze({
        PRIMARY: {
            1: 131,
            2: 132,
            3: 133,
        },

        OUTPUT: {
            1: 567,
            2: 568,
            3: 569,
        },
    });


/*
|--------------------------------------------------------------------------
| Defaults
|--------------------------------------------------------------------------
*/

export const SITE_ELECTRICAL_ANALYTICS_CONFIG =
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
| Helpers
|--------------------------------------------------------------------------
*/

function finiteNumber(
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


function validDate(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }


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
        10 ** decimals;


    return (
        Math.round(
            value *
            factor
        ) /
        factor
    );
}


function clamp(
    value,
    minimum,
    maximum
) {

    return Math.min(
        maximum,
        Math.max(
            minimum,
            value
        )
    );
}


/*
|--------------------------------------------------------------------------
| Read normalized telemetry numeric value
|--------------------------------------------------------------------------
*/

export function getTelemetryNumericValue(
    record
) {

    return finiteNumber(
        record?.numericValue ??
        record?.value
    );
}


/*
|--------------------------------------------------------------------------
| Resolve attribute id
|--------------------------------------------------------------------------
*/

export function getTelemetryAttributeId(
    record
) {

    const candidate =
        record?.vrmAttributeId ??
        record?.attributeId ??
        record?.idDataAttribute;


    return finiteNumber(
        candidate
    );
}


/*
|--------------------------------------------------------------------------
| Resolve served-load signal family
|--------------------------------------------------------------------------
*/

export function resolveServedLoadFamily(
    family = "PRIMARY"
) {

    const normalized =
        String(
            family
        )
            .trim()
            .toUpperCase();


    if (
        normalized !==
        "PRIMARY" &&
        normalized !==
        "OUTPUT"
    ) {
        throw new Error(
            `Unsupported served-load family: ${family}`
        );
    }


    return normalized;
}


/*
|--------------------------------------------------------------------------
| Determine phases observable in telemetry
|--------------------------------------------------------------------------
*/

export function determineServedLoadPhases(
    records = [],
    {
        family =
        "PRIMARY",
    } = {}
) {

    const resolvedFamily =
        resolveServedLoadFamily(
            family
        );


    const attributes =
        SERVED_LOAD_ATTRIBUTES[
        resolvedFamily
        ];


    const phases =
        [];


    for (
        const phase
        of [1, 2, 3]
    ) {

        const attributeId =
            attributes[
            phase
            ];


        const present =
            records.some(
                (record) =>
                    getTelemetryAttributeId(
                        record
                    ) ===
                    attributeId &&
                    getTelemetryNumericValue(
                        record
                    ) !==
                    null &&
                    validDate(
                        record?.timestamp
                    )
            );


        if (
            present
        ) {
            phases.push(
                phase
            );
        }
    }


    return phases;
}


/*
|--------------------------------------------------------------------------
| Build qualified total served-load series
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Each record is phase power in watts.
|
| Records are grouped into time buckets.
|
| If an installation exposes multiple phases, every known phase must be
| present in a bucket before that bucket can be considered a qualified
| total-load sample.
|
| This prevents a three-phase site from being incorrectly interpreted as
| lower load merely because one phase record is missing.
|
|--------------------------------------------------------------------------
*/

export function buildServedLoadSeries(
    records = [],
    {
        family =
        "PRIMARY",

        bucketSeconds =
        SITE_ELECTRICAL_ANALYTICS_CONFIG
            .bucketSeconds,
    } = {}
) {

    const resolvedFamily =
        resolveServedLoadFamily(
            family
        );


    const attributes =
        SERVED_LOAD_ATTRIBUTES[
        resolvedFamily
        ];


    const phases =
        determineServedLoadPhases(
            records,
            {
                family:
                    resolvedFamily,
            }
        );


    if (
        phases.length ===
        0
    ) {
        return {
            family:
                resolvedFamily,

            phases:
                [],

            samples:
                [],

            rejectedBuckets:
                0,
        };
    }


    const attributeToPhase =
        new Map();


    for (
        const phase
        of phases
    ) {

        attributeToPhase.set(
            attributes[
            phase
            ],
            phase
        );
    }


    const bucketMilliseconds =
        bucketSeconds *
        1000;


    const buckets =
        new Map();


    for (
        const record
        of records
    ) {

        const attributeId =
            getTelemetryAttributeId(
                record
            );


        if (
            !attributeToPhase.has(
                attributeId
            )
        ) {
            continue;
        }


        const timestamp =
            validDate(
                record?.timestamp
            );


        const watts =
            getTelemetryNumericValue(
                record
            );


        if (
            !timestamp ||
            watts ===
            null
        ) {
            continue;
        }


        const bucketTime =
            Math.floor(
                timestamp.getTime() /
                bucketMilliseconds
            ) *
            bucketMilliseconds;


        const key =
            String(
                bucketTime
            );


        if (
            !buckets.has(
                key
            )
        ) {

            buckets.set(
                key,
                {
                    timestamp:
                        new Date(
                            bucketTime
                        ),

                    phases:
                        {},
                }
            );
        }


        const phase =
            attributeToPhase.get(
                attributeId
            );


        buckets.get(
            key
        ).phases[
            phase
        ] =
            watts;
    }


    const samples =
        [];

    let rejectedBuckets =
        0;


    for (
        const bucket
        of buckets.values()
    ) {

        const complete =
            phases.every(
                (phase) =>
                    Number.isFinite(
                        bucket.phases[
                        phase
                        ]
                    )
            );


        if (
            !complete
        ) {

            rejectedBuckets +=
                1;

            continue;
        }


        const totalWatts =
            phases.reduce(
                (
                    total,
                    phase
                ) =>
                    total +
                    bucket.phases[
                    phase
                    ],
                0
            );


        /*
         * Power can legitimately be zero.
         *
         * Negative served-load values are not used as consumption demand
         * in this analytics family.
         */
        const qualifiedWatts =
            Math.max(
                0,
                totalWatts
            );


        samples.push({
            timestamp:
                bucket.timestamp,

            watts:
                qualifiedWatts,

            kw:
                qualifiedWatts /
                1000,

            phases: {
                ...bucket.phases,
            },
        });
    }


    samples.sort(
        (
            a,
            b
        ) =>
            a.timestamp -
            b.timestamp
    );


    return {
        family:
            resolvedFamily,

        phases,

        samples,

        rejectedBuckets,
    };
}


/*
|--------------------------------------------------------------------------
| Time-weighted integration
|--------------------------------------------------------------------------
|
| Trapezoidal integration:
|
| E = Σ ((P1 + P2) / 2) × Δt
|
| Long gaps are NOT interpolated.
|
|--------------------------------------------------------------------------
*/

export function integrateLoadSeries(
    samples = [],
    {
        maxInterpolationGapMinutes =
        SITE_ELECTRICAL_ANALYTICS_CONFIG
            .maxInterpolationGapMinutes,
    } = {}
) {

    if (
        !Array.isArray(
            samples
        ) ||
        samples.length <
        2
    ) {

        return {
            energyKwh:
                null,

            observedHours:
                0,

            integratedIntervalCount:
                0,

            rejectedGapCount:
                0,
        };
    }


    const maxGapMilliseconds =
        maxInterpolationGapMinutes *
        60 *
        1000;


    let energyKwh =
        0;

    let observedHours =
        0;

    let integratedIntervalCount =
        0;

    let rejectedGapCount =
        0;


    for (
        let index = 1;
        index < samples.length;
        index += 1
    ) {

        const previous =
            samples[
            index - 1
            ];

        const current =
            samples[
            index
            ];


        const deltaMilliseconds =
            current.timestamp -
            previous.timestamp;


        if (
            !Number.isFinite(
                deltaMilliseconds
            ) ||
            deltaMilliseconds <=
            0
        ) {
            continue;
        }


        if (
            deltaMilliseconds >
            maxGapMilliseconds
        ) {

            rejectedGapCount +=
                1;

            continue;
        }


        const deltaHours =
            deltaMilliseconds /
            3_600_000;


        const averageIntervalKw =
            (
                previous.kw +
                current.kw
            ) /
            2;


        energyKwh +=
            averageIntervalKw *
            deltaHours;


        observedHours +=
            deltaHours;


        integratedIntervalCount +=
            1;
    }


    return {
        /*
         * Preserve full internal precision.
         *
         * Rounding belongs at the presentation / final metric boundary,
         * not inside intermediate engineering calculations.
         */
        energyKwh,

        observedHours,

        integratedIntervalCount,

        rejectedGapCount,
    };
}


/*
|--------------------------------------------------------------------------
| Calculate scalar site electrical statistics
|--------------------------------------------------------------------------
*/

export function calculateSiteElectricalStatistics({
    records = [],

    family =
    "PRIMARY",

    start,

    end,

    config = {},
} = {}) {

    const effectiveConfig = {
        ...SITE_ELECTRICAL_ANALYTICS_CONFIG,
        ...config,
    };


    const reportingWindow =
        buildEngineeringReportingWindow({
            start,
            end,
            interval:
                `${effectiveConfig.bucketSeconds}s`,
        });


    if (
        !reportingWindow.start ||
        !reportingWindow.end
    ) {
        throw new Error(
            "Site electrical analytics require explicit start and end timestamps."
        );
    }


    const windowRecords =
        records.filter(
            (record) => {

                const timestamp =
                    validDate(
                        record?.timestamp
                    );


                return (
                    timestamp &&
                    timestamp >=
                    reportingWindow.start &&
                    timestamp <
                    reportingWindow.end
                );
            }
        );


    const series =
        buildServedLoadSeries(
            windowRecords,
            {
                family,

                bucketSeconds:
                    effectiveConfig
                        .bucketSeconds,
            }
        );


    const samples =
        series.samples;


    const reportingHours =
        (
            reportingWindow.end -
            reportingWindow.start
        ) /
        3_600_000;


    const integration =
        integrateLoadSeries(
            samples,
            {
                maxInterpolationGapMinutes:
                    effectiveConfig
                        .maxInterpolationGapMinutes,
            }
        );


    const coveragePercent =
        reportingHours >
            0
            ? clamp(
                (
                    integration
                        .observedHours /
                    reportingHours
                ) *
                100,
                0,
                100
            )
            : 0;


    const valuesKw =
        samples.map(
            (sample) =>
                sample.kw
        );


    const peakDemandKw =
        valuesKw.length >
            0
            ? Math.max(
                ...valuesKw
            )
            : null;


    const minimumDemandKw =
        valuesKw.length >
            0
            ? Math.min(
                ...valuesKw
            )
            : null;


    /*
     * Average demand is energy / observed exposure.
     *
     * It is deliberately time-weighted and is not a simple arithmetic
     * average of irregular telemetry samples.
     */
    const averageDemandKw =
        integration.observedHours >
            0 &&
            integration.energyKwh !==
            null
            ? integration
                .energyKwh /
            integration
                .observedHours
            : null;


    const loadFactorPercent =
        Number.isFinite(
            averageDemandKw
        ) &&
            Number.isFinite(
                peakDemandKw
            ) &&
            peakDemandKw >
            0
            ? (
                averageDemandKw /
                peakDemandKw
            ) *
            100
            : (
                peakDemandKw ===
                    0 &&
                    Number.isFinite(
                        averageDemandKw
                    )
                    ? 0
                    : null
            );


    return {
        reportingWindow,

        family:
            series.family,

        phases:
            series.phases,

        sampleCount:
            samples.length,

        rejectedBuckets:
            series.rejectedBuckets,

        integratedIntervalCount:
            integration
                .integratedIntervalCount,

        rejectedGapCount:
            integration
                .rejectedGapCount,

        reportingHours:
            round(
                reportingHours
            ),

        observedHours:
            round(
                integration
                    .observedHours
            ),

        coveragePercent:
            round(
                coveragePercent,
                3
            ),

        peakDemandKw:
            round(
                peakDemandKw
            ),

        minimumDemandKw:
            round(
                minimumDemandKw
            ),

        averageDemandKw:
            round(
                averageDemandKw
            ),

        loadFactorPercent:
            round(
                loadFactorPercent,
                3
            ),

        observedLoadEnergyKwh:
            round(
                integration
                    .energyKwh
            ),

        samples,
    };
}


/*
|--------------------------------------------------------------------------
| Resolve engineering evidence state
|--------------------------------------------------------------------------
*/

function resolveEvidenceState(
    statistics,
    config
) {

    if (
        statistics.phases.length ===
        0
    ) {

        return {
            metricStatus:
                "UNAVAILABLE",

            reason:
                "SERVED_LOAD_SIGNAL_NOT_OBSERVED",

            observabilityStatus:
                ENGINEERING_OBSERVABILITY_STATUS
                    .NOT_ESTABLISHED,

            qualityStatus:
                ENGINEERING_DATA_QUALITY
                    .INSUFFICIENT,
        };
    }


    if (
        statistics.sampleCount <
        config.minimumSamples ||
        statistics.observedHours <=
        0
    ) {

        return {
            metricStatus:
                "UNAVAILABLE",

            reason:
                "INSUFFICIENT_QUALIFIED_LOAD_SAMPLES",

            observabilityStatus:
                ENGINEERING_OBSERVABILITY_STATUS
                    .PARTIAL,

            qualityStatus:
                ENGINEERING_DATA_QUALITY
                    .INSUFFICIENT,
        };
    }


    if (
        statistics.coveragePercent >=
        config.goodCoveragePercent
    ) {

        return {
            metricStatus:
                "CALCULATED",

            reason:
                null,

            observabilityStatus:
                ENGINEERING_OBSERVABILITY_STATUS
                    .ESTABLISHED,

            qualityStatus:
                ENGINEERING_DATA_QUALITY
                    .GOOD,
        };
    }


    if (
        statistics.coveragePercent >=
        config.partialCoveragePercent
    ) {

        return {
            metricStatus:
                "PARTIALLY_CALCULATED",

            reason:
                "PARTIAL_TEMPORAL_COVERAGE",

            observabilityStatus:
                ENGINEERING_OBSERVABILITY_STATUS
                    .PARTIAL,

            qualityStatus:
                ENGINEERING_DATA_QUALITY
                    .PARTIAL,
        };
    }


    return {
        metricStatus:
            "UNAVAILABLE",

        reason:
            "TEMPORAL_COVERAGE_INSUFFICIENT",

        observabilityStatus:
            ENGINEERING_OBSERVABILITY_STATUS
                .PARTIAL,

        qualityStatus:
            ENGINEERING_DATA_QUALITY
                .INSUFFICIENT,
    };
}


/*
|--------------------------------------------------------------------------
| Build one metric based on calculated evidence state
|--------------------------------------------------------------------------
*/

function buildMetricByEvidenceState({
    state,

    key,

    label,

    value,

    unit,

    calculationMethod,

    reportingWindow,

    scope,

    observability,

    dataQuality,

    metadata,
}) {

    const common = {
        key,

        label,

        family:
            ENGINEERING_METRIC_FAMILY
                .ELECTRICAL_PERFORMANCE,

        unit,

        reason:
            state.reason,

        evidenceBasis:
            ENGINEERING_EVIDENCE_BASIS
                .DERIVED,

        calculationMethod,

        reportingWindow,

        scope,

        observability,

        dataQuality,

        sources: [
            {
                type:
                    ENGINEERING_SOURCE_TYPE
                        .VRM_TELEMETRY,

                collection:
                    "telemetry",

                metric:
                    "servedLoad",

                description:
                    "Qualified VRM AC consumption phase telemetry",
            },
        ],

        metadata,
    };


    if (
        state.metricStatus ===
        "CALCULATED"
    ) {

        return buildCalculatedEngineeringMetric({
            ...common,

            value,
        });
    }


    if (
        state.metricStatus ===
        "PARTIALLY_CALCULATED"
    ) {

        return buildPartialEngineeringMetric({
            ...common,

            value,
        });
    }


    return buildUnavailableEngineeringMetric({
        ...common,
    });
}


/*
|--------------------------------------------------------------------------
| Public site electrical analytics
|--------------------------------------------------------------------------
*/

export function calculateSiteElectricalPerformance({
    records = [],

    vrmSiteId = null,

    installationId = null,

    start,

    end,

    family =
    "PRIMARY",

    config = {},
} = {}) {

    const effectiveConfig = {
        ...SITE_ELECTRICAL_ANALYTICS_CONFIG,
        ...config,
    };


    const statistics =
        calculateSiteElectricalStatistics({
            records,

            family,

            start,

            end,

            config:
                effectiveConfig,
        });


    const state =
        resolveEvidenceState(
            statistics,
            effectiveConfig
        );


    const scope =
        buildEngineeringScope({
            aggregationLevel:
                ENGINEERING_AGGREGATION_LEVEL
                    .SITE,

            vrmSiteId,

            installationId,
        });


    const phaseFields =
        statistics.phases.map(
            (phase) =>
                `AC_CONSUMPTION_L${phase}`
        );


    const observability =
        buildEngineeringObservability({
            status:
                state
                    .observabilityStatus,

            requiredFields:
                phaseFields,

            observedFields:
                phaseFields,

            missingFields:
                [],

            coveragePercent:
                statistics
                    .coveragePercent,

            reason:
                state.reason,
        });


    const dataQuality =
        buildEngineeringDataQuality({
            status:
                state
                    .qualityStatus,

            sampleCount:
                statistics
                    .sampleCount,

            validSampleCount:
                statistics
                    .sampleCount,

            invalidSampleCount:
                statistics
                    .rejectedBuckets,

            coveragePercent:
                statistics
                    .coveragePercent,

            reason:
                state.reason,
        });


    const metadata = {
        servedLoadFamily:
            statistics.family,

        observedPhases:
            statistics.phases,

        reportingHours:
            statistics.reportingHours,

        observedHours:
            statistics.observedHours,

        temporalCoveragePercent:
            statistics.coveragePercent,

        qualifiedSampleCount:
            statistics.sampleCount,

        integratedIntervalCount:
            statistics
                .integratedIntervalCount,

        rejectedBucketCount:
            statistics
                .rejectedBuckets,

        rejectedLongGapCount:
            statistics
                .rejectedGapCount,

        maxInterpolationGapMinutes:
            effectiveConfig
                .maxInterpolationGapMinutes,

        semanticBoundary:
            "SERVED_LOAD_IS_NOT_AUTOMATICALLY_REQUIRED_DEMAND",
    };


    const metricDefinitions = [
        {
            key:
                "peakDemandKw",

            label:
                "Peak Demand",

            value:
                statistics
                    .peakDemandKw,

            unit:
                ENGINEERING_UNIT.KW,

            method:
                "maximum qualified total served-load power",
        },

        {
            key:
                "averageDemandKw",

            label:
                "Average Demand",

            value:
                statistics
                    .averageDemandKw,

            unit:
                ENGINEERING_UNIT.KW,

            method:
                "time-weighted observed load energy divided by qualified observed hours",
        },

        {
            key:
                "minimumDemandKw",

            label:
                "Minimum Demand",

            value:
                statistics
                    .minimumDemandKw,

            unit:
                ENGINEERING_UNIT.KW,

            method:
                "minimum qualified total served-load power",
        },

        {
            key:
                "loadFactorPercent",

            label:
                "Load Factor",

            value:
                statistics
                    .loadFactorPercent,

            unit:
                ENGINEERING_UNIT.PERCENT,

            method:
                "time-weighted average demand divided by peak demand",
        },

        {
            key:
                "observedLoadEnergyKwh",

            label:
                "Observed Load Energy",

            value:
                statistics
                    .observedLoadEnergyKwh,

            unit:
                ENGINEERING_UNIT.KWH,

            method:
                "trapezoidal integration of qualified served-load power",
        },
    ];


    const metrics =
        metricDefinitions.map(
            (definition) =>
                buildMetricByEvidenceState({
                    state,

                    key:
                        definition.key,

                    label:
                        definition.label,

                    value:
                        definition.value,

                    unit:
                        definition.unit,

                    calculationMethod:
                        definition.method,

                    reportingWindow:
                        statistics
                            .reportingWindow,

                    scope,

                    observability,

                    dataQuality,

                    metadata,
                })
        );


    return buildEngineeringMetricFamily({
        family:
            ENGINEERING_METRIC_FAMILY
                .ELECTRICAL_PERFORMANCE,

        metrics,

        reportingWindow:
            statistics
                .reportingWindow,

        scope,

        boundary:
            "Metrics represent qualified observed served load. Served load is not automatically required demand, and missing telemetry is not interpreted as zero load.",
    });
}


export default {
    SERVED_LOAD_ATTRIBUTES,

    SITE_ELECTRICAL_ANALYTICS_CONFIG,

    getTelemetryNumericValue,

    getTelemetryAttributeId,

    resolveServedLoadFamily,

    determineServedLoadPhases,

    buildServedLoadSeries,

    integrateLoadSeries,

    calculateSiteElectricalStatistics,

    calculateSiteElectricalPerformance,
};

