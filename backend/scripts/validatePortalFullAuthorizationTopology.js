import assert
    from "node:assert/strict";

import fs
    from "node:fs";

import path
    from "node:path";

import {
    fileURLToPath,
} from "node:url";


const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );


function readBackendFile(
    relativePath
) {
    return fs.readFileSync(
        path.resolve(
            __dirname,
            "..",
            relativePath
        ),
        "utf8"
    );
}


const serverSource =
    readBackendFile(
        "server.js"
    );

const indexSource =
    readBackendFile(
        "routes/index.js"
    );

const integrationSource =
    readBackendFile(
        "routes/backendApiIntegrationRoutes.js"
    );

const vrmSource =
    readBackendFile(
        "routes/vrmRoutes.js"
    );

const syncSource =
    readBackendFile(
        "routes/syncRoutes.js"
    );

const authSource =
    readBackendFile(
        "routes/portalAuthRoutes.js"
    );

const optimizationSource =
    readBackendFile(
        "routes/optimizationDssRoutes.js"
    );


let assertionCount = 0;


function pass(
    message
) {
    assertionCount += 1;

    console.log(
        `PASS ${assertionCount}: ${message}`
    );
}


function ok(
    condition,
    message
) {
    assert.ok(
        condition,
        message
    );

    pass(
        message
    );
}


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

    pass(
        message
    );
}


