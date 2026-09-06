// backend/services/reliability/eensCalculationService.js

import {
    evaluateAdequacyScenarioSet,
} from "./adequacyScenarioSetService.js";


export const EENS_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


export const EENS_REASON = {
    CALCULATED:
        "CALCULATED",

    NO_INTERVALS:
        "NO_INTERVALS",

    SCENARIO_SET_UNAVAILABLE:
        "SCENARIO_SET_UNAVAILABLE",

    INVALID_INTERVAL_DURATION:
        "INVALID_INTERVAL_DURATION",

    INVALID_EXPECTED_DEFICIT:
        "INVALID_EXPECTED_DEFICIT",

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
        toTime(
            first.intervalStart
        );

    const firstEnd =
        toTime(
            first.intervalEnd
        );

    const secondStart =
        toTime(
            second.intervalStart
        );

    const secondEnd =
        toTime(
            second.intervalEnd
        );

    if (
        firstStart === null ||
        firstEnd === null ||
        secondStart === null ||
        secondEnd === null
    ) {
        return false;
    }

    return (
        firstStart < secondEnd &&
        secondStart < firstEnd
    );
}


/*
|--------------------------------------------------------------------------
| Calculate EENS over an adequacy horizon
|--------------------------------------------------------------------------
*/

export function calculateEens({
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
                EENS_STATUS
                    .UNAVAILABLE,

            reason:
                EENS_REASON
                    .NO_INTERVALS,

            eensKwh:
                null,

            eensMwh:
                null,

            intervalCount:
                0,

            evaluatedDurationHours:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Evaluate scenario set for every interval
    |--------------------------------------------------------------------------
    */

    const evaluated =
        input.map(
            (
                interval,
                index
            ) => {
                const scenarioSet =
                    evaluateAdequacyScenarioSet({
                        states:
                            interval
                                ?.states ??
                            [],

                        probabilityTolerance,
                    });

                return {
                    intervalIndex:
                        index,

                    scenarioSet,
                };
            }
        );


    /*
    |--------------------------------------------------------------------------
    | Every interval must be qualified
    |--------------------------------------------------------------------------
    */

    const unavailable =
        evaluated.filter(
            (item) =>
                item
                    .scenarioSet
                    .valid !==
                true
        );


    if (
        unavailable.length >
        0
    ) {
        return {
            status:
                EENS_STATUS
                    .UNAVAILABLE,

            reason:
                EENS_REASON
                    .SCENARIO_SET_UNAVAILABLE,

            eensKwh:
                null,

            eensMwh:
                null,

            intervalCount:
                input.length,

            qualifiedIntervalCount:
                evaluated.length -
                unavailable.length,

            unavailableIntervalCount:
                unavailable.length,

            unavailableIntervals:
                unavailable.map(
                    (item) => ({
                        intervalIndex:
                            item
                                .intervalIndex,

                        scenarioSetStatus:
                            item
                                .scenarioSet
                                .status,

                        scenarioSetReason:
                            item
                                .scenarioSet
                                .reason,
                    })
                ),
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Normalize evaluated intervals
    |--------------------------------------------------------------------------
    */

    const normalized =
        evaluated.map(
            (item) => {
                const scenarioSet =
                    item
                        .scenarioSet;

                return {
                    intervalIndex:
                        item
                            .intervalIndex,

                    intervalStart:
                        scenarioSet
                            .intervalStart,

                    intervalEnd:
                        scenarioSet
                            .intervalEnd,

                    durationHours:
                        Number(
                            scenarioSet
                                .durationHours
                        ),

                    mode:
                        scenarioSet
                            .mode,

                    scenarioCount:
                        scenarioSet
                            .scenarioCount,

                    probabilitySum:
                        scenarioSet
                            .probabilitySum,

                    expectedLoadKw:
                        scenarioSet
                            .expectedLoadKw,

                    expectedAvailableSupplyKw:
                        scenarioSet
                            .expectedAvailableSupplyKw,

                    expectedDeficitKw:
                        scenarioSet
                            .expectedDeficitKw,

                    lossOfLoadProbability:
                        scenarioSet
                            .lossOfLoadProbability,
                };
            }
        );


    /*
    |--------------------------------------------------------------------------
    | Duration validation
    |--------------------------------------------------------------------------
    */

    const invalidDuration =
        normalized.find(
            (interval) =>
                !Number.isFinite(
                    interval
                        .durationHours
                ) ||
                interval
                    .durationHours <=
                0
        );


    if (
        invalidDuration
    ) {
        return {
            status:
                EENS_STATUS
                    .UNAVAILABLE,

            reason:
                EENS_REASON
                    .INVALID_INTERVAL_DURATION,

            eensKwh:
                null,

            eensMwh:
                null,

            invalidIntervalIndex:
                invalidDuration
                    .intervalIndex,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Expected-deficit validation
    |--------------------------------------------------------------------------
    */

    const invalidDeficit =
        normalized.find(
            (interval) =>
                !Number.isFinite(
                    Number(
                        interval
                            .expectedDeficitKw
                    )
                ) ||
                Number(
                    interval
                        .expectedDeficitKw
                ) <
                0
        );


    if (
        invalidDeficit
    ) {
        return {
            status:
                EENS_STATUS
                    .UNAVAILABLE,

            reason:
                EENS_REASON
                    .INVALID_EXPECTED_DEFICIT,

            eensKwh:
                null,

            eensMwh:
                null,

            invalidIntervalIndex:
                invalidDeficit
                    .intervalIndex,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Chronological ordering
    |--------------------------------------------------------------------------
    */

    const chronological =
        [...normalized]
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
    | Reject overlapping intervals
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
                    EENS_STATUS
                        .UNAVAILABLE,

                reason:
                    EENS_REASON
                        .OVERLAPPING_INTERVALS,

                eensKwh:
                    null,

                eensMwh:
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
    | EENS contribution
    |--------------------------------------------------------------------------
    |
    | EENS_t = E[deficit kW] × duration h
    |--------------------------------------------------------------------------
    */

    const intervalContributions =
        chronological.map(
            (interval) => {
                const eensContributionKwh =
                    interval
                        .expectedDeficitKw *
                    interval
                        .durationHours;

                return {
                    ...interval,

                    eensContributionKwh,

                    eensContributionMwh:
                        eensContributionKwh /
                        1000,
                };
            }
        );


    const eensKwh =
        intervalContributions.reduce(
            (
                total,
                interval
            ) =>
                total +
                interval
                    .eensContributionKwh,
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
            EENS_STATUS
                .CALCULATED,

        reason:
            EENS_REASON
                .CALCULATED,

        label:
            "Expected Energy Not Supplied",

        eensKwh,

        eensMwh:
            eensKwh /
            1000,

        evaluatedDurationHours,

        intervalCount:
            intervalContributions
                .length,

        intervalContributions,

        formula:
            "EENS = sum(expectedDeficitKw_t * durationHours_t)",

        units:
            "kWh",

        assumptions: {
            expectedDeficitDerivedFromQualifiedAdequacyScenarios:
                true,

            probabilityWeightedWhenProbabilistic:
                true,

            deterministicDeficitUsesImplicitProbabilityOne:
                true,
        },

        semanticBoundary: {
            isHistoricalEns:
                false,

            isOutageDuration:
                false,

            isSaidi:
                false,

            isLole:
                false,

            monitoringStatusUsed:
                false,

            genericOutageEventsUsed:
                false,
        },
    };
}