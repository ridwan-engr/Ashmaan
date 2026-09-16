import dotenv from "dotenv";

dotenv.config();

const parseBoolean = (
  value,
  fallback = false
) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  if (
    [
      "true",
      "1",
      "yes",
      "on",
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    [
      "false",
      "0",
      "no",
      "off",
    ].includes(normalized)
  ) {
    return false;
  }

  return fallback;
};

const parsePositiveInteger = (
  value,
  fallback
) => {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
};

const parseSiteIdList = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const values =
    String(value)
      .split(",")
      .map(
        (item) =>
          item.trim()
      )
      .filter(Boolean);

  const validSiteIds =
    values.filter(
      (item) =>
        /^\d+$/.test(item)
    );

  return [
    ...new Set(validSiteIds),
  ];
};

const env = {
  nodeEnv:
    process.env.NODE_ENV ||
    "development",

  port:
    Number(
      process.env.PORT
    ) || 5000,

  // MongoDB
  mongodbUri:
    process.env.MONGODB_URI,

  // Authentication
  jwtSecret:
    process.env.JWT_SECRET,

  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN ||
    "1d",


  // Frontend / CORS
  corsOrigins: (
    process.env.CORS_ORIGINS ||
    process.env.CORS_ORIGIN ||
    "http://localhost:5173"
  )
    .split(",")
    .map(
      (origin) =>
        origin.trim()
    )
    .filter(Boolean),

  // Victron VRM
  vrm: {
    baseUrl:
      process.env.VRM_API_BASE_URL ||
      "https://vrmapi.victronenergy.com/v2",

    accessToken:
      process.env.VRM_ACCESS_TOKEN,

    userId:
      process.env.VRM_USER_ID,

    timeout:
      Number(
        process.env.VRM_REQUEST_TIMEOUT
      ) || 15000,

    syncBatchSize:
      Number(
        process.env.VRM_SYNC_BATCH_SIZE
      ) || 0,

    mqttUsername:
      process.env.VRM_MQTT_USERNAME,

    mqttPort:
      Number(
        process.env.VRM_MQTT_PORT
      ) || 8883,

    liveFleetEnabled:
      parseBoolean(
        process.env.VRM_LIVE_FLEET_ENABLED,
        false
      ),

    liveFleetSiteIds:
      parseSiteIdList(
        process.env.VRM_LIVE_FLEET_SITE_IDS
      ),

    liveFleetStartupConcurrency:
      parsePositiveInteger(
        process.env.VRM_LIVE_FLEET_STARTUP_CONCURRENCY,
        4
      ),

  },
};

export default env;