// backend/scripts/validateFailureEventModel.js

import mongoose from "mongoose";

import FailureEvent from "../models/FailureEvent.js";


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


function assertTrue(
    value,
    label
) {
    if (
        value !== true
    ) {
        throw new Error(
            `${label}: expected true, received ${value}`
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
        "ASHMAAN FAILURE EVENT MODEL VALIDATION"
    );

    console.log(
        "================================================"
    );


    const installationId =
        new mongoose.Types.ObjectId();


    /*
    |--------------------------------------------------------------------------
    | CASE 1 — minimum valid failure document
    |--------------------------------------------------------------------------
    */

    const minimum =
        new FailureEvent({
            installation:
                installationId,

            failureType:
                "INVERTER_FAILURE",

            equipmentType:
                "INVERTER",

            startTime:
                new Date(
                    "2026-09-05T10:00:00.000Z"
                ),
        });


    const minimumError =
        minimum.validateSync();


    assertEqual(
        minimumError,
        undefined,
        "Minimum FailureEvent schema validates"
    );


    assertEqual(
        minimum.status,
        "OPEN",
        "Default failure status is OPEN"
    );


    assertEqual(
        minimum.source,
        "DERIVED",
        "Default failure source is DERIVED"
    );


    assertEqual(
        minimum.failureConfirmed,
        false,
        "Failure is not confirmed by default"
    );


    assertEqual(
        minimum.eligibleForMtbf,
        false,
        "Failure is not MTBF-eligible by default"
    );


    assertEqual(
        minimum.eligibleForMttr,
        false,
        "Failure is not MTTR-eligible by default"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — completed validated repair
    |--------------------------------------------------------------------------
    */

    const repaired =
        new FailureEvent({
            installation:
                installationId,

            equipmentType:
                "GENERATOR",

            equipmentIdentifier:
                "GEN-01",

            failureType:
                "GENERATOR_FAILURE",

            failureMode:
                "START_FAILURE",

            source:
                "MAINTENANCE",

            status:
                "RESTORED",

            startTime:
                new Date(
                    "2026-09-05T10:00:00.000Z"
                ),

            detectionTime:
                new Date(
                    "2026-09-05T10:05:00.000Z"
                ),

            repairStartTime:
                new Date(
                    "2026-09-05T10:30:00.000Z"
                ),

            repairEndTime:
                new Date(
                    "2026-09-05T11:30:00.000Z"
                ),

            restorationTime:
                new Date(
                    "2026-09-05T11:40:00.000Z"
                ),

            downtimeSeconds:
                6000,

            repairDurationSeconds:
                3600,

            failureConfirmed:
                true,

            eligibleForMtbf:
                true,

            eligibleForMttr:
                true,
        });


    const repairedError =
        repaired.validateSync();


    assertEqual(
        repairedError,
        undefined,
        "Completed FailureEvent schema validates"
    );


    assertEqual(
        repaired.repairDurationSeconds,
        3600,
        "Repair duration preserved independently from downtime"
    );


    assertEqual(
        repaired.downtimeSeconds,
        6000,
        "Downtime duration preserved independently from repair duration"
    );


    assertTrue(
        repaired.failureConfirmed,
        "Completed event retains confirmed-failure flag"
    );


    assertTrue(
        repaired.eligibleForMtbf,
        "Completed event can explicitly qualify for MTBF"
    );


    assertTrue(
        repaired.eligibleForMttr,
        "Completed event can explicitly qualify for MTTR"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — invalid enum rejected
    |--------------------------------------------------------------------------
    */

    const invalidType =
        new FailureEvent({
            installation:
                installationId,

            equipmentType:
                "NOT_A_REAL_TYPE",

            failureType:
                "INVERTER_FAILURE",

            startTime:
                new Date(),
        });


    const invalidTypeError =
        invalidType.validateSync();


    assertTrue(
        Boolean(
            invalidTypeError
                ?.errors
                ?.equipmentType
        ),
        "Invalid equipment type is rejected"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — missing installation rejected
    |--------------------------------------------------------------------------
    */

    const noInstallation =
        new FailureEvent({
            equipmentType:
                "BATTERY",

            failureType:
                "BATTERY_FAILURE",

            startTime:
                new Date(),
        });


    const noInstallationError =
        noInstallation.validateSync();


    assertTrue(
        Boolean(
            noInstallationError
                ?.errors
                ?.installation
        ),
        "Missing installation is rejected"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — missing start time rejected
    |--------------------------------------------------------------------------
    */

    const noStart =
        new FailureEvent({
            installation:
                installationId,

            equipmentType:
                "METER",

            failureType:
                "METER_FAILURE",
        });


    const noStartError =
        noStart.validateSync();


    assertTrue(
        Boolean(
            noStartError
                ?.errors
                ?.startTime
        ),
        "Missing failure start time is rejected"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — negative durations rejected
    |--------------------------------------------------------------------------
    */

    const negativeDuration =
        new FailureEvent({
            installation:
                installationId,

            equipmentType:
                "GENERATOR",

            failureType:
                "GENERATOR_FAILURE",

            startTime:
                new Date(),

            repairDurationSeconds:
                -1,
        });


    const negativeDurationError =
        negativeDuration.validateSync();


    assertTrue(
        Boolean(
            negativeDurationError
                ?.errors
                ?.repairDurationSeconds
        ),
        "Negative repair duration is rejected"
    );


    console.log("");
    console.log(
        "================================================"
    );

    console.log(
        "FAILURE EVENT MODEL VALIDATION PASSED"
    );

    console.log(
        "================================================"
    );


    console.log("");
    console.log(
        "Validated engineering semantics:"
    );

    console.log(
        "- FailureEvent is separate from OutageEvent"
    );

    console.log(
        "- failure confirmation is explicit"
    );

    console.log(
        "- MTBF eligibility is explicit"
    );

    console.log(
        "- MTTR eligibility is explicit"
    );

    console.log(
        "- repair duration is distinct from equipment downtime"
    );
}


try {
    run();
}
catch (error) {
    console.error("");
    console.error(
        "FailureEvent model validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}