import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  detectGridInterruptionEpisodes,
} from "../services/events/gridRestorationDetector.js";

import {
  calculateReliabilitySiteTime,
} from "../services/reliability/reliabilityEpisodeService.js";

import {
  PHASE,
  LAYER,
  INTERVAL,
  DEFAULTS,
  BOUNDARIES,
  qualifyTelemetryEventsReliabilityIntegration,
  executeTelemetryEventsReliabilityIntegration,
} from "../services/integration/telemetryEventsReliabilityIntegrationService.js";

const __filename =
  fileURLToPath(
    import.meta.url
  );

const __dirname =
  path.dirname(
    __filename
  );

const root =
  path.resolve(
    __dirname,
    ".."
  );

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

  pass(
    message
  );
}

console.log("");
console.log(
  "================================================"
);
console.log(
  "ASHMAAN PHASE 12.3 DATABASE → EVENTS / RELIABILITY INTEGRATION"
);
console.log(
  "================================================"
);
console.log("");


/*
|--------------------------------------------------------------------------
| Contract identity
|--------------------------------------------------------------------------
*/

assert.equal(
  PHASE,
  "12.3"
);

pass(
  "integration phase is 12.3"
);


assert.equal(
  LAYER,
  "DATABASE_EVENTS_RELIABILITY_INTEGRATION"
);

pass(
  "integration layer is explicit"
);


assert.equal(
  INTERVAL,
  "[start,end)"
);

pass(
  "half-open integration interval is explicit"
);


assert.deepEqual(
  DEFAULTS,
  {
    minimumDurationSeconds:
      60,

    dryRun:
      true,
  }
);

pass(
  "production-safe defaults are explicit"
);


/*
|--------------------------------------------------------------------------
| Integration boundaries
|--------------------------------------------------------------------------
*/

assert.equal(
  BOUNDARIES
    .createsParallelEventEngine,
  false
);

assert.equal(
  BOUNDARIES
    .createsParallelReliabilityEngine,
  false
);

pass(
  "12.3 does not create parallel event or reliability engines"
);


assert.equal(
  BOUNDARIES
    .monitoringOfflineMeansElectricalOutage,
  false
);

assert.equal(
  BOUNDARIES
    .missingTelemetryMeansElectricalOutage,
  false
);

assert.equal(
  BOUNDARIES
    .unknownTelemetryMeansRestoration,
  false
);

pass(
  "monitoring, missing, and unknown telemetry cannot fabricate outage/restoration"
);


assert.equal(
  BOUNDARIES
    .gridSourceInterruptionMeansCustomerInterruption,
  false
);

assert.equal(
  BOUNDARIES
    .gridSourceInterruptionMeansEns,
  false
);

pass(
  "grid-source interruption is not promoted to customer interruption or ENS"
);


assert.equal(
  BOUNDARIES
    .openOutageAllowed,
  true
);

assert.equal(
  BOUNDARIES
    .closeOpenAtWindowEnd,
  false
);

pass(
  "open outage lifecycle remains open at reporting-window end"
);


assert.equal(
  BOUNDARIES
    .siteScopedGlobalReliabilityIndicesInvoked,
  false
);

assert.equal(
  BOUNDARIES
    .siteScopedTechnicalReliabilityInvoked,
  false
);

pass(
  "SITE bridge does not invoke globally scoped reliability calculators"
);


/*
|--------------------------------------------------------------------------
| Phase 12.2 upstream evidence
|--------------------------------------------------------------------------
*/

const upstream =
  Object.freeze({
    phase:
      "12.2",

    layer:
      "VRM_TELEMETRY_DATABASE_INTEGRATION",

    status:
      "EXECUTED",

    executed:
      true,

    scope:
      "SITE",

    scopeIdentity:
      Object.freeze({
        vrmSiteId:
          "VRM-12-3-TEST",
      }),

    horizon:
      Object.freeze({
        start:
          "2026-09-10T00:00:00.000Z",

        end:
          "2026-09-10T01:00:00.000Z",

        interval:
          "[start,end)",
      }),

    evidenceRefs:
      Object.freeze([
        "phase-12.2-pass",
      ]),
  });


/*
|--------------------------------------------------------------------------
| Deterministic telemetry evidence
|--------------------------------------------------------------------------
|
| GRID
|   ↓
| INVERTING
|   ↓
| GENERATOR
|   ↓
| GRID
|
| Expected:
|
| one GRID_OUTAGE
| 00:02 → 00:10
| duration = 480 seconds
|--------------------------------------------------------------------------
*/

