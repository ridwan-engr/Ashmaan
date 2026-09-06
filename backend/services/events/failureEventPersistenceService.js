// backend/services/events/failureEventPersistenceService.js

import mongoose from "mongoose";

import FailureEvent from "../../models/FailureEvent.js";

import {
    resolveFailureEquipmentIdentity,
} from "../reliability/failureEventEligibilityService.js";


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function asDate(value) {
    if (!value) {
        return null;
    }

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function normalizeId(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value === "object" &&
        value._id
    ) {
        return String(
            value._id
        );
    }

    return String(value);
}


function normalizeTelemetryId(
    value
) {
    if (!value) {
        return null;
    }

    if (
        value instanceof
        mongoose.Types.ObjectId
    ) {
        return value;
    }

    if (
        mongoose.Types.ObjectId.isValid(
            String(value)
        )
    ) {
        return new mongoose.Types.ObjectId(
            String(value)
        );
    }

    return null;
}


function normalizeEvidence(
    evidence = []
) {
    if (
        !Array.isArray(
            evidence
        )
    ) {
        return [];
    }

    return evidence
        .map(
            (item) => {
                const timestamp =
                    asDate(
                        item?.timestamp
                    );

                if (!timestamp) {
                    return null;
                }

                return {
                    telemetryId:
                        normalizeTelemetryId(
                            item
                                ?.telemetryId
                        ),

                    parameter:
                        item
                            ?.parameter ??
                        null,

                    value:
                        item
                            ?.value ??
                        null,

                    timestamp,

                    role:
                        item
                            ?.role ??
                        null,
                };
            }
        )
        .filter(Boolean);
}


function finiteNonNegativeNumber(
    value
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const numeric =
        Number(value);

    if (
        !Number.isFinite(
            numeric
        ) ||
        numeric < 0
    ) {
        return null;
    }

    return numeric;
}


/*
|--------------------------------------------------------------------------
| Calculate timing fields
|--------------------------------------------------------------------------
*/

function calculateTimingFields(
    candidate
) {
    const startTime =
        asDate(
            candidate
                ?.startTime
        );

    const detectionTime =
        asDate(
            candidate
                ?.detectionTime
        );

    const repairStartTime =
        asDate(
            candidate
                ?.repairStartTime
        );

    const repairEndTime =
        asDate(
            candidate
                ?.repairEndTime
        );

    const restorationTime =
        asDate(
            candidate
                ?.restorationTime
        );

    let downtimeSeconds =
        finiteNonNegativeNumber(
            candidate
                ?.downtimeSeconds
        );

    let repairDurationSeconds =
        finiteNonNegativeNumber(
            candidate
                ?.repairDurationSeconds
        );

    let detectionDelaySeconds =
        finiteNonNegativeNumber(
            candidate
                ?.detectionDelaySeconds
        );

    let responseTimeSeconds =
        finiteNonNegativeNumber(
            candidate
                ?.responseTimeSeconds
        );


    /*
    |--------------------------------------------------------------------------
    | Downtime:
    |
    | failure start -> functional restoration
    |--------------------------------------------------------------------------
    */

    if (
        downtimeSeconds ===
            null &&
        startTime &&
        restorationTime &&
        restorationTime >=
            startTime
    ) {
        downtimeSeconds =
            (
                restorationTime -
                startTime
            ) /
            1000;
    }


    /*
    |--------------------------------------------------------------------------
    | Repair duration:
    |
    | actual repair start -> actual repair completion
    |--------------------------------------------------------------------------
    */

    if (
        repairDurationSeconds ===
            null &&
        repairStartTime &&
        repairEndTime &&
        repairEndTime >=
            repairStartTime
    ) {
        repairDurationSeconds =
            (
                repairEndTime -
                repairStartTime
            ) /
            1000;
    }


    /*
    |--------------------------------------------------------------------------
    | Detection delay:
    |
    | failure occurrence -> detection
    |--------------------------------------------------------------------------
    */

    if (
        detectionDelaySeconds ===
            null &&
        startTime &&
        detectionTime &&
        detectionTime >=
            startTime
    ) {
        detectionDelaySeconds =
            (
                detectionTime -
                startTime
            ) /
            1000;
    }


    /*
    |--------------------------------------------------------------------------
    | Response time:
    |
    | detection -> repair activity start
    |--------------------------------------------------------------------------
    */

    if (
        responseTimeSeconds ===
            null &&
        detectionTime &&
        repairStartTime &&
        repairStartTime >=
            detectionTime
    ) {
        responseTimeSeconds =
            (
                repairStartTime -
                detectionTime
            ) /
            1000;
    }


    return {
        startTime,
        detectionTime,
        repairStartTime,
        repairEndTime,
        restorationTime,

        downtimeSeconds,
        repairDurationSeconds,
        detectionDelaySeconds,
        responseTimeSeconds,
    };
}


