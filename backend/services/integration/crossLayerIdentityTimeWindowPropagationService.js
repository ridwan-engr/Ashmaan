// services/integration/crossLayerIdentityTimeWindowPropagationService.js

/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 12.10 — Cross-Layer Identity / Time-Window Propagation
|--------------------------------------------------------------------------
|
| Verification-only integration layer.
|
| This service does NOT:
| - execute any Phase 12 bridge
| - calculate engineering metrics
| - create forecasts
| - calculate Financial/BI metrics
| - execute Optimization/DSS
| - mutate telemetry/events/evidence
| - infer identity, timestamps, units or timezone
| - convert missing/UNAVAILABLE values to zero
|
|--------------------------------------------------------------------------
*/

export const CROSS_LAYER_PROPAGATION_PHASE =
    "12.10";

export const CROSS_LAYER_PROPAGATION_LAYER =
    "CROSS_LAYER_IDENTITY_TIME_WINDOW_PROPAGATION";

export const CROSS_LAYER_PROPAGATION_INTERVAL =
    "[start,end)";

export const CROSS_LAYER_PROPAGATION_STATUS =
    Object.freeze({
        VERIFIED: "VERIFIED",
        FAILED: "FAILED",
    });

export const CROSS_LAYER_PROPAGATION_BOUNDARIES =
    Object.freeze({
        verificationOnly: true,

        executesIntegrationBridges: false,
        recalculatesEngineeringAnalytics: false,
        executesForecasting: false,
        calculatesFinancialBi: false,
        executesOptimizationDss: false,

        mutatesTelemetry: false,
        mutatesEvents: false,
        mutatesEvidence: false,

        identityInferenceAllowed: false,
        timestampInferenceAllowed: false,
        unitInferenceAllowed: false,
        timezoneInferenceAllowed: false,

        missingMeansZero: false,
        unavailableMeansZero: false,

        preservesSiteIdentity: true,
        preservesInstallationIdentity: true,
        preservesReportingWindows: true,
        preservesHalfOpenSemantics: true,
        preservesForecastPointTimestamps: true,
        preservesUnits: true,

        advisoryOnly: true,
        executableControl: false,
        autoDispatch: false,
    });


function isObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function requireObject(value, label) {
    if (!isObject(value)) {
        throw new TypeError(
            `${label} must be an object`
        );
    }

    return value;
}


function requireString(value, label) {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new TypeError(
            `${label} must be a non-empty string`
        );
    }

    return value.trim();
}


function optionalString(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalized =
        String(value).trim();

    return normalized || null;
}


function requireDate(value, label) {
    const date =
        value instanceof Date
            ? new Date(value.getTime())
            : new Date(value);

    if (
        Number.isNaN(date.getTime())
    ) {
        throw new TypeError(
            `${label} must be a valid date`
        );
    }

    return date;
}


function sameInstant(a, b) {
    return (
        requireDate(a, "first instant")
            .getTime() ===
        requireDate(b, "second instant")
            .getTime()
    );
}


function assertSame(
    actual,
    expected,
    reason
) {
    if (actual !== expected) {
        throw new Error(reason);
    }
}


function assertSameInstant(
    actual,
    expected,
    reason
) {
    if (!sameInstant(actual, expected)) {
        throw new Error(reason);
    }
}


function requireHalfOpenWindow(
    window,
    {
        label,
        intervalField = "interval",
    }
) {
    requireObject(window, label);

    const start =
        requireDate(
            window.start,
            `${label}.start`
        );

    const end =
        requireDate(
            window.end,
            `${label}.end`
        );

    if (end <= start) {
        throw new Error(
            `${label} must have end > start`
        );
    }

    assertSame(
        window[intervalField],
        CROSS_LAYER_PROPAGATION_INTERVAL,
        `${label} must preserve [start,end)`
    );

    return Object.freeze({
        start,
        end,
    });
}


function requireReportingWindow(
    window,
    label
) {
    requireObject(window, label);

    const start =
        requireDate(
            window.start,
            `${label}.start`
        );

    const end =
        requireDate(
            window.end,
            `${label}.end`
        );

    if (end <= start) {
        throw new Error(
            `${label} must have end > start`
        );
    }

    assertSame(
        window.semantics,
        CROSS_LAYER_PROPAGATION_INTERVAL,
        `${label} must preserve [start,end)`
    );

    return Object.freeze({
        start,
        end,
        timezone:
            optionalString(
                window.timezone
            ),
    });
}


