// services/engineering/batteryAvailabilitySemantics.js

/*
|--------------------------------------------------------------------------
| Phase 8.4H-B
| Battery Availability Semantic Qualification
|--------------------------------------------------------------------------
|
| This module freezes what production evidence currently supports.
|
| It does NOT calculate availability.
|--------------------------------------------------------------------------
*/


export const BATTERY_AVAILABILITY_SIGNAL_CLASS =
    Object.freeze({

        OPERATING_MODE:
            "OPERATING_MODE",

        FUNCTIONAL_SUPPORT:
            "FUNCTIONAL_SUPPORT",

        HEALTH_SUPPORT:
            "HEALTH_SUPPORT",

        CONDITIONAL_ALARM:
            "CONDITIONAL_ALARM",

        CONTROL_LIMIT:
            "CONTROL_LIMIT",

        CONFIGURATION:
            "CONFIGURATION",

        DIRECT_AVAILABILITY:
            "DIRECT_AVAILABILITY",

        BLOCKED:
            "BLOCKED",
    });


export const BATTERY_AVAILABILITY_STATE =
    Object.freeze({

        AVAILABLE:
            "AVAILABLE",

        UNAVAILABLE:
            "UNAVAILABLE",

        UNKNOWN:
            "UNKNOWN",
    });


/*
|--------------------------------------------------------------------------
| Attribute 215
|--------------------------------------------------------------------------
|
| Production evidence:
|
| state 0:
|   battery power approximately zero
|
| state 1:
|   battery power consistently positive
|
| state 2:
|   battery power consistently negative
|
| Therefore attr 215 is qualified as OPERATING MODE evidence.
|
| Positive/negative power has NOT yet been mapped to charge/discharge.
|--------------------------------------------------------------------------
*/

export const BATTERY_STATE_215 =
    Object.freeze({

        attributeId:
            215,

        semanticClass:
            BATTERY_AVAILABILITY_SIGNAL_CLASS
                .OPERATING_MODE,

        availabilitySignal:
            false,

        codes: {

            0: {
                code:
                    0,

                qualifiedMeaning:
                    "IDLE_OR_NEAR_ZERO_POWER",

                availabilityState:
                    BATTERY_AVAILABILITY_STATE
                        .UNKNOWN,
            },

            1: {
                code:
                    1,

                qualifiedMeaning:
                    "POSITIVE_BATTERY_POWER_MODE",

                availabilityState:
                    BATTERY_AVAILABILITY_STATE
                        .UNKNOWN,
            },

            2: {
                code:
                    2,

                qualifiedMeaning:
                    "NEGATIVE_BATTERY_POWER_MODE",

                availabilityState:
                    BATTERY_AVAILABILITY_STATE
                        .UNKNOWN,
            },
        },

        chargingDischargingMappingEstablished:
            false,

        failureMappingEstablished:
            false,
    });


/*
|--------------------------------------------------------------------------
| Signal qualification
|--------------------------------------------------------------------------
*/

