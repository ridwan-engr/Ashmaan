import express from "express";

import {
  getInstallations,
  getInstallationById,
  getInstallationTelemetry,
  getInstallationAlarms,
  getInstallationStatistics,
} from "../controllers/vrmController.js";

import asyncHandler from "../utils/asyncHandler.js";

import requireInstallationAccess
  from "../middleware/requireInstallationAccess.js";

const router = express.Router();

const requireVrmInstallationAccess =
  requireInstallationAccess({
    paramName: "id",
    source: "params",
  });

router.get(
  "/installations",
  asyncHandler(getInstallations)
);

router.get(
  "/installations/:id",
  requireVrmInstallationAccess,
  asyncHandler(getInstallationById)
);

router.get(
  "/installations/:id/telemetry",
  requireVrmInstallationAccess,
  asyncHandler(getInstallationTelemetry)
);

router.get(
  "/installations/:id/alarms",
  requireVrmInstallationAccess,
  asyncHandler(getInstallationAlarms)
);

router.get(
  "/installations/:id/statistics",
  requireVrmInstallationAccess,
  asyncHandler(getInstallationStatistics)
);


export default router;