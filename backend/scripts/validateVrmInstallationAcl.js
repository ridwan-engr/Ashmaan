// scripts/validateVrmInstallationAcl.js

import assert from "node:assert/strict";
import fs from "node:fs";
import mongoose from "mongoose";

const ROUTE_FILE =
  new URL(
    "../routes/vrmRoutes.js",
    import.meta.url
  );

const CONTROLLER_FILE =
  new URL(
    "../controllers/vrmController.js",
    import.meta.url
  );

const INSTALLATION_SERVICE_FILE =
  new URL(
    "../services/vrm/installationService.js",
    import.meta.url
  );

const TELEMETRY_SERVICE_FILE =
  new URL(
    "../services/vrm/telemetryService.js",
    import.meta.url
  );

const RESOLVER_FILE =
  new URL(
    "../services/security/installationResourceResolver.js",
    import.meta.url
  );

const routeSource =
  fs.readFileSync(
    ROUTE_FILE,
    "utf8"
  );

const controllerSource =
  fs.readFileSync(
    CONTROLLER_FILE,
    "utf8"
  );

const installationServiceSource =
  fs.readFileSync(
    INSTALLATION_SERVICE_FILE,
    "utf8"
  );

const telemetryServiceSource =
  fs.readFileSync(
    TELEMETRY_SERVICE_FILE,
    "utf8"
  );

const resolverSource =
  fs.readFileSync(
    RESOLVER_FILE,
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
ASHMAAN PORTAL P.1H-F2 — DIRECT VRM INSTALLATION ACL
============================================================
`);

/*
|--------------------------------------------------------------------------
| A. Identity semantics
|--------------------------------------------------------------------------
*/

ok(
  /idSite:\s*installationId/
    .test(installationServiceSource),
  "VRM installation lookup uses installationId as VRM idSite"
);

ok(
  /\/installations\/\$\{installationId\}\/diagnostics/
    .test(telemetryServiceSource),
  "VRM telemetry uses installationId as external VRM site identity"
);

ok(
  /const \{\s*id\s*\} = req\.params/
    .test(controllerSource),
  "direct VRM controllers receive caller identity from :id"
);

ok(
  /fetchInstallationById\s*\(\s*id\s*\)/
    .test(controllerSource),
  "installation controller passes :id unchanged to VRM installation service"
);

ok(
  /fetchTelemetry\s*\(\s*id\s*,\s*\{/
    .test(controllerSource),
  "telemetry controller passes :id unchanged to VRM telemetry service"
);

ok(
  /vrmSiteId:\s*normalizedSiteId/
    .test(resolverSource),
  "local resolver preserves normalized vrmSiteId identity"
);

ok(
  resolverSource.includes(
    "resolveInstallationByVrmSiteId"
  ),
  "ACL resolver exposes the VRM-site identity resolution contract"
);

ok(
  resolverSource.includes(
    "installationModel"
  ),
  "ACL resolver uses an injectable Installation repository"
);

ok(
  resolverSource.includes(
    "normalizedSiteId"
  ),
  "ACL resolver uses normalized external VRM site identity"
);

ok(
  resolverSource.includes(
    "installationId"
  ),
  "ACL resolver returns canonical local Installation identity"
);
/*
|--------------------------------------------------------------------------
| B. ACL middleware integration
|--------------------------------------------------------------------------
*/

ok(
  routeSource.includes(
    "requireInstallationAccess"
  ),
  "VRM router imports installation ACL middleware"
);

ok(
  /requireInstallationAccess\(\{\s*paramName:\s*"id",\s*source:\s*"params",?\s*\}\)/s
    .test(routeSource),
  "VRM ACL middleware is configured for :id route parameter"
);

ok(
  routeSource.includes(
    "requireVrmInstallationAccess"
  ),
  "VRM router defines dedicated installation access middleware"
);

/*
|--------------------------------------------------------------------------
| C. Four single-resource routes
|--------------------------------------------------------------------------
*/

ok(
  /router\.get\(\s*"\/installations\/:id"\s*,\s*requireVrmInstallationAccess\s*,\s*asyncHandler\(getInstallationById\)\s*\)/s
    .test(routeSource),
  "VRM installation detail is ACL protected"
);

ok(
  /router\.get\(\s*"\/installations\/:id\/telemetry"\s*,\s*requireVrmInstallationAccess\s*,\s*asyncHandler\(getInstallationTelemetry\)\s*\)/s
    .test(routeSource),
  "VRM telemetry is ACL protected"
);

ok(
  /router\.get\(\s*"\/installations\/:id\/alarms"\s*,\s*requireVrmInstallationAccess\s*,\s*asyncHandler\(getInstallationAlarms\)\s*\)/s
    .test(routeSource),
  "VRM alarms are ACL protected"
);

ok(
  /router\.get\(\s*"\/installations\/:id\/statistics"\s*,\s*requireVrmInstallationAccess\s*,\s*asyncHandler\(getInstallationStatistics\)\s*\)/s
    .test(routeSource),
  "VRM statistics are ACL protected"
);

/*
|--------------------------------------------------------------------------
| D. Collection remains separately classified
|--------------------------------------------------------------------------
*/

ok(
  /router\.get\(\s*"\/installations"\s*,\s*asyncHandler\(getInstallations\)\s*\)/s
    .test(routeSource),
  "VRM installation collection route remains present"
);

ok(
  !/router\.get\(\s*"\/installations"\s*,\s*requireVrmInstallationAccess/s
    .test(routeSource),
  "single-resource ACL is not misapplied to VRM collection"
);

/*
|--------------------------------------------------------------------------
| E. Existing P.1G diagnostic-route decision preserved
|--------------------------------------------------------------------------
*/

ok(
  !routeSource.includes(
    "/diagnostic-sample"
  ),
  "diagnostic-sample remains removed from HTTP exposure"
);

ok(
  controllerSource.includes(
    "inspectInstallationTelemetry"
  ),
  "diagnostic implementation remains available internally"
);

/*
|--------------------------------------------------------------------------
| F. No bypass/control authority
|--------------------------------------------------------------------------
*/

ok(
  !routeSource.includes(
    "ADMINISTRATOR"
  ),
  "VRM router introduces no administrator resource bypass"
);

ok(
  !routeSource.includes(
    "SERVICE"
  ),
  "VRM router introduces no SERVICE resource bypass"
);

ok(
  !routeSource.includes(
    "SYSTEM"
  ),
  "VRM router introduces no SYSTEM resource bypass"
);

ok(
  !routeSource.includes(
    "EXECUTE_EQUIPMENT_CONTROL"
  ),
  "VRM router grants no equipment-control permission"
);

ok(
  !routeSource.includes(
    "automaticDispatch"
  ),
  "VRM router grants no automatic-dispatch authority"
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
  "P.1H-F2 direct VRM installation ACL assertion plan completed"
);

console.log(`
------------------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1H-F2 DIRECT VRM INSTALLATION ACL VALIDATION PASSED
------------------------------------------------------------

Boundary: route identity         = :id
Boundary: :id semantics          = VRM site/installation ID
Boundary: local identity bridge  = Installation.vrmSiteId
Boundary: ACL identity           = Installation._id
Boundary: single resources       = PROTECTED
Boundary: collection filtering   = NOT YET INCLUDED
Boundary: diagnostic HTTP route  = REMAINS REMOVED
Boundary: RBAC                   = P.1G / UPSTREAM
Boundary: Atlas activity         = NONE
`);
