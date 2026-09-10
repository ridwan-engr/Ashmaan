// scripts/validateOptimizationDssPersistenceImplementation.js

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  buildOptimizationDssPersistenceIdentity,
  createOptimizationDssPersistenceContract,
} from "../services/optimizationDss/optimizationDssPersistenceContract.js";

import {
  OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_PHASE,
  OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_LAYER,
  OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE,
  OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_REASON,
  OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_BOUNDARIES,
  persistOptimizationDssRecommendation,
} from "../services/optimizationDss/optimizationDssPersistenceService.js";


let assertions = 0;

function pass(message) {
  assertions += 1;
  console.log(`PASS ${assertions}: ${message}`);
}

async function expectReject(
  fn,
  message
) {
  await assert.rejects(fn);
  pass(message);
}


console.log();
console.log("================================================");
console.log("ASHMAAN OPTIMIZATION/DSS PERSISTENCE IMPLEMENTATION VALIDATION");
console.log("================================================");
console.log(`Phase: ${OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_PHASE}`);
console.log();


assert.equal(
  OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_PHASE,
  "11.11"
);
pass("11.11 phase identity is correct");

assert.equal(
  OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_LAYER,
  "OPTIMIZATION_DSS"
);
pass("11.11 remains inside Optimization/DSS");

assert.equal(
  OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_UPSTREAM_PHASE,
  "11.10"
);
pass("11.11 consumes validated Phase 11.10 persistence contract");

assert.deepEqual(
  Object.values(
    OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_REASON
  ),
  [
    "PERSISTED",
    "INVALID_PERSISTENCE_CONTRACT",
    "REPOSITORY_REQUIRED",
    "PERSISTENCE_ERROR",
  ]
);
pass("persistence implementation reasons are controlled");


const horizon =
  buildOptimizationDssHorizon({
    start: "2026-09-08T00:00:00Z",
    end: "2026-09-08T02:00:00Z",
    timezone: "Africa/Lagos",
  });

