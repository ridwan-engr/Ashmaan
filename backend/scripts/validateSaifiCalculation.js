// backend/scripts/validateSaifiCalculation.js

import {
    resolveReliabilityPopulation,
} from "../services/reliability/reliabilityPopulationService.js";

import {
    calculateSaifi,
} from "../services/reliability/saifiCalculationService.js";


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


function interruption({
    id,
    installationId,
    start,
    end = null,
    affectedCustomers =
        null,
    startedInPeriod =
        true,
}) {
    const originalStart =
        new Date(
            start
        );


    /*
    |--------------------------------------------------------------------------
    | Existing tests historically supplied only a start.
    |
    | Give those records a one-hour physical interval unless an explicit end
    | is provided.
    |--------------------------------------------------------------------------
    */

    const originalEnd =
        end
            ? new Date(
                end
            )
            : new Date(
                originalStart
                    .getTime() +
                60 *
                60 *
                1000
            );


    return {
        eligible:
            true,

        sourceEventId:
            id,

        installationId,

        originalStart,

        originalEnd,

        clippedStart:
            originalStart,

        clippedEnd:
            originalEnd,

        startedInPeriod,

        affectedCustomers,
    };
}


function run() {
    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN SAIFI CALCULATION VALIDATION"
    );
    console.log(
        "================================================"
    );


    const customerPopulation =
        resolveReliabilityPopulation({
            basis:
                "CUSTOMER",

            customerPopulation:
                100,
        });


    const proxyPopulation =
        resolveReliabilityPopulation({
            basis:
                "INSTALLATION_PROXY",

            installationPopulation:
                10,

            explicitlyEnabledInstallationProxy:
                true,
        });


    /*
    |--------------------------------------------------------------------------
    | CASE 1 — customer frequency
    |--------------------------------------------------------------------------
    */

    const customerResult =
        calculateSaifi({
            population:
                customerPopulation,

            interruptions: [
                interruption({
                    id:
                        "A",

                    installationId:
                        "SITE-A",

                    start:
                        "2026-09-05T01:00:00.000Z",

                    affectedCustomers:
                        20,
                }),

                interruption({
                    id:
                        "B",

                    installationId:
                        "SITE-B",

                    start:
                        "2026-09-05T02:00:00.000Z",

                    affectedCustomers:
                        10,
                }),
            ],
        });


    assertEqual(
        customerResult.status,
        "CALCULATED",
        "Customer SAIFI calculated"
    );


    assertEqual(
        customerResult
            .weightedInterruptionStarts,
        30,
        "Customer weighted interruption starts equal 30"
    );


    assertClose(
        customerResult
            .saifi,
        0.3,
        0.000001,
        "Customer SAIFI equals 0.3"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 2 — independent carried interruption excluded
    |--------------------------------------------------------------------------
    */

    const carriedResult =
        calculateSaifi({
            population:
                proxyPopulation,

            interruptions: [
                interruption({
                    id:
                        "CARRIED",

                    installationId:
                        "SITE-A",

                    start:
                        "2026-09-04T23:00:00.000Z",

                    end:
                        "2026-09-05T00:30:00.000Z",

                    startedInPeriod:
                        false,
                }),

                interruption({
                    id:
                        "STARTED",

                    installationId:
                        "SITE-B",

                    start:
                        "2026-09-05T01:00:00.000Z",

                    end:
                        "2026-09-05T02:00:00.000Z",

                    startedInPeriod:
                        true,
                }),
            ],
        });


    assertEqual(
        carriedResult
            .physicalStartedEpisodeCount,
        1,
        "Carried interruption does not add SAIFI start"
    );


    assertEqual(
        carriedResult
            .weightedInterruptionStarts,
        1,
        "Only one site interruption start counted"
    );


    assertClose(
        carriedResult
            .saifi,
        0.1,
        0.000001,
        "Site-based SAIFI-equivalent equals 0.1"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 3 — exact duplicate physical start
    |--------------------------------------------------------------------------
    */

    const duplicateResult =
        calculateSaifi({
            population:
                proxyPopulation,

            interruptions: [
                interruption({
                    id:
                        "D1",

                    installationId:
                        "SITE-X",

                    start:
                        "2026-09-05T02:00:00.000Z",

                    end:
                        "2026-09-05T03:00:00.000Z",
                }),

                interruption({
                    id:
                        "D2",

                    installationId:
                        "SITE-X",

                    start:
                        "2026-09-05T02:00:00.000Z",

                    end:
                        "2026-09-05T03:00:00.000Z",
                }),
            ],
        });


    assertEqual(
        duplicateResult
            .sourceStartedInterruptionCount,
        2,
        "Two source event records detected"
    );


    assertEqual(
        duplicateResult
            .physicalStartedEpisodeCount,
        1,
        "Duplicate physical starts deduplicated"
    );


    assertEqual(
        duplicateResult
            .weightedInterruptionStarts,
        1,
        "Duplicate site start contributes weight one"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 4 — duplicate customer start with differing weights
    |--------------------------------------------------------------------------
    */

    const customerDuplicate =
        calculateSaifi({
            population:
                customerPopulation,

            interruptions: [
                interruption({
                    id:
                        "E1",

                    installationId:
                        "SITE-Y",

                    start:
                        "2026-09-05T03:00:00.000Z",

                    end:
                        "2026-09-05T04:00:00.000Z",

                    affectedCustomers:
                        20,
                }),

                interruption({
                    id:
                        "E2",

                    installationId:
                        "SITE-Y",

                    start:
                        "2026-09-05T03:00:00.000Z",

                    end:
                        "2026-09-05T04:00:00.000Z",

                    affectedCustomers:
                        30,
                }),
            ],
        });


    assertEqual(
        customerDuplicate
            .weightedInterruptionStarts,
        30,
        "Duplicate customer starts use maximum concurrent weight"
    );


    assertClose(
        customerDuplicate
            .saifi,
        0.3,
        0.000001,
        "Deduplicated customer SAIFI equals 0.3"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 5 — missing customer weight
    |--------------------------------------------------------------------------
    */

    const incomplete =
        calculateSaifi({
            population:
                customerPopulation,

            interruptions: [
                interruption({
                    id:
                        "F",

                    installationId:
                        "SITE-F",

                    start:
                        "2026-09-05T01:00:00.000Z",

                    affectedCustomers:
                        null,
                }),
            ],
        });


    assertEqual(
        incomplete.status,
        "UNAVAILABLE",
        "Incomplete customer weighting blocks SAIFI"
    );


    assertEqual(
        incomplete.reason,
        "INCOMPLETE_INTERRUPTION_WEIGHTING",
        "Incomplete customer SAIFI has correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 6 — unavailable denominator
    |--------------------------------------------------------------------------
    */

    const unavailablePopulation =
        resolveReliabilityPopulation();


    const unavailable =
        calculateSaifi({
            population:
                unavailablePopulation,

            interruptions: [],
        });


    assertEqual(
        unavailable.status,
        "UNAVAILABLE",
        "Unavailable denominator blocks SAIFI"
    );


    assertEqual(
        unavailable.reason,
        "POPULATION_UNAVAILABLE",
        "Unavailable denominator has correct SAIFI reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 7 — no eligible interruption evidence
    |--------------------------------------------------------------------------
    */

    const noEvidence =
        calculateSaifi({
            population:
                proxyPopulation,

            interruptions: [],
        });


    assertEqual(
        noEvidence.status,
        "UNAVAILABLE",
        "No eligible interruption evidence does not become zero SAIFI"
    );


    assertEqual(
        noEvidence.saifi,
        null,
        "No-evidence SAIFI remains null"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 8 — carried-only interruption
    |--------------------------------------------------------------------------
    */

    const carriedOnly =
        calculateSaifi({
            population:
                proxyPopulation,

            interruptions: [
                interruption({
                    id:
                        "OLD",

                    installationId:
                        "SITE-Z",

                    start:
                        "2026-09-04T23:00:00.000Z",

                    end:
                        "2026-09-05T00:30:00.000Z",

                    startedInPeriod:
                        false,
                }),
            ],
        });


    assertEqual(
        carriedOnly.status,
        "UNAVAILABLE",
        "Carried-only evidence does not imply zero SAIFI"
    );


    assertEqual(
        carriedOnly.reason,
        "NO_STARTED_INTERRUPTION_DATA",
        "Carried-only case receives correct reason"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 9 — different-start OVERLAPPING documents
    |--------------------------------------------------------------------------
    |
    | 10:00 -------- 11:00
    |       10:45 -------- 11:30
    |
    | One physical episode.
    |--------------------------------------------------------------------------
    */

    const overlapping =
        calculateSaifi({
            population:
                proxyPopulation,

            interruptions: [
                interruption({
                    id:
                        "OVERLAP-1",

                    installationId:
                        "SITE-O",

                    start:
                        "2026-09-05T10:00:00.000Z",

                    end:
                        "2026-09-05T11:00:00.000Z",
                }),

                interruption({
                    id:
                        "OVERLAP-2",

                    installationId:
                        "SITE-O",

                    start:
                        "2026-09-05T10:45:00.000Z",

                    end:
                        "2026-09-05T11:30:00.000Z",
                }),
            ],
        });


    assertEqual(
        overlapping
            .sourceStartedInterruptionCount,
        2,
        "Overlapping case contains two source starts"
    );


    assertEqual(
        overlapping
            .physicalStartedEpisodeCount,
        1,
        "Different-start overlapping records merge into one physical episode"
    );


    assertEqual(
        overlapping
            .weightedInterruptionStarts,
        1,
        "Overlapping site records contribute one SAIFI start"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 10 — touching interruption documents
    |--------------------------------------------------------------------------
    |
    | 12:00 -------- 13:00
    |                13:00 -------- 14:00
    |
    | Touching boundaries are one continuous physical episode.
    |--------------------------------------------------------------------------
    */

    const touching =
        calculateSaifi({
            population:
                proxyPopulation,

            interruptions: [
                interruption({
                    id:
                        "TOUCH-1",

                    installationId:
                        "SITE-T",

                    start:
                        "2026-09-05T12:00:00.000Z",

                    end:
                        "2026-09-05T13:00:00.000Z",
                }),

                interruption({
                    id:
                        "TOUCH-2",

                    installationId:
                        "SITE-T",

                    start:
                        "2026-09-05T13:00:00.000Z",

                    end:
                        "2026-09-05T14:00:00.000Z",
                }),
            ],
        });


    assertEqual(
        touching
            .physicalStartedEpisodeCount,
        1,
        "Touching records merge into one physical episode"
    );


    assertEqual(
        touching
            .weightedInterruptionStarts,
        1,
        "Touching records contribute one SAIFI start"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 11 — carried episode overlaps in-period continuation
    |--------------------------------------------------------------------------
    |
    | Reporting boundary conceptually = 10:00
    |
    | carried:
    | 09:45 -------- 10:30
    |
    | continuation:
    |          10:20 -------- 11:00
    |
    | Earliest physical start is 09:45.
    | Therefore there is NO new SAIFI start in the current period.
    |--------------------------------------------------------------------------
    */

    const carriedOverlap =
        calculateSaifi({
            population:
                proxyPopulation,

            interruptions: [
                interruption({
                    id:
                        "CARRY-OVERLAP-1",

                    installationId:
                        "SITE-CARRY-O",

                    start:
                        "2026-09-05T09:45:00.000Z",

                    end:
                        "2026-09-05T10:30:00.000Z",

                    startedInPeriod:
                        false,
                }),

                interruption({
                    id:
                        "CARRY-OVERLAP-2",

                    installationId:
                        "SITE-CARRY-O",

                    start:
                        "2026-09-05T10:20:00.000Z",

                    end:
                        "2026-09-05T11:00:00.000Z",

                    startedInPeriod:
                        true,
                }),
            ],
        });


    assertEqual(
        carriedOverlap.status,
        "UNAVAILABLE",
        "Carried overlapping episode does not fabricate an in-period SAIFI start"
    );


    assertEqual(
        carriedOverlap.reason,
        "NO_STARTED_INTERRUPTION_DATA",
        "Carried overlapping continuation remains a carried physical episode"
    );


    assertEqual(
        carriedOverlap
            .physicalStartedEpisodeCount,
        0,
        "Carried overlapping physical episode contributes zero starts"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 12 — carried episode TOUCHES in-period continuation
    |--------------------------------------------------------------------------
    |
    | 09:30 -------- 10:00
    |                10:00 -------- 11:00
    |
    | Still one continuous physical episode.
    |--------------------------------------------------------------------------
    */

    const carriedTouching =
        calculateSaifi({
            population:
                proxyPopulation,

            interruptions: [
                interruption({
                    id:
                        "CARRY-TOUCH-1",

                    installationId:
                        "SITE-CARRY-T",

                    start:
                        "2026-09-05T09:30:00.000Z",

                    end:
                        "2026-09-05T10:00:00.000Z",

                    startedInPeriod:
                        false,
                }),

                interruption({
                    id:
                        "CARRY-TOUCH-2",

                    installationId:
                        "SITE-CARRY-T",

                    start:
                        "2026-09-05T10:00:00.000Z",

                    end:
                        "2026-09-05T11:00:00.000Z",

                    startedInPeriod:
                        true,
                }),
            ],
        });


    assertEqual(
        carriedTouching.status,
        "UNAVAILABLE",
        "Carried touching episode does not create a new SAIFI interruption"
    );


    assertEqual(
        carriedTouching.reason,
        "NO_STARTED_INTERRUPTION_DATA",
        "Carried touching continuation retains earliest physical start"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 13 — genuinely separated physical interruptions
    |--------------------------------------------------------------------------
    |
    | 15:00 ---- 15:30
    |
    | 16:00 ---- 16:30
    |
    | Gap exists => two physical episodes.
    |--------------------------------------------------------------------------
    */

    const separated =
        calculateSaifi({
            population:
                proxyPopulation,

            interruptions: [
                interruption({
                    id:
                        "SEPARATE-1",

                    installationId:
                        "SITE-S",

                    start:
                        "2026-09-05T15:00:00.000Z",

                    end:
                        "2026-09-05T15:30:00.000Z",
                }),

                interruption({
                    id:
                        "SEPARATE-2",

                    installationId:
                        "SITE-S",

                    start:
                        "2026-09-05T16:00:00.000Z",

                    end:
                        "2026-09-05T16:30:00.000Z",
                }),
            ],
        });


    assertEqual(
        separated
            .physicalStartedEpisodeCount,
        2,
        "Separated interruption intervals remain two physical episodes"
    );


    assertEqual(
        separated
            .weightedInterruptionStarts,
        2,
        "Separated site interruptions contribute two SAIFI starts"
    );


    assertClose(
        separated
            .saifi,
        0.2,
        0.000001,
        "Two separated interruptions across ten sites produce SAIFI-equivalent 0.2"
    );


    /*
    |--------------------------------------------------------------------------
    | CASE 14 — overlapping CUSTOMER records use maximum episode weight
    |--------------------------------------------------------------------------
    |
    | Same physical episode represented by:
    |
    | 20 customers: 17:00 -> 18:00
    | 30 customers: 17:30 -> 18:30
    |
    | Must contribute 30, not 50.
    |--------------------------------------------------------------------------
    */

    const customerOverlap =
        calculateSaifi({
            population:
                customerPopulation,

            interruptions: [
                interruption({
                    id:
                        "CUSTOMER-OVERLAP-1",

                    installationId:
                        "SITE-CUSTOMER-O",

                    start:
                        "2026-09-05T17:00:00.000Z",

                    end:
                        "2026-09-05T18:00:00.000Z",

                    affectedCustomers:
                        20,
                }),

                interruption({
                    id:
                        "CUSTOMER-OVERLAP-2",

                    installationId:
                        "SITE-CUSTOMER-O",

                    start:
                        "2026-09-05T17:30:00.000Z",

                    end:
                        "2026-09-05T18:30:00.000Z",

                    affectedCustomers:
                        30,
                }),
            ],
        });


    assertEqual(
        customerOverlap
            .physicalStartedEpisodeCount,
        1,
        "Overlapping customer records merge into one episode"
    );


    assertEqual(
        customerOverlap
            .weightedInterruptionStarts,
        30,
        "Overlapping customer episode uses maximum weight rather than summing records"
    );


    assertClose(
        customerOverlap
            .saifi,
        0.3,
        0.000001,
        "Overlapping customer episode produces SAIFI 0.3"
    );


    console.log("");
    console.log(
        "================================================"
    );
    console.log(
        "SAIFI CALCULATION VALIDATION PASSED"
    );
    console.log(
        "================================================"
    );


    console.log("");
    console.log(
        "Validated physical-episode semantics:"
    );

    console.log(
        "- exact duplicates merge"
    );

    console.log(
        "- different-start overlaps merge"
    );

    console.log(
        "- touching intervals merge"
    );

    console.log(
        "- carried overlapping continuations do not create new starts"
    );

    console.log(
        "- carried touching continuations do not create new starts"
    );

    console.log(
        "- separated outages remain separate episodes"
    );

    console.log(
        "- customer episode weighting uses maximum concurrent representation"
    );
}


try {
    run();
}
catch (error) {
    console.error("");
    console.error(
        "SAIFI calculation validation failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;
}