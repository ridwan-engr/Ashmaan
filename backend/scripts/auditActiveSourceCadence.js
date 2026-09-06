// backend/scripts/auditActiveSourceCadence.js

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

const LOOKBACK_DAYS =
    30;

const RECENT_HOURS =
    24;


/*
|--------------------------------------------------------------------------
| DNS
|--------------------------------------------------------------------------
|
| Keep the same DNS workaround already used successfully by ASHMAAN
| for MongoDB Atlas SRV resolution.
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


function numeric(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    return Number.isFinite(
        number
    )
        ? number
        : null;
}


function percentile(
    values = [],
    percentileValue
) {
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

    if (clean.length === 1) {
        return clean[0];
    }

    const position =
        (
            percentileValue /
            100
        ) *
        (
            clean.length -
            1
        );

    const lower =
        Math.floor(
            position
        );

    const upper =
        Math.ceil(
            position
        );

    if (
        lower === upper
    ) {
        return clean[
            lower
        ];
    }

    const weight =
        position -
        lower;

    return (
        clean[lower] *
            (
                1 -
                weight
            ) +
        clean[upper] *
            weight
    );
}


function median(
    values = []
) {
    return percentile(
        values,
        50
    );
}


function formatNumber(
    value,
    digits = 2
) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value)
        )
    ) {
        return "--";
    }

    return Number(
        value
    ).toFixed(
        digits
    );
}


function formatDate(
    value
) {
    const date =
        asDate(
            value
        );

    return date
        ? date.toISOString()
        : "--";
}


function hoursBetween(
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
        3600000;
}


function dayKey(
    timestamp
) {
    const date =
        asDate(
            timestamp
        );

    if (!date) {
        return null;
    }

    return date
        .toISOString()
        .slice(
            0,
            10
        );
}


/*
|--------------------------------------------------------------------------
| Active-source state labels
|--------------------------------------------------------------------------
|
| VRM /Ac/ActiveIn/Source
|
| 0   = Not available
| 1   = Grid
| 2   = Generator
| 3   = Shore
| 240 = Inverting
|--------------------------------------------------------------------------
*/

function activeSourceLabel(
    value
) {
    switch (
        Number(value)
    ) {
        case 0:
            return "NOT_AVAILABLE";

        case 1:
            return "GRID";

        case 2:
            return "GENERATOR";

        case 3:
            return "SHORE";

        case 240:
            return "INVERTING";

        default:
            return `OTHER_${value}`;
    }
}


/*
|--------------------------------------------------------------------------
| Record value
|--------------------------------------------------------------------------
*/

function telemetryValue(
    record
) {
    return numeric(
        record?.numericValue ??
        record?.value
    );
}


/*
|--------------------------------------------------------------------------
| Gap statistics
|--------------------------------------------------------------------------
*/

function calculateGapStatistics(
    records = []
) {
    if (
        records.length <
        2
    ) {
        return {
            gapCount:
                0,

            medianGapMinutes:
                null,

            p75GapMinutes:
                null,

            p95GapMinutes:
                null,

            maximumGapMinutes:
                null,

            minimumGapMinutes:
                null,

            gapsMinutes:
                [],
        };
    }


    const sorted =
        [...records]
            .sort(
                (a, b) =>
                    new Date(
                        a.timestamp
                    ) -
                    new Date(
                        b.timestamp
                    )
            );


    const gapsMinutes = [];


    for (
        let index = 1;
        index <
        sorted.length;
        index += 1
    ) {
        const previous =
            asDate(
                sorted[
                    index - 1
                ].timestamp
            );

        const current =
            asDate(
                sorted[
                    index
                ].timestamp
            );


        if (
            !previous ||
            !current
        ) {
            continue;
        }


        const gap =
            (
                current.getTime() -
                previous.getTime()
            ) /
            60000;


        if (
            gap >= 0 &&
            Number.isFinite(
                gap
            )
        ) {
            gapsMinutes.push(
                gap
            );
        }
    }


    if (!gapsMinutes.length) {
        return {
            gapCount:
                0,

            medianGapMinutes:
                null,

            p75GapMinutes:
                null,

            p95GapMinutes:
                null,

            maximumGapMinutes:
                null,

            minimumGapMinutes:
                null,

            gapsMinutes:
                [],
        };
    }


    return {
        gapCount:
            gapsMinutes.length,

        medianGapMinutes:
            median(
                gapsMinutes
            ),

        p75GapMinutes:
            percentile(
                gapsMinutes,
                75
            ),

        p95GapMinutes:
            percentile(
                gapsMinutes,
                95
            ),

        maximumGapMinutes:
            Math.max(
                ...gapsMinutes
            ),

        minimumGapMinutes:
            Math.min(
                ...gapsMinutes
            ),

        gapsMinutes,
    };
}


