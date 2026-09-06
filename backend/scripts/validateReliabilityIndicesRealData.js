// backend/scripts/validateReliabilityIndicesRealData.js

import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

import OutageEvent
from "../models/OutageEvent.js";

import Installation
from "../models/Installation.js";

import {
    resolveReliabilityPopulation,
    buildReliabilityIndexLabels,
} from "../services/reliability/reliabilityPopulationService.js";

import {
    evaluateServiceInterruptions,
} from "../services/reliability/serviceInterruptionEligibilityService.js";

import {
    resolveInterruptionWeights,
} from "../services/reliability/interruptionWeightingService.js";

import {
    calculateSaidi,
} from "../services/reliability/saidiCalculationService.js";

import {
    calculateSaifi,
} from "../services/reliability/saifiCalculationService.js";

import {
    calculateCaidi,
} from "../services/reliability/caidiCalculationService.js";


/*
|--------------------------------------------------------------------------
| DNS resolver
|--------------------------------------------------------------------------
|
| Windows / ISP DNS can reject MongoDB Atlas SRV lookups.
| Use the same resolver configuration already validated by the backend.
|--------------------------------------------------------------------------
*/

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);


dotenv.config();


/*
|--------------------------------------------------------------------------
| Assertions
|--------------------------------------------------------------------------
*/

