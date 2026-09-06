// backend/scripts/validateEensCalculation.js

import {
    EENS_STATUS,
    EENS_REASON,
    calculateEens,
} from "../services/reliability/eensCalculationService.js";


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
        !Number.isFinite(actual) ||
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
    "ASHMAAN EENS VALIDATION"
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
    calculateEens({
        intervals: [
            {
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
            },
        ],
    });


assertEqual(
    adequate.status,
    EENS_STATUS
        .CALCULATED,
    "Observed adequate deterministic interval produces calculable EENS"
);


assertEqual(
    adequate.eensKwh,
    0,
    "Adequate deterministic interval produces zero EENS"
);


/*
|--------------------------------------------------------------------------
| 2. Deterministic deficit
|--------------------------------------------------------------------------
|
| load = 100 kW
| available = 75 kW
| deficit = 25 kW
| duration = 2 h
|
| EENS = 50 kWh
|--------------------------------------------------------------------------
*/

const deterministicDeficit =
    calculateEens({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-01T01:00:00.000Z",

                        intervalEnd:
                            "2026-09-01T03:00:00.000Z",

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
            },
        ],
    });


assertClose(
    deterministicDeficit.eensKwh,
    50,
    1e-12,
    "Twenty-five kilowatt deficit over two hours produces fifty kWh EENS"
);


/*
|--------------------------------------------------------------------------
| 3. Probabilistic example
|--------------------------------------------------------------------------
|
| Scenario A:
| p = 0.70
| deficit = 0 kW
|
| Scenario B:
| p = 0.20
| deficit = 20 kW
|
| Scenario C:
| p = 0.10
| deficit = 50 kW
|
| Expected deficit:
|
| 0.70(0) + 0.20(20) + 0.10(50)
| = 9 kW
|
| duration = 1 h
|
| EENS = 9 kWh
|--------------------------------------------------------------------------
*/

const probabilistic =
    calculateEens({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-02T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-02T01:00:00.000Z",

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
                            "2026-09-02T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-02T01:00:00.000Z",

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
                            "2026-09-02T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-02T01:00:00.000Z",

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
            },
        ],
    });


assertEqual(
    probabilistic.status,
    EENS_STATUS
        .CALCULATED,
    "Qualified probabilistic interval produces calculated EENS"
);


assertClose(
    probabilistic
        .intervalContributions[0]
        .expectedDeficitKw,
    9,
    1e-12,
    "Expected deficit remains nine kilowatts"
);


assertClose(
    probabilistic.eensKwh,
    9,
    1e-12,
    "Nine kilowatt expected deficit over one hour produces nine kWh EENS"
);


/*
|--------------------------------------------------------------------------
| 4. Probability and energy weighting are not interchangeable
|--------------------------------------------------------------------------
|
| LOLP = 0.30
|
| But EENS is NOT:
|
| LOLP × expected load
|
| or
|
| max(expected load - expected supply, 0)
|
| Here:
|
| expected load = 100 kW
| expected supply = 105 kW
|
| max(100 - 105, 0) = 0
|
| yet:
|
| expected deficit = 9 kW
| EENS = 9 kWh
|--------------------------------------------------------------------------
*/

assertClose(
    probabilistic
        .intervalContributions[0]
        .expectedLoadKw,
    100,
    1e-12,
    "Probability-weighted expected load is one hundred kilowatts"
);


assertClose(
    probabilistic
        .intervalContributions[0]
        .expectedAvailableSupplyKw,
    105,
    1e-12,
    "Probability-weighted expected available supply is one hundred five kilowatts"
);


assertClose(
    probabilistic.eensKwh,
    9,
    1e-12,
    "EENS uses expected scenario deficit rather than deficit of expected values"
);


