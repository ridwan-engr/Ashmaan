// backend/services/reliability/reliabilityIndicesService.js

import OutageEvent
    from "../../models/OutageEvent.js";

import Installation
    from "../../models/Installation.js";

import {
    calculateIntegratedAsaiAsui,
} from "./asaiAsuiIntegrationService.js";

import {
    resolveReliabilityPopulation,
    buildReliabilityIndexLabels,
    RELIABILITY_POPULATION_BASIS,
} from "./reliabilityPopulationService.js";

import {
    evaluateServiceInterruptions,
} from "./serviceInterruptionEligibilityService.js";

import {
    resolveInterruptionWeights,
} from "./interruptionWeightingService.js";

import {
    calculateSaidi,
} from "./saidiCalculationService.js";

import {
    calculateSaifi,
} from "./saifiCalculationService.js";

import {
    calculateCaidi,
} from "./caidiCalculationService.js";


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function asDate(
    value
) {
    if (!value) {
        return null;
    }

    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function positiveInteger(
    value
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const numeric =
        Number(value);

    if (
        !Number.isInteger(
            numeric
        ) ||
        numeric <= 0
    ) {
        return null;
    }

    return numeric;
}


function booleanTrue(
    value
) {
    return (
        value === true ||
        value === "true" ||
        value === 1 ||
        value === "1"
    );
}


/*
|--------------------------------------------------------------------------
| Reporting window
|--------------------------------------------------------------------------
*/

function resolveReportingWindow({
    periodStart,
    periodEnd,
}) {
    const end =
        asDate(
            periodEnd
        ) ??
        new Date();


    const start =
        asDate(
            periodStart
        ) ??
        new Date(
            end.getTime() -
            24 *
            60 *
            60 *
            1000
        );


    if (
        start.getTime() >=
        end.getTime()
    ) {
        throw new Error(
            "INVALID_REPORTING_WINDOW"
        );
    }


    return {
        periodStart:
            start,

        periodEnd:
            end,
    };
}


/*
|--------------------------------------------------------------------------
| Population resolver
|--------------------------------------------------------------------------
*/

async function resolvePopulation({
    basis,

    customerPopulation,

    servicePointPopulation,

    explicitlyEnabledInstallationProxy,
}) {
    const normalizedBasis =
        typeof basis ===
            "string"
            ? basis
                .trim()
                .toUpperCase()
            : null;


    /*
    |--------------------------------------------------------------------------
    | CUSTOMER
    |--------------------------------------------------------------------------
    |
    | Until ASHMAAN has a validated Customer model/population source,
    | customerPopulation must remain unavailable unless explicitly supplied
    | by a trusted caller.
    |--------------------------------------------------------------------------
    */

    if (
        normalizedBasis ===
        RELIABILITY_POPULATION_BASIS
            .CUSTOMER
    ) {
        return resolveReliabilityPopulation({
            basis:
                RELIABILITY_POPULATION_BASIS
                    .CUSTOMER,

            customerPopulation:
                positiveInteger(
                    customerPopulation
                ),
        });
    }


    /*
    |--------------------------------------------------------------------------
    | SERVICE_POINT
    |--------------------------------------------------------------------------
    */

    if (
        normalizedBasis ===
        RELIABILITY_POPULATION_BASIS
            .SERVICE_POINT
    ) {
        return resolveReliabilityPopulation({
            basis:
                RELIABILITY_POPULATION_BASIS
                    .SERVICE_POINT,

            servicePointPopulation:
                positiveInteger(
                    servicePointPopulation
                ),
        });
    }


    /*
    |--------------------------------------------------------------------------
    | INSTALLATION_PROXY
    |--------------------------------------------------------------------------
    |
    | This is never automatically enabled.
    |--------------------------------------------------------------------------
    */

    if (
        normalizedBasis ===
        RELIABILITY_POPULATION_BASIS
            .INSTALLATION_PROXY
    ) {
        const installationPopulation =
            await Installation.countDocuments({
                source:
                    "VRM",

                syncEnabled:
                    true,

                status: {
                    $ne:
                        "INACTIVE",
                },
            });


        return resolveReliabilityPopulation({
            basis:
                RELIABILITY_POPULATION_BASIS
                    .INSTALLATION_PROXY,

            installationPopulation,

            explicitlyEnabledInstallationProxy:
                booleanTrue(
                    explicitlyEnabledInstallationProxy
                ),
        });
    }


    /*
    |--------------------------------------------------------------------------
    | No basis / unsupported basis
    |--------------------------------------------------------------------------
    */

    return resolveReliabilityPopulation({
        basis:
            normalizedBasis,
    });
}


/*
|--------------------------------------------------------------------------
| Outage event query
|--------------------------------------------------------------------------
*/

async function loadEvents({
    periodStart,
    periodEnd,
}) {
    return OutageEvent
        .find({
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
                    restorationTime:
                        null,

                    endTime: {
                        $gt:
                            periodStart,
                    },
                },

                {
                    restorationTime:
                        null,

                    endTime:
                        null,
                },
            ],
        })
        .sort({
            startTime:
                1,
        })
        .lean();
}


