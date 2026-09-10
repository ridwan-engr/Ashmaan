import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  createEndToEndIntegrationContract,
} from "../services/integration/endToEndIntegrationContract.js";

import {
  VRM_TELEMETRY_DATABASE_INTEGRATION_PHASE,
  VRM_TELEMETRY_DATABASE_INTEGRATION_LAYER,
  VRM_TELEMETRY_DATABASE_INTEGRATION_DEFAULTS,
  VRM_TELEMETRY_DATABASE_PERSISTENCE_IDENTITY,
  VRM_TELEMETRY_DATABASE_BOUNDARIES,
  qualifyVrmTelemetryDatabaseIntegration,
  executeVrmTelemetryDatabaseIntegration,
} from "../services/integration/vrmTelemetryDatabaseIntegrationService.js";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const root =
  path.resolve(__dirname, "..");

let checks = 0;

function pass(message) {
  checks += 1;
  console.log(
    `PASS ${checks}: ${message}`
  );
}

function expectThrow(
  fn,
  pattern,
  message
) {
  assert.throws(fn, pattern);
  pass(message);
}

console.log("");
console.log(
  "================================================"
);
console.log(
  "ASHMAAN PHASE 12.2 VRM → SYNC → DATABASE INTEGRATION"
);
console.log(
  "================================================"
);
console.log("");

assert.equal(
  VRM_TELEMETRY_DATABASE_INTEGRATION_PHASE,
  "12.2"
);

pass(
  "integration phase is 12.2"
);

assert.equal(
  VRM_TELEMETRY_DATABASE_INTEGRATION_LAYER,
  "VRM_TELEMETRY_DATABASE_INTEGRATION"
);

pass(
  "integration layer is explicit"
);

assert.deepEqual(
  VRM_TELEMETRY_DATABASE_INTEGRATION_DEFAULTS,
  {
    count: 200,
    overlapSeconds: 120,
  }
);

pass(
  "production telemetry defaults are preserved"
);

assert.deepEqual(
  VRM_TELEMETRY_DATABASE_PERSISTENCE_IDENTITY,
  [
    "installation",
    "deviceType",
    "deviceInstance",
    "vrmAttributeId",
    "timestamp",
  ]
);

pass(
  "production telemetry persistence identity is explicit"
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .usesExistingProductionSynchronizer,
  true
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .createsParallelIngestionPath,
  false
);

pass(
  "12.2 delegates to the existing production synchronizer"
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .checkpointAfterPersistence,
  true
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .checkpointOnFailure,
  false
);

pass(
  "checkpoint advancement semantics are preserved"
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .lastSeenDerivedFromTelemetryTimestamp,
  true
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .lastSyncDerivedFromSuccessfulSynchronization,
  true
);

pass(
  "lastSeenAt and lastSyncAt remain semantically distinct"
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .syncFailureMeansPhysicalOffline,
  false
);

pass(
  "sync failure does not imply physical site outage"
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .preserveExplicitZero,
  true
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .missingMeansZero,
  false
);

pass(
  "zero and missing telemetry remain distinct"
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .advisoryOnly,
  true
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .executable,
  false
);

assert.equal(
  VRM_TELEMETRY_DATABASE_BOUNDARIES
    .autoDispatch,
  false
);

pass(
  "control-safety boundary is preserved"
);

const contract =
  createEndToEndIntegrationContract({
    scope: "SITE",

    scopeIdentity: {
      vrmSiteId:
        "VRM-12-2-TEST",
    },

    start:
      "2026-09-10T00:00:00Z",

    end:
      "2026-09-11T00:00:00Z",

    evidenceRefs: [
      "phase-12.1-pass",
    ],
  });

let calls = 0;
let receivedSiteId = null;
let receivedOptions = null;

const spySynchronizer =
  async (
    vrmSiteId,
    options
  ) => {
    calls += 1;
    receivedSiteId =
      vrmSiteId;
    receivedOptions = {
      ...options,
    };

    return {
      vrmSiteId,

      checkpoint: {
        previous: null,
        current:
          new Date(
            "2026-09-10T10:00:00Z"
          ),
        overlapSeconds:
          options.overlapSeconds,
      },

      received: 3,
      candidates: 3,
      filtered: 0,
      processed: 3,
      inserted: 2,
      existing: 1,
      invalid: 0,
    };
  };

const qualified =
  qualifyVrmTelemetryDatabaseIntegration({
    integrationContract:
      contract,

    telemetrySynchronizer:
      spySynchronizer,
  });

assert.equal(
  qualified.phase,
  "12.2"
);

assert.equal(
  qualified.status,
  "QUALIFIED"
);

assert.equal(
  qualified.executed,
  false
);

pass(
  "valid Phase 12.1 SITE contract qualifies for 12.2"
);

assert.equal(
  calls,
  0
);

pass(
  "qualification does not execute telemetry synchronization"
);

