// backend/services/reliability/technicalReliabilityService.js

import FailureEvent
    from "../../models/FailureEvent.js";

import {
    evaluateFailureEvents,
} from "./failureEventEligibilityService.js";

import {
    calculateMttr,
} from "./mttrCalculationService.js";

import {
    calculateFailureRepairRates,
} from "./failureRepairRateCalculationService.js";

import {
    calculateReliabilityFunction,
} from "./reliabilityFunctionCalculationService.js";


/*
|--------------------------------------------------------------------------
| Production equipment-reliability status
|--------------------------------------------------------------------------
|
| MTBF requires validated equipment operating exposure.
|
| ASHMAAN currently has:
|
| - validated FailureEvent semantics
| - validated MTTR engine
| - validated operating-exposure calculator
| - validated MTBF engine
|
| But it does NOT yet have a persisted production source of validated
| equipment operating-state intervals.
|
| Therefore production MTBF must remain unavailable until such evidence
| exists.
|--------------------------------------------------------------------------
*/


function buildUnavailableMtbf({
    failureCount = 0,
    reliabilityKeys = [],
} = {}) {
    return {
        status:
            "UNAVAILABLE",

        reason:
            "OPERATING_EXPOSURE_NOT_ESTABLISHED",

        mtbfHours:
            null,

        failureCount,

        operatingExposureHours:
            null,

        equipmentCount:
            reliabilityKeys.length,

        reliabilityKeys,

        scope: {
            type:
                reliabilityKeys.length === 1
                    ? "SINGLE_REPAIRABLE_ITEM"
                    : reliabilityKeys.length > 1
                        ? "MULTIPLE_REPAIRABLE_ITEMS"
                        : "NOT_ESTABLISHED",

            pooledAggregateCalculated:
                false,
        },

        assumptions: {
            equipmentOperatingExposureEstablished:
                false,

            installationMonitoringStatusUsed:
                false,

            telemetryPresenceUsedAsOperatingState:
                false,

            calendarTimeUsedAsOperatingExposure:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Repairable-item identity extraction
|--------------------------------------------------------------------------
*/

function getReliabilityKeys(
    evaluations = []
) {
    return [
        ...new Set(
            evaluations
                .map(
                    (evaluation) =>
                        evaluation
                            ?.equipmentIdentity
                            ?.reliabilityKey ??
                        null
                )
                .filter(
                    Boolean
                )
        ),
    ];
}


/*
|--------------------------------------------------------------------------
| Build production technical-reliability state
|--------------------------------------------------------------------------
*/

export async function calculateTechnicalReliability({
    horizonHours =
        null,
} = {}) {
    /*
    |--------------------------------------------------------------------------
    | FailureEvent is the ONLY production source for equipment failures here.
    |--------------------------------------------------------------------------
    */

    const failureEvents =
        await FailureEvent
            .find({})
            .sort({
                startTime:
                    1,
            })
            .lean();


    /*
    |--------------------------------------------------------------------------
    | Eligibility
    |--------------------------------------------------------------------------
    */

    const evaluations =
        evaluateFailureEvents(
            failureEvents
        );


    const mtbfReliabilityKeys =
        getReliabilityKeys(
            evaluations
                .mtbf
                .eligible
        );


    const mttrReliabilityKeys =
        getReliabilityKeys(
            evaluations
                .mttr
                .eligible
        );


    /*
    |--------------------------------------------------------------------------
    | MTTR
    |--------------------------------------------------------------------------
    |
    | MTTR can calculate independently when completed repair intervals exist.
    |--------------------------------------------------------------------------
    */

    const mttr =
        calculateMttr({
            mttrEvaluations:
                evaluations
                    .mttr
                    .eligible,
        });


    /*
    |--------------------------------------------------------------------------
    | MTBF
    |--------------------------------------------------------------------------
    |
    | DO NOT calculate against:
    |
    | - elapsed calendar time
    | - Installation ONLINE/OFFLINE
    | - telemetry presence
    | - grid-source observability
    | - outage-free duration
    |
    | A validated production operating-exposure source is not established yet.
    |--------------------------------------------------------------------------
    */

    const mtbf =
        buildUnavailableMtbf({
            failureCount:
                evaluations
                    .mtbf
                    .eligibleCount,

            reliabilityKeys:
                mtbfReliabilityKeys,
        });


    /*
    |--------------------------------------------------------------------------
    | λ and μ
    |--------------------------------------------------------------------------
    |
    | λ requires MTBF.
    | μ can independently calculate when MTTR is valid.
    |--------------------------------------------------------------------------
    */

    const rates =
        calculateFailureRepairRates({
            mtbf,
            mttr,
        });


    /*
    |--------------------------------------------------------------------------
    | Technical availability
    |--------------------------------------------------------------------------
    |
    | A = MTBF / (MTBF + MTTR)
    |
    | Since MTBF is unavailable in the current production-data path,
    | technical availability must also remain unavailable.
    |--------------------------------------------------------------------------
    */

    const technicalAvailability =
        {
            status:
                "UNAVAILABLE",

            reason:
                "MTBF_UNAVAILABLE",

            availability:
                null,

            availabilityPercent:
                null,

            formula:
                "MTBF / (MTBF + MTTR)",

            classification:
                "TECHNICAL_AVAILABILITY",

            semanticBoundary: {
                isAsai:
                    false,

                isGridSourceAvailability:
                    false,

                isInstallationMonitoringAvailability:
                    false,
            },
        };


    /*
    |--------------------------------------------------------------------------
    | Reliability R(t)
    |--------------------------------------------------------------------------
    */

    let reliability =
        null;


    if (
        horizonHours !==
            null &&
        horizonHours !==
            undefined
    ) {
        reliability =
            calculateReliabilityFunction({
                failureRate:
                    rates
                        .failureRate,

                horizonHours,
            });
    }


    /*
    |--------------------------------------------------------------------------
    | Production result
    |--------------------------------------------------------------------------
    */

    return {
        source: {
            type:
                "FAILURE_EVENT",

            failureEventCount:
                failureEvents.length,

            equipmentOperatingExposureEstablished:
                false,
        },


        eligibility: {
            totalFailureEventCount:
                evaluations
                    .totalFailureEventCount,

            mtbf: {
                eligibleCount:
                    evaluations
                        .mtbf
                        .eligibleCount,

                rejectedCount:
                    evaluations
                        .mtbf
                        .rejectedCount,

                rejectionCounts:
                    evaluations
                        .mtbf
                        .rejectionCounts,

                reliabilityKeys:
                    mtbfReliabilityKeys,
            },

            mttr: {
                eligibleCount:
                    evaluations
                        .mttr
                        .eligibleCount,

                rejectedCount:
                    evaluations
                        .mttr
                        .rejectedCount,

                rejectionCounts:
                    evaluations
                        .mttr
                        .rejectionCounts,

                reliabilityKeys:
                    mttrReliabilityKeys,
            },
        },


        mtbf,

        mttr,


        rates: {
            failureRate:
                rates
                    .failureRate,

            repairRate:
                rates
                    .repairRate,

            status:
                rates
                    .status,

            reason:
                rates
                    .reason,
        },


        technicalAvailability,

        reliability,


        semantics: {
            failureSource:
                "Only validated FailureEvent records enter equipment reliability.",

            mtbf:
                "MTBF requires validated equipment operating exposure.",

            mttr:
                "MTTR uses actual completed repair intervals.",

            failureRate:
                "Lambda is derived only from validated MTBF.",

            repairRate:
                "Mu is derived only from validated MTTR.",

            reliability:
                "R(t) uses the exponential constant-failure-rate model when lambda is available.",

            serviceSeparation:
                "Equipment reliability is separate from SAIDI, SAIFI, CAIDI, ASAI, ASUI and grid-source availability.",
        },
    };
}