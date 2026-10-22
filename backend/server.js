import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import http from "node:http";

import env from "./config/env.js";
import connectDatabase from "./config/database.js";
import optimizationDssConfigurationRoutes
  from "./routes/optimizationDssConfigurationRoutes.js";
import apiRoutes from "./routes/index.js";
import dashboardRoutes
  from "./routes/dashboardRoutes.js";
import siteDashboardRoutes
  from "./routes/siteDashboardRoutes.js";
import reliabilityRoutes
  from "./routes/reliabilityRoutes.js";
import optimizationDssRoutes
  from "./routes/optimizationDssRoutes.js";

import authenticatePortalAccessToken
  from "./middleware/authenticatePortalAccessToken.js";

import requireActivePortalSession
  from "./middleware/requireActivePortalSession.js";

import requirePortalPermission
  from "./middleware/requirePortalPermission.js";

import {
  RBAC_PERMISSIONS,
} from "./services/security/authorizationRbacService.js";

import notFound
  from "./middleware/notFound.js";
import errorHandler
  from "./middleware/errorHandler.js";

import {
  startVrmScheduler,
  stopVrmScheduler,
} from "./services/scheduler/vrmScheduler.js";

import {
  initializeSocketServer,
  closeSocketServer,
} from "./realtime/socketServer.js";

import {
  startVrmLiveFleet,
  stopVrmLiveFleet,
  getVrmLiveFleetState,
} from "./services/vrm/vrmLiveFleetService.js";


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
      typeof req.originalUrl ===
        "string"
        ? req.originalUrl
        : typeof req.url ===
          "string"
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


/*
|--------------------------------------------------------------------------
| Portal dashboard authorization
|--------------------------------------------------------------------------
|
| Dashboard, site-dashboard, and reliability read surfaces require:
|
| 1. Valid portal ACCESS token
| 2. Active persistent portal session
| 3. Explicit READ_DASHBOARD permission
|
| This authorization boundary does not grant equipment control or
| automatic dispatch.
|
|--------------------------------------------------------------------------
*/

const requireDashboardRead =
  requirePortalPermission(
    RBAC_PERMISSIONS.READ_DASHBOARD
  );

const requireOptimizationDssRead =
  requirePortalPermission(
    RBAC_PERMISSIONS.READ_OPTIMIZATION_DSS
  );


app.use(
  "/api/v1/dashboard",
  authenticatePortalAccessToken,
  requireActivePortalSession,
  requireDashboardRead,
  dashboardRoutes
);


app.use(
  "/api/v1/dashboard/sites",
  authenticatePortalAccessToken,
  requireActivePortalSession,
  requireDashboardRead,
  siteDashboardRoutes
);


app.use(
  "/api/v1/reliability",
  authenticatePortalAccessToken,
  requireActivePortalSession,
  requireDashboardRead,
  reliabilityRoutes
);

