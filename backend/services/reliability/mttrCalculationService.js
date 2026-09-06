// backend/services/reliability/mttrCalculationService.js


/*
|--------------------------------------------------------------------------
| MTTR result status
|--------------------------------------------------------------------------
*/

export const MTTR_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


/*
|--------------------------------------------------------------------------
| MTTR reason codes
|--------------------------------------------------------------------------
*/

export const MTTR_REASON = {
    CALCULATED:
        "CALCULATED",

    NO_COMPLETED_REPAIRS:
        "NO_COMPLETED_REPAIRS",

    INVALID_REPAIR_DURATION:
        "INVALID_REPAIR_DURATION",

    INCOMPLETE_REPAIR_DATA:
        "INCOMPLETE_REPAIR_DATA",
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function finitePositiveNumber(
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
        numeric <= 0
    ) {
        return null;
    }

    return numeric;
}


function normalizeId(
    value
) {
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


/*
|--------------------------------------------------------------------------
| Unavailable result
|--------------------------------------------------------------------------
*/

function unavailableResult(
    reason,
    extra = {}
) {
    return {
        status:
            MTTR_STATUS
                .UNAVAILABLE,

        reason,

        mttrHours:
            null,

        mttrMinutes:
            null,

        totalRepairHours:
            null,

        totalRepairMinutes:
            null,

        completedRepairCount:
            0,

        ...extra,
    };
}


/*
|--------------------------------------------------------------------------
| Deduplicate repair episodes
|--------------------------------------------------------------------------
|
| Persistence should already ensure one document per physical failure.
|
| This additional guard prevents accidental duplicate input from counting
| the same completed repair twice.
|
| Preferred identity:
|
|     sourceEventId
|
| Fallback:
|
|     reliabilityKey + failureStart
|--------------------------------------------------------------------------
*/

function buildRepairEpisodeKey(
    evaluation,
    index
) {
    const sourceEventId =
        normalizeId(
            evaluation
                ?.sourceEventId
        );

    if (sourceEventId) {
        return `EVENT:${sourceEventId}`;
    }


    const reliabilityKey =
        evaluation
            ?.equipmentIdentity
            ?.reliabilityKey ??
        null;


    const failureStart =
        evaluation
            ?.failureStart instanceof Date &&
        !Number.isNaN(
            evaluation
                .failureStart
                .getTime()
        )
            ? evaluation
                .failureStart
                .toISOString()
            : null;


    if (
        reliabilityKey &&
        failureStart
    ) {
        return [
            "FAILURE",
            reliabilityKey,
            failureStart,
        ].join(":");
    }


    /*
     * No safe physical identity.
     *
     * Do not collapse unrelated records together.
     */
    return `UNRESOLVED:${index}`;
}


/*
|--------------------------------------------------------------------------
| MTTR calculation
|--------------------------------------------------------------------------
|
| Expected input:
|
| mttrEvaluations = output from:
|
|     evaluateMttrFailureEligibility(...)
|
| or:
|
|     evaluateFailureEvents(...).mttr.eligible
|--------------------------------------------------------------------------
*/

export function calculateMttr({
    mttrEvaluations = [],
} = {}) {
    if (
        !Array.isArray(
            mttrEvaluations
        )
    ) {
        return unavailableResult(
            MTTR_REASON
                .INCOMPLETE_REPAIR_DATA,
            {
                inputRepairCount:
                    0,

                validRepairCount:
                    0,

                rejectedRepairCount:
                    0,

                duplicateRepairCount:
                    0,
            }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Only already-qualified MTTR records may participate.
    |--------------------------------------------------------------------------
    */

    const eligible =
        mttrEvaluations.filter(
            (evaluation) =>
                evaluation
                    ?.eligible ===
                true &&
                evaluation
                    ?.metric ===
                "MTTR"
        );


    if (
        eligible.length ===
        0
    ) {
        return unavailableResult(
            MTTR_REASON
                .NO_COMPLETED_REPAIRS,
            {
                inputRepairCount:
                    mttrEvaluations.length,

                validRepairCount:
                    0,

                rejectedRepairCount:
                    mttrEvaluations.length,

                duplicateRepairCount:
                    0,
            }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Validate and deduplicate repair episodes
    |--------------------------------------------------------------------------
    */

    const seen =
        new Set();

    const validRepairs = [];

    let duplicateRepairCount =
        0;

    let invalidRepairCount =
        0;


    eligible.forEach(
        (
            evaluation,
            index
        ) => {
            const repairDurationHours =
                finitePositiveNumber(
                    evaluation
                        ?.repairDurationHours
                );


            if (
                repairDurationHours ===
                null
            ) {
                invalidRepairCount +=
                    1;

                return;
            }


            const key =
                buildRepairEpisodeKey(
                    evaluation,
                    index
                );


            if (
                seen.has(
                    key
                )
            ) {
                duplicateRepairCount +=
                    1;

                return;
            }


            seen.add(
                key
            );


            validRepairs.push({
                key,

                repairDurationHours,

                repairDurationMinutes:
                    repairDurationHours *
                    60,

                sourceEventId:
                    normalizeId(
                        evaluation
                            ?.sourceEventId
                    ),

                installationId:
                    normalizeId(
                        evaluation
                            ?.installationId
                    ),

                reliabilityKey:
                    evaluation
                        ?.equipmentIdentity
                        ?.reliabilityKey ??
                    null,

                equipmentType:
                    evaluation
                        ?.equipmentType ??
                    null,

                failureType:
                    evaluation
                        ?.failureType ??
                    null,

                failureStart:
                    evaluation
                        ?.failureStart ??
                    null,

                repairStart:
                    evaluation
                        ?.repairStart ??
                    null,

                repairEnd:
                    evaluation
                        ?.repairEnd ??
                    null,
            });
        }
    );


    /*
    |--------------------------------------------------------------------------
    | If qualified repairs were supplied but none has defensible duration,
    | MTTR is unavailable, not zero.
    |--------------------------------------------------------------------------
    */

    if (
        validRepairs.length ===
        0
    ) {
        return unavailableResult(
            MTTR_REASON
                .INVALID_REPAIR_DURATION,
            {
                inputRepairCount:
                    mttrEvaluations.length,

                eligibleRepairCount:
                    eligible.length,

                validRepairCount:
                    0,

                rejectedRepairCount:
                    mttrEvaluations.length -
                    eligible.length,

                invalidRepairCount,

                duplicateRepairCount,
            }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Conservative completeness guard
    |--------------------------------------------------------------------------
    |
    | An MTTR-qualified input with invalid repair duration means the input
    | set is internally inconsistent.
    |
    | Do not silently discard it and produce a potentially biased MTTR.
    |--------------------------------------------------------------------------
    */

    if (
        invalidRepairCount >
        0
    ) {
        return unavailableResult(
            MTTR_REASON
                .INCOMPLETE_REPAIR_DATA,
            {
                inputRepairCount:
                    mttrEvaluations.length,

                eligibleRepairCount:
                    eligible.length,

                validRepairCount:
                    validRepairs.length,

                rejectedRepairCount:
                    mttrEvaluations.length -
                    eligible.length,

                invalidRepairCount,

                duplicateRepairCount,
            }
        );
    }


    const totalRepairHours =
        validRepairs.reduce(
            (
                total,
                repair
            ) =>
                total +
                repair
                    .repairDurationHours,
            0
        );


    const completedRepairCount =
        validRepairs.length;


    const mttrHours =
        totalRepairHours /
        completedRepairCount;


    if (
        !Number.isFinite(
            mttrHours
        ) ||
        mttrHours <=
            0
    ) {
        return unavailableResult(
            MTTR_REASON
                .INVALID_REPAIR_DURATION,
            {
                inputRepairCount:
                    mttrEvaluations.length,

                eligibleRepairCount:
                    eligible.length,

                validRepairCount:
                    validRepairs.length,

                invalidRepairCount,

                duplicateRepairCount,
            }
        );
    }


    return {
        status:
            MTTR_STATUS
                .CALCULATED,

        reason:
            MTTR_REASON
                .CALCULATED,

        mttrHours,

        mttrMinutes:
            mttrHours *
            60,

        totalRepairHours,

        totalRepairMinutes:
            totalRepairHours *
            60,

        completedRepairCount,

        inputRepairCount:
            mttrEvaluations.length,

        eligibleRepairCount:
            eligible.length,

        validRepairCount:
            validRepairs.length,

        rejectedRepairCount:
            mttrEvaluations.length -
            eligible.length,

        invalidRepairCount,

        duplicateRepairCount,

        repairEpisodes:
            validRepairs,
    };
}