// backend/services/events/outageEventPersistenceService.js

import mongoose from "mongoose";

import OutageEvent from "../../models/OutageEvent.js";


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function toDate(value) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function normalizeTelemetryId(
  value
) {
  if (!value) {
    return null;
  }

  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {
    return value;
  }

  if (
    mongoose.Types.ObjectId.isValid(
      String(value)
    )
  ) {
    return new mongoose.Types.ObjectId(
      String(value)
    );
  }

  return null;
}


function normalizeEvidence(
  evidence = []
) {
  return evidence
    .map((item) => {
      const timestamp =
        toDate(
          item.timestamp
        );

      if (!timestamp) {
        return null;
      }

      return {
        telemetryId:
          normalizeTelemetryId(
            item.telemetryId
          ),

        parameter:
          item.parameter ??
          null,

        value:
          item.value ??
          null,

        timestamp,
      };
    })
    .filter(Boolean);
}


function getDepartureTelemetryId(
  episode
) {
  const evidence =
    episode
      ?.detectionEvidence ??
    [];

  /*
   * gridRestorationDetector currently emits:
   *
   * [0] last observed GRID record
   * [1] first observed non-GRID record
   *
   * The second record is therefore our deterministic
   * GRID-DEPARTURE observation.
   */

  const departure =
    evidence.find(
      (item) =>
        item.role ===
        "GRID_DEPARTURE"
    ) ??
    evidence[1] ??
    null;

  return normalizeTelemetryId(
    departure?.telemetryId
  );
}


function buildDetectorKey(
  episode
) {
  const installation =
    String(
      episode.installation ??
      ""
    );

  const startTime =
    toDate(
      episode.startTime
    );

  if (
    !installation ||
    !startTime
  ) {
    return null;
  }

  return [
    installation,
    "GRID_OUTAGE",
    startTime.toISOString(),
  ].join(":");
}


/*
|--------------------------------------------------------------------------
| Candidate validation
|--------------------------------------------------------------------------
*/

export function validatePersistableEpisode(
  episode
) {
  const errors = [];


  if (
    !episode?.installation
  ) {
    errors.push(
      "installation is required"
    );
  }


  const startTime =
    toDate(
      episode?.startTime
    );


  if (!startTime) {
    errors.push(
      "valid startTime is required"
    );
  }


  if (
    episode?.status !==
      "OPEN" &&
    episode?.status !==
      "RESTORED"
  ) {
    errors.push(
      "status must be OPEN or RESTORED"
    );
  }


  if (
    episode?.status ===
      "RESTORED" &&
    !toDate(
      episode.restorationTime
    )
  ) {
    errors.push(
      "RESTORED episode requires restorationTime"
    );
  }


  return {
    valid:
      errors.length === 0,

    errors,
  };
}


/*
|--------------------------------------------------------------------------
| Convert detector episode → OutageEvent document
|--------------------------------------------------------------------------
*/

