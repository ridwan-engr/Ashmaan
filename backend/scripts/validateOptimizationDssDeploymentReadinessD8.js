import assert from "node:assert/strict";
import dns from "node:dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

import OptimizationDssRecommendation
  from "../models/OptimizationDssRecommendation.js";

dotenv.config();

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

const PHASE =
  "POST_PHASE_11_RUNTIME_HARDENING_D8_DEPLOYMENT_READINESS";

const BACKEND_URL =
  process.env.D8_HTTP_BASE ||
  process.env.BACKEND_URL ||
  "http://localhost:5000";

const API_BASE =
  `${BACKEND_URL}/api/optimization-dss`;

let checks = 0;

function pass(message) {
  checks += 1;
  console.log(
    `PASS ${checks}: ${message}`
  );
}

function fail(message) {
  throw new Error(message);
}

async function request(
  url,
  options = {}
) {
  return fetch(url, {
    redirect: "manual",
    ...options,
  });
}

async function readJson(
  response
) {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    fail(
      `Expected JSON response from ${response.url}`
    );
  }
}

async function main() {
  console.log("");
  console.log(
    "================================================"
  );
  console.log(
    "ASHMAAN POST-PHASE-11 RUNTIME HARDENING D.8 BACKEND"
  );
  console.log(
    "================================================"
  );
  console.log(
    `Checkpoint: ${PHASE}`
  );
  console.log(
    `Backend: ${BACKEND_URL}`
  );
  console.log("");

  assert.ok(
    Array.isArray(
      dns.getServers()
    )
  );

  assert.ok(
    dns.getServers().length > 0
  );

  pass(
    "Node DNS resolver configured"
  );

  assert.ok(
    process.env.MONGODB_URI
  );

  pass(
    "MongoDB URI is available"
  );

  await mongoose.connect(
    process.env.MONGODB_URI
  );

  assert.equal(
    mongoose.connection.readyState,
    1
  );

  pass(
    `MongoDB Atlas connection is open (${mongoose.connection.name})`
  );

  const beforeCount =
    await OptimizationDssRecommendation.countDocuments(
      {}
    );

  const listResponse =
    await request(
      `${API_BASE}/recommendations?page=1&limit=25&sortBy=createdAt&sortDirection=desc`
    );

  assert.equal(
    listResponse.status,
    200
  );

  pass(
    "canonical Optimization/DSS list route returns HTTP 200"
  );

  const listBody =
    await readJson(
      listResponse
    );

  assert.equal(
    listBody?.phase,
    "11.12"
  );

  assert.equal(
    listBody?.layer,
    "OPTIMIZATION_DSS"
  );

  assert.equal(
    listBody?.status,
    "OK"
  );

  assert.ok(
    Array.isArray(
      listBody?.data
    )
  );

  pass(
    "Phase 11.12 Optimization/DSS API envelope is deployment-ready"
  );

  const badV1 =
    await request(
      `${BACKEND_URL}/api/v1/api/optimization-dss/recommendations`
    );

  assert.equal(
    badV1.status,
    404
  );

  pass(
    "duplicated /api/v1/api/optimization-dss route is not exposed"
  );

  const badApi =
    await request(
      `${BACKEND_URL}/api/api/optimization-dss/recommendations`
    );

  assert.equal(
    badApi.status,
    404
  );

  pass(
    "duplicated /api/api/optimization-dss route is not exposed"
  );

  for (
    const method of [
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ]
  ) {
    const mutation =
      await request(
        `${API_BASE}/recommendations`,
        {
          method,
          headers: {
            "content-type":
              "application/json",
          },
          body:
            method === "DELETE"
              ? undefined
              : "{}",
        }
      );

    assert.equal(
      mutation.status,
      404,
      `${method} must not be exposed`
    );
  }

  pass(
    "Optimization/DSS deployment surface remains read-only"
  );

  const malformed =
    await request(
      `${API_BASE}/recommendations?page=0`
    );

  assert.equal(
    malformed.status,
    400
  );

  const malformedBody =
    await readJson(
      malformed
    );

  assert.equal(
    malformedBody?.status,
    "INVALID_REQUEST"
  );

  pass(
    "invalid requests remain safely classified"
  );

  const healthResponse =
    await request(
      `${API_BASE}/recommendations?page=1&limit=1`
    );

  assert.equal(
    healthResponse.status,
    200
  );

  const healthBody =
    await readJson(
      healthResponse
    );

  assert.equal(
    healthBody?.status,
    "OK"
  );

  pass(
    "Optimization/DSS API remains healthy after deployment probes"
  );

  const afterCount =
    await OptimizationDssRecommendation.countDocuments(
      {}
    );

  assert.equal(
    afterCount,
    beforeCount
  );

  pass(
    "deployment-readiness probes leave Optimization/DSS persistence unchanged"
  );

  assert.equal(
    checks,
    11
  );

  pass(
    "D.8 backend deployment-readiness assertion plan completed exactly"
  );

  console.log("");
  console.log(
    `Assertions passed: ${checks}`
  );
  console.log(
    "================================================"
  );
  console.log(
    "POST-PHASE-11 RUNTIME HARDENING D.8 BACKEND PASSED"
  );
  console.log(
    "================================================"
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "================================================"
    );
    console.error(
      "POST-PHASE-11 RUNTIME HARDENING D.8 BACKEND FAILED"
    );
    console.error(
      "================================================"
    );
    console.error(
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });