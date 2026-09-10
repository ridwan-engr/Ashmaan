import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import env from "./config/env.js";
import connectDatabase from "./config/database.js";
import apiRoutes from "./routes/index.js";
import dashboardRoutes
  from "./routes/dashboardRoutes.js";

import siteDashboardRoutes
  from "./routes/siteDashboardRoutes.js";

import reliabilityRoutes
from "./routes/reliabilityRoutes.js";

import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

import {
  startVrmScheduler,
  stopVrmScheduler,
} from "./services/scheduler/vrmScheduler.js";

import optimizationDssRoutes from "./routes/optimizationDssRoutes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser/server-to-server requests with no Origin header.
      if (!origin) {
        return callback(null, true);
      }

      if (
        env.corsOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(
          `CORS origin not allowed: ${origin}`
        )
      );
    },

    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    application: "ASHMAAN",
    message: "ASHMAAN Backend API",
    version: "v1",
  });
});

app.use("/api/v1", apiRoutes);

app.use(
  "/api/v1/dashboard",
  dashboardRoutes
);

app.use(
  "/api/v1/dashboard/sites",
  siteDashboardRoutes
);

app.use(
    "/api/v1/reliability",
    reliabilityRoutes
);

app.use("/api/optimization-dss", optimizationDssRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await connectDatabase();

  app.locals.databaseStatus = "connected";

  const server = app.listen(
    env.port,
    () => {
      console.log("----------------------------------------");
      console.log("ASHMAAN Backend");
      console.log("----------------------------------------");
      console.log(`Environment: ${env.nodeEnv}`);
      console.log(`Port: ${env.port}`);
      console.log(`API: http://localhost:${env.port}/api/v1`);
      console.log("----------------------------------------");

      startVrmScheduler();
    }
  );

  const shutdown = (signal) => {
    console.log(
      `\n${signal} received. Shutting down gracefully...`
    );

    stopVrmScheduler();

    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  };

  process.on(
    "SIGINT",
    () => shutdown("SIGINT")
  );

  process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
  );
};

startServer();