// backend/services/reliability/lolpCalculationService.js

import {
    evaluateAdequacyScenarioSet,
} from "./adequacyScenarioSetService.js";


/*
|--------------------------------------------------------------------------
| LOLP status
|--------------------------------------------------------------------------
*/

export const LOLP_STATUS = {
    CALCULATED:
        "CALCULATED",

    UNAVAILABLE:
        "UNAVAILABLE",
};


/*
|--------------------------------------------------------------------------
| LOLP reasons
|--------------------------------------------------------------------------
*/

export const LOLP_REASON = {
    CALCULATED:
        "CALCULATED",

    SCENARIO_SET_UNAVAILABLE:
        "SCENARIO_SET_UNAVAILABLE",

    INVALID_LOLP:
        "INVALID_LOLP",
};


/*
|--------------------------------------------------------------------------
| Calculate LOLP for one adequacy interval
|--------------------------------------------------------------------------
*/

export function calculateLolp({
    states = [],
    probabilityTolerance = 1e-9,
} = {}) {
    const scenarioSet =
        evaluateAdequacyScenarioSet({
            states,
            probabilityTolerance,
        });


    /*
    |--------------------------------------------------------------------------
    | Scenario set must first be qualified
    |--------------------------------------------------------------------------
    */

    if (
        scenarioSet
            .valid !==
        true
    ) {
        return {
            status:
                LOLP_STATUS
                    .UNAVAILABLE,

            reason:
                LOLP_REASON
                    .SCENARIO_SET_UNAVAILABLE,

            lolp:
                null,

            lolpPercent:
                null,

            mode:
                scenarioSet
                    .mode ??
                null,

            intervalStart:
                null,

            intervalEnd:
                null,

            durationHours:
                null,

            scenarioSetStatus:
                scenarioSet
                    .status,

            scenarioSetReason:
                scenarioSet
                    .reason,
        };
    }


    const lolp =
        Number(
            scenarioSet
                .lossOfLoadProbability
        );


    /*
    |--------------------------------------------------------------------------
    | Defensive range check
    |--------------------------------------------------------------------------
    */

    if (
        !Number.isFinite(
            lolp
        ) ||
        lolp < 0 ||
        lolp > 1
    ) {
        return {
            status:
                LOLP_STATUS
                    .UNAVAILABLE,

            reason:
                LOLP_REASON
                    .INVALID_LOLP,

            lolp:
                null,

            lolpPercent:
                null,

            mode:
                scenarioSet
                    .mode,

            intervalStart:
                scenarioSet
                    .intervalStart,

            intervalEnd:
                scenarioSet
                    .intervalEnd,

            durationHours:
                scenarioSet
                    .durationHours,

            scenarioSetStatus:
                scenarioSet
                    .status,

            scenarioSetReason:
                scenarioSet
                    .reason,
        };
    }


    return {
        status:
            LOLP_STATUS
                .CALCULATED,

        reason:
            LOLP_REASON
                .CALCULATED,

        label:
            "Loss of Load Probability",

        lolp,

        lolpPercent:
            lolp *
            100,

        mode:
            scenarioSet
                .mode,

        intervalStart:
            scenarioSet
                .intervalStart,

        intervalEnd:
            scenarioSet
                .intervalEnd,

        durationHours:
            scenarioSet
                .durationHours,

        scenarioCount:
            scenarioSet
                .scenarioCount,

        probabilitySum:
            scenarioSet
                .probabilitySum,

        expectedLoadKw:
            scenarioSet
                .expectedLoadKw,

        expectedAvailableSupplyKw:
            scenarioSet
                .expectedAvailableSupplyKw,

        expectedDeficitKw:
            scenarioSet
                .expectedDeficitKw,

        interpretation: {
            zero:
                "No qualified loss-of-load probability exists within this interval.",

            one:
                "Loss of load occurs with probability one within this interval.",

            probabilistic:
                "LOLP equals the probability mass of qualified scenarios in which available supply is below load.",
        },

        semanticBoundary: {
            isObservedOutageFrequency:
                false,

            isSaifi:
                false,

            isAvailability:
                false,

            monitoringStatusUsed:
                false,

            genericOutageEventUsed:
                false,
        },
    };
}