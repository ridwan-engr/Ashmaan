// routes/optimizationDssConfigurationRoutes.js

import express
    from "express";

import requireInstallationAccess
    from "../middleware/requireInstallationAccess.js";

import requirePortalPermission
    from "../middleware/requirePortalPermission.js";

import {
    RBAC_PERMISSIONS,
} from "../services/security/authorizationRbacService.js";

import {
    createOptimizationDssConfigurationController,
} from "../controllers/optimizationDssConfigurationController.js";

import {
    createOptimizationDssExecutionController,
} from "../controllers/optimizationDssExecutionController.js";

const router =
    express.Router();


const controller =
    createOptimizationDssConfigurationController();

const executionController =
    createOptimizationDssExecutionController();

const requireSiteAccess =
    requireInstallationAccess({
        paramName:
            "vrmSiteId",

        source:
            "params",
    });


const requireOptimizationDssRead =
    requirePortalPermission(
        RBAC_PERMISSIONS
            .READ_OPTIMIZATION_DSS
    );


const requireOptimizationDssManage =
    requirePortalPermission(
        RBAC_PERMISSIONS
            .MANAGE_OPTIMIZATION_DSS
    );


router.get(
    "/sites/:vrmSiteId/configuration",

    requireOptimizationDssRead,

    requireSiteAccess,

    controller.getConfiguration
);


router.put(
    "/sites/:vrmSiteId/configuration",

    requireOptimizationDssManage,

    requireSiteAccess,

    controller.putConfiguration
);

router.post(
    "/sites/:vrmSiteId/run",

    requireOptimizationDssManage,

    requireSiteAccess,

    executionController.run
);


export default router;