// services/engineering/gridInterruptionIntegrationService.js

import {
    GRID_SOURCE_STATE,
} from "./gridSourceStateService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6F
| Grid Interruption / Restoration Integration
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Integrate the already-established Phase 7 grid-source OutageEvent
| lifecycle with Phase 8.6C qualified source-state intervals.
|
| IMPORTANT ARCHITECTURAL BOUNDARY
|
| Phase 7 remains authoritative for persisted grid interruption events.
|
| This service DOES NOT:
|
| - detect and persist a second set of outage events
| - modify OutageEvent records
| - treat GENERATOR as customer interruption
| - treat INVERTING as customer interruption
| - treat NOT_AVAILABLE as customer interruption
| - infer grid electrical absence
| - infer customer/service interruption
| - enable SAIDI/SAIFI
| - infer ENS
| - infer affected customers
|
| It only:
|
| - consumes Phase 7 derived grid-source events
| - clips their exposure to a reporting window
| - distinguishes OPEN and RESTORED lifecycle state
| - optionally corroborates departure/restoration timestamps with
|   qualified Phase 8.6C source-state intervals
|--------------------------------------------------------------------------
*/


export const GRID_INTERRUPTION_INTEGRATION_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const GRID_INTERRUPTION_INTEGRATION_REASON =
    Object.freeze({
        GRID_INTERRUPTION_INTEGRATION_QUALIFIED:
            "GRID_INTERRUPTION_INTEGRATION_QUALIFIED",

        GRID_INTERRUPTION_INTEGRATION_PARTIAL:
            "GRID_INTERRUPTION_INTEGRATION_PARTIAL",

        NO_PHASE7_GRID_EVENTS:
            "NO_PHASE7_GRID_EVENTS",

        NO_GRID_EVENT_OR_SOURCE_EVIDENCE:
            "NO_GRID_EVENT_OR_SOURCE_EVIDENCE",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",

        NO_EVENTS_IN_REPORTING_WINDOW:
            "NO_EVENTS_IN_REPORTING_WINDOW",
    });


export const GRID_EVENT_LIFECYCLE_STATUS =
    Object.freeze({
        OPEN:
            "OPEN",

        RESTORED:
            "RESTORED",
    });


export const GRID_EVENT_CORROBORATION_STATUS =
    Object.freeze({
        CORROBORATED:
            "CORROBORATED",

        PARTIALLY_CORROBORATED:
            "PARTIALLY_CORROBORATED",

        NOT_CORROBORATED:
            "NOT_CORROBORATED",

        NOT_OBSERVABLE:
            "NOT_OBSERVABLE",
    });


export const GRID_EVENT_CORROBORATION_REASON =
    Object.freeze({
        DEPARTURE_AND_RESTORATION_CORROBORATED:
            "DEPARTURE_AND_RESTORATION_CORROBORATED",

        DEPARTURE_CORROBORATED:
            "DEPARTURE_CORROBORATED",

        DEPARTURE_NOT_CORROBORATED:
            "DEPARTURE_NOT_CORROBORATED",

        RESTORATION_NOT_CORROBORATED:
            "RESTORATION_NOT_CORROBORATED",

        SOURCE_STATE_NOT_OBSERVABLE:
            "SOURCE_STATE_NOT_OBSERVABLE",

        SOURCE_STATE_AMBIGUOUS:
            "SOURCE_STATE_AMBIGUOUS",

        OPEN_EVENT_DEPARTURE_CORROBORATED:
            "OPEN_EVENT_DEPARTURE_CORROBORATED",

        OPEN_EVENT_NOT_CORROBORATED:
            "OPEN_EVENT_NOT_CORROBORATED",
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function asDate(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;
    }


    const date =
        value instanceof Date
            ? new Date(
                value.getTime()
            )
            : new Date(
                value
            );


    return Number.isFinite(
        date.getTime()
    )
        ? date
        : null;
}


function finiteNumber(
    value
) {

    if (
        value === null ||
        value === undefined ||
        typeof value ===
            "boolean" ||
        (
            typeof value ===
                "string" &&
            value.trim() ===
                ""
        )
    ) {

        return null;
    }


    const numeric =
        typeof value ===
            "number"
            ? value
            : Number(
                value
            );


    return Number.isFinite(
        numeric
    )
        ? numeric
        : null;
}


function normalizeId(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;
    }


    const normalized =
        String(
            value
        )
            .trim();


    return normalized ||
        null;
}