const records = [
  {
    _id:
      "68c100000000000000000001",

    timestamp:
      "2026-09-10T00:00:00.000Z",

    numericValue:
      1,

    value:
      1,
  },

  {
    _id:
      "68c100000000000000000002",

    timestamp:
      "2026-09-10T00:02:00.000Z",

    numericValue:
      240,

    value:
      240,
  },

  {
    _id:
      "68c100000000000000000003",

    timestamp:
      "2026-09-10T00:05:00.000Z",

    numericValue:
      2,

    value:
      2,
  },

  {
    _id:
      "68c100000000000000000004",

    timestamp:
      "2026-09-10T00:10:00.000Z",

    numericValue:
      1,

    value:
      1,
  },
];


/*
|--------------------------------------------------------------------------
| Telemetry reader spy
|--------------------------------------------------------------------------
*/

let readCalls =
  0;

let readArgs =
  null;


const telemetryReader =
  async (
    args
  ) => {
    readCalls +=
      1;

    readArgs = {
      ...args,
    };

    return {
      installation:
        "installation-12-3",

      site:
        "site-12-3",

      records,
    };
  };


/*
|--------------------------------------------------------------------------
| Event persistence spy
|--------------------------------------------------------------------------
*/

let persistCalls =
  0;

let persisted =
  null;

let persistOptions =
  null;


const eventPersister =
  async (
    episodes,
    options
  ) => {
    persistCalls +=
      1;

    persisted =
      episodes;

    persistOptions = {
      ...options,
    };

    return {
      results:
        episodes.map(
          (
            episode
          ) => ({
            action:
              options.dryRun
                ? "WOULD_CREATE"
                : "CREATED",

            payload:
              episode,
          })
        ),

      summary: {
        total:
          episodes.length,
      },
    };
  };


/*
|--------------------------------------------------------------------------
| Qualification
|--------------------------------------------------------------------------
*/

const qualified =
  qualifyTelemetryEventsReliabilityIntegration({
    upstreamIntegration:
      upstream,

    telemetryReader,

    eventDetector:
      detectGridInterruptionEpisodes,

    eventPersister,

    reliabilityProjector:
      calculateReliabilitySiteTime,
  });


assert.equal(
  qualified.status,
  "QUALIFIED"
);

assert.equal(
  qualified.executed,
  false
);

pass(
  "valid executed Phase 12.2 SITE evidence qualifies"
);


assert.equal(
  readCalls,
  0
);

assert.equal(
  persistCalls,
  0
);

pass(
  "qualification performs no database read or event persistence"
);


assert.strictEqual(
  qualified
    .scopeIdentity,
  upstream
    .scopeIdentity
);

assert.strictEqual(
  qualified
    .horizon,
  upstream
    .horizon
);

assert.strictEqual(
  qualified
    .evidenceRefs,
  upstream
    .evidenceRefs
);

pass(
  "SITE identity, horizon, and evidence propagate unchanged"
);


/*
|--------------------------------------------------------------------------
| Execute deterministic integration
|--------------------------------------------------------------------------
*/

const result =
  await executeTelemetryEventsReliabilityIntegration({
    qualifiedIntegration:
      qualified,
  });


assert.equal(
  result.status,
  "EXECUTED"
);

assert.equal(
  result.executed,
  true
);

pass(
  "12.3 executes through injected production interfaces"
);


assert.equal(
  readCalls,
  1
);

assert.equal(
  persistCalls,
  1
);

pass(
  "telemetry read and event persistence are delegated exactly once"
);


assert.equal(
  readArgs.vrmSiteId,
  "VRM-12-3-TEST"
);

assert.equal(
  readArgs.start,
  upstream.horizon.start
);

assert.equal(
  readArgs.end,
  upstream.horizon.end
);

assert.equal(
  readArgs.interval,
  "[start,end)"
);

pass(
  "telemetry reader receives exact SITE identity and [start,end) horizon"
);


assert.equal(
  result
    .telemetry
    .recordCount,
  4
);

assert.equal(
  result
    .events
    .episodeCount,
  1
);

pass(
  "database telemetry flows to one physical interruption episode"
);


/*
|--------------------------------------------------------------------------
| Detector semantics
|--------------------------------------------------------------------------
*/

const episode =
  persisted[0];


