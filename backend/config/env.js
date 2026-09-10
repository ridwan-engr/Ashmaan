import dotenv from "dotenv";

dotenv.config();

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

  // Frontend
  // Frontend / CORS
  corsOrigins: (
    process.env.CORS_ORIGINS ||
    process.env.CORS_ORIGIN ||
    "http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
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
  },
};

export default env;