/*
|--------------------------------------------------------------------------
| Candidate validation
|--------------------------------------------------------------------------
*/

export function validatePersistableFailure(
    candidate
) {
    const errors = [];


    if (
        !candidate
            ?.installation
    ) {
        errors.push(
            "installation is required"
        );
    }


    const startTime =
        asDate(
            candidate
                ?.startTime
        );


    if (!startTime) {
        errors.push(
            "valid startTime is required"
        );
    }


    if (
        !candidate
            ?.failureType
    ) {
        errors.push(
            "failureType is required"
        );
    }


    if (
        candidate
            ?.failureConfirmed !==
        true
    ) {
        errors.push(
            "failureConfirmed must be true before persistence"
        );
    }


    const equipmentIdentity =
        resolveFailureEquipmentIdentity(
            candidate
        );


    if (
        equipmentIdentity
            .available !==
        true
    ) {
        errors.push(
            "repairable equipment identity is required"
        );
    }


    if (
        candidate?.status ===
        "INVALIDATED"
    ) {
        errors.push(
            "invalidated failure cannot be persisted as active reliability evidence"
        );
    }


    const timing =
        calculateTimingFields(
            candidate
        );


    if (
        timing.repairStartTime &&
        timing.startTime &&
        timing.repairStartTime <
            timing.startTime
    ) {
        errors.push(
            "repairStartTime cannot precede failure startTime"
        );
    }


    if (
        timing.repairEndTime &&
        timing.repairStartTime &&
        timing.repairEndTime <
            timing.repairStartTime
    ) {
        errors.push(
            "repairEndTime cannot precede repairStartTime"
        );
    }


    if (
        timing.restorationTime &&
        timing.startTime &&
        timing.restorationTime <
            timing.startTime
    ) {
        errors.push(
            "restorationTime cannot precede failure startTime"
        );
    }


    return {
        valid:
            errors.length ===
            0,

        errors,

        equipmentIdentity,

        timing,
    };
}


/*
|--------------------------------------------------------------------------
| Build payload
|--------------------------------------------------------------------------
*/

