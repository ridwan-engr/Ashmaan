// services/dashboard/siteTelemetrySnapshotService.js

import {
  Installation,
  Telemetry,
} from "../../models/index.js";


function normalizeSiteId(
  value
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  return String(value).trim();
}


export async function
  getSiteTelemetrySnapshot(
    vrmSiteId
  ) {
  const normalizedSiteId =
    normalizeSiteId(
      vrmSiteId
    );

  if (!normalizedSiteId) {
    const error =
      new Error(
        "VRM_SITE_ID_REQUIRED"
      );

    error.status = 400;

    throw error;
  }


  const installation =
    await Installation
      .findOne({
        vrmSiteId:
          normalizedSiteId,
      })
      .lean();


  if (!installation) {
    const error =
      new Error(
        "INSTALLATION_NOT_FOUND"
      );

    error.status = 404;

    throw error;
  }


  /*
  |--------------------------------------------------------------------------
  | Latest persisted record per telemetry signal
  |--------------------------------------------------------------------------
  |
  | Signal identity is deliberately scoped by:
  |
  | - vrmAttributeId
  | - deviceType
  | - deviceInstance
  |
  | This prevents multiple devices exposing the same attribute from being
  | silently collapsed into one signal.
  |--------------------------------------------------------------------------
  */

  const records =
    await Telemetry.aggregate([
      {
        $match: {
          installation: installation._id,
          vrmAttributeId: { $ne: null },
        },
      },

      {
        $sort: {
          timestamp: -1,
          _id: -1,
        },
      },

      {
        $group: {
          _id: {
            vrmAttributeId:
              "$vrmAttributeId",

            deviceType:
              "$deviceType",

            deviceInstance:
              "$deviceInstance",
          },

          record: {
            $first:
              "$$ROOT",
          },
        },
      },

      {
        $replaceRoot: {
          newRoot:
            "$record",
        },
      },

      {
        $sort: {
          vrmAttributeId: 1,
          deviceType: 1,
          deviceInstance: 1,
        },
      },

      {
        $project: {
          _id: 1,

          installation: 1,

          timestamp: 1,

          vrmAttributeId: 1,

          deviceType: 1,

          deviceInstance: 1,

          parameter: 1,

          description: 1,

          numericValue: 1,

          value: 1,

          unit: 1,

          quality: 1,

          rawCode: 1,

          code: 1,

          rawDbusPath: 1,

          dbusPath: 1,

          createdAt: 1,

          source: 1,

          aggregationLevel: 1,

          dbusServiceType: 1,

          dbusPath: 1,

          formatWithUnit: 1,

        },
      },
    ]);


  let latestTimestamp =
    null;


  for (
    const record of records
  ) {
    const timestamp =
      record?.timestamp
        ? new Date(
          record.timestamp
        )
        : null;

    if (
      timestamp &&
      !Number.isNaN(
        timestamp.getTime()
      ) &&
      (
        latestTimestamp === null ||
        timestamp >
        latestTimestamp
      )
    ) {
      latestTimestamp =
        timestamp;
    }
  }


  return {
    vrmSiteId:
      normalizedSiteId,

    installation: {
      _id:
        installation._id,

      vrmSiteId:
        installation.vrmSiteId,

      name:
        installation.name ??
        installation.siteName ??
        null,

      status:
        installation.status ??
        null,

      lastSeenAt:
        installation.lastSeenAt ??
        null,

      lastSyncAt:
        installation.lastSyncAt ??
        null,
    },

    latestTimestamp,

    recordCount:
      records.length,

    records,
  };
}


export default {
  getSiteTelemetrySnapshot,
};