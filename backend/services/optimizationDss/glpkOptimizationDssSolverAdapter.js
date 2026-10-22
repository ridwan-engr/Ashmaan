// services/optimizationDss/glpkOptimizationDssSolverAdapter.js

import GLPK from "glpk.js/node";

import {
  OPTIMIZATION_DSS_SOLVER_KIND,
  OPTIMIZATION_DSS_SOLVER_STATUS,
  OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON,
} from "./optimizationDssSolverContract.js";


export const OPTIMIZATION_DSS_GLPK_ADAPTER_PHASE =
  "11.6A";

export const OPTIMIZATION_DSS_GLPK_ADAPTER_LAYER =
  "OPTIMIZATION_DSS";


export const OPTIMIZATION_DSS_GLPK_ADAPTER_BOUNDARIES =
  Object.freeze({
    solverAdapterOnly: true,

    modelTranslationIncluded: true,

    solverExecutionIncluded: true,

    resultNormalizationIncluded: true,

    recommendationGenerated: false,

    persistenceIncluded: false,

    apiIncluded: false,

    dashboardIncluded: false,

    automaticDispatchIncluded: false,

    modelMutationIncluded: false,

    evidenceMutationIncluded: false,

    missingMeansZero: false,

    unavailableMeansZero: false,

    unitInferenceAllowed: false,

    topologyInferenceAllowed: false,

    interpolationAllowed: false,

    resamplingAllowed: false,
  });


let glpkInstancePromise = null;


async function getGlpk() {
  if (!glpkInstancePromise) {
    glpkInstancePromise =
      Promise.resolve(
        GLPK()
      );
  }

  return glpkInstancePromise;
}


function requireFiniteNumber(
  value,
  field
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `${field}_INVALID`
    );
  }

  return value;
}


function normalizeTolerance(
  value,
  fallback
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return fallback;
  }

  return value;
}


function normalizeBoundValue({
  value,
  lowerBound,
  upperBound,
  tolerance,
}) {
  requireFiniteNumber(
    value,
    "SOLVER_VARIABLE_VALUE"
  );

  if (
    typeof lowerBound === "number" &&
    Number.isFinite(lowerBound)
  ) {
    if (
      value < lowerBound &&
      lowerBound - value <= tolerance
    ) {
      value = lowerBound;
    }
  }

  if (
    typeof upperBound === "number" &&
    Number.isFinite(upperBound)
  ) {
    if (
      value > upperBound &&
      value - upperBound <= tolerance
    ) {
      value = upperBound;
    }
  }

  return value;
}


function glpkVariableBound({
  glpk,
  variable,
}) {
  const lowerBound =
    variable.lowerBound;

  const upperBound =
    variable.upperBound;

  requireFiniteNumber(
    lowerBound,
    `VARIABLE_LOWER_BOUND:${variable.variableId}`
  );

  requireFiniteNumber(
    upperBound,
    `VARIABLE_UPPER_BOUND:${variable.variableId}`
  );

  if (
    upperBound < lowerBound
  ) {
    throw new Error(
      `VARIABLE_BOUNDS_INVALID:${variable.variableId}`
    );
  }

  if (
    lowerBound === upperBound
  ) {
    return {
      name:
        variable.variableId,

      type:
        glpk.GLP_FX,

      lb:
        lowerBound,

      ub:
        upperBound,
    };
  }

  return {
    name:
      variable.variableId,

    type:
      glpk.GLP_DB,

    lb:
      lowerBound,

    ub:
      upperBound,
  };
}


function objectiveDirection({
  glpk,
  builtModel,
}) {
  const senses =
    new Set(
      builtModel.objectiveRows.map(
        row =>
          row.sense
      )
    );

  if (
    senses.size !== 1
  ) {
    throw new Error(
      "OBJECTIVE_SENSE_INCONSISTENT"
    );
  }

  const [sense] =
    [...senses];

  if (
    sense === "MINIMIZE"
  ) {
    return glpk.GLP_MIN;
  }

  if (
    sense === "MAXIMIZE"
  ) {
    return glpk.GLP_MAX;
  }

  throw new Error(
    `OBJECTIVE_SENSE_UNSUPPORTED:${sense}`
  );
}


