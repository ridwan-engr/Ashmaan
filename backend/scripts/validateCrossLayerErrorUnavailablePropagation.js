// scripts/validateCrossLayerErrorUnavailablePropagation.js

import assert from "node:assert/strict";

import {
    CROSS_LAYER_ERROR_PROPAGATION_PHASE,
    CROSS_LAYER_ERROR_PROPAGATION_LAYER,
    CROSS_LAYER_ERROR_PROPAGATION_INTERVAL,
    CROSS_LAYER_ERROR_PROPAGATION_STATUS,
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES,
    verifyFailureEnvelope,
    verifyDownstreamBlocked,
    verifyUnavailableValue,
    verifyFailureWindowPreservation,
    verifyScopeIdentityNotInferred,
    verifyForecastFinancialBiFailureBoundary,
    verifyFinancialBiOptimizationFailureBoundary,
    verifyApiStatusSeparation,
    verifyCrossLayerErrorUnavailablePropagation,
} from "../services/integration/crossLayerErrorUnavailablePropagationService.js";


let passed = 0;


function equal(
    actual,
    expected,
    message
) {
    assert.equal(
        actual,
        expected,
        message
    );

    passed += 1;

    console.log(
        `PASS ${passed}: ${message}`
    );
}


function ok(
    value,
    message
) {
    assert.ok(
        value,
        message
    );

    passed += 1;

    console.log(
        `PASS ${passed}: ${message}`
    );
}


function expectThrow(
    fn,
    expectedMessage,
    message
) {
    assert.throws(
        fn,
        error =>
            error?.message ===
            expectedMessage
    );

    passed += 1;

    console.log(
        `PASS ${passed}: ${message}`
    );
}


console.log(
    "\n================================================"
);

console.log(
    "ASHMAAN PHASE 12.11 CROSS-LAYER ERROR / UNAVAILABLE PROPAGATION"
);

console.log(
    "================================================\n"
);


const START =
    "2026-09-01T00:00:00.000Z";

const END =
    "2026-09-02T00:00:00.000Z";

const SITE_ID =
    "SITE-001";

const INSTALLATION_ID =
    "INSTALL-001";


function siteIdentity() {
    return {
        vrmSiteId:
            SITE_ID,

        fleetId:
            null,

        installationId:
            INSTALLATION_ID,
    };
}


function horizon() {
    return {
        start:
            START,

        end:
            END,

        interval:
            "[start,end)",
    };
}


/*
|--------------------------------------------------------------------------
| 1. CONTRACT
|--------------------------------------------------------------------------
*/

equal(
    CROSS_LAYER_ERROR_PROPAGATION_PHASE,
    "12.11",
    "integration phase is 12.11"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_LAYER,
    "CROSS_LAYER_ERROR_UNAVAILABLE_PROPAGATION",
    "integration layer is explicit"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_INTERVAL,
    "[start,end)",
    "half-open interval is canonical"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.verificationOnly,
    true,
    "12.11 is verification-only"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.executesTelemetrySynchronization,
    false,
    "12.11 does not execute telemetry synchronization"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.executesReliability,
    false,
    "12.11 does not execute reliability"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.calculatesEngineeringAnalytics,
    false,
    "12.11 does not calculate Engineering Analytics"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.executesForecasting,
    false,
    "12.11 does not execute forecasting"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.calculatesFinancialBi,
    false,
    "12.11 does not calculate Financial/BI"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.executesOptimizationDss,
    false,
    "12.11 does not execute Optimization/DSS"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.mutatesEvidence,
    false,
    "12.11 does not mutate evidence"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.persistsEvidence,
    false,
    "12.11 does not persist evidence"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.missingMeansZero,
    false,
    "missing is not zero"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.unavailableMeansZero,
    false,
    "UNAVAILABLE is not zero"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.errorMeansZero,
    false,
    "ERROR is not zero"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.errorMeansUnavailable,
    false,
    "ERROR remains distinct from UNAVAILABLE"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.notFoundMeansEmpty,
    false,
    "NOT_FOUND remains distinct from EMPTY"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.invalidRequestMeansUnavailable,
    false,
    "INVALID_REQUEST remains distinct from UNAVAILABLE"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.synthesizesRecovery,
    false,
    "synthetic recovery is prohibited"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.synthesizesDownstreamSuccess,
    false,
    "synthetic downstream success is prohibited"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.automaticDispatchAllowed,
    false,
    "automatic dispatch remains prohibited"
);

