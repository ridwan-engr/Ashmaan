import assert from "node:assert/strict";

import {
    PRODUCTION_ENGINEERING_SITE_FAMILY_LOADER_PHASE,
    loadProductionEngineeringSiteFamilies,
} from "../services/engineering/productionEngineeringSiteFamilyLoader.js";

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

async function rejects(fn, message) {
    await assert.rejects(
        fn,
        (error) => error instanceof TypeError
    );

    pass(message);
}

equal(
    PRODUCTION_ENGINEERING_SITE_FAMILY_LOADER_PHASE,
    "P.1H-G2-E2-B",
    "phase identity is correct"
);

const installation = Object.freeze({
    _id: "installation-a",
    vrmSiteId: "18053",
});

const reportingWindow = Object.freeze({
    start: "2026-09-21T00:00:00.000Z",
    end: "2026-09-22T00:00:00.000Z",
    semantics: "[start,end)",
});

const results = Object.freeze({
    siteElectrical: Object.freeze({ family: "siteElectrical" }),
    energySource: Object.freeze({ family: "energySource" }),
    battery: Object.freeze({ family: "battery" }),
    generator: Object.freeze({ family: "generator" }),
    grid: Object.freeze({ family: "grid" }),
    solar: Object.freeze({ family: "solar" }),
});

const calls = {};

const families =
    await loadProductionEngineeringSiteFamilies({
        installation,
        installationId: "installation-a",
        vrmSiteId: "18053",
        reportingWindow,

        siteElectricalProducer: async (args) => {
            calls.siteElectrical = args;
            return results.siteElectrical;
        },

        energySourceProducer: async (args) => {
            calls.energySource = args;
            return results.energySource;
        },

        batteryProducer: async (args) => {
            calls.battery = args;
            return results.battery;
        },

        generatorProducer: async (args) => {
            calls.generator = args;
            return results.generator;
        },

        gridProducer: async (args) => {
            calls.grid = args;
            return results.grid;
        },

        solarProducer: async (args) => {
            calls.solar = args;
            return results.solar;
        },
    });

deepEqual(
    calls.siteElectrical,
    {
        vrmSiteId: "18053",
        start: reportingWindow.start,
        end: reportingWindow.end,
    },
    "siteElectrical receives vrmSiteId and exact window"
);

deepEqual(
    calls.energySource,
    {
        vrmSiteId: "18053",
        start: reportingWindow.start,
        end: reportingWindow.end,
    },
    "energySource receives vrmSiteId and exact window"
);

deepEqual(
    calls.battery,
    {
        vrmSiteId: "18053",
        start: reportingWindow.start,
        end: reportingWindow.end,
    },
    "battery receives vrmSiteId and exact window"
);

deepEqual(
    calls.generator,
    {
        installationId: "installation-a",
        start: reportingWindow.start,
        end: reportingWindow.end,
    },
    "generator receives Installation._id and exact window"
);

deepEqual(
    calls.grid,
    {
        installationId: "installation-a",
        vrmSiteId: "18053",
        start: reportingWindow.start,
        end: reportingWindow.end,
    },
    "grid receives both identities and exact window"
);

deepEqual(
    calls.solar,
    {
        installationId: "installation-a",
        vrmSiteId: "18053",
        start: reportingWindow.start,
        end: reportingWindow.end,
    },
    "solar receives both identities and exact window"
);

for (const family of Object.keys(results)) {
    equal(
        families[family],
        results[family],
        `${family} result is preserved by reference`
    );
}

equal(
    Object.isFrozen(families),
    true,
    "family container is frozen"
);


/*
|--------------------------------------------------------------------------
| Missing family outputs remain null
|--------------------------------------------------------------------------
*/

const missingFamilies =
    await loadProductionEngineeringSiteFamilies({
        installation,
        installationId: "installation-a",
        vrmSiteId: "18053",
        reportingWindow,

        siteElectricalProducer: async () => undefined,
        energySourceProducer: async () => null,
        batteryProducer: async () => undefined,
        generatorProducer: async () => null,
        gridProducer: async () => undefined,
        solarProducer: async () => null,
    });

for (
    const family of [
        "siteElectrical",
        "energySource",
        "battery",
        "generator",
        "grid",
        "solar",
    ]
) {
    equal(
        missingFamilies[family],
        null,
        `missing ${family} remains null`
    );
}


/*
|--------------------------------------------------------------------------
| Fail-closed boundary checks
|--------------------------------------------------------------------------
*/

await rejects(
    () =>
        loadProductionEngineeringSiteFamilies({
            installation: null,
            installationId: "installation-a",
            vrmSiteId: "18053",
            reportingWindow,
        }),
    "missing authorized installation fails closed"
);

await rejects(
    () =>
        loadProductionEngineeringSiteFamilies({
            installation,
            installationId: "",
            vrmSiteId: "18053",
            reportingWindow,
        }),
    "missing installationId fails closed"
);

await rejects(
    () =>
        loadProductionEngineeringSiteFamilies({
            installation,
            installationId: "installation-a",
            vrmSiteId: "",
            reportingWindow,
        }),
    "missing vrmSiteId fails closed"
);

await rejects(
    () =>
        loadProductionEngineeringSiteFamilies({
            installation,
            installationId: "installation-a",
            vrmSiteId: "18053",
            reportingWindow: {
                start: reportingWindow.start,
                end: reportingWindow.end,
                semantics: "[start,end]",
            },
        }),
    "incorrect reporting-window semantics fail closed"
);

console.log("");
console.log(`Assertions passed: ${count}`);
console.log("================================================");
console.log(
    "P.1H-G2-E2-B PRODUCTION SITE-FAMILY LOADER PASSED"
);
console.log("================================================");
