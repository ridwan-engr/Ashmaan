// backend/scripts/validateServiceInterruptionEligibility.js

import {
    evaluateServiceInterruptionEligibility,
    evaluateServiceInterruptions,
} from "../services/reliability/serviceInterruptionEligibilityService.js";


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


function eligibleEvent({
    id,
    start,
    end,
    affectedCustomers =
        null,
}) {
    return {
        _id:
            id,

        installation:
            `SITE-${id}`,

        eventType:
            "GRID_OUTAGE",

        source:
            "DERIVED",

        status:
            "RESTORED",

        startTime:
            new Date(
                start
            ),

        restorationTime:
            new Date(
                end
            ),

        affectedCustomers,

        raw: {
            loadInterruptionConfirmed:
                true,

            eligibleForSaidiSaifi:
                true,
        },
    };
}


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN SERVICE INTERRUPTION ELIGIBILITY VALIDATION"
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
            "2026-09-05T04:00:00.000Z"
        );


    /*
    |--------------------------------------------------------------------------
    | Case 1
    |
    | Started before reporting period.
    |
    | Must contribute duration but NOT frequency.
    |--------------------------------------------------------------------------
    */

    const carriedIntoWindow =
        eligibleEvent({
            id:
                "A",

            start:
                "2026-09-04T23:30:00.000Z",

            end:
                "2026-09-05T00:30:00.000Z",

            affectedCustomers:
                20,
        });


    const carriedResult =
        evaluateServiceInterruptionEligibility({
            event:
                carriedIntoWindow,

            periodStart,
            periodEnd,
        });


    assertEqual(
        carriedResult
            .eligible,
        true,
        "Carried interruption is eligible"
    );


    assertEqual(
        carriedResult
            .startedInPeriod,
        false,
        "Carried interruption does not count as new frequency"
    );


    assertClose(
        carriedResult
            .interruptionHours,
        0.5,
        0.000001,
        "Carried interruption duration clipped to window"
    );


    /*
    |--------------------------------------------------------------------------
    | Case 2
    |
    | Starts inside reporting period.
    |--------------------------------------------------------------------------
    */

    const startedInside =
        eligibleEvent({
            id:
                "B",

            start:
                "2026-09-05T01:00:00.000Z",

            end:
                "2026-09-05T02:00:00.000Z",

            affectedCustomers:
                15,
        });


    const startedResult =
        evaluateServiceInterruptionEligibility({
            event:
                startedInside,

            periodStart,
            periodEnd,
        });


    assertEqual(
        startedResult
            .startedInPeriod,
        true,
        "In-period interruption counts toward frequency"
    );


    assertClose(
        startedResult
            .interruptionHours,
        1,
        0.000001,
        "In-period interruption duration preserved"
    );


    assertEqual(
        startedResult
            .affectedCustomers,
        15,
        "Affected-customer count preserved"
    );


    /*
    |--------------------------------------------------------------------------
    | Case 3
    |
    | Grid-source transfer but no confirmed customer interruption.
    |--------------------------------------------------------------------------
    */

    const unconfirmed =
        {
            ...eligibleEvent({
                id:
                    "C",

                start:
                    "2026-09-05T02:00:00.000Z",

                end:
                    "2026-09-05T02:30:00.000Z",
            }),

            raw: {
                loadInterruptionConfirmed:
                    false,

                eligibleForSaidiSaifi:
                    false,
            },
        };


    const unconfirmedResult =
        evaluateServiceInterruptionEligibility({
            event:
                unconfirmed,

            periodStart,
            periodEnd,
        });


    assertEqual(
        unconfirmedResult
            .eligible,
        false,
        "Unconfirmed load interruption rejected"
    );


    assertEqual(
        unconfirmedResult
            .reason,
        "LOAD_INTERRUPTION_NOT_CONFIRMED",
        "Unconfirmed interruption receives correct rejection reason"
    );


    /*
    |--------------------------------------------------------------------------
    | Case 4
    |
    | Confirmed load interruption but SAIDI/SAIFI safety flag disabled.
    |--------------------------------------------------------------------------
    */

    const disabled =
        {
            ...eligibleEvent({
                id:
                    "D",

                start:
                    "2026-09-05T02:30:00.000Z",

                end:
                    "2026-09-05T03:00:00.000Z",
            }),

            raw: {
                loadInterruptionConfirmed:
                    true,

                eligibleForSaidiSaifi:
                    false,
            },
        };


    const disabledResult =
        evaluateServiceInterruptionEligibility({
            event:
                disabled,

            periodStart,
            periodEnd,
        });


    assertEqual(
        disabledResult
            .eligible,
        false,
        "SAIDI/SAIFI-disabled interruption rejected"
    );


    assertEqual(
        disabledResult
            .reason,
        "SAIDI_SAIFI_NOT_ENABLED",
        "Disabled interruption receives correct rejection reason"
    );


    /*
    |--------------------------------------------------------------------------
    | Case 5
    |
    | Starts exactly at periodEnd.
    |
    | Half-open interval means it belongs to the next period.
    |--------------------------------------------------------------------------
    */

    const startsAtPeriodEnd =
        eligibleEvent({
            id:
                "E",

            start:
                "2026-09-05T04:00:00.000Z",

            end:
                "2026-09-05T04:30:00.000Z",
        });


    const boundaryResult =
        evaluateServiceInterruptionEligibility({
            event:
                startsAtPeriodEnd,

            periodStart,
            periodEnd,
        });


    assertEqual(
        boundaryResult
            .eligible,
        false,
        "Event starting exactly at periodEnd excluded"
    );


    assertEqual(
        boundaryResult
            .reason,
        "OUTSIDE_REPORTING_WINDOW",
        "Period-end event receives outside-window reason"
    );


    /*
    |--------------------------------------------------------------------------
    | Collection validation
    |--------------------------------------------------------------------------
    */

    const collection =
        evaluateServiceInterruptions({
            events: [
                carriedIntoWindow,
                startedInside,
                unconfirmed,
                disabled,
                startsAtPeriodEnd,
            ],

            periodStart,
            periodEnd,
        });


    assertEqual(
        collection
            .totalEventCount,
        5,
        "Collection total event count"
    );


    assertEqual(
        collection
            .eligibleEventCount,
        2,
        "Collection eligible event count"
    );


    assertEqual(
        collection
            .rejectedEventCount,
        3,
        "Collection rejected event count"
    );


    assertEqual(
        collection
            .activeInterruptionCount,
        2,
        "Two interruptions active inside reporting period"
    );


    assertEqual(
        collection
            .startedInterruptionCount,
        1,
        "Only one interruption starts inside reporting period"
    );


    assertEqual(
        collection
            .rejectionCounts
            .LOAD_INTERRUPTION_NOT_CONFIRMED,
        1,
        "Unconfirmed rejection counted"
    );


    assertEqual(
        collection
            .rejectionCounts
            .SAIDI_SAIFI_NOT_ENABLED,
        1,
        "SAIDI/SAIFI-disabled rejection counted"
    );


    assertEqual(
        collection
            .rejectionCounts
            .OUTSIDE_REPORTING_WINDOW,
        1,
        "Outside-window rejection counted"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "SERVICE INTERRUPTION ELIGIBILITY VALIDATION PASSED"
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
        "Service interruption eligibility validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}