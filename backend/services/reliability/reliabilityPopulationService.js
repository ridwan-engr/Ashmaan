// backend/services/reliability/reliabilityPopulationService.js


/*
|--------------------------------------------------------------------------
| Reliability denominator basis
|--------------------------------------------------------------------------
*/

export const RELIABILITY_POPULATION_BASIS = {
    CUSTOMER:
        "CUSTOMER",

    SERVICE_POINT:
        "SERVICE_POINT",

    INSTALLATION_PROXY:
        "INSTALLATION_PROXY",
};


export const RELIABILITY_POPULATION_STATUS = {
    VALIDATED:
        "VALIDATED",

    PROXY:
        "PROXY",

    UNAVAILABLE:
        "UNAVAILABLE",
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
        Number(
            value
        );


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


function finitePositiveInteger(
    value
) {
    const numeric =
        finiteNonNegativeInteger(
            value
        );


    if (
        numeric === null ||
        numeric <= 0
    ) {
        return null;
    }


    return numeric;
}


function normalizeBasis(
    value
) {
    if (!value) {
        return null;
    }


    const normalized =
        String(
            value
        )
            .trim()
            .toUpperCase();


    return Object
        .values(
            RELIABILITY_POPULATION_BASIS
        )
        .includes(
            normalized
        )
        ? normalized
        : null;
}


/*
|--------------------------------------------------------------------------
| Population result builders
|--------------------------------------------------------------------------
*/

function unavailableResult({
    requestedBasis =
        null,

    reason =
        "RELIABILITY_POPULATION_NOT_ESTABLISHED",
} = {}) {
    return {
        basis:
            requestedBasis,

        status:
            RELIABILITY_POPULATION_STATUS
                .UNAVAILABLE,

        population:
            null,

        denominator:
            null,

        denominatorAvailable:
            false,

        regulatoryCustomerBasis:
            false,

        proxyBasis:
            false,

        indexLabelMode:
            "UNAVAILABLE",

        reason,
    };
}


function customerResult(
    population
) {
    return {
        basis:
            RELIABILITY_POPULATION_BASIS
                .CUSTOMER,

        status:
            RELIABILITY_POPULATION_STATUS
                .VALIDATED,

        population,

        denominator:
            population,

        denominatorAvailable:
            true,

        regulatoryCustomerBasis:
            true,

        proxyBasis:
            false,

        indexLabelMode:
            "CUSTOMER",

        reason:
            null,
    };
}


function servicePointResult(
    population
) {
    return {
        basis:
            RELIABILITY_POPULATION_BASIS
                .SERVICE_POINT,

        status:
            RELIABILITY_POPULATION_STATUS
                .VALIDATED,

        population,

        denominator:
            population,

        denominatorAvailable:
            true,

        regulatoryCustomerBasis:
            false,

        proxyBasis:
            false,

        indexLabelMode:
            "SERVICE_POINT",

        reason:
            null,
    };
}


function installationProxyResult(
    population
) {
    return {
        basis:
            RELIABILITY_POPULATION_BASIS
                .INSTALLATION_PROXY,

        status:
            RELIABILITY_POPULATION_STATUS
                .PROXY,

        population,

        denominator:
            population,

        denominatorAvailable:
            true,

        regulatoryCustomerBasis:
            false,

        proxyBasis:
            true,

        indexLabelMode:
            "SITE_EQUIVALENT",

        reason:
            "INSTALLATIONS_USED_AS_EXPLICIT_RELIABILITY_PROXY",
    };
}


/*
|--------------------------------------------------------------------------
| Resolve reliability population
|--------------------------------------------------------------------------
|
| Priority is explicit. Nothing is inferred silently.
|
| Examples:
|
| CUSTOMER
|     customerPopulation must be a validated positive integer.
|
| SERVICE_POINT
|     servicePointPopulation must be a validated positive integer.
|
| INSTALLATION_PROXY
|     explicitlyEnabledInstallationProxy must be true and
|     installationPopulation must be a positive integer.
|
| null / omitted basis
|     returns UNAVAILABLE.
|--------------------------------------------------------------------------
*/

export function resolveReliabilityPopulation({
    basis =
        null,

    customerPopulation =
        null,

    servicePointPopulation =
        null,

    installationPopulation =
        null,

    explicitlyEnabledInstallationProxy =
        false,
} = {}) {
    const requestedBasis =
        normalizeBasis(
            basis
        );


    if (!requestedBasis) {
        return unavailableResult({
            requestedBasis:
                null,

            reason:
                basis
                    ? "INVALID_RELIABILITY_POPULATION_BASIS"
                    : "RELIABILITY_POPULATION_BASIS_NOT_SELECTED",
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Customer denominator
    |--------------------------------------------------------------------------
    */

    if (
        requestedBasis ===
        RELIABILITY_POPULATION_BASIS
            .CUSTOMER
    ) {
        const population =
            finitePositiveInteger(
                customerPopulation
            );


        if (
            population ===
            null
        ) {
            return unavailableResult({
                requestedBasis,

                reason:
                    "VALIDATED_CUSTOMER_POPULATION_UNAVAILABLE",
            });
        }


        return customerResult(
            population
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Service-point denominator
    |--------------------------------------------------------------------------
    */

    if (
        requestedBasis ===
        RELIABILITY_POPULATION_BASIS
            .SERVICE_POINT
    ) {
        const population =
            finitePositiveInteger(
                servicePointPopulation
            );


        if (
            population ===
            null
        ) {
            return unavailableResult({
                requestedBasis,

                reason:
                    "VALIDATED_SERVICE_POINT_POPULATION_UNAVAILABLE",
            });
        }


        return servicePointResult(
            population
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Installation proxy
    |--------------------------------------------------------------------------
    |
    | Installations may NEVER become the denominator merely because they
    | happen to exist.
    |
    | Proxy usage requires an explicit opt-in flag.
    |--------------------------------------------------------------------------
    */

    if (
        requestedBasis ===
        RELIABILITY_POPULATION_BASIS
            .INSTALLATION_PROXY
    ) {
        if (
            explicitlyEnabledInstallationProxy !==
            true
        ) {
            return unavailableResult({
                requestedBasis,

                reason:
                    "INSTALLATION_PROXY_NOT_EXPLICITLY_ENABLED",
            });
        }


        const population =
            finitePositiveInteger(
                installationPopulation
            );


        if (
            population ===
            null
        ) {
            return unavailableResult({
                requestedBasis,

                reason:
                    "INSTALLATION_PROXY_POPULATION_UNAVAILABLE",
            });
        }


        return installationProxyResult(
            population
        );
    }


    return unavailableResult({
        requestedBasis,

        reason:
            "UNSUPPORTED_RELIABILITY_POPULATION_BASIS",
    });
}


/*
|--------------------------------------------------------------------------
| Reliability index labels
|--------------------------------------------------------------------------
*/

export function buildReliabilityIndexLabels(
    population
) {
    if (
        !population ||
        population
            .denominatorAvailable !==
            true
    ) {
        return {
            saidi:
                "SAIDI",

            saifi:
                "SAIFI",

            caidi:
                "CAIDI",

            qualifier:
                "UNAVAILABLE",
        };
    }


    switch (
        population
            .indexLabelMode
    ) {
        case "CUSTOMER":
            return {
                saidi:
                    "SAIDI",

                saifi:
                    "SAIFI",

                caidi:
                    "CAIDI",

                qualifier:
                    "CUSTOMER_BASED",
            };


        case "SERVICE_POINT":
            return {
                saidi:
                    "Service-Point SAIDI",

                saifi:
                    "Service-Point SAIFI",

                caidi:
                    "Service-Point CAIDI",

                qualifier:
                    "SERVICE_POINT_BASED",
            };


        case "SITE_EQUIVALENT":
            return {
                saidi:
                    "Site-Based SAIDI-Equivalent",

                saifi:
                    "Site-Based SAIFI-Equivalent",

                caidi:
                    "Site-Based CAIDI-Equivalent",

                qualifier:
                    "INSTALLATION_PROXY",
            };


        default:
            return {
                saidi:
                    "SAIDI",

                saifi:
                    "SAIFI",

                caidi:
                    "CAIDI",

                qualifier:
                    "UNAVAILABLE",
            };
    }
}