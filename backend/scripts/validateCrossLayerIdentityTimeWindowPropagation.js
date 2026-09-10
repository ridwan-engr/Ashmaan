
import assert from "node:assert/strict";

import {
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
} from "../services/integration/crossLayerIdentityTimeWindowPropagationService.js";


let passed = 0;

function equal(actual, expected, message) {
    assert.equal(actual, expected, message);
    passed++;
    console.log(`PASS ${passed}: ${message}`);
}

function ok(value, message) {
    assert.ok(value, message);
    passed++;
    console.log(`PASS ${passed}: ${message}`);
}

function deepEqual(actual, expected, message) {
    assert.deepEqual(actual, expected, message);
    passed++;
    console.log(`PASS ${passed}: ${message}`);
}


console.log("\n================================================");
console.log("ASHMAAN PHASE 12.10 CROSS-LAYER IDENTITY / TIME-WINDOW PROPAGATION");
console.log("================================================\n");


const START =
    new Date("2026-09-01T00:00:00.000Z");

const END =
    new Date("2026-09-02T00:00:00.000Z");

const FORECAST_ORIGIN =
    new Date("2026-09-03T00:00:00.000Z");

const FORECAST_END =
    new Date("2026-09-04T00:00:00.000Z");

const TRAINING_START =
    new Date("2026-08-20T00:00:00.000Z");


const installationId =
    "INSTALL-001";

const vrmSiteId =
    "SITE-001";


const phase12_2 =
    {
        phase:
            "12.2",

        scope:
            "SITE",

        scopeIdentity:
            {
                vrmSiteId,
                installationId,
            },

        horizon:
            {
                start:
                    START,

                end:
                    END,

                interval:
                    "[start,end)",
            },
    };


const phase12_3 =
    {
        phase:
            "12.3",

        scope:
            "SITE",

        scopeIdentity:
            {
                vrmSiteId,
                installationId,
            },

        horizon:
            {
                start:
                    START,

                end:
                    END,

                interval:
                    "[start,end)",
            },
    };


const phase12_4 =
    {
        phase:
            "12.4",

        scope:
            "SITE",

        scopeIdentity:
            {
                vrmSiteId,
                installationId,
            },

        horizon:
            {
                start:
                    START,

                end:
                    END,

                interval:
                    "[start,end)",
            },
    };


const phase12_5 =
    {
        phase:
            "12.5",

        scope:
            "SITE",

        scopeIdentity:
            {
                vrmSiteId,
                installationId,
            },

        interval:
            "[start,end)",

        forecastRequest:
            {
                trainingStart:
                    TRAINING_START,

                forecastOrigin:
                    FORECAST_ORIGIN,

                forecastEnd:
                    FORECAST_END,
            },

        time:
            {
                trainingStart:
                    TRAINING_START,

                forecastOrigin:
                    FORECAST_ORIGIN,

                forecastEnd:
                    FORECAST_END,
            },

        target:
            {
                scope:
                    {
                        vrmSiteId,
                        installationId,
                    },
            },
    };


const forecastPoints =
    [
        {
            timestamp:
                FORECAST_ORIGIN,

            value:
                10,

            unit:
                "kW",
        },

        {
            timestamp:
                new Date("2026-09-03T12:00:00.000Z"),

            value:
                0,

            unit:
                "kW",
        },
    ];


const phase12_6 =
    {
        phase:
            "12.6",

        scope:
            "SITE",

        scopeIdentity:
            {
                vrmSiteId,
                installationId,
            },

        interval:
            "[start,end)",

        unit:
            "kW",

        productionWindow:
            {
                forecastOrigin:
                    FORECAST_ORIGIN,

                forecastEnd:
                    FORECAST_END,

                semantics:
                    "[start,end)",
            },

        reportingWindow:
            {
                start:
                    FORECAST_ORIGIN,

                end:
                    FORECAST_END,

                timezone:
                    "UTC",

                semantics:
                    "[start,end)",
            },

        forecastTimestamps:
            forecastPoints.map(
                p => p.timestamp
            ),

        forecastValues:
            forecastPoints,

        observations:
            forecastPoints.map(
                p =>
                    ({
                        timestamp:
                            p.timestamp,

                        value:
                            p.value,

                        unit:
                            p.unit,
                    })
            ),
    };


const phase12_7 =
    {
        phase:
            "12.7",

        scope:
            "SITE",

        scopeIdentity:
            {
                vrmSiteId,
                installationId,
            },

        reportingWindow:
            {
                start:
                    FORECAST_ORIGIN,

                end:
                    FORECAST_END,

                timezone:
                    "UTC",

                semantics:
                    "[start,end)",
            },

        horizon:
            {
                start:
                    FORECAST_ORIGIN,

                end:
                    FORECAST_END,

                timezone:
                    "UTC",

                interval:
                    "[start,end)",
            },

        contract:
            {
                scope:
                    "SITE",

                scopeIdentity:
                    {
                        vrmSiteId,
                    },
            },
    };