equal(
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES.executableControlAllowed,
    false,
    "executable control remains prohibited"
);


/*
|--------------------------------------------------------------------------
| 2. FAILURE ENVELOPES
|--------------------------------------------------------------------------
*/

const telemetryError =
    {
        phase:
            "12.2",

        status:
            "ERROR",

        executed:
            false,

        scope:
            "SITE",

        scopeIdentity:
            siteIdentity(),

        horizon:
            horizon(),

        error:
            {
                message:
                    "VRM_SYNC_FAILED",
            },
    };


const telemetryUnavailable =
    {
        ...telemetryError,

        status:
            "UNAVAILABLE",

        error:
            {
                message:
                    "VRM_SOURCE_UNAVAILABLE",
            },
    };


const parsedError =
    verifyFailureEnvelope(
        telemetryError,
        {
            label:
                "phase12_2",
        }
    );

equal(
    parsedError.status,
    "ERROR",
    "12.2 ERROR remains ERROR"
);

equal(
    parsedError.executed,
    false,
    "12.2 ERROR remains unexecuted"
);

equal(
    parsedError.reason,
    "VRM_SYNC_FAILED",
    "12.2 error reason is preserved"
);

equal(
    parsedError.scope,
    "SITE",
    "12.2 failure preserves SITE scope"
);

equal(
    parsedError.scopeIdentity.vrmSiteId,
    SITE_ID,
    "12.2 failure preserves SITE identity"
);


/*
|--------------------------------------------------------------------------
| 3. 12.2 → 12.3 BLOCKING
|--------------------------------------------------------------------------
*/

const blocked12_3 =
    verifyDownstreamBlocked({
        upstream:
            telemetryError,

        downstream: null,

        upstreamLabel:
            "phase12_2",

        downstreamLabel:
            "phase12_3",
    });

equal(
    blocked12_3.blocked,
    true,
    "12.2 ERROR blocks downstream continuation"
);

equal(
    blocked12_3.upstreamStatus,
    "ERROR",
    "blocked 12.2 ERROR status is preserved"
);

equal(
    blocked12_3.reason,
    "VRM_SYNC_FAILED",
    "blocked 12.2 error reason remains inspectable"
);


const blockedUnavailable12_3 =
    verifyDownstreamBlocked({
        upstream:
            telemetryUnavailable,

        downstream:
            {
                phase:
                    "12.3",

                status:
                    "ERROR",

                executed:
                    false,
            },

        upstreamLabel:
            "phase12_2",

        downstreamLabel:
            "phase12_3",
    });

equal(
    blockedUnavailable12_3.blocked,
    true,
    "12.2 UNAVAILABLE cannot become successful 12.3 execution"
);

equal(
    blockedUnavailable12_3.upstreamStatus,
    "UNAVAILABLE",
    "12.2 UNAVAILABLE remains distinct from ERROR"
);


expectThrow(
    () =>
        verifyDownstreamBlocked({
            upstream:
                telemetryError,

            downstream:
                {
                    status:
                        "EXECUTED",

                    executed:
                        true,
                },

            upstreamLabel:
                "phase12_2",

            downstreamLabel:
                "phase12_3",
        }),

    "phase12_2 failure cannot become successful phase12_3",

    "synthetic successful 12.3 execution is rejected"
);


/*
|--------------------------------------------------------------------------
| 4. 12.3 → 12.4 BLOCKING
|--------------------------------------------------------------------------
*/

const reliabilityError =
    {
        phase:
            "12.3",

        status:
            "ERROR",

        executed:
            false,

        scope:
            "SITE",

        scopeIdentity:
            siteIdentity(),

        horizon:
            horizon(),

        error:
            {
                message:
                    "EVENT_DETECTOR_FAILED",
            },
    };


const blocked12_4 =
    verifyDownstreamBlocked({
        upstream:
            reliabilityError,

        downstream:
            {
                phase:
                    "12.4",

                status:
                    "ERROR",

                executed:
                    false,
            },

        upstreamLabel:
            "phase12_3",

        downstreamLabel:
            "phase12_4",
    });

equal(
    blocked12_4.blocked,
    true,
    "12.3 ERROR cannot manufacture Phase 12.4 Engineering success"
);

equal(
    blocked12_4.reason,
    "EVENT_DETECTOR_FAILED",
    "12.3 failure reason remains inspectable"
);


