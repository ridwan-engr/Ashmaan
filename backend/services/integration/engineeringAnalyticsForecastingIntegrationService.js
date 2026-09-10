// services/integration/engineeringAnalyticsForecastingIntegrationService.js

import {
    FORECASTING_LAYER,
    FORECASTING_REPORTING_SEMANTICS,
    buildForecastTimeContract,
    buildForecastTarget,
} from "../forecasting/forecastingContract.js";

import {
    FORECAST_INPUT_QUALIFICATION_PHASE,
    FORECAST_INPUT_QUALIFICATION_LAYER,
    qualifyForecastInput,
} from "../forecasting/forecastInputQualificationService.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 12.5 — Engineering Analytics → Forecasting Integration
|--------------------------------------------------------------------------
|
| Purpose:
| Establish the production orchestration boundary between:
|
|   Phase 8 Engineering Analytics observation evidence
|        ↓
|   Phase 9.1 forecasting contract primitives
|        ↓
|   Phase 9.2 forecast input qualification
|
| This service does NOT:
| - calculate Engineering Analytics metrics
| - convert aggregate metrics into observations
| - invent observation timestamps
| - infer engineering units
| - resample observations
| - interpolate observations
| - merge duplicate timestamps
| - remove outliers
| - train forecasting models
| - calculate forecasts
| - persist forecasts
| - expose an API
| - mutate Engineering Analytics evidence
|
|--------------------------------------------------------------------------
*/


export const ENGINEERING_FORECASTING_INTEGRATION_PHASE =
    "12.5";

export const ENGINEERING_FORECASTING_INTEGRATION_LAYER =
    "ENGINEERING_ANALYTICS_FORECASTING_INTEGRATION";

export const ENGINEERING_FORECASTING_INTEGRATION_UPSTREAM_LAYER =
    "ENGINEERING_ANALYTICS";

export const ENGINEERING_FORECASTING_INTEGRATION_TARGET_PHASE =
    FORECAST_INPUT_QUALIFICATION_PHASE;

export const ENGINEERING_FORECASTING_INTEGRATION_TARGET_LAYER =
    FORECAST_INPUT_QUALIFICATION_LAYER;

export const ENGINEERING_FORECASTING_INTEGRATION_INTERVAL =
    FORECASTING_REPORTING_SEMANTICS;


export const ENGINEERING_FORECASTING_INTEGRATION_STATUS =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        EXECUTED:
            "EXECUTED",

        ERROR:
            "ERROR",
    });


export const ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES =
    Object.freeze({
        usesExistingForecastingContract:
            true,

        usesExistingForecastInputQualification:
            true,

        createsParallelForecastQualification:
            false,

        createsParallelEngineeringAnalytics:
            false,

        engineeringMetricCalculated:
            false,

        aggregateMetricConvertedToObservation:
            false,

        observationTimestampInferred:
            false,

        observationUnitInferred:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        invalidObservationMeansZero:
            false,

        resamplingAllowed:
            false,

        interpolationAllowed:
            false,

        duplicateTimestampsAutomaticallyMerged:
            false,

        outlierRemovalAllowed:
            false,

        topologyMergeAllowed:
            false,

        futureDataAllowedInTraining:
            false,

        trainingForecastOverlapAllowed:
            false,

        engineeringAnalyticsMutated:
            false,

        sourceObservationsMutated:
            false,

        modelTrainingIncluded:
            false,

        forecastCalculationIncluded:
            false,

        forecastPersistenceIncluded:
            false,

        forecastingApiIncluded:
            false,

        financialBiIncluded:
            false,

        optimizationDssIncluded:
            false,

        preserveSiteIdentity:
            true,

        preserveInstallationIdentity:
            true,

        preserveSourceEvidence:
            true,

        preserveObservationsByReference:
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
        value !==
            null &&
        typeof value ===
            "object" &&
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
        value ===
            null ||
        value ===
            undefined
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
        value ===
            null ||
        value ===
            undefined
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


function asRequiredDate(
    value,
    label
) {
    if (
        value ===
            null ||
        value ===
            undefined ||
        value ===
            ""
    ) {
        throw new Error(
            `${label} is required.`
        );
    }

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
            `Invalid ${label}: ${value}`
        );
    }

    return date;
}


/*
|--------------------------------------------------------------------------
| Engineering observation evidence validation
|--------------------------------------------------------------------------
|
| 12.5 deliberately accepts observation evidence rather than an aggregate
| Engineering Analytics metric.
|
| An observation must already have an explicit timestamp/value/unit before
| it reaches this bridge.
|
|--------------------------------------------------------------------------
*/

