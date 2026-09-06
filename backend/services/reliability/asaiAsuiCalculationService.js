// backend/services/reliability/asaiAsuiCalculationService.js

export const ASAI_ASUI_STATUS = {
    CALCULATED: "CALCULATED",
    UNAVAILABLE: "UNAVAILABLE",
};


export const ASAI_ASUI_REASON = {
    CALCULATED: "CALCULATED",

    POPULATION_UNAVAILABLE:
        "POPULATION_UNAVAILABLE",

    INVALID_REPORTING_WINDOW:
        "INVALID_REPORTING_WINDOW",

    SERVICE_OBSERVABILITY_NOT_ESTABLISHED:
        "SERVICE_OBSERVABILITY_NOT_ESTABLISHED",

    INTERRUPTION_DURATION_UNAVAILABLE:
        "INTERRUPTION_DURATION_UNAVAILABLE",

    INVALID_INTERRUPTION_DURATION:
        "INVALID_INTERRUPTION_DURATION",

    INVALID_RESULT:
        "INVALID_RESULT",
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

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


function finitePositiveNumber(
    value
) {
    const numeric =
        finiteNonNegativeNumber(
            value
        );


    if (
        numeric === null ||
        numeric <= 0
    ) {
        return null;
    }


    return numeric;
}


function asDate(
    value
) {
    if (!value) {
        return null;
    }


    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function unavailable({
    reason,

    population =
        null,

    reportingHours =
        null,

    weightedInterruptionHours =
        null,
} = {}) {
    return {
        status:
            ASAI_ASUI_STATUS
                .UNAVAILABLE,

        reason,

        asai:
            null,

        asaiPercent:
            null,

        asui:
            null,

        asuiPercent:
            null,

        populationBasis:
            population
                ?.basis ??
            null,

        denominator:
            population
                ?.denominator ??
            null,

        reportingHours,

        weightedInterruptionHours,

        totalPopulationHours:
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Calculate ASAI / ASUI
|--------------------------------------------------------------------------
|
| weightedInterruptionHours must already represent:
|
|     Σ (interruption duration × affected population)
|
| using the same validated population basis as the denominator.
|--------------------------------------------------------------------------
*/

export function calculateAsaiAsui({
    population,

    periodStart,

    periodEnd,

    weightedInterruptionHours,

    serviceInterruptionObservable =
        false,
} = {}) {
    /*
    |--------------------------------------------------------------------------
    | Population
    |--------------------------------------------------------------------------
    */

    if (
        !population ||
        population
            .denominatorAvailable !==
            true
    ) {
        return unavailable({
            reason:
                ASAI_ASUI_REASON
                    .POPULATION_UNAVAILABLE,

            population,
        });
    }


    const denominator =
        finitePositiveNumber(
            population
                .denominator
        );


    if (
        denominator ===
        null
    ) {
        return unavailable({
            reason:
                ASAI_ASUI_REASON
                    .POPULATION_UNAVAILABLE,

            population,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Reporting interval
    |--------------------------------------------------------------------------
    */

    const start =
        asDate(
            periodStart
        );

    const end =
        asDate(
            periodEnd
        );


    if (
        !start ||
        !end ||
        start.getTime() >=
            end.getTime()
    ) {
        return unavailable({
            reason:
                ASAI_ASUI_REASON
                    .INVALID_REPORTING_WINDOW,

            population,
        });
    }


    const reportingHours =
        (
            end.getTime() -
            start.getTime()
        ) /
        3600000;


    /*
    |--------------------------------------------------------------------------
    | Observability
    |--------------------------------------------------------------------------
    |
    | A valid denominator is not enough.
    |
    | ASAI/ASUI require sufficiently complete service-interruption
    | observability over the reporting interval.
    |--------------------------------------------------------------------------
    */

    if (
        serviceInterruptionObservable !==
        true
    ) {
        return unavailable({
            reason:
                ASAI_ASUI_REASON
                    .SERVICE_OBSERVABILITY_NOT_ESTABLISHED,

            population,

            reportingHours,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Interruption duration
    |--------------------------------------------------------------------------
    */

    const interruptionHours =
        finiteNonNegativeNumber(
            weightedInterruptionHours
        );


    if (
        interruptionHours ===
        null
    ) {
        return unavailable({
            reason:
                ASAI_ASUI_REASON
                    .INTERRUPTION_DURATION_UNAVAILABLE,

            population,

            reportingHours,
        });
    }


    const totalPopulationHours =
        denominator *
        reportingHours;


    if (
        !Number.isFinite(
            totalPopulationHours
        ) ||
        totalPopulationHours <=
            0
    ) {
        return unavailable({
            reason:
                ASAI_ASUI_REASON
                    .INVALID_REPORTING_WINDOW,

            population,

            reportingHours,

            weightedInterruptionHours:
                interruptionHours,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Safety
    |--------------------------------------------------------------------------
    */

    if (
        interruptionHours >
        totalPopulationHours
    ) {
        return unavailable({
            reason:
                ASAI_ASUI_REASON
                    .INVALID_INTERRUPTION_DURATION,

            population,

            reportingHours,

            weightedInterruptionHours:
                interruptionHours,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Core calculation
    |--------------------------------------------------------------------------
    */

    const asui =
        interruptionHours /
        totalPopulationHours;


    const asai =
        1 -
        asui;


    if (
        !Number.isFinite(
            asai
        ) ||
        !Number.isFinite(
            asui
        ) ||
        asai < 0 ||
        asai > 1 ||
        asui < 0 ||
        asui > 1
    ) {
        return unavailable({
            reason:
                ASAI_ASUI_REASON
                    .INVALID_RESULT,

            population,

            reportingHours,

            weightedInterruptionHours:
                interruptionHours,
        });
    }


    return {
        status:
            ASAI_ASUI_STATUS
                .CALCULATED,

        reason:
            ASAI_ASUI_REASON
                .CALCULATED,

        populationBasis:
            population
                .basis,

        populationStatus:
            population
                .status,

        denominator,

        reportingHours,

        weightedInterruptionHours:
            interruptionHours,

        totalPopulationHours,

        asai,

        asaiPercent:
            asai *
            100,

        asui,

        asuiPercent:
            asui *
            100,
    };
}