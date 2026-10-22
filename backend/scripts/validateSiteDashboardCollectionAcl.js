// scripts/validateSiteDashboardCollectionAcl.js

import assert from "node:assert/strict";
import fs from "node:fs";
import mongoose from "mongoose";

const SERVICE_FILE =
  new URL(
    "../services/dashboard/siteDashboardService.js",
    import.meta.url
  );

const CONTROLLER_FILE =
  new URL(
    "../controllers/siteDashboardController.js",
    import.meta.url
  );

const ROUTE_FILE =
  new URL(
    "../routes/siteDashboardRoutes.js",
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

console.log(`
============================================================
ASHMAAN PORTAL P.1H-E4 — SITE COLLECTION ACL INTEGRATION
============================================================
`);

/*
|--------------------------------------------------------------------------
| A. Controller scope integration
|--------------------------------------------------------------------------
*/

ok(
  controllerSource.includes(
    "getUserInstallationScope"
  ),
  "site controller imports user installation scope service"
);

ok(
  controllerSource.includes(
    "USER_INSTALLATION_SCOPE_STATUS"
  ),
  "site controller uses explicit scope statuses"
);

ok(
  /getUserInstallationScope\(\s*\{\s*userId:\s*req\?\s*\.auth\?\s*\.userId/s
    .test(controllerSource),
  "collection scope derives from authenticated req.auth.userId"
);

ok(
  controllerSource.includes(
    "USER_INSTALLATION_SCOPE_STATUS.DENY"
  ),
  "controller explicitly handles denied scope"
);

ok(
  controllerSource.includes(
    "USER_INSTALLATION_SCOPE_STATUS.RESOLVED"
  ),
  "controller explicitly requires resolved scope"
);

ok(
  controllerSource.includes(
    '"INSTALLATION_ACCESS_DENIED"'
  ),
  "denied scope uses generic installation access error"
);

ok(
  controllerSource.includes(
    '"INSTALLATION_AUTHORIZATION_UNAVAILABLE"'
  ),
  "unavailable scope uses authorization-unavailable error"
);

ok(
  /getDashboardSites\(\s*\{\s*installationIds:\s*scope\.installationIds/s
    .test(controllerSource),
  "controller passes only resolved Installation identities to collection service"
);

/*
|--------------------------------------------------------------------------
| B. Collection service requires explicit scope
|--------------------------------------------------------------------------
*/

ok(
  /const getDashboardSites = async \(\{\s*installationIds,\s*\} = \{\}\)/s
    .test(serviceSource),
  "collection service accepts explicit installation scope"
);

ok(
  /!Array\.isArray\(\s*installationIds\s*\)/s
    .test(serviceSource),
  "collection service rejects missing or malformed scope"
);

ok(
  serviceSource.includes(
    '"installationIds scope is required."'
  ),
  "missing collection scope has explicit fail-closed error"
);

ok(
  /installationIds\.length === 0/s
    .test(serviceSource),
  "collection service explicitly detects empty entitlement set"
);

ok(
  /installationIds\.length === 0[\s\S]*?return \[\]/s
    .test(serviceSource),
  "empty entitlement set returns an empty collection"
);

/*
|--------------------------------------------------------------------------
| C. Database query is entitlement-scoped
|--------------------------------------------------------------------------
*/

ok(
  /Installation\.find\(\s*\{\s*_id:\s*\{\s*\$in:\s*installationIds/s
    .test(serviceSource),
  "Installation query is constrained by entitled Installation ObjectIds"
);

ok(
  serviceSource.includes(
    'source: "VRM"'
  ),
  "existing VRM source constraint is preserved"
);

ok(
  serviceSource.includes(
    "syncEnabled: true"
  ),
  "existing sync-enabled constraint is preserved"
);

ok(
  serviceSource.includes(
    "vrmSiteId: 1"
  ),
  "existing vrmSiteId projection is preserved"
);

ok(
  serviceSource.includes(
    "lastSeenAt: 1"
  ),
  "existing lastSeenAt projection is preserved"
);

ok(
  serviceSource.includes(
    "lastSyncAt: 1"
  ),
  "existing lastSyncAt projection is preserved"
);

ok(
  /\.sort\(\s*\{\s*name:\s*1/s
    .test(serviceSource),
  "existing site-name ordering is preserved"
);

/*
|--------------------------------------------------------------------------
| D. No dangerous identity substitutions
|--------------------------------------------------------------------------
*/

ok(
  !/getUserInstallationScope\(\s*\{\s*userId:\s*req\.(body|query|params)/s
    .test(controllerSource),
  "collection authorization identity is not caller supplied"
);

ok(
  !/getDashboardSites\(\s*\{\s*vrmSiteId:/s
    .test(controllerSource),
  "collection scope does not substitute vrmSiteId for Installation identity"
);

ok(
  !/getDashboardSites\(\s*\{\s*role:/s
    .test(controllerSource),
  "collection scope does not use role as resource entitlement"
);

ok(
  !serviceSource.includes(
    "vrmUserId"
  ),
  "collection service does not use VRM account identity as portal ACL identity"
);

/*
|--------------------------------------------------------------------------
| E. Existing single-resource enforcement remains intact
|--------------------------------------------------------------------------
*/

ok(
  routeSource.includes(
    "requireInstallationAccess"
  ),
  "single-resource ACL middleware remains imported"
);

ok(
  /router\.get\(\s*"\/:vrmSiteId"\s*,\s*requireSiteAccess\s*,\s*getSite\s*\)/s
    .test(routeSource),
  "site overview remains protected by single-resource ACL"
);

ok(
  /router\.get\(\s*"\/:vrmSiteId\/telemetry"\s*,\s*requireSiteAccess\s*,\s*getTelemetry\s*\)/s
    .test(routeSource),
  "site telemetry remains protected by single-resource ACL"
);

ok(
  /router\.get\(\s*"\/:vrmSiteId\/energy-history"\s*,\s*requireSiteAccess\s*,\s*getEnergyHistory\s*\)/s
    .test(routeSource),
  "site energy history remains protected by single-resource ACL"
);

ok(
  /router\.get\(\s*"\/:vrmSiteId\/telemetry-snapshot"\s*,\s*requireSiteAccess\s*,\s*getSiteTelemetrySnapshotController\s*\)/s
    .test(routeSource),
  "site telemetry snapshot remains protected by single-resource ACL"
);

/*
|--------------------------------------------------------------------------
| F. Collection route remains collection-specific
|--------------------------------------------------------------------------
*/

ok(
  /router\.get\(\s*"\/"\s*,\s*getSites\s*\)/s
    .test(routeSource),
  "collection route remains routed through scoped getSites controller"
);

ok(
  !/router\.get\(\s*"\/"\s*,\s*requireSiteAccess/s
    .test(routeSource),
  "single-resource middleware is not misapplied to collection route"
);

/*
|--------------------------------------------------------------------------
| G. No control/RBAC bypass
|--------------------------------------------------------------------------
*/

ok(
  !controllerSource.includes(
    "ADMINISTRATOR"
  ),
  "controller introduces no administrator resource bypass"
);

ok(
  !controllerSource.includes(
    "EXECUTE_EQUIPMENT_CONTROL"
  ),
  "controller grants no equipment-control permission"
);

ok(
  !controllerSource.includes(
    "automaticDispatch"
  ),
  "controller grants no automatic-dispatch authority"
);

/*
|--------------------------------------------------------------------------
| H. Runtime isolation
|--------------------------------------------------------------------------
*/

ok(
  mongoose.connection.readyState === 0,
  "validator establishes no MongoDB connection"
);

/*
|--------------------------------------------------------------------------
| I. Completion
|--------------------------------------------------------------------------
*/

pass(
  "P.1H-E4 site collection ACL assertion plan completed"
);

console.log(`
------------------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1H-E4 SITE COLLECTION ACL INTEGRATION VALIDATION PASSED
------------------------------------------------------------

Boundary: principal              = req.auth.userId
Boundary: entitlement scope      = active Installation._id set
Boundary: missing scope          = FAIL CLOSED
Boundary: empty scope            = EMPTY COLLECTION
Boundary: unrestricted fallback  = NONE
Boundary: single-site ACL        = PRESERVED
Boundary: fleet aggregates       = NOT YET INCLUDED
Boundary: Atlas activity         = NONE
`);