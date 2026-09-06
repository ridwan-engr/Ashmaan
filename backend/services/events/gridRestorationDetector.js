// backend/services/events/gridRestorationDetector.js

/*
|--------------------------------------------------------------------------
| ASHMAAN Grid Restoration Detector
|--------------------------------------------------------------------------
|
| Confirmed VRM source:
|
|   System overview
|   vrmAttributeId: 471
|   dbusPath: /Ac/ActiveIn/Source
|
| Enum:
|
|   0   = Not available
|   1   = Grid
|   2   = Generator
|   3   = Shore
|   240 = Inverting
|
|--------------------------------------------------------------------------
|
| Purpose
|--------------------------------------------------------------------------
|
| Convert active-source telemetry into grid-interruption episodes.
|
| IMPORTANT:
|
| GRID -> INVERTING
| GRID -> GENERATOR
|
| may START a grid interruption candidate.
|
| A subsequent:
|
| INVERTING -> GENERATOR
| GENERATOR -> INVERTING
|
| does NOT restore grid.
|
| Restoration occurs only when active source returns to GRID.
|
| No MongoDB writes are performed here.
|
*/


export const ACTIVE_SOURCE = Object.freeze({
  NOT_AVAILABLE: 0,
  GRID: 1,
  GENERATOR: 2,
  SHORE: 3,
  INVERTING: 240,
});


export const GRID_EVENT_STATUS =
  Object.freeze({
    OPEN: "OPEN",
    RESTORED: "RESTORED",
    INVALID: "INVALID",
  });


const SOURCE_NAME =
  Object.freeze({
    0: "NOT_AVAILABLE",
    1: "GRID",
    2: "GENERATOR",
    3: "SHORE",
    240: "INVERTING",
  });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getTimestamp(record) {
  const timestamp =
    new Date(
      record.timestamp
    );


  if (
    Number.isNaN(
      timestamp.getTime()
    )
  ) {
    return null;
  }


  return timestamp;
}


function getValue(record) {
  const candidate =
    record.numericValue ??
    record.value;


  const numeric =
    Number(candidate);


  return Number.isFinite(
    numeric
  )
    ? numeric
    : null;
}


function sourceName(value) {
  return (
    SOURCE_NAME[value] ??
    `UNKNOWN_${value}`
  );
}


function isKnownSource(value) {
  return [
    ACTIVE_SOURCE.NOT_AVAILABLE,
    ACTIVE_SOURCE.GRID,
    ACTIVE_SOURCE.GENERATOR,
    ACTIVE_SOURCE.SHORE,
    ACTIVE_SOURCE.INVERTING,
  ].includes(value);
}


function durationSeconds(
  start,
  end
) {
  if (
    !start ||
    !end
  ) {
    return null;
  }


  return Math.max(
    0,
    Math.round(
      (
        end.getTime() -
        start.getTime()
      ) / 1000
    )
  );
}


/*
|--------------------------------------------------------------------------
| Evidence
|--------------------------------------------------------------------------
*/

function buildEvidence(
  record,
  role
) {
  return {
    telemetryId:
      record._id ??
      null,

    role,

    timestamp:
      getTimestamp(record),

    deviceType:
      record.deviceType ??
      null,

    deviceInstance:
      record.deviceInstance ??
      null,

    vrmAttributeId:
      record.vrmAttributeId ??
      null,

    parameter:
      record.parameter ??
      record.description ??
      null,

    value:
      getValue(record),

    sourceName:
      sourceName(
        getValue(record)
      ),
  };
}


/*
|--------------------------------------------------------------------------
| Input validation
|--------------------------------------------------------------------------
*/

function prepareSourceRecords(
  records = []
) {
  return records
    .map(
      (record) => ({
        record,

        timestamp:
          getTimestamp(record),

        value:
          getValue(record),
      })
    )
    .filter(
      (item) =>
        item.timestamp &&
        item.value !== null &&
        isKnownSource(
          item.value
        )
    )
    .sort(
      (a, b) =>
        a.timestamp -
        b.timestamp
    );
}


