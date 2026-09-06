import {
  AlarmRule,
  Device,
  Installation,
  SyncState,
} from "../../models/index.js";

import {
  getInstallationAlarms,
} from "../vrm/alarmService.js";

import {
  normalizeAlarmRule,
} from "./alarmRuleNormalizer.js";

const extractAlarmRules = (response) => {
  if (Array.isArray(response?.alarms)) {
    return response.alarms;
  }

  if (
    Array.isArray(
      response?.data?.alarms
    )
  ) {
    return response.data.alarms;
  }

  return [];
};

const getAlarmSyncState = async (
  installation
) => {
  return SyncState.findOneAndUpdate(
    {
      installation: installation._id,
      source: "VRM",
      syncType: "ALARMS",
    },
    {
      $setOnInsert: {
        installation: installation._id,
        source: "VRM",
        syncType: "ALARMS",
        status: "NEVER_RUN",
        recordsProcessed: 0,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
    }
  );
};

const buildDeviceLookup = async (
  installation
) => {
  const devices = await Device.find({
    installation: installation._id,
  }).lean();

  const lookup = new Map();

  for (const device of devices) {
    const instance =
      String(device.deviceInstance);

    lookup.set(instance, device);
  }

  return lookup;
};

const syncAlarmRulesForInstallation =
  async (installation, options = {}) => {
    const {
      count = 100,
    } = options;

    const startedAt = Date.now();
    const attemptAt = new Date();

    const syncState =
      await getAlarmSyncState(
        installation
      );

    await SyncState.updateOne(
      { _id: syncState._id },
      {
        $set: {
          lastAttemptAt: attemptAt,
        },
      }
    );

    try {
      const fetchStartedAt =
        Date.now();

      const response =
        await getInstallationAlarms(
          installation.vrmSiteId,
          { count }
        );

      const vrmFetchMs =
        Date.now() - fetchStartedAt;

      const records =
        extractAlarmRules(response);

      const deviceLookup =
        await buildDeviceLookup(
          installation
        );

      const operations = [];

      let invalid = 0;
      let thresholdRules = 0;
      let enumRules = 0;

      for (const record of records) {
        const instance = String(
          record.instance ?? ""
        );

        const device =
          deviceLookup.get(instance) ||
          null;

        const normalized =
          normalizeAlarmRule({
            record,
            installation,
            device,
          });

        if (!normalized) {
          invalid += 1;
          continue;
        }

        if (
          normalized.ruleType ===
          "THRESHOLD"
        ) {
          thresholdRules += 1;
        }

        if (
          normalized.ruleType ===
          "ENUM"
        ) {
          enumRules += 1;
        }

        operations.push({
          updateOne: {
            filter: {
              installation:
                installation._id,

              vrmRuleId:
                normalized.vrmRuleId,
            },

            update: {
              $set: normalized,
            },

            upsert: true,
          },
        });
      }

      const databaseStartedAt =
        Date.now();

      let databaseResult = null;

      if (operations.length > 0) {
        databaseResult =
          await AlarmRule.bulkWrite(
            operations,
            {
              ordered: false,
            }
          );
      }

      const databaseMs =
        Date.now() -
        databaseStartedAt;

      const inserted =
        databaseResult?.upsertedCount ||
        0;

      const matched =
        databaseResult?.matchedCount ||
        0;

      const modified =
        databaseResult?.modifiedCount ||
        0;

      await SyncState.findByIdAndUpdate(
        syncState._id,
        {
          $set: {
            lastSuccessfulSyncAt:
              new Date(),

            status: "SUCCESS",

            lastError: null,

            metadata: {
              lastReceived:
                records.length,

              lastProcessed:
                operations.length,

              thresholdRules,
              enumRules,
              inserted,
              matched,
              modified,
            },
          },

          $inc: {
            recordsProcessed:
              operations.length,
          },
        }
      );

      return {
        vrmSiteId:
          installation.vrmSiteId,

        received: records.length,
        processed:
          operations.length,

        thresholdRules,
        enumRules,

        inserted,
        matched,
        modified,
        invalid,

        performance: {
          vrmFetchMs,
          databaseMs,
          totalMs:
            Date.now() - startedAt,
        },
      };
    } catch (error) {
      await SyncState.findByIdAndUpdate(
        syncState._id,
        {
          $set: {
            status: "FAILED",
            lastError:
              error.message,
            lastAttemptAt:
              attemptAt,
          },
        }
      );

      throw error;
    }
  };

const syncAlarmRulesByVrmSiteId =
  async (vrmSiteId, options = {}) => {
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

    return syncAlarmRulesForInstallation(
      installation,
      options
    );
  };

export {
  syncAlarmRulesForInstallation,
  syncAlarmRulesByVrmSiteId,
};