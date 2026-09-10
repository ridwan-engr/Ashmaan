// scripts/validateOptimizationDssPersistenceContract.js

import assert from "node:assert/strict";

import {
  OPTIMIZATION_DSS_OBJECTIVE_KIND,
  OPTIMIZATION_DSS_DECISION_VARIABLE_KIND,
  OPTIMIZATION_DSS_CONSTRAINT_KIND,
  OPTIMIZATION_DSS_SCOPE,
  buildOptimizationDssHorizon,
  buildOptimizationDssObjective,
  buildOptimizationDssDecisionVariable,
  buildOptimizationDssConstraint,
  createOptimizationDssContract,
} from "../services/optimizationDss/optimizationDssContract.js";

import {
  qualifyOptimizationDssInputs,
} from "../services/optimizationDss/optimizationDssInputQualificationService.js";

import {
  OPTIMIZATION_DSS_OBJECTIVE_SENSE,
  buildOptimizationTimeIndex,
  buildOptimizationObjectiveTerm,
  buildOptimizationVariableBinding,
  buildOptimizationConstraintBinding,
  createOptimizationDssModelContract,
} from "../services/optimizationDss/optimizationDssModelContract.js";

import {
  buildOptimizationDssModel,
} from "../services/optimizationDss/optimizationDssModelBuildService.js";

import {
  OPTIMIZATION_DSS_SOLVER_KIND,
  OPTIMIZATION_DSS_SOLVER_STATUS,
  OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON,
  buildOptimizationDssSolverOptions,
  createOptimizationDssSolverContract,
} from "../services/optimizationDss/optimizationDssSolverContract.js";

import {
  executeOptimizationDssSolver,
} from "../services/optimizationDss/optimizationDssSolverExecutionService.js";

import {
  qualifyOptimizationDssResult,
} from "../services/optimizationDss/optimizationDssResultQualificationService.js";

import {
  OPTIMIZATION_DSS_RECOMMENDATION_KIND,
  OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY,
  OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE,
  buildOptimizationDssRecommendationAction,
  createOptimizationDssRecommendationContract,
} from "../services/optimizationDss/optimizationDssRecommendationContract.js";

import {
  generateOptimizationDssRecommendation,
} from "../services/optimizationDss/optimizationDssRecommendationGenerationService.js";

import {
  OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_PHASE,
  OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_LAYER,
  OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_UPSTREAM_PHASE,
  OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS,
  OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE,
  OPTIMIZATION_DSS_PERSISTENCE_BOUNDARIES,
  buildOptimizationDssPersistenceIdentity,
  createOptimizationDssPersistenceContract,
} from "../services/optimizationDss/optimizationDssPersistenceContract.js";


let assertions = 0;

function pass(message) {
  assertions += 1;
  console.log(`PASS ${assertions}: ${message}`);
}

function expectThrow(fn, message) {
  assert.throws(fn);
  pass(message);
}


console.log();
console.log("================================================");
console.log("ASHMAAN OPTIMIZATION/DSS PERSISTENCE CONTRACT VALIDATION");
console.log("================================================");
console.log(`Phase: ${OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_PHASE}`);
console.log();


assert.equal(
  OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_PHASE,
  "11.10"
);
pass("11.10 phase identity is correct");

assert.equal(
  OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_LAYER,
  "OPTIMIZATION_DSS"
);
pass("11.10 remains inside Optimization/DSS");

assert.equal(
  OPTIMIZATION_DSS_PERSISTENCE_CONTRACT_UPSTREAM_PHASE,
  "11.9"
);
pass("11.10 consumes validated Phase 11.9 recommendation generation");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS
  ),
  [
    "CONTRACT_DEFINED",
    "NOT_PERSISTED",
    "PERSISTED",
    "UNAVAILABLE",
    "ERROR",
  ]
);
pass("persistence record statuses are controlled");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE
  ),
  [
    "UPSERT_BY_PERSISTENCE_KEY",
  ]
);
pass("persistence write modes are controlled");


const horizon =
  buildOptimizationDssHorizon({
    start: "2026-09-08T00:00:00Z",
    end: "2026-09-08T02:00:00Z",
    timezone: "Africa/Lagos",
  });

