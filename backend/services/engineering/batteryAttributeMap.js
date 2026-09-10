// services/engineering/batteryAttributeMap.js


/*
|--------------------------------------------------------------------------
| Phase 8.4B
| Battery Semantic Attribute Map
|--------------------------------------------------------------------------
|
| Purpose:
|
| - convert telemetry discovery into explicit engineering semantics
| - separate measured telemetry from settings, limits, alarms and counters
| - define which signals are calculation-enabled
| - preserve unresolved direction/unit semantics
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Semantic classes
|--------------------------------------------------------------------------
*/

export const BATTERY_SIGNAL_CLASS =
    Object.freeze({

        SOC_MEASURED:
            "SOC_MEASURED",

        POWER_SIGNED:
            "POWER_SIGNED",

        VOLTAGE_MEASURED:
            "VOLTAGE_MEASURED",

        CURRENT_SIGNED:
            "CURRENT_SIGNED",

        TEMPERATURE_MEASURED:
            "TEMPERATURE_MEASURED",

        ENERGY_CUMULATIVE:
            "ENERGY_CUMULATIVE",

        ENERGY_DELTA:
            "ENERGY_DELTA",

        CAPACITY:
            "CAPACITY",

        STATE:
            "STATE",

        STATE_OF_HEALTH:
            "STATE_OF_HEALTH",

        ALARM:
            "ALARM",

        LIMIT:
            "LIMIT",

        COUNTER:
            "COUNTER",

        CONFIGURATION:
            "CONFIGURATION",

        FLOW_UNRESOLVED:
            "FLOW_UNRESOLVED",

        OTHER:
            "OTHER",
    });


/*
|--------------------------------------------------------------------------
| Calculation roles
|--------------------------------------------------------------------------
*/

export const BATTERY_CALCULATION_ROLE =
    Object.freeze({

        PRIMARY_SOC:
            "PRIMARY_SOC",

        FALLBACK_SOC:
            "FALLBACK_SOC",

        SIGNED_POWER:
            "SIGNED_POWER",

        VOLTAGE:
            "VOLTAGE",

        CURRENT:
            "CURRENT",

        TEMPERATURE:
            "TEMPERATURE",

        CHARGED_ENERGY_CUMULATIVE:
            "CHARGED_ENERGY_CUMULATIVE",

        DISCHARGED_ENERGY_CUMULATIVE:
            "DISCHARGED_ENERGY_CUMULATIVE",

        CHARGED_ENERGY_DELTA:
            "CHARGED_ENERGY_DELTA",

        DISCHARGED_ENERGY_DELTA:
            "DISCHARGED_ENERGY_DELTA",

        CHARGE_CYCLE_COUNTER:
            "CHARGE_CYCLE_COUNTER",

        FULL_DISCHARGE_COUNTER:
            "FULL_DISCHARGE_COUNTER",

        STATE_OF_HEALTH:
            "STATE_OF_HEALTH",

        CAPACITY:
            "CAPACITY",

        NONE:
            "NONE",
    });


/*
|--------------------------------------------------------------------------
| Qualification
|--------------------------------------------------------------------------
*/

function entry({
    attributeId,
    label,
    signalClass,
    calculationRole =
        BATTERY_CALCULATION_ROLE.NONE,
    calculationEnabled =
        false,
    directionalSemanticsEstablished =
        false,
    cumulative =
        false,
    delta =
        false,
    preferredPriority =
        null,
    notes =
        null,
}) {

    return Object.freeze({

        attributeId,

        label,

        signalClass,

        calculationRole,

        calculationEnabled,

        directionalSemanticsEstablished,

        cumulative,

        delta,

        preferredPriority,

        notes,
    });
}


/*
|--------------------------------------------------------------------------
| State of charge
|--------------------------------------------------------------------------
|
| Preference:
|
| 51  Battery Monitor measured SOC
| 144 System overview Battery SOC
| 39  VE.Bus SOC fallback
|
| Do NOT use:
|
| 240  hidden SOC
| 333  battery-life SOC limit
| 334  configured minimum SOC
| 472  low-SOC control state
| 1277 SOC target
|
|--------------------------------------------------------------------------
*/

