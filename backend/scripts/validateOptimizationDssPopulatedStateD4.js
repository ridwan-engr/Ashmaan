// ASHMAAN Post-Phase-11 Runtime Hardening D.4
// Controlled populated-state runtime validator.
// Persists one isolated recommendation and intentionally leaves it in Atlas
// for browser verification. Run with --cleanup <persistenceKey> after proof.
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
  "POST_PHASE_11_RUNTIME_HARDENING_D4_POPULATED_STATE";

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
    // Raw text retained for diagnostics.
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

function buildContract() {
  const nonce =
    crypto.randomUUID();

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
    `d4-${nonce}`;

  const vrmSiteId =
    `D4-POPULATED-${nonce}`;

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
          `post-phase-11-runtime-hardening-d4:${nonce}`,
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
    start,
    end,
    persistenceContract,
  });
}

async function connect() {
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
}

async function cleanupByKey(persistenceKey) {
  assert(
    /^[a-f0-9]{64}$/i.test(
      persistenceKey ?? ""
    ),
    "cleanup persistenceKey must be a 64-character hexadecimal SHA-256 key"
  );

  const before =
    await OptimizationDssRecommendation
      .countDocuments({
        persistenceKey,
      });

  assert(
    before <= 1,
    `cleanup key unexpectedly matches ${before} records`
  );

  const result =
    await OptimizationDssRecommendation
      .deleteMany({
        persistenceKey,
      });

  assert(
    result.deletedCount === before,
    "cleanup deletedCount does not match pre-cleanup count"
  );

  const after =
    await OptimizationDssRecommendation
      .countDocuments({
        persistenceKey,
      });

  assert(
    after === 0,
    "controlled D.4 record still exists after cleanup"
  );

  pass(
    `controlled D.4 record cleanup complete (deleted ${result.deletedCount})`
  );
}

console.log("");
console.log("================================================");
console.log("ASHMAAN POST-PHASE-11 RUNTIME HARDENING D.4");
console.log("================================================");
console.log(`Checkpoint: ${CHECKPOINT}`);
console.log(`HTTP base: ${HTTP_BASE}`);
console.log("");

