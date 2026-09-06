
/*
|--------------------------------------------------------------------------
| Generic helpers
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


function finiteNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const numeric =
        Number(value);

    return Number.isFinite(
        numeric
    )
        ? numeric
        : null;
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


function normalizeId(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value ===
            "object" &&
        value._id
    ) {
        return String(
            value._id
        );
    }

    return String(value);
}


/*
|--------------------------------------------------------------------------
| Event semantics
|--------------------------------------------------------------------------
*/

function isGridSourceEvent(event) {
    return (
        event?.eventType ===
            "GRID_OUTAGE" &&
        event?.source ===
            "DERIVED" &&
        event?.detectionMethod ===
            "ACTIVE_SOURCE_TRANSITION"
    );
}


function isServiceInterruption(
    event
) {
    return (
        event?.raw
            ?.loadInterruptionConfirmed ===
        true
    );
}


function isSaidiSaifiEligible(
    event
) {
    return (
        event?.raw
            ?.eligibleForSaidiSaifi ===
            true &&
        isServiceInterruption(
            event
        )
    );
}


function isEnsEligible(
    event
) {
    return (
        event?.raw
            ?.eligibleForEns ===
            true &&
        finiteNumber(
            event
                ?.energyNotSuppliedKwh
        ) !== null
    );
}


/*
|--------------------------------------------------------------------------
| Event end-time handling
|--------------------------------------------------------------------------
*/

function resolveEventEndForWindow(
    event,
    periodEnd
) {
    if (
        event?.restorationTime
    ) {
        return asDate(
            event.restorationTime
        );
    }

    if (
        event?.status ===
            "OPEN"
    ) {
        return asDate(
            periodEnd
        );
    }

    return (
        asDate(
            event?.endTime
        ) ??
        null
    );
}


/*
|--------------------------------------------------------------------------
| Interval clipping
|--------------------------------------------------------------------------
*/

function clipInterval({
    start,
    end,
    periodStart,
    periodEnd,
}) {
    const intervalStart =
        asDate(start);

    const intervalEnd =
        asDate(end);

    const windowStart =
        asDate(periodStart);

    const windowEnd =
        asDate(periodEnd);


    if (
        !intervalStart ||
        !intervalEnd ||
        !windowStart ||
        !windowEnd ||
        intervalEnd <=
            intervalStart ||
        windowEnd <=
            windowStart
    ) {
        return null;
    }


    if (
        intervalEnd <=
            windowStart ||
        intervalStart >=
            windowEnd
    ) {
        return null;
    }


    const clippedStart =
        new Date(
            Math.max(
                intervalStart.getTime(),
                windowStart.getTime()
            )
        );


    const clippedEnd =
        new Date(
            Math.min(
                intervalEnd.getTime(),
                windowEnd.getTime()
            )
        );


    if (
        clippedEnd <=
        clippedStart
    ) {
        return null;
    }


    return {
        start:
            clippedStart,

        end:
            clippedEnd,

        seconds:
            (
                clippedEnd.getTime() -
                clippedStart.getTime()
            ) /
            1000,
    };
}


/*
|--------------------------------------------------------------------------
| Merge intervals
|--------------------------------------------------------------------------
*/

