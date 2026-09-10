export const PHASE = "12.3";

export const LAYER =
  "DATABASE_EVENTS_RELIABILITY_INTEGRATION";

export const INTERVAL =
  "[start,end)";

export const DEFAULTS =
  Object.freeze({
    minimumDurationSeconds: 60,
    dryRun: true,
  });

export const BOUNDARIES =
  Object.freeze({
    usesExistingEventDetector: true,
    usesExistingEventPersistence: true,
    usesExistingReliabilityProjector: true,

    createsParallelEventEngine: false,
    createsParallelReliabilityEngine: false,

    monitoringOfflineMeansElectricalOutage: false,
    missingTelemetryMeansElectricalOutage: false,
    unknownTelemetryMeansRestoration: false,

    gridSourceInterruptionMeansCustomerInterruption: false,
    gridSourceInterruptionMeansEns: false,

    openOutageAllowed: true,
    restoredOutageMayNotDowngradeToOpen: true,
    closeOpenAtWindowEnd: false,

    halfOpenReportingWindow: true,

    siteScopedGlobalReliabilityIndicesInvoked: false,
    siteScopedTechnicalReliabilityInvoked: false,

    advisoryOnly: true,
    executable: false,
    autoDispatch: false,
  });

function assertFunction(
  value,
  name
) {
  if (
    typeof value !==
    "function"
  ) {
    throw new TypeError(
      `${name} must be a function`
    );
  }
}

function validateUpstream(
  upstream
) {
  if (
    !upstream ||
    typeof upstream !== "object" ||
    Array.isArray(upstream)
  ) {
    throw new TypeError(
      "upstreamIntegration must be an object"
    );
  }

  if (
    upstream.phase !==
    "12.2"
  ) {
    throw new TypeError(
      "upstreamIntegration must be Phase 12.2"
    );
  }

  if (
    upstream.layer !==
    "VRM_TELEMETRY_DATABASE_INTEGRATION"
  ) {
    throw new TypeError(
      "upstreamIntegration layer is invalid"
    );
  }

  if (
    upstream.status !== "EXECUTED" ||
    upstream.executed !== true
  ) {
    throw new TypeError(
      "upstreamIntegration must be successfully executed"
    );
  }

  if (
    upstream.scope !==
    "SITE"
  ) {
    throw new TypeError(
      "Phase 12.3 requires SITE scope"
    );
  }

  const vrmSiteId =
    upstream.scopeIdentity
      ?.vrmSiteId;

  if (
    typeof vrmSiteId !==
      "string" ||
    !vrmSiteId.trim()
  ) {
    throw new TypeError(
      "upstreamIntegration requires scopeIdentity.vrmSiteId"
    );
  }

  if (
    upstream.horizon
      ?.interval !==
    INTERVAL
  ) {
    throw new TypeError(
      "upstreamIntegration must preserve [start,end)"
    );
  }

  const start =
    new Date(
      upstream.horizon.start
    );

  const end =
    new Date(
      upstream.horizon.end
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    ) ||
    end <= start
  ) {
    throw new TypeError(
      "upstreamIntegration horizon is invalid"
    );
  }

  return vrmSiteId;
}

function normalizeOptions(
  options = {}
) {
  const minimumDurationSeconds =
    options.minimumDurationSeconds ??
    DEFAULTS.minimumDurationSeconds;

  const dryRun =
    options.dryRun ??
    DEFAULTS.dryRun;

  if (
    !Number.isFinite(
      minimumDurationSeconds
    ) ||
    minimumDurationSeconds < 0
  ) {
    throw new TypeError(
      "minimumDurationSeconds must be a non-negative number"
    );
  }

  if (
    typeof dryRun !==
    "boolean"
  ) {
    throw new TypeError(
      "dryRun must be a boolean"
    );
  }

  return Object.freeze({
    minimumDurationSeconds,
    dryRun,
  });
}

function normalizeTelemetryRead(
  value
) {
  if (
    Array.isArray(value)
  ) {
    return {
      installation: null,
      site: null,
      records: value,
    };
  }

  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray(
      value.records
    )
  ) {
    throw new TypeError(
      "telemetryReader must return records array evidence"
    );
  }

  return {
    installation:
      value.installation ??
      null,

    site:
      value.site ??
      null,

    records:
      value.records,
  };
}

