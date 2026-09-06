// backend/scripts/validateMtbfCalculation.js

import {
    calculateMtbf,
} from "../services/reliability/mtbfCalculationService.js";


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


/*
|--------------------------------------------------------------------------
| Synthetic MTBF-qualified failure
|--------------------------------------------------------------------------
*/

function failure({
    id,
    reliabilityKey,
    start,
} = {}) {
    return {
        eligible:
            true,

        reason:
            "ELIGIBLE",

        metric:
            "MTBF",

        installationId:
            "INSTALLATION-01",

        equipmentIdentity: {
            available:
                true,

            identityType:
                "DEVICE",

            identity:
                reliabilityKey,

            reliabilityKey,
        },

        failureStart:
            new Date(start),

        equipmentType:
            "GENERATOR",

        failureType:
            "GENERATOR_FAILURE",

        sourceEventId:
            id,
    };
}


/*
|--------------------------------------------------------------------------
| Synthetic exposure
|--------------------------------------------------------------------------
*/

function exposure({
    totalOperatingHours,
    keys,
} = {}) {
    const equipment =
        {};

    for (
        const key
        of keys
    ) {
        equipment[key] = {
            reliabilityKey:
                key,

            operatingHours:
                totalOperatingHours /
                keys.length,
        };
    }


    return {
        status:
            "CALCULATED",

        reason:
            "CALCULATED",

        totalOperatingHours,

        equipmentCount:
            keys.length,

        equipment,
    };
}


