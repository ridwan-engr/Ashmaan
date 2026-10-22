// services/optimizationDss/optimizationDssRuntimeService.js

import {
  FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS,
  qualifyFinancialBiOptimizationDssIntegration,
  executeFinancialBiOptimizationDssIntegration,
} from "../integration/financialBiOptimizationDssIntegrationService.js";

import {
  OPTIMIZATION_DSS_OBJECTIVE_KIND,
} from "./optimizationDssContract.js";

import {
  qualifyOptimizationDssInputs,
} from "./optimizationDssInputQualificationService.js";

import {
  defineOptimizationDssProblem,
  OPTIMIZATION_DSS_PROBLEM_DEFINITION_STATUS,
} from "./optimizationDssProblemDefinitionService.js";

import {
  formulateOptimizationDssModel,
  OPTIMIZATION_DSS_MODEL_FORMULATION_STATUS,
} from "./optimizationDssModelFormulationService.js";

import {
  buildOptimizationDssModel,
  OPTIMIZATION_DSS_MODEL_BUILD_STATUS,
} from "./optimizationDssModelBuildService.js";

import {
  OPTIMIZATION_DSS_SOLVER_KIND,
  OPTIMIZATION_DSS_SOLVER_STATUS,
  buildOptimizationDssSolverOptions,
  createOptimizationDssSolverContract,
} from "./optimizationDssSolverContract.js";

import {
  executeOptimizationDssSolver,
  OPTIMIZATION_DSS_SOLVER_EXECUTION_STATUS,
} from "./optimizationDssSolverExecutionService.js";

import {
  glpkOptimizationDssSolverAdapter,
} from "./glpkOptimizationDssSolverAdapter.js";

import {
  qualifyOptimizationDssResult,
  OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS,
} from "./optimizationDssResultQualificationService.js";

import {
  OPTIMIZATION_DSS_RECOMMENDATION_KIND,
  OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY,
  OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE,
  buildOptimizationDssRecommendationAction,
  createOptimizationDssRecommendationContract,
} from "./optimizationDssRecommendationContract.js";

import {
  generateOptimizationDssRecommendation,
  OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS,
} from "./optimizationDssRecommendationGenerationService.js";

import {
  OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS,
  buildOptimizationDssPersistenceIdentity,
  createOptimizationDssPersistenceContract,
} from "./optimizationDssPersistenceContract.js";

import {
  persistOptimizationDssRecommendation,
} from "./optimizationDssPersistenceService.js";

export const OPTIMIZATION_DSS_RUNTIME_STATUS =
  Object.freeze({
    READY:
      "READY",

    UNAVAILABLE:
      "UNAVAILABLE",

    ERROR:
      "ERROR",
  });


export const OPTIMIZATION_DSS_RUNTIME_STAGE =
  Object.freeze({
    INTEGRATION:
      "INTEGRATION",

    INPUT_QUALIFICATION:
      "INPUT_QUALIFICATION",

    PROBLEM_DEFINITION:
      "PROBLEM_DEFINITION",

    MODEL_FORMULATION:
      "MODEL_FORMULATION",

    MODEL_BUILD:
      "MODEL_BUILD",

    SOLVER:
      "SOLVER",

    RESULT_QUALIFICATION:
      "RESULT_QUALIFICATION",

    RECOMMENDATION:
      "RECOMMENDATION",

    PERSISTENCE:
      "PERSISTENCE",

    COMPLETE:
      "COMPLETE",
  });


