import ApiResponse from "../utils/ApiResponse.js";

import {
  runVrmSync,
} from "../services/sync/syncService.js";

import {
  syncStatisticsByVrmSiteId
} from "../services/sync/statisticsSyncService.js";

import {
  syncAlarmRulesByVrmSiteId,
} from "../services/sync/alarmRuleSyncService.js";

import {
  syncDevicesForInstallation,
} from "../services/sync/deviceSyncService.js";

import {
  Installation,
} from "../models/index.js";

import ApiError from "../utils/ApiError.js";

import {
  syncTelemetryByVrmSiteId,
} from "../services/sync/telemetrySyncService.js";

const synchronizeVrm = async (req, res) => {
  const result = await runVrmSync();

  res.status(200).json(
    new ApiResponse(
      200,
      result,
      "VRM synchronization completed."
    )
  );
};

const synchronizeInstallationDevices =
  async (req, res) => {
    const { id } = req.params;

    const installation =
      await Installation.findOne({
        vrmSiteId: String(id),
      });

    if (!installation) {
      throw new ApiError(
        404,
        `Installation ${id} was not found in ASHMAAN.`
      );
    }

    const result =
      await syncDevicesForInstallation(
        installation
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Installation devices synchronized successfully."
      )
    );
  };

  const synchronizeInstallationTelemetry =
  async (req, res) => {
    const { id } =
      req.params;

    const result =
      await syncTelemetryByVrmSiteId(
        id,
        {
          count:
            Number(
              req.query.count
            ) || 200,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Installation telemetry synchronized successfully."
      )
    );
  };

const syncInstallationAlarmRules =
async (req, res) => {
    const {
      id,
    } = req.params;

    const count =
      Number(req.query.count) ||
      100;

    const result =
      await syncAlarmRulesByVrmSiteId(
        id,
        { count }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Installation alarm rules synchronized successfully."
      )
    );
  };


  const syncInstallationStatistics =
  async (req, res) => {
    const {
      id,
    } = req.params;

    const {
      type = "kwh",
      interval = "days",
      start,
      end,
    } = req.query;

    const result =
      await syncStatisticsByVrmSiteId(
        id,
        {
          type,
          interval,
          start,
          end,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Installation statistics synchronized successfully."
      )
    );
  };

export {
  synchronizeVrm,
   synchronizeInstallationDevices,
   synchronizeInstallationTelemetry,
    syncInstallationAlarmRules,
    syncInstallationStatistics,
};