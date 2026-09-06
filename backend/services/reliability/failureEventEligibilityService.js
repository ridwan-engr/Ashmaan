// backend/services/reliability/failureEventEligibilityService.js


/*
|--------------------------------------------------------------------------
| Eligibility reason codes
|--------------------------------------------------------------------------
*/

export const FAILURE_ELIGIBILITY_REASON = {
    ELIGIBLE:
        "ELIGIBLE",

    FAILURE_NOT_CONFIRMED:
        "FAILURE_NOT_CONFIRMED",

    INVALIDATED_EVENT:
        "INVALIDATED_EVENT",

    INSTALLATION_UNAVAILABLE:
        "INSTALLATION_UNAVAILABLE",

    EQUIPMENT_IDENTITY_UNAVAILABLE:
        "EQUIPMENT_IDENTITY_UNAVAILABLE",

    INVALID_FAILURE_START:
        "INVALID_FAILURE_START",

    MTBF_NOT_ENABLED:
        "MTBF_NOT_ENABLED",

    MTTR_NOT_ENABLED:
        "MTTR_NOT_ENABLED",

    REPAIR_NOT_COMPLETED:
        "REPAIR_NOT_COMPLETED",

    INVALID_REPAIR_START:
        "INVALID_REPAIR_START",

    INVALID_REPAIR_END:
        "INVALID_REPAIR_END",

    INVALID_REPAIR_INTERVAL:
        "INVALID_REPAIR_INTERVAL",

    REPAIR_BEFORE_FAILURE:
        "REPAIR_BEFORE_FAILURE",
};


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


function normalizeText(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }


    const normalized =
        String(value)
            .trim();


    return normalized.length
        ? normalized
        : null;
}


/*
|--------------------------------------------------------------------------
| Resolve equipment identity
|--------------------------------------------------------------------------
|
| Reliability metrics must refer to an identifiable repairable item.
|
| Identity preference:
|
| 1. Asset
| 2. Device
| 3. Explicit equipmentIdentifier
|
| Installation + equipmentType alone is NOT considered sufficient for
| asset-level MTBF because multiple items of the same equipment type may
| exist at one installation.
|--------------------------------------------------------------------------
*/

