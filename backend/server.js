import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";

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

import optimizationDssRoutes
  from "./routes/optimizationDssRoutes.js";


/*
|--------------------------------------------------------------------------
| Application
|--------------------------------------------------------------------------
*/

const app =
  express();


/*
|--------------------------------------------------------------------------
| Security headers
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    frameguard: {
      action:
        "deny",
    },

    contentSecurityPolicy: {
      directives: {
        "frame-ancestors": [
          "'none'",
        ],
      },
    },
  })
);


app.use(
  (
    req,
    res,
    next
  ) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    );

    next();
  }
);


/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin(
      origin,
      callback
    ) {
      /*
      |--------------------------------------------------------------------------
      | Allow server-to-server/non-browser requests
      |--------------------------------------------------------------------------
      */

      if (
        !origin
      ) {
        return callback(
          null,
          true
        );
      }


      /*
      |--------------------------------------------------------------------------
      | Allow explicitly configured origins only
      |--------------------------------------------------------------------------
      */

      if (
        env.corsOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }


      return callback(
        new Error(
          `CORS origin not allowed: ${origin}`
        )
      );
    },

    credentials:
      true,
  })
);


/*
|--------------------------------------------------------------------------
| Request parsing
|--------------------------------------------------------------------------
*/

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended:
      true,
  })
);


/*
|--------------------------------------------------------------------------
| HTTP logging
|--------------------------------------------------------------------------
*/

morgan.token(
  "safe-url",
  (req) => {
    const rawUrl =
      typeof req.originalUrl === "string"
        ? req.originalUrl
        : typeof req.url === "string"
          ? req.url
          : "/";

    return rawUrl.split("?")[0];
  }
);

app.use(
  morgan(
    ":method :safe-url :status :response-time ms - :res[content-length]"
  )
);


/*
|--------------------------------------------------------------------------
| Root endpoint
|--------------------------------------------------------------------------
*/

app.get(
  "/",
  (
    req,
    res
  ) => {
    res
      .status(
        200
      )
      .json({
        success:
          true,

        application:
          "ASHMAAN",

        message:
          "ASHMAAN Backend API",

        version:
          "v1",
      });
  }
);


/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/v1",
  apiRoutes
);


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


app.use(
  "/api/optimization-dss",
  optimizationDssRoutes
);


/*
|--------------------------------------------------------------------------
| Error boundary
|--------------------------------------------------------------------------
*/

app.use(
  notFound
);

app.use(
  errorHandler
);


/*
|--------------------------------------------------------------------------
| Shutdown configuration
|--------------------------------------------------------------------------
|
| This is an operational safety bound.
|
| It is NOT:
| - an API latency SLA
| - a database performance SLA
| - a scheduler performance SLA
|
|--------------------------------------------------------------------------
*/

const SHUTDOWN_TIMEOUT_MS =
  10_000;


/*
|--------------------------------------------------------------------------
| Server startup
|--------------------------------------------------------------------------
*/

