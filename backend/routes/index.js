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


const router =
    express.Router();


router.use(
    "/health",
    healthRoutes
);

router.use(
    "/vrm",
    vrmRoutes
);

router.use(
    "/sync",
    syncRoutes
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