function validateSiteIdentity(
    value,
    label
) {
    requireObject(value, label);

    assertSame(
        value.scope,
        "SITE",
        `${label} must preserve SITE scope`
    );

    const vrmSiteId =
        requireString(
            value.scopeIdentity?.vrmSiteId,
            `${label}.scopeIdentity.vrmSiteId`
        );

    return Object.freeze({
        vrmSiteId,

        installationId:
            optionalString(
                value.scopeIdentity
                    ?.installationId ??
                value.installationId
            ),
    });
}


export function verifyOperationalPropagation({
    phase12_2,
    phase12_3,
    phase12_4,
} = {}) {
    requireObject(
        phase12_2,
        "phase12_2"
    );

    requireObject(
        phase12_3,
        "phase12_3"
    );

    requireObject(
        phase12_4,
        "phase12_4"
    );

    assertSame(
        phase12_2.phase,
        "12.2",
        "PHASE_12_2_REQUIRED"
    );

    assertSame(
        phase12_3.phase,
        "12.3",
        "PHASE_12_3_REQUIRED"
    );

    assertSame(
        phase12_4.phase,
        "12.4",
        "PHASE_12_4_REQUIRED"
    );

    const id12_2 =
        validateSiteIdentity(
            phase12_2,
            "phase12_2"
        );

    const id12_3 =
        validateSiteIdentity(
            phase12_3,
            "phase12_3"
        );

    const id12_4 =
        validateSiteIdentity(
            phase12_4,
            "phase12_4"
        );

    assertSame(
        id12_3.vrmSiteId,
        id12_2.vrmSiteId,
        "12.2_TO_12.3_VRM_SITE_ID_MISMATCH"
    );

    assertSame(
        id12_4.vrmSiteId,
        id12_3.vrmSiteId,
        "12.3_TO_12.4_VRM_SITE_ID_MISMATCH"
    );

    const window12_2 =
        requireHalfOpenWindow(
            phase12_2.horizon,
            {
                label: "phase12_2.horizon",
            }
        );

    const window12_3 =
        requireHalfOpenWindow(
            phase12_3.horizon,
            {
                label: "phase12_3.horizon",
            }
        );

    const window12_4 =
        requireHalfOpenWindow(
            phase12_4.horizon,
            {
                label: "phase12_4.horizon",
            }
        );

    assertSameInstant(
        window12_3.start,
        window12_2.start,
        "12.2_TO_12.3_START_MISMATCH"
    );

    assertSameInstant(
        window12_3.end,
        window12_2.end,
        "12.2_TO_12.3_END_MISMATCH"
    );

    assertSameInstant(
        window12_4.start,
        window12_3.start,
        "12.3_TO_12.4_START_MISMATCH"
    );

    assertSameInstant(
        window12_4.end,
        window12_3.end,
        "12.3_TO_12.4_END_MISMATCH"
    );

    return Object.freeze({
        vrmSiteId:
            id12_2.vrmSiteId,

        installationId:
            id12_4.installationId,

        start:
            window12_2.start,

        end:
            window12_2.end,

        interval:
            CROSS_LAYER_PROPAGATION_INTERVAL,
    });
}


