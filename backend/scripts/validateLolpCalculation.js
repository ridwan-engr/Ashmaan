// backend/scripts/validateLolpCalculation.js

import {
    LOLP_STATUS,
    LOLP_REASON,
    calculateLolp,
} from "../services/reliability/lolpCalculationService.js";


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


console.log("");

console.log(
    "=========================================="
);

console.log(
    "ASHMAAN LOLP VALIDATION"
);

console.log(
    "=========================================="
);

console.log("");


/*
|--------------------------------------------------------------------------
| 1. Deterministic adequate interval
|--------------------------------------------------------------------------
*/

const adequate =
    calculateLolp({
        states: [
            {
                intervalStart:
                    "2026-09-01T00:00:00.000Z",

                intervalEnd:
                    "2026-09-01T01:00:00.000Z",

                loadKw:
                    80,

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
    adequate.status,
    LOLP_STATUS
        .CALCULATED,
    "Deterministic adequate interval produces calculated LOLP"
);


assertEqual(
    adequate.lolp,
    0,
    "Deterministic adequate interval has LOLP zero"
);


assertEqual(
    adequate.lolpPercent,
    0,
    "Deterministic adequate interval has zero percent LOLP"
);


assertEqual(
    adequate.mode,
    "DETERMINISTIC",
    "Deterministic LOLP preserves adequacy mode"
);


/*
|--------------------------------------------------------------------------
| 2. Deterministic inadequate interval
|--------------------------------------------------------------------------
*/

const inadequate =
    calculateLolp({
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
    inadequate.status,
    LOLP_STATUS
        .CALCULATED,
    "Deterministic deficit interval produces calculated LOLP"
);


assertEqual(
    inadequate.lolp,
    1,
    "Observed deterministic deficit produces LOLP one"
);


assertEqual(
    inadequate.lolpPercent,
    100,
    "Observed deterministic deficit produces 100 percent LOLP"
);


/*
|--------------------------------------------------------------------------
| 3. Probabilistic interval
|--------------------------------------------------------------------------
|
| Scenario probabilities:
|
| NORMAL   = 0.70 → adequate
| DERATED  = 0.20 → inadequate
| SEVERE   = 0.10 → inadequate
|
| LOLP = 0.20 + 0.10 = 0.30
|--------------------------------------------------------------------------
*/

const probabilistic =
    calculateLolp({
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
                        "SEVERE",
                },
            },
        ],
    });


assertEqual(
    probabilistic.status,
    LOLP_STATUS
        .CALCULATED,
    "Qualified probabilistic scenario set produces calculated LOLP"
);


assertEqual(
    probabilistic.mode,
    "PROBABILISTIC",
    "Probabilistic mode is preserved"
);


assertClose(
    probabilistic.lolp,
    0.30,
    1e-12,
    "LOLP equals probability mass of inadequate scenarios"
);


assertClose(
    probabilistic.lolpPercent,
    30,
    1e-12,
    "LOLP percentage equals thirty percent"
);


assertClose(
    probabilistic.expectedDeficitKw,
    9,
    1e-12,
    "LOLP result preserves expected power deficit"
);


assertClose(
    probabilistic.expectedAvailableSupplyKw,
    105,
    1e-12,
    "LOLP result preserves probability-weighted available supply"
);


/*
|--------------------------------------------------------------------------
| 4. All probabilistic scenarios adequate
|--------------------------------------------------------------------------
*/

const allAdequate =
    calculateLolp({
        states: [
            {
                intervalStart:
                    "2026-09-01T03:00:00.000Z",

                intervalEnd:
                    "2026-09-01T04:00:00.000Z",

                loadKw:
                    50,

                availableSupplyKw:
                    70,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.60,

                metadata: {
                    scenarioId:
                        "A",
                },
            },

            {
                intervalStart:
                    "2026-09-01T03:00:00.000Z",

                intervalEnd:
                    "2026-09-01T04:00:00.000Z",

                loadKw:
                    50,

                availableSupplyKw:
                    55,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.40,

                metadata: {
                    scenarioId:
                        "B",
                },
            },
        ],
    });


assertEqual(
    allAdequate.lolp,
    0,
    "All adequate scenarios produce LOLP zero"
);


/*
|--------------------------------------------------------------------------
| 5. All probabilistic scenarios inadequate
|--------------------------------------------------------------------------
*/

const allInadequate =
    calculateLolp({
        states: [
            {
                intervalStart:
                    "2026-09-01T04:00:00.000Z",

                intervalEnd:
                    "2026-09-01T05:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    90,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.25,

                metadata: {
                    scenarioId:
                        "A",
                },
            },

            {
                intervalStart:
                    "2026-09-01T04:00:00.000Z",

                intervalEnd:
                    "2026-09-01T05:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    20,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.75,

                metadata: {
                    scenarioId:
                        "B",
                },
            },
        ],
    });


assertEqual(
    allInadequate.lolp,
    1,
    "All inadequate scenarios produce LOLP one"
);


/*
|--------------------------------------------------------------------------
| 6. Invalid probability mass
|--------------------------------------------------------------------------
*/

const invalidProbability =
    calculateLolp({
        states: [
            {
                intervalStart:
                    "2026-09-01T05:00:00.000Z",

                intervalEnd:
                    "2026-09-01T06:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    120,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                probability:
                    0.50,
            },

            {
                intervalStart:
                    "2026-09-01T05:00:00.000Z",

                intervalEnd:
                    "2026-09-01T06:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    40,

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
    invalidProbability.status,
    LOLP_STATUS
        .UNAVAILABLE,
    "Incomplete probability distribution blocks LOLP"
);


assertEqual(
    invalidProbability.reason,
    LOLP_REASON
        .SCENARIO_SET_UNAVAILABLE,
    "Invalid scenario set is exposed as unavailable LOLP"
);


assertEqual(
    invalidProbability.lolp,
    null,
    "Invalid probability mass does not fabricate LOLP"
);


/*
|--------------------------------------------------------------------------
| 7. Missing supply observability
|--------------------------------------------------------------------------
*/

const missingSupply =
    calculateLolp({
        states: [
            {
                intervalStart:
                    "2026-09-01T06:00:00.000Z",

                intervalEnd:
                    "2026-09-01T07:00:00.000Z",

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
    missingSupply.status,
    LOLP_STATUS
        .UNAVAILABLE,
    "Unobservable supply blocks LOLP"
);


assertEqual(
    missingSupply.lolp,
    null,
    "Unobserved zero supply does not fabricate LOLP one"
);


/*
|--------------------------------------------------------------------------
| 8. Missing load observability
|--------------------------------------------------------------------------
*/

const missingLoad =
    calculateLolp({
        states: [
            {
                intervalStart:
                    "2026-09-01T07:00:00.000Z",

                intervalEnd:
                    "2026-09-01T08:00:00.000Z",

                loadKw:
                    0,

                availableSupplyKw:
                    100,

                loadObserved:
                    false,

                supplyObserved:
                    true,
            },
        ],
    });


assertEqual(
    missingLoad.status,
    LOLP_STATUS
        .UNAVAILABLE,
    "Unobservable load blocks LOLP"
);


assertEqual(
    missingLoad.lolp,
    null,
    "Unobserved zero load does not fabricate LOLP zero"
);


/*
|--------------------------------------------------------------------------
| 9. Empty input
|--------------------------------------------------------------------------
*/

const empty =
    calculateLolp({
        states: [],
    });


assertEqual(
    empty.status,
    LOLP_STATUS
        .UNAVAILABLE,
    "Empty adequacy input leaves LOLP unavailable"
);


assertEqual(
    empty.lolp,
    null,
    "No adequacy evidence does not become LOLP zero"
);


/*
|--------------------------------------------------------------------------
| 10. Probability bounds
|--------------------------------------------------------------------------
*/

assertEqual(
    probabilistic.lolp >= 0 &&
    probabilistic.lolp <= 1,
    true,
    "Calculated LOLP remains bounded between zero and one"
);


/*
|--------------------------------------------------------------------------
| Semantic separation
|--------------------------------------------------------------------------
*/

assertEqual(
    probabilistic
        .semanticBoundary
        .isSaifi,
    false,
    "LOLP remains distinct from SAIFI"
);


assertEqual(
    probabilistic
        .semanticBoundary
        .isAvailability,
    false,
    "LOLP remains distinct from availability"
);


assertEqual(
    probabilistic
        .semanticBoundary
        .monitoringStatusUsed,
    false,
    "Monitoring ONLINE/OFFLINE is not used to calculate LOLP"
);


console.log("");

console.log(
    "=========================================="
);

console.log(
    "LOLP VALIDATION PASSED"
);

console.log(
    "=========================================="
);

console.log("");

console.log(
    "Validated engineering semantics:"
);

console.log(
    "- LOLP is calculated only from a qualified adequacy scenario set"
);

console.log(
    "- deterministic adequacy produces LOLP zero or one"
);

console.log(
    "- probabilistic LOLP equals the probability mass of deficit scenarios"
);

console.log(
    "- incomplete probability distributions do not produce LOLP"
);

console.log(
    "- missing load or supply observability does not become zero-risk or certain-failure"
);

console.log(
    "- LOLP is bounded within [0, 1]"
);

console.log(
    "- LOLP is distinct from SAIFI, availability and observed outage frequency"
);