// ASHMAAN Post-Phase-11 End-to-End Integration Checkpoint C
// Proves Atlas -> Optimization/DSS GET API using one isolated advisory record.
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
  "POST_PHASE_11_E2E_INTEGRATION_C_ATLAS_API_PATCH_2";

const API_BASE =
  (process.env.ASHMAAN_API_BASE_URL || "http://localhost:5000")
    .replace(/\/+$/, "");

const LOGIN_URL = `${API_BASE}/api/v1/auth/login`;

function getLoginCredentials() {
  const email = process.env.ASHMAAN_E2E_LOGIN_EMAIL?.trim();
  const password = process.env.ASHMAAN_E2E_LOGIN_PASSWORD;

  assert(email, "ASHMAAN_E2E_LOGIN_EMAIL is missing");
  assert(password, "ASHMAAN_E2E_LOGIN_PASSWORD is missing");

  return { email, password };
}

async function getPortalAccessToken() {
  const credentials = getLoginCredentials();

  const response = await fetch(LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const payload = await response.json().catch(() => null);

  assert(
    response.ok,
    `Portal login failed with HTTP ${response.status}: ${typeof payload?.message === "string"
      ? payload.message
      : "No safe error message returned"
    }`
  );

  const accessToken =
    payload?.accessToken ??
    payload?.data?.accessToken ??
    payload?.result?.accessToken;

  assert(
    typeof accessToken === "string" && accessToken.length > 0,
    "Portal login succeeded but returned no access token in the expected response fields"
  );

  return accessToken;
}

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
    (process.env.ASHMAAN_DNS_SERVERS || "1.1.1.1,8.8.8.8")
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);

  dns.setServers(servers);
  return dns.getServers();
}

function buildContract() {
  const nonce = crypto.randomUUID();
  const start = new Date().toISOString();
  const end = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const persistenceKey =
    crypto
      .createHash("sha256")
      .update(`${CHECKPOINT}:${nonce}`)
      .digest("hex");

  const actionId = `e2e-${nonce}`;

  const recommendation = Object.freeze({
    recommendationKind: "DISPATCH_SETPOINT",
    advisoryOnly: true,
    executable: false,
    autoDispatch: false,
    actions: Object.freeze([
      Object.freeze({
        actionId,
        recommendationKind: "DISPATCH_SETPOINT",
        target: "GRID_POWER",
        timestamp: start,
        value: 0,
        unit: "kW",
        advisoryOnly: true,
        executable: false,
        autoDispatch: false,
      }),
    ]),
  });

  const recommendationContract = Object.freeze({
    scope: "SITE",
    scopeIdentity: Object.freeze({
      vrmSiteId: `E2E-RUNTIME-${nonce}`,
    }),
    horizon: Object.freeze({
      start,
      end,
      interval: "[start,end)",
    }),
    recommendationKind: "DISPATCH_SETPOINT",
    applicability: "APPLICABLE",
    confidence: "HIGH",
    evidenceRefs: Object.freeze([
      `post-phase-11-e2e:${nonce}`,
    ]),
  });

  const qualifiedResult = Object.freeze({
    objectiveValue: 0,
  });

  const actionResults = Object.freeze([
    Object.freeze({
      actionId,
      status: "GENERATED",
      value: 0,
      unit: "kW",
    }),
  ]);

  const generationResult = Object.freeze({
    phase: "11.9",
    layer: "OPTIMIZATION_DSS",
    status: "GENERATED",
    reason: "GENERATED",
    recommendation,
    actionResults,
    generatedActionCount: 1,
    unavailableActionCount: 0,
    qualifiedResult,
    recommendationContract,
    executionResult: null,
    builtModel: null,
  });

  const record = Object.freeze({
    persistenceKey,
    recordType: "OPTIMIZATION_DSS_RECOMMENDATION",
    phase: "11.10",
    layer: "OPTIMIZATION_DSS",
    scope: "SITE",
    scopeIdentity: recommendationContract.scopeIdentity,
    horizon: recommendationContract.horizon,
    recommendationKind: "DISPATCH_SETPOINT",
    applicability: "APPLICABLE",
    confidence: "HIGH",
    generationStatus: "GENERATED",
    generationReason: "GENERATED",
    recommendation,
    actionResults,
    generatedActionCount: 1,
    unavailableActionCount: 0,
    objectiveValue: 0,
    evidenceRefs: recommendationContract.evidenceRefs,
    advisoryOnly: true,
    executable: false,
    autoDispatch: false,
  });

  return Object.freeze({
    persistenceKey,
    contract: Object.freeze({
      phase: "11.10",
      layer: "OPTIMIZATION_DSS",
      upstreamPhase: "11.9",
      generationResult,
      recommendationContract,
      qualifiedResult,
      executionResult: null,
      builtModel: null,
      persistenceIdentity: Object.freeze({
        recordType: "OPTIMIZATION_DSS_RECOMMENDATION",
        persistenceKey,
        deterministic: true,
      }),
      writeMode:
        OPTIMIZATION_DSS_PERSISTENCE_WRITE_MODE.UPSERT_BY_PERSISTENCE_KEY,
      record,
      status:
        OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS.CONTRACT_DEFINED,
      persisted: false,
      persistenceResult: null,
      boundaries: Object.freeze({
        automaticDispatchAllowed: false,
        executableActionProduced: false,
        missingMeansZero: false,
        unavailableMeansZero: false,
      }),
    }),
  });
}

console.log("");
console.log("================================================");
console.log("ASHMAAN POST-PHASE-11 ATLAS -> API E2E VALIDATION");
console.log("================================================");
console.log(`Checkpoint: ${CHECKPOINT}`);
console.log(`HTTP base: ${API_BASE}`);
console.log("");

