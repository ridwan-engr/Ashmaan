// services/integration/forecastingFinancialBiIntegrationService.js

import {
    FORECAST_PRODUCTION_EXECUTION_PHASE,
    FORECAST_PRODUCTION_EXECUTION_LAYER,
    FORECAST_PRODUCTION_EXECUTION_STATUS,
} from "../forecasting/forecastProductionExecutionService.js";

import {
    FORECAST_OUTPUT_TYPE,
} from "../forecasting/forecastingContract.js";

import {
    FINANCIAL_BI_PHASE,
    FINANCIAL_BI_LAYER,
    FINANCIAL_BI_REPORTING_SEMANTICS,
    FINANCIAL_BI_SOURCE_KIND,
    FINANCIAL_BI_SCOPE,
    buildFinancialBiReportingWindow,
    buildFinancialBiMetricDefinition,
    createFinancialBiContract,
} from "../financialBi/financialBiContract.js";

import {
    FINANCIAL_BI_INPUT_QUALIFICATION_PHASE,
    FINANCIAL_BI_INPUT_QUALIFICATION_LAYER,
    qualifyFinancialBiInput,
} from "../financialBi/financialBiInputQualificationService.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 12.6 — Forecasting → Financial/BI Integration
|--------------------------------------------------------------------------
|
| Purpose:
|
|   Phase 9.9 calculated POINT forecast
|        ↓
|   explicit forecast observation projection
|        ↓
|   Phase 10.1 Financial/BI contract
|        ↓
|   Phase 10.2 input qualification
|
| This service does NOT:
| - execute a forecast
| - retrain/select/rank forecasting models
| - persist forecasts
| - read forecast API output
| - interpolate/resample forecast values
| - infer forecast timestamps
| - infer engineering units
| - infer currency
| - convert currency
| - infer tariffs/taxes
| - execute Financial/BI calculations
| - aggregate KPIs
| - persist Financial/BI results
| - expose an API/dashboard
| - execute Optimization/DSS
|
|--------------------------------------------------------------------------
*/


export const FORECASTING_FINANCIAL_BI_INTEGRATION_PHASE =
    "12.6";

export const FORECASTING_FINANCIAL_BI_INTEGRATION_LAYER =
    "FORECASTING_FINANCIAL_BI_INTEGRATION";

export const FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_PHASE =
    FORECAST_PRODUCTION_EXECUTION_PHASE;

export const FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_LAYER =
    FORECAST_PRODUCTION_EXECUTION_LAYER;

export const FORECASTING_FINANCIAL_BI_INTEGRATION_TARGET_PHASE =
    FINANCIAL_BI_INPUT_QUALIFICATION_PHASE;

export const FORECASTING_FINANCIAL_BI_INTEGRATION_TARGET_LAYER =
    FINANCIAL_BI_INPUT_QUALIFICATION_LAYER;

export const FORECASTING_FINANCIAL_BI_INTEGRATION_INTERVAL =
    FINANCIAL_BI_REPORTING_SEMANTICS;


export const FORECASTING_FINANCIAL_BI_INTEGRATION_STATUS =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        EXECUTED:
            "EXECUTED",

        ERROR:
            "ERROR",
    });


export const FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES =
    Object.freeze({
        usesExistingForecastProductionExecution:
            true,

        usesExistingFinancialBiContract:
            true,

        usesExistingFinancialBiInputQualification:
            true,

        createsParallelForecastEngine:
            false,

        createsParallelFinancialBiQualification:
            false,

        forecastExecutionIncluded:
            false,

        forecastPersistenceIncluded:
            false,

        forecastApiReadIncluded:
            false,

        forecastMutationIncluded:
            false,

        financialBiCalculationIncluded:
            false,

        financialBiAggregationIncluded:
            false,

        financialBiPersistenceIncluded:
            false,

        financialBiApiIncluded:
            false,

        financialBiDashboardIncluded:
            false,

        optimizationDssIncluded:
            false,

        timestampInferenceAllowed:
            false,

        unitInferenceAllowed:
            false,

        currencyInferenceAllowed:
            false,

        currencyConversionAllowed:
            false,

        tariffInferenceAllowed:
            false,

        resamplingAllowed:
            false,

        interpolationAllowed:
            false,

        duplicateMergeAllowed:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        invalidMeansZero:
            false,

        preserveForecastIdentity:
            true,

        preserveSiteIdentity:
            true,

        preserveForecastWindow:
            true,

        preserveForecastValues:
            true,

        sourceKindExplicit:
            true,

        advisoryOnly:
            true,

        executableControl:
            false,

        autoDispatch:
            false,
    });