/*
|--------------------------------------------------------------------------
| 5. Multi-interval accumulation
|--------------------------------------------------------------------------
|
| Interval 1:
| expected deficit = 10 kW
| duration = 1 h
| contribution = 10 kWh
|
| Interval 2:
| deficit = 20 kW
| duration = 2 h
| contribution = 40 kWh
|
| total = 50 kWh
|--------------------------------------------------------------------------
*/

const multiInterval =
    calculateEens({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-03T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-03T01:00:00.000Z",

                        loadKw:
                            100,

                        availableSupplyKw:
                            90,

                        loadObserved:
                            true,

                        supplyObserved:
                            true,
                    },
                ],
            },

            {
                states: [
                    {
                        intervalStart:
                            "2026-09-03T01:00:00.000Z",

                        intervalEnd:
                            "2026-09-03T03:00:00.000Z",

                        loadKw:
                            100,

                        availableSupplyKw:
                            80,

                        loadObserved:
                            true,

                        supplyObserved:
                            true,
                    },
                ],
            },
        ],
    });


assertClose(
    multiInterval.eensKwh,
    50,
    1e-12,
    "EENS accumulates energy shortfall across multiple intervals"
);


assertClose(
    multiInterval.evaluatedDurationHours,
    3,
    1e-12,
    "Multi-interval EENS preserves total evaluated duration"
);


/*
|--------------------------------------------------------------------------
| 6. Empty horizon
|--------------------------------------------------------------------------
*/

const empty =
    calculateEens({
        intervals: [],
    });


assertEqual(
    empty.status,
    EENS_STATUS
        .UNAVAILABLE,
    "Empty adequacy horizon leaves EENS unavailable"
);


assertEqual(
    empty.reason,
    EENS_REASON
        .NO_INTERVALS,
    "Empty horizon is explicitly identified"
);


assertEqual(
    empty.eensKwh,
    null,
    "Missing adequacy evidence does not fabricate zero EENS"
);


/*
|--------------------------------------------------------------------------
| 7. Missing supply observability
|--------------------------------------------------------------------------
*/

const unobservable =
    calculateEens({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-04T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-04T01:00:00.000Z",

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
            },
        ],
    });


assertEqual(
    unobservable.status,
    EENS_STATUS
        .UNAVAILABLE,
    "Unobservable available supply blocks EENS"
);


assertEqual(
    unobservable.reason,
    EENS_REASON
        .SCENARIO_SET_UNAVAILABLE,
    "Unqualified adequacy state propagates to unavailable EENS"
);


assertEqual(
    unobservable.eensKwh,
    null,
    "Unobserved zero supply does not fabricate one hundred kWh EENS"
);


/*
|--------------------------------------------------------------------------
| 8. Invalid probability mass
|--------------------------------------------------------------------------
*/

const invalidProbability =
    calculateEens({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-05T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-05T01:00:00.000Z",

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
                            "2026-09-05T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-05T01:00:00.000Z",

                        loadKw:
                            100,

                        availableSupplyKw:
                            20,

                        loadObserved:
                            true,

                        supplyObserved:
                            true,

                        probability:
                            0.30,
                    },
                ],
            },
        ],
    });


assertEqual(
    invalidProbability.status,
    EENS_STATUS
        .UNAVAILABLE,
    "Incomplete probability mass blocks EENS"
);


assertEqual(
    invalidProbability.eensKwh,
    null,
    "Incomplete probability distribution does not produce biased EENS"
);


/*
|--------------------------------------------------------------------------
| 9. Overlapping intervals
|--------------------------------------------------------------------------
*/

const overlapping =
    calculateEens({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-06T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-06T02:00:00.000Z",

                        loadKw:
                            100,

                        availableSupplyKw:
                            90,

                        loadObserved:
                            true,

                        supplyObserved:
                            true,
                    },
                ],
            },

            {
                states: [
                    {
                        intervalStart:
                            "2026-09-06T01:00:00.000Z",

                        intervalEnd:
                            "2026-09-06T03:00:00.000Z",

                        loadKw:
                            100,

                        availableSupplyKw:
                            90,

                        loadObserved:
                            true,

                        supplyObserved:
                            true,
                    },
                ],
            },
        ],
    });


