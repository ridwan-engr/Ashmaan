// ASHMAAN Post-Phase-11 Runtime Hardening D.2
// Corrected Patch 3
// This is NOT Phase 12.

import crypto from "node:crypto";
import dns from "node:dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

import OptimizationDssRecommendation
  from "../models/OptimizationDssRecommendation.js";

import {
  createMongooseOptimizationDssPersistenceRepository,
} from "../services/optimizationDss/mongooseOptimizationDssPersistenceRepository.js";

import {
  persistOptimizationDssRecommendation,
} from "../services/optimizationDss/optimizationDssPersistenceService.js";

import {
  OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS,
  OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE,
} from "../services/optimizationDss/optimizationDssPersistenceContract.js";

dotenv.config();

const CHECKPOINT =
  "POST_PHASE_11_RUNTIME_HARDENING_D2_PATCH_3_CORRECTED";

const HTTP_BASE =
  (process.env.ASHMAAN_HTTP_BASE ||
    process.env.ASHMAAN_API_BASE_URL ||
    "http://localhost:5000")
    .replace(/\/+$/, "");

let assertions = 0;
let cleanupKey = null;
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

function buildContract() {
  const nonce = crypto.randomUUID();

  const start =
    new Date().toISOString();

  const end =
    new Date(
      Date.now() + 5 * 60 * 1000
    ).toISOString();

  const persistenceKey =
    crypto
      .createHash("sha256")
      .update(`${CHECKPOINT}:${nonce}`)
      .digest("hex");

  const actionId =
    `d2-${nonce}`;

  const vrmSiteId =
    `D2-RUNTIME-${nonce}`;

  const recommendation =
    Object.freeze({
      recommendationKind:
        "DISPATCH_SETPOINT",
      advisoryOnly:
        true,
      executable:
        false,
      autoDispatch:
        false,
      actions:
        Object.freeze([
          Object.freeze({
            actionId,
            recommendationKind:
              "DISPATCH_SETPOINT",
            target:
              "GRID_POWER",
            timestamp:
              start,
            value:
              0,
            unit:
              "kW",
            advisoryOnly:
              true,
            executable:
              false,
            autoDispatch:
              false,
          }),
        ]),
    });

  const recommendationContract =
    Object.freeze({
      scope:
        "SITE",
      scopeIdentity:
        Object.freeze({
          vrmSiteId,
        }),
      horizon:
        Object.freeze({
          start,
          end,
          interval:
            "[start,end)",
        }),
      recommendationKind:
        "DISPATCH_SETPOINT",
      applicability:
        "APPLICABLE",
      confidence:
        "HIGH",
      evidenceRefs:
        Object.freeze([
          `post-phase-11-runtime-hardening-d2:${nonce}`,
        ]),
    });

  const qualifiedResult =
    Object.freeze({
      objectiveValue:
        0,
    });

  const actionResults =
    Object.freeze([
      Object.freeze({
        actionId,
        status:
          "GENERATED",
        value:
          0,
        unit:
          "kW",
      }),
    ]);

  const generationResult =
    Object.freeze({
      phase:
        "11.9",
      layer:
        "OPTIMIZATION_DSS",
      status:
        "GENERATED",
      reason:
        "GENERATED",
      recommendation,
      actionResults,
      generatedActionCount:
        1,
      unavailableActionCount:
        0,
      qualifiedResult,
      recommendationContract,
      executionResult:
        null,
      builtModel:
        null,
    });

  const persistenceRecord =
    Object.freeze({
      persistenceKey,
      recordType:
        "OPTIMIZATION_DSS_RECOMMENDATION",
      phase:
        "11.10",
      layer:
        "OPTIMIZATION_DSS",
      scope:
        "SITE",
      scopeIdentity:
        recommendationContract.scopeIdentity,
      horizon:
        recommendationContract.horizon,
      recommendationKind:
        "DISPATCH_SETPOINT",
      applicability:
        "APPLICABLE",
      confidence:
        "HIGH",
      generationStatus:
        "GENERATED",
      generationReason:
        "GENERATED",
      recommendation,
      actionResults,
      generatedActionCount:
        1,
      unavailableActionCount:
        0,
      objectiveValue:
        0,
      evidenceRefs:
        recommendationContract.evidenceRefs,
      advisoryOnly:
        true,
      executable:
        false,
      autoDispatch:
        false,
    });

  const persistenceContract =
    Object.freeze({
      phase:
        "11.10",
      layer:
        "OPTIMIZATION_DSS",
      upstreamPhase:
        "11.9",
      generationResult,
      recommendationContract,
      qualifiedResult,
      executionResult:
        null,
      builtModel:
        null,
      persistenceIdentity:
        Object.freeze({
          recordType:
            "OPTIMIZATION_DSS_RECOMMENDATION",
          persistenceKey,
          deterministic:
            true,
        }),
      writeMode:
        OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE
          .UPSERT_BY_PERSISTENCE_KEY,
      record:
        persistenceRecord,
      status:
        OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS
          .CONTRACT_DEFINED,
      persisted:
        false,
      persistenceResult:
        null,
      boundaries:
        Object.freeze({
          automaticDispatchAllowed:
            false,
          executableActionProduced:
            false,
          missingMeansZero:
            false,
          unavailableMeansZero:
            false,
        }),
    });

  return Object.freeze({
    persistenceKey,
    vrmSiteId,
    persistenceContract,
  });
}

