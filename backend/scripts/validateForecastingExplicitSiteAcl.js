import assert from "node:assert/strict";

import {
    createForecastingRouter,
    FORECASTING_ROUTE_PATHS,
} from "../routes/forecastingRoutes.js";


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


function createController(
    events
) {
    function handler(
        name
    ) {
        return (
            req,
            res
        ) => {
            events.push({
                type:
                    "controller",
                name,
                vrmSiteId:
                    req?.params?.vrmSiteId ??
                    null,
            });

            return res;
        };
    }

    return {
        health:
            handler(
                "health"
            ),

        listForecasts:
            handler(
                "listForecasts"
            ),

        getForecastById:
            handler(
                "getForecastById"
            ),

        getForecastByPersistenceKey:
            handler(
                "getForecastByPersistenceKey"
            ),

        listSiteForecasts:
            handler(
                "listSiteForecasts"
            ),

        getLatestSiteTargetForecast:
            handler(
                "getLatestSiteTargetForecast"
            ),
    };
}


function createRecordingRouter() {
    const registrations =
        [];

    return {
        registrations,

        use(
            ...handlers
        ) {
            registrations.push({
                method:
                    "USE",
                handlers,
            });

            return this;
        },

        get(
            path,
            ...handlers
        ) {
            registrations.push({
                method:
                    "GET",
                path,
                handlers,
            });

            return this;
        },
    };
}


function getRoute(
    router,
    path
) {
    return router.registrations.find(
        (registration) =>
            registration.method ===
                "GET" &&
            registration.path ===
                path
    );
}


async function executeHandlers({
    handlers,
    req =
        {
            params:
                {},
        },
    res =
        {},
} = {}) {
    let index =
        0;

    async function next() {
        const handler =
            handlers[
                index
            ];

        index +=
            1;

        if (
            typeof handler !==
                "function"
        ) {
            return;
        }

        return handler(
            req,
            res,
            next
        );
    }

    await next();
}


/*
|--------------------------------------------------------------------------
| 1. Router requires site-access middleware dependency
|--------------------------------------------------------------------------
*/

{
    const events =
        [];

    assert.throws(
        () =>
            createForecastingRouter({
                controller:
                    createController(
                        events
                    ),

                requireSiteAccess:
                    null,

                routerFactory() {
                    return createRecordingRouter();
                },
            }),
        /FORECASTING_SITE_ACCESS_REQUIRED/
    );

    pass(
        "Forecasting router rejects missing explicit-site ACL middleware"
    );
}


/*
|--------------------------------------------------------------------------
| 2. Build router with injected ACL middleware
|--------------------------------------------------------------------------
*/

const events =
    [];

const requireSiteAccess =
    async (
        req,
        res,
        next
    ) => {
        events.push({
            type:
                "site-acl",
            vrmSiteId:
                req?.params?.vrmSiteId ??
                null,
        });

        return next();
    };

const recordingRouter =
    createRecordingRouter();

const router =
    createForecastingRouter({
        controller:
            createController(
                events
            ),

        requireSiteAccess,

        routerFactory() {
            return recordingRouter;
        },
    });


assert.strictEqual(
    router,
    recordingRouter
);

pass(
    "Forecasting router preserves injected router instance"
);


/*
|--------------------------------------------------------------------------
| 3. Site forecast route has ACL before controller
|--------------------------------------------------------------------------
*/

{
    const route =
        getRoute(
            router,
            FORECASTING_ROUTE_PATHS
                .siteForecasts
        );

    assert.ok(
        route
    );

    assert.equal(
        route.handlers.length,
        2
    );

    assert.strictEqual(
        route.handlers[0],
        requireSiteAccess
    );

    pass(
        "site forecast route places installation ACL before controller"
    );


    events.length =
        0;

    await executeHandlers({
        handlers:
            route.handlers,

        req:
            {
                params:
                    {
                        vrmSiteId:
                            "18053",
                    },
            },

        res:
            {},
    });

    assert.deepEqual(
        events.map(
            (event) =>
                event.type
        ),
        [
            "site-acl",
            "controller",
        ]
    );

    assert.equal(
        events[0].vrmSiteId,
        "18053"
    );

    assert.equal(
        events[1].name,
        "listSiteForecasts"
    );

    pass(
        "site forecast request executes ACL before Forecasting controller"
    );
}


/*
|--------------------------------------------------------------------------
| 4. Latest site-target route has ACL before controller
|--------------------------------------------------------------------------
*/

