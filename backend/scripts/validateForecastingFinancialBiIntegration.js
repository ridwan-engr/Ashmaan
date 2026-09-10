// scripts/validateForecastingFinancialBiIntegration.js

import assert from "node:assert/strict";

import {
    FORECASTING_FINANCIAL_BI_INTEGRATION_PHASE,
    FORECASTING_FINANCIAL_BI_INTEGRATION_LAYER,
    FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_PHASE,
    FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_LAYER,
    FORECASTING_FINANCIAL_BI_INTEGRATION_TARGET_PHASE,
    FORECASTING_FINANCIAL_BI_INTEGRATION_TARGET_LAYER,
    FORECASTING_FINANCIAL_BI_INTEGRATION_INTERVAL,
    FORECASTING_FINANCIAL_BI_INTEGRATION_STATUS,
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES,
    validateForecastProductionResult,
    validateForecastFinancialBiRequest,
    qualifyForecastingFinancialBiIntegration,
    executeForecastingFinancialBiIntegration,
} from "../services/integration/forecastingFinancialBiIntegrationService.js";

import {
    FORECAST_PRODUCTION_EXECUTION_PHASE,
    FORECAST_PRODUCTION_EXECUTION_LAYER,
    FORECAST_PRODUCTION_EXECUTION_STATUS,
} from "../services/forecasting/forecastProductionExecutionService.js";

import {
    FORECAST_OUTPUT_TYPE,
} from "../services/forecasting/forecastingContract.js";

import {
    FINANCIAL_BI_PHASE,
    FINANCIAL_BI_LAYER,
    FINANCIAL_BI_REPORTING_SEMANTICS,
    FINANCIAL_BI_SOURCE_KIND,
    FINANCIAL_BI_SCOPE,
} from "../services/financialBi/financialBiContract.js";

import {
    FINANCIAL_BI_INPUT_QUALIFICATION_PHASE,
    FINANCIAL_BI_INPUT_QUALIFICATION_LAYER,
} from "../services/financialBi/financialBiInputQualificationService.js";


console.log(`
================================================
ASHMAAN PHASE 12.6 FORECASTING → FINANCIAL/BI INTEGRATION
================================================
`);


let assertionsPassed = 0;

function pass(
    description
) {
    assertionsPassed += 1;

    console.log(
        `PASS ${assertionsPassed}: ${description}`
    );
}


function check(
    condition,
    description
) {
    assert.ok(
        condition,
        description
    );

    pass(
        description
    );
}


function equal(
    actual,
    expected,
    description
) {
    assert.equal(
        actual,
        expected,
        description
    );

    pass(
        description
    );
}


function same(
    actual,
    expected,
    description
) {
    assert.strictEqual(
        actual,
        expected,
        description
    );

    pass(
        description
    );
}


function throws(
    callback,
    description
) {
    assert.throws(
        callback
    );

    pass(
        description
    );
}


function clone(
    value
) {
    return structuredClone(
        value
    );
}


/*
|--------------------------------------------------------------------------
| Canonical Phase 9.9-shaped fixture
|--------------------------------------------------------------------------
|
| Phase 9.9 returns forecast.values as POINT OBJECTS:
|
| {
|   timestamp,
|   value,
|   unit,
|   provenance
| }
|
|--------------------------------------------------------------------------
*/

const forecastOrigin =
    "2026-09-10T12:00:00.000Z";

const forecastEnd =
    "2026-09-10T15:00:00.000Z";

const forecastTimestamps =
    Object.freeze([
        "2026-09-10T12:00:00.000Z",
        "2026-09-10T13:00:00.000Z",
        "2026-09-10T14:00:00.000Z",
    ]);