/*
|--------------------------------------------------------------------------
| 1. CONSTANTS
|--------------------------------------------------------------------------
*/

equal(
    CROSS_LAYER_PROPAGATION_PHASE,
    "12.10",
    "integration phase is 12.10"
);

equal(
    CROSS_LAYER_PROPAGATION_LAYER,
    "CROSS_LAYER_IDENTITY_TIME_WINDOW_PROPAGATION",
    "integration layer is explicit"
);

equal(
    CROSS_LAYER_PROPAGATION_INTERVAL,
    "[start,end)",
    "half-open interval constant is preserved"
);


/*
|--------------------------------------------------------------------------
| 2. BOUNDARIES
|--------------------------------------------------------------------------
*/

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.verificationOnly,
    true,
    "12.10 is verification-only"
);

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.executesForecasting,
    false,
    "12.10 does not execute forecasting"
);

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.calculatesFinancialBi,
    false,
    "12.10 does not calculate Financial/BI"
);

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.executesOptimizationDss,
    false,
    "12.10 does not execute Optimization/DSS"
);

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.mutatesEvidence,
    false,
    "12.10 does not mutate evidence"
);

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.identityInferenceAllowed,
    false,
    "identity inference remains prohibited"
);

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.timestampInferenceAllowed,
    false,
    "timestamp inference remains prohibited"
);

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.unitInferenceAllowed,
    false,
    "unit inference remains prohibited"
);

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.timezoneInferenceAllowed,
    false,
    "timezone inference remains prohibited"
);

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.missingMeansZero,
    false,
    "missing remains distinct from zero"
);

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.unavailableMeansZero,
    false,
    "UNAVAILABLE remains distinct from zero"
);

equal(
    CROSS_LAYER_PROPAGATION_BOUNDARIES.autoDispatch,
    false,
    "automatic dispatch remains prohibited"
);


/*
|--------------------------------------------------------------------------
| 3. OPERATIONAL PROPAGATION
|--------------------------------------------------------------------------
*/

const operational =
    verifyOperationalPropagation({
        phase12_2,
        phase12_3,
        phase12_4,
    });

equal(
    operational.vrmSiteId,
    vrmSiteId,
    "12.2 to 12.4 SITE identity propagates"
);

equal(
    operational.installationId,
    installationId,
    "12.2 to 12.4 installation identity propagates"
);

equal(
    operational.start.getTime(),
    START.getTime(),
    "12.2 operational horizon start is preserved"
);

equal(
    operational.end.getTime(),
    END.getTime(),
    "12.2 operational horizon end is preserved"
);

equal(
    operational.interval,
    "[start,end)",
    "12.2 to 12.4 interval semantics propagate"
);


/*
|--------------------------------------------------------------------------
| 4. ENGINEERING → FORECAST
|--------------------------------------------------------------------------
*/

const engineeringForecast =
    verifyEngineeringForecastPropagation({
        phase12_5,
    });

equal(
    engineeringForecast.vrmSiteId,
    vrmSiteId,
    "12.5 preserves SITE identity"
);

equal(
    engineeringForecast.installationId,
    installationId,
    "12.5 preserves installation identity"
);

equal(
    engineeringForecast.trainingStart.getTime(),
    TRAINING_START.getTime(),
    "trainingStart propagates"
);

equal(
    engineeringForecast.forecastOrigin.getTime(),
    FORECAST_ORIGIN.getTime(),
    "forecastOrigin propagates"
);

equal(
    engineeringForecast.forecastEnd.getTime(),
    FORECAST_END.getTime(),
    "forecastEnd propagates"
);


/*
|--------------------------------------------------------------------------
| 5. FORECAST → FINANCIAL/BI
|--------------------------------------------------------------------------
*/

const forecastFinancial =
    verifyForecastFinancialBiPropagation({
        phase12_6,
    });

equal(
    forecastFinancial.vrmSiteId,
    vrmSiteId,
    "12.6 preserves SITE identity"
);

equal(
    forecastFinancial.installationId,
    installationId,
    "12.6 preserves installation identity"
);

equal(
    forecastFinancial.forecastOrigin.getTime(),
    FORECAST_ORIGIN.getTime(),
    "forecast origin becomes Financial/BI reporting start"
);

equal(
    forecastFinancial.forecastEnd.getTime(),
    FORECAST_END.getTime(),
    "forecast end becomes Financial/BI reporting end"
);

