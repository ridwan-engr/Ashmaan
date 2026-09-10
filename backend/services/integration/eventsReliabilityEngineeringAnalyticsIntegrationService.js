export const EVENTS_ENGINEERING_INTEGRATION_PHASE =
    "12.4";


export const EVENTS_ENGINEERING_INTEGRATION_LAYER =
    "EVENTS_RELIABILITY_ENGINEERING_ANALYTICS_INTEGRATION";


export const EVENTS_ENGINEERING_INTEGRATION_UPSTREAM_PHASE =
    "12.3";


export const EVENTS_ENGINEERING_INTEGRATION_UPSTREAM_LAYER =
    "DATABASE_EVENTS_RELIABILITY_INTEGRATION";


export const EVENTS_ENGINEERING_INTEGRATION_TARGET_PHASE =
    "8.6H-E";


export const EVENTS_ENGINEERING_INTEGRATION_TARGET_LAYER =
    "PRODUCTION";


export const EVENTS_ENGINEERING_INTEGRATION_INTERVAL =
    "[start,end)";


export const EVENTS_ENGINEERING_INTEGRATION_STATUS =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        EXECUTED:
            "EXECUTED",

        ERROR:
            "ERROR",
    });


export const EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES =
    Object.freeze({
        usesExistingPhase8ProductionIntegration:
            true,

        createsParallelEngineeringAnalytics:
            false,

        createsParallelOutageDetector:
            false,

        createsParallelOutagePersistence:
            false,

        readsAuthoritativePhase7EventsThroughPhase8:
            true,

        phase7EventsMutated:
            false,

        phase7EventsAuthoritative:
            true,

        sourceStateCorroborativeOnly:
            true,

        customerInterruptionInferred:
            false,

        gridElectricalAbsenceInferred:
            false,

        saidiSaifiEligibilityChanged:
            false,

        ensEligibilityChanged:
            false,

        affectedCustomersInferred:
            false,

        ensCalculated:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        unitInferenceAllowed:
            false,

        directionInferenceAllowed:
            false,

        topologyInferenceAllowed:
            false,

        preserveSiteIdentity:
            true,

        preserveInstallationIdentity:
            true,

        preserveReportingWindow:
            true,

        advisoryOnly:
            true,

        executable:
            false,

        autoDispatch:
            false,
    });


function isObject(
    value
) {
    return (
        value !==
            null &&
        typeof value ===
            "object" &&
        !Array.isArray(
            value
        )
    );
}