export function buildOutageEventPayload(
  episode
) {
  const startTime =
    toDate(
      episode.startTime
    );


  const restorationTime =
    toDate(
      episode.restorationTime
    );


  const endTime =
    toDate(
      episode.endTime
    );


  return {
    installation:
      episode.installation,

    site:
      episode.site ??
      null,

    eventType:
      "GRID_OUTAGE",

    source:
      "DERIVED",

    status:
      episode.status,

    startTime,

    detectionTime:
      toDate(
        episode.detectionTime
      ) ??
      startTime,

    restorationTime,

    endTime:
      endTime ??
      restorationTime,

    durationSeconds:
      Number.isFinite(
        episode.durationSeconds
      )
        ? episode.durationSeconds
        : null,

    affectedLoadKw:
      episode.affectedLoadKw ??
      null,

    energyNotSuppliedKwh:
      episode.energyNotSuppliedKwh ??
      null,

    affectedCustomers:
      Number.isFinite(
        episode.affectedCustomers
      )
        ? episode.affectedCustomers
        : 1,

    detectionEvidence:
      normalizeEvidence(
        episode.detectionEvidence
      ),

    restorationEvidence:
      normalizeEvidence(
        episode.restorationEvidence
      ),

    detectionMethod:
      "ACTIVE_SOURCE_TRANSITION",

    confidence:
      Number.isFinite(
        episode.confidence
      )
        ? episode.confidence
        : 0,

    /*
     * Do not claim customer outage or ENS here.
     *
     * The detector only established that GRID stopped
     * being the active source.
     */

    cause:
      null,

    notes:
      episode.confidenceReason ??
      null,

    raw: {
      detector:
        "gridRestorationDetector",

      detectorVersion:
        1,

      detectorEventKey:
        buildDetectorKey(
          episode
        ),

      firstAlternativeSource:
        episode.firstAlternativeSource ??
        null,

      firstAlternativeSourceName:
        episode.firstAlternativeSourceName ??
        null,

      finalSource:
        episode.finalSource ??
        null,

      finalSourceName:
        episode.finalSourceName ??
        null,

      intermediateTransitions:
        episode.intermediateTransitions ??
        [],

      confidenceLevel:
        episode.confidenceLevel ??
        null,

      confidenceReason:
        episode.confidenceReason ??
        null,

      gridSourceInterrupted:
        episode.gridSourceInterrupted ===
        true,

      gridElectricalAbsenceConfirmed:
        episode.gridElectricalAbsenceConfirmed ===
        true,

      loadInterruptionConfirmed:
        episode.loadInterruptionConfirmed ===
        true,

      /*
       * Reliability safety flags.
       */

      eligibleForGridAvailability:
        episode.gridSourceInterrupted ===
        true,

      eligibleForSaidiSaifi:
        episode.loadInterruptionConfirmed ===
        true,

      eligibleForEns:
        Number.isFinite(
          episode.energyNotSuppliedKwh
        ),
    },
  };
}


/*
|--------------------------------------------------------------------------
| Existing-event lookup
|--------------------------------------------------------------------------
|
| Deduplication order:
|
| 1. Exact deterministic start time.
| 2. Same GRID_DEPARTURE telemetry evidence.
|
| We deliberately do NOT merge events merely because their
| timestamps are "close". Two genuine grid interruptions can
| occur close together.
|
*/

async function findExistingEvent(
  episode
) {
  const startTime =
    toDate(
      episode.startTime
    );


  /*
   * Strategy 1:
   * deterministic exact identity
   */

  const exact =
    await OutageEvent.findOne({
      installation:
        episode.installation,

      eventType:
        "GRID_OUTAGE",

      startTime,
    });


  if (exact) {
    return {
      event:
        exact,

      matchedBy:
        "EXACT_START",
    };
  }


  /*
   * Strategy 2:
   * departure telemetry record identity
   */

  const departureTelemetryId =
    getDepartureTelemetryId(
      episode
    );


  if (
    departureTelemetryId
  ) {
    const byEvidence =
      await OutageEvent.findOne({
        installation:
          episode.installation,

        eventType:
          "GRID_OUTAGE",

        "detectionEvidence.telemetryId":
          departureTelemetryId,
      });


    if (byEvidence) {
      return {
        event:
          byEvidence,

        matchedBy:
          "GRID_DEPARTURE_EVIDENCE",
      };
    }
  }


  return {
    event: null,
    matchedBy: null,
  };
}


/*
|--------------------------------------------------------------------------
| Update existing event
|--------------------------------------------------------------------------
*/

