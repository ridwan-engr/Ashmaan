// services/integration/crossLayerErrorUnavailablePropagationService.js

/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 12.11 — Cross-Layer Error / Unavailable Propagation
|--------------------------------------------------------------------------
|
| Verification-only integration layer.
|
| This service verifies that failed, unavailable, missing, not-found and
| invalid-request states are not promoted into successful downstream states,
| zero-valued evidence, synthetic recovery, persistence, dispatch or control.
|
| It does NOT execute any Phase 12 bridge or mutate production evidence.
|--------------------------------------------------------------------------
*/

export const CROSS_LAYER_ERROR_PROPAGATION_PHASE =
    "12.11";

export const CROSS_LAYER_ERROR_PROPAGATION_LAYER =
    "CROSS_LAYER_ERROR_UNAVAILABLE_PROPAGATION";

export const CROSS_LAYER_ERROR_PROPAGATION_INTERVAL =
    "[start,end)";

export const CROSS_LAYER_ERROR_PROPAGATION_STATUS =
    Object.freeze({
        VERIFIED: "VERIFIED",
        REJECTED: "REJECTED",
        ERROR: "ERROR",
    });

export const CROSS_LAYER_ERROR_PROPAGATION_FAILURE_STATUS =
    Object.freeze({
        ERROR: "ERROR",
        UNAVAILABLE: "UNAVAILABLE",
        NOT_FOUND: "NOT_FOUND",
        INVALID_REQUEST: "INVALID_REQUEST",
        EMPTY: "EMPTY",
        MISSING: "MISSING",
    });

export const CROSS_LAYER_ERROR_PROPAGATION_SUCCESS_STATUS =
    Object.freeze([
        "EXECUTED",
        "CALCULATED",
        "QUALIFIED",
        "GENERATED",
        "OK",
        "READY",
        "AVAILABLE",
        "INTEGRATED",
    ]);

export const CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES =
    Object.freeze({
        verificationOnly: true,

        executesTelemetrySynchronization: false,
        executesReliability: false,
        calculatesEngineeringAnalytics: false,
        executesForecasting: false,
        calculatesFinancialBi: false,
        executesOptimizationDss: false,

        mutatesTelemetry: false,
        mutatesEvents: false,
        mutatesEvidence: false,
        persistsEvidence: false,

        missingMeansZero: false,
        unavailableMeansZero: false,
        errorMeansZero: false,

        errorMeansUnavailable: false,
        notFoundMeansEmpty: false,
        invalidRequestMeansUnavailable: false,

        synthesizesRecovery: false,
        synthesizesDownstreamSuccess: false,

        unitInferenceAllowed: false,
        topologyInferenceAllowed: false,
        timestampInferenceAllowed: false,
        identityInferenceAllowed: false,
        timezoneInferenceAllowed: false,

        preservesFailureReason: true,
        preservesScopeIdentityWhenPresent: true,
        preservesWindowWhenPresent: true,
        preservesHalfOpenSemanticsWhenPresent: true,

        automaticDispatchAllowed: false,
        executableControlAllowed: false,
    });


function isObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function requireObject(value, label) {
    if (!isObject(value)) {
        throw new TypeError(
            `${label} must be an object`
        );
    }

    return value;
}


function requireString(value, label) {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new TypeError(
            `${label} must be a non-empty string`
        );
    }

    return value.trim();
}


function optionalString(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalized =
        String(value).trim();

    return normalized || null;
}


function sameInstant(a, b) {
    const first =
        new Date(a);

    const second =
        new Date(b);

    return (
        !Number.isNaN(first.getTime()) &&
        !Number.isNaN(second.getTime()) &&
        first.getTime() ===
            second.getTime()
    );
}


function isFailureStatus(status) {
    return Object.values(
        CROSS_LAYER_ERROR_PROPAGATION_FAILURE_STATUS
    ).includes(status);
}


function isSuccessStatus(status) {
    return CROSS_LAYER_ERROR_PROPAGATION_SUCCESS_STATUS
        .includes(status);
}


