const toBoolean = (value) => {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  );
};

const getRuleType = (record) => {
  if (record.idDataAttributeLimit !== undefined) {
    return "THRESHOLD";
  }

  if (record.idDataLimitsEnum !== undefined) {
    return "ENUM";
  }

  return null;
};

const getVrmRuleId = (record) => {
  if (record.idDataAttributeLimit !== undefined) {
    return `LIMIT:${record.idDataAttributeLimit}`;
  }

  if (record.idDataLimitsEnum !== undefined) {
    return `ENUM:${record.idDataLimitsEnum}`;
  }

  return null;
};

const getEnabled = (record) => {
  const value =
    record.AlarmEnabled ??
    record.alarmEnabled ??
    0;

  return toBoolean(value);
};

const getNotifyAfterSeconds = (record) => {
  return Number(
    record.NotifyAfterSeconds ??
      record.notifyAfterSeconds ??
      0
  );
};

const normalizeAlarmRule = ({
  record,
  installation,
  device = null,
}) => {
  const ruleType = getRuleType(record);
  const vrmRuleId = getVrmRuleId(record);

  if (!ruleType || !vrmRuleId) {
    return null;
  }

  const vrmAttributeId =
    Number(record.idDataAttribute);

  const deviceInstance =
    String(record.instance ?? "");

  if (
    !Number.isFinite(vrmAttributeId) ||
    deviceInstance === ""
  ) {
    return null;
  }

  const meta = record.meta_info || {};

  return {
    installation: installation._id,
    site: installation.site || null,
    device: device?._id || null,

    source: "VRM",

    vrmSiteId: String(
      record.idSite ??
        installation.vrmSiteId
    ),

    vrmRuleId,
    ruleType,

    vrmAttributeId,
    deviceInstance,

    deviceTypeId:
      Number.isFinite(
        Number(meta.idDeviceType)
      )
        ? Number(meta.idDeviceType)
        : null,

    deviceName:
      meta.name || null,

    attributeName:
      meta.dataAttribute || null,

    enabled: getEnabled(record),

    notifyAfterSeconds:
      getNotifyAfterSeconds(record),

    lowAlarm:
      ruleType === "THRESHOLD" &&
      record.lowAlarm !== undefined
        ? Number(record.lowAlarm)
        : null,

    lowAlarmHysteresis:
      ruleType === "THRESHOLD" &&
      record.lowAlarmHysteresis !== undefined
        ? Number(
            record.lowAlarmHysteresis
          )
        : null,

    highAlarm:
      ruleType === "THRESHOLD" &&
      record.highAlarm !== undefined
        ? Number(record.highAlarm)
        : null,

    highAlarmHysteresis:
      ruleType === "THRESHOLD" &&
      record.highAlarmHysteresis !==
        undefined
        ? Number(
            record.highAlarmHysteresis
          )
        : null,

    activeValues:
      ruleType === "ENUM" &&
      Array.isArray(record.active)
        ? record.active
        : [],

    alarmActive:
      toBoolean(meta.alarm_active),

    vrmStatus:
      meta.status ?? null,

    lastSyncAt: new Date(),

    raw: record,
  };
};

export {
  normalizeAlarmRule,
};