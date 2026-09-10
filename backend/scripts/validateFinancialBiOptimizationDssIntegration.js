// scripts/validateFinancialBiOptimizationDssIntegration.js

import assert from "node:assert/strict";

import {
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_PHASE,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_LAYER,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_PHASE,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_LAYER,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_PHASE,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_LAYER,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_INTERVAL,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES,
    validateFinancialBiOptimizationEvidence,
    validateFinancialBiOptimizationRequest,
    qualifyFinancialBiOptimizationDssIntegration,
    executeFinancialBiOptimizationDssIntegration,
} from "../services/integration/financialBiOptimizationDssIntegrationService.js";

import {
    FINANCIAL_BI_PERSISTENCE_CONTRACT_PHASE,
    FINANCIAL_BI_PERSISTENCE_CONTRACT_LAYER,
    FINANCIAL_BI_PERSISTENCE_STATUS,
    FINANCIAL_BI_PERSISTENCE_RECORD_KIND,
} from "../services/financialBi/financialBiPersistenceContract.js";

import {
    OPTIMIZATION_DSS_CONTRACT_PHASE,
    OPTIMIZATION_DSS_CONTRACT_LAYER,
    OPTIMIZATION_DSS_CONTRACT_UPSTREAM_LAYER,
    OPTIMIZATION_DSS_SCOPE,
    OPTIMIZATION_DSS_TIME_SEMANTICS,
    OPTIMIZATION_DSS_OBJECTIVE_KIND,
    OPTIMIZATION_DSS_DECISION_VARIABLE_KIND,
    OPTIMIZATION_DSS_CONSTRAINT_KIND,
    OPTIMIZATION_DSS_EVIDENCE_STATUS,
    buildOptimizationDssObjective,
    buildOptimizationDssDecisionVariable,
    buildOptimizationDssConstraint,
} from "../services/optimizationDss/optimizationDssContract.js";

import {
    OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE,
    OPTIMIZATION_DSS_INPUT_QUALIFICATION_LAYER,
    OPTIMIZATION_DSS_INPUT_REASON,
} from "../services/optimizationDss/optimizationDssInputQualificationService.js";


console.log("");
console.log("================================================");
console.log(
    "ASHMAAN PHASE 12.7 FINANCIAL/BI → OPTIMIZATION/DSS INTEGRATION"
);
console.log("================================================");
console.log("");


let assertionsPassed = 0;


function pass(message) {
    assertionsPassed += 1;

    console.log(
        `PASS ${assertionsPassed}: ${message}`
    );
}


function equal(actual, expected, message) {
    assert.strictEqual(
        actual,
        expected,
        message
    );

    pass(message);
}


function ok(value, message) {
    assert.ok(
        value,
        message
    );

    pass(message);
}


function same(actual, expected, message) {
    assert.strictEqual(
        actual,
        expected,
        message
    );

    pass(message);
}


function throws(
    fn,
    expectedMessage,
    message
) {
    assert.throws(
        fn,
        error =>
            error?.message ===
            expectedMessage,
        message
    );

    pass(message);
}


const START =
    "2026-09-10T12:00:00.000Z";

const END =
    "2026-09-10T15:00:00.000Z";

const TIMEZONE =
    "UTC";

const VRM_SITE_ID =
    "vrm-site-12-7";

const METRIC_NAME =
    "FORECAST_ENERGY_COST";

const UNIT =
    "kWh";

const CURRENCY =
    "NGN";


