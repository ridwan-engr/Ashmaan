const convertTimestamp = (
  timestamp
) => {
  const numeric =
    Number(timestamp);

  if (
    !Number.isFinite(numeric) ||
    numeric <= 0
  ) {
    return null;
  }

  return new Date(
    numeric < 10_000_000_000
      ? numeric * 1000
      : numeric
  );
};


const extractNumericValue = (
  value
) => {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    const trimmed =
      value.trim();

    if (trimmed === "") {
      return null;
    }

    const numeric =
      Number(trimmed);

    if (
      Number.isFinite(numeric)
    ) {
      return numeric;
    }
  }

  return null;
};


const determineQuality = ({
  timestamp,
  rawValue,
}) => {
  if (!timestamp) {
    return "INVALID";
  }

  if (
    rawValue === null ||
    rawValue === undefined
  ) {
    return "MISSING";
  }

  return "VALID";
};


const normalizeTelemetryRecord = ({
  record,
  installation,
  device = null,
}) => {
  const timestamp =
    convertTimestamp(
      record.timestamp
    );

  const rawValue =
    record.rawValue;

  return {
    site:
      installation.site ||
      undefined,

    installation:
      installation._id,

    device:
      device?._id ||
      undefined,

    timestamp,

    parameter:
      String(
        record.description ||
        record.code ||
        `Attribute ${record.idDataAttribute}`
      ),

    code:
      record.code !== undefined &&
      record.code !== null
        ? String(record.code)
        : null,

    description:
      record.description !==
        undefined &&
      record.description !== null
        ? String(record.description)
        : null,

    vrmAttributeId:
      Number(
        record.idDataAttribute
      ),

    deviceType:
      String(
        record.Device ||
        "UNKNOWN"
      ),

    deviceInstance:
      String(
        record.instance ?? "0"
      ),

    dbusServiceType:
      record.dbusServiceType ??
      null,

    dbusPath:
      record.dbusPath ??
      null,

    formatWithUnit:
      record.formatWithUnit ??
      null,

    value:
      rawValue,

    numericValue:
      extractNumericValue(
        rawValue
      ),

    formattedValue:
      record.formattedValue !==
        undefined &&
      record.formattedValue !== null
        ? String(
            record.formattedValue
          )
        : null,

    quality:
      determineQuality({
        timestamp,
        rawValue,
      }),

    source: "VRM",

    aggregationLevel: "RAW",

  };
};


export {
  normalizeTelemetryRecord,
};
