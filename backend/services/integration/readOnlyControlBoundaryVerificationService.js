// services/integration/readOnlyControlBoundaryVerificationService.js

/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 12.12 — Read-Only / Control-Boundary Verification
|--------------------------------------------------------------------------
|
| Verification-only service.
|
| Purpose:
| - verify Phase 12 remains observational / analytical / advisory
| - reject mutation, persistence, dispatch and executable control
| - preserve read-only backend/API/frontend boundaries
|
| This service executes no upstream integration bridge.
|--------------------------------------------------------------------------
*/

export const READ_ONLY_CONTROL_BOUNDARY_PHASE =
    "12.12";

export const READ_ONLY_CONTROL_BOUNDARY_LAYER =
    "READ_ONLY_CONTROL_BOUNDARY_VERIFICATION";

export const READ_ONLY_CONTROL_BOUNDARY_STATUS =
    Object.freeze({
        VERIFIED: "VERIFIED",
        ERROR: "ERROR",
    });

export const READ_ONLY_CONTROL_BOUNDARY_ALLOWED_HTTP_METHODS =
    Object.freeze([
        "GET",
    ]);

export const READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_HTTP_METHODS =
    Object.freeze([
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    ]);

export const READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_ACTIONS =
    Object.freeze([
        "WRITE_TELEMETRY",
        "UPDATE_TELEMETRY",
        "DELETE_TELEMETRY",

        "WRITE_EVENT",
        "UPDATE_EVENT",
        "DELETE_EVENT",

        "TRAIN_FORECAST",
        "EXECUTE_FORECAST",
        "PERSIST_FORECAST",

        "CALCULATE_FINANCIAL_BI",
        "AGGREGATE_FINANCIAL_BI",
        "PERSIST_FINANCIAL_BI",

        "BUILD_OPTIMIZATION_MODEL",
        "EXECUTE_OPTIMIZATION_SOLVER",
        "GENERATE_OPTIMIZATION_RECOMMENDATION",
        "PERSIST_OPTIMIZATION_RECOMMENDATION",

        "SEND_SETPOINT",
        "EXECUTE_DISPATCH",

        "START_GENERATOR",
        "STOP_GENERATOR",

        "CHARGE_BATTERY",
        "DISCHARGE_BATTERY",

        "SHED_LOAD",
        "RESTORE_LOAD",

        "OPEN_BREAKER",
        "CLOSE_BREAKER",

        "WRITE_DEVICE_REGISTER",
        "WRITE_MODBUS_REGISTER",

        "AUTO_DISPATCH",
        "EXECUTABLE_CONTROL",
    ]);

export const READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES =
    Object.freeze({
        verificationOnly: true,

        readOnly: true,
        advisoryOnly: true,

        executesTelemetrySynchronization: false,
        mutatesTelemetry: false,

        executesEventDetection: false,
        mutatesEvents: false,

        recalculatesEngineeringAnalytics: false,

        trainsForecasting: false,
        executesForecasting: false,
        persistsForecasting: false,

        calculatesFinancialBi: false,
        aggregatesFinancialBi: false,
        persistsFinancialBi: false,

        buildsOptimizationModel: false,
        executesOptimizationSolver: false,
        generatesOptimizationRecommendation: false,
        persistsOptimizationRecommendation: false,

        sendsSetpoints: false,
        executesDispatch: false,

        startsGenerator: false,
        stopsGenerator: false,

        chargesBattery: false,
        dischargesBattery: false,

        shedsLoad: false,
        restoresLoad: false,

        operatesBreaker: false,

        writesDeviceRegisters: false,
        writesModbusRegisters: false,

        automaticDispatch: false,
        executableControl: false,

        missingMeansZero: false,
        unavailableMeansZero: false,

        unitInferenceAllowed: false,
        topologyInferenceAllowed: false,
        identityInferenceAllowed: false,
        timestampInferenceAllowed: false,
    });


function isObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function requireObject(
    value,
    label
) {
    if (!isObject(value)) {
        throw new TypeError(
            `${label} must be an object`
        );
    }

    return value;
}


