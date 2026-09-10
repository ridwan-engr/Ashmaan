// scripts/validateEngineeringAnalyticsForecastingIntegration.js

import assert from "node:assert/strict";

import {
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
} from "../services/integration/engineeringAnalyticsForecastingIntegrationService.js";


let checks = 0;


function pass(
    message
) {
    checks += 1;

    console.log(
        `PASS ${checks}: ${message}`
    );
}


function expectThrow(
    fn,
    pattern,
    message
) {
    assert.throws(
        fn,
        pattern
    );

    pass(
        message
    );
}


console.log("");
console.log(
    "================================================"
);
console.log(
    "ASHMAAN PHASE 12.5 ENGINEERING ANALYTICS → FORECASTING INTEGRATION"
);
console.log(
    "================================================"
);
console.log("");


/*
|--------------------------------------------------------------------------
| Contract identity
|--------------------------------------------------------------------------
*/

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_PHASE,
    "12.5"
);

pass(
    "integration phase is 12.5"
);


assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_LAYER,
    "ENGINEERING_ANALYTICS_FORECASTING_INTEGRATION"
);

pass(
    "integration layer is explicit"
);


assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_UPSTREAM_LAYER,
    "ENGINEERING_ANALYTICS"
);

pass(
    "Engineering Analytics is the explicit upstream layer"
);


assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_TARGET_PHASE,
    "9.2"
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_TARGET_LAYER,
    "FORECASTING"
);

pass(
    "existing Phase 9.2 qualification is the downstream target"
);


assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_INTERVAL,
    "[start,end)"
);

pass(
    "half-open interval semantics are preserved"
);


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .usesExistingForecastingContract,
    true
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .usesExistingForecastInputQualification,
    true
);

pass(
    "12.5 delegates to existing Phase 9 contract and input qualification"
);


assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .createsParallelForecastQualification,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .createsParallelEngineeringAnalytics,
    false
);

pass(
    "12.5 creates no parallel forecasting or engineering analytics engine"
);


assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .aggregateMetricConvertedToObservation,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .observationTimestampInferred,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .observationUnitInferred,
    false
);

pass(
    "aggregate metrics are not converted into invented forecast observations"
);


assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .missingMeansZero,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .unavailableMeansZero,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .invalidObservationMeansZero,
    false
);

pass(
    "missing, unavailable, and invalid observations remain distinct from zero"
);


assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .resamplingAllowed,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .interpolationAllowed,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .duplicateTimestampsAutomaticallyMerged,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .outlierRemovalAllowed,
    false
);

pass(
    "resampling, interpolation, duplicate merging, and silent outlier removal remain blocked"
);


assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .futureDataAllowedInTraining,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .trainingForecastOverlapAllowed,
    false
);

pass(
    "future leakage and training/forecast overlap remain blocked"
);


assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .engineeringAnalyticsMutated,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .sourceObservationsMutated,
    false
);

pass(
    "Engineering Analytics evidence and source observations remain immutable"
);


assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .modelTrainingIncluded,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .forecastCalculationIncluded,
    false
);

assert.equal(
    ENGINEERING_FORECASTING_INTEGRATION_BOUNDARIES
        .forecastPersistenceIncluded,
    false
);

pass(
    "12.5 performs no model training, forecast calculation, or persistence"
);


/*
|--------------------------------------------------------------------------
| Canonical Engineering Analytics evidence
|--------------------------------------------------------------------------
*/

const observations =
    Object.freeze([
        Object.freeze({
            timestamp:
                "2026-09-10T00:00:00.000Z",

            value:
                12,

            unit:
                "kW",
        }),

        Object.freeze({
            timestamp:
                "2026-09-10T00:15:00.000Z",

            value:
                0,

            unit:
                "kW",
        }),

        Object.freeze({
            timestamp:
                "2026-09-10T00:30:00.000Z",

            value:
                18,

            unit:
                "kW",
        }),

        Object.freeze({
            timestamp:
                "2026-09-10T00:45:00.000Z",

            value:
                21,

            unit:
                "kW",
        }),
    ]);


