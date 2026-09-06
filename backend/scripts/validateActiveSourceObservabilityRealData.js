// backend/scripts/validateActiveSourceObservabilityRealData.js

import "dotenv/config";

import dns from "dns";
import mongoose from "mongoose";

import {
    Installation,
    Telemetry,
} from "../models/index.js";

import {
    deriveActiveSourceAcquisitionGaps,
    calculateActiveSourceExposure,
} from "../services/reliability/activeSourceObservabilityService.js";


/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const ACTIVE_SOURCE_ATTRIBUTE_ID =
    471;

const TELEMETRY_CONTEXT_HOURS =
    48;

const REPORTING_WINDOW_HOURS =
    24;


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


function formatHours(value) {
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
        .toFixed(6);
}


function formatPercent(value) {
    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value)
        )
    ) {
        return "--";
    }

    return (
        Number(value) *
        100
    ).toFixed(4) + "%";
}


function assertTrue(
    condition,
    label
) {
    if (!condition) {
        throw new Error(
            `FAILED: ${label}`
        );
    }

    console.log(
        `PASS: ${label}`
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
        "ASHMAAN REAL-DATA ACTIVE-SOURCE OBSERVABILITY VALIDATION"
    );
    console.log(
        "================================================"
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


    /*
    |--------------------------------------------------------------------------
    | Reporting window
    |--------------------------------------------------------------------------
    |
    | We intentionally use a 24-hour reporting window.
    |
    | The telemetry query itself is wider (48 h), because detection of a
    | gap requires a sample on BOTH sides of the gap.
    |--------------------------------------------------------------------------
    */

    const periodEnd =
        new Date();


    const periodStart =
        new Date(
            periodEnd.getTime() -
            REPORTING_WINDOW_HOURS *
            60 *
            60 *
            1000
        );


    const telemetryContextStart =
        new Date(
            periodEnd.getTime() -
            TELEMETRY_CONTEXT_HOURS *
            60 *
            60 *
            1000
        );


    console.log("");
    console.log(
        "REPORTING WINDOW"
    );
    console.log(
        "------------------------------------------------"
    );

    console.log(
        "Start:",
        periodStart.toISOString()
    );

    console.log(
        "End:",
        periodEnd.toISOString()
    );

    console.log(
        "Duration:",
        `${REPORTING_WINDOW_HOURS} h`
    );


    /*
    |--------------------------------------------------------------------------
    | Eligible fleet
    |--------------------------------------------------------------------------
    */

    const eligibleInstallations =
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


    const eligibleIds =
        eligibleInstallations.map(
            (installation) =>
                installation._id
        );


    /*
    |--------------------------------------------------------------------------
    | Attribute-471 detector capability
    |--------------------------------------------------------------------------
    |
    | Detector-capable means the installation has demonstrated attribute
    | 471 availability in stored telemetry.
    |
    | Use the same 30-day capability concept already validated in 7.8B.
    |--------------------------------------------------------------------------
    */

    const capabilityLookbackStart =
        new Date(
            periodEnd.getTime() -
            30 *
            24 *
            60 *
            60 *
            1000
        );


    const detectorCapabilityRows =
        await Telemetry.aggregate([
            {
                $match: {
                    source:
                        "VRM",

                    vrmAttributeId:
                        ACTIVE_SOURCE_ATTRIBUTE_ID,

                    installation: {
                        $in:
                            eligibleIds,
                    },

                    timestamp: {
                        $gte:
                            capabilityLookbackStart,

                        $lte:
                            periodEnd,
                    },
                },
            },

            {
                $group: {
                    _id:
                        "$installation",
                },
            },
        ]);


    const detectorCapableIds =
        detectorCapabilityRows
            .map(
                (row) =>
                    normalizeId(
                        row._id
                    )
            )
            .filter(
                Boolean
            );


    /*
    |--------------------------------------------------------------------------
    | Telemetry context
    |--------------------------------------------------------------------------
    |
    | Wider than reporting period so shared gaps crossing the reporting
    | boundary can still be detected correctly.
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
                    detectorCapabilityRows.map(
                        (row) =>
                            row._id
                    ),
            },

            timestamp: {
                $gte:
                    telemetryContextStart,

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
    | Shared-gap derivation
    |--------------------------------------------------------------------------
    */

    const observability =
        deriveActiveSourceAcquisitionGaps({
            telemetry,

            detectorCapableInstallationIds:
                detectorCapableIds,

            periodStart,

            periodEnd,

            config: {
                largeGapMinutes:
                    180,

                clusterToleranceMinutes:
                    30,

                minimumSharedSiteFraction:
                    0.8,
            },
        });


    /*
    |--------------------------------------------------------------------------
    | Corrected exposure
    |--------------------------------------------------------------------------
    */

    const correctedExposure =
        calculateActiveSourceExposure({
            detectorCapableInstallationIds:
                detectorCapableIds,

            periodStart,

            periodEnd,

            acquisitionGapIntervals:
                observability
                    .mergedAcquisitionGapIntervals,
        });


    /*
    |--------------------------------------------------------------------------
    | Naive capability exposure
    |--------------------------------------------------------------------------
    */

    const reportingHours =
        (
            periodEnd.getTime() -
            periodStart.getTime()
        ) /
        3600000;


    const naiveExposureSiteHours =
        detectorCapableIds.length *
        reportingHours;


    const removedExposureSiteHours =
        naiveExposureSiteHours -
        correctedExposure
            .exposureSiteHours;


    /*
    |--------------------------------------------------------------------------
    | Output
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "DETECTOR CAPABILITY"
    );
    console.log(
        "================================================"
    );

    console.log(
        "Eligible VRM installations:",
        eligibleInstallations.length
    );

    console.log(
        "Detector-capable installations:",
        detectorCapableIds.length
    );

    console.log(
        "Attribute-471 records in context:",
        telemetry.length
    );

    console.log(
        "Represented installations:",
        observability
            .representedInstallationCount
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "SHARED ACQUISITION GAP DETECTION"
    );
    console.log(
        "================================================"
    );

    console.log(
        "Candidate gaps:",
        observability
            .candidateGapCount
    );

    console.log(
        "Gap clusters:",
        observability
            .clusterCount
    );

    console.log(
        "Qualifying shared-gap clusters:",
        observability
            .qualifyingClusterCount
    );


    for (
        let index = 0;
        index <
        observability
            .qualifyingClusters
            .length;
        index += 1
    ) {
        const cluster =
            observability
                .qualifyingClusters[
                    index
                ];


        console.log("");
        console.log(
            `Shared cluster ${index + 1}`
        );

        console.log(
            "Participating installations:",
            cluster
                .sharedInstallationCount
        );

        console.log(
            "Represented denominator:",
            cluster
                .denominatorSiteCount
        );

        console.log(
            "Shared fraction:",
            formatPercent(
                cluster
                    .sharedSiteFraction
            )
        );

        console.log(
            "Representative start:",
            cluster
                .start
                .toISOString()
        );

        console.log(
            "Representative end:",
            cluster
                .end
                .toISOString()
        );

        console.log(
            "Duration:",
            `${formatHours(
                cluster
                    .durationSeconds /
                3600
            )} h`
        );
    }


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "OBSERVABILITY EXPOSURE"
    );
    console.log(
        "================================================"
    );

    console.log(
        "Reporting hours:",
        formatHours(
            reportingHours
        )
    );

    console.log(
        "Naive detector-capability exposure:",
        `${formatHours(
            naiveExposureSiteHours
        )} site-h`
    );

    console.log(
        "Excluded acquisition time/site:",
        `${formatHours(
            correctedExposure
                .excludedHours
        )} h`
    );

    console.log(
        "Observable time/site:",
        `${formatHours(
            correctedExposure
                .observableHoursPerSite
        )} h`
    );

    console.log(
        "Corrected exposure:",
        `${formatHours(
            correctedExposure
                .exposureSiteHours
        )} site-h`
    );

    console.log(
        "Exposure removed:",
        `${formatHours(
            removedExposureSiteHours
        )} site-h`
    );


    /*
    |--------------------------------------------------------------------------
    | Consistency validation
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASSERTIONS"
    );
    console.log(
        "================================================"
    );


    assertTrue(
        eligibleInstallations.length ===
            74,
        "Eligible fleet remains 74 installations"
    );


    assertTrue(
        detectorCapableIds.length ===
            30,
        "Detector-capable population remains 30"
    );


    assertTrue(
        observability
            .representedInstallationCount >=
            25,
        "At least 25 detector-capable installations represented in telemetry context"
    );


    assertTrue(
        observability
            .qualifyingClusterCount >=
            1,
        "At least one shared acquisition gap qualifies"
    );


    const strongestCluster =
        observability
            .qualifyingClusters
            .slice()
            .sort(
                (a, b) =>
                    b.sharedSiteFraction -
                    a.sharedSiteFraction
            )[0];


    assertTrue(
        strongestCluster &&
        strongestCluster
            .sharedSiteFraction >=
            0.8,
        "Strongest shared gap meets 80% participation threshold"
    );


    assertTrue(
        correctedExposure
            .excludedHours >
            0,
        "Acquisition blind time is excluded"
    );


    assertTrue(
        correctedExposure
            .exposureSiteHours <
            naiveExposureSiteHours,
        "Corrected exposure is lower than naive capability exposure"
    );


    assertTrue(
        correctedExposure
            .exposureSiteHours >=
            0,
        "Corrected exposure cannot be negative"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "REAL-DATA OBSERVABILITY VALIDATION PASSED"
    );
    console.log(
        "================================================"
    );

    console.log("");
    console.log(
        "No reliability KPI records were written."
    );

    console.log(
        "No Telemetry records were modified."
    );

    console.log(
        "No Installation records were modified."
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
        "Real-data observability validation failed:"
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