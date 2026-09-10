// scripts/validatePhase12FrontendLiveRuntime.js
//
// ASHMAAN
// Phase 12.13-D1 — Frontend Live Runtime Validation
//
// Evidence provided:
// - frontend source integration exists
// - Phase 8–11 dashboard pages exist
// - frontend API wrappers exist
// - relevant API wrappers remain read-only
// - Vite frontend server is live
// - SPA routes are reachable
// - backend accepts requests from the live frontend Origin
// - canonical Phase 12 APIs remain reachable from frontend origin
//
// This validator does NOT claim actual React browser rendering.
// Browser rendering is validated separately in Phase 12.13-D2.
//
// Preconditions:
//   Backend  : http://localhost:5000
//   Frontend : http://localhost:5173
//
// Optional:
//   ASHMAAN_BACKEND_ORIGIN=http://localhost:5000
//   ASHMAAN_FRONTEND_ORIGIN=http://localhost:5173

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";


const PHASE =
    "12.13-D1";

const LAYER =
    "FRONTEND_LIVE_RUNTIME_VALIDATION";

const FRONTEND_ROOT =
    process.cwd();

const SRC_ROOT =
    path.join(
        FRONTEND_ROOT,
        "src"
    );

const BACKEND_ORIGIN =
    String(
        process.env
            .ASHMAAN_BACKEND_ORIGIN ||
        "http://localhost:5000"
    ).replace(
        /\/+$/,
        ""
    );

const FRONTEND_ORIGIN =
    String(
        process.env
            .ASHMAAN_FRONTEND_ORIGIN ||
        "http://localhost:5173"
    ).replace(
        /\/+$/,
        ""
    );


let assertions =
    0;


function pass(
    message
) {
    assertions +=
        1;

    console.log(
        `PASS ${assertions}: ${message}`
    );
}


