import assert from "node:assert/strict";

import {
    createForecastingRouter,
    FORECASTING_ROUTE_PATHS,
} from "../routes/forecastingRoutes.js";

import {
    createBackendApiIntegrationRouter,
    BACKEND_API_INTEGRATION_PATHS,
} from "../routes/backendApiIntegrationRoutes.js";

import {
    RBAC_PERMISSIONS,
} from "../services/security/authorizationRbacService.js";


let passed = 0;

function pass(message) {
    passed += 1;
    console.log(`PASS ${passed}: ${message}`);
}


function createRecordingRouter() {
    const calls = [];

    const router = {
        calls,

        use(...args) {
            calls.push({
                method: "use",
                args,
            });

            return router;
        },

        get(...args) {
            calls.push({
                method: "get",
                args,
            });

            return router;
        },
    };

    return router;
}


function noop() {}


const controller = {
    health: noop,
    listForecasts: noop,
    getForecastByPersistenceKey: noop,
    getForecastById: noop,
    listSiteForecasts: noop,
    getLatestSiteTargetForecast: noop,
};


/*
|--------------------------------------------------------------------------
| 1. Child Forecasting router topology
|--------------------------------------------------------------------------
*/

{
    const router =
        createRecordingRouter();

    const requireSiteAccess =
        function requireSiteAccess(
            req,
            res,
            next
        ) {
            next?.();
        };

    const result =
        createForecastingRouter({
            controller,
            requireSiteAccess,
            routerFactory:
                () => router,
        });

    assert.strictEqual(
        result,
        router
    );

    pass(
        "Forecasting router preserves the injected router instance"
    );


    const getCalls =
        router.calls.filter(
            (call) =>
                call.method === "get"
        );

    assert.equal(
        getCalls.length,
        6
    );

    pass(
        "Forecasting child router exposes exactly six GET routes"
    );


    const routeByPath =
        new Map(
            getCalls.map(
                (call) => [
                    call.args[0],
                    call.args.slice(1),
                ]
            )
        );


    assert.deepEqual(
        routeByPath.get(
            FORECASTING_ROUTE_PATHS.health
        ),
        [
            controller.health,
        ]
    );

    pass(
        "Forecasting health route has no child site-ACL middleware"
    );


    assert.deepEqual(
        routeByPath.get(
            FORECASTING_ROUTE_PATHS.forecasts
        ),
        [
            controller.listForecasts,
        ]
    );

    pass(
        "Forecast collection route delegates site scoping to its controller"
    );


    assert.deepEqual(
        routeByPath.get(
            FORECASTING_ROUTE_PATHS.forecastByPersistenceKey
        ),
        [
            controller.getForecastByPersistenceKey,
        ]
    );

    pass(
        "persistence-key route delegates opaque-record authorization to its controller"
    );


    assert.deepEqual(
        routeByPath.get(
            FORECASTING_ROUTE_PATHS.forecastById
        ),
        [
            controller.getForecastById,
        ]
    );

    pass(
        "Forecast ID route delegates opaque-record authorization to its controller"
    );


    assert.deepEqual(
        routeByPath.get(
            FORECASTING_ROUTE_PATHS.siteForecasts
        ),
        [
            requireSiteAccess,
            controller.listSiteForecasts,
        ]
    );

    pass(
        "site Forecast collection enforces Installation ACL before controller"
    );


    assert.deepEqual(
        routeByPath.get(
            FORECASTING_ROUTE_PATHS.latestSiteTargetForecast
        ),
        [
            requireSiteAccess,
            controller.getLatestSiteTargetForecast,
        ]
    );

    pass(
        "latest site-target route enforces Installation ACL before controller"
    );


    const keyPosition =
        getCalls.findIndex(
            (call) =>
                call.args[0] ===
                FORECASTING_ROUTE_PATHS.forecastByPersistenceKey
        );

    const idPosition =
        getCalls.findIndex(
            (call) =>
                call.args[0] ===
                FORECASTING_ROUTE_PATHS.forecastById
        );

    assert.ok(
        keyPosition >= 0 &&
        idPosition >= 0 &&
        keyPosition < idPosition
    );

    pass(
        "persistence-key route remains registered before generic Forecast ID route"
    );
}


/*
|--------------------------------------------------------------------------
| 2. Parent /forecasting mount security topology
|--------------------------------------------------------------------------
*/