const activeDns = configureDns();
assert(activeDns.length > 0, "Node DNS resolver list is empty");
pass(`Node DNS resolver configured (${activeDns.join(", ")})`);

const mongoUri = process.env.MONGODB_URI?.trim();
assert(mongoUri, "MONGODB_URI is missing");
pass("MongoDB URI is available");

try {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    connectedHere = true;
  }

  assert(
    mongoose.connection.readyState === 1,
    "Mongoose connection is not OPEN"
  );
  pass(`MongoDB Atlas connection is open (${mongoose.connection.name})`);

  const accessToken = await getPortalAccessToken();
  pass("Portal login returned an access token");

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
  const repository =
    createMongooseOptimizationDssPersistenceRepository({
      model: OptimizationDssRecommendation,
    });

  const { persistenceKey, contract } = buildContract();
  cleanupKey = persistenceKey;

  const before =
    await repository.findByPersistenceKey({ persistenceKey });

  assert(before === null, "isolated E2E key already exists");
  pass("isolated E2E key is absent before write");

  const persisted =
    await persistOptimizationDssRecommendation({
      persistenceContract: contract,
      repository,
    });

  assert(
    persisted.status ===
    OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS.PERSISTED,
    `persistence service returned ${persisted.status}`
  );
  assert(persisted.persisted === true, "persisted flag is not true");
  pass("isolated recommendation is written through Phase 11.11 service");

  const detailUrl =
    `${API_BASE}/api/optimization-dss/recommendations/${encodeURIComponent(persistenceKey)}`;

  const detailResponse = await fetch(detailUrl, {
    headers: authHeaders,
  });
  assert(
    detailResponse.status === 200,
    `detail API returned HTTP ${detailResponse.status}`
  );
  pass("live Optimization/DSS detail endpoint returns HTTP 200");

  const payload = await detailResponse.json();

  assert(payload?.phase === "11.12", "API phase is not 11.12");
  assert(payload?.layer === "OPTIMIZATION_DSS", "API layer mismatch");
  assert(payload?.status === "OK", `API status is ${payload?.status}`);
  pass("live API preserves Phase 11.12 Optimization/DSS envelope");

  // Phase 11.13 getRecommendation() places the persisted document
  // directly in envelope.data. Do not descend into data.recommendation,
  // because that nested object intentionally does not carry persistenceKey.
  const record = payload?.data;

  assert(record, "API returned no recommendation record");
  assert(
    record.persistenceKey === persistenceKey,
    "API returned a different persistence key"
  );
  pass("API returns the exact Atlas-persisted recommendation");

  assert(record.objectiveValue === 0, "objectiveValue zero was not preserved");
  assert(
    record?.recommendation?.actions?.[0]?.value === 0,
    "advisory setpoint zero was not preserved"
  );
  pass("Atlas -> API round trip preserves explicit numeric zero");

  assert(record.advisoryOnly === true, "advisoryOnly boundary lost");
  assert(record.executable === false, "executable boundary lost");
  assert(record.autoDispatch === false, "autoDispatch boundary lost");
  pass("Atlas -> API round trip preserves advisory/no-auto-dispatch boundary");

  const listUrl =
    `${API_BASE}/api/optimization-dss/recommendations?page=1&limit=100`;

  const listResponse = await fetch(listUrl, {
    headers: authHeaders,
  });
  assert(listResponse.status === 200, `list API returned HTTP ${listResponse.status}`);

  const listPayload = await listResponse.json();
  assert(listPayload?.status === "OK", "list API status is not OK");

  const listData =
    Array.isArray(listPayload?.data)
      ? listPayload.data
      : Array.isArray(listPayload?.data?.items)
        ? listPayload.data.items
        : [];

  assert(
    listData.some(item => item?.persistenceKey === persistenceKey),
    "isolated recommendation is not visible through list endpoint"
  );
  pass("Atlas record is visible through live list endpoint used by dashboard");

  const cleanup =
    await OptimizationDssRecommendation.deleteOne({
      persistenceKey,
    });

  assert(cleanup.deletedCount === 1, "cleanup did not delete exactly one record");
  cleanupKey = null;
  pass("isolated E2E record is removed after validation");

  console.log("");
  console.log(`Assertions passed: ${assertions}`);
  console.log("");
  console.log("================================================");
  console.log("POST-PHASE-11 ATLAS -> API E2E VALIDATION PASSED");
  console.log("================================================");
  console.log("");
  console.log("Evidence boundary:");
  console.log("- MongoDB Atlas -> Phase 11.11 persistence: PROVEN");
  console.log("- Atlas persisted record -> Phase 11.12 detail GET: PROVEN");
  console.log("- Atlas persisted record -> Phase 11.12 list GET: PROVEN");
  console.log("- explicit zero preservation: PROVEN");
  console.log("- advisory-only/no-auto-dispatch: PROVEN");
  console.log("- isolated test cleanup: PROVEN");
  console.log("- frontend browser rendering: separate frontend integration evidence");
  console.log("- no Phase 12 introduced");
} finally {
  if (cleanupKey) {
    try {
      await OptimizationDssRecommendation.deleteOne({
        persistenceKey: cleanupKey,
      });
      console.log("INFO: cleanup executed from finally block.");
    } catch (error) {
      console.error(
        `WARNING: cleanup failed for persistenceKey ${cleanupKey}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (
    connectedHere &&
    mongoose.connection.readyState !== 0
  ) {
    await mongoose.disconnect();
  }
}
