import assert
    from "node:assert/strict";

import {
    BACKEND_API_INTEGRATION_PATHS,
    createBackendApiIntegrationRouter,
} from "../routes/backendApiIntegrationRoutes.js";

import {
    ENGINEERING_ANALYTICS_ROUTE_PATHS,
} from "../routes/engineeringAnalyticsRoutes.js";

import {
    RBAC_PERMISSIONS,
} from "../services/security/authorizationRbacService.js";

import {
    createProductionEngineeringHttpProvider,
} from "../services/engineering/productionEngineeringHttpProvider.js";

import {
    createProductionEngineeringAggregate,
    PRODUCTION_ENGINEERING_FAMILY_KEYS,
} from "../services/engineering/productionEngineeringAggregateProvider.js";


const PHASE =
    "P.1H-G2-F2";


let assertionsPassed =
    0;


function pass(
    description
) {
    assertionsPassed +=
        1;

    console.log(
        `PASS ${assertionsPassed}: ${description}`
    );
}


function check(
    condition,
    description
) {
    assert.ok(
        condition,
        description
    );

    pass(
        description
    );
}


async function rejectsWith(
    action,
    predicate,
    description
) {
    let rejected =
        false;

    try {
        await action();
    }
    catch (error) {
        rejected =
            Boolean(
                predicate(
                    error
                )
            );
    }

    check(
        rejected,
        description
    );
}


console.log(
    "\n================================================"
);

console.log(
    "P.1H-G2-F2 FULL ENGINEERING ACL INTEGRATION"
);

console.log(
    "================================================\n"
);


/*
|--------------------------------------------------------------------------
| A. Canonical HTTP topology
|--------------------------------------------------------------------------
*/

check(
    PHASE ===
        "P.1H-G2-F2",
    "phase identity is correct"
);


check(
    BACKEND_API_INTEGRATION_PATHS
        .ENGINEERING_ANALYTICS ===
        "/engineering-analytics",
    "canonical Engineering Analytics mount is preserved"
);


const expectedRoutePaths =
    [
        "/health",
        "/fleet",
        "/families",
        "/families/:family",
        "/sites",
        "/sites/:vrmSiteId",
        "/sites/:vrmSiteId/families/:family",
    ];


check(
    Object.values(
        ENGINEERING_ANALYTICS_ROUTE_PATHS
    ).length ===
        7,
    "Engineering Analytics exposes exactly seven GET route contracts"
);


for (
    const routePath
    of expectedRoutePaths
) {
    check(
        Object.values(
            ENGINEERING_ANALYTICS_ROUTE_PATHS
        ).includes(
            routePath
        ),
        `Engineering route contract is preserved: ${routePath}`
    );
}


/*
|--------------------------------------------------------------------------
| B. Canonical parent security composition
|--------------------------------------------------------------------------
|
| We use dependency injection to observe the parent router without
| starting Express, MongoDB, VRM, scheduler, or MQTT.
|
*/

const useCalls =
    [];


const fakeRouter =
    {
        use(
            ...args
        ) {
            useCalls.push(
                args
            );

            return this;
        },
    };


function routerFactory() {
    return fakeRouter;
}


const authMiddleware =
    function testAuthenticate(
        req,
        res,
        next
    ) {
        next();
    };


const activeSessionMiddleware =
    function testActiveSession(
        req,
        res,
        next
    ) {
        next();
    };


const requestedPermissions =
    [];


const permissionMiddlewareByPermission =
    new Map();


function permissionFactory(
    permission
) {
    requestedPermissions.push(
        permission
    );

    const middleware =
        function testPermission(
            req,
            res,
            next
        ) {
            next();
        };

    permissionMiddlewareByPermission
        .set(
            permission,
            middleware
        );

    return middleware;
}


/*
|--------------------------------------------------------------------------
| Minimal analytical fixtures for non-Engineering surfaces
|--------------------------------------------------------------------------
*/

const aggregateFixture =
    async () => ({
        marker:
            "ENGINEERING_AGGREGATE",
    });


