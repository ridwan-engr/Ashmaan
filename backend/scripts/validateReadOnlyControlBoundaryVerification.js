// scripts/validateReadOnlyControlBoundaryVerification.js

import assert from "node:assert/strict";

import {
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
} from "../services/integration/readOnlyControlBoundaryVerificationService.js";


let passed = 0;


function equal(
    actual,
    expected,
    message
) {
    assert.equal(
        actual,
        expected,
        message
    );

    passed += 1;

    console.log(
        `PASS ${passed}: ${message}`
    );
}


function ok(
    value,
    message
) {
    assert.ok(
        value,
        message
    );

    passed += 1;

    console.log(
        `PASS ${passed}: ${message}`
    );
}


function expectThrow(
    fn,
    expectedMessage,
    message
) {
    assert.throws(
        fn,
        error =>
            error?.message ===
            expectedMessage
    );

    passed += 1;

    console.log(
        `PASS ${passed}: ${message}`
    );
}


console.log(
    "\n================================================"
);

console.log(
    "ASHMAAN PHASE 12.12 READ-ONLY / CONTROL-BOUNDARY VERIFICATION"
);

console.log(
    "================================================\n"
);


/*
|--------------------------------------------------------------------------
| 1. PHASE CONTRACT
|--------------------------------------------------------------------------
*/

equal(
    READ_ONLY_CONTROL_BOUNDARY_PHASE,
    "12.12",
    "phase is 12.12"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_LAYER,
    "READ_ONLY_CONTROL_BOUNDARY_VERIFICATION",
    "layer is explicit"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_STATUS.VERIFIED,
    "VERIFIED",
    "VERIFIED status is explicit"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_STATUS.ERROR,
    "ERROR",
    "ERROR status is explicit"
);


/*
|--------------------------------------------------------------------------
| 2. HTTP METHOD CONTRACT
|--------------------------------------------------------------------------
*/

equal(
    READ_ONLY_CONTROL_BOUNDARY_ALLOWED_HTTP_METHODS.length,
    1,
    "only one HTTP method is allowed"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_ALLOWED_HTTP_METHODS[0],
    "GET",
    "GET is the only allowed HTTP method"
);

ok(
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_HTTP_METHODS.includes(
        "POST"
    ),
    "POST is forbidden"
);

ok(
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_HTTP_METHODS.includes(
        "PUT"
    ),
    "PUT is forbidden"
);

ok(
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_HTTP_METHODS.includes(
        "PATCH"
    ),
    "PATCH is forbidden"
);

ok(
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_HTTP_METHODS.includes(
        "DELETE"
    ),
    "DELETE is forbidden"
);


/*
|--------------------------------------------------------------------------
| 3. GLOBAL BOUNDARIES
|--------------------------------------------------------------------------
*/

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.verificationOnly,
    true,
    "12.12 is verification-only"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.readOnly,
    true,
    "12.12 preserves read-only operation"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.advisoryOnly,
    true,
    "12.12 preserves advisory-only behavior"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.mutatesTelemetry,
    false,
    "telemetry mutation is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.mutatesEvents,
    false,
    "event mutation is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.recalculatesEngineeringAnalytics,
    false,
    "Engineering Analytics recalculation is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.trainsForecasting,
    false,
    "forecast training is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.executesForecasting,
    false,
    "forecast execution is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.persistsForecasting,
    false,
    "forecast persistence is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.calculatesFinancialBi,
    false,
    "Financial/BI calculation is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.aggregatesFinancialBi,
    false,
    "Financial/BI aggregation is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.persistsFinancialBi,
    false,
    "Financial/BI persistence is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.buildsOptimizationModel,
    false,
    "optimization model construction is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.executesOptimizationSolver,
    false,
    "optimization solver execution is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.generatesOptimizationRecommendation,
    false,
    "recommendation generation is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.persistsOptimizationRecommendation,
    false,
    "recommendation persistence is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.sendsSetpoints,
    false,
    "setpoint transmission is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.executesDispatch,
    false,
    "dispatch execution is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.startsGenerator,
    false,
    "generator start is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.stopsGenerator,
    false,
    "generator stop is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.chargesBattery,
    false,
    "battery charging command is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.dischargesBattery,
    false,
    "battery discharging command is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.shedsLoad,
    false,
    "load shedding command is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.restoresLoad,
    false,
    "load restoration command is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.operatesBreaker,
    false,
    "breaker control is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.writesDeviceRegisters,
    false,
    "device register write is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.writesModbusRegisters,
    false,
    "Modbus register write is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.automaticDispatch,
    false,
    "automatic dispatch is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.executableControl,
    false,
    "executable control is prohibited"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.missingMeansZero,
    false,
    "missing is not zero"
);