const engineeringEvidence =
    Object.freeze({
        phase:
            "8.TEST",

        layer:
            "ENGINEERING_ANALYTICS",

        scope:
            "SITE",

        scopeIdentity:
            Object.freeze({
                vrmSiteId:
                    "VRM-12-5-TEST",

                installationId:
                    "installation-12-5",
            }),

        family:
            "SITE_LOAD",

        metric:
            "servedLoadPower",

        observations,

        status:
            "CALCULATED",

        reason:
            null,
    });


const forecastRequest =
    Object.freeze({
        trainingStart:
            "2026-09-10T00:00:00.000Z",

        forecastOrigin:
            "2026-09-10T01:00:00.000Z",

        forecastEnd:
            "2026-09-10T02:00:00.000Z",

        timezone:
            "UTC",

        target:
            Object.freeze({
                family:
                    "SITE_LOAD",

                metric:
                    "servedLoadPower",

                kind:
                    "NUMERIC",

                unit:
                    "kW",
            }),
    });


/*
|--------------------------------------------------------------------------
| Evidence validation
|--------------------------------------------------------------------------
*/

const evidenceValidation =
    validateEngineeringForecastEvidence(
        engineeringEvidence
    );


assert.equal(
    evidenceValidation.vrmSiteId,
    "VRM-12-5-TEST"
);

assert.equal(
    evidenceValidation.installationId,
    "installation-12-5"
);

pass(
    "SITE-scoped Engineering Analytics evidence validates"
);


assert.strictEqual(
    evidenceValidation.engineeringEvidence,
    engineeringEvidence
);

assert.strictEqual(
    evidenceValidation.observations,
    observations
);

pass(
    "Engineering Analytics evidence and observations are preserved by reference"
);


/*
|--------------------------------------------------------------------------
| Forecast request validation
|--------------------------------------------------------------------------
*/

const requestValidation =
    validateEngineeringForecastRequest(
        forecastRequest
    );


assert.equal(
    requestValidation.trainingStart
        .toISOString(),
    "2026-09-10T00:00:00.000Z"
);

assert.equal(
    requestValidation.forecastOrigin
        .toISOString(),
    "2026-09-10T01:00:00.000Z"
);

assert.equal(
    requestValidation.forecastEnd
        .toISOString(),
    "2026-09-10T02:00:00.000Z"
);

pass(
    "forecast training and horizon boundaries validate"
);


/*
|--------------------------------------------------------------------------
| Qualification
|--------------------------------------------------------------------------
*/

const qualified =
    qualifyEngineeringAnalyticsForecastingIntegration({
        engineeringEvidence,

        forecastRequest,
    });


assert.equal(
    qualified.phase,
    "12.5"
);

assert.equal(
    qualified.status,
    "QUALIFIED"
);

assert.equal(
    qualified.executed,
    false
);

pass(
    "Engineering Analytics evidence qualifies for Phase 12.5 orchestration"
);


assert.equal(
    qualified.scope,
    "SITE"
);

assert.equal(
    qualified.scopeIdentity.vrmSiteId,
    "VRM-12-5-TEST"
);

assert.equal(
    qualified.scopeIdentity.installationId,
    "installation-12-5"
);

pass(
    "SITE and installation identity propagate into qualified integration"
);


assert.strictEqual(
    qualified.engineeringEvidence,
    engineeringEvidence
);

assert.strictEqual(
    qualified.observations,
    observations
);

pass(
    "qualification does not clone or rewrite Engineering Analytics observations"
);


/*
|--------------------------------------------------------------------------
| Execute real Phase 9.1 → 9.2 path
|--------------------------------------------------------------------------
*/

const result =
    executeEngineeringAnalyticsForecastingIntegration({
        qualifiedIntegration:
            qualified,
    });


assert.equal(
    result.status,
    "EXECUTED"
);

assert.equal(
    result.executed,
    true
);

pass(
    "Phase 12.5 executes successfully"
);


assert.equal(
    result.time.trainingWindow.semantics,
    "[start,end)"
);

assert.equal(
    result.time.trainingWindow.start
        .toISOString(),
    "2026-09-10T00:00:00.000Z"
);

