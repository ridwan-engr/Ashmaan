import EnergyRecord
    from "../../models/EnergyRecord.js";

import Installation
    from "../../models/Installation.js";

import {
    FINANCIAL_BI_METRIC_KIND,
    FINANCIAL_BI_VALUE_KIND,
    FINANCIAL_BI_SOURCE_KIND,
    FINANCIAL_BI_SCOPE,
    buildFinancialBiReportingWindow,
    buildFinancialBiMetricDefinition,
    createFinancialBiContract,
} from "./financialBiContract.js";

import {
    qualifyFinancialBiInput,
} from "./financialBiInputQualificationService.js";

import {
    FINANCIAL_BI_CALCULATION_FORMULA_KIND,
    buildFinancialBiCalculationDefinition,
} from "./financialBiCalculationContract.js";

import {
    executeFinancialBiCalculation,
} from "./financialBiCalculationExecutionService.js";

import {
    FINANCIAL_BI_KPI_AGGREGATION_METHOD,
    buildFinancialBiKpiAggregationDefinition,
} from "./financialBiKpiAggregationContract.js";

import {
    executeFinancialBiKpiAggregation,
} from "./financialBiKpiAggregationExecutionService.js";

import {
    FINANCIAL_BI_PERSISTENCE_RECORD_KIND,
    buildFinancialBiPersistenceIdentity,
    createFinancialBiPersistenceContract,
} from "./financialBiPersistenceContract.js";

import {
    persistFinancialBiKpi,
} from "./financialBiPersistenceService.js";

import {
    mongooseFinancialBiKpiRepository,
} from "./mongooseFinancialBiKpiRepository.js";


export const FINANCIAL_BI_RUNTIME_PHASE =
    "10.RUNTIME";

export const FINANCIAL_BI_RUNTIME_LAYER =
    "FINANCIAL_BI_RUNTIME";


function requireDate(
    value,
    field
) {
    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        throw new Error(
            `${field}_INVALID`
        );
    }

    return date;
}