equal(
    READ_ONLY_CONTROL_BOUNDARY_BOUNDARIES.unavailableMeansZero,
    false,
    "UNAVAILABLE is not zero"
);


/*
|--------------------------------------------------------------------------
| 4. HTTP READ-ONLY VERIFICATION
|--------------------------------------------------------------------------
*/

const getRoute =
    verifyHttpMethodReadOnly({
        method:
            "GET",

        path:
            "/api/v1/optimization-dss/recommendations",
    });

equal(
    getRoute.verified,
    true,
    "GET route verifies"
);

equal(
    getRoute.readOnly,
    true,
    "GET route remains read-only"
);

expectThrow(
    () =>
        verifyHttpMethodReadOnly({
            method:
                "POST",

            path:
                "/api/v1/optimization-dss/recommendations",
        }),

    "HTTP_METHOD_NOT_READ_ONLY:POST",

    "POST route is rejected"
);

expectThrow(
    () =>
        verifyHttpMethodReadOnly({
            method:
                "PUT",
        }),

    "HTTP_METHOD_NOT_READ_ONLY:PUT",

    "PUT route is rejected"
);

expectThrow(
    () =>
        verifyHttpMethodReadOnly({
            method:
                "PATCH",
        }),

    "HTTP_METHOD_NOT_READ_ONLY:PATCH",

    "PATCH route is rejected"
);

expectThrow(
    () =>
        verifyHttpMethodReadOnly({
            method:
                "DELETE",
        }),

    "HTTP_METHOD_NOT_READ_ONLY:DELETE",

    "DELETE route is rejected"
);


/*
|--------------------------------------------------------------------------
| 5. ROUTE GROUPS
|--------------------------------------------------------------------------
*/

const engineeringRoutes =
    [
        {
            method:
                "GET",

            path:
                "/health",
        },

        {
            method:
                "GET",

            path:
                "/fleet",
        },

        {
            method:
                "GET",

            path:
                "/sites",
        },
    ];


const forecastingRoutes =
    [
        {
            method:
                "GET",

            path:
                "/health",
        },

        {
            method:
                "GET",

            path:
                "/forecasts",
        },

        {
            method:
                "GET",

            path:
                "/forecasts/:id",
        },
    ];


const financialRoutes =
    [
        {
            method:
                "GET",

            path:
                "/kpis",
        },

        {
            method:
                "GET",

            path:
                "/kpis/:persistenceKey",
        },
    ];


const optimizationRoutes =
    [
        {
            method:
                "GET",

            path:
                "/recommendations",
        },

        {
            method:
                "GET",

            path:
                "/recommendations/:persistenceKey",
        },
    ];


const routeVerification =
    verifyRouteDefinitionsReadOnly({
        routes:
            [
                ...engineeringRoutes,
                ...forecastingRoutes,
                ...financialRoutes,
                ...optimizationRoutes,
            ],
    });

equal(
    routeVerification.verified,
    true,
    "all Phase 8-11 API routes verify read-only"
);

equal(
    routeVerification.routeCount,
    10,
    "ten representative GET routes verified"
);


expectThrow(
    () =>
        verifyRouteDefinitionsReadOnly({
            routes:
                [
                    {
                        method:
                            "GET",
                    },

                    {
                        method:
                            "POST",
                    },
                ],
        }),

    "ROUTE_1_MUTATING_METHOD:POST",

    "mixed GET/POST route group is rejected"
);


/*
|--------------------------------------------------------------------------
| 6. FORBIDDEN ACTIONS
|--------------------------------------------------------------------------
*/

