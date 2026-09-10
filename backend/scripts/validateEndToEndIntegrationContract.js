import assert from "node:assert/strict";

import {
  END_TO_END_INTEGRATION_CONTRACT_PHASE,
  END_TO_END_INTEGRATION_CONTRACT_LAYER,
  END_TO_END_INTEGRATION_CONTRACT_UPSTREAM_LAYER,
  END_TO_END_INTEGRATION_CONTRACT_DOWNSTREAM_LAYER,
  END_TO_END_INTEGRATION_INTERVAL,
  END_TO_END_INTEGRATION_LAYERS,
  END_TO_END_INTEGRATION_TRANSITIONS,
  END_TO_END_INTEGRATION_BOUNDARIES,
  END_TO_END_INTEGRATION_DATA_SEMANTICS,
  END_TO_END_INTEGRATION_IDENTITY,
  END_TO_END_INTEGRATION_STATUS,
  createEndToEndIntegrationContract,
} from "../services/integration/endToEndIntegrationContract.js";

let checks = 0;

function pass(
  message
) {
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
  assert.throws(
    fn,
    pattern
  );

  pass(message);
}

console.log("");
console.log(
  "================================================"
);
console.log(
  "ASHMAAN PHASE 12.1 END-TO-END INTEGRATION CONTRACT"
);
console.log(
  "================================================"
);
console.log("");

assert.equal(
  END_TO_END_INTEGRATION_CONTRACT_PHASE,
  "12.1"
);

pass(
  "contract phase is 12.1"
);

assert.equal(
  END_TO_END_INTEGRATION_CONTRACT_LAYER,
  "END_TO_END_SYSTEM_INTEGRATION"
);

pass(
  "contract layer is END_TO_END_SYSTEM_INTEGRATION"
);

assert.equal(
  END_TO_END_INTEGRATION_CONTRACT_UPSTREAM_LAYER,
  "VRM"
);

pass(
  "contract upstream boundary is VRM"
);

assert.equal(
  END_TO_END_INTEGRATION_CONTRACT_DOWNSTREAM_LAYER,
  "END_USER"
);

pass(
  "contract downstream boundary is END_USER"
);

assert.equal(
  END_TO_END_INTEGRATION_INTERVAL,
  "[start,end)"
);

pass(
  "contract preserves [start,end) interval semantics"
);

assert.deepEqual(
  END_TO_END_INTEGRATION_LAYERS,
  [
    "VRM",
    "INGESTION_SYNCHRONIZATION",
    "DATABASE",
    "EVENTS_RELIABILITY",
    "ENGINEERING_ANALYTICS",
    "FORECASTING",
    "FINANCIAL_BI",
    "OPTIMIZATION_DSS",
    "REST_API",
    "FRONTEND",
    "END_USER",
  ]
);

pass(
  "integration layer order is explicit and deterministic"
);

assert.equal(
  END_TO_END_INTEGRATION_TRANSITIONS.length,
  END_TO_END_INTEGRATION_LAYERS.length - 1
);

for (
  let index = 0;
  index <
  END_TO_END_INTEGRATION_TRANSITIONS.length;
  index += 1
) {
  assert.equal(
    END_TO_END_INTEGRATION_TRANSITIONS[index].from,
    END_TO_END_INTEGRATION_LAYERS[index]
  );

  assert.equal(
    END_TO_END_INTEGRATION_TRANSITIONS[index].to,
    END_TO_END_INTEGRATION_LAYERS[index + 1]
  );
}

pass(
  "all integration transitions follow the declared layer order"
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.readOnlyValidation,
  true
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.mutatesUpstream,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.persistsData,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.performsHttpRequests,
  false
);

pass(
  "12.1 contract is read-only and side-effect free"
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.executesSynchronization,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.executesAnalytics,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.executesForecasting,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.executesFinancialBi,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.executesOptimization,
  false
);

pass(
  "12.1 contract executes no production pipeline stage"
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.advisoryOnly,
  true
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.executable,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_BOUNDARIES.autoDispatch,
  false
);

pass(
  "Optimization/DSS control-safety boundary is preserved"
);

assert.equal(
  END_TO_END_INTEGRATION_DATA_SEMANTICS.preserveExplicitZero,
  true
);

assert.equal(
  END_TO_END_INTEGRATION_DATA_SEMANTICS.missingMeansZero,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_DATA_SEMANTICS.unavailableMeansZero,
  false
);

pass(
  "zero, missing, and UNAVAILABLE remain semantically distinct"
);

assert.equal(
  END_TO_END_INTEGRATION_DATA_SEMANTICS.unitInferenceAllowed,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_DATA_SEMANTICS.directionInferenceAllowed,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_DATA_SEMANTICS.topologyInferenceAllowed,
  false
);

pass(
  "unit, direction, and topology inference remain prohibited"
);