function makeEvidence({
    metricName = METRIC_NAME,
    value = 12500,
    unit = UNIT,
    currency = CURRENCY,
    scope = OPTIMIZATION_DSS_SCOPE.SITE,
    vrmSiteId = VRM_SITE_ID,
    fleetId = null,
    start = START,
    end = END,
    timezone = TIMEZONE,
} = {}) {
    return {
        phase:
            FINANCIAL_BI_PERSISTENCE_CONTRACT_PHASE,

        layer:
            FINANCIAL_BI_PERSISTENCE_CONTRACT_LAYER,

        upstreamPhase:
            "10.6",

        identity: {
            recordKind:
                FINANCIAL_BI_PERSISTENCE_RECORD_KIND
                    .KPI_AGGREGATION,

            metricName,

            scope,

            scopeIdentity:
                scope === OPTIMIZATION_DSS_SCOPE.SITE
                    ? {
                        vrmSiteId,
                    }
                    : {
                        fleetId,
                    },

            reportingWindow: {
                start: new Date(start),
                end: new Date(end),
                timezone,
                semantics:
                    OPTIMIZATION_DSS_TIME_SEMANTICS,
            },

            persistenceKey:
                `fixture-${metricName}`,
        },

        persistenceKey:
            `fixture-${metricName}`,

        recordKind:
            FINANCIAL_BI_PERSISTENCE_RECORD_KIND
                .KPI_AGGREGATION,

        metricName,

        scope,

        scopeIdentity:
            scope === OPTIMIZATION_DSS_SCOPE.SITE
                ? {
                    vrmSiteId,
                }
                : {
                    fleetId,
                },

        reportingWindow: {
            start: new Date(start),
            end: new Date(end),
            timezone,
            semantics:
                OPTIMIZATION_DSS_TIME_SEMANTICS,
        },

        sourceAggregation: {
            phase: "10.6",
            layer: "FINANCIAL_BI",
        },

        lineage: {
            phase10_6: "10.6",
            phase10_5: "10.5",
            aggregationDefinitionName:
                "TEST_KPI_AGGREGATION",
            aggregationStatus:
                "AGGREGATED",
            aggregationReason:
                "AGGREGATION_COMPLETE",
        },

        payload: {
            status:
                "AGGREGATED",

            reason:
                "AGGREGATION_COMPLETE",

            value,

            unit,

            currency,

            available:
                typeof value === "number" &&
                Number.isFinite(value),
        },

        persistence: {
            status:
                FINANCIAL_BI_PERSISTENCE_STATUS
                    .NOT_PERSISTED,

            executed:
                false,

            documentId:
                null,

            inserted:
                false,

            updated:
                false,
        },

        status:
            FINANCIAL_BI_PERSISTENCE_STATUS
                .CONTRACT_DEFINED,

        boundaries: {},
    };
}


function makeOptimizationRequest({
    sourceMetricName = METRIC_NAME,
    objectiveUnit = null,
    objectiveCurrency = CURRENCY,
} = {}) {
    const objective =
        buildOptimizationDssObjective({
            name:
                "MINIMIZE_FORECAST_ENERGY_COST",

            kind:
                OPTIMIZATION_DSS_OBJECTIVE_KIND
                    .MINIMIZE_COST,

            unit:
                objectiveUnit,

            currency:
                objectiveCurrency,

            weight:
                1,

            sourceMetricName,
        });

    const decisionVariable =
        buildOptimizationDssDecisionVariable({
            name:
                "GRID_POWER",

            kind:
                OPTIMIZATION_DSS_DECISION_VARIABLE_KIND
                    .GRID_POWER,

            unit:
                "kW",

            lowerBound:
                0,

            upperBound:
                100,
        });

    const constraint =
        buildOptimizationDssConstraint({
            name:
                "GRID_LIMIT",

            kind:
                OPTIMIZATION_DSS_CONSTRAINT_KIND
                    .GRID_LIMIT,

            required:
                true,

            parameters: {
                maximumPower:
                    100,

                unit:
                    "kW",
            },
        });

    return {
        objectives: [
            objective,
        ],

        decisionVariables: [
            decisionVariable,
        ],

        constraints: [
            constraint,
        ],
    };
}


// --------------------------------------------------
// A. CONTRACT IDENTITY
// --------------------------------------------------

equal(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_PHASE,
    "12.7",
    "integration phase is 12.7"
);

equal(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_LAYER,
    "FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION",
    "integration layer is explicit"
);

equal(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_PHASE,
    FINANCIAL_BI_PERSISTENCE_CONTRACT_PHASE,
    "Phase 10.7 Financial/BI evidence contract is the upstream phase"
);

equal(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_UPSTREAM_LAYER,
    FINANCIAL_BI_PERSISTENCE_CONTRACT_LAYER,
    "Financial/BI is the explicit upstream layer"
);

equal(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_PHASE,
    OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE,
    "existing Phase 11.2 input qualification is the downstream target"
);

equal(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_TARGET_LAYER,
    OPTIMIZATION_DSS_INPUT_QUALIFICATION_LAYER,
    "existing Optimization/DSS input qualification layer is preserved"
);

equal(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_INTERVAL,
    OPTIMIZATION_DSS_TIME_SEMANTICS,
    "half-open interval semantics are preserved"
);


