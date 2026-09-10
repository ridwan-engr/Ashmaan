// services/forecasting/forecastFeatureContract.js

import {
    FORECASTING_REPORTING_SEMANTICS,
} from "./forecastingContract.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.3 — Forecast Feature Contract
|--------------------------------------------------------------------------
|
| Defines feature semantics only.
|
| This module does NOT:
| - generate feature values
| - shift or lag arrays
| - resample observations
| - interpolate missing values
| - normalize/standardize values
| - select features
| - train models
| - calculate forecasts
| - calculate model metrics
| - persist feature matrices
| - expose API/dashboard
|
|--------------------------------------------------------------------------
*/

export const FORECAST_FEATURE_CONTRACT_PHASE =
    "9.3";

export const FORECAST_FEATURE_CONTRACT_LAYER =
    "FORECASTING";

export const FORECAST_FEATURE_CONTRACT_UPSTREAM_PHASE =
    "9.2";

export const FORECAST_FEATURE_TIME_SEMANTICS =
    FORECASTING_REPORTING_SEMANTICS;


export const FORECAST_FEATURE_ROLE =
    Object.freeze({
        TARGET_HISTORY:
            "TARGET_HISTORY",

        EXOGENOUS_OBSERVED:
            "EXOGENOUS_OBSERVED",

        CALENDAR:
            "CALENDAR",

        ENGINEERING_CONTEXT:
            "ENGINEERING_CONTEXT",

        EVENT_CONTEXT:
            "EVENT_CONTEXT",
    });


export const FORECAST_FEATURE_VALUE_KIND =
    Object.freeze({
        NUMERIC:
            "NUMERIC",

        STATE:
            "STATE",

        BOOLEAN:
            "BOOLEAN",

        CATEGORICAL:
            "CATEGORICAL",
    });


