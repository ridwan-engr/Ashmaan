import assert from "node:assert/strict";

import {
    createForecastingController,
} from "../controllers/forecastingController.js";

import {
    FORECAST_RECORD_AUTHORIZATION_DECISIONS,
} from "../services/security/forecastRecordAuthorizationService.js";


let passed = 0;

function pass(message) {
    passed += 1;
    console.log(`PASS ${passed}: ${message}`);
}


function createResponse() {
    return {
        statusCode: 200,
        body: undefined,
        jsonCalls: 0,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(body) {
            this.jsonCalls += 1;
            this.body = body;
            return this;
        },
    };
}


function createApi({
    recordById = null,
    recordByKey = null,
    events,
} = {}) {
    return {
        async health() {
            return {};
        },

        async listForecasts() {
            return {
                records: [],
            };
        },

        async getForecastById({
            id,
        } = {}) {
            events.push({
                type: "lookup-id",
                id,
            });

            return recordById;
        },

        async getForecastByPersistenceKey({
            persistenceKey,
        } = {}) {
            events.push({
                type: "lookup-key",
                persistenceKey,
            });

            return recordByKey;
        },

        async listSiteForecasts() {
            return {
                records: [],
            };
        },

        async getLatestSiteTargetForecast() {
            return null;
        },
    };
}


const getInstallationScope =
    async () => ({
        status: "RESOLVED",
        installationIds: [],
    });

const getVrmSiteIds =
    async () => [];

const userId =
    "507f1f77bcf86cd799439011";

const record =
    Object.freeze({
        _id: "forecast-001",
        persistenceKey: "forecast-key-001",

        identity:
            Object.freeze({
                vrmSiteId: "18053",
            }),

        target:
            Object.freeze({
                vrmSiteId: "99999",
            }),
    });


function makeController({
    recordById = null,
    recordByKey = null,
    authorizeRecord,
    events,
} = {}) {
    return createForecastingController({
        forecastingApiService:
            createApi({
                recordById,
                recordByKey,
                events,
            }),

        getInstallationScope,
        getVrmSiteIds,
        authorizeRecord,
    });
}


/*
|--------------------------------------------------------------------------
| 1. Missing authorization dependency
|--------------------------------------------------------------------------
*/

{
    const events = [];

    assert.throws(
        () =>
            createForecastingController({
                forecastingApiService:
                    createApi({
                        events,
                    }),

                getInstallationScope,
                getVrmSiteIds,

                authorizeRecord: null,
            }),
        /FORECASTING_RECORD_AUTHORIZATION_REQUIRED/
    );

    pass(
        "controller rejects missing opaque-record authorization dependency"
    );
}


/*
|--------------------------------------------------------------------------
| 2. ID — not found
|--------------------------------------------------------------------------
*/

{
    const events = [];
    let authorizationCalls = 0;

    const controller =
        makeController({
            events,
            recordById: null,

            authorizeRecord:
                async () => {
                    authorizationCalls += 1;

                    return {
                        decision:
                            FORECAST_RECORD_AUTHORIZATION_DECISIONS.ALLOW,
                    };
                },
        });

    const res =
        createResponse();

    await controller.getForecastById(
        {
            auth: {
                userId,
            },

            params: {
                id: "missing-id",
            },
        },
        res
    );

    assert.equal(
        events.filter(
            (event) =>
                event.type === "lookup-id"
        ).length,
        1
    );

    assert.equal(
        authorizationCalls,
        0
    );

    assert.equal(
        res.statusCode,
        404
    );

    assert.equal(
        res.body?.error?.message,
        "FORECAST_NOT_FOUND"
    );

    pass(
        "ID route performs one lookup and preserves 404 before authorization"
    );
}


/*
|--------------------------------------------------------------------------
| 3. ID — ALLOW
|--------------------------------------------------------------------------
*/

{
    const events = [];
    let authorizedRecord = null;
    let authorizedUser = null;

    const controller =
        makeController({
            events,
            recordById: record,

            authorizeRecord:
                async ({
                    userId:
                        receivedUser,
                    record:
                        receivedRecord,
                }) => {
                    events.push({
                        type:
                            "authorize-id",
                    });

                    authorizedUser =
                        receivedUser;

                    authorizedRecord =
                        receivedRecord;

                    return {
                        decision:
                            FORECAST_RECORD_AUTHORIZATION_DECISIONS.ALLOW,
                    };
                },
        });

    const res =
        createResponse();

    await controller.getForecastById(
        {
            auth: {
                userId,
            },

            params: {
                id: "forecast-001",
            },
        },
        res
    );

    assert.deepEqual(
        events.map(
            (event) =>
                event.type
        ),
        [
            "lookup-id",
            "authorize-id",
        ]
    );

    assert.equal(
        events.filter(
            (event) =>
                event.type === "lookup-id"
        ).length,
        1
    );

    assert.equal(
        authorizedUser,
        userId
    );

    assert.strictEqual(
        authorizedRecord,
        record
    );

    assert.equal(
        res.statusCode,
        200
    );

    assert.strictEqual(
        res.body,
        record
    );

    pass(
        "ID route performs exactly one lookup, authorizes the same record, and returns it on ALLOW"
    );
}


