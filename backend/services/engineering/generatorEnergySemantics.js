// services/engineering/generatorEnergySemantics.js

/*
|--------------------------------------------------------------------------
| Phase 8.5F-A
| Generator Electrical-Energy Semantic Qualification
|--------------------------------------------------------------------------
|
| Generator active-power evidence established previously:
|
| Preferred direct total:
|   attr 1742
|
| Phase-family fallback:
|   attrs 428 / 434 / 438
|
| Secondary phase-family fallback:
|   attrs 137 / 138 / 139
|
| Rules:
|
| - total power and phase sums are alternatives, never additive sources
| - phase families are alternatives, never combined with each other
| - missing phase values are not zero
| - generator power is not generator runtime
| - generator power is not fuel consumption
| - generator energy is not automatically served-load contribution %
|--------------------------------------------------------------------------
*/


export const GENERATOR_POWER_SOURCE =
    Object.freeze({

        TOTAL_1742:
            "TOTAL_1742",

        PHASE_FAMILY_428_434_438:
            "PHASE_FAMILY_428_434_438",

        PHASE_FAMILY_137_138_139:
            "PHASE_FAMILY_137_138_139",

        NONE:
            "NONE",
    });


export const GENERATOR_POWER_SOURCE_PRIORITY =
    Object.freeze([

        Object.freeze({

            source:
                GENERATOR_POWER_SOURCE
                    .TOTAL_1742,

            mode:
                "DIRECT_TOTAL",

            attributes:
                Object.freeze([
                    1742,
                ]),
        }),

        Object.freeze({

            source:
                GENERATOR_POWER_SOURCE
                    .PHASE_FAMILY_428_434_438,

            mode:
                "THREE_PHASE_SUM",

            attributes:
                Object.freeze([
                    428,
                    434,
                    438,
                ]),
        }),

        Object.freeze({

            source:
                GENERATOR_POWER_SOURCE
                    .PHASE_FAMILY_137_138_139,

            mode:
                "THREE_PHASE_SUM",

            attributes:
                Object.freeze([
                    137,
                    138,
                    139,
                ]),
        }),
    ]);


export const GENERATOR_ENERGY_SEMANTICS =
    Object.freeze({

        activePowerEvidenceEstablished:
            true,

        electricalEnergyIntegrationEnabled:
            true,

        integrationMethod:
            "TIME_WEIGHTED_TRAPEZOIDAL",

        reportingWindowSemantics:
            "[start,end)",

        maximumGapRequired:
            true,

        defaultMaximumGapMinutes:
            30,

        combineTotalAndPhasePower:
            false,

        combinePhaseFamilies:
            false,

        missingPhaseMeansZero:
            false,

        multipleDevicesAutomaticallyCombined:
            false,

        negativePowerAutomaticallyClamped:
            false,

        generatorEnergyEqualsRuntime:
            false,

        generatorEnergyEqualsFuel:
            false,

        generatorEnergyEqualsServedLoadEnergy:
            false,

        contributionPercentAutomaticallyAvailable:
            false,
    });


export const GENERATOR_ENERGY_BOUNDARIES =
    Object.freeze({

        ATTR_1742_IS_PREFERRED_TOTAL_POWER:
            true,

        ATTR_428_434_438_IS_FALLBACK_PHASE_FAMILY:
            true,

        ATTR_137_138_139_IS_SECONDARY_PHASE_FAMILY:
            true,

        TOTAL_AND_PHASE_VALUES_ARE_SUMMED_TOGETHER:
            false,

        PHASE_FAMILIES_ARE_SUMMED_TOGETHER:
            false,

        INCOMPLETE_PHASE_SET_IS_VALID_TOTAL_POWER:
            false,

        MISSING_POWER_MEANS_ZERO:
            false,

        ZERO_POWER_MEANS_GENERATOR_UNAVAILABLE:
            false,

        POWER_POSITIVE_MEANS_GENERATOR_AVAILABLE:
            false,

        POWER_POSITIVE_ALONE_DEFINES_RUNNING:
            false,

        ENERGY_IS_DERIVED_FROM_POWER_INTEGRATION:
            true,

        ENERGY_EQUALS_FUEL_CONSUMPTION:
            false,

        CONTRIBUTION_PERCENT_REQUIRES_DENOMINATOR:
            true,

        SERVED_LOAD_DENOMINATOR_CAN_BE_ASSUMED:
            false,
    });


export function getGeneratorPowerSourceDefinition(
    source
) {

    return (
        GENERATOR_POWER_SOURCE_PRIORITY
            .find(
                (
                    definition
                ) =>
                    definition.source ===
                    source
            ) ??
        null
    );
}


export function isGeneratorPowerAttribute(
    attributeId
) {

    const id =
        Number(
            attributeId
        );


    return GENERATOR_POWER_SOURCE_PRIORITY
        .some(
            (
                source
            ) =>
                source.attributes
                    .includes(
                        id
                    )
        );
}


export function getGeneratorPowerCandidatePriority(
    attributeId
) {

    const id =
        Number(
            attributeId
        );


    const index =
        GENERATOR_POWER_SOURCE_PRIORITY
            .findIndex(
                (
                    source
                ) =>
                    source.attributes
                        .includes(
                            id
                        )
            );


    return index >= 0
        ? index
        : null;
}


export default {

    GENERATOR_POWER_SOURCE,

    GENERATOR_POWER_SOURCE_PRIORITY,

    GENERATOR_ENERGY_SEMANTICS,

    GENERATOR_ENERGY_BOUNDARIES,

    getGeneratorPowerSourceDefinition,

    isGeneratorPowerAttribute,

    getGeneratorPowerCandidatePriority,
};