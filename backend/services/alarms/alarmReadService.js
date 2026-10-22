import mongoose from "mongoose";

import Alarm
  from "../../models/Alarm.js";

import {
  USER_INSTALLATION_SCOPE_STATUS,
  getUserInstallationScope,
} from "../security/userInstallationScopeService.js";


const ALARM_SEVERITIES =
  Object.freeze([
    "INFO",
    "WARNING",
    "MINOR",
    "MAJOR",
    "CRITICAL",
    "UNKNOWN",
  ]);


const ALARM_STATUSES =
  Object.freeze([
    "ACTIVE",
    "ACKNOWLEDGED",
    "CLEARED",
    "UNKNOWN",
  ]);


function normalizeOptionalString(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized === ""
    ? null
    : normalized;
}


function parsePositiveInteger(
  value,
  fallback,
  {
    minimum = 1,
    maximum = Number.MAX_SAFE_INTEGER,
  } = {}
) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    const error =
      new Error(
        "INVALID_PAGINATION_PARAMETER"
      );

    error.statusCode = 400;
    error.code =
      "INVALID_PAGINATION_PARAMETER";

    throw error;
  }

  return parsed;
}


function parseOptionalDate(
  value,
  fieldName
) {
  const normalized =
    normalizeOptionalString(
      value
    );

  if (!normalized) {
    return null;
  }

  const parsed =
    new Date(normalized);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    const error =
      new Error(
        `${fieldName} must be a valid date/time.`
      );

    error.statusCode = 400;
    error.code =
      "INVALID_ALARM_TIME_FILTER";

    throw error;
  }

  return parsed;
}


function normalizeEnum(
  value,
  allowedValues,
  fieldName
) {
  const normalized =
    normalizeOptionalString(
      value
    );

  if (!normalized) {
    return null;
  }

  const upper =
    normalized.toUpperCase();

  if (
    !allowedValues.includes(
      upper
    )
  ) {
    const error =
      new Error(
        `Invalid ${fieldName}.`
      );

    error.statusCode = 400;
    error.code =
      "INVALID_ALARM_FILTER";

    throw error;
  }

  return upper;
}


function buildUnavailableError() {
  const error =
    new Error(
      "Alarm authorization scope is temporarily unavailable."
    );

  error.statusCode = 503;
  error.code =
    "ALARM_SCOPE_UNAVAILABLE";

  return error;
}


function buildDeniedError() {
  const error =
    new Error(
      "Alarm access denied."
    );

  error.statusCode = 403;
  error.code =
    "ALARM_ACCESS_DENIED";

  return error;
}


async function resolveAuthorizedInstallationIds({
  userId,
  scopeResolver =
    getUserInstallationScope,
} = {}) {
  const scope =
    await scopeResolver({
      userId,
    });

  if (
    scope?.status ===
    USER_INSTALLATION_SCOPE_STATUS.UNAVAILABLE
  ) {
    throw buildUnavailableError();
  }

  if (
    scope?.status !==
    USER_INSTALLATION_SCOPE_STATUS.RESOLVED
  ) {
    throw buildDeniedError();
  }

  return (
    Array.isArray(
      scope.installationIds
    )
      ? scope.installationIds
      : []
  );
}


function buildAlarmQuery({
  installationIds,
  installationId = null,
  severity = null,
  status = null,
  start = null,
  end = null,
}) {
  /*
   * Critical ACL invariant:
   *
   * Every database query starts with the authenticated user's
   * authorized installation set.
   */
  const query = {
    installation: {
      $in:
        installationIds.map(
          (id) =>
            new mongoose.Types.ObjectId(
              id
            )
        ),
    },
  };


  if (installationId) {
    if (
      !mongoose.Types.ObjectId.isValid(
        installationId
      )
    ) {
      const error =
        new Error(
          "Invalid installation identifier."
        );

      error.statusCode = 400;
      error.code =
        "INVALID_INSTALLATION_ID";

      throw error;
    }

    const normalizedId =
      String(installationId);

    const authorized =
      installationIds.some(
        (id) =>
          String(id) ===
          normalizedId
      );

    if (!authorized) {
      throw buildDeniedError();
    }

    query.installation =
      new mongoose.Types.ObjectId(
        normalizedId
      );
  }


  if (severity) {
    query.severity =
      severity;
  }


  if (status) {
    query.status =
      status;
  }


  if (
    start ||
    end
  ) {
    query.startedAt = {};

    if (start) {
      query.startedAt.$gte =
        start;
    }

    if (end) {
      query.startedAt.$lte =
        end;
    }
  }


  return query;
}


function serializeAlarm(
  alarm
) {
  return {
    id:
      String(
        alarm._id
      ),

    installationId:
      alarm.installation
        ? String(
            alarm.installation
          )
        : null,

    siteId:
      alarm.site
        ? String(
            alarm.site
          )
        : null,

    deviceId:
      alarm.device
        ? String(
            alarm.device
          )
        : null,

    vrmAlarmId:
      alarm.vrmAlarmId ??
      null,

    alarmCode:
      alarm.alarmCode ??
      null,

    title:
      alarm.title ??
      null,

    description:
      alarm.description ??
      null,

    category:
      alarm.category ??
      null,

    severity:
      alarm.severity ??
      "UNKNOWN",

    status:
      alarm.status ??
      "UNKNOWN",

    startedAt:
      alarm.startedAt ??
      null,

    acknowledgedAt:
      alarm.acknowledgedAt ??
      null,

    clearedAt:
      alarm.clearedAt ??
      null,

    durationSeconds:
      alarm.durationSeconds ??
      null,

    source:
      alarm.source ??
      null,
  };
}


