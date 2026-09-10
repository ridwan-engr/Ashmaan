// services/engineering/generatorAttributeMap.js

/*
|--------------------------------------------------------------------------
| Phase 8.5B
| Generator Semantic Attribute Map
|--------------------------------------------------------------------------
|
| Purpose:
|
| Convert Phase 8.5A discovery evidence into an explicit engineering
| semantic map.
|
| IMPORTANT:
|
| Semantic identification is NOT the same as calculation eligibility.
|
| Examples:
|
| - "Total run time" can be identified as runtime evidence while its raw
|   unit and counter behaviour remain unqualified.
|
| - "Generator state" can be identified as operating-state evidence while
|   its numerical code mapping remains unresolved.
|
| - A generator alarm is evidence of an alarm condition, not automatically
|   a generator failure or downtime interval.
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Semantic classes
|--------------------------------------------------------------------------
*/

export const GENERATOR_SIGNAL_CLASS =
    Object.freeze({

        DIRECT_POWER:
            "DIRECT_POWER",

        ELECTRICAL_MEASUREMENT:
            "ELECTRICAL_MEASUREMENT",

        POWER_FACTOR:
            "POWER_FACTOR",

        OPERATING_STATE:
            "OPERATING_STATE",

        ACTIVE_SOURCE_CONTEXT:
            "ACTIVE_SOURCE_CONTEXT",

        RUNTIME_COUNTER:
            "RUNTIME_COUNTER",

        RUNTIME_TIMER:
            "RUNTIME_TIMER",

        ENGINE_MEASUREMENT:
            "ENGINE_MEASUREMENT",

        RUN_REASON:
            "RUN_REASON",

        START_STOP_CONTROL:
            "START_STOP_CONTROL",

        CONFIGURATION:
            "CONFIGURATION",

        ALARM_CONDITION:
            "ALARM_CONDITION",

        ERROR_SLOT:
            "ERROR_SLOT",

        MAINTENANCE:
            "MAINTENANCE",

        FLOW_CONTEXT:
            "FLOW_CONTEXT",

        ASSET_METADATA:
            "ASSET_METADATA",

        BLOCKED:
            "BLOCKED",
    });


/*
|--------------------------------------------------------------------------
| Engineering roles
|--------------------------------------------------------------------------
*/