/*
|--------------------------------------------------------------------------
| Public reliability-index calculation
|--------------------------------------------------------------------------
*/

export async function calculateReliabilityIndices({
    periodStart,
    periodEnd,

    basis =
    RELIABILITY_POPULATION_BASIS
        .CUSTOMER,

    customerPopulation =
    null,

    servicePointPopulation =
    null,

    explicitlyEnabledInstallationProxy =
    false,
} = {}) {
    const reportingWindow =
        resolveReportingWindow({
            periodStart,
            periodEnd,
        });


    const population =
        await resolvePopulation({
            basis,

            customerPopulation,

            servicePointPopulation,

            explicitlyEnabledInstallationProxy,
        });


    const events =
        await loadEvents(
            reportingWindow
        );


    /*
    |--------------------------------------------------------------------------
    | 7.9B
    |--------------------------------------------------------------------------
    */

    const eligibility =
        evaluateServiceInterruptions({
            events,

            periodStart:
                reportingWindow
                    .periodStart,

            periodEnd:
                reportingWindow
                    .periodEnd,
        });


    /*
    |--------------------------------------------------------------------------
    | 7.9C
    |--------------------------------------------------------------------------
    */

    const weighting =
        resolveInterruptionWeights({
            interruptions:
                eligibility
                    .eligible,

            population,
        });


    /*
    |--------------------------------------------------------------------------
    | 7.9D
    |--------------------------------------------------------------------------
    */

    const saidi =
        calculateSaidi({
            interruptions:
                eligibility
                    .eligible,

            population,
        });


    /*
    |--------------------------------------------------------------------------
    | 7.9E
    |--------------------------------------------------------------------------
    */

    const saifi =
        calculateSaifi({
            interruptions:
                eligibility
                    .eligible,

            population,
        });


    /*
    |--------------------------------------------------------------------------
    | 7.9F
    |--------------------------------------------------------------------------
    */

    const caidi =
        calculateCaidi({
            saidi,
            saifi,
        });


    const labels =
        buildReliabilityIndexLabels(
            population
        );

    /*
|--------------------------------------------------------------------------
| 7.10 — ASAI / ASUI
|--------------------------------------------------------------------------
|
| Customer/service observability is not yet established in production.
| Do NOT infer observability from the existence or absence of events.
|--------------------------------------------------------------------------
*/

    const asaiAsui =
        calculateIntegratedAsaiAsui({
            events,

            population,

            periodStart:
                reportingWindow
                    .periodStart,

            periodEnd:
                reportingWindow
                    .periodEnd,

            serviceInterruptionObservable:
                false,
        });


    /*
    |--------------------------------------------------------------------------
    | API-safe result
    |--------------------------------------------------------------------------
    */

    return {
        reportingWindow: {
            start:
                reportingWindow
                    .periodStart,

            end:
                reportingWindow
                    .periodEnd,

            semantics:
                "[start,end)",
        },


        population: {
            basis:
                population
                    .basis,

            status:
                population
                    .status,

            denominator:
                population
                    .denominator,

            denominatorAvailable:
                population
                    .denominatorAvailable,

            regulatoryCustomerBasis:
                population
                    .regulatoryCustomerBasis,

            proxyBasis:
                population
                    .proxyBasis,

            reason:
                population
                    .reason,
        },


        observability: {
            serviceInterruptionStatus:
                "NOT_ESTABLISHED",

            serviceInterruptionObservable:
                false,

            sourceEventCount:
                events.length,

            eligibleServiceInterruptionCount:
                eligibility
                    .eligibleEventCount,

            rejectedEventCount:
                eligibility
                    .rejectedEventCount,

            startedInterruptionCount:
                eligibility
                    .startedInterruptionCount,

            rejectionCounts:
                eligibility
                    .rejectionCounts,
        },


        weighting: {
            complete:
                weighting
                    .complete,

            validWeightCount:
                weighting
                    .validWeightCount,

            unavailableWeightCount:
                weighting
                    .unavailableWeightCount,

            totalWeight:
                weighting
                    .totalWeight,

            reasonCounts:
                weighting
                    .reasonCounts,
        },


        indices: {
            saidi: {
                label:
                    labels
                        .saidi,

                status:
                    saidi
                        .status,

                reason:
                    saidi
                        .reason,

                hours:
                    saidi
                        .saidiHours,

                minutes:
                    saidi
                        .saidiMinutes ??
                    null,

                weightedInterruptionHours:
                    saidi
                        .weightedInterruptionHours ??
                    null,
            },


            saifi: {
                label:
                    labels
                        .saifi,

                status:
                    saifi
                        .status,

                reason:
                    saifi
                        .reason,

                value:
                    saifi
                        .saifi,

                weightedInterruptionStarts:
                    saifi
                        .weightedInterruptionStarts ??
                    null,

                physicalStartedEpisodeCount:
                    saifi
                        .physicalStartedEpisodeCount ??
                    null,
            },


            caidi: {
                label:
                    labels
                        .caidi,

                status:
                    caidi
                        .status,

                reason:
                    caidi
                        .reason,

                hours:
                    caidi
                        .caidiHours,

                minutes:
                    caidi
                        .caidiMinutes,
            },

            asai: {
                label:
                    population
                        .basis ===
                        "INSTALLATION_PROXY"
                        ? "Site-Based ASAI-Equivalent"
                        : "ASAI",

                status:
                    asaiAsui
                        .availability
                        .status,

                reason:
                    asaiAsui
                        .availability
                        .reason,

                value:
                    asaiAsui
                        .availability
                        .asai,

                percent:
                    asaiAsui
                        .availability
                        .asaiPercent,

                reportingHours:
                    asaiAsui
                        .availability
                        .reportingHours,

                weightedInterruptionHours:
                    asaiAsui
                        .weightedInterruptionHours,

                durationSource:
                    asaiAsui
                        .durationSource,
            },


            asui: {
                label:
                    population
                        .basis ===
                        "INSTALLATION_PROXY"
                        ? "Site-Based ASUI-Equivalent"
                        : "ASUI",

                status:
                    asaiAsui
                        .availability
                        .status,

                reason:
                    asaiAsui
                        .availability
                        .reason,

                value:
                    asaiAsui
                        .availability
                        .asui,

                percent:
                    asaiAsui
                        .availability
                        .asuiPercent,

                reportingHours:
                    asaiAsui
                        .availability
                        .reportingHours,

                weightedInterruptionHours:
                    asaiAsui
                        .weightedInterruptionHours,

                durationSource:
                    asaiAsui
                        .durationSource,
            },
        },


        semanticGuards: {
            gridSourceInterruptionIsNotAutomaticallyServiceInterruption:
                true,

            monitoringOfflineIsNotServiceOutage:
                true,

            missingIndexIsNotZero:
                true,

            installationProxyRequiresExplicitEnablement:
                true,
        },
    };
}