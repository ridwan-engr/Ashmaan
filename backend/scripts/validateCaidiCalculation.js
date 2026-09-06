// backend/scripts/validateCaidiCalculation.js

import {
    resolveReliabilityPopulation,
} from "../services/reliability/reliabilityPopulationService.js";

import {
    calculateSaidi,
} from "../services/reliability/saidiCalculationService.js";

import {
    calculateSaifi,
} from "../services/reliability/saifiCalculationService.js";

import {
    calculateCaidi,
} from "../services/reliability/caidiCalculationService.js";


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


function interruption({
    id,
    installationId,
    start,
    end,
    affectedCustomers =
        null,
    startedInPeriod =
        true,
}) {
    return {
        eligible:
            true,

        sourceEventId:
            id,

        installationId,

        originalStart:
            new Date(
                start
            ),

        originalEnd:
            new Date(
                end
            ),

        clippedStart:
            new Date(
                start
            ),

        clippedEnd:
            new Date(
                end
            ),

        activeInPeriod:
            true,

        startedInPeriod,

        affectedCustomers,

        interruptionHours:
            (
                new Date(end) -
                new Date(start)
            ) /
            3600000,
    };
}


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN CAIDI CALCULATION VALIDATION"
    );
    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 1 — customer-based CAIDI
    |--------------------------------------------------------------------------
    |
    | Event A:
    | 2 hours × 20 customers = 40 customer-hours
    |
    | Event B:
    | 1 hour × 10 customers = 10 customer-hours
    |
    | weighted interruption hours = 50
    |
    | weighted interruption starts = 30
    |
    | population = 100
    |
    | SAIDI = 50 / 100 = 0.5 h/customer
    | SAIFI = 30 / 100 = 0.3 interruptions/customer
    |
    | CAIDI = 0.5 / 0.3
    |       = 1.6666667 hours/interruption
    |       = 100 minutes/interruption
    |--------------------------------------------------------------------------
    */

    const customerPopulation =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",

            customerPopulation:
                100,
        });


    const customerInterruptions =
        [
            interruption({
                id:
                    "A",

                installationId:
                    "SITE-A",

                start:
                    "2026-09-05T00:00:00.000Z",

                end:
                    "2026-09-05T02:00:00.000Z",

                affectedCustomers:
                    20,
            }),

            interruption({
                id:
                    "B",

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


    const customerSaidi =
        calculateSaidi({
            interruptions:
                customerInterruptions,

            population:
                customerPopulation,
        });


    const customerSaifi =
        calculateSaifi({
            interruptions:
                customerInterruptions,

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


    assertEqual(
        customerCaidi.status,
        "CALCULATED",
        "Customer CAIDI calculated"
    );


    assertClose(
        customerCaidi
            .saidiHours,
        0.5,
        0.000001,
        "CAIDI receives customer SAIDI of 0.5 hours"
    );


    assertClose(
        customerCaidi
            .saifi,
        0.3,
        0.000001,
        "CAIDI receives customer SAIFI of 0.3"
    );


    assertClose(
        customerCaidi
            .caidiHours,
        1.6666666667,
        0.000001,
        "Customer CAIDI equals approximately 1.6667 hours"
    );


    assertClose(
        customerCaidi
            .caidiMinutes,
        100,
        0.000001,
        "Customer CAIDI equals 100 minutes"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — installation-proxy CAIDI
    |--------------------------------------------------------------------------
    |
    | SITE-A interruption:
    | 2 hours × 1 installation
    |
    | SITE-B interruption:
    | 1 hour × 1 installation
    |
    | weighted duration = 3 site-hours
    | weighted starts = 2
    | population = 10
    |
    | SAIDI-equivalent = 0.3 h/site
    | SAIFI-equivalent = 0.2 starts/site
    |
    | CAIDI-equivalent = 1.5 hours
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


    const proxyInterruptions =
        [
            interruption({
                id:
                    "P1",

                installationId:
                    "SITE-A",

                start:
                    "2026-09-05T00:00:00.000Z",

                end:
                    "2026-09-05T02:00:00.000Z",
            }),

            interruption({
                id:
                    "P2",

                installationId:
                    "SITE-B",

                start:
                    "2026-09-05T01:00:00.000Z",

                end:
                    "2026-09-05T02:00:00.000Z",
            }),
        ];


    const proxySaidi =
        calculateSaidi({
            interruptions:
                proxyInterruptions,

            population:
                proxyPopulation,
        });


    const proxySaifi =
        calculateSaifi({
            interruptions:
                proxyInterruptions,

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


    assertEqual(
        proxyCaidi.status,
        "CALCULATED",
        "Installation-proxy CAIDI calculated"
    );


    assertClose(
        proxyCaidi
            .caidiHours,
        1.5,
        0.000001,
        "Site-based CAIDI-equivalent equals 1.5 hours"
    );


    assertClose(
        proxyCaidi
            .caidiMinutes,
        90,
        0.000001,
        "Site-based CAIDI-equivalent equals 90 minutes"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — unavailable SAIDI
    |--------------------------------------------------------------------------
    */

    const missingSaidi =
        calculateCaidi({
            saidi: {
                status:
                    "UNAVAILABLE",

                reason:
                    "NO_ELIGIBLE_INTERRUPTION_DATA",

                saidiHours:
                    null,
            },

            saifi:
                customerSaifi,
        });


    assertEqual(
        missingSaidi.status,
        "UNAVAILABLE",
        "Unavailable SAIDI blocks CAIDI"
    );


    assertEqual(
        missingSaidi.reason,
        "SAIDI_UNAVAILABLE",
        "Unavailable SAIDI receives correct CAIDI reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — unavailable SAIFI
    |--------------------------------------------------------------------------
    */

    const missingSaifi =
        calculateCaidi({
            saidi:
                customerSaidi,

            saifi: {
                status:
                    "UNAVAILABLE",

                reason:
                    "NO_STARTED_INTERRUPTION_DATA",

                saifi:
                    null,
            },
        });


    assertEqual(
        missingSaifi.status,
        "UNAVAILABLE",
        "Unavailable SAIFI blocks CAIDI"
    );


    assertEqual(
        missingSaifi.reason,
        "SAIFI_UNAVAILABLE",
        "Unavailable SAIFI receives correct CAIDI reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — basis mismatch
    |--------------------------------------------------------------------------
    |
    | Customer SAIDI cannot be divided by site-proxy SAIFI.
    |--------------------------------------------------------------------------
    */

    const basisMismatch =
        calculateCaidi({
            saidi:
                customerSaidi,

            saifi:
                proxySaifi,
        });


    assertEqual(
        basisMismatch.status,
        "UNAVAILABLE",
        "Population basis mismatch blocks CAIDI"
    );


    assertEqual(
        basisMismatch.reason,
        "POPULATION_BASIS_MISMATCH",
        "Population basis mismatch receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — denominator mismatch
    |--------------------------------------------------------------------------
    */

    const denominatorMismatch =
        calculateCaidi({
            saidi:
                customerSaidi,

            saifi: {
                ...customerSaifi,

                denominator:
                    200,
            },
        });


    assertEqual(
        denominatorMismatch.status,
        "UNAVAILABLE",
        "Denominator mismatch blocks CAIDI"
    );


    assertEqual(
        denominatorMismatch.reason,
        "DENOMINATOR_MISMATCH",
        "Denominator mismatch receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7 — zero SAIFI
    |--------------------------------------------------------------------------
    |
    | CAIDI is undefined when interruption frequency is zero.
    |--------------------------------------------------------------------------
    */

    const zeroSaifi =
        calculateCaidi({
            saidi: {
                status:
                    "CALCULATED",

                populationBasis:
                    "CUSTOMER",

                populationStatus:
                    "VALIDATED",

                denominator:
                    100,

                denominatorUnit:
                    "CUSTOMERS",

                saidiHours:
                    0,

                saidiMinutes:
                    0,

                weightedInterruptionHours:
                    0,
            },

            saifi: {
                status:
                    "CALCULATED",

                populationBasis:
                    "CUSTOMER",

                populationStatus:
                    "VALIDATED",

                denominator:
                    100,

                denominatorUnit:
                    "CUSTOMERS",

                saifi:
                    0,

                weightedInterruptionStarts:
                    0,
            },
        });


    assertEqual(
        zeroSaifi.status,
        "UNAVAILABLE",
        "Zero SAIFI does not produce numeric CAIDI"
    );


    assertEqual(
        zeroSaifi.reason,
        "ZERO_SAIFI",
        "Zero SAIFI receives correct CAIDI reason"
    );


    assertEqual(
        zeroSaifi.caidiHours,
        null,
        "Zero-frequency CAIDI remains null"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 8 — numerator cross-check
    |--------------------------------------------------------------------------
    |
    | CAIDI should also equal:
    |
    | weighted interruption hours
    | ---------------------------
    | weighted interruption starts
    |--------------------------------------------------------------------------
    */

    assertClose(
        customerCaidi
            .weightedInterruptionHours /
        customerCaidi
            .weightedInterruptionStarts,

        customerCaidi
            .caidiHours,

        0.000001,

        "CAIDI agrees with weighted-hours divided by weighted-starts"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "CAIDI CALCULATION VALIDATION PASSED"
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
        "CAIDI calculation validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}