export function verifyEngineeringForecastPropagation({
    phase12_5,
} = {}) {
    requireObject(
        phase12_5,
        "phase12_5"
    );

    assertSame(
        phase12_5.phase,
        "12.5",
        "PHASE_12_5_REQUIRED"
    );

    const identity =
        validateSiteIdentity(
            phase12_5,
            "phase12_5"
        );

    assertSame(
        phase12_5.interval,
        CROSS_LAYER_PROPAGATION_INTERVAL,
        "PHASE_12_5_INTERVAL_MISMATCH"
    );

    const request =
        requireObject(
            phase12_5.forecastRequest,
            "phase12_5.forecastRequest"
        );

    const trainingStart =
        requireDate(
            request.trainingStart,
            "forecastRequest.trainingStart"
        );

    const forecastOrigin =
        requireDate(
            request.forecastOrigin,
            "forecastRequest.forecastOrigin"
        );

    const forecastEnd =
        requireDate(
            request.forecastEnd,
            "forecastRequest.forecastEnd"
        );

    if (
        forecastOrigin <= trainingStart
    ) {
        throw new Error(
            "FORECAST_ORIGIN_MUST_FOLLOW_TRAINING_START"
        );
    }

    if (
        forecastEnd <= forecastOrigin
    ) {
        throw new Error(
            "FORECAST_END_MUST_FOLLOW_FORECAST_ORIGIN"
        );
    }

    if (
        phase12_5.time
    ) {
        assertSameInstant(
            phase12_5.time.trainingStart,
            trainingStart,
            "12.5_TRAINING_START_PROPAGATION_MISMATCH"
        );

        assertSameInstant(
            phase12_5.time.forecastOrigin,
            forecastOrigin,
            "12.5_FORECAST_ORIGIN_PROPAGATION_MISMATCH"
        );

        assertSameInstant(
            phase12_5.time.forecastEnd,
            forecastEnd,
            "12.5_FORECAST_END_PROPAGATION_MISMATCH"
        );
    }

    if (
        phase12_5.target
    ) {
        const targetSiteId =
            optionalString(
                phase12_5.target
                    ?.scope
                    ?.vrmSiteId ??
                phase12_5.target
                    ?.vrmSiteId
            );

        if (targetSiteId) {
            assertSame(
                targetSiteId,
                identity.vrmSiteId,
                "12.5_TARGET_VRM_SITE_ID_MISMATCH"
            );
        }

        const targetInstallationId =
            optionalString(
                phase12_5.target
                    ?.scope
                    ?.installationId ??
                phase12_5.target
                    ?.installationId
            );

        if (
            identity.installationId &&
            targetInstallationId
        ) {
            assertSame(
                targetInstallationId,
                identity.installationId,
                "12.5_TARGET_INSTALLATION_ID_MISMATCH"
            );
        }
    }

    return Object.freeze({
        ...identity,

        trainingStart,
        forecastOrigin,
        forecastEnd,

        interval:
            CROSS_LAYER_PROPAGATION_INTERVAL,
    });
}


export function verifyForecastFinancialBiPropagation({
    phase12_6,
} = {}) {
    requireObject(
        phase12_6,
        "phase12_6"
    );

    assertSame(
        phase12_6.phase,
        "12.6",
        "PHASE_12_6_REQUIRED"
    );

    const identity =
        validateSiteIdentity(
            phase12_6,
            "phase12_6"
        );

    assertSame(
        phase12_6.interval,
        CROSS_LAYER_PROPAGATION_INTERVAL,
        "PHASE_12_6_INTERVAL_MISMATCH"
    );

    const productionWindow =
        requireObject(
            phase12_6.productionWindow ??
            phase12_6
                .productionContract
                ?.productionWindow,
            "phase12_6.productionWindow"
        );

    assertSame(
        productionWindow.semantics,
        CROSS_LAYER_PROPAGATION_INTERVAL,
        "12.6_PRODUCTION_WINDOW_SEMANTICS_MISMATCH"
    );

    const forecastOrigin =
        requireDate(
            productionWindow.forecastOrigin,
            "productionWindow.forecastOrigin"
        );

    const forecastEnd =
        requireDate(
            productionWindow.forecastEnd,
            "productionWindow.forecastEnd"
        );

    if (
        forecastEnd <= forecastOrigin
    ) {
        throw new Error(
            "12.6_PRODUCTION_WINDOW_INVALID"
        );
    }

    if (phase12_6.reportingWindow) {
        const reportingWindow =
            requireReportingWindow(
                phase12_6.reportingWindow,
                "phase12_6.reportingWindow"
            );

        assertSameInstant(
            reportingWindow.start,
            forecastOrigin,
            "12.6_FORECAST_TO_FINANCIAL_START_MISMATCH"
        );

        assertSameInstant(
            reportingWindow.end,
            forecastEnd,
            "12.6_FORECAST_TO_FINANCIAL_END_MISMATCH"
        );
    }

    if (
        Array.isArray(
            phase12_6.forecastTimestamps
        ) &&
        Array.isArray(
            phase12_6.forecastValues
        )
    ) {
        assertSame(
            phase12_6.forecastTimestamps.length,
            phase12_6.forecastValues.length,
            "12.6_FORECAST_POINT_COUNT_MISMATCH"
        );

        phase12_6.forecastValues
            .forEach(
                (
                    point,
                    index
                ) => {
                    assertSameInstant(
                        point.timestamp,
                        phase12_6
                            .forecastTimestamps[
                                index
                            ],
                        `12.6_FORECAST_TIMESTAMP_MISMATCH_${index}`
                    );

                    if (
                        phase12_6.unit &&
                        point.unit
                    ) {
                        assertSame(
                            point.unit,
                            phase12_6.unit,
                            `12.6_FORECAST_UNIT_MISMATCH_${index}`
                        );
                    }
                }
            );
    }

    if (
        Array.isArray(
            phase12_6.observations
        ) &&
        Array.isArray(
            phase12_6.forecastTimestamps
        )
    ) {
        assertSame(
            phase12_6.observations.length,
            phase12_6.forecastTimestamps.length,
            "12.6_FINANCIAL_OBSERVATION_COUNT_MISMATCH"
        );

        phase12_6.observations
            .forEach(
                (
                    observation,
                    index
                ) => {
                    assertSameInstant(
                        observation.timestamp,
                        phase12_6
                            .forecastTimestamps[
                                index
                            ],
                        `12.6_FINANCIAL_OBSERVATION_TIMESTAMP_MISMATCH_${index}`
                    );

                    if (
                        phase12_6.unit &&
                        observation.unit
                    ) {
                        assertSame(
                            observation.unit,
                            phase12_6.unit,
                            `12.6_FINANCIAL_OBSERVATION_UNIT_MISMATCH_${index}`
                        );
                    }
                }
            );
    }

    return Object.freeze({
        ...identity,

        forecastOrigin,
        forecastEnd,

        interval:
            CROSS_LAYER_PROPAGATION_INTERVAL,

        unit:
            optionalString(
                phase12_6.unit
            ),
    });
}


