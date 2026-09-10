// services/engineering/solarAttributeMap.js


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 8.7B — Solar Semantic Attribute Map
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Define the canonical Phase 8.7 semantic classification for solar/PV
| telemetry discovered during the 8.7A production evidence audit.
|
| IMPORTANT
|
| This module performs NO analytics.
|
| It does NOT:
|
| - calculate PV power
| - calculate PV energy
| - calculate availability
| - calculate performance ratio
| - calculate capacity factor
| - infer W / kW / V / A / kWh
| - infer installed PV capacity
| - infer irradiance
| - aggregate Solar Chargers
| - infer failure from zero power
| - treat Gateway PV settings as PV-generation evidence
|
| It provides the semantic contract consumed by later Phase 8.7 services.
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Phase
|--------------------------------------------------------------------------
*/

export const SOLAR_ATTRIBUTE_MAP_PHASE =
    "8.7B";


/*
|--------------------------------------------------------------------------
| Semantic roles
|--------------------------------------------------------------------------
*/

export const SOLAR_ATTRIBUTE_ROLE =
    Object.freeze({
        /*
         * PV-side electrical measurements
         */
        PV_POWER:
            "PV_POWER",

        DC_COUPLED_PV_POWER:
            "DC_COUPLED_PV_POWER",

        PV_VOLTAGE:
            "PV_VOLTAGE",


        /*
         * Solar Charger output / battery-side measurements
         */
        CHARGER_OUTPUT_VOLTAGE:
            "CHARGER_OUTPUT_VOLTAGE",

        CHARGER_OUTPUT_CURRENT:
            "CHARGER_OUTPUT_CURRENT",

        CHARGER_OUTPUT_POWER:
            "CHARGER_OUTPUT_POWER",


        /*
         * Yield / historical measurements
         */
        DAILY_YIELD:
            "DAILY_YIELD",

        PREVIOUS_DAY_YIELD:
            "PREVIOUS_DAY_YIELD",

        CUMULATIVE_YIELD:
            "CUMULATIVE_YIELD",

        YIELD_DELTA:
            "YIELD_DELTA",

        DAILY_MAX_POWER:
            "DAILY_MAX_POWER",

        PREVIOUS_DAY_MAX_POWER:
            "PREVIOUS_DAY_MAX_POWER",


        /*
         * Solar operating state
         */
        CHARGER_MODE:
            "CHARGER_MODE",

        CHARGER_STATE:
            "CHARGER_STATE",

        MPPT_STATE:
            "MPPT_STATE",

        ERROR_CODE:
            "ERROR_CODE",

        OFF_REASON:
            "OFF_REASON",


        /*
         * Context-only signals
         */
        PV_FLOW_CONTEXT:
            "PV_FLOW_CONTEXT",

        DEVICE_CONTEXT:
            "DEVICE_CONTEXT",

        SETTINGS_CONTEXT:
            "SETTINGS_CONTEXT",


        /*
         * Explicitly excluded from Solar engineering analytics
         */
        NOT_SOLAR_ANALYTICS:
            "NOT_SOLAR_ANALYTICS",
    });


/*
|--------------------------------------------------------------------------
| Semantic qualification
|--------------------------------------------------------------------------
|
| QUALIFIED
|     The observed name/path/device evidence is sufficient to classify
|     what physical/operational quantity the telemetry represents.
|
| CONDITIONAL
|     Quantity identity is useful, but its use requires additional
|     topology, device, counter or measurement-boundary qualification.
|
| CONTEXT_ONLY
|     Useful for explaining topology or state but must not directly
|     become a generation/energy/performance metric.
|
| BLOCKED
|     Must not be consumed by core Phase 8.7 calculations.
|--------------------------------------------------------------------------
*/

export const SOLAR_SEMANTIC_STATUS =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        CONDITIONAL:
            "CONDITIONAL",

        CONTEXT_ONLY:
            "CONTEXT_ONLY",

        BLOCKED:
            "BLOCKED",
    });


/*
|--------------------------------------------------------------------------
| Engineering unit qualification
|--------------------------------------------------------------------------
|
| The 8.7A production audit found no persisted unit metadata for the
| discovered Solar Charger signals.
|
| Therefore quantity identity and numerical engineering unit are kept
| deliberately separate.
|--------------------------------------------------------------------------
*/

