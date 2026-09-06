// backend/services/reliability/saidiCalculationService.js

import {
    resolveInterruptionWeight,
} from "./interruptionWeightingService.js";


export const SAIDI_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


export const SAIDI_REASON = {
    CALCULATED:
        "CALCULATED",

    POPULATION_UNAVAILABLE:
        "POPULATION_UNAVAILABLE",

    NO_ELIGIBLE_INTERRUPTION_DATA:
        "NO_ELIGIBLE_INTERRUPTION_DATA",

    INCOMPLETE_INTERRUPTION_WEIGHTING:
        "INCOMPLETE_INTERRUPTION_WEIGHTING",

    INVALID_INTERRUPTION_INTERVAL:
        "INVALID_INTERRUPTION_INTERVAL",
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function asDate(value) {
    if (!value) {
        return null;
    }

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function finitePositiveNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const numeric =
        Number(value);

    if (
        !Number.isFinite(numeric) ||
        numeric <= 0
    ) {
        return null;
    }

    return numeric;
}


/*
|--------------------------------------------------------------------------
| Build weighted interruption intervals
|--------------------------------------------------------------------------
*/

function buildWeightedIntervals({
    interruptions,
    population,
}) {
    const valid = [];
    const rejected = [];

    for (
        const interruption
        of interruptions
    ) {
        const weightResult =
            resolveInterruptionWeight({
                interruption,
                population,
            });


        if (
            weightResult.valid !==
            true
        ) {
            rejected.push({
                interruption,
                weightResult,
            });

            continue;
        }


        const start =
            asDate(
                interruption
                    .clippedStart
            );

        const end =
            asDate(
                interruption
                    .clippedEnd
            );


        if (
            !start ||
            !end ||
            end <= start
        ) {
            rejected.push({
                interruption,

                weightResult: {
                    ...weightResult,

                    valid:
                        false,

                    reason:
                        SAIDI_REASON
                            .INVALID_INTERRUPTION_INTERVAL,
                },
            });

            continue;
        }


        valid.push({
            installationId:
                interruption
                    .installationId,

            start,

            end,

            weight:
                weightResult
                    .weight,

            weightUnit:
                weightResult
                    .weightUnit,

            sourceEventId:
                interruption
                    .sourceEventId ??
                null,
        });
    }


    return {
        valid,
        rejected,
    };
}


/*
|--------------------------------------------------------------------------
| Calculate overlap-safe weighted duration for one installation
|--------------------------------------------------------------------------
|
| All time boundaries are converted into elementary non-overlapping
| segments.
|
| For every segment:
|
|     duration × maximum active interruption weight
|
| This prevents overlapping/duplicate events from being added together.
|--------------------------------------------------------------------------
*/

function calculateInstallationWeightedDuration(
    intervals
) {
    if (
        !Array.isArray(intervals) ||
        intervals.length === 0
    ) {
        return {
            weightedInterruptionHours:
                0,

            interruptionHours:
                0,

            segmentCount:
                0,
        };
    }


    const boundaries =
        [
            ...new Set(
                intervals.flatMap(
                    (interval) => [
                        interval
                            .start
                            .getTime(),

                        interval
                            .end
                            .getTime(),
                    ]
                )
            ),
        ]
            .sort(
                (a, b) =>
                    a - b
            );


    let weightedSeconds =
        0;

    let interruptionSeconds =
        0;

    let segmentCount =
        0;


    for (
        let index = 0;
        index <
            boundaries.length -
                1;
        index += 1
    ) {
        const segmentStart =
            boundaries[index];

        const segmentEnd =
            boundaries[
                index + 1
            ];


        if (
            segmentEnd <=
            segmentStart
        ) {
            continue;
        }


        const active =
            intervals.filter(
                (interval) =>
                    interval
                        .start
                        .getTime() <
                        segmentEnd &&
                    interval
                        .end
                        .getTime() >
                        segmentStart
            );


        if (
            active.length ===
            0
        ) {
            continue;
        }


        const segmentSeconds =
            (
                segmentEnd -
                segmentStart
            ) /
            1000;


        const maximumWeight =
            Math.max(
                ...active.map(
                    (interval) =>
                        interval
                            .weight
                )
            );


        interruptionSeconds +=
            segmentSeconds;

        weightedSeconds +=
            segmentSeconds *
            maximumWeight;

        segmentCount +=
            1;
    }


    return {
        weightedInterruptionHours:
            weightedSeconds /
            3600,

        interruptionHours:
            interruptionSeconds /
            3600,

        segmentCount,
    };
}


/*
|--------------------------------------------------------------------------
| Group intervals by installation
|--------------------------------------------------------------------------
*/

function groupByInstallation(
    intervals
) {
    const groups =
        new Map();


    for (
        const interval
        of intervals
    ) {
        if (
            !groups.has(
                interval
                    .installationId
            )
        ) {
            groups.set(
                interval
                    .installationId,
                []
            );
        }


        groups
            .get(
                interval
                    .installationId
            )
            .push(
                interval
            );
    }


    return groups;
}


/*
|--------------------------------------------------------------------------
| Calculate SAIDI
|--------------------------------------------------------------------------
*/

export function calculateSaidi({
    interruptions = [],
    population,
} = {}) {
    /*
    |--------------------------------------------------------------------------
    | Denominator validation
    |--------------------------------------------------------------------------
    */

    const denominator =
        finitePositiveNumber(
            population
                ?.denominator
        );


    if (
        !population ||
        population
            .denominatorAvailable !==
            true ||
        denominator ===
            null
    ) {
        return {
            status:
                SAIDI_STATUS
                    .UNAVAILABLE,

            reason:
                SAIDI_REASON
                    .POPULATION_UNAVAILABLE,

            saidiHours:
                null,

            saidiMinutes:
                null,

            weightedInterruptionHours:
                null,

            denominator:
                null,

            populationBasis:
                population?.basis ??
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Important:
    |
    | An empty eligible interruption collection does NOT automatically mean
    | SAIDI = 0.
    |
    | Zero is only valid when the upstream service-interruption observation
    | layer has established that interruptions were observable.
    |--------------------------------------------------------------------------
    */

    if (
        !Array.isArray(
            interruptions
        ) ||
        interruptions.length ===
            0
    ) {
        return {
            status:
                SAIDI_STATUS
                    .UNAVAILABLE,

            reason:
                SAIDI_REASON
                    .NO_ELIGIBLE_INTERRUPTION_DATA,

            saidiHours:
                null,

            saidiMinutes:
                null,

            weightedInterruptionHours:
                null,

            denominator,

            populationBasis:
                population
                    .basis,
        };
    }


    const {
        valid,
        rejected,
    } =
        buildWeightedIntervals({
            interruptions,
            population,
        });


    /*
    |--------------------------------------------------------------------------
    | Partial customer/event weighting is not acceptable.
    |--------------------------------------------------------------------------
    */

    if (
        rejected.length >
        0
    ) {
        return {
            status:
                SAIDI_STATUS
                    .UNAVAILABLE,

            reason:
                SAIDI_REASON
                    .INCOMPLETE_INTERRUPTION_WEIGHTING,

            saidiHours:
                null,

            saidiMinutes:
                null,

            weightedInterruptionHours:
                null,

            denominator,

            populationBasis:
                population
                    .basis,

            validInterruptionCount:
                valid.length,

            rejectedInterruptionCount:
                rejected.length,

            rejected,
        };
    }


    const groups =
        groupByInstallation(
            valid
        );


    let totalWeightedHours =
        0;

    let totalInstallationInterruptionHours =
        0;

    let totalSegmentCount =
        0;


    const installationBreakdown =
        [];


    for (
        const [
            installationId,
            intervals,
        ]
        of groups.entries()
    ) {
        const result =
            calculateInstallationWeightedDuration(
                intervals
            );


        totalWeightedHours +=
            result
                .weightedInterruptionHours;

        totalInstallationInterruptionHours +=
            result
                .interruptionHours;

        totalSegmentCount +=
            result
                .segmentCount;


        installationBreakdown.push({
            installationId,

            sourceIntervalCount:
                intervals.length,

            interruptionHours:
                result
                    .interruptionHours,

            weightedInterruptionHours:
                result
                    .weightedInterruptionHours,

            segmentCount:
                result
                    .segmentCount,
        });
    }


    const saidiHours =
        totalWeightedHours /
        denominator;


    return {
        status:
            SAIDI_STATUS
                .CALCULATED,

        reason:
            SAIDI_REASON
                .CALCULATED,

        populationBasis:
            population
                .basis,

        populationStatus:
            population
                .status,

        denominator,

        denominatorUnit:
            population
                .basis ===
                "CUSTOMER"
                ? "CUSTOMERS"
                : population
                        .basis ===
                    "SERVICE_POINT"
                    ? "SERVICE_POINTS"
                    : "INSTALLATIONS",

        eligibleInterruptionCount:
            valid.length,

        affectedInstallationCount:
            groups.size,

        sourceIntervalCount:
            valid.length,

        mergedSegmentCount:
            totalSegmentCount,

        interruptionSiteHours:
            totalInstallationInterruptionHours,

        weightedInterruptionHours:
            totalWeightedHours,

        saidiHours,

        saidiMinutes:
            saidiHours *
            60,

        installationBreakdown,
    };
}