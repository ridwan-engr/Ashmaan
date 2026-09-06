// backend/services/reliability/saifiCalculationService.js

import {
    resolveInterruptionWeight,
} from "./interruptionWeightingService.js";


export const SAIFI_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


export const SAIFI_REASON = {
    CALCULATED:
        "CALCULATED",

    POPULATION_UNAVAILABLE:
        "POPULATION_UNAVAILABLE",

    NO_ELIGIBLE_INTERRUPTION_DATA:
        "NO_ELIGIBLE_INTERRUPTION_DATA",

    NO_STARTED_INTERRUPTION_DATA:
        "NO_STARTED_INTERRUPTION_DATA",

    INCOMPLETE_INTERRUPTION_WEIGHTING:
        "INCOMPLETE_INTERRUPTION_WEIGHTING",

    INVALID_INTERRUPTION_START:
        "INVALID_INTERRUPTION_START",

    INVALID_INTERRUPTION_END:
        "INVALID_INTERRUPTION_END",

    INVALID_INTERRUPTION_INTERVAL:
        "INVALID_INTERRUPTION_INTERVAL",

    INSTALLATION_UNAVAILABLE:
        "INSTALLATION_UNAVAILABLE",
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
        !Number.isFinite(
            numeric
        ) ||
        numeric <= 0
    ) {
        return null;
    }


    return numeric;
}


function normalizeInstallationId(
    value
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }


    return String(value);
}


/*
|--------------------------------------------------------------------------
| Build physical interval records
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Do NOT discard carried interruptions here.
|
| A carried interruption can overlap or touch an event document whose
| originalStart lies inside the reporting period.
|
| Both documents may therefore describe one continuous physical episode.
|--------------------------------------------------------------------------
*/

function buildIntervalRecords(
    interruptions = []
) {
    const valid = [];
    const rejected = [];


    for (
        const interruption
        of interruptions
    ) {
        const installationId =
            normalizeInstallationId(
                interruption
                    ?.installationId
            );


        if (!installationId) {
            rejected.push({
                interruption,

                reason:
                    SAIFI_REASON
                        .INSTALLATION_UNAVAILABLE,
            });

            continue;
        }


        const originalStart =
            asDate(
                interruption
                    ?.originalStart
            );


        if (!originalStart) {
            rejected.push({
                interruption,

                reason:
                    SAIFI_REASON
                        .INVALID_INTERRUPTION_START,
            });

            continue;
        }


        const originalEnd =
            asDate(
                interruption
                    ?.originalEnd
            );


        if (!originalEnd) {
            rejected.push({
                interruption,

                reason:
                    SAIFI_REASON
                        .INVALID_INTERRUPTION_END,
            });

            continue;
        }


        if (
            originalEnd <=
            originalStart
        ) {
            rejected.push({
                interruption,

                reason:
                    SAIFI_REASON
                        .INVALID_INTERRUPTION_INTERVAL,
            });

            continue;
        }


        valid.push({
            installationId,

            originalStart,

            originalEnd,

            startedInPeriod:
                interruption
                    ?.startedInPeriod ===
                true,

            sourceEventId:
                interruption
                    ?.sourceEventId ??
                null,

            interruption,
        });
    }


    return {
        valid,
        rejected,
    };
}


/*
|--------------------------------------------------------------------------
| Merge physical interruption episodes
|--------------------------------------------------------------------------
|
| Rules:
|
| 1. Group by installation.
|
| 2. Sort by ORIGINAL start time.
|
| 3. Overlapping or touching records belong to the same physical episode:
|
|       next.start <= current.end
|
| 4. Episode start is the earliest constituent originalStart.
|
| 5. An episode counts toward SAIFI only when that earliest constituent
|    actually started inside the reporting period.
|
| This prevents:
|
| carried 09:45 -> 10:30
|                10:20 -> 11:00
|
| from being misclassified as a new 10:20 interruption.
|--------------------------------------------------------------------------
*/

