// scripts/validateOptimizationDssMongoAtlasIntegration.js
//
// ASHMAAN Post-Phase-11 Runtime Integration Checkpoint B — DNS-safe revision
//
// This is NOT Phase 12.
// It separates DNS/SRV connectivity failures from persistence failures.
// Optional fallback: MONGODB_DIRECT_URI (standard mongodb://... Atlas connection string).

import assert from "node:assert/strict";
import crypto from "node:crypto";
import dns from "node:dns";
import dnsPromises from "node:dns/promises";
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
  "POST_PHASE_11_MONGODB_ATLAS_INTEGRATION_B_NODE_DNS";

const REVISION =
  "B-NODE-DNS-FORCED-1";

const EXPECTED_COLLECTION =
  "optimizationDssRecommendations";

let assertions = 0;
let cleanupKey = null;
let connectedHere = false;

const DEFAULT_NODE_DNS_SERVERS = Object.freeze([
  "1.1.1.1",
  "8.8.8.8",
]);

function configureNodeDnsServers() {
  const configured =
    process.env.ASHMAAN_DNS_SERVERS
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);

  const servers =
    configured?.length
      ? configured
      : [...DEFAULT_NODE_DNS_SERVERS];

  dns.setServers(servers);

  return dns.getServers();
}

function pass(message) {
  assertions += 1;
  console.log(`PASS ${assertions}: ${message}`);
}

function maskMongoUri(uri) {
  return uri.replace(
    /(mongodb(?:\+srv)?:\/\/)([^@/]+)@/i,
    "$1***:***@"
  );
}

function requireMongoUri() {
  const srvUri = process.env.MONGODB_URI?.trim() || "";
  const directUri = process.env.MONGODB_DIRECT_URI?.trim() || "";

  assert.ok(
    srvUri || directUri,
    [
      "Neither MONGODB_URI nor MONGODB_DIRECT_URI is defined.",
      "MONGODB_URI should normally be the existing mongodb+srv:// Atlas URI.",
      "MONGODB_DIRECT_URI is an optional standard mongodb:// fallback.",
    ].join("\n")
  );

  return { srvUri, directUri };
}

function extractSrvHostname(uri) {
  if (!uri?.toLowerCase().startsWith("mongodb+srv://")) {
    return null;
  }

  try {
    const withoutScheme = uri.slice("mongodb+srv://".length);
    const hostPart = withoutScheme.split("/")[0];
    const atIndex = hostPart.lastIndexOf("@");
    return (atIndex >= 0 ? hostPart.slice(atIndex + 1) : hostPart)
      .split("?")[0]
      .trim();
  } catch {
    return null;
  }
}

async function diagnoseSrv(uri) {
  const host = extractSrvHostname(uri);

  if (!host) {
    return {
      required: false,
      ok: true,
      host: null,
      records: [],
      error: null,
    };
  }

  const query = `_mongodb._tcp.${host}`;

  try {
    const records = await dnsPromises.resolveSrv(query);

    return {
      required: true,
      ok: true,
      host,
      query,
      records,
      error: null,
    };
  } catch (error) {
    return {
      required: true,
      ok: false,
      host,
      query,
      records: [],
      error,
    };
  }
}