assert.equal(
    result.time.trainingWindow.end
        .toISOString(),
    "2026-09-10T01:00:00.000Z"
);

assert.equal(
    result.time.forecastHorizon.start
        .toISOString(),
    "2026-09-10T01:00:00.000Z"
);

assert.equal(
    result.time.forecastHorizon.end
        .toISOString(),
    "2026-09-10T02:00:00.000Z"
);

pass(
    "real Phase 9.1 time contract preserves non-overlapping training and forecast windows"
);


assert.equal(
    result.target.family,
    "SITE_LOAD"
);

assert.equal(
    result.target.metric,
    "servedLoadPower"
);

assert.equal(
    result.target.kind,
    "NUMERIC"
);

assert.equal(
    result.target.unit,
    "kW"
);

pass(
    "real Phase 9.1 target preserves explicit numeric target identity and unit"
);


assert.equal(
    result.target.scope.vrmSiteId,
    "VRM-12-5-TEST"
);

assert.equal(
    result.target.scope.installationId,
    "installation-12-5"
);

pass(
    "forecast target receives SITE and installation identity from Engineering Analytics"
);


assert.equal(
    result.forecastInput.phase,
    "9.2"
);

assert.equal(
    result.forecastInput.layer,
    "FORECASTING"
);

assert.equal(
    result.forecastInput.semantics,
    "[start,end)"
);

pass(
    "real Phase 9.2 input qualification is reached"
);


assert.strictEqual(
    result.forecastInput.source,
    engineeringEvidence
);

assert.strictEqual(
    result.forecastInput.observations,
    observations
);

pass(
    "Phase 9.2 receives the original Engineering Analytics source and observations"
);


assert.equal(
    result.forecastInput
        .qualification
        .status,
    "QUALIFIED"
);

assert.equal(
    result.forecastInput
        .qualification
        .totalObservationCount,
    4
);

assert.equal(
    result.forecastInput
        .qualification
        .validObservationCount,
    4
);

pass(
    "all canonical observations qualify through the real Phase 9.2 service"
);


/*
|--------------------------------------------------------------------------
| Explicit zero preservation
|--------------------------------------------------------------------------
*/

const zeroRecord =
    result.forecastInput.records.find(
        (
            record
        ) =>
            record.value ===
                0
    );


assert.ok(
    zeroRecord
);

assert.equal(
    zeroRecord.status,
    "VALID"
);

assert.equal(
    zeroRecord.valid,
    true
);

pass(
    "explicit numeric zero remains a valid forecast observation"
);


/*
|--------------------------------------------------------------------------
| Unit mismatch semantics
|--------------------------------------------------------------------------
*/

const unitMismatchObservations =
    Object.freeze([
        Object.freeze({
            timestamp:
                "2026-09-10T00:00:00.000Z",

            value:
                12,

            unit:
                "kW",
        }),

        Object.freeze({
            timestamp:
                "2026-09-10T00:15:00.000Z",

            value:
                13,

            unit:
                "W",
        }),
    ]);


const unitMismatchEvidence =
    Object.freeze({
        ...engineeringEvidence,

        observations:
            unitMismatchObservations,
    });


const unitMismatchQualified =
    qualifyEngineeringAnalyticsForecastingIntegration({
        engineeringEvidence:
            unitMismatchEvidence,

        forecastRequest,
    });


const unitMismatchResult =
    executeEngineeringAnalyticsForecastingIntegration({
        qualifiedIntegration:
            unitMismatchQualified,
    });


assert.equal(
    unitMismatchResult.forecastInput
        .qualification
        .status,
    "PARTIALLY_QUALIFIED"
);

assert.equal(
    unitMismatchResult.forecastInput
        .qualification
        .reason,
    "UNIT_UNRESOLVED"
);

pass(
    "unit mismatch remains explicit and produces PARTIALLY_QUALIFIED"
);


const mismatchedRecord =
    unitMismatchResult.forecastInput.records.find(
        (
            record
        ) =>
            record.unit ===
                "W"
    );


assert.equal(
    mismatchedRecord.status,
    "UNIT_MISMATCH"
);