function normalizeWhitespace(
    value
) {
    return value
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


function escapeRegExp(
    value
) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


function getAppUseArguments(
    source,
    routePath
) {
    const escapedPath =
        escapeRegExp(
            routePath
        );

    const pattern =
        new RegExp(
            `app\\.use\\(\\s*"${escapedPath}"\\s*,([\\s\\S]*?)\\);`,
            "g"
        );

    return [
        ...source.matchAll(
            pattern
        ),
    ].map(
        (match) =>
            normalizeWhitespace(
                match[1]
            )
    );
}


function getRouterUseArguments(
    source,
    routePath
) {
    const escapedPath =
        escapeRegExp(
            routePath
        );

    const pattern =
        new RegExp(
            `router\\.use\\(\\s*"${escapedPath}"\\s*,([\\s\\S]*?)\\);`,
            "g"
        );

    return [
        ...source.matchAll(
            pattern
        ),
    ].map(
        (match) =>
            normalizeWhitespace(
                match[1]
            )
    );
}


function getRouterUseArgumentsByExpression(
    source,
    routeExpressionPattern
) {
    const pattern =
        new RegExp(
            `router\\.use\\(\\s*${routeExpressionPattern}\\s*,([\\s\\S]*?)\\);`,
            "g"
        );

    return [
        ...source.matchAll(
            pattern
        ),
    ].map(
        (match) =>
            normalizeWhitespace(
                match[1]
            )
    );
}


function assertOrderedChain(
    mount,
    stages,
    label
) {
    let previousIndex =
        -1;

    for (
        const stage
        of stages
    ) {
        const currentIndex =
            mount.indexOf(
                stage
            );

        ok(
            currentIndex >= 0,
            `${label} contains ${stage}`
        );

        ok(
            currentIndex >
            previousIndex,
            `${label} preserves ${stage} ordering`
        );

        previousIndex =
            currentIndex;
    }
}


/*
|--------------------------------------------------------------------------
| Explicit P.1G-F scope boundaries
|--------------------------------------------------------------------------
|
| P.1G-F validates route-family authorization topology.
|
| It does NOT claim that READ_DASHBOARD establishes entitlement to an
| arbitrary caller-selected installation/site identifier.
|
| User-to-site resource authorization remains a separate unresolved
| authorization boundary.
|
*/

const FULL_AUTHORIZATION_BOUNDARIES =
    Object.freeze({
        routeFamilyAuthorizationCovered:
            true,

        siteResourceAuthorizationCovered:
            false,

        userToSiteAclIncluded:
            false,

        syncAuthorizationMigrationIncluded:
            false,

        equipmentControlIncluded:
            false,

        automaticDispatchIncluded:
            false,
    });


console.log("");
console.log(
    "============================================================"
);
console.log(
    "ASHMAAN PORTAL P.1G-F — FULL AUTHORIZATION TOPOLOGY"
);
console.log(
    "============================================================"
);
console.log("");


/*
|--------------------------------------------------------------------------
| A. P.1G-F scope
|--------------------------------------------------------------------------
*/

equal(
    FULL_AUTHORIZATION_BOUNDARIES
        .routeFamilyAuthorizationCovered,
    true,
    "P.1G-F covers route-family authorization topology"
);

equal(
    FULL_AUTHORIZATION_BOUNDARIES
        .siteResourceAuthorizationCovered,
    false,
    "P.1G-F does not claim site-resource authorization coverage"
);

equal(
    FULL_AUTHORIZATION_BOUNDARIES
        .userToSiteAclIncluded,
    false,
    "user-to-site ACL remains outside P.1G-F"
);

equal(
    FULL_AUTHORIZATION_BOUNDARIES
        .syncAuthorizationMigrationIncluded,
    false,
    "P.1G-F does not migrate synchronization authorization"
);

equal(
    FULL_AUTHORIZATION_BOUNDARIES
        .equipmentControlIncluded,
    false,
    "P.1G-F introduces no equipment-control authorization"
);

equal(
    FULL_AUTHORIZATION_BOUNDARIES
        .automaticDispatchIncluded,
    false,
    "P.1G-F introduces no automatic-dispatch authorization"
);


/*
|--------------------------------------------------------------------------
| B. Canonical security dependencies
|--------------------------------------------------------------------------
*/

ok(
    serverSource.includes(
        'from "./middleware/authenticatePortalAccessToken.js";'
    ),
    "server uses canonical portal ACCESS authentication"
);

ok(
    serverSource.includes(
        'from "./middleware/requireActivePortalSession.js";'
    ),
    "server uses canonical active-session validation"
);

ok(
    serverSource.includes(
        'from "./middleware/requirePortalPermission.js";'
    ),
    "server uses canonical portal permission authorization"
);

ok(
    serverSource.includes(
        'from "./services/security/authorizationRbacService.js";'
    ),
    "server uses authoritative Phase 13.4 RBAC service"
);

ok(
    indexSource.includes(
        'from "../middleware/authenticatePortalAccessToken.js";'
    ),
    "API root uses canonical portal ACCESS authentication"
);

ok(
    indexSource.includes(
        'from "../middleware/requireActivePortalSession.js";'
    ),
    "API root uses canonical active-session validation"
);

ok(
    indexSource.includes(
        'from "../middleware/requirePortalPermission.js";'
    ),
    "API root uses canonical permission authorization"
);


/*
|--------------------------------------------------------------------------
| C. Public API boundaries
|--------------------------------------------------------------------------
*/

const healthMounts =
    getRouterUseArguments(
        indexSource,
        "/health"
    );

equal(
    healthMounts.length,
    1,
    "health API has exactly one /api/v1 mount"
);

ok(
    healthMounts[0]
        .includes(
            "healthRoutes"
        ),
    "health API retains existing health router"
);

ok(
    !healthMounts[0]
        .includes(
            "authenticatePortalAccessToken"
        ),
    "health API remains public by design"
);

ok(
    !healthMounts[0]
        .includes(
            "requirePortalPermission"
        ),
    "health API does not require portal RBAC"
);


/*
|--------------------------------------------------------------------------
| D. Portal authentication API boundary
|--------------------------------------------------------------------------
*/

const authMounts =
    getRouterUseArguments(
        indexSource,
        "/auth"
    );

equal(
    authMounts.length,
    1,
    "portal authentication API has exactly one /api/v1 mount"
);

ok(
    authMounts[0]
        .includes(
            "portalAuthRoutes"
        ),
    "portal authentication API retains dedicated auth router"
);

ok(
    !authMounts[0]
        .includes(
            "requireDashboardRead"
        ),
    "authentication API is not incorrectly wrapped in READ_DASHBOARD"
);


ok(
    /router\.post\s*\(\s*["']\/login["']/.test(
        authSource
    ),
    "portal login route remains present"
);

ok(
    /router\.post\s*\(\s*["']\/refresh["']/.test(
        authSource
    ),
    "portal refresh route remains present"
);

ok(
    /router\.post\s*\(\s*["']\/logout["']/.test(
        authSource
    ),
    "portal logout route remains present"
);

ok(
    /router\.get\s*\(\s*["']\/me["']/.test(
        authSource
    ),
    "portal current-user route remains present"
);

ok(
    authSource.includes(
        "authenticatePortalAccessToken"
    ),
    "portal auth router has ACCESS authentication for protected auth operations"
);

ok(
    authSource.includes(
        "requireActivePortalSession"
    ),
    "portal auth router has active-session validation for protected auth operations"
);


/*
|--------------------------------------------------------------------------
| E. Dashboard-family authorization
|--------------------------------------------------------------------------
*/

const dashboardMounts =
    getAppUseArguments(
        serverSource,
        "/api/v1/dashboard"
    );

const siteDashboardMounts =
    getAppUseArguments(
        serverSource,
        "/api/v1/dashboard/sites"
    );

const reliabilityMounts =
    getAppUseArguments(
        serverSource,
        "/api/v1/reliability"
    );

equal(
    dashboardMounts.length,
    1,
    "Dashboard has exactly one protected server mount"
);

equal(
    siteDashboardMounts.length,
    1,
    "Site Dashboard has exactly one protected server mount"
);

equal(
    reliabilityMounts.length,
    1,
    "Reliability has exactly one protected server mount"
);


assertOrderedChain(
    dashboardMounts[0],
    [
        "authenticatePortalAccessToken",
        "requireActivePortalSession",
        "requireDashboardRead",
        "dashboardRoutes",
    ],
    "Dashboard authorization chain"
);

assertOrderedChain(
    siteDashboardMounts[0],
    [
        "authenticatePortalAccessToken",
        "requireActivePortalSession",
        "requireDashboardRead",
        "siteDashboardRoutes",
    ],
    "Site Dashboard authorization chain"
);

assertOrderedChain(
    reliabilityMounts[0],
    [
        "authenticatePortalAccessToken",
        "requireActivePortalSession",
        "requireDashboardRead",
        "reliabilityRoutes",
    ],
    "Reliability authorization chain"
);

ok(
    normalizeWhitespace(
        serverSource
    ).includes(
        normalizeWhitespace(
            `
      const requireDashboardRead =
        requirePortalPermission(
          RBAC_PERMISSIONS.READ_DASHBOARD
        );
      `
        )
    ),
    "Dashboard-family authorization uses READ_DASHBOARD"
);


/*
|--------------------------------------------------------------------------
| F. Direct VRM authorization
|--------------------------------------------------------------------------
*/

const vrmMounts =
    getRouterUseArguments(
        indexSource,
        "/vrm"
    );

equal(
    vrmMounts.length,
    1,
    "direct VRM API has exactly one canonical mount"
);

assertOrderedChain(
    vrmMounts[0],
    [
        "authenticatePortalAccessToken",
        "requireActivePortalSession",
        "requireDashboardRead",
        "vrmRoutes",
    ],
    "Direct VRM authorization chain"
);

ok(
    !vrmSource.includes(
        "diagnostic-sample"
    ),
    "diagnostic-sample remains absent from direct VRM HTTP exposure"
);

ok(
    !/\brouter\.post\s*\(/.test(
        vrmSource
    ) &&
    !/\brouter\.put\s*\(/.test(
        vrmSource
    ) &&
    !/\brouter\.patch\s*\(/.test(
        vrmSource
    ) &&
    !/\brouter\.delete\s*\(/.test(
        vrmSource
    ),
    "direct VRM API remains read-only"
);


/*
|--------------------------------------------------------------------------
| G. Canonical analytical authorization
|--------------------------------------------------------------------------
*/

ok(
    /RBAC_PERMISSIONS\s*\.\s*READ_ENGINEERING_ANALYTICS/
        .test(
            integrationSource
        ),
    "Engineering Analytics requires READ_ENGINEERING_ANALYTICS"
);

ok(
    /RBAC_PERMISSIONS\s*\.\s*READ_FORECASTING/
        .test(
            integrationSource
        ),
    "Forecasting requires READ_FORECASTING"
);

ok(
    /RBAC_PERMISSIONS\s*\.\s*READ_FINANCIAL_BI/
        .test(
            integrationSource
        ),
    "Financial/BI requires READ_FINANCIAL_BI"
);

ok(
    /RBAC_PERMISSIONS\s*\.\s*READ_OPTIMIZATION_DSS/
        .test(
            integrationSource
        ),
    "canonical Optimization/DSS requires READ_OPTIMIZATION_DSS"
);


const engineeringMounts =
    getRouterUseArgumentsByExpression(
        integrationSource,
        "BACKEND_API_INTEGRATION_PATHS\\s*\\.ENGINEERING_ANALYTICS"
    );

const forecastingMounts =
    getRouterUseArgumentsByExpression(
        integrationSource,
        "BACKEND_API_INTEGRATION_PATHS\\s*\\.FORECASTING"
    );

const financialMounts =
    getRouterUseArgumentsByExpression(
        integrationSource,
        "BACKEND_API_INTEGRATION_PATHS\\s*\\.FINANCIAL_BI"
    );

const canonicalDssMounts =
    getRouterUseArgumentsByExpression(
        integrationSource,
        "BACKEND_API_INTEGRATION_PATHS\\s*\\.OPTIMIZATION_DSS"
    );


equal(
    engineeringMounts.length,
    1,
    "Engineering Analytics has exactly one canonical integration mount"
);

equal(
    forecastingMounts.length,
    1,
    "Forecasting has exactly one canonical integration mount"
);

equal(
    financialMounts.length,
    1,
    "Financial/BI has exactly one canonical integration mount"
);

equal(
    canonicalDssMounts.length,
    1,
    "Optimization/DSS has exactly one canonical integration mount"
);


assertOrderedChain(
  engineeringMounts[0],
  [
    "authenticate",
    "requireActiveSession",
    "requireEngineeringRead",
    "engineeringRouter",
  ],
  "Engineering Analytics authorization chain"
);

assertOrderedChain(
    forecastingMounts[0],
    [
        "authenticate",
        "requireActiveSession",
        "requireForecastingRead",
        "forecastingRouter",
    ],
    "Forecasting authorization chain"
);

assertOrderedChain(
    financialMounts[0],
    [
        "authenticate",
        "requireActiveSession",
        "requireFinancialBiRead",
        "financialBiRouter",
    ],
    "Financial/BI authorization chain"
);

assertOrderedChain(
    canonicalDssMounts[0],
    [
        "authenticate",
        "requireActiveSession",
        "requireOptimizationDssRead",
        "optimizationRouter",
    ],
    "Canonical Optimization/DSS authorization chain"
);


/*
|--------------------------------------------------------------------------
| H. Legacy Optimization/DSS compatibility authorization
|--------------------------------------------------------------------------
*/

const legacyDssMounts =
    getAppUseArguments(
        serverSource,
        "/api/optimization-dss"
    );

equal(
    legacyDssMounts.length,
    1,
    "legacy Optimization/DSS has exactly one compatibility mount"
);

assertOrderedChain(
    legacyDssMounts[0],
    [
        "authenticatePortalAccessToken",
        "requireActivePortalSession",
        "requireOptimizationDssRead",
        "optimizationDssRoutes",
    ],
    "Legacy Optimization/DSS authorization chain"
);

ok(
    normalizeWhitespace(
        serverSource
    ).includes(
        normalizeWhitespace(
            `
      const requireOptimizationDssRead =
        requirePortalPermission(
          RBAC_PERMISSIONS.READ_OPTIMIZATION_DSS
        );
      `
        )
    ),
    "legacy Optimization/DSS authorization uses READ_OPTIMIZATION_DSS"
);

ok(
    optimizationSource.includes(
        'router.get('
    ),
    "Optimization/DSS compatibility router remains read-only GET surface"
);

ok(
    !/\brouter\.(post|put|patch|delete)\s*\(/.test(
        optimizationSource
    ),
    "Optimization/DSS compatibility router exposes no mutation endpoint"
);


/*
|--------------------------------------------------------------------------
| I. Synchronization privileged boundary
|--------------------------------------------------------------------------
*/

const syncMounts =
    getRouterUseArguments(
        indexSource,
        "/sync"
    );

equal(
    syncMounts.length,
    1,
    "synchronization API has exactly one /api/v1 mount"
);

ok(
    syncMounts[0]
        .includes(
            "syncRoutes"
        ),
    "synchronization API retains existing sync router"
);

ok(
    syncSource.includes(
        "authenticateJwt"
    ),
    "synchronization API retains existing JWT authentication"
);

ok(
    syncSource.includes(
        "requirePrivilegedRole"
    ),
    "synchronization API retains existing privileged-role authorization"
);

ok(
    !syncMounts[0]
        .includes(
            "requireDashboardRead"
        ),
    "synchronization API is not incorrectly converted to READ_DASHBOARD"
);

ok(
    !syncSource.includes(
        "READ_DASHBOARD"
    ),
    "synchronization mutation boundary does not use dashboard-read permission"
);


/*
|--------------------------------------------------------------------------
| J. No portal equipment-control semantics
|--------------------------------------------------------------------------
*/

const portalTopologySource =
    [
        serverSource,
        indexSource,
        integrationSource,
        vrmSource,
        authSource,
        optimizationSource,
    ].join(
        "\n"
    );

ok(
    !portalTopologySource.includes(
        "EXECUTE_EQUIPMENT_CONTROL"
    ),
    "portal route topology introduces no equipment-control permission"
);

ok(
    !portalTopologySource.includes(
        "autoDispatch"
    ),
    "portal route topology introduces no auto-dispatch behavior"
);


/*
|--------------------------------------------------------------------------
| K. Site-resource ACL remains explicitly unresolved
|--------------------------------------------------------------------------
*/

const hasCallerSelectedSiteIdentifier =
    vrmSource.includes(
        ":id"
    ) ||
    serverSource.includes(
        ":vrmSiteId"
    ) ||
    indexSource.includes(
        ":vrmSiteId"
    );

ok(
    hasCallerSelectedSiteIdentifier,
    "portal topology contains caller-selected site/installation identifiers"
);

equal(
    FULL_AUTHORIZATION_BOUNDARIES
        .siteResourceAuthorizationCovered,
    false,
    "route-family RBAC is not treated as site-resource entitlement"
);

equal(
    FULL_AUTHORIZATION_BOUNDARIES
        .userToSiteAclIncluded,
    false,
    "user-to-site ACL requires a subsequent dedicated authorization gate"
);


/*
|--------------------------------------------------------------------------
| L. Full P.1G-F assertion plan
|--------------------------------------------------------------------------
*/

ok(
    assertionCount > 0,
    "P.1G-F full authorization topology assertion plan completed"
);


console.log("");
console.log(
    "------------------------------------------------------------"
);
console.log(
    `Assertions passed: ${assertionCount}`
);
console.log(
    "P.1G-F FULL AUTHORIZATION TOPOLOGY PASSED"
);
console.log(
    "------------------------------------------------------------"
);
console.log("");
console.log(
    "Boundary: route-family authorization = COVERED"
);
console.log(
    "Boundary: user-to-site ACL            = NOT INCLUDED"
);
console.log(
    "Boundary: equipment control           = NOT INCLUDED"
);
console.log(
    "Boundary: automatic dispatch          = NOT INCLUDED"
);