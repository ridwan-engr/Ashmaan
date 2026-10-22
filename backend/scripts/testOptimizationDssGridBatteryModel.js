// scripts/testOptimizationDssGridBatteryModel.js

import {
  OPTIMIZATION_DSS_SOLVER_KIND,
  OPTIMIZATION_DSS_SOLVER_STATUS,
  buildOptimizationDssSolverOptions,
  createOptimizationDssSolverContract,
} from "../services/optimizationDss/optimizationDssSolverContract.js";

import {
  executeOptimizationDssSolver,
} from "../services/optimizationDss/optimizationDssSolverExecutionService.js";

import {
  glpkOptimizationDssSolverAdapter,
} from "../services/optimizationDss/glpkOptimizationDssSolverAdapter.js";

import {
  buildOptimizationDssModel,
} from "../services/optimizationDss/optimizationDssModelBuildService.js";

import {
  formulateOptimizationDssModel,
} from "../services/optimizationDss/optimizationDssModelFormulationService.js";

import {
  OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE,
} from "../services/optimizationDss/optimizationDssInputQualificationService.js";

import {
  OPTIMIZATION_DSS_MODEL_CONTRACT_PHASE,
} from "../services/optimizationDss/optimizationDssModelContract.js";


const START =
  "2026-09-28T00:00:00.000Z";


const INTERVALS =
  24;


const HOUR_MS =
  60 * 60 * 1000;


function timestampAt(
  index
) {
  return new Date(
    new Date(
      START
    ).getTime() +
      index *
        HOUR_MS
  ).toISOString();
}


function evidence({
  metricName,
  value,
  unit,
  timestamp = START,
}) {
  return Object.freeze({
    metricName,
    value,
    unit,
    timestamp,

    status:
      "QUALIFIED",

    source:
      "SYNTHETIC_STRUCTURAL_TEST",
  });
}


/*
 * Deliberately synthetic.
 *
 * These values are NOT site 87666
 * engineering configuration and are
 * NOT persisted.
 */
const qualifiedEvidence =
  [];


for (
  let index = 0;
  index <
    INTERVALS;
  index += 1
) {
  qualifiedEvidence.push(
    evidence({
      metricName:
        "SITE_LOAD_POWER",

      value:
        5,

      unit:
        "kW",

      timestamp:
        timestampAt(
          index
        ),
    })
  );
}


qualifiedEvidence.push(
  evidence({
    metricName:
      "GRID_IMPORT_LIMIT",

    value:
      20,

    unit:
      "kW",
  }),

  evidence({
    metricName:
      "BATTERY_USABLE_CAPACITY",

    value:
      10,

    unit:
      "kWh",
  }),

  evidence({
    metricName:
      "BATTERY_MINIMUM_SOC",

    value:
      10,

    unit:
      "PERCENT",
  }),

  evidence({
    metricName:
      "BATTERY_MAXIMUM_SOC",

    value:
      100,

    unit:
      "PERCENT",
  }),

  evidence({
    metricName:
      "BATTERY_MAX_CHARGE_POWER",

    value:
      4,

    unit:
      "kW",
  }),

  evidence({
    metricName:
      "BATTERY_MAX_DISCHARGE_POWER",

    value:
      4,

    unit:
      "kW",
  }),

  evidence({
    metricName:
      "BATTERY_CHARGE_EFFICIENCY",

    value:
      0.95,

    unit:
      "RATIO",
  }),

  evidence({
    metricName:
      "BATTERY_DISCHARGE_EFFICIENCY",

    value:
      0.95,

    unit:
      "RATIO",
  }),

  evidence({
    metricName:
      "INITIAL_BATTERY_SOC",

    value:
      80,

    unit:
      "PERCENT",
  })
);


/*
 * Minimum contract identity required by
 * the formulation/model-contract layer.
 *
 * This is a structural test object only.
 */
const optimizationContract =
  Object.freeze({
    phase:
      "11.1",

    layer:
      "OPTIMIZATION_DSS",

    scope:
      "SITE",

    scopeIdentity:
      Object.freeze({
        vrmSiteId:
          "STRUCTURAL_TEST_SITE",
      }),

    horizon:
      Object.freeze({
        start:
          START,

        end:
          timestampAt(
            INTERVALS
          ),

        timeSemantics:
          "[start,end)",
      }),

    objectives:
      Object.freeze([
        Object.freeze({
          kind:
            "MINIMIZE_GRID_IMPORT",

          weight:
            1,
        }),
      ]),

    decisionVariables:
      Object.freeze([]),

    constraints:
      Object.freeze([]),
  });