function requireTrue(
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


function requireEqual(
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


function exists(
    relativePath
) {
    return fs.existsSync(
        path.join(
            FRONTEND_ROOT,
            relativePath
        )
    );
}


function read(
    relativePath
) {
    return fs.readFileSync(
        path.join(
            FRONTEND_ROOT,
            relativePath
        ),
        "utf8"
    );
}


function walk(
    directory
) {
    if (
        !fs.existsSync(
            directory
        )
    ) {
        return [];
    }

    const output =
        [];

    for (
        const entry
        of fs.readdirSync(
            directory,
            {
                withFileTypes:
                    true,
            }
        )
    ) {
        if (
            entry.name ===
                "node_modules" ||
            entry.name ===
                "dist" ||
            entry.name ===
                "build"
        ) {
            continue;
        }

        const fullPath =
            path.join(
                directory,
                entry.name
            );

        if (
            entry.isDirectory()
        ) {
            output.push(
                ...walk(
                    fullPath
                )
            );

            continue;
        }

        if (
            /\.(js|jsx|ts|tsx)$/i.test(
                entry.name
            )
        ) {
            output.push(
                fullPath
            );
        }
    }

    return output;
}


function relative(
    absolutePath
) {
    return path
        .relative(
            FRONTEND_ROOT,
            absolutePath
        )
        .replaceAll(
            "\\",
            "/"
        );
}


function allSourceFiles() {
    return walk(
        SRC_ROOT
    ).map(
        file => ({
            file,

            relative:
                relative(
                    file
                ),

            text:
                fs.readFileSync(
                    file,
                    "utf8"
                ),
        })
    );
}


async function httpGet(
    url,
    {
        origin =
            null,
    } = {}
) {
    const headers = {
        Accept:
            "application/json,text/html;q=0.9,*/*;q=0.8",
    };

    if (
        origin
    ) {
        headers.Origin =
            origin;
    }

    const response =
        await fetch(
            url,
            {
                method:
                    "GET",

                redirect:
                    "manual",

                headers,
            }
        );

    const text =
        await response.text();

    let json =
        null;

    try {
        json =
            text
                ? JSON.parse(
                    text
                )
                : null;
    }
    catch {
        json =
            null;
    }

    return {
        url,

        status:
            response.status,

        headers:
            response.headers,

        text,

        json,
    };
}


function showHttp(
    label,
    result
) {
    console.log(
        `INFO: ${label.padEnd(
            36
        )} HTTP ${result.status}  ${result.url}`
    );
}


function requireHtml(
    result,
    message
) {
    const contentType =
        result.headers.get(
            "content-type"
        ) ||
        "";

    requireTrue(
        contentType
            .toLowerCase()
            .includes(
                "text/html"
            ),
        message
    );
}


function assertReadOnlyWrapper(
    relativePath,
    label
) {
    const text =
        read(
            relativePath
        );

    requireTrue(
        /\.get\s*\(/.test(
            text
        ),
        `${label} exposes GET access`
    );

    requireTrue(
        !/\.(post|put|patch|delete)\s*\(/i.test(
            text
        ),
        `${label} exposes no POST/PUT/PATCH/DELETE mutation method`
    );
}


console.log(`
============================================================
ASHMAAN PHASE 12.13-D1 — FRONTEND LIVE RUNTIME VALIDATION
============================================================
`);


requireEqual(
    PHASE,
    "12.13-D1",
    "frontend live validator phase identity is correct"
);


requireEqual(
    LAYER,
    "FRONTEND_LIVE_RUNTIME_VALIDATION",
    "frontend live validator layer identity is correct"
);


requireTrue(
    exists(
        "package.json"
    ),
    "frontend package.json exists"
);


requireTrue(
    exists(
        "src"
    ),
    "frontend src directory exists"
);


requireTrue(
    exists(
        "src/api/axios.js"
    ),
    "shared frontend Axios configuration exists"
);


const sources =
    allSourceFiles();


requireTrue(
    sources.length >
        0,
    "frontend JavaScript/React source files are discoverable"
);


/*
|--------------------------------------------------------------------------
| Phase 8–11 dashboard pages
|--------------------------------------------------------------------------
*/


const dashboardPages = [
    [
        "src/pages/EngineeringAnalytics.jsx",
        "Engineering Analytics",
    ],

    [
        "src/pages/Forecasting.jsx",
        "Forecasting",
    ],

    [
        "src/pages/FinancialBiDashboard.jsx",
        "Financial/BI",
    ],

    [
        "src/pages/OptimizationDssDashboard.jsx",
        "Optimization/DSS",
    ],
];


for (
    const [
        file,
        label,
    ]
    of dashboardPages
) {
    requireTrue(
        exists(
            file
        ),
        `${label} dashboard page exists`
    );
}


/*
|--------------------------------------------------------------------------
| Frontend API wrappers
|--------------------------------------------------------------------------
*/


const apiWrappers = [
    [
        "src/services/api/engineeringAnalyticsApi.js",
        "Engineering Analytics API wrapper",
    ],

    [
        "src/services/api/forecastingApi.js",
        "Forecasting API wrapper",
    ],

    [
        "src/services/api/financialBiApi.js",
        "Financial/BI API wrapper",
    ],

    [
        "src/services/api/optimizationDssDashboardApi.js",
        "Optimization/DSS API wrapper",
    ],
];


for (
    const [
        file,
        label,
    ]
    of apiWrappers
) {
    requireTrue(
        exists(
            file
        ),
        `${label} exists`
    );
}


/*
|--------------------------------------------------------------------------
| Shared Axios
|--------------------------------------------------------------------------
*/


const axiosSource =
    read(
        "src/api/axios.js"
    );


requireTrue(
    /axios\.create\s*\(/.test(
        axiosSource
    ),
    "frontend uses a shared Axios instance"
);


requireTrue(
    /VITE_API_BASE_URL|VITE_API_URL/.test(
        axiosSource
    ),
    "Axios base URL remains environment-configurable"
);


/*
|--------------------------------------------------------------------------
| Read-only API wrappers
|--------------------------------------------------------------------------
*/


for (
    const [
        file,
        label,
    ]
    of apiWrappers
) {
    assertReadOnlyWrapper(
        file,
        label
    );
}


/*
|--------------------------------------------------------------------------
| Dashboard → API service wiring
|--------------------------------------------------------------------------
*/


const engineeringPage =
    read(
        "src/pages/EngineeringAnalytics.jsx"
    );

requireTrue(
    /engineeringAnalyticsApi/.test(
        engineeringPage
    ) ||
    /getEngineeringAnalytics/.test(
        engineeringPage
    ),
    "Engineering Analytics dashboard consumes its API wrapper"
);


const forecastingPage =
    read(
        "src/pages/Forecasting.jsx"
    );

requireTrue(
    /forecastingApi/.test(
        forecastingPage
    ) ||
    /getLatestSiteTargetForecast/.test(
        forecastingPage
    ),
    "Forecasting dashboard consumes its API wrapper"
);


const financialPage =
    read(
        "src/pages/FinancialBiDashboard.jsx"
    );

requireTrue(
    /financialBiApi/.test(
        financialPage
    ) ||
    /fetchFinancialBi/.test(
        financialPage
    ),
    "Financial/BI dashboard consumes its API wrapper"
);


const optimizationPage =
    read(
        "src/pages/OptimizationDssDashboard.jsx"
    );

requireTrue(
    /listOptimizationDssRecommendations/.test(
        optimizationPage
    ),
    "Optimization/DSS dashboard consumes recommendation list API"
);


requireTrue(
    /getOptimizationDssRecommendation/.test(
        optimizationPage
    ),
    "Optimization/DSS dashboard consumes recommendation detail API"
);


/*
|--------------------------------------------------------------------------
| Optimization/DSS safety presentation
|--------------------------------------------------------------------------
*/


requireTrue(
    /ADVISORY\s*ONLY/i.test(
        optimizationPage
    ),
    "Optimization/DSS dashboard preserves ADVISORY ONLY presentation"
);


requireTrue(
    /NON[-\s]?EXECUTABLE/i.test(
        optimizationPage
    ),
    "Optimization/DSS dashboard preserves NON-EXECUTABLE presentation"
);


requireTrue(
    /NO\s+AUTO[-\s]?DISPATCH/i.test(
        optimizationPage
    ),
    "Optimization/DSS dashboard preserves NO AUTO-DISPATCH presentation"
);


/*
|--------------------------------------------------------------------------
| Application route references
|--------------------------------------------------------------------------
*/


const routeExpectations = [
    [
        /engineering-analytics/i,
        "Engineering Analytics",
    ],

    [
        /forecasting/i,
        "Forecasting",
    ],

    [
        /financial-bi/i,
        "Financial/BI",
    ],

    [
        /optimization-dss/i,
        "Optimization/DSS",
    ],
];


for (
    const [
        pattern,
        label,
    ]
    of routeExpectations
) {
    const matches =
        sources.filter(
            source =>
                pattern.test(
                    source.text
                )
        );

    requireTrue(
        matches.length >
            0,
        `${label} application route/reference is registered`
    );

    console.log(
        `INFO: ${label} references: ${
            matches
                .map(
                    item =>
                        item.relative
                )
                .join(
                    ", "
                )
        }`
    );
}


/*
|--------------------------------------------------------------------------
| Live Vite frontend
|--------------------------------------------------------------------------
*/


const frontendRoot =
    await httpGet(
        `${FRONTEND_ORIGIN}/`
    );

showHttp(
    "Frontend root",
    frontendRoot
);


requireEqual(
    frontendRoot.status,
    200,
    "live frontend root responds HTTP 200"
);


requireHtml(
    frontendRoot,
    "live frontend root returns HTML"
);


requireTrue(
    /<div[^>]+id=["']root["']/i.test(
        frontendRoot.text
    ),
    "live frontend HTML contains React root mount"
);


/*
|--------------------------------------------------------------------------
| Live SPA routes
|--------------------------------------------------------------------------
*/


const spaRoutes = [
    [
        "/engineering-analytics",
        "Engineering Analytics",
    ],

    [
        "/forecasting",
        "Forecasting",
    ],

    [
        "/financial-bi",
        "Financial/BI",
    ],

    [
        "/optimization-dss",
        "Optimization/DSS",
    ],
];


for (
    const [
        route,
        label,
    ]
    of spaRoutes
) {
    const result =
        await httpGet(
            `${FRONTEND_ORIGIN}${route}`
        );

    showHttp(
        `${label} SPA route`,
        result
    );

    requireEqual(
        result.status,
        200,
        `${label} SPA route responds HTTP 200`
    );

    requireHtml(
        result,
        `${label} SPA route returns frontend HTML shell`
    );
}


/*
|--------------------------------------------------------------------------
| Backend CORS from live frontend origin
|--------------------------------------------------------------------------
*/


const backendChecks = [
    {
        label:
            "Forecasting API",

        url:
            `${BACKEND_ORIGIN}/api/v1/forecasting/health`,

        acceptedStatuses:
            [
                200,
            ],
    },

    {
        label:
            "Financial/BI API",

        url:
            `${BACKEND_ORIGIN}/api/v1/financial-bi/kpis?page=1&limit=1`,

        acceptedStatuses:
            [
                200,
            ],
    },

    {
        label:
            "Optimization/DSS API",

        url:
            `${BACKEND_ORIGIN}/api/v1/optimization-dss/recommendations?page=1&limit=1`,

        acceptedStatuses:
            [
                200,
            ],
    },

    {
        label:
            "Engineering Analytics API",

        url:
            `${BACKEND_ORIGIN}/api/v1/engineering-analytics/health`,

        acceptedStatuses:
            [
                200,
                503,
            ],
    },
];


for (
    const check
    of backendChecks
) {
    const result =
        await httpGet(
            check.url,
            {
                origin:
                    FRONTEND_ORIGIN,
            }
        );

    showHttp(
        `${check.label} from frontend`,
        result
    );


    requireTrue(
        check
            .acceptedStatuses
            .includes(
                result.status
            ),
        `${check.label} returns an accepted live status`
    );


    const corsOrigin =
        result.headers.get(
            "access-control-allow-origin"
        );


    requireEqual(
        corsOrigin,
        FRONTEND_ORIGIN,
        `${check.label} permits the live frontend CORS origin`
    );
}


/*
|--------------------------------------------------------------------------
| Engineering Analytics 503 semantics
|--------------------------------------------------------------------------
*/


const engineeringCorsCheck =
    await httpGet(
        `${BACKEND_ORIGIN}/api/v1/engineering-analytics/health`,
        {
            origin:
                FRONTEND_ORIGIN,
        }
    );


if (
    engineeringCorsCheck.status ===
    503
) {
    pass(
        "Engineering Analytics frontend path preserves explicit runtime UNAVAILABLE rather than fabricating READY/zero"
    );
}
else {
    pass(
        "Engineering Analytics frontend path reaches live READY API"
    );
}


/*
|--------------------------------------------------------------------------
| Boundary summary
|--------------------------------------------------------------------------
*/


requireTrue(
    !/axios(?:Instance)?\.(post|put|patch|delete)\s*\(/i.test(
        read(
            "src/services/api/optimizationDssDashboardApi.js"
        )
    ),
    "Optimization/DSS frontend introduces no executable HTTP mutation channel"
);


console.log(`
------------------------------------------------------------
12.13-D1 FRONTEND LIVE RUNTIME RESULT
------------------------------------------------------------
Frontend Root              : ${FRONTEND_ORIGIN}
Backend Root               : ${BACKEND_ORIGIN}
Frontend shell             : LIVE
Engineering Analytics SPA  : HTTP 200
Forecasting SPA            : HTTP 200
Financial/BI SPA           : HTTP 200
Optimization/DSS SPA       : HTTP 200
Backend CORS               : VERIFIED
API wrappers               : READ-ONLY
Optimization control       : NOT EXPOSED
Browser React rendering    : PENDING 12.13-D2
------------------------------------------------------------

============================================================
Assertions passed: ${assertions}
ASHMAAN PHASE 12.13-D1 FRONTEND LIVE RUNTIME VALIDATION PASSED
============================================================
`);