const canonicalForecastPoints =
    Object.freeze([
        Object.freeze({
            timestamp:
                forecastTimestamps[0],

            value:
                25,

            unit:
                "kW",

            provenance:
                Object.freeze({
                    modelFamily:
                        "NAIVE",

                    strategy:
                        "LAST_OBSERVED_VALUE",

                    sourceTimestamp:
                        "2026-09-10T11:00:00.000Z",
                }),
        }),

        Object.freeze({
            timestamp:
                forecastTimestamps[1],

            value:
                0,

            unit:
                "kW",

            provenance:
                Object.freeze({
                    modelFamily:
                        "NAIVE",

                    strategy:
                        "LAST_OBSERVED_VALUE",

                    sourceTimestamp:
                        "2026-09-10T11:00:00.000Z",
                }),
        }),

        Object.freeze({
            timestamp:
                forecastTimestamps[2],

            value:
                30,

            unit:
                "kW",

            provenance:
                Object.freeze({
                    modelFamily:
                        "NAIVE",

                    strategy:
                        "LAST_OBSERVED_VALUE",

                    sourceTimestamp:
                        "2026-09-10T11:00:00.000Z",
                }),
        }),
    ]);


function makeForecastResult(
    overrides = {}
) {
    const base =
    {
        phase:
            FORECAST_PRODUCTION_EXECUTION_PHASE,

        layer:
            FORECAST_PRODUCTION_EXECUTION_LAYER,

        upstreamPhase:
            "9.8",

        productionContract:
        {
            phase:
                "9.8",

            target:
            {
                family:
                    "SITE_LOAD",

                metric:
                    "SITE_LOAD_POWER",

                kind:
                    "NUMERIC",

                unit:
                    "kW",

                vrmSiteId:
                    "vrm-site-12-6",

                installationId:
                    "installation-12-6",
            },

            productionWindow:
            {
                forecastOrigin,

                forecastEnd,

                timezone:
                    "UTC",

                semantics:
                    "[start,end)",
            },

            requestedOutputType:
                FORECAST_OUTPUT_TYPE.POINT,
        },

        status:
            FORECAST_PRODUCTION_EXECUTION_STATUS.CALCULATED,

        reason:
            "NAIVE_POINT_FORECAST_CALCULATED",

        forecastTimestamps:
            [...forecastTimestamps],

        forecast:
        {
            outputType:
                FORECAST_OUTPUT_TYPE.POINT,

            values:
                canonicalForecastPoints.map(
                    (
                        point
                    ) => ({
                        ...point,

                        provenance:
                        {
                            ...point.provenance,
                        },
                    })
                ),

            intervals:
                null,

            probabilities:
                null,

            states:
                null,
        },
    };

    return {
        ...base,
        ...overrides,
    };
}


function makeFinancialBiRequest(
    overrides = {}
) {
    return {
        metricName:
            "FORECAST_SITE_LOAD_POWER",

        kind:
            "POWER",

        valueKind:
            "NUMERIC",

        scope:
            FINANCIAL_BI_SCOPE.SITE,

        currency:
            null,

        ...overrides,
    };
}


/*
|--------------------------------------------------------------------------
| A. Contract identity
|--------------------------------------------------------------------------
*/

equal(
    FORECASTING_FINANCIAL_BI_INTEGRATION_PHASE,
    "12.6",
    "integration phase is 12.6"
);

equal(
    FORECASTING_FINANCIAL_BI_INTEGRATION_LAYER,
    "FORECASTING_FINANCIAL_BI_INTEGRATION",
    "integration layer is explicit"
);

equal(
    FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_PHASE,
    FORECAST_PRODUCTION_EXECUTION_PHASE,
    "Phase 9.9 production execution is the upstream phase"
);

equal(
    FORECASTING_FINANCIAL_BI_INTEGRATION_UPSTREAM_LAYER,
    FORECAST_PRODUCTION_EXECUTION_LAYER,
    "Forecasting is the explicit upstream layer"
);

equal(
    FORECASTING_FINANCIAL_BI_INTEGRATION_TARGET_PHASE,
    FINANCIAL_BI_INPUT_QUALIFICATION_PHASE,
    "existing Phase 10 input qualification is the downstream target"
);

