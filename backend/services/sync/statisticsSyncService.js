import {
  EnergyRecord,
  Installation,
  SyncState,
} from "../../models/index.js";

import {
  getInstallationStatistics,
} from "../vrm/statisticsService.js";

import {
  normalizeStatisticsRecords,
} from "./statisticsNormalizer.js";

const DEFAULT_BOOTSTRAP_DAYS = 7;
const DEFAULT_OVERLAP_DAYS = 1;

const DAY_SECONDS = 24 * 60 * 60;

/**
 * Convert a value to Unix seconds.
 * Returns null when the value is missing or invalid.
 */
const toUnixSeconds = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.floor(numericValue);
};

/**
 * Determine the VRM statistics request window.
 *
 * Priority:
 *
 * start:
 * 1. Explicit caller-supplied start
 * 2. Existing checkpoint minus overlap
 * 3. Bootstrap window
 *
 * end:
 * 1. Explicit caller-supplied end
 * 2. Current UTC time
 */
const resolveStatisticsWindow = ({
  requestedStart,
  requestedEnd,
  checkpoint,
  bootstrapDays = DEFAULT_BOOTSTRAP_DAYS,
  overlapDays = DEFAULT_OVERLAP_DAYS,
}) => {
  const nowSeconds =
    Math.floor(Date.now() / 1000);

  const explicitStart =
    toUnixSeconds(requestedStart);

  const explicitEnd =
    toUnixSeconds(requestedEnd);

  let effectiveStart;

  if (explicitStart !== null) {
    effectiveStart =
      explicitStart;
  } else if (checkpoint) {
    const checkpointSeconds =
      Math.floor(
        new Date(
          checkpoint
        ).getTime() / 1000
      );

    effectiveStart =
      checkpointSeconds -
      overlapDays *
        DAY_SECONDS;
  } else {
    effectiveStart =
      nowSeconds -
      bootstrapDays *
        DAY_SECONDS;
  }

  const effectiveEnd =
    explicitEnd !== null
      ? explicitEnd
      : nowSeconds;

  if (
    !Number.isFinite(
      effectiveStart
    ) ||
    !Number.isFinite(
      effectiveEnd
    )
  ) {
    throw new Error(
      "Unable to resolve statistics synchronization window."
    );
  }

  if (
    effectiveStart >=
    effectiveEnd
  ) {
    throw new Error(
      "Statistics synchronization start time must be earlier than end time."
    );
  }

  return {
    start:
      Math.floor(
        effectiveStart
      ),

    end:
      Math.floor(
        effectiveEnd
      ),

    bootstrapDays,
    overlapDays,

    mode:
      explicitStart !== null
        ? "MANUAL"
        : checkpoint
          ? "CHECKPOINT"
          : "BOOTSTRAP",
  };
};

const getStatisticsSyncState =
  async (installation) => {
    let syncState =
      await SyncState.findOne({
        installation:
          installation._id,
        source: "VRM",
        syncType:
          "STATISTICS",
      });

    if (!syncState) {
      syncState =
        await SyncState.create({
          installation:
            installation._id,

          source: "VRM",

          syncType:
            "STATISTICS",

          status:
            "NEVER_RUN",

          recordsProcessed: 0,
        });
    }

    return syncState;
  };

