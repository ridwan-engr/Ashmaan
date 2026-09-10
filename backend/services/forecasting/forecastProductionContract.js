// services/forecasting/forecastProductionContract.js

import {
    FORECAST_OUTPUT_TYPE,
} from "./forecastingContract.js";

import {
    FORECAST_MODEL_QUALIFICATION_PHASE,
    FORECAST_MODEL_QUALIFICATION_STATUS,
} from "./forecastModelQualificationService.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.8 — Forecast Production Contract
|--------------------------------------------------------------------------
|
| Defines the production-forecast execution contract only.
|
| This module does NOT:
| - execute a production forecast
| - retrain a model
| - select/rank models
| - tune hyperparameters
| - mutate model qualification
| - persist forecasts
| - expose API/dashboard
| - execute Financial/BI
| - execute Optimization/DSS
|
|--------------------------------------------------------------------------
*/

export const FORECAST_PRODUCTION_CONTRACT_PHASE =
    "9.8";

export const FORECAST_PRODUCTION_CONTRACT_LAYER =
    "FORECASTING";

export const FORECAST_PRODUCTION_CONTRACT_UPSTREAM_PHASE =
    FORECAST_MODEL_QUALIFICATION_PHASE;

export const FORECAST_PRODUCTION_TIME_SEMANTICS =
    "[forecastOrigin,forecastEnd)";


export const FORECAST_PRODUCTION_ELIGIBILITY =
    Object.freeze({
        ELIGIBLE:
            "ELIGIBLE",

        INELIGIBLE:
            "INELIGIBLE",
    });


export const FORECAST_PRODUCTION_REASON =
    Object.freeze({
        MODEL_QUALIFIED:
            "MODEL_QUALIFIED",

        MODEL_NOT_QUALIFIED:
            "MODEL_NOT_QUALIFIED",

        QUALIFICATION_UNAVAILABLE:
            "QUALIFICATION_UNAVAILABLE",

        OUTPUT_TYPE_MISMATCH:
            "OUTPUT_TYPE_MISMATCH",

        HORIZON_INVALID:
            "HORIZON_INVALID",

        TARGET_MISSING:
            "TARGET_MISSING",

        TIME_CONTRACT_MISSING:
            "TIME_CONTRACT_MISSING",
    });


export const FORECAST_PRODUCTION_EXECUTION_STATUS =
    Object.freeze({
        NOT_EXECUTED:
            "NOT_EXECUTED",
    });


export const FORECAST_PRODUCTION_BOUNDARIES =
    Object.freeze({
        productionForecastExecuted:
            false,

        modelRetrainingExecuted:
            false,

        modelSelectionExecuted:
            false,

        modelRankingExecuted:
            false,

        hyperparameterSearchExecuted:
            false,

        predictionValuesFabricated:
            false,

        forecastIntervalsFabricated:
            false,

        probabilityValuesFabricated:
            false,

        stateValuesFabricated:
            false,

        targetUnitInferred:
            false,

        timezoneChanged:
            false,

        horizonExtended:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        qualificationOverridden:
            false,

        engineeringAnalyticsMutated:
            false,

        eventsMutated:
            false,

        telemetryPersisted:
            false,

        forecastPersistenceIncluded:
            false,

        apiIncluded:
            false,

        dashboardIncluded:
            false,

        financialBiIncluded:
            false,

        optimizationDssIncluded:
            false,
    });


function parseDate(
    value,
    label
) {
    const date =
        value instanceof Date
            ? new Date(
                value.getTime()
            )
            : new Date(
                value
            );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        throw new Error(
            `${label} must be a valid timestamp.`
        );
    }

    return date;
}


function getUpstreamContract(
    qualification
) {
    return qualification
        ?.trainingResult
        ?.modelContract
        ?? null;
}


function getTimeContract(
    qualification
) {
    return getUpstreamContract(
        qualification
    )
        ?.featureMaterialization
        ?.featureSet
        ?.inputQualification
        ?.time
        ?? null;
}


function getTarget(
    qualification
) {
    return getUpstreamContract(
        qualification
    )
        ?.featureMaterialization
        ?.featureSet
        ?.target
        ?? null;
}


function ineligibleResult({
    qualification,
    reason,
    target = null,
    time = null,
    requestedOutputType = null,
} = {}) {
    return {
        phase:
            FORECAST_PRODUCTION_CONTRACT_PHASE,

        layer:
            FORECAST_PRODUCTION_CONTRACT_LAYER,

        upstreamPhase:
            FORECAST_PRODUCTION_CONTRACT_UPSTREAM_PHASE,

        semantics:
            FORECAST_PRODUCTION_TIME_SEMANTICS,

        qualification,

        target,

        time,

        requestedOutputType,

        eligibility:
            FORECAST_PRODUCTION_ELIGIBILITY.INELIGIBLE,

        reason,

        execution:
            {
                status:
                    FORECAST_PRODUCTION_EXECUTION_STATUS.NOT_EXECUTED,

                values:
                    null,

                intervals:
                    null,

                probabilities:
                    null,

                states:
                    null,
            },

        boundaries:
            FORECAST_PRODUCTION_BOUNDARIES,
    };
}