function getFailureReason(value) {
    return (
        optionalString(
            value?.reason
        ) ??
        optionalString(
            value?.error?.code
        ) ??
        optionalString(
            value?.error?.message
        ) ??
        optionalString(
            value?.message
        )
    );
}


export function verifyFailureEnvelope(
    value,
    {
        label = "failureEnvelope",
    } = {}
) {
    requireObject(
        value,
        label
    );

    const status =
        requireString(
            value.status,
            `${label}.status`
        );

    if (!isFailureStatus(status)) {
        throw new Error(
            `${label} must contain an explicit failure/unavailable status`
        );
    }

    if (
        value.executed === true
    ) {
        throw new Error(
            `${label} failure state cannot be executed=true`
        );
    }

    return Object.freeze({
        status,

        executed:
            value.executed === false
                ? false
                : null,

        reason:
            getFailureReason(value),

        scope:
            optionalString(
                value.scope
            ),

        scopeIdentity:
            isObject(
                value.scopeIdentity
            )
                ? value.scopeIdentity
                : null,

        horizon:
            isObject(
                value.horizon
            )
                ? value.horizon
                : null,

        reportingWindow:
            isObject(
                value.reportingWindow
            )
                ? value.reportingWindow
                : null,

        source:
            value,
    });
}


export function verifyDownstreamBlocked({
    upstream,
    downstream = null,
    upstreamLabel = "upstream",
    downstreamLabel = "downstream",
} = {}) {
    const failure =
        verifyFailureEnvelope(
            upstream,
            {
                label:
                    upstreamLabel,
            }
        );

    if (
        downstream !== null &&
        downstream !== undefined
    ) {
        requireObject(
            downstream,
            downstreamLabel
        );

        const downstreamStatus =
            optionalString(
                downstream.status
            );

        if (
            downstream.executed === true ||
            (
                downstreamStatus &&
                isSuccessStatus(
                    downstreamStatus
                )
            )
        ) {
            throw new Error(
                `${upstreamLabel} failure cannot become successful ${downstreamLabel}`
            );
        }
    }

    return Object.freeze({
        blocked: true,

        upstreamStatus:
            failure.status,

        reason:
            failure.reason,

        scope:
            failure.scope,

        scopeIdentity:
            failure.scopeIdentity,

        horizon:
            failure.horizon,

        reportingWindow:
            failure.reportingWindow,
    });
}


export function verifyUnavailableValue({
    status,
    value,
    label = "evidence",
} = {}) {
    const normalizedStatus =
        requireString(
            status,
            `${label}.status`
        );

    const unavailableLike =
        [
            "UNAVAILABLE",
            "MISSING",
            "ERROR",
        ].includes(
            normalizedStatus
        );

    if (!unavailableLike) {
        return Object.freeze({
            valid: true,
            status:
                normalizedStatus,
            value,
        });
    }

    if (value === 0) {
        throw new Error(
            `${label} ${normalizedStatus} must not be converted to zero`
        );
    }

    return Object.freeze({
        valid: true,
        status:
            normalizedStatus,
        value,
    });
}


export function verifyFailureWindowPreservation({
    upstream,
    downstream,
    windowField = "horizon",
    semanticsField = "interval",
    label = "failure window",
} = {}) {
    requireObject(
        upstream,
        "upstream"
    );

    requireObject(
        downstream,
        "downstream"
    );

    const upstreamWindow =
        upstream?.[windowField];

    const downstreamWindow =
        downstream?.[windowField];

    requireObject(
        upstreamWindow,
        `upstream.${windowField}`
    );

    requireObject(
        downstreamWindow,
        `downstream.${windowField}`
    );

    if (
        !sameInstant(
            upstreamWindow.start,
            downstreamWindow.start
        )
    ) {
        throw new Error(
            `${label} start mismatch`
        );
    }

    if (
        !sameInstant(
            upstreamWindow.end,
            downstreamWindow.end
        )
    ) {
        throw new Error(
            `${label} end mismatch`
        );
    }

    if (
        upstreamWindow[
            semanticsField
        ] !==
            CROSS_LAYER_ERROR_PROPAGATION_INTERVAL ||
        downstreamWindow[
            semanticsField
        ] !==
            CROSS_LAYER_ERROR_PROPAGATION_INTERVAL
    ) {
        throw new Error(
            `${label} must preserve [start,end)`
        );
    }

    return Object.freeze({
        preserved: true,

        start:
            upstreamWindow.start,

        end:
            upstreamWindow.end,

        interval:
            CROSS_LAYER_ERROR_PROPAGATION_INTERVAL,
    });
}