export const BATTERY_SOC_ATTRIBUTES =
    Object.freeze({

        51:
            entry({
                attributeId:
                    51,

                label:
                    "State of charge",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .SOC_MEASURED,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .PRIMARY_SOC,

                calculationEnabled:
                    true,

                preferredPriority:
                    1,

                notes:
                    "Measured Battery Monitor SOC.",
            }),

        144:
            entry({
                attributeId:
                    144,

                label:
                    "Battery SOC",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .SOC_MEASURED,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .FALLBACK_SOC,

                calculationEnabled:
                    true,

                preferredPriority:
                    2,

                notes:
                    "System-overview SOC fallback.",
            }),

        39:
            entry({
                attributeId:
                    39,

                label:
                    "VE.Bus state of charge",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .SOC_MEASURED,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .FALLBACK_SOC,

                calculationEnabled:
                    true,

                preferredPriority:
                    3,

                notes:
                    "VE.Bus SOC fallback.",
            }),

        240:
            entry({
                attributeId:
                    240,

                label:
                    "VE.Bus hidden SOC",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .CONFIGURATION,

                notes:
                    "Hidden/internal SOC; excluded from engineering SOC KPI.",
            }),

        333:
            entry({
                attributeId:
                    333,

                label:
                    "ESS battery life SOC limit",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .LIMIT,

                notes:
                    "Control limit, not measured SOC.",
            }),

        334:
            entry({
                attributeId:
                    334,

                label:
                    "ESS Minimum SOC",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .LIMIT,

                notes:
                    "Configured minimum SOC, not measured SOC.",
            }),

        472:
            entry({
                attributeId:
                    472,

                label:
                    "Low SOC; discharge disabled",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .STATE,

                notes:
                    "Control/status signal, not SOC measurement.",
            }),

        1277:
            entry({
                attributeId:
                    1277,

                label:
                    "SOC target for active auto operation",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .CONFIGURATION,

                notes:
                    "Control target, not measured SOC.",
            }),
    });


/*
|--------------------------------------------------------------------------
| Power
|--------------------------------------------------------------------------
*/

export const BATTERY_POWER_ATTRIBUTES =
    Object.freeze({

        243:
            entry({
                attributeId:
                    243,

                label:
                    "Battery Power",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .POWER_SIGNED,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .SIGNED_POWER,

                calculationEnabled:
                    true,

                directionalSemanticsEstablished:
                    false,

                preferredPriority:
                    1,

                notes:
                    "Signed battery power. Charge/discharge sign convention remains unresolved.",
            }),

        107:
            entry({
                attributeId:
                    107,

                label:
                    "Battery watts",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .POWER_SIGNED,

                calculationEnabled:
                    false,

                directionalSemanticsEstablished:
                    false,

                notes:
                    "Solar Charger-local battery watts; not fleet battery total.",
            }),
    });


/*
|--------------------------------------------------------------------------
| Voltage
|--------------------------------------------------------------------------
*/

export const BATTERY_VOLTAGE_ATTRIBUTES =
    Object.freeze({

        47:
            entry({
                attributeId:
                    47,

                label:
                    "Battery voltage",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .VOLTAGE_MEASURED,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .VOLTAGE,

                calculationEnabled:
                    true,
            }),

        116:
            entry({
                attributeId:
                    116,

                label:
                    "Mid-point voltage",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .VOLTAGE_MEASURED,

                calculationEnabled:
                    false,

                notes:
                    "Mid-point diagnostic; not whole-bank voltage.",
            }),

        173:
            entry({
                attributeId:
                    173,

                label:
                    "Minimum cell voltage",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .VOLTAGE_MEASURED,

                calculationEnabled:
                    false,

                notes:
                    "Cell-level diagnostic.",
            }),

        174:
            entry({
                attributeId:
                    174,

                label:
                    "Maximum cell voltage",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .VOLTAGE_MEASURED,

                calculationEnabled:
                    false,

                notes:
                    "Cell-level diagnostic.",
            }),

        274:
            entry({
                attributeId:
                    274,

                label:
                    "Charge Voltage Limit",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .LIMIT,
            }),

        275:
            entry({
                attributeId:
                    275,

                label:
                    "Discharge Voltage Limit",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .LIMIT,
            }),
    });


