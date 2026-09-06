// backend/scripts/validateAdequacyReliabilityPipeline.js

import {
    evaluateAdequacyScenarioSet,
    ADEQUACY_SCENARIO_STATUS,
} from "../services/reliability/adequacyScenarioSetService.js";

import {
    calculateLolp,
    LOLP_STATUS,
} from "../services/reliability/lolpCalculationService.js";

import {
    calculateLole,
    LOLE_STATUS,
} from "../services/reliability/loleCalculationService.js";

import {
    calculateEens,
    EENS_STATUS,
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
    "================================================"
);

console.log(
    "ASHMAAN ADEQUACY RELIABILITY PIPELINE VALIDATION"
);

console.log(
    "================================================"
);

console.log("");


/*
|--------------------------------------------------------------------------
| Synthetic adequacy horizon
|--------------------------------------------------------------------------
|
| Interval 1
| ----------
| 1 hour
| deterministic
| load = 80 kW
| supply = 100 kW
|
| LOLP = 0
| expected deficit = 0 kW
| LOLE contribution = 0 h
| EENS contribution = 0 kWh
|
|
| Interval 2
| ----------
| 1 hour
|
| Scenario NORMAL
| p = 0.70
| load = 100
| supply = 120
| deficit = 0
|
| Scenario DERATED
| p = 0.20
| load = 100
| supply = 80
| deficit = 20
|
| Scenario SEVERE
| p = 0.10
| load = 100
| supply = 50
| deficit = 50
|
| LOLP =
| 0.20 + 0.10
| = 0.30
|
| Expected deficit =
| 0.70(0)
| + 0.20(20)
| + 0.10(50)
| = 9 kW
|
| LOLE contribution =
| 0.30 × 1
| = 0.30 h
|
| EENS contribution =
| 9 × 1
| = 9 kWh
|
|
| Interval 3
| ----------
| 2 hours
| deterministic
| load = 100 kW
| supply = 75 kW
|
| deficit = 25 kW
|
| LOLP = 1
|
| LOLE contribution =
| 1 × 2
| = 2 h
|
| EENS contribution =
| 25 × 2
| = 50 kWh
|
|
| HORIZON TOTAL
| -------------
|
| duration = 4 h
|
| LOLE =
| 0 + 0.30 + 2
| = 2.30 h
|
| EENS =
| 0 + 9 + 50
| = 59 kWh
|--------------------------------------------------------------------------
*/

const intervals = [

    /*
    |--------------------------------------------------------------------------
    | Interval 1 — deterministic adequate
    |--------------------------------------------------------------------------
    */

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

                source:
                    "SYNTHETIC_VALIDATION",
            },
        ],
    },


    /*
    |--------------------------------------------------------------------------
    | Interval 2 — probabilistic
    |--------------------------------------------------------------------------
    */

    {
        states: [
            {
                intervalStart:
                    "2026-09-01T01:00:00.000Z",

                intervalEnd:
                    "2026-09-01T02:00:00.000Z",

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

                source:
                    "SYNTHETIC_VALIDATION",

                metadata: {
                    scenarioId:
                        "NORMAL",
                },
            },

            {
                intervalStart:
                    "2026-09-01T01:00:00.000Z",

                intervalEnd:
                    "2026-09-01T02:00:00.000Z",

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

                source:
                    "SYNTHETIC_VALIDATION",

                metadata: {
                    scenarioId:
                        "DERATED",
                },
            },

            {
                intervalStart:
                    "2026-09-01T01:00:00.000Z",

                intervalEnd:
                    "2026-09-01T02:00:00.000Z",

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

                source:
                    "SYNTHETIC_VALIDATION",

                metadata: {
                    scenarioId:
                        "SEVERE",
                },
            },
        ],
    },


    /*
    |--------------------------------------------------------------------------
    | Interval 3 — deterministic deficit
    |--------------------------------------------------------------------------
    */

    {
        states: [
            {
                intervalStart:
                    "2026-09-01T02:00:00.000Z",

                intervalEnd:
                    "2026-09-01T04:00:00.000Z",

                loadKw:
                    100,

                availableSupplyKw:
                    75,

                loadObserved:
                    true,

                supplyObserved:
                    true,

                source:
                    "SYNTHETIC_VALIDATION",
            },
        ],
    },
];


