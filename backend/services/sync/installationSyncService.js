import {
  Installation,
} from "../../models/index.js";

import {
  getInstallations,
} from "../vrm/installationService.js";

import env from "../../config/env.js";
import ApiError from "../../utils/ApiError.js";


/*
|--------------------------------------------------------------------------
| Normalize VRM installation
|--------------------------------------------------------------------------
|
| VRM remains the source.
|
| We extract only fields that belong in the normalized operational model
| and preserve the complete original record in `raw`.
|
*/

const normalizeInstallation = (record) => {
  const vrmSiteId =
    record.idSite ??
    record.idsite ??
    record.siteId ??
    record.id;

  if (vrmSiteId === undefined || vrmSiteId === null) {
    throw new ApiError(
      422,
      "VRM installation record does not contain an installation/site ID."
    );
  }

  const name =
    record.name ||
    record.siteName ||
    `VRM Installation ${vrmSiteId}`;

  const timezone =
    record.timezone ||
    record.timeZone ||
    null;

  const identifier =
    record.identifier ||
    record.ident ||
    null;

  const lastTimestamp =
    record.lastTimestamp ??
    record.last_timestamp ??
    null;

  let lastSeenAt = null;

  if (lastTimestamp) {
    /*
     * VRM timestamps may be Unix seconds.
     * This conversion supports either seconds or milliseconds.
     */
    const numericTimestamp = Number(lastTimestamp);

    if (
      Number.isFinite(numericTimestamp) &&
      numericTimestamp > 0
    ) {
      lastSeenAt = new Date(
        numericTimestamp < 10_000_000_000
          ? numericTimestamp * 1000
          : numericTimestamp
      );
    }
  }

  return {
    vrmSiteId: String(vrmSiteId),

    vrmUserId: env.vrm.userId
      ? String(env.vrm.userId)
      : undefined,

    name,

    identifier,

    timezone,

    lastSeenAt,

    /*
     * Do not infer ONLINE/OFFLINE yet.
     *
     * Presence of an installation record does not prove
     * real-time operational status.
     */
    status: "UNKNOWN",

    source: "VRM",

    raw: record,
  };
};


/*
|--------------------------------------------------------------------------
| Extract installation records
|--------------------------------------------------------------------------
|
| Current VRM response has:
|
| {
|   success: true,
|   records: [...]
| }
|
| But this helper is defensive in case a wrapper changes.
|
*/

const extractRecords = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.records)) {
    return response.records;
  }

  if (Array.isArray(response?.data?.records)) {
    return response.data.records;
  }

  return [];
};


/*
|--------------------------------------------------------------------------
| Synchronize installations
|--------------------------------------------------------------------------
*/

const syncInstallations = async () => {
  const startedAt = new Date();

  const vrmResponse = await getInstallations();

  const records = extractRecords(vrmResponse);

  const result = {
    startedAt,
    completedAt: null,

    received: records.length,
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,

    errors: [],
  };

  for (const record of records) {
    try {
      const normalized =
        normalizeInstallation(record);

      const existing =
        await Installation.findOne({
          vrmSiteId: normalized.vrmSiteId,
        }).lean();

      await Installation.findOneAndUpdate(
        {
          vrmSiteId: normalized.vrmSiteId,
        },
        {
          $set: {
            ...normalized,
            lastSyncAt: new Date(),
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
        }
      );

      result.processed += 1;

      if (existing) {
        result.updated += 1;
      } else {
        result.created += 1;
      }
    } catch (error) {
      result.failed += 1;

      result.errors.push({
        vrmSiteId:
          record?.idSite ??
          record?.siteId ??
          null,

        message: error.message,
      });
    }
  }

  result.completedAt = new Date();

  return result;
};


export {
  normalizeInstallation,
  syncInstallations,
};