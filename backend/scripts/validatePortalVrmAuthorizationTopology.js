import assert
    from "node:assert/strict";

import fs
    from "node:fs";

import path
    from "node:path";

import {
    fileURLToPath,
}
    from "node:url";


const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );

const routesIndexPath =
    path.resolve(
        __dirname,
        "../routes/index.js"
    );

const vrmRoutesPath =
    path.resolve(
        __dirname,
        "../routes/vrmRoutes.js"
    );

const vrmControllerPath =
    path.resolve(
        __dirname,
        "../controllers/vrmController.js"
    );

const syncRoutesPath =
    path.resolve(
        __dirname,
        "../routes/syncRoutes.js"
    );


const indexSource =
    fs.readFileSync(
        routesIndexPath,
        "utf8"
    );

const vrmRoutesSource =
    fs.readFileSync(
        vrmRoutesPath,
        "utf8"
    );

const vrmControllerSource =
    fs.readFileSync(
        vrmControllerPath,
        "utf8"
    );

const syncRoutesSource =
    fs.readFileSync(
        syncRoutesPath,
        "utf8"
    );


let assertionCount =
    0;


function pass(
    message
) {
    assertionCount +=
        1;

    console.log(
        `PASS ${assertionCount}: ${message}`
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
        (
            match
        ) =>
            normalizeWhitespace(
                match[1]
            )
    );
}


function getGetRoutePaths(
    source
) {
    const pattern =
        /router\.get\(\s*"([^"]+)"/g;

    return [
        ...source.matchAll(
            pattern
        ),
    ].map(
        (
            match
        ) =>
            match[1]
    );
}


console.log("");
console.log(
    "================================================"
);
console.log(
    "ASHMAAN PORTAL P.1G-D — VRM AUTHORIZATION"
);
console.log(
    "================================================"
);
console.log("");


/*
|--------------------------------------------------------------------------
| A. Canonical portal security dependencies
|--------------------------------------------------------------------------
*/

ok(
    indexSource.includes(
        'from "../middleware/authenticatePortalAccessToken.js";'
    ),
    "API router imports canonical portal ACCESS authentication"
);

ok(
    indexSource.includes(
        'from "../middleware/requireActivePortalSession.js";'
    ),
    "API router imports canonical active-session validation"
);

ok(
    indexSource.includes(
        'from "../middleware/requirePortalPermission.js";'
    ),
    "API router imports canonical permission authorization"
);

ok(
    indexSource.includes(
        'from "../services/security/authorizationRbacService.js";'
    ),
    "API router imports authoritative Phase 13.4 RBAC service"
);


/*
|--------------------------------------------------------------------------
| B. Explicit READ_DASHBOARD authorization
|--------------------------------------------------------------------------
*/

const normalizedIndexSource =
    normalizeWhitespace(
        indexSource
    );

ok(
    normalizedIndexSource.includes(
        normalizeWhitespace(
            `
            const requireDashboardRead =
                requirePortalPermission(
                    RBAC_PERMISSIONS.READ_DASHBOARD
                );
            `
        )
    ),
    "direct VRM authorization is constructed from READ_DASHBOARD"
);


/*
|--------------------------------------------------------------------------
| C. Exact /vrm parent security chain
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
    "direct VRM API has exactly one canonical /vrm mount"
);

const expectedVrmMount =
    normalizeWhitespace(
        `
        authenticatePortalAccessToken,
        requireActivePortalSession,
        requireDashboardRead,
        vrmRoutes
        `
    );

equal(
    vrmMounts[0],
    expectedVrmMount,
    "VRM mount uses exact ACCESS -> active session -> READ_DASHBOARD -> router chain"
);


const vrmMount =
    vrmMounts[0];

const authenticationIndex =
    vrmMount.indexOf(
        "authenticatePortalAccessToken"
    );

const sessionIndex =
    vrmMount.indexOf(
        "requireActivePortalSession"
    );

const permissionIndex =
    vrmMount.indexOf(
        "requireDashboardRead"
    );

const routerIndex =
    vrmMount.indexOf(
        "vrmRoutes"
    );

ok(
    authenticationIndex >=
        0 &&
    authenticationIndex <
        sessionIndex,
    "VRM API authenticates ACCESS token before session validation"
);

ok(
    sessionIndex <
        permissionIndex,
    "VRM API validates active session before permission authorization"
);

ok(
    permissionIndex <
        routerIndex,
    "VRM API authorizes READ_DASHBOARD before reaching VRM router"
);


/*
|--------------------------------------------------------------------------
| D. Exact exposed VRM GET surface
|--------------------------------------------------------------------------
*/

const vrmGetRoutes =
    getGetRoutePaths(
        vrmRoutesSource
    );

const expectedVrmGetRoutes =
    [
        "/installations",
        "/installations/:id",
        "/installations/:id/telemetry",
        "/installations/:id/alarms",
        "/installations/:id/statistics",
    ];

equal(
    vrmGetRoutes.length,
    expectedVrmGetRoutes.length,
    "VRM router exposes exactly five GET endpoints"
);

