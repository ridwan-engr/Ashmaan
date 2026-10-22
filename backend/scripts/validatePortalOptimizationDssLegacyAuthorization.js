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

const serverPath =
  path.resolve(
    __dirname,
    "../server.js"
  );

const integrationRouterPath =
  path.resolve(
    __dirname,
    "../routes/backendApiIntegrationRoutes.js"
  );

const optimizationRouterPath =
  path.resolve(
    __dirname,
    "../routes/optimizationDssRoutes.js"
  );


const serverSource =
  fs.readFileSync(
    serverPath,
    "utf8"
  );

const integrationSource =
  fs.readFileSync(
    integrationRouterPath,
    "utf8"
  );

const optimizationSource =
  fs.readFileSync(
    optimizationRouterPath,
    "utf8"
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


/*
|--------------------------------------------------------------------------
| Literal Express app.use() parser
|--------------------------------------------------------------------------
|
| Used for server mounts whose route is a literal string:
|
| app.use(
|   "/api/optimization-dss",
|   ...
| );
|
| The route path is escaped because it is literal source text.
|
*/

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


/*
|--------------------------------------------------------------------------
| Expression-aware Express router.use() parser
|--------------------------------------------------------------------------
|
| Used for canonical integration mounts whose route is represented by a
| JavaScript expression rather than a literal string:
|
| router.use(
|   BACKEND_API_INTEGRATION_PATHS
|     .OPTIMIZATION_DSS,
|   ...
| );
|
| routeExpressionPattern is intentionally treated as a regex pattern.
| It must NOT be passed through escapeRegExp().
|
*/

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


console.log("");
console.log(
  "================================================"
);
console.log(
  "ASHMAAN PORTAL P.1G-E — LEGACY DSS AUTHORIZATION"
);
console.log(
  "================================================"
);
console.log("");


/*
|--------------------------------------------------------------------------
| A. Server security dependencies
|--------------------------------------------------------------------------
*/

ok(
  serverSource.includes(
    'from "./middleware/authenticatePortalAccessToken.js";'
  ),
  "server imports canonical portal ACCESS authentication"
);

ok(
  serverSource.includes(
    'from "./middleware/requireActivePortalSession.js";'
  ),
  "server imports canonical active-session validation"
);

ok(
  serverSource.includes(
    'from "./middleware/requirePortalPermission.js";'
  ),
  "server imports canonical permission authorization"
);

ok(
  serverSource.includes(
    'from "./services/security/authorizationRbacService.js";'
  ),
  "server imports authoritative Phase 13.4 RBAC service"
);


/*
|--------------------------------------------------------------------------
| B. Legacy DSS permission construction
|--------------------------------------------------------------------------
*/

const normalizedServer =
  normalizeWhitespace(
    serverSource
  );

ok(
  normalizedServer.includes(
    normalizeWhitespace(
      `
      const requireOptimizationDssRead =
        requirePortalPermission(
          RBAC_PERMISSIONS.READ_OPTIMIZATION_DSS
        );
      `
    )
  ),
  "legacy DSS authorization is constructed from READ_OPTIMIZATION_DSS"
);

ok(
  !normalizedServer.includes(
    normalizeWhitespace(
      `
      const requireOptimizationDssRead =
        requirePortalPermission(
          RBAC_PERMISSIONS.READ_DASHBOARD
        );
      `
    )
  ),
  "legacy DSS authorization does not substitute READ_DASHBOARD"
);


/*
|--------------------------------------------------------------------------
| C. Exact legacy mount
|--------------------------------------------------------------------------
*/

const legacyMounts =
  getAppUseArguments(
    serverSource,
    "/api/optimization-dss"
  );

equal(
  legacyMounts.length,
  1,
  "legacy Optimization/DSS API has exactly one server mount"
);

const expectedLegacyMount =
  normalizeWhitespace(
    `
    authenticatePortalAccessToken,
    requireActivePortalSession,
    requireOptimizationDssRead,
    optimizationDssRoutes
    `
  );

equal(
  legacyMounts[0],
  expectedLegacyMount,
  "legacy DSS mount uses exact ACCESS -> active session -> READ_OPTIMIZATION_DSS -> router chain"
);


const legacyMount =
  legacyMounts[0];

const authenticationIndex =
  legacyMount.indexOf(
    "authenticatePortalAccessToken"
  );

const sessionIndex =
  legacyMount.indexOf(
    "requireActivePortalSession"
  );

const permissionIndex =
  legacyMount.indexOf(
    "requireOptimizationDssRead"
  );

const routerIndex =
  legacyMount.indexOf(
    "optimizationDssRoutes"
  );

ok(
  authenticationIndex >= 0 &&
    authenticationIndex < sessionIndex,
  "legacy DSS authenticates ACCESS token before session validation"
);

ok(
  sessionIndex >= 0 &&
    sessionIndex < permissionIndex,
  "legacy DSS validates active session before permission authorization"
);

ok(
  permissionIndex >= 0 &&
    permissionIndex < routerIndex,
  "legacy DSS authorizes READ_OPTIMIZATION_DSS before reaching router"
);


/*
|--------------------------------------------------------------------------
| D. Public bypass eliminated
|--------------------------------------------------------------------------
*/

ok(
  !normalizedServer.includes(
    normalizeWhitespace(
      `
      app.use(
        "/api/optimization-dss",
        optimizationDssRoutes
      );
      `
    )
  ),
  "unprotected legacy Optimization/DSS mount is absent"
);


/*
|--------------------------------------------------------------------------
| E. Canonical DSS route remains protected
|--------------------------------------------------------------------------
*/

ok(
  integrationSource.includes(
    "RBAC_PERMISSIONS"
  ),
  "canonical integration router uses authoritative RBAC permissions"
);

ok(
  integrationSource.includes(
    ".READ_OPTIMIZATION_DSS"
  ),
  "canonical Optimization/DSS route requires READ_OPTIMIZATION_DSS"
);

ok(
  integrationSource.includes(
    "const requireOptimizationDssRead"
  ),
  "canonical integration router constructs DSS permission middleware"
);


const canonicalMounts =
  getRouterUseArgumentsByExpression(
    integrationSource,
    "BACKEND_API_INTEGRATION_PATHS\\s*\\.OPTIMIZATION_DSS"
  );

equal(
  canonicalMounts.length,
  1,
  "canonical Optimization/DSS child path has exactly one integration mount"
);

const canonicalMount =
  canonicalMounts[0];

const canonicalAuthenticationIndex =
  canonicalMount.indexOf(
    "authenticate"
  );

const canonicalSessionIndex =
  canonicalMount.indexOf(
    "requireActiveSession"
  );

const canonicalPermissionIndex =
  canonicalMount.indexOf(
    "requireOptimizationDssRead"
  );

const canonicalRouterIndex =
  canonicalMount.indexOf(
    "optimizationRouter"
  );

ok(
  canonicalAuthenticationIndex >= 0 &&
    canonicalAuthenticationIndex <
      canonicalSessionIndex,
  "canonical DSS authenticates before session validation"
);

ok(
  canonicalSessionIndex >= 0 &&
    canonicalSessionIndex <
      canonicalPermissionIndex,
  "canonical DSS validates active session before permission authorization"
);

ok(
  canonicalPermissionIndex >= 0 &&
    canonicalPermissionIndex <
      canonicalRouterIndex,
  "canonical DSS authorizes READ_OPTIMIZATION_DSS before reaching router"
);


/*
|--------------------------------------------------------------------------
| F. Authorization equivalence
|--------------------------------------------------------------------------
*/

ok(
  legacyMount.includes(
    "authenticatePortalAccessToken"
  ) &&
    canonicalMount.includes(
      "authenticate"
    ),
  "legacy and canonical DSS surfaces both require portal authentication"
);

ok(
  legacyMount.includes(
    "requireActivePortalSession"
  ) &&
    canonicalMount.includes(
      "requireActiveSession"
    ),
  "legacy and canonical DSS surfaces both require active-session validation"
);

ok(
  legacyMount.includes(
    "requireOptimizationDssRead"
  ) &&
    canonicalMount.includes(
      "requireOptimizationDssRead"
    ),
  "legacy and canonical DSS surfaces share READ_OPTIMIZATION_DSS semantics"
);


/*
|--------------------------------------------------------------------------
| G. DSS remains read-only
|--------------------------------------------------------------------------
*/

ok(
  optimizationSource.includes(
    'router.get('
  ),
  "Optimization/DSS router retains GET read endpoints"
);

ok(
  !/\brouter\.post\s*\(/.test(
    optimizationSource
  ),
  "Optimization/DSS router exposes no POST mutation"
);

ok(
  !/\brouter\.put\s*\(/.test(
    optimizationSource
  ),
  "Optimization/DSS router exposes no PUT mutation"
);

ok(
  !/\brouter\.patch\s*\(/.test(
    optimizationSource
  ),
  "Optimization/DSS router exposes no PATCH mutation"
);

ok(
  !/\brouter\.delete\s*\(/.test(
    optimizationSource
  ),
  "Optimization/DSS router exposes no DELETE mutation"
);


/*
|--------------------------------------------------------------------------
| H. Existing route compatibility preserved
|--------------------------------------------------------------------------
*/

ok(
  optimizationSource.includes(
    '"/recommendations"'
  ),
  "Optimization/DSS recommendations collection route remains present"
);

ok(
  optimizationSource.includes(
    '"/recommendations/:persistenceKey"'
  ),
  "Optimization/DSS recommendation detail route remains present"
);

ok(
  serverSource.includes(
    '"/api/optimization-dss"'
  ),
  "legacy Optimization/DSS compatibility path remains mounted"
);

ok(
  integrationSource.includes(
    '"/optimization-dss"'
  ),
  "canonical /api/v1 Optimization/DSS child path remains defined"
);


/*
|--------------------------------------------------------------------------
| I. No equipment-control semantics introduced
|--------------------------------------------------------------------------
*/

ok(
  !optimizationSource.includes(
    "EXECUTE_EQUIPMENT_CONTROL"
  ),
  "Optimization/DSS router does not introduce equipment-control permission"
);

ok(
  !optimizationSource.includes(
    "autoDispatch"
  ),
  "Optimization/DSS router does not introduce auto-dispatch behavior"
);


/*
|--------------------------------------------------------------------------
| J. Assertion plan
|--------------------------------------------------------------------------
*/

ok(
  assertionCount > 0,
  "P.1G-E assertion plan completed"
);


console.log("");
console.log(
  "------------------------------------------------"
);
console.log(
  `Assertions passed: ${assertionCount}`
);
console.log(
  "P.1G-E LEGACY OPTIMIZATION/DSS AUTHORIZATION PASSED"
);
console.log(
  "------------------------------------------------"
);