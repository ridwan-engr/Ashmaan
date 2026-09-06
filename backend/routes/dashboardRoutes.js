import express from "express";

import {
  getOverview,
  getEnergyHistory,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get(
  "/overview",
  getOverview
);

router.get(
  "/energy-history",
  getEnergyHistory
);

export default router;