// backend/services/reliability/activeSourceObservabilityService.js

/*
|--------------------------------------------------------------------------
| Configuration defaults
|--------------------------------------------------------------------------
|
| These defaults are deliberately conservative.
|
| A telemetry gap is considered for fleet-wide acquisition exclusion only
| when:
|
| 1. it is at least 180 minutes long, AND
| 2. substantially the same gap occurs across >= 80% of detector-capable
|    installations that actually have usable telemetry around the period.
|
| We deliberately do NOT treat ordinary site-level gaps as unobservable
| intervals because attribute 471 has mixed reporting cadence.
|--------------------------------------------------------------------------
*/

export const DEFAULT_ACTIVE_SOURCE_OBSERVABILITY_CONFIG = {
    largeGapMinutes: 180,
    clusterToleranceMinutes: 30,
    minimumSharedSiteFraction: 0.8,
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


function median(values = []) {
    const clean =
        values
            .filter(
                Number.isFinite
            )
            .sort(
                (a, b) =>
                    a - b
            );


    if (!clean.length) {
        return null;
    }


    const middle =
        Math.floor(
            clean.length / 2
        );


    if (
        clean.length % 2 === 0
    ) {
        return (
            clean[middle - 1] +
            clean[middle]
        ) / 2;
    }


    return clean[
        middle
    ];
}


function clipInterval(
    start,
    end,
    periodStart,
    periodEnd
) {
    const sourceStart =
        asDate(start);

    const sourceEnd =
        asDate(end);

    const windowStart =
        asDate(periodStart);

    const windowEnd =
        asDate(periodEnd);


    if (
        !sourceStart ||
        !sourceEnd ||
        !windowStart ||
        !windowEnd ||
        sourceEnd <=
            sourceStart ||
        windowEnd <=
            windowStart
    ) {
        return null;
    }


    if (
        sourceEnd <=
            windowStart ||
        sourceStart >=
            windowEnd
    ) {
        return null;
    }


    const clippedStart =
        new Date(
            Math.max(
                sourceStart.getTime(),
                windowStart.getTime()
            )
        );


    const clippedEnd =
        new Date(
            Math.min(
                sourceEnd.getTime(),
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

        durationSeconds:
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
    const sorted =
        intervals
            .filter(Boolean)
            .map(
                (interval) => ({
                    start:
                        asDate(
                            interval.start
                        ),

                    end:
                        asDate(
                            interval.end
                        ),
                })
            )
            .filter(
                (interval) =>
                    interval.start &&
                    interval.end &&
                    interval.end >
                        interval.start
            )
            .sort(
                (a, b) =>
                    a.start -
                    b.start
            );


    if (!sorted.length) {
        return [];
    }


    const merged = [];


    for (
        const interval
        of sorted
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
                start:
                    interval.start,

                end:
                    interval.end,
            });

            continue;
        }


        if (
            interval.end >
            previous.end
        ) {
            previous.end =
                interval.end;
        }
    }


    return merged.map(
        (interval) => ({
            ...interval,

            durationSeconds:
                (
                    interval.end.getTime() -
                    interval.start.getTime()
                ) /
                1000,
        })
    );
}


/*
|--------------------------------------------------------------------------
| Group telemetry by installation
|--------------------------------------------------------------------------
*/

function groupTelemetryByInstallation(
    telemetry = []
) {
    const grouped =
        new Map();


    for (
        const record
        of telemetry
    ) {
        const installationId =
            normalizeId(
                record?.installation
            );


        const timestamp =
            asDate(
                record?.timestamp
            );


        if (
            !installationId ||
            !timestamp
        ) {
            continue;
        }


        if (
            !grouped.has(
                installationId
            )
        ) {
            grouped.set(
                installationId,
                []
            );
        }


        grouped
            .get(
                installationId
            )
            .push({
                ...record,
                timestamp,
            });
    }


    for (
        const records
        of grouped.values()
    ) {
        records.sort(
            (a, b) =>
                a.timestamp -
                b.timestamp
        );
    }


    return grouped;
}