expectThrow(
    () =>
        verifyDownstreamBlocked({
            upstream:
                reliabilityError,

            downstream:
                {
                    status:
                        "INTEGRATED",

                    executed:
                        true,
                },

            upstreamLabel:
                "phase12_3",

            downstreamLabel:
                "phase12_4",
        }),

    "phase12_3 failure cannot become successful phase12_4",

    "12.4 Engineering success from failed 12.3 is rejected"
);


/*
|--------------------------------------------------------------------------
| 5. MISSING / UNAVAILABLE VALUES
|--------------------------------------------------------------------------
*/

const missingEvidence =
    verifyUnavailableValue({
        status:
            "MISSING",

        value:
            null,

        label:
            "engineering observation",
    });

equal(
    missingEvidence.status,
    "MISSING",
    "missing Engineering observation remains MISSING"
);

equal(
    missingEvidence.value,
    null,
    "missing Engineering observation remains null"
);


const unavailableEvidence =
    verifyUnavailableValue({
        status:
            "UNAVAILABLE",

        value:
            null,

        label:
            "engineering metric",
    });

equal(
    unavailableEvidence.status,
    "UNAVAILABLE",
    "UNAVAILABLE Engineering metric remains UNAVAILABLE"
);

equal(
    unavailableEvidence.value,
    null,
    "UNAVAILABLE Engineering metric remains null"
);


expectThrow(
    () =>
        verifyUnavailableValue({
            status:
                "MISSING",

            value:
                0,

            label:
                "engineering observation",
        }),

    "engineering observation MISSING must not be converted to zero",

    "missing observation cannot be synthesized as zero"
);


expectThrow(
    () =>
        verifyUnavailableValue({
            status:
                "UNAVAILABLE",

            value:
                0,

            label:
                "engineering metric",
        }),

    "engineering metric UNAVAILABLE must not be converted to zero",

    "UNAVAILABLE Engineering metric cannot be synthesized as zero"
);


const explicitZero =
    verifyUnavailableValue({
        status:
            "AVAILABLE",

        value:
            0,

        label:
            "qualified observation",
    });

equal(
    explicitZero.value,
    0,
    "explicit qualified numeric zero remains valid"
);


/*
|--------------------------------------------------------------------------
| 6. 12.5 FAILURE
|--------------------------------------------------------------------------
*/

const forecastingBridgeError =
    {
        phase:
            "12.5",

        status:
            "ERROR",

        executed:
            false,

        scope:
            "SITE",

        scopeIdentity:
            siteIdentity(),

        error:
            {
                message:
                    "FORECAST_INPUT_QUALIFICATION_FAILED",
            },
    };


const blockedForecastExecution =
    verifyDownstreamBlocked({
        upstream:
            forecastingBridgeError,

        downstream:
            {
                status:
                    "ERROR",

                executed:
                    false,
            },

        upstreamLabel:
            "phase12_5",

        downstreamLabel:
            "forecast_execution",
    });

equal(
    blockedForecastExecution.blocked,
    true,
    "12.5 ERROR blocks forecasting execution"
);

equal(
    blockedForecastExecution.reason,
    "FORECAST_INPUT_QUALIFICATION_FAILED",
    "12.5 error reason is preserved"
);


expectThrow(
    () =>
        verifyDownstreamBlocked({
            upstream:
                forecastingBridgeError,

            downstream:
                {
                    status:
                        "CALCULATED",

                    executed:
                        true,
                },

            upstreamLabel:
                "phase12_5",

            downstreamLabel:
                "forecast_execution",
        }),

    "phase12_5 failure cannot become successful forecast_execution",

    "12.5 ERROR cannot become CALCULATED forecast"
);


/*
|--------------------------------------------------------------------------
| 7. FORECAST → FINANCIAL/BI
|--------------------------------------------------------------------------
*/

const nonCalculatedForecast =
    {
        phase:
            "9.9",

        status:
            "UNAVAILABLE",

        executed:
            false,
    };


const forecastBoundary =
    verifyForecastFinancialBiFailureBoundary({
        forecastResult:
            nonCalculatedForecast,

        financialBiResult:
            {
                status:
                    "ERROR",

                executed:
                    false,
            },
    });

equal(
    forecastBoundary.blocked,
    true,
    "non-CALCULATED forecast is blocked from Financial/BI"
);

equal(
    forecastBoundary.forecastStatus,
    "UNAVAILABLE",
    "forecast UNAVAILABLE state is preserved"
);


