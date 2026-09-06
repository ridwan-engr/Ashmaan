// backend/scripts/validateFailureEventPersistenceConnected.js

import mongoose from "mongoose";

import connectDatabase from "../config/database.js";
import FailureEvent from "../models/FailureEvent.js";

import {
    persistFailureEvent,
} from "../services/events/failureEventPersistenceService.js";


/*
|--------------------------------------------------------------------------
| Assertion helpers
|--------------------------------------------------------------------------
*/

function assertEqual(
    actual,
    expected,
    label
) {
    if (actual !== expected) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(`PASS: ${label}`);
}


function assertTrue(
    value,
    label
) {
    if (value !== true) {
        throw new Error(
            `${label}: expected true, received ${value}`
        );
    }

    console.log(`PASS: ${label}`);
}


/*
|--------------------------------------------------------------------------
| Synthetic test identity
|--------------------------------------------------------------------------
|
| Use a highly distinctive identifier so that:
|
| - no real operational failure is touched
| - cleanup can target only this validator's records
|--------------------------------------------------------------------------
*/

const TEST_EQUIPMENT_IDENTIFIER =
    "__ASHMAAN_FAILURE_PERSISTENCE_TEST_GEN_01__";

const TEST_FAILURE_START =
    new Date(
        "2099-01-01T10:00:00.000Z"
    );


/*
|--------------------------------------------------------------------------
| Candidate builder
|--------------------------------------------------------------------------
*/

function buildCandidate({
    installationId,

    status = "OPEN",

    detectionTime =
        "2099-01-01T10:05:00.000Z",

    repairStartTime = null,

    repairEndTime = null,

    restorationTime = null,

    eligibleForMtbf = true,

    eligibleForMttr = false,

    confidence = 0.90,

    notes = null,
} = {}) {
    return {
        installation:
            installationId,

        site:
            null,

        device:
            null,

        asset:
            null,

        equipmentType:
            "GENERATOR",

        equipmentIdentifier:
            TEST_EQUIPMENT_IDENTIFIER,

        failureType:
            "GENERATOR_FAILURE",

        failureMode:
            "SYNTHETIC_VALIDATION_FAILURE",

        source:
            "MANUAL",

        status,

        startTime:
            TEST_FAILURE_START,

        detectionTime:
            detectionTime
                ? new Date(
                    detectionTime
                )
                : null,

        repairStartTime:
            repairStartTime
                ? new Date(
                    repairStartTime
                )
                : null,

        repairEndTime:
            repairEndTime
                ? new Date(
                    repairEndTime
                )
                : null,

        restorationTime:
            restorationTime
                ? new Date(
                    restorationTime
                )
                : null,

        failureConfirmed:
            true,

        eligibleForMtbf,

        eligibleForMttr,

        detectionMethod:
            "MANUAL",

        confidence,

        notes,

        raw: {
            syntheticValidation:
                true,

            validator:
                "validateFailureEventPersistenceConnected",
        },
    };
}


/*
|--------------------------------------------------------------------------
| Main validation
|--------------------------------------------------------------------------
*/

