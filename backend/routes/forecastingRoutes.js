// routes/forecastingRoutes.js

import {
    Router,
} from "express";


export const FORECASTING_ROUTE_PATHS =
    Object.freeze({
        health:
            "/health",

        forecasts:
            "/forecasts",

        forecastById:
            "/forecasts/:id",

        forecastByPersistenceKey:
            "/forecasts/by-key/:persistenceKey",

        siteForecasts:
            "/sites/:vrmSiteId/forecasts",

        latestSiteTargetForecast:
            "/sites/:vrmSiteId/targets/:targetFamily/:targetMetric/latest",
    });


export function createForecastingRouter({
    controller,
    authenticate = null,
    routerFactory =
        Router,
} = {}) {
    if (
        !controller ||
        typeof controller !==
            "object"
    ) {
        throw new Error(
            "FORECASTING_CONTROLLER_REQUIRED"
        );
    }

    const router =
        routerFactory();

    if (
        authenticate
    ) {
        router.use(
            authenticate
        );
    }

    router.get(
        FORECASTING_ROUTE_PATHS.health,
        controller.health
    );

    router.get(
        FORECASTING_ROUTE_PATHS.forecasts,
        controller.listForecasts
    );

    router.get(
        FORECASTING_ROUTE_PATHS.forecastByPersistenceKey,
        controller.getForecastByPersistenceKey
    );

    router.get(
        FORECASTING_ROUTE_PATHS.forecastById,
        controller.getForecastById
    );

    router.get(
        FORECASTING_ROUTE_PATHS.siteForecasts,
        controller.listSiteForecasts
    );

    router.get(
        FORECASTING_ROUTE_PATHS.latestSiteTargetForecast,
        controller.getLatestSiteTargetForecast
    );

    return router;
}


export default createForecastingRouter;
