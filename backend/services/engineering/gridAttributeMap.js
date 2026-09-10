// services/engineering/gridAttributeMap.js

/*
 * ================================================================
 * ASHMAAN
 * Phase 8.6B — Grid Semantic Attribute Map
 * ================================================================
 *
 * PURPOSE
 * -------
 * Lock the production-supported semantic roles of grid-related
 * telemetry discovered during Phase 8.6A.
 *
 * This file contains semantic qualification only.
 * It does NOT calculate power, energy, availability, outage duration,
 * import/export, reliability, or service interruption.
 * ================================================================
 */

export const GRID_ATTRIBUTE_ROLE = Object.freeze({
  DIRECT_GRID_POWER: "DIRECT_GRID_POWER",
  ACTIVE_INPUT_POWER: "ACTIVE_INPUT_POWER",
  ACTIVE_INPUT_VOLTAGE: "ACTIVE_INPUT_VOLTAGE",
  ACTIVE_INPUT_CURRENT: "ACTIVE_INPUT_CURRENT",
  ACTIVE_INPUT_FREQUENCY: "ACTIVE_INPUT_FREQUENCY",

  ACTIVE_SOURCE_IDENTITY: "ACTIVE_SOURCE_IDENTITY",
  PHYSICAL_ACTIVE_INPUT: "PHYSICAL_ACTIVE_INPUT",
  ACTIVE_INPUT_SERVICE_TYPE: "ACTIVE_INPUT_SERVICE_TYPE",

  SERVED_LOAD_CONTEXT: "SERVED_LOAD_CONTEXT",

  NOT_GRID_ANALYTICS: "NOT_GRID_ANALYTICS",
});

export const GRID_SEMANTIC_STATUS = Object.freeze({
  QUALIFIED: "QUALIFIED",
  CONTEXT_ONLY: "CONTEXT_ONLY",
  CONDITIONAL: "CONDITIONAL",
  BLOCKED: "BLOCKED",
});

export const GRID_ACTIVE_SOURCE = Object.freeze({
  NOT_AVAILABLE: 0,
  GRID: 1,
  GENERATOR: 2,
  SHORE: 3,
  INVERTING: 240,
});

export const GRID_POWER_DIRECTION_STATUS = Object.freeze({
  UNRESOLVED: "UNRESOLVED",
});

export const GRID_POWER_UNIT_STATUS = Object.freeze({
  UNRESOLVED: "UNRESOLVED",
});