function requireString(
    value,
    label
) {
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


function normalizeMethod(
    method
) {
    return requireString(
        method,
        "method"
    ).toUpperCase();
}


export function verifyHttpMethodReadOnly({
    method,
    path = null,
} = {}) {
    const normalizedMethod =
        normalizeMethod(
            method
        );

    if (
        !READ_ONLY_CONTROL_BOUNDARY_ALLOWED_HTTP_METHODS
            .includes(
                normalizedMethod
            )
    ) {
        throw new Error(
            `HTTP_METHOD_NOT_READ_ONLY:${normalizedMethod}`
        );
    }

    return Object.freeze({
        verified: true,

        method:
            normalizedMethod,

        path:
            path ?? null,

        readOnly: true,
    });
}


export function verifyRouteDefinitionsReadOnly({
    routes,
} = {}) {
    if (!Array.isArray(routes)) {
        throw new TypeError(
            "routes must be an array"
        );
    }

    const verified =
        routes.map(
            (
                route,
                index
            ) => {
                requireObject(
                    route,
                    `routes[${index}]`
                );

                const method =
                    normalizeMethod(
                        route.method
                    );

                if (
                    method !== "GET"
                ) {
                    throw new Error(
                        `ROUTE_${index}_MUTATING_METHOD:${method}`
                    );
                }

                return Object.freeze({
                    method,

                    path:
                        route.path ??
                        null,

                    readOnly:
                        true,
                });
            }
        );

    return Object.freeze({
        verified: true,

        routeCount:
            verified.length,

        routes:
            Object.freeze(
                verified
            ),
    });
}


export function verifyActionIsNonExecutable({
    action,
} = {}) {
    const normalizedAction =
        requireString(
            action,
            "action"
        ).toUpperCase();

    if (
        READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_ACTIONS
            .includes(
                normalizedAction
            )
    ) {
        throw new Error(
            `FORBIDDEN_CONTROL_ACTION:${normalizedAction}`
        );
    }

    return Object.freeze({
        verified: true,

        action:
            normalizedAction,

        executable:
            false,
    });
}


export function verifyAdvisoryRecommendation({
    recommendation,
} = {}) {
    requireObject(
        recommendation,
        "recommendation"
    );

    if (
        recommendation.autoDispatch === true
    ) {
        throw new Error(
            "RECOMMENDATION_AUTO_DISPATCH_PROHIBITED"
        );
    }

    if (
        recommendation.executable === true
    ) {
        throw new Error(
            "RECOMMENDATION_EXECUTABLE_CONTROL_PROHIBITED"
        );
    }

    if (
        recommendation.controlAction === true
    ) {
        throw new Error(
            "RECOMMENDATION_CONTROL_ACTION_PROHIBITED"
        );
    }

    return Object.freeze({
        verified: true,

        advisoryOnly: true,

        autoDispatch: false,

        executable: false,
    });
}


export function verifyNoMutationFlags({
    boundaries,
    label = "boundaries",
} = {}) {
    requireObject(
        boundaries,
        label
    );

    const forbiddenTrueFlags =
        [
            "mutatesTelemetry",
            "mutatesEvents",

            "trainsForecasting",
            "executesForecasting",
            "persistsForecasting",

            "calculatesFinancialBi",
            "aggregatesFinancialBi",
            "persistsFinancialBi",

            "buildsOptimizationModel",
            "executesOptimizationSolver",
            "generatesOptimizationRecommendation",
            "persistsOptimizationRecommendation",

            "sendsSetpoints",
            "executesDispatch",

            "startsGenerator",
            "stopsGenerator",

            "chargesBattery",
            "dischargesBattery",

            "shedsLoad",
            "restoresLoad",

            "operatesBreaker",

            "writesDeviceRegisters",
            "writesModbusRegisters",

            "automaticDispatch",
            "executableControl",
        ];

    for (
        const field of
        forbiddenTrueFlags
    ) {
        if (
            boundaries[field] === true
        ) {
            throw new Error(
                `${label}.${field} must not be true`
            );
        }
    }

    return Object.freeze({
        verified: true,

        checkedFlags:
            Object.freeze(
                [
                    ...forbiddenTrueFlags,
                ]
            ),
    });
}


export function verifyReadOnlyApiBoundary({
    methods,
} = {}) {
    if (!Array.isArray(methods)) {
        throw new TypeError(
            "methods must be an array"
        );
    }

    const normalized =
        methods.map(
            method =>
                normalizeMethod(
                    method
                )
        );

    for (
        const method of
        normalized
    ) {
        if (
            method !== "GET"
        ) {
            throw new Error(
                `API_WRITE_METHOD_PROHIBITED:${method}`
            );
        }
    }

    return Object.freeze({
        verified: true,

        methods:
            Object.freeze(
                normalized
            ),

        readOnly: true,
    });
}


export function verifyControlBoundary({
    control,
} = {}) {
    requireObject(
        control,
        "control"
    );

    const forbidden =
        [
            "sendSetpoint",
            "dispatch",
            "startGenerator",
            "stopGenerator",
            "chargeBattery",
            "dischargeBattery",
            "shedLoad",
            "restoreLoad",
            "openBreaker",
            "closeBreaker",
            "writeRegister",
            "autoDispatch",
            "execute",
        ];

    for (
        const field of
        forbidden
    ) {
        if (
            control[field] === true
        ) {
            throw new Error(
                `CONTROL_BOUNDARY_VIOLATION:${field}`
            );
        }
    }

    return Object.freeze({
        verified: true,

        advisoryOnly: true,

        executableControl:
            false,
    });
}


export function verifyCrossLayerReadOnlyControlBoundary({
    routeGroups = [],
    boundaryGroups = [],
    recommendations = [],
    controls = [],
} = {}) {
    try {
        if (
            !Array.isArray(
                routeGroups
            ) ||
            !Array.isArray(
                boundaryGroups
            ) ||
            !Array.isArray(
                recommendations
            ) ||
            !Array.isArray(
                controls
            )
        ) {
            throw new TypeError(
                "routeGroups, boundaryGroups, recommendations and controls must be arrays"
            );
        }

        const verifiedRoutes =
            routeGroups.map(
                (
                    group,
                    index
                ) => {
                    requireObject(
                        group,
                        `routeGroups[${index}]`
                    );

                    return verifyRouteDefinitionsReadOnly({
                        routes:
                            group.routes ??
                            [],
                    });
                }
            );

        const verifiedBoundaries =
            boundaryGroups.map(
                (
                    group,
                    index
                ) => {
                    requireObject(
                        group,
                        `boundaryGroups[${index}]`
                    );

                    return verifyNoMutationFlags({
                        boundaries:
                            group.boundaries,

                        label:
                            group.name ??
                            `boundaryGroups[${index}]`,
                    });
                }
            );

        const verifiedRecommendations =
            recommendations.map(
                recommendation =>
                    verifyAdvisoryRecommendation({
                        recommendation,
                    })
            );

        const verifiedControls =
            controls.map(
                control =>
                    verifyControlBoundary({
                        control,
                    })
            );

        return Object.freeze({
            phase:
                READ_ONLY_CONTROL_BOUNDARY_PHASE,

            layer:
                READ_ONLY_CONTROL_BOUNDARY_LAYER,

            status:
                READ_ONLY_CONTROL_BOUNDARY_STATUS
                    .VERIFIED,

            verified: true,

            routeGroupCount:
                verifiedRoutes.length,

            boundaryGroupCount:
                verifiedBoundaries.length,

            recommendationCount:
                verifiedRecommendations.length,

            controlCount:
                verifiedControls.length,

            boundaries:
                READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES,

            error: null,
        });
    }
    catch (error) {
        return Object.freeze({
            phase:
                READ_ONLY_CONTROL_BOUNDARY_PHASE,

            layer:
                READ_ONLY_CONTROL_BOUNDARY_LAYER,

            status:
                READ_ONLY_CONTROL_BOUNDARY_STATUS
                    .ERROR,

            verified: false,

            routeGroupCount: 0,

            boundaryGroupCount: 0,

            recommendationCount: 0,

            controlCount: 0,

            boundaries:
                READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES,

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
    READ_ONLY_CONTROL_BOUNDARY_PHASE,
    READ_ONLY_CONTROL_BOUNDARY_LAYER,
    READ_ONLY_CONTROL_BOUNDARY_STATUS,

    READ_ONLY_CONTROL_BOUNDARY_ALLOWED_HTTP_METHODS,
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_HTTP_METHODS,
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_ACTIONS,

    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES,

    verifyHttpMethodReadOnly,
    verifyRouteDefinitionsReadOnly,
    verifyActionIsNonExecutable,
    verifyAdvisoryRecommendation,
    verifyNoMutationFlags,
    verifyReadOnlyApiBoundary,
    verifyControlBoundary,
    verifyCrossLayerReadOnlyControlBoundary,
});