// services/engineering/solarPowerAnalyticsService.js

import {
    SOLAR_PRIMARY_POWER_ATTRIBUTE_IDS,
    SOLAR_SECONDARY_POWER_ATTRIBUTE_IDS,
    SOLAR_UNIT_STATUS,
} from "./solarAttributeMap.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 8.7C — Solar Power Analytics
|--------------------------------------------------------------------------
|
| Pure engineering service.
|
| This service DOES NOT:
|
| - query MongoDB
| - persist telemetry
| - calculate solar energy
| - infer W / kW from magnitude
| - infer installed PV capacity
| - calculate availability
| - calculate performance ratio
| - calculate capacity factor
| - infer failure from zero PV power
| - aggregate multiple Solar Chargers automatically
| - sum attr442 and attr113
| - substitute attr107 for PV-input power
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Identity
|--------------------------------------------------------------------------
*/

export const SOLAR_POWER_ANALYTICS_PHASE =
    "8.7C";


export const SOLAR_POWER_ANALYTICS_FAMILY =
    "SOLAR_POWER";


/*
|--------------------------------------------------------------------------
| Status
|--------------------------------------------------------------------------
*/

export const SOLAR_POWER_ANALYTICS_STATUS =
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

export const SOLAR_POWER_ANALYTICS_REASON =
    Object.freeze({
        SOLAR_POWER_CALCULATED:
            "SOLAR_POWER_CALCULATED",

        SOLAR_POWER_UNIT_UNRESOLVED:
            "SOLAR_POWER_UNIT_UNRESOLVED",

        NO_SOLAR_POWER_EVIDENCE:
            "NO_SOLAR_POWER_EVIDENCE",

        NO_VALID_SOLAR_POWER_SAMPLES:
            "NO_VALID_SOLAR_POWER_SAMPLES",

        PRIMARY_DEVICE_TOPOLOGY_AMBIGUOUS:
            "PRIMARY_DEVICE_TOPOLOGY_AMBIGUOUS",

        SECONDARY_DEVICE_TOPOLOGY_AMBIGUOUS:
            "SECONDARY_DEVICE_TOPOLOGY_AMBIGUOUS",

        SELECTED_DEVICE_NOT_FOUND:
            "SELECTED_DEVICE_NOT_FOUND",

        UNIT_METADATA_CONFLICT:
            "UNIT_METADATA_CONFLICT",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",
    });


/*
|--------------------------------------------------------------------------
| Power path
|--------------------------------------------------------------------------
*/

export const SOLAR_POWER_PATH =
    Object.freeze({
        PRIMARY_PV_POWER_442:
            "PRIMARY_PV_POWER_442",

        SECONDARY_DC_COUPLED_PV_113:
            "SECONDARY_DC_COUPLED_PV_113",

        NONE:
            "NONE",
    });


/*
|--------------------------------------------------------------------------
| Topology status
|--------------------------------------------------------------------------
*/

export const SOLAR_POWER_TOPOLOGY_STATUS =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        AMBIGUOUS:
            "AMBIGUOUS",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


/*
|--------------------------------------------------------------------------
| Default config
|--------------------------------------------------------------------------
*/

export const DEFAULT_SOLAR_POWER_ANALYTICS_CONFIG =
    Object.freeze({
        requireValidQuality:
            true,

        requireRawAggregation:
            true,
    });


/*
|--------------------------------------------------------------------------
| Boundaries
|--------------------------------------------------------------------------
*/

