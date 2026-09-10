// services/engineering/solarPerformanceAnalyticsService.js

import {
    SOLAR_ATTRIBUTE_MAP,
    SOLAR_UNIT_STATUS,
} from "./solarAttributeMap.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 8.7F — Solar Performance Analytics
|--------------------------------------------------------------------------
|
| Pure engineering analytics / qualification service.
|
| Canonical evidence:
|
|   442 — PV power
|   94  — Yield today
|   96  — Yield yesterday
|   95  — Maximum charge power today
|   97  — Maximum charge power yesterday
|
| This service deliberately separates:
|
|   observed performance evidence
|
| from:
|
|   performance ratio
|   capacity factor
|   specific yield
|   normalized yield
|   installed/rated PV capacity
|   irradiance
|
| Those KPIs require additional engineering inputs that are not presently
| established by the Phase 8.7 telemetry contract.
|--------------------------------------------------------------------------
*/


export const SOLAR_PERFORMANCE_PHASE =
    "8.7F";


export const SOLAR_PERFORMANCE_FAMILY =
    "SOLAR_PERFORMANCE";


export const SOLAR_PERFORMANCE_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const SOLAR_PERFORMANCE_REASON =
    Object.freeze({
        PERFORMANCE_EVIDENCE_QUALIFIED:
            "PERFORMANCE_EVIDENCE_QUALIFIED",

        PERFORMANCE_EVIDENCE_PARTIAL:
            "PERFORMANCE_EVIDENCE_PARTIAL",

        PERFORMANCE_INPUTS_INSUFFICIENT:
            "PERFORMANCE_INPUTS_INSUFFICIENT",

        NO_SOLAR_PERFORMANCE_EVIDENCE:
            "NO_SOLAR_PERFORMANCE_EVIDENCE",

        DEVICE_TOPOLOGY_AMBIGUOUS:
            "DEVICE_TOPOLOGY_AMBIGUOUS",

        SELECTED_DEVICE_NOT_FOUND:
            "SELECTED_DEVICE_NOT_FOUND",

        UNIT_METADATA_CONFLICT:
            "UNIT_METADATA_CONFLICT",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",
    });


export const SOLAR_PERFORMANCE_TOPOLOGY_STATUS =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        AMBIGUOUS:
            "AMBIGUOUS",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const SOLAR_PERFORMANCE_KPI_STATUS =
    Object.freeze({
        UNAVAILABLE:
            "UNAVAILABLE",

        INPUTS_MISSING:
            "INPUTS_MISSING",

        SEMANTICS_UNRESOLVED:
            "SEMANTICS_UNRESOLVED",
    });


export const DEFAULT_SOLAR_PERFORMANCE_CONFIG =
    Object.freeze({
        requireValidQuality:
            true,

        requireRawAggregation:
            true,
    });


export const SOLAR_PERFORMANCE_BOUNDARIES =
    Object.freeze({
        missingTelemetryMeansZero:
            false,

        noTelemetryMeansNoSolarInstallation:
            false,

        zeroPvPowerMeansFailure:
            false,

        zeroYieldMeansFailure:
            false,

        observedPeakMeansInstalledCapacity:
            false,

        historicalMaxMeansRatedCapacity:
            false,

        unitsInferredFromMagnitude:
            false,

        unitsInferredFromAttributeName:
            false,

        irradianceInferredFromPvPower:
            false,

        irradianceInferredFromYield:
            false,

        yieldTreatedAsReportingWindowEnergy:
            false,

        dailyYieldSamplesSummed:
            false,

        todayAndYesterdayYieldSummed:
            false,

        todayAndYesterdayMaxPowerSummed:
            false,

        multipleDevicesAutomaticallyAggregated:
            false,

        performanceRatioCalculated:
            false,

        capacityFactorCalculated:
            false,

        specificYieldCalculated:
            false,

        normalizedYieldCalculated:
            false,

        installedCapacityCalculated:
            false,

        irradianceCalculated:
            false,

        availabilityCalculated:
            false,
    });


const PV_POWER_ID =
    SOLAR_ATTRIBUTE_MAP
        .PV_POWER
        .id;


const YIELD_TODAY_ID =
    SOLAR_ATTRIBUTE_MAP
        .YIELD_TODAY
        .id;


const YIELD_YESTERDAY_ID =
    SOLAR_ATTRIBUTE_MAP
        .YIELD_YESTERDAY
        .id;


const MAX_POWER_TODAY_ID =
    SOLAR_ATTRIBUTE_MAP
        .MAX_POWER_TODAY
        .id;


