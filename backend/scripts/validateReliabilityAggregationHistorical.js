// backend/scripts/validateReliabilityAggregationHistorical.js

import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

import OutageEvent from "../models/OutageEvent.js";
import Installation from "../models/Installation.js";
import Telemetry from "../models/Telemetry.js";

import {
    aggregateReliability,
} from "../services/reliability/reliabilityAggregationService.js";

import {
    deriveActiveSourceAcquisitionGaps,
    deriveActiveSourceBoundaryGaps,
} from "../services/reliability/activeSourceObservabilityService.js";


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

const TELEMETRY_CONTEXT_HOURS =
    48;


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


function percentage(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "--";
    }

    return (
        Number(value) *
        100
    ).toFixed(6);
}


function hours(seconds) {
    return (
        Number(seconds) /
        3600
    ).toFixed(6);
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
    if (
        !process.env.MONGODB_URI
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
        "ASHMAAN HISTORICAL RELIABILITY AGGREGATION VALIDATION"
    );
    console.log(
        "================================================"
    );
    console.log(
        "Mode: READ ONLY"
    );


    await mongoose.connect(
        process.env.MONGODB_URI
    );


    console.log(
        "MongoDB connected."
    );


    /*
    |--------------------------------------------------------------------------
    | Fixed 24-hour reporting window
    |--------------------------------------------------------------------------
    */

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


    const telemetryContextStart =
        new Date(
            periodEnd.getTime() -
            TELEMETRY_CONTEXT_HOURS *
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


    const detectorCapableInstallationIds =
        capabilityRows
            .map(
                (row) =>
                    normalizeId(
                        row._id
                    )
            )
            .filter(Boolean);


    /*
    |--------------------------------------------------------------------------
    | Telemetry for internal-gap derivation
    |--------------------------------------------------------------------------
    */

    const contextTelemetry =
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
    | Reporting-window telemetry for boundaries
    |--------------------------------------------------------------------------
    */

    const windowTelemetry =
        contextTelemetry.filter(
            (record) => {
                const timestamp =
                    new Date(
                        record.timestamp
                    );

                return (
                    timestamp >=
                        periodStart &&
                    timestamp <=
                        periodEnd
                );
            }
        );


    /*
    |--------------------------------------------------------------------------
    | Internal acquisition blind gaps
    |--------------------------------------------------------------------------
    */

    const internalObservability =
        deriveActiveSourceAcquisitionGaps({
            telemetry:
                contextTelemetry,

            detectorCapableInstallationIds,

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
    | Leading / trailing acquisition boundary gaps
    |--------------------------------------------------------------------------
    */

    const boundaryObservability =
        deriveActiveSourceBoundaryGaps({
            telemetry:
                windowTelemetry,

            detectorCapableInstallationIds,

            periodStart,
            periodEnd,

            config: {
                minimumSharedSiteFraction:
                    0.8,

                minimumBoundaryGapMinutes:
                    60,

                leadingToleranceMinutes:
                    90,

                trailingToleranceMinutes:
                    30,
            },
        });


    /*
    |--------------------------------------------------------------------------
    | Combined validated acquisition exclusions
    |--------------------------------------------------------------------------
    */

    const combinedGridAcquisitionGapIntervals =
        [
            ...internalObservability
                .mergedAcquisitionGapIntervals,

            ...boundaryObservability
                .boundaryGapIntervals,
        ];


    /*
    |--------------------------------------------------------------------------
    | Events overlapping reporting window
    |--------------------------------------------------------------------------
    */

    const events =
        await OutageEvent.find({
            eventType:
                "GRID_OUTAGE",

            source:
                "DERIVED",

            detectionMethod:
                "ACTIVE_SOURCE_TRANSITION",

            startTime: {
                $lt:
                    periodEnd,
            },

            $or: [
                {
                    restorationTime: {
                        $gt:
                            periodStart,
                    },
                },

                {
                    status:
                        "OPEN",
                },

                {
                    endTime: {
                        $gt:
                            periodStart,
                    },
                },
            ],
        })
            .sort({
                startTime:
                    1,
            })
            .lean();


    /*
    |--------------------------------------------------------------------------
    | Service observability remains unavailable
    |--------------------------------------------------------------------------
    */

    const serviceObservableInstallationIds =
        [];


    /*
    |--------------------------------------------------------------------------
    | Aggregate
    |--------------------------------------------------------------------------
    */

    const result =
        aggregateReliability({
            events,

            periodStart,
            periodEnd,

            gridObservableInstallationIds:
                detectorCapableInstallationIds,

            gridAcquisitionGapIntervals:
                combinedGridAcquisitionGapIntervals,

            serviceObservableInstallationIds,
        });


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
        result.period.start
            .toISOString()
    );

    console.log(
        "End:",
        result.period.end
            .toISOString()
    );

    console.log(
        "Duration:",
        `${result.period.durationHours.toFixed(
            6
        )} h`
    );

    console.log(
        "Eligible fleet population:",
        eligibleInstallations
            .length
    );

    console.log(
        "Detector-capable population:",
        detectorCapableInstallationIds
            .length
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "INTERNAL SHARED-GAP OBSERVABILITY"
    );
    console.log(
        "================================================"
    );

    console.log(
        "Represented installations:",
        internalObservability
            .representedInstallationCount
    );

    console.log(
        "Candidate gaps:",
        internalObservability
            .candidateGapCount
    );

    console.log(
        "Qualifying shared gaps:",
        internalObservability
            .qualifyingClusterCount
    );


    for (
        const interval
        of internalObservability
            .mergedAcquisitionGapIntervals
    ) {
        console.log({
            type:
                "INTERNAL_SHARED_ACQUISITION_GAP",

            start:
                interval.start
                    .toISOString(),

            end:
                interval.end
                    .toISOString(),

            durationHours:
                (
                    interval.end -
                    interval.start
                ) /
                3600000,
        });
    }


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "BOUNDARY OBSERVABILITY"
    );
    console.log(
        "================================================"
    );

    console.log(
        "Represented installations:",
        boundaryObservability
            .representedInstallationCount
    );

    console.log(
        "Unrepresented installations:",
        boundaryObservability
            .unrepresentedInstallationCount
    );


    if (
        boundaryObservability
            .leadingBoundary
    ) {
        console.log({
            type:
                boundaryObservability
                    .leadingBoundary
                    .type,

            start:
                boundaryObservability
                    .leadingBoundary
                    .start
                    .toISOString(),

            end:
                boundaryObservability
                    .leadingBoundary
                    .end
                    .toISOString(),

            durationHours:
                boundaryObservability
                    .leadingBoundary
                    .durationSeconds /
                3600,

            participants:
                boundaryObservability
                    .leadingBoundary
                    .participatingInstallationCount,

            fraction:
                boundaryObservability
                    .leadingBoundary
                    .sharedSiteFraction,
        });
    }


    if (
        boundaryObservability
            .trailingBoundary
    ) {
        console.log({
            type:
                boundaryObservability
                    .trailingBoundary
                    .type,

            start:
                boundaryObservability
                    .trailingBoundary
                    .start
                    .toISOString(),

            end:
                boundaryObservability
                    .trailingBoundary
                    .end
                    .toISOString(),

            durationHours:
                boundaryObservability
                    .trailingBoundary
                    .durationSeconds /
                3600,

            participants:
                boundaryObservability
                    .trailingBoundary
                    .participatingInstallationCount,

            fraction:
                boundaryObservability
                    .trailingBoundary
                    .sharedSiteFraction,
        });
    }


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "FINAL OBSERVABILITY EXPOSURE"
    );
    console.log(
        "================================================"
    );

    console.log(
        `Naive exposure: ${result.observability.gridSource.naiveExposureHours.toFixed(
            6
        )} site-h`
    );

    console.log(
        `Combined acquisition gaps: ${result.observability.gridSource.acquisitionGapCount}`
    );

    console.log(
        `Excluded time/site: ${result.observability.gridSource.excludedHoursPerSite.toFixed(
            6
        )} h`
    );

    console.log(
        `Observable time/site: ${result.observability.gridSource.observableHoursPerSite.toFixed(
            6
        )} h`
    );

    console.log(
        `Corrected exposure: ${result.observability.gridSource.exposureHours.toFixed(
            6
        )} site-h`
    );

    console.log(
        `Exposure removed: ${result.observability.gridSource.excludedExposureHours.toFixed(
            6
        )} site-h`
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "GRID-SOURCE RELIABILITY"
    );
    console.log(
        "================================================"
    );

    console.log(
        `Source events: ${result.gridSource.sourceEventCount}`
    );

    console.log(
        `Active episodes: ${result.gridSource.activeEpisodeCount}`
    );

    console.log(
        `Started episodes: ${result.gridSource.startedEpisodeCount}`
    );

    console.log(
        `Affected installations: ${result.gridSource.affectedInstallationCount}`
    );

    console.log(
        `Gross interruption site-hours: ${result.gridSource.grossInterruptionHours.toFixed(
            6
        )}`
    );

    console.log(
        `Excluded interruption site-hours: ${result.gridSource.excludedInterruptionHours.toFixed(
            6
        )}`
    );

    console.log(
        `Observable interruption site-hours: ${result.gridSource.interruptionHours.toFixed(
            6
        )}`
    );

    console.log(
        `Grid-source availability: ${percentage(
            result.gridSource.availability
        )}%`
    );

    console.log(
        `Grid-source unavailability: ${percentage(
            result.gridSource.unavailability
        )}%`
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "SERVICE / SAIDI-SAIFI / ENS SAFETY"
    );
    console.log(
        "================================================"
    );

    console.log(
        `Service availability status: ${result.service.availabilityStatus}`
    );

    console.log(
        `Eligible SAIDI/SAIFI events: ${result.saidiSaifiFoundation.eligibleEventCount}`
    );

    console.log(
        `Eligible started SAIFI episodes: ${result.saidiSaifiFoundation.startedEpisodeCount}`
    );

    console.log(
        `ENS eligible events: ${result.ensFoundation.eligibleEventCount}`
    );

    console.log(
        `Qualified ENS: ${result.ensFoundation.totalEnsKwh.toFixed(
            6
        )} kWh`
    );


    /*
    |--------------------------------------------------------------------------
    | Validation checks
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
        eligibleInstallations
            .length ===
            74,
        "Eligible fleet remains 74"
    );


    assertTrue(
        detectorCapableInstallationIds
            .length ===
            30,
        "Detector-capable population remains 30"
    );


    assertTrue(
        internalObservability
            .qualifyingClusterCount >=
            1,
        "Internal shared acquisition gap detected"
    );


    assertTrue(
        Boolean(
            boundaryObservability
                .leadingBoundary
        ),
        "Leading acquisition boundary detected"
    );


    assertTrue(
        Boolean(
            boundaryObservability
                .trailingBoundary
        ),
        "Trailing acquisition boundary detected"
    );


    assertTrue(
        result
            .observability
            .gridSource
            .acquisitionGapCount >=
            3,
        "Combined observability contains at least three exclusions"
    );


    assertTrue(
        result
            .observability
            .gridSource
            .exposureSeconds <
            result
                .observability
                .gridSource
                .naiveExposureSeconds,
        "Historical exposure is corrected below naive exposure"
    );


    assertTrue(
        result
            .gridSource
            .interruptionSeconds <=
            result
                .gridSource
                .grossInterruptionSeconds,
        "Observable interruption time does not exceed gross interruption time"
    );


    assertTrue(
        result
            .gridSource
            .startedEpisodeCount <=
            result
                .gridSource
                .activeEpisodeCount,
        "Started episodes do not exceed active episodes"
    );


    assertTrue(
        result
            .gridSource
            .availability ===
            null ||
        (
            result
                .gridSource
                .availability >=
                0 &&
            result
                .gridSource
                .availability <=
                1
        ),
        "Grid availability remains bounded"
    );


    assertTrue(
        result
            .service
            .availabilityStatus ===
            "NOT_OBSERVABLE",
        "Service availability remains NOT_OBSERVABLE"
    );


    assertTrue(
        result
            .saidiSaifiFoundation
            .eligibleEventCount ===
            0,
        "No unsupported SAIDI/SAIFI events introduced"
    );


    assertTrue(
        result
            .ensFoundation
            .eligibleEventCount ===
            0,
        "No unsupported ENS events introduced"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "HISTORICAL RELIABILITY AGGREGATION VALIDATION PASSED"
    );
    console.log(
        "================================================"
    );


    console.log("");
    console.log(
        "No Reliability KPI records were written."
    );

    console.log(
        "No OutageEvent records were modified."
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
        "Historical reliability aggregation validation failed:"
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