export function verifyFinancialBiOptimizationPropagation({
    phase12_7,
} = {}) {
    requireObject(
        phase12_7,
        "phase12_7"
    );

    assertSame(
        phase12_7.phase,
        "12.7",
        "PHASE_12_7_REQUIRED"
    );

    const scope =
        requireString(
            phase12_7.scope,
            "phase12_7.scope"
        );

    if (
        scope !== "SITE" &&
        scope !== "FLEET"
    ) {
        throw new Error(
            "12.7_SCOPE_INVALID"
        );
    }

    const scopeIdentity =
        requireObject(
            phase12_7.scopeIdentity,
            "phase12_7.scopeIdentity"
        );

    const vrmSiteId =
        scope === "SITE"
            ? requireString(
                scopeIdentity.vrmSiteId,
                "phase12_7.scopeIdentity.vrmSiteId"
            )
            : null;

    const fleetId =
        scope === "FLEET"
            ? requireString(
                scopeIdentity.fleetId,
                "phase12_7.scopeIdentity.fleetId"
            )
            : null;

    const reportingWindow =
        requireReportingWindow(
            phase12_7.reportingWindow,
            "phase12_7.reportingWindow"
        );

    if (phase12_7.horizon) {
        const horizon =
            requireHalfOpenWindow(
                phase12_7.horizon,
                {
                    label:
                        "phase12_7.horizon",
                }
            );

        assertSameInstant(
            horizon.start,
            reportingWindow.start,
            "12.7_FINANCIAL_TO_DSS_START_MISMATCH"
        );

        assertSameInstant(
            horizon.end,
            reportingWindow.end,
            "12.7_FINANCIAL_TO_DSS_END_MISMATCH"
        );

        const horizonTimezone =
            optionalString(
                phase12_7.horizon
                    .timezone
            );

        if (
            reportingWindow.timezone &&
            horizonTimezone
        ) {
            assertSame(
                horizonTimezone,
                reportingWindow.timezone,
                "12.7_FINANCIAL_TO_DSS_TIMEZONE_MISMATCH"
            );
        }
    }

    if (phase12_7.contract) {
        assertSame(
            phase12_7.contract.scope,
            scope,
            "12.7_DSS_CONTRACT_SCOPE_MISMATCH"
        );

        if (scope === "SITE") {
            assertSame(
                phase12_7.contract
                    .scopeIdentity
                    ?.vrmSiteId,
                vrmSiteId,
                "12.7_DSS_CONTRACT_SITE_ID_MISMATCH"
            );
        }

        if (scope === "FLEET") {
            assertSame(
                phase12_7.contract
                    .scopeIdentity
                    ?.fleetId,
                fleetId,
                "12.7_DSS_CONTRACT_FLEET_ID_MISMATCH"
            );
        }
    }

    return Object.freeze({
        scope,

        scopeIdentity:
            Object.freeze({
                vrmSiteId,
                fleetId,
            }),

        start:
            reportingWindow.start,

        end:
            reportingWindow.end,

        timezone:
            reportingWindow.timezone,

        interval:
            CROSS_LAYER_PROPAGATION_INTERVAL,
    });
}