expectThrow(
    () =>
        verifyForecastFinancialBiFailureBoundary({
            forecastResult:
                nonCalculatedForecast,

            financialBiResult:
                {
                    status:
                        "QUALIFIED",

                    executed:
                        true,
                },
        }),

    "non-CALCULATED forecast cannot become successful Financial/BI evidence",

    "unavailable forecast cannot manufacture successful Financial/BI evidence"
);


expectThrow(
    () =>
        verifyUnavailableValue({
            status:
                "UNAVAILABLE",

            value:
                0,

            label:
                "forecast value",
        }),

    "forecast value UNAVAILABLE must not be converted to zero",

    "unavailable forecast value cannot become zero"
);


/*
|--------------------------------------------------------------------------
| 8. 12.6 FAILURE
|--------------------------------------------------------------------------
*/

const financialBridgeError =
    {
        phase:
            "12.6",

        status:
            "ERROR",

        executed:
            false,

        scope:
            "SITE",

        scopeIdentity:
            siteIdentity(),

        reportingWindow:
            {
                start:
                    START,

                end:
                    END,

                semantics:
                    "[start,end)",
            },

        error:
            {
                message:
                    "FINANCIAL_INPUT_QUALIFICATION_FAILED",
            },
    };


const blockedFinancial =
    verifyDownstreamBlocked({
        upstream:
            financialBridgeError,

        downstream:
            {
                status:
                    "ERROR",

                executed:
                    false,
            },

        upstreamLabel:
            "phase12_6",

        downstreamLabel:
            "financial_bi",
    });

equal(
    blockedFinancial.blocked,
    true,
    "12.6 ERROR cannot become successful Financial/BI evidence"
);

equal(
    blockedFinancial.reason,
    "FINANCIAL_INPUT_QUALIFICATION_FAILED",
    "12.6 failure reason is preserved"
);


/*
|--------------------------------------------------------------------------
| 9. FINANCIAL/BI → OPTIMIZATION/DSS
|--------------------------------------------------------------------------
*/

const unavailableFinancialEvidence =
    {
        phase:
            "10.7",

        status:
            "UNAVAILABLE",

        executed:
            false,

        scope:
            "SITE",

        scopeIdentity:
            siteIdentity(),

        reportingWindow:
            {
                start:
                    START,

                end:
                    END,

                semantics:
                    "[start,end)",
            },

        reason:
            "SOURCE_UNAVAILABLE",
    };


const optimizationBoundary =
    verifyFinancialBiOptimizationFailureBoundary({
        financialBiEvidence:
            unavailableFinancialEvidence,

        optimizationResult:
            {
                status:
                    "ERROR",

                executed:
                    false,
            },
    });

equal(
    optimizationBoundary.blocked,
    true,
    "UNAVAILABLE Financial/BI evidence is blocked from Optimization/DSS"
);

equal(
    optimizationBoundary.financialBiStatus,
    "UNAVAILABLE",
    "Financial/BI UNAVAILABLE state is preserved"
);


expectThrow(
    () =>
        verifyFinancialBiOptimizationFailureBoundary({
            financialBiEvidence:
                unavailableFinancialEvidence,

            optimizationResult:
                {
                    status:
                        "GENERATED",

                    executed:
                        true,
                },
        }),

    "unavailable Financial/BI evidence cannot become successful Optimization/DSS result",

    "unavailable Financial/BI evidence cannot manufacture a DSS recommendation"
);


/*
|--------------------------------------------------------------------------
| 10. 12.7 ERROR
|--------------------------------------------------------------------------
*/

const optimizationBridgeError =
    {
        phase:
            "12.7",

        status:
            "ERROR",

        executed:
            false,

        scope:
            "SITE",

        scopeIdentity:
            siteIdentity(),

        error:
            {
                message:
                    "OPTIMIZATION_INPUT_QUALIFICATION_FAILED",
            },
    };


const blockedRecommendation =
    verifyDownstreamBlocked({
        upstream:
            optimizationBridgeError,

        downstream:
            {
                status:
                    "ERROR",

                executed:
                    false,
            },

        upstreamLabel:
            "phase12_7",

        downstreamLabel:
            "optimization_recommendation",
    });

equal(
    blockedRecommendation.blocked,
    true,
    "12.7 ERROR cannot become an Optimization/DSS recommendation"
);