equal(
    JSON.stringify(
        vrmGetRoutes
    ),
    JSON.stringify(
        expectedVrmGetRoutes
    ),
    "VRM router exposes only the approved five read endpoints"
);

for (
    const routePath
    of expectedVrmGetRoutes
) {
    ok(
        vrmGetRoutes.includes(
            routePath
        ),
        `approved VRM read endpoint remains exposed: ${routePath}`
    );
}


/*
|--------------------------------------------------------------------------
| E. Diagnostic HTTP exposure removed
|--------------------------------------------------------------------------
*/

ok(
    !vrmRoutesSource.includes(
        "diagnostic-sample"
    ),
    "diagnostic-sample is not exposed by VRM HTTP router"
);

ok(
    !vrmRoutesSource.includes(
        "inspectInstallationTelemetry"
    ),
    "diagnostic controller is not imported or mounted by VRM router"
);


/*
|--------------------------------------------------------------------------
| F. Underlying controller retained
|--------------------------------------------------------------------------
|
| P.1G-D removes the HTTP exposure only. It does not perform unrelated
| controller/service deletion.
|
|--------------------------------------------------------------------------
*/

ok(
    vrmControllerSource.includes(
        "const inspectInstallationTelemetry"
    ),
    "underlying diagnostic controller implementation is retained"
);

ok(
    vrmControllerSource.includes(
        "inspectInstallationTelemetry"
    ),
    "diagnostic controller export remains available for separate lifecycle treatment"
);


/*
|--------------------------------------------------------------------------
| G. VRM router remains read-only
|--------------------------------------------------------------------------
*/

ok(
    !/\brouter\.post\s*\(/.test(
        vrmRoutesSource
    ),
    "direct VRM router exposes no POST mutation"
);

ok(
    !/\brouter\.put\s*\(/.test(
        vrmRoutesSource
    ),
    "direct VRM router exposes no PUT mutation"
);

ok(
    !/\brouter\.patch\s*\(/.test(
        vrmRoutesSource
    ),
    "direct VRM router exposes no PATCH mutation"
);

ok(
    !/\brouter\.delete\s*\(/.test(
        vrmRoutesSource
    ),
    "direct VRM router exposes no DELETE mutation"
);


/*
|--------------------------------------------------------------------------
| H. Existing synchronization security boundary preserved
|--------------------------------------------------------------------------
*/

ok(
    syncRoutesSource.includes(
        'from "../middleware/authenticateJwt.js";'
    ),
    "existing synchronization authentication middleware remains present"
);

ok(
    syncRoutesSource.includes(
        'from "../middleware/requirePrivilegedRole.js";'
    ),
    "existing synchronization privileged-role middleware remains present"
);

ok(
    normalizeWhitespace(
        syncRoutesSource
    ).includes(
        normalizeWhitespace(
            `
            router.use(
                authenticateJwt
            );
            `
        )
    ),
    "synchronization routes still require their existing authentication boundary"
);

ok(
    normalizeWhitespace(
        syncRoutesSource
    ).includes(
        normalizeWhitespace(
            `
            router.use(
                requirePrivilegedRole
            );
            `
        )
    ),
    "synchronization routes still require their existing privileged-role boundary"
);


/*
|--------------------------------------------------------------------------
| I. Unrelated API topology preserved
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
    "health API retains exactly one mount"
);

equal(
    healthMounts[0],
    "healthRoutes",
    "health API remains outside portal VRM authorization chain"
);


const syncMounts =
    getRouterUseArguments(
        indexSource,
        "/sync"
    );

equal(
    syncMounts.length,
    1,
    "sync API retains exactly one mount"
);

equal(
    syncMounts[0],
    "syncRoutes",
    "sync API mount remains unchanged"
);


const authMounts =
    getRouterUseArguments(
        indexSource,
        "/auth"
    );

equal(
    authMounts.length,
    1,
    "portal authentication API retains exactly one mount"
);

equal(
    authMounts[0],
    "portalAuthRoutes",
    "portal authentication mount remains independent from VRM authorization"
);


/*
|--------------------------------------------------------------------------
| J. Site authorization boundary remains explicit
|--------------------------------------------------------------------------
|
| READ_DASHBOARD authorizes the functional API category. It does not itself
| establish that the authenticated user owns or may access an arbitrary
| caller-selected installation ID.
|
|--------------------------------------------------------------------------
*/

ok(
    vrmRoutesSource.includes(
        "/installations/:id"
    ),
    "VRM API still contains caller-selected installation identifiers requiring later site-ACL treatment"
);


/*
|--------------------------------------------------------------------------
| K. Assertion plan
|--------------------------------------------------------------------------
*/

ok(
    assertionCount >
        0,
    "P.1G-D assertion plan completed"
);


console.log("");
console.log(
    "------------------------------------------------"
);
console.log(
    `Assertions passed: ${assertionCount}`
);
console.log(
    "P.1G-D VRM AUTHORIZATION TOPOLOGY PASSED"
);
console.log(
    "------------------------------------------------"
);