import ApiResponse from "../utils/ApiResponse.js";

const getHealth = async (req, res) => {
  const response = new ApiResponse(
    200,
    {
      application: "ASHMAAN",
      environment: process.env.NODE_ENV || "development",
      database: req.app.locals.databaseStatus || "unknown",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    },
    "Backend is healthy"
  );

  res.status(200).json(response);
};

export { getHealth };