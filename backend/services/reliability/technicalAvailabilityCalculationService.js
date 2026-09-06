// backend/services/reliability/technicalAvailabilityCalculationService.js


export const TECHNICAL_AVAILABILITY_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


export const TECHNICAL_AVAILABILITY_REASON = {
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

    RELIABILITY_SCOPE_UNAVAILABLE:
        "RELIABILITY_SCOPE_UNAVAILABLE",

    RELIABILITY_SCOPE_MISMATCH:
        "RELIABILITY_SCOPE_MISMATCH",

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


function normalizeText(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const text =
        String(value).trim();

    return text.length > 0
        ? text
        : null;
}


/*
|--------------------------------------------------------------------------
| Normalize reliability-key collection
|--------------------------------------------------------------------------
*/

function normalizeReliabilityKeys(
    values = []
) {
    if (
        !Array.isArray(
            values
        )
    ) {
        return [];
    }

    return [
        ...new Set(
            values
                .map(
                    normalizeText
                )
                .filter(
                    Boolean
                )
        ),
    ].sort();
}


/*
|--------------------------------------------------------------------------
| Extract MTBF equipment scope
|--------------------------------------------------------------------------
*/

function extractMtbfScope(
    mtbf
) {
    return normalizeReliabilityKeys(
        mtbf
            ?.reliabilityKeys ??
        []
    );
}


/*
|--------------------------------------------------------------------------
| Extract MTTR equipment scope
|--------------------------------------------------------------------------
|
| mttrCalculationService returns repairEpisodes, with each episode carrying
| the reliabilityKey inherited from the validated FailureEvent eligibility
| result.
|--------------------------------------------------------------------------
*/

function extractMttrScope(
    mttr
) {
    const episodes =
        Array.isArray(
            mttr
                ?.repairEpisodes
        )
            ? mttr
                .repairEpisodes
            : [];


    return normalizeReliabilityKeys(
        episodes.map(
            (episode) =>
                episode
                    ?.reliabilityKey
        )
    );
}


/*
|--------------------------------------------------------------------------
| Compare equipment scopes
|--------------------------------------------------------------------------
*/

function sameScope(
    left,
    right
) {
    if (
        left.length !==
        right.length
    ) {
        return false;
    }

    return left.every(
        (
            value,
            index
        ) =>
            value ===
            right[index]
    );
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
            TECHNICAL_AVAILABILITY_STATUS
                .UNAVAILABLE,

        reason,

        label:
            "Steady-State Technical Availability",

        availability:
            null,

        availabilityPercent:
            null,

        unavailability:
            null,

        unavailabilityPercent:
            null,

        mtbfHours:
            null,

        mttrHours:
            null,

        ...extra,
    };
}


/*
|--------------------------------------------------------------------------
| Technical availability
|--------------------------------------------------------------------------
|
| Formula:
|
|     A = MTBF / (MTBF + MTTR)
|
| This is an equipment reliability/maintainability KPI.
|
| It is NOT:
|
| - ASAI
| - customer service availability
| - grid-source availability
| - monitoring ONLINE percentage
|--------------------------------------------------------------------------
*/

export function calculateTechnicalAvailability({
    mtbf = null,
    mttr = null,
} = {}) {
    /*
    |--------------------------------------------------------------------------
    | Require validated MTBF
    |--------------------------------------------------------------------------
    */

    if (
        mtbf
            ?.status !==
        "CALCULATED"
    ) {
        return unavailableResult(
            TECHNICAL_AVAILABILITY_REASON
                .MTBF_UNAVAILABLE,
            {
                mtbfStatus:
                    mtbf
                        ?.status ??
                    null,

                mtbfReason:
                    mtbf
                        ?.reason ??
                    null,
            }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Require validated MTTR
    |--------------------------------------------------------------------------
    */

    if (
        mttr
            ?.status !==
        "CALCULATED"
    ) {
        return unavailableResult(
            TECHNICAL_AVAILABILITY_REASON
                .MTTR_UNAVAILABLE,
            {
                mttrStatus:
                    mttr
                        ?.status ??
                    null,

                mttrReason:
                    mttr
                        ?.reason ??
                    null,
            }
        );
    }


    const mtbfHours =
        finitePositiveNumber(
            mtbf
                ?.mtbfHours
        );


    if (
        mtbfHours ===
        null
    ) {
        return unavailableResult(
            TECHNICAL_AVAILABILITY_REASON
                .INVALID_MTBF
        );
    }


    const mttrHours =
        finitePositiveNumber(
            mttr
                ?.mttrHours
        );


    if (
        mttrHours ===
        null
    ) {
        return unavailableResult(
            TECHNICAL_AVAILABILITY_REASON
                .INVALID_MTTR
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Scope validation
    |--------------------------------------------------------------------------
    |
    | A fleet MTBF must not be combined with MTTR from only one unrelated
    | asset. Both metrics must refer to the same repairable-item population.
    |--------------------------------------------------------------------------
    */

    const mtbfScope =
        extractMtbfScope(
            mtbf
        );

    const mttrScope =
        extractMttrScope(
            mttr
        );


    if (
        mtbfScope.length ===
            0 ||
        mttrScope.length ===
            0
    ) {
        return unavailableResult(
            TECHNICAL_AVAILABILITY_REASON
                .RELIABILITY_SCOPE_UNAVAILABLE,
            {
                mtbfReliabilityKeys:
                    mtbfScope,

                mttrReliabilityKeys:
                    mttrScope,
            }
        );
    }


    if (
        !sameScope(
            mtbfScope,
            mttrScope
        )
    ) {
        return unavailableResult(
            TECHNICAL_AVAILABILITY_REASON
                .RELIABILITY_SCOPE_MISMATCH,
            {
                mtbfReliabilityKeys:
                    mtbfScope,

                mttrReliabilityKeys:
                    mttrScope,
            }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Calculation
    |--------------------------------------------------------------------------
    */

    const denominator =
        mtbfHours +
        mttrHours;


    if (
        !Number.isFinite(
            denominator
        ) ||
        denominator <=
            0
    ) {
        return unavailableResult(
            TECHNICAL_AVAILABILITY_REASON
                .INVALID_RESULT
        );
    }


    const availability =
        mtbfHours /
        denominator;


    const unavailability =
        1 -
        availability;


    if (
        !Number.isFinite(
            availability
        ) ||
        availability < 0 ||
        availability > 1 ||
        !Number.isFinite(
            unavailability
        ) ||
        unavailability < 0 ||
        unavailability > 1
    ) {
        return unavailableResult(
            TECHNICAL_AVAILABILITY_REASON
                .INVALID_RESULT
        );
    }


    return {
        status:
            TECHNICAL_AVAILABILITY_STATUS
                .CALCULATED,

        reason:
            TECHNICAL_AVAILABILITY_REASON
                .CALCULATED,

        label:
            "Steady-State Technical Availability",

        availability,

        availabilityPercent:
            availability *
            100,

        unavailability,

        unavailabilityPercent:
            unavailability *
            100,

        mtbfHours,

        mttrHours,

        reliabilityKeys:
            mtbfScope,

        equipmentCount:
            mtbfScope.length,

        calculation: {
            numerator:
                mtbfHours,

            denominator,

            formula:
                "A = MTBF / (MTBF + MTTR)",
        },

        semanticGuards: {
            technicalAvailabilityIsNotAsai:
                true,

            technicalAvailabilityIsNotGridSourceAvailability:
                true,

            monitoringOnlineStatusIsNotTechnicalAvailability:
                true,

            mtbfAndMttrScopesMustMatch:
                true,
        },
    };
}