try {
  await connect();

  const cleanupFlagIndex =
    process.argv.indexOf("--cleanup");

  if (
    cleanupFlagIndex !== -1
  ) {
    const cleanupKey =
      process.argv[
        cleanupFlagIndex + 1
      ];

    assert(
      cleanupKey,
      "usage: node scripts\\validateOptimizationDssPopulatedStateD4.js --cleanup <persistenceKey>"
    );

    await cleanupByKey(
      cleanupKey
    );

    console.log("");
    console.log(
      `Assertions passed: ${assertions}`
    );
    console.log("================================================");
    console.log(
      "POST-PHASE-11 RUNTIME HARDENING D.4 CLEANUP PASSED"
    );
    console.log("================================================");
  } else {
    const {
      persistenceKey,
      vrmSiteId,
      start,
      end,
      persistenceContract,
    } =
      buildContract();

    const before =
      await OptimizationDssRecommendation
        .countDocuments({
          persistenceKey,
        });

    assert(
      before === 0,
      "controlled D.4 persistence key already exists before write"
    );

    pass(
      "controlled D.4 persistence key is absent before write"
    );

    const repository =
      createMongooseOptimizationDssPersistenceRepository({
        model:
          OptimizationDssRecommendation,
      });

    const persistenceResult =
      await persistOptimizationDssRecommendation({
        persistenceContract,
        repository,
      });

    assert(
      persistenceResult?.status ===
        "PERSISTED",
      `Phase 11.11 persistence returned ${persistenceResult?.status ?? "UNKNOWN"}`
    );

    assert(
      persistenceResult?.persisted ===
        true,
      "Phase 11.11 did not report persisted=true"
    );

    pass(
      "controlled populated-state recommendation persists through real Phase 11.11"
    );

    const atlasRecord =
      await OptimizationDssRecommendation
        .findOne({
          persistenceKey,
        })
        .lean();

    assert(
      atlasRecord,
      "controlled D.4 record is missing from Atlas after persistence"
    );

    pass(
      "controlled populated-state record is present in MongoDB Atlas"
    );

    assert(
      atlasRecord.scopeIdentity?.vrmSiteId ===
        vrmSiteId,
      "Atlas record vrmSiteId mismatch"
    );

    assert(
      atlasRecord.objectiveValue ===
        0,
      "Atlas record did not preserve objectiveValue=0"
    );

    assert(
      atlasRecord.recommendation?.actions?.[0]?.value ===
        0,
      "Atlas record did not preserve recommendation action value=0"
    );

    pass(
      "Atlas record preserves exact site identity and explicit numeric zero"
    );

    assert(
      atlasRecord.advisoryOnly ===
        true &&
      atlasRecord.executable ===
        false &&
      atlasRecord.autoDispatch ===
        false,
      "Atlas record safety boundary mismatch"
    );

    pass(
      "Atlas record preserves advisory/non-executable/no-auto-dispatch boundary"
    );

    const detailRead =
      await getJson(
        `${HTTP_BASE}/api/optimization-dss/recommendations/${persistenceKey}`
      );

    if (
      detailRead.response.status !==
      200
    ) {
      console.error(
        "INFO: detail response body:",
        detailRead.text
      );
    }

    assert(
      detailRead.response.status ===
        200,
      `detail endpoint returned HTTP ${detailRead.response.status}`
    );

    pass(
      "controlled populated-state record is reachable through live detail GET"
    );

    const apiRecord =
      detailRead.payload?.data;

    assert(
      detailRead.payload?.phase ===
        "11.12" &&
      detailRead.payload?.layer ===
        "OPTIMIZATION_DSS" &&
      detailRead.payload?.status ===
        "OK",
      "detail API envelope mismatch"
    );

    pass(
      "detail GET preserves Phase 11.12 Optimization/DSS envelope"
    );

    assert(
      apiRecord?.persistenceKey ===
        persistenceKey,
      "detail API returned wrong persistence key"
    );

    assert(
      apiRecord?.scopeIdentity?.vrmSiteId ===
        vrmSiteId,
      "detail API returned wrong vrmSiteId"
    );

    pass(
      "detail API returns exact controlled record identity"
    );

    assert(
      apiRecord?.objectiveValue ===
        0,
      "detail API lost objectiveValue=0"
    );

    assert(
      apiRecord?.recommendation?.actions?.[0]?.value ===
        0,
      "detail API lost recommendation action value=0"
    );

    pass(
      "detail API preserves explicit numeric zero"
    );

    assert(
      apiRecord?.advisoryOnly ===
        true &&
      apiRecord?.executable ===
        false &&
      apiRecord?.autoDispatch ===
        false,
      "detail API lost advisory safety boundary"
    );

    pass(
      "detail API preserves advisory/non-executable/no-auto-dispatch boundary"
    );

    const filteredRead =
      await getJson(
        `${HTTP_BASE}/api/optimization-dss/recommendations` +
        `?page=1&limit=25` +
        `&vrmSiteId=${encodeURIComponent(vrmSiteId)}`
      );

    assert(
      filteredRead.response.status ===
        200,
      `filtered list returned HTTP ${filteredRead.response.status}`
    );

    const filteredRecords =
      extractList(
        filteredRead.payload
      );

    assert(
      Array.isArray(
        filteredRecords
      ),
      "filtered API response does not expose a record list"
    );

    const exactMatches =
      filteredRecords.filter(
        (record) =>
          record?.persistenceKey ===
          persistenceKey
      );

    assert(
      exactMatches.length ===
        1,
      `expected exactly one controlled record in filtered list, received ${exactMatches.length}`
    );

    pass(
      "dashboard-style vrmSiteId filter returns exactly the controlled recommendation"
    );

    assert(
      filteredRead.payload?.meta?.total ===
        1,
      `filtered meta.total must be 1, received ${filteredRead.payload?.meta?.total}`
    );

    assert(
      filteredRead.payload?.meta?.filters?.vrmSiteId ===
        vrmSiteId,
      "filtered response did not preserve vrmSiteId"
    );

    pass(
      "filtered populated-state API preserves total=1 and exact site filter"
    );

    assert(
      start < end,
      "controlled recommendation horizon is invalid"
    );

    pass(
      "controlled recommendation preserves non-empty [start,end) horizon"
    );

    const finalCount =
      await OptimizationDssRecommendation
        .countDocuments({
          persistenceKey,
        });

    assert(
      finalCount === 1,
      `controlled D.4 record must remain in Atlas for browser proof; found ${finalCount}`
    );

    pass(
      "controlled D.4 record remains intentionally available for browser verification"
    );

    console.log("");
    console.log(
      `Assertions passed: ${assertions}`
    );
    console.log("================================================");
    console.log(
      "POST-PHASE-11 RUNTIME HARDENING D.4 POPULATED-STATE API PASSED"
    );
    console.log("================================================");
    console.log("");

    console.log(
      "IMPORTANT: This isolated D.4 record has NOT been deleted."
    );
    console.log(
      "Use it now for browser verification."
    );
    console.log("");

    console.log(
      "Browser verification input:"
    );
    console.log(
      `vrmSiteId=${vrmSiteId}`
    );
    console.log(
      `persistenceKey=${persistenceKey}`
    );
    console.log("");

    console.log(
      "Expected browser state:"
    );
    console.log(
      "- TOTAL = 1"
    );
    console.log(
      "- GENERATED = 1"
    );
    console.log(
      "- PARTIAL = 0"
    );
    console.log(
      "- UNAVAILABLE = 0"
    );
    console.log(
      "- one DISPATCH_SETPOINT recommendation is visible"
    );
    console.log(
      "- GRID_POWER action value is shown as 0 kW, not missing/UNAVAILABLE"
    );
    console.log(
      "- applicability = APPLICABLE"
    );
    console.log(
      "- confidence = HIGH"
    );
    console.log(
      "- ADVISORY ONLY / NON-EXECUTABLE / NO AUTO-DISPATCH remain visible"
    );
    console.log(
      "- no red API error"
    );
    console.log("");

    console.log(
      "AFTER browser proof, clean up with:"
    );
    console.log(
      `node .\\scripts\\validateOptimizationDssPopulatedStateD4.js --cleanup ${persistenceKey}`
    );
  }
} catch (error) {
  console.error("");
  console.error("================================================");
  console.error(
    "POST-PHASE-11 RUNTIME HARDENING D.4 FAILED"
  );
  console.error("================================================");
  console.error(
    error?.stack ?? error
  );

  process.exitCode =
    1;
} finally {
  if (
    connectedHere
  ) {
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