equal(
    blockedRecommendation.reason,
    "OPTIMIZATION_INPUT_QUALIFICATION_FAILED",
    "12.7 error reason remains inspectable"
);


/*
|--------------------------------------------------------------------------
| 11. API STATUS SEPARATION
|--------------------------------------------------------------------------
*/

const apiNotFound =
    verifyApiStatusSeparation({
        status:
            "NOT_FOUND",

        httpStatus:
            404,
    });

equal(
    apiNotFound.httpStatus,
    404,
    "NOT_FOUND maps to HTTP 404"
);

equal(
    apiNotFound.status,
    "NOT_FOUND",
    "NOT_FOUND remains distinct"
);


const apiInvalid =
    verifyApiStatusSeparation({
        status:
            "INVALID_REQUEST",

        httpStatus:
            400,
    });

equal(
    apiInvalid.httpStatus,
    400,
    "INVALID_REQUEST maps to HTTP 400"
);

equal(
    apiInvalid.status,
    "INVALID_REQUEST",
    "INVALID_REQUEST remains distinct"
);


const apiUnavailable =
    verifyApiStatusSeparation({
        status:
            "UNAVAILABLE",

        httpStatus:
            503,
    });

equal(
    apiUnavailable.httpStatus,
    503,
    "UNAVAILABLE maps to HTTP 503"
);

equal(
    apiUnavailable.status,
    "UNAVAILABLE",
    "UNAVAILABLE remains distinct"
);


ok(
    apiNotFound.httpStatus !==
        apiUnavailable.httpStatus,
    "HTTP 404 remains distinct from HTTP 503"
);

ok(
    apiInvalid.httpStatus !==
        apiUnavailable.httpStatus,
    "HTTP 400 remains distinct from HTTP 503"
);


expectThrow(
    () =>
        verifyApiStatusSeparation({
            status:
                "NOT_FOUND",

            httpStatus:
                503,
        }),

    "NOT_FOUND must map to HTTP 404",

    "NOT_FOUND cannot be collapsed into UNAVAILABLE/503"
);


expectThrow(
    () =>
        verifyApiStatusSeparation({
            status:
                "UNAVAILABLE",

            httpStatus:
                404,
        }),

    "UNAVAILABLE must map to HTTP 503",

    "UNAVAILABLE cannot be collapsed into NOT_FOUND/404"
);


/*
|--------------------------------------------------------------------------
| 12. FAILURE WINDOW PRESERVATION
|--------------------------------------------------------------------------
*/

const failureWindow =
    verifyFailureWindowPreservation({
        upstream:
            telemetryError,

        downstream:
            {
                status:
                    "ERROR",

                executed:
                    false,

                horizon:
                    horizon(),
            },

        windowField:
            "horizon",

        semanticsField:
            "interval",

        label:
            "12.2 failure horizon",
    });

equal(
    failureWindow.preserved,
    true,
    "failure path preserves reporting horizon"
);

equal(
    failureWindow.interval,
    "[start,end)",
    "failure path preserves [start,end)"
);


expectThrow(
    () =>
        verifyFailureWindowPreservation({
            upstream:
                telemetryError,

            downstream:
                {
                    horizon:
                        {
                            ...horizon(),

                            interval:
                                "[start,end]",
                        },
                },

            windowField:
                "horizon",

            semanticsField:
                "interval",

            label:
                "12.2 failure horizon",
        }),

    "12.2 failure horizon must preserve [start,end)",

    "failure path cannot change half-open semantics"
);


/*
|--------------------------------------------------------------------------
| 13. IDENTITY IS PRESERVED, NOT INFERRED
|--------------------------------------------------------------------------
*/

const preservedIdentity =
    verifyScopeIdentityNotInferred({
        upstream:
            telemetryError,

        downstream:
            {
                status:
                    "ERROR",

                executed:
                    false,

                scopeIdentity:
                    siteIdentity(),
            },

        label:
            "failure scope identity",
    });

equal(
    preservedIdentity.preserved,
    true,
    "failure path preserves explicit scope identity"
);

equal(
    preservedIdentity.inferred,
    false,
    "failure path does not infer scope identity"
);


const noIdentitySource =
    {
        status:
            "ERROR",

        executed:
            false,

        scopeIdentity:
            null,
    };


const noIdentityTarget =
    {
        status:
            "ERROR",

        executed:
            false,

        scopeIdentity:
            null,
    };


