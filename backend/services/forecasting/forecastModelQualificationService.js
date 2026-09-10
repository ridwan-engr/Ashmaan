// services/forecasting/forecastModelQualificationService.js

import {
    FORECAST_BASELINE_TRAINING_PHASE,
    FORECAST_BASELINE_TRAINING_STATUS,
} from "./forecastBaselineTrainingService.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.7 — Forecast Evaluation and Model Qualification
|--------------------------------------------------------------------------
|
| Qualifies trained Phase 9.6 baselines using explicit acceptance criteria.
|
| This service does NOT:
| - retrain models
| - tune hyperparameters
| - select a winning model
| - rank models
| - alter predictions
| - infer units
| - persist models or forecasts
| - expose API/dashboard
| - execute Financial/BI or Optimization/DSS
|
|--------------------------------------------------------------------------
*/

export const FORECAST_MODEL_QUALIFICATION_PHASE =
    "9.7";

export const FORECAST_MODEL_QUALIFICATION_LAYER =
    "FORECASTING";

export const FORECAST_MODEL_QUALIFICATION_UPSTREAM_PHASE =
    FORECAST_BASELINE_TRAINING_PHASE;


export const FORECAST_MODEL_QUALIFICATION_STATUS =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        PARTIALLY_QUALIFIED:
            "PARTIALLY_QUALIFIED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const FORECAST_MODEL_QUALIFICATION_REASON =
    Object.freeze({
        ACCEPTANCE_CRITERIA_MET:
            "ACCEPTANCE_CRITERIA_MET",

        VALIDATION_CRITERIA_FAILED:
            "VALIDATION_CRITERIA_FAILED",

        TEST_CRITERIA_FAILED:
            "TEST_CRITERIA_FAILED",

        VALIDATION_AND_TEST_CRITERIA_FAILED:
            "VALIDATION_AND_TEST_CRITERIA_FAILED",

        TRAINING_RESULT_UNAVAILABLE:
            "TRAINING_RESULT_UNAVAILABLE",

        METRICS_UNAVAILABLE:
            "METRICS_UNAVAILABLE",

        ACCEPTANCE_CRITERIA_MISSING:
            "ACCEPTANCE_CRITERIA_MISSING",
    });


