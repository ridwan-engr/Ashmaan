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

const serverPath =
    path.resolve(
        __dirname,
        "../server.js"
    );

const source =
    fs.readFileSync(
        serverPath,
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


function getAppUseArguments(
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

    const matches =
        [
            ...source.matchAll(
                pattern
            ),
        ];

    return matches.map(
        (
            match
        ) =>
            normalizeWhitespace(
                match[1]
            )
    );
}


function assertProtectedMount({
    routePath,
    routerName,
    label,
}) {
    const mounts =
        getAppUseArguments(
            routePath
        );

    equal(
        mounts.length,
        1,
        `${label} has exactly one server mount`
    );

    const mount =
        mounts[0];

    const expected =
        normalizeWhitespace(
            [
                "authenticatePortalAccessToken,",
                "requireActivePortalSession,",
                "requireDashboardRead,",
                routerName,
            ].join(
                " "
            )
        );

    equal(
        mount,
        expected,
        `${label} uses the exact ACCESS -> active session -> READ_DASHBOARD -> router chain`
    );

    const accessIndex =
        mount.indexOf(
            "authenticatePortalAccessToken"
        );

    const sessionIndex =
        mount.indexOf(
            "requireActivePortalSession"
        );

    const permissionIndex =
        mount.indexOf(
            "requireDashboardRead"
        );

    const routerIndex =
        mount.indexOf(
            routerName
        );

    ok(
        accessIndex >=
        0 &&
        accessIndex <
        sessionIndex,
        `${label} authenticates ACCESS token before session validation`
    );

    ok(
        sessionIndex <
        permissionIndex,
        `${label} validates active session before permission authorization`
    );

    ok(
        permissionIndex <
        routerIndex,
        `${label} authorizes READ_DASHBOARD before reaching its router`
    );
}


console.log("");
console.log(
    "================================================"
);
console.log(
    "ASHMAAN PORTAL P.1G-C — DASHBOARD AUTHORIZATION"
);
console.log(
    "================================================"
);
console.log("");


/*
|--------------------------------------------------------------------------
| A. Canonical security imports
|--------------------------------------------------------------------------
*/

ok(
    source.includes(
        'from "./middleware/authenticatePortalAccessToken.js";'
    ),
    "server imports canonical portal ACCESS authentication middleware"
);

ok(
    source.includes(
        'from "./middleware/requireActivePortalSession.js";'
    ),
    "server imports canonical active-session middleware"
);

ok(
    source.includes(
        'from "./middleware/requirePortalPermission.js";'
    ),
    "server imports canonical portal permission middleware"
);

ok(
    source.includes(
        'from "./services/security/authorizationRbacService.js";'
    ),
    "server imports authoritative Phase 13.4 RBAC service"
);


/*
|--------------------------------------------------------------------------
| B. READ_DASHBOARD permission construction
|--------------------------------------------------------------------------
*/

const normalizedSource =
    normalizeWhitespace(
        source
    );

ok(
    normalizedSource.includes(
        normalizeWhitespace(
            `
            const requireDashboardRead =
              requirePortalPermission(
                RBAC_PERMISSIONS.READ_DASHBOARD
              );
            `
        )
    ),
    "dashboard authorization is constructed from authoritative READ_DASHBOARD permission"
);


/*
|--------------------------------------------------------------------------
| C. Dashboard route
|--------------------------------------------------------------------------
*/

assertProtectedMount({
    routePath:
        "/api/v1/dashboard",

    routerName:
        "dashboardRoutes",

    label:
        "Dashboard",
});


/*
|--------------------------------------------------------------------------
| D. Site Dashboard route
|--------------------------------------------------------------------------
*/

assertProtectedMount({
    routePath:
        "/api/v1/dashboard/sites",

    routerName:
        "siteDashboardRoutes",

    label:
        "Site Dashboard",
});


/*
|--------------------------------------------------------------------------
| E. Reliability route
|--------------------------------------------------------------------------
*/

assertProtectedMount({
    routePath:
        "/api/v1/reliability",

    routerName:
        "reliabilityRoutes",

    label:
        "Reliability",
});


/*
|--------------------------------------------------------------------------
| F. Existing router preservation
|--------------------------------------------------------------------------
*/

ok(
    source.includes(
        'from "./routes/dashboardRoutes.js";'
    ),
    "existing Dashboard router remains the mounted implementation"
);

ok(
    source.includes(
        'from "./routes/siteDashboardRoutes.js";'
    ),
    "existing Site Dashboard router remains the mounted implementation"
);

ok(
    source.includes(
        'from "./routes/reliabilityRoutes.js";'
    ),
    "existing Reliability router remains the mounted implementation"
);


/*
|--------------------------------------------------------------------------
| G. Legacy Optimization/DSS boundary
|--------------------------------------------------------------------------
|
| P.1G-C must not silently remove or rewrite the separately proven legacy
| Optimization/DSS mount. Its bypass treatment belongs to P.1G-E.
|
|--------------------------------------------------------------------------
*/

const legacyOptimizationMounts =
    getAppUseArguments(
        "/api/optimization-dss"
    );

equal(
    legacyOptimizationMounts.length,
    1,
    "legacy Optimization/DSS mount remains present for its dedicated security gate"
);

ok(
    legacyOptimizationMounts[0]
        .includes(
            "optimizationDssRoutes"
        ),
    "P.1G-C preserves the existing legacy Optimization/DSS router implementation"
);

ok(
    legacyOptimizationMounts[0]
        .includes(
            "authenticatePortalAccessToken"
        ),
    "P.1G-C remains compatible with subsequent P.1G-E legacy DSS authentication hardening"
);

ok(
    legacyOptimizationMounts[0]
        .includes(
            "requireActivePortalSession"
        ),
    "P.1G-C remains compatible with subsequent P.1G-E active-session hardening"
);

ok(
    legacyOptimizationMounts[0]
        .includes(
            "requireOptimizationDssRead"
        ),
    "P.1G-C remains compatible with subsequent P.1G-E READ_OPTIMIZATION_DSS hardening"
);


/*
|--------------------------------------------------------------------------
| H. Bootstrap/runtime integrity
|--------------------------------------------------------------------------
*/

ok(
    source.includes(
        "startVrmScheduler();"
    ),
    "historical VRM scheduler bootstrap remains present"
);

ok(
    source.includes(
        "env.vrm.liveFleetEnabled"
    ),
    "VRM live-fleet opt-in boundary remains present"
);

ok(
    source.includes(
        "await connectDatabase();"
    ),
    "database startup boundary remains present"
);

ok(
    source.includes(
        "startServer()"
    ),
    "server bootstrap remains present"
);


/*
|--------------------------------------------------------------------------
| I. Assertion plan
|--------------------------------------------------------------------------
*/

ok(
    assertionCount >
    0,
    "P.1G-C assertion plan completed"
);


console.log("");
console.log(
    "------------------------------------------------"
);
console.log(
    `Assertions passed: ${assertionCount}`
);
console.log(
    "P.1G-C DASHBOARD AUTHORIZATION TOPOLOGY PASSED"
);
console.log(
    "------------------------------------------------"
);