/*
|--------------------------------------------------------------------------
| Phase 7 event identification
|--------------------------------------------------------------------------
|
| This exact semantic signature is already established by Phase 7.
|--------------------------------------------------------------------------
*/

export function isPhase7GridSourceEvent(
    event
) {

    return (
        event?.eventType ===
            "GRID_OUTAGE" &&
        event?.source ===
            "DERIVED" &&
        event?.detectionMethod ===
            "ACTIVE_SOURCE_TRANSITION"
    );
}


/*
|--------------------------------------------------------------------------
| Phase 7 event normalization
|--------------------------------------------------------------------------
*/

export function normalizePhase7GridEvents(
    events = []
) {

    return events
        .filter(
            isPhase7GridSourceEvent
        )
        .map(
            (
                event
            ) => {

                const startTime =
                    asDate(
                        event
                            ?.startTime
                    );


                if (
                    !startTime
                ) {

                    return null;
                }


                const restorationTime =
                    asDate(
                        event
                            ?.restorationTime
                    );


                const endTime =
                    asDate(
                        event
                            ?.endTime
                    );


                const status =
                    event?.status ===
                        GRID_EVENT_LIFECYCLE_STATUS
                            .RESTORED
                        ? GRID_EVENT_LIFECYCLE_STATUS
                            .RESTORED
                        : event?.status ===
                            GRID_EVENT_LIFECYCLE_STATUS
                                .OPEN
                            ? GRID_EVENT_LIFECYCLE_STATUS
                                .OPEN
                            : null;


                if (
                    !status
                ) {

                    return null;
                }


                if (
                    status ===
                        GRID_EVENT_LIFECYCLE_STATUS
                            .RESTORED &&
                    !restorationTime &&
                    !endTime
                ) {

                    return null;
                }


                const effectiveRestorationTime =
                    restorationTime ??
                    (
                        status ===
                            GRID_EVENT_LIFECYCLE_STATUS
                                .RESTORED
                            ? endTime
                            : null
                    );


                if (
                    effectiveRestorationTime &&
                    effectiveRestorationTime <=
                        startTime
                ) {

                    return null;
                }


                return {
                    sourceEvent:
                        event,

                    eventId:
                        normalizeId(
                            event?._id
                        ),

                    installationId:
                        normalizeId(
                            event
                                ?.installation
                        ),

                    siteId:
                        normalizeId(
                            event
                                ?.site
                        ),

                    eventType:
                        "GRID_OUTAGE",

                    source:
                        "DERIVED",

                    detectionMethod:
                        "ACTIVE_SOURCE_TRANSITION",

                    status,

                    startTime,

                    detectionTime:
                        asDate(
                            event
                                ?.detectionTime
                        ) ??
                        startTime,

                    restorationTime:
                        effectiveRestorationTime,

                    endTime:
                        endTime ??
                        effectiveRestorationTime,

                    persistedDurationSeconds:
                        finiteNumber(
                            event
                                ?.durationSeconds
                        ),

                    affectedLoadKw:
                        finiteNumber(
                            event
                                ?.affectedLoadKw
                        ),

                    energyNotSuppliedKwh:
                        finiteNumber(
                            event
                                ?.energyNotSuppliedKwh
                        ),

                    affectedCustomers:
                        finiteNumber(
                            event
                                ?.affectedCustomers
                        ),

                    gridSourceInterrupted:
                        event
                            ?.raw
                            ?.gridSourceInterrupted ===
                        true,

                    gridElectricalAbsenceConfirmed:
                        event
                            ?.raw
                            ?.gridElectricalAbsenceConfirmed ===
                        true,

                    loadInterruptionConfirmed:
                        event
                            ?.raw
                            ?.loadInterruptionConfirmed ===
                        true,

                    eligibleForGridAvailability:
                        event
                            ?.raw
                            ?.eligibleForGridAvailability ===
                        true,

                    eligibleForSaidiSaifi:
                        event
                            ?.raw
                            ?.eligibleForSaidiSaifi ===
                        true,

                    eligibleForEns:
                        event
                            ?.raw
                            ?.eligibleForEns ===
                        true,
                };
            }
        )
        .filter(
            Boolean
        )
        .sort(
            (
                a,
                b
            ) =>
                a.startTime -
                b.startTime
        );
}


