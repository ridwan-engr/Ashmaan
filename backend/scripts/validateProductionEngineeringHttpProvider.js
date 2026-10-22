import assert from "node:assert/strict";

import {
    PRODUCTION_ENGINEERING_HTTP_PROVIDER_PHASE,
    buildProductionEngineeringHttpReportingWindow,
    createProductionEngineeringHttpProvider,
} from "../services/engineering/productionEngineeringHttpProvider.js";


let count = 0;

function pass(message) {
    count += 1;
    console.log(`PASS ${count}: ${message}`);
}

function equal(actual, expected, message) {
    assert.equal(actual, expected);
    pass(message);
}

async function rejectsWith(
    fn,
    predicate,
    message
) {
    await assert.rejects(
        fn,
        predicate
    );

    pass(message);
}


equal(
    PRODUCTION_ENGINEERING_HTTP_PROVIDER_PHASE,
    "P.1H-G2-E3-B2",
    "phase identity is correct"
);


const start =
    "2026-09-21T00:00:00.000Z";

const end =
    "2026-09-22T00:00:00.000Z";


const window =
    buildProductionEngineeringHttpReportingWindow({
        start,
        end,
    });


equal(
    window.semantics,
    "[start,end)",
    "reporting window preserves [start,end) semantics"
);

equal(
    window.start instanceof Date,
    true,
    "start is normalized by authoritative Engineering contract"
);

equal(
    window.end instanceof Date,
    true,
    "end is normalized by authoritative Engineering contract"
);

equal(
    window.start.toISOString(),
    start,
    "normalized start preserves requested instant"
);

equal(
    window.end.toISOString(),
    end,
    "normalized end preserves requested instant"
);


assert.throws(
    () =>
        buildProductionEngineeringHttpReportingWindow({}),
    (error) =>
        error?.statusCode === 400 &&
        error?.code ===
            "ENGINEERING_REPORTING_WINDOW_REQUIRED"
);
pass(
    "missing reporting window fails closed"
);


assert.throws(
    () =>
        buildProductionEngineeringHttpReportingWindow({
            start: end,
            end: start,
        }),
    (error) =>
        error?.statusCode === 400 &&
        error?.code ===
            "ENGINEERING_REPORTING_WINDOW_INVALID"
);
pass(
    "reversed reporting window fails closed"
);


const aggregateResult =
    Object.freeze({
        status:
            "TEST_AGGREGATE",
    });

const siteFamilyLoader =
    async () => ({
        siteElectrical: null,
        energySource: null,
        battery: null,
        generator: null,
        grid: null,
        solar: null,
    });

let received =
    null;

const provider =
    createProductionEngineeringHttpProvider({
        aggregateProvider:
            async (args) => {
                received =
                    args;

                return aggregateResult;
            },

        siteFamilyLoader,
    });


const result =
    await provider({
        req: {
            auth: {
                userId:
                    "user-123",
            },
        },

        query: {
            start,
            end,
        },

        params: {
            vrmSiteId:
                "18053",
        },
    });


equal(
    result,
    aggregateResult,
    "HTTP provider returns aggregate result unchanged"
);

equal(
    received.userId,
    "user-123",
    "authenticated req.auth.userId is propagated"
);

equal(
    received.reportingWindow.start.toISOString(),
    start,
    "aggregate receives normalized start"
);

equal(
    received.reportingWindow.end.toISOString(),
    end,
    "aggregate receives normalized end"
);

equal(
    received.reportingWindow.semantics,
    "[start,end)",
    "aggregate receives exact reporting-window semantics"
);

equal(
    received.siteFamilyLoader,
    siteFamilyLoader,
    "production site-family loader is passed by reference"
);

equal(
    Object.prototype.hasOwnProperty.call(
        received,
        "req"
    ),
    false,
    "HTTP request object is not leaked into Engineering aggregate layer"
);

equal(
    Object.prototype.hasOwnProperty.call(
        received,
        "params"
    ),
    false,
    "HTTP params are not leaked into Engineering aggregate layer"
);


await rejectsWith(
    () =>
        provider({
            req: {},
            query: {
                start,
                end,
            },
        }),
    (error) =>
        error?.statusCode === 401 &&
        error?.code ===
            "ENGINEERING_AUTHENTICATED_USER_REQUIRED",
    "missing authenticated user fails closed"
);


assert.throws(
    () =>
        createProductionEngineeringHttpProvider({
            aggregateProvider:
                null,
        }),
    TypeError
);
pass(
    "invalid aggregate provider fails closed"
);


assert.throws(
    () =>
        createProductionEngineeringHttpProvider({
            aggregateProvider:
                async () => null,

            siteFamilyLoader:
                null,
        }),
    TypeError
);
pass(
    "invalid site-family loader fails closed"
);


console.log("");
console.log(`Assertions passed: ${count}`);
console.log("================================================");
console.log(
    "P.1H-G2-E3-B2 PRODUCTION ENGINEERING HTTP PROVIDER PASSED"
);
console.log("================================================");