/*
|--------------------------------------------------------------------------
| Optimization/DSS configuration
|--------------------------------------------------------------------------
|
| Authentication and active-session validation occur here.
|
| Route-level middleware separately enforces:
|
| - READ_OPTIMIZATION_DSS for configuration reads
| - MANAGE_OPTIMIZATION_DSS for configuration writes
| - explicit installation ACL for both
|
| This surface configures advisory optimization constraints only.
| It does not grant equipment control or automatic dispatch.
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/v1/optimization-dss",
  authenticatePortalAccessToken,
  requireActivePortalSession,
  optimizationDssConfigurationRoutes
);


/*
|--------------------------------------------------------------------------
| Legacy Optimization/DSS route
|--------------------------------------------------------------------------
|
| This existing legacy route is intentionally preserved at this gate.
| Its authorization/bypass treatment belongs to the dedicated legacy-route
| security gate rather than P.1G-C.
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/optimization-dss",
  authenticatePortalAccessToken,
  requireActivePortalSession,
  requireOptimizationDssRead,
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
      http.createServer(
        app
      );


    /*
    |--------------------------------------------------------------------------
    | Socket.IO live transport
    |--------------------------------------------------------------------------
    |
    | Socket.IO attaches to the same HTTP server used by Express.
    |
    |--------------------------------------------------------------------------
    */

    initializeSocketServer(
      server
    );


    /*
    |--------------------------------------------------------------------------
    | HTTP listener
    |--------------------------------------------------------------------------
    |
    | Listener readiness is awaited before dependent runtime services start.
    |
    |--------------------------------------------------------------------------
    */

    await new Promise(
      (
        resolveListen,
        rejectListen
      ) => {
        const handleListening =
          () => {
            server.off(
              "error",
              handleError
            );

            resolveListen();
          };


        const handleError =
          (
            error
          ) => {
            server.off(
              "listening",
              handleListening
            );

            rejectListen(
              error
            );
          };


        server.once(
          "listening",
          handleListening
        );


        server.once(
          "error",
          handleError
        );


        server.listen(
          env.port
        );
      }
    );


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
    | Historical VRM scheduler
    |--------------------------------------------------------------------------
    |
    | Historical REST synchronization remains independent from the MQTT
    | realtime transport.
    |
    |--------------------------------------------------------------------------
    */

    startVrmScheduler();


    /*
    |--------------------------------------------------------------------------
    | VRM live MQTT fleet
    |--------------------------------------------------------------------------
    |
    | Live MQTT is explicitly opt-in.
    |
    | Starting the backend must not create the production MQTT fleet unless
    | VRM_LIVE_FLEET_ENABLED=true.
    |
    |--------------------------------------------------------------------------
    */

    if (
      env.vrm.liveFleetEnabled
    ) {
      const liveFleetScope =
        env.vrm.liveFleetSiteIds === null
          ? "ALL_QUALIFIED"
          : env.vrm.liveFleetSiteIds.length > 0
            ? env.vrm.liveFleetSiteIds.join(",")
            : "NONE";

      console.log(
        `[VRM MQTT Fleet] Starting with bounded concurrency ${env.vrm.liveFleetStartupConcurrency}; scope=${liveFleetScope}...`
      );

      /*
       * VRM live telemetry is an external integration.
       *
       * A temporary VRM API/MQTT failure must not prevent the
       * ASHMAAN HTTP API, database, scheduler, or Socket.IO
       * transport from starting.
       *
       * startVrmLiveFleet() already isolates normal per-site
       * failures in its returned result. This outer boundary
       * handles failures that occur before a fleet result can
       * be returned at all.
       */
      try {
        const fleetStartResult =
          await startVrmLiveFleet({
            siteIds:
              env.vrm.liveFleetSiteIds,

            concurrency:
              env.vrm.liveFleetStartupConcurrency,
          });

        const fleetState =
          getVrmLiveFleetState();

        console.log(
          `[VRM MQTT Fleet] Startup complete: selected=${fleetStartResult.selectedSiteCount}, started=${fleetStartResult.startedCount}, failed=${fleetStartResult.failedCount}, connected=${fleetState.connectedCount}`
        );

        if (
          fleetStartResult.failedCount >
          0
        ) {
          console.warn(
            `[VRM MQTT Fleet] ${fleetStartResult.failedCount} site(s) failed isolated startup.`
          );
        }
      } catch (
      fleetError
      ) {
        /*
         * Degraded startup:
         *
         * Keep ASHMAAN available even when VRM cannot be
         * reached during process initialization.
         */
        console.error(
          `[VRM MQTT Fleet] Startup degraded: ${fleetError instanceof Error
            ? fleetError.message
            : String(
              fleetError
            )
          }`
        );

        console.warn(
          "[VRM MQTT Fleet] Backend will continue without fully initialized live VRM telemetry."
        );
      }
    } else {
      console.log(
        "[VRM MQTT Fleet] Disabled by configuration."
      );
    }

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
        */

        try {
          stopVrmScheduler();
        } catch (
        error
        ) {
          console.error(
            `[Shutdown] Scheduler stop failed: ${error instanceof Error
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
          | 3. Stop VRM live MQTT fleet
          |--------------------------------------------------------------------------
          |
          | MQTT publishers must stop before Socket.IO is closed.
          |
          |--------------------------------------------------------------------------
          */

          if (
            env.vrm.liveFleetEnabled
          ) {
            const fleetStopResult =
              await stopVrmLiveFleet({
                concurrency:
                  env.vrm.liveFleetStartupConcurrency,
              });


            console.log(
              `[Shutdown] VRM MQTT fleet stopped: targeted=${fleetStopResult.targetSiteCount}, stopped=${fleetStopResult.stoppedCount}, failed=${fleetStopResult.failedCount}`
            );


            if (
              fleetStopResult.failedCount >
              0
            ) {
              console.error(
                `[Shutdown] ${fleetStopResult.failedCount} VRM MQTT site(s) failed graceful stop.`
              );
            }
          }


          /*
          |--------------------------------------------------------------------------
          | 4. Close Socket.IO live transport
          |--------------------------------------------------------------------------
          |
          | All MQTT telemetry producers have now been stopped, so the realtime
          | transport can be closed safely.
          |
          |--------------------------------------------------------------------------
          */

          await closeSocketServer();


          /*
          |--------------------------------------------------------------------------
          | 5. Stop accepting new HTTP connections
          |--------------------------------------------------------------------------
          */

          await new Promise(
            (
              resolveClose,
              rejectClose
            ) => {
              /*
              |--------------------------------------------------------------------------
              | Socket.IO may already have closed the underlying HTTP listener
              |--------------------------------------------------------------------------
              */

              if (
                !server.listening
              ) {
                resolveClose();

                return;
              }


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
          | 6. Close MongoDB / Mongoose
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
          | 7. Successful graceful shutdown
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
            `[Shutdown] Graceful shutdown failed: ${error instanceof Error
              ? error.message
              : String(
                error
              )
            }`
          );


          /*
          |--------------------------------------------------------------------------
          | Best-effort VRM MQTT fleet cleanup
          |--------------------------------------------------------------------------
          */

          if (
            env.vrm.liveFleetEnabled
          ) {
            try {
              await stopVrmLiveFleet({
                concurrency:
                  env.vrm.liveFleetStartupConcurrency,
              });
            } catch (
            fleetError
            ) {
              console.error(
                `[Shutdown] VRM MQTT fleet cleanup failed: ${fleetError instanceof Error
                  ? fleetError.message
                  : String(
                    fleetError
                  )
                }`
              );
            }
          }


          /*
          |--------------------------------------------------------------------------
          | Best-effort Socket.IO cleanup
          |--------------------------------------------------------------------------
          */

          try {
            await closeSocketServer();
          } catch (
          socketError
          ) {
            console.error(
              `[Shutdown] Socket.IO cleanup failed: ${socketError instanceof Error
                ? socketError.message
                : String(
                  socketError
                )
              }`
            );
          }


          /*
          |--------------------------------------------------------------------------
          | Best-effort HTTP cleanup
          |--------------------------------------------------------------------------
          */

          try {
            if (
              server.listening
            ) {
              await new Promise(
                (
                  resolveClose
                ) => {
                  server.close(
                    () => {
                      resolveClose();
                    }
                  );

                  server
                    .closeIdleConnections
                    ?.();
                }
              );
            }
          } catch (
          httpError
          ) {
            console.error(
              `[Shutdown] HTTP cleanup failed: ${httpError instanceof Error
                ? httpError.message
                : String(
                  httpError
                )
              }`
            );
          }


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
              `[Shutdown] MongoDB disconnect failed: ${databaseError instanceof Error
                ? databaseError.message
                : String(
                  databaseError
                )
              }`
            );
          }


          app.locals.databaseStatus =
            "disconnected";


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
        `[Startup] ASHMAAN backend failed to start: ${error instanceof Error
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