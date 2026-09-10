// services/engineering/energySourceAttributeMap.js

/*
|--------------------------------------------------------------------------
| Engineering source identifiers
|--------------------------------------------------------------------------
*/

export const ENERGY_SOURCE =
    Object.freeze({
        GRID:
            "GRID",

        GENERATOR:
            "GENERATOR",

        SOLAR:
            "SOLAR",

        BATTERY:
            "BATTERY",
    });


/*
|--------------------------------------------------------------------------
| Semantic roles
|--------------------------------------------------------------------------
*/

export const ENERGY_SOURCE_SEMANTIC_ROLE =
    Object.freeze({
        INSTANTANEOUS_POWER:
            "INSTANTANEOUS_POWER",

        ENERGY_FLOW:
            "ENERGY_FLOW",

        CUMULATIVE_ENERGY:
            "CUMULATIVE_ENERGY",

        DELTA_ENERGY:
            "DELTA_ENERGY",

        STATE:
            "STATE",

        CONTEXT:
            "CONTEXT",
    });


/*
|--------------------------------------------------------------------------
| Evidence strength
|--------------------------------------------------------------------------
*/

export const ENERGY_SOURCE_EVIDENCE_STRENGTH =
    Object.freeze({
        DIRECT:
            "DIRECT",

        STRONG:
            "STRONG",

        CONDITIONAL:
            "CONDITIONAL",

        CONTEXT_ONLY:
            "CONTEXT_ONLY",
    });


/*
|--------------------------------------------------------------------------
| Calculation permission
|--------------------------------------------------------------------------
*/

export const ENERGY_SOURCE_CALCULATION_PERMISSION =
    Object.freeze({
        ALLOWED:
            "ALLOWED",

        CONDITIONAL:
            "CONDITIONAL",

        BLOCKED:
            "BLOCKED",
    });


/*
|--------------------------------------------------------------------------
| Units
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Many production telemetry rows have no populated unit field.
| Therefore unit semantics here represent the engineering interpretation
| established by signal identity and observed behaviour, not blindly copied
| from Telemetry.unit.
|
|--------------------------------------------------------------------------
*/

export const ENERGY_SOURCE_UNIT =
    Object.freeze({
        W:
            "W",

        KW:
            "kW",

        WH:
            "Wh",

        KWH:
            "kWh",

        PERCENT:
            "%",

        STATE:
            null,

        UNKNOWN:
            null,
    });


/*
|--------------------------------------------------------------------------
| Attribute definition helper
|--------------------------------------------------------------------------
*/

function defineAttribute({
    id,
    source,
    key,
    name,
    role,
    evidenceStrength,
    unit,
    calculationPermission,
    requiresSourceIdentity = false,
    signConventionEstablished = true,
    fleetCoverageEstablished = false,
    notes = [],
} = {}) {

    if (
        !Number.isInteger(
            id
        ) ||
        id <=
        0
    ) {

        throw new Error(
            `Invalid VRM attribute id for ${key ?? "UNKNOWN"}.`
        );
    }


    return Object.freeze({
        id,
        source,
        key,
        name,
        role,
        evidenceStrength,
        unit,
        calculationPermission,
        requiresSourceIdentity,
        signConventionEstablished,
        fleetCoverageEstablished,
        notes:
            Object.freeze([
                ...notes,
            ]),
    });
}


/*
|--------------------------------------------------------------------------
| Grid
|--------------------------------------------------------------------------
*/