export const GENERATOR_ANALYTICS_ROLE =
    Object.freeze({

        TOTAL_ACTIVE_POWER:
            "TOTAL_ACTIVE_POWER",

        PHASE_1_ACTIVE_POWER:
            "PHASE_1_ACTIVE_POWER",

        PHASE_2_ACTIVE_POWER:
            "PHASE_2_ACTIVE_POWER",

        PHASE_3_ACTIVE_POWER:
            "PHASE_3_ACTIVE_POWER",

        PHASE_1_VOLTAGE:
            "PHASE_1_VOLTAGE",

        PHASE_2_VOLTAGE:
            "PHASE_2_VOLTAGE",

        PHASE_3_VOLTAGE:
            "PHASE_3_VOLTAGE",

        PHASE_1_CURRENT:
            "PHASE_1_CURRENT",

        PHASE_2_CURRENT:
            "PHASE_2_CURRENT",

        PHASE_3_CURRENT:
            "PHASE_3_CURRENT",

        FREQUENCY:
            "FREQUENCY",

        TOTAL_POWER_FACTOR:
            "TOTAL_POWER_FACTOR",

        PHASE_1_POWER_FACTOR:
            "PHASE_1_POWER_FACTOR",

        PHASE_2_POWER_FACTOR:
            "PHASE_2_POWER_FACTOR",

        PHASE_3_POWER_FACTOR:
            "PHASE_3_POWER_FACTOR",

        GENERATOR_STATE:
            "GENERATOR_STATE",

        GENERATOR_STATUS:
            "GENERATOR_STATUS",

        ACTIVE_SOURCE:
            "ACTIVE_SOURCE",

        ACCUMULATED_RUNTIME:
            "ACCUMULATED_RUNTIME",

        TOTAL_RUNTIME:
            "TOTAL_RUNTIME",

        TODAY_RUNTIME:
            "TODAY_RUNTIME",

        CURRENT_RUN_RUNTIME:
            "CURRENT_RUN_RUNTIME",

        ENGINE_OPERATING_TIME:
            "ENGINE_OPERATING_TIME",

        TIMER_ON_GENERATOR:
            "TIMER_ON_GENERATOR",

        ENGINE_LOAD:
            "ENGINE_LOAD",

        ENGINE_SPEED:
            "ENGINE_SPEED",

        COOLANT_TEMPERATURE:
            "COOLANT_TEMPERATURE",

        OIL_PRESSURE:
            "OIL_PRESSURE",

        RUN_REASON:
            "RUN_REASON",

        MANUAL_START:
            "MANUAL_START",

        MANUAL_START_TIMER:
            "MANUAL_START_TIMER",

        AUTOSTART_ENABLED:
            "AUTOSTART_ENABLED",

        REMOTE_START_MODE:
            "REMOTE_START_MODE",

        GENERATOR_TYPE:
            "GENERATOR_TYPE",

        GENERATOR_NOT_DETECTED:
            "GENERATOR_NOT_DETECTED",

        AUTOSTART_ERROR:
            "AUTOSTART_ERROR",

        SERVICE_COUNTDOWN:
            "SERVICE_COUNTDOWN",

        SERVICE_DUE:
            "SERVICE_DUE",

        SERVICE_INTERVAL:
            "SERVICE_INTERVAL",

        AUTOSTART_DISABLED_ALARM:
            "AUTOSTART_DISABLED_ALARM",

        REMOTE_START_DISABLED_ALARM:
            "REMOTE_START_DISABLED_ALARM",

        GENERATOR_ERROR_SLOT:
            "GENERATOR_ERROR_SLOT",

        GENSET_TO_CONSUMERS:
            "GENSET_TO_CONSUMERS",

        GENSET_TO_BATTERY:
            "GENSET_TO_BATTERY",

        MODEL:
            "MODEL",

        FIRMWARE:
            "FIRMWARE",

        CUSTOM_NAME:
            "CUSTOM_NAME",

        GENERIC_ENERGY_METER_FLAG:
            "GENERIC_ENERGY_METER_FLAG",

        PHASE_SEQUENCE:
            "PHASE_SEQUENCE",
    });


/*
|--------------------------------------------------------------------------
| Qualification levels
|--------------------------------------------------------------------------
*/

export const GENERATOR_SIGNAL_QUALIFICATION =
    Object.freeze({

        QUALIFIED_MEASUREMENT:
            "QUALIFIED_MEASUREMENT",

        SUPPORTING_CONTEXT:
            "SUPPORTING_CONTEXT",

        SEMANTICALLY_IDENTIFIED:
            "SEMANTICALLY_IDENTIFIED",

        UNIT_UNRESOLVED:
            "UNIT_UNRESOLVED",

        CODE_MAPPING_UNRESOLVED:
            "CODE_MAPPING_UNRESOLVED",

        COUNTER_SEMANTICS_UNRESOLVED:
            "COUNTER_SEMANTICS_UNRESOLVED",

        CONDITIONAL_EVIDENCE:
            "CONDITIONAL_EVIDENCE",

        BLOCKED:
            "BLOCKED",
    });


/*
|--------------------------------------------------------------------------
| Helper
|--------------------------------------------------------------------------
*/

function define({
    attributeId,
    code,
    name,
    signalClass,
    role,
    calculationEnabled = false,
    unitEstablished = false,
    stateMappingEstablished = false,
    counterSemanticsEstablished = false,
    notes = null,
}) {

    return Object.freeze({

        attributeId,

        code,

        name,

        signalClass,

        role,

        calculationEnabled,

        unitEstablished,

        stateMappingEstablished,

        counterSemanticsEstablished,

        notes,
    });
}


/*
|--------------------------------------------------------------------------
| Canonical generator semantic map
|--------------------------------------------------------------------------
*/