export const SOLAR_UNIT_STATUS =
    Object.freeze({
        RESOLVED:
            "RESOLVED",

        UNRESOLVED:
            "UNRESOLVED",

        NOT_APPLICABLE:
            "NOT_APPLICABLE",
    });


/*
|--------------------------------------------------------------------------
| Measurement boundary
|--------------------------------------------------------------------------
*/

export const SOLAR_MEASUREMENT_BOUNDARY =
    Object.freeze({
        PV_INPUT:
            "PV_INPUT",

        SYSTEM_DC_PV:
            "SYSTEM_DC_PV",

        CHARGER_OUTPUT:
            "CHARGER_OUTPUT",

        SOLAR_CHARGER_HISTORY:
            "SOLAR_CHARGER_HISTORY",

        SOLAR_CHARGER_STATE:
            "SOLAR_CHARGER_STATE",

        SYSTEM_OVERVIEW_FLOW:
            "SYSTEM_OVERVIEW_FLOW",

        DEVICE_METADATA:
            "DEVICE_METADATA",

        GATEWAY_SETTINGS:
            "GATEWAY_SETTINGS",

        OTHER:
            "OTHER",
    });


/*
|--------------------------------------------------------------------------
| Data interpretation family
|--------------------------------------------------------------------------
*/

export const SOLAR_DATA_KIND =
    Object.freeze({
        INSTANTANEOUS:
            "INSTANTANEOUS",

        STATE:
            "STATE",

        COUNTER:
            "COUNTER",

        DELTA:
            "DELTA",

        DAILY_HISTORY:
            "DAILY_HISTORY",

        CONFIGURATION:
            "CONFIGURATION",

        IDENTIFIER:
            "IDENTIFIER",

        CONTEXT:
            "CONTEXT",
    });


/*
|--------------------------------------------------------------------------
| Evidence source
|--------------------------------------------------------------------------
*/

export const SOLAR_EVIDENCE_BASIS =
    Object.freeze({
        DIRECT_SOLAR_CHARGER:
            "DIRECT_SOLAR_CHARGER",

        SYSTEM_OVERVIEW:
            "SYSTEM_OVERVIEW",

        GATEWAY_SETTING:
            "GATEWAY_SETTING",

        DEVICE_METADATA:
            "DEVICE_METADATA",
    });


/*
|--------------------------------------------------------------------------
| Attribute builder
|--------------------------------------------------------------------------
*/

function defineSolarAttribute({
    id,
    key,
    name,
    role,
    semanticStatus,
    unitStatus = SOLAR_UNIT_STATUS.UNRESOLVED,
    unit = null,
    boundary,
    dataKind,
    evidenceBasis,
    expectedDeviceType = null,
    expectedDbusServiceType = null,
    expectedDbusPath = null,
    primaryPowerCandidate = false,
    secondaryPowerCandidate = false,
    usableForPower = false,
    usableForEnergy = false,
    usableForOperatingState = false,
    usableForAvailability = false,
    usableForPerformance = false,
    aggregationAllowed = false,
    notes = [],
}) {
    return Object.freeze({
        id,
        key,
        name,
        role,
        semanticStatus,

        unit: Object.freeze({
            status:
                unitStatus,

            value:
                unit,
        }),

        measurementBoundary:
            boundary,

        dataKind,

        evidenceBasis,

        expectedTelemetry:
            Object.freeze({
                deviceType:
                    expectedDeviceType,

                dbusServiceType:
                    expectedDbusServiceType,

                dbusPath:
                    expectedDbusPath,
            }),

        qualification:
            Object.freeze({
                primaryPowerCandidate:
                    Boolean(
                        primaryPowerCandidate
                    ),

                secondaryPowerCandidate:
                    Boolean(
                        secondaryPowerCandidate
                    ),

                usableForPower:
                    Boolean(
                        usableForPower
                    ),

                usableForEnergy:
                    Boolean(
                        usableForEnergy
                    ),

                usableForOperatingState:
                    Boolean(
                        usableForOperatingState
                    ),

                usableForAvailability:
                    Boolean(
                        usableForAvailability
                    ),

                usableForPerformance:
                    Boolean(
                        usableForPerformance
                    ),

                aggregationAllowed:
                    Boolean(
                        aggregationAllowed
                    ),
            }),

        notes:
            Object.freeze([
                ...notes,
            ]),
    });
}