// --------------------------------------------------
// B. BOUNDARIES
// --------------------------------------------------

ok(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .usesExistingFinancialBiEvidence === true &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .usesExistingOptimizationDssContract === true &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .usesExistingOptimizationDssInputQualification === true,
    "12.7 delegates to existing Financial/BI and Optimization/DSS boundaries"
);

ok(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .createsParallelFinancialBiEngine === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .createsParallelOptimizationQualification === false,
    "12.7 creates no parallel Financial/BI or Optimization/DSS qualification engine"
);

ok(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .financialBiCalculationIncluded === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .financialBiAggregationIncluded === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .financialBiPersistenceExecuted === false,
    "12.7 does not calculate, aggregate, or persist Financial/BI"
);

ok(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .optimizationModelBuildIncluded === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .solverIncluded === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .optimizationExecuted === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .recommendationGenerated === false,
    "12.7 stops at Optimization/DSS input qualification"
);

ok(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .unitInferenceAllowed === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .currencyInferenceAllowed === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .currencyConversionAllowed === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .tariffInferenceAllowed === false,
    "unit, currency, conversion, and tariff inference remain blocked"
);

ok(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .resamplingAllowed === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .interpolationAllowed === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .duplicateMergeAllowed === false,
    "resampling, interpolation, and duplicate merging remain blocked"
);

ok(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .missingMeansZero === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .unavailableMeansZero === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .invalidMeansZero === false,
    "missing, unavailable, and invalid values remain distinct from zero"
);

ok(
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .advisoryOnly === true &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .executableControl === false &&
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_BOUNDARIES
        .autoDispatch === false,
    "12.7 remains advisory-only and cannot dispatch control"
);


// --------------------------------------------------
// C. FINANCIAL/BI EVIDENCE VALIDATION
// --------------------------------------------------

const evidence =
    makeEvidence();

const evidenceArray =
    [
        evidence,
    ];

const validatedEvidence =
    validateFinancialBiOptimizationEvidence(
        evidenceArray
    );

same(
    validatedEvidence.financialBiEvidence,
    evidenceArray,
    "validated Financial/BI evidence array is preserved by reference"
);

equal(
    validatedEvidence.scope,
    OPTIMIZATION_DSS_SCOPE.SITE,
    "SITE scope is preserved"
);

equal(
    validatedEvidence.scopeIdentity.vrmSiteId,
    VRM_SITE_ID,
    "SITE identity is preserved"
);

same(
    validatedEvidence.reportingWindow,
    evidence.reportingWindow,
    "Financial/BI reporting window is preserved by reference"
);

throws(
    () =>
        validateFinancialBiOptimizationEvidence(
            null
        ),
    "FINANCIAL_BI_EVIDENCE_REQUIRED",
    "missing Financial/BI evidence is rejected"
);

throws(
    () =>
        validateFinancialBiOptimizationEvidence(
            []
        ),
    "FINANCIAL_BI_EVIDENCE_REQUIRED",
    "empty Financial/BI evidence is rejected"
);

throws(
    () =>
        validateFinancialBiOptimizationEvidence(
            [
                {
                    ...makeEvidence(),
                    phase:
                        "10.X",
                },
            ]
        ),
    "FINANCIAL_BI_EVIDENCE_0_PHASE_INVALID",
    "wrong Financial/BI evidence phase is rejected"
);

throws(
    () =>
        validateFinancialBiOptimizationEvidence(
            [
                {
                    ...makeEvidence(),
                    layer:
                        "WRONG_LAYER",
                },
            ]
        ),
    "FINANCIAL_BI_EVIDENCE_0_LAYER_INVALID",
    "wrong Financial/BI evidence layer is rejected"
);

throws(
    () =>
        validateFinancialBiOptimizationEvidence(
            [
                {
                    ...makeEvidence(),
                    metricName:
                        "",
                },
            ]
        ),
    "FINANCIAL_BI_EVIDENCE_0_METRIC_NAME_REQUIRED",
    "missing Financial/BI metric name is rejected"
);

throws(
    () =>
        validateFinancialBiOptimizationEvidence(
            [
                {
                    ...makeEvidence(),
                    scope:
                        "INVALID_SCOPE",
                },
            ]
        ),
    "FINANCIAL_BI_EVIDENCE_0_SCOPE_INVALID",
    "invalid Financial/BI scope is rejected"
);

