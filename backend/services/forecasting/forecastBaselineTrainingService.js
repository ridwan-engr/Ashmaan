// services/forecasting/forecastBaselineTrainingService.js

import {
    FORECAST_MODEL_FAMILY,
    FORECAST_MODEL_TASK,
    FORECAST_MODEL_STATUS,
    FORECAST_EVALUATION_SPLIT,
} from "./forecastModelContract.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.6 — Model Training and Baseline Forecasting
|--------------------------------------------------------------------------
|
| First forecasting checkpoint that is allowed to:
| - fit controlled baseline models
| - produce chronological holdout predictions
| - calculate baseline regression metrics
|
| Supported in 9.6:
| - NAIVE regression baseline
| - LINEAR_REGRESSION baseline
| - chronological HOLDOUT evaluation
|
| Explicitly excluded:
| - random shuffle
| - hyperparameter search
| - automatic model selection
| - tree ensemble training
| - gradient boosting training
| - state classification training
| - probability model training
| - walk-forward execution
| - persistence/API/dashboard
|
|--------------------------------------------------------------------------
*/

export const FORECAST_BASELINE_TRAINING_PHASE =
    "9.6";

export const FORECAST_BASELINE_TRAINING_LAYER =
    "FORECASTING";

export const FORECAST_BASELINE_TRAINING_UPSTREAM_PHASE =
    "9.5";