const GRID_ATTRIBUTES =
    Object.freeze({

        /*
         * Direct grid meter instantaneous power.
         *
         * These are source-explicit signals and therefore do not require
         * separate source identity resolution.
         */

        DIRECT_POWER_L1:
            defineAttribute({
                id:
                    379,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "DIRECT_POWER_L1",

                name:
                    "Grid L1 Power",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .DIRECT,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,

                fleetCoverageEstablished:
                    false,

                notes: [
                    "Explicit grid-meter power signal.",
                    "Observed production coverage is limited.",
                ],
            }),


        DIRECT_POWER_L2:
            defineAttribute({
                id:
                    380,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "DIRECT_POWER_L2",

                name:
                    "Grid L2 Power",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .DIRECT,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,

                fleetCoverageEstablished:
                    false,

                notes: [
                    "Explicit grid-meter power signal.",
                ],
            }),


        DIRECT_POWER_L3:
            defineAttribute({
                id:
                    381,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "DIRECT_POWER_L3",

                name:
                    "Grid L3 Power",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .DIRECT,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,

                fleetCoverageEstablished:
                    false,

                notes: [
                    "Explicit grid-meter power signal.",
                ],
            }),


        /*
         * AC input power is NOT inherently grid power.
         *
         * Attr 17/18/19 must only be attributed to GRID when another signal
         * establishes that the corresponding AC input source is grid.
         */

        AC_INPUT_POWER_L1:
            defineAttribute({
                id:
                    17,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "AC_INPUT_POWER_L1",

                name:
                    "AC Input Power L1",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .CONDITIONAL,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .CONDITIONAL,

                requiresSourceIdentity:
                    true,

                notes: [
                    "VE.Bus AC-input power.",
                    "Must not be interpreted as grid power without source identity.",
                ],
            }),


        AC_INPUT_POWER_L2:
            defineAttribute({
                id:
                    18,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "AC_INPUT_POWER_L2",

                name:
                    "AC Input Power L2",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .CONDITIONAL,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .CONDITIONAL,

                requiresSourceIdentity:
                    true,

                notes: [
                    "VE.Bus AC-input power.",
                    "Requires source identity.",
                ],
            }),


        AC_INPUT_POWER_L3:
            defineAttribute({
                id:
                    19,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "AC_INPUT_POWER_L3",

                name:
                    "AC Input Power L3",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .CONDITIONAL,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .CONDITIONAL,

                requiresSourceIdentity:
                    true,

                notes: [
                    "VE.Bus AC-input power.",
                    "Requires source identity.",
                ],
            }),


        FLOW_TO_BATTERY:
            defineAttribute({
                id:
                    100,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "FLOW_TO_BATTERY",

                name:
                    "Grid to Battery",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .ENERGY_FLOW,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.UNKNOWN,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .BLOCKED,

                notes: [
                    "System-overview flow signal.",
                    "Observed behaviour differs from instantaneous watt telemetry.",
                    "Do not assume kWh until unit semantics are validated.",
                ],
            }),


        FLOW_TO_CONSUMERS:
            defineAttribute({
                id:
                    101,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "FLOW_TO_CONSUMERS",

                name:
                    "Grid to Consumers",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .ENERGY_FLOW,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.UNKNOWN,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .BLOCKED,

                notes: [
                    "System-overview source-flow signal.",
                    "Do not interpret as instantaneous grid power.",
                    "Engineering unit is not yet established.",
                ],
            }),


        ENERGY_FROM_NET_DELTA:
            defineAttribute({
                id:
                    342,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "ENERGY_FROM_NET_DELTA",

                name:
                    "Grid Energy From Net Delta",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .DELTA_ENERGY,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .DIRECT,

                unit:
                    ENERGY_SOURCE_UNIT.KWH,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,

                fleetCoverageEstablished:
                    false,

                notes: [
                    "Explicit grid-meter delta-energy signal.",
                    "Observed production coverage is very limited.",
                ],
            }),


        ENERGY_TO_NET_DELTA:
            defineAttribute({
                id:
                    343,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "ENERGY_TO_NET_DELTA",

                name:
                    "Grid Energy To Net Delta",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .DELTA_ENERGY,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .DIRECT,

                unit:
                    ENERGY_SOURCE_UNIT.KWH,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,

                fleetCoverageEstablished:
                    false,

                notes: [
                    "Explicit grid-meter exported-energy delta signal.",
                ],
            }),


        TOTAL_ENERGY_FROM_NET:
            defineAttribute({
                id:
                    843,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "TOTAL_ENERGY_FROM_NET",

                name:
                    "Grid Total Energy From Net",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .CUMULATIVE_ENERGY,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .DIRECT,

                unit:
                    ENERGY_SOURCE_UNIT.KWH,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,

                fleetCoverageEstablished:
                    false,

                notes: [
                    "Explicit cumulative grid-import energy.",
                ],
            }),


        TOTAL_ENERGY_TO_NET:
            defineAttribute({
                id:
                    844,

                source:
                    ENERGY_SOURCE.GRID,

                key:
                    "TOTAL_ENERGY_TO_NET",

                name:
                    "Grid Total Energy To Net",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .CUMULATIVE_ENERGY,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .DIRECT,

                unit:
                    ENERGY_SOURCE_UNIT.KWH,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,

                fleetCoverageEstablished:
                    false,

                notes: [
                    "Explicit cumulative grid-export energy.",
                ],
            }),
    });


/*
|--------------------------------------------------------------------------
| Generator
|--------------------------------------------------------------------------
*/