/*
|--------------------------------------------------------------------------
| 1. Scenario-set validation
|--------------------------------------------------------------------------
*/

const scenarioSet1 =
    evaluateAdequacyScenarioSet(
        intervals[0]
    );

const scenarioSet2 =
    evaluateAdequacyScenarioSet(
        intervals[1]
    );

const scenarioSet3 =
    evaluateAdequacyScenarioSet(
        intervals[2]
    );


assertEqual(
    scenarioSet1.status,
    ADEQUACY_SCENARIO_STATUS
        .VALID,
    "Interval 1 scenario set is valid"
);


assertEqual(
    scenarioSet2.status,
    ADEQUACY_SCENARIO_STATUS
        .VALID,
    "Interval 2 probabilistic scenario set is valid"
);


assertEqual(
    scenarioSet3.status,
    ADEQUACY_SCENARIO_STATUS
        .VALID,
    "Interval 3 scenario set is valid"
);


assertEqual(
    scenarioSet1.mode,
    "DETERMINISTIC",
    "Interval 1 remains deterministic"
);


assertEqual(
    scenarioSet2.mode,
    "PROBABILISTIC",
    "Interval 2 remains probabilistic"
);


assertEqual(
    scenarioSet3.mode,
    "DETERMINISTIC",
    "Interval 3 remains deterministic"
);


/*
|--------------------------------------------------------------------------
| 2. Scenario-set expected deficits
|--------------------------------------------------------------------------
*/

assertClose(
    scenarioSet1.expectedDeficitKw,
    0,
    1e-12,
    "Interval 1 expected deficit is zero"
);


assertClose(
    scenarioSet2.expectedDeficitKw,
    9,
    1e-12,
    "Interval 2 probability-weighted expected deficit is nine kilowatts"
);


assertClose(
    scenarioSet3.expectedDeficitKw,
    25,
    1e-12,
    "Interval 3 deterministic deficit is twenty-five kilowatts"
);


/*
|--------------------------------------------------------------------------
| 3. Interval LOLP
|--------------------------------------------------------------------------
*/

const lolp1 =
    calculateLolp(
        intervals[0]
    );

const lolp2 =
    calculateLolp(
        intervals[1]
    );

const lolp3 =
    calculateLolp(
        intervals[2]
    );


assertEqual(
    lolp1.status,
    LOLP_STATUS
        .CALCULATED,
    "Interval 1 LOLP is calculated"
);


assertEqual(
    lolp2.status,
    LOLP_STATUS
        .CALCULATED,
    "Interval 2 LOLP is calculated"
);


assertEqual(
    lolp3.status,
    LOLP_STATUS
        .CALCULATED,
    "Interval 3 LOLP is calculated"
);


assertClose(
    lolp1.lolp,
    0,
    1e-12,
    "Interval 1 LOLP equals zero"
);


assertClose(
    lolp2.lolp,
    0.30,
    1e-12,
    "Interval 2 LOLP equals 0.30"
);


assertClose(
    lolp3.lolp,
    1,
    1e-12,
    "Interval 3 LOLP equals one"
);


/*
|--------------------------------------------------------------------------
| 4. LOLE across complete horizon
|--------------------------------------------------------------------------
*/

const lole =
    calculateLole({
        intervals,
    });


assertEqual(
    lole.status,
    LOLE_STATUS
        .CALCULATED,
    "Complete synthetic horizon produces calculated LOLE"
);


assertClose(
    lole.evaluatedDurationHours,
    4,
    1e-12,
    "Synthetic adequacy horizon covers four hours"
);


assertClose(
    lole.loleHours,
    2.30,
    1e-12,
    "Synthetic horizon LOLE equals 2.30 expected hours"
);


assertClose(
    lole
        .intervalContributions[0]
        .loleContributionHours,
    0,
    1e-12,
    "Interval 1 contributes zero LOLE hours"
);


assertClose(
    lole
        .intervalContributions[1]
        .loleContributionHours,
    0.30,
    1e-12,
    "Interval 2 contributes 0.30 LOLE hours"
);