/*
|--------------------------------------------------------------------------
| Transition statistics
|--------------------------------------------------------------------------
*/

function calculateTransitions(
    records = []
) {
    const sorted =
        [...records]
            .sort(
                (a, b) =>
                    new Date(
                        a.timestamp
                    ) -
                    new Date(
                        b.timestamp
                    )
            );


    const transitions = [];

    let previousValue =
        null;

    let previousTimestamp =
        null;


    for (
        const record
        of sorted
    ) {
        const value =
            telemetryValue(
                record
            );


        if (
            value === null
        ) {
            continue;
        }


        if (
            previousValue !== null &&
            value !==
                previousValue
        ) {
            transitions.push({
                timestamp:
                    asDate(
                        record.timestamp
                    ),

                from:
                    previousValue,

                to:
                    value,

                fromLabel:
                    activeSourceLabel(
                        previousValue
                    ),

                toLabel:
                    activeSourceLabel(
                        value
                    ),

                previousTimestamp,
            });
        }


        previousValue =
            value;

        previousTimestamp =
            asDate(
                record.timestamp
            );
    }


    return transitions;
}


/*
|--------------------------------------------------------------------------
| State distribution
|--------------------------------------------------------------------------
*/

function calculateStateDistribution(
    records = []
) {
    const counts =
        new Map();


    for (
        const record
        of records
    ) {
        const value =
            telemetryValue(
                record
            );


        if (
            value === null
        ) {
            continue;
        }


        const key =
            activeSourceLabel(
                value
            );


        counts.set(
            key,
            (
                counts.get(
                    key
                ) ??
                0
            ) +
            1
        );
    }


    return Object.fromEntries(
        [...counts.entries()]
            .sort(
                (
                    a,
                    b
                ) =>
                    b[1] -
                    a[1]
            )
    );
}


/*
|--------------------------------------------------------------------------
| Site analysis
|--------------------------------------------------------------------------
*/

function analyseInstallation({
    installation,
    records,
    recentStart,
} = {}) {
    const sorted =
        [...records]
            .sort(
                (a, b) =>
                    new Date(
                        a.timestamp
                    ) -
                    new Date(
                        b.timestamp
                    )
            );


    const recentRecords =
        sorted.filter(
            (record) => {
                const timestamp =
                    asDate(
                        record.timestamp
                    );

                return (
                    timestamp &&
                    timestamp >=
                        recentStart
                );
            }
        );


    const gapStats =
        calculateGapStatistics(
            sorted
        );


    const recentGapStats =
        calculateGapStatistics(
            recentRecords
        );


    const transitions =
        calculateTransitions(
            sorted
        );


    const recentTransitions =
        calculateTransitions(
            recentRecords
        );


    const uniqueDays =
        new Set(
            sorted
                .map(
                    (record) =>
                        dayKey(
                            record.timestamp
                        )
                )
                .filter(
                    Boolean
                )
        );


    const firstTimestamp =
        sorted.length
            ? asDate(
                sorted[0]
                    .timestamp
            )
            : null;


    const lastTimestamp =
        sorted.length
            ? asDate(
                sorted[
                    sorted.length -
                    1
                ].timestamp
            )
            : null;


    return {
        installationId:
            String(
                installation._id
            ),

        vrmSiteId:
            installation
                .vrmSiteId,

        name:
            installation
                .name,

        sampleCount:
            sorted.length,

        recentSampleCount:
            recentRecords.length,

        firstTimestamp,

        lastTimestamp,

        spanHours:
            firstTimestamp &&
            lastTimestamp
                ? hoursBetween(
                    firstTimestamp,
                    lastTimestamp
                )
                : null,

        uniqueDays:
            uniqueDays.size,

        medianGapMinutes:
            gapStats
                .medianGapMinutes,

        p75GapMinutes:
            gapStats
                .p75GapMinutes,

        p95GapMinutes:
            gapStats
                .p95GapMinutes,

        maximumGapMinutes:
            gapStats
                .maximumGapMinutes,

        recentMedianGapMinutes:
            recentGapStats
                .medianGapMinutes,

        recentP95GapMinutes:
            recentGapStats
                .p95GapMinutes,

        recentMaximumGapMinutes:
            recentGapStats
                .maximumGapMinutes,

        transitionCount:
            transitions.length,

        recentTransitionCount:
            recentTransitions
                .length,

        stateDistribution:
            calculateStateDistribution(
                sorted
            ),

        recentStateDistribution:
            calculateStateDistribution(
                recentRecords
            ),
    };
}