export function buildFailureEventPayload(
    candidate
) {
    const validation =
        validatePersistableFailure(
            candidate
        );


    if (
        !validation.valid
    ) {
        return {
            valid:
                false,

            errors:
                validation.errors,

            payload:
                null,
        };
    }


    const {
        timing,
        equipmentIdentity,
    } =
        validation;


    const endTime =
        asDate(
            candidate
                ?.endTime
        ) ??
        timing.restorationTime ??
        timing.repairEndTime ??
        null;


    return {
        valid:
            true,

        errors:
            [],

        payload: {
            installation:
                candidate
                    .installation,

            site:
                candidate
                    ?.site ??
                null,

            device:
                candidate
                    ?.device ??
                null,

            asset:
                candidate
                    ?.asset ??
                null,

            equipmentType:
                candidate
                    ?.equipmentType ??
                "UNKNOWN",

            equipmentIdentifier:
                candidate
                    ?.equipmentIdentifier ??
                null,

            failureType:
                candidate
                    .failureType,

            failureMode:
                candidate
                    ?.failureMode ??
                null,

            source:
                candidate
                    ?.source ??
                "DERIVED",

            status:
                candidate
                    ?.status ??
                "OPEN",

            startTime:
                timing
                    .startTime,

            detectionTime:
                timing
                    .detectionTime,

            repairStartTime:
                timing
                    .repairStartTime,

            repairEndTime:
                timing
                    .repairEndTime,

            restorationTime:
                timing
                    .restorationTime,

            endTime,

            downtimeSeconds:
                timing
                    .downtimeSeconds,

            repairDurationSeconds:
                timing
                    .repairDurationSeconds,

            detectionDelaySeconds:
                timing
                    .detectionDelaySeconds,

            responseTimeSeconds:
                timing
                    .responseTimeSeconds,

            affectedLoadKw:
                finiteNonNegativeNumber(
                    candidate
                        ?.affectedLoadKw
                ),

            energyNotSuppliedKwh:
                finiteNonNegativeNumber(
                    candidate
                        ?.energyNotSuppliedKwh
                ),

            technician:
                candidate
                    ?.technician ??
                null,

            contractor:
                candidate
                    ?.contractor ??
                null,

            maintenanceCost:
                finiteNonNegativeNumber(
                    candidate
                        ?.maintenanceCost
                ),

            cause:
                candidate
                    ?.cause ??
                null,

            rootCause:
                candidate
                    ?.rootCause ??
                null,

            correctiveAction:
                candidate
                    ?.correctiveAction ??
                null,

            notes:
                candidate
                    ?.notes ??
                null,

            detectionEvidence:
                normalizeEvidence(
                    candidate
                        ?.detectionEvidence
                ),

            restorationEvidence:
                normalizeEvidence(
                    candidate
                        ?.restorationEvidence
                ),

            detectionMethod:
                candidate
                    ?.detectionMethod ??
                "UNKNOWN",

            confidence:
                Number.isFinite(
                    Number(
                        candidate
                            ?.confidence
                    )
                )
                    ? Number(
                        candidate
                            .confidence
                    )
                    : null,

            failureConfirmed:
                true,

            eligibleForMtbf:
                candidate
                    ?.eligibleForMtbf ===
                true,

            eligibleForMttr:
                candidate
                    ?.eligibleForMttr ===
                true,

            raw: {
                ...(
                    candidate
                        ?.raw ??
                    {}
                ),

                reliabilityKey:
                    equipmentIdentity
                        .reliabilityKey,

                equipmentIdentityType:
                    equipmentIdentity
                        .identityType,

                equipmentIdentity:
                    equipmentIdentity
                        .identity,
            },
        },
    };
}


/*
|--------------------------------------------------------------------------
| Existing failure lookup
|--------------------------------------------------------------------------
|
| Event identity:
|
| same repairable item
| + same failure type
| + same physical failure start
|
| This is intentionally stricter than "timestamps are close".
|--------------------------------------------------------------------------
*/