ok(
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_ACTIONS.includes(
        "EXECUTE_DISPATCH"
    ),
    "dispatch execution is explicitly forbidden"
);

ok(
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_ACTIONS.includes(
        "SEND_SETPOINT"
    ),
    "setpoint transmission is explicitly forbidden"
);

ok(
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_ACTIONS.includes(
        "START_GENERATOR"
    ),
    "generator start is explicitly forbidden"
);

ok(
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_ACTIONS.includes(
        "CHARGE_BATTERY"
    ),
    "battery charge command is explicitly forbidden"
);

ok(
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_ACTIONS.includes(
        "SHED_LOAD"
    ),
    "load shed command is explicitly forbidden"
);

ok(
    READ_ONLY_CONTROL_BOUNDARY_FORBIDDEN_ACTIONS.includes(
        "WRITE_MODBUS_REGISTER"
    ),
    "Modbus write is explicitly forbidden"
);


expectThrow(
    () =>
        verifyActionIsNonExecutable({
            action:
                "EXECUTE_DISPATCH",
        }),

    "FORBIDDEN_CONTROL_ACTION:EXECUTE_DISPATCH",

    "dispatch execution action is rejected"
);

expectThrow(
    () =>
        verifyActionIsNonExecutable({
            action:
                "SEND_SETPOINT",
        }),

    "FORBIDDEN_CONTROL_ACTION:SEND_SETPOINT",

    "setpoint action is rejected"
);

expectThrow(
    () =>
        verifyActionIsNonExecutable({
            action:
                "START_GENERATOR",
        }),

    "FORBIDDEN_CONTROL_ACTION:START_GENERATOR",

    "generator start action is rejected"
);

expectThrow(
    () =>
        verifyActionIsNonExecutable({
            action:
                "DISCHARGE_BATTERY",
        }),

    "FORBIDDEN_CONTROL_ACTION:DISCHARGE_BATTERY",

    "battery discharge action is rejected"
);

expectThrow(
    () =>
        verifyActionIsNonExecutable({
            action:
                "SHED_LOAD",
        }),

    "FORBIDDEN_CONTROL_ACTION:SHED_LOAD",

    "load shedding action is rejected"
);

expectThrow(
    () =>
        verifyActionIsNonExecutable({
            action:
                "WRITE_MODBUS_REGISTER",
        }),

    "FORBIDDEN_CONTROL_ACTION:WRITE_MODBUS_REGISTER",

    "Modbus register write is rejected"
);


/*
|--------------------------------------------------------------------------
| 7. ADVISORY RECOMMENDATIONS
|--------------------------------------------------------------------------
*/

const advisory =
    verifyAdvisoryRecommendation({
        recommendation:
            {
                kind:
                    "DISPATCH_SETPOINT",

                autoDispatch:
                    false,

                executable:
                    false,

                controlAction:
                    false,
            },
    });

equal(
    advisory.verified,
    true,
    "Optimization/DSS recommendation verifies"
);

equal(
    advisory.advisoryOnly,
    true,
    "Optimization/DSS recommendation remains advisory"
);

equal(
    advisory.autoDispatch,
    false,
    "recommendation does not auto-dispatch"
);

equal(
    advisory.executable,
    false,
    "recommendation is non-executable"
);


expectThrow(
    () =>
        verifyAdvisoryRecommendation({
            recommendation:
                {
                    autoDispatch:
                        true,
                },
        }),

    "RECOMMENDATION_AUTO_DISPATCH_PROHIBITED",

    "auto-dispatch recommendation is rejected"
);

expectThrow(
    () =>
        verifyAdvisoryRecommendation({
            recommendation:
                {
                    executable:
                        true,
                },
        }),

    "RECOMMENDATION_EXECUTABLE_CONTROL_PROHIBITED",

    "executable recommendation is rejected"
);

expectThrow(
    () =>
        verifyAdvisoryRecommendation({
            recommendation:
                {
                    controlAction:
                        true,
                },
        }),

    "RECOMMENDATION_CONTROL_ACTION_PROHIBITED",

    "direct control recommendation is rejected"
);


/*
|--------------------------------------------------------------------------
| 8. BOUNDARY FLAGS
|--------------------------------------------------------------------------
*/

