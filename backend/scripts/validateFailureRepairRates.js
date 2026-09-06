// backend/scripts/validateFailureRepairRates.js

import {
    calculateFailureRate,
    calculateRepairRate,
    calculateFailureRepairRates,
} from "../services/reliability/failureRepairRateCalculationService.js";


function assertEqual(
    actual,
    expected,
    label
) {
    if (
        actual !== expected
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
        !Number.isFinite(
            actual
        ) ||
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


/*
|--------------------------------------------------------------------------
| Synthetic validated MTBF
|--------------------------------------------------------------------------
*/

function mtbfResult(
    hours
) {
    return {
        status:
            "CALCULATED",

        reason:
            "CALCULATED",

        mtbfHours:
            hours,
    };
}


/*
|--------------------------------------------------------------------------
| Synthetic validated MTTR
|--------------------------------------------------------------------------
*/

function mttrResult(
    hours
) {
    return {
        status:
            "CALCULATED",

        reason:
            "CALCULATED",

        mttrHours:
            hours,
    };
}


function run() {
    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "ASHMAAN FAILURE / REPAIR RATE VALIDATION"
    );

    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 1 — Failure rate
    |
    | MTBF = 100 h
    |
    | λ = 1 / 100 = 0.01 failures/hour
    |--------------------------------------------------------------------------
    */

    const failureRate =
        calculateFailureRate({
            mtbf:
                mtbfResult(
                    100
                ),
        });


    assertEqual(
        failureRate.status,
        "CALCULATED",
        "Failure rate calculates from validated MTBF"
    );


    assertClose(
        failureRate.lambdaPerHour,
        0.01,
        0.000000001,
        "Failure rate λ equals 0.01 per hour"
    );


    assertEqual(
        failureRate.unit,
        "failures/hour",
        "Failure rate exposes engineering unit"
    );


    assertEqual(
        failureRate
            .probabilisticInterpretation
            .constantFailureRateAssumption,
        true,
        "Exponential reliability assumption is explicit"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — Repair rate
    |
    | MTTR = 4 h
    |
    | μ = 1 / 4 = 0.25 repairs/hour
    |--------------------------------------------------------------------------
    */

    const repairRate =
        calculateRepairRate({
            mttr:
                mttrResult(
                    4
                ),
        });


    assertEqual(
        repairRate.status,
        "CALCULATED",
        "Repair rate calculates from validated MTTR"
    );


    assertClose(
        repairRate.muPerHour,
        0.25,
        0.000000001,
        "Repair rate μ equals 0.25 per hour"
    );


    assertEqual(
        repairRate.unit,
        "repairs/hour",
        "Repair rate exposes engineering unit"
    );


    assertEqual(
        repairRate
            .probabilisticInterpretation
            .exponentialRepairTimeAssumption,
        true,
        "Exponential repair-time assumption is explicit"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — Combined rates
    |--------------------------------------------------------------------------
    */

    const combined =
        calculateFailureRepairRates({
            mtbf:
                mtbfResult(
                    100
                ),

            mttr:
                mttrResult(
                    4
                ),
        });


    assertEqual(
        combined.status,
        "CALCULATED",
        "Combined λ and μ calculation succeeds"
    );


    assertClose(
        combined
            .failureRate
            .lambdaPerHour,
        0.01,
        0.000000001,
        "Combined failure rate remains correct"
    );


    assertClose(
        combined
            .repairRate
            .muPerHour,
        0.25,
        0.000000001,
        "Combined repair rate remains correct"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — unavailable MTBF
    |--------------------------------------------------------------------------
    */

    const unavailableMtbf =
        calculateFailureRate({
            mtbf: {
                status:
                    "UNAVAILABLE",

                reason:
                    "NO_ELIGIBLE_FAILURES",

                mtbfHours:
                    null,
            },
        });


    assertEqual(
        unavailableMtbf.status,
        "UNAVAILABLE",
        "Unavailable MTBF blocks failure rate"
    );


    assertEqual(
        unavailableMtbf.reason,
        "MTBF_UNAVAILABLE",
        "Unavailable MTBF receives correct rate reason"
    );


    assertEqual(
        unavailableMtbf.lambdaPerHour,
        null,
        "Missing MTBF does not fabricate λ"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — unavailable MTTR
    |--------------------------------------------------------------------------
    */

    const unavailableMttr =
        calculateRepairRate({
            mttr: {
                status:
                    "UNAVAILABLE",

                reason:
                    "NO_COMPLETED_REPAIRS",

                mttrHours:
                    null,
            },
        });


    assertEqual(
        unavailableMttr.status,
        "UNAVAILABLE",
        "Unavailable MTTR blocks repair rate"
    );


    assertEqual(
        unavailableMttr.reason,
        "MTTR_UNAVAILABLE",
        "Unavailable MTTR receives correct rate reason"
    );


    assertEqual(
        unavailableMttr.muPerHour,
        null,
        "Missing MTTR does not fabricate μ"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — zero MTBF is invalid
    |--------------------------------------------------------------------------
    */

    const zeroMtbf =
        calculateFailureRate({
            mtbf:
                mtbfResult(
                    0
                ),
        });


    assertEqual(
        zeroMtbf.status,
        "UNAVAILABLE",
        "Zero MTBF cannot produce failure rate"
    );


    assertEqual(
        zeroMtbf.reason,
        "INVALID_MTBF",
        "Zero MTBF receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7 — zero MTTR is invalid
    |--------------------------------------------------------------------------
    */

    const zeroMttr =
        calculateRepairRate({
            mttr:
                mttrResult(
                    0
                ),
        });


    assertEqual(
        zeroMttr.status,
        "UNAVAILABLE",
        "Zero MTTR cannot produce repair rate"
    );


    assertEqual(
        zeroMttr.reason,
        "INVALID_MTTR",
        "Zero MTTR receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 8 — reciprocal identities
    |--------------------------------------------------------------------------
    */

    assertClose(
        failureRate.lambdaPerHour *
            failureRate.mtbfHours,
        1,
        0.000000001,
        "λ × MTBF equals one"
    );


    assertClose(
        repairRate.muPerHour *
            repairRate.mttrHours,
        1,
        0.000000001,
        "μ × MTTR equals one"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 9 — technical availability identity
    |
    | A = MTBF / (MTBF + MTTR)
    |
    | With:
    |
    | λ = 1 / MTBF
    | μ = 1 / MTTR
    |
    | therefore:
    |
    | A = μ / (λ + μ)
    |--------------------------------------------------------------------------
    */

    const availabilityFromMeans =
        100 /
        (
            100 +
            4
        );


    const availabilityFromRates =
        repairRate.muPerHour /
        (
            failureRate.lambdaPerHour +
            repairRate.muPerHour
        );


    assertClose(
        availabilityFromRates,
        availabilityFromMeans,
        0.000000001,
        "Rate-based availability equals MTBF/MTTR availability"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 10 — partially unavailable combined rates
    |--------------------------------------------------------------------------
    */

    const partial =
        calculateFailureRepairRates({
            mtbf:
                mtbfResult(
                    100
                ),

            mttr: {
                status:
                    "UNAVAILABLE",

                reason:
                    "NO_COMPLETED_REPAIRS",

                mttrHours:
                    null,
            },
        });


    assertEqual(
        partial.status,
        "UNAVAILABLE",
        "Combined rate result stays unavailable when one rate is unavailable"
    );


    assertEqual(
        partial
            .failureRate
            .status,
        "CALCULATED",
        "Available λ remains independently exposed"
    );


    assertEqual(
        partial
            .repairRate
            .status,
        "UNAVAILABLE",
        "Unavailable μ remains explicitly unavailable"
    );


    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "FAILURE / REPAIR RATE VALIDATION PASSED"
    );

    console.log(
        "================================================"
    );


    console.log("");

    console.log(
        "Validated engineering semantics:"
    );

    console.log(
        "- λ = 1 / MTBF"
    );

    console.log(
        "- μ = 1 / MTTR"
    );

    console.log(
        "- unavailable MTBF does not fabricate λ"
    );

    console.log(
        "- unavailable MTTR does not fabricate μ"
    );

    console.log(
        "- zero MTBF or MTTR is rejected"
    );

    console.log(
        "- λ and μ retain explicit per-hour units"
    );

    console.log(
        "- exponential lifetime and repair assumptions are explicit"
    );

    console.log(
        "- μ / (λ + μ) agrees with MTBF / (MTBF + MTTR)"
    );
}


try {
    run();
}
catch (error) {
    console.error("");

    console.error(
        "Failure / repair rate validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}