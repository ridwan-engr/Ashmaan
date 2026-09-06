/*
|--------------------------------------------------------------------------
| ASHMAAN Event Detection Service
|--------------------------------------------------------------------------
|
| Purpose:
|
| Convert ordered telemetry records into candidate state-transition events.
|
| IMPORTANT:
|
| This service does NOT:
|
| - decide that Installation.status === "OFFLINE" is an electrical outage
| - persist OutageEvent documents
| - persist FailureEvent documents
| - assume specific VRM Grid/Generator/Battery state values
|
| Electrical meaning is supplied later by a detector-specific rule.
|
|--------------------------------------------------------------------------
*/


const DEFAULT_ALLOWED_QUALITY = [
  "VALID",
  "ESTIMATED",
];


/*
|--------------------------------------------------------------------------
| Basic value helpers
|--------------------------------------------------------------------------
*/


const isDefined = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "";


const toNumericValue = (value) => {
  if (!isDefined(value)) {
    return null;
  }

  const numeric =
    Number(value);

  return Number.isFinite(numeric)
    ? numeric
    : null;
};


const getTelemetryValue = (
  record
) => {
  if (!record) {
    return null;
  }

  if (
    isDefined(
      record.numericValue
    )
  ) {
    return record.numericValue;
  }

  if (
    isDefined(
      record.value
    )
  ) {
    return record.value;
  }

  return null;
};


const normalizeText = (value) => {
  if (!isDefined(value)) {
    return null;
  }

  return String(value)
    .trim()
    .toUpperCase();
};


/*
|--------------------------------------------------------------------------
| Timestamp helpers
|--------------------------------------------------------------------------
*/


const getValidTimestamp = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};


/*
|--------------------------------------------------------------------------
| Telemetry quality
|--------------------------------------------------------------------------
*/


const isUsableTelemetryRecord = (
  record,
  {
    allowedQuality =
      DEFAULT_ALLOWED_QUALITY,
  } = {}
) => {
  if (!record) {
    return false;
  }

  const timestamp =
    getValidTimestamp(
      record.timestamp
    );

  if (!timestamp) {
    return false;
  }

  const value =
    getTelemetryValue(
      record
    );

  if (!isDefined(value)) {
    return false;
  }

  /*
   * Older records may not yet have quality.
   *
   * Missing quality alone should not cause
   * automatic rejection at this stage.
   */
  if (!record.quality) {
    return true;
  }

  return allowedQuality.includes(
    String(
      record.quality
    ).toUpperCase()
  );
};


/*
|--------------------------------------------------------------------------
| Signal identity
|--------------------------------------------------------------------------
|
| A signal belongs to a logical:
|
| installation
| + deviceType
| + deviceInstance
| + parameter
|
|--------------------------------------------------------------------------
*/


const buildSignalKey = (
  record
) => {
  if (!record) {
    return null;
  }

  const installation =
    record.installation
      ? String(
          record.installation
        )
      : null;

  const deviceType =
    record.deviceType ??
    "UNKNOWN_DEVICE";

  const deviceInstance =
    record.deviceInstance ??
    "UNKNOWN_INSTANCE";

  const parameter =
    record.parameter ??
    record.description ??
    null;

  if (
    !installation ||
    !parameter
  ) {
    return null;
  }

  return [
    installation,
    deviceType,
    deviceInstance,
    parameter,
  ].join("|");
};


/*
|--------------------------------------------------------------------------
| Evidence builder
|--------------------------------------------------------------------------
*/


const buildEvidence = (
  record
) => {
  if (!record) {
    return null;
  }

  return {
    telemetryId:
      record._id ||
      null,

    parameter:
      record.parameter ||
      record.description ||
      null,

    value:
      getTelemetryValue(
        record
      ),

    timestamp:
      getValidTimestamp(
        record.timestamp
      ),
  };
};


/*
|--------------------------------------------------------------------------
| Telemetry preparation
|--------------------------------------------------------------------------
*/


const prepareTelemetryRecords = (
  records = [],
  options = {}
) => {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .filter(
      (record) =>
        isUsableTelemetryRecord(
          record,
          options
        )
    )
    .map((record) => ({
      ...record,

      _eventTimestamp:
        getValidTimestamp(
          record.timestamp
        ),

      _eventValue:
        getTelemetryValue(
          record
        ),

      _signalKey:
        buildSignalKey(
          record
        ),
    }))
    .filter(
      (record) =>
        record._signalKey
    )
    .sort(
      (a, b) =>
        a._eventTimestamp -
        b._eventTimestamp
    );
};


/*
|--------------------------------------------------------------------------
| Group telemetry by signal
|--------------------------------------------------------------------------
*/


const groupTelemetryBySignal = (
  records = []
) => {
  const groups =
    new Map();

  for (
    const record
    of records
  ) {
    const key =
      record._signalKey ||
      buildSignalKey(
        record
      );

    if (!key) {
      continue;
    }

    if (
      !groups.has(key)
    ) {
      groups.set(
        key,
        []
      );
    }

    groups
      .get(key)
      .push(record);
  }

  return groups;
};