function mergePhysicalEpisodes(
    records = []
) {
    const byInstallation =
        new Map();


    for (
        const record
        of records
    ) {
        if (
            !byInstallation.has(
                record
                    .installationId
            )
        ) {
            byInstallation.set(
                record
                    .installationId,
                []
            );
        }


        byInstallation
            .get(
                record
                    .installationId
            )
            .push(
                record
            );
    }


    const episodes = [];


    for (
        const [
            installationId,
            installationRecords,
        ]
        of byInstallation
    ) {
        const sorted =
            [
                ...installationRecords,
            ].sort(
                (
                    left,
                    right
                ) => {
                    const startDifference =
                        left
                            .originalStart
                            .getTime() -
                        right
                            .originalStart
                            .getTime();


                    if (
                        startDifference !==
                        0
                    ) {
                        return startDifference;
                    }


                    return (
                        left
                            .originalEnd
                            .getTime() -
                        right
                            .originalEnd
                            .getTime()
                    );
                }
            );


        let current =
            null;


        for (
            const record
            of sorted
        ) {
            if (!current) {
                current = {
                    installationId,

                    originalStart:
                        new Date(
                            record
                                .originalStart
                        ),

                    originalEnd:
                        new Date(
                            record
                                .originalEnd
                        ),

                    startedInPeriod:
                        record
                            .startedInPeriod,

                    constituents: [
                        record,
                    ],
                };

                continue;
            }


            /*
            |--------------------------------------------------------------------------
            | Overlap OR touch
            |--------------------------------------------------------------------------
            */

            if (
                record
                    .originalStart <=
                current
                    .originalEnd
            ) {
                if (
                    record
                        .originalEnd >
                    current
                        .originalEnd
                ) {
                    current
                        .originalEnd =
                        new Date(
                            record
                                .originalEnd
                        );
                }


                current
                    .constituents
                    .push(
                        record
                    );


                /*
                |--------------------------------------------------------------------------
                | Do NOT turn a carried episode into a new start.
                |
                | Because records are sorted by originalStart, current.originalStart
                | remains the earliest physical start.
                |--------------------------------------------------------------------------
                */

                continue;
            }


            episodes.push(
                current
            );


            current = {
                installationId,

                originalStart:
                    new Date(
                        record
                            .originalStart
                    ),

                originalEnd:
                    new Date(
                        record
                            .originalEnd
                    ),

                startedInPeriod:
                    record
                        .startedInPeriod,

                constituents: [
                    record,
                ],
            };
        }


        if (current) {
            episodes.push(
                current
            );
        }
    }


    return episodes;
}


/*
|--------------------------------------------------------------------------
| Resolve episode weight
|--------------------------------------------------------------------------
|
| All source records belonging to a counted physical episode must have
| defensible weights.
|
| CUSTOMER:
|     retain the maximum affected-customer weight among overlapping /
|     duplicate representations of the same physical episode.
|
| SERVICE_POINT / INSTALLATION_PROXY:
|     normal weighting service returns one.
|--------------------------------------------------------------------------
*/

function resolveEpisodeWeight({
    episode,
    population,
}) {
    const validWeights = [];
    const rejectedWeights = [];


    for (
        const constituent
        of episode.constituents
    ) {
        const weightResult =
            resolveInterruptionWeight({
                interruption:
                    constituent
                        .interruption,

                population,
            });


        if (
            weightResult.valid !==
            true
        ) {
            rejectedWeights.push({
                interruption:
                    constituent
                        .interruption,

                weightResult,
            });

            continue;
        }


        validWeights.push({
            weight:
                weightResult
                    .weight,

            weightUnit:
                weightResult
                    .weightUnit,

            sourceEventId:
                constituent
                    .sourceEventId,
        });
    }


    if (
        rejectedWeights.length >
            0 ||
        validWeights.length ===
            0
    ) {
        return {
            valid:
                false,

            rejectedWeights,

            validWeights,
        };
    }


    const weight =
        Math.max(
            ...validWeights.map(
                (item) =>
                    item.weight
            )
        );


    const sourceEventIds =
        [
            ...new Set(
                episode
                    .constituents
                    .map(
                        (item) =>
                            item
                                .sourceEventId
                    )
                    .filter(
                        Boolean
                    )
            ),
        ];


    return {
        valid:
            true,

        weight,

        weightUnit:
            validWeights[
                0
            ]
                ?.weightUnit ??
            null,

        sourceEventIds,

        rejectedWeights:
            [],
    };
}


/*
|--------------------------------------------------------------------------
| Calculate SAIFI
|--------------------------------------------------------------------------
*/