function mergeIntervals(
    intervals = []
) {
    const normalized =
        intervals
            .map(
                (interval) => {
                    const start =
                        asDate(
                            interval?.start
                        );

                    const end =
                        asDate(
                            interval?.end
                        );

                    if (
                        !start ||
                        !end ||
                        end <= start
                    ) {
                        return null;
                    }

                    return {
                        ...interval,
                        start,
                        end,
                    };
                }
            )
            .filter(Boolean)
            .sort(
                (
                    left,
                    right
                ) =>
                    left.start -
                    right.start
            );


    if (!normalized.length) {
        return [];
    }


    const merged = [];


    for (
        const interval
        of normalized
    ) {
        const last =
            merged[
                merged.length -
                1
            ];


        if (!last) {
            merged.push({
                start:
                    new Date(
                        interval.start
                    ),

                end:
                    new Date(
                        interval.end
                    ),

                /*
                 * Preserve earliest underlying physical
                 * episode start for frequency semantics.
                 */
                originalStart:
                    asDate(
                        interval.originalStart
                    ) ??
                    new Date(
                        interval.start
                    ),

                originalEnd:
                    asDate(
                        interval.originalEnd
                    ) ??
                    new Date(
                        interval.end
                    ),

                sourceEventIds:
                    [
                        ...(
                            interval
                                .sourceEventIds ??
                            []
                        ),
                    ],
            });

            continue;
        }


        /*
         * Touching intervals are treated as one
         * uninterrupted physical episode.
         */
        if (
            interval.start <=
            last.end
        ) {
            if (
                interval.end >
                last.end
            ) {
                last.end =
                    new Date(
                        interval.end
                    );
            }


            const intervalOriginalStart =
                asDate(
                    interval
                        .originalStart
                );


            if (
                intervalOriginalStart &&
                (
                    !last.originalStart ||
                    intervalOriginalStart <
                        last.originalStart
                )
            ) {
                last.originalStart =
                    intervalOriginalStart;
            }


            const intervalOriginalEnd =
                asDate(
                    interval
                        .originalEnd
                );


            if (
                intervalOriginalEnd &&
                (
                    !last.originalEnd ||
                    intervalOriginalEnd >
                        last.originalEnd
                )
            ) {
                last.originalEnd =
                    intervalOriginalEnd;
            }


            last.sourceEventIds =
                [
                    ...new Set([
                        ...(
                            last
                                .sourceEventIds ??
                            []
                        ),

                        ...(
                            interval
                                .sourceEventIds ??
                            []
                        ),
                    ]),
                ];

            continue;
        }


        merged.push({
            start:
                new Date(
                    interval.start
                ),

            end:
                new Date(
                    interval.end
                ),

            originalStart:
                asDate(
                    interval.originalStart
                ) ??
                new Date(
                    interval.start
                ),

            originalEnd:
                asDate(
                    interval.originalEnd
                ) ??
                new Date(
                    interval.end
                ),

            sourceEventIds:
                [
                    ...(
                        interval
                            .sourceEventIds ??
                        []
                    ),
                ],
        });
    }


    return merged;
}


function totalIntervalSeconds(
    intervals = []
) {
    return intervals.reduce(
        (
            total,
            interval
        ) =>
            total +
            (
                interval.end -
                interval.start
            ) /
            1000,
        0
    );
}


/*
|--------------------------------------------------------------------------
| Acquisition exclusion normalization
|--------------------------------------------------------------------------
|
| Shared acquisition gaps are global observability blind intervals.
|
| They must be:
|
| 1. clipped to the reporting period,
| 2. merged so overlapping exclusions are not double-counted.
|--------------------------------------------------------------------------
*/

function normalizeExclusionIntervals({
    intervals = [],
    periodStart,
    periodEnd,
}) {
    const clipped =
        intervals
            .map(
                (interval) =>
                    clipInterval({
                        start:
                            interval?.start,

                        end:
                            interval?.end,

                        periodStart,
                        periodEnd,
                    })
            )
            .filter(Boolean)
            .map(
                (interval) => ({
                    start:
                        interval.start,

                    end:
                        interval.end,
                })
            );


    return mergeIntervals(
        clipped
    );
}


/*
|--------------------------------------------------------------------------
| Subtract exclusions from an interval
|--------------------------------------------------------------------------
|
| Example:
|
| Interruption:
| 00:00 ---------------- 06:00
|
| Blind interval:
|          02:00 --- 04:00
|
| Observable interruption becomes:
|
| 00:00 -- 02:00
| 04:00 -- 06:00
|--------------------------------------------------------------------------
*/