export function validateEngineeringForecastEvidence(
    engineeringEvidence
) {
    if (
        !isObject(
            engineeringEvidence
        )
    ) {
        throw new Error(
            "Phase 12.5 requires Engineering Analytics observation evidence."
        );
    }

    if (
        engineeringEvidence.layer !==
            ENGINEERING_FORECASTING_INTEGRATION_UPSTREAM_LAYER
    ) {
        throw new Error(
            "Phase 12.5 requires ENGINEERING_ANALYTICS upstream evidence."
        );
    }

    if (
        engineeringEvidence.scope !==
            "SITE"
    ) {
        throw new Error(
            "Phase 12.5 currently requires SITE-scoped Engineering Analytics evidence."
        );
    }

    const vrmSiteId =
        normalizeRequiredString(
            engineeringEvidence?.scopeIdentity?.vrmSiteId,
            "Engineering Analytics vrmSiteId"
        );

    const installationId =
        normalizeOptionalString(
            engineeringEvidence?.scopeIdentity?.installationId
        );

    if (
        !Array.isArray(
            engineeringEvidence.observations
        )
    ) {
        throw new Error(
            "Engineering Analytics observations must be an array."
        );
    }

    /*
    |--------------------------------------------------------------
    | Critical boundary:
    |
    | 12.5 does not synthesize observations from aggregate metrics.
    | It only passes already-established observations downstream.
    |--------------------------------------------------------------
    */

    return Object.freeze({
        engineeringEvidence,

        vrmSiteId,

        installationId,

        observations:
            engineeringEvidence.observations,
    });
}


/*
|--------------------------------------------------------------------------
| Forecast request validation
|--------------------------------------------------------------------------
*/

export function validateEngineeringForecastRequest(
    forecastRequest
) {
    if (
        !isObject(
            forecastRequest
        )
    ) {
        throw new Error(
            "Phase 12.5 requires a forecast request."
        );
    }

    const trainingStart =
        asRequiredDate(
            forecastRequest.trainingStart,
            "forecast trainingStart"
        );

    const forecastOrigin =
        asRequiredDate(
            forecastRequest.forecastOrigin,
            "forecast forecastOrigin"
        );

    const forecastEnd =
        asRequiredDate(
            forecastRequest.forecastEnd,
            "forecast forecastEnd"
        );

    if (
        forecastOrigin <=
            trainingStart
    ) {
        throw new Error(
            "Forecast origin must be later than training start."
        );
    }

    if (
        forecastEnd <=
            forecastOrigin
    ) {
        throw new Error(
            "Forecast end must be later than forecast origin."
        );
    }

    if (
        !isObject(
            forecastRequest.target
        )
    ) {
        throw new Error(
            "Phase 12.5 forecast request requires a target descriptor."
        );
    }

    return Object.freeze({
        trainingStart,

        forecastOrigin,

        forecastEnd,

        timezone:
            normalizeOptionalString(
                forecastRequest.timezone
            ),

        target:
            forecastRequest.target,
    });
}


/*
|--------------------------------------------------------------------------
| Qualification
|--------------------------------------------------------------------------
*/

export function qualifyEngineeringAnalyticsForecastingIntegration({
    engineeringEvidence,
    forecastRequest,

    timeContractBuilder =
        buildForecastTimeContract,

    targetBuilder =
        buildForecastTarget,

    inputQualifier =
        qualifyForecastInput,
} = {}) {
    const engineering =
        validateEngineeringForecastEvidence(
            engineeringEvidence
        );

    const request =
        validateEngineeringForecastRequest(
            forecastRequest
        );

    if (
        typeof timeContractBuilder !==
            "function"
    ) {
        throw new Error(
            "Phase 12.5 requires the Phase 9.1 forecast time-contract builder."
        );
    }

    if (
        typeof targetBuilder !==
            "function"
    ) {
        throw new Error(
            "Phase 12.5 requires the Phase 9.1 forecast target builder."
        );
    }

    if (
        typeof inputQualifier !==
            "function"
    ) {
        throw new Error(
            "Phase 12.5 requires the Phase 9.2 forecast input qualifier."
        );
    }

    return Object.freeze({
        phase:
            ENGINEERING_FORECASTING_INTEGRATION_PHASE,

        layer:
            ENGINEERING_FORECASTING_INTEGRATION_LAYER,

        upstreamLayer:
            ENGINEERING_FORECASTING_INTEGRATION_UPSTREAM_LAYER,

        targetPhase:
            ENGINEERING_FORECASTING_INTEGRATION_TARGET_PHASE,

        targetLayer:
            ENGINEERING_FORECASTING_INTEGRATION_TARGET_LAYER,

        interval:
            ENGINEERING_FORECASTING_INTEGRATION_INTERVAL,

        status:
            ENGINEERING_FORECASTING_INTEGRATION_STATUS.QUALIFIED,

        executed:
            false,

        scope:
            "SITE",

        scopeIdentity:
            Object.freeze({
                vrmSiteId:
                    engineering.vrmSiteId,

                installationId:
                    engineering.installationId,
            }),

        engineeringEvidence:
            engineering.engineeringEvidence,

        observations:
            engineering.observations,

        forecastRequest:
            request,

        timeContractBuilder,

        targetBuilder,

        inputQualifier,

        boundaries:
            ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES,
    });
}


