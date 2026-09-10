// routes/engineeringAnalyticsRoutes.js

import {
    Router,
} from "express";


export const ENGINEERING_ANALYTICS_ROUTE_PATHS =
    Object.freeze({
        HEALTH:
            "/health",

        FLEET:
            "/fleet",

        FAMILIES:
            "/families",

        FAMILY:
            "/families/:family",

        SITES:
            "/sites",

        SITE:
            "/sites/:vrmSiteId",

        SITE_FAMILY:
            "/sites/:vrmSiteId/families/:family",
    });


export function createEngineeringAnalyticsRouter({
    controller,
    authenticate = null,
} = {}) {
    if (
        !controller ||
        typeof controller !==
            "object"
    ) {
        throw new Error(
            "Engineering Analytics controller is required."
        );
    }

    const requiredHandlers =
        [
            "health",
            "fleet",
            "families",
            "family",
            "sites",
            "site",
            "siteFamily",
        ];

    for (
        const handler
        of requiredHandlers
    ) {
        if (
            typeof controller[
                handler
            ] !==
            "function"
        ) {
            throw new Error(
                `Engineering Analytics controller handler missing: ${handler}`
            );
        }
    }

    if (
        authenticate !==
            null &&
        typeof authenticate !==
            "function"
    ) {
        throw new Error(
            "Engineering Analytics authenticate middleware must be a function or null."
        );
    }

    const router =
        Router();

    const middleware =
        authenticate
            ? [
                authenticate,
            ]
            : [];

    router.get(
        ENGINEERING_ANALYTICS_ROUTE_PATHS.HEALTH,
        ...middleware,
        controller.health
    );

    router.get(
        ENGINEERING_ANALYTICS_ROUTE_PATHS.FLEET,
        ...middleware,
        controller.fleet
    );

    router.get(
        ENGINEERING_ANALYTICS_ROUTE_PATHS.FAMILIES,
        ...middleware,
        controller.families
    );

    router.get(
        ENGINEERING_ANALYTICS_ROUTE_PATHS.FAMILY,
        ...middleware,
        controller.family
    );

    router.get(
        ENGINEERING_ANALYTICS_ROUTE_PATHS.SITES,
        ...middleware,
        controller.sites
    );

    router.get(
        ENGINEERING_ANALYTICS_ROUTE_PATHS.SITE_FAMILY,
        ...middleware,
        controller.siteFamily
    );

    router.get(
        ENGINEERING_ANALYTICS_ROUTE_PATHS.SITE,
        ...middleware,
        controller.site
    );

    return router;
}


export default Object.freeze({
    ENGINEERING_ANALYTICS_ROUTE_PATHS,
    createEngineeringAnalyticsRouter,
});