function buildObjective({
  glpk,
  builtModel,
}) {
  const coefficients =
    new Map();

  for (
    const row of
    builtModel.objectiveRows
  ) {
    if (
      typeof row.variableId !== "string" ||
      row.variableId.length === 0
    ) {
      throw new Error(
        "OBJECTIVE_VARIABLE_ID_INVALID"
      );
    }

    requireFiniteNumber(
      row.coefficient,
      `OBJECTIVE_COEFFICIENT:${row.variableId}`
    );

    coefficients.set(
      row.variableId,
      (
        coefficients.get(
          row.variableId
        ) ?? 0
      ) +
        row.coefficient
    );
  }

  return {
    direction:
      objectiveDirection({
        glpk,
        builtModel,
      }),

    name:
      "ashmaanOptimizationObjective",

    vars:
      [...coefficients.entries()]
        .map(
          ([
            variableId,
            coefficient,
          ]) => ({
            name:
              variableId,

            coef:
              coefficient,
          })
        ),
  };
}


function constraintBound({
  glpk,
  constraint,
}) {
  const rhs =
    constraint.rightHandSide;

  requireFiniteNumber(
    rhs,
    `CONSTRAINT_RHS:${constraint.constraintRowId}`
  );

  switch (
    constraint.operator
  ) {
    case "EQUAL":
      return {
        type:
          glpk.GLP_FX,

        lb:
          rhs,

        ub:
          rhs,
      };

    case "LESS_THAN_OR_EQUAL":
      return {
        type:
          glpk.GLP_UP,

        lb:
          0,

        ub:
          rhs,
      };

    case "GREATER_THAN_OR_EQUAL":
      return {
        type:
          glpk.GLP_LO,

        lb:
          rhs,

        ub:
          0,
      };

    default:
      throw new Error(
        `CONSTRAINT_OPERATOR_UNSUPPORTED:${constraint.operator}`
      );
  }
}


function buildConstraintVariables(
  constraint
) {
  if (
    !Array.isArray(
      constraint.variableIds
    ) ||
    !Array.isArray(
      constraint.coefficients
    ) ||
    constraint.variableIds.length !==
      constraint.coefficients.length ||
    constraint.variableIds.length ===
      0
  ) {
    throw new Error(
      `CONSTRAINT_ALGEBRA_INVALID:${constraint.constraintRowId}`
    );
  }

  return constraint.variableIds.map(
    (
      variableId,
      index
    ) => {
      if (
        typeof variableId !==
          "string" ||
        variableId.length === 0
      ) {
        throw new Error(
          `CONSTRAINT_VARIABLE_ID_INVALID:${constraint.constraintRowId}`
        );
      }

      const coefficient =
        constraint.coefficients[
          index
        ];

      requireFiniteNumber(
        coefficient,
        `CONSTRAINT_COEFFICIENT:${constraint.constraintRowId}:${variableId}`
      );

      return {
        name:
          variableId,

        coef:
          coefficient,
      };
    }
  );
}


function buildSubjectTo({
  glpk,
  builtModel,
}) {
  return builtModel.constraintRows.map(
    constraint => {
      if (
        constraint.algebraic !==
        true
      ) {
        throw new Error(
          `NON_ALGEBRAIC_CONSTRAINT_UNSUPPORTED:${constraint.constraintRowId}`
        );
      }

      return {
        name:
          constraint.constraintRowId,

        vars:
          buildConstraintVariables(
            constraint
          ),

        bnds:
          constraintBound({
            glpk,
            constraint,
          }),
      };
    }
  );
}