{
    const parentRouter =
        createRecordingRouter();

    const childRouter =
        createRecordingRouter();

    const authenticate =
        function authenticate(
            req,
            res,
            next
        ) {
            next?.();
        };

    const requireActiveSession =
        function requireActiveSession(
            req,
            res,
            next
        ) {
            next?.();
        };

    const requestedPermissions =
        [];

    const permissionMiddleware =
        new Map();

    const requirePermission =
        (permission) => {
            requestedPermissions.push(
                permission
            );

            const middleware =
                function permissionGuard(
                    req,
                    res,
                    next
                ) {
                    next?.();
                };

            permissionMiddleware.set(
                permission,
                middleware
            );

            return middleware;
        };


    const engineeringRouter =
        createRecordingRouter();

    const financialRouter =
        createRecordingRouter();

    const optimizationRouter =
        createRecordingRouter();


    const engineeringControllerFactory =
        () => ({
            health: noop,
        });

    const engineeringRouterFactory =
        () => engineeringRouter;

    const forecastingApiServiceFactory =
        () => ({
            marker:
                "forecasting-api-service",
        });

    let receivedForecastingService =
        null;

    const forecastingControllerFactory =
        ({
            forecastingApiService,
        }) => {
            receivedForecastingService =
                forecastingApiService;

            return controller;
        };

    let receivedForecastingController =
        null;

    const forecastingRouterFactory =
        ({
            controller:
                suppliedController,
        }) => {
            receivedForecastingController =
                suppliedController;

            return childRouter;
        };

    const financialBiRouterFactory =
        () => financialRouter;


    const ForecastRecordModel = {
        marker:
            "ForecastRecordModel",
    };


    const result =
        createBackendApiIntegrationRouter({
            routerFactory:
                () => parentRouter,

            engineeringAggregateProvider:
                async () => ({}),

            engineeringControllerFactory,

            engineeringRouterFactory,

            forecastingApiServiceFactory,

            forecastingControllerFactory,

            forecastingRouterFactory,

            financialBiRouterFactory,

            optimizationRouter,

            ForecastRecordModel,

            authenticate,

            requireActiveSession,

            requirePermission,
        });


    assert.strictEqual(
        result,
        parentRouter
    );

    pass(
        "backend integration preserves injected parent router"
    );


    assert.ok(
        receivedForecastingService
    );

    pass(
        "backend integration constructs Forecasting service before controller"
    );


    assert.strictEqual(
        receivedForecastingController,
        controller
    );

    pass(
        "backend integration supplies existing Forecasting controller to child router"
    );


    assert.ok(
        requestedPermissions.includes(
            RBAC_PERMISSIONS.READ_FORECASTING
        )
    );

    pass(
        "backend integration requests READ_FORECASTING permission"
    );


    const forecastingMount =
        parentRouter.calls.find(
            (call) =>
                call.method === "use" &&
                call.args[0] ===
                    BACKEND_API_INTEGRATION_PATHS.FORECASTING
        );

    assert.ok(
        forecastingMount
    );

    pass(
        "Forecasting router is mounted at the canonical /forecasting child path"
    );


    const forecastingPermission =
        permissionMiddleware.get(
            RBAC_PERMISSIONS.READ_FORECASTING
        );

    assert.ok(
        forecastingPermission
    );


    assert.deepEqual(
        forecastingMount.args,
        [
            BACKEND_API_INTEGRATION_PATHS.FORECASTING,
            authenticate,
            requireActiveSession,
            forecastingPermission,
            childRouter,
        ]
    );

    pass(
        "Forecasting parent chain is authenticate -> active session -> READ_FORECASTING -> child router"
    );


    assert.equal(
        forecastingMount.args.length,
        5
    );

    pass(
        "Forecasting parent mount has exactly three security middleware stages before child router"
    );


    assert.strictEqual(
        forecastingMount.args[1],
        authenticate
    );

    assert.strictEqual(
        forecastingMount.args[2],
        requireActiveSession
    );

    assert.strictEqual(
        forecastingMount.args[3],
        forecastingPermission
    );

    assert.strictEqual(
        forecastingMount.args[4],
        childRouter
    );

    pass(
        "Forecasting parent security middleware order cannot be bypassed by mount ordering"
    );
}


/*
|--------------------------------------------------------------------------
| 3. Security separation invariants
|--------------------------------------------------------------------------
*/

{
    const router =
        createRecordingRouter();

    const childAuthenticate =
        function childAuthenticate(
            req,
            res,
            next
        ) {
            next?.();
        };

    const requireSiteAccess =
        function requireSiteAccess(
            req,
            res,
            next
        ) {
            next?.();
        };

    createForecastingRouter({
        controller,
        authenticate:
            childAuthenticate,
        requireSiteAccess,
        routerFactory:
            () => router,
    });

    const useCalls =
        router.calls.filter(
            (call) =>
                call.method === "use"
        );

    assert.equal(
        useCalls.length,
        1
    );

    assert.deepEqual(
        useCalls[0].args,
        [
            childAuthenticate,
        ]
    );

    pass(
        "optional child authentication remains explicit and is not silently fabricated"
    );


    const getCalls =
        router.calls.filter(
            (call) =>
                call.method === "get"
        );

    const collection =
        getCalls.find(
            (call) =>
                call.args[0] ===
                FORECASTING_ROUTE_PATHS.forecasts
        );

    const byId =
        getCalls.find(
            (call) =>
                call.args[0] ===
                FORECASTING_ROUTE_PATHS.forecastById
        );

    const byKey =
        getCalls.find(
            (call) =>
                call.args[0] ===
                FORECASTING_ROUTE_PATHS.forecastByPersistenceKey
        );

    assert.equal(
        collection.args.includes(
            requireSiteAccess
        ),
        false
    );

    assert.equal(
        byId.args.includes(
            requireSiteAccess
        ),
        false
    );

    assert.equal(
        byKey.args.includes(
            requireSiteAccess
        ),
        false
    );

    pass(
        "parameter-based Installation ACL is not incorrectly applied to collection or opaque routes"
    );
}


console.log(
    "\n================================================"
);

console.log(
    "P.1H-G3-E2 VALIDATION PASSED"
);

console.log(
    "================================================"
);

console.log(
    `PASS: ${passed}/${passed}`
);
