// services/engineering/generatorFuelService.js

import {
    GENERATOR_FUEL_SOURCE,
    GENERATOR_FUEL_MODEL_STATUS,
    GENERATOR_FUEL_BOUNDARIES,
    canCalculateGeneratorFuelConsumption,
    classifyGeneratorFuelSource,
} from "./generatorFuelSemantics.js";


/*
|--------------------------------------------------------------------------
| Phase 8.5G-B
| Pure Generator Fuel Analytics Service
|--------------------------------------------------------------------------
|
| Supported evidence paths:
|
| 1. DIRECT_TELEMETRY
|    Explicit measured fuel-consumption evidence supplied by a future
|    production adapter.
|
| 2. QUALIFIED_FUEL_MODEL
|    Explicit modeled fuel consumption supplied only when the model has
|    already been independently qualified.
|
| 3. UNAVAILABLE
|    Current production default.
|
| Important:
|
| - runtime is NOT converted to fuel automatically
| - generator power is NOT converted to fuel automatically
| - generator energy is NOT converted to fuel automatically
| - engine load is NOT converted to fuel automatically
| - starts are NOT converted to fuel automatically
| - missing fuel evidence is NOT zero
|--------------------------------------------------------------------------
*/


export const GENERATOR_FUEL_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GENERATOR_FUEL_REASON =
    Object.freeze({

        DIRECT_FUEL_TELEMETRY_QUALIFIED:
            "DIRECT_FUEL_TELEMETRY_QUALIFIED",

        QUALIFIED_FUEL_MODEL_USED:
            "QUALIFIED_FUEL_MODEL_USED",

        NO_FUEL_EVIDENCE:
            "NO_FUEL_EVIDENCE",

        DIRECT_FUEL_VALUE_INVALID:
            "DIRECT_FUEL_VALUE_INVALID",

        MODELED_FUEL_VALUE_INVALID:
            "MODELED_FUEL_VALUE_INVALID",

        FUEL_MODEL_NOT_QUALIFIED:
            "FUEL_MODEL_NOT_QUALIFIED",

        GENERATOR_ENERGY_UNAVAILABLE:
            "GENERATOR_ENERGY_UNAVAILABLE",

        NONPOSITIVE_GENERATOR_ENERGY:
            "NONPOSITIVE_GENERATOR_ENERGY",

        ZERO_OR_NEGATIVE_FUEL_CONSUMPTION:
            "ZERO_OR_NEGATIVE_FUEL_CONSUMPTION",
    });


function finite(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;
    }


    const numeric =
        Number(
            value
        );


    return Number.isFinite(
        numeric
    )
        ? numeric
        : null;
}


function unavailableMetric(
    reason,
    unit = null,
    metadata = {}
) {

    return {

        status:
            GENERATOR_FUEL_STATUS
                .UNAVAILABLE,

        value:
            null,

        unit,

        reason,

        metadata,
    };
}


function calculatedMetric(
    value,
    unit,
    reason,
    metadata = {}
) {

    return {

        status:
            GENERATOR_FUEL_STATUS
                .CALCULATED,

        value,

        unit,

        reason,

        metadata,
    };
}


/*
|--------------------------------------------------------------------------
| Specific Fuel Consumption
|--------------------------------------------------------------------------
|
| SFC = litres consumed / generator electrical energy
|
| Units:
| L/kWh
|
| It requires:
| - qualified fuel consumption
| - qualified positive generator electrical energy
|--------------------------------------------------------------------------
*/

function calculateSpecificFuelConsumption({
    fuelConsumedLiters,
    generatorEnergyKWh,
    reason,
}) {

    const fuel =
        finite(
            fuelConsumedLiters
        );


    const energy =
        finite(
            generatorEnergyKWh
        );


    if (
        fuel === null
    ) {

        return unavailableMetric(
            GENERATOR_FUEL_REASON
                .NO_FUEL_EVIDENCE,
            "L/kWh"
        );
    }


    if (
        energy === null
    ) {

        return unavailableMetric(
            GENERATOR_FUEL_REASON
                .GENERATOR_ENERGY_UNAVAILABLE,
            "L/kWh"
        );
    }


    if (
        energy <= 0
    ) {

        return unavailableMetric(
            GENERATOR_FUEL_REASON
                .NONPOSITIVE_GENERATOR_ENERGY,
            "L/kWh",
            {
                generatorEnergyKWh:
                    energy,
            }
        );
    }


    if (
        fuel <= 0
    ) {

        return unavailableMetric(
            GENERATOR_FUEL_REASON
                .ZERO_OR_NEGATIVE_FUEL_CONSUMPTION,
            "L/kWh",
            {
                fuelConsumedLiters:
                    fuel,
            }
        );
    }


    return calculatedMetric(
        fuel /
            energy,
        "L/kWh",
        reason,
        {
            fuelConsumedLiters:
                fuel,

            generatorEnergyKWh:
                energy,
        }
    );
}


