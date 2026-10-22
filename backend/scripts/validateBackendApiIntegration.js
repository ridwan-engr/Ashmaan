import assert
    from "node:assert/strict";

import {
    BACKEND_API_INTEGRATION_PHASE,
    BACKEND_API_INTEGRATION_LAYER,
    BACKEND_API_INTEGRATION_BASE_PATH,
    BACKEND_API_INTEGRATION_PATHS,
    BACKEND_API_INTEGRATION_BOUNDARIES,
    createUnavailableEngineeringAggregateProvider,
    createBackendApiIntegrationRouter,
}
    from "../routes/backendApiIntegrationRoutes.js";

import {
    RBAC_PERMISSIONS,
}
    from "../services/security/authorizationRbacService.js";


let assertionCount =
    0;


function pass(
    message
) {
    assertionCount +=
        1;

    console.log(
        `PASS ${assertionCount}: ${message}`
    );
}


function equal(
    actual,
    expected,
    message
) {
    assert.equal(
        actual,
        expected,
        message
    );

    pass(
        message
    );
}


function same(
    actual,
    expected,
    message
) {
    assert.strictEqual(
        actual,
        expected,
        message
    );

    pass(
        message
    );
}


function ok(
    value,
    message
) {
    assert.ok(
        value,
        message
    );

    pass(
        message
    );
}


async function throwsAsync(
    fn,
    matcher,
    message
) {
    await assert.rejects(
        fn,
        matcher
    );

    pass(
        message
    );
}


function throws(
    fn,
    matcher,
    message
) {
    assert.throws(
        fn,
        matcher
    );

    pass(
        message
    );
}


console.log("");
console.log(
    "================================================"
);
console.log(
    "ASHMAAN PHASE 12.8 BACKEND API INTEGRATION"
);
console.log(
    "================================================"
);
console.log("");


/*
|--------------------------------------------------------------------------
| A. Contract identity
|--------------------------------------------------------------------------
*/

equal(
    BACKEND_API_INTEGRATION_PHASE,
    "12.8",
    "integration phase is 12.8"
);

equal(
    BACKEND_API_INTEGRATION_LAYER,
    "BACKEND_API_INTEGRATION",
    "integration layer is explicit"
);

equal(
    BACKEND_API_INTEGRATION_BASE_PATH,
    "/api/v1",
    "canonical backend API root remains /api/v1"
);


/*
|--------------------------------------------------------------------------
| B. Canonical paths
|--------------------------------------------------------------------------
*/

equal(
    BACKEND_API_INTEGRATION_PATHS
        .ENGINEERING_ANALYTICS,
    "/engineering-analytics",
    "Engineering Analytics canonical child path is preserved"
);

equal(
    BACKEND_API_INTEGRATION_PATHS
        .FORECASTING,
    "/forecasting",
    "Forecasting canonical child path is preserved"
);

equal(
    BACKEND_API_INTEGRATION_PATHS
        .FINANCIAL_BI,
    "/financial-bi",
    "Financial/BI canonical child path is preserved"
);

equal(
    BACKEND_API_INTEGRATION_PATHS
        .OPTIMIZATION_DSS,
    "/optimization-dss",
    "Optimization/DSS canonical child path is preserved"
);


