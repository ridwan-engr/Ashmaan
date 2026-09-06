// backend/scripts/validateAdequacyScenarioSet.js

import {
    ADEQUACY_SCENARIO_STATUS,
    ADEQUACY_SCENARIO_REASON,
    evaluateAdequacyScenarioSet,
} from "../services/reliability/adequacyScenarioSetService.js";


function assertEqual(
    actual,
    expected,
    label
) {
    if (
        actual !==
        expected
    ) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


function assertClose(
    actual,
    expected,
    tolerance,
    label
) {
    if (
        !Number.isFinite(
            actual
        ) ||
        Math.abs(
            actual -
            expected
        ) >
        tolerance
    ) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


/*
|--------------------------------------------------------------------------
| Heading
|--------------------------------------------------------------------------
*/

console.log("");

console.log(
    "=============================================="
);

console.log(
    "ASHMAAN ADEQUACY SCENARIO-SET VALIDATION"
);

console.log(
    "=============================================="
);

console.log("");


/*
|--------------------------------------------------------------------------
| 1. Deterministic adequate interval
|--------------------------------------------------------------------------
*/

const deterministicAdequate =
    evaluateAdequacyScenarioSet({
        states: [
            {
                intervalStart:
                    "2026-09-01T00:00:00.000Z",

                intervalEnd:
                    "2026-09-01T01:00:00.000Z",

                loadKw:
                    70,

                availableSupplyKw:
                    100,

                loadObserved:
                    true,

                supplyObserved:
                    true,
            },
        ],
    });


assertEqual(
    deterministicAdequate.status,
    ADEQUACY_SCENARIO_STATUS
        .VALID,
    "Single deterministic adequacy state forms a valid scenario set"
);


assertEqual(
    deterministicAdequate.mode,
    "DETERMINISTIC",
    "Missing probabilities produce deterministic scenario mode"
);


assertEqual(
    deterministicAdequate.probabilitySum,
    1,
    "Deterministic state receives implicit probability one"
);


assertEqual(
    deterministicAdequate.lossOfLoadProbability,
    0,
    "Adequate deterministic state has loss-of-load probability zero"
);


assertEqual(
    deterministicAdequate.expectedDeficitKw,
    0,
    "Adequate deterministic state has zero expected deficit"
);


/*
|--------------------------------------------------------------------------
| 2. Deterministic inadequate interval
|--------------------------------------------------------------------------
*/

const deterministicDeficit =
    evaluateAdequacyScenarioSet({
        states: [
            {
                intervalStart:
                    "2026-09-01T01:00:00.000Z",

                intervalEnd:
                    "2026-09-01T02:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    75,

                loadObserved:
                    true,

                supplyObserved:
                    true,
            },
        ],
    });


assertEqual(
    deterministicDeficit.lossOfLoadProbability,
    1,
    "Observed deterministic deficit has loss-of-load probability one"
);


assertEqual(
    deterministicDeficit.expectedDeficitKw,
    25,
    "Deterministic expected deficit equals observed deficit"
);


/*
|--------------------------------------------------------------------------
| 3. Valid probabilistic scenario distribution
|--------------------------------------------------------------------------
|
| Scenario A:
| probability = 0.70
| load        = 100 kW
| supply      = 120 kW
| deficit     = 0
|
| Scenario B:
| probability = 0.20
| load        = 100 kW
| supply      = 80 kW
| deficit     = 20 kW
|
| Scenario C:
| probability = 0.10
| load        = 100 kW
| supply      = 50 kW
| deficit     = 50 kW
|
| LOL probability = 0.20 + 0.10 = 0.30
|
| Expected deficit =
| 0.70(0) + 0.20(20) + 0.10(50)
| = 9 kW
|--------------------------------------------------------------------------
*/

const probabilistic =
    evaluateAdequacyScenarioSet({
        states: [
            {
                intervalStart:
                    "2026-09-01T02:00:00.000Z",

                intervalEnd:
                    "2026-09-01T03:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    120,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.70,

                metadata: {
                    scenarioId:
                        "NORMAL",
                },
            },

            {
                intervalStart:
                    "2026-09-01T02:00:00.000Z",

                intervalEnd:
                    "2026-09-01T03:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    80,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.20,

                metadata: {
                    scenarioId:
                        "DERATED",
                },
            },

            {
                intervalStart:
                    "2026-09-01T02:00:00.000Z",

                intervalEnd:
                    "2026-09-01T03:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    50,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.10,

                metadata: {
                    scenarioId:
                        "SEVERE_DERATING",
                },
            },
        ],
    });


assertEqual(
    probabilistic.status,
    ADEQUACY_SCENARIO_STATUS
        .VALID,
    "Complete probabilistic scenario distribution is valid"
);


assertEqual(
    probabilistic.mode,
    "PROBABILISTIC",
    "Explicit probabilities produce probabilistic mode"
);


assertEqual(
    probabilistic.scenarioCount,
    3,
    "Three scenarios are preserved"
);


assertClose(
    probabilistic.probabilitySum,
    1,
    1e-12,
    "Probabilistic scenario weights sum to one"
);


assertClose(
    probabilistic.lossOfLoadProbability,
    0.30,
    1e-12,
    "Loss-of-load probability equals probability mass of deficit scenarios"
);


assertClose(
    probabilistic.expectedDeficitKw,
    9,
    1e-12,
    "Expected deficit equals probability-weighted power shortfall"
);


assertClose(
    probabilistic.expectedLoadKw,
    100,
    1e-12,
    "Expected load is probability weighted"
);


assertClose(
    probabilistic.expectedAvailableSupplyKw,
    105,
    1e-12,
    "Expected available supply is probability weighted"
);


/*
|--------------------------------------------------------------------------
| 4. Invalid probability normalization
|--------------------------------------------------------------------------
*/

const badProbabilitySum =
    evaluateAdequacyScenarioSet({
        states: [
            {
                intervalStart:
                    "2026-09-01T03:00:00.000Z",

                intervalEnd:
                    "2026-09-01T04:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    100,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.50,
            },

            {
                intervalStart:
                    "2026-09-01T03:00:00.000Z",

                intervalEnd:
                    "2026-09-01T04:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    50,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.30,
            },
        ],
    });


assertEqual(
    badProbabilitySum.reason,
    ADEQUACY_SCENARIO_REASON
        .PROBABILITY_SUM_INVALID,
    "Incomplete probability mass is rejected"
);


assertClose(
    badProbabilitySum.probabilitySum,
    0.80,
    1e-12,
    "Invalid probability sum remains visible for diagnostics"
);


/*
|--------------------------------------------------------------------------
| 5. Mixed deterministic and probabilistic states
|--------------------------------------------------------------------------
*/

const mixed =
    evaluateAdequacyScenarioSet({
        states: [
            {
                intervalStart:
                    "2026-09-01T04:00:00.000Z",

                intervalEnd:
                    "2026-09-01T05:00:00.000Z",

                loadKw:
                    50,

                availableSupplyKw:
                    70,

                loadObserved:
                    true,

                supplyObserved:
                    true,
            },

            {
                intervalStart:
                    "2026-09-01T04:00:00.000Z",

                intervalEnd:
                    "2026-09-01T05:00:00.000Z",

                loadKw:
                    50,

                availableSupplyKw:
                    20,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.20,
            },
        ],
    });


assertEqual(
    mixed.reason,
    ADEQUACY_SCENARIO_REASON
        .MIXED_DETERMINISTIC_AND_PROBABILISTIC,
    "Deterministic and probabilistic states cannot share one scenario set"
);


/*
|--------------------------------------------------------------------------
| 6. Different intervals
|--------------------------------------------------------------------------
*/

const inconsistentIntervals =
    evaluateAdequacyScenarioSet({
        states: [
            {
                intervalStart:
                    "2026-09-01T05:00:00.000Z",

                intervalEnd:
                    "2026-09-01T06:00:00.000Z",

                loadKw:
                    50,

                availableSupplyKw:
                    60,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.5,
            },

            {
                intervalStart:
                    "2026-09-01T06:00:00.000Z",

                intervalEnd:
                    "2026-09-01T07:00:00.000Z",

                loadKw:
                    50,

                availableSupplyKw:
                    40,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.5,
            },
        ],
    });


assertEqual(
    inconsistentIntervals.reason,
    ADEQUACY_SCENARIO_REASON
        .INCONSISTENT_INTERVALS,
    "Scenario states from different time intervals are rejected"
);


/*
|--------------------------------------------------------------------------
| 7. Unobservable state invalidates scenario set
|--------------------------------------------------------------------------
*/

const unobservable =
    evaluateAdequacyScenarioSet({
        states: [
            {
                intervalStart:
                    "2026-09-01T07:00:00.000Z",

                intervalEnd:
                    "2026-09-01T08:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    0,

                loadObserved:
                    true,

                supplyObserved:
                    false,
            },
        ],
    });


assertEqual(
    unobservable.reason,
    ADEQUACY_SCENARIO_REASON
        .INVALID_ADEQUACY_STATES,
    "Unobservable adequacy evidence cannot form a valid scenario set"
);


/*
|--------------------------------------------------------------------------
| 8. Duplicate scenario ID
|--------------------------------------------------------------------------
*/

const duplicateId =
    evaluateAdequacyScenarioSet({
        states: [
            {
                intervalStart:
                    "2026-09-01T08:00:00.000Z",

                intervalEnd:
                    "2026-09-01T09:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    120,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.5,

                metadata: {
                    scenarioId:
                        "CASE_A",
                },
            },

            {
                intervalStart:
                    "2026-09-01T08:00:00.000Z",

                intervalEnd:
                    "2026-09-01T09:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    50,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.5,

                metadata: {
                    scenarioId:
                        "CASE_A",
                },
            },
        ],
    });


assertEqual(
    duplicateId.reason,
    ADEQUACY_SCENARIO_REASON
        .DUPLICATE_SCENARIO_ID,
    "Duplicate probabilistic scenario identifiers are rejected"
);


/*
|--------------------------------------------------------------------------
| 9. Empty set
|--------------------------------------------------------------------------
*/

const empty =
    evaluateAdequacyScenarioSet({
        states: [],
    });


assertEqual(
    empty.status,
    ADEQUACY_SCENARIO_STATUS
        .UNAVAILABLE,
    "Empty adequacy-state input remains unavailable"
);


assertEqual(
    empty.reason,
    ADEQUACY_SCENARIO_REASON
        .NO_STATES,
    "Empty input is not interpreted as perfect adequacy"
);


/*
|--------------------------------------------------------------------------
| Final
|--------------------------------------------------------------------------
*/

console.log("");

console.log(
    "=============================================="
);

console.log(
    "ADEQUACY SCENARIO-SET VALIDATION PASSED"
);

console.log(
    "=============================================="
);

console.log("");

console.log(
    "Validated engineering semantics:"
);

console.log(
    "- deterministic adequacy carries implicit probability one"
);

console.log(
    "- probabilistic scenarios must form a complete probability distribution"
);

console.log(
    "- probability mass of deficit scenarios defines interval loss-of-load probability"
);

console.log(
    "- expected deficit is probability-weighted unserved power"
);

console.log(
    "- deterministic and probabilistic states are not mixed"
);

console.log(
    "- scenario states must refer to the same time interval"
);

console.log(
    "- unobservable evidence cannot enter adequacy probability calculations"
);

console.log(
    "- empty scenario sets do not imply zero risk"
);

console.log(
    "- LOLP, LOLE and EENS remain downstream calculations"
);