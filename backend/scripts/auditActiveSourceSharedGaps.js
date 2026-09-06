// backend/scripts/auditActiveSourceSharedGaps.js

import "dotenv/config";

import dns from "dns";
import mongoose from "mongoose";

import {
    Installation,
    Telemetry,
} from "../models/index.js";


/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const ACTIVE_SOURCE_ATTRIBUTE_ID =
    471;

const LOOKBACK_HOURS =
    48;

/*
 * Only inspect genuinely large gaps.
 *
 * Normal observed 471 cadence is predominantly around
 * 3–15 minutes, with p95 often around 10–50 minutes.
 *
 * 180 minutes is therefore deliberately conservative.
 */
const LARGE_GAP_MINUTES =
    180;

/*
 * Gap-boundary timestamps within this tolerance are treated
 * as belonging to the same fleet-level cluster.
 */
const CLUSTER_TOLERANCE_MINUTES =
    30;


/*
|--------------------------------------------------------------------------
| DNS
|--------------------------------------------------------------------------
*/

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);


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

    return String(value);
}


function minutesBetween(
    start,
    end
) {
    const startDate =
        asDate(start);

    const endDate =
        asDate(end);

    if (
        !startDate ||
        !endDate
    ) {
        return null;
    }

    return (
        endDate.getTime() -
        startDate.getTime()
    ) /
        60000;
}


function formatMinutes(value) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value)
        )
    ) {
        return "--";
    }

    return Number(value)
        .toFixed(2);
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
            clean[
                middle - 1
            ] +
            clean[
                middle
            ]
        ) / 2;
    }


    return clean[
        middle
    ];
}


/*
|--------------------------------------------------------------------------
| Extract large gaps
|--------------------------------------------------------------------------
*/

function extractLargeGaps(
    records = [],
    thresholdMinutes
) {
    const sorted =
        [...records]
            .map(
                (record) => ({
                    ...record,

                    timestamp:
                        asDate(
                            record.timestamp
                        ),
                })
            )
            .filter(
                (record) =>
                    record.timestamp
            )
            .sort(
                (a, b) =>
                    a.timestamp -
                    b.timestamp
            );


    const gaps = [];


    for (
        let index = 1;
        index <
        sorted.length;
        index += 1
    ) {
        const previous =
            sorted[
                index - 1
            ];

        const current =
            sorted[
                index
            ];


        const gapMinutes =
            minutesBetween(
                previous.timestamp,
                current.timestamp
            );


        if (
            Number.isFinite(
                gapMinutes
            ) &&
            gapMinutes >=
                thresholdMinutes
        ) {
            gaps.push({
                start:
                    previous.timestamp,

                end:
                    current.timestamp,

                gapMinutes,
            });
        }
    }


    return gaps;
}


/*
|--------------------------------------------------------------------------
| Gap clustering
|--------------------------------------------------------------------------
|
| We cluster gaps according to their start/end boundaries.
|
| If many installations stop around the same time and resume around
| the same time, that is strong evidence of a shared data-acquisition
| boundary rather than independent site telemetry behaviour.
|--------------------------------------------------------------------------
*/

function clusterLargeGaps(
    gaps = [],
    toleranceMinutes
) {
    const toleranceMs =
        toleranceMinutes *
        60 *
        1000;


    const clusters = [];


    const sorted =
        [...gaps]
            .sort(
                (a, b) =>
                    a.start -
                    b.start
            );


    for (
        const gap
        of sorted
    ) {
        let matchingCluster =
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
                matchingCluster =
                    cluster;

                break;
            }
        }


        if (
            !matchingCluster
        ) {
            clusters.push({
                referenceStart:
                    gap.start,

                referenceEnd:
                    gap.end,

                gaps:
                    [
                        gap,
                    ],
            });

            continue;
        }


        matchingCluster
            .gaps
            .push(
                gap
            );
    }


    return clusters
        .map(
            (cluster) => {
                const starts =
                    cluster
                        .gaps
                        .map(
                            (gap) =>
                                gap.start
                                    .getTime()
                        );


                const ends =
                    cluster
                        .gaps
                        .map(
                            (gap) =>
                                gap.end
                                    .getTime()
                        );


                const durations =
                    cluster
                        .gaps
                        .map(
                            (gap) =>
                                gap.gapMinutes
                        );


                return {
                    installationCount:
                        new Set(
                            cluster
                                .gaps
                                .map(
                                    (gap) =>
                                        gap.installationId
                                )
                        ).size,

                    gapCount:
                        cluster
                            .gaps
                            .length,

                    medianStart:
                        new Date(
                            median(
                                starts
                            )
                        ),

                    medianEnd:
                        new Date(
                            median(
                                ends
                            )
                        ),

                    medianGapMinutes:
                        median(
                            durations
                        ),

                    minimumGapMinutes:
                        Math.min(
                            ...durations
                        ),

                    maximumGapMinutes:
                        Math.max(
                            ...durations
                        ),

                    gaps:
                        cluster
                            .gaps,
                };
            }
        )
        .sort(
            (
                a,
                b
            ) =>
                b.installationCount -
                a.installationCount
        );
}


/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