/*
|--------------------------------------------------------------------------
| C. Integration boundaries
|--------------------------------------------------------------------------
*/

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .existingEngineeringAnalyticsApiUsed,
    true,
    "12.8 uses the existing Engineering Analytics API"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .existingForecastingApiUsed,
    true,
    "12.8 uses the existing Forecasting API"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .existingFinancialBiApiUsed,
    true,
    "12.8 uses the existing Financial/BI API"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .existingOptimizationDssApiUsed,
    true,
    "12.8 uses the existing Optimization/DSS API"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .createsParallelEngineeringApi,
    false,
    "12.8 creates no parallel Engineering Analytics API"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .createsParallelForecastingApi,
    false,
    "12.8 creates no parallel Forecasting API"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .createsParallelFinancialBiApi,
    false,
    "12.8 creates no parallel Financial/BI API"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .createsParallelOptimizationDssApi,
    false,
    "12.8 creates no parallel Optimization/DSS API"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .readOnly,
    true,
    "backend integration remains read-only"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .getOnly,
    true,
    "backend integration exposes GET-only Phase 8-11 APIs"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .engineeringCalculationIncluded,
    false,
    "12.8 does not calculate Engineering Analytics"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .engineeringAggregateFabricationAllowed,
    false,
    "12.8 cannot fabricate a Phase 8.8 engineering aggregate"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .forecastingTrainingIncluded,
    false,
    "12.8 does not train forecasting models"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .forecastingExecutionIncluded,
    false,
    "12.8 does not execute forecasting"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .forecastPersistenceIncluded,
    false,
    "12.8 does not persist forecasts"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .financialBiCalculationIncluded,
    false,
    "12.8 does not calculate Financial/BI metrics"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .financialBiAggregationIncluded,
    false,
    "12.8 does not aggregate Financial/BI metrics"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .financialBiPersistenceIncluded,
    false,
    "12.8 does not persist Financial/BI records"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .optimizationModelBuildIncluded,
    false,
    "12.8 does not build an Optimization/DSS model"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .solverIncluded,
    false,
    "12.8 includes no solver"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .optimizationExecutionIncluded,
    false,
    "12.8 does not execute optimization"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .recommendationGenerationIncluded,
    false,
    "12.8 does not generate recommendations"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .recommendationPersistenceIncluded,
    false,
    "12.8 does not persist recommendations"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .telemetryMutationIncluded,
    false,
    "12.8 does not mutate telemetry"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .eventMutationIncluded,
    false,
    "12.8 does not mutate events"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .missingMeansZero,
    false,
    "missing values remain distinct from zero"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .unavailableMeansZero,
    false,
    "unavailable values remain distinct from zero"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .unitInferenceAllowed,
    false,
    "unit inference remains blocked"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .currencyInferenceAllowed,
    false,
    "currency inference remains blocked"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .currencyConversionAllowed,
    false,
    "currency conversion remains blocked"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .tariffInferenceAllowed,
    false,
    "tariff inference remains blocked"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .emissionFactorInferenceAllowed,
    false,
    "emission-factor inference remains blocked"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .topologyInferenceAllowed,
    false,
    "topology inference remains blocked"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .automatedControlIncluded,
    false,
    "12.8 exposes no automated control"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .automaticDispatchAllowed,
    false,
    "automatic dispatch remains prohibited"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .executableActionProduced,
    false,
    "12.8 cannot produce an executable action"
);

equal(
    BACKEND_API_INTEGRATION_BOUNDARIES
        .legacyOptimizationRouteRemovalIncluded,
    false,
    "12.8 does not remove the proven legacy Optimization/DSS route"
);


/*
|--------------------------------------------------------------------------
| D. Explicit Engineering Analytics unavailability
|--------------------------------------------------------------------------
*/

const unavailableProvider =
    createUnavailableEngineeringAggregateProvider();

equal(
    typeof unavailableProvider,
    "function",
    "default Engineering Analytics upstream provider is explicit"
);

await throwsAsync(
    () =>
        unavailableProvider(),
    (
        error
    ) =>
        error?.statusCode ===
        503 &&
        error?.code ===
        "ENGINEERING_AGGREGATE_PROVIDER_UNAVAILABLE",
    "missing live Phase 8.8 provider becomes explicit UNAVAILABLE rather than fabricated EMPTY"
);


/*
|--------------------------------------------------------------------------
| E. Composition fixture
|--------------------------------------------------------------------------
*/

const mounts =
    [];

const routerFixture =
{
    use(
        path,
        ...handlers
    ) {
        mounts.push({
            path,
            handlers,
            childRouter:
                handlers[
                handlers.length - 1
                ],
        });

        return this;
    },
};

const routerFactory =
    () =>
        routerFixture;

const authenticate =
    function authenticateFixture(
        req,
        res,
        next
    ) {
        return next();
    };


const requireActiveSession =
    function activeSessionFixture(
        req,
        res,
        next
    ) {
        return next();
    };


const permissionRequests =
    [];


const permissionMiddlewares =
    new Map();


const requirePermission =
    (
        permission
    ) => {
        permissionRequests.push(
            permission
        );

        const middleware =
            function permissionFixture(
                req,
                res,
                next
            ) {
                return next();
            };

        permissionMiddlewares.set(
            permission,
            middleware
        );

        return middleware;
    };


const engineeringAggregate =
    Object.freeze({
        phase:
            "8.8",
    });

const aggregateProvider =
    async () =>
        engineeringAggregate;


let receivedEngineeringProvider =
    null;

const engineeringController =
    Object.freeze({
        health() { },
        fleet() { },
        families() { },
        family() { },
        sites() { },
        site() { },
        siteFamily() { },
    });

