// backend/services/reliability/failureRepairRateCalculationService.js


export const RATE_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


export const RATE_REASON = {
    CALCULATED:
        "CALCULATED",

    MTBF_UNAVAILABLE:
        "MTBF_UNAVAILABLE",

    MTTR_UNAVAILABLE:
        "MTTR_UNAVAILABLE",

    INVALID_MTBF:
        "INVALID_MTBF",

    INVALID_MTTR:
        "INVALID_MTTR",

    INVALID_FAILURE_RATE:
        "INVALID_FAILURE_RATE",

    INVALID_REPAIR_RATE:
        "INVALID_REPAIR_RATE",
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


/*
|--------------------------------------------------------------------------
| Failure rate λ
|--------------------------------------------------------------------------
|
| λ = 1 / MTBF
|
| Unit:
|     failures per operating hour
|--------------------------------------------------------------------------
*/

export function calculateFailureRate({
    mtbf = null,
} = {}) {
    if (
        mtbf?.status !==
        "CALCULATED"
    ) {
        return {
            status:
                RATE_STATUS.UNAVAILABLE,

            reason:
                RATE_REASON.MTBF_UNAVAILABLE,

            lambdaPerHour:
                null,

            mtbfHours:
                null,

            mtbfStatus:
                mtbf?.status ?? null,

            mtbfReason:
                mtbf?.reason ?? null,
        };
    }


    const mtbfHours =
        finitePositiveNumber(
            mtbf?.mtbfHours
        );


    if (
        mtbfHours ===
        null
    ) {
        return {
            status:
                RATE_STATUS.UNAVAILABLE,

            reason:
                RATE_REASON.INVALID_MTBF,

            lambdaPerHour:
                null,

            mtbfHours:
                null,
        };
    }


    const lambdaPerHour =
        1 /
        mtbfHours;


    if (
        !Number.isFinite(
            lambdaPerHour
        ) ||
        lambdaPerHour <= 0
    ) {
        return {
            status:
                RATE_STATUS.UNAVAILABLE,

            reason:
                RATE_REASON.INVALID_FAILURE_RATE,

            lambdaPerHour:
                null,

            mtbfHours,
        };
    }


    return {
        status:
            RATE_STATUS.CALCULATED,

        reason:
            RATE_REASON.CALCULATED,

        label:
            "Failure Rate",

        symbol:
            "λ",

        lambdaPerHour,

        mtbfHours,

        unit:
            "failures/hour",

        calculation: {
            formula:
                "λ = 1 / MTBF",

            numerator:
                1,

            denominator:
                mtbfHours,
        },

        probabilisticInterpretation: {
            model:
                "EXPONENTIAL_LIFETIME",

            constantFailureRateAssumption:
                true,

            note:
                "Probabilistic use of λ assumes a constant failure rate and exponentially distributed lifetime.",
        },
    };
}


/*
|--------------------------------------------------------------------------
| Repair rate μ
|--------------------------------------------------------------------------
|
| μ = 1 / MTTR
|
| Unit:
|     repairs per repair hour
|--------------------------------------------------------------------------
*/

export function calculateRepairRate({
    mttr = null,
} = {}) {
    if (
        mttr?.status !==
        "CALCULATED"
    ) {
        return {
            status:
                RATE_STATUS.UNAVAILABLE,

            reason:
                RATE_REASON.MTTR_UNAVAILABLE,

            muPerHour:
                null,

            mttrHours:
                null,

            mttrStatus:
                mttr?.status ?? null,

            mttrReason:
                mttr?.reason ?? null,
        };
    }


    const mttrHours =
        finitePositiveNumber(
            mttr?.mttrHours
        );


    if (
        mttrHours ===
        null
    ) {
        return {
            status:
                RATE_STATUS.UNAVAILABLE,

            reason:
                RATE_REASON.INVALID_MTTR,

            muPerHour:
                null,

            mttrHours:
                null,
        };
    }


    const muPerHour =
        1 /
        mttrHours;


    if (
        !Number.isFinite(
            muPerHour
        ) ||
        muPerHour <= 0
    ) {
        return {
            status:
                RATE_STATUS.UNAVAILABLE,

            reason:
                RATE_REASON.INVALID_REPAIR_RATE,

            muPerHour:
                null,

            mttrHours,
        };
    }


    return {
        status:
            RATE_STATUS.CALCULATED,

        reason:
            RATE_REASON.CALCULATED,

        label:
            "Repair Rate",

        symbol:
            "μ",

        muPerHour,

        mttrHours,

        unit:
            "repairs/hour",

        calculation: {
            formula:
                "μ = 1 / MTTR",

            numerator:
                1,

            denominator:
                mttrHours,
        },

        probabilisticInterpretation: {
            model:
                "EXPONENTIAL_REPAIR_TIME",

            exponentialRepairTimeAssumption:
                true,

            note:
                "Probabilistic use of μ assumes exponentially distributed repair time.",
        },
    };
}


/*
|--------------------------------------------------------------------------
| Combined λ / μ calculation
|--------------------------------------------------------------------------
*/

export function calculateFailureRepairRates({
    mtbf = null,
    mttr = null,
} = {}) {
    const failureRate =
        calculateFailureRate({
            mtbf,
        });


    const repairRate =
        calculateRepairRate({
            mttr,
        });


    const bothCalculated =
        failureRate.status ===
            RATE_STATUS.CALCULATED &&
        repairRate.status ===
            RATE_STATUS.CALCULATED;


    return {
        status:
            bothCalculated
                ? RATE_STATUS.CALCULATED
                : RATE_STATUS.UNAVAILABLE,

        reason:
            bothCalculated
                ? RATE_REASON.CALCULATED
                : "ONE_OR_MORE_RATES_UNAVAILABLE",

        failureRate,

        repairRate,

        assumptions: {
            ratesAreReciprocalMeanMetrics:
                true,

            constantFailureRateRequiredForExponentialReliabilityModel:
                true,

            exponentialRepairDistributionRequiredForMarkovRepairModel:
                true,
        },
    };
}