/*
|--------------------------------------------------------------------------
| Phase 8.7 solar attributes
|--------------------------------------------------------------------------
*/

export const SOLAR_ATTRIBUTE_MAP =
    Object.freeze({

        /*
        |--------------------------------------------------------------------------
        | PV-side power
        |--------------------------------------------------------------------------
        */

        PV_POWER:
            defineSolarAttribute({
                id:
                    442,

                key:
                    "PV_POWER",

                name:
                    "PV Power",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .PV_POWER,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .PV_INPUT,

                dataKind:
                    SOLAR_DATA_KIND
                        .INSTANTANEOUS,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/Yield/Power",

                primaryPowerCandidate:
                    true,

                usableForPower:
                    true,

                notes: [
                    "Canonical Phase 8.7 primary PV-power candidate.",
                    "Observed on Solar Charger deviceInstance 258 during 8.7A.",
                    "Stored engineering unit was not established.",
                    "Zero PV power does not establish failure or unavailability.",
                ],
            }),


        DC_COUPLED_PV_POWER:
            defineSolarAttribute({
                id:
                    113,

                key:
                    "DC_COUPLED_PV_POWER",

                name:
                    "PV DC-Coupled Power",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .DC_COUPLED_PV_POWER,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONDITIONAL,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SYSTEM_DC_PV,

                dataKind:
                    SOLAR_DATA_KIND
                        .INSTANTANEOUS,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .SYSTEM_OVERVIEW,

                expectedDeviceType:
                    "System overview",

                expectedDbusServiceType:
                    "system",

                expectedDbusPath:
                    "/Dc/Pv/Power",

                secondaryPowerCandidate:
                    true,

                usableForPower:
                    true,

                notes: [
                    "System-overview DC-coupled PV-power signal.",
                    "Secondary/conditional power candidate.",
                    "Must not be summed with attr442.",
                    "Must not silently replace attr442 when topology is ambiguous.",
                    "Stored engineering unit was not established.",
                ],
            }),


        /*
        |--------------------------------------------------------------------------
        | PV-side voltage
        |--------------------------------------------------------------------------
        */

        PV_VOLTAGE:
            defineSolarAttribute({
                id:
                    86,

                key:
                    "PV_VOLTAGE",

                name:
                    "PV Voltage",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .PV_VOLTAGE,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .PV_INPUT,

                dataKind:
                    SOLAR_DATA_KIND
                        .INSTANTANEOUS,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/Pv/V",

                notes: [
                    "PV-side voltage quantity identity is established by DBus path.",
                    "Numeric engineering unit remains unresolved in persisted telemetry.",
                    "Positive PV voltage alone does not establish useful PV generation.",
                ],
            }),


        /*
        |--------------------------------------------------------------------------
        | Solar Charger output / battery side
        |--------------------------------------------------------------------------
        */

        CHARGER_OUTPUT_VOLTAGE:
            defineSolarAttribute({
                id:
                    81,

                key:
                    "CHARGER_OUTPUT_VOLTAGE",

                name:
                    "Solar Charger DC Output Voltage",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .CHARGER_OUTPUT_VOLTAGE,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .CHARGER_OUTPUT,

                dataKind:
                    SOLAR_DATA_KIND
                        .INSTANTANEOUS,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/Dc/0/Voltage",

                notes: [
                    "Solar Charger DC/output-side voltage.",
                    "Not PV-array voltage; attr86 owns the PV-side voltage boundary.",
                ],
            }),


        CHARGER_OUTPUT_CURRENT:
            defineSolarAttribute({
                id:
                    82,

                key:
                    "CHARGER_OUTPUT_CURRENT",

                name:
                    "Solar Charger DC Output Current",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .CHARGER_OUTPUT_CURRENT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .CHARGER_OUTPUT,

                dataKind:
                    SOLAR_DATA_KIND
                        .INSTANTANEOUS,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/Dc/0/Current",

                notes: [
                    "Solar Charger DC/output-side current.",
                    "Must not be interpreted as PV-array current.",
                ],
            }),


        CHARGER_OUTPUT_POWER:
            defineSolarAttribute({
                id:
                    107,

                key:
                    "CHARGER_OUTPUT_POWER",

                name:
                    "Solar Charger Battery Watts",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .CHARGER_OUTPUT_POWER,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .CHARGER_OUTPUT,

                dataKind:
                    SOLAR_DATA_KIND
                        .INSTANTANEOUS,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                usableForPower:
                    false,

                notes: [
                    "Solar Charger battery/output-side power.",
                    "Not a substitute for attr442 PV-input power.",
                    "Must not be added to attr442 or attr113.",
                ],
            }),


        /*
        |--------------------------------------------------------------------------
        | Yield / history
        |--------------------------------------------------------------------------
        */

        YIELD_TODAY:
            defineSolarAttribute({
                id:
                    94,

                key:
                    "YIELD_TODAY",

                name:
                    "Yield Today",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .DAILY_YIELD,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SOLAR_CHARGER_HISTORY,

                dataKind:
                    SOLAR_DATA_KIND
                        .DAILY_HISTORY,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/History/Daily/0/Yield",

                usableForEnergy:
                    false,

                notes: [
                    "Semantically identified as current-day Solar Charger yield.",
                    "Engineering unit remains unresolved.",
                    "Must not become kWh until unit semantics are qualified.",
                    "Repeated samples represent a daily history value, not independent interval energy.",
                ],
            }),


        YIELD_YESTERDAY:
            defineSolarAttribute({
                id:
                    96,

                key:
                    "YIELD_YESTERDAY",

                name:
                    "Yield Yesterday",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .PREVIOUS_DAY_YIELD,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SOLAR_CHARGER_HISTORY,

                dataKind:
                    SOLAR_DATA_KIND
                        .DAILY_HISTORY,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/History/Daily/1/Yield",

                usableForEnergy:
                    false,

                notes: [
                    "Previous-day Solar Charger yield.",
                    "Unit remains unresolved.",
                    "Must not be integrated as a time series.",
                ],
            }),


        USER_YIELD:
            defineSolarAttribute({
                id:
                    285,

                key:
                    "USER_YIELD",

                name:
                    "User Yield",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .CUMULATIVE_YIELD,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONDITIONAL,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SOLAR_CHARGER_HISTORY,

                dataKind:
                    SOLAR_DATA_KIND
                        .COUNTER,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/Yield/User",

                usableForEnergy:
                    false,

                notes: [
                    "Counter-like user-yield evidence.",
                    "Counter semantics require Phase 8.7D validation.",
                    "Counter decrease must not automatically be labelled reset.",
                    "Unit remains unresolved.",
                ],
            }),


        USER_YIELD_DELTA:
            defineSolarAttribute({
                id:
                    340,

                key:
                    "USER_YIELD_DELTA",

                name:
                    "User Yield Delta",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .YIELD_DELTA,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONDITIONAL,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SOLAR_CHARGER_HISTORY,

                dataKind:
                    SOLAR_DATA_KIND
                        .DELTA,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                usableForEnergy:
                    false,

                notes: [
                    "Observed delta-style user-yield evidence.",
                    "Unit semantics remain unresolved.",
                    "Must not be labelled kWh before qualification.",
                ],
            }),


        MAX_POWER_TODAY:
            defineSolarAttribute({
                id:
                    95,

                key:
                    "MAX_POWER_TODAY",

                name:
                    "Maximum Charge Power Today",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .DAILY_MAX_POWER,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SOLAR_CHARGER_HISTORY,

                dataKind:
                    SOLAR_DATA_KIND
                        .DAILY_HISTORY,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/History/Daily/0/MaxPower",

                usableForPerformance:
                    false,

                notes: [
                    "Daily historical maximum charge-power quantity.",
                    "Does not establish installed/rated PV capacity.",
                    "Engineering unit remains unresolved.",
                ],
            }),


        MAX_POWER_YESTERDAY:
            defineSolarAttribute({
                id:
                    97,

                key:
                    "MAX_POWER_YESTERDAY",

                name:
                    "Maximum Charge Power Yesterday",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .PREVIOUS_DAY_MAX_POWER,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SOLAR_CHARGER_HISTORY,

                dataKind:
                    SOLAR_DATA_KIND
                        .DAILY_HISTORY,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/History/Daily/1/MaxPower",

                notes: [
                    "Previous-day maximum charge-power quantity.",
                    "Must not be interpreted as installed capacity.",
                ],
            }),


        /*
        |--------------------------------------------------------------------------
        | Operating state / diagnostics
        |--------------------------------------------------------------------------
        */

        CHARGER_MODE:
            defineSolarAttribute({
                id:
                    84,

                key:
                    "CHARGER_MODE",

                name:
                    "Solar Charger Mode",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .CHARGER_MODE,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SOLAR_CHARGER_STATE,

                dataKind:
                    SOLAR_DATA_KIND
                        .STATE,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/Mode",

                usableForOperatingState:
                    true,

                notes: [
                    "Operating-mode evidence only.",
                    "Mode ON does not establish functional availability.",
                ],
            }),


        CHARGER_STATE:
            defineSolarAttribute({
                id:
                    85,

                key:
                    "CHARGER_STATE",

                name:
                    "Solar Charger State",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .CHARGER_STATE,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SOLAR_CHARGER_STATE,

                dataKind:
                    SOLAR_DATA_KIND
                        .STATE,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/State",

                usableForOperatingState:
                    true,

                notes: [
                    "Charge-state evidence.",
                    "Numeric state codes require explicit decoding before named-state labels are emitted.",
                ],
            }),


        MPPT_STATE:
            defineSolarAttribute({
                id:
                    518,

                key:
                    "MPPT_STATE",

                name:
                    "MPPT State",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .MPPT_STATE,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SOLAR_CHARGER_STATE,

                dataKind:
                    SOLAR_DATA_KIND
                        .STATE,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/MppOperationMode",

                usableForOperatingState:
                    true,

                notes: [
                    "MPPT operating-state evidence.",
                    "MPPT state is not irradiance evidence.",
                ],
            }),


        ERROR_CODE:
            defineSolarAttribute({
                id:
                    98,

                key:
                    "ERROR_CODE",

                name:
                    "Solar Charger Error Code",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .ERROR_CODE,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SOLAR_CHARGER_STATE,

                dataKind:
                    SOLAR_DATA_KIND
                        .STATE,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/ErrorCode",

                usableForOperatingState:
                    true,

                notes: [
                    "Explicit charger error-code evidence.",
                    "ErrorCode=0 alone does not establish total functional availability.",
                ],
            }),


        OFF_REASON:
            defineSolarAttribute({
                id:
                    583,

                key:
                    "OFF_REASON",

                name:
                    "Solar Charger Off Reason",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .OFF_REASON,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .QUALIFIED,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SOLAR_CHARGER_STATE,

                dataKind:
                    SOLAR_DATA_KIND
                        .STATE,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DIRECT_SOLAR_CHARGER,

                expectedDeviceType:
                    "Solar Charger",

                expectedDbusServiceType:
                    "solarcharger",

                expectedDbusPath:
                    "/DeviceOffReason",

                usableForOperatingState:
                    true,

                notes: [
                    "Explicit device-off-reason evidence.",
                    "Requires reason-code qualification before downtime attribution.",
                ],
            }),


        /*
        |--------------------------------------------------------------------------
        | System-overview PV flows — context only
        |--------------------------------------------------------------------------
        */

        PV_TO_BATTERY:
            defineSolarAttribute({
                id:
                    102,

                key:
                    "PV_TO_BATTERY",

                name:
                    "PV to Battery",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .PV_FLOW_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SYSTEM_OVERVIEW_FLOW,

                dataKind:
                    SOLAR_DATA_KIND
                        .CONTEXT,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .SYSTEM_OVERVIEW,

                expectedDeviceType:
                    "System overview",

                notes: [
                    "PV-to-battery system-overview flow.",
                    "Unit remains unresolved.",
                    "Must not be used as primary PV generation.",
                ],
            }),


        PV_TO_CONSUMERS:
            defineSolarAttribute({
                id:
                    104,

                key:
                    "PV_TO_CONSUMERS",

                name:
                    "PV to Consumers",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .PV_FLOW_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .SYSTEM_OVERVIEW_FLOW,

                dataKind:
                    SOLAR_DATA_KIND
                        .CONTEXT,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .SYSTEM_OVERVIEW,

                expectedDeviceType:
                    "System overview",

                notes: [
                    "PV-to-consumer system-overview flow.",
                    "Must not be summed with PV-to-battery to fabricate total generation.",
                ],
            }),


        /*
        |--------------------------------------------------------------------------
        | Gateway settings
        |--------------------------------------------------------------------------
        */

        DC_PV_FEED_IN_SETTING:
            defineSolarAttribute({
                id:
                    741,

                key:
                    "DC_PV_FEED_IN_SETTING",

                name:
                    "Feed Excess DC-Coupled PV Into Grid Setting",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .SETTINGS_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .GATEWAY_SETTINGS,

                dataKind:
                    SOLAR_DATA_KIND
                        .CONFIGURATION,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .GATEWAY_SETTING,

                expectedDeviceType:
                    "Gateway",

                expectedDbusServiceType:
                    "settings",

                expectedDbusPath:
                    "/Settings/CGwacs/OvervoltageFeedIn",

                notes: [
                    "Gateway configuration only.",
                    "Observed across many sites during 8.7A.",
                    "Does not establish PV equipment presence.",
                    "Does not establish PV generation.",
                ],
            }),


        AC_PV_FEEDBACK_SETTING:
            defineSolarAttribute({
                id:
                    742,

                key:
                    "AC_PV_FEEDBACK_SETTING",

                name:
                    "AC-Coupled PV Feedback Setting",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .SETTINGS_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .GATEWAY_SETTINGS,

                dataKind:
                    SOLAR_DATA_KIND
                        .CONFIGURATION,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .GATEWAY_SETTING,

                expectedDeviceType:
                    "Gateway",

                expectedDbusServiceType:
                    "settings",

                expectedDbusPath:
                    "/Settings/CGwacs/PreventFeedback",

                notes: [
                    "Gateway PV-feedback configuration only.",
                    "Does not establish an AC-PV inverter or generation.",
                ],
            }),


        /*
        |--------------------------------------------------------------------------
        | Device/context telemetry
        |--------------------------------------------------------------------------
        */

        FIRMWARE_VERSION:
            defineSolarAttribute({
                id:
                    80,

                key:
                    "FIRMWARE_VERSION",

                name:
                    "Solar Charger Firmware Version",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .DEVICE_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .DEVICE_METADATA,

                dataKind:
                    SOLAR_DATA_KIND
                        .IDENTIFIER,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DEVICE_METADATA,

                expectedDbusPath:
                    "/FirmwareVersion",
            }),


        RELAY_STATE:
            defineSolarAttribute({
                id:
                    90,

                key:
                    "RELAY_STATE",

                name:
                    "Solar Charger Relay State",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .DEVICE_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .DEVICE_METADATA,

                dataKind:
                    SOLAR_DATA_KIND
                        .STATE,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DEVICE_METADATA,

                expectedDbusPath:
                    "/Relay/0/State",

                notes: [
                    "Relay state is not PV-generation state.",
                ],
            }),


        PRODUCT_ID:
            defineSolarAttribute({
                id:
                    106,

                key:
                    "PRODUCT_ID",

                name:
                    "Solar Charger Product ID",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .DEVICE_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .DEVICE_METADATA,

                dataKind:
                    SOLAR_DATA_KIND
                        .IDENTIFIER,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DEVICE_METADATA,

                expectedDbusPath:
                    "/ProductId",
            }),


        SERIAL_NUMBER:
            defineSolarAttribute({
                id:
                    118,

                key:
                    "SERIAL_NUMBER",

                name:
                    "Solar Charger Serial Number",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .DEVICE_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .DEVICE_METADATA,

                dataKind:
                    SOLAR_DATA_KIND
                        .IDENTIFIER,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DEVICE_METADATA,

                expectedDbusPath:
                    "/Serial",
            }),


        LOAD_STATE:
            defineSolarAttribute({
                id:
                    241,

                key:
                    "LOAD_STATE",

                name:
                    "Solar Charger Load State",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .DEVICE_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .DEVICE_METADATA,

                dataKind:
                    SOLAR_DATA_KIND
                        .STATE,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DEVICE_METADATA,

                expectedDbusPath:
                    "/Load/State",

                notes: [
                    "Charger load-output state is not site served-load state.",
                ],
            }),


        CUSTOM_NAME:
            defineSolarAttribute({
                id:
                    586,

                key:
                    "CUSTOM_NAME",

                name:
                    "Solar Charger Custom Name",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .DEVICE_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .DEVICE_METADATA,

                dataKind:
                    SOLAR_DATA_KIND
                        .IDENTIFIER,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DEVICE_METADATA,

                expectedDbusPath:
                    "/CustomName",
            }),


        BATTERY_VOLTAGE_SETTING:
            defineSolarAttribute({
                id:
                    1105,

                key:
                    "BATTERY_VOLTAGE_SETTING",

                name:
                    "Battery Voltage Setting",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .DEVICE_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .DEVICE_METADATA,

                dataKind:
                    SOLAR_DATA_KIND
                        .CONFIGURATION,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DEVICE_METADATA,

                expectedDbusPath:
                    "/Settings/BatteryVoltageSetting",

                notes: [
                    "Configuration context only.",
                    "Must not be treated as measured battery voltage.",
                ],
            }),


        VREG_LINK_CAPABILITY:
            defineSolarAttribute({
                id:
                    1871,

                key:
                    "VREG_LINK_CAPABILITY",

                name:
                    "Solar Charger VregLink Capability",

                role:
                    SOLAR_ATTRIBUTE_ROLE
                        .DEVICE_CONTEXT,

                semanticStatus:
                    SOLAR_SEMANTIC_STATUS
                        .CONTEXT_ONLY,

                unitStatus:
                    SOLAR_UNIT_STATUS
                        .NOT_APPLICABLE,

                boundary:
                    SOLAR_MEASUREMENT_BOUNDARY
                        .DEVICE_METADATA,

                dataKind:
                    SOLAR_DATA_KIND
                        .CONFIGURATION,

                evidenceBasis:
                    SOLAR_EVIDENCE_BASIS
                        .DEVICE_METADATA,

                expectedDbusPath:
                    "/Devices/0/VregLink",
            }),
    });


