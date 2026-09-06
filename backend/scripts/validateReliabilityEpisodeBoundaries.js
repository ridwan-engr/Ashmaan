// backend/scripts/validateReliabilityEpisodeBoundaries.js

import {
    calculateReliabilitySiteTime,
} from "../services/reliability/reliabilityEpisodeService.js";


function assertEqual(
    actual,
    expected,
    label
) {
    if (
        actual !== expected
    ) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


function assertClose(
    actual,
    expected,
    tolerance,
    label
) {
    if (
        Math.abs(
            actual -
            expected
        ) >
        tolerance
    ) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


function makeEvent({
    id,
    installation,
    startTime,
    restorationTime,
    status = "RESTORED",
}) {
    return {
        _id:
            id,

        installation,

        eventType:
            "GRID_OUTAGE",

        source:
            "DERIVED",

        status,

        startTime:
            new Date(
                startTime
            ),

        restorationTime:
            restorationTime
                ? new Date(
                    restorationTime
                )
                : null,

        detectionMethod:
            "ACTIVE_SOURCE_TRANSITION",
    };
}


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN RELIABILITY EPISODE BOUNDARY VALIDATION"
    );
    console.log(
        "================================================"
    );


    /*
     * Reporting window:
     *
     * 00:00 → 04:00
     */
    const periodStart =
        new Date(
            "2026-09-05T00:00:00.000Z"
        );

    const periodEnd =
        new Date(
            "2026-09-05T04:00:00.000Z"
        );


    const events = [
        /*
         * SITE A
         *
         * Started BEFORE reporting window.
         *
         * Actual event:
         * 23:30 → 00:30
         *
         * Reporting contribution:
         * 00:00 → 00:30 = 0.5 h
         *
         * Duration: YES
         * Frequency start: NO
         */
        makeEvent({
            id:
                "A1",

            installation:
                "SITE-A",

            startTime:
                "2026-09-04T23:30:00.000Z",

            restorationTime:
                "2026-09-05T00:30:00.000Z",
        }),


        /*
         * SITE A
         *
         * Starts inside reporting period.
         *
         * 01:00 → 02:00
         *
         * Duration: 1 h
         * Frequency start: YES
         */
        makeEvent({
            id:
                "A2",

            installation:
                "SITE-A",

            startTime:
                "2026-09-05T01:00:00.000Z",

            restorationTime:
                "2026-09-05T02:00:00.000Z",
        }),


        /*
         * SITE B
         *
         * Two overlapping raw records representing
         * one physical episode:
         *
         * B1: 02:00 → 03:00
         * B2: 02:30 → 03:30
         *
         * Merged:
         * 02:00 → 03:30 = 1.5 h
         *
         * Raw events: 2
         * Physical episodes: 1
         * Frequency starts: 1
         */
        makeEvent({
            id:
                "B1",

            installation:
                "SITE-B",

            startTime:
                "2026-09-05T02:00:00.000Z",

            restorationTime:
                "2026-09-05T03:00:00.000Z",
        }),

        makeEvent({
            id:
                "B2",

            installation:
                "SITE-B",

            startTime:
                "2026-09-05T02:30:00.000Z",

            restorationTime:
                "2026-09-05T03:30:00.000Z",
        }),


        /*
         * SITE C
         *
         * OPEN event starts during the reporting period.
         *
         * It is clipped at periodEnd:
         *
         * 03:30 → 04:00 = 0.5 h
         *
         * Duration: YES
         * Frequency start: YES
         */
        makeEvent({
            id:
                "C1",

            installation:
                "SITE-C",

            startTime:
                "2026-09-05T03:30:00.000Z",

            restorationTime:
                null,

            status:
                "OPEN",
        }),


        /*
         * SITE D
         *
         * Event begins exactly at periodEnd.
         *
         * Half-open convention:
         *
         * [periodStart, periodEnd)
         *
         * Therefore it belongs to the NEXT reporting period.
         */
        makeEvent({
            id:
                "D1",

            installation:
                "SITE-D",

            startTime:
                "2026-09-05T04:00:00.000Z",

            restorationTime:
                "2026-09-05T04:30:00.000Z",
        }),
    ];


    const result =
        calculateReliabilitySiteTime({
            events,
            periodStart,
            periodEnd,
        });


    console.log("");
    console.log(
        "RESULTS"
    );
    console.log(
        "------------------------------------------------"
    );

    console.log(
        "Raw source events:",
        events.length
    );

    console.log(
        "Active episodes:",
        result.activeEpisodeCount
    );

    console.log(
        "Started episodes:",
        result.startedEpisodeCount
    );

    console.log(
        "Affected installations:",
        result.affectedInstallationCount
    );

    console.log(
        "Interruption site-hours:",
        result.totalHours
    );


    console.log("");
    console.log(
        "SITE BREAKDOWN"
    );
    console.log(
        "------------------------------------------------"
    );


    for (
        const site
        of result.siteBreakdown
    ) {
        console.log("");
        console.log(
            `Installation: ${site.installationId}`
        );

        console.log(
            `Raw events: ${site.sourceEventCount}`
        );

        console.log(
            `Active episodes: ${site.activeEpisodeCount}`
        );

        console.log(
            `Started episodes: ${site.startedEpisodeCount}`
        );

        console.log(
            `Interruption hours: ${site.interruptionHours}`
        );


        for (
            const episode
            of site.episodes
        ) {
            console.log(
                "  Episode:",
                {
                    start:
                        episode
                            .start
                            .toISOString(),

                    end:
                        episode
                            .end
                            .toISOString(),

                    originalStart:
                        episode
                            .originalStart
                            .toISOString(),

                    startedInPeriod:
                        episode
                            .startedInPeriod,

                    durationSeconds:
                        episode
                            .durationSeconds,

                    sourceEventIds:
                        episode
                            .sourceEventIds,
                }
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Assertions
    |--------------------------------------------------------------------------
    |
    | SITE A:
    |   0.5 h carried into window
    |   1.0 h newly started
    |   = 1.5 h
    |   active episodes = 2
    |   started episodes = 1
    |
    | SITE B:
    |   overlapping records merge
    |   = 1.5 h
    |   active episodes = 1
    |   started episodes = 1
    |
    | SITE C:
    |   OPEN event clipped at periodEnd
    |   = 0.5 h
    |   active episodes = 1
    |   started episodes = 1
    |
    | TOTAL:
    |
    | interruption site-hours = 3.5
    | active episodes          = 4
    | started episodes         = 3
    | affected installations   = 3
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "ASSERTIONS"
    );
    console.log(
        "------------------------------------------------"
    );


    assertEqual(
        result.activeEpisodeCount,
        4,
        "Active episode count"
    );


    assertEqual(
        result.startedEpisodeCount,
        3,
        "Started episode count"
    );


    assertEqual(
        result.affectedInstallationCount,
        3,
        "Affected installation count"
    );


    assertClose(
        result.totalHours,
        3.5,
        0.000001,
        "Interruption site-hours"
    );


    const siteA =
        result.siteBreakdown.find(
            (site) =>
                site.installationId ===
                "SITE-A"
        );


    const siteB =
        result.siteBreakdown.find(
            (site) =>
                site.installationId ===
                "SITE-B"
        );


    const siteC =
        result.siteBreakdown.find(
            (site) =>
                site.installationId ===
                "SITE-C"
        );


    assertEqual(
        siteA?.activeEpisodeCount,
        2,
        "SITE-A active episodes"
    );


    assertEqual(
        siteA?.startedEpisodeCount,
        1,
        "SITE-A started episodes"
    );


    assertClose(
        siteA?.interruptionHours,
        1.5,
        0.000001,
        "SITE-A interruption hours"
    );


    assertEqual(
        siteB?.sourceEventCount,
        2,
        "SITE-B source events"
    );


    assertEqual(
        siteB?.activeEpisodeCount,
        1,
        "SITE-B merged active episodes"
    );


    assertEqual(
        siteB?.startedEpisodeCount,
        1,
        "SITE-B started episodes"
    );


    assertClose(
        siteB?.interruptionHours,
        1.5,
        0.000001,
        "SITE-B interruption hours"
    );


    assertEqual(
        siteC?.activeEpisodeCount,
        1,
        "SITE-C active episodes"
    );


    assertEqual(
        siteC?.startedEpisodeCount,
        1,
        "SITE-C started episodes"
    );


    assertClose(
        siteC?.interruptionHours,
        0.5,
        0.000001,
        "SITE-C interruption hours"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "EPISODE BOUNDARY VALIDATION PASSED"
    );
    console.log(
        "================================================"
    );
}


try {
    run();
}
catch (error) {
    console.error("");
    console.error(
        "Episode boundary validation failed:"
    );

    console.error(
        error
    );

    process.exitCode = 1;
}