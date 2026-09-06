import {
    resolveReliabilityPopulation,
} from "../services/reliability/reliabilityPopulationService.js";

import {
    calculateAsaiAsui,
} from "../services/reliability/asaiAsuiCalculationService.js";


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


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN ASAI / ASUI CALCULATION VALIDATION"
    );
    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 1 — customer basis
    |--------------------------------------------------------------------------
    |
    | 100 customers
    | 24-hour reporting period
    |
    | total customer-hours =
    | 100 × 24 = 2400
    |
    | interruption customer-hours = 60
    |
    | ASUI = 60 / 2400 = 0.025
    | ASAI = 0.975
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
        calculateAsaiAsui({
            population:
                customerPopulation,

            periodStart:
                "2026-09-05T00:00:00.000Z",

            periodEnd:
                "2026-09-06T00:00:00.000Z",

            weightedInterruptionHours:
                60,

            serviceInterruptionObservable:
                true,
        });


    assertEqual(
        customerResult.status,
        "CALCULATED",
        "Customer ASAI/ASUI calculated"
    );


    assertClose(
        customerResult
            .totalPopulationHours,
        2400,
        0.000001,
        "Total customer-hours equal 2400"
    );


    assertClose(
        customerResult
            .asui,
        0.025,
        0.000001,
        "Customer ASUI equals 0.025"
    );


    assertClose(
        customerResult
            .asuiPercent,
        2.5,
        0.000001,
        "Customer ASUI equals 2.5 percent"
    );


    assertClose(
        customerResult
            .asai,
        0.975,
        0.000001,
        "Customer ASAI equals 0.975"
    );


    assertClose(
        customerResult
            .asaiPercent,
        97.5,
        0.000001,
        "Customer ASAI equals 97.5 percent"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — no interruption
    |--------------------------------------------------------------------------
    |
    | This is allowed only when observability is established.
    |--------------------------------------------------------------------------
    */

    const zeroInterruption =
        calculateAsaiAsui({
            population:
                customerPopulation,

            periodStart:
                "2026-09-05T00:00:00.000Z",

            periodEnd:
                "2026-09-06T00:00:00.000Z",

            weightedInterruptionHours:
                0,

            serviceInterruptionObservable:
                true,
        });


    assertClose(
        zeroInterruption
            .asai,
        1,
        0.000001,
        "Observable zero-interruption ASAI equals one"
    );


    assertClose(
        zeroInterruption
            .asui,
        0,
        0.000001,
        "Observable zero-interruption ASUI equals zero"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — observability unavailable
    |--------------------------------------------------------------------------
    |
    | Even if weighted interruption hours happen to be zero,
    | unavailable observability must NOT become ASAI=1.
    |--------------------------------------------------------------------------
    */

    const notObservable =
        calculateAsaiAsui({
            population:
                customerPopulation,

            periodStart:
                "2026-09-05T00:00:00.000Z",

            periodEnd:
                "2026-09-06T00:00:00.000Z",

            weightedInterruptionHours:
                0,

            serviceInterruptionObservable:
                false,
        });


    assertEqual(
        notObservable.status,
        "UNAVAILABLE",
        "Missing service observability blocks ASAI/ASUI"
    );


    assertEqual(
        notObservable.reason,
        "SERVICE_OBSERVABILITY_NOT_ESTABLISHED",
        "Missing observability receives correct reason"
    );


    assertEqual(
        notObservable.asai,
        null,
        "Unavailable observability does not fabricate ASAI one"
    );


    assertEqual(
        notObservable.asui,
        null,
        "Unavailable observability does not fabricate ASUI zero"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — unavailable population
    |--------------------------------------------------------------------------
    */

    const unavailablePopulation =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",

            customerPopulation:
                null,
        });


    const missingPopulation =
        calculateAsaiAsui({
            population:
                unavailablePopulation,

            periodStart:
                "2026-09-05T00:00:00.000Z",

            periodEnd:
                "2026-09-06T00:00:00.000Z",

            weightedInterruptionHours:
                0,

            serviceInterruptionObservable:
                true,
        });


    assertEqual(
        missingPopulation.status,
        "UNAVAILABLE",
        "Unavailable population blocks ASAI/ASUI"
    );


    assertEqual(
        missingPopulation.reason,
        "POPULATION_UNAVAILABLE",
        "Unavailable population receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — invalid reporting interval
    |--------------------------------------------------------------------------
    */

    const invalidWindow =
        calculateAsaiAsui({
            population:
                customerPopulation,

            periodStart:
                "2026-09-06T00:00:00.000Z",

            periodEnd:
                "2026-09-05T00:00:00.000Z",

            weightedInterruptionHours:
                0,

            serviceInterruptionObservable:
                true,
        });


    assertEqual(
        invalidWindow.status,
        "UNAVAILABLE",
        "Invalid reporting window blocks ASAI/ASUI"
    );


    assertEqual(
        invalidWindow.reason,
        "INVALID_REPORTING_WINDOW",
        "Invalid reporting window receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — impossible interruption duration
    |--------------------------------------------------------------------------
    |
    | 100 customers × 24 h = 2400 customer-hours max.
    |
    | 2500 is impossible.
    |--------------------------------------------------------------------------
    */

    const impossibleDuration =
        calculateAsaiAsui({
            population:
                customerPopulation,

            periodStart:
                "2026-09-05T00:00:00.000Z",

            periodEnd:
                "2026-09-06T00:00:00.000Z",

            weightedInterruptionHours:
                2500,

            serviceInterruptionObservable:
                true,
        });


    assertEqual(
        impossibleDuration.status,
        "UNAVAILABLE",
        "Impossible interruption duration blocks ASAI/ASUI"
    );


    assertEqual(
        impossibleDuration.reason,
        "INVALID_INTERRUPTION_DURATION",
        "Impossible interruption duration receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7 — installation proxy
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


    const proxyResult =
        calculateAsaiAsui({
            population:
                proxyPopulation,

            periodStart:
                "2026-09-05T00:00:00.000Z",

            periodEnd:
                "2026-09-05T10:00:00.000Z",

            weightedInterruptionHours:
                5,

            serviceInterruptionObservable:
                true,
        });


    assertClose(
        proxyResult
            .totalPopulationHours,
        100,
        0.000001,
        "Proxy total site-hours equal 100"
    );


    assertClose(
        proxyResult
            .asui,
        0.05,
        0.000001,
        "Site-based ASUI-equivalent equals 0.05"
    );


    assertClose(
        proxyResult
            .asai,
        0.95,
        0.000001,
        "Site-based ASAI-equivalent equals 0.95"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASAI / ASUI CALCULATION VALIDATION PASSED"
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
        "ASAI / ASUI validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}