assert.equal(
  episode.eventType,
  "GRID_OUTAGE"
);

assert.equal(
  episode.status,
  "RESTORED"
);

assert.equal(
  episode.durationSeconds,
  480
);

pass(
  "GRID → INVERTING → GENERATOR → GRID is one restored 480-second episode"
);


assert.equal(
  episode
    .intermediateTransitions
    .length,
  1
);

assert.equal(
  episode
    .intermediateTransitions[0]
    .from,
  240
);

assert.equal(
  episode
    .intermediateTransitions[0]
    .to,
  2
);

pass(
  "non-grid source transition does not falsely restore grid"
);


assert.equal(
  episode
    .gridSourceInterrupted,
  true
);

assert.equal(
  episode
    .loadInterruptionConfirmed,
  false
);

assert.equal(
  episode
    .gridElectricalAbsenceConfirmed,
  false
);

pass(
  "grid-source/customer/electrical-outage distinction is preserved"
);


/*
|--------------------------------------------------------------------------
| Persistence safety
|--------------------------------------------------------------------------
*/

assert.equal(
  persistOptions.dryRun,
  true
);

pass(
  "event persistence defaults to dry-run safety"
);


/*
|--------------------------------------------------------------------------
| Reliability projection
|--------------------------------------------------------------------------
*/

assert.equal(
  result
    .reliability
    .totalSeconds,
  480
);

assert.equal(
  result
    .reliability
    .activeEpisodeCount,
  1
);

assert.equal(
  result
    .reliability
    .startedEpisodeCount,
  1
);

assert.equal(
  result
    .reliability
    .affectedInstallationCount,
  1
);

pass(
  "existing reliability episode engine consumes exact scoped evidence"
);


/*
|--------------------------------------------------------------------------
| No telemetry
|--------------------------------------------------------------------------
*/

const emptyQualified =
  qualifyTelemetryEventsReliabilityIntegration({
    upstreamIntegration:
      upstream,

    telemetryReader:
      async () => ({
        installation:
          "installation-12-3",

        site:
          "site-12-3",

        records:
          [],
      }),

    eventDetector:
      detectGridInterruptionEpisodes,

    eventPersister:
      async (
        episodes
      ) => ({
        results:
          [],

        summary: {
          total:
            episodes.length,
        },
      }),

    reliabilityProjector:
      calculateReliabilitySiteTime,
  });


const emptyResult =
  await executeTelemetryEventsReliabilityIntegration({
    qualifiedIntegration:
      emptyQualified,
  });


assert.equal(
  emptyResult
    .events
    .episodeCount,
  0
);

assert.equal(
  emptyResult
    .reliability
    .totalSeconds,
  0
);

pass(
  "missing telemetry does not create an outage episode"
);


/*
|--------------------------------------------------------------------------
| Window begins non-grid
|--------------------------------------------------------------------------
*/

const startsNonGrid =
  detectGridInterruptionEpisodes({
    records: [
      {
        timestamp:
          "2026-09-10T00:00:00.000Z",

        numericValue:
          240,

        value:
          240,
      },

      {
        timestamp:
          "2026-09-10T00:04:00.000Z",

        numericValue:
          2,

        value:
          2,
      },

      {
        timestamp:
          "2026-09-10T00:08:00.000Z",

        numericValue:
          1,

        value:
          1,
      },
    ],

    installation:
      "installation-12-3",
  });


assert.equal(
  startsNonGrid
    .episodes
    .length,
  0
);

pass(
  "window beginning non-grid does not invent an outage start"
);


/*
|--------------------------------------------------------------------------
| Open interruption
|--------------------------------------------------------------------------
*/

const openResult =
  detectGridInterruptionEpisodes({
    records: [
      {
        timestamp:
          "2026-09-10T00:00:00.000Z",

        numericValue:
          1,

        value:
          1,
      },

      {
        timestamp:
          "2026-09-10T00:02:00.000Z",

        numericValue:
          240,

        value:
          240,
      },
    ],

    installation:
      "installation-12-3",

    minimumDurationSeconds:
      60,

    closeOpenAtEnd:
      false,

    streamEndTime:
      null,
  });


assert.equal(
  openResult
    .episodes
    .length,
  1
);

assert.equal(
  openResult
    .episodes[0]
    .status,
  "OPEN"
);

assert.equal(
  openResult
    .episodes[0]
    .endTime,
  null
);

pass(
  "stream end does not fabricate restoration"
);