export const OPTIMIZATION_DSS_RUNTIME_REASON =
  Object.freeze({
    INTEGRATION_UNAVAILABLE:
      "INTEGRATION_UNAVAILABLE",

    INPUTS_UNAVAILABLE:
      "INPUTS_UNAVAILABLE",

    PROBLEM_UNAVAILABLE:
      "PROBLEM_UNAVAILABLE",

    MODEL_FORMULATION_UNAVAILABLE:
      "MODEL_FORMULATION_UNAVAILABLE",

    MODEL_BUILD_UNAVAILABLE:
      "MODEL_BUILD_UNAVAILABLE",

    SOLVER_UNAVAILABLE:
      "SOLVER_UNAVAILABLE",

    RESULT_UNAVAILABLE:
      "RESULT_UNAVAILABLE",

    RECOMMENDATION_UNAVAILABLE:
      "RECOMMENDATION_UNAVAILABLE",

    PERSISTENCE_UNAVAILABLE:
      "PERSISTENCE_UNAVAILABLE",

    OPTIMIZATION_COMPLETE:
      "OPTIMIZATION_COMPLETE",

    ERROR:
      "ERROR",
  });


const DISPATCH_BINDINGS =
  Object.freeze([
    "gridPower",
    "batteryChargePower",
    "batteryDischargePower",
  ]);


function freezeRuntimeResult({
  status,
  stage,
  reason,
  objectiveKind,

  integrationQualification = null,
  integrationExecution = null,
  inputQualification = null,
  problemDefinition = null,
  modelFormulation = null,
  modelBuild = null,
  solverContract = null,
  solverExecution = null,
  resultQualification = null,
  recommendationContract = null,
  recommendationGeneration = null,
  persistenceIdentity = null,
  persistenceContract = null,
  persistence = null,

  error = null,
} = {}) {
  return Object.freeze({
    status,
    stage,
    reason,

    objectiveKind,

    scope:
      inputQualification?.scope ??
      integrationExecution?.scope ??
      null,

    scopeIdentity:
      inputQualification
        ?.scopeIdentity ??
      integrationExecution
        ?.scopeIdentity ??
      null,

    horizon:
      inputQualification?.horizon ??
      integrationExecution?.horizon ??
      null,

    integrationQualification,

    integrationExecution,

    inputQualification,

    problemDefinition,

    modelFormulation,

    modelBuild,

    solverContract,

    solverExecution,

    resultQualification,

    recommendationContract,

    recommendation:
      recommendationGeneration,

    persistenceIdentity,

    persistenceContract,

    persistence,

    optimizationExecuted:
      solverExecution?.status ===
      OPTIMIZATION_DSS_SOLVER_EXECUTION_STATUS
        .EXECUTED,

    recommendationGenerated:
      recommendationGeneration?.status ===
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS
        .GENERATED ||
      recommendationGeneration?.status ===
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS
        .PARTIALLY_GENERATED,

    persisted:
      persistence?.status ===
      OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS
        .PERSISTED,

    error,
  });
}


function buildRuntimeEvidenceRefs({
  resultQualification,
} = {}) {
  const variableResults =
    Array.isArray(
      resultQualification?.variableResults
    )
      ? resultQualification.variableResults
      : [];

  const refs =
    variableResults
      .filter(
        (result) =>
          DISPATCH_BINDINGS.includes(
            result?.bindingName
          )
      )
      .map(
        (result) =>
          result.variableId
      )
      .filter(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0
      );

  return Object.freeze(
    [...new Set(refs)]
  );
}


function buildRuntimeRecommendationActions({
  resultQualification,
  modelBuild,
} = {}) {
  const variableResults =
    Array.isArray(
      resultQualification?.variableResults
    )
      ? resultQualification.variableResults
      : [];

  const builtVariables =
    Array.isArray(
      modelBuild?.variables
    )
      ? modelBuild.variables
      : [];

  const builtVariableById =
    new Map(
      builtVariables.map(
        (variable) => [
          variable.variableId,
          variable,
        ]
      )
    );

  const actions = [];

  for (
    const result of variableResults
  ) {
    if (
      !DISPATCH_BINDINGS.includes(
        result?.bindingName
      )
    ) {
      continue;
    }

    const builtVariable =
      builtVariableById.get(
        result.variableId
      );

    if (!builtVariable) {
      continue;
    }

    actions.push(
      buildOptimizationDssRecommendationAction({
        actionId:
          `${result.variableId}:dispatch`,

        kind:
          OPTIMIZATION_DSS_RECOMMENDATION_KIND
            .DISPATCH_SETPOINT,

        target:
          result.bindingName,

        timestamp:
          result.timestamp ?? null,

        value:
          result.value,

        unit:
          result.unit,

        lowerBound:
          builtVariable.lowerBound,

        upperBound:
          builtVariable.upperBound,

        rationale:
          "Advisory dispatch setpoint derived from the qualified Optimization DSS solution.",
      })
    );
  }

  return Object.freeze(actions);
}