const qualifiedInputs =
  Object.freeze({
    phase:
      OPTIMIZATION_DSS_INPUT_QUALIFICATION_PHASE,

    layer:
      "OPTIMIZATION_DSS",

    contract:
      optimizationContract,

    qualifiedEvidence:
      Object.freeze([
        ...qualifiedEvidence,
      ]),
  });


console.log(
  "\n=============================================="
);

console.log(
  "ASHMAAN DSS GRID + BATTERY STRUCTURAL TEST"
);

console.log(
  "==============================================\n"
);


const formulation =
  formulateOptimizationDssModel({
    optimizationContract,
    qualifiedInputs,
  });


console.log(
  "Formulation status:",
  formulation.status
);

console.log(
  "Formulation reason:",
  formulation.reason
);


if (
  formulation.status !==
    "FORMULATED"
) {
  console.dir(
    formulation,
    {
      depth:
        8,
    }
  );

  process.exit(
    1
  );
}


if (
  formulation.modelContract.phase !==
    OPTIMIZATION_DSS_MODEL_CONTRACT_PHASE
) {
  throw new Error(
    "STRUCTURAL_TEST_MODEL_CONTRACT_PHASE_INVALID"
  );
}


const builtModel =
  buildOptimizationDssModel({
    modelContract:
      formulation.modelContract,
  });


/*
|--------------------------------------------------------------------------
| Variable counts
|--------------------------------------------------------------------------
*/

const variableCounts =
  Object.fromEntries(
    [
      "gridPower",
      "batteryChargePower",
      "batteryDischargePower",
      "batterySoc",
    ].map(
      bindingName => [
        bindingName,

        builtModel.variables.filter(
          variable =>
            variable.bindingName ===
              bindingName
        ).length,
      ]
    )
  );


/*
|--------------------------------------------------------------------------
| Constraint counts
|--------------------------------------------------------------------------
*/

const constraintCounts =
  Object.fromEntries(
    [
      "sitePowerBalance",
      "gridImportLimit",
      "batteryChargePowerLimit",
      "batteryDischargePowerLimit",
      "batteryInitialSoc",
      "batterySocDynamics",
    ].map(
      bindingName => [
        bindingName,

        builtModel.constraintRows.filter(
          constraint =>
            constraint.bindingName ===
              bindingName
        ).length,
      ]
    )
  );


console.log(
  "\nVARIABLE COUNTS"
);

console.table(
  variableCounts
);


console.log(
  "Total variables:",
  builtModel.variableCount
);


console.log(
  "\nCONSTRAINT COUNTS"
);

console.table(
  constraintCounts
);


console.log(
  "Total constraints:",
  builtModel.constraintRowCount
);


console.log(
  "\nOBJECTIVE ROWS:",
  builtModel.objectiveRowCount
);


/*
|--------------------------------------------------------------------------
| Locate important constraint rows
|--------------------------------------------------------------------------
*/

const initialSocConstraint =
  builtModel.constraintRows.find(
    row =>
      row.bindingName ===
        "batteryInitialSoc"
  );


const firstSocDynamic =
  builtModel.constraintRows.find(
    row =>
      row.bindingName ===
        "batterySocDynamics"
  );


const powerBalanceRows =
  builtModel.constraintRows.filter(
    row =>
      row.bindingName ===
        "sitePowerBalance"
  );


const firstPowerBalance =
  powerBalanceRows[0];


const lastPowerBalance =
  powerBalanceRows[
    powerBalanceRows.length -
      1
  ];


/*
|--------------------------------------------------------------------------
| Inspect power-balance RHS resolution
|--------------------------------------------------------------------------
*/

console.log(
  "\nFIRST POWER BALANCE CONSTRAINT"
);

console.dir(
  firstPowerBalance,
  {
    depth:
      null,
  }
);


console.log(
  "\nLAST POWER BALANCE CONSTRAINT"
);

