// backend/services/reliability/asaiAsuiIntegrationService.js

import {
    evaluateServiceInterruptions,
} from "./serviceInterruptionEligibilityService.js";

import {
    calculateSaidi,
} from "./saidiCalculationService.js";

import {
    calculateAsaiAsui,
} from "./asaiAsuiCalculationService.js";


/*
|--------------------------------------------------------------------------
| ASAI / ASUI integration
|--------------------------------------------------------------------------
|
| Important semantic rule:
|
| No interruption events + complete service observability
|     => weighted interruption hours = 0
|     => ASAI = 1, ASUI = 0
|
| No interruption events + observability NOT established
|     => interruption duration is not interpreted as zero
|     => ASAI/ASUI remain unavailable
|--------------------------------------------------------------------------
*/

export function calculateIntegratedAsaiAsui({
    events = [],

    population,

    periodStart,

    periodEnd,

    serviceInterruptionObservable =
        false,
} = {}) {

    /*
    |--------------------------------------------------------------------------
    | 7.9B — confirmed service-interruption eligibility
    |--------------------------------------------------------------------------
    */

    const eligibility =
        evaluateServiceInterruptions({
            events,

            periodStart,

            periodEnd,
        });


    /*
    |--------------------------------------------------------------------------
    | Determine weighted interruption duration
    |--------------------------------------------------------------------------
    */

    let weightedInterruptionHours =
        null;


    let durationSource =
        "UNAVAILABLE";


    /*
     * If service observability is established and there are genuinely no
     * eligible service interruptions, zero is meaningful.
     */
    if (
        serviceInterruptionObservable ===
            true &&
        eligibility
            .eligibleEventCount ===
            0
    ) {
        weightedInterruptionHours =
            0;

        durationSource =
            "OBSERVED_ZERO_INTERRUPTION";
    }


    /*
     * If eligible interruptions exist, use the already validated SAIDI
     * duration/weighting engine to obtain Σ(U_i × N_i).
     */
    if (
        eligibility
            .eligibleEventCount >
        0
    ) {
        const saidi =
            calculateSaidi({
                interruptions:
                    eligibility
                        .eligible,

                population,
            });


        if (
            saidi
                .status ===
                "CALCULATED" &&
            Number.isFinite(
                Number(
                    saidi
                        .weightedInterruptionHours
                )
            )
        ) {
            weightedInterruptionHours =
                Number(
                    saidi
                        .weightedInterruptionHours
                );

            durationSource =
                "SAIDI_WEIGHTED_INTERRUPTION_HOURS";
        }
    }


    /*
    |--------------------------------------------------------------------------
    | ASAI / ASUI
    |--------------------------------------------------------------------------
    */

    const availability =
        calculateAsaiAsui({
            population,

            periodStart,

            periodEnd,

            weightedInterruptionHours,

            serviceInterruptionObservable,
        });


    return {
        eligibility,

        weightedInterruptionHours,

        durationSource,

        serviceInterruptionObservable:
            serviceInterruptionObservable ===
            true,

        availability,
    };
}