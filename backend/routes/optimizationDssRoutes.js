// routes/optimizationDssRoutes.js

import express
  from "express";

import {
  createMongooseOptimizationDssReadRepository,
} from "../services/optimizationDss/mongooseOptimizationDssReadRepository.js";

import {
  createOptimizationDssApiService,
} from "../services/optimizationDss/optimizationDssApiService.js";

import {
  createOptimizationDssController,
} from "../controllers/optimizationDssController.js";


const router =
  express.Router();

const repository =
  createMongooseOptimizationDssReadRepository();

const apiService =
  createOptimizationDssApiService({
    repository,
  });

const controller =
  createOptimizationDssController({
    apiService,
  });


router.get(
  "/recommendations",
  controller.listRecommendations
);

router.get(
  "/recommendations/:persistenceKey",
  controller.getRecommendation
);


export default router;
