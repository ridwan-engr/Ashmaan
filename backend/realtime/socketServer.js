import { Server } from "socket.io";

import env from "../config/env.js";

import authenticateSocket
    from "./authenticateSocket.js";

import {
    INSTALLATION_RESOURCE_RESOLUTION,
    resolveInstallationByVrmSiteId,
} from "../services/security/installationResourceResolver.js";

import {
    SITE_RESOURCE_AUTHORIZATION_DECISIONS,
    authorizeSiteResource,
} from "../services/security/siteResourceAuthorizationService.js";

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
                    const acknowledge = (result) => {
                        if (
                            typeof acknowledgement === "function"
                        ) {
                            acknowledgement(result);
                        }
                    };


                    try {
                        // 1. Require an authenticated socket.
                        if (
                            socket.data.auth?.authenticated !== true
                        ) {
                            acknowledge({
                                success: false,
                                code: "AUTHENTICATION_REQUIRED",
                                error: "Authentication is required.",
                            });

                            return;
                        }

                        const userId =
                            socket.data.auth?.identity?.id;

                        if (
                            typeof userId !== "string" ||
                            userId.trim() === ""
                        ) {
                            acknowledge({
                                success: false,
                                code: "AUTHENTICATION_REQUIRED",
                                error: "Authentication is required.",
                            });

                            return;
                        }

                        // 2. Validate the requested VRM site ID.
                        const vrmSiteId = normalizeVrmSiteId(
                            payload.vrmSiteId
                        );


                        if (!vrmSiteId) {
                            acknowledge({
                                success: false,
                                code: "INVALID_SITE_ID",
                                error: "A valid VRM site ID is required.",
                            });

                            return;
                        }

                        // 3. Resolve VRM site ID to the canonical
                        //    ASHMAAN installation resource.
                        const resolution =
                            await resolveInstallationByVrmSiteId({
                                vrmSiteId,
                            });

                        if (
                            resolution?.status ===
                            INSTALLATION_RESOURCE_RESOLUTION.INVALID
                        ) {
                            acknowledge({
                                success: false,
                                code: "INVALID_SITE_ID",
                                error: "A valid VRM site ID is required.",
                            });

                            return;
                        }

                        if (
                            resolution?.status ===
                            INSTALLATION_RESOURCE_RESOLUTION.NOT_FOUND
                        ) {
                            acknowledge({
                                success: false,
                                code: "SITE_NOT_FOUND",
                                error: "Installation was not found.",
                            });

                            return;
                        }

                        if (
                            resolution?.status !==
                                INSTALLATION_RESOURCE_RESOLUTION.RESOLVED ||
                            !resolution?.installationId
                        ) {
                            acknowledge({
                                success: false,
                                code: "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
                                error:
                                    "Installation authorization is temporarily unavailable.",
                            });

                            return;
                        }

                        // 4. Enforce explicit user-to-installation ACL.
                        const authorization =
                            await authorizeSiteResource({
                                userId,
                                installationId:
                                    resolution.installationId,
                            });

                        if (
                            authorization?.decision ===
                            SITE_RESOURCE_AUTHORIZATION_DECISIONS.DENY
                        ) {
                            acknowledge({
                                success: false,
                                code: "INSTALLATION_ACCESS_DENIED",
                                error: "Installation access denied.",
                            });

                            return;
                        }

                        // Unknown or unavailable decisions must fail closed.
                        if (
                            authorization?.decision !==
                                SITE_RESOURCE_AUTHORIZATION_DECISIONS.ALLOW ||
                            authorization?.allowed !== true
                        ) {
                            acknowledge({
                                success: false,
                                code: "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
                                error:
                                    "Installation authorization is temporarily unavailable.",
                            });

                            return;
                        }

                        // 5. Join only after authorization succeeds.
                        const room = getSiteRoomName(vrmSiteId);

                        if (!room) {
                            acknowledge({
                                success: false,
                                code: "INVALID_SITE_ID",
                                error: "A valid VRM site ID is required.",
                            });

                            return;
                        }

                        await socket.join(room);

                        console.log(
                            `[Socket.IO] ${socket.id} authorized and subscribed to ${room}`
                        );

                        // 6. Preserve the existing success contract.
                        acknowledge({

                            success: true,

                            vrmSiteId,
                            
                            room,
                        });
                    } catch (error) {
                        console.error(
                            `[Socket.IO] Site subscription failed: ${
                                error instanceof Error
                                    ? error.message
                                    : String(error)
                            }`
                        );


                        acknowledge({
                            success: false,
                            code: "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
                            error:
                                "Installation authorization is temporarily unavailable.",
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