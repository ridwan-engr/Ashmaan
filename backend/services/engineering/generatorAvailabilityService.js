// services/engineering/generatorAvailabilityService.js

import {
    GENERATOR_AVAILABILITY_STATUS,
    GENERATOR_FUNCTIONAL_STATE,
    GENERATOR_AVAILABILITY_REASON,
} from "./generatorAvailabilitySemantics.js";


/*
|--------------------------------------------------------------------------
| Phase 8.5H-B
| Pure Generator Failure / Availability Analytics Service
|--------------------------------------------------------------------------
|
| Availability:
|
|     available required hours
| A = --------------------------
|       qualified required hours
|
| where:
|
| qualified required hours =
|     available required hours +
|     unavailable required hours
|
| UNKNOWN required intervals are excluded from the denominator and cause the
| result to become PARTIALLY_CALCULATED.
|
|--------------------------------------------------------------------------
|
| Failure rate:
|
|             confirmed functional failures
| lambda = ----------------------------------
|            qualified failure exposure hours
|
| Failure exposure MUST be explicitly supplied. Generator runtime is never
| substituted.
|
|--------------------------------------------------------------------------
|
| Repair rate:
|
|             completed confirmed repairs
| mu = --------------------------------
|         qualified repair downtime hours
|
|--------------------------------------------------------------------------
|
| Current production default:
|
| Generator demand/request evidence is not established.
| Confirmed functional failure intervals are not established.
|
| Therefore production availability / lambda / mu remain UNAVAILABLE.
|--------------------------------------------------------------------------
*/


export const GENERATOR_FAILURE_METRIC_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GENERATOR_AVAILABILITY_SERVICE_REASON =
    Object.freeze({

        AVAILABILITY_QUALIFIED:
            "AVAILABILITY_QUALIFIED",

        AVAILABILITY_PARTIAL:
            "AVAILABILITY_PARTIAL",

        NO_REQUIRED_INTERVALS:
            "NO_REQUIRED_INTERVALS",

        NO_QUALIFIED_REQUIRED_INTERVALS:
            "NO_QUALIFIED_REQUIRED_INTERVALS",

        INVALID_REQUIRED_INTERVALS:
            "INVALID_REQUIRED_INTERVALS",

        OVERLAPPING_REQUIRED_INTERVALS:
            "OVERLAPPING_REQUIRED_INTERVALS",

        FAILURE_RATE_QUALIFIED:
            "FAILURE_RATE_QUALIFIED",

        FAILURE_EXPOSURE_UNAVAILABLE:
            "FAILURE_EXPOSURE_UNAVAILABLE",

        FAILURE_EXPOSURE_NONPOSITIVE:
            "FAILURE_EXPOSURE_NONPOSITIVE",

        CONFIRMED_FAILURE_COUNT_UNAVAILABLE:
            "CONFIRMED_FAILURE_COUNT_UNAVAILABLE",

        REPAIR_RATE_QUALIFIED:
            "REPAIR_RATE_QUALIFIED",

        REPAIR_DOWNTIME_UNAVAILABLE:
            "REPAIR_DOWNTIME_UNAVAILABLE",

        REPAIR_DOWNTIME_NONPOSITIVE:
            "REPAIR_DOWNTIME_NONPOSITIVE",

        COMPLETED_REPAIR_COUNT_UNAVAILABLE:
            "COMPLETED_REPAIR_COUNT_UNAVAILABLE",
    });


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


function nonNegativeInteger(
    value
) {

    const numeric =
        finite(
            value
        );


    if (
        numeric === null ||
        numeric < 0 ||
        !Number.isInteger(
            numeric
        )
    ) {

        return null;
    }


    return numeric;
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


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;
    }


    return date;
}


function durationHours(
    start,
    end
) {

    return (
        end.getTime() -
        start.getTime()
    ) /
    3600000;
}


function unavailableMetric({
    unit,
    reason,
    metadata = {},
}) {

    return {

        status:
            GENERATOR_FAILURE_METRIC_STATUS
                .UNAVAILABLE,

        value:
            null,

        unit,

        reason,

        metadata,
    };
}


function calculatedMetric({
    value,
    unit,
    reason,
    status =
        GENERATOR_FAILURE_METRIC_STATUS
            .CALCULATED,
    metadata = {},
}) {

    return {

        status,

        value,

        unit,

        reason,

        metadata,
    };
}