assert.equal(
  qualified.vrmSiteId,
  "VRM-12-2-TEST"
);

assert.strictEqual(
  qualified.scopeIdentity,
  contract.scopeIdentity
);

assert.strictEqual(
  qualified.horizon,
  contract.horizon
);

assert.strictEqual(
  qualified.evidenceRefs,
  contract.evidenceRefs
);

pass(
  "SITE identity, horizon, and evidence propagate unchanged"
);

assert.deepEqual(
  qualified.options,
  {
    count: 200,
    overlapSeconds: 120,
  }
);

pass(
  "qualified integration uses production defaults"
);

const custom =
  qualifyVrmTelemetryDatabaseIntegration({
    integrationContract:
      contract,

    telemetrySynchronizer:
      spySynchronizer,

    options: {
      count: 75,
      overlapSeconds: 30,
    },
  });

assert.deepEqual(
  custom.options,
  {
    count: 75,
    overlapSeconds: 30,
  }
);

pass(
  "explicit synchronization options propagate without inference"
);

const result =
  await executeVrmTelemetryDatabaseIntegration({
    qualifiedIntegration:
      custom,
  });

assert.equal(
  calls,
  1
);

pass(
  "execution delegates exactly once to the existing synchronizer"
);

assert.equal(
  receivedSiteId,
  "VRM-12-2-TEST"
);

assert.deepEqual(
  receivedOptions,
  {
    count: 75,
    overlapSeconds: 30,
  }
);

pass(
  "execution passes exact SITE identity and synchronization options"
);

assert.equal(
  result.phase,
  "12.2"
);

assert.equal(
  result.status,
  "EXECUTED"
);

assert.equal(
  result.executed,
  true
);

pass(
  "successful synchronizer execution is explicitly classified"
);

assert.equal(
  result.result.inserted,
  2
);

assert.equal(
  result.result.existing,
  1
);

assert.equal(
  result.result.invalid,
  0
);

pass(
  "production synchronization result is passed through without reinterpretation"
);

assert.strictEqual(
  result.scopeIdentity,
  contract.scopeIdentity
);

assert.strictEqual(
  result.horizon,
  contract.horizon
);

pass(
  "execution preserves upstream identity and horizon"
);

const zeroSpy =
  async () => ({
    vrmSiteId:
      "VRM-12-2-TEST",

    received: 1,
    candidates: 1,
    filtered: 0,
    processed: 1,
    inserted: 0,
    existing: 1,
    invalid: 0,

    explicitZeroEvidence: {
      rawValue: 0,
      numericValue: 0,
    },
  });

const zeroQualified =
  qualifyVrmTelemetryDatabaseIntegration({
    integrationContract:
      contract,

    telemetrySynchronizer:
      zeroSpy,
  });

const zeroResult =
  await executeVrmTelemetryDatabaseIntegration({
    qualifiedIntegration:
      zeroQualified,
  });

assert.equal(
  zeroResult.result
    .explicitZeroEvidence
    .rawValue,
  0
);

assert.equal(
  zeroResult.result
    .explicitZeroEvidence
    .numericValue,
  0
);

pass(
  "explicit numeric zero survives the 12.2 integration boundary"
);

const failure =
  new Error(
    "controlled VRM failure"
  );

const failingSpy =
  async () => {
    throw failure;
  };

const failureQualified =
  qualifyVrmTelemetryDatabaseIntegration({
    integrationContract:
      contract,

    telemetrySynchronizer:
      failingSpy,
  });

const failureResult =
  await executeVrmTelemetryDatabaseIntegration({
    qualifiedIntegration:
      failureQualified,
  });

assert.equal(
  failureResult.status,
  "ERROR"
);

assert.equal(
  failureResult.executed,
  false
);

assert.equal(
  failureResult.error.message,
  "controlled VRM failure"
);

pass(
  "synchronization failure is propagated as ERROR without false execution"
);

expectThrow(
  () =>
    qualifyVrmTelemetryDatabaseIntegration({
      integrationContract:
        null,

      telemetrySynchronizer:
        spySynchronizer,
    }),

  /integrationContract must be an object/,

  "missing Phase 12.1 contract is rejected"
);

const fleetContract =
  createEndToEndIntegrationContract({
    scope: "FLEET",

    scopeIdentity: {
      fleetId:
        "FLEET-12-2",
    },

    start:
      "2026-09-10T00:00:00Z",

    end:
      "2026-09-11T00:00:00Z",
  });

expectThrow(
  () =>
    qualifyVrmTelemetryDatabaseIntegration({
      integrationContract:
        fleetContract,

      telemetrySynchronizer:
        spySynchronizer,
    }),

  /requires SITE scope/,

  "FLEET contract is rejected by per-site telemetry integration"
);

