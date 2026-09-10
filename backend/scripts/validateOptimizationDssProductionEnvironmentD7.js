// scripts/validateOptimizationDssProductionEnvironmentD7.js

import assert from "node:assert/strict";
import dns from "node:dns";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

const CHECKPOINT =
  "POST_PHASE_11_RUNTIME_HARDENING_D7_PRODUCTION_ENVIRONMENT";

const HTTP_BASE =
  (
    process.env.D7_HTTP_BASE ??
    process.env.BACKEND_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

const FRONTEND_ORIGIN =
  (
    process.env.D7_FRONTEND_ORIGIN ??
    "http://localhost:4173"
  ).replace(/\/$/, "");

const API_BASE =
  `${HTTP_BASE}/api/optimization-dss`;

const mongoUri =
  process.env.MONGODB_URI?.trim();

let checks = 0;

function pass(message) {
  checks += 1;
  console.log(
    `PASS ${checks}: ${message}`
  );
}

async function request(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        redirect:
          "manual",

        ...options,
      }
    );

  let payload =
    null;

  try {
    payload =
      await response.json();
  } catch {
    payload =
      null;
  }

  return {
    response,
    payload,
  };
}

console.log();
console.log(
  "================================================"
);
console.log(
  "ASHMAAN POST-PHASE-11 RUNTIME HARDENING D.7 BACKEND"
);
console.log(
  "================================================"
);
console.log(
  `Checkpoint: ${CHECKPOINT}`
);
console.log(
  `Backend: ${HTTP_BASE}`
);
console.log(
  `Production-preview origin: ${FRONTEND_ORIGIN}`
);
console.log();

try {
  assert.deepEqual(
    dns.getServers(),
    [
      "1.1.1.1",
      "8.8.8.8",
    ]
  );

  pass(
    "Node DNS resolver configured"
  );

  assert.ok(
    mongoUri,
    "MONGODB_URI is missing"
  );

  pass(
    "MongoDB URI is available"
  );

  await mongoose.connect(
    mongoUri,
    {
      serverSelectionTimeoutMS:
        10000,

      connectTimeoutMS:
        10000,
    }
  );

  assert.equal(
    mongoose.connection.readyState,
    1
  );

  assert.equal(
    mongoose.connection.name,
    "ASHMAAN"
  );

  pass(
    "MongoDB Atlas connection is open (ASHMAAN)"
  );

  /*
   * ------------------------------------------------
   * Canonical live API
   * ------------------------------------------------
   */

  const canonical =
    await request(
      `${API_BASE}/recommendations?page=1&limit=1`,
      {
        headers: {
          Origin:
            FRONTEND_ORIGIN,
        },
      }
    );

  assert.equal(
    canonical.response.status,
    200
  );

  pass(
    "canonical /api/optimization-dss route returns HTTP 200"
  );

  assert.equal(
    canonical.payload?.phase,
    "11.12"
  );

  assert.equal(
    canonical.payload?.layer,
    "OPTIMIZATION_DSS"
  );

  assert.equal(
    canonical.payload?.status,
    "OK"
  );

  pass(
    "canonical route preserves Phase 11.12 Optimization/DSS API envelope"
  );

  /*
   * ------------------------------------------------
   * Path duplication must not be valid
   * ------------------------------------------------
   */

  const duplicatedV1 =
    await request(
      `${HTTP_BASE}/api/v1/api/optimization-dss/recommendations?page=1&limit=1`
    );

  assert.equal(
    duplicatedV1.response.status,
    404
  );

  pass(
    "duplicated /api/v1/api/optimization-dss path is not exposed"
  );

  const duplicatedApi =
    await request(
      `${HTTP_BASE}/api/api/optimization-dss/recommendations?page=1&limit=1`
    );

  assert.equal(
    duplicatedApi.response.status,
    404
  );

  pass(
    "duplicated /api/api/optimization-dss path is not exposed"
  );

  /*
   * ------------------------------------------------
   * Production-preview CORS
   * ------------------------------------------------
   */

  const allowOrigin =
    canonical.response.headers.get(
      "access-control-allow-origin"
    );

  assert.ok(
    allowOrigin,
    `No Access-Control-Allow-Origin header returned for ${FRONTEND_ORIGIN}`
  );

  assert.ok(
    allowOrigin ===
      FRONTEND_ORIGIN ||
      allowOrigin === "*",
    `Unexpected Access-Control-Allow-Origin: ${allowOrigin}`
  );

  pass(
    "GET response exposes a CORS origin compatible with production-preview frontend"
  );

  const preflight =
    await fetch(
      `${API_BASE}/recommendations?page=1&limit=1`,
      {
        method:
          "OPTIONS",

        headers: {
          Origin:
            FRONTEND_ORIGIN,

          "Access-Control-Request-Method":
            "GET",

          "Access-Control-Request-Headers":
            "content-type",
        },
      }
    );

  assert.ok(
    preflight.status >=
      200 &&
      preflight.status <
        300,
    `CORS preflight returned HTTP ${preflight.status}`
  );

  pass(
    "production-preview CORS preflight returns a successful HTTP status"
  );

  const preflightAllowOrigin =
    preflight.headers.get(
      "access-control-allow-origin"
    );

  assert.ok(
    preflightAllowOrigin ===
      FRONTEND_ORIGIN ||
      preflightAllowOrigin === "*",
    `Unexpected preflight Access-Control-Allow-Origin: ${preflightAllowOrigin}`
  );

  pass(
    "CORS preflight authorizes production-preview frontend origin"
  );

  const allowedMethods =
    (
      preflight.headers.get(
        "access-control-allow-methods"
      ) ??
      ""
    ).toUpperCase();

  assert.ok(
    allowedMethods.includes(
      "GET"
    )
  );

  pass(
    "CORS preflight authorizes GET"
  );

  /*
   * ------------------------------------------------
   * Read-only behavior
   * ------------------------------------------------
   */

  const collection =
    mongoose.connection.db.collection(
      "optimizationDssRecommendations"
    );

  const countBefore =
    await collection.countDocuments(
      {}
    );

  const healthyAgain =
    await request(
      `${API_BASE}/recommendations?page=1&limit=1`,
      {
        headers: {
          Origin:
            FRONTEND_ORIGIN,
        },
      }
    );

  assert.equal(
    healthyAgain.response.status,
    200
  );

  assert.equal(
    healthyAgain.payload?.status,
    "OK"
  );

  pass(
    "API remains healthy after production-environment probes"
  );

  const countAfter =
    await collection.countDocuments(
      {}
    );

  assert.equal(
    countAfter,
    countBefore
  );

  pass(
    "D.7 production-environment probes leave Optimization/DSS persistence unchanged"
  );

  /*
   * ------------------------------------------------
   * Final count
   * ------------------------------------------------
   */

  assert.equal(
    checks,
    13
  );

  pass(
    "D.7 backend production-environment assertion plan completed exactly"
  );

  console.log();
  console.log(
    `Assertions passed: ${checks}`
  );
  console.log(
    "================================================"
  );
  console.log(
    "POST-PHASE-11 RUNTIME HARDENING D.7 BACKEND PASSED"
  );
  console.log(
    "================================================"
  );
  console.log();
} catch (error) {
  console.error();
  console.error(
    "================================================"
  );
  console.error(
    "POST-PHASE-11 RUNTIME HARDENING D.7 BACKEND FAILED"
  );
  console.error(
    "================================================"
  );

  console.error(
    error?.stack ??
      error
  );

  process.exitCode =
    1;
} finally {
  if (
    mongoose.connection.readyState !==
    0
  ) {
    await mongoose.disconnect();
  }
}