/*
|--------------------------------------------------------------------------
| Execution
|--------------------------------------------------------------------------
|
| Execution performs orchestration only:
|
|   1. build Phase 9.1 time contract
|   2. build Phase 9.1 target
|   3. delegate observations to Phase 9.2 exactly once
|
|--------------------------------------------------------------------------
*/

export function executeEngineeringAnalyticsForecastingIntegration({
    qualifiedIntegration,
} = {}) {
    const q =
        qualifiedIntegration;

    if (
        !isObject(
            q
        ) ||
        q.phase !==
            ENGINEERING_FORECASTING_INTEGRATION_PHASE ||
        q.layer !==
            ENGINEERING_FORECASTING_INTEGRATION_LAYER ||
        q.status !==
            ENGINEERING_FORECASTING_INTEGRATION_STATUS.QUALIFIED ||
        q.executed !==
            false
    ) {
        throw new Error(
            "Phase 12.5 execution requires a qualified 12.5 integration object."
        );
    }

    try {
        const time =
            q.timeContractBuilder({
                trainingStart:
                    q.forecastRequest.trainingStart,

                forecastOrigin:
                    q.forecastRequest.forecastOrigin,

                forecastEnd:
                    q.forecastRequest.forecastEnd,

                timezone:
                    q.forecastRequest.timezone,
            });

        const target =
            q.targetBuilder({
                ...q.forecastRequest.target,

                installationId:
                    q.scopeIdentity.installationId,

                vrmSiteId:
                    q.scopeIdentity.vrmSiteId,
            });

        const forecastInput =
            q.inputQualifier({
                time,

                target,

                source:
                    q.engineeringEvidence,

                observations:
                    q.observations,
            });

        return Object.freeze({
            phase:
                ENGINEERING_FORECASTING_INTEGRATION_PHASE,

            layer:
                ENGINEERING_FORECASTING_INTEGRATION_LAYER,

            upstreamLayer:
                ENGINEERING_FORECASTING_INTEGRATION_UPSTREAM_LAYER,

            targetPhase:
                ENGINEERING_FORECASTING_INTEGRATION_TARGET_PHASE,

            targetLayer:
                FORECASTING_LAYER,

            interval:
                ENGINEERING_FORECASTING_INTEGRATION_INTERVAL,

            status:
                ENGINEERING_FORECASTING_INTEGRATION_STATUS.EXECUTED,

            executed:
                true,

            scope:
                q.scope,

            scopeIdentity:
                q.scopeIdentity,

            engineeringEvidence:
                q.engineeringEvidence,

            observations:
                q.observations,

            time,

            target,

            forecastInput,

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
                ENGINEERING_FORECASTING_INTEGRATION_PHASE,

            layer:
                ENGINEERING_FORECASTING_INTEGRATION_LAYER,

            upstreamLayer:
                ENGINEERING_FORECASTING_INTEGRATION_UPSTREAM_LAYER,

            targetPhase:
                ENGINEERING_FORECASTING_INTEGRATION_TARGET_PHASE,

            targetLayer:
                FORECASTING_LAYER,

            interval:
                ENGINEERING_FORECASTING_INTEGRATION_INTERVAL,

            status:
                ENGINEERING_FORECASTING_INTEGRATION_STATUS.ERROR,

            executed:
                false,

            scope:
                q.scope,

            scopeIdentity:
                q.scopeIdentity,

            engineeringEvidence:
                q.engineeringEvidence,

            observations:
                q.observations,

            time:
                null,

            target:
                null,

            forecastInput:
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
    ENGINEERING_FORECASTING_INTEGRATION_PHASE,
    ENGINEERING_FORECASTING_INTEGRATION_LAYER,
    ENGINEERING_FORECASTING_INTEGRATION_UPSTREAM_LAYER,
    ENGINEERING_FORECASTING_INTEGRATION_TARGET_PHASE,
    ENGINEERING_FORECASTING_INTEGRATION_TARGET_LAYER,
    ENGINEERING_FORECASTING_INTEGRATION_INTERVAL,
    ENGINEERING_FORECASTING_INTEGRATION_STATUS,
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES,
    validateEngineeringForecastEvidence,
    validateEngineeringForecastRequest,
    qualifyEngineeringAnalyticsForecastingIntegration,
    executeEngineeringAnalyticsForecastingIntegration,
});