export async function runSiteEnergyFinancialBi({
    vrmSiteId,
    start,
    end,
    timezone = "UTC",
    repository =
        mongooseFinancialBiKpiRepository,
} = {}) {

    if (
        typeof vrmSiteId !== "string" ||
        !vrmSiteId.trim()
    ) {
        throw new Error(
            "VRM_SITE_ID_REQUIRED"
        );
    }

    const normalizedSiteId =
        vrmSiteId.trim();

    const startDate =
        requireDate(
            start,
            "START"
        );

    const endDate =
        requireDate(
            end,
            "END"
        );

    if (
        endDate <= startDate
    ) {
        throw new Error(
            "REPORTING_WINDOW_INVALID"
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Resolve installation
    |--------------------------------------------------------------------------
    */

    const installation =
        await Installation
            .findOne({
                source: "VRM",
                vrmSiteId:
                    normalizedSiteId,
            })
            .select({
                _id: 1,
                vrmSiteId: 1,
                name: 1,
                timezone: 1,
            })
            .lean();

    if (!installation) {
        throw new Error(
            "INSTALLATION_NOT_FOUND"
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Read genuine daily energy observations
    |--------------------------------------------------------------------------
    */

    const records =
        await EnergyRecord
            .find({
                installation:
                    installation._id,

                metric:
                    "kwh",

                unit:
                    "kWh",

                interval:
                    "days",

                statisticType:
                    "kwh",

                timestamp: {
                    $gte:
                        startDate,

                    $lt:
                        endDate,
                },
            })
            .sort({
                timestamp: 1,
            })
            .select({
                timestamp: 1,
                value: 1,
                unit: 1,
            })
            .lean();

    if (
        records.length === 0
    ) {
        return Object.freeze({
            phase:
                FINANCIAL_BI_RUNTIME_PHASE,

            layer:
                FINANCIAL_BI_RUNTIME_LAYER,

            status:
                "NO_SOURCE_DATA",

            vrmSiteId:
                normalizedSiteId,

            sourceRecordCount:
                0,

            persistence:
                null,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Phase 10.1 — Financial/BI contract
    |--------------------------------------------------------------------------
    */

    const reportingWindow =
        buildFinancialBiReportingWindow({
            start:
                startDate,

            end:
                endDate,

            timezone:
                timezone,
        });

    const metric =
        buildFinancialBiMetricDefinition({
            name:
                "SITE_ENERGY_KWH",

            kind:
                FINANCIAL_BI_METRIC_KIND.ENERGY,

            valueKind:
                FINANCIAL_BI_VALUE_KIND.NUMERIC,

            unit:
                "kWh",

            currency:
                null,

            sourceKind:
                FINANCIAL_BI_SOURCE_KIND
                    .ENGINEERING_ANALYTICS,
        });

    const contract =
        createFinancialBiContract({
            reportingWindow,

            metrics: [
                metric,
            ],

            upstream:
                Object.freeze({
                    source:
                        "EnergyRecord",

                    installationId:
                        String(
                            installation._id
                        ),

                    vrmSiteId:
                        normalizedSiteId,

                    metric:
                        "kwh",

                    interval:
                        "days",

                    statisticType:
                        "kwh",
                }),
        });


    /*
    |--------------------------------------------------------------------------
    | Phase 10.2 — Input qualification
    |--------------------------------------------------------------------------
    */

    const observations =
        records.map(
            record =>
                Object.freeze({
                    timestamp:
                        record.timestamp,

                    value:
                        record.value,

                    unit:
                        record.unit,
                })
        );

    const qualification =
        qualifyFinancialBiInput({
            contract,

            metricName:
                metric.name,

            observations,
        });


    /*
    |--------------------------------------------------------------------------
    | Phase 10.3 / 10.4 — Calculation
    |--------------------------------------------------------------------------
    */

    const calculationDefinition =
        buildFinancialBiCalculationDefinition({
            name:
                "SITE_ENERGY_SUM",

            formulaKind:
                FINANCIAL_BI_CALCULATION_FORMULA_KIND
                    .SUM,

            outputMetric:
                metric,

            inputs: [
                {
                    name:
                        "siteEnergy",

                    metricName:
                        metric.name,

                    qualification,

                    required:
                        true,
                },
            ],
        });

    const calculationResult =
        executeFinancialBiCalculation({
            definition:
                calculationDefinition,
        });


    /*
    |--------------------------------------------------------------------------
    | Phase 10.5 / 10.6 — KPI aggregation
    |--------------------------------------------------------------------------
    */

    const aggregationDefinition =
        buildFinancialBiKpiAggregationDefinition({
            name:
                "SITE_ENERGY_KWH",

            scope:
                FINANCIAL_BI_SCOPE.SITE,

            scopeIdentity:
                Object.freeze({
                    vrmSiteId:
                        normalizedSiteId,
                }),

            method:
                FINANCIAL_BI_KPI_AGGREGATION_METHOD
                    .PASSTHROUGH,

            reportingWindow,

            members: [
                {
                    name:
                        "siteEnergy",

                    calculation:
                        calculationResult,

                    required:
                        true,
                },
            ],

            outputMetric:
                metric,
        });

    const aggregationResult =
        executeFinancialBiKpiAggregation({
            definition:
                aggregationDefinition,
        });


    /*
    |--------------------------------------------------------------------------
    | Phase 10.7 — Deterministic persistence identity + contract
    |--------------------------------------------------------------------------
    */

    const identity =
        buildFinancialBiPersistenceIdentity({
            recordKind:
                FINANCIAL_BI_PERSISTENCE_RECORD_KIND
                    .KPI_AGGREGATION,

            metricName:
                metric.name,

            scope:
                FINANCIAL_BI_SCOPE.SITE,

            scopeIdentity:
                Object.freeze({
                    vrmSiteId:
                        normalizedSiteId,
                }),

            reportingWindow,
        });

    const persistenceContract =
        createFinancialBiPersistenceContract({
            aggregationResult,
            identity,
        });


    /*
    |--------------------------------------------------------------------------
    | Phase 10.8 — MongoDB persistence
    |--------------------------------------------------------------------------
    */

    const persistenceResult =
        await persistFinancialBiKpi({
            contract:
                persistenceContract,

            repository,
        });


    return Object.freeze({
        phase:
            FINANCIAL_BI_RUNTIME_PHASE,

        layer:
            FINANCIAL_BI_RUNTIME_LAYER,

        status:
            persistenceResult.status,

        vrmSiteId:
            normalizedSiteId,

        installationId:
            String(
                installation._id
            ),

        installationName:
            installation.name,

        sourceRecordCount:
            records.length,

        reportingWindow,

        qualificationStatus:
            qualification.status,

        calculationStatus:
            calculationResult.status,

        aggregationStatus:
            aggregationResult.status,

        value:
            aggregationResult
                .result?.value ??
            null,

        unit:
            aggregationResult
                .result?.unit ??
            null,

        persistenceKey:
            persistenceResult
                .persistenceKey,

        persistence:
            persistenceResult
                .persistence,
    });
}


export default
    runSiteEnergyFinancialBi;