/*
|--------------------------------------------------------------------------
| Generic state-transition detector
|--------------------------------------------------------------------------
|
| classifier(record) must return one of:
|
| "NORMAL"
| "FAULT"
| "UNKNOWN"
|
| Example later:
|
| classifier(record)
|   -> "FAULT"    when verified grid-loss state is present
|   -> "NORMAL"   when verified grid-restored state is present
|   -> "UNKNOWN"  otherwise
|
|--------------------------------------------------------------------------
*/


const detectStateTransitions = ({
  records = [],

  classifier,

  minimumFaultDurationSeconds =
    0,

  confidence =
    1,
} = {}) => {
  if (
    typeof classifier !==
    "function"
  ) {
    throw new Error(
      "detectStateTransitions requires a classifier function."
    );
  }


  const preparedRecords =
    prepareTelemetryRecords(
      records
    );


  const groups =
    groupTelemetryBySignal(
      preparedRecords
    );


  const candidates =
    [];


  for (
    const [
      signalKey,
      signalRecords,
    ]
    of groups.entries()
  ) {
    let currentFault =
      null;

    let previousState =
      "UNKNOWN";


    for (
      const record
      of signalRecords
    ) {
      const state =
        classifier(record);


      /*
       * Ignore records whose electrical
       * meaning is unknown.
       */
      if (
        state !== "NORMAL" &&
        state !== "FAULT"
      ) {
        continue;
      }


      /*
       * Start fault candidate.
       */
      if (
        state === "FAULT" &&
        previousState !==
          "FAULT"
      ) {
        currentFault = {
          signalKey,

          installation:
            record.installation,

          device:
            record.device ||
            null,

          deviceType:
            record.deviceType ||
            null,

          deviceInstance:
            record.deviceInstance ??
            null,

          parameter:
            record.parameter ||
            record.description ||
            null,

          startTime:
            record._eventTimestamp,

          endTime:
            null,

          durationSeconds:
            null,

          status:
            "OPEN",

          detectionEvidence: [
            buildEvidence(
              record
            ),
          ],

          restorationEvidence:
            [],

          confidence,
        };
      }


      /*
       * Restoration transition.
       */
      if (
        state === "NORMAL" &&
        previousState ===
          "FAULT" &&
        currentFault
      ) {
        const endTime =
          record._eventTimestamp;

        const durationSeconds =
          Math.max(
            0,
            Math.round(
              (
                endTime.getTime() -
                currentFault
                  .startTime
                  .getTime()
              ) / 1000
            )
          );


        currentFault.endTime =
          endTime;

        currentFault.durationSeconds =
          durationSeconds;

        currentFault.status =
          "RESTORED";

        currentFault
          .restorationEvidence
          .push(
            buildEvidence(
              record
            )
          );


        /*
         * Noise/debounce protection.
         *
         * A detector may require a minimum
         * duration before the candidate
         * is accepted.
         */
        if (
          durationSeconds >=
          minimumFaultDurationSeconds
        ) {
          candidates.push(
            currentFault
          );
        }


        currentFault =
          null;
      }


      previousState =
        state;
    }


    /*
     * If telemetry ends while fault
     * state is still active, preserve
     * an OPEN candidate.
     */
    if (
      currentFault
    ) {
      candidates.push(
        currentFault
      );
    }
  }


  return candidates;
};


/*
|--------------------------------------------------------------------------
| Candidate validation
|--------------------------------------------------------------------------
*/


const validateEventCandidate = (
  candidate
) => {
  const errors =
    [];


  if (
    !candidate
      ?.installation
  ) {
    errors.push(
      "installation is required"
    );
  }


  if (
    !getValidTimestamp(
      candidate?.startTime
    )
  ) {
    errors.push(
      "valid startTime is required"
    );
  }


  if (
    candidate?.endTime
  ) {
    const start =
      getValidTimestamp(
        candidate.startTime
      );

    const end =
      getValidTimestamp(
        candidate.endTime
      );

    if (
      !end
    ) {
      errors.push(
        "endTime is invalid"
      );
    }

    if (
      start &&
      end &&
      end < start
    ) {
      errors.push(
        "endTime cannot precede startTime"
      );
    }
  }


  return {
    valid:
      errors.length === 0,

    errors,
  };
};


/*
|--------------------------------------------------------------------------
| Candidate summary
|--------------------------------------------------------------------------
*/


const summarizeCandidates = (
  candidates = []
) => {
  const summary = {
    total:
      candidates.length,

    open:
      0,

    restored:
      0,

    invalid:
      0,
  };


  for (
    const candidate
    of candidates
  ) {
    const validation =
      validateEventCandidate(
        candidate
      );


    if (
      !validation.valid
    ) {
      summary.invalid +=
        1;

      continue;
    }


    if (
      candidate.status ===
      "OPEN"
    ) {
      summary.open +=
        1;
    }


    if (
      candidate.status ===
      "RESTORED"
    ) {
      summary.restored +=
        1;
    }
  }


  return summary;
};


export {
  DEFAULT_ALLOWED_QUALITY,

  isDefined,
  toNumericValue,
  normalizeText,

  getTelemetryValue,
  getValidTimestamp,

  isUsableTelemetryRecord,

  buildSignalKey,
  buildEvidence,

  prepareTelemetryRecords,
  groupTelemetryBySignal,

  detectStateTransitions,

  validateEventCandidate,
  summarizeCandidates,
};