/*
|--------------------------------------------------------------------------
| Extract large consecutive-sample gaps
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This does NOT itself mean the installation was unobservable.
|
| These intervals are only candidates. They become valid acquisition
| exclusions when a sufficiently large fraction of the fleet exhibits
| approximately the same gap.
|--------------------------------------------------------------------------
*/

function extractLargeGaps(
    installationId,
    records,
    thresholdMinutes
) {
    const thresholdMs =
        thresholdMinutes *
        60 *
        1000;


    const gaps = [];


    for (
        let index = 1;
        index <
        records.length;
        index += 1
    ) {
        const previous =
            records[
                index - 1
            ];

        const current =
            records[
                index
            ];


        const durationMs =
            current.timestamp.getTime() -
            previous.timestamp.getTime();


        if (
            durationMs <
            thresholdMs
        ) {
            continue;
        }


        gaps.push({
            installationId,

            start:
                previous.timestamp,

            end:
                current.timestamp,

            durationSeconds:
                durationMs /
                1000,
        });
    }


    return gaps;
}


/*
|--------------------------------------------------------------------------
| Cluster similar fleet gaps
|--------------------------------------------------------------------------
*/

function clusterGapCandidates(
    gapCandidates,
    toleranceMinutes
) {
    const toleranceMs =
        toleranceMinutes *
        60 *
        1000;


    const clusters = [];


    const sorted =
        [...gapCandidates]
            .sort(
                (a, b) =>
                    a.start -
                    b.start
            );


    for (
        const gap
        of sorted
    ) {
        let match =
            null;


        for (
            const cluster
            of clusters
        ) {
            const startDifference =
                Math.abs(
                    gap.start.getTime() -
                    cluster
                        .referenceStart
                        .getTime()
                );


            const endDifference =
                Math.abs(
                    gap.end.getTime() -
                    cluster
                        .referenceEnd
                        .getTime()
                );


            if (
                startDifference <=
                    toleranceMs &&
                endDifference <=
                    toleranceMs
            ) {
                match =
                    cluster;

                break;
            }
        }


        if (!match) {
            clusters.push({
                referenceStart:
                    gap.start,

                referenceEnd:
                    gap.end,

                gaps: [
                    gap,
                ],
            });

            continue;
        }


        match.gaps.push(
            gap
        );
    }


    return clusters;
}


/*
|--------------------------------------------------------------------------
| Convert cluster into representative shared interval
|--------------------------------------------------------------------------
|
| Median boundaries are used rather than earliest/latest boundaries.
|
| This prevents one installation's unusually early or late sample from
| expanding the global blind interval.
|--------------------------------------------------------------------------
*/

function summarizeCluster(
    cluster,
    denominatorSiteCount
) {
    const installationIds =
        [
            ...new Set(
                cluster.gaps.map(
                    (gap) =>
                        gap.installationId
                )
            ),
        ];


    const startTimes =
        cluster.gaps.map(
            (gap) =>
                gap.start.getTime()
        );


    const endTimes =
        cluster.gaps.map(
            (gap) =>
                gap.end.getTime()
        );


    const medianStartMs =
        median(
            startTimes
        );

    const medianEndMs =
        median(
            endTimes
        );


    const start =
        new Date(
            medianStartMs
        );

    const end =
        new Date(
            medianEndMs
        );


    return {
        installationIds,

        sharedInstallationCount:
            installationIds.length,

        denominatorSiteCount,

        sharedSiteFraction:
            denominatorSiteCount > 0
                ? installationIds.length /
                    denominatorSiteCount
                : 0,

        start,

        end,

        durationSeconds:
            (
                end.getTime() -
                start.getTime()
            ) /
            1000,
    };
}


/*
|--------------------------------------------------------------------------
| Derive acquisition exclusion intervals
|--------------------------------------------------------------------------
*/