equal(
    forecastFinancial.unit,
    "kW",
    "forecast unit is preserved"
);


/*
|--------------------------------------------------------------------------
| 6. FINANCIAL/BI → OPTIMIZATION/DSS
|--------------------------------------------------------------------------
*/

const financialOptimization =
    verifyFinancialBiOptimizationPropagation({
        phase12_7,
    });

equal(
    financialOptimization.scope,
    "SITE",
    "Financial/BI SITE scope propagates"
);

equal(
    financialOptimization.scopeIdentity.vrmSiteId,
    vrmSiteId,
    "Financial/BI SITE identity propagates"
);

equal(
    financialOptimization.start.getTime(),
    FORECAST_ORIGIN.getTime(),
    "Financial/BI reporting start becomes DSS horizon start"
);

equal(
    financialOptimization.end.getTime(),
    FORECAST_END.getTime(),
    "Financial/BI reporting end becomes DSS horizon end"
);

equal(
    financialOptimization.timezone,
    "UTC",
    "timezone propagates into DSS horizon"
);


/*
|--------------------------------------------------------------------------
| 7. FULL CROSS-LAYER VERIFICATION
|--------------------------------------------------------------------------
*/

const verified =
    verifyCrossLayerIdentityTimeWindowPropagation({
        phase12_2,
        phase12_3,
        phase12_4,
        phase12_5,
        phase12_6,
        phase12_7,
    });

equal(
    verified.phase,
    "12.10",
    "verified result phase is correct"
);

equal(
    verified.layer,
    "CROSS_LAYER_IDENTITY_TIME_WINDOW_PROPAGATION",
    "verified result layer is correct"
);

equal(
    verified.status,
    CROSS_LAYER_PROPAGATION_STATUS.VERIFIED,
    "full cross-layer propagation verifies successfully"
);

equal(
    verified.verified,
    true,
    "verified flag is true"
);

equal(
    verified.operational.vrmSiteId,
    vrmSiteId,
    "operational SITE identity retained in final result"
);

equal(
    verified.engineeringForecast.vrmSiteId,
    vrmSiteId,
    "forecast SITE identity retained in final result"
);

equal(
    verified.forecastFinancialBi.vrmSiteId,
    vrmSiteId,
    "Financial/BI SITE identity retained in final result"
);

equal(
    verified.financialBiOptimization.scopeIdentity.vrmSiteId,
    vrmSiteId,
    "Optimization/DSS SITE identity retained in final result"
);

equal(
    verified.forecastFinancialBi.forecastOrigin.getTime(),
    verified.financialBiOptimization.start.getTime(),
    "forecastOrigin equals DSS horizon start"
);

equal(
    verified.forecastFinancialBi.forecastEnd.getTime(),
    verified.financialBiOptimization.end.getTime(),
    "forecastEnd equals DSS horizon end"
);


/*
|--------------------------------------------------------------------------
| 8. FAILURE CASES
|--------------------------------------------------------------------------
*/

function expectFailure(
    mutate,
    expectedMessage,
    message
) {
    const result =
        mutate();

    equal(
        result.status,
        CROSS_LAYER_PROPAGATION_STATUS.FAILED,
        message
    );

    equal(
        result.verified,
        false,
        `${message} returns verified false`
    );

    equal(
        result.error.message,
        expectedMessage,
        `${message} preserves explicit error reason`
    );
}


/* SITE mismatch */

expectFailure(
    () =>
        verifyCrossLayerIdentityTimeWindowPropagation({
            phase12_2,
            phase12_3:
                {
                    ...phase12_3,

                    scopeIdentity:
                        {
                            ...phase12_3.scopeIdentity,

                            vrmSiteId:
                                "SITE-999",
                        },
                },
            phase12_4,
            phase12_5,
            phase12_6,
            phase12_7,
        }),
    "12.2_TO_12.3_VRM_SITE_ID_MISMATCH",
    "cross-site operational propagation is rejected"
);


/* Installation mismatch */

expectFailure(
    () =>
        verifyCrossLayerIdentityTimeWindowPropagation({
            phase12_2,
            phase12_3,
            phase12_4:
                {
                    ...phase12_4,

                    scopeIdentity:
                        {
                            ...phase12_4.scopeIdentity,

                            installationId:
                                "INSTALL-999",
                        },
                },
            phase12_5,
            phase12_6,
            phase12_7,
        }),
    "CROSS_LAYER_INSTALLATION_ID_MISMATCH",
    "installation identity mismatch is rejected"
);


/* Operational end mismatch */