export const FORECAST_FEATURE_AVAILABILITY =
    Object.freeze({
        OBSERVED_AT_OR_BEFORE_ORIGIN:
            "OBSERVED_AT_OR_BEFORE_ORIGIN",

        DETERMINISTIC_FUTURE_KNOWN:
            "DETERMINISTIC_FUTURE_KNOWN",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const FORECAST_FEATURE_TRANSFORM =
    Object.freeze({
        IDENTITY:
            "IDENTITY",

        LAG:
            "LAG",

        ROLLING_WINDOW:
            "ROLLING_WINDOW",

        CALENDAR_DERIVATION:
            "CALENDAR_DERIVATION",
    });


export const FORECAST_FEATURE_BOUNDARIES =
    Object.freeze({
        featureValuesGenerated:
            false,

        lagValuesGenerated:
            false,

        rollingValuesGenerated:
            false,

        calendarValuesGenerated:
            false,

        normalizationApplied:
            false,

        standardizationApplied:
            false,

        scalingApplied:
            false,

        resamplingApplied:
            false,

        interpolationApplied:
            false,

        missingValueImputationApplied:
            false,

        outlierRemovalApplied:
            false,

        unitInferenceAllowed:
            false,

        topologyMergeAllowed:
            false,

        futureObservedDataAllowed:
            false,

        targetLeakageAllowed:
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


export function buildForecastFeatureDefinition({
    name,
    role,
    valueKind,
    availability,
    source,
    unit = null,
    transform = FORECAST_FEATURE_TRANSFORM.IDENTITY,
    lagSteps = null,
    rollingWindowSteps = null,
    stateDomain = null,
    description = null,
} = {}) {
    const normalizedName =
        normalizeString(
            name,
            "Forecast feature name",
            true
        );

    const normalizedRole =
        assertEnum(
            role,
            FORECAST_FEATURE_ROLE,
            "forecast feature role"
        );

    const normalizedValueKind =
        assertEnum(
            valueKind,
            FORECAST_FEATURE_VALUE_KIND,
            "forecast feature value kind"
        );

    const normalizedAvailability =
        assertEnum(
            availability,
            FORECAST_FEATURE_AVAILABILITY,
            "forecast feature availability"
        );

    const normalizedTransform =
        assertEnum(
            transform,
            FORECAST_FEATURE_TRANSFORM,
            "forecast feature transform"
        );

    if (
        !source ||
        typeof source !==
            "object"
    ) {
        throw new Error(
            "Forecast feature source must be an object."
        );
    }

    const normalizedUnit =
        normalizeString(
            unit,
            "Forecast feature unit"
        );

    if (
        normalizedValueKind ===
            FORECAST_FEATURE_VALUE_KIND.NUMERIC &&
        !normalizedUnit
    ) {
        throw new Error(
            "Numeric forecast feature requires an explicit unit."
        );
    }

    if (
        normalizedValueKind !==
            FORECAST_FEATURE_VALUE_KIND.NUMERIC &&
        normalizedUnit
    ) {
        throw new Error(
            "Non-numeric forecast feature cannot declare a numeric engineering unit."
        );
    }

    let normalizedStateDomain =
        null;

    if (
        stateDomain !==
            null &&
        stateDomain !==
            undefined
    ) {
        if (
            !Array.isArray(
                stateDomain
            ) ||
            !stateDomain.length
        ) {
            throw new Error(
                "stateDomain must be a non-empty array when supplied."
            );
        }

        normalizedStateDomain =
            Object.freeze(
                stateDomain.map(
                    (
                        value
                    ) =>
                        normalizeString(
                            value,
                            "Forecast feature stateDomain value",
                            true
                        )
                )
            );
    }

    if (
        normalizedValueKind ===
            FORECAST_FEATURE_VALUE_KIND.STATE &&
        !normalizedStateDomain
    ) {
        throw new Error(
            "STATE forecast feature requires an explicit stateDomain."
        );
    }

    if (
        normalizedValueKind !==
            FORECAST_FEATURE_VALUE_KIND.STATE &&
        normalizedStateDomain
    ) {
        throw new Error(
            "stateDomain is reserved for STATE forecast features."
        );
    }

    const normalizedLagSteps =
        positiveIntegerOrNull(
            lagSteps,
            "lagSteps"
        );

    const normalizedRollingWindowSteps =
        positiveIntegerOrNull(
            rollingWindowSteps,
            "rollingWindowSteps"
        );

    if (
        normalizedTransform ===
            FORECAST_FEATURE_TRANSFORM.LAG &&
        !normalizedLagSteps
    ) {
        throw new Error(
            "LAG feature requires lagSteps."
        );
    }

    if (
        normalizedTransform !==
            FORECAST_FEATURE_TRANSFORM.LAG &&
        normalizedLagSteps
    ) {
        throw new Error(
            "lagSteps is reserved for LAG features."
        );
    }

    if (
        normalizedTransform ===
            FORECAST_FEATURE_TRANSFORM.ROLLING_WINDOW &&
        !normalizedRollingWindowSteps
    ) {
        throw new Error(
            "ROLLING_WINDOW feature requires rollingWindowSteps."
        );
    }

    if (
        normalizedTransform !==
            FORECAST_FEATURE_TRANSFORM.ROLLING_WINDOW &&
        normalizedRollingWindowSteps
    ) {
        throw new Error(
            "rollingWindowSteps is reserved for ROLLING_WINDOW features."
        );
    }

    if (
        normalizedAvailability ===
            FORECAST_FEATURE_AVAILABILITY.DETERMINISTIC_FUTURE_KNOWN &&
        normalizedRole !==
            FORECAST_FEATURE_ROLE.CALENDAR
    ) {
        throw new Error(
            "Only deterministic calendar features may be future-known in Phase 9.3."
        );
    }

    return {
        phase:
            FORECAST_FEATURE_CONTRACT_PHASE,

        name:
            normalizedName,

        role:
            normalizedRole,

        valueKind:
            normalizedValueKind,

        availability:
            normalizedAvailability,

        source,

        unit:
            normalizedUnit,

        transform:
            normalizedTransform,

        lagSteps:
            normalizedLagSteps,

        rollingWindowSteps:
            normalizedRollingWindowSteps,

        stateDomain:
            normalizedStateDomain,

        description:
            normalizeString(
                description,
                "Forecast feature description"
            ),

        boundaries:
            {
                sourcePreservedByReference:
                    true,

                featureValuesGenerated:
                    false,

                futureObservedDataAllowed:
                    false,

                targetLeakageAllowed:
                    false,

                unitInferred:
                    false,

                topologyMerged:
                    false,
            },
    };
}


export function buildForecastFeatureSet({
    target,
    inputQualification,
    features = [],
} = {}) {
    if (
        !target ||
        typeof target !==
            "object"
    ) {
        throw new Error(
            "Forecast feature set requires a Phase 9.1 target."
        );
    }

    if (
        !inputQualification ||
        typeof inputQualification !==
            "object"
    ) {
        throw new Error(
            "Forecast feature set requires Phase 9.2 input qualification."
        );
    }

    if (
        inputQualification.phase !==
            "9.2"
    ) {
        throw new Error(
            "Forecast feature set requires validated Phase 9.2 input qualification."
        );
    }

    if (
        !Array.isArray(
            features
        )
    ) {
        throw new Error(
            "Forecast feature definitions must be an array."
        );
    }

    const names =
        new Set();

    for (
        const feature of features
    ) {
        if (
            !feature ||
            typeof feature !==
                "object" ||
            feature.phase !==
                FORECAST_FEATURE_CONTRACT_PHASE
        ) {
            throw new Error(
                "Every forecast feature must be a valid Phase 9.3 feature definition."
            );
        }

        if (
            names.has(
                feature.name
            )
        ) {
            throw new Error(
                `Duplicate forecast feature name: ${feature.name}`
            );
        }

        names.add(
            feature.name
        );
    }

    return {
        phase:
            FORECAST_FEATURE_CONTRACT_PHASE,

        layer:
            FORECAST_FEATURE_CONTRACT_LAYER,

        upstreamPhase:
            FORECAST_FEATURE_CONTRACT_UPSTREAM_PHASE,

        semantics:
            FORECAST_FEATURE_TIME_SEMANTICS,

        target,

        inputQualification,

        features,

        featureCount:
            features.length,

        generatedFeatureMatrix:
            null,

        status:
            "CONTRACT_DEFINED",

        reason:
            "PHASE_9_3_FEATURE_CONTRACT_ONLY",

        boundaries:
            FORECAST_FEATURE_BOUNDARIES,
    };
}


export default Object.freeze({
    FORECAST_FEATURE_CONTRACT_PHASE,
    FORECAST_FEATURE_CONTRACT_LAYER,
    FORECAST_FEATURE_CONTRACT_UPSTREAM_PHASE,
    FORECAST_FEATURE_TIME_SEMANTICS,
    FORECAST_FEATURE_ROLE,
    FORECAST_FEATURE_VALUE_KIND,
    FORECAST_FEATURE_AVAILABILITY,
    FORECAST_FEATURE_TRANSFORM,
    FORECAST_FEATURE_BOUNDARIES,
    buildForecastFeatureDefinition,
    buildForecastFeatureSet,
});
