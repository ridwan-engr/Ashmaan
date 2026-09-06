const normalizeStatisticsRecords = ({
  records,
  installation,
  interval = null,
  statisticType = null,
}) => {
  const normalized = [];

  if (
    !records ||
    typeof records !== "object"
  ) {
    return normalized;
  }

  for (
    const [metric, series]
    of Object.entries(records)
  ) {
    if (!Array.isArray(series)) {
      continue;
    }

    for (const point of series) {
      if (
        !Array.isArray(point) ||
        point.length < 2
      ) {
        continue;
      }

      const [
        timestampMs,
        value,
      ] = point;

      const timestampNumber =
        Number(timestampMs);

      const numericValue =
        Number(value);

      if (
        !Number.isFinite(
          timestampNumber
        ) ||
        !Number.isFinite(
          numericValue
        )
      ) {
        continue;
      }

      const timestamp =
        new Date(timestampNumber);

      if (
        Number.isNaN(
          timestamp.getTime()
        )
      ) {
        continue;
      }

      normalized.push({
        installation:
          installation._id,

        site:
          installation.site ||
          null,

        source: "VRM",

        metric,

        timestamp,

        value: numericValue,

        interval,

        statisticType,

        unit:
          metric === "kwh"
            ? "kWh"
            : null,

        raw: point,
      });
    }
  }

  return normalized;
};

export {
  normalizeStatisticsRecords,
};