function subtractIntervals(
    sourceInterval,
    exclusionIntervals = []
) {
    const sourceStart =
        asDate(
            sourceInterval?.start
        );

    const sourceEnd =
        asDate(
            sourceInterval?.end
        );


    if (
        !sourceStart ||
        !sourceEnd ||
        sourceEnd <=
            sourceStart
    ) {
        return [];
    }


    let remaining = [
        {
            start:
                sourceStart,

            end:
                sourceEnd,
        },
    ];


    for (
        const exclusion
        of exclusionIntervals
    ) {
        const exclusionStart =
            asDate(
                exclusion.start
            );

        const exclusionEnd =
            asDate(
                exclusion.end
            );


        if (
            !exclusionStart ||
            !exclusionEnd ||
            exclusionEnd <=
                exclusionStart
        ) {
            continue;
        }


        const next = [];


        for (
            const interval
            of remaining
        ) {
            /*
             * No overlap.
             */
            if (
                exclusionEnd <=
                    interval.start ||
                exclusionStart >=
                    interval.end
            ) {
                next.push(
                    interval
                );

                continue;
            }


            /*
             * Observable portion before blind interval.
             */
            if (
                exclusionStart >
                interval.start
            ) {
                next.push({
                    start:
                        interval.start,

                    end:
                        new Date(
                            Math.min(
                                exclusionStart
                                    .getTime(),
                                interval.end
                                    .getTime()
                            )
                        ),
                });
            }


            /*
             * Observable portion after blind interval.
             */
            if (
                exclusionEnd <
                interval.end
            ) {
                next.push({
                    start:
                        new Date(
                            Math.max(
                                exclusionEnd
                                    .getTime(),
                                interval.start
                                    .getTime()
                            )
                        ),

                    end:
                        interval.end,
                });
            }
        }


        remaining =
            next.filter(
                (interval) =>
                    interval.end >
                    interval.start
            );


        if (!remaining.length) {
            break;
        }
    }


    return remaining;
}


/*
|--------------------------------------------------------------------------
| Determine whether episode started in reporting period
|--------------------------------------------------------------------------
|
| Half-open reporting interval:
|
| [periodStart, periodEnd)
|--------------------------------------------------------------------------
*/

function startedInPeriod(
    originalStart,
    periodStart,
    periodEnd
) {
    const episodeStart =
        asDate(
            originalStart
        );

    const windowStart =
        asDate(
            periodStart
        );

    const windowEnd =
        asDate(
            periodEnd
        );


    if (
        !episodeStart ||
        !windowStart ||
        !windowEnd
    ) {
        return false;
    }


    return (
        episodeStart >=
            windowStart &&
        episodeStart <
            windowEnd
    );
}


/*
|--------------------------------------------------------------------------
| Site-time interruption aggregation
|--------------------------------------------------------------------------
|
| Distinguishes:
|
| sourceEventCount
|     Raw event documents contributing to this reporting window.
|
| activeEpisodeCount
|     Merged physical episodes that overlap the reporting window.
|
| startedEpisodeCount
|     Merged physical episodes whose ORIGINAL start falls inside
|     [periodStart, periodEnd).
|
| grossInterruptionSeconds
|     Duration before acquisition-gap exclusion.
|
| observableInterruptionSeconds
|     Duration after validated shared acquisition blind intervals
|     have been removed.
|--------------------------------------------------------------------------
*/