const MAX_POWER_YESTERDAY_ID =
    SOLAR_ATTRIBUTE_MAP
        .MAX_POWER_YESTERDAY
        .id;


const PERFORMANCE_ATTRIBUTE_IDS =
    Object.freeze([
        PV_POWER_ID,
        YIELD_TODAY_ID,
        YIELD_YESTERDAY_ID,
        MAX_POWER_TODAY_ID,
        MAX_POWER_YESTERDAY_ID,
    ]);


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


function numericValue(
    record
) {
    return (
        finiteNumber(
            record
                ?.numericValue
        ) ??
        finiteNumber(
            record
                ?.value
        )
    );
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
        value === undefined ||
        String(
            value
        ).trim() ===
        ""
    ) {
        return "UNKNOWN_DEVICE";
    }


    return String(
        value
    );
}


function normalizeUnit(
    record
) {
    const candidates = [
        record?.unit,
        record?.engineeringUnit,
    ];


    for (
        const candidate
        of candidates
    ) {
        if (
            candidate !==
            null &&
            candidate !==
            undefined &&
            String(
                candidate
            ).trim() !==
            ""
        ) {
            return String(
                candidate
            ).trim();
        }
    }


    return null;
}


function recordPassesBoundary({
    record,
    start,
    end,
    config,
}) {
    const timestamp =
        validDate(
            record
                ?.timestamp
        );


    if (
        !timestamp ||
        timestamp <
        start ||
        timestamp >=
        end
    ) {
        return false;
    }


    if (
        config
            .requireValidQuality &&
        record
            ?.quality !==
        "VALID"
    ) {
        return false;
    }


    if (
        config
            .requireRawAggregation &&
        record
            ?.aggregationLevel !==
        "RAW"
    ) {
        return false;
    }


    return true;
}


function isPerformanceAttribute(
    record
) {
    return PERFORMANCE_ATTRIBUTE_IDS
        .includes(
            Number(
                record
                    ?.vrmAttributeId
            )
        );
}


function recordsForAttribute(
    records,
    attributeId
) {
    return records.filter(
        (
            record
        ) =>
            Number(
                record
                    ?.vrmAttributeId
            ) ===
            Number(
                attributeId
            )
    );
}


function distinctDeviceInstances(
    records
) {
    return Array.from(
        new Set(
            records.map(
                (
                    record
                ) =>
                    normalizeDeviceInstance(
                        record
                            ?.deviceInstance
                    )
            )
        )
    ).sort();
}


function filterDevice(
    records,
    deviceInstance
) {
    const normalized =
        normalizeDeviceInstance(
            deviceInstance
        );


    return records.filter(
        (
            record
        ) =>
            normalizeDeviceInstance(
                record
                    ?.deviceInstance
            ) ===
            normalized
    );
}


/*
|--------------------------------------------------------------------------
| Deduplication
|--------------------------------------------------------------------------
|
| Identical same-timestamp observations are deduplicated.
| Conflicting observations at the same timestamp are discarded.
|--------------------------------------------------------------------------
*/

function prepareSeries(
    records
) {
    const grouped =
        new Map();


    for (
        const record
        of records
    ) {
        const timestamp =
            validDate(
                record
                    ?.timestamp
            );


        const value =
            numericValue(
                record
            );


        if (
            !timestamp ||
            value ===
            null
        ) {
            continue;
        }


        const key =
            timestamp
                .toISOString();


        if (
            !grouped.has(
                key
            )
        ) {
            grouped.set(
                key,
                []
            );
        }


        grouped
            .get(
                key
            )
            .push({
                timestamp,
                value,
                unit:
                    normalizeUnit(
                        record
                    ),
                record,
            });
    }


    const series =
        [];


    let duplicateTimestampCount =
        0;


    let conflictingTimestampCount =
        0;


    for (
        const observations
        of grouped.values()
    ) {
        const signatures =
            Array.from(
                new Set(
                    observations.map(
                        (
                            observation
                        ) =>
                            JSON.stringify({
                                value:
                                    observation
                                        .value,

                                unit:
                                    observation
                                        .unit,
                            })
                    )
                )
            );


        if (
            signatures.length >
            1
        ) {
            conflictingTimestampCount +=
                1;

            continue;
        }


        if (
            observations.length >
            1
        ) {
            duplicateTimestampCount +=
                observations.length -
                1;
        }


        series.push(
            observations[
            0
            ]
        );
    }


    series.sort(
        (
            a,
            b
        ) =>
            a.timestamp -
            b.timestamp
    );


    return {
        series,
        duplicateTimestampCount,
        conflictingTimestampCount,
    };
}


/*
|--------------------------------------------------------------------------
| Unit qualification
|--------------------------------------------------------------------------
*/

