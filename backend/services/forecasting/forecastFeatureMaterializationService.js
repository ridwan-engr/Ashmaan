// services/forecasting/forecastFeatureMaterializationService.js

import {
    FORECAST_FEATURE_CONTRACT_PHASE,
    FORECAST_FEATURE_ROLE,
    FORECAST_FEATURE_VALUE_KIND,
    FORECAST_FEATURE_AVAILABILITY,
    FORECAST_FEATURE_TRANSFORM,
} from "./forecastFeatureContract.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.4 — Feature Materialization
|--------------------------------------------------------------------------
|
| Materializes feature values from already-qualified Phase 9.2 observations
| and already-defined Phase 9.3 feature contracts.
|
| This service does NOT:
| - train a forecasting model
| - select features
| - normalize/standardize/scale
| - interpolate or impute missing values
| - resample source observations
| - remove outliers
| - infer units
| - merge device topologies
| - persist feature matrices
| - calculate forecasts
| - expose API/dashboard
|
|--------------------------------------------------------------------------
*/

export const FORECAST_FEATURE_MATERIALIZATION_PHASE =
    "9.4";

export const FORECAST_FEATURE_MATERIALIZATION_LAYER =
    "FORECASTING";

export const FORECAST_FEATURE_MATERIALIZATION_UPSTREAM_PHASE =
    FORECAST_FEATURE_CONTRACT_PHASE;


