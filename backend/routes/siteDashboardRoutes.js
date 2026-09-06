import express from "express";

import {
  getSites,
  getSite,
  getTelemetry,
  getEnergyHistory,
} from "../controllers/siteDashboardController.js";

const router =
  express.Router();

router.get(
  "/",
  getSites
);

router.get(
  "/:vrmSiteId",
  getSite
);

router.get(
  "/:vrmSiteId/telemetry",
  getTelemetry
);

router.get(
  "/:vrmSiteId/energy-history",
  getEnergyHistory
);

export default router;