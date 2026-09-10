// scripts/validatePhase12LiveRuntimePreflight.js

import "dotenv/config";

import dns
    from "node:dns";

import assert from "node:assert/strict";
import mongoose from "mongoose";

import Installation
    from "../models/Installation.js";

import Telemetry
    from "../models/Telemetry.js";

import OutageEvent
    from "../models/OutageEvent.js";

import ForecastRecord
    from "../models/ForecastRecord.js";

import FinancialBiKpiRecord
    from "../models/FinancialBiKpiRecord.js";

import OptimizationDssRecommendation
    from "../models/OptimizationDssRecommendation.js";

import {
    syncTelemetryByVrmSiteId,
} from "../services/sync/telemetrySyncService.js";

import {
    getProductionGridTelemetryEvidence,
} from "../services/engineering/gridProductionTelemetryService.js";

import {
    getProductionGridSiteAnalytics,
} from "../services/engineering/gridProductionAdapter.js";

import {
    executeProductionForecast,
} from "../services/forecasting/forecastProductionExecutionService.js";

import {
    persistForecast,
} from "../services/forecasting/forecastPersistenceService.js";

import {
    executeFinancialBiCalculation,
} from "../services/financialBi/financialBiCalculationExecutionService.js";

import {
    executeFinancialBiKpiAggregation,
} from "../services/financialBi/financialBiKpiAggregationExecutionService.js";

import {
    persistFinancialBiKpi,
} from "../services/financialBi/financialBiPersistenceService.js";

import {
    executeOptimizationDssSolver,
} from "../services/optimizationDss/optimizationDssSolverExecutionService.js";

import {
    generateOptimizationDssRecommendation,
} from "../services/optimizationDss/optimizationDssRecommendationGenerationService.js";

import {
    persistOptimizationDssRecommendation,
} from "../services/optimizationDss/optimizationDssPersistenceService.js";

import {
    createMongooseOptimizationDssPersistenceRepository,
} from "../services/optimizationDss/mongooseOptimizationDssPersistenceRepository.js";


dns.setServers([
    "8.8.8.8",
    "1.1.1.1",
]);

const PHASE =
    "12.13-A";

const LAYER =
    "FULL_LIVE_PIPELINE_RUNTIME_PREFLIGHT";


let passed = 0;


function pass(
    message
) {
    passed += 1;

    console.log(
        `PASS ${passed}: ${message}`
    );
}


function requireTrue(
    value,
    message
) {
    assert.equal(
        Boolean(value),
        true,
        message
    );

    pass(
        message
    );
}


function requireEqual(
    actual,
    expected,
    message
) {
    assert.equal(
        actual,
        expected,
        message
    );

    pass(
        message
    );
}


function requireFunction(
    fn,
    message
) {
    assert.equal(
        typeof fn,
        "function",
        message
    );

    pass(
        message
    );
}


function asPlain(
    document
) {
    if (
        document &&
        typeof document.toObject ===
            "function"
    ) {
        return document.toObject();
    }

    return document;
}


function safeId(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    return String(
        value
    );
}


function resolveVrmSiteId(
    installation
) {
    const candidates =
        [
            installation?.vrmSiteId,
            installation?.installationId,
            installation?.vrmId,
            installation?.siteId,
        ];

    for (
        const candidate of candidates
    ) {
        if (
            candidate !== null &&
            candidate !== undefined &&
            String(candidate).trim()
        ) {
            return String(
                candidate
            ).trim();
        }
    }

    return null;
}


function getTimestamp(
    record
) {
    const candidates =
        [
            record?.timestamp,
            record?.time,
            record?.createdAt,
        ];

    for (
        const candidate of candidates
    ) {
        const date =
            candidate
                ? new Date(
                    candidate
                )
                : null;

        if (
            date &&
            Number.isFinite(
                date.getTime()
            )
        ) {
            return date;
        }
    }

    return null;
}