equal(
    FORECASTING_FINANCIAL_BI_INTEGRATION_TARGET_LAYER,
    FINANCIAL_BI_INPUT_QUALIFICATION_LAYER,
    "existing Financial/BI input qualification layer is preserved"
);

equal(
    FORECASTING_FINANCIAL_BI_INTEGRATION_INTERVAL,
    FINANCIAL_BI_REPORTING_SEMANTICS,
    "half-open interval semantics are preserved"
);


/*
|--------------------------------------------------------------------------
| B. Architectural boundaries
|--------------------------------------------------------------------------
*/

check(
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .usesExistingForecastProductionExecution ===
    true &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .usesExistingFinancialBiContract ===
    true &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .usesExistingFinancialBiInputQualification ===
    true,
    "12.6 delegates to existing Forecasting and Financial/BI boundaries"
);

check(
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .createsParallelForecastEngine ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .createsParallelFinancialBiQualification ===
    false,
    "12.6 creates no parallel Forecasting or Financial/BI qualification engine"
);

check(
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .forecastExecutionIncluded ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .forecastPersistenceIncluded ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .forecastApiReadIncluded ===
    false,
    "12.6 does not execute, persist, or API-read forecasts"
);

check(
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .financialBiCalculationIncluded ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .financialBiAggregationIncluded ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .financialBiPersistenceIncluded ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .financialBiApiIncluded ===
    false,
    "12.6 stops at Financial/BI input qualification"
);

check(
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .timestampInferenceAllowed ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .unitInferenceAllowed ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .currencyInferenceAllowed ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .currencyConversionAllowed ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .tariffInferenceAllowed ===
    false,
    "timestamp, unit, currency, and tariff inference remain blocked"
);

check(
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .resamplingAllowed ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .interpolationAllowed ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .duplicateMergeAllowed ===
    false,
    "resampling, interpolation, and duplicate merging remain blocked"
);

check(
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .missingMeansZero ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .unavailableMeansZero ===
    false &&
    FORECASTING_FINANCIAL_BI_INTEGRATION_BOUNDARIES
        .invalidMeansZero ===
    false,
    "missing, unavailable, and invalid values remain distinct from zero"
);


/*
|--------------------------------------------------------------------------
| C. Phase 9.9 validation
|--------------------------------------------------------------------------
*/

const canonicalForecast =
    makeForecastResult();

const validatedForecast =
    validateForecastProductionResult(
        canonicalForecast
    );

same(
    validatedForecast.forecastResult,
    canonicalForecast,
    "validated Phase 9.9 evidence is preserved by reference"
);

same(
    validatedForecast.forecastValues,
    canonicalForecast.forecast.values,
    "Phase 9.9 forecast point array is preserved by reference"
);

equal(
    validatedForecast.vrmSiteId,
    "vrm-site-12-6",
    "SITE identity is read from the forecast target"
);

equal(
    validatedForecast.installationId,
    "installation-12-6",
    "installation identity is preserved"
);

equal(
    validatedForecast.unit,
    "kW",
    "forecast target unit remains explicit"
);

throws(
    () =>
        validateForecastProductionResult(
            null
        ),
    "missing Phase 9.9 forecast evidence is rejected"
);

throws(
    () =>
        validateForecastProductionResult({
            ...makeForecastResult(),

            phase:
                "9.8",
        }),
    "wrong forecast production phase is rejected"
);

throws(
    () =>
        validateForecastProductionResult({
            ...makeForecastResult(),

            layer:
                "ENGINEERING_ANALYTICS",
        }),
    "wrong upstream layer is rejected"
);

throws(
    () =>
        validateForecastProductionResult({
            ...makeForecastResult(),

            status:
                "UNAVAILABLE",
        }),
    "non-CALCULATED production forecast is rejected"
);

throws(
    () =>
        validateForecastProductionResult({
            ...makeForecastResult(),

            forecast:
            {
                ...makeForecastResult().forecast,

                outputType:
                    "INTERVAL",
            },
        }),
    "non-POINT production forecast is rejected"
);

