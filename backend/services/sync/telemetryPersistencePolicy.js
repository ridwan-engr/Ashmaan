// services/sync/telemetryPersistencePolicy.js

/**
 * Historical telemetry persistence policy.
 *
 * This module defines the explicit VRM attribute boundary for telemetry
 * eligible for long-lived RAW persistence by the historical REST sync path.
 *
 * IMPORTANT:
 * - Attribute identity is taken ONLY from raw VRM idDataAttribute.
 * - Missing/malformed identity must fail closed.
 * - No attribute identity may be inferred from parameter names,
 *   descriptions, units, device type, or alternate ID fields.
 * - Observed numeric zero remains valid telemetry.
 */

/**
 * --------------------------------------------------------------------------
 * Mandatory production / engineering analytics contract
 * --------------------------------------------------------------------------
 *
 * This set is the resolved union of the currently verified runtime contracts:
 *
 * - BATTERY_PROFILE_ATTRIBUTE_IDS
 * - BATTERY_PRODUCTION_ATTRIBUTE_IDS
 * - GENERATOR_PRODUCTION_QUERY_ATTRIBUTES
 * - GRID_ANALYTICS_QUERY_ATTRIBUTES
 * - SOLAR_PRODUCTION_ATTRIBUTE_IDS
 * - ENERGY_SOURCE_PRODUCTION_ATTRIBUTE_IDS
 * - ENERGY_SOURCE_PRODUCTION_DIRECT_ATTRIBUTE_IDS
 *
 * These IDs are required so the historical sync policy cannot silently
 * starve existing production analytics of telemetry.
 */
export const HISTORICAL_ANALYTICS_REQUIRED_ATTRIBUTE_IDS =
    new Set([
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        35,
        39,
        47,
        49,
        51,
        58,
        59,
        80,
        81,
        82,
        84,
        85,
        86,
        90,
        94,
        95,
        96,
        97,
        98,
        102,
        104,
        106,
        107,
        113,
        115,
        118,
        131,
        132,
        133,
        137,
        138,
        139,
        144,
        241,
        243,
        244,
        245,
        273,
        285,
        338,
        339,
        340,
        379,
        380,
        381,
        416,
        419,
        421,
        428,
        434,
        438,
        442,
        471,
        518,
        567,
        568,
        569,
        583,
        586,
        741,
        742,
        1029,
        1035,
        1105,
        1664,
        1742,
        1871,
    ]);

/**
 * --------------------------------------------------------------------------
 * Explicit operational / dashboard historical telemetry
 * --------------------------------------------------------------------------
 *
 * These attributes were already intentionally retained by the historical
 * policy but are not members of the currently inspected Phase 8 production
 * analytics query union.
 *
 * They remain explicit rather than being discarded merely because they are
 * outside the production-analytics contract.
 *
 * Future review may narrow this set, but only after its consumers and
 * historical requirements have been validated.
 */
export const HISTORICAL_OPERATIONAL_ATTRIBUTE_IDS =
    new Set([
        // VE.Bus output / electrical detail
        20,
        21,
        22,
        23,
        24,
        25,
        29,
        30,
        31,
        41,

        // Battery operational context
        50,
        52,
        143,
        145,
        147,
        215,
        263,

        // Dedicated generator electrical detail
        426,
        427,
        431,
        432,
        433,
        436,
        437,

        // Grid meter phase electrical detail
        834,
        835,
        836,
        837,
        838,
        839,
        840,
        841,
        842,

        // Generator accumulated runtime
        1018,
    ]);

/**
 * Canonical historical persistence boundary.
 *
 * This is deliberately composed from explicit reviewed policy layers rather
 * than accepting all VRM diagnostics.
 */
export const HISTORICAL_TELEMETRY_ATTRIBUTE_IDS =
    new Set([
        ...HISTORICAL_ANALYTICS_REQUIRED_ATTRIBUTE_IDS,
        ...HISTORICAL_OPERATIONAL_ATTRIBUTE_IDS,
    ]);

/**
 * Resolve the authoritative raw VRM attribute ID.
 *
 * idDataAttribute is the sole accepted raw identity field because that is
 * the field consumed by telemetryNormalizer.js.
 *
 * No fallback/inference is permitted.
 */
export const getRecordVrmAttributeId = (record) => {
    const rawAttributeId = record?.idDataAttribute;

    if (
        rawAttributeId === undefined ||
        rawAttributeId === null ||
        rawAttributeId === ""
    ) {
        return null;
    }

    const vrmAttributeId = Number(rawAttributeId);

    if (!Number.isFinite(vrmAttributeId)) {
        return null;
    }

    return vrmAttributeId;
};

/**
 * Determine whether a raw VRM diagnostics record is eligible for historical
 * persistence.
 */
export const isHistoricalTelemetryAllowed = (record) => {
    const vrmAttributeId =
        getRecordVrmAttributeId(record);

    if (vrmAttributeId === null) {
        return false;
    }

    return HISTORICAL_TELEMETRY_ATTRIBUTE_IDS.has(
        vrmAttributeId
    );
};