export async function listAlarms({
  userId,
  query = {},
  AlarmModel = Alarm,
  scopeResolver =
    getUserInstallationScope,
} = {}) {
  const installationIds =
    await resolveAuthorizedInstallationIds({
      userId,
      scopeResolver,
    });


  const page =
    parsePositiveInteger(
      query.page,
      1
    );

  const limit =
    parsePositiveInteger(
      query.limit,
      25,
      {
        maximum: 100,
      }
    );


  const severity =
    normalizeEnum(
      query.severity,
      ALARM_SEVERITIES,
      "severity"
    );

  const status =
    normalizeEnum(
      query.status,
      ALARM_STATUSES,
      "status"
    );

  const start =
    parseOptionalDate(
      query.start,
      "start"
    );

  const end =
    parseOptionalDate(
      query.end,
      "end"
    );


  if (
    start &&
    end &&
    start.getTime() >
      end.getTime()
  ) {
    const error =
      new Error(
        "Alarm start time must not be after end time."
      );

    error.statusCode = 400;
    error.code =
      "INVALID_ALARM_TIME_RANGE";

    throw error;
  }


  /*
   * Empty entitlement is a valid empty result.
   * Never perform an unrestricted collection query.
   */
  if (
    installationIds.length === 0
  ) {
    return {
      data: [],
      meta: {
        page,
        limit,
        total: 0,
        pageCount: 0,
      },
    };
  }


  const alarmQuery =
    buildAlarmQuery({
      installationIds,

      installationId:
        normalizeOptionalString(
          query.installationId
        ),

      severity,
      status,
      start,
      end,
    });


  const skip =
    (page - 1) *
    limit;


  const [
    records,
    total,
  ] =
    await Promise.all([
      AlarmModel
        .find(alarmQuery)
        .sort({
          startedAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      AlarmModel
        .countDocuments(
          alarmQuery
        ),
    ]);


  return {
    data:
      records.map(
        serializeAlarm
      ),

    meta: {
      page,
      limit,
      total,

      pageCount:
        total === 0
          ? 0
          : Math.ceil(
              total /
              limit
            ),
    },
  };
}


export async function getAlarmSummary({
  userId,
  query = {},
  AlarmModel = Alarm,
  scopeResolver =
    getUserInstallationScope,
} = {}) {
  const installationIds =
    await resolveAuthorizedInstallationIds({
      userId,
      scopeResolver,
    });


  if (
    installationIds.length === 0
  ) {
    return {
      total: 0,
      active: 0,
      acknowledged: 0,
      cleared: 0,
      critical: 0,
      major: 0,
      minor: 0,
      warning: 0,
      info: 0,
      unknownSeverity: 0,
      sitesAffected: 0,
    };
  }


  const start =
    parseOptionalDate(
      query.start,
      "start"
    );

  const end =
    parseOptionalDate(
      query.end,
      "end"
    );


  if (
    start &&
    end &&
    start.getTime() >
      end.getTime()
  ) {
    const error =
      new Error(
        "Alarm start time must not be after end time."
      );

    error.statusCode = 400;
    error.code =
      "INVALID_ALARM_TIME_RANGE";

    throw error;
  }


  const alarmQuery =
    buildAlarmQuery({
      installationIds,

      installationId:
        normalizeOptionalString(
          query.installationId
        ),

      start,
      end,
    });


  const [
    statusRows,
    severityRows,
    affectedInstallations,
    total,
  ] =
    await Promise.all([
      AlarmModel.aggregate([
        {
          $match:
            alarmQuery,
        },
        {
          $group: {
            _id:
              "$status",
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      AlarmModel.aggregate([
        {
          $match:
            alarmQuery,
        },
        {
          $group: {
            _id:
              "$severity",
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      AlarmModel.distinct(
        "installation",
        alarmQuery
      ),

      AlarmModel.countDocuments(
        alarmQuery
      ),
    ]);


  const statusCounts =
    Object.fromEntries(
      statusRows.map(
        (row) => [
          row._id ??
            "UNKNOWN",
          row.count,
        ]
      )
    );


  const severityCounts =
    Object.fromEntries(
      severityRows.map(
        (row) => [
          row._id ??
            "UNKNOWN",
          row.count,
        ]
      )
    );


  return {
    total,

    active:
      statusCounts.ACTIVE ??
      0,

    acknowledged:
      statusCounts.ACKNOWLEDGED ??
      0,

    cleared:
      statusCounts.CLEARED ??
      0,

    critical:
      severityCounts.CRITICAL ??
      0,

    major:
      severityCounts.MAJOR ??
      0,

    minor:
      severityCounts.MINOR ??
      0,

    warning:
      severityCounts.WARNING ??
      0,

    info:
      severityCounts.INFO ??
      0,

    unknownSeverity:
      severityCounts.UNKNOWN ??
      0,

    sitesAffected:
      affectedInstallations.length,
  };
}


export default Object.freeze({
  listAlarms,
  getAlarmSummary,
});