/*
|--------------------------------------------------------------------------
| Fuel Efficiency
|--------------------------------------------------------------------------
|
| Electrical fuel efficiency:
|
| kWh/L = generator electrical energy / fuel consumed
|
| This is NOT thermodynamic efficiency.
|--------------------------------------------------------------------------
*/

function calculateElectricalFuelEfficiency({
    fuelConsumedLiters,
    generatorEnergyKWh,
    reason,
}) {

    const fuel =
        finite(
            fuelConsumedLiters
        );


    const energy =
        finite(
            generatorEnergyKWh
        );


    if (
        fuel === null
    ) {

        return unavailableMetric(
            GENERATOR_FUEL_REASON
                .NO_FUEL_EVIDENCE,
            "kWh/L"
        );
    }


    if (
        energy === null
    ) {

        return unavailableMetric(
            GENERATOR_FUEL_REASON
                .GENERATOR_ENERGY_UNAVAILABLE,
            "kWh/L"
        );
    }


    if (
        fuel <= 0
    ) {

        return unavailableMetric(
            GENERATOR_FUEL_REASON
                .ZERO_OR_NEGATIVE_FUEL_CONSUMPTION,
            "kWh/L",
            {
                fuelConsumedLiters:
                    fuel,
            }
        );
    }


    if (
        energy < 0
    ) {

        return unavailableMetric(
            GENERATOR_FUEL_REASON
                .NONPOSITIVE_GENERATOR_ENERGY,
            "kWh/L",
            {
                generatorEnergyKWh:
                    energy,
            }
        );
    }


    return calculatedMetric(
        energy /
            fuel,
        "kWh/L",
        reason,
        {
            fuelConsumedLiters:
                fuel,

            generatorEnergyKWh:
                energy,
        }
    );
}


/*
|--------------------------------------------------------------------------
| Main public service
|--------------------------------------------------------------------------
*/

