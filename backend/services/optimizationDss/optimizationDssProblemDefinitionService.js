// services/optimizationDss/optimizationDssProblemDefinitionService.js

import {
  OPTIMIZATION_DSS_OBJECTIVE_KIND,
} from "./optimizationDssContract.js";


export const OPTIMIZATION_DSS_PROBLEM_DEFINITION_PHASE =
  "11.2A";

export const OPTIMIZATION_DSS_PROBLEM_DEFINITION_LAYER =
  "OPTIMIZATION_DSS";


export const OPTIMIZATION_DSS_PROBLEM_DEFINITION_STATUS =
  Object.freeze({
    READY:
      "READY",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_PROBLEM_DEFINITION_REASON =
  Object.freeze({
    OBJECTIVE_EVIDENCE_READY:
      "OBJECTIVE_EVIDENCE_READY",

    MODEL_DEFINITION_READY:
      "MODEL_DEFINITION_READY",

    QUALIFIED_INPUTS_REQUIRED:
      "QUALIFIED_INPUTS_REQUIRED",

    OBJECTIVE_KIND_REQUIRED:
      "OBJECTIVE_KIND_REQUIRED",

    INSUFFICIENT_OPTIMIZATION_EVIDENCE:
      "INSUFFICIENT_OPTIMIZATION_EVIDENCE",

    NO_CONSTRUCTIBLE_RESOURCE_FORMULATION:
      "NO_CONSTRUCTIBLE_RESOURCE_FORMULATION",
  });


/*
 * Evidence required to establish the requested
 * optimization objective.
 *
 * These requirements do NOT, by themselves,
 * prove that a mathematical optimization model
 * can be constructed.
 */
const OBJECTIVE_REQUIREMENTS =
  Object.freeze({
    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_COST
    ]:
      Object.freeze([
        "SITE_LOAD_POWER",
        "GRID_IMPORT_TARIFF",
      ]),

    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_GRID_IMPORT
    ]:
      Object.freeze([
        "SITE_LOAD_POWER",
      ]),

    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_GENERATOR_ENERGY
    ]:
      Object.freeze([
        "SITE_LOAD_POWER",
        "GENERATOR_POWER_LIMIT",
      ]),

    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_EMISSIONS
    ]:
      Object.freeze([
        "SITE_LOAD_POWER",
        "EMISSION_FACTOR",
      ]),

    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MAXIMIZE_RENEWABLE_UTILIZATION
    ]:
      Object.freeze([
        "SITE_LOAD_POWER",
        "RENEWABLE_POWER_AVAILABLE",
      ]),

    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MAXIMIZE_SAVINGS
    ]:
      Object.freeze([
        "SITE_LOAD_POWER",
        "GRID_IMPORT_TARIFF",
      ]),
  });


/*
 * Explicit Engineering configuration bundles.
 *
 * A resource is constructible only when all
 * required metrics for that resource are
 * available from qualified Engineering evidence.
 *
 * No observed telemetry maximum is promoted to
 * an engineering limit.
 */
const RESOURCE_REQUIREMENTS =
  Object.freeze({
    GRID:
      Object.freeze([
        "GRID_IMPORT_LIMIT",
      ]),

    BATTERY:
      Object.freeze([
        "BATTERY_USABLE_CAPACITY",
        "BATTERY_MINIMUM_SOC",
        "BATTERY_MAXIMUM_SOC",
        "BATTERY_MAX_CHARGE_POWER",
        "BATTERY_MAX_DISCHARGE_POWER",
        "BATTERY_CHARGE_EFFICIENCY",
        "BATTERY_DISCHARGE_EFFICIENCY",
      ]),

    SOLAR:
      Object.freeze([
        "SOLAR_RATED_POWER",
      ]),

    GENERATOR:
      Object.freeze([
        "GENERATOR_MAXIMUM_POWER",
      ]),
  });


/*
 * Additional non-Engineering evidence required
 * before a configured resource can participate
 * in a dispatch formulation.
 *
 * Solar needs time-indexed available-power
 * evidence. Battery and Generator currently need
 * no additional metric-name requirement here;
 * their concrete formulation still occurs later.
 */
const RESOURCE_EXTERNAL_EVIDENCE_REQUIREMENTS =
  Object.freeze({
    GRID:
      Object.freeze([]),

    BATTERY:
      Object.freeze([
        "INITIAL_BATTERY_SOC",
      ]),

    SOLAR:
      Object.freeze([
        "RENEWABLE_POWER_AVAILABLE",
      ]),

    GENERATOR:
      Object.freeze([]),
  });


