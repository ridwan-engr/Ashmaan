// backend/scripts/validateLoleCalculation.js

import {
    LOLE_STATUS,
    LOLE_REASON,
    calculateLole,
} from "../services/reliability/loleCalculationService.js";


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
    "ASHMAAN LOLE VALIDATION"
);

console.log(
    "=========================================="
);

console.log("");


/*
|--------------------------------------------------------------------------
| 1. Three one-hour deterministic/probabilistic intervals
|--------------------------------------------------------------------------
|
| Interval 1:
| LOLP = 0
| duration = 1h
| contribution = 0h
|
| Interval 2:
| LOLP = 0.30
| duration = 1h
| contribution = 0.30h
|
| Interval 3:
| LOLP = 1
| duration = 1h
| contribution = 1h
|
| LOLE = 1.30h
|--------------------------------------------------------------------------
*/

const mixedHorizon =
    calculateLole({
        intervals: [

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
                    },
                ],
            },


            /*
            |--------------------------------------------------------------------------
            | Interval 2 — probabilistic, LOLP = 0.30
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

                        metadata: {
                            scenarioId:
                                "SEVERE",
                        },
                    },
                ],
            },


            /*
            |--------------------------------------------------------------------------
            | Interval 3 — deterministic inadequate
            |--------------------------------------------------------------------------
            */

            {
                states: [
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
                    },
                ],
            },
        ],
    });


assertEqual(
    mixedHorizon.status,
    LOLE_STATUS
        .CALCULATED,
    "Qualified adequacy horizon produces calculated LOLE"
);


assertClose(
    mixedHorizon.loleHours,
    1.30,
    1e-12,
    "LOLE equals sum of LOLP multiplied by interval duration"
);


assertClose(
    mixedHorizon.evaluatedDurationHours,
    3,
    1e-12,
    "Three one-hour adequacy intervals produce three evaluated hours"
);


assertEqual(
    mixedHorizon.intervalCount,
    3,
    "LOLE preserves all three qualified intervals"
);


assertClose(
    mixedHorizon
        .intervalContributions[0]
        .loleContributionHours,
    0,
    1e-12,
    "Adequate deterministic interval contributes zero LOLE hours"
);


assertClose(
    mixedHorizon
        .intervalContributions[1]
        .loleContributionHours,
    0.30,
    1e-12,
    "Thirty-percent LOLP over one hour contributes 0.30 expected hours"
);


assertClose(
    mixedHorizon
        .intervalContributions[2]
        .loleContributionHours,
    1,
    1e-12,
    "Certain loss of load over one hour contributes one expected hour"
);


/*
|--------------------------------------------------------------------------
| 2. Interval duration scaling
|--------------------------------------------------------------------------
|
| LOLP = 0.25
| duration = 4h
|
| contribution = 1 expected hour
|--------------------------------------------------------------------------
*/

const durationScaling =
    calculateLole({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-02T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-02T04:00:00.000Z",

                        loadKw:
                            100,

                        availableSupplyKw:
                            120,

                        loadObserved:
                            true,

                        supplyObserved:
                            true,

                        probability:
                            0.75,

                        metadata: {
                            scenarioId:
                                "ADEQUATE",
                        },
                    },

                    {
                        intervalStart:
                            "2026-09-02T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-02T04:00:00.000Z",

                        loadKw:
                            100,

                        availableSupplyKw:
                            50,

                        loadObserved:
                            true,

                        supplyObserved:
                            true,

                        probability:
                            0.25,

                        metadata: {
                            scenarioId:
                                "DEFICIT",
                        },
                    },
                ],
            },
        ],
    });


assertClose(
    durationScaling.loleHours,
    1,
    1e-12,
    "LOLP 0.25 over four hours produces one expected loss-of-load hour"
);


/*
|--------------------------------------------------------------------------
| 3. Completely adequate horizon
|--------------------------------------------------------------------------
*/