throws(
    () => {
        const fixture =
            makeForecastResult();

        fixture.forecast.values =
            fixture.forecast.values.slice(
                0,
                2
            );

        validateForecastProductionResult(
            fixture
        );
    },
    "forecast timestamp/value cardinality mismatch is rejected"
);

throws(
    () => {
        const fixture =
            makeForecastResult();

        fixture.forecast.values[0] =
            25;

        validateForecastProductionResult(
            fixture
        );
    },
    "raw scalar forecast value is rejected because Phase 9.9 emits point objects"
);

throws(
    () => {
        const fixture =
            makeForecastResult();

        fixture.forecast.values[0] =
        {
            ...fixture.forecast.values[0],

            value:
                Number.NaN,
        };

        validateForecastProductionResult(
            fixture
        );
    },
    "non-finite Phase 9.9 forecast point is rejected"
);

throws(
    () => {
        const fixture =
            makeForecastResult();

        fixture.forecast.values[1] =
        {
            ...fixture.forecast.values[1],

            timestamp:
                "2026-09-10T13:30:00.000Z",
        };

        validateForecastProductionResult(
            fixture
        );
    },
    "forecast point timestamp must match the explicit Phase 9.9 timestamp"
);


/*
|--------------------------------------------------------------------------
| D. Financial/BI request validation
|--------------------------------------------------------------------------
*/

const request =
    makeFinancialBiRequest();

const validatedRequest =
    validateForecastFinancialBiRequest(
        request
    );

equal(
    validatedRequest.metricName,
    request.metricName,
    "Financial/BI metric name validates"
);

equal(
    validatedRequest.scope,
    FINANCIAL_BI_SCOPE.SITE,
    "Financial/BI SITE scope validates"
);

throws(
    () =>
        validateForecastFinancialBiRequest(
            null
        ),
    "missing Financial/BI request is rejected"
);

throws(
    () =>
        validateForecastFinancialBiRequest({
            ...request,

            metricName:
                "",
        }),
    "missing Financial/BI metric name is rejected"
);


/*
|--------------------------------------------------------------------------
| E. Qualification
|--------------------------------------------------------------------------
*/

const qualified =
    qualifyForecastingFinancialBiIntegration({
        forecastResult:
            canonicalForecast,

        financialBiRequest:
            request,
    });

equal(
    qualified.phase,
    "12.6",
    "Forecasting evidence qualifies for Phase 12.6 orchestration"
);

equal(
    qualified.status,
    FORECASTING_FINANCIAL_BI_INTEGRATION_STATUS.QUALIFIED,
    "qualified integration has explicit QUALIFIED status"
);

equal(
    qualified.executed,
    false,
    "qualification does not execute Financial/BI"
);

equal(
    qualified.scopeIdentity.vrmSiteId,
    "vrm-site-12-6",
    "SITE identity propagates into qualified integration"
);

equal(
    qualified.scopeIdentity.installationId,
    "installation-12-6",
    "installation identity propagates into qualified integration"
);

same(
    qualified.forecastResult,
    canonicalForecast,
    "qualification preserves original Phase 9.9 result by reference"
);

same(
    qualified.forecastValues,
    canonicalForecast.forecast.values,
    "qualification does not clone or rewrite forecast points"
);


/*
|--------------------------------------------------------------------------
| F. Real Phase 10.1 → 10.2 execution
|--------------------------------------------------------------------------
*/

const executed =
    executeForecastingFinancialBiIntegration({
        qualifiedIntegration:
            qualified,
    });

equal(
    executed.status,
    FORECASTING_FINANCIAL_BI_INTEGRATION_STATUS.EXECUTED,
    "Phase 12.6 executes successfully"
);

equal(
    executed.executed,
    true,
    "successful integration is marked executed"
);

check(
    executed.reportingWindow.start instanceof Date &&
    executed.reportingWindow.start.toISOString() ===
    forecastOrigin,
    "Financial/BI reporting window starts at forecastOrigin"
);

