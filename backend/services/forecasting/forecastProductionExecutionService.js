// services/forecasting/forecastProductionExecutionService.js

import {
    FORECAST_PRODUCTION_CONTRACT_PHASE,
    FORECAST_PRODUCTION_ELIGIBILITY,
} from "./forecastProductionContract.js";

import {
    FORECAST_MODEL_FAMILY,
} from "./forecastModelContract.js";

import {
    FORECAST_OUTPUT_TYPE,
} from "./forecastingContract.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.9 — Production Forecast Execution
|--------------------------------------------------------------------------
|
| Executes only production-eligible Phase 9.8 contracts.
|
| Safe execution supported in 9.9:
| - NAIVE
| - POINT output
| - explicit forecast timestamps supplied by caller
|
| LINEAR_REGRESSION production execution is intentionally withheld because
| Phase 9.4 does not yet materialize an explicit future feature matrix.
|
| This module does NOT:
| - infer forecast cadence
| - fabricate future features
| - recursively feed predictions into features
| - retrain models
| - tune/select/rank models
| - persist forecasts
| - expose API/dashboard
| - execute Financial/BI or Optimization/DSS
|
|--------------------------------------------------------------------------
*/

export const FORECAST_PRODUCTION_EXECUTION_PHASE =
    "9.9";

export const FORECAST_PRODUCTION_EXECUTION_LAYER =
    "FORECASTING";

export const FORECAST_PRODUCTION_EXECUTION_UPSTREAM_PHASE =
    FORECAST_PRODUCTION_CONTRACT_PHASE;


export const FORECAST_PRODUCTION_EXECUTION_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const FORECAST_PRODUCTION_EXECUTION_REASON =
    Object.freeze({
        NAIVE_POINT_FORECAST_CALCULATED:
            "NAIVE_POINT_FORECAST_CALCULATED",

        PRODUCTION_CONTRACT_INELIGIBLE:
            "PRODUCTION_CONTRACT_INELIGIBLE",

        UNSUPPORTED_MODEL_FAMILY:
            "UNSUPPORTED_MODEL_FAMILY",

        UNSUPPORTED_OUTPUT_TYPE:
            "UNSUPPORTED_OUTPUT_TYPE",

        FUTURE_FEATURE_MATRIX_NOT_QUALIFIED:
            "FUTURE_FEATURE_MATRIX_NOT_QUALIFIED",

        FORECAST_TIMESTAMPS_REQUIRED:
            "FORECAST_TIMESTAMPS_REQUIRED",

        FORECAST_TIMESTAMP_INVALID:
            "FORECAST_TIMESTAMP_INVALID",

        FORECAST_TIMESTAMP_OUTSIDE_HORIZON:
            "FORECAST_TIMESTAMP_OUTSIDE_HORIZON",

        FORECAST_TIMESTAMPS_NOT_STRICTLY_INCREASING:
            "FORECAST_TIMESTAMPS_NOT_STRICTLY_INCREASING",

        MODEL_ARTIFACT_UNAVAILABLE:
            "MODEL_ARTIFACT_UNAVAILABLE",

        LAST_OBSERVED_TARGET_UNAVAILABLE:
            "LAST_OBSERVED_TARGET_UNAVAILABLE",
    });