function isObject(
    value
) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(
            value
        )
    );
}


function normalizeRequiredString(
    value,
    label
) {
    if (
        value === null ||
        value === undefined
    ) {
        throw new Error(
            `${label} is required.`
        );
    }

    const normalized =
        String(
            value
        ).trim();

    if (
        !normalized
    ) {
        throw new Error(
            `${label} is required.`
        );
    }

    return normalized;
}


function normalizeOptionalString(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalized =
        String(
            value
        ).trim();

    return normalized.length
        ? normalized
        : null;
}


/*
|--------------------------------------------------------------------------
| Validate Phase 9.9 production forecast
|--------------------------------------------------------------------------
*/

export function validateForecastProductionResult(
    forecastResult
) {
    if (
        !isObject(
            forecastResult
        )
    ) {
        throw new Error(
            "Phase 12.6 requires a Phase 9 production forecast result."
        );
    }

    if (
        forecastResult.phase !==
        FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_PHASE
    ) {
        throw new Error(
            "Phase 12.6 requires the Phase 9 production execution result."
        );
    }

    if (
        forecastResult.layer !==
        FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_LAYER
    ) {
        throw new Error(
            "Phase 12.6 requires FORECASTING upstream evidence."
        );
    }

    if (
        forecastResult.status !==
        FORECAST_PRODUCTION_EXECUTION_STATUS.CALCULATED
    ) {
        throw new Error(
            "Phase 12.6 requires a CALCULATED production forecast."
        );
    }

    if (
        forecastResult?.forecast?.outputType !==
        FORECAST_OUTPUT_TYPE.POINT
    ) {
        throw new Error(
            "Phase 12.6 currently requires a POINT production forecast."
        );
    }

    if (
        !Array.isArray(
            forecastResult.forecastTimestamps
        )
    ) {
        throw new Error(
            "Phase 12.6 requires forecastTimestamps."
        );
    }

    if (
        !Array.isArray(
            forecastResult?.forecast?.values
        )
    ) {
        throw new Error(
            "Phase 12.6 requires forecast values."
        );
    }

    if (
        forecastResult.forecastTimestamps.length !==
        forecastResult.forecast.values.length
    ) {
        throw new Error(
            "Phase 12.6 forecast timestamps and values must have equal length."
        );
    }

    for (
        let index = 0;
        index <
        forecastResult.forecast.values.length;
        index += 1
    ) {
        const forecastPoint =
            forecastResult.forecast.values[
            index
            ];

        if (
            !isObject(
                forecastPoint
            )
        ) {
            throw new Error(
                `Phase 12.6 forecast point ${index} must be an object.`
            );
        }

        if (
            typeof forecastPoint.value !==
            "number" ||
            !Number.isFinite(
                forecastPoint.value
            )
        ) {
            throw new Error(
                `Phase 12.6 forecast point ${index} requires a finite numeric value.`
            );
        }

        const pointTimestamp =
            new Date(
                forecastPoint.timestamp
            );

        const explicitTimestamp =
            new Date(
                forecastResult.forecastTimestamps[
                index
                ]
            );

        if (
            Number.isNaN(
                pointTimestamp.getTime()
            ) ||
            Number.isNaN(
                explicitTimestamp.getTime()
            ) ||
            pointTimestamp.getTime() !==
            explicitTimestamp.getTime()
        ) {
            throw new Error(
                `Phase 12.6 forecast point ${index} timestamp does not match forecastTimestamps.`
            );
        }
    }

    const productionContract =
        forecastResult.productionContract;

    if (
        !isObject(
            productionContract
        )
    ) {
        throw new Error(
            "Phase 12.6 requires the production forecast contract."
        );
    }

    const target =
        productionContract.target;

    if (
        !isObject(
            target
        )
    ) {
        throw new Error(
            "Phase 12.6 requires forecast target identity."
        );
    }

    const vrmSiteId =
        normalizeRequiredString(
            target?.scope?.vrmSiteId ??
            target?.vrmSiteId,
            "forecast vrmSiteId"
        );

    const installationId =
        normalizeOptionalString(
            target?.scope?.installationId ??
            target?.installationId
        );

    const metric =
        normalizeRequiredString(
            target.metric,
            "forecast target metric"
        );

    const unit =
        normalizeRequiredString(
            target.unit,
            "forecast target unit"
        );

    const window =
        productionContract.productionWindow;

    if (
        !isObject(
            window
        ) ||
        !window.forecastOrigin ||
        !window.forecastEnd
    ) {
        throw new Error(
            "Phase 12.6 requires the forecast production window."
        );
    }

    if (
        window.semantics !==
        FORECASTING_FINANCIAL_BI_INTEGRATION_INTERVAL
    ) {
        throw new Error(
            "Phase 12.6 requires canonical [start,end) forecast semantics."
        );
    }

    return Object.freeze({
        forecastResult,

        productionContract,

        target,

        vrmSiteId,

        installationId,

        metric,

        unit,

        productionWindow:
            window,

        forecastTimestamps:
            forecastResult.forecastTimestamps,

        forecastValues:
            forecastResult.forecast.values,
    });
}


