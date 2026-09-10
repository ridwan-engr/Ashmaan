// services/engineering/generatorFuelSemantics.js

/*
|--------------------------------------------------------------------------
| Phase 8.5G-A
| Generator Fuel-Consumption Semantic Qualification
|--------------------------------------------------------------------------
|
| Current production evidence:
|
| - direct generator electrical power exists
| - generator runtime evidence exists on qualified series
| - engine-load attr 419 exists on some sites
| - NO direct production fuel-consumption telemetry has been established
| - NO manufacturer/configured generator fuel curve has been established
|
| Therefore:
|
| fuel consumption must remain unavailable unless a future adapter supplies
| either:
|
| 1. qualified direct fuel telemetry, or
| 2. a qualified explicit fuel-consumption model
|--------------------------------------------------------------------------
*/


export const GENERATOR_FUEL_SOURCE =
    Object.freeze({

        DIRECT_TELEMETRY:
            "DIRECT_TELEMETRY",

        QUALIFIED_FUEL_MODEL:
            "QUALIFIED_FUEL_MODEL",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GENERATOR_FUEL_METRIC =
    Object.freeze({

        FUEL_CONSUMED:
            "FUEL_CONSUMED",

        FUEL_RATE:
            "FUEL_RATE",

        SPECIFIC_FUEL_CONSUMPTION:
            "SPECIFIC_FUEL_CONSUMPTION",

        FUEL_EFFICIENCY:
            "FUEL_EFFICIENCY",
    });


export const GENERATOR_FUEL_UNIT =
    Object.freeze({

        LITER:
            "L",

        LITER_PER_HOUR:
            "L/h",

        LITER_PER_KWH:
            "L/kWh",

        KWH_PER_LITER:
            "kWh/L",

        UNRESOLVED:
            "UNRESOLVED",
    });


export const GENERATOR_FUEL_MODEL_STATUS =
    Object.freeze({

        QUALIFIED:
            "QUALIFIED",

        UNQUALIFIED:
            "UNQUALIFIED",

        NOT_CONFIGURED:
            "NOT_CONFIGURED",
    });


export const GENERATOR_FUEL_SEMANTICS =
    Object.freeze({

        directFuelTelemetryEstablished:
            false,

        directFuelRateEstablished:
            false,

        directFuelConsumedCounterEstablished:
            false,

        directFuelLevelEstablished:
            false,

        configuredFuelCurveEstablished:
            false,

        manufacturerFuelCurveEstablished:
            false,

        fuelModelQualified:
            false,

        fuelConsumptionCalculationEnabledByDefault:
            false,

        runtimeCanDirectlyProduceFuelConsumption:
            false,

        engineLoadCanDirectlyProduceFuelConsumption:
            false,

        electricalPowerCanDirectlyProduceFuelConsumption:
            false,

        startsCanDirectlyProduceFuelConsumption:
            false,

        generatorEnergyCanDirectlyProduceFuelConsumption:
            false,
    });


export const GENERATOR_FUEL_BOUNDARIES =
    Object.freeze({

        FUEL_TELEMETRY_ESTABLISHED:
            false,

        FUEL_MODEL_ESTABLISHED:
            false,

        RUNTIME_TIMES_CONSTANT_LPH_ALLOWED:
            false,

        ENGINE_LOAD_ASSUMED_PERCENT:
            false,

        ENGINE_LOAD_TO_FUEL_CURVE_ASSUMED:
            false,

        POWER_TO_FUEL_CURVE_ASSUMED:
            false,

        ENERGY_TO_FUEL_RATIO_ASSUMED:
            false,

        START_COUNT_TO_FUEL_ASSUMED:
            false,

        FUEL_CONSUMPTION_FROM_RUNTIME_ONLY:
            false,

        FUEL_CONSUMPTION_FROM_POWER_ONLY:
            false,

        FUEL_CONSUMPTION_FROM_ENGINE_LOAD_ONLY:
            false,

        SPECIFIC_FUEL_CONSUMPTION_CALCULABLE:
            false,

        FUEL_EFFICIENCY_CALCULABLE:
            false,

        MISSING_FUEL_DATA_MEANS_ZERO:
            false,

        ZERO_GENERATOR_POWER_MEANS_ZERO_FUEL_RATE:
            false,

        STOPPED_STATE_AUTOMATICALLY_MEANS_ZERO_FUEL_RATE:
            false,

        ESTIMATED_FUEL_MAY_BE_PRESENTED_AS_MEASURED:
            false,
    });


export function canCalculateGeneratorFuelConsumption({
    directFuelTelemetryQualified = false,
    fuelModelStatus =
        GENERATOR_FUEL_MODEL_STATUS
            .NOT_CONFIGURED,
} = {}) {

    if (
        directFuelTelemetryQualified ===
        true
    ) {

        return true;
    }


    return (
        fuelModelStatus ===
        GENERATOR_FUEL_MODEL_STATUS
            .QUALIFIED
    );
}


export function classifyGeneratorFuelSource({
    directFuelTelemetryQualified = false,
    fuelModelStatus =
        GENERATOR_FUEL_MODEL_STATUS
            .NOT_CONFIGURED,
} = {}) {

    if (
        directFuelTelemetryQualified ===
        true
    ) {

        return GENERATOR_FUEL_SOURCE
            .DIRECT_TELEMETRY;
    }


    if (
        fuelModelStatus ===
        GENERATOR_FUEL_MODEL_STATUS
            .QUALIFIED
    ) {

        return GENERATOR_FUEL_SOURCE
            .QUALIFIED_FUEL_MODEL;
    }


    return GENERATOR_FUEL_SOURCE
        .UNAVAILABLE;
}


export default {

    GENERATOR_FUEL_SOURCE,

    GENERATOR_FUEL_METRIC,

    GENERATOR_FUEL_UNIT,

    GENERATOR_FUEL_MODEL_STATUS,

    GENERATOR_FUEL_SEMANTICS,

    GENERATOR_FUEL_BOUNDARIES,

    canCalculateGeneratorFuelConsumption,

    classifyGeneratorFuelSource,
};