export const FORECAST_BASELINE_TRAINING_STATUS =
    Object.freeze({
        TRAINED:
            "TRAINED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const FORECAST_BASELINE_REASON =
    Object.freeze({
        TRAINED:
            "BASELINE_TRAINING_COMPLETE",

        INSUFFICIENT_COMPLETE_ROWS:
            "INSUFFICIENT_COMPLETE_ROWS",

        UNSUPPORTED_MODEL_FAMILY:
            "UNSUPPORTED_MODEL_FAMILY",

        UNSUPPORTED_EVALUATION_SPLIT:
            "UNSUPPORTED_EVALUATION_SPLIT",

        NO_FEATURE_COLUMNS:
            "NO_FEATURE_COLUMNS",

        ZERO_VARIANCE_FEATURE:
            "ZERO_VARIANCE_FEATURE",
    });


export const FORECAST_BASELINE_BOUNDARIES =
    Object.freeze({
        chronologicalSplitOnly:
            true,

        randomShuffleAllowed:
            false,

        futureDataAllowedInTraining:
            false,

        validationDataAllowedInTraining:
            false,

        testDataAllowedInTraining:
            false,

        targetLeakageAllowed:
            false,

        incompleteRowsDropped:
            true,

        incompleteRowsImputed:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        normalizationApplied:
            false,

        standardizationApplied:
            false,

        scalingApplied:
            false,

        unitInferenceAllowed:
            false,

        topologyMergeAllowed:
            false,

        hyperparameterSearchIncluded:
            false,

        automaticModelSelectionIncluded:
            false,

        treeEnsembleTrainingIncluded:
            false,

        gradientBoostingTrainingIncluded:
            false,

        stateClassificationTrainingIncluded:
            false,

        probabilityTrainingIncluded:
            false,

        walkForwardExecutionIncluded:
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


function assertModelContract(
    modelContract
) {
    if (
        !modelContract ||
        typeof modelContract !==
            "object" ||
        modelContract.phase !==
            "9.5"
    ) {
        throw new Error(
            "Baseline training requires a validated Phase 9.5 model contract."
        );
    }

    if (
        modelContract.task !==
            FORECAST_MODEL_TASK.REGRESSION
    ) {
        return {
            ok:
                false,

            reason:
                FORECAST_BASELINE_REASON.UNSUPPORTED_MODEL_FAMILY,
        };
    }

    if (
        ![
            FORECAST_MODEL_FAMILY.NAIVE,
            FORECAST_MODEL_FAMILY.LINEAR_REGRESSION,
        ].includes(
            modelContract.family
        )
    ) {
        return {
            ok:
                false,

            reason:
                FORECAST_BASELINE_REASON.UNSUPPORTED_MODEL_FAMILY,
        };
    }

    if (
        modelContract.evaluation?.split !==
            FORECAST_EVALUATION_SPLIT.HOLDOUT
    ) {
        return {
            ok:
                false,

            reason:
                FORECAST_BASELINE_REASON.UNSUPPORTED_EVALUATION_SPLIT,
        };
    }

    return {
        ok:
            true,
    };
}


function completeRows(
    materialization
) {
    if (
        !materialization ||
        typeof materialization !==
            "object" ||
        materialization.phase !==
            "9.4" ||
        !Array.isArray(
            materialization.matrix
        )
    ) {
        throw new Error(
            "Baseline training requires validated Phase 9.4 feature materialization."
        );
    }

    return materialization.matrix.filter(
        (
            row
        ) => {
            if (
                !finiteNumber(
                    row?.target?.value
                )
            ) {
                return false;
            }

            const cells =
                Object.values(
                    row?.features ??
                    {}
                );

            if (
                !cells.length
            ) {
                return false;
            }

            return cells.every(
                (
                    cell
                ) =>
                    cell?.status ===
                        "MATERIALIZED" &&
                    finiteNumber(
                        cell.value
                    )
            );
        }
    );
}


function chronologicalSplit({
    rows,
    validationFraction,
    testFraction,
    minimumTrainingRows,
} = {}) {
    const n =
        rows.length;

    const validationCount =
        validationFraction
            ? Math.floor(
                n *
                validationFraction
            )
            : 0;

    const testCount =
        testFraction
            ? Math.floor(
                n *
                testFraction
            )
            : 0;

    const trainingCount =
        n -
        validationCount -
        testCount;

    const minimum =
        minimumTrainingRows ??
        1;

    if (
        trainingCount <
            minimum ||
        trainingCount <=
            0
    ) {
        return null;
    }

    const train =
        rows.slice(
            0,
            trainingCount
        );

    const validation =
        rows.slice(
            trainingCount,
            trainingCount +
                validationCount
        );

    const test =
        rows.slice(
            trainingCount +
                validationCount
        );

    return {
        train,
        validation,
        test,
    };
}


function metricBundle(
    predictions
) {
    if (
        !predictions.length
    ) {
        return {
            calculated:
                false,

            count:
                0,

            mae:
                null,

            rmse:
                null,

            reason:
                "NO_PREDICTIONS",
        };
    }

    let absoluteErrorSum =
        0;

    let squaredErrorSum =
        0;

    for (
        const prediction of predictions
    ) {
        const error =
            prediction.actual -
            prediction.predicted;

        absoluteErrorSum +=
            Math.abs(
                error
            );

        squaredErrorSum +=
            error *
            error;
    }

    return {
        calculated:
            true,

        count:
            predictions.length,

        mae:
            absoluteErrorSum /
            predictions.length,

        rmse:
            Math.sqrt(
                squaredErrorSum /
                predictions.length
            ),

        reason:
            "REGRESSION_METRICS_CALCULATED",
    };
}


function predictNaive({
    train,
    rows,
} = {}) {
    if (
        !train.length
    ) {
        return [];
    }

    let previous =
        train[
            train.length -
                1
        ].target.value;

    return rows.map(
        (
            row
        ) => {
            const result =
                {
                    timestamp:
                        row.timestamp,

                    actual:
                        row.target.value,

                    predicted:
                        previous,

                    unit:
                        row.target.unit,
                };

            previous =
                row.target.value;

            return result;
        }
    );
}


function invertMatrix(
    matrix
) {
    const n =
        matrix.length;

    const augmented =
        matrix.map(
            (
                row,
                i
            ) => [
                ...row.map(
                    Number
                ),
                ...Array.from(
                    {
                        length:
                            n,
                    },
                    (
                        _,
                        j
                    ) =>
                        i ===
                            j
                            ? 1
                            : 0
                ),
            ]
        );

    for (
        let column = 0;
        column <
        n;
        column +=
            1
    ) {
        let pivotRow =
            column;

        for (
            let row = column +
                1;
            row <
            n;
            row +=
                1
        ) {
            if (
                Math.abs(
                    augmented[
                        row
                    ][
                        column
                    ]
                ) >
                Math.abs(
                    augmented[
                        pivotRow
                    ][
                        column
                    ]
                )
            ) {
                pivotRow =
                    row;
            }
        }

        if (
            Math.abs(
                augmented[
                    pivotRow
                ][
                    column
                ]
            ) <
            1e-12
        ) {
            return null;
        }

        [
            augmented[
                column
            ],
            augmented[
                pivotRow
            ],
        ] = [
            augmented[
                pivotRow
            ],
            augmented[
                column
            ],
        ];

        const pivot =
            augmented[
                column
            ][
                column
            ];

        augmented[
            column
        ] =
            augmented[
                column
            ].map(
                (
                    value
                ) =>
                    value /
                    pivot
            );

        for (
            let row = 0;
            row <
            n;
            row +=
                1
        ) {
            if (
                row ===
                    column
            ) {
                continue;
            }

            const factor =
                augmented[
                    row
                ][
                    column
                ];

            augmented[
                row
            ] =
                augmented[
                    row
                ].map(
                    (
                        value,
                        index
                    ) =>
                        value -
                        factor *
                        augmented[
                            column
                        ][
                            index
                        ]
                );
        }
    }

    return augmented.map(
        (
            row
        ) =>
            row.slice(
                n
            )
    );
}


function trainLinearRegression(
    rows
) {
    const featureNames =
        Object.keys(
            rows[
                0
            ].features
        );

    if (
        !featureNames.length
    ) {
        return null;
    }

    const X =
        rows.map(
            (
                row
            ) => [
                1,
                ...featureNames.map(
                    (
                        name
                    ) =>
                        row.features[
                            name
                        ].value
                ),
            ]
        );

    const y =
        rows.map(
            (
                row
            ) =>
                row.target.value
        );

    const columns =
        X[
            0
        ].length;

    const xtx =
        Array.from(
            {
                length:
                    columns,
            },
            () =>
                Array(
                    columns
                ).fill(
                    0
                )
        );

    const xty =
        Array(
            columns
        ).fill(
            0
        );

    for (
        let i = 0;
        i <
        X.length;
        i +=
            1
    ) {
        for (
            let a = 0;
            a <
            columns;
            a +=
                1
        ) {
            xty[
                a
            ] +=
                X[
                    i
                ][
                    a
                ] *
                y[
                    i
                ];

            for (
                let b = 0;
                b <
                columns;
                b +=
                    1
            ) {
                xtx[
                    a
                ][
                    b
                ] +=
                    X[
                        i
                    ][
                        a
                    ] *
                    X[
                        i
                    ][
                        b
                    ];
            }
        }
    }

    const inverse =
        invertMatrix(
            xtx
        );

    if (
        !inverse
    ) {
        return null;
    }

    const coefficients =
        inverse.map(
            (
                row
            ) =>
                row.reduce(
                    (
                        sum,
                        value,
                        index
                    ) =>
                        sum +
                        value *
                        xty[
                            index
                        ],
                    0
                )
        );

    return {
        featureNames,
        intercept:
            coefficients[
                0
            ],
        coefficients:
            featureNames.map(
                (
                    name,
                    index
                ) => ({
                    feature:
                        name,
                    coefficient:
                        coefficients[
                            index +
                                1
                        ],
                })
            ),
    };
}


function predictLinear(
    artifact,
    rows
) {
    return rows.map(
        (
            row
        ) => {
            let predicted =
                artifact.intercept;

            for (
                const item of artifact.coefficients
            ) {
                predicted +=
                    item.coefficient *
                    row.features[
                        item.feature
                    ].value;
            }

            return {
                timestamp:
                    row.timestamp,

                actual:
                    row.target.value,

                predicted,

                unit:
                    row.target.unit,
            };
        }
    );
}


function unavailableResult({
    modelContract,
    reason,
    completeRowCount = 0,
} = {}) {
    return {
        phase:
            FORECAST_BASELINE_TRAINING_PHASE,

        layer:
            FORECAST_BASELINE_TRAINING_LAYER,

        upstreamPhase:
            FORECAST_BASELINE_TRAINING_UPSTREAM_PHASE,

        modelContract,

        status:
            FORECAST_BASELINE_TRAINING_STATUS.UNAVAILABLE,

        reason,

        completeRowCount,

        partitions:
            null,

        artifact:
            null,

        predictions:
            null,

        metrics:
            null,

        boundaries:
            FORECAST_BASELINE_BOUNDARIES,
    };
}


export function trainForecastBaseline({
    modelContract,
} = {}) {
    const contractValidation =
        assertModelContract(
            modelContract
        );

    if (
        !contractValidation.ok
    ) {
        return unavailableResult({
            modelContract,
            reason:
                contractValidation.reason,
        });
    }

    const materialization =
        modelContract.featureMaterialization;

    const rows =
        completeRows(
            materialization
        );

    if (
        !rows.length
    ) {
        return unavailableResult({
            modelContract,
            reason:
                FORECAST_BASELINE_REASON.INSUFFICIENT_COMPLETE_ROWS,
            completeRowCount:
                0,
        });
    }

    const split =
        chronologicalSplit({
            rows,
            validationFraction:
                modelContract.evaluation.validationFraction,
            testFraction:
                modelContract.evaluation.testFraction,
            minimumTrainingRows:
                modelContract.evaluation.minimumTrainingRows,
        });

    if (
        !split
    ) {
        return unavailableResult({
            modelContract,
            reason:
                FORECAST_BASELINE_REASON.INSUFFICIENT_COMPLETE_ROWS,
            completeRowCount:
                rows.length,
        });
    }

    let artifact =
        null;

    let validationPredictions =
        [];

    let testPredictions =
        [];

    if (
        modelContract.family ===
            FORECAST_MODEL_FAMILY.NAIVE
    ) {
        artifact =
            {
                family:
                    FORECAST_MODEL_FAMILY.NAIVE,

                strategy:
                    "LAST_OBSERVED_VALUE",

                trained:
                    true,
            };

        validationPredictions =
            predictNaive({
                train:
                    split.train,
                rows:
                    split.validation,
            });

        const historyForTest =
            [
                ...split.train,
                ...split.validation,
            ];

        testPredictions =
            predictNaive({
                train:
                    historyForTest,
                rows:
                    split.test,
            });
    }
    else if (
        modelContract.family ===
            FORECAST_MODEL_FAMILY.LINEAR_REGRESSION
    ) {
        artifact =
            trainLinearRegression(
                split.train
            );

        if (
            !artifact
        ) {
            return unavailableResult({
                modelContract,
                reason:
                    FORECAST_BASELINE_REASON.ZERO_VARIANCE_FEATURE,
                completeRowCount:
                    rows.length,
            });
        }

        artifact =
            {
                family:
                    FORECAST_MODEL_FAMILY.LINEAR_REGRESSION,

                trained:
                    true,

                ...artifact,
            };

        validationPredictions =
            predictLinear(
                artifact,
                split.validation
            );

        testPredictions =
            predictLinear(
                artifact,
                split.test
            );
    }

    return {
        phase:
            FORECAST_BASELINE_TRAINING_PHASE,

        layer:
            FORECAST_BASELINE_TRAINING_LAYER,

        upstreamPhase:
            FORECAST_BASELINE_TRAINING_UPSTREAM_PHASE,

        modelContract,

        status:
            FORECAST_BASELINE_TRAINING_STATUS.TRAINED,

        reason:
            FORECAST_BASELINE_REASON.TRAINED,

        completeRowCount:
            rows.length,

        partitions:
            {
                trainingCount:
                    split.train.length,

                validationCount:
                    split.validation.length,

                testCount:
                    split.test.length,

                trainingStart:
                    split.train.length
                        ? split.train[
                            0
                        ].timestamp
                        : null,

                trainingEnd:
                    split.train.length
                        ? split.train[
                            split.train.length -
                                1
                        ].timestamp
                        : null,

                validationStart:
                    split.validation.length
                        ? split.validation[
                            0
                        ].timestamp
                        : null,

                validationEnd:
                    split.validation.length
                        ? split.validation[
                            split.validation.length -
                                1
                        ].timestamp
                        : null,

                testStart:
                    split.test.length
                        ? split.test[
                            0
                        ].timestamp
                        : null,

                testEnd:
                    split.test.length
                        ? split.test[
                            split.test.length -
                                1
                        ].timestamp
                        : null,
            },

        artifact,

        predictions:
            {
                validation:
                    validationPredictions,

                test:
                    testPredictions,
            },

        metrics:
            {
                validation:
                    metricBundle(
                        validationPredictions
                    ),

                test:
                    metricBundle(
                        testPredictions
                    ),
            },

        boundaries:
            FORECAST_BASELINE_BOUNDARIES,
    };
}


export default Object.freeze({
    FORECAST_BASELINE_TRAINING_PHASE,
    FORECAST_BASELINE_TRAINING_LAYER,
    FORECAST_BASELINE_TRAINING_UPSTREAM_PHASE,
    FORECAST_BASELINE_TRAINING_STATUS,
    FORECAST_BASELINE_REASON,
    FORECAST_BASELINE_BOUNDARIES,
    trainForecastBaseline,
});