console.dir(
  lastPowerBalance,
  {
    depth:
      null,
  }
);


/*
|--------------------------------------------------------------------------
| Inspect SOC constraints
|--------------------------------------------------------------------------
*/

console.log(
  "\nINITIAL SOC CONSTRAINT"
);

console.dir(
  initialSocConstraint,
  {
    depth:
      null,
  }
);


console.log(
  "\nFIRST SOC DYNAMIC CONSTRAINT"
);

console.dir(
  firstSocDynamic,
  {
    depth:
      null,
  }
);


/*
|--------------------------------------------------------------------------
| Structural count expectations
|--------------------------------------------------------------------------
*/

const expected =
  {
    gridPower:
      24,

    batteryChargePower:
      24,

    batteryDischargePower:
      24,

    batterySoc:
      25,

    totalVariables:
      97,

    sitePowerBalance:
      24,

    gridImportLimit:
      24,

    batteryChargePowerLimit:
      24,

    batteryDischargePowerLimit:
      24,

    batteryInitialSoc:
      1,

    batterySocDynamics:
      24,

    totalConstraints:
      121,

    objectiveRows:
      24,
  };


const actual =
  {
    ...variableCounts,

    totalVariables:
      builtModel.variableCount,

    ...constraintCounts,

    totalConstraints:
      builtModel.constraintRowCount,

    objectiveRows:
      builtModel.objectiveRowCount,
  };


const mismatches =
  Object.entries(
    expected
  ).filter(
    ([key, value]) =>
      actual[key] !==
        value
  );


if (
  mismatches.length >
    0
) {
  console.error(
    "\nSTRUCTURAL TEST: FAIL"
  );

  console.table(
    mismatches.map(
      ([key, expectedValue]) => ({
        item:
          key,

        expected:
          expectedValue,

        actual:
          actual[key],
      })
    )
  );

  process.exit(
    1
  );
}


/*
|--------------------------------------------------------------------------
| Power-balance RHS validation
|--------------------------------------------------------------------------
|
| For every dispatch interval:
|
| gridPower[t]
| + batteryDischargePower[t]
| - batteryChargePower[t]
| = SITE_LOAD_POWER[t]
|
| Synthetic load = 5 kW.
|
*/

if (
  powerBalanceRows.length !==
    INTERVALS
) {
  throw new Error(
    "STRUCTURAL_TEST_POWER_BALANCE_COUNT_INVALID"
  );
}


for (
  let index = 0;
  index <
    powerBalanceRows.length;
  index += 1
) {
  const row =
    powerBalanceRows[index];


  const expectedTimestamp =
    timestampAt(
      index
    );


  if (
    row.timestamp !==
      expectedTimestamp
  ) {
    throw new Error(
      `STRUCTURAL_TEST_POWER_BALANCE_TIMESTAMP_INVALID_${index}`
    );
  }


  if (
    row.rightHandSide !==
      5
  ) {
    throw new Error(
      `STRUCTURAL_TEST_POWER_BALANCE_RHS_INVALID_${index}`
    );
  }


  if (
    row.rightHandSideEvidenceMetricName !==
      "SITE_LOAD_POWER"
  ) {
    throw new Error(
      `STRUCTURAL_TEST_POWER_BALANCE_RHS_METRIC_INVALID_${index}`
    );
  }


  if (
    row.rightHandSideEvidence?.metricName !==
      "SITE_LOAD_POWER"
  ) {
    throw new Error(
      `STRUCTURAL_TEST_POWER_BALANCE_RHS_PROVENANCE_INVALID_${index}`
    );
  }


  if (
    row.rightHandSideEvidence?.timestamp !==
      expectedTimestamp
  ) {
    throw new Error(
      `STRUCTURAL_TEST_POWER_BALANCE_RHS_TIMESTAMP_INVALID_${index}`
    );
  }


  if (
    row.rightHandSideEvidence?.value !==
      5
  ) {
    throw new Error(
      `STRUCTURAL_TEST_POWER_BALANCE_RHS_EVIDENCE_VALUE_INVALID_${index}`
    );
  }


  if (
    !Array.isArray(
      row.coefficients
    ) ||
    row.coefficients.length !==
      3 ||
    row.coefficients[0] !==
      1 ||
    row.coefficients[1] !==
      1 ||
    row.coefficients[2] !==
      -1
  ) {
    throw new Error(
      `STRUCTURAL_TEST_POWER_BALANCE_COEFFICIENTS_INVALID_${index}`
    );
  }


  if (
    row.operator !==
      "EQUAL"
  ) {
    throw new Error(
      `STRUCTURAL_TEST_POWER_BALANCE_OPERATOR_INVALID_${index}`
    );
  }
}


