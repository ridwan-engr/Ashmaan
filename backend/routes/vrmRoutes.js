import express from "express";

import {
  getInstallations,
  getInstallationById,
  getInstallationTelemetry,
  getInstallationAlarms,
  getInstallationStatistics,
  inspectInstallationTelemetry,
} from "../controllers/vrmController.js";

import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.get(
  "/installations",
  asyncHandler(getInstallations)
);

router.get(
  "/installations/:id",
  asyncHandler(getInstallationById)
);

router.get(
  "/installations/:id/telemetry",
  asyncHandler(getInstallationTelemetry)
);

router.get(
  "/installations/:id/alarms",
  asyncHandler(getInstallationAlarms)
);

router.get(
  "/installations/:id/statistics",
  asyncHandler(getInstallationStatistics)
);

router.get(
  "/installations/:id/diagnostic-sample",
  asyncHandler(inspectInstallationTelemetry)
);

export default router;