async function updateExistingEvent(
  existing,
  payload
) {
  /*
   * Never downgrade RESTORED -> OPEN.
   */

  if (
    existing.status ===
      "RESTORED" &&
    payload.status ===
      "OPEN"
  ) {
    return {
      event:
        existing,

      action:
        "UNCHANGED",

      reason:
        "Existing event is already restored",
    };
  }


  /*
   * OPEN -> RESTORED is the primary production lifecycle.
   */

  if (
    existing.status ===
      "OPEN" &&
    payload.status ===
      "RESTORED"
  ) {
    existing.status =
      "RESTORED";

    existing.restorationTime =
      payload.restorationTime;

    existing.endTime =
      payload.endTime;

    existing.durationSeconds =
      payload.durationSeconds;

    existing.restorationEvidence =
      payload.restorationEvidence;

    existing.confidence =
      Math.max(
        existing.confidence ?? 0,
        payload.confidence ?? 0
      );

    existing.raw = {
      ...(
        existing.raw ??
        {}
      ),

      ...(
        payload.raw ??
        {}
      ),
    };


    await existing.save();


    return {
      event:
        existing,

      action:
        "RESTORED_EXISTING",

      reason:
        "Previously open event received grid-restoration evidence",
    };
  }


  /*
   * Same lifecycle state.
   *
   * Refresh analytical metadata without changing event identity.
   */

  existing.confidence =
    Math.max(
      existing.confidence ?? 0,
      payload.confidence ?? 0
    );


  if (
    payload.notes
  ) {
    existing.notes =
      payload.notes;
  }


  existing.raw = {
    ...(
      existing.raw ??
      {}
    ),

    ...(
      payload.raw ??
      {}
    ),
  };


  if (
    payload.status ===
      "RESTORED"
  ) {
    existing.restorationTime =
      payload.restorationTime;

    existing.endTime =
      payload.endTime;

    existing.durationSeconds =
      payload.durationSeconds;

    existing.restorationEvidence =
      payload.restorationEvidence;
  }


  await existing.save();


  return {
    event:
      existing,

    action:
      "UPDATED_EXISTING",

    reason:
      "Matching derived event already existed",
  };
}


/*
|--------------------------------------------------------------------------
| Persist one episode
|--------------------------------------------------------------------------
*/

export async function persistGridEpisode(
  episode,
  {
    dryRun = false,
  } = {}
) {
  const validation =
    validatePersistableEpisode(
      episode
    );


  if (
    !validation.valid
  ) {
    return {
      action:
        "REJECTED",

      errors:
        validation.errors,

      event:
        null,
    };
  }


  const payload =
    buildOutageEventPayload(
      episode
    );


  const existingResult =
    await findExistingEvent(
      episode
    );


  if (
    existingResult.event
  ) {
    if (dryRun) {
      return {
        action:
          "WOULD_UPDATE",

        matchedBy:
          existingResult.matchedBy,

        event:
          existingResult.event,

        payload,
      };
    }


    const updated =
      await updateExistingEvent(
        existingResult.event,
        payload
      );


    return {
      ...updated,

      matchedBy:
        existingResult.matchedBy,
    };
  }


  if (dryRun) {
    return {
      action:
        "WOULD_CREATE",

      matchedBy:
        null,

      event:
        null,

      payload,
    };
  }


  try {
    const created =
      await OutageEvent.create(
        payload
      );


    return {
      action:
        "CREATED",

      matchedBy:
        null,

      event:
        created,
    };
  } catch (error) {
    /*
     * Protect against concurrent workers reaching the unique
     * index at the same time.
     */

    if (
      error?.code === 11000
    ) {
      const retry =
        await findExistingEvent(
          episode
        );


      if (
        retry.event
      ) {
        return {
          action:
            "DUPLICATE_CONCURRENT",

          matchedBy:
            retry.matchedBy,

          event:
            retry.event,
        };
      }
    }


    throw error;
  }
}


/*
|--------------------------------------------------------------------------
| Persist multiple episodes
|--------------------------------------------------------------------------
*/

export async function persistGridEpisodes(
  episodes = [],
  {
    dryRun = false,
  } = {}
) {
  const results = [];


  for (
    const episode
    of episodes
  ) {
    const result =
      await persistGridEpisode(
        episode,
        {
          dryRun,
        }
      );


    results.push(
      result
    );
  }


  return {
    results,

    summary:
      results.reduce(
        (
          summary,
          result
        ) => {
          summary.total += 1;


          summary[
            result.action
          ] =
            (
              summary[
                result.action
              ] || 0
            ) + 1;


          return summary;
        },
        {
          total: 0,
        }
      ),
  };
}