expectThrow(
  () =>
    qualifyVrmTelemetryDatabaseIntegration({
      integrationContract:
        contract,

      telemetrySynchronizer:
        null,
    }),

  /telemetrySynchronizer must be a function/,

  "missing production synchronizer adapter is rejected"
);

expectThrow(
  () =>
    qualifyVrmTelemetryDatabaseIntegration({
      integrationContract:
        contract,

      telemetrySynchronizer:
        spySynchronizer,

      options: {
        count: 0,
      },
    }),

  /count must be a positive integer/,

  "invalid telemetry count is rejected"
);

expectThrow(
  () =>
    qualifyVrmTelemetryDatabaseIntegration({
      integrationContract:
        contract,

      telemetrySynchronizer:
        spySynchronizer,

      options: {
        overlapSeconds: -1,
      },
    }),

  /overlapSeconds must be a non-negative number/,

  "negative overlap is rejected"
);

/*
|--------------------------------------------------------------------------
| Static production-source verification
|--------------------------------------------------------------------------
*/

const telemetryServiceSource =
  fs.readFileSync(
    path.join(
      root,
      "services",
      "sync",
      "telemetrySyncService.js"
    ),
    "utf8"
  );

const normalizerSource =
  fs.readFileSync(
    path.join(
      root,
      "services",
      "sync",
      "telemetryNormalizer.js"
    ),
    "utf8"
  );

const telemetryModelSource =
  fs.readFileSync(
    path.join(
      root,
      "models",
      "Telemetry.js"
    ),
    "utf8"
  );

const schedulerSource =
  fs.readFileSync(
    path.join(
      root,
      "services",
      "scheduler",
      "vrmScheduler.js"
    ),
    "utf8"
  );

assert.match(
  telemetryServiceSource,
  /getInstallationTelemetry/
);

assert.match(
  telemetryServiceSource,
  /normalizeTelemetryRecord/
);

assert.match(
  telemetryServiceSource,
  /Telemetry\.bulkWrite/
);

pass(
  "production telemetry synchronizer retains VRM → normalize → bulk persistence chain"
);

assert.match(
  telemetryServiceSource,
  /\$setOnInsert/
);

assert.match(
  telemetryServiceSource,
  /ordered\s*:\s*false/
);

pass(
  "production persistence retains idempotent unordered upsert semantics"
);

for (
  const field of
  VRM_TELEMETRY_DATABASE_PERSISTENCE_IDENTITY
) {
  assert.match(
    telemetryModelSource,
    new RegExp(
      `${field}\\s*:\\s*1`
    )
  );
}

assert.match(
  telemetryModelSource,
  /unique\s*:\s*true/
);

pass(
  "Telemetry schema retains the qualified unique persistence identity"
);

assert.match(
  normalizerSource,
  /aggregationLevel\s*:\s*"RAW"/
);

assert.match(
  normalizerSource,
  /source\s*:\s*"VRM"/
);

pass(
  "normalizer preserves VRM source and RAW aggregation level"
);

assert.match(
  normalizerSource,
  /Number\.isFinite\(value\)/
);

assert.match(
  normalizerSource,
  /return value/
);

pass(
  "normalizer preserves finite numeric values including zero"
);

const bulkPosition =
  telemetryServiceSource.indexOf(
    "Telemetry.bulkWrite"
  );

const checkpointPosition =
  telemetryServiceSource.indexOf(
    "SyncState.findByIdAndUpdate"
  );

assert.ok(
  bulkPosition >= 0
);

assert.ok(
  checkpointPosition >
    bulkPosition
);

pass(
  "production checkpoint update occurs after telemetry bulk persistence"
);

assert.match(
  telemetryServiceSource,
  /status\s*:\s*"FAILED"/
);

assert.match(
  telemetryServiceSource,
  /throw error/
);

pass(
  "production synchronization explicitly records and propagates failure"
);

assert.match(
  schedulerSource,
  /syncTelemetryByVrmSiteId/
);

assert.match(
  schedulerSource,
  /TELEMETRY_INTERVAL_MS\s*=\s*10\s*\*\s*60\s*\*\s*1000/
);

pass(
  "scheduler invokes the production telemetry synchronizer every 10 minutes"
);

assert.equal(
  qualified.boundaries
    .createsParallelIngestionPath,
  false
);

assert.equal(
  qualified.boundaries
    .checkpointAfterPersistence,
  true
);

assert.equal(
  qualified.boundaries
    .syncFailureMeansPhysicalOffline,
  false
);

pass(
  "qualified integration retains production synchronization safety semantics"
);

assert.equal(
  checks,
  36
);

pass(
  "12.2 assertion plan completed exactly"
);

console.log("");
console.log(
  `Assertions passed: ${checks}`
);
console.log(
  "================================================"
);
console.log(
  "ASHMAAN PHASE 12.2 VRM → SYNC → DATABASE INTEGRATION PASSED"
);
console.log(
  "================================================"
);