// backend/services/reliability/serviceInterruptionEligibilityService.js


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

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


function normalizeId(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value === "object" &&
        value._id
    ) {
        return String(
            value._id
        );
    }

    return String(value);
}


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


/*
|--------------------------------------------------------------------------
| Resolve event end
|--------------------------------------------------------------------------
*/

function resolveEventEnd(
    event,
    periodEnd
) {
    if (
        event?.restorationTime
    ) {
        return asDate(
            event.restorationTime
        );
    }


    if (
        event?.status ===
        "OPEN"
    ) {
        return asDate(
            periodEnd
        );
    }


    return (
        asDate(
            event?.endTime
        ) ??
        null
    );
}


/*
|--------------------------------------------------------------------------
| Window overlap
|--------------------------------------------------------------------------
|
| Reporting window uses half-open semantics:
|
| [periodStart, periodEnd)
|--------------------------------------------------------------------------
*/

function overlapsWindow({
    start,
    end,
    periodStart,
    periodEnd,
}) {
    const eventStart =
        asDate(start);

    const eventEnd =
        asDate(end);

    const windowStart =
        asDate(periodStart);

    const windowEnd =
        asDate(periodEnd);


    if (
        !eventStart ||
        !eventEnd ||
        !windowStart ||
        !windowEnd ||
        eventEnd <=
            eventStart ||
        windowEnd <=
            windowStart
    ) {
        return false;
    }


    return (
        eventStart <
            windowEnd &&
        eventEnd >
            windowStart
    );
}


/*
|--------------------------------------------------------------------------
| Started-in-period semantics
|--------------------------------------------------------------------------
*/

function startsInWindow({
    start,
    periodStart,
    periodEnd,
}) {
    const eventStart =
        asDate(start);

    const windowStart =
        asDate(periodStart);

    const windowEnd =
        asDate(periodEnd);


    if (
        !eventStart ||
        !windowStart ||
        !windowEnd
    ) {
        return false;
    }


    return (
        eventStart >=
            windowStart &&
        eventStart <
            windowEnd
    );
}


/*
|--------------------------------------------------------------------------
| Clip interruption interval
|--------------------------------------------------------------------------
*/

function clipToWindow({
    start,
    end,
    periodStart,
    periodEnd,
}) {
    const eventStart =
        asDate(start);

    const eventEnd =
        asDate(end);

    const windowStart =
        asDate(periodStart);

    const windowEnd =
        asDate(periodEnd);


    if (
        !overlapsWindow({
            start:
                eventStart,

            end:
                eventEnd,

            periodStart:
                windowStart,

            periodEnd:
                windowEnd,
        })
    ) {
        return null;
    }


    const clippedStart =
        new Date(
            Math.max(
                eventStart
                    .getTime(),

                windowStart
                    .getTime()
            )
        );


    const clippedEnd =
        new Date(
            Math.min(
                eventEnd
                    .getTime(),

                windowEnd
                    .getTime()
            )
        );


    return {
        start:
            clippedStart,

        end:
            clippedEnd,

        durationSeconds:
            (
                clippedEnd -
                clippedStart
            ) /
            1000,
    };
}


/*
|--------------------------------------------------------------------------
| Eligibility reason codes
|--------------------------------------------------------------------------
*/

export const SERVICE_INTERRUPTION_REASON = {
    ELIGIBLE:
        "ELIGIBLE",

    INVALID_REPORTING_WINDOW:
        "INVALID_REPORTING_WINDOW",

    NOT_GRID_OUTAGE:
        "NOT_GRID_OUTAGE",

    NOT_DERIVED_EVENT:
        "NOT_DERIVED_EVENT",

    LOAD_INTERRUPTION_NOT_CONFIRMED:
        "LOAD_INTERRUPTION_NOT_CONFIRMED",

    SAIDI_SAIFI_NOT_ENABLED:
        "SAIDI_SAIFI_NOT_ENABLED",

    INSTALLATION_UNAVAILABLE:
        "INSTALLATION_UNAVAILABLE",

    INVALID_EVENT_START:
        "INVALID_EVENT_START",

    INVALID_EVENT_END:
        "INVALID_EVENT_END",

    INVALID_EVENT_INTERVAL:
        "INVALID_EVENT_INTERVAL",

    OUTSIDE_REPORTING_WINDOW:
        "OUTSIDE_REPORTING_WINDOW",
};


/*
|--------------------------------------------------------------------------
| Evaluate one interruption
|--------------------------------------------------------------------------
*/