const objective =
  buildOptimizationDssObjective({
    name: "minimize-energy-cost",
    kind:
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_COST,
    currency: "NGN",
    sourceMetricName: "siteEnergyCost",
  });

const variable =
  buildOptimizationDssDecisionVariable({
    name: "grid-power",
    kind:
      OPTIMIZATION_DSS_DECISION_VARIABLE_KIND.GRID_POWER,
    unit: "kW",
    lowerBound: 0,
    upperBound: 500,
  });

const constraint =
  buildOptimizationDssConstraint({
    name: "grid-limit",
    kind:
      OPTIMIZATION_DSS_CONSTRAINT_KIND.GRID_LIMIT,
    parameters: {
      maxPower: 500,
    },
  });

const optimizationContract =
  createOptimizationDssContract({
    horizon,
    scope:
      OPTIMIZATION_DSS_SCOPE.SITE,
    scopeIdentity: {
      vrmSiteId: "vrm-site-001",
    },
    objectives: [objective],
    decisionVariables: [variable],
    constraints: [constraint],
    financialBiEvidence: [],
  });

const qualifiedInputs =
  qualifyOptimizationDssInputs({
    contract:
      optimizationContract,
    financialBiEvidence: [
      {
        metricName:
          "siteEnergyCost",
        scope:
          "SITE",
        scopeIdentity: {
          vrmSiteId:
            "vrm-site-001",
        },
        reportingWindow: {
          start:
            "2026-09-08T00:00:00Z",
          end:
            "2026-09-08T01:00:00Z",
        },
        payload: {
          value: 1000,
          unit: null,
          currency: "NGN",
        },
      },
    ],
  });

const timeIndex =
  buildOptimizationTimeIndex({
    timestamps: [
      "2026-09-08T00:00:00Z",
      "2026-09-08T01:00:00Z",
    ],
  });

const variableBinding =
  buildOptimizationVariableBinding({
    name: "grid-power",
    variableKind:
      OPTIMIZATION_DSS_DECISION_VARIABLE_KIND.GRID_POWER,
    unit: "kW",
    lowerBound: 0,
    upperBound: 500,
    timeIndexed: true,
  });

const objectiveTerm =
  buildOptimizationObjectiveTerm({
    name: "grid-cost-term",
    objectiveKind:
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_COST,
    sense:
      OPTIMIZATION_DSS_OBJECTIVE_SENSE.MINIMIZE,
    coefficient: 1,
    currency: "NGN",
    variableName:
      "grid-power",
    evidenceMetricName:
      "siteEnergyCost",
  });

const constraintBinding =
  buildOptimizationConstraintBinding({
    name:
      "grid-limit-binding",
    constraintKind:
      OPTIMIZATION_DSS_CONSTRAINT_KIND.GRID_LIMIT,
    variableNames: [
      "grid-power",
    ],
    evidenceMetricNames: [
      "siteEnergyCost",
    ],
    parameters: {
      maxPower: 500,
    },
  });

const modelContract =
  createOptimizationDssModelContract({
    optimizationContract,
    qualifiedInputs,
    timeIndex,
    variableBindings: [
      variableBinding,
    ],
    objectiveTerms: [
      objectiveTerm,
    ],
    constraintBindings: [
      constraintBinding,
    ],
  });

const builtModel =
  buildOptimizationDssModel({
    modelContract,
  });

const solverContract =
  createOptimizationDssSolverContract({
    builtModel,
    solverKind:
      OPTIMIZATION_DSS_SOLVER_KIND.GENERIC_LINEAR,
    options:
      buildOptimizationDssSolverOptions(),
  });

const executionResult =
  await executeOptimizationDssSolver({
    solverContract,
    solverAdapter:
      async ({
        builtModel,
      }) => ({
        status:
          OPTIMIZATION_DSS_SOLVER_STATUS.OPTIMAL,
        terminationReason:
          OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON.OPTIMAL_SOLUTION,
        feasible: true,
        objectiveValue: 0,
        variableResults:
          builtModel.variables.map(
            item => ({
              variableId:
                item.variableId,
              value: 0,
            })
          ),
        constraintResults:
          builtModel.constraintRows.map(
            item => ({
              constraintRowId:
                item.constraintRowId,
              satisfied: true,
              residual: 0,
            })
          ),
      }),
  });

