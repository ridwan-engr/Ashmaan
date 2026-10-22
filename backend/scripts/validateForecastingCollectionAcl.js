import assert from "node:assert/strict";

import {
    createForecastingController,
} from "../controllers/forecastingController.js";

import {
    USER_INSTALLATION_SCOPE_STATUS,
} from "../services/security/userInstallationScopeService.js";


let passed =
    0;


function pass(
    message
) {
    passed +=
        1;

    console.log(
        `PASS ${passed}: ${message}`
    );
}


function createResponse() {
    return {
        statusCode:
            200,

        body:
            undefined,

        status(
            statusCode
        ) {
            this.statusCode =
                statusCode;

            return this;
        },

        json(
            body
        ) {
            this.body =
                body;

            return this;
        },
    };
}


function createApiService({
    events =
        [],
} = {}) {
    return {
        health() {
            return {
                ok:
                    true,
            };
        },

        async listForecasts(
            args
        ) {
            events.push({
                type:
                    "forecast",
                args,
            });

            return {
                records:
                    [],
                page:
                    Number(
                        args.page
                    ),
                limit:
                    Number(
                        args.limit
                    ),
            };
        },

        async getForecastById() {
            return null;
        },

        async getForecastByPersistenceKey() {
            return null;
        },

        async listSiteForecasts() {
            return {
                records:
                    [],
            };
        },

        async getLatestSiteTargetForecast() {
            return null;
        },
    };
}


function createRequest({
    userId =
        "507f1f77bcf86cd799439011",

    query =
        {},
} = {}) {
    return {
        auth:
            {
                userId,
            },

        query,

        params:
            {},
    };
}


/*
|--------------------------------------------------------------------------
| 1. Resolved scope is propagated into trusted Forecast API scope
|--------------------------------------------------------------------------
*/

{
    const events =
        [];

    const installationIds =
        Object.freeze([
            "507f191e810c19729de860ea",
            "507f191e810c19729de860eb",
        ]);

    const entitledVrmSiteIds =
        Object.freeze([
            "18053",
            "20000",
        ]);

    const controller =
        createForecastingController({
            forecastingApiService:
                createApiService({
                    events,
                }),

            async getInstallationScope({
                userId,
            }) {
                events.push({
                    type:
                        "installation-scope",
                    userId,
                });

                return {
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                    installationIds,
                };
            },

            async getVrmSiteIds({
                installationIds:
                    receivedInstallationIds,
            }) {
                events.push({
                    type:
                        "vrm-scope",
                    installationIds:
                        receivedInstallationIds,
                });

                return entitledVrmSiteIds;
            },
        });

    const req =
        createRequest({
            query:
                {
                    vrmSiteId:
                        "18053",

                    targetFamily:
                        "SOLAR",

                    targetMetric:
                        "POWER",

                    modelFamily:
                        "TEST_MODEL",

                    outputType:
                        "POINT",

                    page:
                        "3",

                    limit:
                        "25",
                },
        });

    const res =
        createResponse();

    await controller.listForecasts(
        req,
        res
    );

    assert.equal(
        events[0].type,
        "installation-scope"
    );

    assert.equal(
        events[0].userId,
        req.auth.userId
    );

    pass(
        "authenticated principal is resolved before Forecasting access"
    );


    assert.equal(
        events[1].type,
        "vrm-scope"
    );

    assert.strictEqual(
        events[1].installationIds,
        installationIds
    );

    pass(
        "resolved installation IDs are passed unchanged into VRM site scope resolution"
    );


    assert.equal(
        events[2].type,
        "forecast"
    );

    assert.strictEqual(
        events[2].args.allowedVrmSiteIds,
        entitledVrmSiteIds
    );

    pass(
        "entitled VRM site IDs are supplied as the trusted Forecasting scope"
    );


    assert.deepEqual(
        events.map(
            (event) =>
                event.type
        ),
        [
            "installation-scope",
            "vrm-scope",
            "forecast",
        ]
    );

    pass(
        "ForecastRecord access occurs only after both ACL scope stages"
    );


    assert.deepEqual(
        {
            vrmSiteId:
                events[2].args.vrmSiteId,

            targetFamily:
                events[2].args.targetFamily,

            targetMetric:
                events[2].args.targetMetric,

            modelFamily:
                events[2].args.modelFamily,

            outputType:
                events[2].args.outputType,

            page:
                events[2].args.page,

            limit:
                events[2].args.limit,
        },
        {
            vrmSiteId:
                "18053",

            targetFamily:
                "SOLAR",

            targetMetric:
                "POWER",

            modelFamily:
                "TEST_MODEL",

            outputType:
                "POINT",

            page:
                "3",

            limit:
                "25",
        }
    );

    pass(
        "existing Forecasting filters and pagination are preserved"
    );


    assert.equal(
        res.statusCode,
        200
    );

    assert.deepEqual(
        res.body.records,
        []
    );

    pass(
        "authorized collection result is returned normally"
    );
}


