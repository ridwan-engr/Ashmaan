// services/forecasting/forecastPersistenceContract.js

import {
    FORECAST_PRODUCTION_EXECUTION_PHASE,
    FORECAST_PRODUCTION_EXECUTION_STATUS,
} from "./forecastProductionExecutionService.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.10 — Forecast Persistence Contract
|--------------------------------------------------------------------------
|
| Defines the persistence envelope for Phase 9.9 forecast results.
|
| This module does NOT:
| - write to MongoDB
| - define a Mongoose model
| - mutate forecast values
| - retrain/select/rank models
| - expose API/dashboard
| - execute Financial/BI
| - execute Optimization/DSS
|
|--------------------------------------------------------------------------
*/

export const FORECAST_PERSISTENCE_CONTRACT_PHASE =
    "9.10";

export const FORECAST_PERSISTENCE_CONTRACT_LAYER =
    "FORECASTING";

export const FORECAST_PERSISTENCE_CONTRACT_UPSTREAM_PHASE =
    FORECAST_PRODUCTION_EXECUTION_PHASE;


export const FORECAST_PERSISTENCE_ELIGIBILITY =
    Object.freeze({
        ELIGIBLE:
            "ELIGIBLE",

        INELIGIBLE:
            "INELIGIBLE",
    });


export const FORECAST_PERSISTENCE_REASON =
    Object.freeze({
        FORECAST_CALCULATED:
            "FORECAST_CALCULATED",

        FORECAST_NOT_CALCULATED:
            "FORECAST_NOT_CALCULATED",

        FORECAST_VALUES_MISSING:
            "FORECAST_VALUES_MISSING",

        FORECAST_IDENTITY_MISSING:
            "FORECAST_IDENTITY_MISSING",

        TARGET_IDENTITY_MISSING:
            "TARGET_IDENTITY_MISSING",

        FORECAST_WINDOW_MISSING:
            "FORECAST_WINDOW_MISSING",
    });


export const FORECAST_PERSISTENCE_RECORD_STATUS =
    Object.freeze({
        NOT_PERSISTED:
            "NOT_PERSISTED",
    });