const qualifiedResult =
  qualifyOptimizationDssResult({
    executionResult,
  });

const actions =
  [
    "2026-09-08T00:00:00Z",
    "2026-09-08T01:00:00Z",
  ].map(
    (
      timestamp,
      index
    ) =>
      buildOptimizationDssRecommendationAction({
        actionId:
          `grid-setpoint-${index}`,
        kind:
          OPTIMIZATION_DSS_RECOMMENDATION_KIND.DISPATCH_SETPOINT,
        target:
          "grid-power",
        timestamp,
        value: null,
        unit: "kW",
        lowerBound: 0,
        upperBound: 500,
        rationale:
          "Advisory setpoint from qualified solver output.",
      })
  );

const recommendationContract =
  createOptimizationDssRecommendationContract({
    qualifiedResult,
    recommendationKind:
      OPTIMIZATION_DSS_RECOMMENDATION_KIND.DISPATCH_SETPOINT,
    applicability:
      OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY.APPLICABLE,
    confidence:
      OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE.HIGH,
    actions,
    evidenceRefs: [
      builtModel.variables[0].variableId,
      builtModel.variables[1].variableId,
      builtModel.constraintRows[0].constraintRowId,
      builtModel.constraintRows[1].constraintRowId,
    ],
    rationale:
      "Generate advisory-only grid-power setpoints from qualified solver results.",
  });

const generationResult =
  generateOptimizationDssRecommendation({
    recommendationContract,
  });


assert.equal(
  generationResult.phase,
  "11.9"
);
pass("11.10 fixture consumes Phase 11.9 generation result");

assert.equal(
  generationResult.status,
  "GENERATED"
);
pass("11.10 fixture uses generated advisory recommendation");


const identity =
  buildOptimizationDssPersistenceIdentity({
    generationResult,
  });


assert.equal(
  identity.recordType,
  "OPTIMIZATION_DSS_RECOMMENDATION"
);
pass("persistence record type is explicit");

assert.equal(
  identity.persistenceKey.length,
  64
);
pass("persistence key is SHA-256 length");

assert.match(
  identity.persistenceKey,
  /^[a-f0-9]{64}$/
);
pass("persistence key is lowercase hexadecimal SHA-256");

assert.equal(
  identity.deterministic,
  true
);
pass("persistence key is explicitly deterministic");

assert.equal(
  identity.identityPayload.scope,
  "SITE"
);
pass("persistence identity preserves scope");

assert.equal(
  identity.identityPayload.scopeIdentity,
  optimizationContract.scopeIdentity
);
pass("persistence identity preserves scope identity by reference");

assert.equal(
  identity.identityPayload.horizon,
  horizon
);
pass("persistence identity preserves horizon by reference");

assert.equal(
  identity.identityPayload.recommendationKind,
  "DISPATCH_SETPOINT"
);
pass("persistence identity includes recommendation kind");

assert.equal(
  identity.identityPayload.generationStatus,
  "GENERATED"
);
pass("persistence identity includes generation status");


const identityAgain =
  buildOptimizationDssPersistenceIdentity({
    generationResult,
  });


assert.equal(
  identityAgain.persistenceKey,
  identity.persistenceKey
);
pass("identical validated input produces identical persistence key");


const persistenceContract =
  createOptimizationDssPersistenceContract({
    generationResult,
    persistenceIdentity:
      identity,
  });


assert.equal(
  persistenceContract.phase,
  "11.10"
);
pass("persistence contract preserves Phase 11.10 identity");

assert.equal(
  persistenceContract.layer,
  "OPTIMIZATION_DSS"
);
pass("persistence contract remains inside Optimization/DSS");

assert.equal(
  persistenceContract.upstreamPhase,
  "11.9"
);
pass("persistence contract preserves Phase 11.9 lineage");

assert.equal(
  persistenceContract.generationResult,
  generationResult
);
pass("Phase 11.9 generation result is preserved by reference");

assert.equal(
  persistenceContract.recommendationContract,
  recommendationContract
);
pass("Phase 11.8 recommendation contract is preserved by reference");