throws(
    () =>
        validateFinancialBiOptimizationEvidence(
            [
                {
                    ...makeEvidence(),
                    scopeIdentity: {},
                },
            ]
        ),
    "FINANCIAL_BI_EVIDENCE_0_VRM_SITE_ID_REQUIRED",
    "SITE evidence requires vrmSiteId"
);

throws(
    () =>
        validateFinancialBiOptimizationEvidence(
            [
                {
                    ...makeEvidence(),
                    reportingWindow: {
                        ...makeEvidence()
                            .reportingWindow,

                        semantics:
                            "[start,end]",
                    },
                },
            ]
        ),
    "FINANCIAL_BI_EVIDENCE_0_REPORTING_WINDOW_INVALID",
    "wrong reporting-window semantics are rejected"
);

throws(
    () =>
        validateFinancialBiOptimizationEvidence(
            [
                {
                    ...makeEvidence(),
                    reportingWindow: {
                        ...makeEvidence()
                            .reportingWindow,

                        start:
                            new Date(END),

                        end:
                            new Date(START),
                    },
                },
            ]
        ),
    "FINANCIAL_BI_EVIDENCE_0_REPORTING_WINDOW_INVALID",
    "reversed Financial/BI reporting window is rejected"
);


const secondMetricEvidence =
    makeEvidence({
        metricName:
            "SECOND_FINANCIAL_METRIC",

        value:
            50,
    });

const multipleEvidence =
    [
        evidence,
        secondMetricEvidence,
    ];

const validatedMultipleEvidence =
    validateFinancialBiOptimizationEvidence(
        multipleEvidence
    );

same(
    validatedMultipleEvidence.financialBiEvidence,
    multipleEvidence,
    "multiple same-scope Financial/BI evidence records are preserved"
);

throws(
    () =>
        validateFinancialBiOptimizationEvidence(
            [
                evidence,

                makeEvidence({
                    vrmSiteId:
                        "different-site",
                }),
            ]
        ),
    "FINANCIAL_BI_EVIDENCE_SCOPE_IDENTITY_MISMATCH",
    "cross-site Financial/BI evidence is rejected"
);

throws(
    () =>
        validateFinancialBiOptimizationEvidence(
            [
                evidence,

                makeEvidence({
                    start:
                        "2026-09-10T13:00:00.000Z",

                    end:
                        "2026-09-10T16:00:00.000Z",
                }),
            ]
        ),
    "FINANCIAL_BI_EVIDENCE_REPORTING_WINDOW_MISMATCH",
    "cross-window Financial/BI evidence is rejected"
);


// --------------------------------------------------
// D. OPTIMIZATION REQUEST VALIDATION
// --------------------------------------------------

const optimizationRequest =
    makeOptimizationRequest();

const validatedRequest =
    validateFinancialBiOptimizationRequest(
        optimizationRequest
    );

same(
    validatedRequest.objectives,
    optimizationRequest.objectives,
    "Optimization/DSS objectives are preserved by reference"
);

same(
    validatedRequest.decisionVariables,
    optimizationRequest.decisionVariables,
    "Optimization/DSS decision variables are preserved by reference"
);

same(
    validatedRequest.constraints,
    optimizationRequest.constraints,
    "Optimization/DSS constraints are preserved by reference"
);

throws(
    () =>
        validateFinancialBiOptimizationRequest(
            null
        ),
    "OPTIMIZATION_REQUEST_REQUIRED",
    "missing Optimization/DSS request is rejected"
);

throws(
    () =>
        validateFinancialBiOptimizationRequest({
            objectives: [],
            decisionVariables:
                optimizationRequest
                    .decisionVariables,
            constraints:
                optimizationRequest
                    .constraints,
        }),
    "OPTIMIZATION_OBJECTIVES_REQUIRED",
    "empty Optimization/DSS objectives are rejected"
);

throws(
    () =>
        validateFinancialBiOptimizationRequest({
            objectives:
                optimizationRequest.objectives,
            decisionVariables: [],
            constraints:
                optimizationRequest
                    .constraints,
        }),
    "OPTIMIZATION_DECISION_VARIABLES_REQUIRED",
    "empty Optimization/DSS decision variables are rejected"
);