function engineeringControllerFactory({
    aggregateProvider,
}) {
    check(
        aggregateProvider ===
            aggregateFixture,
        "Engineering controller receives aggregate provider unchanged"
    );

    return Object.freeze({
        health() {},
        fleet() {},
        families() {},
        family() {},
        sites() {},
        site() {},
        siteFamily() {},
    });
}


const engineeringRouter =
    Object.freeze({
        marker:
            "ENGINEERING_ROUTER",
    });


function engineeringRouterFactory({
    controller,
}) {
    check(
        Boolean(
            controller
        ),
        "Engineering router receives composed controller"
    );

    return engineeringRouter;
}


const forecastingService =
    Object.freeze({
        marker:
            "FORECASTING_SERVICE",
    });


function forecastingApiServiceFactory() {
    return forecastingService;
}


const forecastingController =
    Object.freeze({
        marker:
            "FORECASTING_CONTROLLER",
    });


function forecastingControllerFactory({
    forecastingApiService,
}) {
    check(
        forecastingApiService ===
            forecastingService,
        "Forecasting fixture receives its service"
    );

    return forecastingController;
}


const forecastingRouter =
    Object.freeze({
        marker:
            "FORECASTING_ROUTER",
    });


function forecastingRouterFactory({
    controller,
}) {
    check(
        controller ===
            forecastingController,
        "Forecasting fixture receives its controller"
    );

    return forecastingRouter;
}


const financialBiRouter =
    Object.freeze({
        marker:
            "FINANCIAL_BI_ROUTER",
    });


function financialBiRouterFactory() {
    return financialBiRouter;
}


const optimizationDssRouter =
    Object.freeze({
        marker:
            "OPTIMIZATION_DSS_ROUTER",
    });


createBackendApiIntegrationRouter({
    engineeringAggregateProvider:
        aggregateFixture,

    ForecastRecordModel:
        {},

    routerFactory,

    engineeringControllerFactory,

    engineeringRouterFactory,

    forecastingApiServiceFactory,

    forecastingControllerFactory,

    forecastingRouterFactory,

    financialBiRouterFactory,

    optimizationDssRouter,

    authenticate:
        authMiddleware,

    requireActiveSession:
        activeSessionMiddleware,

    requirePermission:
        permissionFactory,
});


check(
    requestedPermissions.includes(
        RBAC_PERMISSIONS
            .READ_ENGINEERING_ANALYTICS
    ),
    "canonical parent requests READ_ENGINEERING_ANALYTICS"
);


const engineeringMount =
    useCalls.find(
        (
            call
        ) =>
            call[0] ===
            BACKEND_API_INTEGRATION_PATHS
                .ENGINEERING_ANALYTICS
    );


check(
    Boolean(
        engineeringMount
    ),
    "Engineering Analytics is mounted on canonical parent path"
);


check(
    engineeringMount.length ===
        5,
    "Engineering mount contains path plus exactly three security stages and router"
);


check(
    engineeringMount[1] ===
        authMiddleware,
    "Engineering mount authenticates ACCESS token first"
);


check(
    engineeringMount[2] ===
        activeSessionMiddleware,
    "Engineering mount validates active portal session second"
);


check(
    engineeringMount[3] ===
        permissionMiddlewareByPermission
            .get(
                RBAC_PERMISSIONS
                    .READ_ENGINEERING_ANALYTICS
            ),
    "Engineering mount enforces READ_ENGINEERING_ANALYTICS third"
);


check(
    engineeringMount[4] ===
        engineeringRouter,
    "Engineering router is reached only after all three security stages"
);


/*
|--------------------------------------------------------------------------
| C. Production HTTP identity/window boundary
|--------------------------------------------------------------------------
*/

const authenticatedUserId =
    "507f1f77bcf86cd799439011";


const requestedStart =
    "2026-09-20T00:00:00.000Z";


const requestedEnd =
    "2026-09-21T00:00:00.000Z";


const siteFamilyLoader =
    async () => ({
        marker:
            "SITE_FAMILY_LOADER",
    });


let capturedAggregateInput =
    null;