function calculateSiteTime({
    events = [],
    periodStart,
    periodEnd,
    exclusionIntervals = [],
}) {
    const byInstallation =
        new Map();


    for (
        const event
        of events
    ) {
        const installationId =
            normalizeId(
                event.installation
            );


        if (!installationId) {
            continue;
        }


        const originalStart =
            asDate(
                event.startTime
            );


        const eventEnd =
            resolveEventEndForWindow(
                event,
                periodEnd
            );


        if (
            !originalStart ||
            !eventEnd
        ) {
            continue;
        }


        const clipped =
            clipInterval({
                start:
                    originalStart,

                end:
                    eventEnd,

                periodStart,
                periodEnd,
            });


        if (!clipped) {
            continue;
        }


        if (
            !byInstallation.has(
                installationId
            )
        ) {
            byInstallation.set(
                installationId,
                []
            );
        }


        byInstallation
            .get(
                installationId
            )
            .push({
                start:
                    clipped.start,

                end:
                    clipped.end,

                originalStart,

                originalEnd:
                    eventEnd,

                sourceEventIds:
                    [
                        normalizeId(
                            event._id
                        ) ??
                        `${installationId}:${originalStart.toISOString()}`,
                    ],
            });
    }


    let grossTotalSeconds =
        0;

    let observableTotalSeconds =
        0;

    let activeEpisodeCount =
        0;

    let startedEpisodeCount =
        0;


    const siteBreakdown =
        [];


    for (
        const [
            installationId,
            intervals,
        ]
        of byInstallation
    ) {
        const mergedEpisodes =
            mergeIntervals(
                intervals
            );


        const grossSeconds =
            totalIntervalSeconds(
                mergedEpisodes
            );


        const siteStartedEpisodeCount =
            mergedEpisodes.filter(
                (episode) =>
                    startedInPeriod(
                        episode
                            .originalStart,

                        periodStart,

                        periodEnd
                    )
            ).length;


        const observableSegments =
            [];


        const episodeBreakdown =
            mergedEpisodes.map(
                (episode) => {
                    const remaining =
                        subtractIntervals(
                            episode,
                            exclusionIntervals
                        );


                    const observableSeconds =
                        totalIntervalSeconds(
                            remaining
                        );


                    observableSegments.push(
                        ...remaining
                    );


                    return {
                        start:
                            episode.start,

                        end:
                            episode.end,

                        originalStart:
                            episode
                                .originalStart,

                        originalEnd:
                            episode
                                .originalEnd,

                        startedInPeriod:
                            startedInPeriod(
                                episode
                                    .originalStart,

                                periodStart,

                                periodEnd
                            ),

                        durationSeconds:
                            (
                                episode.end -
                                episode.start
                            ) /
                            1000,

                        observableDurationSeconds:
                            observableSeconds,

                        excludedDurationSeconds:
                            (
                                episode.end -
                                episode.start
                            ) /
                                1000 -
                            observableSeconds,

                        sourceEventIds:
                            episode
                                .sourceEventIds,

                        observableSegments:
                            remaining.map(
                                (segment) => ({
                                    start:
                                        segment.start,

                                    end:
                                        segment.end,

                                    durationSeconds:
                                        (
                                            segment.end -
                                            segment.start
                                        ) /
                                        1000,
                                })
                            ),
                    };
                }
            );


        const observableSeconds =
            totalIntervalSeconds(
                observableSegments
            );


        const siteActiveEpisodeCount =
            mergedEpisodes.length;


        grossTotalSeconds +=
            grossSeconds;

        observableTotalSeconds +=
            observableSeconds;

        activeEpisodeCount +=
            siteActiveEpisodeCount;

        startedEpisodeCount +=
            siteStartedEpisodeCount;


        siteBreakdown.push({
            installationId,

            sourceEventCount:
                intervals.length,

            activeEpisodeCount:
                siteActiveEpisodeCount,

            startedEpisodeCount:
                siteStartedEpisodeCount,

            grossInterruptionSeconds:
                grossSeconds,

            grossInterruptionHours:
                grossSeconds /
                3600,

            observableInterruptionSeconds:
                observableSeconds,

            observableInterruptionHours:
                observableSeconds /
                3600,

            excludedInterruptionSeconds:
                grossSeconds -
                observableSeconds,

            excludedInterruptionHours:
                (
                    grossSeconds -
                    observableSeconds
                ) /
                3600,

            episodes:
                episodeBreakdown,
        });
    }


    return {
        grossTotalSeconds,

        /*
         * totalSeconds remains the availability numerator.
         * It now means OBSERVABLE interruption site-time.
         */
        totalSeconds:
            observableTotalSeconds,

        observableTotalSeconds,

        excludedTotalSeconds:
            grossTotalSeconds -
            observableTotalSeconds,

        activeEpisodeCount,

        startedEpisodeCount,

        affectedInstallationCount:
            siteBreakdown.length,

        siteBreakdown,
    };
}


/*
|--------------------------------------------------------------------------
| ENS event window filtering
|--------------------------------------------------------------------------
|
| ENS belongs to an outage event rather than arbitrary reporting exposure.
|
| For the present foundation we include only events whose physical episode
| overlaps the reporting period.
|--------------------------------------------------------------------------
*/

function eventOverlapsPeriod(
    event,
    periodStart,
    periodEnd
) {
    const start =
        asDate(
            event?.startTime
        );

    const end =
        resolveEventEndForWindow(
            event,
            periodEnd
        );


    if (
        !start ||
        !end
    ) {
        return false;
    }


    return Boolean(
        clipInterval({
            start,
            end,
            periodStart,
            periodEnd,
        })
    );
}


/*
|--------------------------------------------------------------------------
| Main aggregation
|--------------------------------------------------------------------------
*/