/*
|--------------------------------------------------------------------------
| Source-state normalization
|--------------------------------------------------------------------------
*/

export function normalizeGridSourceIntervals(
    intervals = []
) {

    return intervals
        .map(
            (
                interval
            ) => {

                const start =
                    asDate(
                        interval
                            ?.start
                    );


                const end =
                    asDate(
                        interval
                            ?.end
                    );


                if (
                    !start ||
                    !end ||
                    start >=
                        end
                ) {

                    return null;
                }


                const state =
                    Object.values(
                        GRID_SOURCE_STATE
                    ).includes(
                        interval
                            ?.state
                    )
                        ? interval
                            .state
                        : GRID_SOURCE_STATE
                            .UNKNOWN;


                return {
                    ...interval,

                    start,

                    end,

                    state,

                    qualified:
                        interval
                            ?.qualified ===
                            true,
                };
            }
        )
        .filter(
            Boolean
        )
        .sort(
            (
                a,
                b
            ) =>
                a.start -
                b.start
        );
}


/*
|--------------------------------------------------------------------------
| Resolve qualified source-state at one timestamp
|--------------------------------------------------------------------------
|
| Interval semantics:
|
|     [start,end)
|
| Multiple contradictory covering intervals are ambiguous.
|--------------------------------------------------------------------------
*/

export function resolveQualifiedGridSourceAtTimestamp({
    timestamp,
    sourceStateIntervals = [],
} = {}) {

    const target =
        asDate(
            timestamp
        );


    if (
        !target
    ) {

        return {
            observable:
                false,

            ambiguous:
                false,

            state:
                GRID_SOURCE_STATE
                    .UNKNOWN,

            interval:
                null,
        };
    }


    const covering =
        sourceStateIntervals
            .filter(
                (
                    interval
                ) =>
                    target >=
                        interval.start &&
                    target <
                        interval.end
            );


    if (
        covering.length ===
        0
    ) {

        return {
            observable:
                false,

            ambiguous:
                false,

            state:
                GRID_SOURCE_STATE
                    .UNKNOWN,

            interval:
                null,
        };
    }


    const qualifiedCovering =
        covering.filter(
            (
                interval
            ) =>
                interval.qualified ===
                true
        );


    if (
        qualifiedCovering.length ===
        0
    ) {

        return {
            observable:
                false,

            ambiguous:
                false,

            state:
                GRID_SOURCE_STATE
                    .UNKNOWN,

            interval:
                null,
        };
    }


    const states =
        new Set(
            qualifiedCovering.map(
                (
                    interval
                ) =>
                    interval.state
            )
        );


    if (
        states.size >
        1
    ) {

        return {
            observable:
                false,

            ambiguous:
                true,

            state:
                GRID_SOURCE_STATE
                    .UNKNOWN,

            interval:
                null,
        };
    }


    return {
        observable:
            true,

        ambiguous:
            false,

        state:
            qualifiedCovering[0]
                .state,

        interval:
            qualifiedCovering[0],
    };
}