function selectContractRelevantEvidence({
  contract,
  optimizationEvidence,
} = {}) {
  if (
    !contract ||
    typeof contract !== "object"
  ) {
    throw new Error(
      "OPTIMIZATION_CONTRACT_REQUIRED"
    );
  }

  if (
    !Array.isArray(
      optimizationEvidence
    )
  ) {
    throw new Error(
      "OPTIMIZATION_EVIDENCE_ARRAY_REQUIRED"
    );
  }

  /*
   * Prefer the canonical expectedMetricContracts generated
   * by the Phase 11.1 contract when available.
   */
  const expectedMetricNames =
    new Set();

  if (
    Array.isArray(
      contract.expectedMetricContracts
    )
  ) {
    for (
      const metricContract of
      contract.expectedMetricContracts
    ) {
      const metricName =
        metricContract?.metricName;

      if (
        typeof metricName === "string" &&
        metricName.trim()
      ) {
        expectedMetricNames.add(
          metricName
        );
      }
    }
  }

  /*
   * Backward-compatible derivation from objectives.
   */
  if (
    Array.isArray(
      contract.objectives
    )
  ) {
    for (
      const objective of
      contract.objectives
    ) {
      const metricName =
        objective?.sourceMetricName;

      if (
        typeof metricName === "string" &&
        metricName.trim()
      ) {
        expectedMetricNames.add(
          metricName
        );
      }
    }
  }

  /*
   * Backward-compatible derivation from constraint
   * evidence contracts.
   */
  if (
    Array.isArray(
      contract.constraints
    )
  ) {
    for (
      const constraint of
      contract.constraints
    ) {
      if (
        !Array.isArray(
          constraint?.evidenceContracts
        )
      ) {
        continue;
      }

      for (
        const evidenceContract of
        constraint.evidenceContracts
      ) {
        const metricName =
          evidenceContract?.metricName;

        if (
          typeof metricName === "string" &&
          metricName.trim()
        ) {
          expectedMetricNames.add(
            metricName
          );
        }
      }
    }
  }

  if (
    expectedMetricNames.size === 0
  ) {
    throw new Error(
      "OPTIMIZATION_EXPECTED_METRICS_REQUIRED"
    );
  }

  /*
   * Filtering is selection only.
   *
   * No value, timestamp, unit, currency, lineage or
   * evidence payload is mutated.
   *
   * Repeated time-series metrics are intentionally
   * preserved. Therefore all 24 SITE_LOAD_POWER points
   * remain separate evidence items.
   */
  return Object.freeze(
    optimizationEvidence.filter(
      evidence =>
        expectedMetricNames.has(
          evidence?.metricName
        )
    )
  );
}