function extractEpisodes(
  value
) {
  if (
    Array.isArray(value)
  ) {
    return value;
  }

  if (
    Array.isArray(
      value?.episodes
    )
  ) {
    return value.episodes;
  }

  if (
    Array.isArray(
      value?.candidates
    )
  ) {
    return value.candidates;
  }

  throw new TypeError(
    "eventDetector must return episodes/candidates array evidence"
  );
}

export function qualifyTelemetryEventsReliabilityIntegration({
  upstreamIntegration,
  telemetryReader,
  eventDetector,
  eventPersister,
  reliabilityProjector,
  options = {},
} = {}) {
  const vrmSiteId =
    validateUpstream(
      upstreamIntegration
    );

  assertFunction(
    telemetryReader,
    "telemetryReader"
  );

  assertFunction(
    eventDetector,
    "eventDetector"
  );

  assertFunction(
    eventPersister,
    "eventPersister"
  );

  assertFunction(
    reliabilityProjector,
    "reliabilityProjector"
  );

  return Object.freeze({
    phase:
      PHASE,

    layer:
      LAYER,

    upstreamPhase:
      upstreamIntegration.phase,

    upstreamLayer:
      upstreamIntegration.layer,

    status:
      "QUALIFIED",

    executed:
      false,

    scope:
      upstreamIntegration.scope,

    scopeIdentity:
      upstreamIntegration
        .scopeIdentity,

    horizon:
      upstreamIntegration.horizon,

    evidenceRefs:
      upstreamIntegration
        .evidenceRefs ??
      [],

    vrmSiteId,

    options:
      normalizeOptions(
        options
      ),

    boundaries:
      BOUNDARIES,

    telemetryReader,
    eventDetector,
    eventPersister,
    reliabilityProjector,
  });
}

export async function executeTelemetryEventsReliabilityIntegration({
  qualifiedIntegration,
} = {}) {
  const q =
    qualifiedIntegration;

  if (
    !q ||
    q.phase !== PHASE ||
    q.layer !== LAYER ||
    q.status !== "QUALIFIED" ||
    q.executed !== false
  ) {
    throw new TypeError(
      "qualifiedIntegration must be a qualified Phase 12.3 integration"
    );
  }

  try {
    const read =
      normalizeTelemetryRead(
        await q.telemetryReader({
          vrmSiteId:
            q.vrmSiteId,

          scope:
            q.scope,

          scopeIdentity:
            q.scopeIdentity,

          start:
            q.horizon.start,

          end:
            q.horizon.end,

          interval:
            INTERVAL,
        })
      );

    const detectorResult =
      await q.eventDetector({
        records:
          read.records,

        installation:
          read.installation,

        site:
          read.site,

        minimumDurationSeconds:
          q.options
            .minimumDurationSeconds,

        closeOpenAtEnd:
          false,

        streamEndTime:
          null,
      });

    const episodes =
      extractEpisodes(
        detectorResult
      );

    const persistence =
      await q.eventPersister(
        episodes,
        {
          dryRun:
            q.options.dryRun,
        }
      );

    /*
     * Intentionally SITE-scoped.
     *
     * Do not call calculateReliabilityIndices()
     * or calculateTechnicalReliability() here,
     * because their current production queries
     * are fleet/global rather than SITE-filtered.
     */
    const reliability =
      await q.reliabilityProjector({
        events:
          episodes,

        periodStart:
          q.horizon.start,

        periodEnd:
          q.horizon.end,
      });

    return Object.freeze({
      phase:
        PHASE,

      layer:
        LAYER,

      status:
        "EXECUTED",

      executed:
        true,

      scope:
        q.scope,

      scopeIdentity:
        q.scopeIdentity,

      horizon:
        q.horizon,

      evidenceRefs:
        q.evidenceRefs,

      vrmSiteId:
        q.vrmSiteId,

      options:
        q.options,

      boundaries:
        q.boundaries,

      telemetry:
        Object.freeze({
          recordCount:
            read.records.length,

          installation:
            read.installation,

          site:
            read.site,
        }),

      events:
        Object.freeze({
          episodeCount:
            episodes.length,

          detectorResult,

          persistence,
        }),

      reliability,
    });
  } catch (error) {
    return Object.freeze({
      phase:
        PHASE,

      layer:
        LAYER,

      status:
        "ERROR",

      executed:
        false,

      scope:
        q.scope,

      scopeIdentity:
        q.scopeIdentity,

      horizon:
        q.horizon,

      evidenceRefs:
        q.evidenceRefs,

      vrmSiteId:
        q.vrmSiteId,

      options:
        q.options,

      boundaries:
        q.boundaries,

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