function dnsFailureMessage(diagnostic) {
  const error = diagnostic.error;

  return [
    "",
    "MongoDB Atlas SRV DNS lookup failed BEFORE a database connection was attempted.",
    "",
    `SRV query : ${diagnostic.query}`,
    `DNS code  : ${error?.code ?? "UNKNOWN"}`,
    `Syscall   : ${error?.syscall ?? "UNKNOWN"}`,
    "",
    "Node was already forced to use explicit public DNS servers for this run.",
    `"Node DNS servers: ${dns.getServers().join(", ")}`,
    "",
    "If this still fails, a local firewall/security product is likely blocking Node.exe DNS traffic.",
    "This is not an Optimization/DSS persistence failure.",
    "",
    "Run these Windows checks:",
    "",
    `  nslookup -type=SRV ${diagnostic.query}`,
    `  nslookup -type=SRV ${diagnostic.query} 8.8.8.8`,
    `  nslookup -type=SRV ${diagnostic.query} 1.1.1.1`,
    "",
    "If the first command fails but 8.8.8.8 or 1.1.1.1 succeeds:",
    "  - change the active Windows adapter DNS to 8.8.8.8 / 1.1.1.1",
    "  - then run: ipconfig /flushdns",
    "  - rerun this validator",
    "",
    "If all SRV lookups fail:",
    "  - check VPN/proxy/firewall/ISP DNS filtering",
    "  - or obtain Atlas's standard mongodb:// connection string and set it as:",
    '    $env:MONGODB_DIRECT_URI="mongodb://..."',
    "",
    "No Atlas write was attempted and no Phase 11 evidence is invalidated.",
  ].join("\n");
}