function buildGlpkModel({
  glpk,
  builtModel,
  solverKind,
}) {
  if (
    !builtModel ||
    typeof builtModel !==
      "object"
  ) {
    throw new Error(
      "BUILT_MODEL_REQUIRED"
    );
  }

  if (
    !Array.isArray(
      builtModel.variables
    ) ||
    builtModel.variables.length ===
      0
  ) {
    throw new Error(
      "BUILT_MODEL_VARIABLES_REQUIRED"
    );
  }

  if (
    !Array.isArray(
      builtModel.objectiveRows
    ) ||
    builtModel.objectiveRows.length ===
      0
  ) {
    throw new Error(
      "BUILT_MODEL_OBJECTIVE_REQUIRED"
    );
  }

  if (
    !Array.isArray(
      builtModel.constraintRows
    ) ||
    builtModel.constraintRows.length ===
      0
  ) {
    throw new Error(
      "BUILT_MODEL_CONSTRAINTS_REQUIRED"
    );
  }

  const model = {
    name:
      "ASHMAAN_OPTIMIZATION_DSS",

    objective:
      buildObjective({
        glpk,
        builtModel,
      }),

    subjectTo:
      buildSubjectTo({
        glpk,
        builtModel,
      }),

    bounds:
      builtModel.variables.map(
        variable =>
          glpkVariableBound({
            glpk,
            variable,
          })
      ),
  };

  if (
    solverKind ===
    OPTIMIZATION_DSS_SOLVER_KIND
      .GENERIC_MIXED_INTEGER_LINEAR
  ) {
    const integerVariables =
      builtModel.variables
        .filter(
          variable =>
            variable.variableKind ===
              "INTEGER" ||
            variable.variableKind ===
              "BINARY"
        )
        .map(
          variable =>
            variable.variableId
        );

    const binaryVariables =
      builtModel.variables
        .filter(
          variable =>
            variable.variableKind ===
            "BINARY"
        )
        .map(
          variable =>
            variable.variableId
        );

    if (
      integerVariables.length > 0
    ) {
      model.generals =
        integerVariables.filter(
          variableId =>
            !binaryVariables.includes(
              variableId
            )
        );
    }

    if (
      binaryVariables.length > 0
    ) {
      model.binaries =
        binaryVariables;
    }
  }

  return model;
}


function mapGlpkStatus({
  glpk,
  glpkStatus,
}) {
  switch (
    glpkStatus
  ) {
    case glpk.GLP_OPT:
      return {
        status:
          OPTIMIZATION_DSS_SOLVER_STATUS
            .OPTIMAL,

        terminationReason:
          OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON
            .OPTIMAL_SOLUTION,

        feasible:
          true,
      };

    case glpk.GLP_FEAS:
      return {
        status:
          OPTIMIZATION_DSS_SOLVER_STATUS
            .FEASIBLE,

        terminationReason:
          OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON
            .FEASIBLE_SOLUTION,

        feasible:
          true,
      };

    case glpk.GLP_NOFEAS:
    case glpk.GLP_INFEAS:
      return {
        status:
          OPTIMIZATION_DSS_SOLVER_STATUS
            .INFEASIBLE,

        terminationReason:
          OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON
            .INFEASIBLE_MODEL,

        feasible:
          false,
      };

    case glpk.GLP_UNBND:
      return {
        status:
          OPTIMIZATION_DSS_SOLVER_STATUS
            .UNBOUNDED,

        terminationReason:
          OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON
            .UNBOUNDED_MODEL,

        feasible:
          null,
      };

    default:
      return {
        status:
          OPTIMIZATION_DSS_SOLVER_STATUS
            .ERROR,

        terminationReason:
          OPTIMIZATION_DSS_SOLVER_TERMINATION_REASON
            .SOLVER_ERROR,

        feasible:
          null,
      };
  }
}