/*
|--------------------------------------------------------------------------
| Validate Financial/BI request
|--------------------------------------------------------------------------
*/

export function validateForecastFinancialBiRequest(
    financialBiRequest
) {
    if (
        !isObject(
            financialBiRequest
        )
    ) {
        throw new Error(
            "Phase 12.6 requires a Financial/BI request."
        );
    }

    const metricName =
        normalizeRequiredString(
            financialBiRequest.metricName,
            "Financial/BI metricName"
        );

    const kind =
        normalizeRequiredString(
            financialBiRequest.kind,
            "Financial/BI metric kind"
        );

    const valueKind =
        normalizeRequiredString(
            financialBiRequest.valueKind,
            "Financial/BI value kind"
        );

    return Object.freeze({
        metricName,

        kind,

        valueKind,

        scope:
            financialBiRequest.scope ??
            FINANCIAL_BI_SCOPE.SITE,

        currency:
            normalizeOptionalString(
                financialBiRequest.currency
            ),
    });
}


/*
|--------------------------------------------------------------------------
| Qualification
|--------------------------------------------------------------------------
*/

export function qualifyForecastingFinancialBiIntegration({
    forecastResult,
    financialBiRequest,

    reportingWindowBuilder =
    buildFinancialBiReportingWindow,

    metricDefinitionBuilder =
    buildFinancialBiMetricDefinition,

    contractBuilder =
    createFinancialBiContract,

    inputQualifier =
    qualifyFinancialBiInput,
} = {}) {
    const forecast =
        validateForecastProductionResult(
            forecastResult
        );

    const request =
        validateForecastFinancialBiRequest(
            financialBiRequest
        );

    if (
        typeof reportingWindowBuilder !==
        "function" ||
        typeof metricDefinitionBuilder !==
        "function" ||
        typeof contractBuilder !==
        "function" ||
        typeof inputQualifier !==
        "function"
    ) {
        throw new Error(
            "Phase 12.6 requires existing Phase 10 contract and qualification functions."
        );
    }

    return Object.freeze({
        phase:
            FORECASTING_FINANCIAL_BI_INTEGRATION_PHASE,

        layer:
            FORECASTING_FINANCIAL_BI_INTEGRATION_LAYER,

        upstreamPhase:
            FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_PHASE,

        upstreamLayer:
            FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_LAYER,

        targetPhase:
            FORECASTING_FINANCIAL_BI_INTEGRATION_TARGET_PHASE,

        targetLayer:
            FORECASTING_FINANCIAL_BI_INTEGRATION_TARGET_LAYER,

        interval:
            FORECASTING_FINANCIAL_BI_INTEGRATION_INTERVAL,

        status:
            FORECASTING_FINANCIAL_BI_INTEGRATION_STATUS.QUALIFIED,

        executed:
            false,

        scope:
            FINANCIAL_BI_SCOPE.SITE,

        scopeIdentity:
            Object.freeze({
                vrmSiteId:
                    forecast.vrmSiteId,

                installationId:
                    forecast.installationId,
            }),

        forecastResult:
            forecast.forecastResult,

        productionContract:
            forecast.productionContract,

        target:
            forecast.target,

        productionWindow:
            forecast.productionWindow,

        forecastTimestamps:
            forecast.forecastTimestamps,

        forecastValues:
            forecast.forecastValues,

        unit:
            forecast.unit,

        financialBiRequest:
            request,

        reportingWindowBuilder,

        metricDefinitionBuilder,

        contractBuilder,

        inputQualifier,

        boundaries:
            FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES,
    });
}


/*
|--------------------------------------------------------------------------
| Execution
|--------------------------------------------------------------------------
*/