export const GRID_ATTRIBUTE_MAP = Object.freeze({
  /*
   * --------------------------------------------------------------
   * Direct grid-meter electrical power
   * --------------------------------------------------------------
   *
   * Production evidence:
   *   deviceType       = Grid meter
   *   dbusServiceType  = grid
   *   descriptions     = Grid L1/L2/L3 - Power
   *   paths            = /Ac/L1/Power etc.
   *
   * These are direct grid measurements.
   *
   * However:
   *   - W/kW metadata is absent
   *   - sign convention has not been independently established
   *   - phase values must not be summed until topology/alignment
   *     qualification is performed by the later grid power engine
   */
  379: Object.freeze({
    attributeId: 379,
    role: GRID_ATTRIBUTE_ROLE.DIRECT_GRID_POWER,
    status: GRID_SEMANTIC_STATUS.QUALIFIED,
    phase: "L1",
    expectedDescription: "Grid L1 - Power",
    expectedDbusPath: "/Ac/L1/Power",
    expectedDeviceType: "Grid meter",
    expectedDbusServiceType: "grid",
    directGridMeasurement: true,
    sourceIdentityRequired: false,
    powerUnitStatus: GRID_POWER_UNIT_STATUS.UNRESOLVED,
    directionStatus: GRID_POWER_DIRECTION_STATUS.UNRESOLVED,
  }),

  380: Object.freeze({
    attributeId: 380,
    role: GRID_ATTRIBUTE_ROLE.DIRECT_GRID_POWER,
    status: GRID_SEMANTIC_STATUS.QUALIFIED,
    phase: "L2",
    expectedDescription: "Grid L2 - Power",
    expectedDbusPath: "/Ac/L2/Power",
    expectedDeviceType: "Grid meter",
    expectedDbusServiceType: "grid",
    directGridMeasurement: true,
    sourceIdentityRequired: false,
    powerUnitStatus: GRID_POWER_UNIT_STATUS.UNRESOLVED,
    directionStatus: GRID_POWER_DIRECTION_STATUS.UNRESOLVED,
  }),

  381: Object.freeze({
    attributeId: 381,
    role: GRID_ATTRIBUTE_ROLE.DIRECT_GRID_POWER,
    status: GRID_SEMANTIC_STATUS.QUALIFIED,
    phase: "L3",
    expectedDescription: "Grid L3 - Power",
    expectedDbusPath: "/Ac/L3/Power",
    expectedDeviceType: "Grid meter",
    expectedDbusServiceType: "grid",
    directGridMeasurement: true,
    sourceIdentityRequired: false,
    powerUnitStatus: GRID_POWER_UNIT_STATUS.UNRESOLVED,
    directionStatus: GRID_POWER_DIRECTION_STATUS.UNRESOLVED,
  }),

  /*
   * --------------------------------------------------------------
   * VE.Bus active-input power
   * --------------------------------------------------------------
   *
   * These measurements describe whichever AC input is active.
   *
   * Therefore they are NOT direct grid power.
   *
   * They may be used as grid-associated power only when independent
   * source-identity evidence establishes GRID for the relevant
   * temporal interval.
   */
  17: Object.freeze({
    attributeId: 17,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_POWER,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L1",
    expectedDescription: "Input power 1",
    expectedDbusPath: "/Ac/ActiveIn/L1/P",
    expectedDeviceType: "VE.Bus System",
    expectedDbusServiceType: "vebus",
    directGridMeasurement: false,
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
    powerUnitStatus: GRID_POWER_UNIT_STATUS.UNRESOLVED,
    directionStatus: GRID_POWER_DIRECTION_STATUS.UNRESOLVED,
  }),

  18: Object.freeze({
    attributeId: 18,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_POWER,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L2",
    expectedDescription: "Input power 2",
    expectedDbusPath: "/Ac/ActiveIn/L2/P",
    expectedDeviceType: "VE.Bus System",
    expectedDbusServiceType: "vebus",
    directGridMeasurement: false,
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
    powerUnitStatus: GRID_POWER_UNIT_STATUS.UNRESOLVED,
    directionStatus: GRID_POWER_DIRECTION_STATUS.UNRESOLVED,
  }),

  19: Object.freeze({
    attributeId: 19,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_POWER,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L3",
    expectedDescription: "Input power 3",
    expectedDbusPath: "/Ac/ActiveIn/L3/P",
    expectedDeviceType: "VE.Bus System",
    expectedDbusServiceType: "vebus",
    directGridMeasurement: false,
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
    powerUnitStatus: GRID_POWER_UNIT_STATUS.UNRESOLVED,
    directionStatus: GRID_POWER_DIRECTION_STATUS.UNRESOLVED,
  }),

  /*
   * --------------------------------------------------------------
   * Active-input voltage
   * --------------------------------------------------------------
   *
   * Useful for electrical-quality / source-presence analytics.
   * Not automatically grid voltage unless source identity qualifies it.
   */
  8: Object.freeze({
    attributeId: 8,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_VOLTAGE,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L1",
    expectedDbusPath: "/Ac/ActiveIn/L1/V",
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
  }),

  9: Object.freeze({
    attributeId: 9,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_VOLTAGE,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L2",
    expectedDbusPath: "/Ac/ActiveIn/L2/V",
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
  }),

  10: Object.freeze({
    attributeId: 10,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_VOLTAGE,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L3",
    expectedDbusPath: "/Ac/ActiveIn/L3/V",
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
  }),

  /*
   * --------------------------------------------------------------
   * Active-input current
   * --------------------------------------------------------------
   */
  11: Object.freeze({
    attributeId: 11,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_CURRENT,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L1",
    expectedDbusPath: "/Ac/ActiveIn/L1/I",
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
    directionStatus: GRID_POWER_DIRECTION_STATUS.UNRESOLVED,
  }),

  12: Object.freeze({
    attributeId: 12,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_CURRENT,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L2",
    expectedDbusPath: "/Ac/ActiveIn/L2/I",
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
    directionStatus: GRID_POWER_DIRECTION_STATUS.UNRESOLVED,
  }),

  13: Object.freeze({
    attributeId: 13,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_CURRENT,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L3",
    expectedDbusPath: "/Ac/ActiveIn/L3/I",
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
    directionStatus: GRID_POWER_DIRECTION_STATUS.UNRESOLVED,
  }),

  /*
   * --------------------------------------------------------------
   * Active-input frequency
   * --------------------------------------------------------------
   */
  14: Object.freeze({
    attributeId: 14,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_FREQUENCY,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L1",
    expectedDbusPath: "/Ac/ActiveIn/L1/F",
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
  }),

  15: Object.freeze({
    attributeId: 15,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_FREQUENCY,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L2",
    expectedDbusPath: "/Ac/ActiveIn/L2/F",
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
  }),

  16: Object.freeze({
    attributeId: 16,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_FREQUENCY,
    status: GRID_SEMANTIC_STATUS.CONDITIONAL,
    phase: "L3",
    expectedDbusPath: "/Ac/ActiveIn/L3/F",
    sourceIdentityRequired: true,
    requiredActiveSourceCode: GRID_ACTIVE_SOURCE.GRID,
  }),

  /*
   * --------------------------------------------------------------
   * Source identity
   * --------------------------------------------------------------
   */
  471: Object.freeze({
    attributeId: 471,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_SOURCE_IDENTITY,
    status: GRID_SEMANTIC_STATUS.QUALIFIED,
    expectedDescription: "AC-Input",
    expectedDbusPath: "/Ac/ActiveIn/Source",
    expectedDeviceType: "System overview",
    expectedDbusServiceType: "system",
    directGridMeasurement: false,
    codeMap: GRID_ACTIVE_SOURCE,
  }),

  /*
   * --------------------------------------------------------------
   * Physical active input
   * --------------------------------------------------------------
   *
   * This must NEVER be interpreted as source identity.
   */
  35: Object.freeze({
    attributeId: 35,
    role: GRID_ATTRIBUTE_ROLE.PHYSICAL_ACTIVE_INPUT,
    status: GRID_SEMANTIC_STATUS.CONTEXT_ONLY,
    expectedDescription: "Active input",
    expectedDbusPath: "/Ac/ActiveIn/ActiveInput",
    expectedDeviceType: "VE.Bus System",
    expectedDbusServiceType: "vebus",
    directGridMeasurement: false,
    identifiesGrid: false,
  }),

  /*
   * --------------------------------------------------------------
   * Active-input service type
   * --------------------------------------------------------------
   *
   * Production audit observed only numeric 0.
   * It currently provides no qualified discrimination between
   * grid/generator/shore/inverting.
   */
  1664: Object.freeze({
    attributeId: 1664,
    role: GRID_ATTRIBUTE_ROLE.ACTIVE_INPUT_SERVICE_TYPE,
    status: GRID_SEMANTIC_STATUS.CONTEXT_ONLY,
    expectedDescription: "Active Input Service Type",
    expectedDbusPath: "/Ac/ActiveIn/ServiceType",
    expectedDeviceType: "System overview",
    expectedDbusServiceType: "system",
    directGridMeasurement: false,
    sourceIdentityQualified: false,
  }),

  /*
   * --------------------------------------------------------------
   * Served-load context
   * --------------------------------------------------------------
   *
   * These belong to site electrical performance, not grid power.
   */
  131: Object.freeze({
    attributeId: 131,
    role: GRID_ATTRIBUTE_ROLE.SERVED_LOAD_CONTEXT,
    status: GRID_SEMANTIC_STATUS.CONTEXT_ONLY,
    phase: "L1",
    directGridMeasurement: false,
  }),

  132: Object.freeze({
    attributeId: 132,
    role: GRID_ATTRIBUTE_ROLE.SERVED_LOAD_CONTEXT,
    status: GRID_SEMANTIC_STATUS.CONTEXT_ONLY,
    phase: "L2",
    directGridMeasurement: false,
  }),

  133: Object.freeze({
    attributeId: 133,
    role: GRID_ATTRIBUTE_ROLE.SERVED_LOAD_CONTEXT,
    status: GRID_SEMANTIC_STATUS.CONTEXT_ONLY,
    phase: "L3",
    directGridMeasurement: false,
  }),

  567: Object.freeze({
    attributeId: 567,
    role: GRID_ATTRIBUTE_ROLE.SERVED_LOAD_CONTEXT,
    status: GRID_SEMANTIC_STATUS.CONTEXT_ONLY,
    phase: "L1",
    directGridMeasurement: false,
  }),

  568: Object.freeze({
    attributeId: 568,
    role: GRID_ATTRIBUTE_ROLE.SERVED_LOAD_CONTEXT,
    status: GRID_SEMANTIC_STATUS.CONTEXT_ONLY,
    phase: "L2",
    directGridMeasurement: false,
  }),

  569: Object.freeze({
    attributeId: 569,
    role: GRID_ATTRIBUTE_ROLE.SERVED_LOAD_CONTEXT,
    status: GRID_SEMANTIC_STATUS.CONTEXT_ONLY,
    phase: "L3",
    directGridMeasurement: false,
  }),
});

