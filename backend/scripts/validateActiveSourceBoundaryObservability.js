import {
    deriveActiveSourceBoundaryGaps,
    calculateActiveSourceExposure,
} from "../services/reliability/activeSourceObservabilityService.js";


function telemetry(
    installation,
    timestamp
) {
    return {
        installation,
        timestamp:
            new Date(
                timestamp
            ),
        vrmAttributeId:
            471,
    };
}


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


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN ACTIVE-SOURCE BOUNDARY VALIDATION"
    );
    console.log(
        "================================================"
    );


    const periodStart =
        new Date(
            "2026-09-05T00:00:00.000Z"
        );


    const periodEnd =
        new Date(
            "2026-09-05T12:00:00.000Z"
        );


    const detectorIds = [
        "SITE-A",
        "SITE-B",
        "SITE-C",
        "SITE-D",
        "SITE-E",
    ];


    /*
     * Four sites begin around 02:00 and end around 10:00.
     *
     * SITE-E is deliberately sparse/outlying.
     *
     * Median first:
     * 01:55, 01:58, 02:01, 02:03, 05:00
     * => 02:01
     *
     * Median last:
     * 07:00, 09:57, 10:00, 10:02, 10:04
     * => 10:00
     */
    const records = [
        telemetry(
            "SITE-A",
            "2026-09-05T01:55:00.000Z"
        ),
        telemetry(
            "SITE-A",
            "2026-09-05T10:00:00.000Z"
        ),

        telemetry(
            "SITE-B",
            "2026-09-05T01:58:00.000Z"
        ),
        telemetry(
            "SITE-B",
            "2026-09-05T09:57:00.000Z"
        ),

        telemetry(
            "SITE-C",
            "2026-09-05T02:01:00.000Z"
        ),
        telemetry(
            "SITE-C",
            "2026-09-05T10:02:00.000Z"
        ),

        telemetry(
            "SITE-D",
            "2026-09-05T02:03:00.000Z"
        ),
        telemetry(
            "SITE-D",
            "2026-09-05T10:04:00.000Z"
        ),

        /*
         * Deliberate outlier.
         */
        telemetry(
            "SITE-E",
            "2026-09-05T05:00:00.000Z"
        ),
        telemetry(
            "SITE-E",
            "2026-09-05T07:00:00.000Z"
        ),
    ];


    const result =
        deriveActiveSourceBoundaryGaps({
            telemetry:
                records,

            detectorCapableInstallationIds:
                detectorIds,

            periodStart,
            periodEnd,

            config: {
                minimumSharedSiteFraction:
                    0.8,

                minimumBoundaryGapMinutes:
                    60,

                leadingToleranceMinutes:
                    15,

                trailingToleranceMinutes:
                    15,
            },
        });


    console.log("");
    console.log(
        "RESULT"
    );
    console.log(
        "------------------------------------------------"
    );


    console.log(
        "Represented:",
        result
            .representedInstallationCount
    );


    console.log(
        "Leading boundary:",
        result
            .leadingBoundary
    );


    console.log(
        "Trailing boundary:",
        result
            .trailingBoundary
    );


    console.log("");
    console.log(
        "ASSERTIONS"
    );
    console.log(
        "------------------------------------------------"
    );


    assertEqual(
        result
            .representedInstallationCount,
        5,
        "Represented installations"
    );


    assertEqual(
        result
            .boundaryGapIntervals
            .length,
        2,
        "Two fleet boundary gaps qualify"
    );


    assertClose(
        result
            .leadingBoundary
            .sharedSiteFraction,
        0.8,
        0.000001,
        "Leading shared fraction"
    );


    assertClose(
        result
            .trailingBoundary
            .sharedSiteFraction,
        0.8,
        0.000001,
        "Trailing shared fraction"
    );


    /*
     * Leading:
     * 00:00 → 02:01
     * = 2.0166666667 h
     */
    assertClose(
        result
            .leadingBoundary
            .durationSeconds /
            3600,
        2.0166666666666666,
        0.000001,
        "Leading exclusion duration"
    );


    /*
     * Trailing:
     * 10:00 → 12:00
     * = 2 h
     */
    assertClose(
        result
            .trailingBoundary
            .durationSeconds /
            3600,
        2,
        0.000001,
        "Trailing exclusion duration"
    );


    const exposure =
        calculateActiveSourceExposure({
            detectorCapableInstallationIds:
                detectorIds,

            periodStart,
            periodEnd,

            acquisitionGapIntervals:
                result
                    .boundaryGapIntervals,
        });


    /*
     * 12 h
     * - 2.0166667 h
     * - 2 h
     * = 7.9833333 observable h/site
     *
     * × 5 sites
     * = 39.9166667 site-h
     */
    assertClose(
        exposure
            .observableHoursPerSite,
        7.983333333333333,
        0.000001,
        "Observable hours/site"
    );


    assertClose(
        exposure
            .exposureSiteHours,
        39.916666666666664,
        0.000001,
        "Observable site-hours"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ACTIVE-SOURCE BOUNDARY VALIDATION PASSED"
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
        "Boundary observability validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}