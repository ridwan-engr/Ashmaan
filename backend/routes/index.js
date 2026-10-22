import express
    from "express";

import healthRoutes
    from "./healthRoutes.js";

import vrmRoutes
    from "./vrmRoutes.js";

import syncRoutes
    from "./syncRoutes.js";

import backendApiIntegrationRoutes
    from "./backendApiIntegrationRoutes.js";

import portalAuthRoutes
    from "./portalAuthRoutes.js";

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

import alarmRoutes
    from "./alarmRoutes.js";

const router =
    express.Router();

const requireDashboardRead =
    requirePortalPermission(
        RBAC_PERMISSIONS.READ_DASHBOARD
    );


router.use(
    "/health",
    healthRoutes
);

router.use(
    "/vrm",
    authenticatePortalAccessToken,
    requireActivePortalSession,
    requireDashboardRead,
    vrmRoutes
);

router.use(
    "/alarms",
    authenticatePortalAccessToken,
    requireActivePortalSession,
    requireDashboardRead,
    alarmRoutes
);

router.use(
    "/sync",
    syncRoutes
);

router.use(
    "/auth",
    portalAuthRoutes
);


/*
|--------------------------------------------------------------------------
| Phase 12.8 — Backend API Integration
|--------------------------------------------------------------------------
|
| server.js already mounts this router at:
|
|     /api/v1
|
| Therefore these become:
|
|     /api/v1/engineering-analytics
|     /api/v1/forecasting
|     /api/v1/financial-bi
|     /api/v1/optimization-dss
|
|--------------------------------------------------------------------------
*/

router.use(
    "/",
    backendApiIntegrationRoutes
);


export default router;
