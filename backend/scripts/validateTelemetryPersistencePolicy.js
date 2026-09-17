import {
    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS,
    getRecordVrmAttributeId,
    isHistoricalTelemetryAllowed,
    HISTORICAL_ANALYTICS_REQUIRED_ATTRIBUTE_IDS,
    HISTORICAL_OPERATIONAL_ATTRIBUTE_IDS,
} from "../services/sync/telemetryPersistencePolicy.js";


console.log(`
==================================================
ASHMAAN TELEMETRY PERSISTENCE POLICY VALIDATION
READ-ONLY — NO DATABASE CONNECTION OR MODIFICATION
==================================================
`);


let passed = 0;
let failed = 0;


const assert = (
    condition,
    description
) => {
    if (condition) {
        passed += 1;

        console.log(
            `PASS ${passed + failed}: ${description}`
        );

        return;
    }

    failed += 1;

    console.error(
        `FAIL ${passed + failed}: ${description}`
    );
};


const makeRecord = (
    idDataAttribute,
    rawValue = 1,
    extra = {}
) => ({
    idDataAttribute,
    rawValue,

    timestamp:
        1789549200,

    Device:
        "System overview",

    instance:
        0,

    ...extra,
});


/*
|--------------------------------------------------------------------------
| 1. Authoritative attribute identifier
|--------------------------------------------------------------------------
*/

assert(
    getRecordVrmAttributeId({
        idDataAttribute: 131,
    }) === 131,

    "idDataAttribute is authoritative"
);


assert(
    getRecordVrmAttributeId({
        vrmAttributeId: 131,
    }) === null,

    "vrmAttributeId fallback is rejected"
);


assert(
    getRecordVrmAttributeId({
        attributeId: 131,
    }) === null,

    "attributeId fallback is rejected"
);


assert(
    getRecordVrmAttributeId({
        id: 131,
    }) === null,

    "generic id fallback is rejected"
);


/*
|--------------------------------------------------------------------------
| 2. Missing / malformed identifier handling
|--------------------------------------------------------------------------
*/

assert(
    getRecordVrmAttributeId({}) ===
        null,

    "missing attribute ID is rejected"
);


assert(
    getRecordVrmAttributeId({
        idDataAttribute: null,
    }) === null,

    "null attribute ID is rejected"
);


assert(
    getRecordVrmAttributeId({
        idDataAttribute: "",
    }) === null,

    "empty attribute ID is rejected"
);


assert(
    getRecordVrmAttributeId({
        idDataAttribute:
            "not-a-number",
    }) === null,

    "malformed attribute ID is rejected"
);


assert(
    getRecordVrmAttributeId({
        idDataAttribute:
            "131",
    }) === 131,

    "numeric-string idDataAttribute is accepted"
);


/*
|--------------------------------------------------------------------------
| 3. Zero-value invariant
|--------------------------------------------------------------------------
|
| The persistence policy operates on attribute identity.
|
| rawValue === 0 must therefore not cause a valid telemetry attribute
| to be rejected.
|
*/

assert(
    isHistoricalTelemetryAllowed(
        makeRecord(
            131,
            0
        )
    ) === true,

    "observed zero value remains eligible telemetry"
);


/*
|--------------------------------------------------------------------------
| 4. Representative engineering attributes
|--------------------------------------------------------------------------
*/

assert(
    isHistoricalTelemetryAllowed(
        makeRecord(131)
    ) === true,

    "AC Consumption L1 attribute 131 is accepted"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(137)
    ) === true,

    "generator overview power attribute 137 is accepted"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(428)
    ) === true,

    "dedicated generator power attribute 428 is accepted"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(834)
    ) === true,

    "grid L1 voltage attribute 834 is accepted"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(39)
    ) === true,

    "battery SOC attribute 39 is accepted"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(471)
    ) === true,

    "active-source attribute 471 is accepted"
);


/*
|--------------------------------------------------------------------------
| 5. High-volume non-engineering diagnostics
|--------------------------------------------------------------------------
|
| These attributes were observed in the telemetry-growth investigation.
|
| They must not enter the long-term RAW engineering telemetry collection
| merely because VRM /diagnostics returns them.
|
*/