export function evaluateServiceInterruptionEligibility({
    event,

    periodStart,
    periodEnd,
} = {}) {
    const windowStart =
        asDate(
            periodStart
        );

    const windowEnd =
        asDate(
            periodEnd
        );


    if (
        !windowStart ||
        !windowEnd ||
        windowEnd <=
            windowStart
    ) {
        return {
            eligible:
                false,

            reason:
                SERVICE_INTERRUPTION_REASON
                    .INVALID_REPORTING_WINDOW,
        };
    }


    if (
        event?.eventType !==
        "GRID_OUTAGE"
    ) {
        return {
            eligible:
                false,

            reason:
                SERVICE_INTERRUPTION_REASON
                    .NOT_GRID_OUTAGE,
        };
    }


    if (
        event?.source !==
        "DERIVED"
    ) {
        return {
            eligible:
                false,

            reason:
                SERVICE_INTERRUPTION_REASON
                    .NOT_DERIVED_EVENT,
        };
    }


    if (
        event?.raw
            ?.loadInterruptionConfirmed !==
        true
    ) {
        return {
            eligible:
                false,

            reason:
                SERVICE_INTERRUPTION_REASON
                    .LOAD_INTERRUPTION_NOT_CONFIRMED,
        };
    }


    if (
        event?.raw
            ?.eligibleForSaidiSaifi !==
        true
    ) {
        return {
            eligible:
                false,

            reason:
                SERVICE_INTERRUPTION_REASON
                    .SAIDI_SAIFI_NOT_ENABLED,
        };
    }


    const installationId =
        normalizeId(
            event?.installation
        );


    if (!installationId) {
        return {
            eligible:
                false,

            reason:
                SERVICE_INTERRUPTION_REASON
                    .INSTALLATION_UNAVAILABLE,
        };
    }


    const originalStart =
        asDate(
            event?.startTime
        );


    if (!originalStart) {
        return {
            eligible:
                false,

            reason:
                SERVICE_INTERRUPTION_REASON
                    .INVALID_EVENT_START,
        };
    }


    const originalEnd =
        resolveEventEnd(
            event,
            windowEnd
        );


    if (!originalEnd) {
        return {
            eligible:
                false,

            reason:
                SERVICE_INTERRUPTION_REASON
                    .INVALID_EVENT_END,
        };
    }


    if (
        originalEnd <=
        originalStart
    ) {
        return {
            eligible:
                false,

            reason:
                SERVICE_INTERRUPTION_REASON
                    .INVALID_EVENT_INTERVAL,
        };
    }


    const clipped =
        clipToWindow({
            start:
                originalStart,

            end:
                originalEnd,

            periodStart:
                windowStart,

            periodEnd:
                windowEnd,
        });


    if (!clipped) {
        return {
            eligible:
                false,

            reason:
                SERVICE_INTERRUPTION_REASON
                    .OUTSIDE_REPORTING_WINDOW,
        };
    }


    const startedInPeriod =
        startsInWindow({
            start:
                originalStart,

            periodStart:
                windowStart,

            periodEnd:
                windowEnd,
        });


    const affectedCustomers =
        finiteNonNegativeInteger(
            event
                ?.affectedCustomers
        );


    return {
        eligible:
            true,

        reason:
            SERVICE_INTERRUPTION_REASON
                .ELIGIBLE,

        installationId,

        originalStart,

        originalEnd,

        clippedStart:
            clipped.start,

        clippedEnd:
            clipped.end,

        interruptionSeconds:
            clipped
                .durationSeconds,

        interruptionHours:
            clipped
                .durationSeconds /
            3600,

        activeInPeriod:
            true,

        startedInPeriod,

        affectedCustomers,

        customerCountAvailable:
            affectedCustomers !==
            null,

        sourceEventId:
            normalizeId(
                event?._id
            ),
    };
}


/*
|--------------------------------------------------------------------------
| Evaluate collection
|--------------------------------------------------------------------------
*/

export function evaluateServiceInterruptions({
    events = [],

    periodStart,
    periodEnd,
} = {}) {
    const evaluations =
        events.map(
            (event) =>
                evaluateServiceInterruptionEligibility({
                    event,

                    periodStart,
                    periodEnd,
                })
        );


    const eligible =
        evaluations.filter(
            (evaluation) =>
                evaluation
                    .eligible ===
                true
        );


    const rejected =
        evaluations.filter(
            (evaluation) =>
                evaluation
                    .eligible !==
                true
        );


    const activeInterruptions =
        eligible.filter(
            (evaluation) =>
                evaluation
                    .activeInPeriod ===
                true
        );


    const startedInterruptions =
        eligible.filter(
            (evaluation) =>
                evaluation
                    .startedInPeriod ===
                true
        );


    const rejectionCounts =
        rejected.reduce(
            (
                counts,
                evaluation
            ) => {
                const reason =
                    evaluation
                        .reason ??
                    "UNKNOWN";

                counts[
                    reason
                ] =
                    (
                        counts[
                            reason
                        ] ??
                        0
                    ) +
                    1;

                return counts;
            },
            {}
        );


    return {
        totalEventCount:
            events.length,

        eligibleEventCount:
            eligible.length,

        rejectedEventCount:
            rejected.length,

        activeInterruptionCount:
            activeInterruptions.length,

        startedInterruptionCount:
            startedInterruptions.length,

        eligible,

        rejected,

        rejectionCounts,
    };
}