/*
|--------------------------------------------------------------------------
| Qualification rejection cases
|--------------------------------------------------------------------------
*/

expectThrow(
  () =>
    qualifyTelemetryEventsReliabilityIntegration({
      upstreamIntegration:
        null,

      telemetryReader,

      eventDetector:
        detectGridInterruptionEpisodes,

      eventPersister,

      reliabilityProjector:
        calculateReliabilitySiteTime,
    }),

  /upstreamIntegration must be an object/,

  "missing Phase 12.2 evidence is rejected"
);


expectThrow(
  () =>
    qualifyTelemetryEventsReliabilityIntegration({
      upstreamIntegration: {
        ...upstream,

        status:
          "ERROR",

        executed:
          false,
      },

      telemetryReader,

      eventDetector:
        detectGridInterruptionEpisodes,

      eventPersister,

      reliabilityProjector:
        calculateReliabilitySiteTime,
    }),

  /successfully executed/,

  "failed Phase 12.2 evidence is rejected"
);


expectThrow(
  () =>
    qualifyTelemetryEventsReliabilityIntegration({
      upstreamIntegration: {
        ...upstream,

        scope:
          "FLEET",

        scopeIdentity: {
          fleetId:
            "FLEET-12-3",
        },
      },

      telemetryReader,

      eventDetector:
        detectGridInterruptionEpisodes,

      eventPersister,

      reliabilityProjector:
        calculateReliabilitySiteTime,
    }),

  /requires SITE scope/,

  "FLEET evidence is rejected"
);


expectThrow(
  () =>
    qualifyTelemetryEventsReliabilityIntegration({
      upstreamIntegration:
        upstream,

      telemetryReader:
        null,

      eventDetector:
        detectGridInterruptionEpisodes,

      eventPersister,

      reliabilityProjector:
        calculateReliabilitySiteTime,
    }),

  /telemetryReader must be a function/,

  "missing telemetry reader is rejected"
);


expectThrow(
  () =>
    qualifyTelemetryEventsReliabilityIntegration({
      upstreamIntegration:
        upstream,

      telemetryReader,

      eventDetector:
        null,

      eventPersister,

      reliabilityProjector:
        calculateReliabilitySiteTime,
    }),

  /eventDetector must be a function/,

  "missing event detector is rejected"
);


expectThrow(
  () =>
    qualifyTelemetryEventsReliabilityIntegration({
      upstreamIntegration:
        upstream,

      telemetryReader,

      eventDetector:
        detectGridInterruptionEpisodes,

      eventPersister:
        null,

      reliabilityProjector:
        calculateReliabilitySiteTime,
    }),

  /eventPersister must be a function/,

  "missing event persister is rejected"
);


expectThrow(
  () =>
    qualifyTelemetryEventsReliabilityIntegration({
      upstreamIntegration:
        upstream,

      telemetryReader,

      eventDetector:
        detectGridInterruptionEpisodes,

      eventPersister,

      reliabilityProjector:
        null,
    }),

  /reliabilityProjector must be a function/,

  "missing reliability projector is rejected"
);


expectThrow(
  () =>
    qualifyTelemetryEventsReliabilityIntegration({
      upstreamIntegration:
        upstream,

      telemetryReader,

      eventDetector:
        detectGridInterruptionEpisodes,

      eventPersister,

      reliabilityProjector:
        calculateReliabilitySiteTime,

      options: {
        minimumDurationSeconds:
          -1,
      },
    }),

  /non-negative number/,

  "negative outage duration is rejected"
);


expectThrow(
  () =>
    qualifyTelemetryEventsReliabilityIntegration({
      upstreamIntegration:
        upstream,

      telemetryReader,

      eventDetector:
        detectGridInterruptionEpisodes,

      eventPersister,

      reliabilityProjector:
        calculateReliabilitySiteTime,

      options: {
        dryRun:
          "true",
      },
    }),

  /dryRun must be a boolean/,

  "non-boolean dryRun is rejected"
);


/*
|--------------------------------------------------------------------------
| Production source verification
|--------------------------------------------------------------------------
*/

function readSource(
  relativePath
) {
  return fs.readFileSync(
    path.join(
      root,
      relativePath
    ),
    "utf8"
  );
}


const eventDetectionSource =
  readSource(
    "services/events/eventDetectionService.js"
  );

const gridOutageSource =
  readSource(
    "services/events/gridOutageDetector.js"
  );

