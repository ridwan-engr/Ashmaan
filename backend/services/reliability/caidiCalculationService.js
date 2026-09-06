// backend/services/reliability/caidiCalculationService.js


export const CAIDI_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


export const CAIDI_REASON = {
    CALCULATED:
        "CALCULATED",

    SAIDI_UNAVAILABLE:
        "SAIDI_UNAVAILABLE",

    SAIFI_UNAVAILABLE:
        "SAIFI_UNAVAILABLE",

    POPULATION_BASIS_MISMATCH:
        "POPULATION_BASIS_MISMATCH",

    DENOMINATOR_MISMATCH:
        "DENOMINATOR_MISMATCH",

    INVALID_SAIDI:
        "INVALID_SAIDI",

    INVALID_SAIFI:
        "INVALID_SAIFI",

    ZERO_SAIFI:
        "ZERO_SAIFI",

    INVALID_CAIDI:
        "INVALID_CAIDI",
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


/*
|--------------------------------------------------------------------------
| Unavailable result
|--------------------------------------------------------------------------
*/

function unavailable({
    reason,

    saidi = null,

    saifi = null,
} = {}) {
    return {
        status:
            CAIDI_STATUS
                .UNAVAILABLE,

        reason,

        caidiHours:
            null,

        caidiMinutes:
            null,

        populationBasis:
            saidi?.populationBasis ??
            saifi?.populationBasis ??
            null,

        denominator:
            saidi?.denominator ??
            saifi?.denominator ??
            null,

        saidiHours:
            saidi?.saidiHours ??
            null,

        saifi:
            saifi?.saifi ??
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Calculate CAIDI
|--------------------------------------------------------------------------
|
| CAIDI is calculated only from validated SAIDI and SAIFI outputs.
|
| No raw OutageEvent interpretation occurs here.
|--------------------------------------------------------------------------
*/

export function calculateCaidi({
    saidi,
    saifi,
} = {}) {
    /*
    |--------------------------------------------------------------------------
    | SAIDI must already be valid
    |--------------------------------------------------------------------------
    */

    if (
        !saidi ||
        saidi.status !==
            "CALCULATED"
    ) {
        return unavailable({
            reason:
                CAIDI_REASON
                    .SAIDI_UNAVAILABLE,

            saidi,
            saifi,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | SAIFI must already be valid
    |--------------------------------------------------------------------------
    */

    if (
        !saifi ||
        saifi.status !==
            "CALCULATED"
    ) {
        return unavailable({
            reason:
                CAIDI_REASON
                    .SAIFI_UNAVAILABLE,

            saidi,
            saifi,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Population basis must match
    |--------------------------------------------------------------------------
    |
    | Example prohibited combination:
    |
    | SAIDI  = customer based
    | SAIFI  = installation proxy
    |
    | Such values cannot form one CAIDI.
    |--------------------------------------------------------------------------
    */

    if (
        saidi.populationBasis !==
        saifi.populationBasis
    ) {
        return unavailable({
            reason:
                CAIDI_REASON
                    .POPULATION_BASIS_MISMATCH,

            saidi,
            saifi,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Denominator must also match
    |--------------------------------------------------------------------------
    */

    const saidiDenominator =
        finitePositiveNumber(
            saidi.denominator
        );


    const saifiDenominator =
        finitePositiveNumber(
            saifi.denominator
        );


    if (
        saidiDenominator ===
            null ||
        saifiDenominator ===
            null ||
        saidiDenominator !==
            saifiDenominator
    ) {
        return unavailable({
            reason:
                CAIDI_REASON
                    .DENOMINATOR_MISMATCH,

            saidi,
            saifi,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Validate SAIDI
    |--------------------------------------------------------------------------
    */

    const saidiHours =
        finiteNonNegativeNumber(
            saidi.saidiHours
        );


    if (
        saidiHours ===
        null
    ) {
        return unavailable({
            reason:
                CAIDI_REASON
                    .INVALID_SAIDI,

            saidi,
            saifi,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Validate SAIFI
    |--------------------------------------------------------------------------
    */

    const saifiValue =
        finiteNonNegativeNumber(
            saifi.saifi
        );


    if (
        saifiValue ===
        null
    ) {
        return unavailable({
            reason:
                CAIDI_REASON
                    .INVALID_SAIFI,

            saidi,
            saifi,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | CAIDI is undefined when interruption frequency is zero.
    |--------------------------------------------------------------------------
    |
    | Never return:
    |
    |     CAIDI = 0
    |
    | merely because SAIFI is zero.
    |--------------------------------------------------------------------------
    */

    if (
        saifiValue ===
        0
    ) {
        return unavailable({
            reason:
                CAIDI_REASON
                    .ZERO_SAIFI,

            saidi,
            saifi,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Core calculation
    |--------------------------------------------------------------------------
    */

    const caidiHours =
        saidiHours /
        saifiValue;


    if (
        !Number.isFinite(
            caidiHours
        ) ||
        caidiHours < 0
    ) {
        return unavailable({
            reason:
                CAIDI_REASON
                    .INVALID_CAIDI,

            saidi,
            saifi,
        });
    }


    return {
        status:
            CAIDI_STATUS
                .CALCULATED,

        reason:
            CAIDI_REASON
                .CALCULATED,

        populationBasis:
            saidi
                .populationBasis,

        populationStatus:
            saidi
                .populationStatus ??
            saifi
                .populationStatus ??
            null,

        denominator:
            saidiDenominator,

        denominatorUnit:
            saidi
                .denominatorUnit ??
            saifi
                .denominatorUnit ??
            null,

        saidiHours,

        saidiMinutes:
            saidi
                .saidiMinutes ??
            saidiHours *
                60,

        saifi:
            saifiValue,

        caidiHours,

        caidiMinutes:
            caidiHours *
            60,

        /*
        |--------------------------------------------------------------------------
        | Diagnostic cross-check terms
        |--------------------------------------------------------------------------
        |
        | These expose the numerator quantities that produced the result.
        |--------------------------------------------------------------------------
        */

        weightedInterruptionHours:
            finiteNonNegativeNumber(
                saidi
                    .weightedInterruptionHours
            ),

        weightedInterruptionStarts:
            finiteNonNegativeNumber(
                saifi
                    .weightedInterruptionStarts
            ),
    };
}