const optimizationContract =
  createOptimizationDssContract({
    horizon,
    scope:
      OPTIMIZATION_DSS_SCOPE.SITE,
    scopeIdentity: {
      vrmSiteId:
        "vrm-site-001",
    },
    objectives: [
      buildOptimizationDssObjective({
        name:
          "minimize-energy-cost",
        kind:
          OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_COST,
        currency:
          "NGN",
        sourceMetricName:
          "siteEnergyCost",
      }),
    ],
    decisionVariables: [
      buildOptimizationDssDecisionVariable({
        name:
          "grid-power",
        kind:
          OPTIMIZATION_DSS_DECISION_VARIABLE_KIND.GRID_POWER,
        unit:
          "kW",
        lowerBound:
          0,
        upperBound:
          500,
      }),
    ],
    constraints: [
      buildOptimizationDssConstraint({
        name:
          "grid-limit",
        kind:
          OPTIMIZATION_DSS_CONSTRAINT_KIND.GRID_LIMIT,
        parameters: {
          maxPower:
            500,
        },
      }),
    ],
    financialBiEvidence:
      [],
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
          value:
            1000,
          unit:
            null,
          currency:
            "NGN",
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

const modelContract =
  createOptimizationDssModelContract({
    optimizationContract,
    qualifiedInputs,
    timeIndex,
    variableBindings: [
      buildOptimizationVariableBinding({
        name:
          "grid-power",
        variableKind:
          OPTIMIZATION_DSS_DECISION_VARIABLE_KIND.GRID_POWER,
        unit:
          "kW",
        lowerBound:
          0,
        upperBound:
          500,
        timeIndexed:
          true,
      }),
    ],
    objectiveTerms: [
      buildOptimizationObjectiveTerm({
        name:
          "grid-cost-term",
        objectiveKind:
          OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_COST,
        sense:
          OPTIMIZATION_DSS_OBJECTIVE_SENSE.MINIMIZE,
        coefficient:
          1,
        currency:
          "NGN",
        variableName:
          "grid-power",
        evidenceMetricName:
          "siteEnergyCost",
      }),
    ],
    constraintBindings: [
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
          maxPower:
            500,
        },
      }),
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
        feasible:
          true,
        objectiveValue:
          0,
        variableResults:
          builtModel.variables.map(
            item => ({
              variableId:
                item.variableId,
              value:
                0,
            })
          ),
        constraintResults:
          builtModel.constraintRows.map(
            item => ({
              constraintRowId:
                item.constraintRowId,
              satisfied:
                true,
              residual:
                0,
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
        value:
          null,
        unit:
          "kW",
        lowerBound:
          0,
        upperBound:
          500,
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

const persistenceIdentity =
  buildOptimizationDssPersistenceIdentity({
    generationResult,
  });

const persistenceContract =
  createOptimizationDssPersistenceContract({
    generationResult,
    persistenceIdentity,
  });


assert.equal(
  persistenceContract.phase,
  "11.10"
);
pass("11.11 fixture consumes Phase 11.10 persistence contract");


const store =
  new Map();

let upsertCallCount =
  0;

const repository =
  Object.freeze({
    async upsertByPersistenceKey({
      persistenceKey,
      record,
    }) {
      upsertCallCount += 1;

      const persisted =
        Object.freeze({
          ...record,
          persistenceKey,
          databaseId:
            `mock-${persistenceKey.slice(0, 8)}`,
        });

      store.set(
        persistenceKey,
        persisted
      );

      return persisted;
    },
  });


const persisted =
  await persistOptimizationDssRecommendation({
    persistenceContract,
    repository,
  });


assert.equal(
  upsertCallCount,
  1
);
pass("persistence repository upsert is invoked exactly once");

assert.equal(
  persisted.phase,
  "11.11"
);
pass("persistence result preserves Phase 11.11 identity");

assert.equal(
  persisted.layer,
  "OPTIMIZATION_DSS"
);
pass("persistence implementation remains inside Optimization/DSS");

assert.equal(
  persisted.upstreamPhase,
  "11.10"
);
pass("persistence implementation preserves Phase 11.10 lineage");

assert.equal(
  persisted.persistenceContract,
  persistenceContract
);
pass("Phase 11.10 persistence contract is preserved by reference");

assert.equal(
  persisted.generationResult,
  generationResult
);
pass("Phase 11.9 generation result is preserved by reference");

assert.equal(
  persisted.recommendationContract,
  recommendationContract
);
pass("Phase 11.8 recommendation contract is preserved by reference");

assert.equal(
  persisted.qualifiedResult,
  qualifiedResult
);
pass("Phase 11.7 qualified result is preserved by reference");

assert.equal(
  persisted.executionResult,
  executionResult
);
pass("Phase 11.6 execution result is preserved by reference");

assert.equal(
  persisted.builtModel,
  builtModel
);
pass("Phase 11.4 built model is preserved by reference");

assert.equal(
  persisted.persistenceIdentity,
  persistenceIdentity
);
pass("deterministic persistence identity is preserved by reference");

assert.equal(
  persisted.writeMode,
  "UPSERT_BY_PERSISTENCE_KEY"
);
pass("UPSERT_BY_PERSISTENCE_KEY write mode is preserved");

assert.equal(
  persisted.status,
  "PERSISTED"
);
pass("successful repository write becomes PERSISTED");

assert.equal(
  persisted.reason,
  "PERSISTED"
);
pass("successful persistence reason is explicit");

assert.equal(
  persisted.persisted,
  true
);
pass("successful persistence sets persisted=true");

assert.equal(
  persisted.persistenceResult.persistenceKey,
  persistenceIdentity.persistenceKey
);
pass("persistence result preserves exact deterministic key");

assert.equal(
  persisted.persistenceResult.record.objectiveValue,
  0
);
pass("explicit zero objective value survives persistence");

assert.equal(
  persisted.persistenceResult.record.recommendation.actions[0].value,
  0
);
pass("explicit zero advisory setpoint survives persistence");

assert.equal(
  persisted.persistenceResult.record.advisoryOnly,
  true
);
pass("persisted record remains advisory-only");

assert.equal(
  persisted.persistenceResult.record.executable,
  false
);
pass("persisted record remains non-executable");

assert.equal(
  persisted.persistenceResult.record.autoDispatch,
  false
);
pass("persisted record cannot auto-dispatch");

assert.equal(
  persisted.recommendation.advisoryOnly,
  true
);
pass("returned persisted recommendation remains advisory-only");


const persistedAgain =
  await persistOptimizationDssRecommendation({
    persistenceContract,
    repository,
  });


assert.equal(
  upsertCallCount,
  2
);
pass("second persistence request performs controlled upsert");

assert.equal(
  persistedAgain.persistenceResult.persistenceKey,
  persisted.persistenceResult.persistenceKey
);
pass("repeated persistence preserves identical deterministic key");

assert.equal(
  store.size,
  1
);
pass("idempotent upsert retains one logical record for the same key");

assert.equal(
  store.get(
    persistenceIdentity.persistenceKey
  ).recommendation.actions[0].value,
  0
);
pass("idempotent record retains explicit zero advisory setpoint");


await expectReject(
  () =>
    persistOptimizationDssRecommendation({
      persistenceContract: {
        ...persistenceContract,
        phase:
          "11.9",
      },
      repository,
    }),
  "pre-11.10 contract cannot enter persistence implementation"
);

await expectReject(
  () =>
    persistOptimizationDssRecommendation({
      persistenceContract,
      repository:
        null,
    }),
  "persistence repository is mandatory"
);


const errorResult =
  await persistOptimizationDssRecommendation({
    persistenceContract,
    repository: {
      async upsertByPersistenceKey() {
        throw new Error(
          "fixture persistence failure"
        );
      },
    },
  });


assert.equal(
  errorResult.status,
  "ERROR"
);
pass("repository exception produces ERROR persistence status");

assert.equal(
  errorResult.reason,
  "PERSISTENCE_ERROR"
);
pass("repository exception reason is explicit");

assert.equal(
  errorResult.persisted,
  false
);
pass("repository exception preserves persisted=false");

assert.equal(
  errorResult.persistenceResult,
  null
);
pass("repository exception fabricates no persistence result");

assert.equal(
  errorResult.recommendation,
  null
);
pass("repository exception fabricates no persisted recommendation");


const invalidRecordResult =
  await persistOptimizationDssRecommendation({
    persistenceContract,
    repository: {
      async upsertByPersistenceKey() {
        return {
          persistenceKey:
            "different-key",
        };
      },
    },
  });


assert.equal(
  invalidRecordResult.status,
  "ERROR"
);
pass("repository key mismatch produces ERROR persistence status");

assert.equal(
  invalidRecordResult.persisted,
  false
);
pass("repository key mismatch cannot claim persistence success");


const currentDir =
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const repositorySource =
  fs.readFileSync(
    path.resolve(
      currentDir,
      "../services/optimizationDss/mongooseOptimizationDssPersistenceRepository.js"
    ),
    "utf8"
  );

const modelSource =
  fs.readFileSync(
    path.resolve(
      currentDir,
      "../models/OptimizationDssRecommendation.js"
    ),
    "utf8"
  );


assert.match(
  repositorySource,
  /findOneAndUpdate/
);
pass("Mongoose repository implements findOneAndUpdate");

assert.match(
  repositorySource,
  /upsert:\s*true/
);
pass("Mongoose repository uses upsert=true");

assert.match(
  repositorySource,
  /runValidators:\s*true/
);
pass("Mongoose repository enables write validation");

assert.match(
  repositorySource,
  /persistenceKey/
);
pass("Mongoose repository keys writes by persistenceKey");

assert.match(
  modelSource,
  /unique:\s*true/
);
pass("Mongoose persistence key is uniquely constrained");

assert.match(
  modelSource,
  /collection:\s*"optimizationDssRecommendations"/
);
pass("Mongoose collection name is explicit");

assert.match(
  modelSource,
  /advisoryOnly/
);
pass("Mongoose schema persists advisory-only flag");

assert.match(
  modelSource,
  /executable/
);
pass("Mongoose schema persists executable=false boundary");

assert.match(
  modelSource,
  /autoDispatch/
);
pass("Mongoose schema persists auto-dispatch boundary");


const boundaryChecks =
  [
    ["persistenceIncluded", true, "11.11 includes persistence execution"],
    ["mongoRepositoryImplemented", true, "11.11 includes Mongoose repository implementation"],
    ["liveMongoValidated", false, "live MongoDB Atlas persistence is not claimed by isolated validation"],
    ["apiIncluded", false, "Optimization/DSS API remains excluded"],
    ["dashboardIncluded", false, "Optimization/DSS dashboard remains excluded"],
    ["automatedControlIncluded", false, "automated control remains excluded"],
    ["automaticDispatchAllowed", false, "11.11 cannot auto-dispatch"],
    ["executableActionProduced", false, "11.11 produces no executable control action"],
    ["financialBiMutationIncluded", false, "11.11 cannot mutate Financial/BI"],
    ["forecastingMutationIncluded", false, "11.11 cannot mutate Forecasting"],
    ["engineeringAnalyticsMutationIncluded", false, "11.11 cannot mutate Engineering Analytics"],
    ["telemetryMutationIncluded", false, "11.11 cannot mutate telemetry"],
    ["eventMutationIncluded", false, "11.11 cannot mutate events"],
    ["missingMeansZero", false, "missing persistence data never means zero"],
    ["unavailableMeansZero", false, "UNAVAILABLE persistence data never means zero"],
    ["unitInferenceAllowed", false, "11.11 performs no unit inference"],
    ["currencyInferenceAllowed", false, "11.11 performs no currency inference"],
    ["currencyConversionAllowed", false, "11.11 performs no currency conversion"],
    ["tariffInferenceAllowed", false, "11.11 performs no tariff inference"],
    ["emissionFactorInferenceAllowed", false, "11.11 performs no emission-factor inference"],
    ["topologyInferenceAllowed", false, "11.11 performs no topology inference"],
    ["controllabilityInferenceAllowed", false, "11.11 performs no controllability inference"],
    ["implicitTimeGridAllowed", false, "11.11 performs no implicit time-grid generation"],
    ["implicitResamplingAllowed", false, "11.11 performs no implicit resampling"],
    ["interpolationAllowed", false, "11.11 performs no interpolation"],
    ["futureObservedDataFabricationAllowed", false, "11.11 prohibits future observed-data fabrication"],
  ];


for (
  const [
    key,
    expected,
    message,
  ] of boundaryChecks
) {
  assert.equal(
    OPTIMIZATION_DSS_PERSISTENCE_IMPLEMENTATION_BOUNDARIES[key],
    expected
  );
  pass(message);
}


assert.equal(
  persistenceContract.persisted,
  false
);
pass("11.11 does not mutate Phase 11.10 persistence contract");

assert.equal(
  generationResult.recommendation.actions[0].value,
  0
);
pass("11.11 does not mutate Phase 11.9 recommendation");

assert.equal(
  qualifiedResult.objectiveValue,
  0
);
pass("11.11 does not mutate Phase 11.7 objective value");

assert.equal(
  builtModel.variables[0].value,
  null
);
pass("11.11 does not mutate Phase 11.4 built model");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      persisted
    )
);
pass("11.11 successful persistence result is JSON serializable");

assert.doesNotThrow(
  () =>
    JSON.stringify(
      errorResult
    )
);
pass("11.11 error persistence result is JSON serializable");


if (
  assertions !==
    81
) {
  throw new Error(
    `Expected 81 pre-final assertions, received ${assertions}.`
  );
}


pass(
  "11.11 validation assertion plan completed exactly"
);


console.log();
console.log(
  `Assertions passed: ${assertions}`
);
console.log();

console.log("================================================");
console.log("OPTIMIZATION/DSS PERSISTENCE IMPLEMENTATION VALIDATION PASSED");
console.log("================================================");
console.log();

console.log("Validated Phase 11.11 semantics:");
console.log("- Phase 11.11 consumes only validated Phase 11.10 persistence contracts");
console.log("- persistence executes through an explicit repository using UPSERT_BY_PERSISTENCE_KEY");
console.log("- repeated writes with the same deterministic persistence key remain logically idempotent");
console.log("- Mongoose model and repository implementations are present with a unique persistence key and validated upsert");
console.log("- explicit zero objective values and advisory setpoints remain valid persisted data");
console.log("- persisted recommendations remain advisory-only, non-executable and cannot auto-dispatch");
console.log("- repository failures remain explicit and do not fabricate persistence success");
console.log("- isolated validation does not claim a live MongoDB Atlas write");
console.log("- no Optimization/DSS API or dashboard occurs in 11.11");
console.log("- upstream Financial/BI, Forecasting, Engineering Analytics, telemetry and event evidence remains immutable");
console.log("- Phase 11.12 Optimization/DSS API Contract remains the next checkpoint");
