// backend/scripts/validateInterruptionWeighting.js

import {
    resolveReliabilityPopulation,
} from "../services/reliability/reliabilityPopulationService.js";

import {
    resolveInterruptionWeight,
    resolveInterruptionWeights,
} from "../services/reliability/interruptionWeightingService.js";


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


function interruption({
    installationId,
    affectedCustomers =
        null,
    eligible =
        true,
} = {}) {
    return {
        eligible,
        installationId,
        affectedCustomers,
        startedInPeriod:
            true,

        interruptionHours:
            1,
    };
}


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN INTERRUPTION WEIGHTING VALIDATION"
    );
    console.log(
        "================================================"
    );


    /*
    |--------------------------------------------------------------------------
    | Population definitions
    |--------------------------------------------------------------------------
    */

    const customerPopulation =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",

            customerPopulation:
                1000,
        });


    const servicePointPopulation =
        resolveReliabilityPopulation({
            basis:
                "SERVICE_POINT",

            servicePointPopulation:
                74,
        });


    const installationProxy =
        resolveReliabilityPopulation({
            basis:
                "INSTALLATION_PROXY",

            installationPopulation:
                74,

            explicitlyEnabledInstallationProxy:
                true,
        });


    /*
    |--------------------------------------------------------------------------
    | Customer weighting
    |--------------------------------------------------------------------------
    */

    const customerInterruption =
        interruption({
            installationId:
                "SITE-A",

            affectedCustomers:
                25,
        });


    const customerWeight =
        resolveInterruptionWeight({
            interruption:
                customerInterruption,

            population:
                customerPopulation,
        });


    assertEqual(
        customerWeight.valid,
        true,
        "Customer interruption weight is valid"
    );


    assertEqual(
        customerWeight.weight,
        25,
        "Customer interruption weighted by affected customers"
    );


    assertEqual(
        customerWeight.weightUnit,
        "CUSTOMERS",
        "Customer weighting unit is CUSTOMERS"
    );


    /*
    |--------------------------------------------------------------------------
    | Missing affected-customer count
    |--------------------------------------------------------------------------
    */

    const missingCustomers =
        resolveInterruptionWeight({
            interruption:
                interruption({
                    installationId:
                        "SITE-B",
                }),

            population:
                customerPopulation,
        });


    assertEqual(
        missingCustomers.valid,
        false,
        "Customer interruption rejected when affected customers unavailable"
    );


    assertEqual(
        missingCustomers.reason,
        "AFFECTED_CUSTOMERS_UNAVAILABLE",
        "Missing customer count receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | Zero affected customers
    |--------------------------------------------------------------------------
    */

    const zeroCustomers =
        resolveInterruptionWeight({
            interruption:
                interruption({
                    installationId:
                        "SITE-C",

                    affectedCustomers:
                        0,
                }),

            population:
                customerPopulation,
        });


    assertEqual(
        zeroCustomers.valid,
        false,
        "Zero affected customers cannot contribute to customer indices"
    );


    assertEqual(
        zeroCustomers.reason,
        "INVALID_AFFECTED_CUSTOMERS",
        "Zero customer count receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | Service-point weighting
    |--------------------------------------------------------------------------
    */

    const servicePointWeight =
        resolveInterruptionWeight({
            interruption:
                interruption({
                    installationId:
                        "SITE-D",
                }),

            population:
                servicePointPopulation,
        });


    assertEqual(
        servicePointWeight.valid,
        true,
        "Service-point interruption weight is valid"
    );


    assertEqual(
        servicePointWeight.weight,
        1,
        "Service-point interruption has weight one"
    );


    assertEqual(
        servicePointWeight.weightUnit,
        "SERVICE_POINTS",
        "Service-point weighting unit is SERVICE_POINTS"
    );


    /*
    |--------------------------------------------------------------------------
    | Installation proxy weighting
    |--------------------------------------------------------------------------
    */

    const proxyWeight =
        resolveInterruptionWeight({
            interruption:
                interruption({
                    installationId:
                        "SITE-E",
                }),

            population:
                installationProxy,
        });


    assertEqual(
        proxyWeight.valid,
        true,
        "Installation proxy interruption weight is valid"
    );


    assertEqual(
        proxyWeight.weight,
        1,
        "Installation proxy interruption has weight one"
    );


    assertEqual(
        proxyWeight.weightUnit,
        "INSTALLATIONS",
        "Installation proxy unit is INSTALLATIONS"
    );


    /*
    |--------------------------------------------------------------------------
    | 7.9B-ineligible interruption
    |--------------------------------------------------------------------------
    */

    const ineligible =
        resolveInterruptionWeight({
            interruption:
                interruption({
                    installationId:
                        "SITE-F",

                    affectedCustomers:
                        10,

                    eligible:
                        false,
                }),

            population:
                customerPopulation,
        });


    assertEqual(
        ineligible.valid,
        false,
        "7.9B-ineligible interruption cannot receive reliability weight"
    );


    assertEqual(
        ineligible.reason,
        "INTERRUPTION_NOT_ELIGIBLE",
        "Ineligible event receives correct weighting reason"
    );


    /*
    |--------------------------------------------------------------------------
    | Missing denominator
    |--------------------------------------------------------------------------
    */

    const unavailablePopulation =
        resolveReliabilityPopulation();


    const noPopulation =
        resolveInterruptionWeight({
            interruption:
                customerInterruption,

            population:
                unavailablePopulation,
        });


    assertEqual(
        noPopulation.valid,
        false,
        "Unavailable denominator blocks interruption weighting"
    );


    assertEqual(
        noPopulation.reason,
        "POPULATION_UNAVAILABLE",
        "Unavailable denominator receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | Collection — customer basis
    |--------------------------------------------------------------------------
    */

    const customerCollection =
        resolveInterruptionWeights({
            interruptions: [
                interruption({
                    installationId:
                        "SITE-A",

                    affectedCustomers:
                        20,
                }),

                interruption({
                    installationId:
                        "SITE-B",

                    affectedCustomers:
                        15,
                }),

                interruption({
                    installationId:
                        "SITE-C",

                    affectedCustomers:
                        5,
                }),
            ],

            population:
                customerPopulation,
        });


    assertEqual(
        customerCollection
            .totalInterruptionCount,
        3,
        "Customer collection contains three interruptions"
    );


    assertEqual(
        customerCollection
            .validWeightCount,
        3,
        "All customer interruption weights valid"
    );


    assertEqual(
        customerCollection
            .totalWeight,
        40,
        "Customer collection total affected weight is 40"
    );


    assertEqual(
        customerCollection
            .complete,
        true,
        "Customer collection weighting is complete"
    );


    /*
    |--------------------------------------------------------------------------
    | Collection — service-point basis
    |--------------------------------------------------------------------------
    */

    const servicePointCollection =
        resolveInterruptionWeights({
            interruptions: [
                interruption({
                    installationId:
                        "SITE-A",
                }),

                interruption({
                    installationId:
                        "SITE-B",
                }),

                interruption({
                    installationId:
                        "SITE-C",
                }),
            ],

            population:
                servicePointPopulation,
        });


    assertEqual(
        servicePointCollection
            .totalWeight,
        3,
        "Three service-point interruptions produce total weight three"
    );


    /*
    |--------------------------------------------------------------------------
    | Incomplete customer collection
    |--------------------------------------------------------------------------
    */

    const incompleteCollection =
        resolveInterruptionWeights({
            interruptions: [
                interruption({
                    installationId:
                        "SITE-A",

                    affectedCustomers:
                        20,
                }),

                interruption({
                    installationId:
                        "SITE-B",

                    affectedCustomers:
                        null,
                }),
            ],

            population:
                customerPopulation,
        });


    assertEqual(
        incompleteCollection
            .validWeightCount,
        1,
        "Only one interruption has usable customer weight"
    );


    assertEqual(
        incompleteCollection
            .unavailableWeightCount,
        1,
        "One interruption has unavailable customer weight"
    );


    assertEqual(
        incompleteCollection
            .complete,
        false,
        "Incomplete customer weighting is explicitly marked incomplete"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "INTERRUPTION WEIGHTING VALIDATION PASSED"
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
        "Interruption weighting validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}