export function executeForecastingFinancialBiIntegration({
    qualifiedIntegration,
} = {}) {
    const q =
        qualifiedIntegration;

    if (
        !isObject(
            q
        ) ||
        q.phase !==
        FORECASTING_FINANCIAL_BI_INTEGRATION_PHASE ||
        q.layer !==
        FORECASTING_FINANCIAL_BI_INTEGRATION_LAYER ||
        q.status !==
        FORECASTING_FINANCIAL_BI_INTEGRATION_STATUS.QUALIFIED ||
        q.executed !==
        false
    ) {
        throw new Error(
            "Phase 12.6 execution requires a qualified 12.6 integration object."
        );
    }

    try {
        const reportingWindow =
            q.reportingWindowBuilder({
                start:
                    q.productionWindow.forecastOrigin,

                end:
                    q.productionWindow.forecastEnd,

                timezone:
                    q.productionWindow.timezone,
            });

        const metric =
            q.metricDefinitionBuilder({
                name:
                    q.financialBiRequest.metricName,

                kind:
                    q.financialBiRequest.kind,

                valueKind:
                    q.financialBiRequest.valueKind,

                unit:
                    q.unit,

                currency:
                    q.financialBiRequest.currency,

                scope:
                    q.financialBiRequest.scope,

                sourceKind:
                    FINANCIAL_BI_SOURCE_KIND.FORECAST,
            });

        const contract =
            q.contractBuilder({
                reportingWindow,

                metrics:
                    [
                        metric,
                    ],

                upstream:
                    q.forecastResult,
            });

        const observations =
            q.forecastTimestamps.map(
                (
                    timestamp,
                    index
                ) => {
                    const forecastPoint =
                        q.forecastValues[
                        index
                        ];

                    return Object.freeze({
                        timestamp,

                        value:
                            forecastPoint.value,

                        unit:
                            forecastPoint.unit,

                        sourceKind:
                            FINANCIAL_BI_SOURCE_KIND.FORECAST,
                    });
                }
            );
        const qualification =
            q.inputQualifier({
                contract,

                metricName:
                    metric.name,

                observations,
            });

        return Object.freeze({
            phase:
                FORECASTING_FINANCIAL_BI_INTEGRATION_PHASE,

            layer:
                FORECASTING_FINANCIAL_BI_INTEGRATION_LAYER,

            upstreamPhase:
                q.upstreamPhase,

            upstreamLayer:
                q.upstreamLayer,

            targetPhase:
                q.targetPhase,

            targetLayer:
                FINANCIAL_BI_LAYER,

            interval:
                q.interval,

            status:
                FORECASTING_FINANCIAL_BI_INTEGRATION_STATUS.EXECUTED,

            executed:
                true,

            scope:
                q.scope,

            scopeIdentity:
                q.scopeIdentity,

            forecastResult:
                q.forecastResult,

            reportingWindow,

            metric,

            contract,

            observations:
                Object.freeze(
                    observations
                ),

            qualification,

            error:
                null,

            boundaries:
                q.boundaries,
        });
    }
    catch (
    error
    ) {
        return Object.freeze({
            phase:
                FORECASTING_FINANCIAL_BI_INTEGRATION_PHASE,

            layer:
                FORECASTING_FINANCIAL_BI_INTEGRATION_LAYER,

            upstreamPhase:
                q.upstreamPhase,

            upstreamLayer:
                q.upstreamLayer,

            targetPhase:
                q.targetPhase,

            targetLayer:
                FINANCIAL_BI_LAYER,

            interval:
                q.interval,

            status:
                FORECASTING_FINANCIAL_BI_INTEGRATION_STATUS.ERROR,

            executed:
                false,

            scope:
                q.scope,

            scopeIdentity:
                q.scopeIdentity,

            forecastResult:
                q.forecastResult,

            reportingWindow:
                null,

            metric:
                null,

            contract:
                null,

            observations:
                null,

            qualification:
                null,

            error:
                Object.freeze({
                    name:
                        error?.name ??
                        "Error",

                    message:
                        error?.message ??
                        String(
                            error
                        ),
                }),

            boundaries:
                q.boundaries,
        });
    }
}


export default Object.freeze({
    FORECASTING_FINANCIAL_BI_INTEGRATION_PHASE,
    FORECASTING_FINANCIAL_BI_INTEGRATION_LAYER,
    FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_PHASE,
    FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_LAYER,
    FORECASTING_FINANCIAL_BI_INTEGRATION_TARGET_PHASE,
    FORECASTING_FINANCIAL_BI_INTEGRATION_TARGET_LAYER,
    FORECASTING_FINANCIAL_BI_INTEGRATION_INTERVAL,
    FORECASTING_FINANCIAL_BI_INTEGRATION_STATUS,
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES,
    validateForecastProductionResult,
    validateForecastFinancialBiRequest,
    qualifyForecastingFinancialBiIntegration,
    executeForecastingFinancialBiIntegration,
});