/*
|--------------------------------------------------------------------------
| Phase 7 ↔ Phase 8.6C corroboration
|--------------------------------------------------------------------------
|
| Departure:
|
| A Phase 7 grid-source interruption start should correspond to a
| qualified non-GRID source state.
|
| Restoration:
|
| A Phase 7 restoration timestamp should correspond to qualified GRID.
|
| IMPORTANT:
|
| A non-GRID state corroborates only GRID-source departure.
| It does NOT establish customer interruption.
|--------------------------------------------------------------------------
*/

export function corroborateGridEventWithSourceState({
    event,
    sourceStateIntervals = [],
} = {}) {

    const departure =
        resolveQualifiedGridSourceAtTimestamp({
            timestamp:
                event
                    ?.startTime,

            sourceStateIntervals,
        });


    const departureCorroborated =
        departure.observable ===
            true &&
        departure.state !==
            GRID_SOURCE_STATE
                .GRID &&
        departure.state !==
            GRID_SOURCE_STATE
                .UNKNOWN;


    if (
        event?.status ===
        GRID_EVENT_LIFECYCLE_STATUS
            .OPEN
    ) {

        if (
            departure.ambiguous
        ) {

            return {
                status:
                    GRID_EVENT_CORROBORATION_STATUS
                        .NOT_CORROBORATED,

                reason:
                    GRID_EVENT_CORROBORATION_REASON
                        .SOURCE_STATE_AMBIGUOUS,

                departure,

                restoration:
                    null,

                departureCorroborated:
                    false,

                restorationCorroborated:
                    null,
            };
        }


        if (
            departureCorroborated
        ) {

            return {
                status:
                    GRID_EVENT_CORROBORATION_STATUS
                        .CORROBORATED,

                reason:
                    GRID_EVENT_CORROBORATION_REASON
                        .OPEN_EVENT_DEPARTURE_CORROBORATED,

                departure,

                restoration:
                    null,

                departureCorroborated:
                    true,

                restorationCorroborated:
                    null,
            };
        }


        if (
            departure.observable !==
            true
        ) {

            return {
                status:
                    GRID_EVENT_CORROBORATION_STATUS
                        .NOT_OBSERVABLE,

                reason:
                    GRID_EVENT_CORROBORATION_REASON
                        .SOURCE_STATE_NOT_OBSERVABLE,

                departure,

                restoration:
                    null,

                departureCorroborated:
                    false,

                restorationCorroborated:
                    null,
            };
        }


        return {
            status:
                GRID_EVENT_CORROBORATION_STATUS
                    .NOT_CORROBORATED,

            reason:
                GRID_EVENT_CORROBORATION_REASON
                    .OPEN_EVENT_NOT_CORROBORATED,

            departure,

            restoration:
                null,

            departureCorroborated:
                false,

            restorationCorroborated:
                null,
        };
    }


    const restoration =
        resolveQualifiedGridSourceAtTimestamp({
            timestamp:
                event
                    ?.restorationTime,

            sourceStateIntervals,
        });


    const restorationCorroborated =
        restoration.observable ===
            true &&
        restoration.state ===
            GRID_SOURCE_STATE
                .GRID;


    if (
        departure.ambiguous ||
        restoration.ambiguous
    ) {

        return {
            status:
                GRID_EVENT_CORROBORATION_STATUS
                    .NOT_CORROBORATED,

            reason:
                GRID_EVENT_CORROBORATION_REASON
                    .SOURCE_STATE_AMBIGUOUS,

            departure,

            restoration,

            departureCorroborated:
                false,

            restorationCorroborated:
                false,
        };
    }


    if (
        departureCorroborated &&
        restorationCorroborated
    ) {

        return {
            status:
                GRID_EVENT_CORROBORATION_STATUS
                    .CORROBORATED,

            reason:
                GRID_EVENT_CORROBORATION_REASON
                    .DEPARTURE_AND_RESTORATION_CORROBORATED,

            departure,

            restoration,

            departureCorroborated:
                true,

            restorationCorroborated:
                true,
        };
    }


    if (
        departureCorroborated &&
        !restorationCorroborated
    ) {

        return {
            status:
                restoration.observable ===
                    true
                    ? GRID_EVENT_CORROBORATION_STATUS
                        .PARTIALLY_CORROBORATED
                    : GRID_EVENT_CORROBORATION_STATUS
                        .PARTIALLY_CORROBORATED,

            reason:
                GRID_EVENT_CORROBORATION_REASON
                    .RESTORATION_NOT_CORROBORATED,

            departure,

            restoration,

            departureCorroborated:
                true,

            restorationCorroborated:
                false,
        };
    }


    if (
        !departureCorroborated &&
        restorationCorroborated
    ) {

        return {
            status:
                GRID_EVENT_CORROBORATION_STATUS
                    .PARTIALLY_CORROBORATED,

            reason:
                GRID_EVENT_CORROBORATION_REASON
                    .DEPARTURE_NOT_CORROBORATED,

            departure,

            restoration,

            departureCorroborated:
                false,

            restorationCorroborated:
                true,
        };
    }


    if (
        departure.observable !==
            true &&
        restoration.observable !==
            true
    ) {

        return {
            status:
                GRID_EVENT_CORROBORATION_STATUS
                    .NOT_OBSERVABLE,

            reason:
                GRID_EVENT_CORROBORATION_REASON
                    .SOURCE_STATE_NOT_OBSERVABLE,

            departure,

            restoration,

            departureCorroborated:
                false,

            restorationCorroborated:
                false,
        };
    }


    return {
        status:
            GRID_EVENT_CORROBORATION_STATUS
                .NOT_CORROBORATED,

        reason:
            GRID_EVENT_CORROBORATION_REASON
                .DEPARTURE_NOT_CORROBORATED,

        departure,

        restoration,

        departureCorroborated:
            false,

        restorationCorroborated:
            false,
    };
}