/*
|--------------------------------------------------------------------------
| Derived lookup
|--------------------------------------------------------------------------
*/

export const SOLAR_ATTRIBUTES_BY_ID =
    Object.freeze(
        Object.fromEntries(
            Object.values(
                SOLAR_ATTRIBUTE_MAP
            ).map(
                (
                    attribute
                ) => [
                    attribute.id,
                    attribute,
                ]
            )
        )
    );


export const SOLAR_ATTRIBUTE_IDS =
    Object.freeze(
        Object.keys(
            SOLAR_ATTRIBUTES_BY_ID
        ).map(
            (
                value
            ) =>
                Number(
                    value
                )
        )
    );


/*
|--------------------------------------------------------------------------
| Core calculation candidates
|--------------------------------------------------------------------------
*/

export const SOLAR_PRIMARY_POWER_ATTRIBUTE_IDS =
    Object.freeze([
        442,
    ]);


export const SOLAR_SECONDARY_POWER_ATTRIBUTE_IDS =
    Object.freeze([
        113,
    ]);


export const SOLAR_CHARGER_OUTPUT_ATTRIBUTE_IDS =
    Object.freeze([
        81,
        82,
        107,
    ]);


export const SOLAR_YIELD_ATTRIBUTE_IDS =
    Object.freeze([
        94,
        96,
        285,
        340,
    ]);