const nonInferredIdentity =
    verifyScopeIdentityNotInferred({
        upstream:
            noIdentitySource,

        downstream:
            noIdentityTarget,

        label:
            "missing failure identity",
    });

equal(
    nonInferredIdentity.inferred,
    false,
    "missing identity remains missing during failure propagation"
);


expectThrow(
    () =>
        verifyScopeIdentityNotInferred({
            upstream:
                noIdentitySource,

            downstream:
                {
                    status:
                        "ERROR",

                    executed:
                        false,

                    scopeIdentity:
                        {
                            vrmSiteId:
                                "SYNTHETIC-SITE",
                        },
                },

            label:
                "missing failure identity",
        }),

    "missing failure identity must not be inferred during failure propagation",

    "synthetic SITE identity during recovery is rejected"
);


/*
|--------------------------------------------------------------------------
| 14. FULL CROSS-LAYER SUMMARY
|--------------------------------------------------------------------------
*/

const summary =
    verifyCrossLayerErrorUnavailablePropagation({
        scenarios:
            [
                {
                    name:
                        "12.2_to_12.3",

                    upstream:
                        telemetryError,

                    downstream:
                        {
                            status:
                                "ERROR",

                            executed:
                                false,
                        },
                },

                {
                    name:
                        "12.3_to_12.4",

                    upstream:
                        reliabilityError,

                    downstream:
                        {
                            status:
                                "ERROR",

                            executed:
                                false,
                        },
                },

                {
                    name:
                        "12.5_to_forecasting",

                    upstream:
                        forecastingBridgeError,

                    downstream:
                        {
                            status:
                                "ERROR",

                            executed:
                                false,
                        },
                },

                {
                    name:
                        "12.6_to_financial_bi",

                    upstream:
                        financialBridgeError,

                    downstream:
                        {
                            status:
                                "UNAVAILABLE",

                            executed:
                                false,
                        },
                },

                {
                    name:
                        "12.7_to_optimization",

                    upstream:
                        optimizationBridgeError,

                    downstream:
                        {
                            status:
                                "ERROR",

                            executed:
                                false,
                        },
                },
            ],
    });

equal(
    summary.phase,
    "12.11",
    "summary phase is 12.11"
);

equal(
    summary.layer,
    "CROSS_LAYER_ERROR_UNAVAILABLE_PROPAGATION",
    "summary layer is correct"
);

equal(
    summary.status,
    CROSS_LAYER_ERROR_PROPAGATION_STATUS.VERIFIED,
    "full error/unavailable propagation verifies"
);

equal(
    summary.verified,
    true,
    "full propagation verified flag is true"
);

equal(
    summary.scenarioCount,
    5,
    "five cross-layer failure transitions are verified"
);

equal(
    summary.scenarios[0].blocked.blocked,
    true,
    "12.2 → 12.3 failure transition is blocked"
);

equal(
    summary.scenarios[1].blocked.blocked,
    true,
    "12.3 → 12.4 failure transition is blocked"
);

equal(
    summary.scenarios[2].blocked.blocked,
    true,
    "12.5 → Forecasting failure transition is blocked"
);

equal(
    summary.scenarios[3].blocked.blocked,
    true,
    "12.6 → Financial/BI failure transition is blocked"
);

equal(
    summary.scenarios[4].blocked.blocked,
    true,
    "12.7 → Optimization/DSS failure transition is blocked"
);


const badSummary =
    verifyCrossLayerErrorUnavailablePropagation({
        scenarios:
            [
                {
                    name:
                        "illegal_recovery",

                    upstream:
                        telemetryError,

                    downstream:
                        {
                            status:
                                "EXECUTED",

                            executed:
                                true,
                        },
                },
            ],
    });

equal(
    badSummary.status,
    CROSS_LAYER_ERROR_PROPAGATION_STATUS.ERROR,
    "illegal synthetic recovery produces verification ERROR"
);

equal(
    badSummary.verified,
    false,
    "illegal synthetic recovery is not verified"
);

equal(
    badSummary.error.message,
    "illegal_recovery.upstream failure cannot become successful illegal_recovery.downstream",
    "illegal recovery error reason is explicit"
);


console.log(
    "\n================================================"
);

console.log(
    `Assertions passed: ${passed}`
);

console.log(
    "================================================"
);

console.log(
    "ASHMAAN PHASE 12.11 CROSS-LAYER ERROR / UNAVAILABLE PROPAGATION PASSED"
);

console.log(
    "================================================\n"
);