const aggregateResult =
    Object.freeze({
        marker:
            "PRODUCTION_ENGINEERING_RESULT",
    });


const httpProvider =
    createProductionEngineeringHttpProvider({
        aggregateProvider:
            async (
                input
            ) => {
                capturedAggregateInput =
                    input;

                return aggregateResult;
            },

        siteFamilyLoader,
    });


const returnedAggregate =
    await httpProvider({
        req: {
            auth: {
                userId:
                    authenticatedUserId,
            },

            params: {
                vrmSiteId:
                    "SHOULD_NOT_LEAK",
            },
        },

        query: {
            start:
                requestedStart,

            end:
                requestedEnd,
        },
    });


check(
    returnedAggregate ===
        aggregateResult,
    "production HTTP provider preserves aggregate result by reference"
);


check(
    capturedAggregateInput
        .userId ===
        authenticatedUserId,
    "authenticated req.auth.userId becomes Engineering authorization identity"
);


check(
    capturedAggregateInput
        .reportingWindow
        .start instanceof Date,
    "production HTTP boundary normalizes reporting-window start"
);


check(
    capturedAggregateInput
        .reportingWindow
        .end instanceof Date,
    "production HTTP boundary normalizes reporting-window end"
);


check(
    capturedAggregateInput
        .reportingWindow
        .start
        .toISOString() ===
        requestedStart,
    "normalized start preserves requested instant"
);


check(
    capturedAggregateInput
        .reportingWindow
        .end
        .toISOString() ===
        requestedEnd,
    "normalized end preserves requested instant"
);


check(
    capturedAggregateInput
        .reportingWindow
        .semantics ===
        "[start,end)",
    "production HTTP boundary preserves exact [start,end) semantics"
);


check(
    capturedAggregateInput
        .siteFamilyLoader ===
        siteFamilyLoader,
    "production HTTP boundary passes production site-family loader by reference"
);


check(
    !Object.hasOwn(
        capturedAggregateInput,
        "req"
    ),
    "HTTP request object does not cross into aggregate layer"
);


check(
    !Object.hasOwn(
        capturedAggregateInput,
        "params"
    ),
    "HTTP route params do not become authorization scope"
);


await rejectsWith(
    () =>
        httpProvider({
            req: {
                auth: {},
            },

            query: {
                start:
                    requestedStart,

                end:
                    requestedEnd,
            },
        }),
    (
        error
    ) =>
        error?.statusCode ===
            401 &&
        error?.code ===
            "ENGINEERING_AUTHENTICATED_USER_REQUIRED",
    "missing authenticated principal fails closed"
);


await rejectsWith(
    () =>
        httpProvider({
            req: {
                auth: {
                    userId:
                        authenticatedUserId,
                },
            },

            query: {},
        }),
    (
        error
    ) =>
        error?.statusCode ===
            400 &&
        error?.code ===
            "ENGINEERING_REPORTING_WINDOW_REQUIRED",
    "missing explicit reporting window fails closed"
);


/*
|--------------------------------------------------------------------------
| D. Authorization scope before Engineering aggregation
|--------------------------------------------------------------------------
*/

const installationA =
    Object.freeze({
        _id:
            "507f1f77bcf86cd799439021",

        vrmSiteId:
            "18053",

        source:
            "VRM",
    });


const installationB =
    Object.freeze({
        _id:
            "507f1f77bcf86cd799439022",

        vrmSiteId:
            "18054",

        source:
            "VRM",
    });


const authorizedScope =
    Object.freeze({
        status:
            "RESOLVED",

        allowed:
            true,

        installations:
            Object.freeze([
                Object.freeze({
                    installationId:
                        String(
                            installationA._id
                        ),

                    vrmSiteId:
                        installationA.vrmSiteId,

                    installation:
                        installationA,
                }),

                Object.freeze({
                    installationId:
                        String(
                            installationB._id
                        ),

                    vrmSiteId:
                        installationB.vrmSiteId,

                    installation:
                        installationB,
                }),
            ]),

        vrmSiteIds:
            Object.freeze([
                installationA.vrmSiteId,
                installationB.vrmSiteId,
            ]),

        equipmentControlAllowed:
            false,

        automaticDispatchAllowed:
            false,
    });