assert.equal(
    mismatchedRecord.valid,
    false
);

pass(
    "Phase 9.2 does not infer or convert a mismatched engineering unit"
);


/*
|--------------------------------------------------------------------------
| Missing/non-finite value semantics
|--------------------------------------------------------------------------
*/

const invalidValueEvidence =
    Object.freeze({
        ...engineeringEvidence,

        observations:
            Object.freeze([
                Object.freeze({
                    timestamp:
                        "2026-09-10T00:00:00.000Z",

                    value:
                        null,

                    unit:
                        "kW",
                }),

                Object.freeze({
                    timestamp:
                        "2026-09-10T00:15:00.000Z",

                    value:
                        Number.NaN,

                    unit:
                        "kW",
                }),

                Object.freeze({
                    timestamp:
                        "2026-09-10T00:30:00.000Z",

                    value:
                        10,

                    unit:
                        "kW",
                }),
            ]),
    });


const invalidValueQualified =
    qualifyEngineeringAnalyticsForecastingIntegration({
        engineeringEvidence:
            invalidValueEvidence,

        forecastRequest,
    });


const invalidValueResult =
    executeEngineeringAnalyticsForecastingIntegration({
        qualifiedIntegration:
            invalidValueQualified,
    });


assert.equal(
    invalidValueResult.forecastInput
        .qualification
        .status,
    "PARTIALLY_QUALIFIED"
);

assert.equal(
    invalidValueResult.forecastInput
        .qualification
        .validObservationCount,
    1
);

pass(
    "missing and non-finite values are not converted to zero"
);


assert.equal(
    invalidValueResult.forecastInput.records[0].status,
    "INVALID_VALUE"
);

assert.equal(
    invalidValueResult.forecastInput.records[0].value,
    null
);

assert.equal(
    invalidValueResult.forecastInput.records[1].status,
    "INVALID_VALUE"
);

assert.equal(
    invalidValueResult.forecastInput.records[1].value,
    null
);

pass(
    "invalid Engineering Analytics values remain invalid in Phase 9.2"
);


/*
|--------------------------------------------------------------------------
| Duplicate timestamp semantics
|--------------------------------------------------------------------------
*/

const duplicateEvidence =
    Object.freeze({
        ...engineeringEvidence,

        observations:
            Object.freeze([
                Object.freeze({
                    timestamp:
                        "2026-09-10T00:00:00.000Z",

                    value:
                        10,

                    unit:
                        "kW",
                }),

                Object.freeze({
                    timestamp:
                        "2026-09-10T00:00:00.000Z",

                    value:
                        11,

                    unit:
                        "kW",
                }),
            ]),
    });


const duplicateQualified =
    qualifyEngineeringAnalyticsForecastingIntegration({
        engineeringEvidence:
            duplicateEvidence,

        forecastRequest,
    });


const duplicateResult =
    executeEngineeringAnalyticsForecastingIntegration({
        qualifiedIntegration:
            duplicateQualified,
    });


assert.equal(
    duplicateResult.forecastInput
        .qualification
        .status,
    "PARTIALLY_QUALIFIED"
);

assert.equal(
    duplicateResult.forecastInput
        .qualification
        .reason,
    "DUPLICATE_TIMESTAMPS_PRESENT"
);

pass(
    "duplicate timestamps remain explicit and are not automatically merged"
);


assert.equal(
    duplicateResult.forecastInput.records[1].status,
    "DUPLICATE_TIMESTAMP"
);

pass(
    "second duplicate observation is marked DUPLICATE_TIMESTAMP"
);


/*
|--------------------------------------------------------------------------
| Forecast-origin leakage semantics
|--------------------------------------------------------------------------
*/

const leakageEvidence =
    Object.freeze({
        ...engineeringEvidence,

        observations:
            Object.freeze([
                Object.freeze({
                    timestamp:
                        "2026-09-10T00:30:00.000Z",

                    value:
                        10,

                    unit:
                        "kW",
                }),

                Object.freeze({
                    timestamp:
                        "2026-09-10T01:00:00.000Z",

                    value:
                        99,

                    unit:
                        "kW",
                }),
            ]),
    });