export const GENERATOR_ATTRIBUTE_MAP =
    Object.freeze({

        /*
        |--------------------------------------------------------------------------
        | System-overview generator power
        |--------------------------------------------------------------------------
        */

        137:
            define({
                attributeId:
                    137,

                code:
                    "gs1",

                name:
                    "Genset L1 power",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .DIRECT_POWER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .PHASE_1_ACTIVE_POWER,

                calculationEnabled:
                    true,

                unitEstablished:
                    true,

                notes:
                    "Measured generator L1 active power. Stored numeric magnitude is treated using the existing Phase 8.3 generator-power qualification.",
            }),

        138:
            define({
                attributeId:
                    138,

                code:
                    "gs2",

                name:
                    "Genset L2 power",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .DIRECT_POWER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .PHASE_2_ACTIVE_POWER,

                calculationEnabled:
                    true,

                unitEstablished:
                    true,
            }),

        139:
            define({
                attributeId:
                    139,

                code:
                    "gs3",

                name:
                    "Genset L3 power",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .DIRECT_POWER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .PHASE_3_ACTIVE_POWER,

                calculationEnabled:
                    true,

                unitEstablished:
                    true,
            }),


        /*
        |--------------------------------------------------------------------------
        | Direct generator-device power
        |--------------------------------------------------------------------------
        */

        428:
            define({
                attributeId:
                    428,

                code:
                    "G1p",

                name:
                    "Generator phase 1 power",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .DIRECT_POWER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .PHASE_1_ACTIVE_POWER,

                calculationEnabled:
                    true,

                unitEstablished:
                    true,
            }),

        434:
            define({
                attributeId:
                    434,

                code:
                    "G2p",

                name:
                    "Generator phase 2 power",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .DIRECT_POWER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .PHASE_2_ACTIVE_POWER,

                calculationEnabled:
                    true,

                unitEstablished:
                    true,
            }),

        438:
            define({
                attributeId:
                    438,

                code:
                    "G3p",

                name:
                    "Generator phase 3 power",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .DIRECT_POWER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .PHASE_3_ACTIVE_POWER,

                calculationEnabled:
                    true,

                unitEstablished:
                    true,
            }),

        1742:
            define({
                attributeId:
                    1742,

                code:
                    "Gp",

                name:
                    "Genset total power",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .DIRECT_POWER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .TOTAL_ACTIVE_POWER,

                calculationEnabled:
                    true,

                unitEstablished:
                    true,

                notes:
                    "Preferred direct total-power signal when generator device topology is unambiguous.",
            }),


        /*
        |--------------------------------------------------------------------------
        | Generator electrical measurements
        |--------------------------------------------------------------------------
        */

        426:
            define({
                attributeId: 426,
                code: "G1v",
                name: "Generator phase 1 voltage",
                signalClass: GENERATOR_SIGNAL_CLASS.ELECTRICAL_MEASUREMENT,
                role: GENERATOR_ANALYTICS_ROLE.PHASE_1_VOLTAGE,
                calculationEnabled: true,
                unitEstablished: true,
            }),

        432:
            define({
                attributeId: 432,
                code: "G2v",
                name: "Generator phase 2 voltage",
                signalClass: GENERATOR_SIGNAL_CLASS.ELECTRICAL_MEASUREMENT,
                role: GENERATOR_ANALYTICS_ROLE.PHASE_2_VOLTAGE,
                calculationEnabled: true,
                unitEstablished: true,
            }),

        436:
            define({
                attributeId: 436,
                code: "G3v",
                name: "Generator phase 3 voltage",
                signalClass: GENERATOR_SIGNAL_CLASS.ELECTRICAL_MEASUREMENT,
                role: GENERATOR_ANALYTICS_ROLE.PHASE_3_VOLTAGE,
                calculationEnabled: true,
                unitEstablished: true,
            }),

        427:
            define({
                attributeId: 427,
                code: "G1c",
                name: "Generator phase 1 current",
                signalClass: GENERATOR_SIGNAL_CLASS.ELECTRICAL_MEASUREMENT,
                role: GENERATOR_ANALYTICS_ROLE.PHASE_1_CURRENT,
                calculationEnabled: true,
                unitEstablished: true,
            }),

        433:
            define({
                attributeId: 433,
                code: "G2c",
                name: "Generator phase 2 current",
                signalClass: GENERATOR_SIGNAL_CLASS.ELECTRICAL_MEASUREMENT,
                role: GENERATOR_ANALYTICS_ROLE.PHASE_2_CURRENT,
                calculationEnabled: true,
                unitEstablished: true,
            }),

        437:
            define({
                attributeId: 437,
                code: "G3c",
                name: "Generator phase 3 current",
                signalClass: GENERATOR_SIGNAL_CLASS.ELECTRICAL_MEASUREMENT,
                role: GENERATOR_ANALYTICS_ROLE.PHASE_3_CURRENT,
                calculationEnabled: true,
                unitEstablished: true,
            }),

        431:
            define({
                attributeId: 431,
                code: "G1f",
                name: "Generator frequency",
                signalClass: GENERATOR_SIGNAL_CLASS.ELECTRICAL_MEASUREMENT,
                role: GENERATOR_ANALYTICS_ROLE.FREQUENCY,
                calculationEnabled: true,
                unitEstablished: true,
            }),

        640:
            define({
                attributeId: 640,
                code: "Gps",
                name: "Genset phase sequence",
                signalClass: GENERATOR_SIGNAL_CLASS.ELECTRICAL_MEASUREMENT,
                role: GENERATOR_ANALYTICS_ROLE.PHASE_SEQUENCE,
                calculationEnabled: false,
                stateMappingEstablished: false,
                notes: "Observed but not required for generator performance KPI calculation.",
            }),


        /*
        |--------------------------------------------------------------------------
        | Power factor
        |--------------------------------------------------------------------------
        */

        1856:
            define({
                attributeId: 1856,
                code: "G1pf",
                name: "Genset power factor L1",
                signalClass: GENERATOR_SIGNAL_CLASS.POWER_FACTOR,
                role: GENERATOR_ANALYTICS_ROLE.PHASE_1_POWER_FACTOR,
                calculationEnabled: true,
                unitEstablished: true,
            }),

        1857:
            define({
                attributeId: 1857,
                code: "G2pf",
                name: "Genset power factor L2",
                signalClass: GENERATOR_SIGNAL_CLASS.POWER_FACTOR,
                role: GENERATOR_ANALYTICS_ROLE.PHASE_2_POWER_FACTOR,
                calculationEnabled: true,
                unitEstablished: true,
            }),

        1858:
            define({
                attributeId: 1858,
                code: "G3pf",
                name: "Genset power factor L3",
                signalClass: GENERATOR_SIGNAL_CLASS.POWER_FACTOR,
                role: GENERATOR_ANALYTICS_ROLE.PHASE_3_POWER_FACTOR,
                calculationEnabled: true,
                unitEstablished: true,
            }),

        1859:
            define({
                attributeId: 1859,
                code: "Gpf",
                name: "Genset total power factor",
                signalClass: GENERATOR_SIGNAL_CLASS.POWER_FACTOR,
                role: GENERATOR_ANALYTICS_ROLE.TOTAL_POWER_FACTOR,
                calculationEnabled: true,
                unitEstablished: true,
            }),


        /*
        |--------------------------------------------------------------------------
        | Generator state / status
        |--------------------------------------------------------------------------
        */

        1166:
            define({
                attributeId:
                    1166,

                code:
                    "gaS",

                name:
                    "Generator state",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .OPERATING_STATE,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .GENERATOR_STATE,

                calculationEnabled:
                    false,

                stateMappingEstablished:
                    false,

                notes:
                    "Observed values 0 and 1. Do not map these to STOPPED/RUNNING until explicitly qualified.",
            }),

        416:
            define({
                attributeId:
                    416,

                code:
                    "GST",

                name:
                    "Generator status",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .OPERATING_STATE,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .GENERATOR_STATUS,

                calculationEnabled:
                    false,

                stateMappingEstablished:
                    false,

                notes:
                    "Observed codes 0 and 8. Status-code semantics unresolved.",
            }),

        471:
            define({
                attributeId:
                    471,

                code:
                    "AIS",

                name:
                    "Active AC input source",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .ACTIVE_SOURCE_CONTEXT,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .ACTIVE_SOURCE,

                calculationEnabled:
                    false,

                stateMappingEstablished:
                    true,

                notes:
                    "Generator=2 is established source identity. This proves source selection, not generator availability.",
            }),


        /*
        |--------------------------------------------------------------------------
        | Runtime / timer evidence
        |--------------------------------------------------------------------------
        |
        | CRITICAL:
        |
        | Raw unit semantics remain unresolved.
        |
        | These are NOT calculation-enabled for Phase 8.5C until cadence,
        | counter behaviour, reset behaviour and raw units are qualified.
        |--------------------------------------------------------------------------
        */

        1018:
            define({
                attributeId:
                    1018,

                code:
                    "Gt",

                name:
                    "Accumulated time for generic Generator",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .RUNTIME_COUNTER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .ACCUMULATED_RUNTIME,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,

                counterSemanticsEstablished:
                    false,

                notes:
                    "High fleet coverage. Stored under Gateway settings. Must be qualified before period-runtime subtraction.",
            }),

        1015:
            define({
                attributeId:
                    1015,

                code:
                    "Ft",

                name:
                    "Accumulated runtime FischerPanda generators",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .RUNTIME_COUNTER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .ACCUMULATED_RUNTIME,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,

                counterSemanticsEstablished:
                    false,
            }),

        1029:
            define({
                attributeId:
                    1029,

                code:
                    "gaR",

                name:
                    "Total run time",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .RUNTIME_COUNTER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .TOTAL_RUNTIME,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,

                counterSemanticsEstablished:
                    false,
            }),

        1030:
            define({
                attributeId:
                    1030,

                code:
                    "gaT",

                name:
                    "Run time today",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .RUNTIME_COUNTER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .TODAY_RUNTIME,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,

                counterSemanticsEstablished:
                    false,

                notes:
                    "Daily-reset semantics are suggested by the parameter name but not yet validated from production series.",
            }),

        915:
            define({
                attributeId:
                    915,

                code:
                    "gRT",

                name:
                    "Generator run-time since last start",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .RUNTIME_TIMER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .CURRENT_RUN_RUNTIME,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,

                counterSemanticsEstablished:
                    false,
            }),

        1163:
            define({
                attributeId:
                    1163,

                code:
                    "Tga",

                name:
                    "Generator run-time",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .RUNTIME_COUNTER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .ACCUMULATED_RUNTIME,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,

                counterSemanticsEstablished:
                    false,
            }),

        421:
            define({
                attributeId:
                    421,

                code:
                    "Geo",

                name:
                    "Engine operating hours",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .RUNTIME_COUNTER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .ENGINE_OPERATING_TIME,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,

                counterSemanticsEstablished:
                    false,

                notes:
                    "Parameter name says operating hours, but stored raw scale must be empirically qualified before conversion.",
            }),

        532:
            define({
                attributeId:
                    532,

                code:
                    "Tgs",

                name:
                    "Time generator",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .RUNTIME_TIMER,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .TIMER_ON_GENERATOR,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,

                counterSemanticsEstablished:
                    false,
            }),


        /*
        |--------------------------------------------------------------------------
        | Engine measurements
        |--------------------------------------------------------------------------
        */

        419:
            define({
                attributeId:
                    419,

                code:
                    "Gel",

                name:
                    "Engine load",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .ENGINE_MEASUREMENT,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .ENGINE_LOAD,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,

                notes:
                    "Observed range is compatible with a percentage-like quantity, but the raw unit is not stored; do not label % yet.",
            }),

        420:
            define({
                attributeId:
                    420,

                code:
                    "Ges",

                name:
                    "Engine speed",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .ENGINE_MEASUREMENT,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .ENGINE_SPEED,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,

                notes:
                    "Likely rotational speed evidence, but raw telemetry contains no qualified unit.",
            }),

        422:
            define({
                attributeId:
                    422,

                code:
                    "Gct",

                name:
                    "Engine coolant temperature",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .ENGINE_MEASUREMENT,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .COOLANT_TEMPERATURE,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,
            }),

        1268:
            define({
                attributeId:
                    1268,

                code:
                    "Gop",

                name:
                    "Engine oil pressure",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .ENGINE_MEASUREMENT,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .OIL_PRESSURE,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,
            }),


        /*
        |--------------------------------------------------------------------------
        | Generator run reason
        |--------------------------------------------------------------------------
        */

        520:
            define({
                attributeId:
                    520,

                code:
                    "gaRC",

                name:
                    "Generator run reason",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .RUN_REASON,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .RUN_REASON,

                calculationEnabled:
                    false,

                stateMappingEstablished:
                    false,
            }),

        917:
            define({
                attributeId:
                    917,

                code:
                    "gRC",

                name:
                    "Generator run by condition code",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .RUN_REASON,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .RUN_REASON,

                calculationEnabled:
                    false,

                stateMappingEstablished:
                    false,
            }),


        /*
        |--------------------------------------------------------------------------
        | Start / stop control and configuration
        |--------------------------------------------------------------------------
        */

        1032:
            define({
                attributeId:
                    1032,

                code:
                    "gaM",

                name:
                    "Manual start",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .START_STOP_CONTROL,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .MANUAL_START,

                calculationEnabled:
                    false,

                stateMappingEstablished:
                    false,

                notes:
                    "Control/state evidence; not a generator-start event counter.",
            }),

        1033:
            define({
                attributeId:
                    1033,

                code:
                    "gaMT",

                name:
                    "Manual start timer",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .START_STOP_CONTROL,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .MANUAL_START_TIMER,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,
            }),

        1048:
            define({
                attributeId:
                    1048,

                code:
                    "gaA",

                name:
                    "Generator autostart enabled",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .CONFIGURATION,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .AUTOSTART_ENABLED,

                calculationEnabled:
                    false,

                stateMappingEstablished:
                    true,
            }),

        418:
            define({
                attributeId:
                    418,

                code:
                    "Gas",

                name:
                    "Remote start mode",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .CONFIGURATION,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .REMOTE_START_MODE,

                calculationEnabled:
                    false,

                stateMappingEstablished:
                    true,
            }),

        1043:
            define({
                attributeId:
                    1043,

                code:
                    "gat",

                name:
                    "Type of generator controlled by start/stop instance",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .CONFIGURATION,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .GENERATOR_TYPE,

                calculationEnabled:
                    false,

                stateMappingEstablished:
                    false,
            }),

        1034:
            define({
                attributeId:
                    1034,

                code:
                    "gaQ",

                name:
                    "Quiet hours",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .CONFIGURATION,

                role:
                    null,

                calculationEnabled:
                    false,
            }),


        /*
        |--------------------------------------------------------------------------
        | Fault / alarm evidence
        |--------------------------------------------------------------------------
        */

        441:
            define({
                attributeId:
                    441,

                code:
                    "gaNG",

                name:
                    "Generator not detected at AC-input",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .ALARM_CONDITION,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .GENERATOR_NOT_DETECTED,

                calculationEnabled:
                    false,

                notes:
                    "Alarm/condition evidence. It does not directly define a downtime interval.",
            }),

        1031:
            define({
                attributeId:
                    1031,

                code:
                    "gaE",

                name:
                    "Autostart error",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .ALARM_CONDITION,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .AUTOSTART_ERROR,

                calculationEnabled:
                    false,
            }),

        1288:
            define({
                attributeId:
                    1288,

                code:
                    "gasr",

                name:
                    "Service due",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .MAINTENANCE,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .SERVICE_DUE,

                calculationEnabled:
                    false,
            }),

        1582:
            define({
                attributeId:
                    1582,

                code:
                    "gada",

                name:
                    "GX Auto start/stop disabled",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .ALARM_CONDITION,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .AUTOSTART_DISABLED_ALARM,

                calculationEnabled:
                    false,
            }),

        1585:
            define({
                attributeId:
                    1585,

                code:
                    "gara",

                name:
                    "Remote start disabled on genset",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .ALARM_CONDITION,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .REMOTE_START_DISABLED_ALARM,

                calculationEnabled:
                    false,
            }),


        /*
        |--------------------------------------------------------------------------
        | Maintenance
        |--------------------------------------------------------------------------
        */

        1287:
            define({
                attributeId:
                    1287,

                code:
                    "gasd",

                name:
                    "Service count-down",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .MAINTENANCE,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .SERVICE_COUNTDOWN,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,
            }),

        1505:
            define({
                attributeId:
                    1505,

                code:
                    "gasi",

                name:
                    "Service interval",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .MAINTENANCE,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .SERVICE_INTERVAL,

                calculationEnabled:
                    false,

                unitEstablished:
                    false,
            }),


        /*
        |--------------------------------------------------------------------------
        | Generator error slots
        |--------------------------------------------------------------------------
        */

        ...Object.fromEntries(
            [
                1615,
                1616,
                1617,
                1618,
                1619,
                1620,
                1621,
                1622,
            ].map(
                (
                    attributeId
                ) => [

                    attributeId,

                    define({
                        attributeId,

                        code:
                            null,

                        name:
                            `Generator error slot ${attributeId}`,

                        signalClass:
                            GENERATOR_SIGNAL_CLASS
                                .ERROR_SLOT,

                        role:
                            GENERATOR_ANALYTICS_ROLE
                                .GENERATOR_ERROR_SLOT,

                        calculationEnabled:
                            false,

                        notes:
                            "Error-slot telemetry is diagnostic evidence, not automatically a FailureEvent or downtime interval.",
                    }),
                ]
            )
        ),


        /*
        |--------------------------------------------------------------------------
        | Flow-context attributes
        |--------------------------------------------------------------------------
        |
        | Their direct engineering-flow semantics remain unresolved from
        | earlier Phase 8.3 work. Keep blocked.
        |--------------------------------------------------------------------------
        */

        109:
            define({
                attributeId:
                    109,

                code:
                    "gc",

                name:
                    "Genset to consumers",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .FLOW_CONTEXT,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .GENSET_TO_CONSUMERS,

                calculationEnabled:
                    false,

                notes:
                    "Context only until flow semantics and unit are explicitly qualified.",
            }),

        110:
            define({
                attributeId:
                    110,

                code:
                    "gb",

                name:
                    "Genset to battery",

                signalClass:
                    GENERATOR_SIGNAL_CLASS
                        .FLOW_CONTEXT,

                role:
                    GENERATOR_ANALYTICS_ROLE
                        .GENSET_TO_BATTERY,

                calculationEnabled:
                    false,

                notes:
                    "Context only until flow semantics and unit are explicitly qualified.",
            }),


        /*
        |--------------------------------------------------------------------------
        | Asset metadata
        |--------------------------------------------------------------------------
        */

        414:
            define({
                attributeId: 414,
                code: "GP",
                name: "Generator model",
                signalClass: GENERATOR_SIGNAL_CLASS.ASSET_METADATA,
                role: GENERATOR_ANALYTICS_ROLE.MODEL,
            }),

        415:
            define({
                attributeId: 415,
                code: "Gv",
                name: "Generator firmware version",
                signalClass: GENERATOR_SIGNAL_CLASS.ASSET_METADATA,
                role: GENERATOR_ANALYTICS_ROLE.FIRMWARE,
            }),

        591:
            define({
                attributeId: 591,
                code: "Gcn",
                name: "Generator custom name",
                signalClass: GENERATOR_SIGNAL_CLASS.ASSET_METADATA,
                role: GENERATOR_ANALYTICS_ROLE.CUSTOM_NAME,
            }),

        1844:
            define({
                attributeId: 1844,
                code: "Ggm",
                name: "Generic energy meter flag",
                signalClass: GENERATOR_SIGNAL_CLASS.CONFIGURATION,
                role: GENERATOR_ANALYTICS_ROLE.GENERIC_ENERGY_METER_FLAG,
            }),
    });