throws(
    () =>
        validateFinancialBiOptimizationRequest({
            objectives:
                optimizationRequest.objectives,
            decisionVariables:
                optimizationRequest
                    .decisionVariables,
            constraints: [],
        }),
    "OPTIMIZATION_CONSTRAINTS_REQUIRED",
    "empty Optimization/DSS constraints are rejected"
);


// --------------------------------------------------
// E. 12.7 QUALIFICATION
// --------------------------------------------------

const qualified =
    qualifyFinancialBiOptimizationDssIntegration({
        financialBiEvidence:
            evidenceArray,

        optimizationRequest,
    });

equal(
    qualified.phase,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_PHASE,
    "Financial/BI evidence qualifies for Phase 12.7 orchestration"
);

equal(
    qualified.status,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS
        .QUALIFIED,
    "qualified integration has explicit QUALIFIED status"
);

equal(
    qualified.executed,
    false,
    "qualification does not execute Optimization/DSS"
);

equal(
    qualified.scope,
    OPTIMIZATION_DSS_SCOPE.SITE,
    "SITE scope propagates into qualified integration"
);

equal(
    qualified.scopeIdentity.vrmSiteId,
    VRM_SITE_ID,
    "SITE identity propagates into qualified integration"
);

same(
    qualified.financialBiEvidence,
    evidenceArray,
    "qualification preserves original Financial/BI evidence array by reference"
);

same(
    qualified.financialBiEvidence[0],
    evidence,
    "qualification does not clone or rewrite Financial/BI evidence"
);

same(
    qualified.optimizationRequest.objectives,
    optimizationRequest.objectives,
    "qualification preserves Optimization/DSS objectives"
);


// --------------------------------------------------
// F. REAL PHASE 11.1 → 11.2 EXECUTION
// --------------------------------------------------

const execution =
    executeFinancialBiOptimizationDssIntegration({
        qualifiedIntegration:
            qualified,
    });

equal(
    execution.status,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS
        .EXECUTED,
    "Phase 12.7 executes successfully"
);

equal(
    execution.executed,
    true,
    "successful integration is marked executed"
);

equal(
    execution.horizon.start,
    START,
    "Optimization/DSS horizon starts at Financial/BI reporting start"
);

equal(
    execution.horizon.end,
    END,
    "Optimization/DSS horizon ends at Financial/BI reporting end"
);

equal(
    execution.horizon.semantics,
    OPTIMIZATION_DSS_TIME_SEMANTICS,
    "Optimization/DSS horizon preserves [start,end)"
);

equal(
    execution.contract.phase,
    OPTIMIZATION_DSS_CONTRACT_PHASE,
    "real Phase 11.1 Optimization/DSS contract is created"
);

equal(
    execution.contract.layer,
    OPTIMIZATION_DSS_CONTRACT_LAYER,
    "real Phase 11.1 Optimization/DSS layer is reached"
);

equal(
    execution.contract.architecture.upstream,
    OPTIMIZATION_DSS_CONTRACT_UPSTREAM_LAYER,
    "Phase 11.1 contract preserves Financial/BI upstream architecture"
);

same(
    execution.contract.financialBiEvidence[0],
    evidence,
    "Phase 11.1 receives original Financial/BI evidence"
);

equal(
    execution.inputQualification.phase,
    OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE,
    "real Phase 11.2 input qualification is reached"
);

equal(
    execution.inputQualification.layer,
    OPTIMIZATION_DSS_INPUT_QUALIFICATION_LAYER,
    "real Phase 11.2 qualification layer is preserved"
);

equal(
    execution.inputQualification.status,
    OPTIMIZATION_DSS_EVIDENCE_STATUS
        .QUALIFIED,
    "matching Financial/BI evidence is QUALIFIED by real Phase 11.2"
);

equal(
    execution.inputQualification.reason,
    OPTIMIZATION_DSS_INPUT_REASON
        .QUALIFIED,
    "real Phase 11.2 reports QUALIFIED reason"
);

equal(
    execution.inputQualification.totalEvidenceCount,
    1,
    "Phase 11.2 receives exactly one Financial/BI evidence record"
);

equal(
    execution.inputQualification.qualifiedEvidenceCount,
    1,
    "Phase 11.2 qualifies the matching Financial/BI evidence"
);

equal(
    execution.inputQualification.invalidEvidenceCount,
    0,
    "Phase 11.2 reports no invalid evidence for the valid fixture"
);