/*
|--------------------------------------------------------------------------
| Reporting-window clipping
|--------------------------------------------------------------------------
*/

export function clipGridEventToReportingWindow({
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

        return null;
    }


    const eventStart =
        asDate(
            event
                ?.startTime
        );


    if (
        !eventStart
    ) {

        return null;
    }


    let eventEnd =
        null;


    if (
        event?.status ===
        GRID_EVENT_LIFECYCLE_STATUS
            .RESTORED
    ) {

        eventEnd =
            asDate(
                event
                    ?.restorationTime
            ) ??
            asDate(
                event
                    ?.endTime
            );
    }


    if (
        event?.status ===
        GRID_EVENT_LIFECYCLE_STATUS
            .OPEN
    ) {

        /*
         * OPEN event contributes only observed reporting-window exposure.
         * This does NOT mark the event restored.
         */

        eventEnd =
            windowEnd;
    }


    if (
        !eventEnd ||
        eventEnd <=
            eventStart
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


    if (
        clippedEnd <=
        clippedStart
    ) {

        return null;
    }


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

        durationHours:
            (
                clippedEnd -
                clippedStart
            ) /
            3_600_000,

        carriedIntoWindow:
            eventStart <
            windowStart,

        startedInWindow:
            eventStart >=
                windowStart &&
            eventStart <
                windowEnd,

        restoredInWindow:
            event
                ?.status ===
                GRID_EVENT_LIFECYCLE_STATUS
                    .RESTORED &&
            event
                ?.restorationTime >=
                windowStart &&
            event
                ?.restorationTime <
                windowEnd,
    };
}


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