const familyCalls =
    [];


const familyResultA =
    Object.freeze({
        marker:
            "FAMILY_A",
    });


const familyResultB =
    Object.freeze({
        marker:
            "FAMILY_B",
    });


async function authorizedFamilyLoader(
    input
) {
    familyCalls.push(
        input
    );

    const result =
        input.vrmSiteId ===
            installationA.vrmSiteId
            ? familyResultA
            : familyResultB;

    return Object.freeze({
        siteElectrical:
            result,

        energySource:
            null,

        battery:
            null,

        generator:
            null,

        grid:
            null,

        solar:
            null,
    });
}


let fleetInput =
    null;


const fleetResult =
    Object.freeze({
        marker:
            "AUTHORIZED_FLEET_RESULT",
    });


const authorizedResult =
    await createProductionEngineeringAggregate({
        userId:
            authenticatedUserId,

        reportingWindow:
            capturedAggregateInput
                .reportingWindow,

        resolveEngineeringScope:
            async ({
                userId,
            }) => {
                check(
                    userId ===
                        authenticatedUserId,
                    "aggregate authorization resolves scope from authenticated user identity"
                );

                return authorizedScope;
            },

        siteFamilyLoader:
            authorizedFamilyLoader,

        fleetAggregator:
            async (
                input
            ) => {
                fleetInput =
                    input;

                return fleetResult;
            },
    });


check(
    authorizedResult ===
        fleetResult,
    "authorized aggregate result is preserved by reference"
);


check(
    familyCalls.length ===
        2,
    "site-family analytics run exactly once per authorized Installation"
);


check(
    familyCalls.every(
        (
            call
        ) =>
            authorizedScope
                .vrmSiteIds
                .includes(
                    call.vrmSiteId
                )
    ),
    "site-family loader receives only entitled VRM site identities"
);


check(
    familyCalls[0]
        .installation ===
        installationA &&
    familyCalls[1]
        .installation ===
        installationB,
    "authorized Installation objects are preserved by reference"
);


check(
    familyCalls.every(
        (
            call
        ) =>
            call.reportingWindow ===
            capturedAggregateInput
                .reportingWindow
    ),
    "every authorized site receives the exact HTTP reporting window"
);


check(
    fleetInput
        .sites
        .length ===
        2,
    "fleet aggregation receives exactly the authorized site population"
);


check(
    fleetInput
        .sites
        .every(
            (
                site
            ) =>
                authorizedScope
                    .vrmSiteIds
                    .includes(
                        site
                            .installation
                            .vrmSiteId
                    )
        ),
    "fleet aggregation contains no site outside authorization scope"
);


check(
    fleetInput
        .reportingWindow ===
        capturedAggregateInput
            .reportingWindow,
    "fleet aggregation preserves exact authorized reporting window"
);


check(
    fleetInput
        .sites[0]
        .families
        .siteElectrical ===
        familyResultA &&
    fleetInput
        .sites[1]
        .families
        .siteElectrical ===
        familyResultB,
    "family analytics remain attached only to their authorized Installation"
);


check(
    PRODUCTION_ENGINEERING_FAMILY_KEYS
        .length ===
        6,
    "production Engineering contract remains exactly six analytical families"
);


/*
|--------------------------------------------------------------------------
| E. Empty authorization scope
|--------------------------------------------------------------------------
*/

let emptyLoaderCalls =
    0;


let emptyFleetInput =
    null;


const emptyFleetResult =
    Object.freeze({
        marker:
            "EMPTY_AUTHORIZED_FLEET",
    });


