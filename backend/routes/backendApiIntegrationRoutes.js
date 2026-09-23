// routes/backendApiIntegrationRoutes.js

import express
    from "express";

import ForecastRecord
    from "../models/ForecastRecord.js";

import {
    createEngineeringAnalyticsController,
}
    from "../controllers/engineeringAnalyticsController.js";

import {
    createEngineeringAnalyticsRouter,
}
    from "./engineeringAnalyticsRoutes.js";

import {
    createProductionEngineeringHttpProvider,
}
    from "../services/engineering/productionEngineeringHttpProvider.js";

import {
    createForecastingApiService,
}
    from "../services/forecasting/forecastingApiService.js";

import {
    createForecastingController,
}
    from "../controllers/forecastingController.js";

import {
    createForecastingRouter,
}
    from "./forecastingRoutes.js";

import {
    createFinancialBiRouter,
}
    from "./financialBiRoutes.js";

import optimizationDssRoutes
    from "./optimizationDssRoutes.js";

import authenticatePortalAccessToken
    from "../middleware/authenticatePortalAccessToken.js";

import requireActivePortalSession
    from "../middleware/requireActivePortalSession.js";

import requirePortalPermission
    from "../middleware/requirePortalPermission.js";

import {
    RBAC_PERMISSIONS,
}
    from "../services/security/authorizationRbacService.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 12.8 - Backend API Integration
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Mount the already-existing Engineering Analytics, Forecasting,
| Financial/BI, and Optimization/DSS read-only API layers beneath the
| canonical /api/v1 backend root.
|
| This integration layer DOES NOT:
|
| - calculate Engineering Analytics
| - fabricate a Phase 8.8 fleet aggregate
| - train or execute forecasting models
| - persist forecasts
| - calculate or aggregate Financial/BI KPIs
| - persist Financial/BI records
| - build or execute Optimization/DSS models
| - invoke a solver
| - generate recommendations
| - persist recommendations
| - expose executable control
| - expose automatic dispatch
| - mutate telemetry or events
|
|--------------------------------------------------------------------------
*/


export const BACKEND_API_INTEGRATION_PHASE =
    "12.8";

export const BACKEND_API_INTEGRATION_LAYER =
    "BACKEND_API_INTEGRATION";

export const BACKEND_API_INTEGRATION_BASE_PATH =
    "/api/v1";


export const BACKEND_API_INTEGRATION_PATHS =
    Object.freeze({
        ENGINEERING_ANALYTICS:
            "/engineering-analytics",

        FORECASTING:
            "/forecasting",

        FINANCIAL_BI:
            "/financial-bi",

        OPTIMIZATION_DSS:
            "/optimization-dss",
    });


export const BACKEND_API_INTEGRATION_BOUNDARIES =
    Object.freeze({
        canonicalApiRoot:
            BACKEND_API_INTEGRATION_BASE_PATH,

        existingEngineeringAnalyticsApiUsed:
            true,

        existingForecastingApiUsed:
            true,

        existingFinancialBiApiUsed:
            true,

        existingOptimizationDssApiUsed:
            true,

        createsParallelEngineeringApi:
            false,

        createsParallelForecastingApi:
            false,

        createsParallelFinancialBiApi:
            false,

        createsParallelOptimizationDssApi:
            false,

        readOnly:
            true,

        getOnly:
            true,

        engineeringCalculationIncluded:
            false,

        engineeringAggregateFabricationAllowed:
            false,

        forecastingTrainingIncluded:
            false,

        forecastingExecutionIncluded:
            false,

        forecastPersistenceIncluded:
            false,

        financialBiCalculationIncluded:
            false,

        financialBiAggregationIncluded:
            false,

        financialBiPersistenceIncluded:
            false,

        optimizationModelBuildIncluded:
            false,

        solverIncluded:
            false,

        optimizationExecutionIncluded:
            false,

        recommendationGenerationIncluded:
            false,

        recommendationPersistenceIncluded:
            false,

        telemetryMutationIncluded:
            false,

        eventMutationIncluded:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        unitInferenceAllowed:
            false,

        currencyInferenceAllowed:
            false,

        currencyConversionAllowed:
            false,

        tariffInferenceAllowed:
            false,

        emissionFactorInferenceAllowed:
            false,

        topologyInferenceAllowed:
            false,

        automatedControlIncluded:
            false,

        automaticDispatchAllowed:
            false,

        executableActionProduced:
            false,

        legacyOptimizationRouteRemovalIncluded:
            false,
    });


export function createUnavailableEngineeringAggregateProvider() {
    return async function unavailableEngineeringAggregateProvider() {
        const error =
            new Error(
                "Phase 8.8 engineering aggregate provider is not connected."
            );

        error.statusCode =
            503;

        error.code =
            "ENGINEERING_AGGREGATE_PROVIDER_UNAVAILABLE";

        throw error;
    };
}


function requireFunction(
    value,
    name
) {
    if (
        typeof value !==
            "function"
    ) {
        throw new Error(
            `${name}_REQUIRED`
        );
    }

    return value;
}


function requireRouter(
    value,
    name
) {
    if (
        !value ||
        (
            typeof value !==
                "function" &&
            typeof value !==
                "object"
        )
    ) {
        throw new Error(
            `${name}_REQUIRED`
        );
    }

    return value;
}