assert.equal(
  persistenceContract.qualifiedResult,
  qualifiedResult
);
pass("Phase 11.7 qualified result is preserved by reference");

assert.equal(
  persistenceContract.executionResult,
  executionResult
);
pass("Phase 11.6 execution result is preserved by reference");

assert.equal(
  persistenceContract.builtModel,
  builtModel
);
pass("Phase 11.4 built model is preserved by reference");

assert.equal(
  persistenceContract.persistenceIdentity,
  identity
);
pass("persistence identity is preserved by reference");

assert.equal(
  persistenceContract.writeMode,
  "UPSERT_BY_PERSISTENCE_KEY"
);
pass("persistence write mode is explicit");

assert.equal(
  persistenceContract.status,
  "CONTRACT_DEFINED"
);
pass("persistence remains contract-defined");

assert.equal(
  persistenceContract.persisted,
  false
);
pass("11.10 performs no persistence write");

assert.equal(
  persistenceContract.persistenceResult,
  null
);
pass("11.10 fabricates no persistence result");

assert.equal(
  persistenceContract.record.persistenceKey,
  identity.persistenceKey
);
pass("persistence record preserves exact deterministic key");

assert.equal(
  persistenceContract.record.scope,
  "SITE"
);
pass("persistence record preserves scope");

assert.equal(
  persistenceContract.record.scopeIdentity,
  optimizationContract.scopeIdentity
);
pass("persistence record preserves scope identity by reference");

assert.equal(
  persistenceContract.record.horizon,
  horizon
);
pass("persistence record preserves horizon by reference");

assert.equal(
  persistenceContract.record.recommendationKind,
  "DISPATCH_SETPOINT"
);
pass("persistence record preserves recommendation kind");

assert.equal(
  persistenceContract.record.generationStatus,
  "GENERATED"
);
pass("persistence record preserves generation status");

assert.equal(
  persistenceContract.record.generatedActionCount,
  2
);
pass("persistence record preserves generated action count");

assert.equal(
  persistenceContract.record.unavailableActionCount,
  0
);
pass("persistence record preserves unavailable action count");

assert.equal(
  persistenceContract.record.objectiveValue,
  0
);
pass("explicit zero objective value is preserved in persistence record");

assert.equal(
  persistenceContract.record.recommendation.actions[0].value,
  0
);
pass("explicit zero advisory setpoint is preserved in persistence record");

assert.equal(
  persistenceContract.record.advisoryOnly,
  true
);
pass("persistence record preserves advisory-only semantics");

assert.equal(
  persistenceContract.record.executable,
  false
);
pass("persistable record remains non-executable");

assert.equal(
  persistenceContract.record.autoDispatch,
  false
);
pass("persistable record cannot auto-dispatch");


expectThrow(
  () =>
    buildOptimizationDssPersistenceIdentity({
      generationResult: {
        phase: "11.8",
        layer:
          "OPTIMIZATION_DSS",
      },
    }),
  "pre-11.9 result cannot build persistence identity"
);

expectThrow(
  () =>
    createOptimizationDssPersistenceContract({
      generationResult: {
        phase: "11.8",
        layer:
          "OPTIMIZATION_DSS",
      },
      persistenceIdentity:
        identity,
    }),
  "pre-11.9 result cannot enter persistence contract"
);

expectThrow(
  () =>
    createOptimizationDssPersistenceContract({
      generationResult,
      persistenceIdentity: {
        persistenceKey:
          "bad",
      },
    }),
  "invalid persistence identity is rejected"
);

expectThrow(
  () =>
    createOptimizationDssPersistenceContract({
      generationResult,
      persistenceIdentity:
        identity,
      writeMode:
        "INSERT_ONLY",
    }),
  "undeclared persistence write mode is rejected"
);