async function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN ACTIVE-SOURCE SHARED-GAP AUDIT"
    );
    console.log(
        "================================================"
    );

    console.log(
        `Attribute ID: ${ACTIVE_SOURCE_ATTRIBUTE_ID}`
    );

    console.log(
        `Lookback: ${LOOKBACK_HOURS} hours`
    );

    console.log(
        `Large-gap threshold: ${LARGE_GAP_MINUTES} minutes`
    );

    console.log(
        `Cluster tolerance: ±${CLUSTER_TOLERANCE_MINUTES} minutes`
    );

    console.log(
        "Mode: READ ONLY"
    );


    const mongoUri =
        process.env
            .MONGODB_URI;


    if (!mongoUri) {
        throw new Error(
            "MONGODB_URI is missing from environment configuration."
        );
    }


    await mongoose.connect(
        mongoUri
    );


    console.log(
        "MongoDB connected."
    );


    const periodEnd =
        new Date();


    const periodStart =
        new Date(
            periodEnd.getTime() -
            LOOKBACK_HOURS *
            60 *
            60 *
            1000
        );


    /*
    |--------------------------------------------------------------------------
    | Eligible fleet
    |--------------------------------------------------------------------------
    */

    const installations =
        await Installation.find({
            source:
                "VRM",

            syncEnabled:
                true,

            status: {
                $ne:
                    "INACTIVE",
            },
        })
            .select(
                "_id vrmSiteId name"
            )
            .lean();


    const installationIds =
        installations.map(
            (installation) =>
                installation._id
        );


    const installationLookup =
        new Map(
            installations.map(
                (installation) => [
                    normalizeId(
                        installation._id
                    ),

                    installation,
                ]
            )
        );


    /*
    |--------------------------------------------------------------------------
    | Query attribute 471
    |--------------------------------------------------------------------------
    */

    const telemetry =
        await Telemetry.find({
            source:
                "VRM",

            vrmAttributeId:
                ACTIVE_SOURCE_ATTRIBUTE_ID,

            installation: {
                $in:
                    installationIds,
            },

            timestamp: {
                $gte:
                    periodStart,

                $lte:
                    periodEnd,
            },
        })
            .select(
                "installation timestamp numericValue value"
            )
            .sort({
                installation:
                    1,

                timestamp:
                    1,
            })
            .lean();


    /*
    |--------------------------------------------------------------------------
    | Group by installation
    |--------------------------------------------------------------------------
    */

    const byInstallation =
        new Map();


    for (
        const record
        of telemetry
    ) {
        const installationId =
            normalizeId(
                record.installation
            );


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
            .push(
                record
            );
    }


    /*
    |--------------------------------------------------------------------------
    | Extract all large gaps
    |--------------------------------------------------------------------------
    */

    const allLargeGaps = [];


    for (
        const [
            installationId,
            records,
        ]
        of byInstallation.entries()
    ) {
        const installation =
            installationLookup.get(
                installationId
            );


        const gaps =
            extractLargeGaps(
                records,
                LARGE_GAP_MINUTES
            );


        for (
            const gap
            of gaps
        ) {
            allLargeGaps.push({
                ...gap,

                installationId,

                vrmSiteId:
                    installation
                        ?.vrmSiteId ??
                    null,

                name:
                    installation
                        ?.name ??
                    null,
            });
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Cluster common gaps
    |--------------------------------------------------------------------------
    */

    const clusters =
        clusterLargeGaps(
            allLargeGaps,
            CLUSTER_TOLERANCE_MINUTES
        );


    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "SUMMARY"
    );
    console.log(
        "================================================"
    );


    console.log(
        "Eligible installations:",
        installations.length
    );


    console.log(
        "Installations with 471 in window:",
        byInstallation.size
    );


    console.log(
        "Total attribute-471 records:",
        telemetry.length
    );


    console.log(
        "Large gaps detected:",
        allLargeGaps.length
    );


    console.log(
        "Shared-gap clusters:",
        clusters.length
    );


    /*
    |--------------------------------------------------------------------------
    | Cluster output
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "SHARED GAP CLUSTERS"
    );
    console.log(
        "================================================"
    );


    if (!clusters.length) {
        console.log(
            "No large-gap clusters detected."
        );
    }


    clusters.forEach(
        (
            cluster,
            index
        ) => {
            console.log("");
            console.log(
                "------------------------------------------------"
            );

            console.log(
                `Cluster ${index + 1}`
            );


            console.log(
                "Installations:",
                cluster
                    .installationCount
            );


            console.log(
                "Gap records:",
                cluster
                    .gapCount
            );


            console.log(
                "Median gap start:",
                cluster
                    .medianStart
                    .toISOString()
            );


            console.log(
                "Median gap end:",
                cluster
                    .medianEnd
                    .toISOString()
            );


            console.log(
                "Median duration:",
                `${formatMinutes(
                    cluster
                        .medianGapMinutes
                )} min`
            );


            console.log(
                "Duration range:",
                `${formatMinutes(
                    cluster
                        .minimumGapMinutes
                )} – ${formatMinutes(
                    cluster
                        .maximumGapMinutes
                )} min`
            );


            console.log(
                "Sites:"
            );


            for (
                const gap
                of cluster.gaps
            ) {
                console.log(
                    `  ${gap.vrmSiteId} | ${gap.name}`
                );

                console.log(
                    `    ${gap.start.toISOString()}`
                );

                console.log(
                    `      → ${gap.end.toISOString()}`
                );

                console.log(
                    `    ${formatMinutes(
                        gap.gapMinutes
                    )} min`
                );
            }
        }
    );


    /*
    |--------------------------------------------------------------------------
    | Diagnostic conclusion only
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "DIAGNOSTIC GUARD"
    );
    console.log(
        "================================================"
    );


    console.log(
        "No observability intervals were created."
    );

    console.log(
        "No reliability denominator was changed."
    );

    console.log(
        "No Reliability KPI records were written."
    );

    console.log(
        "No Telemetry records were modified."
    );
}


/*
|--------------------------------------------------------------------------
| Execute
|--------------------------------------------------------------------------
*/

try {
    await run();
}
catch (error) {
    console.error("");
    console.error(
        "Shared-gap audit failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}
finally {
    if (
        mongoose
            .connection
            .readyState !==
        0
    ) {
        await mongoose.disconnect();

        console.log("");
        console.log(
            "MongoDB disconnected."
        );
    }
}