// routes/financialBiRoutes.js

import express
    from "express";

import {
    createFinancialBiController,
}
    from "../controllers/financialBiController.js";

import {
    mongooseFinancialBiReadRepository,
}
    from "../services/financialBi/mongooseFinancialBiReadRepository.js";


export const FINANCIAL_BI_API_IMPLEMENTATION_ROUTE_PHASE =
    "10.10";


export function createFinancialBiRouter({
    repository =
        mongooseFinancialBiReadRepository,
} = {}) {
    const router =
        express.Router();

    const controller =
        createFinancialBiController({
            repository,
        });

    router.get(
        "/kpis",
        controller.listKpis
    );

    router.get(
        "/kpis/:persistenceKey",
        controller.getKpiByPersistenceKey
    );

    return router;
}


export default createFinancialBiRouter;