function assertEqual(
    actual,
    expected,
    label
) {
    if (
        actual !==
        expected
    ) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


function assertTrue(
    condition,
    label
) {
    if (!condition) {
        throw new Error(
            `${label}: expected true`
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
        "ASHMAAN REAL-DATA SAIDI / SAIFI / CAIDI VALIDATION"
    );
    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | Database connection
    |--------------------------------------------------------------------------
    */

    const mongoUri =
        process.env.MONGODB_URI;


    if (!mongoUri) {
        throw new Error(
            "MONGODB_URI is missing"
        );
    }


    await mongoose.connect(
        mongoUri
    );


    console.log(
        "MongoDB connected"
    );


    /*
    |--------------------------------------------------------------------------
    | Reporting period
    |--------------------------------------------------------------------------
    |
    | Use a sufficiently broad historical interval containing all currently
    | persisted outage events.
    |
    | This is validation only; it does not modify records.
    |--------------------------------------------------------------------------
    */

    const earliestEvent =
        await OutageEvent
            .findOne()
            .sort({
                startTime:
                    1,
            })
            .lean();


    const latestEvent =
        await OutageEvent
            .findOne()
            .sort({
                startTime:
                    -1,
            })
            .lean();


    if (
        !earliestEvent ||
        !latestEvent
    ) {
        throw new Error(
            "No OutageEvent records found"
        );
    }


    const periodStart =
        new Date(
            earliestEvent
                .startTime
        );


    /*
     * Extend the reporting period beyond the latest event.
     *
     * This ensures that events starting at the latest timestamp remain inside
     * the half-open reporting interval.
     */
    const latestReferenceTime =
        latestEvent
            .restorationTime ??
        latestEvent
            .endTime ??
        latestEvent
            .startTime;


    const periodEnd =
        new Date(
            new Date(
                latestReferenceTime
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
    | Eligible fleet population
    |--------------------------------------------------------------------------
    */

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


    console.log("");
    console.log(
        `Eligible installation population: ${installationPopulation}`
    );


    assertTrue(
        installationPopulation >
            0,
        "Eligible installation population is available"
    );


    /*
    |--------------------------------------------------------------------------
    | Load actual outage events
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


    assertTrue(
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
            (event) =>
                event
                    ?.raw
                    ?.loadInterruptionConfirmed ===
                true
        );


    const explicitlyEnabledSaidiSaifi =
        events.filter(
            (event) =>
                event
                    ?.raw
                    ?.eligibleForSaidiSaifi ===
                true
        );


    const gridSourceOnly =
        events.filter(
            (event) =>
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
        `SAIDI/SAIFI enabled events:       ${explicitlyEnabledSaidiSaifi.length}`
    );

    console.log(
        `Grid-source-only events:          ${gridSourceOnly.length}`
    );


    /*
    |--------------------------------------------------------------------------
    | 7.9B — eligibility
    |--------------------------------------------------------------------------
    */

    const eligibility =
        evaluateServiceInterruptions({
            events,

            periodStart,

            periodEnd,
        });


    console.log("");
    console.log(
        "7.9B eligibility:"
    );

    console.log(
        `Total events:                  ${eligibility.totalEventCount}`
    );

    console.log(
        `Eligible events:               ${eligibility.eligibleEventCount}`
    );

    console.log(
        `Rejected events:               ${eligibility.rejectedEventCount}`
    );

    console.log(
        `Active interruption count:     ${eligibility.activeInterruptionCount}`
    );

    console.log(
        `Started interruption count:    ${eligibility.startedInterruptionCount}`
    );


    console.log(
        "Rejection counts:",
        eligibility
            .rejectionCounts
    );


    /*
    |--------------------------------------------------------------------------
    | Population basis
    |--------------------------------------------------------------------------
    |
    | There is currently no validated customer denominator.
    |
    | Therefore:
    |
    | 1. CUSTOMER indices must remain unavailable.
    | 2. Installation proxy may be constructed only explicitly.
    |
    | The proxy is used here solely to prove that unsupported grid-source
    | events still cannot enter SAIDI/SAIFI.
    |--------------------------------------------------------------------------
    */

    const customerPopulation =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",

            customerPopulation:
                null,
        });


    const proxyPopulation =
        resolveReliabilityPopulation({
            basis:
                "INSTALLATION_PROXY",

            installationPopulation,

            explicitlyEnabledInstallationProxy:
                true,
        });


    /*
    |--------------------------------------------------------------------------
    | Customer-basis validation
    |--------------------------------------------------------------------------
    */

    const customerWeights =
        resolveInterruptionWeights({
            interruptions:
                eligibility
                    .eligible,

            population:
                customerPopulation,
        });


    const customerSaidi =
        calculateSaidi({
            interruptions:
                eligibility
                    .eligible,

            population:
                customerPopulation,
        });


    const customerSaifi =
        calculateSaifi({
            interruptions:
                eligibility
                    .eligible,

            population:
                customerPopulation,
        });


    const customerCaidi =
        calculateCaidi({
            saidi:
                customerSaidi,

            saifi:
                customerSaifi,
        });


    const customerLabels =
        buildReliabilityIndexLabels(
            customerPopulation
        );


    console.log("");
    console.log(
        "Customer-basis indices:"
    );

    console.log(
        "Population status:",
        customerPopulation
            .status
    );

    console.log(
        "Denominator:",
        customerPopulation
            .denominator
    );

    console.log(
        "SAIDI:",
        customerSaidi
            .saidiHours
    );

    console.log(
        "SAIFI:",
        customerSaifi
            .saifi
    );

    console.log(
        "CAIDI:",
        customerCaidi
            .caidiHours
    );


    assertEqual(
        customerPopulation
            .denominatorAvailable,
        false,
        "Customer denominator remains unavailable"
    );


    assertEqual(
        customerWeights
            .validWeightCount,
        0,
        "No customer interruption weights are fabricated"
    );


    assertEqual(
        customerSaidi
            .status,
        "UNAVAILABLE",
        "Customer SAIDI remains unavailable"
    );


    assertEqual(
        customerSaidi
            .saidiHours,
        null,
        "Customer SAIDI remains null"
    );


    assertEqual(
        customerSaifi
            .status,
        "UNAVAILABLE",
        "Customer SAIFI remains unavailable"
    );


    assertEqual(
        customerSaifi
            .saifi,
        null,
        "Customer SAIFI remains null"
    );


    assertEqual(
        customerCaidi
            .status,
        "UNAVAILABLE",
        "Customer CAIDI remains unavailable"
    );


    assertEqual(
        customerCaidi
            .caidiHours,
        null,
        "Customer CAIDI remains null"
    );


    assertEqual(
        customerLabels
            .qualifier,
        "UNAVAILABLE",
        "Customer index labels remain unavailable"
    );


    /*
    |--------------------------------------------------------------------------
    | Explicit installation-proxy safety check
    |--------------------------------------------------------------------------
    |
    | Even though we explicitly create a valid installation denominator,
    | the current grid-source events still MUST NOT produce proxy SAIDI/SAIFI
    | unless service interruption is confirmed and eligible.
    |--------------------------------------------------------------------------
    */

    const proxyWeights =
        resolveInterruptionWeights({
            interruptions:
                eligibility
                    .eligible,

            population:
                proxyPopulation,
        });


    const proxySaidi =
        calculateSaidi({
            interruptions:
                eligibility
                    .eligible,

            population:
                proxyPopulation,
        });


    const proxySaifi =
        calculateSaifi({
            interruptions:
                eligibility
                    .eligible,

            population:
                proxyPopulation,
        });


    const proxyCaidi =
        calculateCaidi({
            saidi:
                proxySaidi,

            saifi:
                proxySaifi,
        });


    const proxyLabels =
        buildReliabilityIndexLabels(
            proxyPopulation
        );


    console.log("");
    console.log(
        "Explicit installation-proxy safety check:"
    );

    console.log(
        "Population:",
        proxyPopulation
            .denominator
    );

    console.log(
        "Eligible service interruptions:",
        eligibility
            .eligibleEventCount
    );

    console.log(
        "Valid weights:",
        proxyWeights
            .validWeightCount
    );

    console.log(
        `${proxyLabels.saidi}:`,
        proxySaidi
            .saidiHours
    );

    console.log(
        `${proxyLabels.saifi}:`,
        proxySaifi
            .saifi
    );

    console.log(
        `${proxyLabels.caidi}:`,
        proxyCaidi
            .caidiHours
    );


    assertEqual(
        proxyPopulation
            .denominatorAvailable,
        true,
        "Explicit installation proxy denominator is available"
    );


    assertEqual(
        proxyPopulation
            .proxyBasis,
        true,
        "Installation population remains explicitly proxy"
    );


    assertEqual(
        eligibility
            .eligibleEventCount,
        0,
        "Current real events contain no eligible service interruptions"
    );


    assertEqual(
        proxyWeights
            .validWeightCount,
        0,
        "Current grid-source events produce no proxy interruption weights"
    );


    assertEqual(
        proxySaidi
            .status,
        "UNAVAILABLE",
        "Current real events do not produce site-based SAIDI-equivalent"
    );


    assertEqual(
        proxySaidi
            .saidiHours,
        null,
        "Current site-based SAIDI-equivalent remains null"
    );


    assertEqual(
        proxySaifi
            .status,
        "UNAVAILABLE",
        "Current real events do not produce site-based SAIFI-equivalent"
    );


    assertEqual(
        proxySaifi
            .saifi,
        null,
        "Current site-based SAIFI-equivalent remains null"
    );


    assertEqual(
        proxyCaidi
            .status,
        "UNAVAILABLE",
        "Current real events do not produce site-based CAIDI-equivalent"
    );


    assertEqual(
        proxyCaidi
            .caidiHours,
        null,
        "Current site-based CAIDI-equivalent remains null"
    );


    /*
    |--------------------------------------------------------------------------
    | Stored-event semantic assertions
    |--------------------------------------------------------------------------
    */

    assertEqual(
        confirmedServiceInterruptions
            .length,
        0,
        "No stored outage event currently claims confirmed service interruption"
    );


    assertEqual(
        explicitlyEnabledSaidiSaifi
            .length,
        0,
        "No stored outage event currently enables SAIDI/SAIFI"
    );


    assertTrue(
        gridSourceOnly.length >
            0,
        "Stored events retain grid-source interruption semantics"
    );


    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "REAL-DATA RELIABILITY INDEX VALIDATION PASSED"
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
        "- customer service interruption is not yet confirmed"
    );

    console.log(
        "- customer denominator is not yet validated"
    );

    console.log(
        "- SAIDI remains null"
    );

    console.log(
        "- SAIFI remains null"
    );

    console.log(
        "- CAIDI remains null"
    );

    console.log(
        "- no zero indices were fabricated"
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
        "Real-data reliability index validation failed:"
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
        await mongoose
            .disconnect();
    }
}