check(
    executed.reportingWindow.end instanceof Date &&
    executed.reportingWindow.end.toISOString() ===
    forecastEnd,
    "Financial/BI reporting window ends at forecastEnd"
);

equal(
    executed.reportingWindow.semantics,
    "[start,end)",
    "Financial/BI reporting window preserves [start,end)"
);

equal(
    executed.contract.phase,
    FINANCIAL_BI_PHASE,
    "real Phase 10.1 Financial/BI contract is created"
);

equal(
    executed.contract.layer,
    FINANCIAL_BI_LAYER,
    "real Phase 10.1 Financial/BI layer is reached"
);

equal(
    executed.qualification.phase,
    FINANCIAL_BI_INPUT_QUALIFICATION_PHASE,
    "real Phase 10.2 input qualification is reached"
);

equal(
    executed.qualification.layer,
    FINANCIAL_BI_INPUT_QUALIFICATION_LAYER,
    "real Phase 10.2 qualification layer is preserved"
);

equal(
    executed.observations.length,
    canonicalForecast.forecast.values.length,
    "each Phase 9.9 point maps to exactly one Financial/BI observation"
);

equal(
    executed.observations[0].timestamp,
    canonicalForecast.forecast.values[0].timestamp,
    "forecast timestamp is projected without inference"
);

equal(
    executed.observations[0].value,
    canonicalForecast.forecast.values[0].value,
    "forecast numeric value is projected from the Phase 9.9 point object"
);

equal(
    executed.observations[0].unit,
    canonicalForecast.forecast.values[0].unit,
    "forecast point unit is preserved rather than overwritten"
);

equal(
    executed.observations[0].sourceKind,
    FINANCIAL_BI_SOURCE_KIND.FORECAST,
    "Financial/BI source kind is explicitly FORECAST"
);

equal(
    executed.observations[1].value,
    0,
    "explicit forecast zero remains numeric zero"
);


/*
|--------------------------------------------------------------------------
| G. No source mutation
|--------------------------------------------------------------------------
*/

const beforeMutationCheck =
    JSON.stringify(
        canonicalForecast
    );

executeForecastingFinancialBiIntegration({
    qualifiedIntegration:
        qualified,
});

equal(
    JSON.stringify(
        canonicalForecast
    ),
    beforeMutationCheck,
    "12.6 does not mutate the Phase 9.9 production result"
);


/*
|--------------------------------------------------------------------------
| H. Real Phase 10.2 qualification semantics
|--------------------------------------------------------------------------
|
| These tests alter the point evidence only where 12.6 is allowed to
| pass evidence to Phase 10.2.
|
|--------------------------------------------------------------------------
*/

const unitMismatchForecast =
    makeForecastResult();

unitMismatchForecast.forecast.values[1] =
{
    ...unitMismatchForecast.forecast.values[1],

    unit:
        "W",
};

const unitMismatchQualified =
    qualifyForecastingFinancialBiIntegration({
        forecastResult:
            unitMismatchForecast,

        financialBiRequest:
            makeFinancialBiRequest(),
    });

const unitMismatchExecution =
    executeForecastingFinancialBiIntegration({
        qualifiedIntegration:
            unitMismatchQualified,
    });

equal(
    unitMismatchExecution.observations[1].unit,
    "W",
    "12.6 preserves a mismatched forecast-point unit for Phase 10.2"
);

check(
    unitMismatchExecution.qualification
        .invalidObservations
        .some(
            (
                record
            ) =>
                record.status ===
                "UNIT_MISMATCH"
        ),
    "real Phase 10.2 detects forecast unit mismatch"
);


const duplicateForecast =
    makeForecastResult();

duplicateForecast.forecastTimestamps[2] =
    duplicateForecast.forecastTimestamps[1];

duplicateForecast.forecast.values[2] =
{
    ...duplicateForecast.forecast.values[2],

    timestamp:
        duplicateForecast.forecastTimestamps[1],
};