assert.equal(
  END_TO_END_INTEGRATION_DATA_SEMANTICS.silentResamplingAllowed,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_DATA_SEMANTICS.interpolationAllowed,
  false
);

assert.equal(
  END_TO_END_INTEGRATION_DATA_SEMANTICS.duplicateMergeAllowed,
  false
);

pass(
  "silent resampling, interpolation, and duplicate merging remain prohibited"
);

assert.equal(
  END_TO_END_INTEGRATION_DATA_SEMANTICS.futureDataLeakageAllowed,
  false
);

pass(
  "future-data leakage remains prohibited"
);

assert.deepEqual(
  END_TO_END_INTEGRATION_IDENTITY.supportedScopes,
  [
    "SITE",
    "FLEET",
  ]
);

pass(
  "SITE and FLEET integration scopes are explicit"
);

assert.equal(
  END_TO_END_INTEGRATION_IDENTITY.preserveVrmSiteId,
  true
);

assert.equal(
  END_TO_END_INTEGRATION_IDENTITY.preserveFleetId,
  true
);

assert.equal(
  END_TO_END_INTEGRATION_IDENTITY.preserveStart,
  true
);

assert.equal(
  END_TO_END_INTEGRATION_IDENTITY.preserveEnd,
  true
);

assert.equal(
  END_TO_END_INTEGRATION_IDENTITY.preserveInterval,
  true
);

assert.equal(
  END_TO_END_INTEGRATION_IDENTITY.preserveTimestamp,
  true
);

assert.equal(
  END_TO_END_INTEGRATION_IDENTITY.preserveUnit,
  true
);

assert.equal(
  END_TO_END_INTEGRATION_IDENTITY.preserveEvidenceRefs,
  true
);

pass(
  "cross-layer identity and evidence preservation requirements are explicit"
);

assert.deepEqual(
  END_TO_END_INTEGRATION_STATUS,
  {
    CONTRACT_DEFINED:
      "CONTRACT_DEFINED",

    NOT_EXECUTED:
      "NOT_EXECUTED",

    QUALIFIED:
      "QUALIFIED",

    PARTIALLY_QUALIFIED:
      "PARTIALLY_QUALIFIED",

    UNAVAILABLE:
      "UNAVAILABLE",

    ERROR:
      "ERROR",
  }
);

pass(
  "integration status vocabulary is controlled"
);

const site =
  createEndToEndIntegrationContract({
    scope: "SITE",

    scopeIdentity: {
      vrmSiteId:
        "VRM-SITE-12-1",
    },

    start:
      "2026-09-10T00:00:00.000Z",

    end:
      "2026-09-11T00:00:00.000Z",

    evidenceRefs: [
      "phase-11-closed",
      "d8-deployment-ready",
    ],
  });

assert.equal(
  site.phase,
  "12.1"
);

assert.equal(
  site.layer,
  "END_TO_END_SYSTEM_INTEGRATION"
);

assert.equal(
  site.status,
  "CONTRACT_DEFINED"
);

assert.equal(
  site.executed,
  false
);

pass(
  "SITE contract is created without executing integration"
);

assert.equal(
  site.scope,
  "SITE"
);

assert.deepEqual(
  site.scopeIdentity,
  {
    vrmSiteId:
      "VRM-SITE-12-1",
  }
);

pass(
  "SITE scope identity is preserved exactly"
);

assert.deepEqual(
  site.horizon,
  {
    start:
      "2026-09-10T00:00:00.000Z",

    end:
      "2026-09-11T00:00:00.000Z",

    interval:
      "[start,end)",
  }
);

pass(
  "SITE horizon is normalized and preserves [start,end)"
);

assert.deepEqual(
  site.evidenceRefs,
  [
    "phase-11-closed",
    "d8-deployment-ready",
  ]
);

pass(
  "SITE evidence references are preserved"
);

assert.equal(
  Object.isFrozen(site),
  true
);

assert.equal(
  Object.isFrozen(
    site.scopeIdentity
  ),
  true
);

assert.equal(
  Object.isFrozen(
    site.horizon
  ),
  true
);

assert.equal(
  Object.isFrozen(
    site.evidenceRefs
  ),
  true
);

pass(
  "created SITE contract is immutable"
);

const fleet =
  createEndToEndIntegrationContract({
    scope: "FLEET",

    scopeIdentity: {
      fleetId:
        "FLEET-12-1",
    },

    start:
      "2026-09-10T00:00:00Z",

    end:
      "2026-09-10T12:00:00Z",

    evidenceRefs: [],
  });

assert.equal(
  fleet.scope,
  "FLEET"
);

assert.deepEqual(
  fleet.scopeIdentity,
  {
    fleetId:
      "FLEET-12-1",
  }
);

pass(
  "FLEET contract preserves fleet identity"
);

