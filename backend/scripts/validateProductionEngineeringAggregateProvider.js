import assert from "node:assert/strict";

import {
    PRODUCTION_ENGINEERING_FAMILY_KEYS,
    createEmptyEngineeringFamilies,
    createProductionEngineeringAggregate,
} from "../services/engineering/productionEngineeringAggregateProvider.js";

import {
    ENGINEERING_ANALYTICS_SCOPE_STATUS,
} from "../services/security/engineeringAnalyticsScopeService.js";


let count = 0;

function pass(message) {
    count += 1;
    console.log(`PASS ${count}: ${message}`);
}

function equal(actual, expected, message) {
    assert.equal(actual, expected);
    pass(message);
}

function deepEqual(actual, expected, message) {
    assert.deepEqual(actual, expected);
    pass(message);
}

async function rejects(fn, predicate, message) {
    await assert.rejects(fn, predicate);
    pass(message);
}


/*
|--------------------------------------------------------------------------
| 1. Canonical Phase 8.8 family contract
|--------------------------------------------------------------------------
*/

deepEqual(
    PRODUCTION_ENGINEERING_FAMILY_KEYS,
    [
        "siteElectrical",
        "energySource",
        "battery",
        "generator",
        "grid",
        "solar",
    ],
    "provider exposes exactly the six Phase 8.8 families"
);


const emptyFamilies =
    createEmptyEngineeringFamilies();

for (
    const family
    of PRODUCTION_ENGINEERING_FAMILY_KEYS
) {
    equal(
        emptyFamilies[family],
        null,
        `${family} is null when explicitly absent`
    );
}

equal(
    Object.isFrozen(emptyFamilies),
    true,
    "empty family contract is frozen"
);


/*
|--------------------------------------------------------------------------
| 2. Production loader is mandatory
|--------------------------------------------------------------------------
*/

await rejects(
    () =>
        createProductionEngineeringAggregate({
            userId: "user",

            reportingWindow: {
                start: "2026-09-21T00:00:00.000Z",
                end: "2026-09-22T00:00:00.000Z",
                semantics: "[start,end)",
            },
        }),

    (error) =>
        error?.statusCode === 503 &&
        error?.code ===
            "ENGINEERING_AGGREGATE_PROVIDER_UNAVAILABLE",

    "provider fails closed when site-family loader is absent"
);


/*
|--------------------------------------------------------------------------
| 3. Authorization DENY
|--------------------------------------------------------------------------
*/

await rejects(
    () =>
        createProductionEngineeringAggregate({
            userId: "user",

            reportingWindow: {},

            resolveEngineeringScope:
                async () => ({
                    status:
                        ENGINEERING_ANALYTICS_SCOPE_STATUS.DENY,

                    allowed: false,

                    installations: [],
                }),

            siteFamilyLoader:
                async () =>
                    createEmptyEngineeringFamilies(),
        }),

    (error) =>
        error?.statusCode === 403 &&
        error?.code ===
            "ENGINEERING_RESOURCE_ACCESS_DENIED",

    "authorization DENY fails closed with 403"
);


/*
|--------------------------------------------------------------------------
| 4. Authorization scope unavailable
|--------------------------------------------------------------------------
*/

await rejects(
    () =>
        createProductionEngineeringAggregate({
            userId: "user",

            reportingWindow: {},

            resolveEngineeringScope:
                async () => ({
                    status:
                        ENGINEERING_ANALYTICS_SCOPE_STATUS.UNAVAILABLE,

                    allowed: false,

                    installations: [],
                }),

            siteFamilyLoader:
                async () =>
                    createEmptyEngineeringFamilies(),
        }),

    (error) =>
        error?.statusCode === 503 &&
        error?.code ===
            "ENGINEERING_AGGREGATE_PROVIDER_UNAVAILABLE",

    "unavailable authorization scope fails closed with 503"
);


/*
|--------------------------------------------------------------------------
| 5. Empty entitlement is empty fleet, never unrestricted
|--------------------------------------------------------------------------
*/

{
    let loaderCalls = 0;
    let aggregateArgs = null;

    const reportingWindow =
        Object.freeze({
            start: "2026-09-21T00:00:00.000Z",
            end: "2026-09-22T00:00:00.000Z",
            semantics: "[start,end)",
        });

    const expected =
        Object.freeze({
            status: "EMPTY_FLEET_TEST",
        });

    const result =
        await createProductionEngineeringAggregate({
            userId: "user",

            reportingWindow,

            resolveEngineeringScope:
                async () => ({
                    status:
                        ENGINEERING_ANALYTICS_SCOPE_STATUS.RESOLVED,

                    allowed: true,

                    installations: [],
                }),

            siteFamilyLoader:
                async () => {
                    loaderCalls += 1;

                    return createEmptyEngineeringFamilies();
                },

            fleetAggregator:
                (args) => {
                    aggregateArgs = args;
                    return expected;
                },
        });

    equal(
        result,
        expected,
        "empty entitlement returns fleet aggregator result unchanged"
    );

    equal(
        loaderCalls,
        0,
        "empty entitlement invokes no site-family loader"
    );

    deepEqual(
        aggregateArgs.sites,
        [],
        "empty entitlement passes exactly sites=[]"
    );

    equal(
        aggregateArgs.reportingWindow,
        reportingWindow,
        "empty entitlement preserves reporting window by reference"
    );
}