const gridRestorationSource =
  readSource(
    "services/events/gridRestorationDetector.js"
  );

const persistenceSource =
  readSource(
    "services/events/outageEventPersistenceService.js"
  );

const modelSource =
  readSource(
    "models/OutageEvent.js"
  );

const episodeSource =
  readSource(
    "services/reliability/reliabilityEpisodeService.js"
  );

const indicesSource =
  readSource(
    "services/reliability/reliabilityIndicesService.js"
  );

const technicalSource =
  readSource(
    "services/reliability/technicalReliabilityService.js"
  );


assert.match(
  eventDetectionSource,
  /Installation\.status === "OFFLINE" is an electrical outage/
);

assert.match(
  eventDetectionSource,
  /persist OutageEvent documents/
);

pass(
  "generic detector preserves monitoring-versus-electrical-event boundary"
);


assert.match(
  gridOutageSource,
  /Monitoring OFFLINE != electrical grid outage/
);

assert.match(
  gridOutageSource,
  /prefers false negatives over false positives/
);

pass(
  "grid outage detector remains conservative"
);


assert.match(
  gridOutageSource,
  /Contradictory evidence remains UNKNOWN/
);

assert.match(
  gridOutageSource,
  /Missing telemetry must never be interpreted as electrical[\s\S]*restoration/
);

pass(
  "contradictory or missing telemetry cannot fabricate restoration"
);


assert.match(
  gridRestorationSource,
  /Only return to GRID closes the grid interruption/
);

assert.match(
  gridRestorationSource,
  /loadInterruptionConfirmed:[\s\S]*false/
);

assert.match(
  gridRestorationSource,
  /gridElectricalAbsenceConfirmed:[\s\S]*false/
);

pass(
  "active-source detector preserves qualified grid-interruption semantics"
);


assert.match(
  persistenceSource,
  /export async function persistGridEpisode/
);

assert.match(
  persistenceSource,
  /export async function persistGridEpisodes/
);

pass(
  "existing outage persistence API is present"
);


assert.match(
  persistenceSource,
  /EXACT_START/
);

assert.match(
  persistenceSource,
  /GRID_DEPARTURE_EVIDENCE/
);

assert.match(
  persistenceSource,
  /DUPLICATE_CONCURRENT/
);

pass(
  "persistence retains deterministic/evidence deduplication and concurrency protection"
);


assert.match(
  persistenceSource,
  /Never downgrade RESTORED -> OPEN/
);

assert.match(
  persistenceSource,
  /OPEN -> RESTORED is the primary production lifecycle/
);

pass(
  "persisted outage lifecycle cannot regress"
);


assert.match(
  modelSource,
  /installation:\s*1,[\s\S]*eventType:\s*1,[\s\S]*startTime:\s*1/
);

assert.match(
  modelSource,
  /unique:\s*true/
);

assert.match(
  modelSource,
  /uniq_installation_outage_type_start/
);

pass(
  "OutageEvent retains deterministic unique identity"
);


assert.match(
  episodeSource,
  /\[periodStart, periodEnd\)/
);

assert.match(
  episodeSource,
  /originalStart/
);

assert.match(
  episodeSource,
  /mergeReliabilityIntervals/
);

pass(
  "reliability episodes preserve half-open clipping and overlap merging"
);


assert.match(
  indicesSource,
  /OutageEvent[\s\S]*\.find\(\{/
);

pass(
  "production reliability indices consume persisted OutageEvent evidence"
);


assert.match(
  technicalSource,
  /FailureEvent[\s\S]*\.find\(\{\}\)/
);

pass(
  "technical reliability remains a separate FailureEvent production path"
);


assert.equal(
  qualified.boundaries
    .siteScopedGlobalReliabilityIndicesInvoked,
  false
);

assert.equal(
  qualified.boundaries
    .siteScopedTechnicalReliabilityInvoked,
  false
);

pass(
  "12.3 retains discovered SITE/global scope boundary"
);


/*
|--------------------------------------------------------------------------
| Final assertion count
|--------------------------------------------------------------------------
*/

assert.equal(
  checks,
  45
);

pass(
  "12.3 assertion plan completed exactly"
);


console.log("");
console.log(
  `Assertions passed: ${checks}`
);

console.log(
  "================================================"
);

console.log(
  "ASHMAAN PHASE 12.3 DATABASE → EVENTS / RELIABILITY INTEGRATION PASSED"
);

console.log(
  "================================================"
);