
 // scripts/validateOptimizationDssHttpIntegration.js
// Post-Phase-11 Runtime Integration Checkpoint A
// Purpose: prove server mount + live HTTP reachability only.
// This is NOT Phase 12 and does not alter Optimization/DSS semantics.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CHECKPOINT = "POST_PHASE_11_HTTP_INTEGRATION_A";
const BASE_PATH = "/api/optimization-dss";
const LIST_PATH = `${BASE_PATH}/recommendations`;

const backendRoot = process.cwd();
const serverPath = path.join(backendRoot, "server.js");
const routesPath = path.join(
  backendRoot,
  "routes",
  "optimizationDssRoutes.js"
);

const baseUrl = (
  process.env.ASHMAAN_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

let assertions = 0;

function pass(message) {
  assertions += 1;
  console.log(`PASS ${assertions}: ${message}`);
}

function readRequired(filePath, label) {
  assert.ok(
    fs.existsSync(filePath),
    `${label} missing: ${filePath}`
  );

  return fs.readFileSync(filePath, "utf8");
}

function normalizeSource(source) {
  return source.replace(/\r\n/g, "\n");
}

console.log("");
console.log("================================================");
console.log("ASHMAAN POST-PHASE-11 HTTP INTEGRATION VALIDATION");
console.log("================================================");
console.log(`Checkpoint: ${CHECKPOINT}`);
console.log(`Backend: ${backendRoot}`);
console.log(`HTTP base: ${baseUrl}`);
console.log("");

const serverSource = normalizeSource(
  readRequired(serverPath, "server.js")
);
pass("backend server.js exists");

const routesSource = normalizeSource(
  readRequired(routesPath, "Optimization/DSS route module")
);
pass("Optimization/DSS route module exists");

// Verify that the list and detail endpoints remain GET-only.
assert.match(
  routesSource,
  /router\.get\s*\(\s*["']\/recommendations["']/
);
pass("Optimization/DSS list route remains GET-only");

assert.match(
  routesSource,
  /router\.get\s*\(\s*["']\/recommendations\/:persistenceKey["']/
);
pass("Optimization/DSS detail route remains GET-only");

// The route module must not expose mutation endpoints.
assert.doesNotMatch(
  routesSource,
  /router\.(?:post|put|patch|delete)\s*\(/i
);
pass("Optimization/DSS route module exposes no mutation endpoint");

// Find the router import in server.js.
const importPattern =
  /import\s+([A-Za-z_$][\w$]*)\s+from\s+["']\.\/routes\/optimizationDssRoutes\.js["']\s*;?/;

const importMatch = serverSource.match(importPattern);

assert.ok(
  importMatch,
  [
    "server.js does not import ./routes/optimizationDssRoutes.js.",
    "Expected an import such as:",
    'import optimizationDssRoutes from "./routes/optimizationDssRoutes.js";',
  ].join("\n")
);

const routerIdentifier = importMatch[1];
pass("server.js imports Optimization/DSS router");

// Escape the imported identifier before using it in a regular expression.
const escapedIdentifier = routerIdentifier.replace(
  /[.*+?^${}()|[\]\\]/g,
  "\\$&"
);

// Accept either a direct mount or the existing protected mount:
//
// app.use(
//   "/api/optimization-dss",
//   authenticatePortalAccessToken,
//   requireActivePortalSession,
//   requireOptimizationDssRead,
//   optimizationDssRoutes
// );
//
// Do not remove or bypass any middleware from server.js.
const mountPattern = new RegExp(
  String.raw`app\.use\s*\(\s*["']\/api\/optimization-dss["']\s*,\s*(?:authenticatePortalAccessToken\s*,\s*requireActivePortalSession\s*,\s*requireOptimizationDssRead\s*,\s*)?${escapedIdentifier}\s*\)`
);

assert.match(
  serverSource,
  mountPattern,
  [
    "server.js does not mount Optimization/DSS at /api/optimization-dss.",
    `Imported router identifier: ${routerIdentifier}`,
    "Expected a direct mount or the existing middleware-protected mount.",
  ].join("\n")
);

pass(
  "server.js mounts Optimization/DSS at /api/optimization-dss, including the supported middleware-protected mount"
);

// Confirm that server.js does not introduce mutation endpoints for this API.
assert.doesNotMatch(
  serverSource,
  /app\.(?:post|put|patch|delete)\s*\(\s*["']\/api\/optimization-dss(?:\/|["'])/i
);
pass("server.js introduces no Optimization/DSS mutation endpoint");

// Check live HTTP reachability.
const url = `${baseUrl}${LIST_PATH}?page=1&limit=1`;

let response;
let bodyText;

try {
  response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });

  bodyText = await response.text();
} catch (error) {
  throw new Error(
    [
      `Live HTTP request failed: GET ${url}`,
      "Start the ASHMAAN backend in another terminal with: npm run dev",
      `Cause: ${error instanceof Error ? error.message : String(error)}`,
    ].join("\n")
  );
}

assert.notEqual(
  response.status,
  404,
  `GET ${url} returned 404; route mount is not live`
);
pass("live Optimization/DSS URL does not return 404");

assert.ok(
  [200, 400, 401, 403, 503].includes(response.status),
  `Unexpected HTTP status ${response.status} from ${url}`
);
pass(
  `live Optimization/DSS endpoint responds through HTTP (${response.status})`
);

let payload = null;

try {
  payload = bodyText ? JSON.parse(bodyText) : null;
} catch {
  payload = null;
}

if ([200, 400, 503].includes(response.status)) {
  assert.ok(
    payload && typeof payload === "object",
    `Expected JSON envelope for HTTP ${response.status}`
  );
  pass("live response is a JSON envelope");

  assert.equal(
    payload.phase,
    "11.12",
    "live API envelope phase must remain 11.12"
  );
  pass("live API envelope preserves Phase 11.12 contract identity");

  assert.equal(
    payload.layer,
    "OPTIMIZATION_DSS",
    "live API envelope layer must remain OPTIMIZATION_DSS"
  );
  pass("live API envelope preserves Optimization/DSS layer identity");

  assert.ok(
    ["OK", "INVALID_REQUEST", "UNAVAILABLE"].includes(payload.status),
    `Unexpected API envelope status: ${payload.status}`
  );
  pass(`live API envelope status is controlled (${payload.status})`);
} else {
  console.log(
    `INFO: HTTP ${response.status} indicates upstream authentication/security middleware may have intercepted the request before the Optimization/DSS controller.`
  );
  console.log(
    "INFO: Route reachability is established, but controller-envelope validation is not established by this run."
  );
}

assert.equal(
  assertions >= 10,
  true,
  "Expected at least 10 integration assertions"
);
pass("HTTP integration assertion plan completed");

console.log("");
console.log(`Assertions passed: ${assertions}`);
console.log("");
console.log("================================================");
console.log("POST-PHASE-11 HTTP INTEGRATION VALIDATION PASSED");
console.log("================================================");
console.log("");
console.log("Evidence boundary:");
console.log("- server.js route mount: PROVEN");
console.log("- live HTTP reachability: PROVEN");
console.log("- API remains read-only: PROVEN");
console.log("- MongoDB Atlas write/read persistence: NOT TESTED HERE");
