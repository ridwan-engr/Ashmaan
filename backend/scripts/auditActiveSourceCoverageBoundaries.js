// backend/scripts/auditActiveSourceCoverageBoundaries.js

import "dotenv/config";

import dns from "dns";
import mongoose from "mongoose";

import Installation from "../models/Installation.js";
import Telemetry from "../models/Telemetry.js";


dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);


const ACTIVE_SOURCE_ATTRIBUTE_ID =
    471;

const REPORTING_HOURS =
    24;

const CAPABILITY_LOOKBACK_DAYS =
    30;


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
        clean.length %
            2 ===
        0
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


function formatHours(
    milliseconds
) {
    if (
        milliseconds ===
            null ||
        milliseconds ===
            undefined ||
        !Number.isFinite(
            Number(
                milliseconds
            )
        )
    ) {
        return "--";
    }

    return (
        Number(
            milliseconds
        ) /
        3600000
    ).toFixed(
        6
    );
}


/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

async function run() {
    if (
        !process.env
            .MONGODB_URI
    ) {
        throw new Error(
            "MONGODB_URI is not defined."
        );
    }


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN ACTIVE-SOURCE COVERAGE BOUNDARY AUDIT"
    );
    console.log(
        "================================================"
    );
    console.log(
        "Mode: READ ONLY"
    );


    await mongoose.connect(
        process.env
            .MONGODB_URI
    );


    console.log(
        "MongoDB connected."
    );


    const periodEnd =
        new Date();


    const periodStart =
        new Date(
            periodEnd.getTime() -
            REPORTING_HOURS *
            60 *
            60 *
            1000
        );


    const capabilityStart =
        new Date(
            periodEnd.getTime() -
            CAPABILITY_LOOKBACK_DAYS *
            24 *
            60 *
            60 *
            1000
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
    | Detector-capable population
    |--------------------------------------------------------------------------
    */

    const capabilityRows =
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
                            capabilityStart,

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


    const detectorIds =
        capabilityRows
            .map(
                (row) =>
                    normalizeId(
                        row._id
                    )
            )
            .filter(
                Boolean
            );


    const detectorIdSet =
        new Set(
            detectorIds
        );


    const installationLookup =
        new Map(
            eligibleInstallations.map(
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
    | Reporting-window telemetry
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
                    capabilityRows.map(
                        (row) =>
                            row._id
                    ),
            },

            timestamp: {
                $gte:
                    periodStart,

                $lte:
                    periodEnd,
            },
        })
            .select(
                "installation timestamp"
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
    | First / last sample per installation
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
            !installationId ||
            !detectorIdSet.has(
                installationId
            )
        ) {
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
            .push(
                new Date(
                    record.timestamp
                )
            );
    }


    const rows =
        [];


    for (
        const installationId
        of detectorIds
    ) {
        const timestamps =
            (
                byInstallation.get(
                    installationId
                ) ??
                []
            )
                .filter(
                    (timestamp) =>
                        !Number.isNaN(
                            timestamp
                                .getTime()
                        )
                )
                .sort(
                    (a, b) =>
                        a - b
                );


        const installation =
            installationLookup.get(
                installationId
            );


        const first =
            timestamps.length
                ? timestamps[0]
                : null;


        const last =
            timestamps.length
                ? timestamps[
                    timestamps.length -
                    1
                ]
                : null;


        rows.push({
            installationId,

            vrmSiteId:
                installation
                    ?.vrmSiteId ??
                null,

            name:
                installation
                    ?.name ??
                null,

            sampleCount:
                timestamps.length,

            first,

            last,

            leadingGapMs:
                first
                    ? first.getTime() -
                        periodStart
                            .getTime()
                    : null,

            trailingGapMs:
                last
                    ? periodEnd
                        .getTime() -
                        last
                            .getTime()
                    : null,
        });
    }


    const represented =
        rows.filter(
            (row) =>
                row.sampleCount >
                0
        );


    const unrepresented =
        rows.filter(
            (row) =>
                row.sampleCount ===
                0
        );


    const firstTimes =
        represented.map(
            (row) =>
                row.first
                    .getTime()
        );


    const lastTimes =
        represented.map(
            (row) =>
                row.last
                    .getTime()
        );


    const medianFirstMs =
        median(
            firstTimes
        );


    const medianLastMs =
        median(
            lastTimes
        );


    const medianFirst =
        medianFirstMs !==
            null
            ? new Date(
                medianFirstMs
            )
            : null;


    const medianLast =
        medianLastMs !==
            null
            ? new Date(
                medianLastMs
            )
            : null;


    const medianLeadingGapMs =
        medianFirst
            ? medianFirst
                .getTime() -
                periodStart
                    .getTime()
            : null;


    const medianTrailingGapMs =
        medianLast
            ? periodEnd
                .getTime() -
                medianLast
                    .getTime()
            : null;


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
        "REPORTING WINDOW"
    );
    console.log(
        "================================================"
    );


    console.log(
        "Start:",
        periodStart
            .toISOString()
    );

    console.log(
        "End:",
        periodEnd
            .toISOString()
    );

    console.log(
        "Duration:",
        `${REPORTING_HOURS} h`
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "POPULATION"
    );
    console.log(
        "================================================"
    );


    console.log(
        "Eligible installations:",
        eligibleInstallations
            .length
    );

    console.log(
        "Detector-capable installations:",
        detectorIds
            .length
    );

    console.log(
        "Represented inside window:",
        represented
            .length
    );

    console.log(
        "No attribute-471 samples inside window:",
        unrepresented
            .length
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "FLEET COVERAGE BOUNDARIES"
    );
    console.log(
        "================================================"
    );


    console.log(
        "Median first sample:",
        medianFirst
            ? medianFirst
                .toISOString()
            : "--"
    );

    console.log(
        "Median leading boundary gap:",
        medianLeadingGapMs !==
            null
            ? `${formatHours(
                medianLeadingGapMs
            )} h`
            : "--"
    );


    console.log(
        "Median last sample:",
        medianLast
            ? medianLast
                .toISOString()
            : "--"
    );

    console.log(
        "Median trailing boundary gap:",
        medianTrailingGapMs !==
            null
            ? `${formatHours(
                medianTrailingGapMs
            )} h`
            : "--"
    );


    /*
    |--------------------------------------------------------------------------
    | Per-site boundary data
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "PER-INSTALLATION BOUNDARIES"
    );
    console.log(
        "================================================"
    );


    for (
        const row
        of rows
    ) {
        console.log("");
        console.log(
            "------------------------------------------------"
        );

        console.log(
            `Site: ${row.vrmSiteId} | ${row.name}`
        );

        console.log(
            "Samples:",
            row.sampleCount
        );

        console.log(
            "First:",
            row.first
                ? row.first
                    .toISOString()
                : "--"
        );

        console.log(
            "Leading gap:",
            row.leadingGapMs !==
                null
                ? `${formatHours(
                    row.leadingGapMs
                )} h`
                : "--"
        );

        console.log(
            "Last:",
            row.last
                ? row.last
                    .toISOString()
                : "--"
        );

        console.log(
            "Trailing gap:",
            row.trailingGapMs !==
                null
                ? `${formatHours(
                    row.trailingGapMs
                )} h`
                : "--"
        );
    }


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
        "No observability denominator was changed."
    );

    console.log(
        "No reliability KPI records were written."
    );

    console.log(
        "No Telemetry records were modified."
    );
}


try {
    await run();
}
catch (error) {
    console.error("");
    console.error(
        "Coverage boundary audit failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}
finally {
    await mongoose.disconnect();

    console.log("");
    console.log(
        "MongoDB disconnected."
    );
}