/*
|--------------------------------------------------------------------------
| Confidence
|--------------------------------------------------------------------------
|
| This service deliberately remains conservative.
|
| It knows that the system stopped using GRID.
| It does NOT automatically know that:
|
|   - utility voltage physically disappeared;
|   - customer load was interrupted;
|   - an outage should count toward SAIDI.
|
*/

function initialConfidence(
  nextSource
) {
  if (
    nextSource ===
    ACTIVE_SOURCE.INVERTING
  ) {
    return {
      score: 0.6,
      level: "MEDIUM",

      reason:
        "Active source changed from GRID to INVERTING without direct grid-meter confirmation",
    };
  }


  if (
    nextSource ===
    ACTIVE_SOURCE.GENERATOR
  ) {
    return {
      score: 0.45,
      level: "LOW_MEDIUM",

      reason:
        "Active source changed from GRID to GENERATOR without direct grid-meter confirmation",
    };
  }


  if (
    nextSource ===
    ACTIVE_SOURCE.SHORE
  ) {
    return {
      score: 0.3,
      level: "LOW",

      reason:
        "Active source changed from GRID to SHORE; grid-loss cause is not established",
    };
  }


  return {
    score: 0.2,
    level: "LOW",

    reason:
      "Active GRID source became unavailable or indeterminate",
  };
}


/*
|--------------------------------------------------------------------------
| Grid interruption episode detector
|--------------------------------------------------------------------------
*/