export function createBackendApiIntegrationRouter({
    engineeringAggregateProvider =
        createProductionEngineeringHttpProvider(),

    ForecastRecordModel =
        ForecastRecord,

    routerFactory =
        express.Router,

    engineeringControllerFactory =
        createEngineeringAnalyticsController,

    engineeringRouterFactory =
        createEngineeringAnalyticsRouter,

    forecastingApiServiceFactory =
        createForecastingApiService,

    forecastingControllerFactory =
        createForecastingController,

    forecastingRouterFactory =
        createForecastingRouter,

    financialBiRouterFactory =
        createFinancialBiRouter,

    optimizationRouter =
        optimizationDssRoutes,

    authenticate =
        authenticatePortalAccessToken,

    requireActiveSession =
        requireActivePortalSession,

    requirePermission =
        requirePortalPermission,
} = {}) {
    requireFunction(
        routerFactory,
        "BACKEND_API_ROUTER_FACTORY"
    );

    requireFunction(
        engineeringAggregateProvider,
        "ENGINEERING_AGGREGATE_PROVIDER"
    );

    requireFunction(
        engineeringControllerFactory,
        "ENGINEERING_CONTROLLER_FACTORY"
    );

    requireFunction(
        engineeringRouterFactory,
        "ENGINEERING_ROUTER_FACTORY"
    );

    requireFunction(
        forecastingApiServiceFactory,
        "FORECASTING_API_SERVICE_FACTORY"
    );

    requireFunction(
        forecastingControllerFactory,
        "FORECASTING_CONTROLLER_FACTORY"
    );

    requireFunction(
        forecastingRouterFactory,
        "FORECASTING_ROUTER_FACTORY"
    );

    requireFunction(
        financialBiRouterFactory,
        "FINANCIAL_BI_ROUTER_FACTORY"
    );

    requireRouter(
        optimizationRouter,
        "OPTIMIZATION_DSS_ROUTER"
    );

    requireFunction(
        authenticate,
        "PORTAL_ACCESS_AUTHENTICATION"
    );

    requireFunction(
        requireActiveSession,
        "PORTAL_ACTIVE_SESSION"
    );

    requireFunction(
        requirePermission,
        "PORTAL_PERMISSION_AUTHORIZATION"
    );


    const router =
        routerFactory();


    if (
        !router ||
        typeof router.use !==
            "function"
    ) {
        throw new Error(
            "BACKEND_API_ROUTER_INVALID"
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Engineering Analytics
    |--------------------------------------------------------------------------
    */

    const engineeringController =
        engineeringControllerFactory({
            aggregateProvider:
                engineeringAggregateProvider,
        });

    const engineeringRouter =
        engineeringRouterFactory({
            controller:
                engineeringController,
        });


    /*
    |--------------------------------------------------------------------------
    | Forecasting
    |--------------------------------------------------------------------------
    */

    const forecastingApiService =
        forecastingApiServiceFactory({
            ForecastRecordModel,
        });

    const forecastingController =
        forecastingControllerFactory({
            forecastingApiService,
        });

    const forecastingRouter =
        forecastingRouterFactory({
            controller:
                forecastingController,
        });


    /*
    |--------------------------------------------------------------------------
    | Financial/BI
    |--------------------------------------------------------------------------
    */

    const financialBiRouter =
        financialBiRouterFactory();


    /*
    |--------------------------------------------------------------------------
    | Portal authorization boundaries
    |--------------------------------------------------------------------------
    |
    | Authentication, active-session validation, and explicit Phase 13.4
    | permission authorization are enforced at the parent integration
    | boundary before requests reach the existing read-only API routers.
    |
    |--------------------------------------------------------------------------
    */

    const requireEngineeringRead =
        requirePermission(
            RBAC_PERMISSIONS
                .READ_ENGINEERING_ANALYTICS
        );

    const requireForecastingRead =
        requirePermission(
            RBAC_PERMISSIONS
                .READ_FORECASTING
        );

    const requireFinancialBiRead =
        requirePermission(
            RBAC_PERMISSIONS
                .READ_FINANCIAL_BI
        );

    const requireOptimizationDssRead =
        requirePermission(
            RBAC_PERMISSIONS
                .READ_OPTIMIZATION_DSS
        );


    requireFunction(
        requireEngineeringRead,
        "ENGINEERING_PERMISSION_MIDDLEWARE"
    );

    requireFunction(
        requireForecastingRead,
        "FORECASTING_PERMISSION_MIDDLEWARE"
    );

    requireFunction(
        requireFinancialBiRead,
        "FINANCIAL_BI_PERMISSION_MIDDLEWARE"
    );

    requireFunction(
        requireOptimizationDssRead,
        "OPTIMIZATION_DSS_PERMISSION_MIDDLEWARE"
    );


    /*
    |--------------------------------------------------------------------------
    | Mount existing API layers
    |--------------------------------------------------------------------------
    |
    | Canonical security order:
    |
    | ACCESS authentication
    |     -> active persistent session
    |     -> explicit route-family permission
    |     -> existing read-only API router
    |
    |--------------------------------------------------------------------------
    */

    router.use(
        BACKEND_API_INTEGRATION_PATHS
            .ENGINEERING_ANALYTICS,
        authenticate,
        requireActiveSession,
        requireEngineeringRead,
        engineeringRouter
    );

    router.use(
        BACKEND_API_INTEGRATION_PATHS
            .FORECASTING,
        authenticate,
        requireActiveSession,
        requireForecastingRead,
        forecastingRouter
    );

    router.use(
        BACKEND_API_INTEGRATION_PATHS
            .FINANCIAL_BI,
        authenticate,
        requireActiveSession,
        requireFinancialBiRead,
        financialBiRouter
    );

    router.use(
        BACKEND_API_INTEGRATION_PATHS
            .OPTIMIZATION_DSS,
        authenticate,
        requireActiveSession,
        requireOptimizationDssRead,
        optimizationRouter
    );


    return router;
}


const backendApiIntegrationRoutes =
    createBackendApiIntegrationRouter();


export default backendApiIntegrationRoutes;

