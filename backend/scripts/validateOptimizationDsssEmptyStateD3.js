// ASHMAAN Post-Phase-11 Runtime Hardening D.3
// Empty-state API/runtime validation.
// This is NOT Phase 12.

import crypto from "node:crypto";
import dns from "node:dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

import OptimizationDssRecommendation
  from "../models/OptimizationDssRecommendation.js";

dotenv.config();

const CHECKPOINT =
  "POST_PHASE_11_RUNTIME_HARDENING_D3_EMPTY_STATE";

const HTTP_BASE =
  (
    process.env.ASHMAAN_HTTP_BASE ||
    process.env.ASHMAAN_API_BASE_URL ||
    "http://localhost:5000"
  ).replace(/\/+$/, "");

let assertions = 0;
let connectedHere = false;

function pass(message) {
  assertions += 1;
  console.log(`PASS ${assertions}: ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function configureDns() {
  const servers =
    (
      process.env.ASHMAAN_DNS_SERVERS ||
      "1.1.1.1,8.8.8.8"
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

  dns.setServers(servers);

  return dns.getServers();
}

async function getJson(url) {
  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

  const text =
    await response.text();

  let payload = null;

  try {
    payload = JSON.parse(text);
  } catch {
    // Raw text is retained for diagnostics.
  }

  return {
    response,
    payload,
    text,
  };
}

function extractList(payload) {
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }

  if (Array.isArray(payload?.data?.records)) {
    return payload.data.records;
  }

  if (Array.isArray(payload?.data?.recommendations)) {
    return payload.data.recommendations;
  }

  return null;
}

console.log("");
console.log("================================================");
console.log("ASHMAAN POST-PHASE-11 RUNTIME HARDENING D.3");
console.log("================================================");
console.log(`Checkpoint: ${CHECKPOINT}`);
console.log(`HTTP base: ${HTTP_BASE}`);
console.log("");

const activeDns = configureDns();

assert(
  activeDns.length > 0,
  "Node DNS resolver list is empty"
);

pass(
  `Node DNS resolver configured (${activeDns.join(", ")})`
);

const mongoUri =
  process.env.MONGODB_URI?.trim();

assert(
  mongoUri,
  "MONGODB_URI is missing"
);

pass(
  "MongoDB URI is available"
);

try {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(
      mongoUri,
      {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      }
    );

    connectedHere = true;
  }

  assert(
    mongoose.connection.readyState === 1,
    "Mongoose connection is not OPEN"
  );

  pass(
    `MongoDB Atlas connection is open (${mongoose.connection.name})`
  );

  /*
   * Generate a unique site ID that should not exist.
   *
   * We verify it directly against Atlas before using it,
   * so the API empty state is based on proven absence,
   * not an assumption.
   */
  const impossibleVrmSiteId =
    `ASHMAAN-D3-EMPTY-${crypto.randomUUID()}`;

  const existingCount =
    await OptimizationDssRecommendation.countDocuments({
      "scopeIdentity.vrmSiteId":
        impossibleVrmSiteId,
    });

  assert(
    existingCount === 0,
    "D.3 unique empty-state filter unexpectedly matches Atlas data"
  );

  pass(
    "unique D.3 filter is proven absent from MongoDB Atlas"
  );

  /*
   * Query the real live Optimization/DSS API using the
   * proven non-matching site identifier.
   */
  const url =
    `${HTTP_BASE}/api/optimization-dss/recommendations` +
    `?page=1&limit=25` +
    `&vrmSiteId=${encodeURIComponent(impossibleVrmSiteId)}`;

  const result =
    await getJson(url);

  if (result.response.status !== 200) {
    console.error(
      "INFO: response body:",
      result.text
    );
  }

  assert(
    result.response.status === 200,
    `empty-state list endpoint returned HTTP ${result.response.status}`
  );

  pass(
    "empty-state filtered list endpoint returns HTTP 200"
  );

  /*
   * Phase 11.12 envelope must remain valid even when
   * the result set is empty.
   */
  assert(
    result.payload?.phase === "11.12",
    "empty-state envelope phase mismatch"
  );

  assert(
    result.payload?.layer === "OPTIMIZATION_DSS",
    "empty-state envelope layer mismatch"
  );

  assert(
    result.payload?.status === "OK",
    "empty-state envelope status mismatch"
  );

  pass(
    "empty-state response preserves Phase 11.12 Optimization/DSS envelope"
  );

  /*
   * Empty means an actual empty array.
   * It must not become null, UNAVAILABLE, or a fabricated
   * recommendation.
   */
  const records =
    extractList(result.payload);

  assert(
    Array.isArray(records),
    "empty-state response does not expose a list"
  );

  assert(
    records.length === 0,
    `expected zero recommendations but received ${records.length}`
  );

  pass(
    "empty-state response contains zero recommendation records"
  );

  /*
   * Pagination metadata must represent the empty set
   * correctly.
   */
  const meta =
    result.payload?.meta;

  assert(
    meta &&
      typeof meta === "object",
    "empty-state response meta is missing"
  );

  assert(
    meta.total === 0,
    `empty-state meta.total must be 0, received ${meta.total}`
  );

  assert(
    meta.pageCount === 0,
    `empty-state meta.pageCount must be 0, received ${meta.pageCount}`
  );

  pass(
    "empty-state pagination metadata preserves total=0 and pageCount=0"
  );

  assert(
    meta.page === 1,
    `empty-state page must remain 1, received ${meta.page}`
  );

  assert(
    meta.limit === 25,
    `empty-state limit must remain 25, received ${meta.limit}`
  );

  pass(
    "empty-state response preserves requested page/limit metadata"
  );

  /*
   * Confirm the API did not silently drop or replace
   * the site filter.
   */
  assert(
    meta.filters?.vrmSiteId === impossibleVrmSiteId,
    "empty-state response does not preserve the requested vrmSiteId filter"
  );

  pass(
    "empty-state response echoes the exact non-matching site filter"
  );

  /*
   * There should be no placeholder/fabricated record.
   * With records.length === 0 this is expected to remain false.
   */
  const malformedRecord =
    records.some(
      (record) =>
        record === null ||
        typeof record !== "object"
    );

  assert(
    malformedRecord === false,
    "empty-state response synthesizes malformed recommendation entries"
  );

  pass(
    "empty-state response synthesizes no placeholder recommendation record"
  );

  /*
   * Optimization/DSS remains read-only.
   */
  const mutationChecks = [
    [
      "POST",
      `${HTTP_BASE}/api/optimization-dss/recommendations`,
    ],
    [
      "PUT",
      `${HTTP_BASE}/api/optimization-dss/recommendations/d3-empty-state`,
    ],
    [
      "PATCH",
      `${HTTP_BASE}/api/optimization-dss/recommendations/d3-empty-state`,
    ],
    [
      "DELETE",
      `${HTTP_BASE}/api/optimization-dss/recommendations/d3-empty-state`,
    ],
  ];

  for (const [method, mutationUrl] of mutationChecks) {
    const response =
      await fetch(
        mutationUrl,
        {
          method,
        }
      );

    assert(
      [404, 405].includes(response.status),
      `${method} unexpectedly exposed mutation route with HTTP ${response.status}`
    );
  }

  pass(
    "empty-state runtime keeps Optimization/DSS HTTP surface read-only"
  );

  /*
   * Final Atlas check:
   * a read-only empty-state request must not create data.
   */
  const countAfter =
    await OptimizationDssRecommendation.countDocuments({
      "scopeIdentity.vrmSiteId":
        impossibleVrmSiteId,
    });

  assert(
    countAfter === 0,
    "empty-state read unexpectedly created an Atlas record"
  );

  pass(
    "empty-state read creates no MongoDB Atlas record"
  );

  console.log("");
  console.log(`Assertions passed: ${assertions}`);
  console.log("================================================");
  console.log(
    "POST-PHASE-11 RUNTIME HARDENING D.3 API EMPTY-STATE PASSED"
  );
  console.log("================================================");
  console.log("");

  /*
   * IMPORTANT:
   * Copy this exact value after the validator passes.
   * We will use it for the browser-side D.3 proof.
   */
  console.log("Browser verification input:");
  console.log(
    `vrmSiteId=${impossibleVrmSiteId}`
  );
  console.log("");

  console.log("Expected browser state:");
  console.log(
    '- "No persisted Optimization/DSS recommendations match the current filters."'
  );
  console.log(
    "- KPI counts remain 0"
  );
  console.log(
    "- recommendation table/list has no fabricated row"
  );
  console.log(
    "- ADVISORY ONLY / NON-EXECUTABLE / NO AUTO-DISPATCH remain visible"
  );
  console.log(
    "- no red API error"
  );
  console.log(
    "- no browser console/runtime error"
  );
  console.log(
    "- no Phase 12 work is executed by this validator"
  );
} catch (error) {
  console.error("");
  console.error("================================================");
  console.error(
    "POST-PHASE-11 RUNTIME HARDENING D.3 FAILED"
  );
  console.error("================================================");
  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
} finally {
  if (connectedHere) {
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error(
        "WARN: mongoose disconnect failed:",
        disconnectError?.message ??
          disconnectError
      );
    }
  }
}