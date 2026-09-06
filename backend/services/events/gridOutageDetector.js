// backend/services/events/gridOutageDetector.js

import {
  prepareTelemetryRecords,
  buildEvidence,
  getTelemetryValue,
  getValidTimestamp,
} from "./eventDetectionService.js";

/*
|--------------------------------------------------------------------------
| ASHMAAN Grid Outage Detector
|--------------------------------------------------------------------------
|
| Purpose:
|   Convert normalized VRM telemetry into GRID AVAILABILITY candidates.
|
| Important:
|   Monitoring OFFLINE != electrical grid outage.
|
|   This detector does NOT use Installation.status.
|
|   It also does NOT assume that "System state" numeric values directly
|   represent grid availability because the fleet audit showed several
|   values (0, 2, 3, 4, 5, 6, 8, 9, 252) whose electrical semantics have
|   not yet been proven.
|
| Evidence currently supported:
|
|   1. System overview -> AC Input 1 connected
|   2. System overview -> AC Input 2 connected
|   3. System overview -> AC-Input
|   4. System overview -> Active Input Service Type
|   5. VE.Bus System   -> Active input
|   6. VE.Bus System   -> Input frequency 1/2/3
|   7. Grid meter      -> voltage/frequency signals
|
| The detector intentionally prefers false negatives over false positives.
|
|--------------------------------------------------------------------------
*/


const STATE = Object.freeze({
  GRID_AVAILABLE: "GRID_AVAILABLE",
  GRID_UNAVAILABLE: "GRID_UNAVAILABLE",
  UNKNOWN: "UNKNOWN",
});


const SIGNAL_TYPE = Object.freeze({
  AC_INPUT_CONNECTED: "AC_INPUT_CONNECTED",
  AC_INPUT_SELECTION: "AC_INPUT_SELECTION",
  ACTIVE_INPUT_SERVICE_TYPE: "ACTIVE_INPUT_SERVICE_TYPE",
  INPUT_FREQUENCY: "INPUT_FREQUENCY",
  GRID_VOLTAGE: "GRID_VOLTAGE",
  GRID_FREQUENCY: "GRID_FREQUENCY",
  SYSTEM_STATE: "SYSTEM_STATE",
  OTHER: "OTHER",
});


/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
|
| These are detection thresholds, not utility-quality standards.
|
| A grid voltage/frequency value near zero is useful evidence that the
| measured AC source has disappeared.
|
| Nominal values around 230 V / 50 Hz are evidence of AC presence.
|
| Because equipment configuration varies across the fleet, voltage and
| frequency alone are supporting signals unless their semantics are
| explicitly grid-specific.
|
*/

const DEFAULT_CONFIG = Object.freeze({
  minimumOutageDurationSeconds: 60,

  zeroVoltageThreshold: 20,
  presentVoltageThreshold: 100,

  zeroFrequencyThreshold: 5,
  presentFrequencyMin: 40,
  presentFrequencyMax: 70,

  minimumFaultScore: 3,
  minimumNormalScore: 2,

  highConfidenceScore: 5,
});


function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toLowerCase();
}


function numericValue(record) {
  const value = getTelemetryValue(record);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}


function parameterName(record) {
  return normalizeText(record?.parameter || record?.description);
}


function deviceType(record) {
  return normalizeText(record?.deviceType);
}


function identifySignalType(record) {
  const parameter = parameterName(record);
  const type = deviceType(record);

  if (
    type === "system overview" &&
    /^ac input [123] connected$/.test(parameter)
  ) {
    return SIGNAL_TYPE.AC_INPUT_CONNECTED;
  }

  if (
    type === "system overview" &&
    parameter === "ac-input"
  ) {
    return SIGNAL_TYPE.AC_INPUT_SELECTION;
  }

  if (
    type === "system overview" &&
    parameter === "active input service type"
  ) {
    return SIGNAL_TYPE.ACTIVE_INPUT_SERVICE_TYPE;
  }

  if (
    type === "ve.bus system" &&
    parameter === "active input"
  ) {
    return SIGNAL_TYPE.AC_INPUT_SELECTION;
  }

  if (
    type === "ve.bus system" &&
    /^input frequency [123]$/.test(parameter)
  ) {
    return SIGNAL_TYPE.INPUT_FREQUENCY;
  }

  if (
    type === "grid meter" &&
    parameter.includes("voltage") &&
    !parameter.includes("protective earth")
  ) {
    return SIGNAL_TYPE.GRID_VOLTAGE;
  }

  if (
    type === "grid meter" &&
    parameter.includes("frequency")
  ) {
    return SIGNAL_TYPE.GRID_FREQUENCY;
  }

  if (
    type === "system overview" &&
    parameter === "system state"
  ) {
    return SIGNAL_TYPE.SYSTEM_STATE;
  }

  return SIGNAL_TYPE.OTHER;
}


