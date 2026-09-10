export const END_TO_END_INTEGRATION_CONTRACT_PHASE = "12.1";

export const END_TO_END_INTEGRATION_CONTRACT_LAYER =
  "END_TO_END_SYSTEM_INTEGRATION";

export const END_TO_END_INTEGRATION_CONTRACT_UPSTREAM_LAYER =
  "VRM";

export const END_TO_END_INTEGRATION_CONTRACT_DOWNSTREAM_LAYER =
  "END_USER";

export const END_TO_END_INTEGRATION_INTERVAL =
  "[start,end)";

export const END_TO_END_INTEGRATION_LAYERS =
  Object.freeze([
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
  ]);

export const END_TO_END_INTEGRATION_TRANSITIONS =
  Object.freeze([
    Object.freeze({
      from: "VRM",
      to: "INGESTION_SYNCHRONIZATION",
    }),
    Object.freeze({
      from: "INGESTION_SYNCHRONIZATION",
      to: "DATABASE",
    }),
    Object.freeze({
      from: "DATABASE",
      to: "EVENTS_RELIABILITY",
    }),
    Object.freeze({
      from: "EVENTS_RELIABILITY",
      to: "ENGINEERING_ANALYTICS",
    }),
    Object.freeze({
      from: "ENGINEERING_ANALYTICS",
      to: "FORECASTING",
    }),
    Object.freeze({
      from: "FORECASTING",
      to: "FINANCIAL_BI",
    }),
    Object.freeze({
      from: "FINANCIAL_BI",
      to: "OPTIMIZATION_DSS",
    }),
    Object.freeze({
      from: "OPTIMIZATION_DSS",
      to: "REST_API",
    }),
    Object.freeze({
      from: "REST_API",
      to: "FRONTEND",
    }),
    Object.freeze({
      from: "FRONTEND",
      to: "END_USER",
    }),
  ]);

export const END_TO_END_INTEGRATION_BOUNDARIES =
  Object.freeze({
    readOnlyValidation: true,

    mutatesUpstream: false,

    executesSynchronization: false,
    executesAnalytics: false,
    executesForecasting: false,
    executesFinancialBi: false,
    executesOptimization: false,

    persistsData: false,
    performsHttpRequests: false,

    advisoryOnly: true,
    executable: false,
    autoDispatch: false,
  });

export const END_TO_END_INTEGRATION_DATA_SEMANTICS =
  Object.freeze({
    interval:
      END_TO_END_INTEGRATION_INTERVAL,

    preserveExplicitZero: true,

    missingMeansZero: false,

    unavailableMeansZero: false,

    unitInferenceAllowed: false,

    directionInferenceAllowed: false,

    silentResamplingAllowed: false,

    interpolationAllowed: false,

    duplicateMergeAllowed: false,

    topologyInferenceAllowed: false,

    futureDataLeakageAllowed: false,
  });

export const END_TO_END_INTEGRATION_IDENTITY =
  Object.freeze({
    requiredScopeIdentity: true,

    supportedScopes:
      Object.freeze([
        "SITE",
        "FLEET",
      ]),

    preserveVrmSiteId: true,
    preserveFleetId: true,

    preserveStart: true,
    preserveEnd: true,

    preserveInterval: true,

    preserveTimestamp: true,

    preserveUnit: true,

    preserveEvidenceRefs: true,
  });

export const END_TO_END_INTEGRATION_STATUS =
  Object.freeze({
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
  });

function freezeContract(
  contract
) {
  return Object.freeze({
    ...contract,

    layers:
      END_TO_END_INTEGRATION_LAYERS,

    transitions:
      END_TO_END_INTEGRATION_TRANSITIONS,

    boundaries:
      END_TO_END_INTEGRATION_BOUNDARIES,

    dataSemantics:
      END_TO_END_INTEGRATION_DATA_SEMANTICS,

    identity:
      END_TO_END_INTEGRATION_IDENTITY,
  });
}

