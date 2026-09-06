import Installation from "../../models/Installation.js";
import Device from "../../models/Device.js";
import Telemetry from "../../models/Telemetry.js";
import AlarmRule from "../../models/AlarmRule.js";
import EnergyRecord from "../../models/EnergyRecord.js";


const getFleetOverview = async () => {
  const [
    totalInstallations,

    onlineInstallations,
    staleInstallations,
    offlineInstallations,
    unknownInstallations,
    inactiveInstallations,

    totalDevices,
    totalAlarmRules,

    latestTelemetry,
    latestEnergyRecord,
  ] = await Promise.all([
    /*
     * All VRM installations,
     * including inactive/disabled records.
     */
    Installation.countDocuments({
      source: "VRM",
    }),

    /*
     * Monitoring status counts.
     */
    Installation.countDocuments({
      source: "VRM",
      status: "ONLINE",
      syncEnabled: true,
    }),

    Installation.countDocuments({
      source: "VRM",
      status: "STALE",
      syncEnabled: true,
    }),

    Installation.countDocuments({
      source: "VRM",
      status: "OFFLINE",
      syncEnabled: true,
    }),

    Installation.countDocuments({
      source: "VRM",
      status: "UNKNOWN",
      syncEnabled: true,
    }),

    Installation.countDocuments({
      source: "VRM",
      status: "INACTIVE",
    }),

    /*
     * Fleet device count.
     */
    Device.countDocuments({
      source: "VRM",
    }),

    /*
     * VRM alarm-rule configuration count.
     *
     * These are alarm rules/configurations,
     * not historical alarm events.
     */
    AlarmRule.countDocuments({
      source: "VRM",
    }),

    /*
     * Most recent telemetry record
     * across the VRM fleet.
     */
    Telemetry.findOne({
      source: "VRM",
    })
      .sort({
        timestamp: -1,
      })
      .select({
        timestamp: 1,
        installation: 1,
        parameter: 1,
        numericValue: 1,
        value: 1,
        unit: 1,
      })
      .lean(),

    /*
     * Most recent stored energy record.
     */
    EnergyRecord.findOne({
      source: "VRM",
    })
      .sort({
        timestamp: -1,
      })
      .lean(),
  ]);


  /*
   * Eligible/active installations are all
   * VRM installations except INACTIVE.
   *
   * Monitoring status may be:
   * ONLINE / STALE / OFFLINE / UNKNOWN.
   */
  const activeInstallations =
    onlineInstallations +
    staleInstallations +
    offlineInstallations +
    unknownInstallations;


  /*
   * Sanity value useful for diagnostics.
   */
  const classifiedInstallations =
    activeInstallations +
    inactiveInstallations;


  return {
    fleet: {
      totalInstallations,

      activeInstallations,

      online:
        onlineInstallations,

      stale:
        staleInstallations,

      offline:
        offlineInstallations,

      unknown:
        unknownInstallations,

      inactive:
        inactiveInstallations,

      classifiedInstallations,
    },

    devices: {
      total:
        totalDevices,
    },

    alarms: {
      rules:
        totalAlarmRules,
    },

    telemetry: {
      latestTimestamp:
        latestTelemetry?.timestamp ||
        null,

      latestRecord:
        latestTelemetry ||
        null,
    },

    energy: {
      latestTimestamp:
        latestEnergyRecord?.timestamp ||
        null,

      latestRecord:
        latestEnergyRecord ||
        null,
    },
  };
};


const getEnergyTrend = async ({
  days = 7,
  metric = "kwh",
} = {}) => {
  const safeDays =
    Math.min(
      Math.max(
        Number(days) || 7,
        1
      ),
      90
    );

  const endTime =
    new Date();

  const startTime =
    new Date(
      endTime.getTime() -
        safeDays *
          24 *
          60 *
          60 *
          1000
    );

  const records =
    await EnergyRecord.find({
      source: "VRM",

      metric,

      timestamp: {
        $gte:
          startTime,

        $lte:
          endTime,
      },
    })
      .select({
        installation: 1,
        metric: 1,
        timestamp: 1,
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
    metric,
    days:
      safeDays,

    startTime,
    endTime,

    count:
      records.length,

    records,
  };
};


export {
  getFleetOverview,
  getEnergyTrend,
};