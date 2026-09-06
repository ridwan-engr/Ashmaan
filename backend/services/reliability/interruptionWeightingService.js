// backend/services/reliability/interruptionWeightingService.js

import {
    RELIABILITY_POPULATION_BASIS,
} from "./reliabilityPopulationService.js";


export const INTERRUPTION_WEIGHT_STATUS = {
    VALID:
        "VALID",

    UNAVAILABLE:
        "UNAVAILABLE",

    NOT_ELIGIBLE:
        "NOT_ELIGIBLE",
};


export const INTERRUPTION_WEIGHT_REASON = {
    VALID:
        "VALID",

    INTERRUPTION_NOT_ELIGIBLE:
        "INTERRUPTION_NOT_ELIGIBLE",

    POPULATION_UNAVAILABLE:
        "POPULATION_UNAVAILABLE",

    UNSUPPORTED_POPULATION_BASIS:
        "UNSUPPORTED_POPULATION_BASIS",

    AFFECTED_CUSTOMERS_UNAVAILABLE:
        "AFFECTED_CUSTOMERS_UNAVAILABLE",

    INVALID_AFFECTED_CUSTOMERS:
        "INVALID_AFFECTED_CUSTOMERS",

    INSTALLATION_UNAVAILABLE:
        "INSTALLATION_UNAVAILABLE",
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function finiteNonNegativeInteger(
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
        Number(value);


    if (
        !Number.isFinite(
            numeric
        ) ||
        numeric < 0 ||
        !Number.isInteger(
            numeric
        )
    ) {
        return null;
    }


    return numeric;
}


function unavailable({
    reason,
    populationBasis =
        null,
    installationId =
        null,
} = {}) {
    return {
        valid:
            false,

        status:
            INTERRUPTION_WEIGHT_STATUS
                .UNAVAILABLE,

        reason,

        populationBasis,

        weight:
            null,

        weightUnit:
            null,

        installationId,
    };
}


/*
|--------------------------------------------------------------------------
| Resolve interruption weight
|--------------------------------------------------------------------------
|
| CUSTOMER
|   weight = affected customers
|
| SERVICE_POINT
|   weight = 1 affected service point
|
| INSTALLATION_PROXY
|   weight = 1 affected installation
|--------------------------------------------------------------------------
*/

export function resolveInterruptionWeight({
    interruption,
    population,
} = {}) {
    /*
    |--------------------------------------------------------------------------
    | 7.9B eligibility must already have succeeded
    |--------------------------------------------------------------------------
    */

    if (
        interruption?.eligible !==
        true
    ) {
        return {
            valid:
                false,

            status:
                INTERRUPTION_WEIGHT_STATUS
                    .NOT_ELIGIBLE,

            reason:
                INTERRUPTION_WEIGHT_REASON
                    .INTERRUPTION_NOT_ELIGIBLE,

            populationBasis:
                population?.basis ??
                null,

            weight:
                null,

            weightUnit:
                null,

            installationId:
                interruption?.installationId ??
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Population denominator must be usable
    |--------------------------------------------------------------------------
    */

    if (
        !population ||
        population
            .denominatorAvailable !==
            true ||
        !population
            .basis
    ) {
        return unavailable({
            reason:
                INTERRUPTION_WEIGHT_REASON
                    .POPULATION_UNAVAILABLE,

            populationBasis:
                population?.basis ??
                null,

            installationId:
                interruption
                    .installationId ??
                null,
        });
    }


    const installationId =
        interruption
            .installationId ??
        null;


    if (!installationId) {
        return unavailable({
            reason:
                INTERRUPTION_WEIGHT_REASON
                    .INSTALLATION_UNAVAILABLE,

            populationBasis:
                population
                    .basis,

            installationId:
                null,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Customer basis
    |--------------------------------------------------------------------------
    */

    if (
        population
            .basis ===
        RELIABILITY_POPULATION_BASIS
            .CUSTOMER
    ) {
        const affectedCustomers =
            finiteNonNegativeInteger(
                interruption
                    .affectedCustomers
            );


        if (
            affectedCustomers ===
            null
        ) {
            return unavailable({
                reason:
                    INTERRUPTION_WEIGHT_REASON
                        .AFFECTED_CUSTOMERS_UNAVAILABLE,

                populationBasis:
                    population
                        .basis,

                installationId,
            });
        }


        /*
         * Zero affected customers cannot contribute to a customer
         * interruption index. Treat it as unavailable for index
         * calculation rather than inventing a customer.
         */
        if (
            affectedCustomers <=
            0
        ) {
            return unavailable({
                reason:
                    INTERRUPTION_WEIGHT_REASON
                        .INVALID_AFFECTED_CUSTOMERS,

                populationBasis:
                    population
                        .basis,

                installationId,
            });
        }


        return {
            valid:
                true,

            status:
                INTERRUPTION_WEIGHT_STATUS
                    .VALID,

            reason:
                INTERRUPTION_WEIGHT_REASON
                    .VALID,

            populationBasis:
                population
                    .basis,

            installationId,

            weight:
                affectedCustomers,

            weightUnit:
                "CUSTOMERS",

            affectedCustomers,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Validated service-point basis
    |--------------------------------------------------------------------------
    */

    if (
        population
            .basis ===
        RELIABILITY_POPULATION_BASIS
            .SERVICE_POINT
    ) {
        return {
            valid:
                true,

            status:
                INTERRUPTION_WEIGHT_STATUS
                    .VALID,

            reason:
                INTERRUPTION_WEIGHT_REASON
                    .VALID,

            populationBasis:
                population
                    .basis,

            installationId,

            weight:
                1,

            weightUnit:
                "SERVICE_POINTS",

            affectedCustomers:
                null,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Explicit installation proxy
    |--------------------------------------------------------------------------
    */

    if (
        population
            .basis ===
        RELIABILITY_POPULATION_BASIS
            .INSTALLATION_PROXY
    ) {
        return {
            valid:
                true,

            status:
                INTERRUPTION_WEIGHT_STATUS
                    .VALID,

            reason:
                INTERRUPTION_WEIGHT_REASON
                    .VALID,

            populationBasis:
                population
                    .basis,

            installationId,

            weight:
                1,

            weightUnit:
                "INSTALLATIONS",

            affectedCustomers:
                null,
        };
    }


    return unavailable({
        reason:
            INTERRUPTION_WEIGHT_REASON
                .UNSUPPORTED_POPULATION_BASIS,

        populationBasis:
            population
                .basis,

        installationId,
    });
}


/*
|--------------------------------------------------------------------------
| Resolve a collection
|--------------------------------------------------------------------------
*/

export function resolveInterruptionWeights({
    interruptions = [],
    population,
} = {}) {
    const results =
        interruptions.map(
            (interruption) =>
                resolveInterruptionWeight({
                    interruption,
                    population,
                })
        );


    const valid =
        results.filter(
            (result) =>
                result.valid ===
                true
        );


    const unavailableResults =
        results.filter(
            (result) =>
                result.valid !==
                true
        );


    const reasonCounts =
        unavailableResults.reduce(
            (
                counts,
                result
            ) => {
                const reason =
                    result.reason ??
                    "UNKNOWN";

                counts[reason] =
                    (
                        counts[reason] ??
                        0
                    ) +
                    1;

                return counts;
            },
            {}
        );


    const totalWeight =
        valid.reduce(
            (
                sum,
                result
            ) =>
                sum +
                result.weight,
            0
        );


    return {
        totalInterruptionCount:
            interruptions.length,

        validWeightCount:
            valid.length,

        unavailableWeightCount:
            unavailableResults.length,

        totalWeight,

        valid,

        unavailable:
            unavailableResults,

        reasonCounts,

        complete:
            interruptions.length >
                0 &&
            valid.length ===
                interruptions.length,
    };
}