export const FORECAST_FEATURE_CELL_STATUS =
    Object.freeze({
        MATERIALIZED:
            "MATERIALIZED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const FORECAST_FEATURE_CELL_REASON =
    Object.freeze({
        IDENTITY_VALUE:
            "IDENTITY_VALUE",

        LAG_VALUE:
            "LAG_VALUE",

        ROLLING_WINDOW_VALUE:
            "ROLLING_WINDOW_VALUE",

        CALENDAR_VALUE:
            "CALENDAR_VALUE",

        SOURCE_VALUE_UNAVAILABLE:
            "SOURCE_VALUE_UNAVAILABLE",

        INSUFFICIENT_HISTORY:
            "INSUFFICIENT_HISTORY",

        UNSUPPORTED_SOURCE:
            "UNSUPPORTED_SOURCE",
    });


export const FORECAST_FEATURE_MATERIALIZATION_BOUNDARIES =
    Object.freeze({
        sourceObservationsMutated:
            false,

        featureDefinitionsMutated:
            false,

        interpolationApplied:
            false,

        imputationApplied:
            false,

        resamplingApplied:
            false,

        outlierRemovalApplied:
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

        futureObservedDataAllowed:
            false,

        targetLeakageAllowed:
            false,

        unavailableMeansZero:
            false,

        missingMeansZero:
            false,

        featureSelectionIncluded:
            false,

        modelTrainingIncluded:
            false,

        forecastCalculationIncluded:
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


function validRows(
    inputQualification
) {
    if (
        !inputQualification ||
        typeof inputQualification !==
            "object" ||
        inputQualification.phase !==
            "9.2"
    ) {
        throw new Error(
            "Feature materialization requires validated Phase 9.2 input qualification."
        );
    }

    if (
        !Array.isArray(
            inputQualification.validRecords
        )
    ) {
        throw new Error(
            "Phase 9.2 qualification must expose validRecords."
        );
    }

    return [
        ...inputQualification.validRecords,
    ].sort(
        (
            a,
            b
        ) =>
            a.timestamp -
            b.timestamp
    );
}


function assertFeatureSet(
    featureSet
) {
    if (
        !featureSet ||
        typeof featureSet !==
            "object" ||
        featureSet.phase !==
            FORECAST_FEATURE_CONTRACT_PHASE
    ) {
        throw new Error(
            "Feature materialization requires a validated Phase 9.3 feature set."
        );
    }

    if (
        !Array.isArray(
            featureSet.features
        )
    ) {
        throw new Error(
            "Phase 9.3 feature set must expose features."
        );
    }

    return featureSet;
}


function materializedCell(
    value,
    reason
) {
    return {
        status:
            FORECAST_FEATURE_CELL_STATUS.MATERIALIZED,

        reason,

        value,
    };
}


function unavailableCell(
    reason
) {
    return {
        status:
            FORECAST_FEATURE_CELL_STATUS.UNAVAILABLE,

        reason,

        value:
            null,
    };
}


function materializeIdentity({
    row,
    feature,
} = {}) {
    if (
        feature.role ===
            FORECAST_FEATURE_ROLE.TARGET_HISTORY ||
        feature.role ===
            FORECAST_FEATURE_ROLE.EXOGENOUS_OBSERVED
    ) {
        return materializedCell(
            row.value,
            FORECAST_FEATURE_CELL_REASON.IDENTITY_VALUE
        );
    }

    return unavailableCell(
        FORECAST_FEATURE_CELL_REASON.UNSUPPORTED_SOURCE
    );
}


function materializeLag({
    rows,
    index,
    feature,
} = {}) {
    const sourceIndex =
        index -
        feature.lagSteps;

    if (
        sourceIndex <
            0
    ) {
        return unavailableCell(
            FORECAST_FEATURE_CELL_REASON.INSUFFICIENT_HISTORY
        );
    }

    return materializedCell(
        rows[
            sourceIndex
        ].value,
        FORECAST_FEATURE_CELL_REASON.LAG_VALUE
    );
}


function materializeRolling({
    rows,
    index,
    feature,
} = {}) {
    const size =
        feature.rollingWindowSteps;

    const start =
        index -
        size;

    if (
        start <
            0
    ) {
        return unavailableCell(
            FORECAST_FEATURE_CELL_REASON.INSUFFICIENT_HISTORY
        );
    }

    const history =
        rows.slice(
            start,
            index
        );

    if (
        history.length !==
            size
    ) {
        return unavailableCell(
            FORECAST_FEATURE_CELL_REASON.INSUFFICIENT_HISTORY
        );
    }

    const mean =
        history.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.value,
            0
        ) /
        history.length;

    return materializedCell(
        mean,
        FORECAST_FEATURE_CELL_REASON.ROLLING_WINDOW_VALUE
    );
}


function calendarValue({
    timestamp,
    feature,
} = {}) {
    const field =
        feature?.source?.field;

    if (
        field ===
            "hourOfDay"
    ) {
        return timestamp.getUTCHours();
    }

    if (
        field ===
            "dayOfWeek"
    ) {
        return timestamp.getUTCDay();
    }

    if (
        field ===
            "dayOfMonth"
    ) {
        return timestamp.getUTCDate();
    }

    if (
        field ===
            "monthOfYear"
    ) {
        return timestamp.getUTCMonth() +
            1;
    }

    return null;
}


function materializeCalendar({
    row,
    feature,
} = {}) {
    const value =
        calendarValue({
            timestamp:
                row.timestamp,
            feature,
        });

    if (
        value ===
            null
    ) {
        return unavailableCell(
            FORECAST_FEATURE_CELL_REASON.UNSUPPORTED_SOURCE
        );
    }

    return materializedCell(
        value,
        FORECAST_FEATURE_CELL_REASON.CALENDAR_VALUE
    );
}


function materializeFeatureCell({
    rows,
    index,
    feature,
} = {}) {
    if (
        feature.availability ===
            FORECAST_FEATURE_AVAILABILITY.UNAVAILABLE
    ) {
        return unavailableCell(
            FORECAST_FEATURE_CELL_REASON.SOURCE_VALUE_UNAVAILABLE
        );
    }

    switch (
        feature.transform
    ) {
        case FORECAST_FEATURE_TRANSFORM.IDENTITY:
            return materializeIdentity({
                row:
                    rows[
                        index
                    ],
                feature,
            });

        case FORECAST_FEATURE_TRANSFORM.LAG:
            return materializeLag({
                rows,
                index,
                feature,
            });

        case FORECAST_FEATURE_TRANSFORM.ROLLING_WINDOW:
            return materializeRolling({
                rows,
                index,
                feature,
            });

        case FORECAST_FEATURE_TRANSFORM.CALENDAR_DERIVATION:
            return materializeCalendar({
                row:
                    rows[
                        index
                    ],
                feature,
            });

        default:
            return unavailableCell(
                FORECAST_FEATURE_CELL_REASON.UNSUPPORTED_SOURCE
            );
    }
}


export function materializeForecastFeatures({
    featureSet,
} = {}) {
    const validatedFeatureSet =
        assertFeatureSet(
            featureSet
        );

    const rows =
        validRows(
            validatedFeatureSet.inputQualification
        );

    const matrix =
        rows.map(
            (
                row,
                index
            ) => {
                const features =
                    Object.fromEntries(
                        validatedFeatureSet.features.map(
                            (
                                feature
                            ) =>
                                [
                                    feature.name,
                                    materializeFeatureCell({
                                        rows,
                                        index,
                                        feature,
                                    }),
                                ]
                        )
                    );

                return {
                    timestamp:
                        row.timestamp,

                    target:
                        {
                            value:
                                row.value,

                            unit:
                                row.unit,
                        },

                    features,
                };
            }
        );

    return {
        phase:
            FORECAST_FEATURE_MATERIALIZATION_PHASE,

        layer:
            FORECAST_FEATURE_MATERIALIZATION_LAYER,

        upstreamPhase:
            FORECAST_FEATURE_MATERIALIZATION_UPSTREAM_PHASE,

        featureSet:
            validatedFeatureSet,

        sourceQualification:
            validatedFeatureSet.inputQualification,

        rowCount:
            matrix.length,

        featureCount:
            validatedFeatureSet.featureCount,

        matrix,

        status:
            "MATERIALIZED",

        reason:
            "PHASE_9_4_FEATURE_MATERIALIZATION_COMPLETE",

        boundaries:
            FORECAST_FEATURE_MATERIALIZATION_BOUNDARIES,
    };
}


export default Object.freeze({
    FORECAST_FEATURE_MATERIALIZATION_PHASE,
    FORECAST_FEATURE_MATERIALIZATION_LAYER,
    FORECAST_FEATURE_MATERIALIZATION_UPSTREAM_PHASE,
    FORECAST_FEATURE_CELL_STATUS,
    FORECAST_FEATURE_CELL_REASON,
    FORECAST_FEATURE_MATERIALIZATION_BOUNDARIES,
    materializeForecastFeatures,
});
