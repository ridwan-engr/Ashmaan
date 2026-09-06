// backend/services/reliability/adequacyScenarioSetService.js

import {
    evaluateAdequacyStates,
} from "./adequacyStateService.js";


/*
|--------------------------------------------------------------------------
| Scenario-set status
|--------------------------------------------------------------------------
*/

export const ADEQUACY_SCENARIO_STATUS = {
    VALID:
        "VALID",

    INVALID:
        "INVALID",

    UNAVAILABLE:
        "UNAVAILABLE",
};


/*
|--------------------------------------------------------------------------
| Scenario-set reasons
|--------------------------------------------------------------------------
*/

export const ADEQUACY_SCENARIO_REASON = {
    VALID:
        "VALID",

    NO_STATES:
        "NO_STATES",

    INVALID_ADEQUACY_STATES:
        "INVALID_ADEQUACY_STATES",

    MIXED_DETERMINISTIC_AND_PROBABILISTIC:
        "MIXED_DETERMINISTIC_AND_PROBABILISTIC",

    INCONSISTENT_INTERVALS:
        "INCONSISTENT_INTERVALS",

    PROBABILITY_SUM_INVALID:
        "PROBABILITY_SUM_INVALID",

    DUPLICATE_SCENARIO_ID:
        "DUPLICATE_SCENARIO_ID",

    INVALID_SCENARIO_ID:
        "INVALID_SCENARIO_ID",
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function timestampKey(
    value
) {
    if (
        !(value instanceof Date)
    ) {
        return null;
    }

    return value
        .toISOString();
}


function intervalKey(
    state
) {
    const start =
        timestampKey(
            state
                ?.intervalStart
        );

    const end =
        timestampKey(
            state
                ?.intervalEnd
        );

    if (
        !start ||
        !end
    ) {
        return null;
    }

    return `${start}|${end}`;
}


function scenarioId(
    state,
    index
) {
    const value =
        state
            ?.metadata
            ?.scenarioId ??
        state
            ?.scenarioId ??
        null;

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return `SCENARIO_${index + 1}`;
    }

    return String(
        value
    );
}


function sum(
    values
) {
    return values.reduce(
        (
            total,
            value
        ) =>
            total +
            Number(value),
        0
    );
}


/*
|--------------------------------------------------------------------------
| Evaluate one interval scenario set
|--------------------------------------------------------------------------
|
| Input:
|
| {
|     states: [...]
|     probabilityTolerance: 1e-9
| }
|
|--------------------------------------------------------------------------
*/