export const FORECAST_PERSISTENCE_BOUNDARIES =
    Object.freeze({
        mongoWriteExecuted:
            false,

        mongooseModelIncluded:
            false,

        persistenceExecuted:
            false,

        forecastValuesMutated:
            false,

        predictionValuesRecalculated:
            false,

        forecastUnitInferred:
            false,

        timezoneChanged:
            false,

        horizonChanged:
            false,

        modelProvenanceChanged:
            false,

        sourceProvenanceChanged:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        engineeringAnalyticsMutated:
            false,

        telemetryMutated:
            false,

        eventsMutated:
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


function nonEmptyString(
    value
) {
    return (
        typeof value ===
            "string" &&
        value.trim().length >
            0
    );
}


function safeIso(
    value
) {
    const date =
        value instanceof Date
            ? new Date(
                value.getTime()
            )
            : new Date(
                value
            );

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date.toISOString();
}


function buildIdentity({
    executionResult,
} = {}) {
    const productionContract =
        executionResult
            ?.productionContract;

    const target =
        productionContract
            ?.target;

    const window =
        productionContract
            ?.productionWindow;

    const model =
        productionContract
            ?.model;

    const vrmSiteId =
        target
            ?.scope
            ?.vrmSiteId ??
        target
            ?.vrmSiteId ??
        null;

    const family =
        target
            ?.family ??
        null;

    const metric =
        target
            ?.metric ??
        null;

    const forecastOrigin =
        safeIso(
            window
                ?.forecastOrigin
        );

    const forecastEnd =
        safeIso(
            window
                ?.forecastEnd
        );

    const modelName =
        model
            ?.name ??
        null;

    const modelFamily =
        model
            ?.family ??
        null;

    const outputType =
        executionResult
            ?.forecast
            ?.outputType ??
        null;

    if (
        !nonEmptyString(
            String(
                vrmSiteId ??
                ""
            )
        ) ||
        !nonEmptyString(
            family
        ) ||
        !nonEmptyString(
            metric
        ) ||
        !forecastOrigin ||
        !forecastEnd ||
        !nonEmptyString(
            modelFamily
        ) ||
        !nonEmptyString(
            outputType
        )
    ) {
        return null;
    }

    return {
        vrmSiteId:
            String(
                vrmSiteId
            ),

        targetFamily:
            family,

        targetMetric:
            metric,

        forecastOrigin,

        forecastEnd,

        modelName,

        modelFamily,

        outputType,

        persistenceKey:
            [
                String(
                    vrmSiteId
                ),
                family,
                metric,
                forecastOrigin,
                forecastEnd,
                modelName ??
                    modelFamily,
                outputType,
            ].join(
                "::"
            ),
    };
}


function ineligibleResult({
    executionResult,
    reason,
    identity = null,
} = {}) {
    return {
        phase:
            FORECAST_PERSISTENCE_CONTRACT_PHASE,

        layer:
            FORECAST_PERSISTENCE_CONTRACT_LAYER,

        upstreamPhase:
            FORECAST_PERSISTENCE_CONTRACT_UPSTREAM_PHASE,

        executionResult,

        eligibility:
            FORECAST_PERSISTENCE_ELIGIBILITY.INELIGIBLE,

        reason,

        identity,

        record:
            null,

        persistence:
            {
                status:
                    FORECAST_PERSISTENCE_RECORD_STATUS.NOT_PERSISTED,

                idempotencyKey:
                    identity?.persistenceKey ??
                    null,

                databaseId:
                    null,

                persistedAt:
                    null,
            },

        boundaries:
            FORECAST_PERSISTENCE_BOUNDARIES,
    };
}


export function createForecastPersistenceContract({
    executionResult,
} = {}) {
    if (
        !executionResult ||
        typeof executionResult !==
            "object" ||
        executionResult.phase !==
            FORECAST_PRODUCTION_EXECUTION_PHASE
    ) {
        throw new Error(
            "Forecast persistence contract requires a validated Phase 9.9 production execution result."
        );
    }

    if (
        executionResult.status !==
            FORECAST_PRODUCTION_EXECUTION_STATUS.CALCULATED
    ) {
        return ineligibleResult({
            executionResult,
            reason:
                FORECAST_PERSISTENCE_REASON.FORECAST_NOT_CALCULATED,
        });
    }

    const values =
        executionResult
            ?.forecast
            ?.values;

    if (
        !Array.isArray(
            values
        ) ||
        values.length ===
            0
    ) {
        return ineligibleResult({
            executionResult,
            reason:
                FORECAST_PERSISTENCE_REASON.FORECAST_VALUES_MISSING,
        });
    }

    const identity =
        buildIdentity({
            executionResult,
        });

    if (
        !identity
    ) {
        return ineligibleResult({
            executionResult,
            reason:
                FORECAST_PERSISTENCE_REASON.FORECAST_IDENTITY_MISSING,
        });
    }

    const target =
        executionResult
            ?.productionContract
            ?.target;

    if (
        !target
            ?.family ||
        !target
            ?.metric ||
        (
            target
                ?.scope
                ?.vrmSiteId ??
            target
                ?.vrmSiteId
        ) ===
            undefined ||
        (
            target
                ?.scope
                ?.vrmSiteId ??
            target
                ?.vrmSiteId
        ) ===
            null
    ) {
        return ineligibleResult({
            executionResult,
            reason:
                FORECAST_PERSISTENCE_REASON.TARGET_IDENTITY_MISSING,
            identity,
        });
    }

    const productionWindow =
        executionResult
            ?.productionContract
            ?.productionWindow;

    if (
        !productionWindow
            ?.forecastOrigin ||
        !productionWindow
            ?.forecastEnd ||
        !productionWindow
            ?.timezone
    ) {
        return ineligibleResult({
            executionResult,
            reason:
                FORECAST_PERSISTENCE_REASON.FORECAST_WINDOW_MISSING,
            identity,
        });
    }

    const record =
        {
            schemaVersion:
                1,

            phase:
                FORECAST_PERSISTENCE_CONTRACT_PHASE,

            identity,

            target:
                {
                    vrmSiteId:
                        String(
                            target
                                ?.scope
                                ?.vrmSiteId ??
                            target
                                ?.vrmSiteId
                        ),

                    family:
                        target.family,

                    metric:
                        target.metric,

                    kind:
                        target.kind,

                    unit:
                        target.unit ??
                        null,
                },

            window:
                {
                    forecastOrigin:
                        productionWindow.forecastOrigin,

                    forecastEnd:
                        productionWindow.forecastEnd,

                    timezone:
                        productionWindow.timezone,

                    semantics:
                        productionWindow.semantics,
                },

            model:
                {
                    name:
                        executionResult
                            ?.productionContract
                            ?.model
                            ?.name ??
                        null,

                    family:
                        executionResult
                            ?.productionContract
                            ?.model
                            ?.family ??
                        null,

                    task:
                        executionResult
                            ?.productionContract
                            ?.model
                            ?.task ??
                        null,

                    outputType:
                        executionResult
                            ?.productionContract
                            ?.model
                            ?.outputType ??
                        null,
                },

            forecast:
                executionResult.forecast,

            provenance:
                {
                    productionContractPhase:
                        executionResult
                            ?.productionContract
                            ?.phase ??
                        null,

                    productionExecutionPhase:
                        executionResult.phase,

                    qualificationPhase:
                        executionResult
                            ?.productionContract
                            ?.qualification
                            ?.phase ??
                        null,

                    trainingPhase:
                        executionResult
                            ?.productionContract
                            ?.qualification
                            ?.trainingResult
                            ?.phase ??
                        null,
                },
        };

    return {
        phase:
            FORECAST_PERSISTENCE_CONTRACT_PHASE,

        layer:
            FORECAST_PERSISTENCE_CONTRACT_LAYER,

        upstreamPhase:
            FORECAST_PERSISTENCE_CONTRACT_UPSTREAM_PHASE,

        executionResult,

        eligibility:
            FORECAST_PERSISTENCE_ELIGIBILITY.ELIGIBLE,

        reason:
            FORECAST_PERSISTENCE_REASON.FORECAST_CALCULATED,

        identity,

        record,

        persistence:
            {
                status:
                    FORECAST_PERSISTENCE_RECORD_STATUS.NOT_PERSISTED,

                idempotencyKey:
                    identity.persistenceKey,

                databaseId:
                    null,

                persistedAt:
                    null,
            },

        boundaries:
            FORECAST_PERSISTENCE_BOUNDARIES,
    };
}


export default Object.freeze({
    FORECAST_PERSISTENCE_CONTRACT_PHASE,
    FORECAST_PERSISTENCE_CONTRACT_LAYER,
    FORECAST_PERSISTENCE_CONTRACT_UPSTREAM_PHASE,
    FORECAST_PERSISTENCE_ELIGIBILITY,
    FORECAST_PERSISTENCE_REASON,
    FORECAST_PERSISTENCE_RECORD_STATUS,
    FORECAST_PERSISTENCE_BOUNDARIES,
    createForecastPersistenceContract,
});