const syncStatisticsForInstallation =
  async (
    installation,
    options = {}
  ) => {
    const startedAt =
      Date.now();

    const {
      type = "kwh",
      interval = "days",
      start,
      end,
      bootstrapDays =
        DEFAULT_BOOTSTRAP_DAYS,
      overlapDays =
        DEFAULT_OVERLAP_DAYS,
    } = options;

    const syncState =
      await getStatisticsSyncState(
        installation
      );

    /*
     * Capture this BEFORE updating
     * the SyncState.
     */
    const previousCheckpoint =
      syncState.lastRecordTimestamp
        ? new Date(
            syncState
              .lastRecordTimestamp
          )
        : null;

    const window =
      resolveStatisticsWindow({
        requestedStart: start,
        requestedEnd: end,
        checkpoint:
          previousCheckpoint,
        bootstrapDays,
        overlapDays,
      });

    await SyncState.findByIdAndUpdate(
      syncState._id,
      {
        $set: {
          lastAttemptAt:
            new Date(),
        },
      }
    );

    try {
      /*
       * -------------------------
       * 1. Fetch VRM statistics
       * -------------------------
       */

      const vrmFetchStarted =
        Date.now();

      const response =
        await getInstallationStatistics(
          installation.vrmSiteId,
          {
            type,
            interval,
            start:
              window.start,
            end:
              window.end,
          }
        );

      const vrmFetchMs =
        Date.now() -
        vrmFetchStarted;

      /*
       * Support either:
       *
       * response
       * or
       * response.data
       */
      const payload =
        response?.data ??
        response;

      const records =
        payload?.records &&
        typeof payload.records ===
          "object"
          ? payload.records
          : {};

      const totals =
        payload?.totals &&
        typeof payload.totals ===
          "object"
          ? payload.totals
          : {};

      /*
       * -------------------------
       * 2. Normalize
       * -------------------------
       */

      const normalized =
        normalizeStatisticsRecords({
          records,
          installation,
          interval,
          statisticType:
            type,
        });

      /*
       * -------------------------
       * 3. Database persistence
       * -------------------------
       */

      const databaseStarted =
        Date.now();

      let inserted = 0;
      let matched = 0;

      if (
        normalized.length > 0
      ) {
        const operations =
          normalized.map(
            (record) => ({
              updateOne: {
                filter: {
                  installation:
                    record.installation,

                  metric:
                    record.metric,

                  timestamp:
                    record.timestamp,

                  interval:
                    record.interval,

                  statisticType:
                    record.statisticType,
                },

                update: {
                  $setOnInsert:
                    record,
                },

                upsert: true,
              },
            })
          );

        const result =
          await EnergyRecord.bulkWrite(
            operations,
            {
              ordered: false,
            }
          );

        inserted =
          result.upsertedCount ||
          0;

        matched =
          result.matchedCount ||
          0;
      }

      const databaseMs =
        Date.now() -
        databaseStarted;

      /*
       * -------------------------
       * 4. Find newest timestamp
       * -------------------------
       */

      let newestTimestamp =
        previousCheckpoint;

      for (
        const record of normalized
      ) {
        if (
          !newestTimestamp ||
          record.timestamp >
            newestTimestamp
        ) {
          newestTimestamp =
            record.timestamp;
        }
      }

      /*
       * Never move checkpoint
       * backwards.
       */
      if (
        previousCheckpoint &&
        newestTimestamp &&
        newestTimestamp <
          previousCheckpoint
      ) {
        newestTimestamp =
          previousCheckpoint;
      }

      /*
       * -------------------------
       * 5. Mark successful sync
       * -------------------------
       */

      const completedAt =
        new Date();

      const metadata = {
        type,
        interval,

        windowMode:
          window.mode,

        requestedStart:
          start ?? null,

        requestedEnd:
          end ?? null,

        effectiveStart:
          new Date(
            window.start * 1000
          ),

        effectiveEnd:
          new Date(
            window.end * 1000
          ),

        bootstrapDays:
          window.bootstrapDays,

        overlapDays:
          window.overlapDays,

        metrics:
          Object.keys(
            records
          ),

        totals,

        lastReceived:
          normalized.length,

        lastInserted:
          inserted,

        lastExisting:
          matched,
      };

      const update = {
        $set: {
          status:
            "SUCCESS",

          lastSuccessfulSyncAt:
            completedAt,

          lastError:
            null,

          metadata,
        },

        $inc: {
          recordsProcessed:
            normalized.length,
        },
      };

      /*
       * Only write a checkpoint
       * when we actually have one.
       */
      if (newestTimestamp) {
        update.$set
          .lastRecordTimestamp =
          newestTimestamp;
      }

      await SyncState.findByIdAndUpdate(
        syncState._id,
        update
      );

      /*
       * -------------------------
       * 6. API result
       * -------------------------
       */

      return {
        vrmSiteId:
          String(
            installation.vrmSiteId
          ),

        type,
        interval,

        window: {
          mode:
            window.mode,

          start:
            new Date(
              window.start *
                1000
            ).toISOString(),

          end:
            new Date(
              window.end *
                1000
            ).toISOString(),

          bootstrapDays:
            window.bootstrapDays,

          overlapDays:
            window.overlapDays,
        },

        metrics:
          Object.keys(
            records
          ),

        received:
          normalized.length,

        inserted,

        existing:
          matched,

        totals,

        checkpoint: {
          previous:
            previousCheckpoint,

          current:
            newestTimestamp,
        },

        performance: {
          vrmFetchMs,
          databaseMs,

          totalMs:
            Date.now() -
            startedAt,
        },
      };
    } catch (error) {
      await SyncState.findByIdAndUpdate(
        syncState._id,
        {
          $set: {
            status:
              "FAILED",

            lastError:
              error.message,
          },
        }
      );

      throw error;
    }
  };

const syncStatisticsByVrmSiteId =
  async (
    vrmSiteId,
    options = {}
  ) => {
    const installation =
      await Installation.findOne({
        vrmSiteId:
          String(vrmSiteId),
      });

    if (!installation) {
      throw new Error(
        `Installation ${vrmSiteId} was not found.`
      );
    }

    return syncStatisticsForInstallation(
      installation,
      options
    );
  };

export {
  syncStatisticsForInstallation,
  syncStatisticsByVrmSiteId,
};