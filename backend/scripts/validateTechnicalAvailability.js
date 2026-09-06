// backend/scripts/validateTechnicalAvailability.js

import {
    calculateTechnicalAvailability,
} from "../services/reliability/technicalAvailabilityCalculationService.js";


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
| Synthetic MTBF result
|--------------------------------------------------------------------------
*/

function mtbfResult({
    hours,
    keys = [
        "DEVICE:GEN-01",
    ],
} = {}) {
    return {
        status:
            "CALCULATED",

        reason:
            "CALCULATED",

        mtbfHours:
            hours,

        reliabilityKeys:
            keys,
    };
}


/*
|--------------------------------------------------------------------------
| Synthetic MTTR result
|--------------------------------------------------------------------------
*/

function mttrResult({
    hours,
    keys = [
        "DEVICE:GEN-01",
    ],
} = {}) {
    return {
        status:
            "CALCULATED",

        reason:
            "CALCULATED",

        mttrHours:
            hours,

        repairEpisodes:
            keys.map(
                (
                    reliabilityKey,
                    index
                ) => ({
                    sourceEventId:
                        `REPAIR-${index + 1}`,

                    reliabilityKey,

                    repairDurationHours:
                        hours,
                })
            ),
    };
}


function run() {
    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "ASHMAAN TECHNICAL AVAILABILITY VALIDATION"
    );

    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 1
    |
    | MTBF = 100 h
    | MTTR = 4 h
    |
    | A = 100 / 104
    |   = 0.9615384615
    |   = 96.15384615 %
    |--------------------------------------------------------------------------
    */

    const result =
        calculateTechnicalAvailability({
            mtbf:
                mtbfResult({
                    hours:
                        100,
                }),

            mttr:
                mttrResult({
                    hours:
                        4,
                }),
        });


    assertEqual(
        result.status,
        "CALCULATED",
        "Technical availability calculates from valid MTBF and MTTR"
    );


    assertEqual(
        result.label,
        "Steady-State Technical Availability",
        "Technical availability uses explicit engineering label"
    );


    assertClose(
        result.availability,
        100 / 104,
        0.000001,
        "Technical availability ratio is correct"
    );


    assertClose(
        result.availabilityPercent,
        (
            100 /
            104
        ) *
        100,
        0.000001,
        "Technical availability percentage is correct"
    );


    assertClose(
        result.unavailability,
        4 / 104,
        0.000001,
        "Technical unavailability ratio is correct"
    );


    assertClose(
        result.availability +
        result.unavailability,
        1,
        0.000001,
        "Availability plus unavailability equals one"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — unavailable MTBF
    |--------------------------------------------------------------------------
    */

    const missingMtbf =
        calculateTechnicalAvailability({
            mtbf: {
                status:
                    "UNAVAILABLE",

                reason:
                    "NO_ELIGIBLE_FAILURES",

                mtbfHours:
                    null,
            },

            mttr:
                mttrResult({
                    hours:
                        2,
                }),
        });


    assertEqual(
        missingMtbf.status,
        "UNAVAILABLE",
        "Unavailable MTBF blocks technical availability"
    );


    assertEqual(
        missingMtbf.reason,
        "MTBF_UNAVAILABLE",
        "Unavailable MTBF receives correct reason"
    );


    assertEqual(
        missingMtbf.availability,
        null,
        "Missing MTBF does not fabricate availability"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — unavailable MTTR
    |--------------------------------------------------------------------------
    */

    const missingMttr =
        calculateTechnicalAvailability({
            mtbf:
                mtbfResult({
                    hours:
                        100,
                }),

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
        missingMttr.status,
        "UNAVAILABLE",
        "Unavailable MTTR blocks technical availability"
    );


    assertEqual(
        missingMttr.reason,
        "MTTR_UNAVAILABLE",
        "Unavailable MTTR receives correct reason"
    );


    assertEqual(
        missingMttr.availability,
        null,
        "Missing MTTR does not become perfect availability"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — reliability scope mismatch
    |--------------------------------------------------------------------------
    */

    const mismatch =
        calculateTechnicalAvailability({
            mtbf:
                mtbfResult({
                    hours:
                        50,

                    keys: [
                        "DEVICE:GEN-01",
                    ],
                }),

            mttr:
                mttrResult({
                    hours:
                        2,

                    keys: [
                        "DEVICE:GEN-99",
                    ],
                }),
        });


    assertEqual(
        mismatch.status,
        "UNAVAILABLE",
        "Different MTBF and MTTR equipment scopes block availability"
    );


    assertEqual(
        mismatch.reason,
        "RELIABILITY_SCOPE_MISMATCH",
        "Equipment scope mismatch receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — partial fleet scope mismatch
    |--------------------------------------------------------------------------
    */

    const partialScope =
        calculateTechnicalAvailability({
            mtbf:
                mtbfResult({
                    hours:
                        80,

                    keys: [
                        "DEVICE:GEN-01",
                        "DEVICE:GEN-02",
                    ],
                }),

            mttr:
                mttrResult({
                    hours:
                        3,

                    keys: [
                        "DEVICE:GEN-01",
                    ],
                }),
        });


    assertEqual(
        partialScope.status,
        "UNAVAILABLE",
        "Partial MTTR fleet scope cannot be combined with fleet MTBF"
    );


    assertEqual(
        partialScope.reason,
        "RELIABILITY_SCOPE_MISMATCH",
        "Partial fleet mismatch receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — missing scope
    |--------------------------------------------------------------------------
    */

    const missingScope =
        calculateTechnicalAvailability({
            mtbf: {
                status:
                    "CALCULATED",

                reason:
                    "CALCULATED",

                mtbfHours:
                    100,

                reliabilityKeys:
                    [],
            },

            mttr:
                mttrResult({
                    hours:
                        5,
                }),
        });


    assertEqual(
        missingScope.status,
        "UNAVAILABLE",
        "Missing reliability identity blocks availability"
    );


    assertEqual(
        missingScope.reason,
        "RELIABILITY_SCOPE_UNAVAILABLE",
        "Missing equipment scope receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7 — invalid MTBF
    |--------------------------------------------------------------------------
    */

    const invalidMtbf =
        calculateTechnicalAvailability({
            mtbf: {
                status:
                    "CALCULATED",

                mtbfHours:
                    0,

                reliabilityKeys: [
                    "DEVICE:GEN-01",
                ],
            },

            mttr:
                mttrResult({
                    hours:
                        1,
                }),
        });


    assertEqual(
        invalidMtbf.status,
        "UNAVAILABLE",
        "Non-positive MTBF blocks availability"
    );


    assertEqual(
        invalidMtbf.reason,
        "INVALID_MTBF",
        "Invalid MTBF receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 8 — invalid MTTR
    |--------------------------------------------------------------------------
    */

    const invalidMttr =
        calculateTechnicalAvailability({
            mtbf:
                mtbfResult({
                    hours:
                        100,
                }),

            mttr: {
                status:
                    "CALCULATED",

                mttrHours:
                    0,

                repairEpisodes: [
                    {
                        reliabilityKey:
                            "DEVICE:GEN-01",
                    },
                ],
            },
        });


    assertEqual(
        invalidMttr.status,
        "UNAVAILABLE",
        "Zero MTTR is not silently accepted"
    );


    assertEqual(
        invalidMttr.reason,
        "INVALID_MTTR",
        "Invalid MTTR receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 9 — multi-equipment matching scope
    |--------------------------------------------------------------------------
    */

    const fleetResult =
        calculateTechnicalAvailability({
            mtbf:
                mtbfResult({
                    hours:
                        200,

                    keys: [
                        "DEVICE:GEN-01",
                        "DEVICE:GEN-02",
                    ],
                }),

            mttr:
                mttrResult({
                    hours:
                        5,

                    keys: [
                        "DEVICE:GEN-02",
                        "DEVICE:GEN-01",
                    ],
                }),
        });


    assertEqual(
        fleetResult.status,
        "CALCULATED",
        "Same fleet scope is accepted regardless of key order"
    );


    assertEqual(
        fleetResult.equipmentCount,
        2,
        "Matching fleet scope contains two repairable items"
    );


    assertClose(
        fleetResult.availability,
        200 / 205,
        0.000001,
        "Fleet technical availability arithmetic is correct"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 10 — semantic guards
    |--------------------------------------------------------------------------
    */

    assertEqual(
        result
            .semanticGuards
            .technicalAvailabilityIsNotAsai,
        true,
        "Technical availability is explicitly separated from ASAI"
    );


    assertEqual(
        result
            .semanticGuards
            .technicalAvailabilityIsNotGridSourceAvailability,
        true,
        "Technical availability is separated from grid-source availability"
    );


    assertEqual(
        result
            .semanticGuards
            .monitoringOnlineStatusIsNotTechnicalAvailability,
        true,
        "Monitoring ONLINE status is not technical availability"
    );


    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "TECHNICAL AVAILABILITY VALIDATION PASSED"
    );

    console.log(
        "================================================"
    );


    console.log("");

    console.log(
        "Validated engineering semantics:"
    );

    console.log(
        "- availability uses MTBF / (MTBF + MTTR)"
    );

    console.log(
        "- both MTBF and MTTR must be validated"
    );

    console.log(
        "- MTBF and MTTR must describe the same repairable-item scope"
    );

    console.log(
        "- missing MTBF or MTTR keeps availability unavailable"
    );

    console.log(
        "- technical availability is not ASAI"
    );

    console.log(
        "- technical availability is not grid-source availability"
    );

    console.log(
        "- monitoring status is not equipment availability"
    );
}


try {
    run();
}
catch (error) {
    console.error("");

    console.error(
        "Technical availability validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}