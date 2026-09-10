// services/engineering/gridProductionInterruptionIntegrationService.js

import OutageEvent
    from "../../models/OutageEvent.js";

import {
    GRID_INTERRUPTION_INTEGRATION_STATUS,
    calculateGridInterruptionIntegration,
} from "./gridInterruptionIntegrationService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6H-E
| Production Grid Interruption / Restoration Integration
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Connect the production grid adapter to:
|
|   Phase 7 persisted OutageEvent lifecycle
|                    +
|   Phase 8.6C source-state intervals
|                    ↓
|   Phase 8.6F interruption/restoration integration
|
| AUTHORITATIVE BOUNDARY
|
| Phase 7 remains authoritative for outage-event persistence.
|
| This production service:
|
| - reads existing Phase 7 OutageEvent records
| - selects only Phase 7 GRID_OUTAGE / DERIVED /
|   ACTIVE_SOURCE_TRANSITION events
| - retrieves events overlapping the requested [start,end) window
| - passes them unchanged to validated Phase 8.6F
| - passes sourceState.value.intervals unchanged
| - writes only analytics.interruptions in the production result
|
| It DOES NOT:
|
| - detect a new outage
| - create OutageEvent
| - update OutageEvent
| - delete OutageEvent
| - convert GRID departure into customer interruption
| - interpret GENERATOR as customer interruption
| - interpret INVERTING as customer interruption
| - interpret NOT_AVAILABLE as customer interruption
| - establish electrical grid absence
| - establish SAIDI/SAIFI eligibility
| - establish ENS eligibility
| - infer affected customers
| - calculate ENS
|--------------------------------------------------------------------------
*/


export const GRID_PRODUCTION_INTERRUPTION_PHASE =
    "8.6H-E";


export const GRID_PRODUCTION_INTERRUPTION_INTEGRATION_STATUS =
    Object.freeze({
        INTEGRATED:
            "INTEGRATED",
    });


export const GRID_PRODUCTION_INTERRUPTION_REASON =
    Object.freeze({
        INTEGRATION_EXECUTED:
            "INTEGRATION_EXECUTED",
    });


/*
|--------------------------------------------------------------------------
| Phase 7 authoritative event identity
|--------------------------------------------------------------------------
*/