function evaluateConstraint({
  constraint,
  variableValueById,
  tolerance,
}) {
  let lhs = 0;

  for (
    let index = 0;
    index <
      constraint.variableIds.length;
    index += 1
  ) {
    const variableId =
      constraint.variableIds[
        index
      ];

    const coefficient =
      constraint.coefficients[
        index
      ];

    const value =
      variableValueById.get(
        variableId
      );

    if (
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      throw new Error(
        `CONSTRAINT_VARIABLE_RESULT_MISSING:${constraint.constraintRowId}:${variableId}`
      );
    }

    lhs +=
      coefficient *
      value;
  }

  const rhs =
    constraint.rightHandSide;

  requireFiniteNumber(
    rhs,
    `CONSTRAINT_RHS:${constraint.constraintRowId}`
  );

  const residual =
    lhs - rhs;

  let satisfied;

  switch (
    constraint.operator
  ) {
    case "EQUAL":
      satisfied =
        Math.abs(
          residual
        ) <= tolerance;
      break;

    case "LESS_THAN_OR_EQUAL":
      satisfied =
        lhs <=
        rhs + tolerance;
      break;

    case "GREATER_THAN_OR_EQUAL":
      satisfied =
        lhs >=
        rhs - tolerance;
      break;

    default:
      throw new Error(
        `CONSTRAINT_OPERATOR_UNSUPPORTED:${constraint.operator}`
      );
  }

  return {
    constraintRowId:
      constraint.constraintRowId,

    satisfied,

    residual,
  };
}


function buildVariableResults({
  builtModel,
  glpkVars,
  feasibilityTolerance,
}) {
  return builtModel.variables.map(
    variable => {
      const rawValue =
        glpkVars[
          variable.variableId
        ];

      if (
        typeof rawValue !==
          "number" ||
        !Number.isFinite(
          rawValue
        )
      ) {
        throw new Error(
          `SOLVER_VARIABLE_RESULT_MISSING:${variable.variableId}`
        );
      }

      return {
        variableId:
          variable.variableId,

        value:
          normalizeBoundValue({
            value:
              rawValue,

            lowerBound:
              variable.lowerBound,

            upperBound:
              variable.upperBound,

            tolerance:
              feasibilityTolerance,
          }),
      };
    }
  );
}


function buildConstraintResults({
  builtModel,
  variableResults,
  feasibilityTolerance,
}) {
  const variableValueById =
    new Map(
      variableResults.map(
        result => [
          result.variableId,
          result.value,
        ]
      )
    );

  return builtModel.constraintRows.map(
    constraint =>
      evaluateConstraint({
        constraint,
        variableValueById,
        tolerance:
          feasibilityTolerance,
      })
  );
}


