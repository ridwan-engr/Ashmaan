// backend/scripts/validateFailureEventEligibility.js

import mongoose from "mongoose";

import {
    evaluateMtbfFailureEligibility,
    evaluateMttrFailureEligibility,
    evaluateFailureEvents,
} from "../services/reliability/failureEventEligibilityService.js";


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


function failure({
    id,
    status =
        "RESTORED",
    confirmed =
        true,
    mtbf =
        true,
    mttr =
        true,
    equipmentIdentifier =
        "GEN-01",
    start =
        "2026-09-05T10:00:00.000Z",
    repairStart =
        "2026-09-05T10:30:00.000Z",
    repairEnd =
        "2026-09-05T11:30:00.000Z",
} = {}) {
    return {
        _id:
            id ??
            new mongoose.Types.ObjectId(),

        installation:
            new mongoose.Types.ObjectId(),

        equipmentType:
            "GENERATOR",

        equipmentIdentifier,

        failureType:
            "GENERATOR_FAILURE",

        source:
            "MAINTENANCE",

        status,

        startTime:
            start
                ? new Date(
                    start
                )
                : null,

        repairStartTime:
            repairStart
                ? new Date(
                    repairStart
                )
                : null,

        repairEndTime:
            repairEnd
                ? new Date(
                    repairEnd
                )
                : null,

        failureConfirmed:
            confirmed,

        eligibleForMtbf:
            mtbf,

        eligibleForMttr:
            mttr,
    };
}


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN FAILURE EVENT ELIGIBILITY VALIDATION"
    );
    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 1 — valid MTBF failure
    |--------------------------------------------------------------------------
    */

    const validFailure =
        failure();


    const mtbfResult =
        evaluateMtbfFailureEligibility(
            validFailure
        );


    assertEqual(
        mtbfResult.eligible,
        true,
        "Confirmed identifiable failure is MTBF eligible"
    );


    assertEqual(
        mtbfResult.metric,
        "MTBF",
        "MTBF eligibility identifies metric"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — valid MTTR repair
    |--------------------------------------------------------------------------
    */

    const mttrResult =
        evaluateMttrFailureEligibility(
            validFailure
        );


    assertEqual(
        mttrResult.eligible,
        true,
        "Completed validated repair is MTTR eligible"
    );


    assertClose(
        mttrResult
            .repairDurationHours,
        1,
        0.000001,
        "MTTR repair duration equals one hour"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — unconfirmed event
    |--------------------------------------------------------------------------
    */

    const unconfirmed =
        evaluateMtbfFailureEligibility(
            failure({
                confirmed:
                    false,
            })
        );


    assertEqual(
        unconfirmed.eligible,
        false,
        "Unconfirmed failure is rejected"
    );


    assertEqual(
        unconfirmed.reason,
        "FAILURE_NOT_CONFIRMED",
        "Unconfirmed failure receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — missing equipment identity
    |--------------------------------------------------------------------------
    */

    const noIdentityFailure =
        failure({
            equipmentIdentifier:
                null,
        });


    noIdentityFailure.asset =
        null;

    noIdentityFailure.device =
        null;


    const noIdentity =
        evaluateMtbfFailureEligibility(
            noIdentityFailure
        );


    assertEqual(
        noIdentity.eligible,
        false,
        "Failure without repairable-item identity is rejected"
    );


    assertEqual(
        noIdentity.reason,
        "EQUIPMENT_IDENTITY_UNAVAILABLE",
        "Missing equipment identity receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — MTBF flag disabled
    |--------------------------------------------------------------------------
    */

    const mtbfDisabled =
        evaluateMtbfFailureEligibility(
            failure({
                mtbf:
                    false,
            })
        );


    assertEqual(
        mtbfDisabled.eligible,
        false,
        "MTBF-disabled failure is rejected"
    );


    assertEqual(
        mtbfDisabled.reason,
        "MTBF_NOT_ENABLED",
        "MTBF-disabled failure receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — MTTR flag disabled
    |--------------------------------------------------------------------------
    */

    const mttrDisabled =
        evaluateMttrFailureEligibility(
            failure({
                mttr:
                    false,
            })
        );


    assertEqual(
        mttrDisabled.eligible,
        false,
        "MTTR-disabled repair is rejected"
    );


    assertEqual(
        mttrDisabled.reason,
        "MTTR_NOT_ENABLED",
        "MTTR-disabled repair receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7 — open failure has no completed repair
    |--------------------------------------------------------------------------
    */

    const openRepair =
        evaluateMttrFailureEligibility(
            failure({
                status:
                    "OPEN",
            })
        );


    assertEqual(
        openRepair.eligible,
        false,
        "Open failure does not enter MTTR"
    );


    assertEqual(
        openRepair.reason,
        "REPAIR_NOT_COMPLETED",
        "Open failure receives incomplete-repair reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 8 — missing repair start
    |--------------------------------------------------------------------------
    */

    const noRepairStart =
        evaluateMttrFailureEligibility(
            failure({
                repairStart:
                    null,
            })
        );


    assertEqual(
        noRepairStart.eligible,
        false,
        "Missing repair start blocks MTTR"
    );


    assertEqual(
        noRepairStart.reason,
        "INVALID_REPAIR_START",
        "Missing repair start receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 9 — invalid repair interval
    |--------------------------------------------------------------------------
    */

    const invalidRepair =
        evaluateMttrFailureEligibility(
            failure({
                repairStart:
                    "2026-09-05T12:00:00.000Z",

                repairEnd:
                    "2026-09-05T11:00:00.000Z",
            })
        );


    assertEqual(
        invalidRepair.eligible,
        false,
        "Negative repair interval is rejected"
    );


    assertEqual(
        invalidRepair.reason,
        "INVALID_REPAIR_INTERVAL",
        "Negative repair interval receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 10 — repair cannot precede failure
    |--------------------------------------------------------------------------
    */

    const repairBeforeFailure =
        evaluateMttrFailureEligibility(
            failure({
                start:
                    "2026-09-05T10:00:00.000Z",

                repairStart:
                    "2026-09-05T09:30:00.000Z",

                repairEnd:
                    "2026-09-05T10:30:00.000Z",
            })
        );


    assertEqual(
        repairBeforeFailure.eligible,
        false,
        "Repair beginning before failure is rejected"
    );


    assertEqual(
        repairBeforeFailure.reason,
        "REPAIR_BEFORE_FAILURE",
        "Repair-before-failure receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 11 — invalidated event
    |--------------------------------------------------------------------------
    */

    const invalidated =
        evaluateMtbfFailureEligibility(
            failure({
                status:
                    "INVALIDATED",
            })
        );


    assertEqual(
        invalidated.eligible,
        false,
        "Invalidated failure is rejected"
    );


    assertEqual(
        invalidated.reason,
        "INVALIDATED_EVENT",
        "Invalidated failure receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 12 — collection
    |--------------------------------------------------------------------------
    */

    const collection =
        evaluateFailureEvents([
            validFailure,

            failure({
                confirmed:
                    false,
            }),

            failure({
                status:
                    "OPEN",
            }),
        ]);


    assertEqual(
        collection
            .totalFailureEventCount,
        3,
        "Collection contains three failure records"
    );


    assertEqual(
        collection
            .mtbf
            .eligibleCount,
        2,
        "Two records qualify as confirmed MTBF failures"
    );


    assertEqual(
        collection
            .mttr
            .eligibleCount,
        1,
        "Only one completed repair qualifies for MTTR"
    );


    assertEqual(
        collection
            .mtbf
            .rejectionCounts
            .FAILURE_NOT_CONFIRMED,
        1,
        "Unconfirmed MTBF rejection counted"
    );


    assertEqual(
        collection
            .mttr
            .rejectionCounts
            .REPAIR_NOT_COMPLETED,
        1,
        "Open repair rejection counted"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "FAILURE EVENT ELIGIBILITY VALIDATION PASSED"
    );
    console.log(
        "================================================"
    );

    console.log("");
    console.log(
        "Validated engineering semantics:"
    );

    console.log(
        "- only confirmed failures enter reliability analysis"
    );

    console.log(
        "- a repairable-item identity is mandatory"
    );

    console.log(
        "- MTBF and MTTR qualification are independent"
    );

    console.log(
        "- open failures do not enter MTTR"
    );

    console.log(
        "- MTTR uses repairStartTime -> repairEndTime"
    );

    console.log(
        "- outage restoration is not silently treated as repair time"
    );
}


try {
    run();
}
catch (error) {
    console.error("");
    console.error(
        "Failure event eligibility validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}