export function calculateGeneratorFuelAnalytics({
    directFuelTelemetryQualified = false,
    directFuelConsumedLiters = null,

    fuelModelStatus =
        GENERATOR_FUEL_MODEL_STATUS
            .NOT_CONFIGURED,

    modeledFuelConsumedLiters = null,

    generatorEnergyKWh = null,

    reportingHours = null,
} = {}) {

    const source =
        classifyGeneratorFuelSource({

            directFuelTelemetryQualified,

            fuelModelStatus,
        });


    const fuelAnalyticsEnabled =
        canCalculateGeneratorFuelConsumption({

            directFuelTelemetryQualified,

            fuelModelStatus,
        });


    /*
    |--------------------------------------------------------------------------
    | Current production default: unavailable
    |--------------------------------------------------------------------------
    */

    if (
        !fuelAnalyticsEnabled ||
        source ===
        GENERATOR_FUEL_SOURCE
            .UNAVAILABLE
    ) {

        return {

            family:
                "GENERATOR_FUEL",

            status:
                GENERATOR_FUEL_STATUS
                    .UNAVAILABLE,

            source:
                GENERATOR_FUEL_SOURCE
                    .UNAVAILABLE,

            measured:
                false,

            modeled:
                false,

            metrics: {

                fuelConsumed:
                    unavailableMetric(
                        GENERATOR_FUEL_REASON
                            .NO_FUEL_EVIDENCE,
                        "L"
                    ),

                averageFuelRate:
                    unavailableMetric(
                        GENERATOR_FUEL_REASON
                            .NO_FUEL_EVIDENCE,
                        "L/h"
                    ),

                specificFuelConsumption:
                    unavailableMetric(
                        GENERATOR_FUEL_REASON
                            .NO_FUEL_EVIDENCE,
                        "L/kWh"
                    ),

                electricalFuelEfficiency:
                    unavailableMetric(
                        GENERATOR_FUEL_REASON
                            .NO_FUEL_EVIDENCE,
                        "kWh/L"
                    ),
            },

            boundaries: {

                runtimeConvertedToFuel:
                    false,

                generatorPowerConvertedToFuel:
                    false,

                generatorEnergyConvertedToFuel:
                    false,

                engineLoadConvertedToFuel:
                    false,

                startCountConvertedToFuel:
                    false,

                missingFuelMeansZero:
                    false,

                estimatedPresentedAsMeasured:
                    false,
            },
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Direct telemetry path
    |--------------------------------------------------------------------------
    */

    let fuelConsumedLiters =
        null;

    let reason =
        null;

    let measured =
        false;

    let modeled =
        false;


    if (
        source ===
        GENERATOR_FUEL_SOURCE
            .DIRECT_TELEMETRY
    ) {

        const directValue =
            finite(
                directFuelConsumedLiters
            );


        if (
            directValue === null ||
            directValue < 0
        ) {

            return {

                family:
                    "GENERATOR_FUEL",

                status:
                    GENERATOR_FUEL_STATUS
                        .UNAVAILABLE,

                source:
                    GENERATOR_FUEL_SOURCE
                        .DIRECT_TELEMETRY,

                measured:
                    true,

                modeled:
                    false,

                metrics: {

                    fuelConsumed:
                        unavailableMetric(
                            GENERATOR_FUEL_REASON
                                .DIRECT_FUEL_VALUE_INVALID,
                            "L"
                        ),
                },
            };
        }


        fuelConsumedLiters =
            directValue;

        reason =
            GENERATOR_FUEL_REASON
                .DIRECT_FUEL_TELEMETRY_QUALIFIED;

        measured =
            true;
    }


    /*
    |--------------------------------------------------------------------------
    | Qualified model path
    |--------------------------------------------------------------------------
    */

    else if (
        source ===
        GENERATOR_FUEL_SOURCE
            .QUALIFIED_FUEL_MODEL
    ) {

        if (
            fuelModelStatus !==
            GENERATOR_FUEL_MODEL_STATUS
                .QUALIFIED
        ) {

            return {

                family:
                    "GENERATOR_FUEL",

                status:
                    GENERATOR_FUEL_STATUS
                        .UNAVAILABLE,

                source:
                    GENERATOR_FUEL_SOURCE
                        .UNAVAILABLE,

                measured:
                    false,

                modeled:
                    false,

                metrics: {

                    fuelConsumed:
                        unavailableMetric(
                            GENERATOR_FUEL_REASON
                                .FUEL_MODEL_NOT_QUALIFIED,
                            "L"
                        ),
                },
            };
        }


        const modeledValue =
            finite(
                modeledFuelConsumedLiters
            );


        if (
            modeledValue === null ||
            modeledValue < 0
        ) {

            return {

                family:
                    "GENERATOR_FUEL",

                status:
                    GENERATOR_FUEL_STATUS
                        .UNAVAILABLE,

                source:
                    GENERATOR_FUEL_SOURCE
                        .QUALIFIED_FUEL_MODEL,

                measured:
                    false,

                modeled:
                    true,

                metrics: {

                    fuelConsumed:
                        unavailableMetric(
                            GENERATOR_FUEL_REASON
                                .MODELED_FUEL_VALUE_INVALID,
                            "L"
                        ),
                },
            };
        }


        fuelConsumedLiters =
            modeledValue;

        reason =
            GENERATOR_FUEL_REASON
                .QUALIFIED_FUEL_MODEL_USED;

        modeled =
            true;
    }


    /*
    |--------------------------------------------------------------------------
    | Fuel consumed
    |--------------------------------------------------------------------------
    */

    const fuelConsumed =
        calculatedMetric(
            fuelConsumedLiters,
            "L",
            reason,
            {
                evidenceType:
                    measured
                        ? "MEASURED"
                        : "MODELED",
            }
        );


    /*
    |--------------------------------------------------------------------------
    | Average fuel rate
    |--------------------------------------------------------------------------
    |
    | This is only derived if a valid reporting duration is explicitly supplied.
    |--------------------------------------------------------------------------
    */

    const hours =
        finite(
            reportingHours
        );


    let averageFuelRate;


    if (
        hours !== null &&
        hours >
        0
    ) {

        averageFuelRate =
            calculatedMetric(
                fuelConsumedLiters /
                    hours,
                "L/h",
                reason,
                {
                    reportingHours:
                        hours,
                }
            );
    }

    else {

        averageFuelRate =
            unavailableMetric(
                "REPORTING_DURATION_UNAVAILABLE",
                "L/h"
            );
    }


    /*
    |--------------------------------------------------------------------------
    | Specific fuel consumption and electrical fuel efficiency
    |--------------------------------------------------------------------------
    */

    const specificFuelConsumption =
        calculateSpecificFuelConsumption({

            fuelConsumedLiters,

            generatorEnergyKWh,

            reason,
        });


    const electricalFuelEfficiency =
        calculateElectricalFuelEfficiency({

            fuelConsumedLiters,

            generatorEnergyKWh,

            reason,
        });


    return {

        family:
            "GENERATOR_FUEL",

        status:
            GENERATOR_FUEL_STATUS
                .CALCULATED,

        source,

        measured,

        modeled,

        metrics: {

            fuelConsumed,

            averageFuelRate,

            specificFuelConsumption,

            electricalFuelEfficiency,
        },

        evidence: {

            directFuelTelemetryQualified:

                directFuelTelemetryQualified ===
                true,

            fuelModelStatus,

            generatorEnergyProvided:

                finite(
                    generatorEnergyKWh
                ) !==
                null,

            reportingDurationProvided:

                hours !==
                null &&
                hours >
                0,
        },

        boundaries: {

            runtimeConvertedToFuel:
                false,

            generatorPowerConvertedToFuel:
                false,

            generatorEnergyConvertedToFuel:
                false,

            engineLoadConvertedToFuel:
                false,

            startCountConvertedToFuel:
                false,

            missingFuelMeansZero:
                false,

            estimatedPresentedAsMeasured:
                false,

            modeledFuelExplicitlyIdentified:
                modeled,

            measuredFuelExplicitlyIdentified:
                measured,

            thermodynamicEfficiencyCalculated:
                false,

            electricalFuelEfficiencyOnly:
                true,
        },
    };
}


export default {

    GENERATOR_FUEL_STATUS,

    GENERATOR_FUEL_REASON,

    calculateGeneratorFuelAnalytics,
};