export async function glpkOptimizationDssSolverAdapter({
  solverKind,
  options,
  builtModel,
} = {}) {
  if (
    !Object.values(
      OPTIMIZATION_DSS_SOLVER_KIND
    ).includes(
      solverKind
    )
  ) {
    throw new Error(
      "SOLVER_KIND_UNSUPPORTED"
    );
  }

  if (
    !options ||
    typeof options !==
      "object" ||
    Array.isArray(options)
  ) {
    throw new Error(
      "SOLVER_OPTIONS_REQUIRED"
    );
  }

  const glpk =
    await getGlpk();

  const feasibilityTolerance =
    normalizeTolerance(
      options.feasibilityTolerance,
      1e-6
    );

  const glpkModel =
    buildGlpkModel({
      glpk,
      builtModel,
      solverKind,
    });

  /*
   * GLPK.js v5 accepts tm_lim in milliseconds.
   *
   * The ASHMAAN solver contract expresses
   * timeLimitSeconds in seconds.
   */
  const solveOptions = {
    msglev:
      glpk.GLP_MSG_OFF,

    presol:
      true,

    tm_lim:
      options.timeLimitSeconds *
      1000,
  };

  /*
   * mipGap is meaningful only for MILP.
   * GLPK.js uses mipgap.
   */
  if (
    solverKind ===
      OPTIMIZATION_DSS_SOLVER_KIND
        .GENERIC_MIXED_INTEGER_LINEAR &&
    options.mipGap !== null &&
    options.mipGap !== undefined
  ) {
    solveOptions.mipgap =
      options.mipGap;
  }

  const startedAt =
    Date.now();

  const glpkOutput =
    glpk.solve(
      glpkModel,
      solveOptions
    );

  const elapsedMilliseconds =
    Date.now() -
    startedAt;

  if (
    !glpkOutput ||
    typeof glpkOutput !==
      "object" ||
    !glpkOutput.result ||
    typeof glpkOutput.result !==
      "object"
  ) {
    throw new Error(
      "GLPK_RESULT_INVALID"
    );
  }

  const glpkResult =
    glpkOutput.result;

  const mapped =
    mapGlpkStatus({
      glpk,
      glpkStatus:
        glpkResult.status,
    });

  /*
   * Only statuses that actually contain a
   * feasible primal solution should expose
   * dispatch variables.
   */
  const hasPrimalSolution =
    mapped.status ===
      OPTIMIZATION_DSS_SOLVER_STATUS
        .OPTIMAL ||
    mapped.status ===
      OPTIMIZATION_DSS_SOLVER_STATUS
        .FEASIBLE;

  if (
    !hasPrimalSolution
  ) {
    return Object.freeze({
      status:
        mapped.status,

      terminationReason:
        mapped.terminationReason,

      solverCompleted:
        true,

      feasible:
        mapped.feasible,

      objectiveValue:
        null,

      variableResults:
        null,

      constraintResults:
        null,

      solverMetadata:
        Object.freeze({
          adapter:
            "GLPK_JS_NODE",

          glpkStatus:
            glpkResult.status,

          glpkTimeSeconds:
            glpkOutput.time ??
            null,

          elapsedMilliseconds,

          variableCount:
            builtModel.variableCount,

          objectiveRowCount:
            builtModel.objectiveRowCount,

          constraintRowCount:
            builtModel.constraintRowCount,

          solverKind,

          phase:
            OPTIMIZATION_DSS_GLPK_ADAPTER_PHASE,
        }),
    });
  }

  requireFiniteNumber(
    glpkResult.z,
    "GLPK_OBJECTIVE_VALUE"
  );

  if (
    !glpkResult.vars ||
    typeof glpkResult.vars !==
      "object" ||
    Array.isArray(
      glpkResult.vars
    )
  ) {
    throw new Error(
      "GLPK_VARIABLE_RESULTS_INVALID"
    );
  }

  const variableResults =
    buildVariableResults({
      builtModel,

      glpkVars:
        glpkResult.vars,

      feasibilityTolerance,
    });

  const constraintResults =
    buildConstraintResults({
      builtModel,

      variableResults,

      feasibilityTolerance,
    });

  const unsatisfiedConstraintCount =
    constraintResults.filter(
      result =>
        result.satisfied !==
        true
    ).length;

  if (
    unsatisfiedConstraintCount >
    0
  ) {
    throw new Error(
      `SOLVER_CONSTRAINT_VALIDATION_FAILED:${unsatisfiedConstraintCount}`
    );
  }

  return Object.freeze({
    status:
      mapped.status,

    terminationReason:
      mapped.terminationReason,

    solverCompleted:
      true,

    feasible:
      mapped.feasible,

    objectiveValue:
      glpkResult.z,

    variableResults:
      Object.freeze(
        variableResults
      ),

    constraintResults:
      Object.freeze(
        constraintResults
      ),

    solverMetadata:
      Object.freeze({
        adapter:
          "GLPK_JS_NODE",

        glpkStatus:
          glpkResult.status,

        glpkTimeSeconds:
          glpkOutput.time ??
          null,

        elapsedMilliseconds,

        variableCount:
          builtModel.variableCount,

        objectiveRowCount:
          builtModel.objectiveRowCount,

        constraintRowCount:
          builtModel.constraintRowCount,

        unsatisfiedConstraintCount,

        solverKind,

        phase:
          OPTIMIZATION_DSS_GLPK_ADAPTER_PHASE,
      }),
  });
}


export default
  glpkOptimizationDssSolverAdapter;