export function detectGridInterruptionEpisodes({
  records = [],

  installation = null,

  site = null,

  minimumDurationSeconds = 60,

  closeOpenAtEnd = false,

  streamEndTime = null,
} = {}) {
  const prepared =
    prepareSourceRecords(
      records
    );


  if (
    prepared.length < 2
  ) {
    return {
      episodes: [],

      diagnostics: {
        recordsReceived:
          records.length,

        usableRecords:
          prepared.length,

        transitions:
          0,

        opened:
          0,

        restored:
          0,

        stillOpen:
          0,
      },
    };
  }


  const episodes = [];


  let currentEpisode =
    null;

  let previous =
    prepared[0];

  let transitionCount =
    0;

  let openedCount =
    0;

  let restoredCount =
    0;


  for (
    let index = 1;
    index <
    prepared.length;
    index += 1
  ) {
    const current =
      prepared[index];


    /*
     * Repeated state is not a transition.
     */

    if (
      current.value ===
      previous.value
    ) {
      previous =
        current;

      continue;
    }


    transitionCount += 1;


    /*
    |--------------------------------------------------------------------------
    | START
    |--------------------------------------------------------------------------
    |
    | A candidate can start only when we have actually observed:
    |
    | GRID -> non-GRID
    |
    | This avoids inventing an outage start when the historical window begins
    | while the site was already on generator/inverter.
    |
    */

    if (
      !currentEpisode &&
      previous.value ===
        ACTIVE_SOURCE.GRID &&
      current.value !==
        ACTIVE_SOURCE.GRID
    ) {
      const confidence =
        initialConfidence(
          current.value
        );


      currentEpisode = {
        installation,

        site,

        eventType:
          "GRID_OUTAGE",

        status:
          GRID_EVENT_STATUS.OPEN,

        startTime:
          current.timestamp,

        detectionTime:
          current.timestamp,

        restorationTime:
          null,

        endTime:
          null,

        durationSeconds:
          null,

        startSource:
          ACTIVE_SOURCE.GRID,

        startSourceName:
          "GRID",

        firstAlternativeSource:
          current.value,

        firstAlternativeSourceName:
          sourceName(
            current.value
          ),

        finalSource:
          current.value,

        finalSourceName:
          sourceName(
            current.value
          ),

        intermediateTransitions:
          [],

        detectionEvidence: [
          buildEvidence(
            previous.record,
            "PRE_INTERRUPTION_GRID"
          ),

          buildEvidence(
            current.record,
            "GRID_DEPARTURE"
          ),
        ],

        restorationEvidence:
          [],

        detectionMethod:
          "ACTIVE_SOURCE_TRANSITION",

        confidence:
          confidence.score,

        confidenceLevel:
          confidence.level,

        confidenceReason:
          confidence.reason,

        /*
         * Critical semantic flag.
         *
         * This is a GRID-SOURCE interruption candidate.
         * It does NOT yet establish customer/load interruption.
         */

        gridSourceInterrupted:
          true,

        loadInterruptionConfirmed:
          false,

        gridElectricalAbsenceConfirmed:
          false,
      };


      openedCount += 1;


      previous =
        current;

      continue;
    }


    /*
    |--------------------------------------------------------------------------
    | OPEN EVENT — non-grid source changes
    |--------------------------------------------------------------------------
    |
    | GRID -> INVERTING
    | INVERTING -> GENERATOR
    |
    | remains ONE grid interruption.
    |
    */

    if (
      currentEpisode &&
      current.value !==
        ACTIVE_SOURCE.GRID
    ) {
      currentEpisode
        .intermediateTransitions
        .push({
          timestamp:
            current.timestamp,

          from:
            previous.value,

          fromName:
            sourceName(
              previous.value
            ),

          to:
            current.value,

          toName:
            sourceName(
              current.value
            ),
        });


      currentEpisode.finalSource =
        current.value;

      currentEpisode.finalSourceName =
        sourceName(
          current.value
        );


      previous =
        current;

      continue;
    }


    /*
    |--------------------------------------------------------------------------
    | RESTORATION
    |--------------------------------------------------------------------------
    |
    | Only return to GRID closes the grid interruption.
    |
    */

    if (
      currentEpisode &&
      current.value ===
        ACTIVE_SOURCE.GRID
    ) {
      currentEpisode.status =
        GRID_EVENT_STATUS.RESTORED;


      currentEpisode.restorationTime =
        current.timestamp;


      currentEpisode.endTime =
        current.timestamp;


      currentEpisode.durationSeconds =
        durationSeconds(
          currentEpisode.startTime,
          current.timestamp
        );


      currentEpisode
        .restorationEvidence
        .push(
          buildEvidence(
            previous.record,
            "PRE_RESTORATION_NON_GRID"
          )
        );


      currentEpisode
        .restorationEvidence
        .push(
          buildEvidence(
            current.record,
            "GRID_RESTORED"
          )
        );


      /*
       * Debounce short episodes.
       */

      if (
        currentEpisode
          .durationSeconds >=
        minimumDurationSeconds
      ) {
        episodes.push(
          currentEpisode
        );
      }


      restoredCount += 1;

      currentEpisode =
        null;


      previous =
        current;

      continue;
    }


    previous =
      current;
  }


  /*
  |--------------------------------------------------------------------------
  | Stream ended while grid interruption remains active
  |--------------------------------------------------------------------------
  */

  if (
    currentEpisode
  ) {
    if (
      closeOpenAtEnd &&
      streamEndTime
    ) {
      const end =
        new Date(
          streamEndTime
        );


      if (
        !Number.isNaN(
          end.getTime()
        )
      ) {
        currentEpisode.endTime =
          end;

        currentEpisode.durationSeconds =
          durationSeconds(
            currentEpisode.startTime,
            end
          );
      }
    }


    episodes.push(
      currentEpisode
    );
  }


  return {
    episodes,

    diagnostics: {
      recordsReceived:
        records.length,

      usableRecords:
        prepared.length,

      transitions:
        transitionCount,

      opened:
        openedCount,

      restored:
        restoredCount,

      stillOpen:
        currentEpisode
          ? 1
          : 0,
    },
  };
}


/*
|--------------------------------------------------------------------------
| Summary helper
|--------------------------------------------------------------------------
*/

export function summarizeGridEpisodes(
  episodes = []
) {
  return episodes.reduce(
    (
      summary,
      episode
    ) => {
      summary.total += 1;


      if (
        episode.status ===
        GRID_EVENT_STATUS.RESTORED
      ) {
        summary.restored += 1;
      }


      if (
        episode.status ===
        GRID_EVENT_STATUS.OPEN
      ) {
        summary.open += 1;
      }


      if (
        Number.isFinite(
          episode.durationSeconds
        )
      ) {
        summary.totalDurationSeconds +=
          episode.durationSeconds;
      }


      return summary;
    },
    {
      total: 0,
      restored: 0,
      open: 0,
      totalDurationSeconds: 0,
    }
  );
}