/*
|--------------------------------------------------------------------------
| Cadence classification
|--------------------------------------------------------------------------
|
| This is diagnostic only.
|
| It does NOT create observability intervals.
|--------------------------------------------------------------------------
*/

function classifyCadence(
    analysis
) {
    if (
        analysis.sampleCount ===
        0
    ) {
        return "NO_DATA";
    }


    if (
        analysis.sampleCount ===
        1
    ) {
        return "SINGLE_SAMPLE";
    }


    const medianGap =
        analysis
            .medianGapMinutes;

    const p95Gap =
        analysis
            .p95GapMinutes;


    if (
        !Number.isFinite(
            medianGap
        ) ||
        !Number.isFinite(
            p95Gap
        )
    ) {
        return "INSUFFICIENT_DATA";
    }


    /*
     * Tight gap distribution:
     * likely periodically sampled.
     */
    if (
        p95Gap <=
        medianGap * 3
    ) {
        return "LIKELY_PERIODIC";
    }


    /*
     * Highly irregular timing suggests
     * change-driven or sparse recording.
     */
    if (
        p95Gap >=
        medianGap * 8
    ) {
        return "LIKELY_CHANGE_DRIVEN_OR_SPARSE";
    }


    return "IRREGULAR_OR_MIXED";
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
        "ASHMAAN ACTIVE-SOURCE CADENCE AUDIT"
    );
    console.log(
        "================================================"
    );
    console.log(
        `Attribute ID: ${ACTIVE_SOURCE_ATTRIBUTE_ID}`
    );
    console.log(
        `Lookback: ${LOOKBACK_DAYS} days`
    );
    console.log(
        `Recent window: ${RECENT_HOURS} hours`
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


    const lookbackStart =
        new Date(
            periodEnd.getTime() -
            LOOKBACK_DAYS *
            24 *
            60 *
            60 *
            1000
        );


    const recentStart =
        new Date(
            periodEnd.getTime() -
            RECENT_HOURS *
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
                "_id vrmSiteId name status"
            )
            .lean();


    const installationIds =
        installations.map(
            (installation) =>
                installation._id
        );


    /*
    |--------------------------------------------------------------------------
    | Attribute 471 telemetry
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
                    lookbackStart,

                $lte:
                    periodEnd,
            },
        })
            .select(
                [
                    "installation",
                    "timestamp",
                    "numericValue",
                    "value",
                    "deviceType",
                    "deviceInstance",
                    "vrmAttributeId",
                ].join(" ")
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
    | Group records by installation
    |--------------------------------------------------------------------------
    */

    const recordsByInstallation =
        new Map();


    for (
        const record
        of telemetry
    ) {
        const installationId =
            String(
                record.installation
            );


        if (
            !recordsByInstallation.has(
                installationId
            )
        ) {
            recordsByInstallation.set(
                installationId,
                []
            );
        }


        recordsByInstallation
            .get(
                installationId
            )
            .push(
                record
            );
    }


    /*
    |--------------------------------------------------------------------------
    | Analyse detector-capable sites
    |--------------------------------------------------------------------------
    */

    const analyses =
        installations
            .map(
                (installation) => {
                    const records =
                        recordsByInstallation
                            .get(
                                String(
                                    installation._id
                                )
                            ) ??
                        [];


                    const analysis =
                        analyseInstallation({
                            installation,
                            records,
                            recentStart,
                        });


                    return {
                        ...analysis,

                        cadenceClassification:
                            classifyCadence(
                                analysis
                            ),
                    };
                }
            )
            .filter(
                (analysis) =>
                    analysis
                        .sampleCount >
                    0
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a.vrmSiteId
                    ) -
                    Number(
                        b.vrmSiteId
                    )
            );


    /*
    |--------------------------------------------------------------------------
    | Fleet summary
    |--------------------------------------------------------------------------
    */

    const detectorCapableCount =
        analyses.length;


    const recentObservableCount =
        analyses.filter(
            (analysis) =>
                analysis
                    .recentSampleCount >
                0
        ).length;


    const periodicCount =
        analyses.filter(
            (analysis) =>
                analysis
                    .cadenceClassification ===
                "LIKELY_PERIODIC"
        ).length;


    const changeDrivenCount =
        analyses.filter(
            (analysis) =>
                analysis
                    .cadenceClassification ===
                "LIKELY_CHANGE_DRIVEN_OR_SPARSE"
        ).length;


    const mixedCount =
        analyses.filter(
            (analysis) =>
                analysis
                    .cadenceClassification ===
                "IRREGULAR_OR_MIXED"
        ).length;


    const singleSampleCount =
        analyses.filter(
            (analysis) =>
                analysis
                    .cadenceClassification ===
                "SINGLE_SAMPLE"
        ).length;


    const allGaps =
        [];


    for (
        const analysis
        of analyses
    ) {
        if (
            Number.isFinite(
                analysis
                    .medianGapMinutes
            )
        ) {
            allGaps.push(
                analysis
                    .medianGapMinutes
            );
        }
    }


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "FLEET SUMMARY"
    );
    console.log(
        "================================================"
    );

    console.log(
        "Eligible VRM installations:",
        installations.length
    );

    console.log(
        "Installations with attribute 471:",
        detectorCapableCount
    );

    console.log(
        `Installations with 471 in last ${RECENT_HOURS}h:`,
        recentObservableCount
    );

    console.log(
        "Total 471 records:",
        telemetry.length
    );

    console.log(
        "Likely periodic:",
        periodicCount
    );

    console.log(
        "Likely change-driven/sparse:",
        changeDrivenCount
    );

    console.log(
        "Irregular/mixed:",
        mixedCount
    );

    console.log(
        "Single-sample sites:",
        singleSampleCount
    );

    console.log(
        "Median of site median gaps:",
        allGaps.length
            ? `${formatNumber(
                median(
                    allGaps
                )
            )} min`
            : "--"
    );


    /*
    |--------------------------------------------------------------------------
    | Per-site output
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "PER-INSTALLATION CADENCE"
    );
    console.log(
        "================================================"
    );


    for (
        const analysis
        of analyses
    ) {
        console.log("");
        console.log(
            "------------------------------------------------"
        );

        console.log(
            `Site: ${analysis.vrmSiteId} | ${analysis.name}`
        );

        console.log(
            "Classification:",
            analysis
                .cadenceClassification
        );

        console.log(
            "30-day sample count:",
            analysis
                .sampleCount
        );

        console.log(
            `Last ${RECENT_HOURS}h samples:`,
            analysis
                .recentSampleCount
        );

        console.log(
            "First sample:",
            formatDate(
                analysis
                    .firstTimestamp
            )
        );

        console.log(
            "Last sample:",
            formatDate(
                analysis
                    .lastTimestamp
            )
        );

        console.log(
            "Observed span:",
            `${formatNumber(
                analysis
                    .spanHours
            )} h`
        );

        console.log(
            "Unique days:",
            analysis
                .uniqueDays
        );

        console.log(
            "Median gap:",
            `${formatNumber(
                analysis
                    .medianGapMinutes
            )} min`
        );

        console.log(
            "P75 gap:",
            `${formatNumber(
                analysis
                    .p75GapMinutes
            )} min`
        );

        console.log(
            "P95 gap:",
            `${formatNumber(
                analysis
                    .p95GapMinutes
            )} min`
        );

        console.log(
            "Maximum gap:",
            `${formatNumber(
                analysis
                    .maximumGapMinutes
            )} min`
        );

        console.log(
            `Recent ${RECENT_HOURS}h median gap:`,
            `${formatNumber(
                analysis
                    .recentMedianGapMinutes
            )} min`
        );

        console.log(
            `Recent ${RECENT_HOURS}h P95 gap:`,
            `${formatNumber(
                analysis
                    .recentP95GapMinutes
            )} min`
        );

        console.log(
            "State transitions:",
            analysis
                .transitionCount
        );

        console.log(
            `Recent ${RECENT_HOURS}h transitions:`,
            analysis
                .recentTransitionCount
        );

        console.log(
            "State distribution:",
            JSON.stringify(
                analysis
                    .stateDistribution
            )
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Interpretation guard
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "INTERPRETATION"
    );
    console.log(
        "================================================"
    );

    console.log(
        "This audit is diagnostic only."
    );

    console.log(
        "No observability denominator has been changed."
    );

    console.log(
        "No Reliability KPI records were written."
    );

    console.log(
        "No Telemetry or Installation records were modified."
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
        "Active-source cadence audit failed:"
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