const emptyResult =
    await createProductionEngineeringAggregate({
        userId:
            authenticatedUserId,

        reportingWindow:
            capturedAggregateInput
                .reportingWindow,

        resolveEngineeringScope:
            async () =>
                Object.freeze({
                    status:
                        "RESOLVED",

                    allowed:
                        true,

                    installations:
                        Object.freeze([]),

                    vrmSiteIds:
                        Object.freeze([]),

                    equipmentControlAllowed:
                        false,

                    automaticDispatchAllowed:
                        false,
                }),

        siteFamilyLoader:
            async () => {
                emptyLoaderCalls +=
                    1;

                throw new Error(
                    "Empty authorization scope must not load site analytics."
                );
            },

        fleetAggregator:
            async (
                input
            ) => {
                emptyFleetInput =
                    input;

                return emptyFleetResult;
            },
    });


check(
    emptyResult ===
        emptyFleetResult,
    "zero entitlements produce legitimate empty Engineering aggregate"
);


check(
    emptyLoaderCalls ===
        0,
    "zero entitlements invoke no site-family analytics"
);


check(
    Array.isArray(
        emptyFleetInput
            .sites
    ) &&
    emptyFleetInput
        .sites
        .length ===
        0,
    "zero entitlements become exactly sites=[] rather than unrestricted scope"
);


check(
    emptyFleetInput
        .reportingWindow ===
        capturedAggregateInput
            .reportingWindow,
    "empty authorized scope preserves reporting window"
);


/*
|--------------------------------------------------------------------------
| F. Fail-closed authorization states
|--------------------------------------------------------------------------
*/

let denyLoaderCalls =
    0;


await rejectsWith(
    () =>
        createProductionEngineeringAggregate({
            userId:
                authenticatedUserId,

            reportingWindow:
                capturedAggregateInput
                    .reportingWindow,

            resolveEngineeringScope:
                async () => ({
                    status:
                        "DENY",

                    allowed:
                        false,

                    installations:
                        [],

                    vrmSiteIds:
                        [],
                }),

            siteFamilyLoader:
                async () => {
                    denyLoaderCalls +=
                        1;

                    return {};
                },

            fleetAggregator:
                async () => {
                    throw new Error(
                        "DENY must never reach fleet aggregation."
                    );
                },
        }),
    (
        error
    ) =>
        error?.statusCode ===
            403,
    "authorization DENY fails closed with 403"
);


check(
    denyLoaderCalls ===
        0,
    "authorization DENY invokes no site-family analytics"
);


let unavailableLoaderCalls =
    0;


await rejectsWith(
    () =>
        createProductionEngineeringAggregate({
            userId:
                authenticatedUserId,

            reportingWindow:
                capturedAggregateInput
                    .reportingWindow,

            resolveEngineeringScope:
                async () => ({
                    status:
                        "UNAVAILABLE",

                    allowed:
                        false,

                    installations:
                        [],

                    vrmSiteIds:
                        [],
                }),

            siteFamilyLoader:
                async () => {
                    unavailableLoaderCalls +=
                        1;

                    return {};
                },

            fleetAggregator:
                async () => {
                    throw new Error(
                        "UNAVAILABLE must never reach fleet aggregation."
                    );
                },
        }),
    (
        error
    ) =>
        error?.statusCode ===
            503,
    "authorization scope UNAVAILABLE fails closed with 503"
);


check(
    unavailableLoaderCalls ===
        0,
    "UNAVAILABLE authorization invokes no site-family analytics"
);


/*
|--------------------------------------------------------------------------
| G. Security invariants
|--------------------------------------------------------------------------
*/

check(
    authorizedScope
        .equipmentControlAllowed ===
        false,
    "Engineering authorization grants no equipment control"
);


check(
    authorizedScope
        .automaticDispatchAllowed ===
        false,
    "Engineering authorization grants no automatic dispatch"
);


check(
    !PRODUCTION_ENGINEERING_FAMILY_KEYS
        .includes(
            "control"
        ),
    "Engineering analytical families expose no control family"
);


check(
    !PRODUCTION_ENGINEERING_FAMILY_KEYS
        .includes(
            "dispatch"
        ),
    "Engineering analytical families expose no dispatch family"
);


console.log(
    `\nAssertions passed: ${assertionsPassed}`
);

console.log(
    "================================================"
);

console.log(
    "P.1H-G2-F2 FULL ENGINEERING ACL INTEGRATION PASSED"
);

console.log(
    "================================================"
);