const safeBoundaries =
    {
        mutatesTelemetry:
            false,

        mutatesEvents:
            false,

        trainsForecasting:
            false,

        executesForecasting:
            false,

        persistsForecasting:
            false,

        calculatesFinancialBi:
            false,

        aggregatesFinancialBi:
            false,

        persistsFinancialBi:
            false,

        buildsOptimizationModel:
            false,

        executesOptimizationSolver:
            false,

        generatesOptimizationRecommendation:
            false,

        persistsOptimizationRecommendation:
            false,

        sendsSetpoints:
            false,

        executesDispatch:
            false,

        startsGenerator:
            false,

        stopsGenerator:
            false,

        chargesBattery:
            false,

        dischargesBattery:
            false,

        shedsLoad:
            false,

        restoresLoad:
            false,

        operatesBreaker:
            false,

        writesDeviceRegisters:
            false,

        writesModbusRegisters:
            false,

        automaticDispatch:
            false,

        executableControl:
            false,
    };


const boundaryCheck =
    verifyNoMutationFlags({
        boundaries:
            safeBoundaries,

        label:
            "phase12",
    });

equal(
    boundaryCheck.verified,
    true,
    "safe Phase 12 boundaries verify"
);


expectThrow(
    () =>
        verifyNoMutationFlags({
            boundaries:
                {
                    ...safeBoundaries,

                    mutatesTelemetry:
                        true,
                },

            label:
                "phase12",
        }),

    "phase12.mutatesTelemetry must not be true",

    "telemetry mutation boundary violation is rejected"
);


expectThrow(
    () =>
        verifyNoMutationFlags({
            boundaries:
                {
                    ...safeBoundaries,

                    executesOptimizationSolver:
                        true,
                },

            label:
                "phase12",
        }),

    "phase12.executesOptimizationSolver must not be true",

    "optimization solver execution boundary violation is rejected"
);


expectThrow(
    () =>
        verifyNoMutationFlags({
            boundaries:
                {
                    ...safeBoundaries,

                    persistsOptimizationRecommendation:
                        true,
                },

            label:
                "phase12",
        }),

    "phase12.persistsOptimizationRecommendation must not be true",

    "recommendation persistence boundary violation is rejected"
);


expectThrow(
    () =>
        verifyNoMutationFlags({
            boundaries:
                {
                    ...safeBoundaries,

                    sendsSetpoints:
                        true,
                },

            label:
                "phase12",
        }),

    "phase12.sendsSetpoints must not be true",

    "setpoint transmission boundary violation is rejected"
);


/*
|--------------------------------------------------------------------------
| 9. API BOUNDARY
|--------------------------------------------------------------------------
*/

const apiBoundary =
    verifyReadOnlyApiBoundary({
        methods:
            [
                "GET",
                "GET",
                "GET",
                "GET",
            ],
    });

equal(
    apiBoundary.verified,
    true,
    "API boundary verifies"
);

equal(
    apiBoundary.readOnly,
    true,
    "API boundary remains read-only"
);


expectThrow(
    () =>
        verifyReadOnlyApiBoundary({
            methods:
                [
                    "GET",
                    "POST",
                ],
        }),

    "API_WRITE_METHOD_PROHIBITED:POST",

    "API POST method is rejected"
);


/*
|--------------------------------------------------------------------------
| 10. CONTROL BOUNDARY
|--------------------------------------------------------------------------
*/

const safeControl =
    {
        sendSetpoint:
            false,

        dispatch:
            false,

        startGenerator:
            false,

        stopGenerator:
            false,

        chargeBattery:
            false,

        dischargeBattery:
            false,

        shedLoad:
            false,

        restoreLoad:
            false,

        openBreaker:
            false,

        closeBreaker:
            false,

        writeRegister:
            false,

        autoDispatch:
            false,

        execute:
            false,
    };


const controlCheck =
    verifyControlBoundary({
        control:
            safeControl,
    });

equal(
    controlCheck.verified,
    true,
    "control boundary verifies"
);

equal(
    controlCheck.advisoryOnly,
    true,
    "control boundary remains advisory-only"
);

equal(
    controlCheck.executableControl,
    false,
    "control boundary remains non-executable"
);