export const PHASE7_GRID_OUTAGE_IDENTITY =
    Object.freeze({
        eventType:
            "GRID_OUTAGE",

        source:
            "DERIVED",

        detectionMethod:
            "ACTIVE_SOURCE_TRANSITION",

        lifecycleStatuses:
            Object.freeze([
                "OPEN",
                "RESTORED",
            ]),
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


function normalizeId(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }


    if (
        typeof value ===
        "string"
    ) {
        const normalized =
            value.trim();

        return normalized ||
            null;
    }


    if (
        typeof value
            ?.toString ===
        "function"
    ) {
        const normalized =
            value
                .toString()
                .trim();

        return normalized ||
            null;
    }


    return null;
}


function cloneProductionGridResult(
    siteResult
) {
    return {
        ...siteResult,

        installation: {
            ...siteResult.installation,
        },

        reportingWindow: {
            ...siteResult.reportingWindow,
        },

        queryWindow: {
            ...siteResult.queryWindow,
        },

        evidence: {
            ...siteResult.evidence,

            diagnostics: {
                ...siteResult
                    .evidence
                    ?.diagnostics,
            },
        },

        analytics: {
            ...siteResult.analytics,

            sourceState: {
                ...siteResult
                    .analytics
                    ?.sourceState,
            },

            power: {
                ...siteResult
                    .analytics
                    ?.power,
            },

            energy: {
                ...siteResult
                    .analytics
                    ?.energy,
            },
        },

        boundaries: {
            ...siteResult.boundaries,
        },
    };
}


/*
|--------------------------------------------------------------------------
| H-D input validation
|--------------------------------------------------------------------------
*/

export function validateProductionGridInterruptionInput(
    siteResult
) {
    if (
        !siteResult ||
        typeof siteResult !==
            "object"
    ) {
        return {
            valid:
                false,

            reason:
                "PRODUCTION_GRID_SITE_RESULT_REQUIRED",
        };
    }


    if (
        siteResult.family !==
        "GRID"
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_GRID_FAMILY",
        };
    }


    if (
        siteResult.layer !==
        "PRODUCTION"
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_PRODUCTION_LAYER",
        };
    }


    if (
        siteResult.phase !==
        "8.6H-D"
    ) {
        return {
            valid:
                false,

            reason:
                "PHASE_8_6H_D_REQUIRED",
        };
    }


    const installationId =
        normalizeId(
            siteResult
                ?.installation
                ?.id
        );


    if (!installationId) {
        return {
            valid:
                false,

            reason:
                "INSTALLATION_ID_REQUIRED",
        };
    }


    const start =
        asDate(
            siteResult
                ?.reportingWindow
                ?.start
        );


    const end =
        asDate(
            siteResult
                ?.reportingWindow
                ?.end
        );


    if (
        !start ||
        !end ||
        start >= end
    ) {
        return {
            valid:
                false,

            reason:
                "VALID_REPORTING_WINDOW_REQUIRED",
        };
    }


    if (
        siteResult
            ?.reportingWindow
            ?.semantics !==
        "[start,end)"
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_REPORTING_WINDOW_SEMANTICS",
        };
    }


    const sourceState =
        siteResult
            ?.analytics
            ?.sourceState
            ?.value;


    if (
        !sourceState ||
        sourceState.family !==
            "GRID_SOURCE_STATE"
    ) {
        return {
            valid:
                false,

            reason:
                "GRID_SOURCE_STATE_RESULT_REQUIRED",
        };
    }


    if (
        !Array.isArray(
            sourceState.intervals
        )
    ) {
        return {
            valid:
                false,

            reason:
                "SOURCE_STATE_INTERVALS_REQUIRED",
        };
    }


    /*
     * H-E comes after H-D.
     *
     * The actual engineering value may be CALCULATED,
     * PARTIALLY_CALCULATED or UNAVAILABLE.
     *
     * We only require that H-D was executed.
     */

    if (
        siteResult
            ?.analytics
            ?.power
            ?.status !==
        "INTEGRATED"
    ) {
        return {
            valid:
                false,

            reason:
                "POWER_INTEGRATION_REQUIRED",
        };
    }


    if (
        siteResult
            ?.analytics
            ?.energy
            ?.status !==
        "INTEGRATED"
    ) {
        return {
            valid:
                false,

            reason:
                "ENERGY_INTEGRATION_REQUIRED",
        };
    }


    return {
        valid:
            true,

        reason:
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Production reporting window
|--------------------------------------------------------------------------
*/

export function resolveProductionGridInterruptionWindow(
    siteResult
) {
    const validation =
        validateProductionGridInterruptionInput(
            siteResult
        );


    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid H-D production grid result: ${validation.reason}`
        );
    }


    return {
        start:
            asDate(
                siteResult
                    .reportingWindow
                    .start
            ),

        end:
            asDate(
                siteResult
                    .reportingWindow
                    .end
            ),

        semantics:
            "[start,end)",
    };
}


/*
|--------------------------------------------------------------------------
| Phase 7 OutageEvent overlap query
|--------------------------------------------------------------------------
|
| Event overlaps [start,end) when:
|
|     event.startTime < end
|
| AND:
|
|     OPEN
|
| OR
|
|     restorationTime > start
|
| OR
|
|     endTime > start
|
| RESTORED events ending exactly at `start` do not overlap.
|
| OPEN events are intentionally allowed because Phase 8.6F clips their
| observed exposure to periodEnd without marking them restored.
|--------------------------------------------------------------------------
*/

export function buildProductionGridOutageEventQuery({
    installationId,
    start,
    end,
} = {}) {
    const normalizedInstallationId =
        normalizeId(
            installationId
        );


    const periodStart =
        asDate(
            start
        );


    const periodEnd =
        asDate(
            end
        );


    if (!normalizedInstallationId) {
        throw new Error(
            "installationId is required."
        );
    }


    if (
        !periodStart ||
        !periodEnd ||
        periodStart >=
            periodEnd
    ) {
        throw new Error(
            "A valid [start,end) reporting window is required."
        );
    }


    return {
        installation:
            normalizedInstallationId,

        eventType:
            PHASE7_GRID_OUTAGE_IDENTITY
                .eventType,

        source:
            PHASE7_GRID_OUTAGE_IDENTITY
                .source,

        detectionMethod:
            PHASE7_GRID_OUTAGE_IDENTITY
                .detectionMethod,

        status: {
            $in:
                [
                    ...PHASE7_GRID_OUTAGE_IDENTITY
                        .lifecycleStatuses,
                ],
        },

        startTime: {
            $lt:
                periodEnd,
        },

        $or: [
            {
                status:
                    "OPEN",
            },

            {
                restorationTime: {
                    $gt:
                        periodStart,
                },
            },

            {
                endTime: {
                    $gt:
                        periodStart,
                },
            },
        ],
    };
}


/*
|--------------------------------------------------------------------------
| Phase 7 event retrieval
|--------------------------------------------------------------------------
*/

export async function getProductionGridOutageEvents({
    siteResult,

    outageEventModel =
        OutageEvent,
} = {}) {
    const window =
        resolveProductionGridInterruptionWindow(
            siteResult
        );


    const installationId =
        normalizeId(
            siteResult
                .installation
                .id
        );


    if (
        !outageEventModel ||
        typeof outageEventModel.find !==
            "function"
    ) {
        throw new Error(
            "outageEventModel.find must be available."
        );
    }


    const query =
        buildProductionGridOutageEventQuery({
            installationId,

            start:
                window.start,

            end:
                window.end,
        });


    const mongoQuery =
        outageEventModel
            .find(
                query
            );


    if (
        !mongoQuery ||
        typeof mongoQuery.sort !==
            "function"
    ) {
        throw new Error(
            "OutageEvent.find() must return a sortable query."
        );
    }


    const sortedQuery =
        mongoQuery
            .sort({
                startTime:
                    1,
            });


    if (
        !sortedQuery ||
        typeof sortedQuery.lean !==
            "function"
    ) {
        throw new Error(
            "OutageEvent query must support lean()."
        );
    }


    const events =
        await sortedQuery
            .lean();


    if (
        !Array.isArray(
            events
        )
    ) {
        throw new Error(
            "OutageEvent query must resolve to an array."
        );
    }


    return {
        query,

        events,

        installationId,

        reportingWindow:
            window,
    };
}


/*
|--------------------------------------------------------------------------
| Canonical H-E evidence bundle
|--------------------------------------------------------------------------
*/

export async function getProductionGridInterruptionEvidence({
    siteResult,

    outageEventModel =
        OutageEvent,
} = {}) {
    const phase7 =
        await getProductionGridOutageEvents({
            siteResult,

            outageEventModel,
        });


    return {
        outageEvents:
            phase7.events,

        sourceState:
            siteResult
                .analytics
                .sourceState
                .value,

        sourceStateIntervals:
            siteResult
                .analytics
                .sourceState
                .value
                .intervals,

        periodStart:
            phase7
                .reportingWindow
                .start,

        periodEnd:
            phase7
                .reportingWindow
                .end,

        query:
            phase7.query,

        installationId:
            phase7.installationId,
    };
}


/*
|--------------------------------------------------------------------------
| Delegate to validated Phase 8.6F
|--------------------------------------------------------------------------
*/

export function calculateProductionGridInterruption({
    outageEvents = [],

    sourceStateIntervals = [],

    periodStart,

    periodEnd,

    interruptionCalculator =
        calculateGridInterruptionIntegration,
} = {}) {
    if (
        typeof interruptionCalculator !==
        "function"
    ) {
        throw new Error(
            "interruptionCalculator must be a function."
        );
    }


    return interruptionCalculator({
        outageEvents,

        sourceStateIntervals,

        periodStart,

        periodEnd,
    });
}


/*
|--------------------------------------------------------------------------
| Diagnostics
|--------------------------------------------------------------------------
*/

export function buildProductionGridInterruptionDiagnostics({
    evidence,

    interruptionResult,
} = {}) {
    return {
        phase7EventCount:
            Array.isArray(
                evidence
                    ?.outageEvents
            )
                ? evidence
                    .outageEvents
                    .length
                : 0,

        sourceStateIntervalCount:
            Array.isArray(
                evidence
                    ?.sourceStateIntervals
            )
                ? evidence
                    .sourceStateIntervals
                    .length
                : 0,

        sourceStateStatus:
            evidence
                ?.sourceState
                ?.status ??
            null,

        sourceStateReason:
            evidence
                ?.sourceState
                ?.reason ??
            null,

        interruptionStatus:
            interruptionResult
                ?.status ??
            null,

        interruptionReason:
            interruptionResult
                ?.reason ??
            null,

        interruptionCount:
            interruptionResult
                ?.metrics
                ?.interruptionCount ??
            null,

        restoredInterruptionCount:
            interruptionResult
                ?.metrics
                ?.restoredInterruptionCount ??
            null,

        openInterruptionCount:
            interruptionResult
                ?.metrics
                ?.openInterruptionCount ??
            null,

        interruptionHours:
            interruptionResult
                ?.metrics
                ?.interruptionHours ??
            null,

        serviceInterruptionCount:
            interruptionResult
                ?.metrics
                ?.serviceInterruptionCount ??
            null,

        phase7Authoritative:
            true,

        sourceStateCorroborativeOnly:
            true,
    };
}


/*
|--------------------------------------------------------------------------
| Main H-E integration
|--------------------------------------------------------------------------
*/

export async function integrateProductionGridInterruptions({
    siteResult,

    outageEventModel =
        OutageEvent,

    interruptionCalculator =
        calculateGridInterruptionIntegration,
} = {}) {
    const validation =
        validateProductionGridInterruptionInput(
            siteResult
        );


    if (
        validation.valid !==
        true
    ) {
        throw new Error(
            `Invalid H-D production grid result: ${validation.reason}`
        );
    }


    if (
        typeof interruptionCalculator !==
        "function"
    ) {
        throw new Error(
            "interruptionCalculator must be a function."
        );
    }


    const evidence =
        await getProductionGridInterruptionEvidence({
            siteResult,

            outageEventModel,
        });


    const interruptionResult =
        calculateProductionGridInterruption({
            outageEvents:
                evidence.outageEvents,

            sourceStateIntervals:
                evidence.sourceStateIntervals,

            periodStart:
                evidence.periodStart,

            periodEnd:
                evidence.periodEnd,

            interruptionCalculator,
        });


    const output =
        cloneProductionGridResult(
            siteResult
        );


    output.phase =
        GRID_PRODUCTION_INTERRUPTION_PHASE;


    output.analytics.interruptions =
        {
            status:
                GRID_PRODUCTION_INTERRUPTION_INTEGRATION_STATUS
                    .INTEGRATED,

            phase:
                GRID_PRODUCTION_INTERRUPTION_PHASE,

            reason:
                interruptionResult
                    ?.reason ??
                GRID_PRODUCTION_INTERRUPTION_REASON
                    .INTEGRATION_EXECUTED,

            value:
                interruptionResult,
        };


    output.evidence
        .interruptionDiagnostics =
        buildProductionGridInterruptionDiagnostics({
            evidence,

            interruptionResult,
        });


    /*
    |--------------------------------------------------------------------------
    | Boundary state
    |--------------------------------------------------------------------------
    */

    output.boundaries
        .interruptionsIntegrated =
        true;


    /*
     * H-F has not run.
     */

    output.boundaries
        .gridQualityCalculated =
        false;


    /*
     * Phase 7 remains immutable.
     */

    output.boundaries
        .phase7EventsModified =
        false;


    /*
     * H-E may expose a service-interruption flag already persisted by
     * Phase 7, but H-E itself does not ESTABLISH one.
     */

    output.boundaries
        .customerInterruptionEstablished =
        false;


    /*
     * Reliability eligibility remains exactly as persisted by Phase 7.
     */

    output.boundaries
        .saidiSaifiEligibilityChanged =
        false;

    output.boundaries
        .ensEligibilityChanged =
        false;


    /*
     * H-E cannot infer these semantics.
     */

    output.boundaries
        .affectedCustomersInferred =
        false;

    output.boundaries
        .ensCalculatedByGridIntegration =
        false;

    output.boundaries
        .gridElectricalAbsenceInferred =
        false;

    output.boundaries
        .sourceStateCorroborativeOnly =
        true;

    output.boundaries
        .phase7OutageEventsAuthoritative =
        true;


    return output;
}


/*
|--------------------------------------------------------------------------
| Engineering availability helper
|--------------------------------------------------------------------------
*/

export function isProductionGridInterruptionAvailable(
    result
) {
    const status =
        result
            ?.analytics
            ?.interruptions
            ?.value
            ?.status;


    return (
        status ===
            GRID_INTERRUPTION_INTEGRATION_STATUS
                .CALCULATED ||
        status ===
            GRID_INTERRUPTION_INTEGRATION_STATUS
                .PARTIALLY_CALCULATED
    );
}


/*
|--------------------------------------------------------------------------
| Semantic boundary audit
|--------------------------------------------------------------------------
*/

export function auditProductionGridInterruptionBoundaries(
    result
) {
    return {
        interruptionIntegrationExecuted:
            result
                ?.boundaries
                ?.interruptionsIntegrated ===
            true,

        qualityStillReserved:
            result
                ?.boundaries
                ?.gridQualityCalculated ===
            false,

        phase7Immutable:
            result
                ?.boundaries
                ?.phase7EventsModified ===
            false,

        customerInterruptionNotEstablished:
            result
                ?.boundaries
                ?.customerInterruptionEstablished ===
            false,

        saidiSaifiEligibilityUnchanged:
            result
                ?.boundaries
                ?.saidiSaifiEligibilityChanged ===
            false,

        ensEligibilityUnchanged:
            result
                ?.boundaries
                ?.ensEligibilityChanged ===
            false,

        affectedCustomersNotInferred:
            result
                ?.boundaries
                ?.affectedCustomersInferred ===
            false,

        ensNotCalculated:
            result
                ?.boundaries
                ?.ensCalculatedByGridIntegration ===
            false,

        gridElectricalAbsenceNotInferred:
            result
                ?.boundaries
                ?.gridElectricalAbsenceInferred ===
            false,

        sourceStateOnlyCorroborative:
            result
                ?.boundaries
                ?.sourceStateCorroborativeOnly ===
            true,

        phase7Authoritative:
            result
                ?.boundaries
                ?.phase7OutageEventsAuthoritative ===
            true,
    };
}


export default {
    GRID_PRODUCTION_INTERRUPTION_PHASE,
    GRID_PRODUCTION_INTERRUPTION_INTEGRATION_STATUS,
    GRID_PRODUCTION_INTERRUPTION_REASON,
    PHASE7_GRID_OUTAGE_IDENTITY,

    validateProductionGridInterruptionInput,
    resolveProductionGridInterruptionWindow,
    buildProductionGridOutageEventQuery,
    getProductionGridOutageEvents,
    getProductionGridInterruptionEvidence,
    calculateProductionGridInterruption,
    buildProductionGridInterruptionDiagnostics,
    integrateProductionGridInterruptions,
    isProductionGridInterruptionAvailable,
    auditProductionGridInterruptionBoundaries,
};