function normalizeId(
    value
) {
    if (
        value ===
            null ||
        value ===
            undefined
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


function asDate(
    value
) {
    if (
        value ===
            null ||
        value ===
            undefined
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


function assertFunction(
    value,
    name
) {
    if (
        typeof value !==
        "function"
    ) {
        throw new TypeError(
            `${name} must be a function`
        );
    }
}


/*
|--------------------------------------------------------------------------
| Validate successful 12.3 upstream evidence
|--------------------------------------------------------------------------
*/

export function validateEventsReliabilityUpstream(
    upstreamIntegration
) {
    if (
        !isObject(
            upstreamIntegration
        )
    ) {
        return {
            valid:
                false,

            reason:
                "UPSTREAM_12_3_INTEGRATION_REQUIRED",
        };
    }


    if (
        upstreamIntegration.phase !==
        EVENTS_ENGINEERING_INTEGRATION_UPSTREAM_PHASE
    ) {
        return {
            valid:
                false,

            reason:
                "PHASE_12_3_REQUIRED",
        };
    }


    if (
        upstreamIntegration.layer !==
        EVENTS_ENGINEERING_INTEGRATION_UPSTREAM_LAYER
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_12_3_LAYER",
        };
    }


    if (
        upstreamIntegration.status !==
            "EXECUTED" ||
        upstreamIntegration.executed !==
            true
    ) {
        return {
            valid:
                false,

            reason:
                "SUCCESSFUL_12_3_EXECUTION_REQUIRED",
        };
    }


    if (
        upstreamIntegration.scope !==
        "SITE"
    ) {
        return {
            valid:
                false,

            reason:
                "SITE_SCOPE_REQUIRED",
        };
    }


    const vrmSiteId =
        normalizeId(
            upstreamIntegration
                ?.scopeIdentity
                ?.vrmSiteId
        );


    if (!vrmSiteId) {
        return {
            valid:
                false,

            reason:
                "VRM_SITE_ID_REQUIRED",
        };
    }


    const start =
        asDate(
            upstreamIntegration
                ?.horizon
                ?.start
        );


    const end =
        asDate(
            upstreamIntegration
                ?.horizon
                ?.end
        );


    if (
        !start ||
        !end ||
        start >=
            end
    ) {
        return {
            valid:
                false,

            reason:
                "VALID_12_3_HORIZON_REQUIRED",
        };
    }


    if (
        upstreamIntegration
            ?.horizon
            ?.interval !==
        EVENTS_ENGINEERING_INTEGRATION_INTERVAL
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_12_3_HORIZON_SEMANTICS",
        };
    }


    return {
        valid:
            true,

        reason:
            null,

        vrmSiteId,

        start,

        end,
    };
}


/*
|--------------------------------------------------------------------------
| Validate production Phase 8.6H-D GRID result
|--------------------------------------------------------------------------
*/

export function validateEngineeringGridInput(
    siteResult
) {
    if (
        !isObject(
            siteResult
        )
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
                "GRID_FAMILY_REQUIRED",
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
                "PRODUCTION_LAYER_REQUIRED",
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


    const vrmSiteId =
        normalizeId(
            siteResult
                ?.installation
                ?.vrmSiteId
        );


    if (
        !installationId ||
        !vrmSiteId
    ) {
        return {
            valid:
                false,

            reason:
                "ENGINEERING_INSTALLATION_IDENTITY_REQUIRED",
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
        start >=
            end
    ) {
        return {
            valid:
                false,

            reason:
                "VALID_ENGINEERING_REPORTING_WINDOW_REQUIRED",
        };
    }


    if (
        siteResult
            ?.reportingWindow
            ?.semantics !==
        EVENTS_ENGINEERING_INTEGRATION_INTERVAL
    ) {
        return {
            valid:
                false,

            reason:
                "INVALID_ENGINEERING_REPORTING_WINDOW_SEMANTICS",
        };
    }


    if (
        siteResult
            ?.analytics
            ?.sourceState
            ?.value
            ?.family !==
        "GRID_SOURCE_STATE"
    ) {
        return {
            valid:
                false,

            reason:
                "GRID_SOURCE_STATE_REQUIRED",
        };
    }


    if (
        !Array.isArray(
            siteResult
                ?.analytics
                ?.sourceState
                ?.value
                ?.intervals
        )
    ) {
        return {
            valid:
                false,

            reason:
                "GRID_SOURCE_STATE_INTERVALS_REQUIRED",
        };
    }


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
                "GRID_POWER_INTEGRATION_REQUIRED",
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
                "GRID_ENERGY_INTEGRATION_REQUIRED",
        };
    }


    return {
        valid:
            true,

        reason:
            null,

        installationId,

        vrmSiteId,

        start,

        end,
    };
}


/*
|--------------------------------------------------------------------------
| Cross-layer identity / time-window validation
|--------------------------------------------------------------------------
*/

export function validateEventsEngineeringAlignment({
    upstreamValidation,
    engineeringValidation,
} = {}) {
    if (
        upstreamValidation
            ?.valid !==
            true
    ) {
        return {
            valid:
                false,

            reason:
                "VALID_UPSTREAM_VALIDATION_REQUIRED",
        };
    }


    if (
        engineeringValidation
            ?.valid !==
            true
    ) {
        return {
            valid:
                false,

            reason:
                "VALID_ENGINEERING_VALIDATION_REQUIRED",
        };
    }


    if (
        upstreamValidation
            .vrmSiteId !==
        engineeringValidation
            .vrmSiteId
    ) {
        return {
            valid:
                false,

            reason:
                "VRM_SITE_IDENTITY_MISMATCH",
        };
    }


    if (
        upstreamValidation
            .start
            .getTime() !==
        engineeringValidation
            .start
            .getTime()
    ) {
        return {
            valid:
                false,

            reason:
                "REPORTING_WINDOW_START_MISMATCH",
        };
    }


    if (
        upstreamValidation
            .end
            .getTime() !==
        engineeringValidation
            .end
            .getTime()
    ) {
        return {
            valid:
                false,

            reason:
                "REPORTING_WINDOW_END_MISMATCH",
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
| Qualification
|--------------------------------------------------------------------------
*/

export function qualifyEventsReliabilityEngineeringIntegration({
    upstreamIntegration,

    engineeringSiteResult,

    productionInterruptionIntegrator,
} = {}) {
    const upstreamValidation =
        validateEventsReliabilityUpstream(
            upstreamIntegration
        );


    if (
        upstreamValidation.valid !==
        true
    ) {
        throw new TypeError(
            `Invalid Phase 12.3 upstream integration: ${upstreamValidation.reason}`
        );
    }


    const engineeringValidation =
        validateEngineeringGridInput(
            engineeringSiteResult
        );


    if (
        engineeringValidation.valid !==
        true
    ) {
        throw new TypeError(
            `Invalid Phase 8 engineering GRID result: ${engineeringValidation.reason}`
        );
    }


    const alignment =
        validateEventsEngineeringAlignment({
            upstreamValidation,

            engineeringValidation,
        });


    if (
        alignment.valid !==
        true
    ) {
        throw new TypeError(
            `Phase 12.4 cross-layer alignment failed: ${alignment.reason}`
        );
    }


    assertFunction(
        productionInterruptionIntegrator,
        "productionInterruptionIntegrator"
    );


    return Object.freeze({
        phase:
            EVENTS_ENGINEERING_INTEGRATION_PHASE,

        layer:
            EVENTS_ENGINEERING_INTEGRATION_LAYER,

        upstreamPhase:
            upstreamIntegration.phase,

        upstreamLayer:
            upstreamIntegration.layer,

        targetPhase:
            EVENTS_ENGINEERING_INTEGRATION_TARGET_PHASE,

        targetLayer:
            EVENTS_ENGINEERING_INTEGRATION_TARGET_LAYER,

        status:
            EVENTS_ENGINEERING_INTEGRATION_STATUS
                .QUALIFIED,

        executed:
            false,

        scope:
            "SITE",

        scopeIdentity:
            upstreamIntegration
                .scopeIdentity,

        installationId:
            engineeringValidation
                .installationId,

        horizon:
            upstreamIntegration
                .horizon,

        evidenceRefs:
            upstreamIntegration
                .evidenceRefs ??
            [],

        engineeringSiteResult,

        boundaries:
            EVENTS_ENGINEERING_INTEGRATION_BOUNDARIES,

        productionInterruptionIntegrator,
    });
}


/*
|--------------------------------------------------------------------------
| Execute
|--------------------------------------------------------------------------
*/

export async function executeEventsReliabilityEngineeringIntegration({
    qualifiedIntegration,
} = {}) {
    const q =
        qualifiedIntegration;


    if (
        !q ||
        q.phase !==
            EVENTS_ENGINEERING_INTEGRATION_PHASE ||
        q.layer !==
            EVENTS_ENGINEERING_INTEGRATION_LAYER ||
        q.status !==
            EVENTS_ENGINEERING_INTEGRATION_STATUS
                .QUALIFIED ||
        q.executed !==
            false
    ) {
        throw new TypeError(
            "qualifiedIntegration must be a qualified Phase 12.4 integration"
        );
    }


    assertFunction(
        q.productionInterruptionIntegrator,
        "productionInterruptionIntegrator"
    );


    try {
        /*
        |--------------------------------------------------------------------------
        | Exact production Phase 8 delegation
        |--------------------------------------------------------------------------
        |
        | The H-E service performs the authoritative SITE-scoped OutageEvent
        | query itself and delegates the retrieved Phase 7 evidence to 8.6F.
        |
        | 12.4 must not:
        |
        | - supply a second outage detector
        | - create its own OutageEvent query
        | - mutate upstream events
        | - recalculate source-state, power or energy
        |--------------------------------------------------------------------------
        */

        const engineeringResult =
            await q
                .productionInterruptionIntegrator({
                    siteResult:
                        q.engineeringSiteResult,
                });


        return Object.freeze({
            phase:
                EVENTS_ENGINEERING_INTEGRATION_PHASE,

            layer:
                EVENTS_ENGINEERING_INTEGRATION_LAYER,

            status:
                EVENTS_ENGINEERING_INTEGRATION_STATUS
                    .EXECUTED,

            executed:
                true,

            scope:
                q.scope,

            scopeIdentity:
                q.scopeIdentity,

            installationId:
                q.installationId,

            horizon:
                q.horizon,

            evidenceRefs:
                q.evidenceRefs,

            targetPhase:
                EVENTS_ENGINEERING_INTEGRATION_TARGET_PHASE,

            targetLayer:
                EVENTS_ENGINEERING_INTEGRATION_TARGET_LAYER,

            boundaries:
                q.boundaries,

            engineeringResult,
        });
    }
    catch (
        error
    ) {
        return Object.freeze({
            phase:
                EVENTS_ENGINEERING_INTEGRATION_PHASE,

            layer:
                EVENTS_ENGINEERING_INTEGRATION_LAYER,

            status:
                EVENTS_ENGINEERING_INTEGRATION_STATUS
                    .ERROR,

            executed:
                false,

            scope:
                q.scope,

            scopeIdentity:
                q.scopeIdentity,

            installationId:
                q.installationId,

            horizon:
                q.horizon,

            evidenceRefs:
                q.evidenceRefs,

            targetPhase:
                EVENTS_ENGINEERING_INTEGRATION_TARGET_PHASE,

            targetLayer:
                EVENTS_ENGINEERING_INTEGRATION_TARGET_LAYER,

            boundaries:
                q.boundaries,

            error:
                Object.freeze({
                    message:
                        error instanceof Error
                            ? error.message
                            : String(
                                error
                            ),
                }),
        });
    }
}