const leakageQualified =
    qualifyEngineeringAnalyticsForecastingIntegration({
        engineeringEvidence:
            leakageEvidence,

        forecastRequest,
    });


const leakageResult =
    executeEngineeringAnalyticsForecastingIntegration({
        qualifiedIntegration:
            leakageQualified,
    });


assert.equal(
    leakageResult.forecastInput
        .qualification
        .status,
    "PARTIALLY_QUALIFIED"
);

assert.equal(
    leakageResult.forecastInput
        .qualification
        .reason,
    "TEMPORAL_LEAKAGE_PRESENT"
);

pass(
    "observation exactly at forecast origin is excluded from training"
);


assert.equal(
    leakageResult.forecastInput.records[1].status,
    "FUTURE_LEAKAGE"
);

assert.equal(
    leakageResult.forecastInput.records[1].valid,
    false
);

pass(
    "[start,end) training semantics reject timestamp at forecastOrigin"
);


/*
|--------------------------------------------------------------------------
| Outside-training-window semantics
|--------------------------------------------------------------------------
*/

const outsideWindowEvidence =
    Object.freeze({
        ...engineeringEvidence,

        observations:
            Object.freeze([
                Object.freeze({
                    timestamp:
                        "2026-09-09T23:59:59.000Z",

                    value:
                        8,

                    unit:
                        "kW",
                }),

                Object.freeze({
                    timestamp:
                        "2026-09-10T00:15:00.000Z",

                    value:
                        9,

                    unit:
                        "kW",
                }),
            ]),
    });


const outsideQualified =
    qualifyEngineeringAnalyticsForecastingIntegration({
        engineeringEvidence:
            outsideWindowEvidence,

        forecastRequest,
    });


const outsideResult =
    executeEngineeringAnalyticsForecastingIntegration({
        qualifiedIntegration:
            outsideQualified,
    });


assert.equal(
    outsideResult.forecastInput.records[0].status,
    "OUTSIDE_TRAINING_WINDOW"
);

assert.equal(
    outsideResult.forecastInput.records[0].valid,
    false
);

pass(
    "observations before trainingStart remain outside the training window"
);


/*
|--------------------------------------------------------------------------
| No observations semantics
|--------------------------------------------------------------------------
*/

const emptyEvidence =
    Object.freeze({
        ...engineeringEvidence,

        observations:
            Object.freeze([]),
    });


const emptyQualified =
    qualifyEngineeringAnalyticsForecastingIntegration({
        engineeringEvidence:
            emptyEvidence,

        forecastRequest,
    });


const emptyResult =
    executeEngineeringAnalyticsForecastingIntegration({
        qualifiedIntegration:
            emptyQualified,
    });


assert.equal(
    emptyResult.forecastInput
        .qualification
        .status,
    "UNAVAILABLE"
);

assert.equal(
    emptyResult.forecastInput
        .qualification
        .reason,
    "NO_OBSERVATIONS"
);

pass(
    "empty Engineering Analytics observation evidence becomes UNAVAILABLE, not zero"
);


/*
|--------------------------------------------------------------------------
| Evidence/request rejection
|--------------------------------------------------------------------------
*/

expectThrow(
    () =>
        validateEngineeringForecastEvidence(
            null
        ),

    /requires Engineering Analytics observation evidence/,

    "missing Engineering Analytics evidence is rejected"
);


expectThrow(
    () =>
        validateEngineeringForecastEvidence({
            ...engineeringEvidence,

            layer:
                "FORECASTING",
        }),

    /requires ENGINEERING_ANALYTICS upstream evidence/,

    "wrong upstream layer is rejected"
);


expectThrow(
    () =>
        validateEngineeringForecastEvidence({
            ...engineeringEvidence,

            scope:
                "FLEET",
        }),

    /requires SITE-scoped Engineering Analytics evidence/,

    "FLEET Engineering Analytics evidence is rejected"
);


expectThrow(
    () =>
        validateEngineeringForecastEvidence({
            ...engineeringEvidence,

            scopeIdentity: {
                installationId:
                    "installation-12-5",
            },
        }),

    /Engineering Analytics vrmSiteId is required/,

    "missing vrmSiteId is rejected"
);


