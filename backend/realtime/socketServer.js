import { Server } from "socket.io";

import env from "../config/env.js";

import authenticateSocket
    from "./authenticateSocket.js";

import Installation
    from "../models/Installation.js";

let io = null;


/*
|--------------------------------------------------------------------------
| Normalize site identifier
|--------------------------------------------------------------------------
*/

const normalizeVrmSiteId = (value) => {
    const siteId =
        String(
            value ?? ""
        ).trim();

    if (
        !/^\d+$/.test(
            siteId
        )
    ) {
        return null;
    }

    return siteId;
};


/*
|--------------------------------------------------------------------------
| Room name
|--------------------------------------------------------------------------
*/

const getSiteRoomName = (
    vrmSiteId
) => {
    const normalized =
        normalizeVrmSiteId(
            vrmSiteId
        );

    if (!normalized) {
        return null;
    }

    return `site:${normalized}`;
};


/*
|--------------------------------------------------------------------------
| Initialize Socket.IO
|--------------------------------------------------------------------------
*/

const initializeSocketServer = (
    httpServer
) => {
    if (!httpServer) {
        throw new Error(
            "HTTP server is required to initialize Socket.IO."
        );
    }

    if (io) {
        return io;
    }

    io = new Server(
        httpServer,
        {
            cors: {
                origin:
                    env.corsOrigins,

                methods: [
                    "GET",
                    "POST",
                ],

                credentials:
                    true,
            },

            transports: [
                "websocket",
                "polling",
            ],
        }
    );

    /*
  |--------------------------------------------------------------------------
  | Socket authentication
  |--------------------------------------------------------------------------
  */

    io.use(
        authenticateSocket
    );

    /*
    |--------------------------------------------------------------------------
    | Connection lifecycle
    |--------------------------------------------------------------------------
    */

    io.on(
        "connection",
        (socket) => {
            console.log(
                `[Socket.IO] Connected: ${socket.id} user=${socket.data.auth?.identity?.id ?? "UNKNOWN"} role=${socket.data.auth?.role ?? "UNKNOWN"}`
            );


            /*
            |--------------------------------------------------------------------------
            | Site subscription
            |--------------------------------------------------------------------------
            */

            socket.on(
                "site:subscribe",
                async (
                    payload = {},
                    acknowledgement
                ) => {
                    const acknowledge =
                        (
                            result
                        ) => {
                            if (
                                typeof acknowledgement ===
                                "function"
                            ) {
                                acknowledgement(
                                    result
                                );
                            }
                        };


                    try {
                        if (
                            socket.data.auth
                                ?.authenticated !==
                            true
                        ) {
                            acknowledge({
                                success: false,
                                code:
                                    "AUTHENTICATION_REQUIRED",
                                error:
                                    "Authentication is required.",
                            });

                            return;
                        }


                        const vrmSiteId =
                            normalizeVrmSiteId(
                                payload.vrmSiteId
                            );


                        if (!vrmSiteId) {
                            acknowledge({
                                success: false,
                                code:
                                    "INVALID_SITE_ID",
                                error:
                                    "A valid VRM site ID is required.",
                            });

                            return;
                        }


                        /*
                        |--------------------------------------------------------------------------
                        | Installation existence
                        |--------------------------------------------------------------------------
                        |
                        | This establishes that the requested VRM installation belongs to the
                        | ASHMAAN installation inventory.
                        |
                        | It is NOT yet user-to-site ACL authorization.
                        |
                        */

                        const installation =
                            await Installation
                                .findOne({
                                    vrmSiteId:
                                        Number(
                                            vrmSiteId
                                        ),
                                })
                                .select({
                                    _id: 1,
                                    vrmSiteId: 1,
                                    status: 1,
                                    source: 1,
                                })
                                .lean();


                        if (!installation) {
                            acknowledge({
                                success: false,
                                code:
                                    "SITE_NOT_FOUND",
                                error:
                                    "Installation was not found.",
                            });

                            return;
                        }


                        const room =
                            getSiteRoomName(
                                vrmSiteId
                            );


                        await socket.join(
                            room
                        );


                        console.log(
                            `[Socket.IO] ${socket.id} subscribed to ${room}`
                        );


                        acknowledge({
                            success: true,

                            vrmSiteId,

                            room,
                        });
                    } catch (
                    error
                    ) {
                        console.error(
                            `[Socket.IO] Site subscription failed: ${error instanceof Error
                                ? error.message
                                : String(error)
                            }`
                        );


                        acknowledge({
                            success: false,
                            code:
                                "SITE_SUBSCRIPTION_FAILED",
                            error:
                                "Unable to subscribe to installation.",
                        });
                    }
                }
            );

            /*
            |--------------------------------------------------------------------------
            | Site unsubscription
            |--------------------------------------------------------------------------
            */

            socket.on(
                "site:unsubscribe",
                async (
                    payload = {},
                    acknowledgement
                ) => {
                    const vrmSiteId =
                        normalizeVrmSiteId(
                            payload.vrmSiteId
                        );

                    if (!vrmSiteId) {
                        const result = {
                            success: false,
                            error:
                                "A valid VRM site ID is required.",
                        };

                        if (
                            typeof acknowledgement ===
                            "function"
                        ) {
                            acknowledgement(
                                result
                            );
                        }

                        return;
                    }

                    const room =
                        getSiteRoomName(
                            vrmSiteId
                        );

                    await socket.leave(
                        room
                    );

                    console.log(
                        `[Socket.IO] ${socket.id} unsubscribed from ${room}`
                    );

                    if (
                        typeof acknowledgement ===
                        "function"
                    ) {
                        acknowledgement({
                            success: true,
                            vrmSiteId,
                            room,
                        });
                    }
                }
            );


            socket.on(
                "disconnect",
                (reason) => {
                    console.log(
                        `[Socket.IO] Disconnected: ${socket.id} (${reason})`
                    );
                }
            );
        }
    );


    console.log(
        "[Socket.IO] Live transport initialized."
    );

    return io;
};


/*
|--------------------------------------------------------------------------
| Get initialized server
|--------------------------------------------------------------------------
*/

const getSocketServer = () => {
    return io;
};


/*
|--------------------------------------------------------------------------
| Publish site telemetry
|--------------------------------------------------------------------------
*/

const publishSiteTelemetry = ({
    vrmSiteId,
    records,
    timestamp =
    new Date().toISOString(),
}) => {
    if (!io) {
        return false;
    }

    const normalized =
        normalizeVrmSiteId(
            vrmSiteId
        );

    if (!normalized) {
        return false;
    }

    const room =
        getSiteRoomName(
            normalized
        );

    io
        .to(room)
        .emit(
            "telemetry:update",
            {
                vrmSiteId:
                    normalized,

                timestamp,

                records:
                    Array.isArray(records)
                        ? records
                        : [],
            }
        );

    return true;
};


/*
|--------------------------------------------------------------------------
| Shutdown
|--------------------------------------------------------------------------
*/

const closeSocketServer =
    async () => {
        if (!io) {
            return;
        }

        const currentIo =
            io;

        io = null;

        await new Promise(
            (
                resolve
            ) => {
                currentIo.close(
                    () => {
                        resolve();
                    }
                );
            }
        );

        console.log(
            "[Socket.IO] Live transport closed."
        );
    };


export {
    initializeSocketServer,
    getSocketServer,
    getSiteRoomName,
    publishSiteTelemetry,
    closeSocketServer,
};