// services/forecasting/forecastModelContract.js

import {
    FORECAST_TARGET_KIND,
    FORECAST_OUTPUT_TYPE,
} from "./forecastingContract.js";

import {
    FORECAST_FEATURE_MATERIALIZATION_PHASE,
} from "./forecastFeatureMaterializationService.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.5 — Forecast Model Contract
|--------------------------------------------------------------------------
|
| Defines permissible forecasting-model semantics only.
|
| This module does NOT:
| - train or fit a model
| - select a winning model
| - tune hyperparameters
| - calculate predictions
| - calculate evaluation metrics
| - persist model artifacts
| - expose API/dashboard
|
|--------------------------------------------------------------------------
*/

export const FORECAST_MODEL_CONTRACT_PHASE =
    "9.5";

export const FORECAST_MODEL_CONTRACT_LAYER =
    "FORECASTING";

export const FORECAST_MODEL_CONTRACT_UPSTREAM_PHASE =
    FORECAST_FEATURE_MATERIALIZATION_PHASE;


export const FORECAST_MODEL_FAMILY =
    Object.freeze({
        NAIVE:
            "NAIVE",

        LINEAR_REGRESSION:
            "LINEAR_REGRESSION",

        TREE_ENSEMBLE:
            "TREE_ENSEMBLE",

        GRADIENT_BOOSTING:
            "GRADIENT_BOOSTING",

        STATE_CLASSIFIER:
            "STATE_CLASSIFIER",
    });


export const FORECAST_MODEL_TASK =
    Object.freeze({
        REGRESSION:
            "REGRESSION",

        CLASSIFICATION:
            "CLASSIFICATION",

        PROBABILITY_ESTIMATION:
            "PROBABILITY_ESTIMATION",
    });


export const FORECAST_EVALUATION_SPLIT =
    Object.freeze({
        HOLDOUT:
            "HOLDOUT",

        WALK_FORWARD:
            "WALK_FORWARD",
    });


export const FORECAST_MODEL_STATUS =
    Object.freeze({
        CONTRACT_DEFINED:
            "CONTRACT_DEFINED",

        NOT_TRAINED:
            "NOT_TRAINED",
    });


