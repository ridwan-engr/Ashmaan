// backend/scripts/validateAdequacyState.js

import {
    ADEQUACY_STATE_STATUS,
    ADEQUACY_STATE_REASON,
    evaluateAdequacyState,
    evaluateAdequacyStates,
} from "../services/reliability/adequacyStateService.js";


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
    "ASHMAAN ADEQUACY-STATE VALIDATION"
);

console.log(
    "=========================================="
);

console.log("");


/*
|--------------------------------------------------------------------------
| 1. Adequate deterministic state
|--------------------------------------------------------------------------
*/

const adequate =
    evaluateAdequacyState({
        installationId:
            "SITE-001",

        reliabilityKey:
            "SYSTEM:SITE-001",

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
            "SYNTHETIC",
    });


assertEqual(
    adequate.status,
    ADEQUACY_STATE_STATUS
        .VALID,
    "Adequate deterministic state is valid"
);


assertEqual(
    adequate.adequate,
    true,
    "Available supply above load is adequate"
);


assertEqual(
    adequate.lossOfLoad,
    false,
    "Adequate state does not indicate loss of load"
);


assertEqual(
    adequate.deficitKw,
    0,
    "Adequate state has zero power deficit"
);


assertEqual(
    adequate.probabilistic,
    false,
    "Missing probability means deterministic state"
);


assertClose(
    adequate.durationHours,
    1,
    1e-12,
    "Adequate state interval equals one hour"
);


/*
|--------------------------------------------------------------------------
| 2. Inadequate deterministic state
|--------------------------------------------------------------------------
*/

const inadequate =
    evaluateAdequacyState({
        intervalStart:
            "2026-09-01T01:00:00.000Z",

        intervalEnd:
            "2026-09-01T02:00:00.000Z",

        loadKw:
            100,

        availableSupplyKw:
            70,

        loadObserved:
            true,

        supplyObserved:
            true,
    });


assertEqual(
    inadequate.status,
    "VALID",
    "Inadequate state is still a valid observed adequacy state"
);


assertEqual(
    inadequate.adequate,
    false,
    "Available supply below load is inadequate"
);


assertEqual(
    inadequate.lossOfLoad,
    true,
    "Inadequate state indicates loss of load"
);


assertEqual(
    inadequate.deficitKw,
    30,
    "Power deficit equals load minus available supply"
);


/*
|--------------------------------------------------------------------------
| 3. Exact balance
|--------------------------------------------------------------------------
*/

const balanced =
    evaluateAdequacyState({
        intervalStart:
            "2026-09-01T02:00:00.000Z",

        intervalEnd:
            "2026-09-01T03:00:00.000Z",

        loadKw:
            50,

        availableSupplyKw:
            50,

        loadObserved:
            true,

        supplyObserved:
            true,
    });


assertEqual(
    balanced.adequate,
    true,
    "Supply exactly equal to load is adequate"
);


assertEqual(
    balanced.deficitKw,
    0,
    "Exact load-supply balance has zero deficit"
);


/*
|--------------------------------------------------------------------------
| 4. Probabilistic state
|--------------------------------------------------------------------------
*/

const probabilistic =
    evaluateAdequacyState({
        intervalStart:
            "2026-09-01T03:00:00.000Z",

        intervalEnd:
            "2026-09-01T04:00:00.000Z",

        loadKw:
            100,

        availableSupplyKw:
            60,

        loadObserved:
            true,

        supplyObserved:
            true,

        probability:
            0.15,
    });


assertEqual(
    probabilistic.valid,
    true,
    "Valid probabilistic state is accepted"
);


assertEqual(
    probabilistic.probabilistic,
    true,
    "Probability marks state as probabilistic"
);


assertClose(
    probabilistic.probability,
    0.15,
    1e-12,
    "Scenario probability is preserved"
);


/*
|--------------------------------------------------------------------------
| 5. Invalid probability
|--------------------------------------------------------------------------
*/

const invalidProbability =
    evaluateAdequacyState({
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
            1.2,
    });


assertEqual(
    invalidProbability.reason,
    ADEQUACY_STATE_REASON
        .INVALID_PROBABILITY,
    "Probability above one is rejected"
);


/*
|--------------------------------------------------------------------------
| 6. Missing load observability
|--------------------------------------------------------------------------
*/

const loadUnobservable =
    evaluateAdequacyState({
        intervalStart:
            "2026-09-01T05:00:00.000Z",

        intervalEnd:
            "2026-09-01T06:00:00.000Z",

        loadKw:
            0,

        availableSupplyKw:
            100,

        loadObserved:
            false,

        supplyObserved:
            true,
    });


assertEqual(
    loadUnobservable.status,
    ADEQUACY_STATE_STATUS
        .UNOBSERVABLE,
    "Unobserved load produces unobservable state"
);


assertEqual(
    loadUnobservable.reason,
    ADEQUACY_STATE_REASON
        .LOAD_NOT_OBSERVED,
    "Zero-valued load is not accepted when load observability is absent"
);


/*
|--------------------------------------------------------------------------
| 7. Missing supply observability
|--------------------------------------------------------------------------
*/

const supplyUnobservable =
    evaluateAdequacyState({
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
    });


