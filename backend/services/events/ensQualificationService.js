// backend/services/events/ensQualificationService.js

const DEFAULT_CONFIG = {
    /*
     * A baseline based on only one or two measurements
     * is too weak for production ENS calculations.
     */
    minimumBaselineSamples: 3,

    /*
     * At least two load observations during an interruption
     * are required before time-integration is considered.
     */
    minimumOutageSamples: 2,

    /*
     * A reduction below this level is treated as ordinary
     * demand variation unless stronger interruption evidence exists.
     */
    minimumLoadReductionFraction: 0.20,

    /*
     * If output power is near zero for a substantial portion
     * of the event, this provides stronger interruption evidence.
     */
    nearZeroPowerFractionThreshold: 0.50,

    /*
     * Maximum acceptable telemetry gap relative to event duration.
     *
     * If the largest ACTUAL telemetry gap is more than 60%
     * of the event duration, coverage is considered weak.
     */
    maximumGapFraction: 0.60,
};


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function finite(value) {
    return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(
            Number(value)
        )
    );
}


function asDate(value) {
    if (!value) {
        return null;
    }

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


/*
|--------------------------------------------------------------------------
| Actual telemetry sample-gap calculation
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Coverage must be calculated from ACTUAL outage telemetry timestamps.
|
| We deliberately do NOT use generated ENS integration intervals here,
| because those intervals may be synthesized from the event boundaries
| and could falsely make sparse telemetry appear well covered.
|--------------------------------------------------------------------------
*/

function calculateMaximumSampleGapFraction(
    timestamps = [],
    eventStart,
    eventEnd
) {
    const start =
        asDate(eventStart);

    const end =
        asDate(eventEnd);


    if (
        !start ||
        !end ||
        end <= start
    ) {
        return null;
    }


    const eventDurationMs =
        end.getTime() -
        start.getTime();


    const points =
        (timestamps ?? [])
            .map(asDate)
            .filter(Boolean)
            .filter(
                (timestamp) =>
                    timestamp >= start &&
                    timestamp <= end
            )
            .sort(
                (a, b) =>
                    a - b
            );


    /*
     * No actual telemetry points inside the outage interval
     * means 100% of the event is effectively uncovered.
     */
    if (!points.length) {
        return 1;
    }


    /*
     * Start with the gap from the event start
     * to the first actual outage sample.
     */
    let maximumGapMs =
        points[0].getTime() -
        start.getTime();


    /*
     * Measure every real sample-to-sample gap.
     */
    for (
        let index = 1;
        index < points.length;
        index += 1
    ) {
        maximumGapMs =
            Math.max(
                maximumGapMs,

                points[index].getTime() -
                points[index - 1].getTime()
            );
    }


    /*
     * Also measure the final gap from the last
     * actual sample to restoration/end time.
     */
    maximumGapMs =
        Math.max(
            maximumGapMs,

            end.getTime() -
            points[
                points.length - 1
            ].getTime()
        );


    return (
        maximumGapMs /
        eventDurationMs
    );
}


/*
|--------------------------------------------------------------------------
| ENS qualification
|--------------------------------------------------------------------------
*/

export function qualifyEnsEstimate({
    event,
    estimate,
    config = {},
} = {}) {
    const settings = {
        ...DEFAULT_CONFIG,
        ...config,
    };


    /*
    |--------------------------------------------------------------------------
    | Event lifecycle
    |--------------------------------------------------------------------------
    */

    if (
        !event ||
        event.status !==
        "RESTORED"
    ) {
        return {
            qualified:
                false,

            status:
                "EVENT_NOT_RESTORED",

            ensKwh:
                null,

            eligibleForEns:
                false,

            loadInterruptionConfirmed:
                false,

            reason:
                "ENS cannot be finalized for an event that has not been restored.",
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Estimator availability
    |--------------------------------------------------------------------------
    */

    if (
        !estimate ||
        estimate.status !==
        "ESTIMATED"
    ) {
        return {
            qualified:
                false,

            status:
                estimate?.status ??
                "NO_ESTIMATE",

            ensKwh:
                null,

            eligibleForEns:
                false,

            loadInterruptionConfirmed:
                false,

            reason:
                estimate?.reason ??
                "No usable ENS estimate is available.",
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Baseline sufficiency
    |--------------------------------------------------------------------------
    */

    const baselineSampleCount =
        Number(
            estimate.baselineSampleCount ??
            0
        );


    if (
        baselineSampleCount <
        settings.minimumBaselineSamples
    ) {
        return {
            qualified:
                false,

            status:
                "INSUFFICIENT_BASELINE",

            ensKwh:
                null,

            eligibleForEns:
                false,

            loadInterruptionConfirmed:
                false,

            reason:
                `At least ${settings.minimumBaselineSamples} pre-event load samples are required.`,

            baselineSampleCount,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Outage telemetry sufficiency
    |--------------------------------------------------------------------------
    */

    const outageSampleCount =
        Number(
            estimate.outageSampleCount ??
            0
        );


    if (
        outageSampleCount <
        settings.minimumOutageSamples
    ) {
        return {
            qualified:
                false,

            status:
                "INSUFFICIENT_OUTAGE_COVERAGE",

            ensKwh:
                null,

            eligibleForEns:
                false,

            loadInterruptionConfirmed:
                false,

            reason:
                `At least ${settings.minimumOutageSamples} interruption-period load samples are required.`,

            outageSampleCount,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Load interruption evidence
    |--------------------------------------------------------------------------
    */

    const reductionFraction =
        finite(
            estimate.reductionFraction
        )
            ? Number(
                estimate.reductionFraction
            )
            : null;


    const nearZeroFraction =
        finite(
            estimate.nearZeroFraction
        )
            ? Number(
                estimate.nearZeroFraction
            )
            : 0;


    const reductionEvidence =
        reductionFraction !== null &&
        reductionFraction >=
        settings
            .minimumLoadReductionFraction;


    const nearZeroEvidence =
        nearZeroFraction >=
        settings
            .nearZeroPowerFractionThreshold;


    const loadInterruptionConfirmed =
        reductionEvidence ||
        nearZeroEvidence;


    if (
        !loadInterruptionConfirmed
    ) {
        return {
            qualified:
                false,

            status:
                "LOAD_CONTINUITY_OBSERVED",

            /*
             * Important:
             *
             * Do not persist the raw baseline difference as ENS.
             * The load remained substantially supplied.
             */
            ensKwh:
                null,

            eligibleForEns:
                false,

            loadInterruptionConfirmed:
                false,

            rawEstimatedEnsKwh:
                finite(
                    estimate.ensKwh
                )
                    ? Number(
                        estimate.ensKwh
                    )
                    : null,

            reductionFraction,

            nearZeroFraction,

            baselineSampleCount,

            outageSampleCount,

            reason:
                "Observed AC consumption remained substantially supplied; baseline variation is not classified as energy not supplied.",
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Actual telemetry coverage
    |--------------------------------------------------------------------------
    |
    | Use the real event boundaries from the persisted outage event.
    |
    | Do not depend on estimate.eventStart / estimate.eventEnd because
    | those are estimator metadata and may not exist in every result shape.
    |--------------------------------------------------------------------------
    */

    const eventStart =
        event.startTime;

    const eventEnd =
        event.restorationTime ??
        event.endTime;


    const maximumGapFraction =
        calculateMaximumSampleGapFraction(
            estimate.outageSampleTimestamps ??
                [],
            eventStart,
            eventEnd
        );


    if (
        maximumGapFraction !==
            null &&
        maximumGapFraction >
            settings.maximumGapFraction
    ) {
        return {
            qualified:
                false,

            status:
                "INSUFFICIENT_TIME_COVERAGE",

            ensKwh:
                null,

            eligibleForEns:
                false,

            /*
             * Interruption evidence exists, but temporal coverage
             * is not sufficient to defend the calculated energy.
             */
            loadInterruptionConfirmed:
                true,

            rawEstimatedEnsKwh:
                finite(
                    estimate.ensKwh
                )
                    ? Number(
                        estimate.ensKwh
                    )
                    : null,

            reductionFraction,

            nearZeroFraction,

            baselineSampleCount,

            outageSampleCount,

            maximumGapFraction,

            reason:
                "Load interruption evidence exists, but actual telemetry coverage is too sparse for a defensible ENS integration.",
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Qualified ENS value validation
    |--------------------------------------------------------------------------
    */

    if (
        !finite(
            estimate.ensKwh
        )
    ) {
        return {
            qualified:
                false,

            status:
                "INVALID_ENS_VALUE",

            ensKwh:
                null,

            eligibleForEns:
                false,

            loadInterruptionConfirmed:
                true,

            reductionFraction,

            nearZeroFraction,

            baselineSampleCount,

            outageSampleCount,

            maximumGapFraction,

            reason:
                "The calculated ENS value is not finite.",
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Qualified ENS
    |--------------------------------------------------------------------------
    */

    const qualifiedEnsKwh =
        Math.max(
            0,
            Number(
                estimate.ensKwh
            )
        );


    return {
        qualified:
            true,

        status:
            "QUALIFIED_ESTIMATE",

        ensKwh:
            qualifiedEnsKwh,

        eligibleForEns:
            true,

        loadInterruptionConfirmed:
            true,

        estimated:
            true,

        method:
            estimate.method,

        expectedLoadWatts:
            estimate.expectedLoadWatts,

        averageServedLoadWatts:
            estimate.averageServedLoadWatts,

        reductionFraction,

        nearZeroFraction,

        baselineSampleCount,

        outageSampleCount,

        maximumGapFraction,

        reason:
            "Load interruption evidence and actual telemetry coverage satisfy the ENS qualification rules.",
    };
}