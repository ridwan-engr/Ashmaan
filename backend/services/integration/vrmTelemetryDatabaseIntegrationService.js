import {
  END_TO_END_INTEGRATION_CONTRACT_PHASE,
  END_TO_END_INTEGRATION_CONTRACT_LAYER,
} from "./endToEndIntegrationContract.js";

export const VRM_TELEMETRY_DATABASE_INTEGRATION_PHASE =
  "12.2";

export const VRM_TELEMETRY_DATABASE_INTEGRATION_LAYER =
  "VRM_TELEMETRY_DATABASE_INTEGRATION";

export const VRM_TELEMETRY_DATABASE_INTEGRATION_SOURCE =
  "VRM";

export const VRM_TELEMETRY_DATABASE_INTEGRATION_TARGET =
  "DATABASE";

export const VRM_TELEMETRY_DATABASE_INTEGRATION_SYNC_TYPE =
  "TELEMETRY";

export const VRM_TELEMETRY_DATABASE_INTEGRATION_AGGREGATION_LEVEL =
  "RAW";

export const VRM_TELEMETRY_DATABASE_INTEGRATION_DEFAULTS =
  Object.freeze({
    count: 200,
    overlapSeconds: 120,
  });

export const VRM_TELEMETRY_DATABASE_PERSISTENCE_IDENTITY =
  Object.freeze([
    "installation",
    "deviceType",
    "deviceInstance",
    "vrmAttributeId",
    "timestamp",
  ]);

export const VRM_TELEMETRY_DATABASE_BOUNDARIES =
  Object.freeze({
    usesExistingProductionSynchronizer: true,
    createsParallelIngestionPath: false,

    source: "VRM",
    syncType: "TELEMETRY",
    aggregationLevel: "RAW",

    idempotentPersistenceRequired: true,
    insertOnlyForExistingIdentity: true,

    checkpointAfterPersistence: true,
    checkpointOnFailure: false,

    lastSeenDerivedFromTelemetryTimestamp: true,
    lastSyncDerivedFromSuccessfulSynchronization: true,

    syncFailureMeansPhysicalOffline: false,

    preserveExplicitZero: true,
    missingMeansZero: false,

    unitInferenceAllowed: false,
    topologyInferenceAllowed: false,

    advisoryOnly: true,
    executable: false,
    autoDispatch: false,
  });

export const VRM_TELEMETRY_DATABASE_STATUS =
  Object.freeze({
    QUALIFIED: "QUALIFIED",
    EXECUTED: "EXECUTED",
    UNAVAILABLE: "UNAVAILABLE",
    ERROR: "ERROR",
  });

function assertContract(contract) {
  if (
    !contract ||
    typeof contract !== "object" ||
    Array.isArray(contract)
  ) {
    throw new TypeError(
      "integrationContract must be an object"
    );
  }

  if (
    contract.phase !==
    END_TO_END_INTEGRATION_CONTRACT_PHASE
  ) {
    throw new TypeError(
      "integrationContract must be Phase 12.1"
    );
  }

  if (
    contract.layer !==
    END_TO_END_INTEGRATION_CONTRACT_LAYER
  ) {
    throw new TypeError(
      "integrationContract layer is invalid"
    );
  }

  if (contract.scope !== "SITE") {
    throw new TypeError(
      "VRM telemetry integration requires SITE scope"
    );
  }

  const vrmSiteId =
    contract.scopeIdentity?.vrmSiteId;

  if (
    typeof vrmSiteId !== "string" ||
    vrmSiteId.trim() === ""
  ) {
    throw new TypeError(
      "integrationContract requires scopeIdentity.vrmSiteId"
    );
  }

  if (
    contract.horizon?.interval !==
    "[start,end)"
  ) {
    throw new TypeError(
      "integrationContract must preserve [start,end)"
    );
  }

  if (
    contract.executed !== false
  ) {
    throw new TypeError(
      "Phase 12.1 contract must be unexecuted"
    );
  }

  return vrmSiteId;
}

function assertSynchronizer(
  telemetrySynchronizer
) {
  if (
    typeof telemetrySynchronizer !==
    "function"
  ) {
    throw new TypeError(
      "telemetrySynchronizer must be a function"
    );
  }
}

function normalizeOptions(
  options = {}
) {
  const count =
    options.count ??
    VRM_TELEMETRY_DATABASE_INTEGRATION_DEFAULTS.count;

  const overlapSeconds =
    options.overlapSeconds ??
    VRM_TELEMETRY_DATABASE_INTEGRATION_DEFAULTS
      .overlapSeconds;

  if (
    !Number.isInteger(count) ||
    count <= 0
  ) {
    throw new TypeError(
      "count must be a positive integer"
    );
  }

  if (
    !Number.isFinite(overlapSeconds) ||
    overlapSeconds < 0
  ) {
    throw new TypeError(
      "overlapSeconds must be a non-negative number"
    );
  }

  return Object.freeze({
    count,
    overlapSeconds,
  });
}

