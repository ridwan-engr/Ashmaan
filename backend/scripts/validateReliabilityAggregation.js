// backend/scripts/validateReliabilityAggregation.js

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
} from "../services/reliability/activeSourceObservabilityService.js";


dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);


const OBSERVABILITY_LOOKBACK_DAYS =
    30;

const ACQUISITION_CONTEXT_HOURS =
    48;

const ACTIVE_SOURCE_ATTRIBUTE_ID =
    471;


function percentage(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "--";
    }

    return (
        value *
        100
    ).toFixed(6);
}


function normalizeId(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value ===
            "object" &&
        value._id
    ) {
        return String(
            value._id
        );
    }

    return String(value);
}


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
        "ASHMAAN RELIABILITY AGGREGATION VALIDATION"
    );
    console.log(
        "================================================"
    );


    await mongoose.connect(
        process.env.MONGODB_URI
    );


    console.log(
        "MongoDB connected."
    );


    /*
    |--------------------------------------------------------------------------
    | Persisted grid-source events
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
        })
            .sort({
                startTime:
                    1,
            })
            .lean();


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
            .select({
                _id:
                    1,

                vrmSiteId:
                    1,

                name:
                    1,
            })
            .lean();


    if (!events.length) {
        console.log(
            "No grid-source events found."
        );

        return;
    }


    /*
    |--------------------------------------------------------------------------
    | Reporting period
    |--------------------------------------------------------------------------
    */

    const earliestEvent =
        events.reduce(
            (
                earliest,
                event
            ) => {
                const current =
                    new Date(
                        event.startTime
                    );

                return (
                    !earliest ||
                    current <
                        earliest
                )
                    ? current
                    : earliest;
            },
            null
        );


    const periodStart =
        new Date(
            earliestEvent.getTime() -
            60 *
            1000
        );


    const periodEnd =
        new Date();


    /*
    |--------------------------------------------------------------------------
    | Detector capability
    |--------------------------------------------------------------------------
    |
    | Capability is based on exact active-source attribute 471.
    |--------------------------------------------------------------------------
    */

    const observabilityStart =
        new Date(
            periodEnd.getTime() -
            OBSERVABILITY_LOOKBACK_DAYS *
            24 *
            60 *
            60 *
            1000
        );


    const activeSourceInstallationIds =
        await Telemetry.distinct(
            "installation",
            {
                source:
                    "VRM",

                vrmAttributeId:
                    ACTIVE_SOURCE_ATTRIBUTE_ID,

                timestamp: {
                    $gte:
                        observabilityStart,

                    $lte:
                        periodEnd,
                },
            }
        );


    const eligibleIdSet =
        new Set(
            eligibleInstallations.map(
                (installation) =>
                    String(
                        installation._id
                    )
            )
        );


    const gridObservableInstallationIds =
        activeSourceInstallationIds
            .map(
                normalizeId
            )
            .filter(
                (installationId) =>
                    installationId &&
                    eligibleIdSet.has(
                        installationId
                    )
            );


    /*
    |--------------------------------------------------------------------------
    | Acquisition-gap telemetry context
    |--------------------------------------------------------------------------
    |
    | Gap detection requires samples on both sides of a candidate gap.
    |
    | Therefore query wider than the reporting period where possible.
    |--------------------------------------------------------------------------
    */

    const acquisitionContextStart =
        new Date(
            Math.min(
                periodStart.getTime(),
                periodEnd.getTime() -
                ACQUISITION_CONTEXT_HOURS *
                60 *
                60 *
                1000
            )
        );


    const acquisitionTelemetry =
        await Telemetry.find({
            source:
                "VRM",

            vrmAttributeId:
                ACTIVE_SOURCE_ATTRIBUTE_ID,

            installation: {
                $in:
                    activeSourceInstallationIds,
            },

            timestamp: {
                $gte:
                    acquisitionContextStart,

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
    | Derive validated fleet-level acquisition blind intervals
    |--------------------------------------------------------------------------
    */

    const acquisitionObservability =
        deriveActiveSourceAcquisitionGaps({
            telemetry:
                acquisitionTelemetry,

            detectorCapableInstallationIds:
                gridObservableInstallationIds,

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


    const gridAcquisitionGapIntervals =
        acquisitionObservability
            .mergedAcquisitionGapIntervals;


    /*
    |--------------------------------------------------------------------------
    | Service observability
    |--------------------------------------------------------------------------
    |
    | Deliberately empty until fleet-wide customer/load interruption
    | observability has been validated.
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

            gridObservableInstallationIds,

            gridAcquisitionGapIntervals,

            serviceObservableInstallationIds,
        });


    /*
    |--------------------------------------------------------------------------
    | Reporting window
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
        `Start: ${result.period.start.toISOString()}`
    );

    console.log(
        `End: ${result.period.end.toISOString()}`
    );

    console.log(
        `Duration: ${result.period.durationHours.toFixed(
            4
        )} hours`
    );

    console.log(
        `Eligible fleet population: ${eligibleInstallations.length}`
    );


    /*
    |--------------------------------------------------------------------------
    | Observability
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "OBSERVABILITY"
    );
    console.log(
        "================================================"
    );


    console.log(
        `Grid-source detector-capable installations: ${result.observability.gridSource.observableInstallationCount}`
    );


    console.log(
        `Naive capability exposure: ${result.observability.gridSource.naiveExposureHours.toFixed(
            6
        )} site-h`
    );


    console.log(
        `Shared acquisition gaps: ${result.observability.gridSource.acquisitionGapCount}`
    );


    console.log(
        `Acquisition blind time/site: ${result.observability.gridSource.excludedHoursPerSite.toFixed(
            6
        )} h`
    );


    console.log(
        `Observable time/site: ${result.observability.gridSource.observableHoursPerSite.toFixed(
            6
        )} h`
    );


    console.log(
        `Corrected grid-source exposure: ${result.observability.gridSource.exposureHours.toFixed(
            6
        )} site-h`
    );


    console.log(
        `Exposure removed: ${result.observability.gridSource.excludedExposureHours.toFixed(
            6
        )} site-h`
    );


    console.log(
        `Exposure model: ${result.observability.gridSource.exposureModel}`
    );


    console.log(
        `Service-observable installations: ${result.observability.service.observableInstallationCount}`
    );


    if (
        result.observability
            .gridSource
            .acquisitionGapIntervals
            .length
    ) {
        console.log("");
        console.log(
            "Acquisition exclusion intervals:"
        );


        for (
            const interval
            of result
                .observability
                .gridSource
                .acquisitionGapIntervals
        ) {
            console.log({
                start:
                    interval
                        .start
                        .toISOString(),

                end:
                    interval
                        .end
                        .toISOString(),

                durationHours:
                    interval
                        .durationSeconds /
                    3600,
            });
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Grid-source reliability
    |--------------------------------------------------------------------------
    */

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
        `Raw grid-source event documents: ${result.gridSource.sourceEventCount}`
    );


    console.log(
        `Active interruption episodes: ${result.gridSource.activeEpisodeCount}`
    );


    console.log(
        `Started interruption episodes: ${result.gridSource.startedEpisodeCount}`
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
        `Interruption hours excluded by acquisition gaps: ${result.gridSource.excludedInterruptionHours.toFixed(
            6
        )}`
    );


    console.log(
        `Observable interruption site-hours: ${result.gridSource.interruptionHours.toFixed(
            6
        )}`
    );


    console.log(
        `Observed grid-source availability: ${percentage(
            result.gridSource.availability
        )}%`
    );


    console.log(
        `Observed grid-source unavailability: ${percentage(
            result.gridSource.unavailability
        )}%`
    );


    /*
    |--------------------------------------------------------------------------
    | Service reliability
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "SERVICE RELIABILITY"
    );
    console.log(
        "================================================"
    );


    console.log(
        `Confirmed load interruptions: ${result.service.confirmedInterruptionCount}`
    );


    console.log(
        `Service active episodes: ${result.service.activeEpisodeCount}`
    );


    console.log(
        `Service started episodes: ${result.service.startedEpisodeCount}`
    );


    console.log(
        `Service availability status: ${result.service.availabilityStatus}`
    );


    console.log(
        `Service availability: ${percentage(
            result.service.availability
        )}%`
    );


    /*
    |--------------------------------------------------------------------------
    | SAIDI / SAIFI foundation
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "SAIDI / SAIFI FOUNDATION"
    );
    console.log(
        "================================================"
    );


    console.log(
        `Eligible interruption events: ${result.saidiSaifiFoundation.eligibleEventCount}`
    );


    console.log(
        `Eligible active episodes: ${result.saidiSaifiFoundation.activeEpisodeCount}`
    );


    console.log(
        `Eligible started episodes: ${result.saidiSaifiFoundation.startedEpisodeCount}`
    );


    console.log(
        `Affected installations: ${result.saidiSaifiFoundation.affectedInstallationCount}`
    );


    console.log(
        `Denominator status: ${result.saidiSaifiFoundation.denominatorStatus}`
    );


    /*
    |--------------------------------------------------------------------------
    | ENS foundation
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ENS FOUNDATION"
    );
    console.log(
        "================================================"
    );


    console.log(
        `ENS eligible events: ${result.ensFoundation.eligibleEventCount}`
    );


    console.log(
        `Total qualified ENS: ${result.ensFoundation.totalEnsKwh.toFixed(
            6
        )} kWh`
    );


    /*
    |--------------------------------------------------------------------------
    | Acquisition diagnostics
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ACQUISITION DIAGNOSTICS"
    );
    console.log(
        "================================================"
    );


    console.log(
        `Attribute-471 context records: ${acquisitionTelemetry.length}`
    );


    console.log(
        `Represented detector-capable installations: ${acquisitionObservability.representedInstallationCount}`
    );


    console.log(
        `Candidate large gaps: ${acquisitionObservability.candidateGapCount}`
    );


    console.log(
        `Gap clusters: ${acquisitionObservability.clusterCount}`
    );


    console.log(
        `Qualifying shared gaps: ${acquisitionObservability.qualifyingClusterCount}`
    );


    /*
    |--------------------------------------------------------------------------
    | Diagnostics
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "DIAGNOSTICS"
    );
    console.log(
        "================================================"
    );


    console.log(
        result.diagnostics
    );


    /*
    |--------------------------------------------------------------------------
    | Safety assertions
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "CONSISTENCY CHECKS"
    );
    console.log(
        "================================================"
    );


    const checks = [
        {
            label:
                "Corrected exposure does not exceed naive exposure",

            pass:
                result
                    .observability
                    .gridSource
                    .exposureSeconds <=
                result
                    .observability
                    .gridSource
                    .naiveExposureSeconds,
        },

        {
            label:
                "Observable interruption time does not exceed gross interruption time",

            pass:
                result
                    .gridSource
                    .interruptionSeconds <=
                result
                    .gridSource
                    .grossInterruptionSeconds,
        },

        {
            label:
                "Started episodes do not exceed active episodes",

            pass:
                result
                    .gridSource
                    .startedEpisodeCount <=
                result
                    .gridSource
                    .activeEpisodeCount,
        },

        {
            label:
                "Grid availability remains bounded",

            pass:
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
        },

        {
            label:
                "Service availability remains NOT_OBSERVABLE",

            pass:
                result
                    .service
                    .availabilityStatus ===
                "NOT_OBSERVABLE",
        },
    ];


    for (
        const check
        of checks
    ) {
        console.log(
            `${check.pass ? "PASS" : "FAIL"}: ${check.label}`
        );


        if (!check.pass) {
            throw new Error(
                `Consistency check failed: ${check.label}`
            );
        }
    }


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "RELIABILITY AGGREGATION VALIDATION PASSED"
    );
    console.log(
        "================================================"
    );


    console.log("");
    console.log(
        "No reliability KPI records were written."
    );
}


try {
    await run();
}
catch (error) {
    console.error("");
    console.error(
        "Reliability aggregation validation failed:"
    );

    console.error(error);

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