/*
 * Output-side VE.Bus attributes discovered in 8.6A.
 *
 * These are explicitly NOT grid measurements.
 */
export const GRID_EXCLUDED_OUTPUT_ATTRIBUTES = Object.freeze([
  20, // /Ac/Out/L1/V
  21, // /Ac/Out/L2/V
  22, // /Ac/Out/L3/V

  23, // /Ac/Out/L1/I
  24, // /Ac/Out/L2/I
  25, // /Ac/Out/L3/I

  26, // /Ac/Out/L1/F

  29, // /Ac/Out/L1/P
  30, // /Ac/Out/L2/P
  31, // /Ac/Out/L3/P
]);

/*
 * Other discovered VE.Bus attributes which do not represent grid
 * electrical measurements.
 */
export const GRID_EXCLUDED_NON_GRID_ATTRIBUTES = Object.freeze([
  6,  // MK2 version
  27, // Active input current limit
  32, // DC voltage
  33, // DC current
  34, // phase count / topology context
  39, // VE.Bus state of charge
  40, // VE.Bus operating state
]);

export const GRID_DIRECT_POWER_ATTRIBUTES = Object.freeze([
  379,
  380,
  381,
]);

export const GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES =
  Object.freeze([17, 18, 19]);

export const GRID_ACTIVE_INPUT_VOLTAGE_ATTRIBUTES =
  Object.freeze([8, 9, 10]);

