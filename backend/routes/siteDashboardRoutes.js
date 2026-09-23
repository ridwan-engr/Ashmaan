import express from "express";

import {
  getSites,
  getSite,
  getTelemetry,
  getEnergyHistory,
  getSiteTelemetrySnapshotController,
} from "../controllers/siteDashboardController.js";

import requireInstallationAccess
  from "../middleware/requireInstallationAccess.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Collection
|--------------------------------------------------------------------------
|
| Collection ACL filtering is implemented separately in P.1H-E3/E4.
| Do not apply single-resource middleware here because this route has
| no caller-selected vrmSiteId.
|
*/

router.get(
  "/",
  getSites
);

/*
|--------------------------------------------------------------------------
| Single-installation resources
|--------------------------------------------------------------------------
|
| Authentication, active-session validation, and READ_DASHBOARD RBAC are
| enforced upstream at the /api/v1/dashboard/sites server mount.
|
| These routes additionally require explicit user-to-installation
| entitlement.
|
*/

const requireSiteAccess =
  requireInstallationAccess({
    paramName: "vrmSiteId",
    source: "params",
  });

router.get(
  "/:vrmSiteId",
  requireSiteAccess,
  getSite
);

router.get(
  "/:vrmSiteId/telemetry",
  requireSiteAccess,
  getTelemetry
);

router.get(
  "/:vrmSiteId/energy-history",
  requireSiteAccess,
  getEnergyHistory
);

router.get(
  "/:vrmSiteId/telemetry-snapshot",
  requireSiteAccess,
  getSiteTelemetrySnapshotController
);

export default router;