assertClose(
    lole
        .intervalContributions[2]
        .loleContributionHours,
    2,
    1e-12,
    "Interval 3 contributes two LOLE hours"
);


/*
|--------------------------------------------------------------------------
| 5. EENS across complete horizon
|--------------------------------------------------------------------------
*/

const eens =
    calculateEens({
        intervals,
    });


assertEqual(
    eens.status,
    EENS_STATUS
        .CALCULATED,
    "Complete synthetic horizon produces calculated EENS"
);


assertClose(
    eens.evaluatedDurationHours,
    4,
    1e-12,
    "EENS evaluates the same four-hour adequacy horizon"
);


assertClose(
    eens.eensKwh,
    59,
    1e-12,
    "Synthetic horizon EENS equals fifty-nine kWh"
);


assertClose(
    eens
        .intervalContributions[0]
        .eensContributionKwh,
    0,
    1e-12,
    "Interval 1 contributes zero EENS"
);


assertClose(
    eens
        .intervalContributions[1]
        .eensContributionKwh,
    9,
    1e-12,
    "Interval 2 contributes nine kWh EENS"
);


assertClose(
    eens
        .intervalContributions[2]
        .eensContributionKwh,
    50,
    1e-12,
    "Interval 3 contributes fifty kWh EENS"
);


/*
|--------------------------------------------------------------------------
| 6. Cross-metric consistency
|--------------------------------------------------------------------------
*/

assertEqual(
    lole.intervalCount,
    eens.intervalCount,
    "LOLE and EENS use the same qualified interval count"
);


assertClose(
    lole.evaluatedDurationHours,
    eens.evaluatedDurationHours,
    1e-12,
    "LOLE and EENS operate over the same evaluation duration"
);


assertClose(
    lolp2.lolp,
    scenarioSet2.lossOfLoadProbability,
    1e-12,
    "LOLP agrees with scenario-set loss-of-load probability"
);


assertClose(
    eens
        .intervalContributions[1]
        .expectedDeficitKw,
    scenarioSet2
        .expectedDeficitKw,
    1e-12,
    "EENS uses the scenario-set expected deficit without reinterpretation"
);


/*
|--------------------------------------------------------------------------
| 7. Expected-value fallacy safeguard
|--------------------------------------------------------------------------
|
| Interval 2:
|
| E[load] = 100 kW
| E[supply] = 105 kW
|
| max(
|   E[load] - E[supply],
|   0
| )
|
| = 0
|
| But:
|
| E[max(load - supply, 0)]
|
| = 9 kW
|
| Therefore EENS = 9 kWh for the interval.
|--------------------------------------------------------------------------
*/

assertClose(
    scenarioSet2.expectedLoadKw,
    100,
    1e-12,
    "Interval 2 expected load equals one hundred kilowatts"
);


assertClose(
    scenarioSet2.expectedAvailableSupplyKw,
    105,
    1e-12,
    "Interval 2 expected available supply equals one hundred five kilowatts"
);


const deficitOfExpectedValues =
    Math.max(
        scenarioSet2
            .expectedLoadKw -
        scenarioSet2
            .expectedAvailableSupplyKw,
        0
    );


assertClose(
    deficitOfExpectedValues,
    0,
    1e-12,
    "Deficit of expected load and expected supply is zero"
);


assertClose(
    scenarioSet2.expectedDeficitKw,
    9,
    1e-12,
    "Expected scenario deficit correctly remains nine kilowatts"
);


assertEqual(
    scenarioSet2.expectedDeficitKw !==
        deficitOfExpectedValues,
    true,
    "Pipeline does not replace expected deficit with deficit of expected values"
);


/*
|--------------------------------------------------------------------------
| 8. Incomplete observability must invalidate downstream metrics
|--------------------------------------------------------------------------
*/

const unobservableIntervals = [
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
                    0,

                loadObserved:
                    true,

                supplyObserved:
                    false,
            },
        ],
    },
];


const unobservableLolp =
    calculateLolp(
        unobservableIntervals[0]
    );

const unobservableLole =
    calculateLole({
        intervals:
            unobservableIntervals,
    });

