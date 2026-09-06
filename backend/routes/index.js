import express from "express";

import healthRoutes from "./healthRoutes.js";
import vrmRoutes from "./vrmRoutes.js";
import syncRoutes from "./syncRoutes.js";

const router = express.Router();


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


export default router;