async function findExistingFailure(
    candidate
) {
    const validation =
        validatePersistableFailure(
            candidate
        );


    if (
        !validation.valid
    ) {
        return {
            event:
                null,

            matchedBy:
                null,
        };
    }


    const {
        equipmentIdentity,
        timing,
    } =
        validation;


    const query = {
        installation:
            candidate
                .installation,

        failureType:
            candidate
                .failureType,

        startTime:
            timing
                .startTime,
    };


    /*
    |--------------------------------------------------------------------------
    | Use strongest available physical identity.
    |--------------------------------------------------------------------------
    */

    if (
        equipmentIdentity
            .identityType ===
        "ASSET"
    ) {
        query.asset =
            candidate.asset;
    }
    else if (
        equipmentIdentity
            .identityType ===
        "DEVICE"
    ) {
        query.device =
            candidate.device;
    }
    else {
        query.equipmentIdentifier =
            candidate
                .equipmentIdentifier;
    }


    const exact =
        await FailureEvent.findOne(
            query
        );


    if (exact) {
        return {
            event:
                exact,

            matchedBy:
                "EXACT_FAILURE_IDENTITY",
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Secondary evidence identity.
    |--------------------------------------------------------------------------
    */

    const telemetryIds =
        normalizeEvidence(
            candidate
                ?.detectionEvidence
        )
            .map(
                (item) =>
                    item
                        .telemetryId
            )
            .filter(Boolean);


    if (
        telemetryIds.length >
        0
    ) {
        const evidenceQuery = {
            installation:
                candidate
                    .installation,

            failureType:
                candidate
                    .failureType,

            "detectionEvidence.telemetryId": {
                $in:
                    telemetryIds,
            },
        };


        if (
            equipmentIdentity
                .identityType ===
            "ASSET"
        ) {
            evidenceQuery.asset =
                candidate.asset;
        }
        else if (
            equipmentIdentity
                .identityType ===
            "DEVICE"
        ) {
            evidenceQuery.device =
                candidate.device;
        }
        else {
            evidenceQuery
                .equipmentIdentifier =
                candidate
                    .equipmentIdentifier;
        }


        const byEvidence =
            await FailureEvent.findOne(
                evidenceQuery
            );


        if (byEvidence) {
            return {
                event:
                    byEvidence,

                matchedBy:
                    "DETECTION_EVIDENCE",
            };
        }
    }


    return {
        event:
            null,

        matchedBy:
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Update existing failure
|--------------------------------------------------------------------------
*/

async function updateExistingFailure(
    existing,
    payload
) {
    /*
    |--------------------------------------------------------------------------
    | Never downgrade completed / restored failure back to OPEN.
    |--------------------------------------------------------------------------
    */

    if (
        (
            existing.status ===
                "RESTORED" ||
            existing.status ===
                "CLOSED"
        ) &&
        (
            payload.status ===
                "OPEN" ||
            payload.status ===
                "UNDER_REPAIR"
        )
    ) {
        return {
            event:
                existing,

            action:
                "UNCHANGED",

            reason:
                "Existing failure is already completed",
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Lifecycle progression
    |--------------------------------------------------------------------------
    */

    const lifecycleRank = {
        OPEN:
            1,

        UNDER_REPAIR:
            2,

        RESTORED:
            3,

        CLOSED:
            4,

        INVALIDATED:
            5,
    };


    if (
        (
            lifecycleRank[
                payload.status
            ] ??
            0
        ) >=
        (
            lifecycleRank[
                existing.status
            ] ??
            0
        )
    ) {
        existing.status =
            payload.status;
    }


    /*
    |--------------------------------------------------------------------------
    | Timing enrichment
    |--------------------------------------------------------------------------
    */

    if (
        payload.detectionTime
    ) {
        existing.detectionTime =
            existing.detectionTime ??
            payload.detectionTime;
    }


    if (
        payload.repairStartTime
    ) {
        existing.repairStartTime =
            existing.repairStartTime ??
            payload.repairStartTime;
    }


    if (
        payload.repairEndTime
    ) {
        existing.repairEndTime =
            payload.repairEndTime;
    }


    if (
        payload.restorationTime
    ) {
        existing.restorationTime =
            payload.restorationTime;
    }


    if (
        payload.endTime
    ) {
        existing.endTime =
            payload.endTime;
    }


    /*
    |--------------------------------------------------------------------------
    | Derived durations
    |--------------------------------------------------------------------------
    */

    if (
        payload.downtimeSeconds !==
        null
    ) {
        existing.downtimeSeconds =
            payload.downtimeSeconds;
    }


    if (
        payload.repairDurationSeconds !==
        null
    ) {
        existing.repairDurationSeconds =
            payload
                .repairDurationSeconds;
    }


    if (
        payload.detectionDelaySeconds !==
        null
    ) {
        existing.detectionDelaySeconds =
            payload
                .detectionDelaySeconds;
    }


    if (
        payload.responseTimeSeconds !==
        null
    ) {
        existing.responseTimeSeconds =
            payload
                .responseTimeSeconds;
    }


    /*
    |--------------------------------------------------------------------------
    | Engineering / maintenance enrichment
    |--------------------------------------------------------------------------
    */

    for (
        const field
        of [
            "technician",
            "contractor",
            "cause",
            "rootCause",
            "correctiveAction",
            "notes",
        ]
    ) {
        if (
            payload[
                field
            ] !==
            null
        ) {
            existing[
                field
            ] =
                payload[
                    field
                ];
        }
    }


    if (
        payload.maintenanceCost !==
        null
    ) {
        existing.maintenanceCost =
            payload
                .maintenanceCost;
    }


    if (
        payload.affectedLoadKw !==
        null
    ) {
        existing.affectedLoadKw =
            payload
                .affectedLoadKw;
    }


    if (
        payload.energyNotSuppliedKwh !==
        null
    ) {
        existing.energyNotSuppliedKwh =
            payload
                .energyNotSuppliedKwh;
    }


    /*
    |--------------------------------------------------------------------------
    | Eligibility can be promoted only explicitly.
    |--------------------------------------------------------------------------
    */

    existing.failureConfirmed =
        existing.failureConfirmed ===
            true ||
        payload.failureConfirmed ===
            true;


    existing.eligibleForMtbf =
        existing.eligibleForMtbf ===
            true ||
        payload.eligibleForMtbf ===
            true;


    existing.eligibleForMttr =
        existing.eligibleForMttr ===
            true ||
        payload.eligibleForMttr ===
            true;


    /*
    |--------------------------------------------------------------------------
    | Confidence should never be weakened by repeated evidence.
    |--------------------------------------------------------------------------
    */

    if (
        payload.confidence !==
        null
    ) {
        existing.confidence =
            Math.max(
                existing.confidence ??
                    0,

                payload.confidence
            );
    }


    /*
    |--------------------------------------------------------------------------
    | Evidence refresh
    |--------------------------------------------------------------------------
    */

    if (
        payload
            .detectionEvidence
            .length >
        0
    ) {
        existing.detectionEvidence =
            payload
                .detectionEvidence;
    }


    if (
        payload
            .restorationEvidence
            .length >
        0
    ) {
        existing.restorationEvidence =
            payload
                .restorationEvidence;
    }


    existing.raw = {
        ...(
            existing.raw ??
            {}
        ),

        ...(
            payload.raw ??
            {}
        ),
    };


    await existing.save();


    return {
        event:
            existing,

        action:
            "UPDATED_EXISTING",

        reason:
            "Matching physical failure already existed",
    };
}


/*
|--------------------------------------------------------------------------
| Persist one failure
|--------------------------------------------------------------------------
*/

export async function persistFailureEvent(
    candidate,
    {
        dryRun = false,
    } = {}
) {
    const built =
        buildFailureEventPayload(
            candidate
        );


    if (
        built.valid !==
        true
    ) {
        return {
            action:
                "REJECTED",

            errors:
                built.errors,

            event:
                null,
        };
    }


    const payload =
        built.payload;


    const existingResult =
        await findExistingFailure(
            candidate
        );


    if (
        existingResult.event
    ) {
        if (dryRun) {
            return {
                action:
                    "WOULD_UPDATE",

                matchedBy:
                    existingResult
                        .matchedBy,

                event:
                    existingResult
                        .event,

                payload,
            };
        }


        const updated =
            await updateExistingFailure(
                existingResult
                    .event,

                payload
            );


        return {
            ...updated,

            matchedBy:
                existingResult
                    .matchedBy,
        };
    }


    if (dryRun) {
        return {
            action:
                "WOULD_CREATE",

            matchedBy:
                null,

            event:
                null,

            payload,
        };
    }


    const created =
        await FailureEvent.create(
            payload
        );


    return {
        action:
            "CREATED",

        matchedBy:
            null,

        event:
            created,
    };
}


/*
|--------------------------------------------------------------------------
| Persist multiple failures
|--------------------------------------------------------------------------
*/

export async function persistFailureEvents(
    candidates = [],
    {
        dryRun = false,
    } = {}
) {
    const results = [];


    for (
        const candidate
        of candidates
    ) {
        const result =
            await persistFailureEvent(
                candidate,
                {
                    dryRun,
                }
            );


        results.push(
            result
        );
    }


    const summary =
        results.reduce(
            (
                accumulator,
                result
            ) => {
                accumulator.total +=
                    1;


                accumulator[
                    result.action
                ] =
                    (
                        accumulator[
                            result.action
                        ] ??
                        0
                    ) +
                    1;


                return accumulator;
            },
            {
                total:
                    0,
            }
        );


    return {
        results,
        summary,
    };
}