assert(
    isHistoricalTelemetryAllowed(
        makeRecord(148)
    ) === false,

    "Remote IP attribute 148 is rejected"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(216)
    ) === false,

    "VRM Log time offset attribute 216 is rejected"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(470)
    ) === false,

    "Hung processes attribute 470 is rejected"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(479)
    ) === false,

    "Zombie processes attribute 479 is rejected"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(577)
    ) === false,

    "D-Bus round-trip-time attribute 577 is rejected"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(1272)
    ) === false,

    "DESS schedule-state attribute 1272 is rejected"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(1290)
    ) === false,

    "DESS error-code attribute 1290 is rejected"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(1773)
    ) === false,

    "DESS reactive-strategy attribute 1773 is rejected"
);


assert(
    isHistoricalTelemetryAllowed(
        makeRecord(1774)
    ) === false,

    "DESS charge-rate attribute 1774 is rejected"
);


/*
|--------------------------------------------------------------------------
| 6. Unknown attribute
|--------------------------------------------------------------------------
*/

assert(
    isHistoricalTelemetryAllowed(
        makeRecord(999999)
    ) === false,

    "unknown attribute is rejected"
);


/*
|--------------------------------------------------------------------------
| 7. Allowlist integrity
|--------------------------------------------------------------------------
*/

const policyIds =
    [
        ...HISTORICAL_TELEMETRY_ATTRIBUTE_IDS,
    ];


assert(
    policyIds.length > 0,

    "historical telemetry allowlist is not empty"
);


assert(
    policyIds.every(
        (value) =>
            Number.isInteger(value) &&
            value >= 0
    ),

    "all allowlisted attribute IDs are non-negative integers"
);


assert(
    new Set(
        policyIds
    ).size ===
        policyIds.length,

    "historical telemetry allowlist contains no duplicate IDs"
);


/*
|--------------------------------------------------------------------------
| 8. Fail-closed policy
|--------------------------------------------------------------------------
*/

assert(
    isHistoricalTelemetryAllowed(
        null
    ) === false,

    "null record fails closed"
);


assert(
    isHistoricalTelemetryAllowed(
        {}
    ) === false,

    "empty record fails closed"
);


assert(
    isHistoricalTelemetryAllowed({
        parameter:
            "AC Consumption L1",

        description:
            "AC Consumption L1",

        rawValue:
            1000,
    }) === false,

    "parameter/description names cannot infer attribute identity"
);

/*
|--------------------------------------------------------------------------
| 9. Reviewed historical persistence layers
|--------------------------------------------------------------------------
*/

assert(
    [
        ...HISTORICAL_ANALYTICS_REQUIRED_ATTRIBUTE_IDS,
    ].every(
        (id) =>
            HISTORICAL_TELEMETRY_ATTRIBUTE_IDS.has(id)
    ),

    "all mandatory analytics attributes are persisted"
);


assert(
    [
        ...HISTORICAL_OPERATIONAL_ATTRIBUTE_IDS,
    ].every(
        (id) =>
            HISTORICAL_TELEMETRY_ATTRIBUTE_IDS.has(id)
    ),

    "all reviewed operational attributes are persisted"
);


assert(
    [
        ...HISTORICAL_ANALYTICS_REQUIRED_ATTRIBUTE_IDS,
    ].every(
        (id) =>
            !HISTORICAL_OPERATIONAL_ATTRIBUTE_IDS.has(id)
    ),

    "analytics and operational policy layers are disjoint"
);


const reviewedHistoricalPolicyUnion =
    new Set([
        ...HISTORICAL_ANALYTICS_REQUIRED_ATTRIBUTE_IDS,
        ...HISTORICAL_OPERATIONAL_ATTRIBUTE_IDS,
    ]);


assert(
    HISTORICAL_TELEMETRY_ATTRIBUTE_IDS.size ===
        reviewedHistoricalPolicyUnion.size &&
    [
        ...HISTORICAL_TELEMETRY_ATTRIBUTE_IDS,
    ].every(
        (id) =>
            reviewedHistoricalPolicyUnion.has(id)
    ),

    "canonical persistence policy exactly equals reviewed layer union"
);

/*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
*/

const total =
    passed +
    failed;


console.log(`
==================================================
VALIDATION SUMMARY
==================================================

Total : ${total}
Passed: ${passed}
Failed: ${failed}
`);


if (failed > 0) {
    console.error(
        "OVERALL RESULT: FAIL"
    );

    process.exitCode = 1;
} else {
    console.log(
        "OVERALL RESULT: PASS"
    );
}