async function getJson(url, options = {}) {
  const response =
    await fetch(url, {
      method:
        "GET",
      headers:
        {
          Accept:
            "application/json",
        },
      ...options,
    });

  const text =
    await response.text();

  let payload =
    null;

  try {
    payload =
      JSON.parse(text);
  } catch {
    // Keep raw text for diagnostics.
  }

  return {
    response,
    payload,
    text,
  };
}

function extractList(payload) {
  if (
    Array.isArray(
      payload?.data
    )
  ) {
    return payload.data;
  }

  if (
    Array.isArray(
      payload?.data?.items
    )
  ) {
    return payload.data.items;
  }

  if (
    Array.isArray(
      payload?.data?.records
    )
  ) {
    return payload.data.records;
  }

  if (
    Array.isArray(
      payload?.data?.recommendations
    )
  ) {
    return payload.data.recommendations;
  }

  return null;
}

console.log("");
console.log("================================================");
console.log("ASHMAAN POST-PHASE-11 RUNTIME HARDENING D.2");
console.log("================================================");
console.log(`Checkpoint: ${CHECKPOINT}`);
console.log(`HTTP base: ${HTTP_BASE}`);
console.log("");

const activeDns =
  configureDns();

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
  if (
    mongoose.connection.readyState === 0
  ) {
    await mongoose.connect(
      mongoUri,
      {
        serverSelectionTimeoutMS:
          10000,
        connectTimeoutMS:
          10000,
      }
    );

    connectedHere =
      true;
  }

  assert(
    mongoose.connection.readyState === 1,
    "Mongoose connection is not OPEN"
  );

  pass(
    `MongoDB Atlas connection is open (${mongoose.connection.name})`
  );

  const listProbe =
    await getJson(
      `${HTTP_BASE}/api/optimization-dss/recommendations?page=1&limit=1`
    );

  if (
    listProbe.response.status !== 200
  ) {
    console.error(
      "INFO: list response body:",
      listProbe.text
    );
  }

  assert(
    listProbe.response.status === 200,
    `list endpoint returned HTTP ${listProbe.response.status}`
  );

  pass(
    "live Optimization/DSS list endpoint returns HTTP 200"
  );

  assert(
    listProbe.payload?.phase ===
      "11.12",
    "list envelope phase mismatch"
  );

  assert(
    listProbe.payload?.layer ===
      "OPTIMIZATION_DSS",
    "list envelope layer mismatch"
  );

  assert(
    listProbe.payload?.status ===
      "OK",
    "list envelope status mismatch"
  );

  pass(
    "live list endpoint preserves Phase 11.12 Optimization/DSS envelope"
  );

  const invalidPagination =
    await getJson(
      `${HTTP_BASE}/api/optimization-dss/recommendations?page=0&limit=25`
    );

  assert(
    [
      200,
      400,
    ].includes(
      invalidPagination.response.status
    ),
    `unexpected malformed-pagination HTTP ${invalidPagination.response.status}`
  );

  pass(
    "malformed pagination request is handled without server crash"
  );

  const repository =
    createMongooseOptimizationDssPersistenceRepository({
      model:
        OptimizationDssRecommendation,
    });

  const {
    persistenceKey,
    vrmSiteId,
    persistenceContract,
  } =
    buildContract();

  cleanupKey =
    persistenceKey;

  await OptimizationDssRecommendation
    .deleteMany({
      persistenceKey,
    });

  const beforeWrite =
    await repository
      .findByPersistenceKey({
        persistenceKey,
      });

  assert(
    beforeWrite === null,
    "isolated D.2 persistence key already exists"
  );

  pass(
    "isolated D.2 persistence key is absent before write"
  );

  const writeResult =
    await persistOptimizationDssRecommendation({
      persistenceContract,
      repository,
    });

  if (
    writeResult?.status !==
    OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS
      .PERSISTED
  ) {
    console.error(
      "INFO: persistence service result:",
      JSON.stringify(
        writeResult,
        null,
        2
      )
    );
  }

  assert(
    writeResult?.status ===
      OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS
        .PERSISTED,
    `runtime-smoke persistence returned ${writeResult?.status ?? "UNKNOWN"}`
  );

  assert(
    writeResult?.persisted === true,
    "runtime-smoke persisted flag is not true"
  );

  pass(
    "controlled recommendation persists through Phase 11.11"
  );

  const detailRead =
    await getJson(
      `${HTTP_BASE}/api/optimization-dss/recommendations/${encodeURIComponent(persistenceKey)}`
    );

  assert(
    detailRead.response.status === 200,
    `detail endpoint returned HTTP ${detailRead.response.status}`
  );

  pass(
    "controlled record is reachable through live detail GET"
  );

  const apiRecord =
    detailRead.payload?.data;

  assert(
    apiRecord?.persistenceKey ===
      persistenceKey,
    "detail API returned a different persistence key"
  );

  pass(
    "detail API returns exact controlled persistence key"
  );

  assert(
    apiRecord?.objectiveValue ===
      0,
    "objectiveValue zero was not preserved"
  );

  assert(
    apiRecord
      ?.recommendation
      ?.actions
      ?.[0]
      ?.value === 0,
    "advisory action value zero was not preserved"
  );

  pass(
    "detail API preserves explicit numeric zero"
  );

  assert(
    apiRecord?.advisoryOnly ===
      true,
    "advisoryOnly=true was not preserved"
  );

  assert(
    apiRecord?.executable ===
      false,
    "executable=false was not preserved"
  );

  assert(
    apiRecord?.autoDispatch ===
      false,
    "autoDispatch=false was not preserved"
  );

  pass(
    "detail API preserves advisory/non-executable/no-auto-dispatch boundary"
  );

  const filteredRead =
    await getJson(
      `${HTTP_BASE}/api/optimization-dss/recommendations?page=1&limit=25&vrmSiteId=${encodeURIComponent(vrmSiteId)}`
    );

  assert(
    filteredRead.response.status ===
      200,
    `filtered list endpoint returned HTTP ${filteredRead.response.status}`
  );

  const filteredRecords =
    extractList(
      filteredRead.payload
    );

  assert(
    Array.isArray(
      filteredRecords
    ),
    "filtered list payload does not expose a recommendation array"
  );

  assert(
    filteredRecords.some(
      (item) =>
        item?.persistenceKey ===
          persistenceKey
    ),
    "controlled record is absent from dashboard-style filtered list"
  );

  pass(
    "dashboard-style filtered list returns controlled record"
  );

  const mutationChecks =
    [
      [
        "POST",
        `${HTTP_BASE}/api/optimization-dss/recommendations`,
      ],
      [
        "PUT",
        `${HTTP_BASE}/api/optimization-dss/recommendations/${encodeURIComponent(persistenceKey)}`,
      ],
      [
        "PATCH",
        `${HTTP_BASE}/api/optimization-dss/recommendations/${encodeURIComponent(persistenceKey)}`,
      ],
      [
        "DELETE",
        `${HTTP_BASE}/api/optimization-dss/recommendations/${encodeURIComponent(persistenceKey)}`,
      ],
    ];

  for (
    const [
      method,
      url,
    ] of mutationChecks
  ) {
    const response =
      await fetch(
        url,
        {
          method,
        }
      );

    assert(
      [
        404,
        405,
      ].includes(
        response.status
      ),
      `${method} unexpectedly exposed mutation route with HTTP ${response.status}`
    );
  }

  pass(
    "live Optimization/DSS HTTP surface exposes no mutation route"
  );

  const deleted =
    await OptimizationDssRecommendation
      .deleteOne({
        persistenceKey,
      });

  assert(
    deleted.deletedCount === 1,
    "controlled runtime-smoke record cleanup failed"
  );

  cleanupKey =
    null;

  pass(
    "controlled runtime-smoke record is removed after validation"
  );

  console.log("");
  console.log(
    `Assertions passed: ${assertions}`
  );
  console.log("================================================");
  console.log("POST-PHASE-11 RUNTIME HARDENING D.2 PASSED");
  console.log("================================================");
  console.log("");
  console.log("Evidence boundary:");
  console.log("- live Atlas/API smoke path: PROVEN");
  console.log("- populated API record path: PROVEN");
  console.log("- browser visual populated-state rendering: D.4");
  console.log("- no Phase 12 introduced");
} catch (error) {
  console.error("");
  console.error("================================================");
  console.error("POST-PHASE-11 RUNTIME HARDENING D.2 FAILED");
  console.error("================================================");
  console.error(
    error?.stack ??
      error
  );

  process.exitCode =
    1;
} finally {
  if (
    cleanupKey
  ) {
    try {
      await OptimizationDssRecommendation
        .deleteMany({
          persistenceKey:
            cleanupKey,
        });

      console.log(
        "INFO: cleanup executed from finally block."
      );
    } catch (
      cleanupError
    ) {
      console.error(
        "WARN: cleanup failed:",
        cleanupError?.message ??
          cleanupError
      );
    }
  }

  if (
    connectedHere
  ) {
    try {
      await mongoose.disconnect();
    } catch (
      disconnectError
    ) {
      console.error(
        "WARN: mongoose disconnect failed:",
        disconnectError?.message ??
          disconnectError
      );
    }
  }
}