{
    const route =
        getRoute(
            router,
            FORECASTING_ROUTE_PATHS
                .latestSiteTargetForecast
        );

    assert.ok(
        route
    );

    assert.equal(
        route.handlers.length,
        2
    );

    assert.strictEqual(
        route.handlers[0],
        requireSiteAccess
    );

    pass(
        "latest site-target route places installation ACL before controller"
    );


    events.length =
        0;

    await executeHandlers({
        handlers:
            route.handlers,

        req:
            {
                params:
                    {
                        vrmSiteId:
                            "20000",

                        targetFamily:
                            "SOLAR",

                        targetMetric:
                            "POWER",
                    },
            },

        res:
            {},
    });

    assert.deepEqual(
        events.map(
            (event) =>
                event.type
        ),
        [
            "site-acl",
            "controller",
        ]
    );

    assert.equal(
        events[1].name,
        "getLatestSiteTargetForecast"
    );

    pass(
        "latest site-target request executes ACL before Forecasting controller"
    );
}


/*
|--------------------------------------------------------------------------
| 5. Denied ACL cannot reach explicit-site controller
|--------------------------------------------------------------------------
*/

{
    const deniedEvents =
        [];

    const denySiteAccess =
        async (
            req,
            res,
            next
        ) => {
            deniedEvents.push(
                "site-acl-deny"
            );

            res.statusCode =
                403;

            return res;
        };

    const deniedRouter =
        createRecordingRouter();

    createForecastingRouter({
        controller:
            createController(
                deniedEvents
            ),

        requireSiteAccess:
            denySiteAccess,

        routerFactory() {
            return deniedRouter;
        },
    });

    const siteRoute =
        getRoute(
            deniedRouter,
            FORECASTING_ROUTE_PATHS
                .siteForecasts
        );

    await executeHandlers({
        handlers:
            siteRoute.handlers,

        req:
            {
                params:
                    {
                        vrmSiteId:
                            "99999",
                    },
            },

        res:
            {},
    });

    assert.deepEqual(
        deniedEvents,
        [
            "site-acl-deny",
        ]
    );

    pass(
        "denied site forecast ACL stops execution before controller"
    );


    deniedEvents.length =
        0;

    const latestRoute =
        getRoute(
            deniedRouter,
            FORECASTING_ROUTE_PATHS
                .latestSiteTargetForecast
        );

    await executeHandlers({
        handlers:
            latestRoute.handlers,

        req:
            {
                params:
                    {
                        vrmSiteId:
                            "99999",
                    },
            },

        res:
            {},
    });

    assert.deepEqual(
        deniedEvents,
        [
            "site-acl-deny",
        ]
    );

    pass(
        "denied latest site-target ACL stops execution before controller"
    );
}


/*
|--------------------------------------------------------------------------
| 6. Non-site routes do not receive parameter-based installation ACL
|--------------------------------------------------------------------------
*/

{
    const nonSitePaths =
        [
            FORECASTING_ROUTE_PATHS
                .health,

            FORECASTING_ROUTE_PATHS
                .forecasts,

            FORECASTING_ROUTE_PATHS
                .forecastByPersistenceKey,

            FORECASTING_ROUTE_PATHS
                .forecastById,
        ];

    for (
        const path
        of nonSitePaths
    ) {
        const route =
            getRoute(
                router,
                path
            );

        assert.ok(
            route
        );

        assert.equal(
            route.handlers.includes(
                requireSiteAccess
            ),
            false
        );
    }

    pass(
        "parameter-based site ACL is absent from health, collection, and opaque-record routes"
    );
}


/*
|--------------------------------------------------------------------------
| 7. Opaque route ordering remains persistence-key before generic ID
|--------------------------------------------------------------------------
*/

{
    const getPaths =
        router.registrations
            .filter(
                (registration) =>
                    registration.method ===
                        "GET"
            )
            .map(
                (registration) =>
                    registration.path
            );

    const keyIndex =
        getPaths.indexOf(
            FORECASTING_ROUTE_PATHS
                .forecastByPersistenceKey
        );

    const idIndex =
        getPaths.indexOf(
            FORECASTING_ROUTE_PATHS
                .forecastById
        );

    assert.ok(
        keyIndex !==
            -1
    );

    assert.ok(
        idIndex !==
            -1
    );

    assert.ok(
        keyIndex <
            idIndex
    );

    pass(
        "persistence-key route remains registered before generic forecast ID route"
    );
}


console.log(
    "\n================================================"
);

console.log(
    "P.1H-G3-D3-C VALIDATION PASSED"
);

console.log(
    "================================================"
);

console.log(
    `PASS: ${passed}/${passed}`
);