function buildTestPersistenceContract() {
  const now = new Date();
  const start = now.toISOString();
  const end = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const nonce = crypto.randomUUID();

  const persistenceKey = crypto
    .createHash("sha256")
    .update(`${CHECKPOINT}:${nonce}`)
    .digest("hex");

  const recommendation = Object.freeze({
    recommendationKind: "DISPATCH_SETPOINT",
    advisoryOnly: true,
    executable: false,
    autoDispatch: false,
    actions: Object.freeze([
      Object.freeze({
        actionId: `atlas-runtime-check-${nonce}`,
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

  const generationResult = Object.freeze({
    phase: "11.9",
    layer: "OPTIMIZATION_DSS",
    status: "GENERATED",
    reason: "GENERATED",
    recommendation,
    actionResults: Object.freeze([
      Object.freeze({
        actionId: `atlas-runtime-check-${nonce}`,
        status: "GENERATED",
        value: 0,
        unit: "kW",
      }),
    ]),
    generatedActionCount: 1,
    unavailableActionCount: 0,
    qualifiedResult: Object.freeze({
      objectiveValue: 0,
    }),
    recommendationContract: Object.freeze({
      scope: "SITE",
      scopeIdentity: Object.freeze({
        vrmSiteId: `RUNTIME-VERIFICATION-${nonce}`,
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
        `runtime-verification:${nonce}`,
      ]),
    }),
    executionResult: null,
    builtModel: null,
  });

  const record = Object.freeze({
    persistenceKey,
    recordType: "OPTIMIZATION_DSS_RECOMMENDATION",
    phase: "11.10",
    layer: "OPTIMIZATION_DSS",
    scope: "SITE",
    scopeIdentity: generationResult.recommendationContract.scopeIdentity,
    horizon: generationResult.recommendationContract.horizon,
    recommendationKind: "DISPATCH_SETPOINT",
    applicability: "APPLICABLE",
    confidence: "HIGH",
    generationStatus: "GENERATED",
    generationReason: "GENERATED",
    recommendation,
    actionResults: generationResult.actionResults,
    generatedActionCount: 1,
    unavailableActionCount: 0,
    objectiveValue: 0,
    evidenceRefs: generationResult.recommendationContract.evidenceRefs,
    advisoryOnly: true,
    executable: false,
    autoDispatch: false,
  });

  return Object.freeze({
    phase: "11.10",
    layer: "OPTIMIZATION_DSS",
    upstreamPhase: "11.9",
    generationResult,
    recommendationContract: generationResult.recommendationContract,
    qualifiedResult: generationResult.qualifiedResult,
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
  });
}

function plainId(record) {
  return String(record?._id ?? "");
}

console.log("");
console.log("================================================");
console.log("ASHMAAN POST-PHASE-11 MONGODB ATLAS VALIDATION");
console.log("================================================");
console.log(`Checkpoint: ${CHECKPOINT}`);
console.log(`Revision: ${REVISION}`);
console.log("");

const activeDnsServers = configureNodeDnsServers();

assert.ok(
  activeDnsServers.length > 0,
  "Node DNS server configuration is empty"
);

pass(
  `Node DNS resolver is explicitly configured (${activeDnsServers.join(", ")})`
);

const { srvUri, directUri } = requireMongoUri();
pass("MongoDB connection URI is available from environment/.env");

let connectionUri = directUri || srvUri;

if (directUri) {
  console.log(`INFO: Using MONGODB_DIRECT_URI: ${maskMongoUri(directUri)}`);
  pass("standard mongodb:// direct URI fallback is selected");
} else {
  const diagnostic = await diagnoseSrv(srvUri);

  if (diagnostic.required && diagnostic.ok) {
    console.log(`INFO: SRV DNS query resolved: ${diagnostic.query}`);
    console.log(`INFO: SRV records discovered: ${diagnostic.records.length}`);
    pass("MongoDB Atlas SRV DNS lookup succeeds");
  } else if (diagnostic.required && !diagnostic.ok) {
    console.error(dnsFailureMessage(diagnostic));
    process.exitCode = 2;
    // Do not throw a raw Node DNS stack trace.
    process.exit();
  } else {
    pass("MongoDB URI does not require SRV DNS resolution");
  }
}

try {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    connectedHere = true;
  }

  assert.equal(
    mongoose.connection.readyState,
    1,
    "Mongoose connection is not OPEN"
  );
  pass("Mongoose connects to MongoDB Atlas successfully");

  assert.ok(
    mongoose.connection.db,
    "MongoDB database handle is unavailable"
  );
  pass(`MongoDB database is available (${mongoose.connection.name})`);

  assert.equal(
    OptimizationDssRecommendation.collection.collectionName,
    EXPECTED_COLLECTION
  );
  pass(`Optimization/DSS model targets ${EXPECTED_COLLECTION}`);

  const repository =
    createMongooseOptimizationDssPersistenceRepository({
      model: OptimizationDssRecommendation,
    });

  assert.equal(typeof repository.upsertByPersistenceKey, "function");
  assert.equal(typeof repository.findByPersistenceKey, "function");
  pass("real Phase 11.11 Mongoose persistence repository is active");

  const persistenceContract = buildTestPersistenceContract();
  cleanupKey =
    persistenceContract.persistenceIdentity.persistenceKey;

  assert.match(cleanupKey, /^[a-f0-9]{64}$/);
  pass("isolated runtime-verification persistence key is valid");

  const before = await repository.findByPersistenceKey({
    persistenceKey: cleanupKey,
  });

  assert.equal(
    before,
    null,
    "runtime-verification key unexpectedly already exists"
  );
  pass("runtime-verification key is absent before write");

  const firstWrite =
    await persistOptimizationDssRecommendation({
      persistenceContract,
      repository,
    });

  assert.equal(
    firstWrite.status,
    OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS.PERSISTED
  );
  assert.equal(firstWrite.persisted, true);
  pass("Phase 11.11 persistence service reports PERSISTED after live Atlas upsert");

  assert.equal(
    firstWrite.persistenceResult.persistenceKey,
    cleanupKey
  );
  pass("live persisted result preserves deterministic persistence key");

  const firstRead = await repository.findByPersistenceKey({
    persistenceKey: cleanupKey,
  });

  assert.ok(
    firstRead,
    "record could not be read back from MongoDB Atlas"
  );
  pass("live record is read back from MongoDB Atlas");

  assert.equal(firstRead.persistenceKey, cleanupKey);
  assert.equal(firstRead.phase, "11.10");
  assert.equal(firstRead.layer, "OPTIMIZATION_DSS");
  pass("read-back record preserves Phase 11.10 / Optimization-DSS identity");

  assert.equal(firstRead.objectiveValue, 0);
  assert.equal(
    firstRead.recommendation?.actions?.[0]?.value,
    0
  );
  pass("live Atlas round trip preserves explicit numeric zero");

  assert.equal(firstRead.advisoryOnly, true);
  assert.equal(firstRead.executable, false);
  assert.equal(firstRead.autoDispatch, false);
  pass("live Atlas record preserves advisory-only/no-auto-dispatch boundary");

  assert.equal(firstRead.generatedActionCount, 1);
  assert.equal(firstRead.unavailableActionCount, 0);
  pass("live Atlas record preserves generated/unavailable action counts");

  const firstDocumentId = plainId(firstRead);
  assert.ok(firstDocumentId);
  pass("live inserted record has a MongoDB document identifier");

  const secondWrite =
    await persistOptimizationDssRecommendation({
      persistenceContract,
      repository,
    });

  assert.equal(
    secondWrite.status,
    OPTIMIZATION_DSS_PERSISTENCE_RECORD_STATUS.PERSISTED
  );
  assert.equal(secondWrite.persisted, true);
  pass("repeated live upsert with same persistence key also reports PERSISTED");

  const secondRead = await repository.findByPersistenceKey({
    persistenceKey: cleanupKey,
  });

  assert.ok(secondRead);
  assert.equal(plainId(secondRead), firstDocumentId);
  pass("repeated live upsert is idempotent at MongoDB document identity level");

  const duplicateCount =
    await OptimizationDssRecommendation.countDocuments({
      persistenceKey: cleanupKey,
    });

  assert.equal(duplicateCount, 1);
  pass("unique persistence key produces exactly one Atlas record after repeated upsert");

  const cleanupResult =
    await OptimizationDssRecommendation.deleteOne({
      persistenceKey: cleanupKey,
    });

  assert.equal(cleanupResult.deletedCount, 1);
  cleanupKey = null;
  pass("isolated runtime-verification record is removed after validation");

  const summary = {
    checkpoint: CHECKPOINT,
    revision: REVISION,
    mongoConnected: true,
    liveWrite: true,
    liveRead: true,
    repeatedUpsertIdempotent: true,
    zeroPreserved: true,
    advisoryOnly: true,
    executable: false,
    autoDispatch: false,
    cleanupCompleted: true,
  };

  assert.doesNotThrow(() => JSON.stringify(summary));
  pass("Atlas runtime evidence summary is JSON serializable");

  console.log("");
  console.log(`Assertions passed: ${assertions}`);
  console.log("");
  console.log("================================================");
  console.log("POST-PHASE-11 MONGODB ATLAS VALIDATION PASSED");
  console.log("================================================");
  console.log("");
  console.log("Evidence boundary:");
  console.log("- live MongoDB Atlas connection: PROVEN");
  console.log("- live Optimization/DSS write: PROVEN");
  console.log("- live Optimization/DSS read-back: PROVEN");
  console.log("- deterministic-key repeated upsert/idempotency: PROVEN");
  console.log("- explicit zero preservation: PROVEN");
  console.log("- advisory-only/no-auto-dispatch persistence: PROVEN");
  console.log("- isolated test-record cleanup: PROVEN");
  console.log("- no Phase 12 introduced");
} catch (error) {
  if (
    ["ECONNREFUSED", "ENOTFOUND", "ETIMEOUT", "ESERVFAIL"]
      .includes(error?.code) ||
    String(error?.message ?? "").includes("querySrv")
  ) {
    console.error("");
    console.error("NETWORK/DNS FAILURE:");
    console.error(error?.message ?? String(error));
    console.error("");
    console.error(
      "MongoDB Atlas persistence has NOT been disproven; the connection could not be established."
    );
    console.error(
      "Resolve DNS/network reachability or use MONGODB_DIRECT_URI, then rerun."
    );
    process.exitCode = 2;
  } else {
    throw error;
  }
} finally {
  if (cleanupKey) {
    try {
      await OptimizationDssRecommendation.deleteOne({
        persistenceKey: cleanupKey,
      });

      console.log("INFO: cleanup executed from finally block.");
    } catch (cleanupError) {
      console.error(
        "WARNING: automatic cleanup failed:",
        cleanupError instanceof Error
          ? cleanupError.message
          : String(cleanupError)
      );

      console.error(
        `WARNING: manually delete persistenceKey ${cleanupKey} from collection ${EXPECTED_COLLECTION}.`
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
