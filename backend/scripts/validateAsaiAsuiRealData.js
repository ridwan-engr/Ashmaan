// backend/scripts/validateAsaiAsuiRealData.js

import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

import OutageEvent
from "../models/OutageEvent.js";

import Installation
from "../models/Installation.js";

import {
    resolveReliabilityPopulation,
} from "../services/reliability/reliabilityPopulationService.js";

import {
    calculateIntegratedAsaiAsui,
} from "../services/reliability/asaiAsuiIntegrationService.js";


dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);


dotenv.config();


function pass(
    condition,
    label
) {
    if (!condition) {
        throw new Error(
            `FAIL: ${label}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


async function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN REAL-DATA ASAI / ASUI VALIDATION"
    );
    console.log(
        "================================================"
    );


    const mongoUri =
        process.env.MONGODB_URI;


    if (!mongoUri) {
        throw new Error(
            "MONGODB_URI is missing"
        );
    }


    await mongoose.connect(
        mongoUri,
        {
            serverSelectionTimeoutMS:
                15000,
        }
    );


    console.log(
        "MongoDB connected"
    );


    /*
    |--------------------------------------------------------------------------
    | Determine reporting window from stored outage events
    |--------------------------------------------------------------------------
    */

    const earliest =
        await OutageEvent
            .findOne({})
            .sort({
                startTime:
                    1,
            })
            .lean();


    const latest =
        await OutageEvent
            .findOne({})
            .sort({
                startTime:
                    -1,
            })
            .lean();


    pass(
        Boolean(
            earliest
        ),
        "Earliest outage event is available"
    );


    pass(
        Boolean(
            latest
        ),
        "Latest outage event is available"
    );


    const periodStart =
        new Date(
            earliest
                .startTime
        );


    const latestReference =
        latest
            .restorationTime ??
        latest
            .endTime ??
        latest
            .startTime;


    const periodEnd =
        new Date(
            new Date(
                latestReference
            ).getTime() +
            24 *
            60 *
            60 *
            1000
        );


    console.log("");
    console.log(
        "Reporting window:"
    );

    console.log(
        `Start: ${periodStart.toISOString()}`
    );

    console.log(
        `End:   ${periodEnd.toISOString()}`
    );


    /*
    |--------------------------------------------------------------------------
    | Installation population
    |--------------------------------------------------------------------------
    */

    const installationPopulation =
        await Installation
            .countDocuments({
                source:
                    "VRM",

                syncEnabled:
                    true,

                status: {
                    $ne:
                        "INACTIVE",
                },
            });


    console.log("");
    console.log(
        `Eligible installation population: ${installationPopulation}`
    );


    pass(
        installationPopulation >
            0,
        "Eligible installation population is available"
    );


    /*
    |--------------------------------------------------------------------------
    | Load events overlapping reporting period
    |--------------------------------------------------------------------------
    */

    const events =
        await OutageEvent
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


    console.log(
        `Stored outage events in reporting window: ${events.length}`
    );


    pass(
        events.length >
            0,
        "Stored outage events are available"
    );


    /*
    |--------------------------------------------------------------------------
    | Raw semantic audit
    |--------------------------------------------------------------------------
    */

    const confirmedServiceInterruptions =
        events.filter(
            (
                event
            ) =>
                event
                    ?.raw
                    ?.loadInterruptionConfirmed ===
                true
        );


    const saidiSaifiEnabled =
        events.filter(
            (
                event
            ) =>
                event
                    ?.raw
                    ?.eligibleForSaidiSaifi ===
                true
        );


    const gridSourceOnly =
        events.filter(
            (
                event
            ) =>
                event
                    ?.raw
                    ?.gridSourceInterrupted ===
                    true &&
                event
                    ?.raw
                    ?.loadInterruptionConfirmed !==
                    true
        );


    console.log("");
    console.log(
        "Raw event semantics:"
    );

    console.log(
        `Confirmed service interruptions: ${confirmedServiceInterruptions.length}`
    );

    console.log(
        `SAIDI/SAIFI enabled events:       ${saidiSaifiEnabled.length}`
    );

    console.log(
        `Grid-source-only events:          ${gridSourceOnly.length}`
    );


    /*
    |--------------------------------------------------------------------------
    | CUSTOMER basis
    |--------------------------------------------------------------------------
    |
    | Customer population is deliberately unavailable.
    | Service observability is also not established.
    |--------------------------------------------------------------------------
    */

    const customerPopulation =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",

            customerPopulation:
                null,
        });


    const customerResult =
        calculateIntegratedAsaiAsui({
            events,

            population:
                customerPopulation,

            periodStart,

            periodEnd,

            serviceInterruptionObservable:
                false,
        });


    console.log("");
    console.log(
        "Customer-basis ASAI / ASUI:"
    );

    console.log(
        `Population status: ${customerPopulation.status}`
    );

    console.log(
        `Denominator: ${customerPopulation.denominator}`
    );

    console.log(
        `Eligible service interruptions: ${customerResult.eligibility.eligibleEventCount}`
    );

    console.log(
        `Weighted interruption hours: ${customerResult.weightedInterruptionHours}`
    );

    console.log(
        `Duration source: ${customerResult.durationSource}`
    );

    console.log(
        `ASAI: ${customerResult.availability.asai}`
    );

    console.log(
        `ASUI: ${customerResult.availability.asui}`
    );

    console.log(
        `Reason: ${customerResult.availability.reason}`
    );


    pass(
        customerPopulation
            .denominatorAvailable ===
            false,
        "Customer denominator remains unavailable"
    );


    pass(
        customerResult
            .eligibility
            .eligibleEventCount ===
            0,
        "No current real event is eligible as confirmed service interruption"
    );


    pass(
        customerResult
            .weightedInterruptionHours ===
            null,
        "Missing service observability does not become zero interruption duration"
    );


    pass(
        customerResult
            .durationSource ===
            "UNAVAILABLE",
        "Customer interruption duration remains unavailable"
    );


    pass(
        customerResult
            .availability
            .status ===
            "UNAVAILABLE",
        "Customer ASAI/ASUI remain unavailable"
    );


    /*
    |--------------------------------------------------------------------------
    | Because population validation occurs before observability validation,
    | CUSTOMER basis should currently report POPULATION_UNAVAILABLE.
    |--------------------------------------------------------------------------
    */

    pass(
        customerResult
            .availability
            .reason ===
            "POPULATION_UNAVAILABLE",
        "Customer ASAI/ASUI correctly report unavailable population"
    );


    pass(
        customerResult
            .availability
            .asai ===
            null,
        "Customer ASAI remains null"
    );


    pass(
        customerResult
            .availability
            .asui ===
            null,
        "Customer ASUI remains null"
    );


    /*
    |--------------------------------------------------------------------------
    | Explicit installation proxy
    |--------------------------------------------------------------------------
    |
    | This gives us a valid denominator, allowing us to prove independently
    | that observability still blocks ASAI/ASUI.
    |--------------------------------------------------------------------------
    */

    const proxyPopulation =
        resolveReliabilityPopulation({
            basis:
                "INSTALLATION_PROXY",

            installationPopulation,

            explicitlyEnabledInstallationProxy:
                true,
        });


    const proxyResult =
        calculateIntegratedAsaiAsui({
            events,

            population:
                proxyPopulation,

            periodStart,

            periodEnd,

            serviceInterruptionObservable:
                false,
        });


    console.log("");
    console.log(
        "Explicit installation-proxy safety check:"
    );

    console.log(
        `Population: ${proxyPopulation.denominator}`
    );

    console.log(
        `Population status: ${proxyPopulation.status}`
    );

    console.log(
        `Eligible service interruptions: ${proxyResult.eligibility.eligibleEventCount}`
    );

    console.log(
        `Weighted interruption hours: ${proxyResult.weightedInterruptionHours}`
    );

    console.log(
        `Site-Based ASAI-Equivalent: ${proxyResult.availability.asai}`
    );

    console.log(
        `Site-Based ASUI-Equivalent: ${proxyResult.availability.asui}`
    );

    console.log(
        `Reason: ${proxyResult.availability.reason}`
    );


    pass(
        proxyPopulation
            .denominatorAvailable ===
            true,
        "Explicit installation proxy denominator is available"
    );


    pass(
        proxyPopulation
            .proxyBasis ===
            true,
        "Installation population remains explicitly proxy"
    );


    pass(
        proxyResult
            .eligibility
            .eligibleEventCount ===
            0,
        "Grid-source-only events remain ineligible for service availability"
    );


    pass(
        proxyResult
            .weightedInterruptionHours ===
            null,
        "Proxy interruption duration remains unavailable without observability"
    );


    pass(
        proxyResult
            .availability
            .status ===
            "UNAVAILABLE",
        "Site-based ASAI/ASUI equivalents remain unavailable"
    );


    pass(
        proxyResult
            .availability
            .reason ===
            "SERVICE_OBSERVABILITY_NOT_ESTABLISHED",
        "Valid proxy denominator still cannot bypass service observability"
    );


    pass(
        proxyResult
            .availability
            .asai ===
            null,
        "Site-based ASAI-equivalent remains null"
    );


    pass(
        proxyResult
            .availability
            .asui ===
            null,
        "Site-based ASUI-equivalent remains null"
    );


    /*
    |--------------------------------------------------------------------------
    | Stored data integrity checks
    |--------------------------------------------------------------------------
    */

    pass(
        confirmedServiceInterruptions
            .length ===
            0,
        "No stored outage event claims confirmed service interruption"
    );


    pass(
        saidiSaifiEnabled
            .length ===
            0,
        "No stored outage event currently enables customer reliability indices"
    );


    pass(
        gridSourceOnly
            .length >
            0,
        "Stored events retain grid-source interruption semantics"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "REAL-DATA ASAI / ASUI VALIDATION PASSED"
    );
    console.log(
        "================================================"
    );


    console.log("");
    console.log(
        "Production-safe conclusion:"
    );

    console.log(
        "- grid-source interruption events exist"
    );

    console.log(
        "- customer/service interruption observability is not established"
    );

    console.log(
        "- customer denominator is not validated"
    );

    console.log(
        "- Customer ASAI remains null"
    );

    console.log(
        "- Customer ASUI remains null"
    );

    console.log(
        "- Site-Based ASAI-Equivalent remains null"
    );

    console.log(
        "- Site-Based ASUI-Equivalent remains null"
    );

    console.log(
        "- grid-source availability must not be labeled ASAI"
    );
}


run()
    .catch(
        (
            error
        ) => {
            console.error("");
            console.error(
                "Real-data ASAI / ASUI validation failed:"
            );

            console.error(
                error
            );

            process.exitCode =
                1;
        }
    )
    .finally(
        async () => {
            if (
                mongoose
                    .connection
                    .readyState !==
                0
            ) {
                await mongoose.disconnect();
            }
        }
    );