function normalizeRequiredIntervals(
    intervals = []
) {

    const valid =
        [];

    let invalidCount =
        0;


    for (
        const interval
        of intervals
    ) {

        const start =
            asDate(
                interval?.start
            );


        const end =
            asDate(
                interval?.end
            );


        const functionalState =
            interval?.functionalState;


        if (
            !start ||
            !end ||
            start >= end ||
            ![
                GENERATOR_FUNCTIONAL_STATE
                    .AVAILABLE,

                GENERATOR_FUNCTIONAL_STATE
                    .UNAVAILABLE,

                GENERATOR_FUNCTIONAL_STATE
                    .UNKNOWN,
            ].includes(
                functionalState
            )
        ) {

            invalidCount +=
                1;

            continue;
        }


        valid.push({

            start,

            end,

            functionalState,

            durationHours:
                durationHours(
                    start,
                    end
                ),
        });
    }


    valid.sort(
        (
            a,
            b
        ) =>
            a.start -
            b.start ||
            a.end -
            b.end
    );


    return {

        valid,

        invalidCount,
    };
}


function hasOverlap(
    intervals
) {

    for (
        let index = 1;
        index < intervals.length;
        index += 1
    ) {

        const previous =
            intervals[
                index -
                1
            ];


        const current =
            intervals[
                index
            ];


        if (
            current.start <
            previous.end
        ) {

            return true;
        }
    }


    return false;
}


/*
|--------------------------------------------------------------------------
| Availability
|--------------------------------------------------------------------------
*/

