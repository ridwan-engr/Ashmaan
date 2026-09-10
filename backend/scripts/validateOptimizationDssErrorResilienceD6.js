// scripts/validateOptimizationDssErrorResilienceD6.js

import assert from "node:assert/strict";
import dns from "node:dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const CHECKPOINT =
  "POST_PHASE_11_RUNTIME_HARDENING_D6_ERROR_STATE_RESILIENCE";

const HTTP_BASE = (
  process.env.D6_HTTP_BASE ??
  process.env.BACKEND_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

const API_BASE =
  `${HTTP_BASE}/api/optimization-dss`;

const mongoUri =
  process.env.MONGODB_URI?.trim();

let checks = 0;

function pass(message) {
  checks += 1;
  console.log(`PASS ${checks}: ${message}`);
}

async function request(path, options = {}) {
  const response = await fetch(
    `${API_BASE}${path}`,
    {
      redirect: "manual",
      ...options,
    }
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    status: response.status,
    payload,
  };
}

function assertApiIdentity(payload) {
  assert.equal(
    payload?.phase,
    "11.12"
  );

  assert.equal(
    payload?.layer,
    "OPTIMIZATION_DSS"
  );
}

console.log();
console.log(
  "================================================"
);
console.log(
  "ASHMAAN POST-PHASE-11 RUNTIME HARDENING D.6"
);
console.log(
  "================================================"
);
console.log(`Checkpoint: ${CHECKPOINT}`);
console.log(`HTTP base: ${HTTP_BASE}`);
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
    "Node DNS resolver configured (1.1.1.1, 8.8.8.8)"
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
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
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

  const collection =
    mongoose.connection.db.collection(
      "optimizationDssRecommendations"
    );

  const countBefore =
    await collection.countDocuments({});

  /*
   * ------------------------------------------------
   * Baseline healthy request
   * ------------------------------------------------
   */

  const healthyBefore =
    await request(
      "/recommendations?page=1&limit=1"
    );

  assert.equal(
    healthyBefore.status,
    200
  );

  assertApiIdentity(
    healthyBefore.payload
  );

  assert.equal(
    healthyBefore.payload?.status,
    "OK"
  );

  pass(
    "baseline live Optimization/DSS list request returns HTTP 200 / OK"
  );

  /*
   * ------------------------------------------------
   * NOT_FOUND
   * ------------------------------------------------
   */

  const missingKey =
    "f".repeat(64);

  const notFound =
    await request(
      `/recommendations/${missingKey}`
    );

  assert.equal(
    notFound.status,
    404
  );

  assertApiIdentity(
    notFound.payload
  );

  assert.equal(
    notFound.payload?.status,
    "NOT_FOUND"
  );

  assert.equal(
    notFound.payload?.error?.code,
    "RECOMMENDATION_NOT_FOUND"
  );

  pass(
    "valid-but-absent persistence key returns controlled HTTP 404 / NOT_FOUND"
  );

  /*
   * ------------------------------------------------
   * Invalid persistence key
   * ------------------------------------------------
   */

  const malformedKey =
    await request(
      "/recommendations/not-a-valid-persistence-key"
    );

  assert.equal(
    malformedKey.status,
    400
  );

  assertApiIdentity(
    malformedKey.payload
  );

  assert.equal(
    malformedKey.payload?.status,
    "INVALID_REQUEST"
  );

  assert.equal(
    malformedKey.payload?.error?.code,
    "INVALID_REQUEST"
  );

  pass(
    "malformed persistence key returns controlled HTTP 400 / INVALID_REQUEST"
  );

  /*
   * ------------------------------------------------
   * Invalid pagination
   * ------------------------------------------------
   */

  const invalidPage =
    await request(
      "/recommendations?page=0&limit=25"
    );

  assert.equal(
    invalidPage.status,
    400
  );

  assert.equal(
    invalidPage.payload?.status,
    "INVALID_REQUEST"
  );

  pass(
    "page=0 returns controlled INVALID_REQUEST without server crash"
  );

  const invalidLimit =
    await request(
      "/recommendations?page=1&limit=101"
    );

  assert.equal(
    invalidLimit.status,
    400
  );

  assert.equal(
    invalidLimit.payload?.status,
    "INVALID_REQUEST"
  );

  pass(
    "limit above maximum returns controlled INVALID_REQUEST"
  );

  /*
   * ------------------------------------------------
   * Invalid sorting
   * ------------------------------------------------
   */

  const invalidSort =
    await request(
      "/recommendations?sortBy=notARealField&sortDirection=desc"
    );

  assert.equal(
    invalidSort.status,
    400
  );

  assert.equal(
    invalidSort.payload?.status,
    "INVALID_REQUEST"
  );

  pass(
    "unsupported sort field returns controlled INVALID_REQUEST"
  );

  const invalidDirection =
    await request(
      "/recommendations?sortBy=createdAt&sortDirection=sideways"
    );

  assert.equal(
    invalidDirection.status,
    400
  );

  assert.equal(
    invalidDirection.payload?.status,
    "INVALID_REQUEST"
  );

  pass(
    "unsupported sort direction returns controlled INVALID_REQUEST"
  );

  /*
   * ------------------------------------------------
   * Invalid horizon
   * ------------------------------------------------
   */

  const invalidHorizon =
    await request(
      "/recommendations?horizonStart=not-a-date"
    );

  assert.equal(
    invalidHorizon.status,
    400
  );

  assert.equal(
    invalidHorizon.payload?.status,
    "INVALID_REQUEST"
  );

  pass(
    "malformed horizon timestamp returns controlled INVALID_REQUEST"
  );

  const reversedHorizon =
    await request(
      "/recommendations?" +
        "horizonStart=2026-09-10T00%3A00%3A00.000Z&" +
        "horizonEnd=2026-09-09T00%3A00%3A00.000Z"
    );

  assert.equal(
    reversedHorizon.status,
    400
  );

  assert.equal(
    reversedHorizon.payload?.status,
    "INVALID_REQUEST"
  );

  pass(
    "reversed horizon range returns controlled INVALID_REQUEST"
  );

  /*
   * ------------------------------------------------
   * Mutation routes must not exist
   * ------------------------------------------------
   */

  for (
    const method of
      [
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
      ]
  ) {
    const mutationProbe =
      await request(
        "/recommendations",
        {
          method,

          headers: {
            "content-type":
              "application/json",
          },

          body:
            method === "DELETE"
              ? undefined
              : JSON.stringify({
                  probe:
                    CHECKPOINT,
                }),
        }
      );

    assert.equal(
      mutationProbe.status,
      404
    );

    pass(
      `${method} /recommendations is not exposed`
    );
  }

  /*
   * ------------------------------------------------
   * Recovery
   * ------------------------------------------------
   */

  const healthyAfter =
    await request(
      "/recommendations?page=1&limit=1"
    );

  assert.equal(
    healthyAfter.status,
    200
  );

  assertApiIdentity(
    healthyAfter.payload
  );

  assert.equal(
    healthyAfter.payload?.status,
    "OK"
  );

  pass(
    "normal list API remains healthy after malformed and mutation-route probes"
  );

  /*
   * ------------------------------------------------
   * Prove read-only behavior
   * ------------------------------------------------
   */

  const countAfter =
    await collection.countDocuments({});

  assert.equal(
    countAfter,
    countBefore
  );

  pass(
    "D.6 API error/resilience probes do not mutate Optimization/DSS Atlas records"
  );

  /*
   * ------------------------------------------------
   * Evidence serialization
   * ------------------------------------------------
   */

  assert.doesNotThrow(
    () =>
      JSON.stringify({
        baseline:
          healthyBefore.payload,

        notFound:
          notFound.payload,

        malformedKey:
          malformedKey.payload,

        recovered:
          healthyAfter.payload,
      })
  );

  pass(
    "D.6 runtime evidence remains JSON serializable"
  );

  /*
   * 17 checks exist before final assertion.
   */

  assert.equal(
    checks,
    19
  );

  pass(
    "D.6 backend/API assertion plan completed exactly"
  );

  console.log();
  console.log(
    `Assertions passed: ${checks}`
  );
  console.log(
    "================================================"
  );
  console.log(
    "POST-PHASE-11 RUNTIME HARDENING D.6 BACKEND/API PASSED"
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
    "POST-PHASE-11 RUNTIME HARDENING D.6 BACKEND/API FAILED"
  );
  console.error(
    "================================================"
  );

  console.error(
    error?.stack ??
      error
  );

  process.exitCode = 1;
} finally {
  if (
    mongoose.connection.readyState !==
    0
  ) {
    await mongoose.disconnect();
  }
}