export function deriveActiveSourceAcquisitionGaps({
    telemetry = [],
    detectorCapableInstallationIds = [],
    periodStart,
    periodEnd,
    config = {},
} = {}) {
    const settings = {
        ...DEFAULT_ACTIVE_SOURCE_OBSERVABILITY_CONFIG,
        ...config,
    };


    const detectorIds =
        [
            ...new Set(
                detectorCapableInstallationIds
                    .map(
                        normalizeId
                    )
                    .filter(
                        Boolean
                    )
            ),
        ];


    const detectorIdSet =
        new Set(
            detectorIds
        );


    const grouped =
        groupTelemetryByInstallation(
            telemetry
        );


    /*
     * Only detector-capable installations should contribute
     * acquisition-gap candidates.
     */
    const usableGrouped =
        new Map(
            [...grouped.entries()]
                .filter(
                    ([
                        installationId,
                    ]) =>
                        detectorIdSet.has(
                            installationId
                        )
                )
        );


    /*
     * IMPORTANT:
     *
     * The denominator for the shared-gap fraction is installations
     * actually represented by telemetry in the inspected dataset.
     *
     * A detector-capable site with no records in the queried diagnostic
     * range cannot establish the boundaries of this particular shared gap.
     */
    const representedSiteCount =
        usableGrouped.size;


    const gapCandidates =
        [];


    for (
        const [
            installationId,
            records,
        ]
        of usableGrouped.entries()
    ) {
        gapCandidates.push(
            ...extractLargeGaps(
                installationId,
                records,
                settings
                    .largeGapMinutes
            )
        );
    }


    const clusters =
        clusterGapCandidates(
            gapCandidates,
            settings
                .clusterToleranceMinutes
        );


    const qualifyingClusters =
        clusters
            .map(
                (cluster) =>
                    summarizeCluster(
                        cluster,
                        representedSiteCount
                    )
            )
            .filter(
                (cluster) =>
                    cluster
                        .sharedSiteFraction >=
                    settings
                        .minimumSharedSiteFraction
            );


    /*
     * Clip shared acquisition gaps to the reporting window.
     */
    const clipped =
        qualifyingClusters
            .map(
                (cluster) => {
                    const interval =
                        clipInterval(
                            cluster.start,
                            cluster.end,
                            periodStart,
                            periodEnd
                        );


                    if (!interval) {
                        return null;
                    }


                    return {
                        ...interval,

                        sharedInstallationCount:
                            cluster
                                .sharedInstallationCount,

                        denominatorSiteCount:
                            cluster
                                .denominatorSiteCount,

                        sharedSiteFraction:
                            cluster
                                .sharedSiteFraction,

                        sourceStart:
                            cluster.start,

                        sourceEnd:
                            cluster.end,
                    };
                }
            )
            .filter(
                Boolean
            );


    const merged =
        mergeIntervals(
            clipped
        );


    const excludedSeconds =
        merged.reduce(
            (
                total,
                interval
            ) =>
                total +
                interval.durationSeconds,
            0
        );


    return {
        representedInstallationCount:
            representedSiteCount,

        detectorCapableInstallationCount:
            detectorIds.length,

        candidateGapCount:
            gapCandidates.length,

        clusterCount:
            clusters.length,

        qualifyingClusterCount:
            qualifyingClusters.length,

        qualifyingClusters,

        acquisitionGapIntervals:
            clipped,

        mergedAcquisitionGapIntervals:
            merged,

        excludedSeconds,

        excludedHours:
            excludedSeconds /
            3600,

        config:
            settings,
    };
}


/*
|--------------------------------------------------------------------------
| Calculate capability-based observability exposure
|--------------------------------------------------------------------------
|
| Exposure model:
|
| detector-capable installations
| ×
| (reporting duration - shared acquisition blind time)
|
| This remains a detector-capability metric.
|
| It is NOT customer service availability.
|--------------------------------------------------------------------------
*/