export function evaluateAdequacyScenarioSet({
    states = [],
    probabilityTolerance = 1e-9,
} = {}) {
    const evaluated =
        evaluateAdequacyStates(
            states
        );


    /*
    |--------------------------------------------------------------------------
    | No states
    |--------------------------------------------------------------------------
    */

    if (
        evaluated
            .totalStateCount ===
        0
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_SCENARIO_STATUS
                    .UNAVAILABLE,

            reason:
                ADEQUACY_SCENARIO_REASON
                    .NO_STATES,

            stateEvaluation:
                evaluated,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Every state must be individually valid
    |--------------------------------------------------------------------------
    */

    if (
        evaluated
            .invalidStateCount >
        0
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_SCENARIO_STATUS
                    .INVALID,

            reason:
                ADEQUACY_SCENARIO_REASON
                    .INVALID_ADEQUACY_STATES,

            stateEvaluation:
                evaluated,
        };
    }


    const validStates =
        evaluated.valid;


    /*
    |--------------------------------------------------------------------------
    | All states must represent the same interval
    |--------------------------------------------------------------------------
    */

    const intervalKeys =
        [
            ...new Set(
                validStates
                    .map(
                        intervalKey
                    )
                    .filter(
                        Boolean
                    )
            ),
        ];


    if (
        intervalKeys.length !==
        1
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_SCENARIO_STATUS
                    .INVALID,

            reason:
                ADEQUACY_SCENARIO_REASON
                    .INCONSISTENT_INTERVALS,

            intervalCount:
                intervalKeys.length,

            stateEvaluation:
                evaluated,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Deterministic vs probabilistic mode
    |--------------------------------------------------------------------------
    */

    const deterministicCount =
        evaluated
            .deterministicStateCount;

    const probabilisticCount =
        evaluated
            .probabilisticStateCount;


    if (
        deterministicCount >
            0 &&
        probabilisticCount >
            0
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_SCENARIO_STATUS
                    .INVALID,

            reason:
                ADEQUACY_SCENARIO_REASON
                    .MIXED_DETERMINISTIC_AND_PROBABILISTIC,

            stateEvaluation:
                evaluated,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Deterministic set
    |--------------------------------------------------------------------------
    |
    | For one time interval, deterministic adequacy must resolve to one
    | actual observed state.
    |--------------------------------------------------------------------------
    */

    if (
        deterministicCount >
        0
    ) {
        if (
            deterministicCount !==
            1
        ) {
            return {
                valid:
                    false,

                status:
                    ADEQUACY_SCENARIO_STATUS
                        .INVALID,

                reason:
                    ADEQUACY_SCENARIO_REASON
                        .DUPLICATE_SCENARIO_ID,

                mode:
                    "DETERMINISTIC",

                stateEvaluation:
                    evaluated,
            };
        }


        const state =
            validStates[0];


        return {
            valid:
                true,

            status:
                ADEQUACY_SCENARIO_STATUS
                    .VALID,

            reason:
                ADEQUACY_SCENARIO_REASON
                    .VALID,

            mode:
                "DETERMINISTIC",

            intervalStart:
                state
                    .intervalStart,

            intervalEnd:
                state
                    .intervalEnd,

            durationHours:
                state
                    .durationHours,

            scenarioCount:
                1,

            probabilitySum:
                1,

            expectedLoadKw:
                state
                    .loadKw,

            expectedAvailableSupplyKw:
                state
                    .availableSupplyKw,

            expectedDeficitKw:
                state
                    .deficitKw,

            lossOfLoadProbability:
                state
                    .lossOfLoad
                    ? 1
                    : 0,

            scenarios: [
                {
                    scenarioId:
                        "DETERMINISTIC",

                    probability:
                        1,

                    loadKw:
                        state
                            .loadKw,

                    availableSupplyKw:
                        state
                            .availableSupplyKw,

                    deficitKw:
                        state
                            .deficitKw,

                    adequate:
                        state
                            .adequate,

                    lossOfLoad:
                        state
                            .lossOfLoad,
                },
            ],

            stateEvaluation:
                evaluated,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Probabilistic set
    |--------------------------------------------------------------------------
    */

    const normalizedScenarios =
        validStates.map(
            (
                state,
                index
            ) => {
                return {
                    scenarioId:
                        scenarioId(
                            state,
                            index
                        ),

                    probability:
                        state
                            .probability,

                    loadKw:
                        state
                            .loadKw,

                    availableSupplyKw:
                        state
                            .availableSupplyKw,

                    deficitKw:
                        state
                            .deficitKw,

                    adequate:
                        state
                            .adequate,

                    lossOfLoad:
                        state
                            .lossOfLoad,
                };
            }
        );


    /*
    |--------------------------------------------------------------------------
    | Scenario IDs must be unique
    |--------------------------------------------------------------------------
    */

    const ids =
        normalizedScenarios.map(
            (scenario) =>
                scenario
                    .scenarioId
        );


    if (
        new Set(
            ids
        ).size !==
        ids.length
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_SCENARIO_STATUS
                    .INVALID,

            reason:
                ADEQUACY_SCENARIO_REASON
                    .DUPLICATE_SCENARIO_ID,

            mode:
                "PROBABILISTIC",

            stateEvaluation:
                evaluated,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Probabilities must sum to one
    |--------------------------------------------------------------------------
    */

    const probabilitySum =
        sum(
            normalizedScenarios
                .map(
                    (scenario) =>
                        scenario
                            .probability
                )
        );


    if (
        Math.abs(
            probabilitySum -
            1
        ) >
        probabilityTolerance
    ) {
        return {
            valid:
                false,

            status:
                ADEQUACY_SCENARIO_STATUS
                    .INVALID,

            reason:
                ADEQUACY_SCENARIO_REASON
                    .PROBABILITY_SUM_INVALID,

            mode:
                "PROBABILISTIC",

            probabilitySum,

            probabilityTolerance,

            stateEvaluation:
                evaluated,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Expected values
    |--------------------------------------------------------------------------
    */

    const expectedLoadKw =
        sum(
            normalizedScenarios.map(
                (scenario) =>
                    scenario
                        .loadKw *
                    scenario
                        .probability
            )
        );


    const expectedAvailableSupplyKw =
        sum(
            normalizedScenarios.map(
                (scenario) =>
                    scenario
                        .availableSupplyKw *
                    scenario
                        .probability
            )
        );


    const expectedDeficitKw =
        sum(
            normalizedScenarios.map(
                (scenario) =>
                    scenario
                        .deficitKw *
                    scenario
                        .probability
            )
        );


    const lossOfLoadProbability =
        sum(
            normalizedScenarios
                .filter(
                    (scenario) =>
                        scenario
                            .lossOfLoad ===
                        true
                )
                .map(
                    (scenario) =>
                        scenario
                            .probability
                )
        );


    const reference =
        validStates[0];


    return {
        valid:
            true,

        status:
            ADEQUACY_SCENARIO_STATUS
                .VALID,

        reason:
            ADEQUACY_SCENARIO_REASON
                .VALID,

        mode:
            "PROBABILISTIC",

        intervalStart:
            reference
                .intervalStart,

        intervalEnd:
            reference
                .intervalEnd,

        durationHours:
            reference
                .durationHours,

        scenarioCount:
            normalizedScenarios
                .length,

        probabilitySum,

        probabilityTolerance,

        expectedLoadKw,

        expectedAvailableSupplyKw,

        expectedDeficitKw,

        lossOfLoadProbability,

        scenarios:
            normalizedScenarios,

        stateEvaluation:
            evaluated,
    };
}