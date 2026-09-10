// services/engineering/generatorLoadingSemantics.js

/*
|--------------------------------------------------------------------------
| Phase 8.5E-B
| Generator Loading Semantic Qualification
|--------------------------------------------------------------------------
|
| Production evidence:
|
| attr 419 — Engine load
|
| - observed on 11/74 sites
| - 793 production observations
| - observed numeric range 0 .. 65.5
| - strongly correlated with generator electrical power
| - >0 whenever qualified generator status indicated RUNNING
| - =0 whenever qualified generator status indicated STOPPED in observed
|   stopped samples
|
| IMPORTANT:
|
| This establishes attr 419 as a valid direct engine-load measurement.
|
| It does NOT establish:
|
| - percent units
| - rated generator capacity
| - electrical loading percentage
| - nameplate utilization
|--------------------------------------------------------------------------
*/


export const GENERATOR_LOADING_SIGNAL =
    Object.freeze({

        ENGINE_LOAD:
            "ENGINE_LOAD",

        ELECTRICAL_POWER:
            "ELECTRICAL_POWER",

        RATED_CAPACITY:
            "RATED_CAPACITY",
    });


export const GENERATOR_LOADING_BASIS =
    Object.freeze({

        DIRECT_ENGINE_MEASUREMENT:
            "DIRECT_ENGINE_MEASUREMENT",

        DIRECT_ELECTRICAL_MEASUREMENT:
            "DIRECT_ELECTRICAL_MEASUREMENT",

        CONFIGURED_NAMEPLATE:
            "CONFIGURED_NAMEPLATE",

        NOT_ESTABLISHED:
            "NOT_ESTABLISHED",
    });


export const GENERATOR_LOADING_UNIT_STATUS =
    Object.freeze({

        ESTABLISHED:
            "ESTABLISHED",

        UNRESOLVED:
            "UNRESOLVED",
    });


export const GENERATOR_ENGINE_LOAD_419 =
    Object.freeze({

        attributeId:
            419,

        code:
            "Gel",

        name:
            "Engine load",

        signal:
            GENERATOR_LOADING_SIGNAL
                .ENGINE_LOAD,

        basis:
            GENERATOR_LOADING_BASIS
                .DIRECT_ENGINE_MEASUREMENT,

        unitStatus:
            GENERATOR_LOADING_UNIT_STATUS
                .UNRESOLVED,

        engineeringUnit:
            null,

        percentQualified:
            false,

        directMeasurementQualified:
            true,

        runningCorrelationEstablished:
            true,

        stoppedZeroCorrelationEstablished:
            true,

        productionEvidence:
            Object.freeze({

                sitesObserved:
                    11,

                eligibleSites:
                    74,

                observations:
                    793,

                minimumObserved:
                    0,

                maximumObserved:
                    65.5,

                medianObserved:
                    36.1,
            }),

        notes:
            "Direct engine-load measurement is qualified. Unit remains unresolved; do not label values as percent.",
    });


export const GENERATOR_ELECTRICAL_LOADING_SEMANTICS =
    Object.freeze({

        measuredActivePowerEstablished:
            true,

        ratedActivePowerEstablished:
            false,

        ratedApparentPowerEstablished:
            false,

        electricalLoadingPercentCalculable:
            false,

        kvaLoadingPercentCalculable:
            false,

        nameplateUtilizationCalculable:
            false,

        reason:
            "GENERATOR_RATED_CAPACITY_NOT_ESTABLISHED",
    });


export const GENERATOR_LOADING_BOUNDARIES =
    Object.freeze({

        ATTRIBUTE_419_IS_DIRECT_ENGINE_LOAD:
            true,

        ATTRIBUTE_419_PERCENT_UNIT_ESTABLISHED:
            false,

        ATTRIBUTE_419_CAN_BE_DISPLAYED_WITH_PERCENT_SIGN:
            false,

        ENGINE_LOAD_EQUALS_ELECTRICAL_LOADING:
            false,

        ENGINE_LOAD_EQUALS_GENERATOR_UTILIZATION:
            false,

        GENERATOR_RATED_KW_ESTABLISHED:
            false,

        GENERATOR_RATED_KVA_ESTABLISHED:
            false,

        ELECTRICAL_LOADING_PERCENT_CALCULABLE:
            false,

        ZERO_ENGINE_LOAD_MEANS_GENERATOR_FAILURE:
            false,

        ZERO_ENGINE_LOAD_MEANS_GENERATOR_UNAVAILABLE:
            false,

        HIGH_ENGINE_LOAD_MEANS_OVERLOAD:
            false,

        ENGINE_LOAD_THRESHOLD_FOR_OVERLOAD_ESTABLISHED:
            false,
    });


export function isQualifiedGeneratorEngineLoadAttribute(
    attributeId
) {

    return (
        Number(
            attributeId
        ) ===
            GENERATOR_ENGINE_LOAD_419
                .attributeId &&
        GENERATOR_ENGINE_LOAD_419
            .directMeasurementQualified ===
            true
    );
}


export function getGeneratorLoadingSemantic(
    attributeId
) {

    if (
        Number(
            attributeId
        ) ===
        419
    ) {

        return GENERATOR_ENGINE_LOAD_419;
    }


    return null;
}


export default {

    GENERATOR_LOADING_SIGNAL,

    GENERATOR_LOADING_BASIS,

    GENERATOR_LOADING_UNIT_STATUS,

    GENERATOR_ENGINE_LOAD_419,

    GENERATOR_ELECTRICAL_LOADING_SEMANTICS,

    GENERATOR_LOADING_BOUNDARIES,

    isQualifiedGeneratorEngineLoadAttribute,

    getGeneratorLoadingSemantic,
};