same(
    execution.inputQualification.sourceEvidence,
    evidenceArray,
    "Phase 11.2 preserves the original evidence array"
);

same(
    execution.financialBiEvidence,
    evidenceArray,
    "12.7 execution preserves original Financial/BI evidence"
);


// --------------------------------------------------
// G. EXPLICIT ZERO
// --------------------------------------------------

const zeroEvidence =
    makeEvidence({
        value:
            0,
    });

const zeroQualified =
    qualifyFinancialBiOptimizationDssIntegration({
        financialBiEvidence: [
            zeroEvidence,
        ],

        optimizationRequest:
            makeOptimizationRequest(),
    });

const zeroExecution =
    executeFinancialBiOptimizationDssIntegration({
        qualifiedIntegration:
            zeroQualified,
    });

equal(
    zeroExecution.inputQualification
        .qualifiedEvidence[0].value,
    0,
    "explicit Financial/BI zero remains numeric zero"
);

equal(
    zeroExecution.inputQualification.status,
    OPTIMIZATION_DSS_EVIDENCE_STATUS
        .QUALIFIED,
    "explicit zero remains valid Optimization/DSS evidence"
);


// --------------------------------------------------
// H. PHASE 11.2 OWNS VALUE/UNIT/CURRENCY QUALIFICATION
// --------------------------------------------------

const invalidValueEvidence =
    makeEvidence({
        value:
            null,
    });

const invalidValueQualified =
    qualifyFinancialBiOptimizationDssIntegration({
        financialBiEvidence: [
            invalidValueEvidence,
        ],

        optimizationRequest:
            makeOptimizationRequest(),
    });

const invalidValueExecution =
    executeFinancialBiOptimizationDssIntegration({
        qualifiedIntegration:
            invalidValueQualified,
    });

equal(
    invalidValueExecution.status,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS
        .EXECUTED,
    "12.7 preserves unavailable Financial/BI value for Phase 11.2 classification"
);

equal(
    invalidValueExecution.inputQualification
        .invalidEvidence[0].reason,
    OPTIMIZATION_DSS_INPUT_REASON
        .VALUE_INVALID,
    "real Phase 11.2 classifies null Financial/BI value as VALUE_INVALID"
);


const currencyMismatchEvidence =
    makeEvidence({
        currency:
            "USD",
    });

const currencyMismatchQualified =
    qualifyFinancialBiOptimizationDssIntegration({
        financialBiEvidence: [
            currencyMismatchEvidence,
        ],

        optimizationRequest:
            makeOptimizationRequest({
                objectiveCurrency:
                    CURRENCY,
            }),
    });

const currencyMismatchExecution =
    executeFinancialBiOptimizationDssIntegration({
        qualifiedIntegration:
            currencyMismatchQualified,
    });

equal(
    currencyMismatchExecution
        .inputQualification
        .invalidEvidence[0]
        .reason,
    OPTIMIZATION_DSS_INPUT_REASON
        .CURRENCY_MISMATCH,
    "real Phase 11.2 detects Financial/BI currency mismatch"
);


const metricMismatchEvidence =
    makeEvidence({
        metricName:
            "UNREQUESTED_METRIC",
    });

const metricMismatchQualified =
    qualifyFinancialBiOptimizationDssIntegration({
        financialBiEvidence: [
            metricMismatchEvidence,
        ],

        optimizationRequest:
            makeOptimizationRequest({
                sourceMetricName:
                    METRIC_NAME,
            }),
    });

const metricMismatchExecution =
    executeFinancialBiOptimizationDssIntegration({
        qualifiedIntegration:
            metricMismatchQualified,
    });

equal(
    metricMismatchExecution
        .inputQualification
        .invalidEvidence[0]
        .reason,
    OPTIMIZATION_DSS_INPUT_REASON
        .METRIC_MISMATCH,
    "real Phase 11.2 detects unrequested Financial/BI metric"
);


// --------------------------------------------------
// I. HALF-OPEN HORIZON
// --------------------------------------------------

const boundaryEvidence =
    makeEvidence({
        start:
            END,

        end:
            "2026-09-10T16:00:00.000Z",
    });

const manuallyQualifiedBoundary =
    Object.freeze({
        ...qualified,

        financialBiEvidence:
            Object.freeze([
                boundaryEvidence,
            ]),
    });