const unobservableEens =
    calculateEens({
        intervals:
            unobservableIntervals,
    });


assertEqual(
    unobservableLolp.status,
    LOLP_STATUS
        .UNAVAILABLE,
    "Unobservable supply prevents LOLP calculation"
);


assertEqual(
    unobservableLole.status,
    LOLE_STATUS
        .UNAVAILABLE,
    "Unobservable supply prevents LOLE calculation"
);


assertEqual(
    unobservableEens.status,
    EENS_STATUS
        .UNAVAILABLE,
    "Unobservable supply prevents EENS calculation"
);


assertEqual(
    unobservableLolp.lolp,
    null,
    "Missing supply evidence does not fabricate LOLP"
);


assertEqual(
    unobservableLole.loleHours,
    null,
    "Missing supply evidence does not fabricate LOLE"
);


assertEqual(
    unobservableEens.eensKwh,
    null,
    "Missing supply evidence does not fabricate EENS"
);


/*
|--------------------------------------------------------------------------
| 9. Empty horizon safeguard
|--------------------------------------------------------------------------
*/

const emptyLole =
    calculateLole({
        intervals: [],
    });

const emptyEens =
    calculateEens({
        intervals: [],
    });


assertEqual(
    emptyLole.status,
    LOLE_STATUS
        .UNAVAILABLE,
    "Empty horizon does not calculate LOLE"
);


assertEqual(
    emptyEens.status,
    EENS_STATUS
        .UNAVAILABLE,
    "Empty horizon does not calculate EENS"
);


assertEqual(
    emptyLole.loleHours,
    null,
    "Empty horizon does not become zero LOLE"
);


assertEqual(
    emptyEens.eensKwh,
    null,
    "Empty horizon does not become zero EENS"
);


/*
|--------------------------------------------------------------------------
| 10. Semantic boundaries
|--------------------------------------------------------------------------
*/

assertEqual(
    lolp2
        .semanticBoundary
        .isSaifi,
    false,
    "LOLP remains semantically distinct from SAIFI"
);


assertEqual(
    lole
        .semanticBoundary
        .isSaidi,
    false,
    "LOLE remains semantically distinct from SAIDI"
);


assertEqual(
    eens
        .semanticBoundary
        .isHistoricalEns,
    false,
    "EENS remains semantically distinct from historical ENS"
);


assertEqual(
    lolp2
        .semanticBoundary
        .monitoringStatusUsed,
    false,
    "LOLP pipeline does not use monitoring status"
);


assertEqual(
    eens
        .semanticBoundary
        .genericOutageEventsUsed,
    false,
    "EENS pipeline does not substitute generic outage events for adequacy states"
);


/*
|--------------------------------------------------------------------------
| Final summary
|--------------------------------------------------------------------------
*/

console.log("");

console.log(
    "================================================"
);

console.log(
    "ADEQUACY RELIABILITY PIPELINE VALIDATION PASSED"
);

console.log(
    "================================================"
);

console.log("");

console.log(
    "Synthetic end-to-end result:"
);

console.log(
    "- evaluated horizon: 4 hours"
);

console.log(
    "- interval LOLP values: 0.00, 0.30, 1.00"
);

console.log(
    "- LOLE: 2.30 expected hours"
);

console.log(
    "- EENS: 59 kWh"
);

console.log("");

console.log(
    "Validated engineering semantics:"
);

console.log(
    "- adequacy-state qualification precedes probabilistic reliability metrics"
);

console.log(
    "- scenario probabilities determine interval LOLP"
);

console.log(
    "- LOLE integrates interval LOLP over time"
);

console.log(
    "- EENS integrates probability-weighted power deficit over time"
);

console.log(
    "- expected deficit is not replaced by deficit of expected values"
);

console.log(
    "- deterministic and probabilistic intervals coexist safely within one horizon"
);

console.log(
    "- missing observability propagates to unavailable metrics rather than fabricated zeros"
);

console.log(
    "- empty horizons do not imply perfect reliability"
);

console.log(
    "- LOLP, LOLE and EENS remain distinct from SAIFI, SAIDI, historical ENS and monitoring availability"
);