/*
|--------------------------------------------------------------------------
| 6. Authorized site composition
|--------------------------------------------------------------------------
*/

{
    const installation =
        Object.freeze({
            _id: "installation-a",
            vrmSiteId: "18053",
        });

    const solar =
        Object.freeze({
            status: "AVAILABLE",
        });

    const reportingWindow =
        Object.freeze({
            start: "2026-09-21T00:00:00.000Z",
            end: "2026-09-22T00:00:00.000Z",
            semantics: "[start,end)",
        });

    let loaderArgs = null;
    let aggregateArgs = null;

    const expected =
        Object.freeze({
            status: "AGGREGATED_TEST",
        });

    const result =
        await createProductionEngineeringAggregate({
            userId: "user",

            reportingWindow,

            resolveEngineeringScope:
                async () => ({
                    status:
                        ENGINEERING_ANALYTICS_SCOPE_STATUS.RESOLVED,

                    allowed: true,

                    installations: [
                        {
                            installationId:
                                "installation-a",

                            vrmSiteId:
                                "18053",

                            installation,
                        },
                    ],
                }),

            siteFamilyLoader:
                async (args) => {
                    loaderArgs = args;

                    return {
                        solar,
                    };
                },

            fleetAggregator:
                (args) => {
                    aggregateArgs = args;
                    return expected;
                },
        });

    equal(
        result,
        expected,
        "provider returns aggregate result unchanged"
    );

    equal(
        loaderArgs.installation,
        installation,
        "authorized Installation object is preserved"
    );

    equal(
        loaderArgs.installationId,
        "installation-a",
        "authorized Installation._id is preserved"
    );

    equal(
        loaderArgs.vrmSiteId,
        "18053",
        "authorized vrmSiteId is preserved"
    );

    equal(
        loaderArgs.reportingWindow,
        reportingWindow,
        "site-family loader receives exact reporting window"
    );

    equal(
        aggregateArgs.sites.length,
        1,
        "aggregator receives exactly one authorized site"
    );

    equal(
        aggregateArgs.sites[0].installation,
        installation,
        "Phase 8.8 receives Installation object by reference"
    );

    equal(
        aggregateArgs.sites[0].families.solar,
        solar,
        "Solar result is preserved by reference"
    );

    equal(
        aggregateArgs.sites[0].families.siteElectrical,
        null,
        "missing siteElectrical remains null"
    );

    equal(
        aggregateArgs.sites[0].families.energySource,
        null,
        "missing energySource remains null"
    );

    equal(
        aggregateArgs.sites[0].families.battery,
        null,
        "missing battery remains null"
    );

    equal(
        aggregateArgs.sites[0].families.generator,
        null,
        "missing generator remains null"
    );

    equal(
        aggregateArgs.sites[0].families.grid,
        null,
        "missing grid remains null"
    );

    equal(
        aggregateArgs.reportingWindow,
        reportingWindow,
        "fleet aggregator receives exact reporting window"
    );
}


/*
|--------------------------------------------------------------------------
| 7. Missing is never converted to zero
|--------------------------------------------------------------------------
*/

await rejects(
    () =>
        createProductionEngineeringAggregate({
            userId: "user",

            reportingWindow: {},

            resolveEngineeringScope:
                async () => ({
                    status:
                        ENGINEERING_ANALYTICS_SCOPE_STATUS.RESOLVED,

                    allowed: true,

                    installations: [
                        {
                            installationId:
                                "installation-a",

                            vrmSiteId:
                                "18053",

                            installation: {},
                        },
                    ],
                }),

            siteFamilyLoader:
                async () => ({
                    solar: 0,
                }),
        }),

    (error) =>
        error?.statusCode === 503 &&
        error?.code ===
            "ENGINEERING_AGGREGATE_PROVIDER_UNAVAILABLE",

    "numeric placeholder is rejected rather than treated as analytics"
);


console.log("");
console.log(`Assertions passed: ${count}`);
console.log("================================================");
console.log(
    "P.1H-G2-D2-D5 PRODUCTION ENGINEERING PROVIDER PASSED"
);
console.log("================================================");
