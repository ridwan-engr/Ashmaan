import express from "express";

import {
  synchronizeVrm,
  synchronizeInstallationDevices,
  synchronizeInstallationTelemetry,
    syncInstallationAlarmRules,
    syncInstallationStatistics,
} from "../controllers/syncController.js";

import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();


router.post(
  "/vrm",
  asyncHandler(synchronizeVrm)
);

router.post(
  "/vrm/installations/:id/devices",
  asyncHandler(synchronizeInstallationDevices)
);

router.post(
  "/vrm/installations/:id/telemetry",
  asyncHandler(
    synchronizeInstallationTelemetry
  )
);

router.post(
  "/vrm/installations/:id/alarms",
  asyncHandler(syncInstallationAlarmRules)
);

router.post(
  "/vrm/installations/:id/statistics",
  asyncHandler(syncInstallationStatistics)
);

export default router;