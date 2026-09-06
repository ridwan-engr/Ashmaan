
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


function normalizeId(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value === "object" &&
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
| Resolve actual event end
|--------------------------------------------------------------------------
|
| RESTORED event:
|     restorationTime
|
| OPEN event:
|     reporting period end
|
| Fallback:
|     endTime
|--------------------------------------------------------------------------
*/

function resolveEventEnd(
    event,
    periodEnd
) {
    const restoration =
        asDate(
            event?.restorationTime
        );

    if (restoration) {
        return restoration;
    }

    if (
        event?.status ===
        "OPEN"
    ) {
        return asDate(
            periodEnd
        );
    }

    return asDate(
        event?.endTime
    );
}


/*
|--------------------------------------------------------------------------
| Clip event to reporting window
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| originalStart is preserved separately from clippedStart.
|
| This distinction is essential:
|
| - duration calculations use clippedStart/clippedEnd
| - frequency calculations use originalStart
|--------------------------------------------------------------------------
*/

export function clipReliabilityEvent(
    event,
    periodStart,
    periodEnd
) {
    const windowStart =
        asDate(periodStart);

    const windowEnd =
        asDate(periodEnd);

    const originalStart =
        asDate(
            event?.startTime
        );

    const originalEnd =
        resolveEventEnd(
            event,
            windowEnd
        );


    if (
        !windowStart ||
        !windowEnd ||
        windowEnd <= windowStart ||
        !originalStart ||
        !originalEnd ||
        originalEnd <= originalStart
    ) {
        return null;
    }


    /*
     * No temporal overlap.
     */
    if (
        originalEnd <= windowStart ||
        originalStart >= windowEnd
    ) {
        return null;
    }


    const clippedStart =
        new Date(
            Math.max(
                originalStart.getTime(),
                windowStart.getTime()
            )
        );


    const clippedEnd =
        new Date(
            Math.min(
                originalEnd.getTime(),
                windowEnd.getTime()
            )
        );


    if (
        clippedEnd <= clippedStart
    ) {
        return null;
    }


    return {
        installationId:
            normalizeId(
                event?.installation
            ),

        eventId:
            normalizeId(
                event?._id
            ),

        originalStart,

        originalEnd,

        start:
            clippedStart,

        end:
            clippedEnd,

        durationSeconds:
            (
                clippedEnd.getTime() -
                clippedStart.getTime()
            ) / 1000,

        /*
         * True only when this interruption actually began
         * within this reporting period.
         *
         * Half-open reporting convention:
         *
         * [periodStart, periodEnd)
         */
        startedInPeriod:
            originalStart >=
                windowStart &&
            originalStart <
                windowEnd,
    };
}


/*
|--------------------------------------------------------------------------
| Merge overlapping intervals for one installation
|--------------------------------------------------------------------------
|
| Multiple raw events may overlap but represent one continuous physical
| interruption episode.
|
| The merged episode preserves:
|
| earliestOriginalStart
| latestOriginalEnd
|
| This makes frequency counting independent from reporting-window clipping.
|--------------------------------------------------------------------------
*/

export function mergeReliabilityIntervals(
    intervals = []
) {
    const valid =
        intervals
            .filter(Boolean)
            .filter(
                (interval) =>
                    asDate(
                        interval.start
                    ) &&
                    asDate(
                        interval.end
                    )
            )
            .map(
                (interval) => ({
                    ...interval,

                    start:
                        asDate(
                            interval.start
                        ),

                    end:
                        asDate(
                            interval.end
                        ),

                    originalStart:
                        asDate(
                            interval.originalStart ??
                            interval.start
                        ),

                    originalEnd:
                        asDate(
                            interval.originalEnd ??
                            interval.end
                        ),

                    sourceEventIds:
                        interval.eventId
                            ? [
                                String(
                                    interval.eventId
                                ),
                            ]
                            : [],
                })
            )
            .sort(
                (a, b) =>
                    a.start -
                    b.start
            );


    if (!valid.length) {
        return [];
    }


    const merged = [];


    for (
        const interval
        of valid
    ) {
        const previous =
            merged[
                merged.length - 1
            ];


        if (
            !previous ||
            interval.start >
                previous.end
        ) {
            merged.push({
                installationId:
                    interval.installationId,

                start:
                    interval.start,

                end:
                    interval.end,

                originalStart:
                    interval.originalStart,

                originalEnd:
                    interval.originalEnd,

                sourceEventIds:
                    [
                        ...interval
                            .sourceEventIds,
                    ],
            });

            continue;
        }


        /*
         * Overlap or touching boundary:
         * merge into one physical episode.
         */
        if (
            interval.end >
            previous.end
        ) {
            previous.end =
                interval.end;
        }


        if (
            interval.originalStart <
            previous.originalStart
        ) {
            previous.originalStart =
                interval.originalStart;
        }


        if (
            interval.originalEnd >
            previous.originalEnd
        ) {
            previous.originalEnd =
                interval.originalEnd;
        }


        previous.sourceEventIds =
            [
                ...new Set([
                    ...previous
                        .sourceEventIds,

                    ...interval
                        .sourceEventIds,
                ]),
            ];
    }


    return merged.map(
        (episode) => ({
            ...episode,

            durationSeconds:
                (
                    episode.end.getTime() -
                    episode.start.getTime()
                ) / 1000,
        })
    );
}


/*
|--------------------------------------------------------------------------
| Aggregate site-time episodes
|--------------------------------------------------------------------------
|
| activeEpisodeCount:
|     Number of interruption episodes overlapping the reporting window.
|
| startedEpisodeCount:
|     Number of those physical interruption episodes whose ORIGINAL start
|     occurred inside [periodStart, periodEnd).
|
| interruptionSeconds:
|     Duration within the reporting window only.
|--------------------------------------------------------------------------
*/

export function calculateReliabilitySiteTime({
    events = [],
    periodStart,
    periodEnd,
} = {}) {
    const windowStart =
        asDate(periodStart);

    const windowEnd =
        asDate(periodEnd);


    if (
        !windowStart ||
        !windowEnd ||
        windowEnd <= windowStart
    ) {
        return {
            totalSeconds:
                0,

            totalHours:
                0,

            activeEpisodeCount:
                0,

            startedEpisodeCount:
                0,

            affectedInstallationCount:
                0,

            siteBreakdown:
                [],
        };
    }


    /*
     * Group clipped intervals by installation.
     */
    const byInstallation =
        new Map();


    for (
        const event
        of events
    ) {
        const clipped =
            clipReliabilityEvent(
                event,
                windowStart,
                windowEnd
            );


        if (
            !clipped ||
            !clipped.installationId
        ) {
            continue;
        }


        if (
            !byInstallation.has(
                clipped.installationId
            )
        ) {
            byInstallation.set(
                clipped.installationId,
                []
            );
        }


        byInstallation
            .get(
                clipped.installationId
            )
            .push(
                clipped
            );
    }


    const siteBreakdown = [];

    let totalSeconds = 0;

    let activeEpisodeCount = 0;

    let startedEpisodeCount = 0;


    for (
        const [
            installationId,
            intervals,
        ]
        of byInstallation.entries()
    ) {
        const episodes =
            mergeReliabilityIntervals(
                intervals
            );


        const interruptionSeconds =
            episodes.reduce(
                (
                    total,
                    episode
                ) =>
                    total +
                    episode
                        .durationSeconds,
                0
            );


        const siteStartedEpisodeCount =
            episodes.filter(
                (episode) =>
                    episode.originalStart >=
                        windowStart &&
                    episode.originalStart <
                        windowEnd
            ).length;


        totalSeconds +=
            interruptionSeconds;


        activeEpisodeCount +=
            episodes.length;


        startedEpisodeCount +=
            siteStartedEpisodeCount;


        siteBreakdown.push({
            installationId,

            sourceEventCount:
                intervals.length,

            activeEpisodeCount:
                episodes.length,

            startedEpisodeCount:
                siteStartedEpisodeCount,

            interruptionSeconds,

            interruptionHours:
                interruptionSeconds /
                3600,

            episodes:
                episodes.map(
                    (episode) => ({
                        start:
                            episode.start,

                        end:
                            episode.end,

                        originalStart:
                            episode.originalStart,

                        originalEnd:
                            episode.originalEnd,

                        durationSeconds:
                            episode
                                .durationSeconds,

                        startedInPeriod:
                            episode
                                .originalStart >=
                                windowStart &&
                            episode
                                .originalStart <
                                windowEnd,

                        sourceEventIds:
                            episode
                                .sourceEventIds,
                    })
                ),
        });
    }


    siteBreakdown.sort(
        (a, b) =>
            a.installationId.localeCompare(
                b.installationId
            )
    );


    return {
        totalSeconds,

        totalHours:
            totalSeconds /
            3600,

        activeEpisodeCount,

        startedEpisodeCount,

        affectedInstallationCount:
            siteBreakdown.length,

        siteBreakdown,
    };
}