/*
|--------------------------------------------------------------------------
| First SOC equation validation
|--------------------------------------------------------------------------
|
| Eusable = 10 kWh
| etaCharge = 0.95
| etaDischarge = 0.95
| dt = 1 h
|
| SOC[t+1] - SOC[t]
| - 9.5 * Pcharge[t]
| + 10.526315789... * Pdischarge[t]
| = 0
|
*/

const expectedSocCoefficients =
  [
    1,
    -1,
    -9.5,

    100 /
      (
        0.95 *
        10
      ),
  ];


const actualSocCoefficients =
  firstSocDynamic
    ?.coefficients;


if (
  !Array.isArray(
    actualSocCoefficients
  ) ||
  actualSocCoefficients.length !==
    expectedSocCoefficients.length
) {
  throw new Error(
    "STRUCTURAL_TEST_SOC_COEFFICIENTS_MISSING"
  );
}


const TOLERANCE =
  1e-10;


for (
  let index = 0;
  index <
    expectedSocCoefficients.length;
  index += 1
) {
  if (
    Math.abs(
      actualSocCoefficients[index] -
        expectedSocCoefficients[index]
    ) >
      TOLERANCE
  ) {
    throw new Error(
      `STRUCTURAL_TEST_SOC_COEFFICIENT_INVALID_${index}`
    );
  }
}


/*
|--------------------------------------------------------------------------
| Initial SOC validation
|--------------------------------------------------------------------------
*/

if (
  initialSocConstraint
    ?.rightHandSide !==
    80
) {
  throw new Error(
    "STRUCTURAL_TEST_INITIAL_SOC_INVALID"
  );
}


if (
  initialSocConstraint
    ?.timestamp !==
    START
) {
  throw new Error(
    "STRUCTURAL_TEST_INITIAL_SOC_TIMESTAMP_INVALID"
  );
}


if (
  initialSocConstraint
    ?.variableIds?.length !==
    1 ||
  initialSocConstraint
    ?.variableIds?.[0] !==
      `batterySoc@${START}`
) {
  throw new Error(
    "STRUCTURAL_TEST_INITIAL_SOC_VARIABLE_INVALID"
  );
}


/*
|--------------------------------------------------------------------------
| Terminal SOC state validation
|--------------------------------------------------------------------------
|
| 24 dispatch intervals require 25 SOC states:
|
| SOC[0] ... SOC[24]
|
*/

const batterySocVariables =
  builtModel.variables.filter(
    variable =>
      variable.bindingName ===
        "batterySoc"
  );


const terminalSoc =
  batterySocVariables[
    batterySocVariables.length -
      1
  ];


if (
  terminalSoc?.timestamp !==
    timestampAt(
      INTERVALS
    )
) {
  throw new Error(
    "STRUCTURAL_TEST_TERMINAL_SOC_TIMESTAMP_INVALID"
  );
}


/*
|--------------------------------------------------------------------------
| Structural results
|--------------------------------------------------------------------------
*/

console.log(
  "\nPOWER BALANCE RHS RESOLUTION CHECK: PASS"
);

console.log(
  "POWER BALANCE ALGEBRA CHECK: PASS"
);

console.log(
  "SOC COEFFICIENT CHECK: PASS"
);

console.log(
  "INITIAL SOC CHECK: PASS"
);

console.log(
  "TERMINAL SOC STATE CHECK: PASS"
);

console.log(
  "VARIABLE/CONSTRAINT COUNT CHECK: PASS"
);

console.log(
  "\nDSS GRID + BATTERY STRUCTURAL MODEL: PASS"
);


/*
|--------------------------------------------------------------------------
| Real GLPK solver execution
|--------------------------------------------------------------------------
|
| This extends the already-passing structural model into an actual
| optimization solve.
|
| It does not persist recommendations and does not perform automatic
| dispatch.
|
*/

