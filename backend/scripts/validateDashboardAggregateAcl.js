// scripts/validateDashboardAggregateAcl.js

import assert from "node:assert/strict";
import fs from "node:fs";
import mongoose from "mongoose";

const SERVICE_FILE =
  new URL(
    "../services/dashboard/dashboardService.js",
    import.meta.url
  );

const CONTROLLER_FILE =
  new URL(
    "../controllers/dashboardController.js",
    import.meta.url
  );

const ROUTE_FILE =
  new URL(
    "../routes/dashboardRoutes.js",
    import.meta.url
  );

const serviceSource =
  fs.readFileSync(
    SERVICE_FILE,
    "utf8"
  );

const controllerSource =
  fs.readFileSync(
    CONTROLLER_FILE,
    "utf8"
  );

const routeSource =
  fs.readFileSync(
    ROUTE_FILE,
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
ASHMAAN PORTAL P.1H-E5 — DASHBOARD AGGREGATE ACL
============================================================
`);

/*
|--------------------------------------------------------------------------
| A. Controller authorization scope
|--------------------------------------------------------------------------
*/

ok(
  controllerSource.includes(
    "getUserInstallationScope"
  ),
  "dashboard controller imports installation scope service"
);

ok(
  controllerSource.includes(
    "USER_INSTALLATION_SCOPE_STATUS"
  ),
  "dashboard controller uses explicit scope status contract"
);

ok(
  /getUserInstallationScope\(\s*\{\s*userId:\s*req\?\s*\.auth\?\s*\.userId/s
    .test(controllerSource),
  "dashboard aggregate scope derives from req.auth.userId"
);

ok(
  controllerSource.includes(
    "resolveDashboardScope"
  ),
  "aggregate endpoints share one authorization-scope resolver"
);

ok(
  controllerSource.includes(
    "USER_INSTALLATION_SCOPE_STATUS.DENY"
  ),
  "denied aggregate scope is explicitly handled"
);

ok(
  controllerSource.includes(
    "USER_INSTALLATION_SCOPE_STATUS.RESOLVED"
  ),
  "aggregate execution requires resolved scope"
);

ok(
  controllerSource.includes(
    '"INSTALLATION_ACCESS_DENIED"'
  ),
  "denied aggregate scope returns generic access-denied code"
);

ok(
  controllerSource.includes(
    '"INSTALLATION_AUTHORIZATION_UNAVAILABLE"'
  ),
  "unavailable aggregate scope returns explicit unavailable code"
);

ok(
  /getFleetOverview\(\s*\{\s*installationIds:\s*scope\.installationIds/s
    .test(controllerSource),
  "fleet overview receives resolved Installation scope"
);

ok(
  /getEnergyTrend\(\s*\{[\s\S]*?installationIds:\s*scope\.installationIds/s
    .test(controllerSource),
  "energy history receives resolved Installation scope"
);

/*
|--------------------------------------------------------------------------
| B. Service requires explicit scope
|--------------------------------------------------------------------------
*/

ok(
  serviceSource.includes(
    "function requireInstallationScope"
  ),
  "dashboard service defines shared scope guard"
);

ok(
  /!Array\.isArray\(\s*installationIds\s*\)/s
    .test(serviceSource),
  "scope guard rejects missing or malformed installation scope"
);

ok(
  serviceSource.includes(
    '"installationIds scope is required."'
  ),
  "missing aggregate scope fails explicitly"
);

ok(
  /const getFleetOverview = async \(\{\s*installationIds,\s*\} = \{\}\)/s
    .test(serviceSource),
  "fleet overview requires explicit installation scope"
);

ok(
  /const getEnergyTrend = async \(\{[\s\S]*?installationIds,[\s\S]*?\} = \{\}\)/s
    .test(serviceSource),
  "energy trend accepts explicit installation scope"
);

/*
|--------------------------------------------------------------------------
| C. Empty scope is not fleet fallback
|--------------------------------------------------------------------------
*/

ok(
  serviceSource.includes(
    "function buildEmptyFleetOverview"
  ),
  "service defines structural empty fleet result"
);

ok(
  /installationIds\.length === 0[\s\S]*?return buildEmptyFleetOverview\(\)/s
    .test(serviceSource),
  "empty overview scope returns zero/null fleet structure"
);

ok(
  /installationIds\.length === 0[\s\S]*?count:\s*0[\s\S]*?records:\s*\[\]/s
    .test(serviceSource),
  "empty energy scope returns zero records"
);

ok(
  serviceSource.includes(
    "totalInstallations: 0"
  ),
  "empty fleet reports zero total installations"
);

ok(
  serviceSource.includes(
    "latestTimestamp: null"
  ),
  "empty fleet reports no fabricated latest timestamp"
);

ok(
  serviceSource.includes(
    "latestRecord: null"
  ),
  "empty fleet reports no fabricated latest record"
);

/*
|--------------------------------------------------------------------------
| D. Installation queries are scoped by Installation._id
|--------------------------------------------------------------------------
*/

ok(
  serviceSource.includes(
    "const installationScope = {"
  ),
  "fleet overview creates explicit Installation identity scope"
);

ok(
  serviceSource.includes(
    "$in: installationIds"
  ),
  "fleet overview scope uses entitled Installation identities"
);

const installationCountQueries =
  countMatches(
    serviceSource,
    /Installation\.countDocuments\(\{/g
  );

ok(
  installationCountQueries === 6,
  "fleet overview retains exactly six Installation count queries"
);

const installationScopedCounts =
  countMatches(
    serviceSource,
    /Installation\.countDocuments\(\{\s*_id:\s*installationScope,/g
  );

ok(
  installationScopedCounts === 6,
  "all six Installation count queries are entitlement-scoped"
);

/*
|--------------------------------------------------------------------------
| E. Child-resource queries are installation-scoped
|--------------------------------------------------------------------------
*/

ok(
  /Device\.countDocuments\(\{\s*installation:\s*installationScope,/s
    .test(serviceSource),
  "device count is constrained to entitled installations"
);

ok(
  /AlarmRule\.countDocuments\(\{\s*installation:\s*installationScope,/s
    .test(serviceSource),
  "alarm-rule count is constrained to entitled installations"
);

ok(
  /Telemetry\.findOne\(\{\s*installation:\s*installationScope,/s
    .test(serviceSource),
  "latest telemetry is constrained to entitled installations"
);

ok(
  /EnergyRecord\.findOne\(\{\s*installation:\s*installationScope,/s
    .test(serviceSource),
  "latest energy record is constrained to entitled installations"
);

ok(
  /EnergyRecord\.find\(\{\s*installation:\s*\{\s*\$in:\s*installationIds/s
    .test(serviceSource),
  "energy trend query is constrained to entitled installations"
);

/*
|--------------------------------------------------------------------------
| F. Existing data semantics remain present
|--------------------------------------------------------------------------
*/

ok(
  countMatches(
    serviceSource,
    /source:\s*"VRM"/g
  ) >= 11,
  "VRM source constraints remain across aggregate queries"
);

ok(
  countMatches(
    serviceSource,
    /syncEnabled:\s*true/g
  ) === 4,
  "existing active-status syncEnabled constraints remain unchanged"
);

ok(
  serviceSource.includes(
    'status: "ONLINE"'
  ),
  "ONLINE classification remains present"
);

ok(
  serviceSource.includes(
    'status: "STALE"'
  ),
  "STALE classification remains present"
);

ok(
  serviceSource.includes(
    'status: "OFFLINE"'
  ),
  "OFFLINE classification remains present"
);

ok(
  serviceSource.includes(
    'status: "UNKNOWN"'
  ),
  "UNKNOWN classification remains present"
);

ok(
  serviceSource.includes(
    'status: "INACTIVE"'
  ),
  "INACTIVE classification remains present"
);

ok(
  serviceSource.includes(
    "classifiedInstallations"
  ),
  "classified-installation diagnostic remains present"
);

ok(
  /Math\.min\([\s\S]*?Math\.max\([\s\S]*?Number\(days\) \|\| 7[\s\S]*?90/s
    .test(serviceSource),
  "energy-history 1-to-90 day normalization remains present"
);

ok(
  serviceSource.includes(
    "$gte:"
  ) &&
  serviceSource.includes(
    "$lte:"
  ),
  "energy-history time bounds remain present"
);

ok(
  /\.sort\(\{\s*timestamp:\s*1,\s*\}\)/s
    .test(serviceSource),
  "energy-history chronological ordering remains present"
);

/*
|--------------------------------------------------------------------------
| G. No identity substitution or bypass
|--------------------------------------------------------------------------
*/

ok(
  !controllerSource.includes(
    "vrmUserId"
  ),
  "aggregate authorization does not use VRM user identity"
);

ok(
  !controllerSource.includes(
    "ADMINISTRATOR"
  ),
  "aggregate authorization introduces no administrator bypass"
);

ok(
  !controllerSource.includes(
    "SERVICE"
  ),
  "aggregate authorization introduces no SERVICE bypass"
);

ok(
  !controllerSource.includes(
    "SYSTEM"
  ),
  "aggregate authorization introduces no SYSTEM bypass"
);

ok(
  !controllerSource.includes(
    "EXECUTE_EQUIPMENT_CONTROL"
  ),
  "aggregate controller grants no equipment-control permission"
);

ok(
  !controllerSource.includes(
    "automaticDispatch"
  ),
  "aggregate controller grants no automatic-dispatch authority"
);

/*
|--------------------------------------------------------------------------
| H. Routes remain stable
|--------------------------------------------------------------------------
*/

ok(
  /router\.get\(\s*"\/overview"\s*,\s*getOverview\s*\)/s
    .test(routeSource),
  "overview route remains unchanged"
);

ok(
  /router\.get\(\s*"\/energy-history"\s*,\s*getEnergyHistory\s*\)/s
    .test(routeSource),
  "energy-history route remains unchanged"
);

/*
|--------------------------------------------------------------------------
| I. Runtime isolation
|--------------------------------------------------------------------------
*/

ok(
  mongoose.connection.readyState === 0,
  "validator establishes no MongoDB connection"
);

/*
|--------------------------------------------------------------------------
| J. Completion
|--------------------------------------------------------------------------
*/

pass(
  "P.1H-E5 aggregate ACL assertion plan completed"
);

console.log(`
------------------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1H-E5 DASHBOARD AGGREGATE ACL VALIDATION PASSED
------------------------------------------------------------

Boundary: principal              = req.auth.userId
Boundary: aggregate identity     = Installation._id
Boundary: Installation queries   = SCOPED
Boundary: child-resource queries = SCOPED
Boundary: missing scope          = FAIL CLOSED
Boundary: empty scope            = ZERO/EMPTY RESULT
Boundary: unrestricted fallback  = NONE
Boundary: RBAC                   = P.1G / UPSTREAM
Boundary: Atlas activity         = NONE
`);