/*
|--------------------------------------------------------------------------
| 4. ID — DENY
|--------------------------------------------------------------------------
*/

{
    const events = [];

    const controller =
        makeController({
            events,
            recordById: record,

            authorizeRecord:
                async ({
                    record:
                        receivedRecord,
                }) => {
                    assert.strictEqual(
                        receivedRecord,
                        record
                    );

                    return {
                        decision:
                            FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY,
                    };
                },
        });

    const res =
        createResponse();

    await controller.getForecastById(
        {
            auth: {
                userId,
            },

            params: {
                id: "forecast-001",
            },
        },
        res
    );

    assert.equal(
        events.filter(
            (event) =>
                event.type === "lookup-id"
        ).length,
        1
    );

    assert.equal(
        res.statusCode,
        403
    );

    assert.equal(
        res.body?.error?.message,
        "FORECAST_ACCESS_DENIED"
    );

    assert.notStrictEqual(
        res.body,
        record
    );

    pass(
        "ID route returns 403 without exposing ForecastRecord on DENY"
    );
}


/*
|--------------------------------------------------------------------------
| 5. ID — UNAVAILABLE
|--------------------------------------------------------------------------
*/

{
    const events = [];

    const controller =
        makeController({
            events,
            recordById: record,

            authorizeRecord:
                async () => ({
                    decision:
                        FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE,
                }),
        });

    const res =
        createResponse();

    await controller.getForecastById(
        {
            auth: {
                userId,
            },

            params: {
                id: "forecast-001",
            },
        },
        res
    );

    assert.equal(
        events.filter(
            (event) =>
                event.type === "lookup-id"
        ).length,
        1
    );

    assert.equal(
        res.statusCode,
        503
    );

    assert.equal(
        res.body?.error?.message,
        "FORECAST_AUTHORIZATION_UNAVAILABLE"
    );

    assert.notStrictEqual(
        res.body,
        record
    );

    pass(
        "ID route returns 503 without exposing ForecastRecord when authorization is unavailable"
    );
}


/*
|--------------------------------------------------------------------------
| 6. Persistence key — not found
|--------------------------------------------------------------------------
*/

{
    const events = [];
    let authorizationCalls = 0;

    const controller =
        makeController({
            events,
            recordByKey: null,

            authorizeRecord:
                async () => {
                    authorizationCalls += 1;

                    return {
                        decision:
                            FORECAST_RECORD_AUTHORIZATION_DECISIONS.ALLOW,
                    };
                },
        });

    const res =
        createResponse();

    await controller.getForecastByPersistenceKey(
        {
            auth: {
                userId,
            },

            params: {
                persistenceKey:
                    "missing-key",
            },
        },
        res
    );

    assert.equal(
        events.filter(
            (event) =>
                event.type === "lookup-key"
        ).length,
        1
    );

    assert.equal(
        authorizationCalls,
        0
    );

    assert.equal(
        res.statusCode,
        404
    );

    assert.equal(
        res.body?.error?.message,
        "FORECAST_NOT_FOUND"
    );

    pass(
        "persistence-key route performs one lookup and preserves 404 before authorization"
    );
}


/*
|--------------------------------------------------------------------------
| 7. Persistence key — ALLOW
|--------------------------------------------------------------------------
*/

{
    const events = [];
    let authorizedRecord = null;

    const controller =
        makeController({
            events,
            recordByKey: record,

            authorizeRecord:
                async ({
                    userId:
                        receivedUser,
                    record:
                        receivedRecord,
                }) => {
                    assert.equal(
                        receivedUser,
                        userId
                    );

                    authorizedRecord =
                        receivedRecord;

                    events.push({
                        type:
                            "authorize-key",
                    });

                    return {
                        decision:
                            FORECAST_RECORD_AUTHORIZATION_DECISIONS.ALLOW,
                    };
                },
        });

    const res =
        createResponse();

    await controller.getForecastByPersistenceKey(
        {
            auth: {
                userId,
            },

            params: {
                persistenceKey:
                    "forecast-key-001",
            },
        },
        res
    );

    assert.deepEqual(
        events.map(
            (event) =>
                event.type
        ),
        [
            "lookup-key",
            "authorize-key",
        ]
    );

    assert.equal(
        events.filter(
            (event) =>
                event.type === "lookup-key"
        ).length,
        1
    );

    assert.strictEqual(
        authorizedRecord,
        record
    );

    assert.equal(
        res.statusCode,
        200
    );

    assert.strictEqual(
        res.body,
        record
    );

    pass(
        "persistence-key route performs exactly one lookup, authorizes the same record, and returns it on ALLOW"
    );
}