export function aggregateReliability({
    events = [],

    periodStart,
    periodEnd,

    /*
    | Installations on which the exact active-source detector
    | (VRM attribute 471) is known to exist.
    */
    gridObservableInstallationIds =
        [],

    /*
    | Validated fleet-level acquisition blind intervals.
    |
    | These are NOT ordinary per-site telemetry gaps.
    |
    | They must come from the separately validated shared-gap
    | observability service.
    */
    gridAcquisitionGapIntervals =
        [],

    /*
    | Service-interruption observability remains completely
    | separate from grid-source observability.
    */
    serviceObservableInstallationIds =
        [],
} = {}) {
    const start =
        asDate(
            periodStart
        );

    const end =
        asDate(
            periodEnd
        );


    if (
        !start ||
        !end
    ) {
        throw new Error(
            "Valid periodStart and periodEnd are required."
        );
    }


    if (
        end <= start
    ) {
        throw new Error(
            "periodEnd must be later than periodStart."
        );
    }


    const periodSeconds =
        (
            end -
            start
        ) /
        1000;


    const periodHours =
        periodSeconds /
        3600;


    /*
    |--------------------------------------------------------------------------
    | Observable populations
    |--------------------------------------------------------------------------
    */

    const gridObservableIds =
        new Set(
            gridObservableInstallationIds
                .map(
                    normalizeId
                )
                .filter(Boolean)
        );


    const serviceObservableIds =
        new Set(
            serviceObservableInstallationIds
                .map(
                    normalizeId
                )
                .filter(Boolean)
        );


    /*
    |--------------------------------------------------------------------------
    | Validated shared acquisition blind intervals
    |--------------------------------------------------------------------------
    */

    const normalizedGridExclusions =
        normalizeExclusionIntervals({
            intervals:
                gridAcquisitionGapIntervals,

            periodStart:
                start,

            periodEnd:
                end,
        });


    const gridExcludedSecondsPerSite =
        totalIntervalSeconds(
            normalizedGridExclusions
        );


    const gridObservableSecondsPerSite =
        Math.max(
            0,

            periodSeconds -
            gridExcludedSecondsPerSite
        );


    /*
    |--------------------------------------------------------------------------
    | Semantic event groups
    |--------------------------------------------------------------------------
    */

    const gridEvents =
        events.filter(
            (event) =>
                isGridSourceEvent(
                    event
                )
        );


    const serviceEvents =
        gridEvents.filter(
            (event) =>
                isServiceInterruption(
                    event
                )
        );


    const saidiSaifiEvents =
        gridEvents.filter(
            (event) =>
                isSaidiSaifiEligible(
                    event
                )
        );


    const ensEvents =
        gridEvents
            .filter(
                (event) =>
                    isEnsEligible(
                        event
                    )
            )
            .filter(
                (event) =>
                    eventOverlapsPeriod(
                        event,
                        start,
                        end
                    )
            );


    /*
    |--------------------------------------------------------------------------
    | Grid-source site-time
    |--------------------------------------------------------------------------
    */

    const observableGridEvents =
        gridEvents.filter(
            (event) =>
                gridObservableIds.has(
                    normalizeId(
                        event.installation
                    )
                )
        );


    const gridSiteTime =
        calculateSiteTime({
            events:
                observableGridEvents,

            periodStart:
                start,

            periodEnd:
                end,

            exclusionIntervals:
                normalizedGridExclusions,
        });


    /*
     * Detector-capable site-time after shared acquisition
     * blind intervals have been removed.
     */
    const gridExposureSeconds =
        gridObservableIds.size *
        gridObservableSecondsPerSite;


    const gridNaiveExposureSeconds =
        gridObservableIds.size *
        periodSeconds;


    const gridExcludedExposureSeconds =
        gridNaiveExposureSeconds -
        gridExposureSeconds;


    const gridAvailability =
        gridExposureSeconds > 0
            ? clamp(
                1 -
                (
                    gridSiteTime
                        .observableTotalSeconds /
                    gridExposureSeconds
                ),
                0,
                1
            )
            : null;


    const gridUnavailability =
        gridAvailability === null
            ? null
            : 1 -
                gridAvailability;


    /*
    |--------------------------------------------------------------------------
    | Service site-time
    |--------------------------------------------------------------------------
    |
    | Service observability currently has no acquisition exclusion model.
    |
    | More importantly, the observable service population remains empty
    | until a fleet-wide service/load interruption detector is validated.
    |--------------------------------------------------------------------------
    */

    const observableServiceEvents =
        serviceEvents.filter(
            (event) =>
                serviceObservableIds.has(
                    normalizeId(
                        event.installation
                    )
                )
        );


    const serviceSiteTime =
        calculateSiteTime({
            events:
                observableServiceEvents,

            periodStart:
                start,

            periodEnd:
                end,

            exclusionIntervals:
                [],
        });


    const serviceExposureSeconds =
        serviceObservableIds.size *
        periodSeconds;


    const serviceAvailability =
        serviceExposureSeconds > 0
            ? clamp(
                1 -
                (
                    serviceSiteTime
                        .totalSeconds /
                    serviceExposureSeconds
                ),
                0,
                1
            )
            : null;


    /*
    |--------------------------------------------------------------------------
    | SAIDI / SAIFI frequency foundation
    |--------------------------------------------------------------------------
    |
    | Frequency must count episodes STARTING inside the reporting period,
    | not every episode merely active inside the window.
    |--------------------------------------------------------------------------
    */

    const saidiSaifiSiteTime =
        calculateSiteTime({
            events:
                saidiSaifiEvents,

            periodStart:
                start,

            periodEnd:
                end,

            exclusionIntervals:
                [],
        });


    /*
    |--------------------------------------------------------------------------
    | ENS
    |--------------------------------------------------------------------------
    */

    const totalEnsKwh =
        ensEvents.reduce(
            (
                total,
                event
            ) => {
                const value =
                    finiteNumber(
                        event
                            .energyNotSuppliedKwh
                    );

                return (
                    total +
                    (
                        value ??
                        0
                    )
                );
            },
            0
        );


    /*
    |--------------------------------------------------------------------------
    | Result
    |--------------------------------------------------------------------------
    */

    return {
        period: {
            start,
            end,

            durationSeconds:
                periodSeconds,

            durationHours:
                periodHours,
        },


        observability: {
            gridSource: {
                observableInstallationCount:
                    gridObservableIds.size,

                /*
                 * Full capability-based exposure before
                 * acquisition-gap correction.
                 */
                naiveExposureSeconds:
                    gridNaiveExposureSeconds,

                naiveExposureHours:
                    gridNaiveExposureSeconds /
                    3600,

                /*
                 * Validated shared acquisition blind time.
                 */
                excludedSecondsPerSite:
                    gridExcludedSecondsPerSite,

                excludedHoursPerSite:
                    gridExcludedSecondsPerSite /
                    3600,

                observableSecondsPerSite:
                    gridObservableSecondsPerSite,

                observableHoursPerSite:
                    gridObservableSecondsPerSite /
                    3600,

                /*
                 * Production denominator.
                 */
                exposureSeconds:
                    gridExposureSeconds,

                exposureHours:
                    gridExposureSeconds /
                    3600,

                excludedExposureSeconds:
                    gridExcludedExposureSeconds,

                excludedExposureHours:
                    gridExcludedExposureSeconds /
                    3600,

                acquisitionGapCount:
                    normalizedGridExclusions
                        .length,

                acquisitionGapIntervals:
                    normalizedGridExclusions
                        .map(
                            (interval) => ({
                                start:
                                    interval.start,

                                end:
                                    interval.end,

                                durationSeconds:
                                    (
                                        interval.end -
                                        interval.start
                                    ) /
                                    1000,
                            })
                        ),

                exposureModel:
                    "CAPABILITY_MINUS_VALIDATED_SHARED_ACQUISITION_GAPS",
            },


            service: {
                observableInstallationCount:
                    serviceObservableIds.size,

                exposureSeconds:
                    serviceExposureSeconds,

                exposureHours:
                    serviceExposureSeconds /
                    3600,
            },
        },


        gridSource: {
            /*
             * Raw derived event documents represented
             * by the observable detector population.
             */
            sourceEventCount:
                observableGridEvents.length,

            /*
             * Physical episodes overlapping reporting
             * window after site-level merge.
             */
            activeEpisodeCount:
                gridSiteTime
                    .activeEpisodeCount,

            /*
             * Frequency foundation:
             * only physical episodes whose original
             * start falls within [periodStart, periodEnd).
             */
            startedEpisodeCount:
                gridSiteTime
                    .startedEpisodeCount,

            /*
             * Backward-compatible field.
             *
             * Keep temporarily so existing consumers do
             * not break, but it explicitly means ACTIVE
             * overlapping episodes, NOT SAIFI frequency.
             */
            interruptionCount:
                gridSiteTime
                    .activeEpisodeCount,

            affectedInstallationCount:
                gridSiteTime
                    .affectedInstallationCount,

            /*
             * Gross interruption site-time before
             * acquisition blind-time removal.
             */
            grossInterruptionSeconds:
                gridSiteTime
                    .grossTotalSeconds,

            grossInterruptionHours:
                gridSiteTime
                    .grossTotalSeconds /
                    3600,

            /*
             * Production availability numerator.
             */
            interruptionSeconds:
                gridSiteTime
                    .observableTotalSeconds,

            interruptionHours:
                gridSiteTime
                    .observableTotalSeconds /
                    3600,

            excludedInterruptionSeconds:
                gridSiteTime
                    .excludedTotalSeconds,

            excludedInterruptionHours:
                gridSiteTime
                    .excludedTotalSeconds /
                    3600,

            availability:
                gridAvailability,

            unavailability:
                gridUnavailability,

            siteBreakdown:
                gridSiteTime
                    .siteBreakdown,
        },


        service: {
            confirmedInterruptionCount:
                serviceEvents.length,

            observableConfirmedInterruptionCount:
                observableServiceEvents.length,

            activeEpisodeCount:
                serviceSiteTime
                    .activeEpisodeCount,

            startedEpisodeCount:
                serviceSiteTime
                    .startedEpisodeCount,

            interruptionSeconds:
                serviceSiteTime
                    .totalSeconds,

            interruptionHours:
                serviceSiteTime
                    .totalSeconds /
                    3600,

            availability:
                serviceAvailability,

            availabilityStatus:
                serviceExposureSeconds > 0
                    ? "CALCULATED"
                    : "NOT_OBSERVABLE",
        },


        saidiSaifiFoundation: {
            eligibleEventCount:
                saidiSaifiEvents.length,

            activeEpisodeCount:
                saidiSaifiSiteTime
                    .activeEpisodeCount,

            /*
             * This is the correct interruption-frequency
             * numerator foundation for 7.9.
             */
            startedEpisodeCount:
                saidiSaifiSiteTime
                    .startedEpisodeCount,

            affectedInstallationCount:
                saidiSaifiSiteTime
                    .affectedInstallationCount,

            denominatorStatus:
                "CUSTOMER_OR_SERVICE_POINT_DENOMINATOR_NOT_YET_DEFINED",
        },


        ensFoundation: {
            eligibleEventCount:
                ensEvents.length,

            totalEnsKwh,
        },


        diagnostics: {
            sourceEventCount:
                events.length,

            gridSourceEventCount:
                gridEvents.length,

            gridObservableEventCount:
                observableGridEvents.length,

            gridActiveEpisodeCount:
                gridSiteTime
                    .activeEpisodeCount,

            gridStartedEpisodeCount:
                gridSiteTime
                    .startedEpisodeCount,

            gridGrossInterruptionSeconds:
                gridSiteTime
                    .grossTotalSeconds,

            gridObservableInterruptionSeconds:
                gridSiteTime
                    .observableTotalSeconds,

            gridExcludedInterruptionSeconds:
                gridSiteTime
                    .excludedTotalSeconds,

            gridAcquisitionGapCount:
                normalizedGridExclusions
                    .length,

            gridAcquisitionExcludedSecondsPerSite:
                gridExcludedSecondsPerSite,

            gridNaiveExposureSeconds:
                gridNaiveExposureSeconds,

            gridCorrectedExposureSeconds:
                gridExposureSeconds,

            serviceInterruptionEventCount:
                serviceEvents.length,

            saidiSaifiEligibleEventCount:
                saidiSaifiEvents.length,

            saidiSaifiStartedEpisodeCount:
                saidiSaifiSiteTime
                    .startedEpisodeCount,

            ensEligibleEventCount:
                ensEvents.length,
        },
    };
}