/*
|--------------------------------------------------------------------------
| 2. Zero entitlement is an authorized empty trusted scope
|--------------------------------------------------------------------------
*/

{
    let forecastArgs =
        null;

    const emptyScope =
        Object.freeze([]);

    const controller =
        createForecastingController({
            forecastingApiService:
                {
                    ...createApiService(),

                    async listForecasts(
                        args
                    ) {
                        forecastArgs =
                            args;

                        return {
                            records:
                                [],
                        };
                    },
                },

            async getInstallationScope() {
                return {
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                    installationIds:
                        [],
                };
            },

            async getVrmSiteIds({
                installationIds,
            }) {
                assert.deepEqual(
                    installationIds,
                    []
                );

                return emptyScope;
            },
        });

    const res =
        createResponse();

    await controller.listForecasts(
        createRequest(),
        res
    );

    assert.strictEqual(
        forecastArgs.allowedVrmSiteIds,
        emptyScope
    );

    assert.deepEqual(
        forecastArgs.allowedVrmSiteIds,
        []
    );

    pass(
        "zero entitlement remains an explicit authorized empty Forecasting scope"
    );


    assert.equal(
        res.statusCode,
        200
    );

    pass(
        "zero entitlement is not converted into HTTP 403"
    );
}


/*
|--------------------------------------------------------------------------
| 3. DENY fails closed before Forecasting
|--------------------------------------------------------------------------
*/

{
    let vrmScopeCalled =
        false;

    let forecastCalled =
        false;

    const api =
        createApiService();

    api.listForecasts =
        async () => {
            forecastCalled =
                true;

            throw new Error(
                "FORECAST_SHOULD_NOT_RUN"
            );
        };

    const controller =
        createForecastingController({
            forecastingApiService:
                api,

            async getInstallationScope() {
                return {
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.DENY,

                    installationIds:
                        [],
                };
            },

            async getVrmSiteIds() {
                vrmScopeCalled =
                    true;

                return [];
            },
        });

    const res =
        createResponse();

    await controller.listForecasts(
        createRequest(),
        res
    );

    assert.equal(
        res.statusCode,
        403
    );

    assert.equal(
        vrmScopeCalled,
        false
    );

    assert.equal(
        forecastCalled,
        false
    );

    pass(
        "DENY scope returns 403 before VRM scope or Forecasting access"
    );
}


/*
|--------------------------------------------------------------------------
| 4. UNAVAILABLE fails closed
|--------------------------------------------------------------------------
*/

{
    let forecastCalled =
        false;

    const api =
        createApiService();

    api.listForecasts =
        async () => {
            forecastCalled =
                true;

            throw new Error(
                "FORECAST_SHOULD_NOT_RUN"
            );
        };

    const controller =
        createForecastingController({
            forecastingApiService:
                api,

            async getInstallationScope() {
                return {
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.UNAVAILABLE,

                    installationIds:
                        [],
                };
            },

            async getVrmSiteIds() {
                throw new Error(
                    "VRM_SCOPE_SHOULD_NOT_RUN"
                );
            },
        });

    const res =
        createResponse();

    await controller.listForecasts(
        createRequest(),
        res
    );

    assert.equal(
        res.statusCode,
        503
    );

    assert.equal(
        forecastCalled,
        false
    );

    pass(
        "UNAVAILABLE installation scope returns 503 without Forecasting access"
    );
}


/*
|--------------------------------------------------------------------------
| 5. Unknown/malformed scope fails closed
|--------------------------------------------------------------------------
*/

{
    let forecastCalled =
        false;

    const api =
        createApiService();

    api.listForecasts =
        async () => {
            forecastCalled =
                true;

            return {
                records:
                    [],
            };
        };

    const controller =
        createForecastingController({
            forecastingApiService:
                api,

            async getInstallationScope() {
                return {
                    status:
                        "UNKNOWN",
                    installationIds:
                        [],
                };
            },

            async getVrmSiteIds() {
                return [];
            },
        });

    const res =
        createResponse();

    await controller.listForecasts(
        createRequest(),
        res
    );

    assert.equal(
        res.statusCode,
        503
    );

    assert.equal(
        forecastCalled,
        false
    );

    pass(
        "unknown installation-scope output fails closed with 503"
    );
}


/*
|--------------------------------------------------------------------------
| 6. Malformed VRM-site scope fails closed before Forecasting
|--------------------------------------------------------------------------
*/

{
    let forecastCalled =
        false;

    const api =
        createApiService();

    api.listForecasts =
        async () => {
            forecastCalled =
                true;

            return {
                records:
                    [],
            };
        };

    const controller =
        createForecastingController({
            forecastingApiService:
                api,

            async getInstallationScope() {
                return {
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                    installationIds:
                        [],
                };
            },

            async getVrmSiteIds() {
                return null;
            },
        });

    const res =
        createResponse();

    await controller.listForecasts(
        createRequest(),
        res
    );

    assert.equal(
        res.statusCode,
        503
    );

    assert.equal(
        forecastCalled,
        false
    );

    pass(
        "malformed VRM-site scope fails closed before Forecasting access"
    );
}