export const SOLAR_OPERATING_STATE_ATTRIBUTE_IDS =
    Object.freeze([
        84,
        85,
        98,
        518,
        583,
    ]);


export const SOLAR_FLOW_CONTEXT_ATTRIBUTE_IDS =
    Object.freeze([
        102,
        104,
    ]);


export const SOLAR_SETTINGS_CONTEXT_ATTRIBUTE_IDS =
    Object.freeze([
        741,
        742,
    ]);


/*
|--------------------------------------------------------------------------
| Power-source priority
|--------------------------------------------------------------------------
|
| Primary:
|   442 — direct Solar Charger PV power
|
| Secondary:
|   113 — System overview DC-coupled PV power
|
| Forbidden substitute:
|   107 — Solar Charger battery/output watts
|--------------------------------------------------------------------------
*/

export const SOLAR_POWER_PRIORITY =
    Object.freeze({
        PRIMARY:
            Object.freeze([
                442,
            ]),

        SECONDARY:
            Object.freeze([
                113,
            ]),

        NOT_PV_POWER:
            Object.freeze([
                107,
            ]),
    });


/*
|--------------------------------------------------------------------------
| Lookup helpers
|--------------------------------------------------------------------------
*/

export function getSolarAttributeById(
    attributeId
) {
    const numeric =
        Number(
            attributeId
        );


    if (
        !Number.isFinite(
            numeric
        )
    ) {
        return null;
    }


    return (
        SOLAR_ATTRIBUTES_BY_ID[
            numeric
        ] ??
        null
    );
}