/*
 * Resource combinations that provide an actual
 * controllable dispatch alternative for each
 * objective.
 *
 * GRID alone is deliberately not a constructible
 * path for MINIMIZE_GRID_IMPORT because:
 *
 *   gridPower(t) = loadPower(t)
 *
 * without another controllable supply/storage
 * resource is not a meaningful optimization
 * problem.
 *
 * These are formulation-readiness rules, not
 * inferred physical topology.
 */
const OBJECTIVE_RESOURCE_PATHS =
  Object.freeze({
    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_GRID_IMPORT
    ]:
      Object.freeze([
        Object.freeze([
          "GRID",
          "BATTERY",
        ]),

        Object.freeze([
          "GRID",
          "SOLAR",
        ]),

        Object.freeze([
          "GRID",
          "GENERATOR",
        ]),
      ]),

    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_COST
    ]:
      Object.freeze([
        Object.freeze([
          "GRID",
          "BATTERY",
        ]),

        Object.freeze([
          "GRID",
          "SOLAR",
        ]),

        Object.freeze([
          "GRID",
          "GENERATOR",
        ]),
      ]),

    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_GENERATOR_ENERGY
    ]:
      Object.freeze([
        Object.freeze([
          "GENERATOR",
          "BATTERY",
        ]),

        Object.freeze([
          "GENERATOR",
          "SOLAR",
        ]),

        Object.freeze([
          "GRID",
          "GENERATOR",
        ]),
      ]),

    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MINIMIZE_EMISSIONS
    ]:
      Object.freeze([
        Object.freeze([
          "GRID",
          "BATTERY",
        ]),

        Object.freeze([
          "GRID",
          "SOLAR",
        ]),

        Object.freeze([
          "GRID",
          "GENERATOR",
        ]),

        Object.freeze([
          "GENERATOR",
          "BATTERY",
        ]),

        Object.freeze([
          "GENERATOR",
          "SOLAR",
        ]),
      ]),

    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MAXIMIZE_RENEWABLE_UTILIZATION
    ]:
      Object.freeze([
        Object.freeze([
          "SOLAR",
          "GRID",
        ]),

        Object.freeze([
          "SOLAR",
          "BATTERY",
        ]),

        Object.freeze([
          "SOLAR",
          "GENERATOR",
        ]),
      ]),

    [
      OPTIMIZATION_DSS_OBJECTIVE_KIND.MAXIMIZE_SAVINGS
    ]:
      Object.freeze([
        Object.freeze([
          "GRID",
          "BATTERY",
        ]),

        Object.freeze([
          "GRID",
          "SOLAR",
        ]),

        Object.freeze([
          "GRID",
          "GENERATOR",
        ]),
      ]),
  });


const BOUNDARIES =
  Object.freeze({
    missingMeansZero:
      false,

    unavailableMeansZero:
      false,

    aggregateEnergyConvertedToPower:
      false,

    timeSeriesFabricationAllowed:
      false,

    equipmentLimitInferenceAllowed:
      false,

    tariffInferenceAllowed:
      false,

    emissionFactorInferenceAllowed:
      false,

    batteryConstraintInferenceAllowed:
      false,

    generatorConstraintInferenceAllowed:
      false,

    gridConstraintInferenceAllowed:
      false,

    solarConstraintInferenceAllowed:
      false,

    observedMaximumUsedAsLimit:
      false,

    telemetryUsedAsConfiguredLimit:
      false,

    forecastEvidencePreserved:
      true,

    engineeringEvidencePreserved:
      true,

    operationalEvidencePreserved:
      true,

    financialBiEvidencePreserved:
      true,

    crossSourceMetricFabricationAllowed:
      false,

    optimizationExecuted:
      false,
  });


function assertObjectiveKind(
  objectiveKind
) {
  if (
    !Object.values(
      OPTIMIZATION_DSS_OBJECTIVE_KIND
    ).includes(
      objectiveKind
    )
  ) {
    throw new Error(
      OPTIMIZATION_DSS_PROBLEM_DEFINITION_REASON
        .OBJECTIVE_KIND_REQUIRED
    );
  }
}