assertEqual(
    overlapping.status,
    EENS_STATUS
        .UNAVAILABLE,
    "Overlapping adequacy intervals block EENS"
);


assertEqual(
    overlapping.reason,
    EENS_REASON
        .OVERLAPPING_INTERVALS,
    "Overlapping intervals are explicitly rejected"
);


/*
|--------------------------------------------------------------------------
| 10. Touching intervals
|--------------------------------------------------------------------------
*/

const touching =
    calculateEens({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-07T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-07T01:00:00.000Z",

                        loadKw:
                            100,

                        availableSupplyKw:
                            90,

                        loadObserved:
                            true,

                        supplyObserved:
                            true,
                    },
                ],
            },

            {
                states: [
                    {
                        intervalStart:
                            "2026-09-07T01:00:00.000Z",

                        intervalEnd:
                            "2026-09-07T02:00:00.000Z",

                        loadKw:
                            100,

                        availableSupplyKw:
                            80,

                        loadObserved:
                            true,

                        supplyObserved:
                            true,
                    },
                ],
            },
        ],
    });


assertEqual(
    touching.status,
    EENS_STATUS
        .CALCULATED,
    "Touching consecutive intervals are valid for EENS"
);


assertClose(
    touching.eensKwh,
    30,
    1e-12,
    "Touching deficit intervals accumulate without overlap"
);


/*
|--------------------------------------------------------------------------
| 11. Unit conversion
|--------------------------------------------------------------------------
*/

const largeEnergy =
    calculateEens({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-08T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-08T10:00:00.000Z",

                        loadKw:
                            500,

                        availableSupplyKw:
                            300,

                        loadObserved:
                            true,

                        supplyObserved:
                            true,
                    },
                ],
            },
        ],
    });


assertClose(
    largeEnergy.eensKwh,
    2000,
    1e-12,
    "Two hundred kilowatt deficit over ten hours produces two thousand kWh"
);


assertClose(
    largeEnergy.eensMwh,
    2,
    1e-12,
    "Two thousand kWh equals two MWh"
);


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

assertEqual(
    probabilistic
        .semanticBoundary
        .isHistoricalEns,
    false,
    "EENS remains distinct from historical ENS"
);


assertEqual(
    probabilistic
        .semanticBoundary
        .isLole,
    false,
    "EENS remains distinct from LOLE"
);


assertEqual(
    probabilistic
        .semanticBoundary
        .isSaidi,
    false,
    "EENS remains distinct from SAIDI"
);


assertEqual(
    probabilistic
        .semanticBoundary
        .monitoringStatusUsed,
    false,
    "Monitoring status is not used in EENS"
);


/*
|--------------------------------------------------------------------------
| Final
|--------------------------------------------------------------------------
*/

console.log("");

console.log(
    "=========================================="
);

console.log(
    "EENS VALIDATION PASSED"
);

console.log(
    "=========================================="
);

console.log("");

console.log(
    "Validated engineering semantics:"
);

console.log(
    "- EENS equals expected power deficit multiplied by interval duration"
);

console.log(
    "- probabilistic EENS uses probability-weighted scenario deficits"
);

console.log(
    "- EENS is not calculated from expected load minus expected supply"
);

console.log(
    "- deterministic deficit intervals use implicit probability one"
);

console.log(
    "- incomplete scenario probability mass blocks EENS"
);

console.log(
    "- missing load or supply observability blocks EENS"
);

console.log(
    "- overlapping intervals are rejected to prevent energy double-counting"
);

console.log(
    "- touching consecutive intervals are valid"
);

console.log(
    "- EENS is expressed in kWh with MWh conversion available"
);

console.log(
    "- EENS is distinct from historical ENS, LOLE, SAIDI and outage duration"
);