export function isKnownSolarAttribute(
    attributeId
) {
    return (
        getSolarAttributeById(
            attributeId
        ) !==
        null
    );
}


export function getSolarAttributesByRole(
    role
) {
    return Object.values(
        SOLAR_ATTRIBUTE_MAP
    ).filter(
        (
            attribute
        ) =>
            attribute.role ===
            role
    );
}


export function isPrimarySolarPowerAttribute(
    attributeId
) {
    const numeric =
        Number(
            attributeId
        );


    return (
        Number.isFinite(
            numeric
        ) &&
        SOLAR_PRIMARY_POWER_ATTRIBUTE_IDS
            .includes(
                numeric
            )
    );
}


export function isSecondarySolarPowerAttribute(
    attributeId
) {
    const numeric =
        Number(
            attributeId
        );


    return (
        Number.isFinite(
            numeric
        ) &&
        SOLAR_SECONDARY_POWER_ATTRIBUTE_IDS
            .includes(
                numeric
            )
    );
}


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

export const SOLAR_ATTRIBUTE_BOUNDARIES =
    Object.freeze({
        missingTelemetryMeansZero:
            false,

        zeroPvPowerMeansFailure:
            false,

        zeroPvPowerMeansUnavailable:
            false,

        noTelemetryMeansNoSolarInstallation:
            false,

        peakPowerEstablishesRatedCapacity:
            false,

        multipleDevicesAutomaticallyAggregated:
            false,

        unitsMayBeInferredFromMagnitude:
            false,

        irradianceInferredFromPvPower:
            false,

        performanceRatioEstablished:
            false,

        capacityFactorEstablished:
            false,

        availabilityEstablishedByOperatingMode:
            false,

        errorCodeZeroEstablishesAvailability:
            false,

        gatewaySettingsEstablishSolarPresence:
            false,

        pvFlowsEstablishTotalGeneration:
            false,

        cumulativeYieldMayBeIntegratedDirectly:
            false,

        yieldDeltaUnitEstablished:
            false,

        chargerOutputPowerIsPvInputPower:
            false,

        primaryAndSecondaryPowerMayBeSummed:
            false,
    });