function collectMetricNames(
  evidenceCollection
) {
  if (
    !Array.isArray(
      evidenceCollection
    )
  ) {
    return Object.freeze([]);
  }

  return Object.freeze(
    [
      ...new Set(
        evidenceCollection
          .filter(
            evidence =>
              evidence &&
              typeof evidence ===
              "object"
          )
          .filter(
            evidence =>
              evidence.status ===
              undefined ||
              evidence.status ===
              "QUALIFIED" ||
              evidence.available ===
              true ||
              evidence.payload
                ?.available ===
              true
          )
          .map(
            evidence =>
              evidence.metricName ??
              evidence.evidence
                ?.metricName ??
              evidence.sourceEvidence
                ?.metricName ??
              evidence.record
                ?.metricName ??
              null
          )
          .filter(
            metricName =>
              typeof metricName ===
              "string" &&
              metricName.trim()
          )
          .map(
            metricName =>
              metricName.trim()
          )
      ),
    ].sort()
  );
}


function collectQualifiedInputMetricNames(
  qualifiedInputs
) {
  const names =
    new Set();

  function collect(
    candidate
  ) {
    if (
      !candidate ||
      typeof candidate !==
      "object"
    ) {
      return;
    }

    const metricName =
      candidate.metricName ??
      candidate.evidence
        ?.metricName ??
      candidate.sourceEvidence
        ?.metricName ??
      candidate.record
        ?.metricName ??
      null;

    if (
      typeof metricName ===
      "string" &&
      metricName.trim()
    ) {
      names.add(
        metricName.trim()
      );
    }
  }


  const collections =
    [
      qualifiedInputs
        ?.qualifiedEvidence,

      qualifiedInputs
        ?.sourceEvidence,

      qualifiedInputs
        ?.financialBiEvidence,

      qualifiedInputs
        ?.forecastEvidence,

      qualifiedInputs
        ?.engineeringEvidence,

      qualifiedInputs
        ?.operationalEvidence,
    ];


  for (
    const collection of
    collections
  ) {
    if (
      Array.isArray(
        collection
      )
    ) {
      for (
        const item of
        collection
      ) {
        collect(
          item
        );
      }
    } else {
      collect(
        collection
      );
    }
  }


  return Object.freeze(
    [
      ...names,
    ].sort()
  );
}


function evaluateResourceReadiness({
  availableEvidenceMetricNames,
  availableEngineeringMetricNames,
} = {}) {
  const resources =
    {};


  for (
    const [
      resourceName,
      engineeringRequirements,
    ] of Object.entries(
      RESOURCE_REQUIREMENTS
    )
  ) {
    const externalRequirements =
      RESOURCE_EXTERNAL_EVIDENCE_REQUIREMENTS[
      resourceName
      ] ?? [];


    const missingEngineeringMetricNames =
      engineeringRequirements.filter(
        metricName =>
          !availableEngineeringMetricNames.includes(
            metricName
          )
      );


    const missingExternalEvidenceMetricNames =
      externalRequirements.filter(
        metricName =>
          !availableEvidenceMetricNames.includes(
            metricName
          )
      );


    const ready =
      missingEngineeringMetricNames
        .length ===
      0 &&
      missingExternalEvidenceMetricNames
        .length ===
      0;


    resources[
      resourceName
    ] =
      Object.freeze({
        resource:
          resourceName,

        ready,

        requiredEngineeringMetricNames:
          Object.freeze([
            ...engineeringRequirements,
          ]),

        missingEngineeringMetricNames:
          Object.freeze([
            ...missingEngineeringMetricNames,
          ]),

        requiredExternalEvidenceMetricNames:
          Object.freeze([
            ...externalRequirements,
          ]),

        missingExternalEvidenceMetricNames:
          Object.freeze([
            ...missingExternalEvidenceMetricNames,
          ]),
      });
  }


  return Object.freeze(
    resources
  );
}


function evaluateConstructibleResourcePaths({
  objectiveKind,
  resourceReadiness,
} = {}) {
  const candidatePaths =
    OBJECTIVE_RESOURCE_PATHS[
    objectiveKind
    ] ?? [];


  const pathEvaluations =
    candidatePaths.map(
      resources => {
        const unavailableResources =
          resources.filter(
            resource =>
              resourceReadiness[
                resource
              ]?.ready !==
              true
          );


        return Object.freeze({
          resources:
            Object.freeze([
              ...resources,
            ]),

          constructible:
            unavailableResources
              .length ===
            0,

          unavailableResources:
            Object.freeze([
              ...unavailableResources,
            ]),
        });
      }
    );


  const constructibleResourcePaths =
    pathEvaluations
      .filter(
        path =>
          path.constructible
      )
      .map(
        path =>
          path.resources
      );


  return Object.freeze({
    candidateResourcePaths:
      Object.freeze(
        pathEvaluations
      ),

    constructibleResourcePaths:
      Object.freeze(
        constructibleResourcePaths
      ),

    resourceFormulationConstructible:
      constructibleResourcePaths
        .length >
      0,
  });
}