assertEqual(
    supplyUnobservable.status,
    ADEQUACY_STATE_STATUS
        .UNOBSERVABLE,
    "Unobserved supply produces unobservable state"
);


assertEqual(
    supplyUnobservable.reason,
    ADEQUACY_STATE_REASON
        .SUPPLY_NOT_OBSERVED,
    "Supply zero is not interpreted as unavailable generation without observability"
);


/*
|--------------------------------------------------------------------------
| 8. Negative load
|--------------------------------------------------------------------------
*/

const negativeLoad =
    evaluateAdequacyState({
        intervalStart:
            "2026-09-01T07:00:00.000Z",

        intervalEnd:
            "2026-09-01T08:00:00.000Z",

        loadKw:
            -10,

        availableSupplyKw:
            50,

        loadObserved:
            true,

        supplyObserved:
            true,
    });


assertEqual(
    negativeLoad.reason,
    ADEQUACY_STATE_REASON
        .INVALID_LOAD,
    "Negative load is rejected"
);


/*
|--------------------------------------------------------------------------
| 9. Negative supply
|--------------------------------------------------------------------------
*/

const negativeSupply =
    evaluateAdequacyState({
        intervalStart:
            "2026-09-01T08:00:00.000Z",

        intervalEnd:
            "2026-09-01T09:00:00.000Z",

        loadKw:
            20,

        availableSupplyKw:
            -5,

        loadObserved:
            true,

        supplyObserved:
            true,
    });


assertEqual(
    negativeSupply.reason,
    ADEQUACY_STATE_REASON
        .INVALID_AVAILABLE_SUPPLY,
    "Negative available supply is rejected"
);


/*
|--------------------------------------------------------------------------
| 10. Invalid interval
|--------------------------------------------------------------------------
*/

const invalidInterval =
    evaluateAdequacyState({
        intervalStart:
            "2026-09-01T10:00:00.000Z",

        intervalEnd:
            "2026-09-01T09:00:00.000Z",

        loadKw:
            10,

        availableSupplyKw:
            10,

        loadObserved:
            true,

        supplyObserved:
            true,
    });


assertEqual(
    invalidInterval.reason,
    ADEQUACY_STATE_REASON
        .INVALID_INTERVAL,
    "Non-positive interval duration is rejected"
);


/*
|--------------------------------------------------------------------------
| 11. Collection evaluation
|--------------------------------------------------------------------------
*/

const collection =
    evaluateAdequacyStates([
        {
            intervalStart:
                "2026-09-02T00:00:00.000Z",

            intervalEnd:
                "2026-09-02T01:00:00.000Z",

            loadKw:
                80,

            availableSupplyKw:
                100,

            loadObserved:
                true,

            supplyObserved:
                true,
        },

        {
            intervalStart:
                "2026-09-02T01:00:00.000Z",

            intervalEnd:
                "2026-09-02T02:00:00.000Z",

            loadKw:
                100,

            availableSupplyKw:
                60,

            loadObserved:
                true,

            supplyObserved:
                true,
        },

        {
            intervalStart:
                "2026-09-02T02:00:00.000Z",

            intervalEnd:
                "2026-09-02T03:00:00.000Z",

            loadKw:
                90,

            availableSupplyKw:
                0,

            loadObserved:
                true,

            supplyObserved:
                false,
        },
    ]);


assertEqual(
    collection.totalStateCount,
    3,
    "Collection evaluates all adequacy states"
);


assertEqual(
    collection.validStateCount,
    2,
    "Two observable valid adequacy states remain"
);


assertEqual(
    collection.invalidStateCount,
    1,
    "One unobservable state is excluded from valid adequacy states"
);


assertEqual(
    collection.adequateStateCount,
    1,
    "One valid state is adequate"
);


assertEqual(
    collection.inadequateStateCount,
    1,
    "One valid state is inadequate"
);


assertEqual(
    collection.rejectionCounts
        .SUPPLY_NOT_OBSERVED,
    1,
    "Unobservable supply is represented in rejection counts"
);


/*
|--------------------------------------------------------------------------
| Semantic safeguards
|--------------------------------------------------------------------------
*/

assertEqual(
    loadUnobservable.valid,
    false,
    "Monitoring uncertainty never becomes valid adequacy evidence"
);


assertEqual(
    supplyUnobservable.lossOfLoad,
    undefined,
    "Unobserved supply does not fabricate a loss-of-load event"
);


console.log("");

console.log(
    "=========================================="
);

console.log(
    "ADEQUACY-STATE VALIDATION PASSED"
);

console.log(
    "=========================================="
);

console.log("");

console.log(
    "Validated engineering semantics:"
);

console.log(
    "- adequacy requires explicit load and available-supply evidence"
);

console.log(
    "- available supply >= load is adequate"
);

console.log(
    "- available supply < load creates a positive deficit"
);

console.log(
    "- missing observability is not interpreted as zero load or zero supply"
);

console.log(
    "- deterministic and probabilistic adequacy states remain distinguishable"
);

console.log(
    "- scenario probability must lie within [0, 1]"
);

console.log(
    "- monitoring state and generic outage state are not adequacy evidence"
);

console.log(
    "- LOLP, LOLE and EENS are not calculated at this layer"
);