const engineeringControllerFactory =
    ({
        aggregateProvider:
        suppliedProvider,
    }) => {
        receivedEngineeringProvider =
            suppliedProvider;

        return engineeringController;
    };


const engineeringRouter =
    Object.freeze({
        kind:
            "ENGINEERING_ROUTER",
    });

const engineeringRouterFactory =
    ({
        controller,
    }) => {
        same(
            controller,
            engineeringController,
            "Engineering router receives existing Engineering controller"
        );

        return engineeringRouter;
    };


const ForecastRecordModel =
    Object.freeze({
        kind:
            "FORECAST_MODEL",
    });


const forecastingApiService =
    Object.freeze({
        health() { },
        listForecasts() { },
        getForecastById() { },
        getForecastByPersistenceKey() { },
        listSiteForecasts() { },
        getLatestSiteTargetForecast() { },
    });

let receivedForecastModel =
    null;

const forecastingApiServiceFactory =
    ({
        ForecastRecordModel:
        suppliedModel,
    }) => {
        receivedForecastModel =
            suppliedModel;

        return forecastingApiService;
    };


const forecastingController =
    Object.freeze({
        health() { },
        listForecasts() { },
        getForecastById() { },
        getForecastByPersistenceKey() { },
        listSiteForecasts() { },
        getLatestSiteTargetForecast() { },
    });


const forecastingControllerFactory =
    ({
        forecastingApiService:
        suppliedService,
    }) => {
        same(
            suppliedService,
            forecastingApiService,
            "Forecasting controller receives existing Forecasting API service"
        );

        return forecastingController;
    };


const forecastingRouter =
    Object.freeze({
        kind:
            "FORECASTING_ROUTER",
    });

const forecastingRouterFactory =
    ({
        controller,
    }) => {
        same(
            controller,
            forecastingController,
            "Forecasting router receives existing Forecasting controller"
        );

        return forecastingRouter;
    };


const financialBiRouter =
    Object.freeze({
        kind:
            "FINANCIAL_BI_ROUTER",
    });

const financialBiRouterFactory =
    () =>
        financialBiRouter;


const optimizationRouter =
    Object.freeze({
        kind:
            "OPTIMIZATION_DSS_ROUTER",
    });


const integratedRouter =
    createBackendApiIntegrationRouter({
        engineeringAggregateProvider:
            aggregateProvider,

        ForecastRecordModel,

        routerFactory,

        engineeringControllerFactory,

        engineeringRouterFactory,

        forecastingApiServiceFactory,

        forecastingControllerFactory,

        forecastingRouterFactory,

        financialBiRouterFactory,

        optimizationRouter,

        authenticate,

        requireActiveSession,

        requirePermission,
    });


same(
    integratedRouter,
    routerFixture,
    "12.8 returns the integration router"
);

same(
    receivedEngineeringProvider,
    aggregateProvider,
    "Engineering aggregate provider is passed unchanged"
);

same(
    receivedForecastModel,
    ForecastRecordModel,
    "ForecastRecord model is passed unchanged"
);

equal(
    mounts.length,
    4,
    "12.8 mounts exactly four Phase 8-11 API surfaces"
);

equal(
    mounts[0].path,
    "/engineering-analytics",
    "Engineering Analytics is mounted at canonical child path"
);

same(
    mounts[0].childRouter,
    engineeringRouter,
    "Engineering Analytics mount preserves existing router"
);

equal(
    mounts[1].path,
    "/forecasting",
    "Forecasting is mounted at canonical child path"
);

same(
    mounts[1].childRouter,
    forecastingRouter,
    "Forecasting mount preserves existing router"
);

equal(
    mounts[2].path,
    "/financial-bi",
    "Financial/BI is mounted at canonical child path"
);

same(
    mounts[2].childRouter,
    financialBiRouter,
    "Financial/BI mount preserves existing router"
);

equal(
    mounts[3].path,
    "/optimization-dss",
    "Optimization/DSS is mounted at canonical child path"
);

same(
    mounts[3].childRouter,
    optimizationRouter,
    "Optimization/DSS mount preserves existing router"
);

/*
|--------------------------------------------------------------------------
| E.1 Production security composition
|--------------------------------------------------------------------------
*/

equal(
    permissionRequests.length,
    4,
    "12.8 integration requests exactly four analytical permissions"
);

equal(
    permissionRequests[0],
    RBAC_PERMISSIONS
        .READ_ENGINEERING_ANALYTICS,
    "Engineering Analytics requires READ_ENGINEERING_ANALYTICS"
);