expectFailure(
    () =>
        verifyCrossLayerIdentityTimeWindowPropagation({
            phase12_2,
            phase12_3,
            phase12_4:
                {
                    ...phase12_4,

                    horizon:
                        {
                            ...phase12_4.horizon,

                            end:
                                new Date(
                                    "2026-09-02T01:00:00.000Z"
                                ),
                        },
                },
            phase12_5,
            phase12_6,
            phase12_7,
        }),
    "12.3_TO_12.4_END_MISMATCH",
    "operational horizon mismatch is rejected"
);


/* Forecast timestamp mismatch */

expectFailure(
    () =>
        verifyCrossLayerIdentityTimeWindowPropagation({
            phase12_2,
            phase12_3,
            phase12_4,
            phase12_5,
            phase12_6:
                {
                    ...phase12_6,

                    forecastValues:
                        [
                            {
                                ...forecastPoints[0],

                                timestamp:
                                    new Date(
                                        "2026-09-03T01:00:00.000Z"
                                    ),
                            },
                            forecastPoints[1],
                        ],
                },
            phase12_7,
        }),
    "12.6_FORECAST_TIMESTAMP_MISMATCH_0",
    "forecast point timestamp mismatch is rejected"
);


/* Unit mismatch */

expectFailure(
    () =>
        verifyCrossLayerIdentityTimeWindowPropagation({
            phase12_2,
            phase12_3,
            phase12_4,
            phase12_5,
            phase12_6:
                {
                    ...phase12_6,

                    observations:
                        [
                            {
                                ...phase12_6.observations[0],

                                unit:
                                    "kWh",
                            },
                            phase12_6.observations[1],
                        ],
                },
            phase12_7,
        }),
    "12.6_FINANCIAL_OBSERVATION_UNIT_MISMATCH_0",
    "forecast unit propagation mismatch is rejected"
);


/* Forecast reporting start mismatch */

expectFailure(
    () =>
        verifyCrossLayerIdentityTimeWindowPropagation({
            phase12_2,
            phase12_3,
            phase12_4,
            phase12_5,
            phase12_6:
                {
                    ...phase12_6,

                    reportingWindow:
                        {
                            ...phase12_6.reportingWindow,

                            start:
                                new Date(
                                    "2026-09-03T02:00:00.000Z"
                                ),
                        },
                },
            phase12_7,
        }),
    "12.6_FORECAST_TO_FINANCIAL_START_MISMATCH",
    "forecast to Financial/BI start mismatch is rejected"
);


/* DSS timezone mismatch */

expectFailure(
    () =>
        verifyCrossLayerIdentityTimeWindowPropagation({
            phase12_2,
            phase12_3,
            phase12_4,
            phase12_5,
            phase12_6,
            phase12_7:
                {
                    ...phase12_7,

                    horizon:
                        {
                            ...phase12_7.horizon,

                            timezone:
                                "Africa/Lagos",
                        },
                },
        }),
    "12.7_FINANCIAL_TO_DSS_TIMEZONE_MISMATCH",
    "timezone propagation mismatch is rejected"
);


/* DSS end mismatch */

expectFailure(
    () =>
        verifyCrossLayerIdentityTimeWindowPropagation({
            phase12_2,
            phase12_3,
            phase12_4,
            phase12_5,
            phase12_6,
            phase12_7:
                {
                    ...phase12_7,

                    horizon:
                        {
                            ...phase12_7.horizon,

                            end:
                                new Date(
                                    "2026-09-04T01:00:00.000Z"
                                ),
                        },
                },
        }),
    "12.7_FINANCIAL_TO_DSS_END_MISMATCH",
    "Financial/BI to DSS end mismatch is rejected"
);


/* Half-open semantics */

expectFailure(
    () =>
        verifyCrossLayerIdentityTimeWindowPropagation({
            phase12_2:
                {
                    ...phase12_2,

                    horizon:
                        {
                            ...phase12_2.horizon,

                            interval:
                                "[start,end]",
                        },
                },
            phase12_3,
            phase12_4,
            phase12_5,
            phase12_6,
            phase12_7,
        }),
    "phase12_2.horizon must preserve [start,end)",
    "half-open interval violation is rejected"
);


/* Missing SITE identity */

expectFailure(
    () =>
        verifyCrossLayerIdentityTimeWindowPropagation({
            phase12_2:
                {
                    ...phase12_2,

                    scopeIdentity:
                        {},
                },
            phase12_3,
            phase12_4,
            phase12_5,
            phase12_6,
            phase12_7,
        }),
    "phase12_2.scopeIdentity.vrmSiteId must be a non-empty string",
    "missing SITE identity is rejected"
);


console.log("\n================================================");
console.log(`Assertions passed: ${passed}`);
console.log("================================================");
console.log("ASHMAAN PHASE 12.10 CROSS-LAYER PROPAGATION PASSED");
console.log("================================================\n");