/*
|--------------------------------------------------------------------------
| 8. Persistence key — DENY
|--------------------------------------------------------------------------
*/

{
    const events = [];

    const controller =
        makeController({
            events,
            recordByKey: record,

            authorizeRecord:
                async () => ({
                    decision:
                        FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY,
                }),
        });

    const res =
        createResponse();

    await controller.getForecastByPersistenceKey(
        {
            auth: {
                userId,
            },

            params: {
                persistenceKey:
                    "forecast-key-001",
            },
        },
        res
    );

    assert.equal(
        events.filter(
            (event) =>
                event.type === "lookup-key"
        ).length,
        1
    );

    assert.equal(
        res.statusCode,
        403
    );

    assert.equal(
        res.body?.error?.message,
        "FORECAST_ACCESS_DENIED"
    );

    assert.notStrictEqual(
        res.body,
        record
    );

    pass(
        "persistence-key route returns 403 without exposing ForecastRecord on DENY"
    );
}


/*
|--------------------------------------------------------------------------
| 9. Persistence key — UNAVAILABLE
|--------------------------------------------------------------------------
*/

{
    const events = [];

    const controller =
        makeController({
            events,
            recordByKey: record,

            authorizeRecord:
                async () => ({
                    decision:
                        FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE,
                }),
        });

    const res =
        createResponse();

    await controller.getForecastByPersistenceKey(
        {
            auth: {
                userId,
            },

            params: {
                persistenceKey:
                    "forecast-key-001",
            },
        },
        res
    );

    assert.equal(
        events.filter(
            (event) =>
                event.type === "lookup-key"
        ).length,
        1
    );

    assert.equal(
        res.statusCode,
        503
    );

    assert.equal(
        res.body?.error?.message,
        "FORECAST_AUTHORIZATION_UNAVAILABLE"
    );

    assert.notStrictEqual(
        res.body,
        record
    );

    pass(
        "persistence-key route returns 503 without exposing ForecastRecord when authorization is unavailable"
    );
}


/*
|--------------------------------------------------------------------------
| 10. Unknown decision
|--------------------------------------------------------------------------
*/

{
    const events = [];

    const controller =
        makeController({
            events,
            recordById: record,

            authorizeRecord:
                async () => ({
                    decision:
                        "UNKNOWN",

                    allowed:
                        true,
                }),
        });

    const res =
        createResponse();

    await controller.getForecastById(
        {
            auth: {
                userId,
            },

            params: {
                id: "forecast-001",
            },
        },
        res
    );

    assert.equal(
        res.statusCode,
        403
    );

    assert.equal(
        res.body?.error?.message,
        "FORECAST_ACCESS_DENIED"
    );

    assert.notStrictEqual(
        res.body,
        record
    );

    pass(
        "unknown opaque authorization decision fails closed with 403"
    );
}


/*
|--------------------------------------------------------------------------
| 11. Missing authenticated principal
|--------------------------------------------------------------------------
*/

{
    const events = [];
    let receivedUserId =
        "NOT_CALLED";

    const controller =
        makeController({
            events,
            recordById: record,

            authorizeRecord:
                async ({
                    userId:
                        suppliedUserId,
                }) => {
                    receivedUserId =
                        suppliedUserId;

                    return {
                        decision:
                            FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY,
                    };
                },
        });

    const res =
        createResponse();

    await controller.getForecastById(
        {
            params: {
                id: "forecast-001",
            },
        },
        res
    );

    assert.equal(
        receivedUserId,
        undefined
    );

    assert.equal(
        res.statusCode,
        403
    );

    assert.notStrictEqual(
        res.body,
        record
    );

    pass(
        "missing authenticated principal cannot bypass opaque Forecast authorization"
    );
}


/*
|--------------------------------------------------------------------------
| 12. Authorization exception
|--------------------------------------------------------------------------
*/

{
    const events = [];

    const controller =
        makeController({
            events,
            recordById: record,

            authorizeRecord:
                async () => {
                    throw new Error(
                        "OPAQUE_AUTHORIZATION_FAILURE"
                    );
                },
        });

    const res =
        createResponse();

    await controller.getForecastById(
        {
            auth: {
                userId,
            },

            params: {
                id: "forecast-001",
            },
        },
        res
    );

    assert.notEqual(
        res.statusCode,
        200
    );

    assert.notStrictEqual(
        res.body,
        record
    );

    pass(
        "opaque authorization exception cannot expose ForecastRecord"
    );
}


console.log(
    "\n================================================"
);

console.log(
    "P.1H-G3-D4-D VALIDATION PASSED"
);

console.log(
    "================================================"
);

console.log(
    `PASS: ${passed}/${passed}`
);