function evaluateProblemReadiness({
  objectiveKind,
  availableEvidenceMetricNames,
  availableEngineeringMetricNames,
} = {}) {
  const requiredEvidenceMetricNames =
    Object.freeze([
      ...(
        OBJECTIVE_REQUIREMENTS[
        objectiveKind
        ] ?? []
      ),
    ]);


  const missingEvidenceMetricNames =
    Object.freeze(
      requiredEvidenceMetricNames.filter(
        metricName =>
          !availableEvidenceMetricNames.includes(
            metricName
          )
      )
    );


  const evidencePreflightSatisfied =
    missingEvidenceMetricNames
      .length ===
    0;


  const resourceReadiness =
    evaluateResourceReadiness({
      availableEvidenceMetricNames,
      availableEngineeringMetricNames,
    });


  const resourcePathEvaluation =
    evaluateConstructibleResourcePaths({
      objectiveKind,
      resourceReadiness,
    });


  const optimizationRequestConstructible =
    evidencePreflightSatisfied &&
    resourcePathEvaluation
      .resourceFormulationConstructible;


  let status =
    OPTIMIZATION_DSS_PROBLEM_DEFINITION_STATUS
      .UNAVAILABLE;

  let reason =
    OPTIMIZATION_DSS_PROBLEM_DEFINITION_REASON
      .INSUFFICIENT_OPTIMIZATION_EVIDENCE;


  if (
    evidencePreflightSatisfied &&
    !resourcePathEvaluation
      .resourceFormulationConstructible
  ) {
    reason =
      OPTIMIZATION_DSS_PROBLEM_DEFINITION_REASON
        .NO_CONSTRUCTIBLE_RESOURCE_FORMULATION;
  }


  if (
    optimizationRequestConstructible
  ) {
    status =
      OPTIMIZATION_DSS_PROBLEM_DEFINITION_STATUS
        .READY;

    reason =
      OPTIMIZATION_DSS_PROBLEM_DEFINITION_REASON
        .MODEL_DEFINITION_READY;
  }


  return Object.freeze({
    status,

    reason,

    requiredEvidenceMetricNames,

    missingEvidenceMetricNames,

    evidencePreflightSatisfied,

    resourceReadiness,

    candidateResourcePaths:
      resourcePathEvaluation
        .candidateResourcePaths,

    constructibleResourcePaths:
      resourcePathEvaluation
        .constructibleResourcePaths,

    resourceFormulationConstructible:
      resourcePathEvaluation
        .resourceFormulationConstructible,

    optimizationRequestConstructible,
  });
}


export function defineOptimizationDssProblem({
  qualifiedInputs,
  objectiveKind,
} = {}) {
  if (
    !qualifiedInputs ||
    typeof qualifiedInputs !==
    "object"
  ) {
    throw new Error(
      OPTIMIZATION_DSS_PROBLEM_DEFINITION_REASON
        .QUALIFIED_INPUTS_REQUIRED
    );
  }


  assertObjectiveKind(
    objectiveKind
  );


  const availableEvidenceMetricNames =
    collectQualifiedInputMetricNames(
      qualifiedInputs
    );


  const availableEngineeringMetricNames =
    collectMetricNames(
      qualifiedInputs
        ?.engineeringEvidence ??
      []
    );


  const readiness =
    evaluateProblemReadiness({
      objectiveKind,

      availableEvidenceMetricNames,

      availableEngineeringMetricNames,
    });


  /*
   * Even when the evidence/resource gate passes,
   * this service must not fabricate time indexes,
   * decision-variable bounds, objective
   * coefficients, or constraint parameters.
   *
   * Concrete mathematical model construction
   * occurs only after the qualified evidence
   * objects themselves are mapped into the
   * model-contract builders.
   */
  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_PROBLEM_DEFINITION_PHASE,

    layer:
      OPTIMIZATION_DSS_PROBLEM_DEFINITION_LAYER,

    status:
      readiness.status,

    reason:
      readiness.reason,

    objectiveKind,

    availableEvidenceMetricNames,

    availableEngineeringMetricNames,

    requiredEvidenceMetricNames:
      readiness
        .requiredEvidenceMetricNames,

    missingEvidenceMetricNames:
      readiness
        .missingEvidenceMetricNames,

    evidencePreflightSatisfied:
      readiness
        .evidencePreflightSatisfied,

    resourceReadiness:
      readiness
        .resourceReadiness,

    candidateResourcePaths:
      readiness
        .candidateResourcePaths,

    constructibleResourcePaths:
      readiness
        .constructibleResourcePaths,

    resourceFormulationConstructible:
      readiness
        .resourceFormulationConstructible,

    optimizationRequestConstructible:
      readiness
        .optimizationRequestConstructible,

    timeIndex:
      null,

    variableBindings:
      null,

    objectiveTerms:
      null,

    constraintBindings:
      null,

    optimizationExecutable:
      false,

    boundaries:
      BOUNDARIES,
  });
}