const boundaryExecution =
    executeFinancialBiOptimizationDssIntegration({
        qualifiedIntegration:
            manuallyQualifiedBoundary,
    });

equal(
    boundaryExecution.status,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS
        .EXECUTED,
    "12.7 executes Phase 11.2 classification for evidence at the horizon end"
);

equal(
    boundaryExecution.inputQualification.status,
    OPTIMIZATION_DSS_EVIDENCE_STATUS
        .UNAVAILABLE,
    "evidence exactly at horizon end is unavailable under [start,end)"
);

equal(
    boundaryExecution.inputQualification
        .invalidEvidenceCount,
    1,
    "Phase 11.2 records horizon-end evidence as invalid"
);

equal(
    boundaryExecution.inputQualification
        .invalidEvidence[0]
        .reason,
    OPTIMIZATION_DSS_INPUT_REASON
        .OUTSIDE_HORIZON,
    "timestamp exactly at horizon end is classified OUTSIDE_HORIZON"
);

same(
    boundaryExecution.inputQualification
        .invalidEvidence[0]
        .evidence,
    boundaryEvidence,
    "horizon-end classification preserves original Financial/BI evidence"
);
// --------------------------------------------------
// J. DOWNSTREAM FAILURE PROPAGATION
// --------------------------------------------------

const controlledFailure =
    qualifyFinancialBiOptimizationDssIntegration({
        financialBiEvidence:
            evidenceArray,

        optimizationRequest,

        inputQualifier:
            () => {
                throw new Error(
                    "CONTROLLED_PHASE_11_2_FAILURE"
                );
            },
    });

const controlledFailureExecution =
    executeFinancialBiOptimizationDssIntegration({
        qualifiedIntegration:
            controlledFailure,
    });

equal(
    controlledFailureExecution.status,
    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS
        .ERROR,
    "Phase 11.2 execution failure becomes explicit 12.7 ERROR"
);

equal(
    controlledFailureExecution.executed,
    false,
    "ERROR result is not marked executed"
);

equal(
    controlledFailureExecution.error.message,
    "CONTROLLED_PHASE_11_2_FAILURE",
    "downstream error evidence is preserved"
);

equal(
    controlledFailureExecution.scopeIdentity
        .vrmSiteId,
    VRM_SITE_ID,
    "ERROR propagation preserves SITE identity"
);

same(
    controlledFailureExecution
        .financialBiEvidence,
    evidenceArray,
    "ERROR propagation preserves original Financial/BI evidence"
);


// --------------------------------------------------
// K. EXECUTION GUARD
// --------------------------------------------------

throws(
    () =>
        executeFinancialBiOptimizationDssIntegration({
            qualifiedIntegration:
                null,
        }),
    "QUALIFIED_PHASE_12_7_INTEGRATION_REQUIRED",
    "execution rejects missing qualified integration"
);

throws(
    () =>
        executeFinancialBiOptimizationDssIntegration({
            qualifiedIntegration: {
                ...qualified,

                status:
                    FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS
                        .ERROR,
            },
        }),
    "QUALIFIED_PHASE_12_7_INTEGRATION_REQUIRED",
    "execution rejects an object that is not in QUALIFIED state"
);


// --------------------------------------------------
// L. SOURCE IMMUTABILITY
// --------------------------------------------------

const immutableEvidence =
    makeEvidence();

const immutableEvidenceArray =
    [
        immutableEvidence,
    ];

const immutableBefore =
    JSON.stringify(
        immutableEvidenceArray
    );

const immutableQualified =
    qualifyFinancialBiOptimizationDssIntegration({
        financialBiEvidence:
            immutableEvidenceArray,

        optimizationRequest:
            makeOptimizationRequest(),
    });

executeFinancialBiOptimizationDssIntegration({
    qualifiedIntegration:
        immutableQualified,
});

equal(
    JSON.stringify(
        immutableEvidenceArray
    ),
    immutableBefore,
    "12.7 does not mutate Financial/BI evidence"
);


// --------------------------------------------------
// FINAL
// --------------------------------------------------

pass(
    "12.7 assertion plan completed"
);

console.log("");
console.log(
    `Assertions passed: ${assertionsPassed}`
);
console.log("================================================");
console.log(
    "ASHMAAN PHASE 12.7 FINANCIAL/BI → OPTIMIZATION/DSS INTEGRATION PASSED"
);
console.log("================================================");