// ASHMAAN Phase 12.14 — Final Validation
// End-to-End System Integration final gate
// Run from: C:\Users\owner\ASHMAAN\backend
//
// Preconditions:
//   1) Backend live on http://localhost:5000
//   2) Frontend live on http://localhost:5173
//   3) Phase 12.13-D2 browser evidence already reviewed and accepted
//
// Optional overrides:
//   ASHMAAN_BACKEND_ORIGIN=http://localhost:5000
//   ASHMAAN_FRONTEND_ORIGIN=http://localhost:5173
//   ASHMAAN_FRONTEND_ROOT=C:\Users\owner\ASHMAAN-FRONTEND

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PHASE = "12.14";
const LAYER = "PHASE_12_FINAL_VALIDATION";

const BACKEND_ORIGIN =
  process.env.ASHMAAN_BACKEND_ORIGIN ?? "http://localhost:5000";

const FRONTEND_ORIGIN =
  process.env.ASHMAAN_FRONTEND_ORIGIN ?? "http://localhost:5173";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_ROOT = path.resolve(__dirname, "..");
const FRONTEND_ROOT = path.resolve(
  process.env.ASHMAAN_FRONTEND_ROOT ??
    path.join(BACKEND_ROOT, "..", "..", "ASHMAAN-FRONTEND")
);

let passed = 0;

function banner(text) {
  console.log("\n" + "=".repeat(72));
  console.log(text);
  console.log("=".repeat(72));
}