export function preflightOptimizationDssEvidence({
  financialBiEvidence = [],
  forecastEvidence = [],
  engineeringEvidence = [],
  operationalEvidence = [],
  objectiveKind,
} = {}) {
  if (
    !Array.isArray(
      financialBiEvidence
    )
  ) {
    throw new Error(
      "FINANCIAL_BI_EVIDENCE_ARRAY_REQUIRED"
    );
  }


  if (
    !Array.isArray(
      forecastEvidence
    )
  ) {
    throw new Error(
      "FORECAST_EVIDENCE_ARRAY_REQUIRED"
    );
  }


  if (
    !Array.isArray(
      engineeringEvidence
    )
  ) {
    throw new Error(
      "ENGINEERING_EVIDENCE_ARRAY_REQUIRED"
    );
  }

  if (
    !Array.isArray(
      operationalEvidence
    )
  ) {
    throw new Error(
      "OPERATIONAL_EVIDENCE_ARRAY_REQUIRED"
    );
  }

  assertObjectiveKind(
    objectiveKind
  );


  const availableFinancialBiMetricNames =
    collectMetricNames(
      financialBiEvidence
    );


  const availableForecastMetricNames =
    collectMetricNames(
      forecastEvidence
    );


  const availableEngineeringMetricNames =
    collectMetricNames(
      engineeringEvidence
    );

  const availableOperationalMetricNames =
    collectMetricNames(
      operationalEvidence
    );


  const availableEvidenceMetricNames =
    Object.freeze(
      [
        ...new Set([
          ...availableFinancialBiMetricNames,
          ...availableForecastMetricNames,
          ...availableEngineeringMetricNames,
           ...availableOperationalMetricNames,
        ]),
      ].sort()
    );


  const readiness =
    evaluateProblemReadiness({
      objectiveKind,

      availableEvidenceMetricNames,

      availableEngineeringMetricNames,

      availableOperationalMetricNames,
      
    });


  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_PROBLEM_DEFINITION_PHASE,

    layer:
      OPTIMIZATION_DSS_PROBLEM_DEFINITION_LAYER,

    status:
      readiness.status,

    reason:
      readiness.reason,

    objectiveKind,

    availableFinancialBiMetricNames,

    availableForecastMetricNames,

    availableEngineeringMetricNames,

    availableOperationalMetricNames,

    availableEvidenceMetricNames,

    requiredEvidenceMetricNames:
      readiness
        .requiredEvidenceMetricNames,

    missingEvidenceMetricNames:
      readiness
        .missingEvidenceMetricNames,

    evidencePreflightSatisfied:
      readiness
        .evidencePreflightSatisfied,

    resourceReadiness:
      readiness
        .resourceReadiness,

    candidateResourcePaths:
      readiness
        .candidateResourcePaths,

    constructibleResourcePaths:
      readiness
        .constructibleResourcePaths,

    resourceFormulationConstructible:
      readiness
        .resourceFormulationConstructible,

    optimizationRequestConstructible:
      readiness
        .optimizationRequestConstructible,

    /*
     * Preflight never executes the optimizer.
     *
     * Even after optimizationRequestConstructible
     * becomes true, model-contract construction
     * and solver execution remain separate stages.
     */
    optimizationExecutable:
      false,

    boundaries:
      BOUNDARIES,
  });
}