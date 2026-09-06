// backend/scripts/validateAsaiAsuiIntegration.js

import {
    resolveReliabilityPopulation,
} from "../services/reliability/reliabilityPopulationService.js";

import {
    calculateIntegratedAsaiAsui,
} from "../services/reliability/asaiAsuiIntegrationService.js";


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


function assertClose(
    actual,
    expected,
    tolerance,
    label
) {
    if (
        actual === null ||
        actual === undefined ||
        Math.abs(
            actual -
            expected
        ) >
            tolerance
    ) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


function outageEvent({
    id,

    installationId,

    start,

    end,

    affectedCustomers,

    loadInterruptionConfirmed =
        true,

    eligibleForSaidiSaifi =
        true,
}) {
    return {
        _id:
            id,

        installation:
            installationId,

        eventType:
            "GRID_OUTAGE",

        source:
            "DERIVED",

        status:
            "RESTORED",

        startTime:
            new Date(
                start
            ),

        restorationTime:
            new Date(
                end
            ),

        endTime:
            new Date(
                end
            ),

        affectedCustomers,

        raw: {
            loadInterruptionConfirmed,

            eligibleForSaidiSaifi,
        },
    };
}


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN ASAI / ASUI INTEGRATION VALIDATION"
    );
    console.log(
        "================================================"
    );


    const periodStart =
        new Date(
            "2026-09-05T00:00:00.000Z"
        );


    const periodEnd =
        new Date(
            "2026-09-06T00:00:00.000Z"
        );


    const customerPopulation =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",

            customerPopulation:
                100,
        });


    /*
    |--------------------------------------------------------------------------
    | CASE 1 — observable service with interruptions
    |--------------------------------------------------------------------------
    |
    | Event A:
    | 2 h × 20 customers = 40 customer-h
    |
    | Event B:
    | 1 h × 20 customers = 20 customer-h
    |
    | Total = 60 customer-h
    |
    | Population-hours = 100 × 24 = 2400
    |
    | ASUI = 60 / 2400 = 0.025
    | ASAI = 0.975
    |--------------------------------------------------------------------------
    */

    const events =
        [
            outageEvent({
                id:
                    "A",

                installationId:
                    "SITE-A",

                start:
                    "2026-09-05T01:00:00.000Z",

                end:
                    "2026-09-05T03:00:00.000Z",

                affectedCustomers:
                    20,
            }),

            outageEvent({
                id:
                    "B",

                installationId:
                    "SITE-B",

                start:
                    "2026-09-05T05:00:00.000Z",

                end:
                    "2026-09-05T06:00:00.000Z",

                affectedCustomers:
                    20,
            }),
        ];


    const observable =
        calculateIntegratedAsaiAsui({
            events,

            population:
                customerPopulation,

            periodStart,

            periodEnd,

            serviceInterruptionObservable:
                true,
        });


    assertEqual(
        observable
            .eligibility
            .eligibleEventCount,
        2,
        "Two confirmed service interruptions are eligible"
    );


    assertClose(
        observable
            .weightedInterruptionHours,
        60,
        0.000001,
        "Integrated weighted interruption duration equals 60 customer-hours"
    );


    assertEqual(
        observable
            .durationSource,
        "SAIDI_WEIGHTED_INTERRUPTION_HOURS",
        "Interruption duration comes from validated SAIDI weighting"
    );


    assertEqual(
        observable
            .availability
            .status,
        "CALCULATED",
        "Observable ASAI/ASUI are calculated"
    );


    assertClose(
        observable
            .availability
            .asui,
        0.025,
        0.000001,
        "Integrated ASUI equals 0.025"
    );


    assertClose(
        observable
            .availability
            .asai,
        0.975,
        0.000001,
        "Integrated ASAI equals 0.975"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — observable system with zero interruptions
    |--------------------------------------------------------------------------
    */

    const observableZero =
        calculateIntegratedAsaiAsui({
            events:
                [],

            population:
                customerPopulation,

            periodStart,

            periodEnd,

            serviceInterruptionObservable:
                true,
        });


    assertEqual(
        observableZero
            .weightedInterruptionHours,
        0,
        "Observable no-event period receives zero interruption duration"
    );


    assertEqual(
        observableZero
            .durationSource,
        "OBSERVED_ZERO_INTERRUPTION",
        "Observable zero has explicit duration source"
    );


    assertClose(
        observableZero
            .availability
            .asai,
        1,
        0.000001,
        "Observable zero-event ASAI equals one"
    );


    assertClose(
        observableZero
            .availability
            .asui,
        0,
        0.000001,
        "Observable zero-event ASUI equals zero"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — current ASHMAAN semantics:
    | no service observability
    |--------------------------------------------------------------------------
    |
    | This is the critical production case.
    |
    | Nine grid-source transitions with no confirmed load interruption must
    | NOT become ASAI = 100%.
    |--------------------------------------------------------------------------
    */

    const sourceTransfer =
        [
            outageEvent({
                id:
                    "SOURCE-ONLY",

                installationId:
                    "SITE-X",

                start:
                    "2026-09-05T08:00:00.000Z",

                end:
                    "2026-09-05T09:00:00.000Z",

                affectedCustomers:
                    null,

                loadInterruptionConfirmed:
                    false,

                eligibleForSaidiSaifi:
                    false,
            }),
        ];


    const notObservable =
        calculateIntegratedAsaiAsui({
            events:
                sourceTransfer,

            population:
                customerPopulation,

            periodStart,

            periodEnd,

            serviceInterruptionObservable:
                false,
        });


    assertEqual(
        notObservable
            .eligibility
            .eligibleEventCount,
        0,
        "Grid-source-only event is not a service interruption"
    );


    assertEqual(
        notObservable
            .weightedInterruptionHours,
        null,
        "Unobservable service period does not convert missing duration to zero"
    );


    assertEqual(
        notObservable
            .durationSource,
        "UNAVAILABLE",
        "Unobservable duration remains unavailable"
    );


    assertEqual(
        notObservable
            .availability
            .status,
        "UNAVAILABLE",
        "Unobservable service blocks ASAI/ASUI"
    );


    assertEqual(
        notObservable
            .availability
            .reason,
        "SERVICE_OBSERVABILITY_NOT_ESTABLISHED",
        "Unobservable service receives correct reason"
    );


    assertEqual(
        notObservable
            .availability
            .asai,
        null,
        "Unobservable service does not fabricate ASAI one"
    );


    assertEqual(
        notObservable
            .availability
            .asui,
        null,
        "Unobservable service does not fabricate ASUI zero"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — valid installation proxy still cannot override observability
    |--------------------------------------------------------------------------
    */

    const proxyPopulation =
        resolveReliabilityPopulation({
            basis:
                "INSTALLATION_PROXY",

            installationPopulation:
                74,

            explicitlyEnabledInstallationProxy:
                true,
        });


    const proxyNotObservable =
        calculateIntegratedAsaiAsui({
            events:
                sourceTransfer,

            population:
                proxyPopulation,

            periodStart,

            periodEnd,

            serviceInterruptionObservable:
                false,
        });


    assertEqual(
        proxyNotObservable
            .availability
            .status,
        "UNAVAILABLE",
        "Valid installation denominator does not override missing service observability"
    );


    assertEqual(
        proxyNotObservable
            .availability
            .asai,
        null,
        "Site-based ASAI-equivalent remains null without service observability"
    );


    assertEqual(
        proxyNotObservable
            .availability
            .asui,
        null,
        "Site-based ASUI-equivalent remains null without service observability"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — unavailable customer denominator
    |--------------------------------------------------------------------------
    */

    const unavailablePopulation =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",

            customerPopulation:
                null,
        });


    const unavailable =
        calculateIntegratedAsaiAsui({
            events,

            population:
                unavailablePopulation,

            periodStart,

            periodEnd,

            serviceInterruptionObservable:
                true,
        });


    assertEqual(
        unavailable
            .availability
            .status,
        "UNAVAILABLE",
        "Unavailable population blocks integrated ASAI/ASUI"
    );


    assertEqual(
        unavailable
            .availability
            .reason,
        "POPULATION_UNAVAILABLE",
        "Unavailable population receives correct integrated reason"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASAI / ASUI INTEGRATION VALIDATION PASSED"
    );
    console.log(
        "================================================"
    );


    console.log("");
    console.log(
        "Validated semantics:"
    );

    console.log(
        "- service interruptions use existing 7.9 eligibility"
    );

    console.log(
        "- interruption duration uses validated SAIDI weighting"
    );

    console.log(
        "- observable zero interruption may produce ASAI 100%"
    );

    console.log(
        "- unobservable zero events remain null"
    );

    console.log(
        "- grid-source transitions do not become service unavailability"
    );

    console.log(
        "- installation proxy does not override observability requirements"
    );
}


try {
    run();
}
catch (error) {
    console.error("");
    console.error(
        "ASAI / ASUI integration validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}