export const FORECAST_PRODUCTION_EXECUTION_BOUNDARIES =
    Object.freeze({
        forecastCadenceInferred:
            false,

        futureFeatureMatrixFabricated:
            false,

        futureObservedDataUsed:
            false,

        recursivePredictionFeatureUseAllowed:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        targetUnitInferred:
            false,

        timezoneChanged:
            false,

        horizonExtended:
            false,

        modelRetrainingExecuted:
            false,

        hyperparameterSearchExecuted:
            false,

        modelSelectionExecuted:
            false,

        modelRankingExecuted:
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


function finiteNumber(
    value
) {
    return (
        typeof value ===
            "number" &&
        Number.isFinite(
            value
        )
    );
}


function parseTimestamp(
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
        : date;
}


function unavailableResult({
    productionContract,
    reason,
    forecastTimestamps = null,
} = {}) {
    return {
        phase:
            FORECAST_PRODUCTION_EXECUTION_PHASE,

        layer:
            FORECAST_PRODUCTION_EXECUTION_LAYER,

        upstreamPhase:
            FORECAST_PRODUCTION_EXECUTION_UPSTREAM_PHASE,

        productionContract,

        status:
            FORECAST_PRODUCTION_EXECUTION_STATUS.UNAVAILABLE,

        reason,

        forecastTimestamps,

        forecast:
            {
                outputType:
                    productionContract?.requestedOutputType ??
                    null,

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
            FORECAST_PRODUCTION_EXECUTION_BOUNDARIES,
    };
}


function validateForecastTimestamps({
    productionContract,
    forecastTimestamps,
} = {}) {
    if (
        !Array.isArray(
            forecastTimestamps
        ) ||
        forecastTimestamps.length ===
            0
    ) {
        return {
            ok:
                false,

            reason:
                FORECAST_PRODUCTION_EXECUTION_REASON.FORECAST_TIMESTAMPS_REQUIRED,
        };
    }

    const origin =
        parseTimestamp(
            productionContract
                ?.productionWindow
                ?.forecastOrigin
        );

    const end =
        parseTimestamp(
            productionContract
                ?.productionWindow
                ?.forecastEnd
        );

    if (
        !origin ||
        !end ||
        end <=
            origin
    ) {
        return {
            ok:
                false,

            reason:
                FORECAST_PRODUCTION_EXECUTION_REASON.FORECAST_TIMESTAMP_OUTSIDE_HORIZON,
        };
    }

    const parsed =
        [];

    for (
        const value of forecastTimestamps
    ) {
        const date =
            parseTimestamp(
                value
            );

        if (
            !date
        ) {
            return {
                ok:
                    false,

                reason:
                    FORECAST_PRODUCTION_EXECUTION_REASON.FORECAST_TIMESTAMP_INVALID,
            };
        }

        if (
            date <
                origin ||
            date >=
                end
        ) {
            return {
                ok:
                    false,

                reason:
                    FORECAST_PRODUCTION_EXECUTION_REASON.FORECAST_TIMESTAMP_OUTSIDE_HORIZON,
            };
        }

        parsed.push(
            date
        );
    }

    for (
        let index = 1;
        index <
        parsed.length;
        index +=
            1
    ) {
        if (
            parsed[
                index
            ] <=
            parsed[
                index -
                    1
            ]
        ) {
            return {
                ok:
                    false,

                reason:
                    FORECAST_PRODUCTION_EXECUTION_REASON.FORECAST_TIMESTAMPS_NOT_STRICTLY_INCREASING,
            };
        }
    }

    return {
        ok:
            true,

        parsed,
    };
}


function getTrainingResult(
    productionContract
) {
    return productionContract
        ?.qualification
        ?.trainingResult
        ?? null;
}


function lastObservedTarget(
    productionContract
) {
    const matrix =
        getTrainingResult(
            productionContract
        )
            ?.modelContract
            ?.featureMaterialization
            ?.matrix
        ?? [];

    for (
        let index =
            matrix.length -
                1;
        index >=
            0;
        index -=
            1
    ) {
        const value =
            matrix[
                index
            ]
                ?.target
                ?.value;

        if (
            finiteNumber(
                value
            )
        ) {
            return {
                value,

                unit:
                    matrix[
                        index
                    ]
                        ?.target
                        ?.unit ??
                    productionContract
                        ?.target
                        ?.unit ??
                    null,

                timestamp:
                    matrix[
                        index
                    ]
                        ?.timestamp ??
                    null,
            };
        }
    }

    return null;
}


export function executeProductionForecast({
    productionContract,
    forecastTimestamps,
} = {}) {
    if (
        !productionContract ||
        typeof productionContract !==
            "object" ||
        productionContract.phase !==
            FORECAST_PRODUCTION_CONTRACT_PHASE
    ) {
        throw new Error(
            "Production forecast execution requires a validated Phase 9.8 production contract."
        );
    }

    if (
        productionContract.eligibility !==
            FORECAST_PRODUCTION_ELIGIBILITY.ELIGIBLE
    ) {
        return unavailableResult({
            productionContract,
            reason:
                FORECAST_PRODUCTION_EXECUTION_REASON.PRODUCTION_CONTRACT_INELIGIBLE,
            forecastTimestamps:
                forecastTimestamps ??
                null,
        });
    }

    const timestampValidation =
        validateForecastTimestamps({
            productionContract,
            forecastTimestamps,
        });

    if (
        !timestampValidation.ok
    ) {
        return unavailableResult({
            productionContract,
            reason:
                timestampValidation.reason,
            forecastTimestamps:
                forecastTimestamps ??
                null,
        });
    }

    if (
        productionContract.requestedOutputType !==
            FORECAST_OUTPUT_TYPE.POINT
    ) {
        return unavailableResult({
            productionContract,
            reason:
                FORECAST_PRODUCTION_EXECUTION_REASON.UNSUPPORTED_OUTPUT_TYPE,
            forecastTimestamps,
        });
    }

    const trainingResult =
        getTrainingResult(
            productionContract
        );

    const modelFamily =
        productionContract
            ?.model
            ?.family;

    if (
        modelFamily ===
            FORECAST_MODEL_FAMILY.LINEAR_REGRESSION
    ) {
        return unavailableResult({
            productionContract,
            reason:
                FORECAST_PRODUCTION_EXECUTION_REASON.FUTURE_FEATURE_MATRIX_NOT_QUALIFIED,
            forecastTimestamps,
        });
    }

    if (
        modelFamily !==
            FORECAST_MODEL_FAMILY.NAIVE
    ) {
        return unavailableResult({
            productionContract,
            reason:
                FORECAST_PRODUCTION_EXECUTION_REASON.UNSUPPORTED_MODEL_FAMILY,
            forecastTimestamps,
        });
    }

    if (
        trainingResult
            ?.artifact
            ?.family !==
            FORECAST_MODEL_FAMILY.NAIVE ||
        trainingResult
            ?.artifact
            ?.trained !==
            true
    ) {
        return unavailableResult({
            productionContract,
            reason:
                FORECAST_PRODUCTION_EXECUTION_REASON.MODEL_ARTIFACT_UNAVAILABLE,
            forecastTimestamps,
        });
    }

    const lastObserved =
        lastObservedTarget(
            productionContract
        );

    if (
        !lastObserved
    ) {
        return unavailableResult({
            productionContract,
            reason:
                FORECAST_PRODUCTION_EXECUTION_REASON.LAST_OBSERVED_TARGET_UNAVAILABLE,
            forecastTimestamps,
        });
    }

    const values =
        timestampValidation.parsed.map(
            (
                timestamp
            ) => ({
                timestamp,

                value:
                    lastObserved.value,

                unit:
                    lastObserved.unit,

                provenance:
                    {
                        modelFamily:
                            FORECAST_MODEL_FAMILY.NAIVE,

                        strategy:
                            "LAST_OBSERVED_VALUE",

                        sourceTimestamp:
                            lastObserved.timestamp,
                    },
            })
        );

    return {
        phase:
            FORECAST_PRODUCTION_EXECUTION_PHASE,

        layer:
            FORECAST_PRODUCTION_EXECUTION_LAYER,

        upstreamPhase:
            FORECAST_PRODUCTION_EXECUTION_UPSTREAM_PHASE,

        productionContract,

        status:
            FORECAST_PRODUCTION_EXECUTION_STATUS.CALCULATED,

        reason:
            FORECAST_PRODUCTION_EXECUTION_REASON.NAIVE_POINT_FORECAST_CALCULATED,

        forecastTimestamps,

        forecast:
            {
                outputType:
                    FORECAST_OUTPUT_TYPE.POINT,

                values,

                intervals:
                    null,

                probabilities:
                    null,

                states:
                    null,
            },

        boundaries:
            FORECAST_PRODUCTION_EXECUTION_BOUNDARIES,
    };
}


export default Object.freeze({
    FORECAST_PRODUCTION_EXECUTION_PHASE,
    FORECAST_PRODUCTION_EXECUTION_LAYER,
    FORECAST_PRODUCTION_EXECUTION_UPSTREAM_PHASE,
    FORECAST_PRODUCTION_EXECUTION_STATUS,
    FORECAST_PRODUCTION_EXECUTION_REASON,
    FORECAST_PRODUCTION_EXECUTION_BOUNDARIES,
    executeProductionForecast,
});
