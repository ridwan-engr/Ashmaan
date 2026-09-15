import Installation
  from "../../models/Installation.js";

import Device
  from "../../models/Device.js";

import Telemetry
  from "../../models/Telemetry.js";

import AlarmRule
  from "../../models/AlarmRule.js";

import EnergyRecord
  from "../../models/EnergyRecord.js";

const getDashboardSites = async () => {
  const installations =
    await Installation.find({
      source: "VRM",
      syncEnabled: true,
    })
      .select({
        vrmSiteId: 1,
        name: 1,
        identifier: 1,
        status: 1,
        timezone: 1,
        lastSeenAt: 1,
        lastSyncAt: 1,
      })
      .sort({
        name: 1,
      })
      .lean();

  return installations;
};

const getSiteOverview = async (
  vrmSiteId
) => {
  const installation =
    await Installation.findOne({
      vrmSiteId: String(vrmSiteId),
      source: "VRM",
    }).lean();

  if (!installation) {
    return null;
  }

  const [
    deviceCount,
    alarmRuleCount,
    latestTelemetry,
    latestEnergy,
  ] = await Promise.all([
    Device.countDocuments({
      installation:
        installation._id,
    }),

    AlarmRule.countDocuments({
      installation:
        installation._id,
    }),

    Telemetry.findOne({
      installation:
        installation._id,
    })
      .sort({
        timestamp: -1,
      })
      .select({
        timestamp: 1,
        parameter: 1,
        description: 1,
        value: 1,
        numericValue: 1,
        unit: 1,
        deviceType: 1,
        deviceInstance: 1,
      })
      .lean(),

    EnergyRecord.findOne({
      installation:
        installation._id,
    })
      .sort({
        timestamp: -1,
      })
      .lean(),
  ]);

  return {
    installation: {
      id: installation._id,
      vrmSiteId:
        installation.vrmSiteId,
      name:
        installation.name,
      identifier:
        installation.identifier,
      status:
        installation.status,
      timezone:
        installation.timezone,
      lastSeenAt:
        installation.lastSeenAt,
      lastSyncAt:
        installation.lastSyncAt,
    },

    devices: {
      total: deviceCount,
    },

    alarms: {
      rules: alarmRuleCount,
    },

    telemetry: {
      latestTimestamp:
        latestTelemetry?.timestamp ||
        null,

      latestRecord:
        latestTelemetry || null,
    },

    energy: {
      latestTimestamp:
        latestEnergy?.timestamp ||
        null,

      latestRecord:
        latestEnergy || null,
    },
  };
};

const getSiteTelemetry = async ({
  vrmSiteId,
  limit = 100,
}) => {
  const installation =
    await Installation.findOne({
      vrmSiteId: String(vrmSiteId),
      source: "VRM",
    })
      .select({
        _id: 1,
        vrmSiteId: 1,
        name: 1,
      })
      .lean();

  if (!installation) {
    return null;
  }

  const safeLimit = Math.min(
    Math.max(
      Number(limit) || 100,
      1
    ),
    1000
  );

  const records =
    await Telemetry.find({
      installation:
        installation._id,
    })
      .select({
        timestamp: 1,
        parameter: 1,
        description: 1,
        value: 1,
        numericValue: 1,
        unit: 1,
        deviceType: 1,
        deviceInstance: 1,
        code: 1,
        quality: 1,
      })
      .sort({
        timestamp: -1,
      })
      .limit(safeLimit)
      .lean();

  return {
    installation: {
      vrmSiteId:
        installation.vrmSiteId,
      name:
        installation.name,
    },

    count: records.length,
    records,
  };
};

const getSiteEnergyHistory = async ({
  vrmSiteId,
  metric = "kwh",
  days = 7,
}) => {
  const installation =
    await Installation.findOne({
      vrmSiteId: String(vrmSiteId),
      source: "VRM",
    })
      .select({
        _id: 1,
        vrmSiteId: 1,
        name: 1,
      })
      .lean();

  if (!installation) {
    return null;
  }

  const safeDays = Math.min(
    Math.max(
      Number(days) || 7,
      1
    ),
    90
  );

  const endTime = new Date();

  const startTime = new Date(
    endTime.getTime() -
    safeDays *
    24 *
    60 *
    60 *
    1000
  );

  const records =
    await EnergyRecord.find({
      installation:
        installation._id,

      source: "VRM",

      metric,

      timestamp: {
        $gte: startTime,
        $lte: endTime,
      },
    })
      .select({
        timestamp: 1,
        metric: 1,
        value: 1,
        unit: 1,
        interval: 1,
        statisticType: 1,
      })
      .sort({
        timestamp: 1,
      })
      .lean();

  return {
    installation: {
      vrmSiteId:
        installation.vrmSiteId,

      name:
        installation.name,
    },

    metric,
    days: safeDays,
    count: records.length,
    records,
  };
};

export default {
  getDashboardSites,
  getSiteOverview,
  getSiteTelemetry,
  getSiteEnergyHistory,
  
};