function buildSemantics() {

    return {
        phase7EventsAuthoritative:
            true,

        duplicateOutageDetectorCreated:
            false,

        outageEventsModified:
            false,

        sourceStateUsedForCorroboration:
            true,

        gridDepartureMeansGridSourceInterrupted:
            true,

        gridDepartureMeansGridElectricalAbsence:
            false,

        gridDepartureMeansCustomerInterruption:
            false,

        generatorMeansCustomerInterruption:
            false,

        invertingMeansCustomerInterruption:
            false,

        notAvailableMeansCustomerInterruption:
            false,

        gridReturnMeansSourceRestoration:
            true,

        gridReturnMeansCustomerServiceRestored:
            false,

        saidiSaifiEnabledByThisService:
            false,

        ensCalculatedByThisService:
            false,

        affectedCustomersInferred:
            false,

        openEventClippedToReportingEnd:
            true,

        openEventMarkedRestored:
            false,

        reportingIntervalSemantics:
            "[start,end)",
    };
}


/*
|--------------------------------------------------------------------------
| Public integration service
|--------------------------------------------------------------------------
*/

export function calculateGridInterruptionIntegration({
    outageEvents = [],
    sourceStateIntervals = [],
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
            family:
                "GRID_INTERRUPTION_RESTORATION",

            status:
                GRID_INTERRUPTION_INTEGRATION_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_INTERRUPTION_INTEGRATION_REASON
                    .INVALID_REPORTING_WINDOW,

            events:
                [],

            metrics: {
                interruptionCount:
                    null,

                restoredInterruptionCount:
                    null,

                openInterruptionCount:
                    null,

                interruptionHours:
                    null,
            },

            semantics:
                buildSemantics(),
        };
    }


    const normalizedEvents =
        normalizePhase7GridEvents(
            outageEvents
        );


    const normalizedSourceIntervals =
        normalizeGridSourceIntervals(
            sourceStateIntervals
        );


    const qualifiedSourceIntervalCount =
        normalizedSourceIntervals
            .filter(
                (
                    interval
                ) =>
                    interval.qualified ===
                    true
            )
            .length;


    /*
     * No Phase 7 events and no source-state observability:
     * interruption analytics cannot be established.
     */

    if (
        normalizedEvents.length ===
            0 &&
        qualifiedSourceIntervalCount ===
            0
    ) {

        return {
            family:
                "GRID_INTERRUPTION_RESTORATION",

            status:
                GRID_INTERRUPTION_INTEGRATION_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_INTERRUPTION_INTEGRATION_REASON
                    .NO_GRID_EVENT_OR_SOURCE_EVIDENCE,

            events:
                [],

            metrics: {
                interruptionCount:
                    null,

                restoredInterruptionCount:
                    null,

                openInterruptionCount:
                    null,

                interruptionHours:
                    null,
            },

            evidence: {
                inputEventCount:
                    outageEvents.length,

                phase7GridEventCount:
                    0,

                sourceStateIntervalCount:
                    normalizedSourceIntervals
                        .length,

                qualifiedSourceIntervalCount,
            },

            semantics:
                buildSemantics(),
        };
    }


    /*
     * Qualified source-state exposure exists but no persisted Phase 7
     * interruption event overlaps this supplied event set.
     *
     * We may report zero events, but we do NOT manufacture an event from
     * source state here because Phase 7 remains authoritative.
     */

    if (
        normalizedEvents.length ===
        0
    ) {

        return {
            family:
                "GRID_INTERRUPTION_RESTORATION",

            status:
                GRID_INTERRUPTION_INTEGRATION_STATUS
                    .CALCULATED,

            reason:
                GRID_INTERRUPTION_INTEGRATION_REASON
                    .NO_PHASE7_GRID_EVENTS,

            events:
                [],

            metrics: {
                interruptionCount:
                    0,

                restoredInterruptionCount:
                    0,

                openInterruptionCount:
                    0,

                interruptionHours:
                    0,

                serviceInterruptionCount:
                    0,

                saidiSaifiEligibleCount:
                    0,

                ensEligibleCount:
                    0,
            },

            evidence: {
                inputEventCount:
                    outageEvents.length,

                phase7GridEventCount:
                    0,

                sourceStateIntervalCount:
                    normalizedSourceIntervals
                        .length,

                qualifiedSourceIntervalCount,
            },

            semantics:
                buildSemantics(),
        };
    }


    const integratedEvents =
        [];


    for (
        const event
        of normalizedEvents
    ) {

        const clipped =
            clipGridEventToReportingWindow({
                event,

                periodStart:
                    windowStart,

                periodEnd:
                    windowEnd,
            });


        if (
            !clipped
        ) {

            continue;
        }


        const corroboration =
            corroborateGridEventWithSourceState({
                event,

                sourceStateIntervals:
                    normalizedSourceIntervals,
            });


        integratedEvents.push({
            eventId:
                event.eventId,

            installationId:
                event.installationId,

            siteId:
                event.siteId,

            eventType:
                event.eventType,

            status:
                event.status,

            startTime:
                event.startTime,

            restorationTime:
                event.restorationTime,

            reportingInterval:
                clipped,

            corroboration,

            reliabilityFlags: {
                gridSourceInterrupted:
                    event
                        .gridSourceInterrupted,

                gridElectricalAbsenceConfirmed:
                    event
                        .gridElectricalAbsenceConfirmed,

                loadInterruptionConfirmed:
                    event
                        .loadInterruptionConfirmed,

                eligibleForGridAvailability:
                    event
                        .eligibleForGridAvailability,

                eligibleForSaidiSaifi:
                    event
                        .eligibleForSaidiSaifi,

                eligibleForEns:
                    event
                        .eligibleForEns,
            },

            affectedLoadKw:
                event
                    .affectedLoadKw,

            energyNotSuppliedKwh:
                event
                    .energyNotSuppliedKwh,

            affectedCustomers:
                event
                    .affectedCustomers,
        });
    }


    if (
        integratedEvents.length ===
        0
    ) {

        return {
            family:
                "GRID_INTERRUPTION_RESTORATION",

            status:
                GRID_INTERRUPTION_INTEGRATION_STATUS
                    .CALCULATED,

            reason:
                GRID_INTERRUPTION_INTEGRATION_REASON
                    .NO_EVENTS_IN_REPORTING_WINDOW,

            events:
                [],

            metrics: {
                interruptionCount:
                    0,

                restoredInterruptionCount:
                    0,

                openInterruptionCount:
                    0,

                interruptionHours:
                    0,

                serviceInterruptionCount:
                    0,

                saidiSaifiEligibleCount:
                    0,

                ensEligibleCount:
                    0,
            },

            evidence: {
                inputEventCount:
                    outageEvents.length,

                phase7GridEventCount:
                    normalizedEvents
                        .length,

                inWindowEventCount:
                    0,

                qualifiedSourceIntervalCount,
            },

            semantics:
                buildSemantics(),
        };
    }


    const restoredInterruptionCount =
        integratedEvents.filter(
            (
                event
            ) =>
                event.status ===
                GRID_EVENT_LIFECYCLE_STATUS
                    .RESTORED
        ).length;


    const openInterruptionCount =
        integratedEvents.filter(
            (
                event
            ) =>
                event.status ===
                GRID_EVENT_LIFECYCLE_STATUS
                    .OPEN
        ).length;


    const interruptionHours =
        integratedEvents.reduce(
            (
                total,
                event
            ) =>
                total +
                event
                    .reportingInterval
                    .durationHours,
            0
        );


    const serviceInterruptionCount =
        integratedEvents.filter(
            (
                event
            ) =>
                event
                    .reliabilityFlags
                    .loadInterruptionConfirmed ===
                true
        ).length;


    const saidiSaifiEligibleCount =
        integratedEvents.filter(
            (
                event
            ) =>
                event
                    .reliabilityFlags
                    .loadInterruptionConfirmed ===
                    true &&
                event
                    .reliabilityFlags
                    .eligibleForSaidiSaifi ===
                    true
        ).length;


    const ensEligibleCount =
        integratedEvents.filter(
            (
                event
            ) =>
                event
                    .reliabilityFlags
                    .eligibleForEns ===
                    true &&
                event
                    .energyNotSuppliedKwh !==
                    null
        ).length;


    const corroboratedCount =
        integratedEvents.filter(
            (
                event
            ) =>
                event
                    .corroboration
                    .status ===
                GRID_EVENT_CORROBORATION_STATUS
                    .CORROBORATED
        ).length;


    const partiallyCorroboratedCount =
        integratedEvents.filter(
            (
                event
            ) =>
                event
                    .corroboration
                    .status ===
                GRID_EVENT_CORROBORATION_STATUS
                    .PARTIALLY_CORROBORATED
        ).length;


    const notCorroboratedCount =
        integratedEvents.filter(
            (
                event
            ) =>
                event
                    .corroboration
                    .status ===
                GRID_EVENT_CORROBORATION_STATUS
                    .NOT_CORROBORATED
        ).length;


    const notObservableCount =
        integratedEvents.filter(
            (
                event
            ) =>
                event
                    .corroboration
                    .status ===
                GRID_EVENT_CORROBORATION_STATUS
                    .NOT_OBSERVABLE
        ).length;


    /*
     * Phase 7 events remain valid even when current 8.6C telemetry does
     * not fully corroborate them.
     *
     * Corroboration deficiency therefore produces PARTIALLY_CALCULATED,
     * not event deletion.
     */

    const fullyCorroborated =
        corroboratedCount ===
        integratedEvents.length;


    return {
        family:
            "GRID_INTERRUPTION_RESTORATION",

        status:
            fullyCorroborated
                ? GRID_INTERRUPTION_INTEGRATION_STATUS
                    .CALCULATED
                : GRID_INTERRUPTION_INTEGRATION_STATUS
                    .PARTIALLY_CALCULATED,

        reason:
            fullyCorroborated
                ? GRID_INTERRUPTION_INTEGRATION_REASON
                    .GRID_INTERRUPTION_INTEGRATION_QUALIFIED
                : GRID_INTERRUPTION_INTEGRATION_REASON
                    .GRID_INTERRUPTION_INTEGRATION_PARTIAL,

        reportingWindow: {
            start:
                windowStart,

            end:
                windowEnd,

            durationHours:
                (
                    windowEnd -
                    windowStart
                ) /
                3_600_000,

            semantics:
                "[start,end)",
        },

        events:
            integratedEvents,

        metrics: {
            interruptionCount:
                integratedEvents
                    .length,

            restoredInterruptionCount,

            openInterruptionCount,

            interruptionHours,

            serviceInterruptionCount,

            saidiSaifiEligibleCount,

            ensEligibleCount,

            corroboratedCount,

            partiallyCorroboratedCount,

            notCorroboratedCount,

            notObservableCount,
        },

        evidence: {
            inputEventCount:
                outageEvents.length,

            phase7GridEventCount:
                normalizedEvents
                    .length,

            inWindowEventCount:
                integratedEvents
                    .length,

            sourceStateIntervalCount:
                normalizedSourceIntervals
                    .length,

            qualifiedSourceIntervalCount,
        },

        semantics:
            buildSemantics(),
    };
}


export default {
    GRID_INTERRUPTION_INTEGRATION_STATUS,
    GRID_INTERRUPTION_INTEGRATION_REASON,
    GRID_EVENT_LIFECYCLE_STATUS,
    GRID_EVENT_CORROBORATION_STATUS,
    GRID_EVENT_CORROBORATION_REASON,
    isPhase7GridSourceEvent,
    normalizePhase7GridEvents,
    normalizeGridSourceIntervals,
    resolveQualifiedGridSourceAtTimestamp,
    corroborateGridEventWithSourceState,
    clipGridEventToReportingWindow,
    calculateGridInterruptionIntegration,
};