/*
|--------------------------------------------------------------------------
| Current semantic boundaries
|--------------------------------------------------------------------------
*/

export const GENERATOR_ANALYTICS_BOUNDARIES =
    Object.freeze({

        GENERATOR_POWER_ZERO_MEANS_FAILURE:
            false,

        GENERATOR_NOT_ACTIVE_SOURCE_MEANS_FAILURE:
            false,

        ACTIVE_SOURCE_IS_AVAILABILITY_SIGNAL:
            false,

        ATTRIBUTE_471_GENERATOR_CODE_ESTABLISHED:
            true,

        ATTRIBUTE_471_GENERATOR_CODE:
            2,

        ATTRIBUTE_1166_STATE_MAPPING_ESTABLISHED:
            false,

        ATTRIBUTE_416_STATUS_MAPPING_ESTABLISHED:
            false,

        RUNTIME_RAW_UNIT_ESTABLISHED:
            false,

        RUNTIME_COUNTER_RESET_BEHAVIOUR_ESTABLISHED:
            false,

        RUNTIME_REPORTING_WINDOW_DELTA_ESTABLISHED:
            false,

        GENERATOR_START_COUNTER_ESTABLISHED:
            false,

        GENERATOR_STOP_COUNTER_ESTABLISHED:
            false,

        GENERATOR_STARTS_CAN_BE_INFERRED_FROM_POWER:
            false,

        ENGINE_LOAD_UNIT_ESTABLISHED:
            false,

        ENGINE_SPEED_UNIT_ESTABLISHED:
            false,

        COOLANT_TEMPERATURE_UNIT_ESTABLISHED:
            false,

        OIL_PRESSURE_UNIT_ESTABLISHED:
            false,

        GENERATOR_RATED_CAPACITY_ESTABLISHED:
            false,

        GENERATOR_LOADING_PERCENT_CALCULABLE:
            false,

        FUEL_TELEMETRY_ESTABLISHED:
            false,

        FUEL_CONSUMPTION_CALCULABLE:
            false,

        ALARM_AUTOMATICALLY_MEANS_FAILURE:
            false,

        ALARM_AUTOMATICALLY_MEANS_DOWNTIME:
            false,

        GENERATOR_AVAILABILITY_CALCULABLE:
            false,

        FLOW_109_110_CALCULATION_ENABLED:
            false,
    });


