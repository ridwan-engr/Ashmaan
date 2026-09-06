// backend/scripts/validateFailureEventPersistence.js

import mongoose from "mongoose";

import {
    validatePersistableFailure,
    buildFailureEventPayload,
    persistFailureEvent,
} from "../services/events/failureEventPersistenceService.js";


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


function candidate({
    confirmed =
    true,

    status =
    "RESTORED",

    equipmentIdentifier =
    "GEN-01",

    repairStart =
    "2026-09-05T10:30:00.000Z",

    repairEnd =
    "2026-09-05T11:30:00.000Z",

    restoration =
    "2026-09-05T11:40:00.000Z",
} = {}) {
    return {
        installation:
            new mongoose.Types.ObjectId(),

        equipmentType:
            "GENERATOR",

        equipmentIdentifier,

        failureType:
            "GENERATOR_FAILURE",

        failureMode:
            "START_FAILURE",

        source:
            "MAINTENANCE",

        status,

        startTime:
            new Date(
                "2026-09-05T10:00:00.000Z"
            ),

        detectionTime:
            new Date(
                "2026-09-05T10:05:00.000Z"
            ),

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

        restorationTime:
            restoration
                ? new Date(
                    restoration
                )
                : null,

        failureConfirmed:
            confirmed,

        eligibleForMtbf:
            true,

        eligibleForMttr:
            status ===
            "RESTORED",
    };
}


async function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN FAILURE EVENT PERSISTENCE VALIDATION"
    );
    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 1 — valid candidate
    |--------------------------------------------------------------------------
    */

    const validCandidate =
        candidate();


    const validation =
        validatePersistableFailure(
            validCandidate
        );


    assertEqual(
        validation.valid,
        true,
        "Confirmed identifiable failure is persistable"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — timing derivation
    |--------------------------------------------------------------------------
    */

    const built =
        buildFailureEventPayload(
            validCandidate
        );


    assertEqual(
        built.valid,
        true,
        "Failure payload builds successfully"
    );


    assertClose(
        built
            .payload
            .repairDurationSeconds,
        3600,
        0.000001,
        "Repair duration derived as one hour"
    );


    assertClose(
        built
            .payload
            .downtimeSeconds,
        6000,
        0.000001,
        "Downtime derived independently as 100 minutes"
    );


    assertClose(
        built
            .payload
            .detectionDelaySeconds,
        300,
        0.000001,
        "Detection delay derived as five minutes"
    );


    assertClose(
        built
            .payload
            .responseTimeSeconds,
        1500,
        0.000001,
        "Response time derived as twenty-five minutes"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — raw identity metadata
    |--------------------------------------------------------------------------
    */

    assertEqual(
        built
            .payload
            .raw
            .equipmentIdentityType,
        "EQUIPMENT_IDENTIFIER",
        "Equipment identifier identity is recorded"
    );


    assertEqual(
        built
            .payload
            .raw
            .reliabilityKey
            .includes(
                "GEN-01"
            ),
        true,
        "Reliability key contains equipment identifier"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — unconfirmed failure blocked
    |--------------------------------------------------------------------------
    */

    const unconfirmed =
        validatePersistableFailure(
            candidate({
                confirmed:
                    false,
            })
        );


    assertEqual(
        unconfirmed.valid,
        false,
        "Unconfirmed failure cannot be persisted"
    );


    assertEqual(
        unconfirmed
            .errors
            .includes(
                "failureConfirmed must be true before persistence"
            ),
        true,
        "Unconfirmed persistence rejection is explicit"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — missing equipment identity blocked
    |--------------------------------------------------------------------------
    */

    const noIdentity =
        candidate({
            equipmentIdentifier:
                null,
        });


    noIdentity.asset =
        null;

    noIdentity.device =
        null;


    const noIdentityResult =
        validatePersistableFailure(
            noIdentity
        );


    assertEqual(
        noIdentityResult.valid,
        false,
        "Failure without repairable-item identity cannot be persisted"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — invalid repair ordering blocked
    |--------------------------------------------------------------------------
    */

    const badRepair =
        validatePersistableFailure(
            candidate({
                repairStart:
                    "2026-09-05T12:00:00.000Z",

                repairEnd:
                    "2026-09-05T11:00:00.000Z",
            })
        );


    assertEqual(
        badRepair.valid,
        false,
        "Repair end before repair start is rejected"
    );


    /*
|--------------------------------------------------------------------------
| CASE 7 — payload construction is database-independent
|--------------------------------------------------------------------------
|
| The pure validator must not require MongoDB.
|
| Actual persistence / idempotency will receive its own connected
| integration validator later.
|--------------------------------------------------------------------------
*/

    const persistenceCandidate =
        candidate();


    const persistencePayload =
        buildFailureEventPayload(
            persistenceCandidate
        );


    assertEqual(
        persistencePayload.valid,
        true,
        "Valid failure produces persistence-ready payload without database access"
    );


    assertEqual(
        persistencePayload
            .payload
            .failureConfirmed,
        true,
        "Persistence-ready payload retains confirmed failure state"
    );


    assertEqual(
        persistencePayload
            .payload
            .eligibleForMtbf,
        true,
        "Persistence-ready payload retains MTBF eligibility"
    );


    assertEqual(
        persistencePayload
            .payload
            .eligibleForMttr,
        true,
        "Persistence-ready payload retains MTTR eligibility"
    );

    /*
    |--------------------------------------------------------------------------
    | CASE 8 — open failure can persist without repair timing
    |--------------------------------------------------------------------------
    */

    const openCandidate =
        candidate({
            status:
                "OPEN",

            repairStart:
                null,

            repairEnd:
                null,

            restoration:
                null,
        });


    openCandidate
        .eligibleForMttr =
        false;


    const openValidation =
        validatePersistableFailure(
            openCandidate
        );


    assertEqual(
        openValidation.valid,
        true,
        "Confirmed open failure can be persisted before repair completion"
    );


    const openPayload =
        buildFailureEventPayload(
            openCandidate
        );


    assertEqual(
        openPayload
            .payload
            .repairDurationSeconds,
        null,
        "Open failure does not fabricate repair duration"
    );


    assertEqual(
        openPayload
            .payload
            .downtimeSeconds,
        null,
        "Open failure does not fabricate completed downtime"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "FAILURE EVENT PERSISTENCE VALIDATION PASSED"
    );
    console.log(
        "================================================"
    );

    console.log("");
    console.log(
        "Validated persistence semantics:"
    );

    console.log(
        "- only confirmed identifiable failures are persistable"
    );

    console.log(
        "- repair duration and downtime remain separate"
    );

    console.log(
        "- timing fields are derived only when defensible"
    );

    console.log(
        "- payload validation requires no database connection"
    );
    
    console.log(
        "- open failures do not fabricate completed repair metrics"
    );
}


run()
    .catch(
        (error) => {
            console.error("");
            console.error(
                "Failure event persistence validation failed:"
            );

            console.error(
                error
            );

            process.exitCode =
                1;
        }
    );