export async function runOptimizationDssRuntime({
  /*
   * Phase 12.7 bootstrap evidence.
   *
   * This remains the evidence used to establish the
   * Optimization DSS contract and preserves the existing
   * Financial BI -> Optimization DSS integration boundary.
   */
  financialBiEvidence,

  /*
   * Canonical Phase 11.2G scalar evidence.
   *
   * Expected to contain the composed evidence required by
   * the optimization problem, including forecast,
   * engineering / VRM configuration and operational
   * evidence.
   *
   * No missing value is inferred or replaced.
   */
  optimizationEvidence = null,

  optimizationRequest,

  objectiveKind =
  OPTIMIZATION_DSS_OBJECTIVE_KIND
    .MINIMIZE_GRID_IMPORT,

  solverKind =
  OPTIMIZATION_DSS_SOLVER_KIND
    .GENERIC_LINEAR,

  solverOptions = null,

  solverAdapter =
  glpkOptimizationDssSolverAdapter,

  persistenceRepository = null,

  persist =
  false,
} = {}) {
  let integrationQualification =
    null;

  let integrationExecution =
    null;

  let inputQualification =
    null;

  let problemDefinition =
    null;

  let modelFormulation =
    null;

  let modelBuild =
    null;

  let solverContract =
    null;

  let solverExecution =
    null;

  let resultQualification =
    null;

  let recommendationContract =
    null;

  let recommendationGeneration =
    null;

  let persistenceIdentity =
    null;

  let persistenceContract =
    null;

  let persistence =
    null;


  try {
    /*
     * --------------------------------------------------
     * 1. FINANCIAL BI -> DSS INTEGRATION QUALIFICATION
     * --------------------------------------------------
     */

    integrationQualification =
      qualifyFinancialBiOptimizationDssIntegration({
        financialBiEvidence,
        optimizationRequest,
      });


    if (
      integrationQualification.status !==
      FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS
        .QUALIFIED
    ) {
      return freezeRuntimeResult({
        status:
          OPTIMIZATION_DSS_RUNTIME_STATUS
            .UNAVAILABLE,

        stage:
          OPTIMIZATION_DSS_RUNTIME_STAGE
            .INTEGRATION,

        reason:
          OPTIMIZATION_DSS_RUNTIME_REASON
            .INTEGRATION_UNAVAILABLE,

        objectiveKind,

        integrationQualification,
      });
    }


    /*
     * --------------------------------------------------
     * 2. FINANCIAL BI INTEGRATION EXECUTION
     * --------------------------------------------------
     */

    integrationExecution =
      executeFinancialBiOptimizationDssIntegration({
        qualifiedIntegration:
          integrationQualification,
      });


    if (
      integrationExecution.status !==
      FINANCIAL_BI_OPTIMIZATION_DSS_INTEGRATION_STATUS
        .EXECUTED ||
      !integrationExecution
        .inputQualification
    ) {
      return freezeRuntimeResult({
        status:
          OPTIMIZATION_DSS_RUNTIME_STATUS
            .UNAVAILABLE,

        stage:
          OPTIMIZATION_DSS_RUNTIME_STAGE
            .INPUT_QUALIFICATION,

        reason:
          OPTIMIZATION_DSS_RUNTIME_REASON
            .INPUTS_UNAVAILABLE,

        objectiveKind,

        integrationQualification,
        integrationExecution,
      });
    }


    /*
     * --------------------------------------------------
     * 3. CANONICAL DSS EVIDENCE QUALIFICATION
     * --------------------------------------------------
     *
     * Phase 12.7 establishes the Optimization DSS contract
     * from Financial BI.
     *
     * If Phase 11.2G canonical evidence has been supplied,
     * qualify that complete scalar evidence package against
     * the exact same Optimization DSS contract.
     *
     * This is the critical correction: the production
     * runtime must not continue using Financial BI evidence
     * alone when GRID + BATTERY formulation requires
     * forecast, engineering/configuration and operational
     * evidence.
     */

    if (
      optimizationEvidence !==
      null
    ) {
      const contract =
        integrationExecution
          .inputQualification
          .contract;

      const contractRelevantEvidence =
        selectContractRelevantEvidence({
          contract,
          optimizationEvidence,
        });

      inputQualification =
        qualifyOptimizationDssInputs({
          contract,

          /*
           * Phase 11.2 retains the historical parameter name
           * financialBiEvidence.
           *
           * Only contract-relevant canonical DSS evidence is
           * supplied here.
           *
           * Time-series points are NOT collapsed. For example,
           * all timestamp-distinct SITE_LOAD_POWER evidence
           * remains present.
           */
          financialBiEvidence:
            contractRelevantEvidence,
        });
    } else {
      inputQualification =
        integrationExecution
          .inputQualification;
    }

    if (
      !inputQualification ||
      (
        inputQualification.status !==
        "QUALIFIED" &&
        inputQualification.status !==
        "PARTIALLY_QUALIFIED"
      )
    ) {
      return freezeRuntimeResult({
        status:
          OPTIMIZATION_DSS_RUNTIME_STATUS
            .UNAVAILABLE,

        stage:
          OPTIMIZATION_DSS_RUNTIME_STAGE
            .INPUT_QUALIFICATION,

        reason:
          inputQualification?.reason ??
          OPTIMIZATION_DSS_RUNTIME_REASON
            .INPUTS_UNAVAILABLE,

        objectiveKind,

        integrationQualification,
        integrationExecution,
        inputQualification,
      });
    }


    /*
     * --------------------------------------------------
     * 4. PROBLEM DEFINITION
     * --------------------------------------------------
     */

    problemDefinition =
      defineOptimizationDssProblem({
        inputQualification,
        objectiveKind,
      });


    if (
      problemDefinition.status !==
      OPTIMIZATION_DSS_PROBLEM_DEFINITION_STATUS
        .READY
    ) {
      return freezeRuntimeResult({
        status:
          OPTIMIZATION_DSS_RUNTIME_STATUS
            .UNAVAILABLE,

        stage:
          OPTIMIZATION_DSS_RUNTIME_STAGE
            .PROBLEM_DEFINITION,

        reason:
          problemDefinition.reason ??
          OPTIMIZATION_DSS_RUNTIME_REASON
            .PROBLEM_UNAVAILABLE,

        objectiveKind,

        integrationQualification,
        integrationExecution,
        inputQualification,
        problemDefinition,
      });
    }


    /*
     * --------------------------------------------------
     * 5. MODEL FORMULATION
     * --------------------------------------------------
     */

    modelFormulation =
      formulateOptimizationDssModel({
        problemDefinition,
        inputQualification,
      });


    if (
      modelFormulation.status !==
      OPTIMIZATION_DSS_MODEL_FORMULATION_STATUS
        .FORMULATED
    ) {
      return freezeRuntimeResult({
        status:
          OPTIMIZATION_DSS_RUNTIME_STATUS
            .UNAVAILABLE,

        stage:
          OPTIMIZATION_DSS_RUNTIME_STAGE
            .MODEL_FORMULATION,

        reason:
          modelFormulation.reason ??
          OPTIMIZATION_DSS_RUNTIME_REASON
            .MODEL_FORMULATION_UNAVAILABLE,

        objectiveKind,

        integrationQualification,
        integrationExecution,
        inputQualification,
        problemDefinition,
        modelFormulation,
      });
    }


    /*
     * --------------------------------------------------
     * 6. NUMERICAL MODEL BUILD
     * --------------------------------------------------
     */

    modelBuild =
      buildOptimizationDssModel({
        modelContract:
          modelFormulation
            .modelContract,
      });


    if (
      modelBuild.status !==
      OPTIMIZATION_DSS_MODEL_BUILD_STATUS
        .BUILT
    ) {
      return freezeRuntimeResult({
        status:
          OPTIMIZATION_DSS_RUNTIME_STATUS
            .UNAVAILABLE,

        stage:
          OPTIMIZATION_DSS_RUNTIME_STAGE
            .MODEL_BUILD,

        reason:
          modelBuild.reason ??
          OPTIMIZATION_DSS_RUNTIME_REASON
            .MODEL_BUILD_UNAVAILABLE,

        objectiveKind,

        integrationQualification,
        integrationExecution,
        inputQualification,
        problemDefinition,
        modelFormulation,
        modelBuild,
      });
    }


    /*
     * --------------------------------------------------
     * 7. SOLVER CONTRACT
     * --------------------------------------------------
     */

    const effectiveSolverOptions =
      solverOptions ??
      buildOptimizationDssSolverOptions();


    solverContract =
      createOptimizationDssSolverContract({
        builtModel:
          modelBuild,

        solverKind,

        options:
          effectiveSolverOptions,
      });


    /*
     * --------------------------------------------------
     * 8. SOLVER EXECUTION
     * --------------------------------------------------
     */

    solverExecution =
      await executeOptimizationDssSolver({
        solverContract,

        solverAdapter,
      });


    if (
      solverExecution.status !==
      OPTIMIZATION_DSS_SOLVER_EXECUTION_STATUS
        .EXECUTED
    ) {
      return freezeRuntimeResult({
        status:
          OPTIMIZATION_DSS_RUNTIME_STATUS
            .UNAVAILABLE,

        stage:
          OPTIMIZATION_DSS_RUNTIME_STAGE
            .SOLVER,

        reason:
          solverExecution.reason ??
          OPTIMIZATION_DSS_RUNTIME_REASON
            .SOLVER_UNAVAILABLE,

        objectiveKind,

        integrationQualification,
        integrationExecution,
        inputQualification,
        problemDefinition,
        modelFormulation,
        modelBuild,
        solverContract,
        solverExecution,
      });
    }


    if (
      solverExecution
        ?.solverResult
        ?.status !==
      OPTIMIZATION_DSS_SOLVER_STATUS
        .OPTIMAL &&
      solverExecution
        ?.solverResult
        ?.status !==
      OPTIMIZATION_DSS_SOLVER_STATUS
        .FEASIBLE
    ) {
      return freezeRuntimeResult({
        status:
          OPTIMIZATION_DSS_RUNTIME_STATUS
            .UNAVAILABLE,

        stage:
          OPTIMIZATION_DSS_RUNTIME_STAGE
            .SOLVER,

        reason:
          solverExecution
            ?.solverResult
            ?.terminationReason ??
          OPTIMIZATION_DSS_RUNTIME_REASON
            .SOLVER_UNAVAILABLE,

        objectiveKind,

        integrationQualification,
        integrationExecution,
        inputQualification,
        problemDefinition,
        modelFormulation,
        modelBuild,
        solverContract,
        solverExecution,
      });
    }


    /*
     * --------------------------------------------------
     * 9. RESULT QUALIFICATION
     * --------------------------------------------------
     */

    resultQualification =
      qualifyOptimizationDssResult({
        executionResult:
          solverExecution,
      });


    if (
      resultQualification.status !==
      OPTIMIZATION_DSS_RESULT_QUALIFICATION_STATUS
        .QUALIFIED
    ) {
      return freezeRuntimeResult({
        status:
          OPTIMIZATION_DSS_RUNTIME_STATUS
            .UNAVAILABLE,

        stage:
          OPTIMIZATION_DSS_RUNTIME_STAGE
            .RESULT_QUALIFICATION,

        reason:
          resultQualification.reason ??
          OPTIMIZATION_DSS_RUNTIME_REASON
            .RESULT_UNAVAILABLE,

        objectiveKind,

        integrationQualification,
        integrationExecution,
        inputQualification,
        problemDefinition,
        modelFormulation,
        modelBuild,
        solverContract,
        solverExecution,
        resultQualification,
      });
    }


    /*
     * --------------------------------------------------
     * 10. RECOMMENDATION ACTIONS
     * --------------------------------------------------
     *
     * SOC is intentionally excluded here.
     *
     * batterySoc is a state trajectory, not a direct
     * dispatch setpoint.
     */

    const recommendationActions =
      buildRuntimeRecommendationActions({
        resultQualification,
        modelBuild,
      });


    const evidenceRefs =
      buildRuntimeEvidenceRefs({
        resultQualification,
      });


    if (
      recommendationActions.length === 0 ||
      evidenceRefs.length === 0
    ) {
      return freezeRuntimeResult({
        status:
          OPTIMIZATION_DSS_RUNTIME_STATUS
            .UNAVAILABLE,

        stage:
          OPTIMIZATION_DSS_RUNTIME_STAGE
            .RECOMMENDATION,

        reason:
          OPTIMIZATION_DSS_RUNTIME_REASON
            .RECOMMENDATION_UNAVAILABLE,

        objectiveKind,

        integrationQualification,
        integrationExecution,
        inputQualification,
        problemDefinition,
        modelFormulation,
        modelBuild,
        solverContract,
        solverExecution,
        resultQualification,
      });
    }


    /*
     * --------------------------------------------------
     * 11. RECOMMENDATION CONTRACT
     * --------------------------------------------------
     *
     * The recommendation remains advisory.
     *
     * No automatic dispatch is enabled by this runtime.
     */

    recommendationContract =
      createOptimizationDssRecommendationContract({
        qualifiedResult:
          resultQualification,

        recommendationKind:
          OPTIMIZATION_DSS_RECOMMENDATION_KIND
            .DISPATCH_SETPOINT,

        applicability:
          OPTIMIZATION_DSS_RECOMMENDATION_APPLICABILITY
            .APPLICABLE,

        /*
         * Do not infer HIGH confidence merely from an
         * optimal mathematical solution. Solver optimality
         * and recommendation confidence are different
         * concepts.
         */
        confidence:
          OPTIMIZATION_DSS_RECOMMENDATION_CONFIDENCE
            .UNAVAILABLE,

        actions:
          recommendationActions,

        evidenceRefs,

        rationale:
          `Advisory dispatch recommendation generated from a qualified ${objectiveKind} Optimization DSS solution.`,
      });


    /*
     * --------------------------------------------------
     * 12. RECOMMENDATION GENERATION
     * --------------------------------------------------
     */

    recommendationGeneration =
      generateOptimizationDssRecommendation({
        recommendationContract,
      });


    if (
      recommendationGeneration.status !==
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS
        .GENERATED &&
      recommendationGeneration.status !==
      OPTIMIZATION_DSS_RECOMMENDATION_GENERATION_STATUS
        .PARTIALLY_GENERATED
    ) {
      return freezeRuntimeResult({
        status:
          OPTIMIZATION_DSS_RUNTIME_STATUS
            .UNAVAILABLE,

        stage:
          OPTIMIZATION_DSS_RUNTIME_STAGE
            .RECOMMENDATION,

        reason:
          recommendationGeneration.reason ??
          OPTIMIZATION_DSS_RUNTIME_REASON
            .RECOMMENDATION_UNAVAILABLE,

        objectiveKind,

        integrationQualification,
        integrationExecution,
        inputQualification,
        problemDefinition,
        modelFormulation,
        modelBuild,
        solverContract,
        solverExecution,
        resultQualification,
        recommendationContract,
        recommendationGeneration,
      });
    }


    /*
     * --------------------------------------------------
     * 13. OPTIONAL PERSISTENCE
     * --------------------------------------------------
     */

    if (persist) {
      if (
        !persistenceRepository ||
        typeof persistenceRepository
          .upsertByPersistenceKey !==
        "function"
      ) {
        return freezeRuntimeResult({
          status:
            OPTIMIZATION_DSS_RUNTIME_STATUS
              .UNAVAILABLE,

          stage:
            OPTIMIZATION_DSS_RUNTIME_STAGE
              .PERSISTENCE,

          reason:
            OPTIMIZATION_DSS_RUNTIME_REASON
              .PERSISTENCE_UNAVAILABLE,

          objectiveKind,

          integrationQualification,
          integrationExecution,
          inputQualification,
          problemDefinition,
          modelFormulation,
          modelBuild,
          solverContract,
          solverExecution,
          resultQualification,
          recommendationContract,
          recommendationGeneration,
        });
      }


      persistenceIdentity =
        buildOptimizationDssPersistenceIdentity({
          generationResult:
            recommendationGeneration,
        });


      persistenceContract =
        createOptimizationDssPersistenceContract({
          generationResult:
            recommendationGeneration,

          persistenceIdentity,
        });


      persistence =
        await persistOptimizationDssRecommendation({
          persistenceContract,

          repository:
            persistenceRepository,
        });


      if (
        persistence.status !==
        OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS
          .PERSISTED
      ) {
        return freezeRuntimeResult({
          status:
            OPTIMIZATION_DSS_RUNTIME_STATUS
              .UNAVAILABLE,

          stage:
            OPTIMIZATION_DSS_RUNTIME_STAGE
              .PERSISTENCE,

          reason:
            persistence.reason ??
            OPTIMIZATION_DSS_RUNTIME_REASON
              .PERSISTENCE_UNAVAILABLE,

          objectiveKind,

          integrationQualification,
          integrationExecution,
          inputQualification,
          problemDefinition,
          modelFormulation,
          modelBuild,
          solverContract,
          solverExecution,
          resultQualification,
          recommendationContract,
          recommendationGeneration,
          persistenceIdentity,
          persistenceContract,
          persistence,
        });
      }
    }


    /*
     * --------------------------------------------------
     * 14. COMPLETE
     * --------------------------------------------------
     */

    return freezeRuntimeResult({
      status:
        OPTIMIZATION_DSS_RUNTIME_STATUS
          .READY,

      stage:
        OPTIMIZATION_DSS_RUNTIME_STAGE
          .COMPLETE,

      reason:
        OPTIMIZATION_DSS_RUNTIME_REASON
          .OPTIMIZATION_COMPLETE,

      objectiveKind,

      integrationQualification,
      integrationExecution,
      inputQualification,
      problemDefinition,
      modelFormulation,
      modelBuild,
      solverContract,
      solverExecution,
      resultQualification,
      recommendationContract,
      recommendationGeneration,
      persistenceIdentity,
      persistenceContract,
      persistence,
    });
  } catch (error) {
    return freezeRuntimeResult({
      status:
        OPTIMIZATION_DSS_RUNTIME_STATUS
          .ERROR,

      stage:
        persistenceContract
          ? OPTIMIZATION_DSS_RUNTIME_STAGE
            .PERSISTENCE
          : recommendationContract
            ? OPTIMIZATION_DSS_RUNTIME_STAGE
              .RECOMMENDATION
            : resultQualification
              ? OPTIMIZATION_DSS_RUNTIME_STAGE
                .RESULT_QUALIFICATION
              : solverContract
                ? OPTIMIZATION_DSS_RUNTIME_STAGE
                  .SOLVER
                : modelBuild
                  ? OPTIMIZATION_DSS_RUNTIME_STAGE
                    .MODEL_BUILD
                  : modelFormulation
                    ? OPTIMIZATION_DSS_RUNTIME_STAGE
                      .MODEL_FORMULATION
                    : problemDefinition
                      ? OPTIMIZATION_DSS_RUNTIME_STAGE
                        .PROBLEM_DEFINITION
                      : integrationExecution
                        ? OPTIMIZATION_DSS_RUNTIME_STAGE
                          .INPUT_QUALIFICATION
                        : OPTIMIZATION_DSS_RUNTIME_STAGE
                          .INTEGRATION,

      reason:
        OPTIMIZATION_DSS_RUNTIME_REASON
          .ERROR,

      objectiveKind,

      integrationQualification,
      integrationExecution,
      inputQualification,
      problemDefinition,
      modelFormulation,
      modelBuild,
      solverContract,
      solverExecution,
      resultQualification,
      recommendationContract,
      recommendationGeneration,
      persistenceIdentity,
      persistenceContract,
      persistence,

      error:
        Object.freeze({
          message:
            error instanceof Error
              ? error.message
              : String(error),
        }),
    });
  }
}


export default
  runOptimizationDssRuntime;