export function resolveFailureEquipmentIdentity(
    failure
) {
    const assetId =
        normalizeId(
            failure?.asset
        );


    if (assetId) {
        return {
            available:
                true,

            identityType:
                "ASSET",

            identity:
                assetId,

            reliabilityKey:
                `ASSET:${assetId}`,
        };
    }


    const deviceId =
        normalizeId(
            failure?.device
        );


    if (deviceId) {
        return {
            available:
                true,

            identityType:
                "DEVICE",

            identity:
                deviceId,

            reliabilityKey:
                `DEVICE:${deviceId}`,
        };
    }


    const equipmentIdentifier =
        normalizeText(
            failure
                ?.equipmentIdentifier
        );


    if (equipmentIdentifier) {
        const installationId =
            normalizeId(
                failure
                    ?.installation
            );


        if (!installationId) {
            return {
                available:
                    false,

                identityType:
                    null,

                identity:
                    null,

                reliabilityKey:
                    null,
            };
        }


        return {
            available:
                true,

            identityType:
                "EQUIPMENT_IDENTIFIER",

            identity:
                equipmentIdentifier,

            reliabilityKey:
                [
                    "INSTALLATION",
                    installationId,
                    "EQUIPMENT",
                    equipmentIdentifier,
                ].join(":"),
        };
    }


    return {
        available:
            false,

        identityType:
            null,

        identity:
            null,

        reliabilityKey:
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Common failure validation
|--------------------------------------------------------------------------
*/

function evaluateCommonEligibility(
    failure
) {
    if (
        failure
            ?.failureConfirmed !==
        true
    ) {
        return {
            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .FAILURE_NOT_CONFIRMED,
        };
    }


    if (
        failure?.status ===
        "INVALIDATED"
    ) {
        return {
            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .INVALIDATED_EVENT,
        };
    }


    const installationId =
        normalizeId(
            failure
                ?.installation
        );


    if (!installationId) {
        return {
            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .INSTALLATION_UNAVAILABLE,
        };
    }


    const equipmentIdentity =
        resolveFailureEquipmentIdentity(
            failure
        );


    if (
        equipmentIdentity
            .available !==
        true
    ) {
        return {
            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .EQUIPMENT_IDENTITY_UNAVAILABLE,

            installationId,
        };
    }


    const failureStart =
        asDate(
            failure
                ?.startTime
        );


    if (!failureStart) {
        return {
            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .INVALID_FAILURE_START,

            installationId,

            equipmentIdentity,
        };
    }


    return {
        eligible:
            true,

        reason:
            FAILURE_ELIGIBILITY_REASON
                .ELIGIBLE,

        installationId,

        equipmentIdentity,

        failureStart,
    };
}


/*
|--------------------------------------------------------------------------
| MTBF eligibility
|--------------------------------------------------------------------------
|
| This function establishes only whether the FAILURE RECORD is allowed
| to participate in MTBF analysis.
|
| It does NOT yet prove operating exposure.
|
| MTBF still requires:
|
|     validated operating exposure / validated failure count
|
| in the later MTBF calculation service.
|--------------------------------------------------------------------------
*/

export function evaluateMtbfFailureEligibility(
    failure
) {
    const common =
        evaluateCommonEligibility(
            failure
        );


    if (
        common.eligible !==
        true
    ) {
        return {
            ...common,

            metric:
                "MTBF",
        };
    }


    if (
        failure
            ?.eligibleForMtbf !==
        true
    ) {
        return {
            ...common,

            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .MTBF_NOT_ENABLED,

            metric:
                "MTBF",
        };
    }


    return {
        ...common,

        metric:
            "MTBF",

        eligible:
            true,

        reason:
            FAILURE_ELIGIBILITY_REASON
                .ELIGIBLE,

        failureType:
            failure
                ?.failureType ??
            null,

        equipmentType:
            failure
                ?.equipmentType ??
            null,

        sourceEventId:
            normalizeId(
                failure?._id
            ),
    };
}


/*
|--------------------------------------------------------------------------
| MTTR eligibility
|--------------------------------------------------------------------------
|
| MTTR is based on ACTUAL REPAIR DURATION:
|
|     repairStartTime -> repairEndTime
|
| It is deliberately NOT:
|
|     startTime -> restorationTime
|--------------------------------------------------------------------------
*/

export function evaluateMttrFailureEligibility(
    failure
) {
    const common =
        evaluateCommonEligibility(
            failure
        );


    if (
        common.eligible !==
        true
    ) {
        return {
            ...common,

            metric:
                "MTTR",
        };
    }


    if (
        failure
            ?.eligibleForMttr !==
        true
    ) {
        return {
            ...common,

            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .MTTR_NOT_ENABLED,

            metric:
                "MTTR",
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Only completed repair records enter MTTR.
    |--------------------------------------------------------------------------
    */

    if (
        failure?.status !==
            "RESTORED" &&
        failure?.status !==
            "CLOSED"
    ) {
        return {
            ...common,

            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .REPAIR_NOT_COMPLETED,

            metric:
                "MTTR",
        };
    }


    const repairStart =
        asDate(
            failure
                ?.repairStartTime
        );


    if (!repairStart) {
        return {
            ...common,

            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .INVALID_REPAIR_START,

            metric:
                "MTTR",
        };
    }


    const repairEnd =
        asDate(
            failure
                ?.repairEndTime
        );


    if (!repairEnd) {
        return {
            ...common,

            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .INVALID_REPAIR_END,

            metric:
                "MTTR",
        };
    }


    if (
        repairEnd <=
        repairStart
    ) {
        return {
            ...common,

            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .INVALID_REPAIR_INTERVAL,

            metric:
                "MTTR",
        };
    }


    if (
        repairStart <
        common.failureStart
    ) {
        return {
            ...common,

            eligible:
                false,

            reason:
                FAILURE_ELIGIBILITY_REASON
                    .REPAIR_BEFORE_FAILURE,

            metric:
                "MTTR",
        };
    }


    const repairDurationSeconds =
        (
            repairEnd.getTime() -
            repairStart.getTime()
        ) /
        1000;


    return {
        ...common,

        metric:
            "MTTR",

        eligible:
            true,

        reason:
            FAILURE_ELIGIBILITY_REASON
                .ELIGIBLE,

        repairStart,

        repairEnd,

        repairDurationSeconds,

        repairDurationHours:
            repairDurationSeconds /
            3600,

        failureType:
            failure
                ?.failureType ??
            null,

        equipmentType:
            failure
                ?.equipmentType ??
            null,

        sourceEventId:
            normalizeId(
                failure?._id
            ),
    };
}


/*
|--------------------------------------------------------------------------
| Evaluate collection
|--------------------------------------------------------------------------
*/

export function evaluateFailureEvents(
    failures = []
) {
    const mtbfEvaluations =
        failures.map(
            (
                failure
            ) =>
                evaluateMtbfFailureEligibility(
                    failure
                )
        );


    const mttrEvaluations =
        failures.map(
            (
                failure
            ) =>
                evaluateMttrFailureEligibility(
                    failure
                )
        );


    const mtbfEligible =
        mtbfEvaluations.filter(
            (
                evaluation
            ) =>
                evaluation
                    .eligible ===
                true
        );


    const mttrEligible =
        mttrEvaluations.filter(
            (
                evaluation
            ) =>
                evaluation
                    .eligible ===
                true
        );


    const mtbfRejected =
        mtbfEvaluations.filter(
            (
                evaluation
            ) =>
                evaluation
                    .eligible !==
                true
        );


    const mttrRejected =
        mttrEvaluations.filter(
            (
                evaluation
            ) =>
                evaluation
                    .eligible !==
                true
        );


    function countReasons(
        evaluations
    ) {
        return evaluations.reduce(
            (
                counts,
                evaluation
            ) => {
                const reason =
                    evaluation
                        .reason ??
                    "UNKNOWN";


                counts[
                    reason
                ] =
                    (
                        counts[
                            reason
                        ] ??
                        0
                    ) +
                    1;


                return counts;
            },
            {}
        );
    }


    return {
        totalFailureEventCount:
            failures.length,

        mtbf: {
            eligibleCount:
                mtbfEligible.length,

            rejectedCount:
                mtbfRejected.length,

            eligible:
                mtbfEligible,

            rejected:
                mtbfRejected,

            rejectionCounts:
                countReasons(
                    mtbfRejected
                ),
        },

        mttr: {
            eligibleCount:
                mttrEligible.length,

            rejectedCount:
                mttrRejected.length,

            eligible:
                mttrEligible,

            rejected:
                mttrRejected,

            rejectionCounts:
                countReasons(
                    mttrRejected
                ),
        },
    };
}