expectThrow(
    () =>
        validateEngineeringForecastEvidence({
            ...engineeringEvidence,

            observations:
                null,
        }),

    /Engineering Analytics observations must be an array/,

    "non-array observation evidence is rejected"
);


expectThrow(
    () =>
        validateEngineeringForecastRequest(
            null
        ),

    /requires a forecast request/,

    "missing forecast request is rejected"
);


expectThrow(
    () =>
        validateEngineeringForecastRequest({
            ...forecastRequest,

            forecastOrigin:
                forecastRequest.trainingStart,
        }),

    /Forecast origin must be later than training start/,

    "non-positive training window is rejected"
);


expectThrow(
    () =>
        validateEngineeringForecastRequest({
            ...forecastRequest,

            forecastEnd:
                forecastRequest.forecastOrigin,
        }),

    /Forecast end must be later than forecast origin/,

    "non-positive forecast horizon is rejected"
);


/*
|--------------------------------------------------------------------------
| Real Phase 9 target failures become explicit 12.5 ERROR
|--------------------------------------------------------------------------
*/

const missingUnitRequest =
    Object.freeze({
        ...forecastRequest,

        target:
            Object.freeze({
                family:
                    "SITE_LOAD",

                metric:
                    "servedLoadPower",

                kind:
                    "NUMERIC",

                unit:
                    null,
            }),
    });


const missingUnitQualified =
    qualifyEngineeringAnalyticsForecastingIntegration({
        engineeringEvidence,

        forecastRequest:
            missingUnitRequest,
    });


const missingUnitResult =
    executeEngineeringAnalyticsForecastingIntegration({
        qualifiedIntegration:
            missingUnitQualified,
    });


assert.equal(
    missingUnitResult.status,
    ENGINEERING_FORECASTING_INTEGRATION_STATUS.ERROR
);

assert.equal(
    missingUnitResult.executed,
    false
);

assert.match(
    missingUnitResult.error.message,
    /Numeric forecast target requires an explicit unit/
);

pass(
    "real Phase 9.1 target failure becomes explicit 12.5 ERROR"
);


/*
|--------------------------------------------------------------------------
| Injected Phase 9.2 execution failure propagation
|--------------------------------------------------------------------------
*/

const failingQualified =
    qualifyEngineeringAnalyticsForecastingIntegration({
        engineeringEvidence,

        forecastRequest,

        inputQualifier:
            () => {
                throw new Error(
                    "SIMULATED_PHASE_9_2_FAILURE"
                );
            },
    });


const failingResult =
    executeEngineeringAnalyticsForecastingIntegration({
        qualifiedIntegration:
            failingQualified,
    });


assert.equal(
    failingResult.status,
    ENGINEERING_FORECASTING_INTEGRATION_STATUS.ERROR
);

assert.equal(
    failingResult.executed,
    false
);

assert.equal(
    failingResult.error.message,
    "SIMULATED_PHASE_9_2_FAILURE"
);

pass(
    "Phase 9.2 execution failure becomes explicit 12.5 ERROR evidence"
);


assert.equal(
    failingResult.scopeIdentity.vrmSiteId,
    "VRM-12-5-TEST"
);

assert.equal(
    failingResult.scopeIdentity.installationId,
    "installation-12-5"
);

assert.strictEqual(
    failingResult.engineeringEvidence,
    engineeringEvidence
);

assert.strictEqual(
    failingResult.observations,
    observations
);

pass(
    "ERROR propagation preserves identity and source evidence"
);


/*
|--------------------------------------------------------------------------
| Final assertion plan
|--------------------------------------------------------------------------
*/

assert.equal(
    checks,
    48
);

pass(
    "12.5 assertion plan completed exactly"
);


console.log("");
console.log(
    `Assertions passed: ${checks}`
);

console.log(
    "================================================"
);

console.log(
    "ASHMAAN PHASE 12.5 ENGINEERING ANALYTICS → FORECASTING INTEGRATION PASSED"
);

console.log(
    "================================================"
);