equal(
    permissionRequests[1],
    RBAC_PERMISSIONS
        .READ_FORECASTING,
    "Forecasting requires READ_FORECASTING"
);

equal(
    permissionRequests[2],
    RBAC_PERMISSIONS
        .READ_FINANCIAL_BI,
    "Financial/BI requires READ_FINANCIAL_BI"
);

equal(
    permissionRequests[3],
    RBAC_PERMISSIONS
        .READ_OPTIMIZATION_DSS,
    "Optimization/DSS requires READ_OPTIMIZATION_DSS"
);


for (
    const {
        mount,
        permission,
        label,
    }
    of [
        {
            mount:
                mounts[0],

            permission:
                RBAC_PERMISSIONS
                    .READ_ENGINEERING_ANALYTICS,

            label:
                "Engineering Analytics",
        },
        {
            mount:
                mounts[1],

            permission:
                RBAC_PERMISSIONS
                    .READ_FORECASTING,

            label:
                "Forecasting",
        },
        {
            mount:
                mounts[2],

            permission:
                RBAC_PERMISSIONS
                    .READ_FINANCIAL_BI,

            label:
                "Financial/BI",
        },
        {
            mount:
                mounts[3],

            permission:
                RBAC_PERMISSIONS
                    .READ_OPTIMIZATION_DSS,

            label:
                "Optimization/DSS",
        },
    ]
) {
    equal(
        mount.handlers.length,
        4,
        `${label} mount has exactly three security middleware stages before its router`
    );

    same(
        mount.handlers[0],
        authenticate,
        `${label} authenticates ACCESS token first`
    );

    same(
        mount.handlers[1],
        requireActiveSession,
        `${label} validates active session second`
    );

    same(
        mount.handlers[2],
        permissionMiddlewares.get(
            permission
        ),
        `${label} enforces explicit permission third`
    );

    same(
        mount.handlers[3],
        mount.childRouter,
        `${label} reaches existing router only after security chain`
    );
}


/*
|--------------------------------------------------------------------------
| F. Provider semantics
|--------------------------------------------------------------------------
*/

same(
    await receivedEngineeringProvider(),
    engineeringAggregate,
    "12.8 does not clone or rewrite supplied Engineering Analytics aggregate"
);


/*
|--------------------------------------------------------------------------
| G. Guards
|--------------------------------------------------------------------------
*/

throws(
    () =>
        createBackendApiIntegrationRouter({
            routerFactory:
                null,
        }),
    /BACKEND_API_ROUTER_FACTORY_REQUIRED/,
    "missing router factory is rejected"
);

throws(
    () =>
        createBackendApiIntegrationRouter({
            engineeringAggregateProvider:
                "invalid",
        }),
    /ENGINEERING_AGGREGATE_PROVIDER_REQUIRED/,
    "invalid Engineering Analytics aggregate provider is rejected"
);

throws(
    () =>
        createBackendApiIntegrationRouter({
            financialBiRouterFactory:
                null,
        }),
    /FINANCIAL_BI_ROUTER_FACTORY_REQUIRED/,
    "missing Financial/BI router factory is rejected"
);

throws(
    () =>
        createBackendApiIntegrationRouter({
            optimizationRouter:
                null,
        }),
    /OPTIMIZATION_DSS_ROUTER_REQUIRED/,
    "missing Optimization/DSS router is rejected"
);

throws(
    () =>
        createBackendApiIntegrationRouter({
            authenticate:
                null,
        }),
    /PORTAL_ACCESS_AUTHENTICATION_REQUIRED/,
    "missing portal ACCESS authentication middleware is rejected"
);

throws(
    () =>
        createBackendApiIntegrationRouter({
            requireActiveSession:
                null,
        }),
    /PORTAL_ACTIVE_SESSION_REQUIRED/,
    "missing active portal session middleware is rejected"
);

throws(
    () =>
        createBackendApiIntegrationRouter({
            requirePermission:
                null,
        }),
    /PORTAL_PERMISSION_AUTHORIZATION_REQUIRED/,
    "missing portal permission authorization factory is rejected"
);


/*
|--------------------------------------------------------------------------
| H. Assertion plan complete
|--------------------------------------------------------------------------
*/

ok(
    assertionCount >
    0,
    "12.8 assertion plan completed"
);


console.log("");
console.log(
    `Assertions passed: ${assertionCount}`
);
console.log(
    "================================================"
);
console.log(
    "ASHMAAN PHASE 12.8 BACKEND API INTEGRATION PASSED"
);
console.log(
    "================================================"
);