const startServer =
  async () => {
    /*
    |--------------------------------------------------------------------------
    | Database
    |--------------------------------------------------------------------------
    */

    await connectDatabase();


    app.locals.databaseStatus =
      "connected";


    /*
    |--------------------------------------------------------------------------
    | HTTP server
    |--------------------------------------------------------------------------
    */

    const server =
      app.listen(
        env.port,
        () => {
          console.log(
            "----------------------------------------"
          );

          console.log(
            "ASHMAAN Backend"
          );

          console.log(
            "----------------------------------------"
          );

          console.log(
            `Environment: ${env.nodeEnv}`
          );

          console.log(
            `Port: ${env.port}`
          );

          console.log(
            `API: http://localhost:${env.port}/api/v1`
          );

          console.log(
            "----------------------------------------"
          );


          /*
          |--------------------------------------------------------------------------
          | Scheduler starts only after HTTP server startup
          |--------------------------------------------------------------------------
          */

          startVrmScheduler();
        }
      );


    /*
    |--------------------------------------------------------------------------
    | Shutdown state
    |--------------------------------------------------------------------------
    |
    | Prevent multiple SIGINT/SIGTERM events from starting parallel shutdown
    | sequences.
    |
    |--------------------------------------------------------------------------
    */

    let shutdownInProgress =
      false;


    /*
    |--------------------------------------------------------------------------
    | Graceful shutdown
    |--------------------------------------------------------------------------
    */

    const shutdown =
      async (
        signal
      ) => {
        /*
        |--------------------------------------------------------------------------
        | Duplicate shutdown protection
        |--------------------------------------------------------------------------
        */

        if (
          shutdownInProgress
        ) {
          console.warn(
            `[Shutdown] ${signal} received while shutdown is already in progress.`
          );

          return;
        }


        shutdownInProgress =
          true;


        console.log(
          `\n${signal} received. Shutting down gracefully...`
        );


        /*
        |--------------------------------------------------------------------------
        | 1. Stop future scheduler work
        |--------------------------------------------------------------------------
        |
        | Clearing scheduler timeout/interval handles prevents new scheduled
        | jobs from being launched while the process is shutting down.
        |
        |--------------------------------------------------------------------------
        */

        try {
          stopVrmScheduler();
        } catch (
          error
        ) {
          console.error(
            `[Shutdown] Scheduler stop failed: ${
              error instanceof Error
                ? error.message
                : String(
                    error
                  )
            }`
          );
        }


        /*
        |--------------------------------------------------------------------------
        | 2. Forced termination fallback
        |--------------------------------------------------------------------------
        |
        | Graceful shutdown is allowed a finite drain period.
        |
        | If HTTP work, database shutdown, or another runtime resource prevents
        | completion, the process cannot remain alive indefinitely.
        |
        |--------------------------------------------------------------------------
        */

        const forceExitTimer =
          setTimeout(
            () => {
              console.error(
                `[Shutdown] Graceful shutdown exceeded ${SHUTDOWN_TIMEOUT_MS} ms. Forcing termination.`
              );

              process.exit(
                1
              );
            },
            SHUTDOWN_TIMEOUT_MS
          );


        /*
        |--------------------------------------------------------------------------
        | The shutdown timer itself must not unnecessarily keep the process alive
        |--------------------------------------------------------------------------
        */

        forceExitTimer.unref?.();


        try {
          /*
          |--------------------------------------------------------------------------
          | 3. Stop accepting new HTTP connections
          |--------------------------------------------------------------------------
          |
          | server.close():
          | - stops accepting new connections
          | - allows active requests to finish
          |
          |--------------------------------------------------------------------------
          */

          await new Promise(
            (
              resolveClose,
              rejectClose
            ) => {
              server.close(
                (
                  error
                ) => {
                  if (
                    error
                  ) {
                    rejectClose(
                      error
                    );

                    return;
                  }


                  resolveClose();
                }
              );


              /*
              |--------------------------------------------------------------------------
              | Close idle keep-alive connections when supported by Node
              |--------------------------------------------------------------------------
              |
              | This does not abort active requests.
              |
              |--------------------------------------------------------------------------
              */

              server
                .closeIdleConnections
                ?.();
            }
          );


          console.log(
            "HTTP server closed."
          );


          /*
          |--------------------------------------------------------------------------
          | 4. Close MongoDB / Mongoose
          |--------------------------------------------------------------------------
          |
          | connectDatabase() uses mongoose.connect(), therefore this closes the
          | same default Mongoose connection rather than creating another DB
          | connection path.
          |
          |--------------------------------------------------------------------------
          */

          if (
            mongoose
              .connection
              .readyState !==
            0
          ) {
            await mongoose.disconnect();

            console.log(
              "MongoDB connection closed."
            );
          } else {
            console.log(
              "MongoDB connection already closed."
            );
          }


          app.locals.databaseStatus =
            "disconnected";


          /*
          |--------------------------------------------------------------------------
          | 5. Successful graceful shutdown
          |--------------------------------------------------------------------------
          */

          clearTimeout(
            forceExitTimer
          );


          console.log(
            "ASHMAAN shutdown complete."
          );


          process.exit(
            0
          );
        } catch (
          error
        ) {
          /*
          |--------------------------------------------------------------------------
          | Graceful shutdown failed
          |--------------------------------------------------------------------------
          */

          console.error(
            `[Shutdown] Graceful shutdown failed: ${
              error instanceof Error
                ? error.message
                : String(
                    error
                  )
            }`
          );


          /*
          |--------------------------------------------------------------------------
          | Best-effort database cleanup
          |--------------------------------------------------------------------------
          */

          try {
            if (
              mongoose
                .connection
                .readyState !==
              0
            ) {
              await mongoose.disconnect();

              console.log(
                "MongoDB connection closed after shutdown error."
              );
            }
          } catch (
            databaseError
          ) {
            console.error(
              `[Shutdown] MongoDB disconnect failed: ${
                databaseError instanceof Error
                  ? databaseError.message
                  : String(
                      databaseError
                    )
              }`
            );
          }


          clearTimeout(
            forceExitTimer
          );


          process.exit(
            1
          );
        }
      };


    /*
    |--------------------------------------------------------------------------
    | Operating-system shutdown signals
    |--------------------------------------------------------------------------
    */

    process.on(
      "SIGINT",
      () => {
        void shutdown(
          "SIGINT"
        );
      }
    );


    process.on(
      "SIGTERM",
      () => {
        void shutdown(
          "SIGTERM"
        );
      }
    );
  };


/*
|--------------------------------------------------------------------------
| Bootstrap
|--------------------------------------------------------------------------
*/

startServer()
  .catch(
    (
      error
    ) => {
      console.error(
        `[Startup] ASHMAAN backend failed to start: ${
          error instanceof Error
            ? error.message
            : String(
                error
              )
        }`
      );


      process.exit(
        1
      );
    }
  );