export function createEndToEndIntegrationContract({
  scope,
  scopeIdentity,
  start,
  end,
  evidenceRefs = [],
} = {}) {
  if (
    !END_TO_END_INTEGRATION_IDENTITY
      .supportedScopes
      .includes(scope)
  ) {
    throw new TypeError(
      "scope must be SITE or FLEET"
    );
  }

  if (
    !scopeIdentity ||
    typeof scopeIdentity !== "object" ||
    Array.isArray(scopeIdentity)
  ) {
    throw new TypeError(
      "scopeIdentity must be an object"
    );
  }

  if (
    scope === "SITE" &&
    (
      typeof scopeIdentity.vrmSiteId !==
        "string" ||
      scopeIdentity.vrmSiteId.trim() === ""
    )
  ) {
    throw new TypeError(
      "SITE scope requires scopeIdentity.vrmSiteId"
    );
  }

  if (
    scope === "FLEET" &&
    (
      typeof scopeIdentity.fleetId !==
        "string" ||
      scopeIdentity.fleetId.trim() === ""
    )
  ) {
    throw new TypeError(
      "FLEET scope requires scopeIdentity.fleetId"
    );
  }

  const startDate =
    new Date(start);

  const endDate =
    new Date(end);

  if (
    Number.isNaN(
      startDate.getTime()
    )
  ) {
    throw new TypeError(
      "start must be a valid timestamp"
    );
  }

  if (
    Number.isNaN(
      endDate.getTime()
    )
  ) {
    throw new TypeError(
      "end must be a valid timestamp"
    );
  }

  if (
    endDate.getTime() <=
    startDate.getTime()
  ) {
    throw new RangeError(
      "end must be greater than start"
    );
  }

  if (
    !Array.isArray(
      evidenceRefs
    )
  ) {
    throw new TypeError(
      "evidenceRefs must be an array"
    );
  }

  if (
    evidenceRefs.some(
      (ref) =>
        typeof ref !== "string" ||
        ref.trim() === ""
    )
  ) {
    throw new TypeError(
      "evidenceRefs must contain only non-empty strings"
    );
  }

  const normalizedScopeIdentity =
    scope === "SITE"
      ? Object.freeze({
          vrmSiteId:
            scopeIdentity.vrmSiteId,
        })
      : Object.freeze({
          fleetId:
            scopeIdentity.fleetId,
        });

  const horizon =
    Object.freeze({
      start:
        startDate.toISOString(),

      end:
        endDate.toISOString(),

      interval:
        END_TO_END_INTEGRATION_INTERVAL,
    });

  return freezeContract({
    phase:
      END_TO_END_INTEGRATION_CONTRACT_PHASE,

    layer:
      END_TO_END_INTEGRATION_CONTRACT_LAYER,

    upstreamLayer:
      END_TO_END_INTEGRATION_CONTRACT_UPSTREAM_LAYER,

    downstreamLayer:
      END_TO_END_INTEGRATION_CONTRACT_DOWNSTREAM_LAYER,

    status:
      END_TO_END_INTEGRATION_STATUS
        .CONTRACT_DEFINED,

    executed: false,

    scope,

    scopeIdentity:
      normalizedScopeIdentity,

    horizon,

    evidenceRefs:
      Object.freeze([
        ...evidenceRefs,
      ]),
  });
}

export default Object.freeze({
  phase:
    END_TO_END_INTEGRATION_CONTRACT_PHASE,

  layer:
    END_TO_END_INTEGRATION_CONTRACT_LAYER,

  upstreamLayer:
    END_TO_END_INTEGRATION_CONTRACT_UPSTREAM_LAYER,

  downstreamLayer:
    END_TO_END_INTEGRATION_CONTRACT_DOWNSTREAM_LAYER,

  layers:
    END_TO_END_INTEGRATION_LAYERS,

  transitions:
    END_TO_END_INTEGRATION_TRANSITIONS,

  boundaries:
    END_TO_END_INTEGRATION_BOUNDARIES,

  dataSemantics:
    END_TO_END_INTEGRATION_DATA_SEMANTICS,

  identity:
    END_TO_END_INTEGRATION_IDENTITY,

  statuses:
    END_TO_END_INTEGRATION_STATUS,

  create:
    createEndToEndIntegrationContract,
});