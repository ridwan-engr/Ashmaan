// backend/scripts/validateReliabilityIndicesCombined.js

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


function assertClose(
    actual,
    expected,
    tolerance,
    label
) {
    if (
        actual === null ||
        actual === undefined ||
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
| Synthetic OutageEvent-like document
|--------------------------------------------------------------------------
*/

function outageEvent({
    id,

    installationId,

    start,

    end,

    affectedCustomers =
        null,

    loadInterruptionConfirmed =
        true,

    eligibleForSaidiSaifi =
        true,

    eventType =
        "GRID_OUTAGE",

    source =
        "DERIVED",

    status =
        "RESTORED",
}) {
    return {
        _id:
            id,

        installation:
            installationId,

        eventType,

        source,

        status,

        startTime:
            new Date(
                start
            ),

        restorationTime:
            end
                ? new Date(
                    end
                )
                : null,

        endTime:
            end
                ? new Date(
                    end
                )
                : null,

        affectedCustomers,

        raw: {
            loadInterruptionConfirmed,

            eligibleForSaidiSaifi,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Pipeline helper
|--------------------------------------------------------------------------
*/

function runReliabilityPipeline({
    events,

    periodStart,

    periodEnd,

    population,
}) {
    const eligibility =
        evaluateServiceInterruptions({
            events,

            periodStart,

            periodEnd,
        });


    const weights =
        resolveInterruptionWeights({
            interruptions:
                eligibility
                    .eligible,

            population,
        });


    const saidi =
        calculateSaidi({
            interruptions:
                eligibility
                    .eligible,

            population,
        });


    const saifi =
        calculateSaifi({
            interruptions:
                eligibility
                    .eligible,

            population,
        });


    const caidi =
        calculateCaidi({
            saidi,
            saifi,
        });


    const labels =
        buildReliabilityIndexLabels(
            population
        );


    return {
        eligibility,

        weights,

        saidi,

        saifi,

        caidi,

        labels,
    };
}


/*
|--------------------------------------------------------------------------
| Main validation
|--------------------------------------------------------------------------
*/

function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN COMBINED SAIDI / SAIFI / CAIDI VALIDATION"
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
            "2026-09-05T06:00:00.000Z"
        );


    /*
    |--------------------------------------------------------------------------
    | CASE 1
    |
    | Full validated CUSTOMER pipeline
    |--------------------------------------------------------------------------
    |
    | Population = 100 customers
    |
    | EVENT A
    | 00:00 → 02:00
    | affected = 20
    |
    | Duration contribution:
    | 2 × 20 = 40 customer-h
    |
    | Frequency contribution:
    | 20 customer interruptions
    |
    |
    | EVENT B
    | 01:00 → 02:00
    | affected = 10
    |
    | Duration contribution:
    | 1 × 10 = 10 customer-h
    |
    | Frequency contribution:
    | 10 customer interruptions
    |
    |
    | Total:
    |
    | weighted duration = 50 customer-h
    | weighted starts   = 30
    |
    | SAIDI = 50 / 100 = 0.5 h/customer
    |
    | SAIFI = 30 / 100 = 0.3 interruptions/customer
    |
    | CAIDI = 0.5 / 0.3
    |       = 1.6666667 h
    |       = 100 min
    |--------------------------------------------------------------------------
    */

    const customerPopulation =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",

            customerPopulation:
                100,
        });


    const customerEvents =
        [
            outageEvent({
                id:
                    "CUSTOMER-A",

                installationId:
                    "SITE-A",

                start:
                    "2026-09-05T00:00:00.000Z",

                end:
                    "2026-09-05T02:00:00.000Z",

                affectedCustomers:
                    20,
            }),

            outageEvent({
                id:
                    "CUSTOMER-B",

                installationId:
                    "SITE-B",

                start:
                    "2026-09-05T01:00:00.000Z",

                end:
                    "2026-09-05T02:00:00.000Z",

                affectedCustomers:
                    10,
            }),
        ];


    const customer =
        runReliabilityPipeline({
            events:
                customerEvents,

            periodStart,

            periodEnd,

            population:
                customerPopulation,
        });


    assertEqual(
        customer
            .eligibility
            .eligibleEventCount,
        2,
        "Customer pipeline accepts two confirmed interruptions"
    );


    assertEqual(
        customer
            .eligibility
            .startedInterruptionCount,
        2,
        "Customer pipeline identifies two interruption starts"
    );


    assertEqual(
        customer
            .weights
            .complete,
        true,
        "Customer interruption weighting is complete"
    );


    assertEqual(
        customer
            .weights
            .totalWeight,
        30,
        "Customer interruption weights total 30"
    );


    assertClose(
        customer
            .saidi
            .weightedInterruptionHours,
        50,
        0.000001,
        "Customer weighted duration equals 50 customer-hours"
    );


    assertClose(
        customer
            .saidi
            .saidiHours,
        0.5,
        0.000001,
        "Combined customer SAIDI equals 0.5 hours"
    );


    assertClose(
        customer
            .saifi
            .weightedInterruptionStarts,
        30,
        0.000001,
        "Customer weighted starts equal 30"
    );


    assertClose(
        customer
            .saifi
            .saifi,
        0.3,
        0.000001,
        "Combined customer SAIFI equals 0.3"
    );


    assertClose(
        customer
            .caidi
            .caidiHours,
        1.6666666667,
        0.000001,
        "Combined customer CAIDI equals approximately 1.6667 hours"
    );


    assertClose(
        customer
            .caidi
            .caidiMinutes,
        100,
        0.000001,
        "Combined customer CAIDI equals 100 minutes"
    );


    assertEqual(
        customer
            .labels
            .saidi,
        "SAIDI",
        "Customer pipeline uses standard SAIDI label"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2
    |
    | Carried interruption
    |--------------------------------------------------------------------------
    |
    | Event starts before periodStart.
    |
    | It contributes:
    |
    | SAIDI duration → YES
    | SAIFI start    → NO
    |--------------------------------------------------------------------------
    */

    const proxyPopulation =
        resolveReliabilityPopulation({
            basis:
                "INSTALLATION_PROXY",

            installationPopulation:
                10,

            explicitlyEnabledInstallationProxy:
                true,
        });


    const carriedEvents =
        [
            outageEvent({
                id:
                    "CARRIED",

                installationId:
                    "SITE-X",

                start:
                    "2026-09-04T23:00:00.000Z",

                end:
                    "2026-09-05T01:00:00.000Z",
            }),

            outageEvent({
                id:
                    "STARTED",

                installationId:
                    "SITE-Y",

                start:
                    "2026-09-05T02:00:00.000Z",

                end:
                    "2026-09-05T03:00:00.000Z",
            }),
        ];


    const carried =
        runReliabilityPipeline({
            events:
                carriedEvents,

            periodStart,

            periodEnd,

            population:
                proxyPopulation,
        });


    assertEqual(
        carried
            .eligibility
            .eligibleEventCount,
        2,
        "Carried pipeline has two active eligible interruptions"
    );


    assertEqual(
        carried
            .eligibility
            .startedInterruptionCount,
        1,
        "Only one interruption starts inside reporting period"
    );


    /*
     * Carried event contributes 1 hour inside period.
     * Started event contributes 1 hour.
     *
     * Total site interruption duration = 2 h.
     *
     * Population = 10.
     *
     * Site-SAIDI-equivalent = 0.2 h/site.
     */

    assertClose(
        carried
            .saidi
            .weightedInterruptionHours,
        2,
        0.000001,
        "Carried interruption contributes clipped SAIDI duration"
    );


    assertClose(
        carried
            .saidi
            .saidiHours,
        0.2,
        0.000001,
        "Carried scenario SAIDI-equivalent equals 0.2"
    );


    /*
     * Only SITE-Y starts inside period.
     *
     * weighted start = 1
     *
     * SAIFI-equivalent = 1 / 10 = 0.1
     */

    assertEqual(
        carried
            .saifi
            .physicalStartedEpisodeCount,
        1,
        "Carried interruption is excluded from SAIFI starts"
    );


    assertClose(
        carried
            .saifi
            .saifi,
        0.1,
        0.000001,
        "Carried scenario SAIFI-equivalent equals 0.1"
    );


    /*
     * CAIDI:
     *
     * 0.2 / 0.1 = 2 hours.
     *
     * This is correct for the reporting-period index values.
     */

    assertClose(
        carried
            .caidi
            .caidiHours,
        2,
        0.000001,
        "Carried scenario CAIDI-equivalent equals 2 hours"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3
    |
    | Unsupported grid-source transition must never enter service indices
    |--------------------------------------------------------------------------
    */

    const sourceTransferOnly =
        [
            outageEvent({
                id:
                    "GRID-SOURCE-ONLY",

                installationId:
                    "SITE-Z",

                start:
                    "2026-09-05T01:00:00.000Z",

                end:
                    "2026-09-05T01:30:00.000Z",

                loadInterruptionConfirmed:
                    false,

                eligibleForSaidiSaifi:
                    false,
            }),
        ];


    const sourceOnly =
        runReliabilityPipeline({
            events:
                sourceTransferOnly,

            periodStart,

            periodEnd,

            population:
                proxyPopulation,
        });


    assertEqual(
        sourceOnly
            .eligibility
            .eligibleEventCount,
        0,
        "Grid-source transfer without service interruption is rejected"
    );


    assertEqual(
        sourceOnly
            .eligibility
            .rejectionCounts
            .LOAD_INTERRUPTION_NOT_CONFIRMED,
        1,
        "Unsupported source transfer receives service-interruption rejection"
    );


    assertEqual(
        sourceOnly
            .saidi
            .status,
        "UNAVAILABLE",
        "Unsupported grid-source event does not produce SAIDI"
    );


    assertEqual(
        sourceOnly
            .saidi
            .saidiHours,
        null,
        "Unsupported grid-source event leaves SAIDI null"
    );


    assertEqual(
        sourceOnly
            .saifi
            .status,
        "UNAVAILABLE",
        "Unsupported grid-source event does not produce SAIFI"
    );


    assertEqual(
        sourceOnly
            .saifi
            .saifi,
        null,
        "Unsupported grid-source event leaves SAIFI null"
    );


    assertEqual(
        sourceOnly
            .caidi
            .status,
        "UNAVAILABLE",
        "Unsupported grid-source event does not produce CAIDI"
    );


    assertEqual(
        sourceOnly
            .caidi
            .caidiHours,
        null,
        "Unsupported grid-source event leaves CAIDI null"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4
    |
    | Customer data unavailable
    |--------------------------------------------------------------------------
    |
    | A confirmed interruption exists, but affectedCustomers is unknown.
    |
    | This must NOT silently become one customer.
    |--------------------------------------------------------------------------
    */

    const missingCustomerEvent =
        [
            outageEvent({
                id:
                    "UNKNOWN-CUSTOMERS",

                installationId:
                    "SITE-Q",

                start:
                    "2026-09-05T03:00:00.000Z",

                end:
                    "2026-09-05T04:00:00.000Z",

                affectedCustomers:
                    null,
            }),
        ];


    const missingCustomer =
        runReliabilityPipeline({
            events:
                missingCustomerEvent,

            periodStart,

            periodEnd,

            population:
                customerPopulation,
        });


    assertEqual(
        missingCustomer
            .eligibility
            .eligibleEventCount,
        1,
        "Confirmed interruption remains eligible before customer weighting"
    );


    assertEqual(
        missingCustomer
            .weights
            .complete,
        false,
        "Missing customer count makes weighting incomplete"
    );


    assertEqual(
        missingCustomer
            .saidi
            .status,
        "UNAVAILABLE",
        "Missing affected-customer count blocks customer SAIDI"
    );


    assertEqual(
        missingCustomer
            .saifi
            .status,
        "UNAVAILABLE",
        "Missing affected-customer count blocks customer SAIFI"
    );


    assertEqual(
        missingCustomer
            .caidi
            .status,
        "UNAVAILABLE",
        "Missing affected-customer count blocks customer CAIDI"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5
    |
    | Installation proxy must be explicitly labelled
    |--------------------------------------------------------------------------
    */

    const proxyLabels =
        buildReliabilityIndexLabels(
            proxyPopulation
        );


    assertTrue(
        proxyLabels
            .saidi
            .includes(
                "Equivalent"
            ),
        "Proxy SAIDI label explicitly identifies equivalent metric"
    );


    assertTrue(
        proxyLabels
            .saifi
            .includes(
                "Equivalent"
            ),
        "Proxy SAIFI label explicitly identifies equivalent metric"
    );


    assertTrue(
        proxyLabels
            .caidi
            .includes(
                "Equivalent"
            ),
        "Proxy CAIDI label explicitly identifies equivalent metric"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6
    |
    | No population denominator
    |--------------------------------------------------------------------------
    */

    const unavailablePopulation =
        resolveReliabilityPopulation();


    const denominatorUnavailable =
        runReliabilityPipeline({
            events:
                customerEvents,

            periodStart,

            periodEnd,

            population:
                unavailablePopulation,
        });


    assertEqual(
        denominatorUnavailable
            .weights
            .validWeightCount,
        0,
        "Unavailable population produces no valid interruption weights"
    );


    assertEqual(
        denominatorUnavailable
            .saidi
            .reason,
        "POPULATION_UNAVAILABLE",
        "Unavailable denominator blocks SAIDI"
    );


    assertEqual(
        denominatorUnavailable
            .saifi
            .reason,
        "POPULATION_UNAVAILABLE",
        "Unavailable denominator blocks SAIFI"
    );


    assertEqual(
        denominatorUnavailable
            .caidi
            .reason,
        "SAIDI_UNAVAILABLE",
        "Unavailable denominator propagates to CAIDI"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7
    |
    | Boundary exclusion
    |--------------------------------------------------------------------------
    |
    | An interruption starting exactly at periodEnd belongs to next period.
    |--------------------------------------------------------------------------
    */

    const boundaryEvent =
        [
            outageEvent({
                id:
                    "BOUNDARY",

                installationId:
                    "SITE-BND",

                start:
                    "2026-09-05T06:00:00.000Z",

                end:
                    "2026-09-05T07:00:00.000Z",
            }),
        ];


    const boundary =
        runReliabilityPipeline({
            events:
                boundaryEvent,

            periodStart,

            periodEnd,

            population:
                proxyPopulation,
        });


    assertEqual(
        boundary
            .eligibility
            .eligibleEventCount,
        0,
        "Event starting exactly at periodEnd excluded from pipeline"
    );


    assertEqual(
        boundary
            .eligibility
            .rejectionCounts
            .OUTSIDE_REPORTING_WINDOW,
        1,
        "Boundary event receives outside-window rejection"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 8
    |
    | Internal consistency
    |--------------------------------------------------------------------------
    */

    assertClose(
        customer
            .saidi
            .saidiHours /
        customer
            .saifi
            .saifi,

        customer
            .caidi
            .caidiHours,

        0.000001,

        "Combined pipeline satisfies CAIDI = SAIDI / SAIFI"
    );


    assertClose(
        customer
            .saidi
            .weightedInterruptionHours /
        customer
            .saifi
            .weightedInterruptionStarts,

        customer
            .caidi
            .caidiHours,

        0.000001,

        "Combined pipeline satisfies weighted-hours / weighted-starts identity"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "COMBINED RELIABILITY INDEX VALIDATION PASSED"
    );
    console.log(
        "================================================"
    );


    console.log("");
    console.log(
        "Validated engineering semantics:"
    );

    console.log(
        "- confirmed service interruptions only"
    );

    console.log(
        "- half-open reporting windows"
    );

    console.log(
        "- carried interruptions affect duration but not frequency"
    );

    console.log(
        "- customer counts are never invented"
    );

    console.log(
        "- installation metrics remain explicitly proxy/equivalent"
    );

    console.log(
        "- unsupported grid-source transitions yield null indices"
    );
}


try {
    run();
}
catch (error) {
    console.error("");
    console.error(
        "Combined reliability index validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}