export const FORECAST_MODEL_BOUNDARIES =
    Object.freeze({
        trainingExecuted:
            false,

        fittingExecuted:
            false,

        predictionsCalculated:
            false,

        evaluationMetricsCalculated:
            false,

        hyperparameterSearchExecuted:
            false,

        modelSelectionExecuted:
            false,

        crossValidationExecuted:
            false,

        randomShuffleAllowed:
            false,

        temporalOrderPreserved:
            true,

        futureDataAllowedInTraining:
            false,

        validationDataAllowedInTraining:
            false,

        testDataAllowedInTraining:
            false,

        targetLeakageAllowed:
            false,

        unitInferenceAllowed:
            false,

        topologyMergeAllowed:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        normalizationApplied:
            false,

        scalingApplied:
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


function normalizeString(
    value,
    label,
    required = false
) {
    if (
        value === null ||
        value === undefined
    ) {
        if (
            required
        ) {
            throw new Error(
                `${label} is required.`
            );
        }

        return null;
    }

    const normalized =
        String(
            value
        ).trim();

    if (
        required &&
        !normalized
    ) {
        throw new Error(
            `${label} is required.`
        );
    }

    return normalized ||
        null;
}


function assertEnum(
    value,
    enumObject,
    label
) {
    if (
        !Object.values(
            enumObject
        ).includes(
            value
        )
    ) {
        throw new Error(
            `Unsupported ${label}: ${value}`
        );
    }

    return value;
}


function positiveIntegerOrNull(
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
        !Number.isInteger(
            value
        ) ||
        value <=
            0
    ) {
        throw new Error(
            `${label} must be a positive integer when supplied.`
        );
    }

    return value;
}


function validateTaskCompatibility({
    targetKind,
    task,
    outputType,
} = {}) {
    if (
        targetKind ===
            FORECAST_TARGET_KIND.NUMERIC &&
        task !==
            FORECAST_MODEL_TASK.REGRESSION
    ) {
        throw new Error(
            "NUMERIC forecast targets require REGRESSION task."
        );
    }

    if (
        targetKind ===
            FORECAST_TARGET_KIND.STATE &&
        task !==
            FORECAST_MODEL_TASK.CLASSIFICATION
    ) {
        throw new Error(
            "STATE forecast targets require CLASSIFICATION task."
        );
    }

    if (
        targetKind ===
            FORECAST_TARGET_KIND.PROBABILITY &&
        task !==
            FORECAST_MODEL_TASK.PROBABILITY_ESTIMATION
    ) {
        throw new Error(
            "PROBABILITY forecast targets require PROBABILITY_ESTIMATION task."
        );
    }

    if (
        task ===
            FORECAST_MODEL_TASK.REGRESSION &&
        ![
            FORECAST_OUTPUT_TYPE.POINT,
            FORECAST_OUTPUT_TYPE.INTERVAL,
            FORECAST_OUTPUT_TYPE.PROBABILISTIC,
        ].includes(
            outputType
        )
    ) {
        throw new Error(
            "REGRESSION task requires POINT, INTERVAL or PROBABILISTIC output."
        );
    }

    if (
        task ===
            FORECAST_MODEL_TASK.CLASSIFICATION &&
        outputType !==
            FORECAST_OUTPUT_TYPE.STATE
    ) {
        throw new Error(
            "CLASSIFICATION task requires STATE output."
        );
    }

    if (
        task ===
            FORECAST_MODEL_TASK.PROBABILITY_ESTIMATION &&
        outputType !==
            FORECAST_OUTPUT_TYPE.PROBABILISTIC
    ) {
        throw new Error(
            "PROBABILITY_ESTIMATION task requires PROBABILISTIC output."
        );
    }
}


export function buildForecastEvaluationContract({
    split,
    validationFraction = null,
    testFraction = null,
    minimumTrainingRows = null,
} = {}) {
    const normalizedSplit =
        assertEnum(
            split,
            FORECAST_EVALUATION_SPLIT,
            "forecast evaluation split"
        );

    const fractions =
        [
            [
                "validationFraction",
                validationFraction,
            ],
            [
                "testFraction",
                testFraction,
            ],
        ];

    for (
        const [
            label,
            value,
        ] of fractions
    ) {
        if (
            value !== null &&
            value !== undefined &&
            (
                typeof value !==
                    "number" ||
                !Number.isFinite(
                    value
                ) ||
                value <=
                    0 ||
                value >=
                    1
            )
        ) {
            throw new Error(
                `${label} must be between 0 and 1 when supplied.`
            );
        }
    }

    const totalFraction =
        (
            validationFraction ??
            0
        ) +
        (
            testFraction ??
            0
        );

    if (
        totalFraction >=
            1
    ) {
        throw new Error(
            "Validation and test fractions must leave training data available."
        );
    }

    return {
        split:
            normalizedSplit,

        validationFraction:
            validationFraction ??
            null,

        testFraction:
            testFraction ??
            null,

        minimumTrainingRows:
            positiveIntegerOrNull(
                minimumTrainingRows,
                "minimumTrainingRows"
            ),

        chronology:
            {
                randomShuffleAllowed:
                    false,

                temporalOrderPreserved:
                    true,

                trainingBeforeValidation:
                    true,

                validationBeforeTest:
                    true,
            },
    };
}


export function buildForecastModelDefinition({
    name,
    family,
    task,
    targetKind,
    outputType,
    featureMaterialization,
    evaluation,
    hyperparameters = null,
    description = null,
} = {}) {
    const normalizedName =
        normalizeString(
            name,
            "Forecast model name",
            true
        );

    const normalizedFamily =
        assertEnum(
            family,
            FORECAST_MODEL_FAMILY,
            "forecast model family"
        );

    const normalizedTask =
        assertEnum(
            task,
            FORECAST_MODEL_TASK,
            "forecast model task"
        );

    const normalizedTargetKind =
        assertEnum(
            targetKind,
            FORECAST_TARGET_KIND,
            "forecast target kind"
        );

    const normalizedOutputType =
        assertEnum(
            outputType,
            FORECAST_OUTPUT_TYPE,
            "forecast output type"
        );

    validateTaskCompatibility({
        targetKind:
            normalizedTargetKind,

        task:
            normalizedTask,

        outputType:
            normalizedOutputType,
    });

    if (
        !featureMaterialization ||
        typeof featureMaterialization !==
            "object" ||
        featureMaterialization.phase !==
            FORECAST_FEATURE_MATERIALIZATION_PHASE
    ) {
        throw new Error(
            "Forecast model definition requires validated Phase 9.4 feature materialization."
        );
    }

    if (
        !evaluation ||
        typeof evaluation !==
            "object"
    ) {
        throw new Error(
            "Forecast model definition requires an evaluation contract."
        );
    }

    if (
        hyperparameters !==
            null &&
        (
            typeof hyperparameters !==
                "object" ||
            Array.isArray(
                hyperparameters
            )
        )
    ) {
        throw new Error(
            "Forecast model hyperparameters must be an object or null."
        );
    }

    return {
        phase:
            FORECAST_MODEL_CONTRACT_PHASE,

        layer:
            FORECAST_MODEL_CONTRACT_LAYER,

        upstreamPhase:
            FORECAST_MODEL_CONTRACT_UPSTREAM_PHASE,

        name:
            normalizedName,

        family:
            normalizedFamily,

        task:
            normalizedTask,

        targetKind:
            normalizedTargetKind,

        outputType:
            normalizedOutputType,

        featureMaterialization,

        evaluation,

        hyperparameters:
            hyperparameters ===
                null
                ? null
                : Object.freeze({
                    ...hyperparameters,
                }),

        description:
            normalizeString(
                description,
                "Forecast model description"
            ),

        status:
            FORECAST_MODEL_STATUS.CONTRACT_DEFINED,

        training:
            {
                status:
                    FORECAST_MODEL_STATUS.NOT_TRAINED,

                modelArtifact:
                    null,

                predictions:
                    null,

                metrics:
                    null,
            },

        boundaries:
            FORECAST_MODEL_BOUNDARIES,
    };
}


export default Object.freeze({
    FORECAST_MODEL_CONTRACT_PHASE,
    FORECAST_MODEL_CONTRACT_LAYER,
    FORECAST_MODEL_CONTRACT_UPSTREAM_PHASE,
    FORECAST_MODEL_FAMILY,
    FORECAST_MODEL_TASK,
    FORECAST_EVALUATION_SPLIT,
    FORECAST_MODEL_STATUS,
    FORECAST_MODEL_BOUNDARIES,
    buildForecastEvaluationContract,
    buildForecastModelDefinition,
});
