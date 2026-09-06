import express from "express";
import { getHealth } from "../controllers/healthController.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.get("/", asyncHandler(getHealth));

export default router;