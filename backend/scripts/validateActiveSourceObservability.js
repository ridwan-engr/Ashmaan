import {
    deriveActiveSourceAcquisitionGaps,
    calculateActiveSourceExposure,
} from "../services/reliability/activeSourceObservabilityService.js";


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


function record(
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
        numericValue:
            1,
        source:
            "VRM",
    };
}


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN ACTIVE-SOURCE OBSERVABILITY VALIDATION"
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
     * Four of five sites share approximately the same
     * four-hour acquisition gap:
     *
     * ~02:00 → ~06:00
     *
     * Shared fraction = 4/5 = 80%.
     *
     * SITE-E continues normally and therefore does not
     * participate in the shared gap.
     */
    const telemetry = [
        record(
            "SITE-A",
            "2026-09-05T01:55:00.000Z"
        ),
        record(
            "SITE-A",
            "2026-09-05T06:05:00.000Z"
        ),

        record(
            "SITE-B",
            "2026-09-05T01:58:00.000Z"
        ),
        record(
            "SITE-B",
            "2026-09-05T06:02:00.000Z"
        ),

        record(
            "SITE-C",
            "2026-09-05T02:01:00.000Z"
        ),
        record(
            "SITE-C",
            "2026-09-05T05:59:00.000Z"
        ),

        record(
            "SITE-D",
            "2026-09-05T02:03:00.000Z"
        ),
        record(
            "SITE-D",
            "2026-09-05T06:04:00.000Z"
        ),

        /*
         * SITE E ordinary short cadence.
         */
        record(
            "SITE-E",
            "2026-09-05T02:00:00.000Z"
        ),
        record(
            "SITE-E",
            "2026-09-05T02:10:00.000Z"
        ),
        record(
            "SITE-E",
            "2026-09-05T02:20:00.000Z"
        ),
        record(
            "SITE-E",
            "2026-09-05T02:30:00.000Z"
        ),
    ];


    const result =
        deriveActiveSourceAcquisitionGaps({
            telemetry,

            detectorCapableInstallationIds:
                detectorIds,

            periodStart,

            periodEnd,

            config: {
                largeGapMinutes:
                    180,

                clusterToleranceMinutes:
                    10,

                minimumSharedSiteFraction:
                    0.8,
            },
        });


    console.log("");
    console.log(
        "DERIVATION"
    );
    console.log(
        "------------------------------------------------"
    );

    console.log(
        "Represented sites:",
        result
            .representedInstallationCount
    );

    console.log(
        "Candidate gaps:",
        result
            .candidateGapCount
    );

    console.log(
        "Clusters:",
        result
            .clusterCount
    );

    console.log(
        "Qualifying clusters:",
        result
            .qualifyingClusterCount
    );


    const cluster =
        result
            .qualifyingClusters[
                0
            ];


    console.log(
        "Shared fraction:",
        cluster
            ?.sharedSiteFraction
    );


    console.log(
        "Shared start:",
        cluster
            ?.start
            ?.toISOString()
    );


    console.log(
        "Shared end:",
        cluster
            ?.end
            ?.toISOString()
    );


    const exposure =
        calculateActiveSourceExposure({
            detectorCapableInstallationIds:
                detectorIds,

            periodStart,

            periodEnd,

            acquisitionGapIntervals:
                result
                    .mergedAcquisitionGapIntervals,
        });


    console.log("");
    console.log(
        "EXPOSURE"
    );
    console.log(
        "------------------------------------------------"
    );

    console.log(
        "Reporting hours:",
        exposure
            .reportingHours
    );

    console.log(
        "Excluded hours:",
        exposure
            .excludedHours
    );

    console.log(
        "Observable hours/site:",
        exposure
            .observableHoursPerSite
    );

    console.log(
        "Exposure site-hours:",
        exposure
            .exposureSiteHours
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
        "Represented site count"
    );


    assertEqual(
        result
            .qualifyingClusterCount,
        1,
        "Qualifying shared-gap clusters"
    );


    assertClose(
        cluster
            .sharedSiteFraction,
        0.8,
        0.000001,
        "Shared site fraction"
    );


    /*
     * Median boundaries:
     *
     * Starts:
     * 01:55, 01:58, 02:01, 02:03
     *
     * Median = 01:59:30
     *
     * Ends:
     * 05:59, 06:02, 06:04, 06:05
     *
     * Median = 06:03
     *
     * Excluded interval:
     * 4 h 03 m 30 s
     * = 4.058333333... h
     */
    assertClose(
        exposure
            .excludedHours,
        4.058333333333334,
        0.000001,
        "Shared acquisition exclusion hours"
    );


    /*
     * Reporting window = 12 h
     *
     * Observable/site:
     * 12 - 4.0583333333
     * = 7.9416666667 h
     *
     * 5 sites:
     * 39.7083333333 site-hours
     */
    assertClose(
        exposure
            .observableHoursPerSite,
        7.941666666666666,
        0.000001,
        "Observable hours per site"
    );


    assertClose(
        exposure
            .exposureSiteHours,
        39.70833333333333,
        0.000001,
        "Observable site-hours"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ACTIVE-SOURCE OBSERVABILITY VALIDATION PASSED"
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
        "Active-source observability validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}