const fullyAdequate =
    calculateLole({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-03T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-03T01:00:00.000Z",

                        loadKw:
                            50,

                        availableSupplyKw:
                            70,

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
                            "2026-09-03T02:00:00.000Z",

                        loadKw:
                            60,

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
    fullyAdequate.status,
    LOLE_STATUS
        .CALCULATED,
    "Completely observed adequate horizon remains calculable"
);


assertEqual(
    fullyAdequate.loleHours,
    0,
    "Completely adequate observed horizon produces LOLE zero"
);


/*
|--------------------------------------------------------------------------
| 4. Empty horizon
|--------------------------------------------------------------------------
*/

const empty =
    calculateLole({
        intervals: [],
    });


assertEqual(
    empty.status,
    LOLE_STATUS
        .UNAVAILABLE,
    "Empty adequacy horizon leaves LOLE unavailable"
);


assertEqual(
    empty.reason,
    LOLE_REASON
        .NO_INTERVALS,
    "Empty adequacy horizon is not interpreted as zero LOLE"
);


assertEqual(
    empty.loleHours,
    null,
    "Missing adequacy evidence does not fabricate LOLE zero"
);


/*
|--------------------------------------------------------------------------
| 5. One unobservable interval blocks complete-horizon LOLE
|--------------------------------------------------------------------------
*/

const incompleteObservability =
    calculateLole({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-04T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-04T01:00:00.000Z",

                        loadKw:
                            50,

                        availableSupplyKw:
                            60,

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
                            "2026-09-04T01:00:00.000Z",

                        intervalEnd:
                            "2026-09-04T02:00:00.000Z",

                        loadKw:
                            50,

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
    incompleteObservability.status,
    LOLE_STATUS
        .UNAVAILABLE,
    "Unobservable interval blocks complete-horizon LOLE"
);


assertEqual(
    incompleteObservability.reason,
    LOLE_REASON
        .LOLP_UNAVAILABLE,
    "Unavailable interval LOLP propagates to unavailable LOLE"
);


assertEqual(
    incompleteObservability.loleHours,
    null,
    "Incomplete horizon does not produce biased partial LOLE"
);


/*
|--------------------------------------------------------------------------
| 6. Overlapping intervals
|--------------------------------------------------------------------------
*/

const overlapping =
    calculateLole({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-05T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-05T02:00:00.000Z",

                        loadKw:
                            50,

                        availableSupplyKw:
                            100,

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
                            "2026-09-05T01:00:00.000Z",

                        intervalEnd:
                            "2026-09-05T03:00:00.000Z",

                        loadKw:
                            50,

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
    overlapping.status,
    LOLE_STATUS
        .UNAVAILABLE,
    "Overlapping adequacy intervals block LOLE"
);


assertEqual(
    overlapping.reason,
    LOLE_REASON
        .OVERLAPPING_INTERVALS,
    "Overlapping intervals are explicitly identified"
);


/*
|--------------------------------------------------------------------------
| 7. Touching intervals are valid
|--------------------------------------------------------------------------
*/

const touching =
    calculateLole({
        intervals: [
            {
                states: [
                    {
                        intervalStart:
                            "2026-09-06T00:00:00.000Z",

                        intervalEnd:
                            "2026-09-06T01:00:00.000Z",

                        loadKw:
                            100,

                        availableSupplyKw:
                            50,

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
                            "2026-09-06T02:00:00.000Z",

                        loadKw:
                            100,

                        availableSupplyKw:
                            50,

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
    LOLE_STATUS
        .CALCULATED,
    "Touching non-overlapping adequacy intervals are accepted"
);


assertEqual(
    touching.loleHours,
    2,
    "Two consecutive certain-loss intervals produce two LOLE hours"
);


/*
|--------------------------------------------------------------------------
| 8. Semantic separation
|--------------------------------------------------------------------------
*/

assertEqual(
    mixedHorizon
        .semanticBoundary
        .isSaidi,
    false,
    "LOLE remains distinct from SAIDI"
);


assertEqual(
    mixedHorizon
        .semanticBoundary
        .isObservedOutageDuration,
    false,
    "LOLE remains distinct from observed outage duration"
);


assertEqual(
    mixedHorizon
        .semanticBoundary
        .isEquipmentDowntime,
    false,
    "LOLE remains distinct from equipment downtime"
);


assertEqual(
    mixedHorizon
        .semanticBoundary
        .isMonitoringUnavailability,
    false,
    "Monitoring unavailability is not LOLE"
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
    "LOLE VALIDATION PASSED"
);

console.log(
    "=========================================="
);

console.log("");

console.log(
    "Validated engineering semantics:"
);

console.log(
    "- LOLE equals the sum of interval LOLP multiplied by interval duration"
);

console.log(
    "- LOLE is expressed as expected loss-of-load hours over the evaluated horizon"
);

console.log(
    "- deterministic and probabilistic adequacy intervals can contribute to one horizon"
);

console.log(
    "- unavailable interval LOLP blocks complete-horizon LOLE"
);

console.log(
    "- overlapping adequacy intervals are rejected to prevent time double-counting"
);

console.log(
    "- touching consecutive intervals are valid"
);

console.log(
    "- a fully observed adequate horizon may legitimately produce LOLE zero"
);

console.log(
    "- an empty or unobservable horizon does not become LOLE zero"
);

console.log(
    "- LOLE is not SAIDI, outage duration, equipment downtime or monitoring unavailability"
);