export function verifyScopeIdentityNotInferred({
    upstream,
    downstream,
    label = "scope identity",
} = {}) {
    requireObject(
        upstream,
        "upstream"
    );

    requireObject(
        downstream,
        "downstream"
    );

    const upstreamIdentity =
        upstream.scopeIdentity;

    const downstreamIdentity =
        downstream.scopeIdentity;

    if (
        upstreamIdentity === null ||
        upstreamIdentity === undefined
    ) {
        if (
            downstreamIdentity !== null &&
            downstreamIdentity !== undefined
        ) {
            throw new Error(
                `${label} must not be inferred during failure propagation`
            );
        }

        return Object.freeze({
            preserved: true,
            inferred: false,
        });
    }

    if (!isObject(upstreamIdentity)) {
        throw new TypeError(
            "upstream.scopeIdentity must be an object when present"
        );
    }

    if (!isObject(downstreamIdentity)) {
        throw new Error(
            `${label} was dropped during failure propagation`
        );
    }

    for (
        const key of [
            "vrmSiteId",
            "fleetId",
            "installationId",
        ]
    ) {
        const sourceValue =
            optionalString(
                upstreamIdentity[key]
            );

        const targetValue =
            optionalString(
                downstreamIdentity[key]
            );

        if (
            sourceValue !==
            targetValue
        ) {
            throw new Error(
                `${label} ${key} mismatch`
            );
        }
    }

    return Object.freeze({
        preserved: true,
        inferred: false,
    });
}


export function verifyForecastFinancialBiFailureBoundary({
    forecastResult,
    financialBiResult = null,
} = {}) {
    requireObject(
        forecastResult,
        "forecastResult"
    );

    const status =
        requireString(
            forecastResult.status,
            "forecastResult.status"
        );

    if (status === "CALCULATED") {
        throw new Error(
            "forecastResult must be non-CALCULATED for failure-boundary verification"
        );
    }

    if (
        financialBiResult !== null &&
        financialBiResult !== undefined
    ) {
        requireObject(
            financialBiResult,
            "financialBiResult"
        );

        if (
            financialBiResult.executed === true ||
            isSuccessStatus(
                optionalString(
                    financialBiResult.status
                )
            )
        ) {
            throw new Error(
                "non-CALCULATED forecast cannot become successful Financial/BI evidence"
            );
        }
    }

    return Object.freeze({
        blocked: true,
        forecastStatus:
            status,
    });
}


export function verifyFinancialBiOptimizationFailureBoundary({
    financialBiEvidence,
    optimizationResult = null,
} = {}) {
    requireObject(
        financialBiEvidence,
        "financialBiEvidence"
    );

    const status =
        requireString(
            financialBiEvidence.status,
            "financialBiEvidence.status"
        );

    if (!isFailureStatus(status)) {
        throw new Error(
            "Financial/BI evidence must be unavailable/error-like for failure-boundary verification"
        );
    }

    if (
        optimizationResult !== null &&
        optimizationResult !== undefined
    ) {
        requireObject(
            optimizationResult,
            "optimizationResult"
        );

        if (
            optimizationResult.executed === true ||
            isSuccessStatus(
                optionalString(
                    optimizationResult.status
                )
            )
        ) {
            throw new Error(
                "unavailable Financial/BI evidence cannot become successful Optimization/DSS result"
            );
        }
    }

    return Object.freeze({
        blocked: true,
        financialBiStatus:
            status,
    });
}