async function main() {
    console.log(
        "\n================================================"
    );

    console.log(
        "ASHMAAN PHASE 12.13-A — LIVE RUNTIME PREFLIGHT"
    );

    console.log(
        "================================================\n"
    );

    requireEqual(
        PHASE,
        "12.13-A",
        "preflight phase identity is correct"
    );

    requireEqual(
        LAYER,
        "FULL_LIVE_PIPELINE_RUNTIME_PREFLIGHT",
        "preflight layer identity is correct"
    );


    /*
    |--------------------------------------------------------------------------
    | Environment
    |--------------------------------------------------------------------------
    */

    const mongoUri =
        process.env.MONGODB_URI?.trim() ||
        process.env.MONGODB_DIRECT_URI?.trim() ||
        "";

    requireTrue(
        mongoUri,
        "MongoDB connection URI is configured"
    );


    /*
    |--------------------------------------------------------------------------
    | Production service imports
    |--------------------------------------------------------------------------
    */

    requireFunction(
        syncTelemetryByVrmSiteId,
        "production VRM telemetry synchronizer is importable"
    );

    requireFunction(
        getProductionGridTelemetryEvidence,
        "production Engineering telemetry reader is importable"
    );

    requireFunction(
        getProductionGridSiteAnalytics,
        "production Grid Engineering Analytics adapter is importable"
    );

    requireFunction(
        executeProductionForecast,
        "Phase 9.9 production forecast executor is importable"
    );

    requireFunction(
        persistForecast,
        "Phase 9.11 forecast persistence implementation is importable"
    );

    requireFunction(
        executeFinancialBiCalculation,
        "Phase 10 Financial/BI calculation executor is importable"
    );

    requireFunction(
        executeFinancialBiKpiAggregation,
        "Phase 10.6 Financial/BI aggregation executor is importable"
    );

    requireFunction(
        persistFinancialBiKpi,
        "Phase 10 Financial/BI persistence implementation is importable"
    );

    requireFunction(
        executeOptimizationDssSolver,
        "Phase 11.6 Optimization/DSS solver executor is importable"
    );

    requireFunction(
        generateOptimizationDssRecommendation,
        "Phase 11.9 recommendation generator is importable"
    );

    requireFunction(
        persistOptimizationDssRecommendation,
        "Phase 11.11 Optimization/DSS persistence implementation is importable"
    );

    requireFunction(
        createMongooseOptimizationDssPersistenceRepository,
        "production Optimization/DSS Mongoose repository is importable"
    );


    /*
    |--------------------------------------------------------------------------
    | MongoDB Atlas
    |--------------------------------------------------------------------------
    */

    if (
        mongoose.connection.readyState ===
            0
    ) {
        await mongoose.connect(
            mongoUri
        );
    }

    requireEqual(
        mongoose.connection.readyState,
        1,
        "MongoDB Atlas connection is open"
    );

    requireTrue(
        mongoose.connection.db,
        "MongoDB database handle is available"
    );

    console.log(
        `Database: ${mongoose.connection.name}`
    );


    /*
    |--------------------------------------------------------------------------
    | Production collections
    |--------------------------------------------------------------------------
    */

    const telemetryCollection =
        Telemetry.collection
            .collectionName;

    const outageCollection =
        OutageEvent.collection
            .collectionName;

    const forecastCollection =
        ForecastRecord.collection
            .collectionName;

    const financialCollection =
        FinancialBiKpiRecord
            .collection
            .collectionName;

    const optimizationCollection =
        OptimizationDssRecommendation
            .collection
            .collectionName;

    requireTrue(
        telemetryCollection,
        "Telemetry collection is resolved"
    );

    requireTrue(
        outageCollection,
        "OutageEvent collection is resolved"
    );

    requireTrue(
        forecastCollection,
        "ForecastRecord collection is resolved"
    );

    requireTrue(
        financialCollection,
        "FinancialBiKpiRecord collection is resolved"
    );

    requireTrue(
        optimizationCollection,
        "OptimizationDssRecommendation collection is resolved"
    );

    console.log(
        `Telemetry collection: ${telemetryCollection}`
    );

    console.log(
        `Outage collection: ${outageCollection}`
    );

    console.log(
        `Forecast collection: ${forecastCollection}`
    );

    console.log(
        `Financial/BI collection: ${financialCollection}`
    );

    console.log(
        `Optimization/DSS collection: ${optimizationCollection}`
    );


    /*
    |--------------------------------------------------------------------------
    | Existing production data
    |--------------------------------------------------------------------------
    */

    const installationCount =
        await Installation
            .countDocuments({});

    requireTrue(
        installationCount > 0,
        "at least one Installation exists in live MongoDB"
    );

    const telemetryCount =
        await Telemetry
            .countDocuments({});

    requireTrue(
        telemetryCount > 0,
        "persisted production telemetry exists"
    );

    const outageCount =
        await OutageEvent
            .countDocuments({});

    pass(
        `OutageEvent collection queried successfully (${outageCount} records)`
    );

    const forecastCount =
        await ForecastRecord
            .countDocuments({});

    pass(
        `ForecastRecord collection queried successfully (${forecastCount} records)`
    );

    const financialCount =
        await FinancialBiKpiRecord
            .countDocuments({});

    pass(
        `FinancialBiKpiRecord collection queried successfully (${financialCount} records)`
    );

    const optimizationCount =
        await OptimizationDssRecommendation
            .countDocuments({});

    pass(
        `OptimizationDssRecommendation collection queried successfully (${optimizationCount} records)`
    );


    /*
    |--------------------------------------------------------------------------
    | Determine the best live SITE from actual telemetry
    |--------------------------------------------------------------------------
    */

    const latestTelemetryDoc =
        await Telemetry
            .findOne({})
            .sort({
                timestamp:
                    -1,
            })
            .lean();

    requireTrue(
        latestTelemetryDoc,
        "latest persisted telemetry record is readable"
    );

    const latestTelemetry =
        asPlain(
            latestTelemetryDoc
        );

    const latestTimestamp =
        getTimestamp(
            latestTelemetry
        );

    requireTrue(
        latestTimestamp,
        "latest telemetry timestamp is valid"
    );


    /*
     * Try installation relationship first.
     */

    const installationReference =
        latestTelemetry.installation ??
        latestTelemetry.installationId ??
        null;

    let installation =
        null;

    if (
        installationReference
    ) {
        installation =
            await Installation
                .findById(
                    installationReference
                )
                .lean()
                .catch(
                    () => null
                );
    }


    /*
     * Fallback: choose an Installation with an explicit VRM identity.
     */

    if (!installation) {
        installation =
            await Installation
                .findOne({
                    vrmSiteId:
                        {
                            $exists:
                                true,

                            $nin:
                                [
                                    null,
                                    "",
                                ],
                        },
                })
                .lean();
    }

    requireTrue(
        installation,
        "live Installation for runtime validation is resolved"
    );

    const vrmSiteId =
        resolveVrmSiteId(
            installation
        );

    requireTrue(
        vrmSiteId,
        "runtime SITE has an explicit VRM site identity"
    );


    /*
    |--------------------------------------------------------------------------
    | Find telemetry specifically for selected Installation
    |--------------------------------------------------------------------------
    */

    const selectedInstallationId =
        installation._id;

    let selectedLatestTelemetry =
        await Telemetry
            .findOne({
                installation:
                    selectedInstallationId,
            })
            .sort({
                timestamp:
                    -1,
            })
            .lean();

    if (!selectedLatestTelemetry) {
        selectedLatestTelemetry =
            latestTelemetry;
    }

    const selectedTimestamp =
        getTimestamp(
            selectedLatestTelemetry
        );

    requireTrue(
        selectedTimestamp,
        "selected SITE has a valid telemetry timestamp"
    );


    /*
    |--------------------------------------------------------------------------
    | Controlled reporting window
    |--------------------------------------------------------------------------
    |
    | Use existing persisted telemetry only.
    |
    | No VRM sync is triggered in 12.13-A.
    |--------------------------------------------------------------------------
    */

    const windowEnd =
        new Date(
            selectedTimestamp.getTime() +
            1000
        );

    const windowStart =
        new Date(
            selectedTimestamp.getTime() -
            24 * 60 * 60 * 1000
        );

    requireTrue(
        windowStart <
            windowEnd,
        "runtime reporting window is valid"
    );


    const siteTelemetryCount =
        await Telemetry
            .countDocuments({
                installation:
                    selectedInstallationId,

                timestamp:
                    {
                        $gte:
                            windowStart,

                        $lt:
                            windowEnd,
                    },
            });

    pass(
        `selected Installation telemetry query executed (${siteTelemetryCount} records in 24-hour window)`
    );


    /*
    |--------------------------------------------------------------------------
    | Existing downstream persisted evidence
    |--------------------------------------------------------------------------
    */

    const latestForecast =
        await ForecastRecord
            .findOne({})
            .sort({
                createdAt:
                    -1,
            })
            .lean();

    pass(
        latestForecast
            ? "latest persisted ForecastRecord is readable"
            : "ForecastRecord collection is currently EMPTY"
    );

    const latestFinancial =
        await FinancialBiKpiRecord
            .findOne({})
            .sort({
                createdAt:
                    -1,
            })
            .lean();

    pass(
        latestFinancial
            ? "latest persisted Financial/BI KPI is readable"
            : "Financial/BI KPI collection is currently EMPTY"
    );

    const latestOptimization =
        await OptimizationDssRecommendation
            .findOne({})
            .sort({
                createdAt:
                    -1,
            })
            .lean();

    pass(
        latestOptimization
            ? "latest persisted Optimization/DSS recommendation is readable"
            : "Optimization/DSS recommendation collection is currently EMPTY"
    );


    /*
    |--------------------------------------------------------------------------
    | Output exact 12.13-B runtime identity
    |--------------------------------------------------------------------------
    */

    console.log(
        "\n------------------------------------------------"
    );

    console.log(
        "12.13-B LIVE RUNTIME TARGET"
    );

    console.log(
        "------------------------------------------------"
    );

    console.log(
        `Installation Mongo ID : ${safeId(
            installation._id
        )}`
    );

    console.log(
        `VRM Site ID           : ${vrmSiteId}`
    );

    console.log(
        `Window Start          : ${windowStart.toISOString()}`
    );

    console.log(
        `Window End            : ${windowEnd.toISOString()}`
    );

    console.log(
        `Window Semantics      : [start,end)`
    );

    console.log(
        `Telemetry in Window   : ${siteTelemetryCount}`
    );

    console.log(
        `OutageEvent Count     : ${outageCount}`
    );

    console.log(
        `ForecastRecord Count  : ${forecastCount}`
    );

    console.log(
        `Financial BI Count    : ${financialCount}`
    );

    console.log(
        `Optimization Count    : ${optimizationCount}`
    );

    console.log(
        "------------------------------------------------"
    );


    console.log(
        "\n================================================"
    );

    console.log(
        `Assertions passed: ${passed}`
    );

    console.log(
        "================================================"
    );

    console.log(
        "ASHMAAN PHASE 12.13-A LIVE RUNTIME PREFLIGHT PASSED"
    );

    console.log(
        "================================================\n"
    );
}


main()
    .catch(
        error => {
            console.error(
                "\n================================================"
            );

            console.error(
                "ASHMAAN PHASE 12.13-A LIVE RUNTIME PREFLIGHT FAILED"
            );

            console.error(
                "================================================"
            );

            console.error(
                error
            );

            console.error(
                "================================================\n"
            );

            process.exitCode =
                1;
        }
    )
    .finally(
        async () => {
            if (
                mongoose.connection
                    .readyState !==
                0
            ) {
                await mongoose
                    .disconnect()
                    .catch(
                        () => {}
                    );
            }
        }
    );  