const GENERATOR_ATTRIBUTES =
    Object.freeze({

        TOTAL_POWER:
            defineAttribute({
                id:
                    1742,

                source:
                    ENERGY_SOURCE.GENERATOR,

                key:
                    "TOTAL_POWER",

                name:
                    "Genset Total Power",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .DIRECT,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,

                notes: [
                    "Explicit generator total-power signal.",
                ],
            }),


        POWER_L1:
            defineAttribute({
                id:
                    137,

                source:
                    ENERGY_SOURCE.GENERATOR,

                key:
                    "POWER_L1",

                name:
                    "Genset L1 Power",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,

                notes: [
                    "Generator phase-power signal.",
                ],
            }),


        POWER_L2:
            defineAttribute({
                id:
                    138,

                source:
                    ENERGY_SOURCE.GENERATOR,

                key:
                    "POWER_L2",

                name:
                    "Genset L2 Power",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,
            }),


        POWER_L3:
            defineAttribute({
                id:
                    139,

                source:
                    ENERGY_SOURCE.GENERATOR,

                key:
                    "POWER_L3",

                name:
                    "Genset L3 Power",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,
            }),


        FLOW_TO_CONSUMERS:
            defineAttribute({
                id:
                    109,

                source:
                    ENERGY_SOURCE.GENERATOR,

                key:
                    "FLOW_TO_CONSUMERS",

                name:
                    "Genset to Consumers",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .ENERGY_FLOW,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.UNKNOWN,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .BLOCKED,

                notes: [
                    "System-overview generator flow signal.",
                    "Do not interpret as generator watts.",
                ],
            }),


        FLOW_TO_BATTERY:
            defineAttribute({
                id:
                    110,

                source:
                    ENERGY_SOURCE.GENERATOR,

                key:
                    "FLOW_TO_BATTERY",

                name:
                    "Genset to Battery",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .ENERGY_FLOW,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.UNKNOWN,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .BLOCKED,

                notes: [
                    "System-overview generator-to-battery flow signal.",
                ],
            }),
    });


/*
|--------------------------------------------------------------------------
| Solar
|--------------------------------------------------------------------------
*/

const SOLAR_ATTRIBUTES =
    Object.freeze({

        TOTAL_POWER:
            defineAttribute({
                id:
                    442,

                source:
                    ENERGY_SOURCE.SOLAR,

                key:
                    "TOTAL_POWER",

                name:
                    "PV Power",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .DIRECT,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,

                fleetCoverageEstablished:
                    false,

                notes: [
                    "Explicit Solar Charger PV-power signal.",
                    "Observed production coverage is currently very limited.",
                ],
            }),


        DC_COUPLED:
            defineAttribute({
                id:
                    113,

                source:
                    ENERGY_SOURCE.SOLAR,

                key:
                    "DC_COUPLED",

                name:
                    "PV DC Coupled",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .CONTEXT,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.UNKNOWN,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .BLOCKED,

                notes: [
                    "DC-coupled PV system-overview signal.",
                    "Do not use as primary PV energy without additional semantic validation.",
                ],
            }),


        FLOW_TO_BATTERY:
            defineAttribute({
                id:
                    102,

                source:
                    ENERGY_SOURCE.SOLAR,

                key:
                    "FLOW_TO_BATTERY",

                name:
                    "PV to Battery",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .ENERGY_FLOW,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.UNKNOWN,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .BLOCKED,

                notes: [
                    "System-overview PV-to-battery flow.",
                    "Engineering unit is not yet established.",
                ],
            }),


        FLOW_TO_CONSUMERS:
            defineAttribute({
                id:
                    104,

                source:
                    ENERGY_SOURCE.SOLAR,

                key:
                    "FLOW_TO_CONSUMERS",

                name:
                    "PV to Consumers",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .ENERGY_FLOW,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.UNKNOWN,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .BLOCKED,

                notes: [
                    "System-overview PV-to-consumer flow.",
                ],
            }),
    });


/*
|--------------------------------------------------------------------------
| Battery
|--------------------------------------------------------------------------
*/