/*
|--------------------------------------------------------------------------
| Current
|--------------------------------------------------------------------------
*/

export const BATTERY_CURRENT_ATTRIBUTES =
    Object.freeze({

        49:
            entry({
                attributeId:
                    49,

                label:
                    "Battery current",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .CURRENT_SIGNED,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .CURRENT,

                calculationEnabled:
                    true,

                directionalSemanticsEstablished:
                    false,

                notes:
                    "Signed current; direction convention must be qualified before charge/discharge attribution.",
            }),

        276:
            entry({
                attributeId:
                    276,

                label:
                    "Charge Current Limit",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .LIMIT,
            }),

        277:
            entry({
                attributeId:
                    277,

                label:
                    "Discharge Current Limit",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .LIMIT,
            }),
    });


/*
|--------------------------------------------------------------------------
| Temperature
|--------------------------------------------------------------------------
*/

export const BATTERY_TEMPERATURE_ATTRIBUTES =
    Object.freeze({

        115:
            entry({
                attributeId:
                    115,

                label:
                    "Battery temperature",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .TEMPERATURE_MEASURED,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .TEMPERATURE,

                calculationEnabled:
                    true,

                preferredPriority:
                    1,
            }),

        1035:
            entry({
                attributeId:
                    1035,

                label:
                    "System Battery Temperature",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .TEMPERATURE_MEASURED,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .TEMPERATURE,

                calculationEnabled:
                    true,

                preferredPriority:
                    2,
            }),

        521:
            entry({
                attributeId:
                    521,

                label:
                    "VE.Bus Battery temperature",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .TEMPERATURE_MEASURED,

                calculationEnabled:
                    false,

                notes:
                    "Contains sentinel/unphysical values including -273; excluded until separately qualified.",
            }),

        429:
            entry({
                attributeId:
                    429,

                label:
                    "Minimum cell temperature",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .TEMPERATURE_MEASURED,

                calculationEnabled:
                    false,
            }),

        430:
            entry({
                attributeId:
                    430,

                label:
                    "Maximum cell temperature",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .TEMPERATURE_MEASURED,

                calculationEnabled:
                    false,
            }),
    });


/*
|--------------------------------------------------------------------------
| Energy
|--------------------------------------------------------------------------
|
| 244/245 are cumulative counters.
| 338/339 are delta energy telemetry.
|
| They must NEVER be integrated as instantaneous power.
|
|--------------------------------------------------------------------------
*/

export const BATTERY_ENERGY_ATTRIBUTES =
    Object.freeze({

        244:
            entry({
                attributeId:
                    244,

                label:
                    "Discharged Energy",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .ENERGY_CUMULATIVE,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .DISCHARGED_ENERGY_CUMULATIVE,

                calculationEnabled:
                    true,

                directionalSemanticsEstablished:
                    true,

                cumulative:
                    true,

                notes:
                    "Cumulative discharged-energy counter.",
            }),

        245:
            entry({
                attributeId:
                    245,

                label:
                    "Charged Energy",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .ENERGY_CUMULATIVE,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .CHARGED_ENERGY_CUMULATIVE,

                calculationEnabled:
                    true,

                directionalSemanticsEstablished:
                    true,

                cumulative:
                    true,

                notes:
                    "Cumulative charged-energy counter.",
            }),

        338:
            entry({
                attributeId:
                    338,

                label:
                    "Discharged Energy delta",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .ENERGY_DELTA,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .DISCHARGED_ENERGY_DELTA,

                calculationEnabled:
                    true,

                directionalSemanticsEstablished:
                    true,

                delta:
                    true,

                notes:
                    "Directional discharge-energy increment.",
            }),

        339:
            entry({
                attributeId:
                    339,

                label:
                    "Charged Energy delta",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .ENERGY_DELTA,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .CHARGED_ENERGY_DELTA,

                calculationEnabled:
                    true,

                directionalSemanticsEstablished:
                    true,

                delta:
                    true,

                notes:
                    "Directional charge-energy increment.",
            }),
    });