const boundaryChecks =
  [
    ["contractOnly", true, "11.10 remains persistence-contract-only"],
    ["persistenceIncluded", false, "11.10 performs no persistence write"],
    ["mongoWriteIncluded", false, "MongoDB write remains excluded"],
    ["repositoryImplementationIncluded", false, "repository implementation remains excluded"],
    ["apiIncluded", false, "Optimization/DSS API remains excluded"],
    ["dashboardIncluded", false, "Optimization/DSS dashboard remains excluded"],
    ["automatedControlIncluded", false, "automated control remains excluded"],
    ["automaticDispatchAllowed", false, "11.10 cannot auto-dispatch"],
    ["executableActionProduced", false, "11.10 produces no executable action"],
    ["financialBiMutationIncluded", false, "11.10 cannot mutate Financial/BI"],
    ["forecastingMutationIncluded", false, "11.10 cannot mutate Forecasting"],
    ["engineeringAnalyticsMutationIncluded", false, "11.10 cannot mutate Engineering Analytics"],
    ["telemetryMutationIncluded", false, "11.10 cannot mutate telemetry"],
    ["eventMutationIncluded", false, "11.10 cannot mutate events"],
    ["missingMeansZero", false, "missing persistence evidence never means zero"],
    ["unavailableMeansZero", false, "UNAVAILABLE persistence evidence never means zero"],
    ["unitInferenceAllowed", false, "11.10 performs no unit inference"],
    ["currencyInferenceAllowed", false, "11.10 performs no currency inference"],
    ["currencyConversionAllowed", false, "11.10 performs no currency conversion"],
    ["tariffInferenceAllowed", false, "11.10 performs no tariff inference"],
    ["emissionFactorInferenceAllowed", false, "11.10 performs no emission-factor inference"],
    ["topologyInferenceAllowed", false, "11.10 performs no topology inference"],
    ["controllabilityInferenceAllowed", false, "11.10 performs no controllability inference"],
    ["implicitTimeGridAllowed", false, "11.10 performs no implicit time-grid generation"],
    ["implicitResamplingAllowed", false, "11.10 performs no implicit resampling"],
    ["interpolationAllowed", false, "11.10 performs no interpolation"],
    ["futureObservedDataFabricationAllowed", false, "11.10 prohibits future observed-data fabrication"],
  ];


for (
  const [
    key,
    expected,
    message,
  ] of boundaryChecks
) {
  assert.equal(
    OPTIMIZATION_DSS_PERSISTENCE_BOUNDARIES[key],
    expected
  );
  pass(message);
}


assert.equal(
  generationResult.recommendation.actions[0].value,
  0
);
pass("11.10 does not mutate Phase 11.9 recommendation value");

assert.equal(
  recommendationContract.generated,
  false
);
pass("11.10 does not mutate Phase 11.8 recommendation contract");

assert.equal(
  qualifiedResult.objectiveValue,
  0
);
pass("11.10 does not mutate Phase 11.7 objective value");

assert.equal(
  builtModel.variables[0].value,
  null
);
pass("11.10 does not mutate Phase 11.4 built model");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      persistenceContract
    )
);
pass("11.10 persistence contract is JSON serializable");


if (
  assertions !==
    79
) {
  throw new Error(
    `Expected 79 pre-final assertions, received ${assertions}.`
  );
}


pass(
  "11.10 validation assertion plan completed exactly"
);


console.log();
console.log(
  `Assertions passed: ${assertions}`
);
console.log();

console.log("================================================");
console.log("OPTIMIZATION/DSS PERSISTENCE CONTRACT VALIDATION PASSED");
console.log("================================================");
console.log();

console.log("Validated Phase 11.10 semantics:");
console.log("- Phase 11.10 consumes only validated Phase 11.9 recommendation-generation results");
console.log("- persistence identity is deterministic and represented by an explicit SHA-256 persistence key");
console.log("- persistence write mode is controlled as UPSERT_BY_PERSISTENCE_KEY");
console.log("- persistable records preserve scope, horizon, provenance, objective values and advisory actions");
console.log("- explicit zero objective values and setpoints remain legitimate persistence data");
console.log("- persisted recommendations remain advisory-only, non-executable and cannot auto-dispatch");
console.log("- no MongoDB write, repository implementation, API or dashboard occurs in 11.10");
console.log("- no unit, currency, tariff, emission-factor, topology or controllability inference occurs");
console.log("- upstream Financial/BI, Forecasting, Engineering Analytics, telemetry and event evidence remains immutable");
console.log("- Phase 11.11 Optimization/DSS Persistence Implementation remains the next checkpoint");