export const FORECAST_MODEL_QUALIFICATION_BOUNDARIES =
    Object.freeze({
        retrainingExecuted:
            false,

        hyperparameterSearchExecuted:
            false,

        automaticModelSelectionExecuted:
            false,

        modelRankingExecuted:
            false,

        predictionsMutated:
            false,

        metricsMutated:
            false,

        targetUnitInferred:
            false,

        acceptanceThresholdsInferred:
            false,

        missingMetricMeansZero:
            false,

        unavailableMeansZero:
            false,

        validationOverridesTest:
            false,

        testOverridesValidation:
            false,

        persistenceIncluded:
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


function finiteNonNegative(
    value
) {
    return (
        typeof value ===
            "number" &&
        Number.isFinite(
            value
        ) &&
        value >=
            0
    );
}


function validateMetricThreshold(
    value,
    label
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        !finiteNonNegative(
            value
        )
    ) {
        throw new Error(
            `${label} must be a finite non-negative number when supplied.`
        );
    }

    return value;
}


export function buildForecastAcceptanceCriteria({
    maximumValidationMae = null,
    maximumValidationRmse = null,
    maximumTestMae = null,
    maximumTestRmse = null,
} = {}) {
    const criteria =
        {
            maximumValidationMae:
                validateMetricThreshold(
                    maximumValidationMae,
                    "maximumValidationMae"
                ),

            maximumValidationRmse:
                validateMetricThreshold(
                    maximumValidationRmse,
                    "maximumValidationRmse"
                ),

            maximumTestMae:
                validateMetricThreshold(
                    maximumTestMae,
                    "maximumTestMae"
                ),

            maximumTestRmse:
                validateMetricThreshold(
                    maximumTestRmse,
                    "maximumTestRmse"
                ),
        };

    const suppliedCount =
        Object.values(
            criteria
        ).filter(
            (
                value
            ) =>
                value !==
                    null
        ).length;

    if (
        suppliedCount ===
            0
    ) {
        throw new Error(
            "At least one explicit forecast acceptance criterion is required."
        );
    }

    return Object.freeze(
        criteria
    );
}


function evaluatePartition({
    metrics,
    maximumMae,
    maximumRmse,
    partition,
} = {}) {
    const required =
        maximumMae !==
            null ||
        maximumRmse !==
            null;

    if (
        !required
    ) {
        return {
            partition,
            required:
                false,
            evaluated:
                false,
            passed:
                null,
            reason:
                "NO_CRITERIA_FOR_PARTITION",
            checks:
                [],
        };
    }

    if (
        !metrics ||
        metrics.calculated !==
            true
    ) {
        return {
            partition,
            required:
                true,
            evaluated:
                false,
            passed:
                false,
            reason:
                "METRICS_UNAVAILABLE",
            checks:
                [],
        };
    }

    const checks =
        [];

    if (
        maximumMae !==
            null
    ) {
        checks.push({
            metric:
                "MAE",
            actual:
                metrics.mae,
            maximum:
                maximumMae,
            passed:
                finiteNonNegative(
                    metrics.mae
                ) &&
                metrics.mae <=
                    maximumMae,
        });
    }

    if (
        maximumRmse !==
            null
    ) {
        checks.push({
            metric:
                "RMSE",
            actual:
                metrics.rmse,
            maximum:
                maximumRmse,
            passed:
                finiteNonNegative(
                    metrics.rmse
                ) &&
                metrics.rmse <=
                    maximumRmse,
        });
    }

    const passed =
        checks.every(
            (
                check
            ) =>
                check.passed
        );

    return {
        partition,
        required:
            true,
        evaluated:
            true,
        passed,
        reason:
            passed
                ? "CRITERIA_MET"
                : "CRITERIA_FAILED",
        checks,
    };
}


function unavailableResult({
    trainingResult,
    criteria,
    reason,
} = {}) {
    return {
        phase:
            FORECAST_MODEL_QUALIFICATION_PHASE,

        layer:
            FORECAST_MODEL_QUALIFICATION_LAYER,

        upstreamPhase:
            FORECAST_MODEL_QUALIFICATION_UPSTREAM_PHASE,

        trainingResult,

        criteria,

        status:
            FORECAST_MODEL_QUALIFICATION_STATUS.UNAVAILABLE,

        reason,

        validation:
            null,

        test:
            null,

        qualified:
            false,

        boundaries:
            FORECAST_MODEL_QUALIFICATION_BOUNDARIES,
    };
}


export function qualifyForecastModel({
    trainingResult,
    criteria,
} = {}) {
    if (
        !trainingResult ||
        typeof trainingResult !==
            "object" ||
        trainingResult.phase !==
            FORECAST_BASELINE_TRAINING_PHASE
    ) {
        throw new Error(
            "Forecast model qualification requires a validated Phase 9.6 training result."
        );
    }

    if (
        !criteria ||
        typeof criteria !==
            "object"
    ) {
        return unavailableResult({
            trainingResult,
            criteria:
                criteria ??
                null,
            reason:
                FORECAST_MODEL_QUALIFICATION_REASON.ACCEPTANCE_CRITERIA_MISSING,
        });
    }

    if (
        trainingResult.status !==
            FORECAST_BASELINE_TRAINING_STATUS.TRAINED
    ) {
        return unavailableResult({
            trainingResult,
            criteria,
            reason:
                FORECAST_MODEL_QUALIFICATION_REASON.TRAINING_RESULT_UNAVAILABLE,
        });
    }

    if (
        !trainingResult.metrics
    ) {
        return unavailableResult({
            trainingResult,
            criteria,
            reason:
                FORECAST_MODEL_QUALIFICATION_REASON.METRICS_UNAVAILABLE,
        });
    }

    const validation =
        evaluatePartition({
            metrics:
                trainingResult.metrics.validation,

            maximumMae:
                criteria.maximumValidationMae ??
                null,

            maximumRmse:
                criteria.maximumValidationRmse ??
                null,

            partition:
                "VALIDATION",
        });

    const test =
        evaluatePartition({
            metrics:
                trainingResult.metrics.test,

            maximumMae:
                criteria.maximumTestMae ??
                null,

            maximumRmse:
                criteria.maximumTestRmse ??
                null,

            partition:
                "TEST",
        });

    const requiredResults =
        [
            validation,
            test,
        ].filter(
            (
                result
            ) =>
                result.required
        );

    if (
        !requiredResults.length
    ) {
        return unavailableResult({
            trainingResult,
            criteria,
            reason:
                FORECAST_MODEL_QUALIFICATION_REASON.ACCEPTANCE_CRITERIA_MISSING,
        });
    }

    if (
        requiredResults.some(
            (
                result
            ) =>
                !result.evaluated
        )
    ) {
        return {
            phase:
                FORECAST_MODEL_QUALIFICATION_PHASE,

            layer:
                FORECAST_MODEL_QUALIFICATION_LAYER,

            upstreamPhase:
                FORECAST_MODEL_QUALIFICATION_UPSTREAM_PHASE,

            trainingResult,

            criteria,

            status:
                FORECAST_MODEL_QUALIFICATION_STATUS.UNAVAILABLE,

            reason:
                FORECAST_MODEL_QUALIFICATION_REASON.METRICS_UNAVAILABLE,

            validation,

            test,

            qualified:
                false,

            boundaries:
                FORECAST_MODEL_QUALIFICATION_BOUNDARIES,
        };
    }

    const validationFailed =
        validation.required &&
        validation.passed ===
            false;

    const testFailed =
        test.required &&
        test.passed ===
            false;

    let status =
        FORECAST_MODEL_QUALIFICATION_STATUS.QUALIFIED;

    let reason =
        FORECAST_MODEL_QUALIFICATION_REASON.ACCEPTANCE_CRITERIA_MET;

    if (
        validationFailed &&
        testFailed
    ) {
        status =
            FORECAST_MODEL_QUALIFICATION_STATUS.PARTIALLY_QUALIFIED;

        reason =
            FORECAST_MODEL_QUALIFICATION_REASON.VALIDATION_AND_TEST_CRITERIA_FAILED;
    }
    else if (
        validationFailed
    ) {
        status =
            FORECAST_MODEL_QUALIFICATION_STATUS.PARTIALLY_QUALIFIED;

        reason =
            FORECAST_MODEL_QUALIFICATION_REASON.VALIDATION_CRITERIA_FAILED;
    }
    else if (
        testFailed
    ) {
        status =
            FORECAST_MODEL_QUALIFICATION_STATUS.PARTIALLY_QUALIFIED;

        reason =
            FORECAST_MODEL_QUALIFICATION_REASON.TEST_CRITERIA_FAILED;
    }

    return {
        phase:
            FORECAST_MODEL_QUALIFICATION_PHASE,

        layer:
            FORECAST_MODEL_QUALIFICATION_LAYER,

        upstreamPhase:
            FORECAST_MODEL_QUALIFICATION_UPSTREAM_PHASE,

        trainingResult,

        criteria,

        status,

        reason,

        validation,

        test,

        qualified:
            status ===
                FORECAST_MODEL_QUALIFICATION_STATUS.QUALIFIED,

        boundaries:
            FORECAST_MODEL_QUALIFICATION_BOUNDARIES,
    };
}


export default Object.freeze({
    FORECAST_MODEL_QUALIFICATION_PHASE,
    FORECAST_MODEL_QUALIFICATION_LAYER,
    FORECAST_MODEL_QUALIFICATION_UPSTREAM_PHASE,
    FORECAST_MODEL_QUALIFICATION_STATUS,
    FORECAST_MODEL_QUALIFICATION_REASON,
    FORECAST_MODEL_QUALIFICATION_BOUNDARIES,
    buildForecastAcceptanceCriteria,
    qualifyForecastModel,
});