function qualifyUnit(
    series
) {
    const units =
        Array.from(
            new Set(
                series
                    .map(
                        (
                            point
                        ) =>
                            point.unit
                    )
                    .filter(
                        (
                            unit
                        ) =>
                            unit !==
                            null
                    )
            )
        );


    if (
        units.length ===
        0
    ) {
        return {
            status:
                SOLAR_UNIT_STATUS
                    .UNRESOLVED,

            value:
                null,

            conflict:
                false,
        };
    }


    if (
        units.length >
        1
    ) {
        return {
            status:
                SOLAR_UNIT_STATUS
                    .UNRESOLVED,

            value:
                null,

            conflict:
                true,

            observedUnits:
                units,
        };
    }


    return {
        status:
            SOLAR_UNIT_STATUS
                .RESOLVED,

        value:
            units[
            0
            ],

        conflict:
            false,
    };
}


/*
|--------------------------------------------------------------------------
| Evidence analysis
|--------------------------------------------------------------------------
*/

function analyseEvidence({
    records,
    attributeId,
}) {
    const candidateRecords =
        recordsForAttribute(
            records,
            attributeId
        );


    const prepared =
        prepareSeries(
            candidateRecords
        );


    const unit =
        qualifyUnit(
            prepared
                .series
        );


    const latest =
        prepared
            .series
            .length >
            0
            ? prepared
                .series[
            prepared
                .series
                .length -
            1
            ]
            : null;


    const values =
        prepared
            .series
            .map(
                (
                    point
                ) =>
                    point.value
            );


    return {
        attributeId,

        candidateRecordCount:
            candidateRecords
                .length,

        recordsUsed:
            prepared
                .series
                .length,

        observed:
            latest !==
            null,

        latestValue:
            latest
                ?.value ??
            null,

        latestAt:
            latest
                ?.timestamp ??
            null,

        observedMin:
            values.length
                ? Math.min(
                    ...values
                )
                : null,

        observedMax:
            values.length
                ? Math.max(
                    ...values
                )
                : null,

        unit,

        duplicateTimestampCount:
            prepared
                .duplicateTimestampCount,

        conflictingTimestampCount:
            prepared
                .conflictingTimestampCount,
    };
}


/*
|--------------------------------------------------------------------------
| KPI placeholders
|--------------------------------------------------------------------------
*/

function unavailableKpi(
    reason
) {
    return {
        value:
            null,

        unit:
            null,

        status:
            SOLAR_PERFORMANCE_KPI_STATUS
                .UNAVAILABLE,

        reason,
    };
}


function buildKpis() {
    return {
        performanceRatio:
            unavailableKpi(
                "IRRADIANCE_AND_REFERENCE_YIELD_UNAVAILABLE"
            ),

        capacityFactor:
            unavailableKpi(
                "RATED_PV_CAPACITY_UNAVAILABLE"
            ),

        specificYield:
            unavailableKpi(
                "RATED_PV_CAPACITY_AND_QUALIFIED_ENERGY_UNAVAILABLE"
            ),

        normalizedYield:
            unavailableKpi(
                "NORMALIZATION_BASIS_UNAVAILABLE"
            ),

        installedCapacity:
            unavailableKpi(
                "INSTALLED_PV_CAPACITY_NOT_ESTABLISHED"
            ),

        irradiance:
            unavailableKpi(
                "IRRADIANCE_EVIDENCE_UNAVAILABLE"
            ),
    };
}


/*
|--------------------------------------------------------------------------
| Empty evidence
|--------------------------------------------------------------------------
*/

function emptyEvidence(
    attributeId
) {
    return {
        attributeId,

        candidateRecordCount:
            0,

        recordsUsed:
            0,

        observed:
            false,

        latestValue:
            null,

        latestAt:
            null,

        observedMin:
            null,

        observedMax:
            null,

        unit: {
            status:
                SOLAR_UNIT_STATUS
                    .UNRESOLVED,

            value:
                null,

            conflict:
                false,
        },

        duplicateTimestampCount:
            0,

        conflictingTimestampCount:
            0,
    };
}


/*
|--------------------------------------------------------------------------
| Unavailable result
|--------------------------------------------------------------------------
*/