export const GRID_ACTIVE_INPUT_CURRENT_ATTRIBUTES =
  Object.freeze([11, 12, 13]);

export const GRID_ACTIVE_INPUT_FREQUENCY_ATTRIBUTES =
  Object.freeze([14, 15, 16]);

export const GRID_SOURCE_CONTEXT_ATTRIBUTES = Object.freeze([
  471,
  35,
  1664,
]);

export const GRID_SERVED_LOAD_CONTEXT_ATTRIBUTES = Object.freeze([
  131,
  132,
  133,
  567,
  568,
  569,
]);

export const GRID_ANALYTICS_QUERY_ATTRIBUTES = Object.freeze([
  ...GRID_DIRECT_POWER_ATTRIBUTES,
  ...GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES,
  ...GRID_ACTIVE_INPUT_VOLTAGE_ATTRIBUTES,
  ...GRID_ACTIVE_INPUT_CURRENT_ATTRIBUTES,
  ...GRID_ACTIVE_INPUT_FREQUENCY_ATTRIBUTES,
  ...GRID_SOURCE_CONTEXT_ATTRIBUTES,
  ...GRID_SERVED_LOAD_CONTEXT_ATTRIBUTES,
]);

export function getGridAttributeSemantic(attributeId) {
  const id = Number(attributeId);

  if (!Number.isFinite(id)) {
    return null;
  }

  return GRID_ATTRIBUTE_MAP[id] || null;
}

export function isDirectGridPowerAttribute(attributeId) {
  return GRID_DIRECT_POWER_ATTRIBUTES.includes(Number(attributeId));
}

export function isConditionalActiveInputPowerAttribute(attributeId) {
  return GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES.includes(
    Number(attributeId)
  );
}

export function isGridSourceIdentityAttribute(attributeId) {
  return Number(attributeId) === 471;
}

export function isServedLoadContextAttribute(attributeId) {
  return GRID_SERVED_LOAD_CONTEXT_ATTRIBUTES.includes(
    Number(attributeId)
  );
}

export function isExcludedGridOutputAttribute(attributeId) {
  return GRID_EXCLUDED_OUTPUT_ATTRIBUTES.includes(Number(attributeId));
}

export function activeSourceCodeToName(value) {
  const code = Number(value);

  switch (code) {
    case GRID_ACTIVE_SOURCE.NOT_AVAILABLE:
      return "NOT_AVAILABLE";

    case GRID_ACTIVE_SOURCE.GRID:
      return "GRID";

    case GRID_ACTIVE_SOURCE.GENERATOR:
      return "GENERATOR";

    case GRID_ACTIVE_SOURCE.SHORE:
      return "SHORE";

    case GRID_ACTIVE_SOURCE.INVERTING:
      return "INVERTING";

    default:
      return "UNKNOWN";
  }
}