/*
|--------------------------------------------------------------------------
| Access helpers
|--------------------------------------------------------------------------
*/

export function getGeneratorAttributeQualification(
    attributeId
) {

    return GENERATOR_ATTRIBUTE_MAP[
        Number(
            attributeId
        )
    ] ??
        null;
}


export function getGeneratorAttributesByClass(
    signalClass
) {

    return Object
        .values(
            GENERATOR_ATTRIBUTE_MAP
        )
        .filter(
            (
                definition
            ) =>
                definition
                    .signalClass ===
                signalClass
        );
}


export function getGeneratorAttributesByRole(
    role
) {

    return Object
        .values(
            GENERATOR_ATTRIBUTE_MAP
        )
        .filter(
            (
                definition
            ) =>
                definition
                    .role ===
                role
        );
}


export function isGeneratorAttributeCalculationEnabled(
    attributeId
) {

    return getGeneratorAttributeQualification(
        attributeId
    )
        ?.calculationEnabled ===
        true;
}


export default {

    GENERATOR_SIGNAL_CLASS,

    GENERATOR_ANALYTICS_ROLE,

    GENERATOR_SIGNAL_QUALIFICATION,

    GENERATOR_ATTRIBUTE_MAP,

    GENERATOR_ANALYTICS_BOUNDARIES,

    getGeneratorAttributeQualification,

    getGeneratorAttributesByClass,

    getGeneratorAttributesByRole,

    isGeneratorAttributeCalculationEnabled,
};