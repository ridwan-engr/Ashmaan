// backend/scripts/validateReliabilityPopulation.js

import {
    resolveReliabilityPopulation,
    buildReliabilityIndexLabels,
} from "../services/reliability/reliabilityPopulationService.js";


function assertEqual(
    actual,
    expected,
    label
) {
    if (
        actual !==
        expected
    ) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }


    console.log(
        `PASS: ${label}`
    );
}


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN RELIABILITY POPULATION VALIDATION"
    );
    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | Case 1 — no basis selected
    |--------------------------------------------------------------------------
    */

    const unavailable =
        resolveReliabilityPopulation();


    assertEqual(
        unavailable.status,
        "UNAVAILABLE",
        "No basis defaults to UNAVAILABLE"
    );


    assertEqual(
        unavailable.denominator,
        null,
        "Unavailable population has no denominator"
    );


    /*
    |--------------------------------------------------------------------------
    | Case 2 — customer basis without population
    |--------------------------------------------------------------------------
    */

    const missingCustomer =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",
        });


    assertEqual(
        missingCustomer.status,
        "UNAVAILABLE",
        "Customer basis requires validated customer population"
    );


    /*
    |--------------------------------------------------------------------------
    | Case 3 — validated customer population
    |--------------------------------------------------------------------------
    */

    const customer =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",

            customerPopulation:
                1250,
        });


    assertEqual(
        customer.status,
        "VALIDATED",
        "Validated customer population accepted"
    );


    assertEqual(
        customer.denominator,
        1250,
        "Customer denominator preserved"
    );


    assertEqual(
        customer.regulatoryCustomerBasis,
        true,
        "Customer denominator marked regulatory customer basis"
    );


    /*
    |--------------------------------------------------------------------------
    | Case 4 — validated service-point population
    |--------------------------------------------------------------------------
    */

    const servicePoint =
        resolveReliabilityPopulation({
            basis:
                "SERVICE_POINT",

            servicePointPopulation:
                74,
        });


    assertEqual(
        servicePoint.status,
        "VALIDATED",
        "Validated service-point population accepted"
    );


    assertEqual(
        servicePoint.denominator,
        74,
        "Service-point denominator preserved"
    );


    assertEqual(
        servicePoint.regulatoryCustomerBasis,
        false,
        "Service-point basis is not regulatory customer basis"
    );


    /*
    |--------------------------------------------------------------------------
    | Case 5 — installation proxy without explicit opt-in
    |--------------------------------------------------------------------------
    */

    const blockedProxy =
        resolveReliabilityPopulation({
            basis:
                "INSTALLATION_PROXY",

            installationPopulation:
                74,
        });


    assertEqual(
        blockedProxy.status,
        "UNAVAILABLE",
        "Installation proxy blocked without explicit opt-in"
    );


    assertEqual(
        blockedProxy.denominator,
        null,
        "Blocked proxy has no denominator"
    );


    /*
    |--------------------------------------------------------------------------
    | Case 6 — explicitly enabled installation proxy
    |--------------------------------------------------------------------------
    */

    const proxy =
        resolveReliabilityPopulation({
            basis:
                "INSTALLATION_PROXY",

            installationPopulation:
                74,

            explicitlyEnabledInstallationProxy:
                true,
        });


    assertEqual(
        proxy.status,
        "PROXY",
        "Explicit installation proxy accepted as PROXY"
    );


    assertEqual(
        proxy.denominator,
        74,
        "Explicit proxy denominator preserved"
    );


    assertEqual(
        proxy.proxyBasis,
        true,
        "Installation denominator marked as proxy"
    );


    /*
    |--------------------------------------------------------------------------
    | Labels
    |--------------------------------------------------------------------------
    */

    const customerLabels =
        buildReliabilityIndexLabels(
            customer
        );


    assertEqual(
        customerLabels.saidi,
        "SAIDI",
        "Customer basis uses standard SAIDI label"
    );


    const proxyLabels =
        buildReliabilityIndexLabels(
            proxy
        );


    assertEqual(
        proxyLabels.saidi,
        "Site-Based SAIDI-Equivalent",
        "Proxy basis uses explicit SAIDI-equivalent label"
    );


    assertEqual(
        proxyLabels.saifi,
        "Site-Based SAIFI-Equivalent",
        "Proxy basis uses explicit SAIFI-equivalent label"
    );


    assertEqual(
        proxyLabels.caidi,
        "Site-Based CAIDI-Equivalent",
        "Proxy basis uses explicit CAIDI-equivalent label"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "RELIABILITY POPULATION VALIDATION PASSED"
    );
    console.log(
        "================================================"
    );
}


try {
    run();
}
catch (error) {
    console.error("");
    console.error(
        "Reliability population validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}