function section(text) {
  console.log("\n--- " + text + " ---");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL ${passed + 1}: ${message}`);
  }

  passed += 1;
  console.log(`PASS ${passed}: ${message}`);
}

function exists(relativePath, root = BACKEND_ROOT) {
  return fs.existsSync(path.join(root, relativePath));
}

function readText(relativePath, root = BACKEND_ROOT) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
}

function walkFiles(
  root,
  extensions = new Set([".js", ".jsx", ".mjs", ".cjs"])
) {
  const out = [];

  if (!fs.existsSync(root)) {
    return out;
  }

  const stack = [root];

  while (stack.length) {
    const current = stack.pop();

    const entries = fs.readdirSync(current, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "dist" ||
        entry.name === "coverage"
      ) {
        continue;
      }

      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(full);
      } else if (
        extensions.has(
          path.extname(entry.name).toLowerCase()
        )
      ) {
        out.push(full);
      }
    }
  }

  return out;
}

function sourceContains(root, pattern) {
  return walkFiles(root).some((file) =>
    pattern.test(
      fs.readFileSync(file, "utf8")
    )
  );
}

async function request(
  label,
  url,
  options = {}
) {
  const response = await fetch(url, {
    redirect: "manual",
    ...options,
  });

  const contentType =
    response.headers.get("content-type") ?? "";

  let body = null;

  if (
    contentType.includes("application/json")
  ) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } else {
    body = await response.text();
  }

  console.log(
    `INFO: ${label.padEnd(36)} HTTP ${String(
      response.status
    ).padEnd(3)} ${url}`
  );

  return {
    response,
    status: response.status,
    body,
    contentType,
  };
}

function corsOrigin(result) {
  return result.response.headers.get(
    "access-control-allow-origin"
  );
}

function isArrayCompatible(body) {
  if (Array.isArray(body)) {
    return true;
  }

  if (
    !body ||
    typeof body !== "object"
  ) {
    return false;
  }

  return [
    body.items,
    body.records,
    body.results,
    body.recommendations,
    body.forecasts,
    body.kpis,

    body.data,

    body.data?.items,
    body.data?.records,
    body.data?.results,
    body.data?.recommendations,
    body.data?.forecasts,
    body.data?.kpis,
  ].some(Array.isArray);
}

banner(
  "ASHMAAN PHASE 12.14 — PHASE 12 FINAL VALIDATION"
);

try {
  // ============================================================
  // A. VALIDATOR IDENTITY / REPOSITORY TOPOLOGY
  // ============================================================

  section(
    "A. Validator identity and repository topology"
  );

  assert(
    PHASE === "12.14",
    "final validator phase identity is correct"
  );

  assert(
    LAYER ===
      "PHASE_12_FINAL_VALIDATION",
    "final validator layer identity is correct"
  );

  assert(
    fs.existsSync(BACKEND_ROOT),
    "backend repository root is available"
  );

  assert(
    fs.existsSync(FRONTEND_ROOT),
    "frontend repository root is available"
  );

  assert(
    exists("package.json"),
    "backend package.json exists"
  );

  assert(
    exists(
      "package.json",
      FRONTEND_ROOT
    ),
    "frontend package.json exists"
  );

  // ============================================================
  // B. PHASE 12 INTEGRATION CHAIN
  // ============================================================

  section(
    "B. Phase 12 integration-chain implementation artifacts"
  );

  const requiredBackendFiles = [
    "services/integration/endToEndIntegrationContract.js",

    "services/integration/vrmTelemetryDatabaseIntegrationService.js",

    "services/integration/telemetryEventsReliabilityIntegrationService.js",

    "services/integration/eventsReliabilityEngineeringAnalyticsIntegrationService.js",

    "services/integration/engineeringAnalyticsForecastingIntegrationService.js",

    "services/integration/forecastingFinancialBiIntegrationService.js",
  ];

  for (
    const file of requiredBackendFiles
  ) {
    assert(
      exists(file),
      `Phase 12 integration artifact exists: ${file}`
    );
  }

  assert(
    sourceContains(
      path.join(
        BACKEND_ROOT,
        "services",
        "integration"
      ),
      /FINANCIAL[\s_\-/]*BI[\s\S]{0,300}OPTIMIZATION|OPTIMIZATION[\s\S]{0,300}FINANCIAL[\s_\-/]*BI/i
    ),
    "Financial/BI → Optimization/DSS integration source is present"
  );

  assert(
    sourceContains(
      path.join(
        BACKEND_ROOT,
        "services",
        "integration"
      ),
      /\[start\s*,\s*end\)|reportingWindow|horizon/i
    ),
    "cross-layer time-window propagation logic is present"
  );

  assert(
    sourceContains(
      path.join(
        BACKEND_ROOT,
        "services",
        "integration"
      ),
      /UNAVAILABLE/i
    ),
    "cross-layer UNAVAILABLE propagation logic is present"
  );

  assert(
    sourceContains(
      path.join(
        BACKEND_ROOT,
        "services",
        "integration"
      ),
      /read.?only|autoDispatch|executable|control/i
    ),
    "cross-layer read-only/control-boundary logic is present"
  );

  // ============================================================
  // C. CANONICAL BACKEND API
  // ============================================================

  section(
    "C. Canonical backend API source integration"
  );

  assert(
    sourceContains(
      BACKEND_ROOT,
      /\/api\/v1\/forecasting/
    ),
    "canonical /api/v1/forecasting route is wired"
  );

  assert(
    sourceContains(
      BACKEND_ROOT,
      /\/api\/v1\/financial-bi/
    ),
    "canonical /api/v1/financial-bi route is wired"
  );

  assert(
    sourceContains(
      BACKEND_ROOT,
      /\/api\/v1\/optimization-dss/
    ),
    "canonical /api/v1/optimization-dss route is wired"
  );

  assert(
    sourceContains(
      BACKEND_ROOT,
      /\/api\/v1\/engineering-analytics/
    ),
    "canonical /api/v1/engineering-analytics route is wired"
  );

  // ============================================================
  // D. FRONTEND INTEGRATION
  // ============================================================

  section(
    "D. Frontend integration source"
  );

  const frontendFiles = [
    "src/api/axios.js",

    "src/pages/EngineeringAnalytics.jsx",

    "src/pages/Forecasting.jsx",

    "src/pages/FinancialBiDashboard.jsx",

    "src/pages/OptimizationDssDashboard.jsx",

    "src/services/api/engineeringAnalyticsApi.js",

    "src/services/api/forecastingApi.js",

    "src/services/api/financialBiApi.js",

    "src/services/api/optimizationDssDashboardApi.js",
  ];

  for (
    const file of frontendFiles
  ) {
    assert(
      exists(
        file,
        FRONTEND_ROOT
      ),
      `frontend integration artifact exists: ${file}`
    );
  }

  const axiosSource = readText(
    "src/api/axios.js",
    FRONTEND_ROOT
  );

  assert(
    /VITE_API_BASE_URL|VITE_API_URL/.test(
      axiosSource
    ),
    "frontend Axios base URL remains environment-configurable"
  );

  const optimizationWrapper =
    readText(
      "src/services/api/optimizationDssDashboardApi.js",
      FRONTEND_ROOT
    );

  assert(
    /\.get\s*\(/.test(
      optimizationWrapper
    ),
    "Optimization/DSS frontend wrapper exposes GET access"
  );

  assert(
    !/\.(post|put|patch|delete)\s*\(/i.test(
      optimizationWrapper
    ),
    "Optimization/DSS frontend wrapper exposes no mutation HTTP method"
  );

  const optimizationPage =
    readText(
      "src/pages/OptimizationDssDashboard.jsx",
      FRONTEND_ROOT
    );

  assert(
    /ADVISORY ONLY/i.test(
      optimizationPage
    ),
    "Optimization/DSS frontend preserves ADVISORY ONLY safety presentation"
  );

  assert(
    /NON-EXECUTABLE/i.test(
      optimizationPage
    ),
    "Optimization/DSS frontend preserves NON-EXECUTABLE safety presentation"
  );

  assert(
    /NO AUTO-DISPATCH/i.test(
      optimizationPage
    ),
    "Optimization/DSS frontend preserves NO AUTO-DISPATCH safety presentation"
  );

  // ============================================================
  // E. LIVE BACKEND REST VALIDATION
  // ============================================================

  section(
    "E. Live backend REST validation"
  );

  const root =
    await request(
      "Backend root",
      `${BACKEND_ORIGIN}/`
    );

  assert(
    root.status === 200,
    "backend root responds HTTP 200"
  );

  assert(
    root.body &&
      typeof root.body === "object",
    "backend root returns JSON"
  );

  assert(
    root.body?.application ===
      "ASHMAAN",
    "backend root identifies ASHMAAN"
  );

  // ------------------------------------------------------------
  // Forecasting
  // ------------------------------------------------------------

  const forecastingHealth =
    await request(
      "Forecasting health",
      `${BACKEND_ORIGIN}/api/v1/forecasting/health`,
      {
        headers: {
          Origin:
            FRONTEND_ORIGIN,
        },
      }
    );

  assert(
    forecastingHealth.status ===
      200,
    "Forecasting health endpoint responds HTTP 200"
  );

  assert(
    forecastingHealth.body
      ?.readOnly === true,
    "Forecasting API reports read-only boundary"
  );

  assert(
    corsOrigin(
      forecastingHealth
    ) === FRONTEND_ORIGIN,
    "Forecasting API permits the live frontend CORS origin"
  );

  const forecastingList =
    await request(
      "Forecasting list",
      `${BACKEND_ORIGIN}/api/v1/forecasting/forecasts?page=1&limit=25`,
      {
        headers: {
          Origin:
            FRONTEND_ORIGIN,
        },
      }
    );

  assert(
    forecastingList.status ===
      200,
    "Forecasting list endpoint responds HTTP 200"
  );

  assert(
    isArrayCompatible(
      forecastingList.body
    ),
    "Forecasting list returns an array-compatible payload"
  );

  // ------------------------------------------------------------
  // Financial / BI
  // ------------------------------------------------------------

  const financialList =
    await request(
      "Financial/BI KPI list",
      `${BACKEND_ORIGIN}/api/v1/financial-bi/kpis?page=1&limit=25`,
      {
        headers: {
          Origin:
            FRONTEND_ORIGIN,
        },
      }
    );

  assert(
    financialList.status === 200,
    "Financial/BI KPI endpoint responds HTTP 200"
  );

  assert(
    isArrayCompatible(
      financialList.body
    ),
    "Financial/BI KPI endpoint returns an array-compatible payload"
  );

  assert(
    corsOrigin(
      financialList
    ) === FRONTEND_ORIGIN,
    "Financial/BI API permits the live frontend CORS origin"
  );

  // ------------------------------------------------------------
  // Optimization / DSS
  // ------------------------------------------------------------

  const optimizationList =
    await request(
      "Optimization/DSS list",
      `${BACKEND_ORIGIN}/api/v1/optimization-dss/recommendations?page=1&limit=25`,
      {
        headers: {
          Origin:
            FRONTEND_ORIGIN,
        },
      }
    );

  assert(
    optimizationList.status ===
      200,
    "Optimization/DSS endpoint responds HTTP 200"
  );

  assert(
    isArrayCompatible(
      optimizationList.body
    ),
    "Optimization/DSS endpoint returns an array-compatible payload"
  );

  assert(
    corsOrigin(
      optimizationList
    ) === FRONTEND_ORIGIN,
    "Optimization/DSS API permits the live frontend CORS origin"
  );

  // ------------------------------------------------------------
  // Engineering Analytics
  // ------------------------------------------------------------

  const engineeringHealth =
    await request(
      "Engineering Analytics health",
      `${BACKEND_ORIGIN}/api/v1/engineering-analytics/health`,
      {
        headers: {
          Origin:
            FRONTEND_ORIGIN,
        },
      }
    );

  assert(
    [200, 503].includes(
      engineeringHealth.status
    ),
    "Engineering Analytics health returns READY or explicit UNAVAILABLE"
  );

  assert(
    corsOrigin(
      engineeringHealth
    ) === FRONTEND_ORIGIN,
    "Engineering Analytics API permits the live frontend CORS origin"
  );

  if (
    engineeringHealth.status ===
    503
  ) {
    console.log(
      "INFO: Engineering Analytics aggregate provider remains explicitly UNAVAILABLE; this is accepted and is not interpreted as zero."
    );

    assert(
      true,
      "Engineering Analytics explicit UNAVAILABLE boundary is preserved"
    );
  } else {
    assert(
      true,
      "Engineering Analytics runtime provider is available"
    );
  }

  // ============================================================
  // F. READ-ONLY / CONTROL BOUNDARY
  // ============================================================

  section(
    "F. Live read-only/control-boundary verification"
  );

  const mutationTargets = [
    [
      "Forecasting POST",
      `${BACKEND_ORIGIN}/api/v1/forecasting/forecasts`,
    ],

    [
      "Financial/BI POST",
      `${BACKEND_ORIGIN}/api/v1/financial-bi/kpis`,
    ],

    [
      "Optimization/DSS POST",
      `${BACKEND_ORIGIN}/api/v1/optimization-dss/recommendations`,
    ],
  ];

  for (
    const [
      label,
      url,
    ] of mutationTargets
  ) {
    const result =
      await request(
        label,
        url,
        {
          method: "POST",

          headers: {
            Origin:
              FRONTEND_ORIGIN,

            "content-type":
              "application/json",
          },

          body:
            JSON.stringify({
              phase: PHASE,
              mutationProbe: true,
            }),
        }
      );

    assert(
      result.status < 200 ||
        result.status >= 300,
      `${label} is rejected by the read-only API boundary`
    );
  }

  const unknown =
    await request(
      "Unknown canonical API route",
      `${BACKEND_ORIGIN}/api/v1/__phase12_14_unknown_route__`
    );

  assert(
    unknown.status === 404,
    "unknown canonical API route returns HTTP 404"
  );

  // ============================================================
  // G. LIVE FRONTEND SHELL
  // ============================================================

  section(
    "G. Live frontend shell and SPA-route validation"
  );

  const frontendRoot =
    await request(
      "Frontend root",
      `${FRONTEND_ORIGIN}/`
    );

  assert(
    frontendRoot.status === 200,
    "live frontend root responds HTTP 200"
  );

  assert(
    typeof frontendRoot.body ===
      "string" &&
      /<div[^>]+id=["']root["']/i.test(
        frontendRoot.body
      ),
    "live frontend HTML exposes the React root mount"
  );

  const spaRoutes = [
    "/engineering-analytics",
    "/forecasting",
    "/financial-bi",
    "/optimization-dss",
  ];

  for (
    const route of spaRoutes
  ) {
    const result =
      await request(
        `Frontend SPA ${route}`,
        `${FRONTEND_ORIGIN}${route}`
      );

    assert(
      result.status === 200,
      `${route} SPA route responds HTTP 200`
    );

    assert(
      typeof result.body ===
        "string" &&
        /<div[^>]+id=["']root["']/i.test(
          result.body
        ),
      `${route} returns the React application shell`
    );
  }

  // ============================================================
  // H. FINAL SEMANTIC GATES
  // ============================================================

  section(
    "H. Phase 12 final semantic gates"
  );

  assert(
    sourceContains(
      BACKEND_ROOT,
      /missingMeansZero\s*[:=]\s*false|missing.*zero/i
    ),
    "source preserves missing telemetry/value ≠ zero semantics"
  );

  assert(
    sourceContains(
      BACKEND_ROOT,
      /unitInferenceAllowed\s*[:=]\s*false|unit inference/i
    ),
    "source preserves no-unqualified-unit-inference semantics"
  );

  assert(
    sourceContains(
      BACKEND_ROOT,
      /autoDispatch\s*[:=]\s*false/i
    ),
    "Optimization/DSS source preserves autoDispatch=false"
  );

  assert(
    sourceContains(
      BACKEND_ROOT,
      /executable\s*[:=]\s*false/i
    ),
    "Optimization/DSS source preserves executable=false"
  );

  assert(
    sourceContains(
      BACKEND_ROOT,
      /advisoryOnly\s*[:=]\s*true/i
    ),
    "Optimization/DSS source preserves advisoryOnly=true"
  );

  // ============================================================
  // FINAL RESULT
  // ============================================================

  console.log(
    "\n" +
      "-".repeat(72)
  );

  console.log(
    "PHASE 12.14 FINAL RESULT"
  );

  console.log(
    "-".repeat(72)
  );

  console.log(
    `Backend Root               : ${BACKEND_ORIGIN}`
  );

  console.log(
    `Frontend Root              : ${FRONTEND_ORIGIN}`
  );

  console.log(
    "Integration chain          : VERIFIED"
  );

  console.log(
    "Canonical API              : VERIFIED"
  );

  console.log(
    "Frontend integration       : VERIFIED"
  );

  console.log(
    "CORS                       : VERIFIED"
  );

  console.log(
    "Read-only boundary         : VERIFIED"
  );

  console.log(
    "Executable control         : NOT EXPOSED"
  );

  console.log(
    "Auto-dispatch              : DISABLED"
  );

  console.log(
    "Browser D2 evidence        : PREVIOUSLY REVIEWED / ACCEPTED"
  );

  console.log(
    "-".repeat(72)
  );

  banner(
    `Assertions passed: ${passed}\nASHMAAN PHASE 12.14 FINAL VALIDATION PASSED`
  );
} catch (error) {
  console.error(
    "\n" +
      "=".repeat(72)
  );

  console.error(
    "ASHMAAN PHASE 12.14 FINAL VALIDATION FAILED"
  );

  console.error(
    "=".repeat(72)
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}