/*
|--------------------------------------------------------------------------
| Default export
|--------------------------------------------------------------------------
*/

export default Object.freeze({
    SOLAR_ATTRIBUTE_MAP_PHASE,
    SOLAR_ATTRIBUTE_ROLE,
    SOLAR_SEMANTIC_STATUS,
    SOLAR_UNIT_STATUS,
    SOLAR_MEASUREMENT_BOUNDARY,
    SOLAR_DATA_KIND,
    SOLAR_EVIDENCE_BASIS,
    SOLAR_ATTRIBUTE_MAP,
    SOLAR_ATTRIBUTES_BY_ID,
    SOLAR_ATTRIBUTE_IDS,
    SOLAR_PRIMARY_POWER_ATTRIBUTE_IDS,
    SOLAR_SECONDARY_POWER_ATTRIBUTE_IDS,
    SOLAR_CHARGER_OUTPUT_ATTRIBUTE_IDS,
    SOLAR_YIELD_ATTRIBUTE_IDS,
    SOLAR_OPERATING_STATE_ATTRIBUTE_IDS,
    SOLAR_FLOW_CONTEXT_ATTRIBUTE_IDS,
    SOLAR_SETTINGS_CONTEXT_ATTRIBUTE_IDS,
    SOLAR_POWER_PRIORITY,
    SOLAR_ATTRIBUTE_BOUNDARIES,
    getSolarAttributeById,
    isKnownSolarAttribute,
    getSolarAttributesByRole,
    isPrimarySolarPowerAttribute,
    isSecondarySolarPowerAttribute,
});