/*
|--------------------------------------------------------------------------
| AC connected state
|--------------------------------------------------------------------------
|
| Audit result:
|
| System overview | AC Input 1 connected
|   Values: 1, 0
|
| System overview | AC Input 2 connected
|   Values: 0, 1
|
| We can safely interpret:
|
|   1 -> that AC input is connected
|   0 -> that AC input is not connected
|
| This still does NOT automatically tell us whether the input represents
| grid or generator. Therefore the signal receives strong evidence weight,
| but the detector must consider source/service metadata when available.
|
*/

function classifyConnectedSignal(record) {
  const value =
    numericValue(record);

  if (
    value !== 0 &&
    value !== 1
  ) {
    return {
      state: STATE.UNKNOWN,
      score: 0,
      reason:
        "Unsupported AC input connected-state value",
    };
  }

  return {
    state: STATE.UNKNOWN,
    score: 0,
    reason:
      `AC input connected=${value}; retained as context only and not interpreted as grid availability`,
  };
}


/*
|--------------------------------------------------------------------------
| Input selection state
|--------------------------------------------------------------------------
|
| Fleet audit showed:
|
| System overview AC-Input:
|   1, 2, 240
|
| VE.Bus Active input:
|   0, 1, 240
|
| These codes are NOT yet mapped to "grid" vs "generator" with sufficient
| certainty.
|
| Therefore they are retained as contextual evidence only.
|
*/

function classifyInputSelection(record) {
  const value = numericValue(record);

  if (value === null) {
    return {
      state: STATE.UNKNOWN,
      score: 0,
      reason: "Input selection is non-numeric",
    };
  }

  return {
    state: STATE.UNKNOWN,
    score: 0,
    reason: `Input selection code ${value} requires source mapping`,
  };
}


/*
|--------------------------------------------------------------------------
| Active Input Service Type
|--------------------------------------------------------------------------
|
| Audit values:
|
|   vebus
|   genset
|
| "genset" is useful context but does NOT by itself prove that the grid
| failed. A generator can be selected for reasons other than utility outage.
|
*/

function classifyServiceType(record) {
  const value = normalizeText(getTelemetryValue(record));

  if (!value) {
    return {
      state: STATE.UNKNOWN,
      score: 0,
      reason: "Missing active input service type",
    };
  }

  if (value === "genset") {
    return {
      state: STATE.UNKNOWN,
      score: 1,
      reason: "Generator service is active; possible supporting outage evidence",
    };
  }

  if (value === "vebus") {
    return {
      state: STATE.UNKNOWN,
      score: 0,
      reason: "VE.Bus service active; grid availability not proven",
    };
  }

  return {
    state: STATE.UNKNOWN,
    score: 0,
    reason: `Unmapped active input service type: ${value}`,
  };
}


function classifyFrequencySignal(record, config) {
  const value = numericValue(record);

  if (value === null) {
    return {
      state: STATE.UNKNOWN,
      score: 0,
      reason: "Frequency value is not numeric",
    };
  }

  if (value <= config.zeroFrequencyThreshold) {
    return {
      state: STATE.GRID_UNAVAILABLE,
      score: 2,
      reason: `AC input frequency collapsed to ${value}`,
    };
  }

  if (
    value >= config.presentFrequencyMin &&
    value <= config.presentFrequencyMax
  ) {
    return {
      state: STATE.GRID_AVAILABLE,
      score: 2,
      reason: `AC frequency present at ${value}`,
    };
  }

  return {
    state: STATE.UNKNOWN,
    score: 0,
    reason: `Frequency ${value} is outside classification range`,
  };
}


function classifyGridVoltage(record, config) {
  const value = numericValue(record);

  if (value === null) {
    return {
      state: STATE.UNKNOWN,
      score: 0,
      reason: "Grid voltage is not numeric",
    };
  }

  if (Math.abs(value) <= config.zeroVoltageThreshold) {
    return {
      state: STATE.GRID_UNAVAILABLE,
      score: 2,
      reason: `Grid meter voltage collapsed to ${value}`,
    };
  }

  if (Math.abs(value) >= config.presentVoltageThreshold) {
    return {
      state: STATE.GRID_AVAILABLE,
      score: 2,
      reason: `Grid meter voltage present at ${value}`,
    };
  }

  return {
    state: STATE.UNKNOWN,
    score: 0,
    reason: `Grid voltage ${value} is indeterminate`,
  };
}