/*
|--------------------------------------------------------------------------
| Battery history counters
|--------------------------------------------------------------------------
*/

export const BATTERY_COUNTER_ATTRIBUTES =
    Object.freeze({

        58:
            entry({
                attributeId:
                    58,

                label:
                    "Charge cycles",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .COUNTER,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .CHARGE_CYCLE_COUNTER,

                calculationEnabled:
                    true,

                cumulative:
                    true,
            }),

        59:
            entry({
                attributeId:
                    59,

                label:
                    "Full discharges",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .COUNTER,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .FULL_DISCHARGE_COUNTER,

                calculationEnabled:
                    true,

                cumulative:
                    true,
            }),

        55:
            entry({
                attributeId:
                    55,

                label:
                    "Deepest discharge",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .COUNTER,

                calculationEnabled:
                    false,

                notes:
                    "Historical discharge quantity; unit semantics must be explicitly established before DoD conversion.",
            }),

        56:
            entry({
                attributeId:
                    56,

                label:
                    "Last discharge",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .COUNTER,

                calculationEnabled:
                    false,
            }),

        57:
            entry({
                attributeId:
                    57,

                label:
                    "Average discharge",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .COUNTER,

                calculationEnabled:
                    false,
            }),

        60:
            entry({
                attributeId:
                    60,

                label:
                    "Total Ah drawn",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .COUNTER,

                calculationEnabled:
                    false,

                notes:
                    "Cumulative Ah evidence; excluded from energy calculation without voltage/time reconciliation.",
            }),
    });


/*
|--------------------------------------------------------------------------
| Capacity / SOH
|--------------------------------------------------------------------------
*/

export const BATTERY_ASSET_ATTRIBUTES =
    Object.freeze({

        273:
            entry({
                attributeId:
                    273,

                label:
                    "State of health",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .STATE_OF_HEALTH,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .STATE_OF_HEALTH,

                calculationEnabled:
                    true,

                notes:
                    "Direct Battery Monitor SOH telemetry; do not extrapolate to sites where absent.",
            }),

        413:
            entry({
                attributeId:
                    413,

                label:
                    "Capacity",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .CAPACITY,

                calculationRole:
                    BATTERY_CALCULATION_ROLE
                        .CAPACITY,

                calculationEnabled:
                    false,

                notes:
                    "Capacity value observed, but unit semantics must be confirmed before DoD or energy-capacity calculations.",
            }),
    });


/*
|--------------------------------------------------------------------------
| Battery state
|--------------------------------------------------------------------------
*/

export const BATTERY_STATE_ATTRIBUTES =
    Object.freeze({

        215:
            entry({
                attributeId:
                    215,

                label:
                    "Battery state",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .STATE,

                calculationEnabled:
                    false,

                notes:
                    "State code requires explicit code-value semantic mapping before charge/discharge attribution.",
            }),

        332:
            entry({
                attributeId:
                    332,

                label:
                    "ESS battery life state",

                signalClass:
                    BATTERY_SIGNAL_CLASS
                        .STATE,

                calculationEnabled:
                    false,
            }),
    });


/*
|--------------------------------------------------------------------------
| Alarm attributes
|--------------------------------------------------------------------------
*/

const ALARM_IDS = [
    43,
    65,
    66,
    119,
    120,
    121,
    122,
    123,
    124,
    125,
    126,
    1751,
    286,
    287,
    288,
    289,
    345,
    349,
    353,
    459,
    460,
];


export const BATTERY_ALARM_ATTRIBUTES =
    Object.freeze(
        Object.fromEntries(
            ALARM_IDS.map(
                (
                    attributeId
                ) => [
                    attributeId,
                    entry({
                        attributeId,

                        label:
                            `Battery alarm attribute ${attributeId}`,

                        signalClass:
                            BATTERY_SIGNAL_CLASS
                                .ALARM,

                        calculationEnabled:
                            false,

                        notes:
                            "Alarm/status evidence; not continuous operating telemetry.",
                    }),
                ]
            )
        )
    );


/*
|--------------------------------------------------------------------------
| Unresolved flow attributes
|--------------------------------------------------------------------------
*/

const FLOW_IDS = [
    100,
    102,
    105,
    108,
    110,
];


