// backend/services/reliability/reliabilityFunctionCalculationService.js


export const RELIABILITY_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


export const RELIABILITY_REASON = {
    CALCULATED:
        "CALCULATED",

    FAILURE_RATE_UNAVAILABLE:
        "FAILURE_RATE_UNAVAILABLE",

    INVALID_FAILURE_RATE:
        "INVALID_FAILURE_RATE",

    INVALID_TIME_HORIZON:
        "INVALID_TIME_HORIZON",

    INVALID_RESULT:
        "INVALID_RESULT",
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


function unavailableResult(
    reason,
    extra = {}
) {
    return {
        status:
            RELIABILITY_STATUS
                .UNAVAILABLE,

        reason,

        label:
            "Exponential Reliability",

        reliability:
            null,

        reliabilityPercent:
            null,

        failureProbability:
            null,

        failureProbabilityPercent:
            null,

        horizonHours:
            null,

        lambdaPerHour:
            null,

        ...extra,
    };
}


/*
|--------------------------------------------------------------------------
| Reliability function
|--------------------------------------------------------------------------
|
| R(t) = exp(-λt)
|
| This calculation is valid only under the explicitly stated assumption:
|
|     constant failure rate λ
|     exponential lifetime distribution
|--------------------------------------------------------------------------
*/

export function calculateReliabilityFunction({
    failureRate = null,
    horizonHours = null,
} = {}) {
    /*
    |--------------------------------------------------------------------------
    | Require validated failure rate
    |--------------------------------------------------------------------------
    */

    if (
        failureRate
            ?.status !==
        "CALCULATED"
    ) {
        return unavailableResult(
            RELIABILITY_REASON
                .FAILURE_RATE_UNAVAILABLE,
            {
                failureRateStatus:
                    failureRate
                        ?.status ??
                    null,

                failureRateReason:
                    failureRate
                        ?.reason ??
                    null,
            }
        );
    }


    const lambdaPerHour =
        finitePositiveNumber(
            failureRate
                ?.lambdaPerHour
        );


    if (
        lambdaPerHour ===
        null
    ) {
        return unavailableResult(
            RELIABILITY_REASON
                .INVALID_FAILURE_RATE
        );
    }


    const t =
        finitePositiveNumber(
            horizonHours
        );


    if (
        t ===
        null
    ) {
        return unavailableResult(
            RELIABILITY_REASON
                .INVALID_TIME_HORIZON,
            {
                lambdaPerHour,
            }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Exponential reliability
    |--------------------------------------------------------------------------
    */

    const exponent =
        -lambdaPerHour *
        t;


    const reliability =
        Math.exp(
            exponent
        );


    const failureProbability =
        1 -
        reliability;


    if (
        !Number.isFinite(
            reliability
        ) ||
        reliability <= 0 ||
        reliability > 1 ||
        !Number.isFinite(
            failureProbability
        ) ||
        failureProbability < 0 ||
        failureProbability >= 1
    ) {
        return unavailableResult(
            RELIABILITY_REASON
                .INVALID_RESULT,
            {
                lambdaPerHour,
                horizonHours:
                    t,
            }
        );
    }


    return {
        status:
            RELIABILITY_STATUS
                .CALCULATED,

        reason:
            RELIABILITY_REASON
                .CALCULATED,

        label:
            "Exponential Reliability",

        symbol:
            "R(t)",

        reliability,

        reliabilityPercent:
            reliability *
            100,

        failureProbability,

        failureProbabilityPercent:
            failureProbability *
            100,

        lambdaPerHour,

        horizonHours:
            t,

        exponent,

        calculation: {
            formula:
                "R(t) = exp(-λt)",

            lambdaPerHour,

            horizonHours:
                t,

            exponent,
        },

        assumptions: {
            model:
                "EXPONENTIAL_LIFETIME",

            constantFailureRate:
                true,

            memorylessLifetime:
                true,

            interpretation:
                "Reliability is the probability of surviving the specified operating horizon without failure under a constant hazard rate.",
        },

        semanticGuards: {
            reliabilityIsNotAvailability:
                true,

            reliabilityIsNotAsai:
                true,

            reliabilityIsNotMonitoringOnlineStatus:
                true,

            reliabilityRequiresExplicitTimeHorizon:
                true,

            exponentialModelRequiresConstantFailureRate:
                true,
        },
    };
}