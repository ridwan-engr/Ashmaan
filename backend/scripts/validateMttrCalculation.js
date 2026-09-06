// backend/scripts/validateMttrCalculation.js

import {
    calculateMttr,
} from "../services/reliability/mttrCalculationService.js";


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
| Synthetic eligible MTTR evaluation
|--------------------------------------------------------------------------
*/

function repair({
    id,

    hours,

    reliabilityKey =
        "DEVICE:GEN-01",

    installationId =
        "INSTALLATION-01",
} = {}) {
    const failureStart =
        new Date(
            "2026-09-05T10:00:00.000Z"
        );

    const repairStart =
        new Date(
            "2026-09-05T10:30:00.000Z"
        );

    const repairEnd =
        new Date(
            repairStart.getTime() +
            hours *
            3600000
        );


    return {
        eligible:
            true,

        reason:
            "ELIGIBLE",

        metric:
            "MTTR",

        installationId,

        equipmentIdentity: {
            available:
                true,

            identityType:
                "DEVICE",

            identity:
                "GEN-01",

            reliabilityKey,
        },

        failureStart,

        repairStart,

        repairEnd,

        repairDurationSeconds:
            hours *
            3600,

        repairDurationHours:
            hours,

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
| Execute validation
|--------------------------------------------------------------------------
*/

function run() {
    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "ASHMAAN MTTR CALCULATION VALIDATION"
    );

    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 1 — three completed repairs
    |
    | Repair durations:
    |
    | 1 h
    | 2 h
    | 3 h
    |
    | MTTR = (1 + 2 + 3) / 3 = 2 h
    |--------------------------------------------------------------------------
    */

    const result =
        calculateMttr({
            mttrEvaluations: [
                repair({
                    id:
                        "FAILURE-001",

                    hours:
                        1,
                }),

                repair({
                    id:
                        "FAILURE-002",

                    hours:
                        2,
                }),

                repair({
                    id:
                        "FAILURE-003",

                    hours:
                        3,
                }),
            ],
        });


    assertEqual(
        result.status,
        "CALCULATED",
        "MTTR is calculated for completed repairs"
    );


    assertEqual(
        result.completedRepairCount,
        3,
        "Three completed repair episodes are counted"
    );


    assertClose(
        result.totalRepairHours,
        6,
        0.000001,
        "Total validated repair time equals six hours"
    );


    assertClose(
        result.mttrHours,
        2,
        0.000001,
        "MTTR equals two hours"
    );


    assertClose(
        result.mttrMinutes,
        120,
        0.000001,
        "MTTR equals 120 minutes"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — no completed repair evidence
    |--------------------------------------------------------------------------
    */

    const noRepairs =
        calculateMttr({
            mttrEvaluations:
                [],
        });


    assertEqual(
        noRepairs.status,
        "UNAVAILABLE",
        "No completed repairs produces unavailable MTTR"
    );


    assertEqual(
        noRepairs.reason,
        "NO_COMPLETED_REPAIRS",
        "No completed repairs receives correct reason"
    );


    assertEqual(
        noRepairs.mttrHours,
        null,
        "Missing repair evidence does not fabricate MTTR zero"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — rejected/open failure does not enter MTTR
    |--------------------------------------------------------------------------
    */

    const rejectedOnly =
        calculateMttr({
            mttrEvaluations: [
                {
                    eligible:
                        false,

                    metric:
                        "MTTR",

                    reason:
                        "REPAIR_NOT_COMPLETED",
                },
            ],
        });


    assertEqual(
        rejectedOnly.status,
        "UNAVAILABLE",
        "Open failure does not produce MTTR"
    );


    assertEqual(
        rejectedOnly.mttrHours,
        null,
        "Open failure cannot fabricate repair duration"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — duplicate physical repair must not double count
    |--------------------------------------------------------------------------
    */

    const duplicate =
        repair({
            id:
                "FAILURE-DUPLICATE",

            hours:
                2,
        });


    const duplicateResult =
        calculateMttr({
            mttrEvaluations: [
                duplicate,

                {
                    ...duplicate,
                },
            ],
        });


    assertEqual(
        duplicateResult.status,
        "CALCULATED",
        "Duplicate physical repair still yields valid MTTR"
    );


    assertEqual(
        duplicateResult.completedRepairCount,
        1,
        "Duplicate physical repair is counted once"
    );


    assertEqual(
        duplicateResult.duplicateRepairCount,
        1,
        "Duplicate repair is explicitly recorded"
    );


    assertClose(
        duplicateResult.mttrHours,
        2,
        0.000001,
        "Deduplicated MTTR remains two hours"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — invalid duration must not become zero
    |--------------------------------------------------------------------------
    */

    const invalidDuration =
        repair({
            id:
                "FAILURE-INVALID",

            hours:
                1,
        });


    invalidDuration
        .repairDurationHours =
        null;


    const invalidResult =
        calculateMttr({
            mttrEvaluations: [
                invalidDuration,
            ],
        });


    assertEqual(
        invalidResult.status,
        "UNAVAILABLE",
        "Invalid repair duration blocks MTTR"
    );


    assertEqual(
        invalidResult.reason,
        "INVALID_REPAIR_DURATION",
        "Invalid duration receives correct reason"
    );


    assertEqual(
        invalidResult.mttrHours,
        null,
        "Invalid duration is not converted to zero"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — partial invalid data blocks biased MTTR
    |--------------------------------------------------------------------------
    */

    const validRepair =
        repair({
            id:
                "FAILURE-VALID",

            hours:
                1,
        });


    const brokenRepair =
        repair({
            id:
                "FAILURE-BROKEN",

            hours:
                2,
        });


    brokenRepair
        .repairDurationHours =
        undefined;


    const incomplete =
        calculateMttr({
            mttrEvaluations: [
                validRepair,
                brokenRepair,
            ],
        });


    assertEqual(
        incomplete.status,
        "UNAVAILABLE",
        "Incomplete qualified repair set blocks biased MTTR"
    );


    assertEqual(
        incomplete.reason,
        "INCOMPLETE_REPAIR_DATA",
        "Incomplete repair data receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7 — non-MTTR metric cannot enter MTTR calculation
    |--------------------------------------------------------------------------
    */

    const wrongMetric =
        repair({
            id:
                "FAILURE-MTBF",

            hours:
                4,
        });


    wrongMetric.metric =
        "MTBF";


    const wrongMetricResult =
        calculateMttr({
            mttrEvaluations: [
                wrongMetric,
            ],
        });


    assertEqual(
        wrongMetricResult.status,
        "UNAVAILABLE",
        "MTBF qualification cannot enter MTTR calculation"
    );


    assertEqual(
        wrongMetricResult
            .completedRepairCount,
        0,
        "Wrong analytical metric contributes zero completed repairs"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 8 — verify arithmetic identity
    |--------------------------------------------------------------------------
    */

    assertClose(
        result.mttrHours *
            result.completedRepairCount,
        result.totalRepairHours,
        0.000001,
        "MTTR × repair count equals total repair hours"
    );


    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "MTTR CALCULATION VALIDATION PASSED"
    );

    console.log(
        "================================================"
    );


    console.log("");

    console.log(
        "Validated engineering semantics:"
    );

    console.log(
        "- MTTR uses completed validated repair episodes only"
    );

    console.log(
        "- MTTR uses repairStartTime -> repairEndTime"
    );

    console.log(
        "- no completed repairs means MTTR unavailable, not zero"
    );

    console.log(
        "- duplicate physical repairs are counted once"
    );

    console.log(
        "- invalid qualified repair data blocks biased MTTR"
    );

    console.log(
        "- equipment downtime is not substituted for repair duration"
    );
}


try {
    run();
}
catch (error) {
    console.error("");

    console.error(
        "MTTR calculation validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}