export const BATTERY_AVAILABILITY_SIGNAL_MAP =
    Object.freeze({

        39: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .HEALTH_SUPPORT,

            directAvailability:
                false,
        },

        47: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .HEALTH_SUPPORT,

            directAvailability:
                false,
        },

        49: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .FUNCTIONAL_SUPPORT,

            directAvailability:
                false,
        },

        51: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .HEALTH_SUPPORT,

            directAvailability:
                false,
        },

        115: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .HEALTH_SUPPORT,

            directAvailability:
                false,
        },

        119: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONDITIONAL_ALARM,

            directAvailability:
                false,

            alarmCodeMappingEstablished:
                false,
        },

        120: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONDITIONAL_ALARM,

            directAvailability:
                false,

            alarmCodeMappingEstablished:
                false,
        },

        124: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONDITIONAL_ALARM,

            directAvailability:
                false,

            alarmCodeMappingEstablished:
                false,
        },

        125: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONDITIONAL_ALARM,

            directAvailability:
                false,

            alarmCodeMappingEstablished:
                false,
        },

        144: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .HEALTH_SUPPORT,

            directAvailability:
                false,
        },

        215:
            BATTERY_STATE_215,

        243: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .FUNCTIONAL_SUPPORT,

            directAvailability:
                false,

            signConventionEstablished:
                false,
        },

        273: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .HEALTH_SUPPORT,

            directAvailability:
                false,
        },

        274: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONTROL_LIMIT,

            directAvailability:
                false,
        },

        275: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONTROL_LIMIT,

            directAvailability:
                false,
        },

        276: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONTROL_LIMIT,

            directAvailability:
                false,
        },

        277: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONTROL_LIMIT,

            directAvailability:
                false,
        },

        333: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONFIGURATION,

            directAvailability:
                false,
        },

        334: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONFIGURATION,

            directAvailability:
                false,
        },

        472: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONFIGURATION,

            directAvailability:
                false,
        },

        1035: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .HEALTH_SUPPORT,

            directAvailability:
                false,
        },

        1277: {
            semanticClass:
                BATTERY_AVAILABILITY_SIGNAL_CLASS
                    .CONFIGURATION,

            directAvailability:
                false,
        },
    });


/*
|--------------------------------------------------------------------------
| Production boundaries
|--------------------------------------------------------------------------
*/

export const BATTERY_AVAILABILITY_SEMANTIC_BOUNDARIES =
    Object.freeze({

        DIRECT_AVAILABILITY_SIGNAL_ESTABLISHED:
            false,

        ATTRIBUTE_215_IS_AVAILABILITY_SIGNAL:
            false,

        ATTRIBUTE_215_OPERATING_MODE_ESTABLISHED:
            true,

        ATTRIBUTE_215_CHARGE_DISCHARGE_MAPPING_ESTABLISHED:
            false,

        ATTRIBUTE_243_SIGN_CONVENTION_ESTABLISHED:
            false,

        ALARM_CODE_MAPPING_ESTABLISHED:
            false,

        ALARM_AUTOMATICALLY_MEANS_UNAVAILABLE:
            false,

        BMS_CONTROL_LIMIT_AUTOMATICALLY_MEANS_UNAVAILABLE:
            false,

        SOC_AUTOMATICALLY_MEANS_AVAILABLE:
            false,

        VOLTAGE_AUTOMATICALLY_MEANS_AVAILABLE:
            false,

        ZERO_POWER_AUTOMATICALLY_MEANS_UNAVAILABLE:
            false,

        ZERO_CURRENT_AUTOMATICALLY_MEANS_UNAVAILABLE:
            false,

        DEVICE_COMMUNICATION_AUTOMATICALLY_MEANS_AVAILABLE:
            false,

        COMMUNICATION_LOSS_AUTOMATICALLY_MEANS_FAILURE:
            false,

        BATTERY_AVAILABILITY_PERCENT_CALCULABLE:
            false,
    });


export function getBatteryAvailabilitySignalQualification(
    attributeId
) {

    return (
        BATTERY_AVAILABILITY_SIGNAL_MAP[
            Number(
                attributeId
            )
        ] ??
        null
    );
}


export function getBatteryState215Qualification(
    code
) {

    return (
        BATTERY_STATE_215
            .codes[
                Number(
                    code
                )
            ] ??
        null
    );
}


export function classifyBatteryAvailabilityFromState215(
    code
) {

    const state =
        getBatteryState215Qualification(
            code
        );


    /*
     * Current production semantics deliberately return UNKNOWN
     * for every valid operating-mode state.
     */

    return (
        state
            ?.availabilityState ??
        BATTERY_AVAILABILITY_STATE
            .UNKNOWN
    );
}


export default {

    BATTERY_AVAILABILITY_SIGNAL_CLASS,

    BATTERY_AVAILABILITY_STATE,

    BATTERY_STATE_215,

    BATTERY_AVAILABILITY_SIGNAL_MAP,

    BATTERY_AVAILABILITY_SEMANTIC_BOUNDARIES,

    getBatteryAvailabilitySignalQualification,

    getBatteryState215Qualification,

    classifyBatteryAvailabilityFromState215,
};