expectThrow(
  () =>
    createEndToEndIntegrationContract({
      scope:
        "UNKNOWN",

      scopeIdentity: {
        vrmSiteId:
          "X",
      },

      start:
        "2026-09-10T00:00:00Z",

      end:
        "2026-09-11T00:00:00Z",
    }),

  /scope must be SITE or FLEET/,

  "unknown scope is rejected"
);

expectThrow(
  () =>
    createEndToEndIntegrationContract({
      scope:
        "SITE",

      scopeIdentity: {},

      start:
        "2026-09-10T00:00:00Z",

      end:
        "2026-09-11T00:00:00Z",
    }),

  /vrmSiteId/,

  "SITE without vrmSiteId is rejected"
);

expectThrow(
  () =>
    createEndToEndIntegrationContract({
      scope:
        "FLEET",

      scopeIdentity: {},

      start:
        "2026-09-10T00:00:00Z",

      end:
        "2026-09-11T00:00:00Z",
    }),

  /fleetId/,

  "FLEET without fleetId is rejected"
);

expectThrow(
  () =>
    createEndToEndIntegrationContract({
      scope:
        "SITE",

      scopeIdentity: {
        vrmSiteId:
          "VRM-1",
      },

      start:
        "not-a-date",

      end:
        "2026-09-11T00:00:00Z",
    }),

  /start must be a valid timestamp/,

  "invalid start timestamp is rejected"
);

expectThrow(
  () =>
    createEndToEndIntegrationContract({
      scope:
        "SITE",

      scopeIdentity: {
        vrmSiteId:
          "VRM-1",
      },

      start:
        "2026-09-10T00:00:00Z",

      end:
        "not-a-date",
    }),

  /end must be a valid timestamp/,

  "invalid end timestamp is rejected"
);

expectThrow(
  () =>
    createEndToEndIntegrationContract({
      scope:
        "SITE",

      scopeIdentity: {
        vrmSiteId:
          "VRM-1",
      },

      start:
        "2026-09-11T00:00:00Z",

      end:
        "2026-09-10T00:00:00Z",
    }),

  /end must be greater than start/,

  "reversed integration horizon is rejected"
);

expectThrow(
  () =>
    createEndToEndIntegrationContract({
      scope:
        "SITE",

      scopeIdentity: {
        vrmSiteId:
          "VRM-1",
      },

      start:
        "2026-09-10T00:00:00Z",

      end:
        "2026-09-10T00:00:00Z",
    }),

  /end must be greater than start/,

  "empty integration horizon is rejected"
);

expectThrow(
  () =>
    createEndToEndIntegrationContract({
      scope:
        "SITE",

      scopeIdentity: {
        vrmSiteId:
          "VRM-1",
      },

      start:
        "2026-09-10T00:00:00Z",

      end:
        "2026-09-11T00:00:00Z",

      evidenceRefs:
        "not-an-array",
    }),

  /evidenceRefs must be an array/,

  "non-array evidenceRefs are rejected"
);

expectThrow(
  () =>
    createEndToEndIntegrationContract({
      scope:
        "SITE",

      scopeIdentity: {
        vrmSiteId:
          "VRM-1",
      },

      start:
        "2026-09-10T00:00:00Z",

      end:
        "2026-09-11T00:00:00Z",

      evidenceRefs: [
        "",
      ],
    }),

  /non-empty strings/,

  "empty evidence references are rejected"
);

assert.equal(
  site.boundaries.advisoryOnly,
  true
);

assert.equal(
  site.boundaries.executable,
  false
);

assert.equal(
  site.boundaries.autoDispatch,
  false
);

assert.equal(
  site.boundaries.persistsData,
  false
);

assert.equal(
  site.boundaries.performsHttpRequests,
  false
);

pass(
  "created contract retains deployment safety boundaries"
);

assert.equal(
  site.dataSemantics.preserveExplicitZero,
  true
);

assert.equal(
  site.dataSemantics.missingMeansZero,
  false
);

assert.equal(
  site.dataSemantics.unavailableMeansZero,
  false
);

assert.equal(
  site.dataSemantics.futureDataLeakageAllowed,
  false
);

pass(
  "created contract retains conservative cross-layer data semantics"
);

assert.equal(
  site.layers[0],
  "VRM"
);

assert.equal(
  site.layers[
    site.layers.length - 1
  ],
  "END_USER"
);

assert.equal(
  site.transitions.length,
  10
);

pass(
  "created contract spans the complete VRM-to-end-user chain"
);

assert.equal(
  checks,
  35
);

pass(
  "12.1 assertion plan completed exactly"
);

console.log("");
console.log(
  `Assertions passed: ${checks}`
);
console.log(
  "================================================"
);
console.log(
  "ASHMAAN PHASE 12.1 END-TO-END INTEGRATION CONTRACT PASSED"
);
console.log(
  "================================================"
);