function classifyGridFrequency(record, config) {
  return classifyFrequencySignal(record, config);
}


function classifySystemState(record) {
  const value = getTelemetryValue(record);

  return {
    state: STATE.UNKNOWN,
    score: 0,
    reason: `System state ${value} retained as context only`,
  };
}


function classifyRecord(record, config = DEFAULT_CONFIG) {
  const signalType = identifySignalType(record);

  let classification;

  switch (signalType) {
    case SIGNAL_TYPE.AC_INPUT_CONNECTED:
      classification = classifyConnectedSignal(record);
      break;

    case SIGNAL_TYPE.AC_INPUT_SELECTION:
      classification = classifyInputSelection(record);
      break;

    case SIGNAL_TYPE.ACTIVE_INPUT_SERVICE_TYPE:
      classification = classifyServiceType(record);
      break;

    case SIGNAL_TYPE.INPUT_FREQUENCY:
      classification = classifyFrequencySignal(record, config);
      break;

    case SIGNAL_TYPE.GRID_VOLTAGE:
      classification = classifyGridVoltage(record, config);
      break;

    case SIGNAL_TYPE.GRID_FREQUENCY:
      classification = classifyGridFrequency(record, config);
      break;

    case SIGNAL_TYPE.SYSTEM_STATE:
      classification = classifySystemState(record);
      break;

    default:
      classification = {
        state: STATE.UNKNOWN,
        score: 0,
        reason: "Telemetry parameter is not a grid-outage signal",
      };
  }

  return {
    ...classification,
    signalType,
    record,
    timestamp: getValidTimestamp(record),
  };
}


/*
|--------------------------------------------------------------------------
| Timestamp grouping
|--------------------------------------------------------------------------
|
| VRM measurements from different signals will not always have exactly the
| same millisecond timestamp.
|
| We therefore place observations into time buckets.
|
*/

function bucketTimestamp(date, bucketSeconds = 60) {
  const milliseconds = date.getTime();
  const bucketMs = bucketSeconds * 1000;

  return new Date(
    Math.floor(milliseconds / bucketMs) * bucketMs
  );
}


function groupClassificationsByTime(
  classifications,
  bucketSeconds = 60
) {
  const groups = new Map();

  for (const item of classifications) {
    if (!item.timestamp) {
      continue;
    }

    const bucket = bucketTimestamp(
      item.timestamp,
      bucketSeconds
    );

    const key = bucket.toISOString();

    if (!groups.has(key)) {
      groups.set(key, {
        timestamp: bucket,
        classifications: [],
      });
    }

    groups.get(key).classifications.push(item);
  }

  return [...groups.values()].sort(
    (a, b) => a.timestamp - b.timestamp
  );
}


/*
|--------------------------------------------------------------------------
| Aggregate evidence
|--------------------------------------------------------------------------
*/

function aggregateTimeBucket(group, config) {
  let faultScore = 0;
  let normalScore = 0;
  let contextualScore = 0;

  const faultEvidence = [];
  const normalEvidence = [];
  const contextualEvidence = [];

  for (const item of group.classifications) {
    if (item.state === STATE.GRID_UNAVAILABLE) {
      faultScore += item.score;

      faultEvidence.push({
        ...buildEvidence(item.record),
        signalType: item.signalType,
        reason: item.reason,
        score: item.score,
      });
    } else if (item.state === STATE.GRID_AVAILABLE) {
      normalScore += item.score;

      normalEvidence.push({
        ...buildEvidence(item.record),
        signalType: item.signalType,
        reason: item.reason,
        score: item.score,
      });
    } else if (item.score > 0) {
      contextualScore += item.score;

      contextualEvidence.push({
        ...buildEvidence(item.record),
        signalType: item.signalType,
        reason: item.reason,
        score: item.score,
      });
    }
  }

  let state = STATE.UNKNOWN;

  /*
   * Contradictory evidence remains UNKNOWN.
   *
   * Example:
   *   one source says AC connected while another says frequency = 0.
   *
   * This protects the reliability database from false outage events.
   */

  if (
    faultScore >= config.minimumFaultScore &&
    normalScore === 0
  ) {
    state = STATE.GRID_UNAVAILABLE;
  } else if (
    normalScore >= config.minimumNormalScore &&
    faultScore === 0
  ) {
    state = STATE.GRID_AVAILABLE;
  }

  return {
    timestamp: group.timestamp,
    state,
    faultScore,
    normalScore,
    contextualScore,
    faultEvidence,
    normalEvidence,
    contextualEvidence,
  };
}