export function calculateActiveSourceExposure({
    detectorCapableInstallationIds = [],
    periodStart,
    periodEnd,
    acquisitionGapIntervals = [],
} = {}) {
    const start =
        asDate(
            periodStart
        );

    const end =
        asDate(
            periodEnd
        );


    const detectorIds =
        [
            ...new Set(
                detectorCapableInstallationIds
                    .map(
                        normalizeId
                    )
                    .filter(
                        Boolean
                    )
            ),
        ];


    if (
        !start ||
        !end ||
        end <= start
    ) {
        return {
            detectorCapableInstallationCount:
                detectorIds.length,

            reportingSeconds:
                0,

            excludedSeconds:
                0,

            observableSecondsPerSite:
                0,

            exposureSiteSeconds:
                0,

            exposureSiteHours:
                0,
        };
    }


    const reportingSeconds =
        (
            end.getTime() -
            start.getTime()
        ) /
        1000;


    const clippedExclusions =
        acquisitionGapIntervals
            .map(
                (interval) =>
                    clipInterval(
                        interval.start,
                        interval.end,
                        start,
                        end
                    )
            )
            .filter(
                Boolean
            );


    const mergedExclusions =
        mergeIntervals(
            clippedExclusions
        );


    const excludedSeconds =
        Math.min(
            reportingSeconds,

            mergedExclusions.reduce(
                (
                    total,
                    interval
                ) =>
                    total +
                    interval.durationSeconds,
                0
            )
        );


    const observableSecondsPerSite =
        Math.max(
            0,

            reportingSeconds -
            excludedSeconds
        );


    const exposureSiteSeconds =
        observableSecondsPerSite *
        detectorIds.length;


    return {
        detectorCapableInstallationCount:
            detectorIds.length,

        reportingSeconds,

        reportingHours:
            reportingSeconds /
            3600,

        excludedSeconds,

        excludedHours:
            excludedSeconds /
            3600,

        observableSecondsPerSite,

        observableHoursPerSite:
            observableSecondsPerSite /
            3600,

        exposureSiteSeconds,

        exposureSiteHours:
            exposureSiteSeconds /
            3600,

        mergedExclusionIntervals:
            mergedExclusions,
    };
}