const BATTERY_ATTRIBUTES =
    Object.freeze({

        POWER:
            defineAttribute({
                id:
                    243,

                source:
                    ENERGY_SOURCE.BATTERY,

                key:
                    "POWER",

                name:
                    "Battery Power",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .INSTANTANEOUS_POWER,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .DIRECT,

                unit:
                    ENERGY_SOURCE_UNIT.W,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .CONDITIONAL,

                signConventionEstablished:
                    false,

                notes: [
                    "Observed positive, zero and negative values.",
                    "Charge/discharge sign convention must be validated before directional energy calculation.",
                ],
            }),


        FLOW_TO_CONSUMERS:
            defineAttribute({
                id:
                    105,

                source:
                    ENERGY_SOURCE.BATTERY,

                key:
                    "FLOW_TO_CONSUMERS",

                name:
                    "Battery to Consumers",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .ENERGY_FLOW,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.UNKNOWN,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .BLOCKED,
            }),


        FLOW_TO_GRID:
            defineAttribute({
                id:
                    108,

                source:
                    ENERGY_SOURCE.BATTERY,

                key:
                    "FLOW_TO_GRID",

                name:
                    "Battery to Grid",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .ENERGY_FLOW,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.UNKNOWN,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .BLOCKED,
            }),


        SOC_PRIMARY:
            defineAttribute({
                id:
                    51,

                source:
                    ENERGY_SOURCE.BATTERY,

                key:
                    "SOC_PRIMARY",

                name:
                    "State of Charge",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .STATE,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .DIRECT,

                unit:
                    ENERGY_SOURCE_UNIT.PERCENT,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,

                notes: [
                    "Battery Monitor SOC signal.",
                ],
            }),


        SOC_SYSTEM:
            defineAttribute({
                id:
                    144,

                source:
                    ENERGY_SOURCE.BATTERY,

                key:
                    "SOC_SYSTEM",

                name:
                    "Battery SOC",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .STATE,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .STRONG,

                unit:
                    ENERGY_SOURCE_UNIT.PERCENT,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .ALLOWED,
            }),


        SOC_VEBUS:
            defineAttribute({
                id:
                    39,

                source:
                    ENERGY_SOURCE.BATTERY,

                key:
                    "SOC_VEBUS",

                name:
                    "VE.Bus State of Charge",

                role:
                    ENERGY_SOURCE_SEMANTIC_ROLE
                        .STATE,

                evidenceStrength:
                    ENERGY_SOURCE_EVIDENCE_STRENGTH
                        .CONDITIONAL,

                unit:
                    ENERGY_SOURCE_UNIT.PERCENT,

                calculationPermission:
                    ENERGY_SOURCE_CALCULATION_PERMISSION
                        .CONDITIONAL,

                notes: [
                    "Fallback SOC source where preferred battery-monitor SOC is unavailable.",
                ],
            }),
    });


/*
|--------------------------------------------------------------------------
| Canonical map
|--------------------------------------------------------------------------
*/

export const ENERGY_SOURCE_ATTRIBUTE_MAP =
    Object.freeze({

        GRID:
            GRID_ATTRIBUTES,

        GENERATOR:
            GENERATOR_ATTRIBUTES,

        SOLAR:
            SOLAR_ATTRIBUTES,

        BATTERY:
            BATTERY_ATTRIBUTES,
    });


/*
|--------------------------------------------------------------------------
| Derived lookup
|--------------------------------------------------------------------------
*/

const ALL_ATTRIBUTES =
    Object.freeze(
        Object.values(
            ENERGY_SOURCE_ATTRIBUTE_MAP
        )
            .flatMap(
                (sourceMap) =>
                    Object.values(
                        sourceMap
                    )
            )
    );


export function getEnergySourceAttributeById(
    attributeId
) {

    const numericId =
        Number(
            attributeId
        );


    if (
        !Number.isInteger(
            numericId
        )
    ) {
        return null;
    }


    return ALL_ATTRIBUTES.find(
        (attribute) =>
            attribute.id ===
            numericId
    ) ??
    null;
}


export function getEnergySourceAttributesByRole(
    role
) {

    return ALL_ATTRIBUTES.filter(
        (attribute) =>
            attribute.role ===
            role
    );
}


export function getEnergySourceAttributesBySource(
    source
) {

    return ALL_ATTRIBUTES.filter(
        (attribute) =>
            attribute.source ===
            source
    );
}


export function isEnergySourceAttributeCalculationAllowed(
    attributeId
) {

    const attribute =
        getEnergySourceAttributeById(
            attributeId
        );


    if (!attribute) {
        return false;
    }


    return attribute
        .calculationPermission ===
        ENERGY_SOURCE_CALCULATION_PERMISSION
            .ALLOWED;
}


export function requiresEnergySourceIdentity(
    attributeId
) {

    const attribute =
        getEnergySourceAttributeById(
            attributeId
        );


    return attribute
        ?.requiresSourceIdentity ===
        true;
}


/*
|--------------------------------------------------------------------------
| Contract boundaries
|--------------------------------------------------------------------------
*/

export const ENERGY_SOURCE_ANALYTICS_BOUNDARIES =
    Object.freeze({

        AC_INPUT_POWER_REQUIRES_SOURCE_IDENTITY:
            true,

        SYSTEM_OVERVIEW_FLOW_UNIT_ESTABLISHED:
            false,

        BATTERY_POWER_SIGN_CONVENTION_ESTABLISHED:
            false,

        MISSING_SOURCE_SIGNAL_IS_ZERO:
            false,

        MISSING_ENERGY_SIGNAL_IS_ZERO:
            false,

        SOURCE_FLOW_IS_INSTANTANEOUS_POWER:
            false,

        GENERIC_KWH_IS_SOURCE_SPECIFIC:
            false,
    });