export function calculateGeneratorAvailability({
    requiredIntervals = [],
} = {}) {

    if (
        !Array.isArray(
            requiredIntervals
        ) ||
        requiredIntervals.length ===
        0
    ) {

        return {

            status:
                GENERATOR_AVAILABILITY_STATUS
                    .UNAVAILABLE,

            metric:
                unavailableMetric({

                    unit:
                        "PERCENT",

                    reason:
                        GENERATOR_AVAILABILITY_SERVICE_REASON
                            .NO_REQUIRED_INTERVALS,
                }),

            evidence: {

                requiredIntervalCount:
                    0,

                availableRequiredHours:
                    0,

                unavailableRequiredHours:
                    0,

                unknownRequiredHours:
                    0,

                qualifiedRequiredHours:
                    0,
            },
        };
    }


    const normalized =
        normalizeRequiredIntervals(
            requiredIntervals
        );


    if (
        normalized.valid.length ===
        0
    ) {

        return {

            status:
                GENERATOR_AVAILABILITY_STATUS
                    .UNAVAILABLE,

            metric:
                unavailableMetric({

                    unit:
                        "PERCENT",

                    reason:
                        GENERATOR_AVAILABILITY_SERVICE_REASON
                            .NO_QUALIFIED_REQUIRED_INTERVALS,

                    metadata: {

                        invalidIntervalCount:
                            normalized
                                .invalidCount,
                    },
                }),
        };
    }


    if (
        hasOverlap(
            normalized.valid
        )
    ) {

        return {

            status:
                GENERATOR_AVAILABILITY_STATUS
                    .UNAVAILABLE,

            metric:
                unavailableMetric({

                    unit:
                        "PERCENT",

                    reason:
                        GENERATOR_AVAILABILITY_SERVICE_REASON
                            .OVERLAPPING_REQUIRED_INTERVALS,
                }),

            evidence: {

                overlappingRequiredIntervals:
                    true,
            },
        };
    }


    let availableRequiredHours =
        0;

    let unavailableRequiredHours =
        0;

    let unknownRequiredHours =
        0;


    for (
        const interval
        of normalized.valid
    ) {

        if (
            interval.functionalState ===
            GENERATOR_FUNCTIONAL_STATE
                .AVAILABLE
        ) {

            availableRequiredHours +=
                interval.durationHours;
        }


        else if (
            interval.functionalState ===
            GENERATOR_FUNCTIONAL_STATE
                .UNAVAILABLE
        ) {

            unavailableRequiredHours +=
                interval.durationHours;
        }


        else {

            unknownRequiredHours +=
                interval.durationHours;
        }
    }


    const qualifiedRequiredHours =
        availableRequiredHours +
        unavailableRequiredHours;


    if (
        qualifiedRequiredHours <=
        0
    ) {

        return {

            status:
                GENERATOR_AVAILABILITY_STATUS
                    .UNAVAILABLE,

            metric:
                unavailableMetric({

                    unit:
                        "PERCENT",

                    reason:
                        GENERATOR_AVAILABILITY_SERVICE_REASON
                            .NO_QUALIFIED_REQUIRED_INTERVALS,

                    metadata: {

                        unknownRequiredHours,
                    },
                }),

            evidence: {

                availableRequiredHours,

                unavailableRequiredHours,

                unknownRequiredHours,

                qualifiedRequiredHours,
            },
        };
    }


    const availabilityPercent =
        (
            availableRequiredHours /
            qualifiedRequiredHours
        ) *
        100;


    /*
    |--------------------------------------------------------------------------
    | Full vs partial
    |--------------------------------------------------------------------------
    |
    | Full calculation requires:
    | - no invalid required intervals
    | - no UNKNOWN required time
    |--------------------------------------------------------------------------
    */

    const complete =
        normalized.invalidCount ===
            0 &&
        unknownRequiredHours ===
            0;


    const status =
        complete
            ? GENERATOR_AVAILABILITY_STATUS
                .CALCULATED
            : GENERATOR_AVAILABILITY_STATUS
                .PARTIALLY_CALCULATED;


    const reason =
        complete
            ? GENERATOR_AVAILABILITY_SERVICE_REASON
                .AVAILABILITY_QUALIFIED
            : GENERATOR_AVAILABILITY_SERVICE_REASON
                .AVAILABILITY_PARTIAL;


    return {

        status,

        metric:
            calculatedMetric({

                value:
                    availabilityPercent,

                unit:
                    "PERCENT",

                status,

                reason,

                metadata: {

                    availableRequiredHours,

                    unavailableRequiredHours,

                    unknownRequiredHours,

                    qualifiedRequiredHours,
                },
            }),

        evidence: {

            requiredIntervalCount:
                normalized.valid.length,

            invalidRequiredIntervalCount:
                normalized.invalidCount,

            availableRequiredHours,

            unavailableRequiredHours,

            unknownRequiredHours,

            qualifiedRequiredHours,

            runtimeUsedAsRequiredExposure:
                false,
        },

        boundaries: {

            runtimeEqualsAvailability:
                false,

            stoppedEqualsUnavailable:
                false,

            runningEqualsAvailable:
                false,

            unknownRequiredTimeExcludedFromDenominator:
                true,

            overlappingRequiredIntervalsAccepted:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Failure rate
|--------------------------------------------------------------------------
|
| lambda = confirmed failures / qualified exposure hours
|
| qualifiedFailureExposureHours must come from a separately qualified
| reliability/exposure model.
|--------------------------------------------------------------------------
*/

export function calculateGeneratorFailureRate({
    confirmedFailureCount = null,
    qualifiedFailureExposureHours = null,
} = {}) {

    const failures =
        nonNegativeInteger(
            confirmedFailureCount
        );


    const exposure =
        finite(
            qualifiedFailureExposureHours
        );


    if (
        failures === null
    ) {

        return unavailableMetric({

            unit:
                "failures/hour",

            reason:
                GENERATOR_AVAILABILITY_SERVICE_REASON
                    .CONFIRMED_FAILURE_COUNT_UNAVAILABLE,
        });
    }


    if (
        exposure === null
    ) {

        return unavailableMetric({

            unit:
                "failures/hour",

            reason:
                GENERATOR_AVAILABILITY_SERVICE_REASON
                    .FAILURE_EXPOSURE_UNAVAILABLE,
        });
    }


    if (
        exposure <=
        0
    ) {

        return unavailableMetric({

            unit:
                "failures/hour",

            reason:
                GENERATOR_AVAILABILITY_SERVICE_REASON
                    .FAILURE_EXPOSURE_NONPOSITIVE,
        });
    }


    return calculatedMetric({

        value:
            failures /
            exposure,

        unit:
            "failures/hour",

        reason:
            GENERATOR_AVAILABILITY_SERVICE_REASON
                .FAILURE_RATE_QUALIFIED,

        metadata: {

            confirmedFailureCount:
                failures,

            qualifiedFailureExposureHours:
                exposure,

            runtimeUsedAsExposure:
                false,
        },
    });
}


/*
|--------------------------------------------------------------------------
| Repair rate
|--------------------------------------------------------------------------
|
| mu = completed repairs / qualified repair downtime hours
|--------------------------------------------------------------------------
*/

export function calculateGeneratorRepairRate({
    completedRepairCount = null,
    qualifiedRepairDowntimeHours = null,
} = {}) {

    const repairs =
        nonNegativeInteger(
            completedRepairCount
        );


    const downtime =
        finite(
            qualifiedRepairDowntimeHours
        );


    if (
        repairs === null
    ) {

        return unavailableMetric({

            unit:
                "repairs/hour",

            reason:
                GENERATOR_AVAILABILITY_SERVICE_REASON
                    .COMPLETED_REPAIR_COUNT_UNAVAILABLE,
        });
    }


    if (
        downtime === null
    ) {

        return unavailableMetric({

            unit:
                "repairs/hour",

            reason:
                GENERATOR_AVAILABILITY_SERVICE_REASON
                    .REPAIR_DOWNTIME_UNAVAILABLE,
        });
    }


    if (
        downtime <=
        0
    ) {

        return unavailableMetric({

            unit:
                "repairs/hour",

            reason:
                GENERATOR_AVAILABILITY_SERVICE_REASON
                    .REPAIR_DOWNTIME_NONPOSITIVE,
        });
    }


    return calculatedMetric({

        value:
            repairs /
            downtime,

        unit:
            "repairs/hour",

        reason:
            GENERATOR_AVAILABILITY_SERVICE_REASON
                .REPAIR_RATE_QUALIFIED,

        metadata: {

            completedRepairCount:
                repairs,

            qualifiedRepairDowntimeHours:
                downtime,
        },
    });
}


/*
|--------------------------------------------------------------------------
| Composite generator reliability / availability analytics
|--------------------------------------------------------------------------
*/

export function calculateGeneratorAvailabilityAnalytics({
    requiredIntervals = [],

    confirmedFailureCount = null,

    qualifiedFailureExposureHours = null,

    completedRepairCount = null,

    qualifiedRepairDowntimeHours = null,
} = {}) {

    const availability =
        calculateGeneratorAvailability({

            requiredIntervals,
        });


    const failureRate =
        calculateGeneratorFailureRate({

            confirmedFailureCount,

            qualifiedFailureExposureHours,
        });


    const repairRate =
        calculateGeneratorRepairRate({

            completedRepairCount,

            qualifiedRepairDowntimeHours,
        });


    const anyCalculated =
        availability
            .status !==
            GENERATOR_AVAILABILITY_STATUS
                .UNAVAILABLE ||
        failureRate
            .status !==
            GENERATOR_FAILURE_METRIC_STATUS
                .UNAVAILABLE ||
        repairRate
            .status !==
            GENERATOR_FAILURE_METRIC_STATUS
                .UNAVAILABLE;


    const allCalculated =
        availability
            .status ===
            GENERATOR_AVAILABILITY_STATUS
                .CALCULATED &&
        failureRate
            .status ===
            GENERATOR_FAILURE_METRIC_STATUS
                .CALCULATED &&
        repairRate
            .status ===
            GENERATOR_FAILURE_METRIC_STATUS
                .CALCULATED;


    let status;


    if (
        allCalculated
    ) {

        status =
            GENERATOR_FAILURE_METRIC_STATUS
                .CALCULATED;
    }


    else if (
        anyCalculated
    ) {

        status =
            GENERATOR_FAILURE_METRIC_STATUS
                .PARTIALLY_CALCULATED;
    }


    else {

        status =
            GENERATOR_FAILURE_METRIC_STATUS
                .UNAVAILABLE;
    }


    return {

        family:
            "GENERATOR_AVAILABILITY_FAILURE",

        status,

        metrics: {

            availability:
                availability.metric,

            failureRate,

            repairRate,
        },

        evidence: {

            availabilityEvidence:
                availability.evidence ??
                null,

            productionDemandSignalAssumed:
                false,

            generatorRuntimeUsedAsAvailability:
                false,

            generatorRuntimeUsedAsFailureExposure:
                false,

            stoppedStateUsedAsFailure:
                false,

            runningStateUsedAsAvailability:
                false,

            alarmsAutomaticallyUsedAsFailures:
                false,

            communicationLossUsedAsFailure:
                false,
        },

        boundaries: {

            availabilityMeansCapabilityWhenRequired:
                true,

            failureRateRequiresQualifiedExposure:
                true,

            repairRateRequiresQualifiedDowntime:
                true,

            runtimeIsAvailability:
                false,

            runtimeIsFailureExposure:
                false,

            monitoringOfflineIsGeneratorFailure:
                false,

            zeroPowerIsGeneratorFailure:
                false,

            activeSourceNotGeneratorIsFailure:
                false,
        },
    };
}


export default {

    GENERATOR_FAILURE_METRIC_STATUS,

    GENERATOR_AVAILABILITY_SERVICE_REASON,

    calculateGeneratorAvailability,

    calculateGeneratorFailureRate,

    calculateGeneratorRepairRate,

    calculateGeneratorAvailabilityAnalytics,
};