export function createForecastProductionContract({
    qualification,
    requestedOutputType = null,
} = {}) {
    if (
        !qualification ||
        typeof qualification !==
            "object" ||
        qualification.phase !==
            FORECAST_MODEL_QUALIFICATION_PHASE
    ) {
        throw new Error(
            "Forecast production contract requires a validated Phase 9.7 model qualification."
        );
    }

    const modelContract =
        getUpstreamContract(
            qualification
        );

    const target =
        getTarget(
            qualification
        );

    const time =
        getTimeContract(
            qualification
        );

    if (
        !target
    ) {
        return ineligibleResult({
            qualification,
            reason:
                FORECAST_PRODUCTION_REASON.TARGET_MISSING,
            target,
            time,
            requestedOutputType,
        });
    }

    if (
        !time
    ) {
        return ineligibleResult({
            qualification,
            reason:
                FORECAST_PRODUCTION_REASON.TIME_CONTRACT_MISSING,
            target,
            time,
            requestedOutputType,
        });
    }

    if (
        qualification.status ===
            FORECAST_MODEL_QUALIFICATION_STATUS.UNAVAILABLE
    ) {
        return ineligibleResult({
            qualification,
            reason:
                FORECAST_PRODUCTION_REASON.QUALIFICATION_UNAVAILABLE,
            target,
            time,
            requestedOutputType,
        });
    }

    if (
        qualification.status !==
            FORECAST_MODEL_QUALIFICATION_STATUS.QUALIFIED
    ) {
        return ineligibleResult({
            qualification,
            reason:
                FORECAST_PRODUCTION_REASON.MODEL_NOT_QUALIFIED,
            target,
            time,
            requestedOutputType,
        });
    }

    const outputType =
        requestedOutputType ??
        modelContract?.outputType ??
        null;

    if (
        !Object.values(
            FORECAST_OUTPUT_TYPE
        ).includes(
            outputType
        ) ||
        outputType !==
            modelContract?.outputType
    ) {
        return ineligibleResult({
            qualification,
            reason:
                FORECAST_PRODUCTION_REASON.OUTPUT_TYPE_MISMATCH,
            target,
            time,
            requestedOutputType:
                outputType,
        });
    }

    const forecastOrigin =
        parseDate(
            time.forecastOrigin,
            "forecastOrigin"
        );

    const forecastEnd =
        parseDate(
            time.forecastHorizon?.end,
            "forecastEnd"
        );

    if (
        forecastEnd <=
            forecastOrigin
    ) {
        return ineligibleResult({
            qualification,
            reason:
                FORECAST_PRODUCTION_REASON.HORIZON_INVALID,
            target,
            time,
            requestedOutputType:
                outputType,
        });
    }

    return {
        phase:
            FORECAST_PRODUCTION_CONTRACT_PHASE,

        layer:
            FORECAST_PRODUCTION_CONTRACT_LAYER,

        upstreamPhase:
            FORECAST_PRODUCTION_CONTRACT_UPSTREAM_PHASE,

        semantics:
            FORECAST_PRODUCTION_TIME_SEMANTICS,

        qualification,

        target,

        time,

        requestedOutputType:
            outputType,

        eligibility:
            FORECAST_PRODUCTION_ELIGIBILITY.ELIGIBLE,

        reason:
            FORECAST_PRODUCTION_REASON.MODEL_QUALIFIED,

        productionWindow:
            {
                forecastOrigin:
                    time.forecastOrigin,

                forecastEnd:
                    time.forecastHorizon?.end,

                timezone:
                    time.timezone,

                semantics:
                    FORECAST_PRODUCTION_TIME_SEMANTICS,
            },

        model:
            {
                family:
                    modelContract.family,

                task:
                    modelContract.task,

                outputType:
                    modelContract.outputType,

                name:
                    modelContract.name,
            },

        execution:
            {
                status:
                    FORECAST_PRODUCTION_EXECUTION_STATUS.NOT_EXECUTED,

                values:
                    null,

                intervals:
                    null,

                probabilities:
                    null,

                states:
                    null,
            },

        boundaries:
            FORECAST_PRODUCTION_BOUNDARIES,
    };
}


export default Object.freeze({
    FORECAST_PRODUCTION_CONTRACT_PHASE,
    FORECAST_PRODUCTION_CONTRACT_LAYER,
    FORECAST_PRODUCTION_CONTRACT_UPSTREAM_PHASE,
    FORECAST_PRODUCTION_TIME_SEMANTICS,
    FORECAST_PRODUCTION_ELIGIBILITY,
    FORECAST_PRODUCTION_REASON,
    FORECAST_PRODUCTION_EXECUTION_STATUS,
    FORECAST_PRODUCTION_BOUNDARIES,
    createForecastProductionContract,
});