function buildUnavailableResult({
    reason,
    start,
    end,
    totalInputRecords = 0,
    qualifiedInputRecords = 0,
    candidateRecords = 0,
    observedDeviceInstances = [],
    selectedDeviceInstance = null,
    ambiguous = false,
}) {
    return {
        family:
            SOLAR_PERFORMANCE_FAMILY,

        phase:
            SOLAR_PERFORMANCE_PHASE,

        status:
            SOLAR_PERFORMANCE_STATUS
                .UNAVAILABLE,

        reason,

        reportingWindow: {
            start,
            end,
            semantics:
                "[start,end)",
        },

        topology: {
            status:
                ambiguous
                    ? SOLAR_PERFORMANCE_TOPOLOGY_STATUS
                        .AMBIGUOUS
                    : SOLAR_PERFORMANCE_TOPOLOGY_STATUS
                        .UNAVAILABLE,

            observedDeviceInstances,

            selectedDeviceInstance,

            ambiguous,
        },

        evidence: {
            totalInputRecords,
            qualifiedInputRecords,
            candidateRecords,

            pvPower:
                emptyEvidence(
                    PV_POWER_ID
                ),

            yieldToday:
                emptyEvidence(
                    YIELD_TODAY_ID
                ),

            yieldYesterday:
                emptyEvidence(
                    YIELD_YESTERDAY_ID
                ),

            maxPowerToday:
                emptyEvidence(
                    MAX_POWER_TODAY_ID
                ),

            maxPowerYesterday:
                emptyEvidence(
                    MAX_POWER_YESTERDAY_ID
                ),
        },

        kpis:
            buildKpis(),

        boundaries:
            SOLAR_PERFORMANCE_BOUNDARIES,
    };
}


/*
|--------------------------------------------------------------------------
| Overall evidence status
|--------------------------------------------------------------------------
*/

function deriveOverallStatus(
    evidence
) {
    const sources = [
        evidence
            .pvPower,

        evidence
            .yieldToday,

        evidence
            .yieldYesterday,

        evidence
            .maxPowerToday,

        evidence
            .maxPowerYesterday,
    ];


    const observed =
        sources.filter(
            (
                source
            ) =>
                source
                    .observed
        );


    if (
        observed.length ===
        0
    ) {
        return {
            status:
                SOLAR_PERFORMANCE_STATUS
                    .UNAVAILABLE,

            reason:
                SOLAR_PERFORMANCE_REASON
                    .NO_SOLAR_PERFORMANCE_EVIDENCE,
        };
    }


    if (
        observed.some(
            (
                source
            ) =>
                source
                    .unit
                    .conflict
        )
    ) {
        return {
            status:
                SOLAR_PERFORMANCE_STATUS
                    .UNAVAILABLE,

            reason:
                SOLAR_PERFORMANCE_REASON
                    .UNIT_METADATA_CONFLICT,
        };
    }


    /*
     * Even when all observed units are explicit, Phase 8.7F cannot
     * calculate PR / CF / specific yield because rated capacity,
     * irradiance and qualified interval-energy semantics are absent.
     *
     * Therefore performance remains evidence/qualification only.
     */
    return {
        status:
            SOLAR_PERFORMANCE_STATUS
                .PARTIALLY_CALCULATED,

        reason:
            SOLAR_PERFORMANCE_REASON
                .PERFORMANCE_INPUTS_INSUFFICIENT,
    };
}


/*
|--------------------------------------------------------------------------
| Main service
|--------------------------------------------------------------------------
*/