console.log(
  "\n=============================================="
);

console.log(
  "ASHMAAN DSS GRID + BATTERY GLPK SOLVE"
);

console.log(
  "==============================================\n"
);


const solverOptions =
  buildOptimizationDssSolverOptions({
    feasibilityTolerance:
      1e-6,

    optimalityTolerance:
      1e-6,

    timeLimitSeconds:
      60,

    iterationLimit:
      100000,

    mipGap:
      null,
  });


const solverContract =
  createOptimizationDssSolverContract({
    builtModel,

    solverKind:
      OPTIMIZATION_DSS_SOLVER_KIND
        .GENERIC_LINEAR,

    options:
      solverOptions,
  });


const solverExecution =
  await executeOptimizationDssSolver({
    solverContract,

    solverAdapter:
      glpkOptimizationDssSolverAdapter,
  });


console.log(
  "Execution status:",
  solverExecution.status
);

console.log(
  "Execution reason:",
  solverExecution.reason
);


const solverResult =
  solverExecution.solverResult;


console.log(
  "Solver status:",
  solverResult?.status
);

console.log(
  "Termination reason:",
  solverResult?.terminationReason
);

console.log(
  "Feasible:",
  solverResult?.feasible
);

console.log(
  "Objective value:",
  solverResult?.objectiveValue
);

console.log(
  "Solver metadata:"
);

console.dir(
  solverResult?.solverMetadata,
  {
    depth:
      null,
  }
);


if (
  solverResult?.status !==
    OPTIMIZATION_DSS_SOLVER_STATUS
      .OPTIMAL
) {
  console.error(
    "\nDSS GRID + BATTERY GLPK SOLVE: FAILED"
  );

  console.dir(
    solverExecution,
    {
      depth:
        6,
    }
  );

  process.exit(
    1
  );
}


const variableResults =
  solverResult.variableResults;


if (
  !Array.isArray(
    variableResults
  )
) {
  throw new Error(
    "SOLVER_VARIABLE_RESULTS_MISSING"
  );
}


const resultByVariableId =
  new Map(
    variableResults.map(
      result => [
        result.variableId,
        result,
      ]
    )
  );


/*
 * Resolve results through the built model rather than
 * reconstructing variable IDs in this reporting layer.
 */
function solvedValueByBindingAndTimestamp(
  bindingName,
  timestamp
) {
  const variable =
    builtModel.variables.find(
      item =>
        item.bindingName ===
          bindingName &&
        item.timestamp ===
          timestamp
    );


  if (
    !variable
  ) {
    throw new Error(
      `BUILT_VARIABLE_MISSING:${bindingName}:${timestamp}`
    );
  }


  const result =
    resultByVariableId.get(
      variable.variableId
    );


  if (
    !result
  ) {
    throw new Error(
      `SOLVED_VARIABLE_MISSING:${variable.variableId}`
    );
  }


  if (
    typeof result.value !==
      "number" ||
    !Number.isFinite(
      result.value
    )
  ) {
    throw new Error(
      `SOLVED_VARIABLE_VALUE_INVALID:${variable.variableId}`
    );
  }


  return result.value;
}


const dispatchRows =
  Array.from(
    {
      length:
        INTERVALS,
    },
    (
      _,
      index
    ) => {
      const timestamp =
        timestampAt(
          index
        );


      return {
        timestamp,

        gridPower:
          solvedValueByBindingAndTimestamp(
            "gridPower",
            timestamp
          ),

        batteryChargePower:
          solvedValueByBindingAndTimestamp(
            "batteryChargePower",
            timestamp
          ),

        batteryDischargePower:
          solvedValueByBindingAndTimestamp(
            "batteryDischargePower",
            timestamp
          ),

        batterySoc:
          solvedValueByBindingAndTimestamp(
            "batterySoc",
            timestamp
          ),
      };
    }
  );


const solvedTerminalTimestamp =
  timestampAt(
    INTERVALS
  );


const solvedTerminalSoc =
  solvedValueByBindingAndTimestamp(
    "batterySoc",
    solvedTerminalTimestamp
  );


console.log(
  "\nOPTIMIZED DISPATCH"
);

console.table(
  dispatchRows
);


