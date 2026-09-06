// backend/services/events/acInputRoleResolver.js

/*
|--------------------------------------------------------------------------
| ASHMAAN AC Input Role Resolver
|--------------------------------------------------------------------------
|
| Purpose:
|   Resolve an AC input into one of:
|
|     GRID
|     GENSET
|     UNKNOWN
|
| Important:
|   The fleet semantic audit proved that:
|
|   - AC Input 1 is NOT universally grid or generator.
|   - AC Input 2 is NOT universally grid or generator.
|   - source code 1/2 is configuration-dependent.
|   - "vebus" is not an electrical source identity.
|
| Therefore:
|
|   explicit "grid"   -> GRID
|   explicit "genset" -> GENSET
|   everything else   -> UNKNOWN
|
|--------------------------------------------------------------------------
*/


export const AC_INPUT_ROLE = Object.freeze({
  GRID: "GRID",
  GENSET: "GENSET",
  UNKNOWN: "UNKNOWN",
});


function normalizeText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase();
}


/*
|--------------------------------------------------------------------------
| Explicit service type classification
|--------------------------------------------------------------------------
*/

export function resolveServiceTypeRole(
  serviceType
) {
  const normalized =
    normalizeText(serviceType);


  if (
    normalized === "grid"
  ) {
    return AC_INPUT_ROLE.GRID;
  }


  if (
    normalized === "genset" ||
    normalized === "generator"
  ) {
    return AC_INPUT_ROLE.GENSET;
  }


  return AC_INPUT_ROLE.UNKNOWN;
}


/*
|--------------------------------------------------------------------------
| Resolve individual AC input
|--------------------------------------------------------------------------
*/

export function resolveAcInputRole({
  serviceType = null,
  source = null,
  inputNumber = null,
} = {}) {
  const explicitRole =
    resolveServiceTypeRole(
      serviceType
    );


  if (
    explicitRole !==
    AC_INPUT_ROLE.UNKNOWN
  ) {
    return {
      role: explicitRole,

      confidence: 1,

      basis:
        "EXPLICIT_SERVICE_TYPE",

      serviceType:
        serviceType ??
        null,

      source:
        source ??
        null,

      inputNumber:
        inputNumber ??
        null,
    };
  }


  /*
   * Deliberately do NOT infer a role from:
   *
   *   source = 1
   *   source = 2
   *   inputNumber = 1
   *   inputNumber = 2
   *
   * because the fleet audit proved those mappings vary.
   */

  return {
    role:
      AC_INPUT_ROLE.UNKNOWN,

    confidence: 0,

    basis:
      "INSUFFICIENT_SEMANTIC_EVIDENCE",

    serviceType:
      serviceType ??
      null,

    source:
      source ??
      null,

    inputNumber:
      inputNumber ??
      null,
  };
}


/*
|--------------------------------------------------------------------------
| Resolve both AC inputs
|--------------------------------------------------------------------------
*/

export function resolveInstallationAcInputs({
  acInput1ServiceType = null,
  acInput1Source = null,

  acInput2ServiceType = null,
  acInput2Source = null,
} = {}) {
  const input1 =
    resolveAcInputRole({
      serviceType:
        acInput1ServiceType,

      source:
        acInput1Source,

      inputNumber: 1,
    });


  const input2 =
    resolveAcInputRole({
      serviceType:
        acInput2ServiceType,

      source:
        acInput2Source,

      inputNumber: 2,
    });


  return {
    input1,
    input2,

    gridInputs: [
      input1,
      input2,
    ].filter(
      (input) =>
        input.role ===
        AC_INPUT_ROLE.GRID
    ),

    gensetInputs: [
      input1,
      input2,
    ].filter(
      (input) =>
        input.role ===
        AC_INPUT_ROLE.GENSET
    ),

    hasExplicitGrid:
      input1.role ===
        AC_INPUT_ROLE.GRID ||
      input2.role ===
        AC_INPUT_ROLE.GRID,

    hasExplicitGenset:
      input1.role ===
        AC_INPUT_ROLE.GENSET ||
      input2.role ===
        AC_INPUT_ROLE.GENSET,
  };
}


/*
|--------------------------------------------------------------------------
| Connected-state interpretation
|--------------------------------------------------------------------------
|
| Only classify connection status electrically AFTER the input role has
| been resolved.
|
*/

export function interpretConnectedState({
  role,
  connected,
} = {}) {
  const numericConnected =
    Number(connected);

  if (
    numericConnected !== 0 &&
    numericConnected !== 1
  ) {
    return {
      state: "UNKNOWN",
      reason:
        "Unsupported AC input connected-state value",
    };
  }

  return {
    state: "UNKNOWN",
    role: role ?? AC_INPUT_ROLE.UNKNOWN,
    connected: numericConnected,
    reason:
      "AC input connected-state is configuration/connection context and is not used as electrical source availability evidence.",
  };
}