// backend/scripts/validateReliabilityFunction.js

import {
    calculateReliabilityFunction,
} from "../services/reliability/reliabilityFunctionCalculationService.js";


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


function failureRateResult(
    lambdaPerHour
) {
    return {
        status:
            "CALCULATED",

        reason:
            "CALCULATED",

        lambdaPerHour,

        unit:
            "failures/hour",
    };
}


function run() {
    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "ASHMAAN RELIABILITY FUNCTION VALIDATION"
    );

    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 1
    |
    | λ = 0.01 h^-1
    | t = 10 h
    |
    | R(10) = exp(-0.1)
    |       ≈ 0.904837418
    |--------------------------------------------------------------------------
    */

    const result =
        calculateReliabilityFunction({
            failureRate:
                failureRateResult(
                    0.01
                ),

            horizonHours:
                10,
        });


    assertEqual(
        result.status,
        "CALCULATED",
        "Reliability calculates from validated λ and time horizon"
    );


    assertClose(
        result.reliability,
        Math.exp(
            -0.1
        ),
        0.000000001,
        "R(10) equals exp(-0.1)"
    );


    assertClose(
        result.reliabilityPercent,
        Math.exp(
            -0.1
        ) *
        100,
        0.0000001,
        "Reliability percentage is correct"
    );


    assertClose(
        result.failureProbability,
        1 -
        Math.exp(
            -0.1
        ),
        0.000000001,
        "Failure probability equals 1 - R(t)"
    );


    assertClose(
        result.reliability +
        result.failureProbability,
        1,
        0.000000001,
        "Reliability plus failure probability equals one"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — one-MTBF horizon
    |
    | λ = 1 / 100
    | t = 100
    |
    | R(MTBF) = exp(-1)
    |         ≈ 0.367879441
    |--------------------------------------------------------------------------
    */

    const oneMtbf =
        calculateReliabilityFunction({
            failureRate:
                failureRateResult(
                    1 / 100
                ),

            horizonHours:
                100,
        });


    assertClose(
        oneMtbf.reliability,
        Math.exp(
            -1
        ),
        0.000000001,
        "Reliability at one MTBF equals e^-1"
    );


    assertClose(
        oneMtbf.reliabilityPercent,
        Math.exp(
            -1
        ) *
        100,
        0.0000001,
        "Reliability at one MTBF is about 36.79 percent"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — shorter horizon must have higher reliability
    |--------------------------------------------------------------------------
    */

    const shortHorizon =
        calculateReliabilityFunction({
            failureRate:
                failureRateResult(
                    0.01
                ),

            horizonHours:
                1,
        });


    const longHorizon =
        calculateReliabilityFunction({
            failureRate:
                failureRateResult(
                    0.01
                ),

            horizonHours:
                50,
        });


    assertEqual(
        shortHorizon.reliability >
            longHorizon.reliability,
        true,
        "Reliability decreases as operating horizon increases"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — unavailable λ
    |--------------------------------------------------------------------------
    */

    const unavailableRate =
        calculateReliabilityFunction({
            failureRate: {
                status:
                    "UNAVAILABLE",

                reason:
                    "MTBF_UNAVAILABLE",

                lambdaPerHour:
                    null,
            },

            horizonHours:
                10,
        });


    assertEqual(
        unavailableRate.status,
        "UNAVAILABLE",
        "Unavailable failure rate blocks reliability"
    );


    assertEqual(
        unavailableRate.reason,
        "FAILURE_RATE_UNAVAILABLE",
        "Unavailable λ receives correct reliability reason"
    );


    assertEqual(
        unavailableRate.reliability,
        null,
        "Unavailable λ does not fabricate reliability"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — zero λ rejected
    |
    | Because the current empirical framework does not create λ = 0 from
    | zero observed failures. That case remains censored/unavailable upstream.
    |--------------------------------------------------------------------------
    */

    const zeroRate =
        calculateReliabilityFunction({
            failureRate:
                failureRateResult(
                    0
                ),

            horizonHours:
                10,
        });


    assertEqual(
        zeroRate.status,
        "UNAVAILABLE",
        "Zero λ is rejected in the current empirical reliability model"
    );


    assertEqual(
        zeroRate.reason,
        "INVALID_FAILURE_RATE",
        "Zero λ receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — zero horizon rejected
    |--------------------------------------------------------------------------
    */

    const zeroHorizon =
        calculateReliabilityFunction({
            failureRate:
                failureRateResult(
                    0.01
                ),

            horizonHours:
                0,
        });


    assertEqual(
        zeroHorizon.status,
        "UNAVAILABLE",
        "Zero-hour prediction horizon is rejected"
    );


    assertEqual(
        zeroHorizon.reason,
        "INVALID_TIME_HORIZON",
        "Zero horizon receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7 — negative horizon rejected
    |--------------------------------------------------------------------------
    */

    const negativeHorizon =
        calculateReliabilityFunction({
            failureRate:
                failureRateResult(
                    0.01
                ),

            horizonHours:
                -10,
        });


    assertEqual(
        negativeHorizon.status,
        "UNAVAILABLE",
        "Negative prediction horizon is rejected"
    );


    assertEqual(
        negativeHorizon.reason,
        "INVALID_TIME_HORIZON",
        "Negative horizon receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 8 — hazard identity
    |
    | -ln(R(t)) / t = λ
    |--------------------------------------------------------------------------
    */

    const recoveredLambda =
        -Math.log(
            result.reliability
        ) /
        result.horizonHours;


    assertClose(
        recoveredLambda,
        result.lambdaPerHour,
        0.000000001,
        "-ln(R(t)) / t recovers λ"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 9 — multiplicative memoryless property
    |
    | R(t1 + t2) = R(t1) × R(t2)
    |--------------------------------------------------------------------------
    */

    const r4 =
        calculateReliabilityFunction({
            failureRate:
                failureRateResult(
                    0.01
                ),

            horizonHours:
                4,
        });


    const r6 =
        calculateReliabilityFunction({
            failureRate:
                failureRateResult(
                    0.01
                ),

            horizonHours:
                6,
        });


    assertClose(
        result.reliability,
        r4.reliability *
        r6.reliability,
        0.000000001,
        "Exponential reliability satisfies R(4+6) = R(4) × R(6)"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 10 — semantic guards
    |--------------------------------------------------------------------------
    */

    assertEqual(
        result
            .semanticGuards
            .reliabilityIsNotAvailability,
        true,
        "Reliability is explicitly separated from availability"
    );


    assertEqual(
        result
            .semanticGuards
            .reliabilityRequiresExplicitTimeHorizon,
        true,
        "Reliability requires explicit prediction horizon"
    );


    assertEqual(
        result
            .semanticGuards
            .exponentialModelRequiresConstantFailureRate,
        true,
        "Constant failure-rate assumption is explicit"
    );


    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "RELIABILITY FUNCTION VALIDATION PASSED"
    );

    console.log(
        "================================================"
    );


    console.log("");

    console.log(
        "Validated engineering semantics:"
    );

    console.log(
        "- R(t) = exp(-λt)"
    );

    console.log(
        "- λ must come from a validated MTBF-derived failure rate"
    );

    console.log(
        "- an explicit positive operating horizon is mandatory"
    );

    console.log(
        "- reliability decreases as the horizon increases"
    );

    console.log(
        "- R(MTBF) = e^-1 under the exponential model"
    );

    console.log(
        "- zero observed failures do not indirectly become R(t) = 1"
    );

    console.log(
        "- reliability and availability remain different metrics"
    );

    console.log(
        "- constant hazard / exponential lifetime assumption is explicit"
    );
}


try {
    run();
}
catch (error) {
    console.error("");

    console.error(
        "Reliability function validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}