export function calculateSolarPerformanceAnalytics({
    records = [],
    start,
    end,
    selectedDeviceInstance =
    null,
    config = {},
} = {}) {
    const reportingStart =
        validDate(
            start
        );


    const reportingEnd =
        validDate(
            end
        );


    if (
        !reportingStart ||
        !reportingEnd ||
        reportingStart >=
        reportingEnd
    ) {
        return buildUnavailableResult({
            reason:
                SOLAR_PERFORMANCE_REASON
                    .INVALID_REPORTING_WINDOW,

            start:
                reportingStart,

            end:
                reportingEnd,

            totalInputRecords:
                Array.isArray(
                    records
                )
                    ? records.length
                    : 0,
        });
    }


    const resolvedConfig = {
        ...DEFAULT_SOLAR_PERFORMANCE_CONFIG,
        ...config,
    };


    const qualifiedRecords =
        Array.isArray(
            records
        )
            ? records.filter(
                (
                    record
                ) =>
                    recordPassesBoundary({
                        record,
                        start:
                            reportingStart,
                        end:
                            reportingEnd,
                        config:
                            resolvedConfig,
                    })
            )
            : [];


    const candidateRecords =
        qualifiedRecords.filter(
            isPerformanceAttribute
        );


    if (
        candidateRecords.length ===
        0
    ) {
        return buildUnavailableResult({
            reason:
                SOLAR_PERFORMANCE_REASON
                    .NO_SOLAR_PERFORMANCE_EVIDENCE,

            start:
                reportingStart,

            end:
                reportingEnd,

            totalInputRecords:
                Array.isArray(
                    records
                )
                    ? records.length
                    : 0,

            qualifiedInputRecords:
                qualifiedRecords
                    .length,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Device topology
    |--------------------------------------------------------------------------
    */

    const observedDeviceInstances =
        distinctDeviceInstances(
            candidateRecords
        );


    let selectedRecords =
        candidateRecords;


    let resolvedDeviceInstance =
        null;


    if (
        selectedDeviceInstance !==
        null &&
        selectedDeviceInstance !==
        undefined
    ) {
        resolvedDeviceInstance =
            normalizeDeviceInstance(
                selectedDeviceInstance
            );


        selectedRecords =
            filterDevice(
                candidateRecords,
                selectedDeviceInstance
            );


        if (
            selectedRecords.length ===
            0
        ) {
            return buildUnavailableResult({
                reason:
                    SOLAR_PERFORMANCE_REASON
                        .SELECTED_DEVICE_NOT_FOUND,

                start:
                    reportingStart,

                end:
                    reportingEnd,

                totalInputRecords:
                    Array.isArray(
                        records
                    )
                        ? records.length
                        : 0,

                qualifiedInputRecords:
                    qualifiedRecords
                        .length,

                candidateRecords:
                    candidateRecords
                        .length,

                observedDeviceInstances,

                selectedDeviceInstance:
                    resolvedDeviceInstance,
            });
        }
    }
    else {
        if (
            observedDeviceInstances.length >
            1
        ) {
            return buildUnavailableResult({
                reason:
                    SOLAR_PERFORMANCE_REASON
                        .DEVICE_TOPOLOGY_AMBIGUOUS,

                start:
                    reportingStart,

                end:
                    reportingEnd,

                totalInputRecords:
                    Array.isArray(
                        records
                    )
                        ? records.length
                        : 0,

                qualifiedInputRecords:
                    qualifiedRecords
                        .length,

                candidateRecords:
                    candidateRecords
                        .length,

                observedDeviceInstances,

                ambiguous:
                    true,
            });
        }


        resolvedDeviceInstance =
            observedDeviceInstances[
            0
            ] ??
            null;
    }


    const evidence = {
        pvPower:
            analyseEvidence({
                records:
                    selectedRecords,

                attributeId:
                    PV_POWER_ID,
            }),

        yieldToday:
            analyseEvidence({
                records:
                    selectedRecords,

                attributeId:
                    YIELD_TODAY_ID,
            }),

        yieldYesterday:
            analyseEvidence({
                records:
                    selectedRecords,

                attributeId:
                    YIELD_YESTERDAY_ID,
            }),

        maxPowerToday:
            analyseEvidence({
                records:
                    selectedRecords,

                attributeId:
                    MAX_POWER_TODAY_ID,
            }),

        maxPowerYesterday:
            analyseEvidence({
                records:
                    selectedRecords,

                attributeId:
                    MAX_POWER_YESTERDAY_ID,
            }),
    };


    const overall =
        deriveOverallStatus(
            evidence
        );


    return {
        family:
            SOLAR_PERFORMANCE_FAMILY,

        phase:
            SOLAR_PERFORMANCE_PHASE,

        status:
            overall
                .status,

        reason:
            overall
                .reason,

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
                SOLAR_PERFORMANCE_TOPOLOGY_STATUS
                    .QUALIFIED,

            observedDeviceInstances,

            selectedDeviceInstance:
                resolvedDeviceInstance,

            ambiguous:
                false,
        },

        evidence: {
            totalInputRecords:
                Array.isArray(
                    records
                )
                    ? records.length
                    : 0,

            qualifiedInputRecords:
                qualifiedRecords
                    .length,

            candidateRecords:
                candidateRecords
                    .length,

            selectedRecords:
                selectedRecords
                    .length,

            ...evidence,
        },

        /*
         * These remain deliberately unavailable.
         */
        kpis:
            buildKpis(),

        boundaries:
            SOLAR_PERFORMANCE_BOUNDARIES,
    };
}


export default Object.freeze({
    SOLAR_PERFORMANCE_PHASE,
    SOLAR_PERFORMANCE_FAMILY,
    SOLAR_PERFORMANCE_STATUS,
    SOLAR_PERFORMANCE_REASON,
    SOLAR_PERFORMANCE_TOPOLOGY_STATUS,
    SOLAR_PERFORMANCE_KPI_STATUS,
    DEFAULT_SOLAR_PERFORMANCE_CONFIG,
    SOLAR_PERFORMANCE_BOUNDARIES,
    calculateSolarPerformanceAnalytics,
});