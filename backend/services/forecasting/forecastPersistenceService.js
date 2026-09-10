// services/forecasting/forecastPersistenceService.js

import {
    FORECAST_PERSISTENCE_CONTRACT_PHASE,
    FORECAST_PERSISTENCE_ELIGIBILITY,
} from "./forecastPersistenceContract.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.11 — Forecast Persistence Implementation
|--------------------------------------------------------------------------
|
| Persists only validated, ELIGIBLE Phase 9.10 contracts.
|
| The model is injected so validation does not require a live MongoDB
| connection. Production wiring may inject models/ForecastRecord.js.
|
|--------------------------------------------------------------------------
*/

export const FORECAST_PERSISTENCE_IMPLEMENTATION_PHASE =
    "9.11";

export const FORECAST_PERSISTENCE_IMPLEMENTATION_LAYER =
    "FORECASTING";

export const FORECAST_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE =
    FORECAST_PERSISTENCE_CONTRACT_PHASE;


export const FORECAST_PERSISTENCE_STATUS =
    Object.freeze({
        PERSISTED:
            "PERSISTED",

        ALREADY_PERSISTED:
            "ALREADY_PERSISTED",

        INELIGIBLE:
            "INELIGIBLE",

        FAILED:
            "FAILED",
    });


export const FORECAST_PERSISTENCE_IMPLEMENTATION_REASON =
    Object.freeze({
        FORECAST_PERSISTED:
            "FORECAST_PERSISTED",

        FORECAST_ALREADY_PERSISTED:
            "FORECAST_ALREADY_PERSISTED",

        PERSISTENCE_CONTRACT_INELIGIBLE:
            "PERSISTENCE_CONTRACT_INELIGIBLE",

        PERSISTENCE_MODEL_REQUIRED:
            "PERSISTENCE_MODEL_REQUIRED",

        PERSISTENCE_WRITE_FAILED:
            "PERSISTENCE_WRITE_FAILED",
    });