function run() {
    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "ASHMAAN MTBF CALCULATION VALIDATION"
    );

    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 1
    |
    | 100 equipment-hours exposure
    | 4 validated failures
    |
    | MTBF = 100 / 4 = 25 h
    |--------------------------------------------------------------------------
    */

    const result =
        calculateMtbf({
            exposure:
                exposure({
                    totalOperatingHours:
                        100,

                    keys: [
                        "DEVICE:GEN-01",
                        "DEVICE:GEN-02",
                    ],
                }),

            failures: [
                failure({
                    id:
                        "FAILURE-001",

                    reliabilityKey:
                        "DEVICE:GEN-01",

                    start:
                        "2026-09-01T01:00:00.000Z",
                }),

                failure({
                    id:
                        "FAILURE-002",

                    reliabilityKey:
                        "DEVICE:GEN-01",

                    start:
                        "2026-09-02T01:00:00.000Z",
                }),

                failure({
                    id:
                        "FAILURE-003",

                    reliabilityKey:
                        "DEVICE:GEN-02",

                    start:
                        "2026-09-03T01:00:00.000Z",
                }),

                failure({
                    id:
                        "FAILURE-004",

                    reliabilityKey:
                        "DEVICE:GEN-02",

                    start:
                        "2026-09-04T01:00:00.000Z",
                }),
            ],
        });


    assertEqual(
        result.status,
        "CALCULATED",
        "MTBF calculates from validated exposure and failures"
    );


    assertEqual(
        result.failureCount,
        4,
        "Four validated physical failures are counted"
    );


    assertClose(
        result.operatingExposureHours,
        100,
        0.000001,
        "Validated operating exposure equals 100 equipment-hours"
    );


    assertClose(
        result.mtbfHours,
        25,
        0.000001,
        "MTBF equals 25 hours"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — zero failure observations
    |--------------------------------------------------------------------------
    */

    const zeroFailures =
        calculateMtbf({
            exposure:
                exposure({
                    totalOperatingHours:
                        100,

                    keys: [
                        "DEVICE:GEN-01",
                    ],
                }),

            failures:
                [],
        });


    assertEqual(
        zeroFailures.status,
        "UNAVAILABLE",
        "Zero observed failures does not fabricate infinite MTBF"
    );


    assertEqual(
        zeroFailures.reason,
        "NO_ELIGIBLE_FAILURES",
        "Zero failure case receives correct reason"
    );


    assertEqual(
        zeroFailures.mtbfHours,
        null,
        "Zero failures leaves MTBF null"
    );


    assertEqual(
        zeroFailures
            .zeroFailureInterpretation,
        "CENSORED_NO_FAILURE_OBSERVED",
        "Zero failures are explicitly treated as censored observation"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — unavailable exposure
    |--------------------------------------------------------------------------
    */

    const unavailableExposure =
        calculateMtbf({
            exposure: {
                status:
                    "UNAVAILABLE",

                reason:
                    "OPERATING_OBSERVABILITY_NOT_ESTABLISHED",

                totalOperatingHours:
                    null,
            },

            failures: [
                failure({
                    id:
                        "FAILURE-005",

                    reliabilityKey:
                        "DEVICE:GEN-01",

                    start:
                        "2026-09-05T01:00:00.000Z",
                }),
            ],
        });


    assertEqual(
        unavailableExposure.status,
        "UNAVAILABLE",
        "Unavailable operating exposure blocks MTBF"
    );


    assertEqual(
        unavailableExposure.reason,
        "OPERATING_EXPOSURE_UNAVAILABLE",
        "Missing exposure receives correct MTBF reason"
    );


    assertEqual(
        unavailableExposure.mtbfHours,
        null,
        "Missing exposure does not become zero MTBF"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — failure/exposure scope mismatch
    |--------------------------------------------------------------------------
    */

    const mismatch =
        calculateMtbf({
            exposure:
                exposure({
                    totalOperatingHours:
                        50,

                    keys: [
                        "DEVICE:GEN-01",
                    ],
                }),

            failures: [
                failure({
                    id:
                        "FAILURE-006",

                    reliabilityKey:
                        "DEVICE:GEN-99",

                    start:
                        "2026-09-05T02:00:00.000Z",
                }),
            ],
        });


    assertEqual(
        mismatch.status,
        "UNAVAILABLE",
        "Failure outside exposure scope blocks MTBF"
    );


    assertEqual(
        mismatch.reason,
        "FAILURE_EXPOSURE_SCOPE_MISMATCH",
        "Scope mismatch receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — duplicate failure does not double count
    |--------------------------------------------------------------------------
    */

    const duplicateFailure =
        failure({
            id:
                "FAILURE-DUPLICATE",

            reliabilityKey:
                "DEVICE:GEN-01",

            start:
                "2026-09-05T03:00:00.000Z",
        });


    const duplicateResult =
        calculateMtbf({
            exposure:
                exposure({
                    totalOperatingHours:
                        40,

                    keys: [
                        "DEVICE:GEN-01",
                    ],
                }),

            failures: [
                duplicateFailure,
                {
                    ...duplicateFailure,
                },
            ],
        });


    assertEqual(
        duplicateResult.status,
        "CALCULATED",
        "Duplicate physical failure still yields valid MTBF"
    );


    assertEqual(
        duplicateResult.failureCount,
        1,
        "Duplicate physical failure is counted once"
    );


    assertEqual(
        duplicateResult.duplicateFailureCount,
        1,
        "Duplicate failure is explicitly recorded"
    );


    assertClose(
        duplicateResult.mtbfHours,
        40,
        0.000001,
        "Deduplicated MTBF remains 40 hours"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — non-MTBF record cannot enter calculation
    |--------------------------------------------------------------------------
    */

    const wrongMetric =
        failure({
            id:
                "FAILURE-WRONG-METRIC",

            reliabilityKey:
                "DEVICE:GEN-01",

            start:
                "2026-09-05T04:00:00.000Z",
        });


    wrongMetric.metric =
        "MTTR";


    const wrongMetricResult =
        calculateMtbf({
            exposure:
                exposure({
                    totalOperatingHours:
                        20,

                    keys: [
                        "DEVICE:GEN-01",
                    ],
                }),

            failures: [
                wrongMetric,
            ],
        });


    assertEqual(
        wrongMetricResult.status,
        "UNAVAILABLE",
        "MTTR-qualified record cannot enter MTBF"
    );


    assertEqual(
        wrongMetricResult.mtbfHours,
        null,
        "Wrong analytical metric does not fabricate MTBF"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7 — arithmetic identity
    |--------------------------------------------------------------------------
    */

    assertClose(
        result.mtbfHours *
            result.failureCount,
        result.operatingExposureHours,
        0.000001,
        "MTBF × failure count equals operating exposure"
    );


    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "MTBF CALCULATION VALIDATION PASSED"
    );

    console.log(
        "================================================"
    );


    console.log("");

    console.log(
        "Validated engineering semantics:"
    );

    console.log(
        "- MTBF uses validated equipment operating exposure"
    );

    console.log(
        "- failure count uses MTBF-qualified physical failures only"
    );

    console.log(
        "- failure and exposure scopes must match"
    );

    console.log(
        "- duplicate physical failures are counted once"
    );

    console.log(
        "- zero observed failures do not become infinite MTBF"
    );

    console.log(
        "- telemetry silence is never converted into operating exposure"
    );
}


try {
    run();
}
catch (error) {
    console.error("");

    console.error(
        "MTBF calculation validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}