export function calculateSaifi({
    interruptions = [],
    population,
} = {}) {
    const denominator =
        finitePositiveNumber(
            population
                ?.denominator
        );


    /*
    |--------------------------------------------------------------------------
    | Population guard
    |--------------------------------------------------------------------------
    */

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
                SAIFI_STATUS
                    .UNAVAILABLE,

            reason:
                SAIFI_REASON
                    .POPULATION_UNAVAILABLE,

            saifi:
                null,

            weightedInterruptionStarts:
                null,

            denominator:
                null,

            populationBasis:
                population
                    ?.basis ??
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | No eligible interruption evidence is NOT observed zero frequency
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
                SAIFI_STATUS
                    .UNAVAILABLE,

            reason:
                SAIFI_REASON
                    .NO_ELIGIBLE_INTERRUPTION_DATA,

            saifi:
                null,

            weightedInterruptionStarts:
                null,

            denominator,

            populationBasis:
                population
                    .basis,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Build all active physical intervals
    |--------------------------------------------------------------------------
    */

    const {
        valid:
            intervalRecords,

        rejected:
            invalidIntervals,
    } =
        buildIntervalRecords(
            interruptions
        );


    /*
    |--------------------------------------------------------------------------
    | Eligibility service should already guarantee valid intervals.
    |
    | If malformed records nevertheless reach SAIFI, do not calculate a
    | partial frequency.
    |--------------------------------------------------------------------------
    */

    if (
        invalidIntervals.length >
        0
    ) {
        return {
            status:
                SAIFI_STATUS
                    .UNAVAILABLE,

            reason:
                SAIFI_REASON
                    .INCOMPLETE_INTERRUPTION_WEIGHTING,

            saifi:
                null,

            weightedInterruptionStarts:
                null,

            denominator,

            populationBasis:
                population
                    .basis,

            invalidInterruptionCount:
                invalidIntervals
                    .length,

            invalidInterruptions:
                invalidIntervals,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Construct physical episodes BEFORE deciding whether they started
    | inside the reporting period.
    |--------------------------------------------------------------------------
    */

    const physicalEpisodes =
        mergePhysicalEpisodes(
            intervalRecords
        );


    const startedEpisodes =
        physicalEpisodes.filter(
            (episode) =>
                episode
                    .startedInPeriod ===
                true
        );


    /*
    |--------------------------------------------------------------------------
    | Carried-only physical episode evidence does not imply SAIFI = 0
    |--------------------------------------------------------------------------
    */

    if (
        startedEpisodes.length ===
        0
    ) {
        return {
            status:
                SAIFI_STATUS
                    .UNAVAILABLE,

            reason:
                SAIFI_REASON
                    .NO_STARTED_INTERRUPTION_DATA,

            saifi:
                null,

            weightedInterruptionStarts:
                null,

            denominator,

            populationBasis:
                population
                    .basis,

            sourceInterruptionCount:
                interruptions
                    .length,

            physicalEpisodeCount:
                physicalEpisodes
                    .length,

            physicalStartedEpisodeCount:
                0,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Weight only physical episodes whose TRUE physical start is in-period.
    |--------------------------------------------------------------------------
    |
    | A carried episode that absorbs an in-period continuation does not need
    | a frequency weight because it contributes no SAIFI start.
    |--------------------------------------------------------------------------
    */

    const weightedEpisodes = [];
    const rejectedEpisodes = [];


    for (
        const episode
        of startedEpisodes
    ) {
        const weightResult =
            resolveEpisodeWeight({
                episode,
                population,
            });


        if (
            weightResult.valid !==
            true
        ) {
            rejectedEpisodes.push({
                episode,
                weightResult,
            });

            continue;
        }


        weightedEpisodes.push({
            installationId:
                episode
                    .installationId,

            originalStart:
                episode
                    .originalStart,

            originalEnd:
                episode
                    .originalEnd,

            weight:
                weightResult
                    .weight,

            weightUnit:
                weightResult
                    .weightUnit,

            sourceEventIds:
                weightResult
                    .sourceEventIds,

            sourceEventCount:
                episode
                    .constituents
                    .length,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Incomplete weighting blocks customer-frequency calculation
    |--------------------------------------------------------------------------
    */

    if (
        rejectedEpisodes.length >
        0
    ) {
        return {
            status:
                SAIFI_STATUS
                    .UNAVAILABLE,

            reason:
                SAIFI_REASON
                    .INCOMPLETE_INTERRUPTION_WEIGHTING,

            saifi:
                null,

            weightedInterruptionStarts:
                null,

            denominator,

            populationBasis:
                population
                    .basis,

            validStartedInterruptionCount:
                weightedEpisodes
                    .length,

            rejectedStartedInterruptionCount:
                rejectedEpisodes
                    .length,

            rejected:
                rejectedEpisodes,
        };
    }


    const weightedInterruptionStarts =
        weightedEpisodes.reduce(
            (
                sum,
                episode
            ) =>
                sum +
                episode
                    .weight,
            0
        );


    const saifi =
        weightedInterruptionStarts /
        denominator;


    const affectedInstallations =
        new Set(
            weightedEpisodes.map(
                (episode) =>
                    episode
                        .installationId
            )
        );


    /*
    |--------------------------------------------------------------------------
    | Preserve existing API fields
    |--------------------------------------------------------------------------
    */

    const sourceStartedInterruptionCount =
        intervalRecords.filter(
            (record) =>
                record
                    .startedInPeriod ===
                true
        ).length;


    return {
        status:
            SAIFI_STATUS
                .CALCULATED,

        reason:
            SAIFI_REASON
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

        sourceStartedInterruptionCount,

        /*
        |--------------------------------------------------------------------------
        | This is now the number of TRUE merged physical episodes whose
        | earliest original start lies inside the reporting period.
        |--------------------------------------------------------------------------
        */

        physicalStartedEpisodeCount:
            weightedEpisodes
                .length,

        affectedInstallationCount:
            affectedInstallations
                .size,

        weightedInterruptionStarts,

        saifi,

        startBreakdown:
            weightedEpisodes,
    };
}