export function deriveActiveSourceBoundaryGaps({
    telemetry = [],
    detectorCapableInstallationIds = [],
    periodStart,
    periodEnd,

    config = {},
} = {}) {
    const settings = {
        minimumSharedSiteFraction:
            0.8,

        /*
         * Boundary must be materially larger than normal
         * attribute-471 cadence.
         */
        minimumBoundaryGapMinutes:
            60,

        /*
         * The initial population can be acquired sequentially,
         * therefore the first-sample boundary is allowed a wider
         * cluster than the trailing watermark.
         */
        leadingToleranceMinutes:
            90,

        trailingToleranceMinutes:
            30,

        ...config,
    };


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
        !end ||
        end <= start
    ) {
        return {
            representedInstallationCount:
                0,

            detectorCapableInstallationCount:
                0,

            leadingBoundary:
                null,

            trailingBoundary:
                null,

            boundaryGapIntervals:
                [],
        };
    }


    const detectorIds =
        [
            ...new Set(
                detectorCapableInstallationIds
                    .map(
                        normalizeId
                    )
                    .filter(
                        Boolean
                    )
            ),
        ];


    const detectorIdSet =
        new Set(
            detectorIds
        );


    /*
    |--------------------------------------------------------------------------
    | Group reporting-window telemetry by installation
    |--------------------------------------------------------------------------
    */

    const grouped =
        new Map();


    for (
        const record
        of telemetry
    ) {
        const installationId =
            normalizeId(
                record?.installation
            );


        const timestamp =
            asDate(
                record?.timestamp
            );


        if (
            !installationId ||
            !timestamp ||
            !detectorIdSet.has(
                installationId
            ) ||
            timestamp <
                start ||
            timestamp >
                end
        ) {
            continue;
        }


        if (
            !grouped.has(
                installationId
            )
        ) {
            grouped.set(
                installationId,
                []
            );
        }


        grouped
            .get(
                installationId
            )
            .push(
                timestamp
            );
    }


    const represented =
        [];


    for (
        const [
            installationId,
            timestamps,
        ]
        of grouped.entries()
    ) {
        const sorted =
            [...timestamps]
                .sort(
                    (a, b) =>
                        a - b
                );


        if (!sorted.length) {
            continue;
        }


        represented.push({
            installationId,

            first:
                sorted[0],

            last:
                sorted[
                    sorted.length -
                    1
                ],
        });
    }


    const representedCount =
        represented.length;


    if (
        representedCount ===
        0
    ) {
        return {
            representedInstallationCount:
                0,

            detectorCapableInstallationCount:
                detectorIds.length,

            leadingBoundary:
                null,

            trailingBoundary:
                null,

            boundaryGapIntervals:
                [],
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Median reference boundaries
    |--------------------------------------------------------------------------
    */

    const medianFirstMs =
        median(
            represented.map(
                (row) =>
                    row.first
                        .getTime()
            )
        );


    const medianLastMs =
        median(
            represented.map(
                (row) =>
                    row.last
                        .getTime()
            )
        );


    const medianFirst =
        new Date(
            medianFirstMs
        );


    const medianLast =
        new Date(
            medianLastMs
        );


    /*
    |--------------------------------------------------------------------------
    | Shared leading boundary
    |--------------------------------------------------------------------------
    */

    const leadingToleranceMs =
        settings
            .leadingToleranceMinutes *
        60 *
        1000;


    const leadingParticipants =
        represented.filter(
            (row) =>
                Math.abs(
                    row.first
                        .getTime() -
                    medianFirst
                        .getTime()
                ) <=
                leadingToleranceMs
        );


    const leadingFraction =
        representedCount > 0
            ? leadingParticipants.length /
                representedCount
            : 0;


    const leadingGapSeconds =
        (
            medianFirst.getTime() -
            start.getTime()
        ) /
        1000;


    const leadingQualifies =
        leadingFraction >=
            settings
                .minimumSharedSiteFraction &&
        leadingGapSeconds >=
            settings
                .minimumBoundaryGapMinutes *
            60;


    const leadingBoundary =
        leadingQualifies
            ? {
                type:
                    "LEADING_ACQUISITION_BOUNDARY",

                start:
                    start,

                end:
                    medianFirst,

                durationSeconds:
                    leadingGapSeconds,

                participatingInstallationCount:
                    leadingParticipants.length,

                representedInstallationCount:
                    representedCount,

                sharedSiteFraction:
                    leadingFraction,

                representativeTimestamp:
                    medianFirst,
            }
            : null;


    /*
    |--------------------------------------------------------------------------
    | Shared trailing boundary
    |--------------------------------------------------------------------------
    */

    const trailingToleranceMs =
        settings
            .trailingToleranceMinutes *
        60 *
        1000;


    const trailingParticipants =
        represented.filter(
            (row) =>
                Math.abs(
                    row.last
                        .getTime() -
                    medianLast
                        .getTime()
                ) <=
                trailingToleranceMs
        );


    const trailingFraction =
        representedCount > 0
            ? trailingParticipants.length /
                representedCount
            : 0;


    const trailingGapSeconds =
        (
            end.getTime() -
            medianLast.getTime()
        ) /
        1000;


    const trailingQualifies =
        trailingFraction >=
            settings
                .minimumSharedSiteFraction &&
        trailingGapSeconds >=
            settings
                .minimumBoundaryGapMinutes *
            60;


    const trailingBoundary =
        trailingQualifies
            ? {
                type:
                    "TRAILING_ACQUISITION_BOUNDARY",

                start:
                    medianLast,

                end,

                durationSeconds:
                    trailingGapSeconds,

                participatingInstallationCount:
                    trailingParticipants.length,

                representedInstallationCount:
                    representedCount,

                sharedSiteFraction:
                    trailingFraction,

                representativeTimestamp:
                    medianLast,
            }
            : null;


    const boundaryGapIntervals =
        [
            leadingBoundary,
            trailingBoundary,
        ]
            .filter(
                Boolean
            );


    return {
        representedInstallationCount:
            representedCount,

        detectorCapableInstallationCount:
            detectorIds.length,

        unrepresentedInstallationCount:
            Math.max(
                0,
                detectorIds.length -
                representedCount
            ),

        leadingBoundary,

        trailingBoundary,

        boundaryGapIntervals,

        config:
            settings,
    };
}