// backend/services/reliability/adequacyStateService.js


/*
|--------------------------------------------------------------------------
| Adequacy-state status
|--------------------------------------------------------------------------
*/

export const ADEQUACY_STATE_STATUS = {
    VALID:
        "VALID",

    INVALID:
        "INVALID",

    UNOBSERVABLE:
        "UNOBSERVABLE",
};


/*
|--------------------------------------------------------------------------
| Adequacy-state reasons
|--------------------------------------------------------------------------
*/

export const ADEQUACY_STATE_REASON = {
    VALID:
        "VALID",

    STATE_UNAVAILABLE:
        "STATE_UNAVAILABLE",

    INVALID_INTERVAL_START:
        "INVALID_INTERVAL_START",

    INVALID_INTERVAL_END:
        "INVALID_INTERVAL_END",

    INVALID_INTERVAL:
        "INVALID_INTERVAL",

    LOAD_NOT_OBSERVED:
        "LOAD_NOT_OBSERVED",

    SUPPLY_NOT_OBSERVED:
        "SUPPLY_NOT_OBSERVED",

    INVALID_LOAD:
        "INVALID_LOAD",

    INVALID_AVAILABLE_SUPPLY:
        "INVALID_AVAILABLE_SUPPLY",

    INVALID_PROBABILITY:
        "INVALID_PROBABILITY",

    EQUIPMENT_SCOPE_UNAVAILABLE:
        "EQUIPMENT_SCOPE_UNAVAILABLE",
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function toDate(
    value
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }


    const date =
        new Date(
            value
        );


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function finiteNonNegative(
    value
) {
    const number =
        Number(
            value
        );


    if (
        !Number.isFinite(
            number
        ) ||
        number < 0
    ) {
        return null;
    }


    return number;
}


function validProbability(
    value
) {
    /*
    |--------------------------------------------------------------------------
    | Probability is optional.
    |
    | Deterministic states may omit it.
    |
    | Probabilistic scenario states must provide p in [0, 1].
    |--------------------------------------------------------------------------
    */

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }


    const probability =
        Number(
            value
        );


    if (
        !Number.isFinite(
            probability
        ) ||
        probability < 0 ||
        probability > 1
    ) {
        return false;
    }


    return probability;
}


/*
|--------------------------------------------------------------------------
| Evaluate one adequacy state
|--------------------------------------------------------------------------
|
| Canonical state:
|
| {
|     installationId,
|     reliabilityKey,
|
|     intervalStart,
|     intervalEnd,
|
|     loadKw,
|     availableSupplyKw,
|
|     loadObserved,
|     supplyObserved,
|
|     probability,
|
|     source,
|     metadata
| }
|
|--------------------------------------------------------------------------
*/

