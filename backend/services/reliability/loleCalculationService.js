// backend/services/reliability/loleCalculationService.js

import {
    calculateLolp,
    LOLP_STATUS,
} from "./lolpCalculationService.js";


/*
|--------------------------------------------------------------------------
| LOLE status
|--------------------------------------------------------------------------
*/

export const LOLE_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


/*
|--------------------------------------------------------------------------
| LOLE reasons
|--------------------------------------------------------------------------
*/

export const LOLE_REASON = {
    CALCULATED:
        "CALCULATED",

    NO_INTERVALS:
        "NO_INTERVALS",

    LOLP_UNAVAILABLE:
        "LOLP_UNAVAILABLE",

    INVALID_INTERVAL_DURATION:
        "INVALID_INTERVAL_DURATION",

    OVERLAPPING_INTERVALS:
        "OVERLAPPING_INTERVALS",
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function toTime(
    value
) {
    if (
        value instanceof Date
    ) {
        return value.getTime();
    }

    const date =
        new Date(value);

    const time =
        date.getTime();

    return Number.isFinite(time)
        ? time
        : null;
}


function intervalsOverlap(
    first,
    second
) {
    const firstStart =
        toTime(first.intervalStart);

    const firstEnd =
        toTime(first.intervalEnd);

    const secondStart =
        toTime(second.intervalStart);

    const secondEnd =
        toTime(second.intervalEnd);


    if (
        firstStart === null ||
        firstEnd === null ||
        secondStart === null ||
        secondEnd === null
    ) {
        return false;
    }


    /*
    |--------------------------------------------------------------------------
    | Touching boundaries are allowed:
    |
    | [00:00, 01:00]
    | [01:00, 02:00]
    |--------------------------------------------------------------------------
    */

    return (
        firstStart < secondEnd &&
        secondStart < firstEnd
    );
}


/*
|--------------------------------------------------------------------------
| Calculate LOLE
|--------------------------------------------------------------------------
|
| Input:
|
| {
|     intervals: [
|         {
|             states: [...]
|         },
|         {
|             states: [...]
|         }
|     ],
|
|     probabilityTolerance: 1e-9
| }
|
|--------------------------------------------------------------------------
*/

export function calculateLole({
    intervals = [],
    probabilityTolerance = 1e-9,
} = {}) {
    const input =
        Array.isArray(intervals)
            ? intervals
            : [];


    /*
    |--------------------------------------------------------------------------
    | No intervals
    |--------------------------------------------------------------------------
    */

    if (
        input.length ===
        0
    ) {
        return {
            status:
                LOLE_STATUS
                    .UNAVAILABLE,

            reason:
                LOLE_REASON
                    .NO_INTERVALS,

            loleHours:
                null,

            loleDays:
                null,

            intervalCount:
                0,

            evaluatedDurationHours:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Calculate interval LOLP
    |--------------------------------------------------------------------------
    */

    const evaluatedIntervals =
        input.map(
            (
                interval,
                index
            ) => {
                const result =
                    calculateLolp({
                        states:
                            interval
                                ?.states ??
                            [],

                        probabilityTolerance,
                    });


                return {
                    intervalIndex:
                        index,

                    ...result,
                };
            }
        );


    /*
    |--------------------------------------------------------------------------
    | All LOLP intervals must be valid
    |--------------------------------------------------------------------------
    |
    | We intentionally do not calculate a partial LOLE from an incomplete
    | adequacy horizon.
    |--------------------------------------------------------------------------
    */

    const unavailable =
        evaluatedIntervals.filter(
            (interval) =>
                interval.status !==
                LOLP_STATUS
                    .CALCULATED
        );


    if (
        unavailable.length >
        0
    ) {
        return {
            status:
                LOLE_STATUS
                    .UNAVAILABLE,

            reason:
                LOLE_REASON
                    .LOLP_UNAVAILABLE,

            loleHours:
                null,

            loleDays:
                null,

            intervalCount:
                input.length,

            calculatedIntervalCount:
                evaluatedIntervals.length -
                unavailable.length,

            unavailableIntervalCount:
                unavailable.length,

            unavailableIntervals:
                unavailable.map(
                    (interval) => ({
                        intervalIndex:
                            interval
                                .intervalIndex,

                        lolpReason:
                            interval
                                .reason,

                        scenarioSetReason:
                            interval
                                .scenarioSetReason ??
                            null,
                    })
                ),
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Validate interval durations
    |--------------------------------------------------------------------------
    */

    const invalidDuration =
        evaluatedIntervals.find(
            (interval) =>
                !Number.isFinite(
                    Number(
                        interval
                            .durationHours
                    )
                ) ||
                Number(
                    interval
                        .durationHours
                ) <= 0
        );


    if (invalidDuration) {
        return {
            status:
                LOLE_STATUS
                    .UNAVAILABLE,

            reason:
                LOLE_REASON
                    .INVALID_INTERVAL_DURATION,

            loleHours:
                null,

            loleDays:
                null,

            invalidIntervalIndex:
                invalidDuration
                    .intervalIndex,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Sort chronologically
    |--------------------------------------------------------------------------
    */

    const chronological =
        [...evaluatedIntervals]
            .sort(
                (
                    first,
                    second
                ) =>
                    toTime(
                        first
                            .intervalStart
                    ) -
                    toTime(
                        second
                            .intervalStart
                    )
            );


    /*
    |--------------------------------------------------------------------------
    | Reject overlapping adequacy intervals
    |--------------------------------------------------------------------------
    |
    | Otherwise the same time could contribute more than once to LOLE.
    |--------------------------------------------------------------------------
    */

    for (
        let index = 1;
        index < chronological.length;
        index += 1
    ) {
        const previous =
            chronological[
                index - 1
            ];

        const current =
            chronological[
                index
            ];


        if (
            intervalsOverlap(
                previous,
                current
            )
        ) {
            return {
                status:
                    LOLE_STATUS
                        .UNAVAILABLE,

                reason:
                    LOLE_REASON
                        .OVERLAPPING_INTERVALS,

                loleHours:
                    null,

                loleDays:
                    null,

                overlappingIntervals: {
                    firstIntervalIndex:
                        previous
                            .intervalIndex,

                    secondIntervalIndex:
                        current
                            .intervalIndex,
                },
            };
        }
    }


    /*
    |--------------------------------------------------------------------------
    | LOLE
    |--------------------------------------------------------------------------
    |
    | LOLE = Σ LOLP_t × Δt
    |--------------------------------------------------------------------------
    */

    const intervalContributions =
        chronological.map(
            (interval) => {
                const durationHours =
                    Number(
                        interval
                            .durationHours
                    );

                const lolp =
                    Number(
                        interval
                            .lolp
                    );

                const loleContributionHours =
                    lolp *
                    durationHours;


                return {
                    intervalIndex:
                        interval
                            .intervalIndex,

                    intervalStart:
                        interval
                            .intervalStart,

                    intervalEnd:
                        interval
                            .intervalEnd,

                    durationHours,

                    mode:
                        interval
                            .mode,

                    lolp,

                    lolpPercent:
                        interval
                            .lolpPercent,

                    loleContributionHours,
                };
            }
        );


    const loleHours =
        intervalContributions.reduce(
            (
                total,
                interval
            ) =>
                total +
                interval
                    .loleContributionHours,
            0
        );


    const evaluatedDurationHours =
        intervalContributions.reduce(
            (
                total,
                interval
            ) =>
                total +
                interval
                    .durationHours,
            0
        );


    return {
        status:
            LOLE_STATUS
                .CALCULATED,

        reason:
            LOLE_REASON
                .CALCULATED,

        label:
            "Loss of Load Expectation",

        loleHours,

        loleDays:
            loleHours /
            24,

        evaluatedDurationHours,

        intervalCount:
            intervalContributions
                .length,

        intervalContributions,

        formula:
            "LOLE = sum(LOLP_t * durationHours_t)",

        units:
            "expected hours of loss of load over evaluated adequacy horizon",

        semanticBoundary: {
            isSaidi:
                false,

            isObservedOutageDuration:
                false,

            isEquipmentDowntime:
                false,

            isMonitoringUnavailability:
                false,

            genericOutageEventsUsed:
                false,
        },
    };
}