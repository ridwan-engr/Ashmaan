// backend/services/reliability/adequacyReliabilityService.js

import {
    calculateLolp,
} from "./lolpCalculationService.js";

import {
    calculateLole,
} from "./loleCalculationService.js";

import {
    calculateEens,
} from "./eensCalculationService.js";


/*
|--------------------------------------------------------------------------
| Production adequacy foundation
|--------------------------------------------------------------------------
|
| Current production VRM data contains useful telemetry evidence, but Phase
| 7.12G established that:
|
| - required demand is not yet qualified
| - available supply capacity is not yet qualified
| - probabilistic adequacy scenarios are not yet established
|
| Therefore production adequacy intervals remain empty.
|--------------------------------------------------------------------------
*/

function getProductionAdequacyIntervals() {
    return [];
}


/*
|--------------------------------------------------------------------------
| LOLP
|--------------------------------------------------------------------------
*/

export function getProductionLolp() {
    const intervals =
        getProductionAdequacyIntervals();


    /*
    |--------------------------------------------------------------------------
    | LOLP is an interval-level metric.
    |
    | Without a qualified production adequacy interval we deliberately submit
    | an empty state set. The calculator returns UNAVAILABLE.
    |--------------------------------------------------------------------------
    */

    const result =
        calculateLolp({
            states: [],
        });


    return {
        metric:
            "LOLP",

        label:
            "Loss of Load Probability",

        source:
            "PRODUCTION_ADEQUACY_MODEL",

        productionAdequacyEstablished:
            false,

        qualifiedAdequacyIntervalCount:
            intervals.length,

        requiredLoadEstablished:
            false,

        availableSupplyEstablished:
            false,

        probabilisticScenarioModelEstablished:
            false,

        ...result,

        semanticBoundary: {
            ...(
                result
                    .semanticBoundary ??
                {}
            ),

            historicalEnsUsed:
                false,

            gridOutageEventsUsed:
                false,

            activeSourceIdentityUsedAsCapacity:
                false,

            servedLoadUsedAsRequiredDemand:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| LOLE
|--------------------------------------------------------------------------
*/

export function getProductionLole() {
    const intervals =
        getProductionAdequacyIntervals();


    const result =
        calculateLole({
            intervals,
        });


    return {
        metric:
            "LOLE",

        label:
            "Loss of Load Expectation",

        source:
            "PRODUCTION_ADEQUACY_MODEL",

        productionAdequacyEstablished:
            false,

        qualifiedAdequacyIntervalCount:
            intervals.length,

        requiredLoadEstablished:
            false,

        availableSupplyEstablished:
            false,

        probabilisticScenarioModelEstablished:
            false,

        ...result,

        semanticBoundary: {
            ...(
                result
                    .semanticBoundary ??
                {}
            ),

            historicalEnsUsed:
                false,

            gridOutageEventsUsed:
                false,

            activeSourceIdentityUsedAsCapacity:
                false,

            servedLoadUsedAsRequiredDemand:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| EENS
|--------------------------------------------------------------------------
*/

export function getProductionEens() {
    const intervals =
        getProductionAdequacyIntervals();


    const result =
        calculateEens({
            intervals,
        });


    return {
        metric:
            "EENS",

        label:
            "Expected Energy Not Supplied",

        source:
            "PRODUCTION_ADEQUACY_MODEL",

        productionAdequacyEstablished:
            false,

        qualifiedAdequacyIntervalCount:
            intervals.length,

        requiredLoadEstablished:
            false,

        availableSupplyEstablished:
            false,

        probabilisticScenarioModelEstablished:
            false,

        ...result,

        semanticBoundary: {
            ...(
                result
                    .semanticBoundary ??
                {}
            ),

            historicalEnsUsed:
                false,

            gridOutageEventsUsed:
                false,

            activeSourceIdentityUsedAsCapacity:
                false,

            servedLoadUsedAsRequiredDemand:
                false,
        },
    };
}