/*
|--------------------------------------------------------------------------
| 7. Scope dependency exception fails closed
|--------------------------------------------------------------------------
*/

{
    let forecastCalled =
        false;

    const api =
        createApiService();

    api.listForecasts =
        async () => {
            forecastCalled =
                true;

            return {
                records:
                    [],
            };
        };

    const controller =
        createForecastingController({
            forecastingApiService:
                api,

            async getInstallationScope() {
                throw new Error(
                    "SCOPE_BACKEND_FAILURE"
                );
            },

            async getVrmSiteIds() {
                return [];
            },
        });

    const res =
        createResponse();

    await controller.listForecasts(
        createRequest(),
        res
    );

    assert.equal(
        res.statusCode,
        503
    );

    assert.equal(
        forecastCalled,
        false
    );

    pass(
        "installation-scope exception fails closed with 503"
    );
}


/*
|--------------------------------------------------------------------------
| 8. VRM scope exception fails closed
|--------------------------------------------------------------------------
*/

{
    let forecastCalled =
        false;

    const api =
        createApiService();

    api.listForecasts =
        async () => {
            forecastCalled =
                true;

            return {
                records:
                    [],
            };
        };

    const controller =
        createForecastingController({
            forecastingApiService:
                api,

            async getInstallationScope() {
                return {
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                    installationIds:
                        [
                            "507f191e810c19729de860ea",
                        ],
                };
            },

            async getVrmSiteIds() {
                throw new Error(
                    "INSTALLATION_LOOKUP_FAILURE"
                );
            },
        });

    const res =
        createResponse();

    await controller.listForecasts(
        createRequest(),
        res
    );

    assert.equal(
        res.statusCode,
        503
    );

    assert.equal(
        forecastCalled,
        false
    );

    pass(
        "VRM-site scope exception fails closed with 503"
    );
}


/*
|--------------------------------------------------------------------------
| 9. Missing authenticated principal cannot become unrestricted
|--------------------------------------------------------------------------
*/

{
    let forecastCalled =
        false;

    const api =
        createApiService();

    api.listForecasts =
        async () => {
            forecastCalled =
                true;

            return {
                records:
                    [],
            };
        };

    const controller =
        createForecastingController({
            forecastingApiService:
                api,

            async getInstallationScope({
                userId,
            }) {
                assert.equal(
                    userId,
                    undefined
                );

                return {
                    status:
                        USER_INSTALLATION_SCOPE_STATUS.DENY,

                    installationIds:
                        [],
                };
            },

            async getVrmSiteIds() {
                return [];
            },
        });

    const req =
        {
            query:
                {},
            params:
                {},
        };

    const res =
        createResponse();

    await controller.listForecasts(
        req,
        res
    );

    assert.equal(
        res.statusCode,
        403
    );

    assert.equal(
        forecastCalled,
        false
    );

    pass(
        "missing authenticated principal cannot fall through to unrestricted Forecasting"
    );
}


/*
|--------------------------------------------------------------------------
| 10. Dependency injection fails closed at construction
|--------------------------------------------------------------------------
*/

{
    assert.throws(
        () =>
            createForecastingController({
                forecastingApiService:
                    createApiService(),

                getInstallationScope:
                    null,

                getVrmSiteIds:
                    async () =>
                        [],
            }),
        /FORECASTING_INSTALLATION_SCOPE_REQUIRED/
    );

    pass(
        "controller rejects missing installation-scope dependency"
    );


    assert.throws(
        () =>
            createForecastingController({
                forecastingApiService:
                    createApiService(),

                getInstallationScope:
                    async () =>
                        ({
                            status:
                                USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                            installationIds:
                                [],
                        }),

                getVrmSiteIds:
                    null,
            }),
        /FORECASTING_VRM_SITE_SCOPE_REQUIRED/
    );

    pass(
        "controller rejects missing VRM-site-scope dependency"
    );
}


/*
|--------------------------------------------------------------------------
| 11. Existing controller surface remains intact
|--------------------------------------------------------------------------
*/

{
    const controller =
        createForecastingController({
            forecastingApiService:
                createApiService(),

            getInstallationScope:
                async () =>
                    ({
                        status:
                            USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                        installationIds:
                            [],
                    }),

            getVrmSiteIds:
                async () =>
                    [],
        });

    const expectedMethods =
        [
            "health",
            "listForecasts",
            "getForecastById",
            "getForecastByPersistenceKey",
            "listSiteForecasts",
            "getLatestSiteTargetForecast",
        ];

    for (
        const method
        of expectedMethods
    ) {
        assert.equal(
            typeof controller[
                method
            ],
            "function"
        );
    }

    pass(
        "existing Forecasting controller API surface remains intact"
    );
}


console.log(
    "\n================================================"
);

console.log(
    "P.1H-G3-D2 VALIDATION PASSED"
);

console.log(
    "================================================"
);

console.log(
    `PASS: ${passed}/${passed}`
);