/*
|--------------------------------------------------------------------------
| Energy summary
|--------------------------------------------------------------------------
|
| Power values are kW.
| The synthetic dispatch interval is one hour.
|
| Energy = power * interval duration.
|
*/

const INTERVAL_HOURS =
  HOUR_MS /
  (
    60 *
    60 *
    1000
  );


const totalGridEnergy =
  dispatchRows.reduce(
    (
      total,
      row
    ) =>
      total +
      (
        row.gridPower *
        INTERVAL_HOURS
      ),
    0
  );


const totalBatteryChargeEnergy =
  dispatchRows.reduce(
    (
      total,
      row
    ) =>
      total +
      (
        row.batteryChargePower *
        INTERVAL_HOURS
      ),
    0
  );


const totalBatteryDischargeEnergy =
  dispatchRows.reduce(
    (
      total,
      row
    ) =>
      total +
      (
        row.batteryDischargePower *
        INTERVAL_HOURS
      ),
    0
  );


const initialSolvedSoc =
  solvedValueByBindingAndTimestamp(
    "batterySoc",
    START
  );


const constraintResults =
  solverResult.constraintResults;


if (
  !Array.isArray(
    constraintResults
  )
) {
  throw new Error(
    "SOLVER_CONSTRAINT_RESULTS_MISSING"
  );
}


const unsatisfiedConstraints =
  constraintResults.filter(
    result =>
      result.satisfied !==
        true
  );


const maximumConstraintViolation =
  constraintResults.reduce(
    (
      maximum,
      result
    ) => {
      /*
       * The solver adapter already determines whether each
       * constraint is satisfied according to its operator.
       *
       * A non-zero residual on an inequality can represent
       * legitimate slack rather than a violation.
       *
       * Therefore:
       *
       * satisfied === true  -> violation = 0
       * satisfied !== true  -> absolute residual, when finite
       */

      if (
        result.satisfied ===
          true
      ) {
        return maximum;
      }


      const violation =
        typeof result.residual ===
          "number" &&
        Number.isFinite(
          result.residual
        )
          ? Math.abs(
              result.residual
            )
          : Infinity;


      return Math.max(
        maximum,
        violation
      );
    },
    0
  );


console.log(
  "\nOPTIMIZATION SUMMARY"
);

console.table({
  objectiveValue:
    solverResult.objectiveValue,

  totalGridEnergyKWh:
    totalGridEnergy,

  totalBatteryChargeEnergyKWh:
    totalBatteryChargeEnergy,

  totalBatteryDischargeEnergyKWh:
    totalBatteryDischargeEnergy,

  initialSocPercent:
    initialSolvedSoc,

  terminalSocPercent:
    solvedTerminalSoc,

  variableResultCount:
    variableResults.length,

  constraintResultCount:
    constraintResults.length,

  unsatisfiedConstraintCount:
    unsatisfiedConstraints.length,

  maximumConstraintViolation,
});


/*
|--------------------------------------------------------------------------
| Post-solve integrity checks
|--------------------------------------------------------------------------
*/

if (
  variableResults.length !==
    builtModel.variableCount
) {
  throw new Error(
    `VARIABLE_RESULT_COUNT_MISMATCH:${variableResults.length}:${builtModel.variableCount}`
  );
}


if (
  constraintResults.length !==
    builtModel.constraintRowCount
) {
  throw new Error(
    `CONSTRAINT_RESULT_COUNT_MISMATCH:${constraintResults.length}:${builtModel.constraintRowCount}`
  );
}


if (
  unsatisfiedConstraints.length !==
    0
) {
  console.error(
    "\nUNSATISFIED CONSTRAINTS"
  );

  console.table(
    unsatisfiedConstraints
  );

  throw new Error(
    `UNSATISFIED_CONSTRAINTS:${unsatisfiedConstraints.length}`
  );
}


console.log(
  "\nGLPK OPTIMAL STATUS CHECK: PASS"
);

console.log(
  "GLPK VARIABLE RESULT COUNT CHECK: PASS"
);

console.log(
  "GLPK CONSTRAINT RESULT COUNT CHECK: PASS"
);

console.log(
  "GLPK CONSTRAINT SATISFACTION CHECK: PASS"
);

console.log(
  "\nDSS GRID + BATTERY GLPK SOLVE: PASS"
);