export function qualifyVrmTelemetryDatabaseIntegration({
  integrationContract,
  telemetrySynchronizer,
  options = {},
} = {}) {
  const vrmSiteId =
    assertContract(
      integrationContract
    );

  assertSynchronizer(
    telemetrySynchronizer
  );

  const normalizedOptions =
    normalizeOptions(options);

  return Object.freeze({
    phase:
      VRM_TELEMETRY_DATABASE_INTEGRATION_PHASE,

    layer:
      VRM_TELEMETRY_DATABASE_INTEGRATION_LAYER,

    upstreamPhase:
      integrationContract.phase,

    upstreamLayer:
      integrationContract.layer,

    source:
      VRM_TELEMETRY_DATABASE_INTEGRATION_SOURCE,

    target:
      VRM_TELEMETRY_DATABASE_INTEGRATION_TARGET,

    syncType:
      VRM_TELEMETRY_DATABASE_INTEGRATION_SYNC_TYPE,

    aggregationLevel:
      VRM_TELEMETRY_DATABASE_INTEGRATION_AGGREGATION_LEVEL,

    status:
      VRM_TELEMETRY_DATABASE_STATUS.QUALIFIED,

    executed: false,

    scope:
      integrationContract.scope,

    scopeIdentity:
      integrationContract.scopeIdentity,

    horizon:
      integrationContract.horizon,

    evidenceRefs:
      integrationContract.evidenceRefs,

    vrmSiteId,

    options:
      normalizedOptions,

    persistenceIdentity:
      VRM_TELEMETRY_DATABASE_PERSISTENCE_IDENTITY,

    boundaries:
      VRM_TELEMETRY_DATABASE_BOUNDARIES,

    telemetrySynchronizer,
  });
}

export async function executeVrmTelemetryDatabaseIntegration({
  qualifiedIntegration,
} = {}) {
  if (
    !qualifiedIntegration ||
    qualifiedIntegration.phase !==
      VRM_TELEMETRY_DATABASE_INTEGRATION_PHASE ||
    qualifiedIntegration.layer !==
      VRM_TELEMETRY_DATABASE_INTEGRATION_LAYER ||
    qualifiedIntegration.status !==
      VRM_TELEMETRY_DATABASE_STATUS.QUALIFIED ||
    qualifiedIntegration.executed !== false
  ) {
    throw new TypeError(
      "qualifiedIntegration must be a qualified Phase 12.2 integration"
    );
  }

  assertSynchronizer(
    qualifiedIntegration
      .telemetrySynchronizer
  );

  try {
    const result =
      await qualifiedIntegration
        .telemetrySynchronizer(
          qualifiedIntegration.vrmSiteId,
          {
            count:
              qualifiedIntegration
                .options.count,

            overlapSeconds:
              qualifiedIntegration
                .options
                .overlapSeconds,
          }
        );

    return Object.freeze({
      phase:
        VRM_TELEMETRY_DATABASE_INTEGRATION_PHASE,

      layer:
        VRM_TELEMETRY_DATABASE_INTEGRATION_LAYER,

      status:
        VRM_TELEMETRY_DATABASE_STATUS.EXECUTED,

      executed: true,

      scope:
        qualifiedIntegration.scope,

      scopeIdentity:
        qualifiedIntegration
          .scopeIdentity,

      horizon:
        qualifiedIntegration.horizon,

      evidenceRefs:
        qualifiedIntegration
          .evidenceRefs,

      vrmSiteId:
        qualifiedIntegration.vrmSiteId,

      options:
        qualifiedIntegration.options,

      boundaries:
        qualifiedIntegration.boundaries,

      result,
    });
  } catch (error) {
    return Object.freeze({
      phase:
        VRM_TELEMETRY_DATABASE_INTEGRATION_PHASE,

      layer:
        VRM_TELEMETRY_DATABASE_INTEGRATION_LAYER,

      status:
        VRM_TELEMETRY_DATABASE_STATUS.ERROR,

      executed: false,

      scope:
        qualifiedIntegration.scope,

      scopeIdentity:
        qualifiedIntegration
          .scopeIdentity,

      horizon:
        qualifiedIntegration.horizon,

      evidenceRefs:
        qualifiedIntegration
          .evidenceRefs,

      vrmSiteId:
        qualifiedIntegration.vrmSiteId,

      options:
        qualifiedIntegration.options,

      boundaries:
        qualifiedIntegration.boundaries,

      error:
        Object.freeze({
          message:
            error instanceof Error
              ? error.message
              : String(error),
        }),
    });
  }
}