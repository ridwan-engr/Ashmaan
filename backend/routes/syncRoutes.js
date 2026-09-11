import express from "express";

import {
  synchronizeVrm,
  synchronizeInstallationDevices,
  synchronizeInstallationTelemetry,
  syncInstallationAlarmRules,
  syncInstallationStatistics,
} from "../controllers/syncController.js";

import asyncHandler
  from "../utils/asyncHandler.js";

import authenticateJwt
  from "../middleware/authenticateJwt.js";

import requirePrivilegedRole
  from "../middleware/requirePrivilegedRole.js";


const router =
  express.Router();


/*
|--------------------------------------------------------------------------
| Production security boundary
|--------------------------------------------------------------------------
|
| Every synchronization endpoint can cause persistent data mutation.
|
| Therefore:
| - authentication is mandatory
| - anonymous access is denied
| - explicit privileged authorization is mandatory
|
|--------------------------------------------------------------------------
*/

router.use(
  authenticateJwt
);

router.use(
  requirePrivilegedRole
);


router.post(
  "/vrm",
  asyncHandler(
    synchronizeVrm
  )
);


router.post(
  "/vrm/installations/:id/devices",
  asyncHandler(
    synchronizeInstallationDevices
  )
);


router.post(
  "/vrm/installations/:id/telemetry",
  asyncHandler(
    synchronizeInstallationTelemetry
  )
);


router.post(
  "/vrm/installations/:id/alarms",
  asyncHandler(
    syncInstallationAlarmRules
  )
);


router.post(
  "/vrm/installations/:id/statistics",
  asyncHandler(
    syncInstallationStatistics
  )
);


export default router;