export function verifyCrossLayerIdentityTimeWindowPropagation({
    phase12_2,
    phase12_3,
    phase12_4,
    phase12_5,
    phase12_6,
    phase12_7,
} = {}) {
    try {
        const operational =
            verifyOperationalPropagation({
                phase12_2,
                phase12_3,
                phase12_4,
            });

        const engineeringForecast =
            verifyEngineeringForecastPropagation({
                phase12_5,
            });

        const forecastFinancialBi =
            verifyForecastFinancialBiPropagation({
                phase12_6,
            });

        const financialBiOptimization =
            verifyFinancialBiOptimizationPropagation({
                phase12_7,
            });

        /*
        |--------------------------------------------------------------------------
        | SITE identity continuity
        |--------------------------------------------------------------------------
        */

        assertSame(
            engineeringForecast.vrmSiteId,
            operational.vrmSiteId,
            "12.4_TO_12.5_VRM_SITE_ID_MISMATCH"
        );

        assertSame(
            forecastFinancialBi.vrmSiteId,
            engineeringForecast.vrmSiteId,
            "12.5_TO_12.6_VRM_SITE_ID_MISMATCH"
        );

        if (
            financialBiOptimization.scope ===
            "SITE"
        ) {
            assertSame(
                financialBiOptimization
                    .scopeIdentity
                    .vrmSiteId,
                forecastFinancialBi.vrmSiteId,
                "12.6_TO_12.7_VRM_SITE_ID_MISMATCH"
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Installation identity continuity where explicitly established
        |--------------------------------------------------------------------------
        */

        const installationIds =
            [
                operational.installationId,
                engineeringForecast.installationId,
                forecastFinancialBi.installationId,
            ].filter(Boolean);

        if (
            new Set(
                installationIds
            ).size > 1
        ) {
            throw new Error(
                "CROSS_LAYER_INSTALLATION_ID_MISMATCH"
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Forecast → Financial/BI → DSS time continuity
        |--------------------------------------------------------------------------
        */

        assertSameInstant(
            forecastFinancialBi.forecastOrigin,
            financialBiOptimization.start,
            "12.6_TO_12.7_START_MISMATCH"
        );

        assertSameInstant(
            forecastFinancialBi.forecastEnd,
            financialBiOptimization.end,
            "12.6_TO_12.7_END_MISMATCH"
        );

        return Object.freeze({
            phase:
                CROSS_LAYER_PROPAGATION_PHASE,

            layer:
                CROSS_LAYER_PROPAGATION_LAYER,

            status:
                CROSS_LAYER_PROPAGATION_STATUS
                    .VERIFIED,

            verified:
                true,

            operational,

            engineeringForecast,

            forecastFinancialBi,

            financialBiOptimization,

            boundaries:
                CROSS_LAYER_PROPAGATION_BOUNDARIES,

            error:
                null,
        });
    }
    catch (error) {
        return Object.freeze({
            phase:
                CROSS_LAYER_PROPAGATION_PHASE,

            layer:
                CROSS_LAYER_PROPAGATION_LAYER,

            status:
                CROSS_LAYER_PROPAGATION_STATUS
                    .FAILED,

            verified:
                false,

            operational:
                null,

            engineeringForecast:
                null,

            forecastFinancialBi:
                null,

            financialBiOptimization:
                null,

            boundaries:
                CROSS_LAYER_PROPAGATION_BOUNDARIES,

            error:
                Object.freeze({
                    name:
                        error?.name ??
                        "Error",

                    message:
                        error?.message ??
                        String(error),
                }),
        });
    }
}


export default Object.freeze({
    CROSS_LAYER_PROPAGATION_PHASE,
    CROSS_LAYER_PROPAGATION_LAYER,
    CROSS_LAYER_PROPAGATION_INTERVAL,
    CROSS_LAYER_PROPAGATION_STATUS,
    CROSS_LAYER_PROPAGATION_BOUNDARIES,

    verifyOperationalPropagation,
    verifyEngineeringForecastPropagation,
    verifyForecastFinancialBiPropagation,
    verifyFinancialBiOptimizationPropagation,
    verifyCrossLayerIdentityTimeWindowPropagation,
});