const duplicateQualified =
    qualifyForecastingFinancialBiIntegration({
        forecastResult:
            duplicateForecast,

        financialBiRequest:
            makeFinancialBiRequest(),
    });

const duplicateExecution =
    executeForecastingFinancialBiIntegration({
        qualifiedIntegration:
            duplicateQualified,
    });

check(
    duplicateExecution.qualification
        .invalidObservations
        .some(
            (
                record
            ) =>
                record.status ===
                "DUPLICATE_TIMESTAMP"
        ),
    "duplicate forecast timestamps remain explicit in Phase 10.2"
);

/*
|--------------------------------------------------------------------------
| I. Half-open Financial/BI window
|--------------------------------------------------------------------------
*/

const endBoundaryForecast =
    makeForecastResult();

endBoundaryForecast.forecastTimestamps[2] =
    forecastEnd;

endBoundaryForecast.forecast.values[2] =
{
    ...endBoundaryForecast.forecast.values[2],

    timestamp:
        forecastEnd,
};

const endBoundaryQualified =
    qualifyForecastingFinancialBiIntegration({
        forecastResult:
            endBoundaryForecast,

        financialBiRequest:
            makeFinancialBiRequest(),
    });

const endBoundaryExecution =
    executeForecastingFinancialBiIntegration({
        qualifiedIntegration:
            endBoundaryQualified,
    });

check(
    endBoundaryExecution.qualification
        .invalidObservations
        .some(
            (
                record
            ) =>
                record.status ===
                "OUTSIDE_REPORTING_WINDOW"
        ),
    "timestamp exactly at reporting end is excluded by [start,end)"
);


/*
|--------------------------------------------------------------------------
| J. Explicit downstream failure propagation
|--------------------------------------------------------------------------
*/

const failingQualified =
    qualifyForecastingFinancialBiIntegration({
        forecastResult:
            makeForecastResult(),

        financialBiRequest:
            makeFinancialBiRequest(),

        inputQualifier:
            () => {
                throw new Error(
                    "CONTROLLED_PHASE_10_2_FAILURE"
                );
            },
    });

const failureResult =
    executeForecastingFinancialBiIntegration({
        qualifiedIntegration:
            failingQualified,
    });

equal(
    failureResult.status,
    FORECASTING_FINANCIAL_BI_INTEGRATION_STATUS.ERROR,
    "Phase 10.2 execution failure becomes explicit 12.6 ERROR"
);

equal(
    failureResult.executed,
    false,
    "ERROR result is not marked executed"
);

equal(
    failureResult.error.message,
    "CONTROLLED_PHASE_10_2_FAILURE",
    "downstream error evidence is preserved"
);

equal(
    failureResult.scopeIdentity.vrmSiteId,
    "vrm-site-12-6",
    "ERROR propagation preserves SITE identity"
);

same(
    failureResult.forecastResult,
    failingQualified.forecastResult,
    "ERROR propagation preserves original forecast evidence"
);


/*
|--------------------------------------------------------------------------
| K. Execution guard
|--------------------------------------------------------------------------
*/

throws(
    () =>
        executeForecastingFinancialBiIntegration({
            qualifiedIntegration:
                null,
        }),
    "execution rejects missing qualified integration"
);

throws(
    () =>
        executeForecastingFinancialBiIntegration({
            qualifiedIntegration:
            {
                ...qualified,

                status:
                    "EXECUTED",
            },
        }),
    "execution rejects an object that is not in QUALIFIED state"
);


/*
|--------------------------------------------------------------------------
| Final assertion-plan guard
|--------------------------------------------------------------------------
*/

equal(
    assertionsPassed + 1,
    67,
    "12.6 assertion plan completed exactly"
);


console.log(`
Assertions passed: ${assertionsPassed}
================================================
ASHMAAN PHASE 12.6 FORECASTING → FINANCIAL/BI INTEGRATION PASSED
================================================
`);