async function run() {
    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "ASHMAAN CONNECTED FAILURE PERSISTENCE VALIDATION"
    );

    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | Connect using existing backend configuration
    |--------------------------------------------------------------------------
    */

    await connectDatabase();


    /*
    |--------------------------------------------------------------------------
    | Use a synthetic ObjectId.
    |
    | FailureEvent currently stores installation as an ObjectId reference.
    | Mongoose does not require the referenced Installation document to exist
    | merely to persist this synthetic FailureEvent.
    |
    | This prevents the validator from modifying any real installation.
    |--------------------------------------------------------------------------
    */

    const installationId =
        new mongoose.Types.ObjectId();


    /*
    |--------------------------------------------------------------------------
    | Defensive cleanup before test
    |--------------------------------------------------------------------------
    */

    await FailureEvent.deleteMany({
        installation:
            installationId,

        equipmentIdentifier:
            TEST_EQUIPMENT_IDENTIFIER,
    });


    /*
    |--------------------------------------------------------------------------
    | CASE 1 — CREATE OPEN FAILURE
    |--------------------------------------------------------------------------
    */

    const openCandidate =
        buildCandidate({
            installationId,

            status:
                "OPEN",

            eligibleForMtbf:
                true,

            eligibleForMttr:
                false,

            confidence:
                0.80,

            notes:
                "Synthetic open failure",
        });


    const created =
        await persistFailureEvent(
            openCandidate
        );


    assertEqual(
        created.action,
        "CREATED",
        "First physical failure is created"
    );


    assertTrue(
        Boolean(
            created.event?._id
        ),
        "Created failure has database identifier"
    );


    const failureId =
        String(
            created.event._id
        );


    assertEqual(
        created.event.status,
        "OPEN",
        "Initial persisted lifecycle state is OPEN"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — SAME PHYSICAL FAILURE IS DEDUPLICATED
    |--------------------------------------------------------------------------
    */

    const duplicate =
        await persistFailureEvent(
            buildCandidate({
                installationId,

                status:
                    "OPEN",

                eligibleForMtbf:
                    true,

                eligibleForMttr:
                    false,

                confidence:
                    0.85,

                notes:
                    "Repeated observation of same failure",
            })
        );


    assertEqual(
        duplicate.action,
        "UPDATED_EXISTING",
        "Repeated physical failure updates existing event"
    );


    assertEqual(
        duplicate.matchedBy,
        "EXACT_FAILURE_IDENTITY",
        "Repeated failure matched by exact physical identity"
    );


    assertEqual(
        String(
            duplicate.event._id
        ),
        failureId,
        "Repeated failure retains original database identifier"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — OPEN -> UNDER_REPAIR
    |--------------------------------------------------------------------------
    */

    const underRepair =
        await persistFailureEvent(
            buildCandidate({
                installationId,

                status:
                    "UNDER_REPAIR",

                repairStartTime:
                    "2099-01-01T10:30:00.000Z",

                eligibleForMtbf:
                    true,

                eligibleForMttr:
                    false,

                confidence:
                    0.90,

                notes:
                    "Synthetic repair started",
            })
        );


    assertEqual(
        underRepair.action,
        "UPDATED_EXISTING",
        "OPEN failure updates when repair begins"
    );


    assertEqual(
        underRepair.event.status,
        "UNDER_REPAIR",
        "Lifecycle advances OPEN -> UNDER_REPAIR"
    );


    assertEqual(
        String(
            underRepair.event._id
        ),
        failureId,
        "Repair progression remains same physical failure"
    );


    assertTrue(
        Boolean(
            underRepair.event
                .repairStartTime
        ),
        "Repair start time is persisted"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — UNDER_REPAIR -> RESTORED
    |--------------------------------------------------------------------------
    */

    const restored =
        await persistFailureEvent(
            buildCandidate({
                installationId,

                status:
                    "RESTORED",

                repairStartTime:
                    "2099-01-01T10:30:00.000Z",

                repairEndTime:
                    "2099-01-01T11:30:00.000Z",

                restorationTime:
                    "2099-01-01T11:40:00.000Z",

                eligibleForMtbf:
                    true,

                eligibleForMttr:
                    true,

                confidence:
                    0.95,

                notes:
                    "Synthetic equipment restoration confirmed",
            })
        );


    assertEqual(
        restored.action,
        "UPDATED_EXISTING",
        "UNDER_REPAIR failure updates when restored"
    );


    assertEqual(
        restored.event.status,
        "RESTORED",
        "Lifecycle advances UNDER_REPAIR -> RESTORED"
    );


    assertEqual(
        String(
            restored.event._id
        ),
        failureId,
        "Restoration remains same physical failure"
    );


    assertEqual(
        restored.event
            .repairDurationSeconds,
        3600,
        "Actual repair duration persisted as one hour"
    );


    assertEqual(
        restored.event
            .downtimeSeconds,
        6000,
        "Equipment downtime persisted as 100 minutes"
    );


    assertEqual(
        restored.event
            .eligibleForMttr,
        true,
        "Completed repair becomes MTTR eligible"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — RESTORED -> OPEN DOWNGRADE MUST BE BLOCKED
    |--------------------------------------------------------------------------
    */

    const downgrade =
        await persistFailureEvent(
            buildCandidate({
                installationId,

                status:
                    "OPEN",

                eligibleForMtbf:
                    true,

                eligibleForMttr:
                    false,

                confidence:
                    0.70,

                notes:
                    "Stale synthetic observation",
            })
        );


    assertEqual(
        downgrade.action,
        "UNCHANGED",
        "RESTORED failure cannot regress to OPEN"
    );


    assertEqual(
        downgrade.event.status,
        "RESTORED",
        "Completed failure remains RESTORED"
    );


    assertEqual(
        String(
            downgrade.event._id
        ),
        failureId,
        "Blocked downgrade still references same failure"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — CONFIDENCE MUST NOT REGRESS
    |--------------------------------------------------------------------------
    */

    assertEqual(
        downgrade.event.confidence,
        0.95,
        "Lower-confidence stale observation does not weaken confidence"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7 — PHYSICAL FAILURE COUNT MUST REMAIN ONE
    |--------------------------------------------------------------------------
    */

    const physicalFailureCount =
        await FailureEvent.countDocuments({
            installation:
                installationId,

            equipmentIdentifier:
                TEST_EQUIPMENT_IDENTIFIER,

            failureType:
                "GENERATOR_FAILURE",

            startTime:
                TEST_FAILURE_START,
        });


    assertEqual(
        physicalFailureCount,
        1,
        "Repeated lifecycle observations create only one physical failure"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 8 — FINAL DATABASE STATE
    |--------------------------------------------------------------------------
    */

    const finalFailure =
        await FailureEvent.findById(
            failureId
        );


    assertTrue(
        Boolean(
            finalFailure
        ),
        "Final persisted failure can be retrieved"
    );


    assertEqual(
        finalFailure.status,
        "RESTORED",
        "Final database lifecycle state is RESTORED"
    );


    assertEqual(
        finalFailure.failureConfirmed,
        true,
        "Final database event remains confirmed"
    );


    assertEqual(
        finalFailure.eligibleForMtbf,
        true,
        "Final database event remains MTBF eligible"
    );


    assertEqual(
        finalFailure.eligibleForMttr,
        true,
        "Final database event remains MTTR eligible"
    );


    assertEqual(
        finalFailure
            .repairDurationSeconds,
        3600,
        "Final database repair duration is one hour"
    );


    assertEqual(
        finalFailure
            .downtimeSeconds,
        6000,
        "Final database downtime is 100 minutes"
    );


    /*
    |--------------------------------------------------------------------------
    | Cleanup
    |--------------------------------------------------------------------------
    */

    const cleanup =
        await FailureEvent.deleteMany({
            _id:
                finalFailure._id,

            installation:
                installationId,

            equipmentIdentifier:
                TEST_EQUIPMENT_IDENTIFIER,

            "raw.syntheticValidation":
                true,
        });


    assertEqual(
        cleanup.deletedCount,
        1,
        "Synthetic failure record is removed after validation"
    );


    const remaining =
        await FailureEvent.countDocuments({
            installation:
                installationId,

            equipmentIdentifier:
                TEST_EQUIPMENT_IDENTIFIER,
        });


    assertEqual(
        remaining,
        0,
        "No synthetic failure record remains after cleanup"
    );


    console.log("");

    console.log(
        "================================================"
    );

    console.log(
        "CONNECTED FAILURE PERSISTENCE VALIDATION PASSED"
    );

    console.log(
        "================================================"
    );


    console.log("");

    console.log(
        "Validated database semantics:"
    );

    console.log(
        "- first physical failure creates one document"
    );

    console.log(
        "- repeated observations are deduplicated"
    );

    console.log(
        "- OPEN -> UNDER_REPAIR -> RESTORED lifecycle works"
    );

    console.log(
        "- RESTORED -> OPEN regression is blocked"
    );

    console.log(
        "- confidence does not regress"
    );

    console.log(
        "- MTBF and MTTR eligibility survive lifecycle enrichment"
    );

    console.log(
        "- synthetic validation data is cleaned up"
    );
}


/*
|--------------------------------------------------------------------------
| Execute and always disconnect
|--------------------------------------------------------------------------
*/

try {
    await run();
}
catch (error) {
    console.error("");

    console.error(
        "Connected failure persistence validation failed:"
    );

    console.error(error);

    process.exitCode =
        1;
}
finally {
    if (
        mongoose.connection
            .readyState !==
        0
    ) {
        await mongoose.disconnect();

        console.log(
            "MongoDB disconnected."
        );
    }
}