export const BATTERY_FLOW_ATTRIBUTES =
    Object.freeze(
        Object.fromEntries(
            FLOW_IDS.map(
                (
                    attributeId
                ) => [
                    attributeId,
                    entry({
                        attributeId,

                        label:
                            `Battery flow attribute ${attributeId}`,

                        signalClass:
                            BATTERY_SIGNAL_CLASS
                                .FLOW_UNRESOLVED,

                        calculationEnabled:
                            false,

                        notes:
                            "System-overview energy-flow semantic/unit basis not yet qualified.",
                    }),
                ]
            )
        )
    );


/*
|--------------------------------------------------------------------------
| Combined map
|--------------------------------------------------------------------------
*/

export const BATTERY_ATTRIBUTE_MAP =
    Object.freeze({

        ...BATTERY_SOC_ATTRIBUTES,

        ...BATTERY_POWER_ATTRIBUTES,

        ...BATTERY_VOLTAGE_ATTRIBUTES,

        ...BATTERY_CURRENT_ATTRIBUTES,

        ...BATTERY_TEMPERATURE_ATTRIBUTES,

        ...BATTERY_ENERGY_ATTRIBUTES,

        ...BATTERY_COUNTER_ATTRIBUTES,

        ...BATTERY_ASSET_ATTRIBUTES,

        ...BATTERY_STATE_ATTRIBUTES,

        ...BATTERY_ALARM_ATTRIBUTES,

        ...BATTERY_FLOW_ATTRIBUTES,
    });


/*
|--------------------------------------------------------------------------
| Engineering boundaries
|--------------------------------------------------------------------------
*/

export const BATTERY_ANALYTICS_BOUNDARIES =
    Object.freeze({

        MISSING_TELEMETRY_MEANS_ZERO:
            false,

        SOC_LIMIT_IS_MEASURED_SOC:
            false,

        SOC_TARGET_IS_MEASURED_SOC:
            false,

        HIDDEN_SOC_USED_AS_ENGINEERING_SOC:
            false,

        SIGNED_POWER_DIRECTION_ESTABLISHED:
            false,

        SIGNED_CURRENT_DIRECTION_ESTABLISHED:
            false,

        CUMULATIVE_ENERGY_INTEGRATED_AS_POWER:
            false,

        DELTA_ENERGY_INTEGRATED_AS_POWER:
            false,

        ALARM_USED_AS_CONTINUOUS_MEASUREMENT:
            false,

        FLOW_ATTRIBUTES_CALCULATION_ENABLED:
            false,

        BATTERY_CAPACITY_UNIT_ESTABLISHED:
            false,

        DOD_AUTOMATICALLY_INFERRED:
            false,

        SOH_FABRICATED_WHEN_MISSING:
            false,

        CYCLE_COUNTER_RECONSTRUCTED_FROM_SOC:
            false,
    });


/*
|--------------------------------------------------------------------------
| Lookup helpers
|--------------------------------------------------------------------------
*/

export function getBatteryAttributeDefinition(
    attributeId
) {

    return (
        BATTERY_ATTRIBUTE_MAP[
            Number(
                attributeId
            )
        ] ??
        null
    );
}


export function isBatteryAttributeCalculationEnabled(
    attributeId
) {

    return (
        getBatteryAttributeDefinition(
            attributeId
        )
            ?.calculationEnabled ===
        true
    );
}


export function getBatteryAttributesByRole(
    calculationRole
) {

    return Object
        .values(
            BATTERY_ATTRIBUTE_MAP
        )
        .filter(
            (
                definition
            ) =>
                definition.calculationRole ===
                calculationRole
        );
}


export function getPreferredSocAttributes() {

    return Object
        .values(
            BATTERY_SOC_ATTRIBUTES
        )
        .filter(
            (
                definition
            ) =>
                definition.calculationEnabled ===
                true
        )
        .sort(
            (
                a,
                b
            ) =>
                (
                    a.preferredPriority ??
                    Number.MAX_SAFE_INTEGER
                ) -
                (
                    b.preferredPriority ??
                    Number.MAX_SAFE_INTEGER
                )
        );
}