export function evaluateAdequacyState(
    state
) {
    if (
        !state ||
        typeof state !==
            "object"
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_STATE_STATUS
                    .INVALID,

            reason:
                ADEQUACY_STATE_REASON
                    .STATE_UNAVAILABLE,
        };
    }


    const intervalStart =
        toDate(
            state
                .intervalStart
        );


    const intervalEnd =
        toDate(
            state
                .intervalEnd
        );


    if (!intervalStart) {
        return {
            valid:
                false,

            status:
                ADEQUACY_STATE_STATUS
                    .INVALID,

            reason:
                ADEQUACY_STATE_REASON
                    .INVALID_INTERVAL_START,
        };
    }


    if (!intervalEnd) {
        return {
            valid:
                false,

            status:
                ADEQUACY_STATE_STATUS
                    .INVALID,

            reason:
                ADEQUACY_STATE_REASON
                    .INVALID_INTERVAL_END,
        };
    }


    if (
        intervalEnd <=
        intervalStart
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_STATE_STATUS
                    .INVALID,

            reason:
                ADEQUACY_STATE_REASON
                    .INVALID_INTERVAL,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Observability comes before numerical interpretation.
    |--------------------------------------------------------------------------
    */

    if (
        state
            .loadObserved !==
        true
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_STATE_STATUS
                    .UNOBSERVABLE,

            reason:
                ADEQUACY_STATE_REASON
                    .LOAD_NOT_OBSERVED,
        };
    }


    if (
        state
            .supplyObserved !==
        true
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_STATE_STATUS
                    .UNOBSERVABLE,

            reason:
                ADEQUACY_STATE_REASON
                    .SUPPLY_NOT_OBSERVED,
        };
    }


    const loadKw =
        finiteNonNegative(
            state
                .loadKw
        );


    if (
        loadKw ===
        null
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_STATE_STATUS
                    .INVALID,

            reason:
                ADEQUACY_STATE_REASON
                    .INVALID_LOAD,
        };
    }


    const availableSupplyKw =
        finiteNonNegative(
            state
                .availableSupplyKw
        );


    if (
        availableSupplyKw ===
        null
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_STATE_STATUS
                    .INVALID,

            reason:
                ADEQUACY_STATE_REASON
                    .INVALID_AVAILABLE_SUPPLY,
        };
    }


    const probability =
        validProbability(
            state
                .probability
        );


    if (
        probability ===
        false
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_STATE_STATUS
                    .INVALID,

            reason:
                ADEQUACY_STATE_REASON
                    .INVALID_PROBABILITY,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Duration
    |--------------------------------------------------------------------------
    */

    const durationSeconds =
        (
            intervalEnd -
            intervalStart
        ) /
        1000;


    const durationHours =
        durationSeconds /
        3600;


    /*
    |--------------------------------------------------------------------------
    | Adequacy relationship
    |--------------------------------------------------------------------------
    |
    | This is state characterization only.
    |
    | LOLP / LOLE / EENS are NOT calculated here.
    |--------------------------------------------------------------------------
    */

    const deficitKw =
        Math.max(
            loadKw -
            availableSupplyKw,
            0
        );


    const adequate =
        availableSupplyKw >=
        loadKw;


    return {
        valid:
            true,

        status:
            ADEQUACY_STATE_STATUS
                .VALID,

        reason:
            ADEQUACY_STATE_REASON
                .VALID,


        installationId:
            state
                .installationId ??
            null,

        reliabilityKey:
            state
                .reliabilityKey ??
            null,


        intervalStart,

        intervalEnd,

        durationSeconds,

        durationHours,


        loadKw,

        availableSupplyKw,

        deficitKw,

        adequate,

        lossOfLoad:
            !adequate,


        probability:
            probability ===
            null
                ? null
                : probability,

        probabilistic:
            probability !==
            null,


        source:
            state
                .source ??
            "UNKNOWN",

        metadata:
            state
                .metadata ??
            {},
    };
}


/*
|--------------------------------------------------------------------------
| Evaluate collection
|--------------------------------------------------------------------------
*/

export function evaluateAdequacyStates(
    states = []
) {
    const input =
        Array.isArray(
            states
        )
            ? states
            : [];


    const evaluated =
        input.map(
            (state) =>
                evaluateAdequacyState(
                    state
                )
        );


    const valid =
        evaluated.filter(
            (state) =>
                state.valid ===
                true
        );


    const invalid =
        evaluated.filter(
            (state) =>
                state.valid !==
                true
        );


    const observable =
        valid;


    const adequate =
        valid.filter(
            (state) =>
                state.adequate ===
                true
        );


    const inadequate =
        valid.filter(
            (state) =>
                state.lossOfLoad ===
                true
        );


    const deterministic =
        valid.filter(
            (state) =>
                state.probabilistic ===
                false
        );


    const probabilistic =
        valid.filter(
            (state) =>
                state.probabilistic ===
                true
        );


    const rejectionCounts =
        invalid.reduce(
            (
                counts,
                state
            ) => {
                const reason =
                    state.reason ??
                    "UNKNOWN";

                counts[reason] =
                    (
                        counts[reason] ??
                        0
                    ) +
                    1;

                return counts;
            },
            {}
        );


    return {
        totalStateCount:
            input.length,

        validStateCount:
            valid.length,

        invalidStateCount:
            invalid.length,

        observableStateCount:
            observable.length,

        adequateStateCount:
            adequate.length,

        inadequateStateCount:
            inadequate.length,

        deterministicStateCount:
            deterministic.length,

        probabilisticStateCount:
            probabilistic.length,

        valid,

        invalid,

        adequate,

        inadequate,

        deterministic,

        probabilistic,

        rejectionCounts,
    };
}