function calculateConfidence(score, config) {
  if (!score || score <= 0) {
    return 0;
  }

  return Math.min(
    1,
    score / config.highConfidenceScore
  );
}


/*
|--------------------------------------------------------------------------
| Build outage candidates
|--------------------------------------------------------------------------
*/

function buildOutageCandidates(states, config) {
  const candidates = [];

  let openCandidate = null;

  for (const state of states) {
    if (state.state === STATE.GRID_UNAVAILABLE) {
      if (!openCandidate) {
        openCandidate = {
          eventType: "GRID_OUTAGE",
          source: "DERIVED",
          status: "OPEN",

          startTime: state.timestamp,
          detectionTime: state.timestamp,

          restorationTime: null,
          endTime: null,
          durationSeconds: null,

          detectionMethod: "MULTI_SIGNAL",

          confidence: calculateConfidence(
            state.faultScore + state.contextualScore,
            config
          ),

          detectionEvidence: [
            ...state.faultEvidence,
            ...state.contextualEvidence,
          ],

          restorationEvidence: [],
        };
      } else {
        openCandidate.detectionEvidence.push(
          ...state.faultEvidence
        );

        openCandidate.confidence = Math.max(
          openCandidate.confidence,
          calculateConfidence(
            state.faultScore + state.contextualScore,
            config
          )
        );
      }

      continue;
    }

    if (
      state.state === STATE.GRID_AVAILABLE &&
      openCandidate
    ) {
      const restorationTime = state.timestamp;

      const durationSeconds = Math.max(
        0,
        Math.round(
          (
            restorationTime.getTime() -
            openCandidate.startTime.getTime()
          ) / 1000
        )
      );

      /*
       * Debounce short events.
       */

      if (
        durationSeconds >=
        config.minimumOutageDurationSeconds
      ) {
        candidates.push({
          ...openCandidate,

          status: "RESTORED",

          restorationTime,
          endTime: restorationTime,

          durationSeconds,

          restorationEvidence: [
            ...state.normalEvidence,
          ],

          confidence: Math.max(
            openCandidate.confidence,
            calculateConfidence(
              state.normalScore,
              config
            )
          ),
        });
      }

      openCandidate = null;
    }

    /*
     * UNKNOWN does not automatically restore an outage.
     *
     * Missing telemetry must never be interpreted as electrical
     * restoration.
     */
  }

  /*
   * Preserve an unresolved outage candidate.
   */

  if (openCandidate) {
    candidates.push(openCandidate);
  }

  return candidates;
}


/*
|--------------------------------------------------------------------------
| Main detector
|--------------------------------------------------------------------------
*/

export function detectGridOutages(
  records,
  options = {}
) {
  const config = {
    ...DEFAULT_CONFIG,
    ...options,
  };

  const prepared = prepareTelemetryRecords(records);

  const classifications = prepared
    .map((record) => classifyRecord(record, config))
    .filter(
      (item) =>
        item.signalType !== SIGNAL_TYPE.OTHER
    );

  const grouped = groupClassificationsByTime(
    classifications,
    options.bucketSeconds || 60
  );

  const states = grouped.map((group) =>
    aggregateTimeBucket(group, config)
  );

  const candidates = buildOutageCandidates(
    states,
    config
  );

  return {
    recordsReceived: Array.isArray(records)
      ? records.length
      : 0,

    recordsPrepared: prepared.length,

    relevantRecords: classifications.length,

    bucketsEvaluated: states.length,

    states,

    candidates,
  };
}


/*
|--------------------------------------------------------------------------
| Single-record diagnostic helper
|--------------------------------------------------------------------------
|
| Useful for tests and audit scripts.
|
*/

export function inspectGridSignal(
  record,
  options = {}
) {
  const config = {
    ...DEFAULT_CONFIG,
    ...options,
  };

  return classifyRecord(record, config);
}


export {
  STATE as GRID_STATE,
  SIGNAL_TYPE as GRID_SIGNAL_TYPE,
  DEFAULT_CONFIG as GRID_OUTAGE_DEFAULT_CONFIG,
};