expectThrow(
    () =>
        verifyControlBoundary({
            control:
                {
                    ...safeControl,

                    startGenerator:
                        true,
                },
        }),

    "CONTROL_BOUNDARY_VIOLATION:startGenerator",

    "generator start control is rejected"
);


expectThrow(
    () =>
        verifyControlBoundary({
            control:
                {
                    ...safeControl,

                    chargeBattery:
                        true,
                },
        }),

    "CONTROL_BOUNDARY_VIOLATION:chargeBattery",

    "battery charge control is rejected"
);


expectThrow(
    () =>
        verifyControlBoundary({
            control:
                {
                    ...safeControl,

                    shedLoad:
                        true,
                },
        }),

    "CONTROL_BOUNDARY_VIOLATION:shedLoad",

    "load shedding control is rejected"
);


expectThrow(
    () =>
        verifyControlBoundary({
            control:
                {
                    ...safeControl,

                    writeRegister:
                        true,
                },
        }),

    "CONTROL_BOUNDARY_VIOLATION:writeRegister",

    "device register write control is rejected"
);


/*
|--------------------------------------------------------------------------
| 11. FULL CROSS-LAYER VERIFICATION
|--------------------------------------------------------------------------
*/

const summary =
    verifyCrossLayerReadOnlyControlBoundary({
        routeGroups:
            [
                {
                    name:
                        "engineering",

                    routes:
                        engineeringRoutes,
                },

                {
                    name:
                        "forecasting",

                    routes:
                        forecastingRoutes,
                },

                {
                    name:
                        "financial",

                    routes:
                        financialRoutes,
                },

                {
                    name:
                        "optimization",

                    routes:
                        optimizationRoutes,
                },
            ],

        boundaryGroups:
            [
                {
                    name:
                        "phase12",

                    boundaries:
                        safeBoundaries,
                },
            ],

        recommendations:
            [
                {
                    autoDispatch:
                        false,

                    executable:
                        false,

                    controlAction:
                        false,
                },
            ],

        controls:
            [
                safeControl,
            ],
    });

equal(
    summary.phase,
    "12.12",
    "summary phase is 12.12"
);

equal(
    summary.layer,
    "READ_ONLY_CONTROL_BOUNDARY_VERIFICATION",
    "summary layer is correct"
);

equal(
    summary.status,
    READ_ONLY_CONTROL_BOUNDARY_STATUS.VERIFIED,
    "full read-only/control-boundary verification passes"
);

equal(
    summary.verified,
    true,
    "summary verified flag is true"
);

equal(
    summary.routeGroupCount,
    4,
    "four API route groups verified"
);

equal(
    summary.boundaryGroupCount,
    1,
    "one cross-layer boundary group verified"
);

equal(
    summary.recommendationCount,
    1,
    "advisory recommendation verified"
);

equal(
    summary.controlCount,
    1,
    "non-executable control boundary verified"
);


/*
|--------------------------------------------------------------------------
| 12. ILLEGAL FULL-PIPELINE CONTROL
|--------------------------------------------------------------------------
*/

const badSummary =
    verifyCrossLayerReadOnlyControlBoundary({
        routeGroups:
            [
                {
                    routes:
                        [
                            {
                                method:
                                    "POST",

                                path:
                                    "/dispatch",
                            },
                        ],
                },
            ],

        boundaryGroups:
            [],

        recommendations:
            [],

        controls:
            [],
    });

equal(
    badSummary.status,
    READ_ONLY_CONTROL_BOUNDARY_STATUS.ERROR,
    "mutating pipeline route produces verification ERROR"
);

equal(
    badSummary.verified,
    false,
    "mutating pipeline route is not verified"
);

equal(
    badSummary.error.message,
    "ROUTE_0_MUTATING_METHOD:POST",
    "mutating pipeline route failure reason is explicit"
);


console.log(
    "\n================================================"
);

console.log(
    `Assertions passed: ${passed}`
);

console.log(
    "================================================"
);

console.log(
    "ASHMAAN PHASE 12.12 READ-ONLY / CONTROL-BOUNDARY VERIFICATION PASSED"
);

console.log(
    "================================================\n"
);