export const SOLAR_POWER_ANALYTICS_BOUNDARIES =
    Object.freeze({
        missingMeansZero:
            false,

        zeroMeansFailure:
            false,

        zeroMeansUnavailable:
            false,

        chargerOutputSubstituted:
            false,

        primaryAndSecondarySummed:
            false,

        multipleDevicesAutomaticallyAggregated:
            false,

        unitInferredFromMagnitude:
            false,

        installedCapacityInferred:
            false,

        irradianceInferred:
            false,

        energyCalculated:
            false,

        availabilityCalculated:
            false,

        performanceRatioCalculated:
            false,

        capacityFactorCalculated:
            false,
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


function validDate(
    value
) {
    if (
        value ===
        null ||
        value ===
        undefined
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
        value ===
        null ||
        value ===
        undefined ||
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
    value
) {
    if (
        value ===
        null ||
        value ===
        undefined
    ) {
        return null;
    }


    const unit =
        String(
            value
        ).trim();


    return unit ===
        ""
        ? null
        : unit;
}


function extractExplicitUnit(
    record
) {
    /*
     * Explicit metadata only.
     *
     * Do NOT parse formatWithUnit and do NOT infer unit from magnitude.
     */

    return (
        normalizeUnit(
            record?.unit
        ) ??
        normalizeUnit(
            record?.engineeringUnit
        ) ??
        null
    );
}


function normalizeConfig(
    config
) {
    return {
        ...DEFAULT_SOLAR_POWER_ANALYTICS_CONFIG,
        ...(
            config ??
            {}
        ),
    };
}


function recordPassesBaseBoundary({
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
        !timestamp
    ) {
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


function recordsForAttributeIds({
    records,
    attributeIds,
}) {
    const ids =
        new Set(
            attributeIds
        );


    return records.filter(
        (
            record
        ) =>
            ids.has(
                Number(
                    record
                        ?.vrmAttributeId
                )
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
| Timestamp deduplication
|--------------------------------------------------------------------------
|
| Identical same-timestamp values are deduplicated.
|
| Conflicting same-timestamp values are discarded because the service
| cannot establish which observation is authoritative.
|--------------------------------------------------------------------------
*/

function preparePowerSeries(
    records
) {
    const byTimestamp =
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


        const numeric =
            finiteNumber(
                record
                    ?.numericValue
            ) ??
            finiteNumber(
                record
                    ?.value
            );


        if (
            !timestamp ||
            numeric ===
            null
        ) {
            continue;
        }


        const key =
            timestamp.toISOString();


        if (
            !byTimestamp.has(
                key
            )
        ) {
            byTimestamp.set(
                key,
                []
            );
        }


        byTimestamp
            .get(
                key
            )
            .push({
                timestamp,
                value:
                    numeric,

                record,
            });
    }


    const series =
        [];


    let conflictingTimestampCount =
        0;


    let duplicateTimestampCount =
        0;


    for (
        const observations
        of byTimestamp.values()
    ) {
        const uniqueValues =
            Array.from(
                new Set(
                    observations.map(
                        (
                            observation
                        ) =>
                            observation.value
                    )
                )
            );


        if (
            uniqueValues.length >
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


        series.push({
            timestamp:
                observations[
                    0
                ].timestamp,

            value:
                observations[
                    0
                ].value,

            record:
                observations[
                    0
                ].record,
        });
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
    records
) {
    const units =
        Array.from(
            new Set(
                records
                    .map(
                        extractExplicitUnit
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

            observedUnits:
                [],
        };
    }


    if (
        units.length ===
        1
    ) {
        return {
            status:
                SOLAR_UNIT_STATUS
                    .RESOLVED,

            value:
                units[
                0
                ],

            observedUnits:
                units,
        };
    }


    return {
        status:
            "CONFLICT",

        value:
            null,

        observedUnits:
            units,
    };
}


/*
|--------------------------------------------------------------------------
| Statistical metrics
|--------------------------------------------------------------------------
*/

function calculateSeriesMetrics(
    series
) {
    if (
        !Array.isArray(
            series
        ) ||
        series.length ===
        0
    ) {
        return {
            sampleCount:
                0,

            minimum:
                null,

            maximum:
                null,

            mean:
                null,

            latest:
                null,

            latestAt:
                null,

            zeroCount:
                0,

            positiveCount:
                0,

            negativeCount:
                0,
        };
    }


    const values =
        series.map(
            (
                point
            ) =>
                point.value
        );


    const minimum =
        Math.min(
            ...values
        );


    const maximum =
        Math.max(
            ...values
        );


    const sum =
        values.reduce(
            (
                accumulator,
                value
            ) =>
                accumulator +
                value,
            0
        );


    const mean =
        sum /
        values.length;


    const latestPoint =
        series[
        series.length -
        1
        ];


    return {
        sampleCount:
            values.length,

        minimum,

        maximum,

        mean,

        latest:
            latestPoint.value,

        latestAt:
            latestPoint.timestamp,

        zeroCount:
            values.filter(
                (
                    value
                ) =>
                    value ===
                    0
            ).length,

        positiveCount:
            values.filter(
                (
                    value
                ) =>
                    value >
                    0
            ).length,

        negativeCount:
            values.filter(
                (
                    value
                ) =>
                    value <
                    0
            ).length,
    };
}


/*
|--------------------------------------------------------------------------
| Result builders
|--------------------------------------------------------------------------
*/

function buildUnavailableResult({
    reason,
    start,
    end,
    selectedPath =
    SOLAR_POWER_PATH.NONE,
    observedDeviceInstances = [],
    selectedDeviceInstance = null,
    evidence = {},
}) {
    return {
        family:
            SOLAR_POWER_ANALYTICS_FAMILY,

        phase:
            SOLAR_POWER_ANALYTICS_PHASE,

        status:
            SOLAR_POWER_ANALYTICS_STATUS
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
                reason ===
                    SOLAR_POWER_ANALYTICS_REASON
                        .PRIMARY_DEVICE_TOPOLOGY_AMBIGUOUS ||
                    reason ===
                    SOLAR_POWER_ANALYTICS_REASON
                        .SECONDARY_DEVICE_TOPOLOGY_AMBIGUOUS
                    ? SOLAR_POWER_TOPOLOGY_STATUS
                        .AMBIGUOUS
                    : SOLAR_POWER_TOPOLOGY_STATUS
                        .UNAVAILABLE,

            selectedPath,

            observedDeviceInstances,

            selectedDeviceInstance,

            ambiguous:
                reason ===
                SOLAR_POWER_ANALYTICS_REASON
                    .PRIMARY_DEVICE_TOPOLOGY_AMBIGUOUS ||
                reason ===
                SOLAR_POWER_ANALYTICS_REASON
                    .SECONDARY_DEVICE_TOPOLOGY_AMBIGUOUS,
        },

        unit: {
            status:
                SOLAR_UNIT_STATUS
                    .UNRESOLVED,

            value:
                null,

            observedUnits:
                [],
        },

        power: {
            sampleCount:
                0,

            minimum:
                null,

            maximum:
                null,

            mean:
                null,

            latest:
                null,

            latestAt:
                null,

            zeroCount:
                0,

            positiveCount:
                0,

            negativeCount:
                0,
        },

        evidence: {
            primaryAttributeId:
                442,

            secondaryAttributeId:
                113,

            recordsUsed:
                0,

            ...evidence,
        },

        boundaries:
            SOLAR_POWER_ANALYTICS_BOUNDARIES,
    };
}


function buildAvailableResult({
    path,
    selectedDeviceInstance,
    observedDeviceInstances,
    selectedRecords,
    prepared,
    unit,
    start,
    end,
}) {
    const power =
        calculateSeriesMetrics(
            prepared.series
        );


    const unitResolved =
        unit.status ===
        SOLAR_UNIT_STATUS
            .RESOLVED;


    return {
        family:
            SOLAR_POWER_ANALYTICS_FAMILY,

        phase:
            SOLAR_POWER_ANALYTICS_PHASE,

        status:
            unitResolved
                ? SOLAR_POWER_ANALYTICS_STATUS
                    .CALCULATED
                : SOLAR_POWER_ANALYTICS_STATUS
                    .PARTIALLY_CALCULATED,

        reason:
            unitResolved
                ? SOLAR_POWER_ANALYTICS_REASON
                    .SOLAR_POWER_CALCULATED
                : SOLAR_POWER_ANALYTICS_REASON
                    .SOLAR_POWER_UNIT_UNRESOLVED,

        reportingWindow: {
            start,
            end,
            semantics:
                "[start,end)",
        },

        topology: {
            status:
                SOLAR_POWER_TOPOLOGY_STATUS
                    .QUALIFIED,

            selectedPath:
                path,

            observedDeviceInstances,

            selectedDeviceInstance,

            ambiguous:
                false,
        },

        unit,

        power,

        evidence: {
            primaryAttributeId:
                442,

            secondaryAttributeId:
                113,

            recordsUsed:
                prepared
                    .series
                    .length,

            candidateRecords:
                selectedRecords
                    .length,

            duplicateTimestampCount:
                prepared
                    .duplicateTimestampCount,

            conflictingTimestampCount:
                prepared
                    .conflictingTimestampCount,

            sourceAttributeId:
                path ===
                    SOLAR_POWER_PATH
                        .PRIMARY_PV_POWER_442
                    ? 442
                    : 113,
        },

        boundaries:
            SOLAR_POWER_ANALYTICS_BOUNDARIES,
    };
}


/*
|--------------------------------------------------------------------------
| Path qualification
|--------------------------------------------------------------------------
*/

function qualifyPowerPath({
    records,
    selectedDeviceInstance =
    null,
}) {
    const primaryRecords =
        recordsForAttributeIds({
            records,

            attributeIds:
                SOLAR_PRIMARY_POWER_ATTRIBUTE_IDS,
        });


    const secondaryRecords =
        recordsForAttributeIds({
            records,

            attributeIds:
                SOLAR_SECONDARY_POWER_ATTRIBUTE_IDS,
        });


    /*
    |--------------------------------------------------------------------------
    | Primary path has strict priority
    |--------------------------------------------------------------------------
    */

    if (
        primaryRecords.length >
        0
    ) {
        const devices =
            distinctDeviceInstances(
                primaryRecords
            );


        if (
            selectedDeviceInstance !==
            null &&
            selectedDeviceInstance !==
            undefined
        ) {
            const selected =
                filterDevice(
                    primaryRecords,
                    selectedDeviceInstance
                );


            if (
                selected.length ===
                0
            ) {
                return {
                    available:
                        false,

                    reason:
                        SOLAR_POWER_ANALYTICS_REASON
                            .SELECTED_DEVICE_NOT_FOUND,

                    path:
                        SOLAR_POWER_PATH
                            .PRIMARY_PV_POWER_442,

                    observedDeviceInstances:
                        devices,

                    selectedDeviceInstance:
                        normalizeDeviceInstance(
                            selectedDeviceInstance
                        ),

                    records:
                        [],
                };
            }


            return {
                available:
                    true,

                path:
                    SOLAR_POWER_PATH
                        .PRIMARY_PV_POWER_442,

                observedDeviceInstances:
                    devices,

                selectedDeviceInstance:
                    normalizeDeviceInstance(
                        selectedDeviceInstance
                    ),

                records:
                    selected,
            };
        }


        if (
            devices.length >
            1
        ) {
            return {
                available:
                    false,

                reason:
                    SOLAR_POWER_ANALYTICS_REASON
                        .PRIMARY_DEVICE_TOPOLOGY_AMBIGUOUS,

                path:
                    SOLAR_POWER_PATH
                        .PRIMARY_PV_POWER_442,

                observedDeviceInstances:
                    devices,

                selectedDeviceInstance:
                    null,

                records:
                    [],
            };
        }


        return {
            available:
                true,

            path:
                SOLAR_POWER_PATH
                    .PRIMARY_PV_POWER_442,

            observedDeviceInstances:
                devices,

            selectedDeviceInstance:
                devices[
                0
                ] ??
                null,

            records:
                primaryRecords,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Secondary path only when primary evidence does not exist
    |--------------------------------------------------------------------------
    */

    if (
        secondaryRecords.length >
        0
    ) {
        const devices =
            distinctDeviceInstances(
                secondaryRecords
            );


        if (
            selectedDeviceInstance !==
            null &&
            selectedDeviceInstance !==
            undefined
        ) {
            const selected =
                filterDevice(
                    secondaryRecords,
                    selectedDeviceInstance
                );


            if (
                selected.length ===
                0
            ) {
                return {
                    available:
                        false,

                    reason:
                        SOLAR_POWER_ANALYTICS_REASON
                            .SELECTED_DEVICE_NOT_FOUND,

                    path:
                        SOLAR_POWER_PATH
                            .SECONDARY_DC_COUPLED_PV_113,

                    observedDeviceInstances:
                        devices,

                    selectedDeviceInstance:
                        normalizeDeviceInstance(
                            selectedDeviceInstance
                        ),

                    records:
                        [],
                };
            }


            return {
                available:
                    true,

                path:
                    SOLAR_POWER_PATH
                        .SECONDARY_DC_COUPLED_PV_113,

                observedDeviceInstances:
                    devices,

                selectedDeviceInstance:
                    normalizeDeviceInstance(
                        selectedDeviceInstance
                    ),

                records:
                    selected,
            };
        }


        if (
            devices.length >
            1
        ) {
            return {
                available:
                    false,

                reason:
                    SOLAR_POWER_ANALYTICS_REASON
                        .SECONDARY_DEVICE_TOPOLOGY_AMBIGUOUS,

                path:
                    SOLAR_POWER_PATH
                        .SECONDARY_DC_COUPLED_PV_113,

                observedDeviceInstances:
                    devices,

                selectedDeviceInstance:
                    null,

                records:
                    [],
            };
        }


        return {
            available:
                true,

            path:
                SOLAR_POWER_PATH
                    .SECONDARY_DC_COUPLED_PV_113,

            observedDeviceInstances:
                devices,

            selectedDeviceInstance:
                devices[
                0
                ] ??
                null,

            records:
                secondaryRecords,
        };
    }


    return {
        available:
            false,

        reason:
            SOLAR_POWER_ANALYTICS_REASON
                .NO_SOLAR_POWER_EVIDENCE,

        path:
            SOLAR_POWER_PATH
                .NONE,

        observedDeviceInstances:
            [],

        selectedDeviceInstance:
            null,

        records:
            [],
    };
}


/*
|--------------------------------------------------------------------------
| Main service
|--------------------------------------------------------------------------
*/

export function calculateSolarPowerAnalytics({
    records = [],
    start,
    end,
    selectedDeviceInstance = null,
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
                SOLAR_POWER_ANALYTICS_REASON
                    .INVALID_REPORTING_WINDOW,

            start:
                reportingStart,

            end:
                reportingEnd,
        });
    }


    const resolvedConfig =
        normalizeConfig(
            config
        );


    /*
    |--------------------------------------------------------------------------
    | Base production-quality boundary
    |--------------------------------------------------------------------------
    */

    const qualifiedRecords =
        Array.isArray(
            records
        )
            ? records.filter(
                (
                    record
                ) =>
                    recordPassesBaseBoundary({
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


    /*
    |--------------------------------------------------------------------------
    | Select canonical PV-power path
    |--------------------------------------------------------------------------
    */

    const pathQualification =
        qualifyPowerPath({
            records:
                qualifiedRecords,

            selectedDeviceInstance,
        });


    if (
        pathQualification
            .available !==
        true
    ) {
        return buildUnavailableResult({
            reason:
                pathQualification
                    .reason,

            start:
                reportingStart,

            end:
                reportingEnd,

            selectedPath:
                pathQualification
                    .path,

            observedDeviceInstances:
                pathQualification
                    .observedDeviceInstances,

            selectedDeviceInstance:
                pathQualification
                    .selectedDeviceInstance,

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
            },
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Numerical series
    |--------------------------------------------------------------------------
    */

    const prepared =
        preparePowerSeries(
            pathQualification
                .records
        );


    if (
        prepared
            .series
            .length ===
        0
    ) {
        return buildUnavailableResult({
            reason:
                SOLAR_POWER_ANALYTICS_REASON
                    .NO_VALID_SOLAR_POWER_SAMPLES,

            start:
                reportingStart,

            end:
                reportingEnd,

            selectedPath:
                pathQualification
                    .path,

            observedDeviceInstances:
                pathQualification
                    .observedDeviceInstances,

            selectedDeviceInstance:
                pathQualification
                    .selectedDeviceInstance,

            evidence: {
                candidateRecords:
                    pathQualification
                        .records
                        .length,

                conflictingTimestampCount:
                    prepared
                        .conflictingTimestampCount,

                duplicateTimestampCount:
                    prepared
                        .duplicateTimestampCount,
            },
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Explicit unit qualification
    |--------------------------------------------------------------------------
    */

    const unit =
        qualifyUnit(
            pathQualification
                .records
        );


    if (
        unit.status ===
        "CONFLICT"
    ) {
        return buildUnavailableResult({
            reason:
                SOLAR_POWER_ANALYTICS_REASON
                    .UNIT_METADATA_CONFLICT,

            start:
                reportingStart,

            end:
                reportingEnd,

            selectedPath:
                pathQualification
                    .path,

            observedDeviceInstances:
                pathQualification
                    .observedDeviceInstances,

            selectedDeviceInstance:
                pathQualification
                    .selectedDeviceInstance,

            evidence: {
                candidateRecords:
                    pathQualification
                        .records
                        .length,

                observedUnits:
                    unit
                        .observedUnits,
            },
        });
    }


    return buildAvailableResult({
        path:
            pathQualification
                .path,

        selectedDeviceInstance:
            pathQualification
                .selectedDeviceInstance,

        observedDeviceInstances:
            pathQualification
                .observedDeviceInstances,

        selectedRecords:
            pathQualification
                .records,

        prepared,

        unit,

        start:
            reportingStart,

        end:
            reportingEnd,
    });
}


/*
|--------------------------------------------------------------------------
| Default export
|--------------------------------------------------------------------------
*/

export default Object.freeze({
    SOLAR_POWER_ANALYTICS_PHASE,
    SOLAR_POWER_ANALYTICS_FAMILY,
    SOLAR_POWER_ANALYTICS_STATUS,
    SOLAR_POWER_ANALYTICS_REASON,
    SOLAR_POWER_PATH,
    SOLAR_POWER_TOPOLOGY_STATUS,
    DEFAULT_SOLAR_POWER_ANALYTICS_CONFIG,
    SOLAR_POWER_ANALYTICS_BOUNDARIES,
    calculateSolarPowerAnalytics,
});