export const FORECAST_PERSISTENCE_IMPLEMENTATION_BOUNDARIES =
    Object.freeze({
        onlyEligibleContractsPersisted:
            true,

        idempotencyEnforced:
            true,

        duplicateForecastCreated:
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


function assertPersistenceModel(
    ForecastRecordModel
) {
    if (
        !ForecastRecordModel ||
        typeof ForecastRecordModel.findOne !==
            "function" ||
        typeof ForecastRecordModel.create !==
            "function"
    ) {
        throw new Error(
            FORECAST_PERSISTENCE_IMPLEMENTATION_REASON.PERSISTENCE_MODEL_REQUIRED
        );
    }
}


function buildDocument(
    persistenceContract,
    persistedAt
) {
    const {
        record,
        identity,
    } =
        persistenceContract;

    return {
        schemaVersion:
            record.schemaVersion,

        phase:
            record.phase,

        persistenceKey:
            identity.persistenceKey,

        identity:
            {
                ...record.identity,

                forecastOrigin:
                    new Date(
                        record.identity.forecastOrigin
                    ),

                forecastEnd:
                    new Date(
                        record.identity.forecastEnd
                    ),
            },

        target:
            {
                ...record.target,
            },

        window:
            {
                ...record.window,

                forecastOrigin:
                    new Date(
                        record.window.forecastOrigin
                    ),

                forecastEnd:
                    new Date(
                        record.window.forecastEnd
                    ),
            },

        model:
            {
                ...record.model,
            },

        forecast:
            {
                ...record.forecast,

                values:
                    Array.isArray(
                        record.forecast?.values
                    )
                        ? record.forecast.values.map(
                            (
                                item
                            ) => ({
                                ...item,

                                timestamp:
                                    new Date(
                                        item.timestamp
                                    ),

                                provenance:
                                    item.provenance
                                        ? {
                                            ...item.provenance,

                                            sourceTimestamp:
                                                item.provenance.sourceTimestamp
                                                    ? new Date(
                                                        item.provenance.sourceTimestamp
                                                    )
                                                    : null,
                                        }
                                        : null,
                            })
                        )
                        : [],
            },

        provenance:
            {
                ...record.provenance,
            },

        persistedAt,
    };
}


function successResult({
    persistenceContract,
    status,
    reason,
    document,
    persistedAt,
} = {}) {
    return {
        phase:
            FORECAST_PERSISTENCE_IMPLEMENTATION_PHASE,

        layer:
            FORECAST_PERSISTENCE_IMPLEMENTATION_LAYER,

        upstreamPhase:
            FORECAST_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE,

        persistenceContract,

        status,

        reason,

        idempotencyKey:
            persistenceContract
                ?.identity
                ?.persistenceKey ??
            null,

        databaseId:
            document
                ? String(
                    document._id ??
                    document.id ??
                    ""
                ) ||
                null
                : null,

        persistedAt:
            document?.persistedAt ??
            persistedAt ??
            null,

        document:
            document ??
            null,

        boundaries:
            FORECAST_PERSISTENCE_IMPLEMENTATION_BOUNDARIES,
    };
}


export async function persistForecast({
    persistenceContract,
    ForecastRecordModel,
    now = () =>
        new Date(),
} = {}) {
    if (
        !persistenceContract ||
        typeof persistenceContract !==
            "object" ||
        persistenceContract.phase !==
            FORECAST_PERSISTENCE_CONTRACT_PHASE
    ) {
        throw new Error(
            "Forecast persistence requires a validated Phase 9.10 persistence contract."
        );
    }

    if (
        persistenceContract.eligibility !==
            FORECAST_PERSISTENCE_ELIGIBILITY.ELIGIBLE
    ) {
        return successResult({
            persistenceContract,

            status:
                FORECAST_PERSISTENCE_STATUS.INELIGIBLE,

            reason:
                FORECAST_PERSISTENCE_IMPLEMENTATION_REASON.PERSISTENCE_CONTRACT_INELIGIBLE,

            document:
                null,

            persistedAt:
                null,
        });
    }

    assertPersistenceModel(
        ForecastRecordModel
    );

    const idempotencyKey =
        persistenceContract
            ?.identity
            ?.persistenceKey;

    try {
        const existing =
            await ForecastRecordModel.findOne(
                {
                    persistenceKey:
                        idempotencyKey,
                }
            );

        if (
            existing
        ) {
            return successResult({
                persistenceContract,

                status:
                    FORECAST_PERSISTENCE_STATUS.ALREADY_PERSISTED,

                reason:
                    FORECAST_PERSISTENCE_IMPLEMENTATION_REASON.FORECAST_ALREADY_PERSISTED,

                document:
                    existing,

                persistedAt:
                    existing.persistedAt ??
                    null,
            });
        }

        const persistedAt =
            now();

        const document =
            await ForecastRecordModel.create(
                buildDocument(
                    persistenceContract,
                    persistedAt
                )
            );

        return successResult({
            persistenceContract,

            status:
                FORECAST_PERSISTENCE_STATUS.PERSISTED,

            reason:
                FORECAST_PERSISTENCE_IMPLEMENTATION_REASON.FORECAST_PERSISTED,

            document,

            persistedAt,
        });
    }
    catch (
        error
    ) {
        return {
            phase:
                FORECAST_PERSISTENCE_IMPLEMENTATION_PHASE,

            layer:
                FORECAST_PERSISTENCE_IMPLEMENTATION_LAYER,

            upstreamPhase:
                FORECAST_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE,

            persistenceContract,

            status:
                FORECAST_PERSISTENCE_STATUS.FAILED,

            reason:
                FORECAST_PERSISTENCE_IMPLEMENTATION_REASON.PERSISTENCE_WRITE_FAILED,

            idempotencyKey,

            databaseId:
                null,

            persistedAt:
                null,

            document:
                null,

            error:
                {
                    name:
                        error?.name ??
                        "Error",

                    message:
                        error?.message ??
                        "Forecast persistence failed.",
                },

            boundaries:
                FORECAST_PERSISTENCE_IMPLEMENTATION_BOUNDARIES,
        };
    }
}


export default Object.freeze({
    FORECAST_PERSISTENCE_IMPLEMENTATION_PHASE,
    FORECAST_PERSISTENCE_IMPLEMENTATION_LAYER,
    FORECAST_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE,
    FORECAST_PERSISTENCE_STATUS,
    FORECAST_PERSISTENCE_IMPLEMENTATION_REASON,
    FORECAST_PERSISTENCE_IMPLEMENTATION_BOUNDARIES,
    persistForecast,
});
