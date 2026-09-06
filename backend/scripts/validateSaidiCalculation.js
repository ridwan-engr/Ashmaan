// backend/scripts/validateSaidiCalculation.js

import {
    resolveReliabilityPopulation,
} from "../services/reliability/reliabilityPopulationService.js";

import {
    calculateSaidi,
} from "../services/reliability/saidiCalculationService.js";


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


function eligibleInterruption({
    id,
    installationId,
    start,
    end,
    affectedCustomers =
        null,
}) {
    return {
        eligible:
            true,

        sourceEventId:
            id,

        installationId,

        clippedStart:
            new Date(start),

        clippedEnd:
            new Date(end),

        originalStart:
            new Date(start),

        originalEnd:
            new Date(end),

        interruptionHours:
            (
                new Date(end) -
                new Date(start)
            ) /
            3600000,

        activeInPeriod:
            true,

        startedInPeriod:
            true,

        affectedCustomers,
    };
}


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN SAIDI CALCULATION VALIDATION"
    );
    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 1 — customer calculation
    |--------------------------------------------------------------------------
    |
    | SITE A:
    |
    | 00:00 - 02:00, 20 customers
    |
    | weighted duration =
    | 2 h × 20 = 40 customer-h
    |
    | SITE B:
    |
    | 01:00 - 02:00, 10 customers
    |
    | weighted duration =
    | 1 h × 10 = 10 customer-h
    |
    | total = 50 customer-h
    |
    | population = 100 customers
    |
    | SAIDI = 0.5 h/customer
    |--------------------------------------------------------------------------
    */

    const customerPopulation =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",

            customerPopulation:
                100,
        });


    const customerResult =
        calculateSaidi({
            population:
                customerPopulation,

            interruptions: [
                eligibleInterruption({
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

                eligibleInterruption({
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
            ],
        });


    assertEqual(
        customerResult.status,
        "CALCULATED",
        "Customer SAIDI calculated"
    );


    assertClose(
        customerResult
            .weightedInterruptionHours,
        50,
        0.000001,
        "Customer weighted interruption hours"
    );


    assertClose(
        customerResult
            .saidiHours,
        0.5,
        0.000001,
        "Customer SAIDI equals 0.5 hours"
    );


    assertClose(
        customerResult
            .saidiMinutes,
        30,
        0.000001,
        "Customer SAIDI equals 30 minutes"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — duplicate/overlapping events on same installation
    |--------------------------------------------------------------------------
    |
    | SITE A
    |
    | Event 1: 00:00 - 02:00
    | Event 2: 01:00 - 03:00
    |
    | Union duration = 3 hours, NOT 4.
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


    const overlapResult =
        calculateSaidi({
            population:
                proxyPopulation,

            interruptions: [
                eligibleInterruption({
                    id:
                        "C1",

                    installationId:
                        "SITE-A",

                    start:
                        "2026-09-05T00:00:00.000Z",

                    end:
                        "2026-09-05T02:00:00.000Z",
                }),

                eligibleInterruption({
                    id:
                        "C2",

                    installationId:
                        "SITE-A",

                    start:
                        "2026-09-05T01:00:00.000Z",

                    end:
                        "2026-09-05T03:00:00.000Z",
                }),
            ],
        });


    assertEqual(
        overlapResult.status,
        "CALCULATED",
        "Proxy SAIDI calculated"
    );


    assertClose(
        overlapResult
            .weightedInterruptionHours,
        3,
        0.000001,
        "Overlapping site events count three hours, not four"
    );


    assertClose(
        overlapResult
            .saidiHours,
        0.3,
        0.000001,
        "Site-based SAIDI-equivalent equals 0.3 hours"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — different overlapping customer weights
    |--------------------------------------------------------------------------
    |
    | 00:00 - 02:00 = 20 customers
    | 01:00 - 03:00 = 30 customers
    |
    | 00-01 → 20
    | 01-02 → max(20,30) = 30
    | 02-03 → 30
    |
    | total = 80 customer-hours.
    |
    | NOT:
    | 20×2 + 30×2 = 100.
    |--------------------------------------------------------------------------
    */

    const weightedOverlap =
        calculateSaidi({
            population:
                customerPopulation,

            interruptions: [
                eligibleInterruption({
                    id:
                        "D1",

                    installationId:
                        "SITE-X",

                    start:
                        "2026-09-05T00:00:00.000Z",

                    end:
                        "2026-09-05T02:00:00.000Z",

                    affectedCustomers:
                        20,
                }),

                eligibleInterruption({
                    id:
                        "D2",

                    installationId:
                        "SITE-X",

                    start:
                        "2026-09-05T01:00:00.000Z",

                    end:
                        "2026-09-05T03:00:00.000Z",

                    affectedCustomers:
                        30,
                }),
            ],
        });


    assertClose(
        weightedOverlap
            .weightedInterruptionHours,
        80,
        0.000001,
        "Overlapping customer events use maximum concurrent weight"
    );


    assertClose(
        weightedOverlap
            .saidiHours,
        0.8,
        0.000001,
        "Weighted-overlap SAIDI equals 0.8 hours"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — missing affected customers
    |--------------------------------------------------------------------------
    */

    const incomplete =
        calculateSaidi({
            population:
                customerPopulation,

            interruptions: [
                eligibleInterruption({
                    id:
                        "E",

                    installationId:
                        "SITE-E",

                    start:
                        "2026-09-05T00:00:00.000Z",

                    end:
                        "2026-09-05T01:00:00.000Z",

                    affectedCustomers:
                        null,
                }),
            ],
        });


    assertEqual(
        incomplete.status,
        "UNAVAILABLE",
        "Incomplete customer weighting blocks SAIDI"
    );


    assertEqual(
        incomplete.reason,
        "INCOMPLETE_INTERRUPTION_WEIGHTING",
        "Incomplete weighting has correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — unavailable population
    |--------------------------------------------------------------------------
    */

    const unavailablePopulation =
        resolveReliabilityPopulation();


    const unavailable =
        calculateSaidi({
            population:
                unavailablePopulation,

            interruptions: [],
        });


    assertEqual(
        unavailable.status,
        "UNAVAILABLE",
        "Unavailable denominator blocks SAIDI"
    );


    assertEqual(
        unavailable.reason,
        "POPULATION_UNAVAILABLE",
        "Unavailable denominator has correct SAIDI reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — no eligible interruption evidence
    |--------------------------------------------------------------------------
    |
    | Important:
    |
    | Do NOT convert absence of eligible evidence into SAIDI = 0.
    |--------------------------------------------------------------------------
    */

    const noEvidence =
        calculateSaidi({
            population:
                proxyPopulation,

            interruptions: [],
        });


    assertEqual(
        noEvidence.status,
        "UNAVAILABLE",
        "No eligible interruption evidence does not become zero SAIDI"
    );


    assertEqual(
        noEvidence.saidiHours,
        null,
        "No-evidence SAIDI remains null"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "SAIDI CALCULATION VALIDATION PASSED"
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
        "SAIDI calculation validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}