export function verifyApiStatusSeparation({
    status,
    httpStatus,
} = {}) {
    const normalizedStatus =
        requireString(
            status,
            "api status"
        );

    if (
        !Number.isInteger(
            httpStatus
        )
    ) {
        throw new TypeError(
            "httpStatus must be an integer"
        );
    }

    const expected =
        Object.freeze({
            NOT_FOUND: 404,
            INVALID_REQUEST: 400,
            UNAVAILABLE: 503,
        });

    if (
        Object.hasOwn(
            expected,
            normalizedStatus
        ) &&
        expected[
            normalizedStatus
        ] !==
            httpStatus
    ) {
        throw new Error(
            `${normalizedStatus} must map to HTTP ${expected[normalizedStatus]}`
        );
    }

    return Object.freeze({
        status:
            normalizedStatus,

        httpStatus,

        separated: true,
    });
}


export function verifyCrossLayerErrorUnavailablePropagation({
    scenarios = [],
} = {}) {
    try {
        if (
            !Array.isArray(
                scenarios
            )
        ) {
            throw new TypeError(
                "scenarios must be an array"
            );
        }

        const results =
            scenarios.map(
                (
                    scenario,
                    index
                ) => {
                    requireObject(
                        scenario,
                        `scenarios[${index}]`
                    );

                    const name =
                        requireString(
                            scenario.name,
                            `scenarios[${index}].name`
                        );

                    const blocked =
                        verifyDownstreamBlocked({
                            upstream:
                                scenario.upstream,

                            downstream:
                                scenario.downstream ??
                                null,

                            upstreamLabel:
                                `${name}.upstream`,

                            downstreamLabel:
                                `${name}.downstream`,
                        });

                    return Object.freeze({
                        name,
                        blocked,
                    });
                }
            );

        return Object.freeze({
            phase:
                CROSS_LAYER_ERROR_PROPAGATION_PHASE,

            layer:
                CROSS_LAYER_ERROR_PROPAGATION_LAYER,

            status:
                CROSS_LAYER_ERROR_PROPAGATION_STATUS
                    .VERIFIED,

            verified: true,

            scenarioCount:
                results.length,

            scenarios:
                Object.freeze(
                    results
                ),

            boundaries:
                CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES,

            error: null,
        });
    }
    catch (error) {
        return Object.freeze({
            phase:
                CROSS_LAYER_ERROR_PROPAGATION_PHASE,

            layer:
                CROSS_LAYER_ERROR_PROPAGATION_LAYER,

            status:
                CROSS_LAYER_ERROR_PROPAGATION_STATUS
                    .ERROR,

            verified: false,

            scenarioCount: 0,

            scenarios:
                Object.freeze([]),

            boundaries:
                CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES,

            error:
                Object.freeze({
                    name:
                        error?.name ??
                        "Error",

                    message:
                        error?.message ??
                        String(error),
                }),
        });
    }
}


export default Object.freeze({
    CROSS_LAYER_ERROR_PROPAGATION_PHASE,
    CROSS_LAYER_ERROR_PROPAGATION_LAYER,
    CROSS_LAYER_ERROR_PROPAGATION_INTERVAL,
    CROSS_LAYER_ERROR_PROPAGATION_STATUS,
    CROSS_LAYER_ERROR_PROPAGATION_FAILURE_STATUS,
    CROSS_LAYER_ERROR_PROPAGATION_SUCCESS_STATUS,
    CROSS_LAYER_ERROR_PROPAGATION_BOUNDARIES,

    verifyFailureEnvelope,
    verifyDownstreamBlocked,
    verifyUnavailableValue,
    verifyFailureWindowPreservation,
    verifyScopeIdentityNotInferred,
    verifyForecastFinancialBiFailureBoundary,
    verifyFinancialBiOptimizationFailureBoundary,
    verifyApiStatusSeparation,
    verifyCrossLayerErrorUnavailablePropagation,
});