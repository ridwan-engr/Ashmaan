// scripts/validateSiteDashboardInstallationAcl.js

import assert from "node:assert/strict";
import fs from "node:fs";
import mongoose from "mongoose";

const ROUTE_FILE =
  new URL(
    "../routes/siteDashboardRoutes.js",
    import.meta.url
  );

const SERVER_FILE =
  new URL(
    "../server.js",
    import.meta.url
  );

const routeSource =
  fs.readFileSync(
    ROUTE_FILE,
    "utf8"
  );

const serverSource =
  fs.readFileSync(
    SERVER_FILE,
    "utf8"
  );

let assertionsPassed = 0;

function pass(message) {
  assertionsPassed += 1;
  console.log(
    `PASS ${assertionsPassed}: ${message}`
  );
}

function ok(condition, message) {
  assert.ok(condition, message);
  pass(message);
}

function countMatches(
  source,
  pattern
) {
  return (
    source.match(pattern) || []
  ).length;
}

console.log(`
============================================================
ASHMAAN PORTAL P.1H-E2 — SITE DASHBOARD INSTALLATION ACL
============================================================
`);

/*
|--------------------------------------------------------------------------
| A. Existing P.1G server authorization remains present
|--------------------------------------------------------------------------
*/

ok(
  serverSource.includes(
    '"/api/v1/dashboard/sites"'
  ),
  "site-dashboard server mount remains present"
);

ok(
  serverSource.includes(
    "authenticatePortalAccessToken"
  ),
  "portal ACCESS authentication remains present"
);

ok(
  serverSource.includes(
    "requireActivePortalSession"
  ),
  "active-session enforcement remains present"
);

ok(
  serverSource.includes(
    "requireDashboardRead"
  ),
  "READ_DASHBOARD enforcement remains present"
);

/*
|--------------------------------------------------------------------------
| B. ACL middleware integration
|--------------------------------------------------------------------------
*/

ok(
  routeSource.includes(
    'from "../middleware/requireInstallationAccess.js"'
  ),
  "site-dashboard router imports installation ACL middleware"
);

ok(
  routeSource.includes(
    "requireInstallationAccess({"
  ),
  "site-dashboard router constructs installation ACL middleware"
);

ok(
  routeSource.includes(
    'paramName: "vrmSiteId"'
  ),
  "site ACL reads canonical vrmSiteId route parameter"
);

ok(
  routeSource.includes(
    'source: "params"'
  ),
  "site ACL reads resource identity from route params"
);

ok(
  routeSource.includes(
    "const requireSiteAccess"
  ),
  "site ACL middleware instance is explicitly named"
);

/*
|--------------------------------------------------------------------------
| C. Single-resource route enforcement
|--------------------------------------------------------------------------
*/

const expectedProtectedRoutes = [
  '"/:vrmSiteId"',
  '"/:vrmSiteId/telemetry"',
  '"/:vrmSiteId/energy-history"',
  '"/:vrmSiteId/telemetry-snapshot"',
];

for (
  const route
  of expectedProtectedRoutes
) {
  ok(
    routeSource.includes(route),
    `${route} route remains present`
  );
}

ok(
  /router\.get\(\s*"\/:vrmSiteId"\s*,\s*requireSiteAccess\s*,\s*getSite\s*\)/s
    .test(routeSource),
  "site overview requires installation entitlement"
);

ok(
  /router\.get\(\s*"\/:vrmSiteId\/telemetry"\s*,\s*requireSiteAccess\s*,\s*getTelemetry\s*\)/s
    .test(routeSource),
  "site telemetry requires installation entitlement"
);

ok(
  /router\.get\(\s*"\/:vrmSiteId\/energy-history"\s*,\s*requireSiteAccess\s*,\s*getEnergyHistory\s*\)/s
    .test(routeSource),
  "site energy history requires installation entitlement"
);

ok(
  /router\.get\(\s*"\/:vrmSiteId\/telemetry-snapshot"\s*,\s*requireSiteAccess\s*,\s*getSiteTelemetrySnapshotController\s*\)/s
    .test(routeSource),
  "site telemetry snapshot requires installation entitlement"
);

/*
|--------------------------------------------------------------------------
| D. Collection route deliberately remains separate
|--------------------------------------------------------------------------
*/

ok(
  /router\.get\(\s*"\/"\s*,\s*getSites\s*\)/s
    .test(routeSource),
  "site collection route remains present for separate ACL filtering"
);

ok(
  !/router\.get\(\s*"\/"\s*,\s*requireSiteAccess/s
    .test(routeSource),
  "single-resource ACL middleware is not misapplied to collection route"
);

/*
|--------------------------------------------------------------------------
| E. No duplicate route handlers
|--------------------------------------------------------------------------
*/

ok(
  countMatches(
    routeSource,
    /"\/:vrmSiteId"/g
  ) === 1,
  "site overview route is declared exactly once"
);

ok(
  countMatches(
    routeSource,
    /"\/:vrmSiteId\/telemetry"/g
  ) === 1,
  "site telemetry route is declared exactly once"
);

ok(
  countMatches(
    routeSource,
    /"\/:vrmSiteId\/energy-history"/g
  ) === 1,
  "site energy-history route is declared exactly once"
);

ok(
  countMatches(
    routeSource,
    /"\/:vrmSiteId\/telemetry-snapshot"/g
  ) === 1,
  "site telemetry-snapshot route is declared exactly once"
);

/*
|--------------------------------------------------------------------------
| F. Security boundaries
|--------------------------------------------------------------------------
*/

ok(
  !routeSource.includes(
    "ADMINISTRATOR"
  ),
  "site router introduces no administrator ACL bypass"
);

ok(
  !routeSource.includes(
    "SERVICE"
  ),
  "site router introduces no SERVICE ACL bypass"
);

ok(
  !routeSource.includes(
    "SYSTEM"
  ),
  "site router introduces no SYSTEM ACL bypass"
);

ok(
  !routeSource.includes(
    "EXECUTE_EQUIPMENT_CONTROL"
  ),
  "site router grants no equipment-control permission"
);

ok(
  !routeSource.includes(
    "automaticDispatch"
  ),
  "site router grants no automatic-dispatch authority"
);

/*
|--------------------------------------------------------------------------
| G. Runtime isolation
|--------------------------------------------------------------------------
*/

ok(
  mongoose.connection.readyState === 0,
  "validator establishes no MongoDB connection"
);

/*
|--------------------------------------------------------------------------
| H. Completion
|--------------------------------------------------------------------------
*/

pass(
  "P.1H-E2 single-site dashboard ACL assertion plan completed"
);

console.log(`
------------------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1H-E2 SITE DASHBOARD INSTALLATION ACL VALIDATION PASSED
------------------------------------------------------------

Boundary: ACCESS authentication  = P.1G / upstream
Boundary: active session         = P.1G / upstream
Boundary: READ_DASHBOARD         = P.1G / upstream
Boundary: site entitlement       = ENFORCED
Boundary: collection filtering   = NOT YET INCLUDED
Boundary: fleet aggregates       = NOT YET INCLUDED
Boundary: Atlas activity         = NONE
Boundary: equipment control      = NOT INCLUDED
Boundary: automatic dispatch     = NOT INCLUDED
`);
