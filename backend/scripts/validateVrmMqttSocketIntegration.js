import "dotenv/config";

import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase
    from "../config/database.js";

import {
    io as createSocketClient,
} from "socket.io-client";

import env from "../config/env.js";

import {
    initializeSocketServer,
    closeSocketServer,
} from "../realtime/socketServer.js";

import {
    startVrmLiveTelemetry,
    stopVrmLiveTelemetry,
} from "../services/vrm/vrmLiveTelemetryService.js";


const SITE_ID =
    process.env.LIVE_VRM_SITE_ID ||
    "18053";

const HOST =
    "127.0.0.1";

const TIMEOUT_MS =
    60_000;

let pass = 0;
let fail = 0;
let assertion = 0;

let httpServer = null;
let socketClient = null;
let databaseConnected = false;


const check = (
    condition,
    message
) => {
    assertion += 1;

    if (condition) {
        pass += 1;

        console.log(
            `PASS ${assertion}: ${message}`
        );

        return true;
    }

    fail += 1;

    console.error(
        `FAIL ${assertion}: ${message}`
    );

    return false;
};


const listen =
    (server) =>
        new Promise(
            (
                resolve,
                reject
            ) => {
                const onError =
                    (error) => {
                        server.off(
                            "listening",
                            onListening
                        );

                        reject(error);
                    };

                const onListening =
                    () => {
                        server.off(
                            "error",
                            onError
                        );

                        resolve();
                    };

                server.once(
                    "error",
                    onError
                );

                server.once(
                    "listening",
                    onListening
                );

                server.listen(
                    0,
                    HOST
                );
            }
        );


const closeHttpServer =
    (server) =>
        new Promise(
            (resolve) => {
                if (
                    !server ||
                    !server.listening
                ) {
                    resolve();
                    return;
                }

                server.close(
                    () =>
                        resolve()
                );
            }
        );


const waitForSocketConnect =
    (socket) =>
        new Promise(
            (
                resolve,
                reject
            ) => {
                const timeout =
                    setTimeout(
                        () => {
                            cleanup();

                            reject(
                                new Error(
                                    "Socket.IO client connection timed out."
                                )
                            );
                        },
                        10_000
                    );

                const cleanup =
                    () => {
                        clearTimeout(
                            timeout
                        );

                        socket.off(
                            "connect",
                            onConnect
                        );

                        socket.off(
                            "connect_error",
                            onError
                        );
                    };

                const onConnect =
                    () => {
                        cleanup();
                        resolve();
                    };

                const onError =
                    (error) => {
                        cleanup();
                        reject(error);
                    };

                socket.once(
                    "connect",
                    onConnect
                );

                socket.once(
                    "connect_error",
                    onError
                );
            }
        );


const subscribeToSite =
    (socket) =>
        new Promise(
            (
                resolve,
                reject
            ) => {
                let settled = false;

                const timeout =
                    setTimeout(
                        () => {
                            if (settled) {
                                return;
                            }

                            settled = true;

                            reject(
                                new Error(
                                    "site:subscribe acknowledgement timed out."
                                )
                            );
                        },
                        15_000
                    );

                socket.emit(
                    "site:subscribe",
                    {
                        vrmSiteId:
                            SITE_ID,
                    },
                    (response) => {
                        if (settled) {
                            return;
                        }

                        settled = true;

                        clearTimeout(
                            timeout
                        );

                        if (
                            response?.success !==
                            true
                        ) {
                            reject(
                                new Error(
                                    response?.error ||
                                    "Site subscription failed."
                                )
                            );

                            return;
                        }

                        resolve(
                            response
                        );
                    }
                );
            }
        );


const waitForRealTelemetry =
    (socket) =>
        new Promise(
            (
                resolve,
                reject
            ) => {
                const timeout =
                    setTimeout(
                        () => {
                            cleanup();

                            reject(
                                new Error(
                                    `No real allowlisted telemetry:update received within ${TIMEOUT_MS} ms.`
                                )
                            );
                        },
                        TIMEOUT_MS
                    );

                const cleanup =
                    () => {
                        clearTimeout(
                            timeout
                        );

                        socket.off(
                            "telemetry:update",
                            onTelemetry
                        );
                    };

                const onTelemetry =
                    (message) => {
                        if (
                            String(
                                message
                                    ?.vrmSiteId ??
                                    ""
                            ) !==
                            String(
                                SITE_ID
                            )
                        ) {
                            return;
                        }

                        if (
                            !Array.isArray(
                                message?.records
                            ) ||
                            message.records
                                .length ===
                                0
                        ) {
                            return;
                        }

                        const record =
                            message.records.find(
                                (
                                    candidate
                                ) =>
                                    candidate
                                        ?.source ===
                                        "VRM_MQTT"
                            );

                        if (!record) {
                            return;
                        }

                        cleanup();

                        resolve({
                            message,
                            record,
                        });
                    };

                socket.on(
                    "telemetry:update",
                    onTelemetry
                );
            }
        );


console.log(
    "=============================================="
);

console.log(
    "ASHMAAN VRM MQTT -> SOCKET.IO INTEGRATION"
);

console.log(
    "=============================================="
);


try {
    /*
     * -------------------------------------------------
     * 1. Validate JWT prerequisite
     * -------------------------------------------------
     */

    check(
        Boolean(
            env.jwtSecret
        ),
        "JWT secret is available without being printed"
    );

    if (!env.jwtSecret) {
        throw new Error(
            "JWT_SECRET is required."
        );
    }


    /*
     * Local validation credential only.
     * The token itself is never printed.
     */

    const token =
        jwt.sign(
            {
                sub:
                    "l3e-live-integration-validator",

                role:
                    "OPERATOR",
            },
            env.jwtSecret,
            {
                algorithm:
                    "HS256",

                expiresIn:
                    "5m",

                jwtid:
                    `l3e-${Date.now()}`,
            }
        );


    check(
        typeof token ===
            "string" &&
            token.length > 0,
        "short-lived validation JWT was created without being printed"
    );


    /*
     * -------------------------------------------------
     * 2. Connect MongoDB
     * -------------------------------------------------
     *
     * site:subscribe performs Installation.findOne()
     * as an inventory-validation boundary.
     *
     * Therefore this integration validator must have
     * a real MongoDB connection before the Socket.IO
     * subscription is attempted.
     */

    await connectDatabase();


    databaseConnected =
        mongoose.connection.readyState ===
        1;


    check(
        databaseConnected,
        "MongoDB connected for installation inventory validation"
    );


    if (!databaseConnected) {
        throw new Error(
            "MongoDB connection was not established."
        );
    }


    /*
     * -------------------------------------------------
     * 3. Start isolated HTTP + Socket.IO transport
     * -------------------------------------------------
     */

    const app =
        express();


    httpServer =
        http.createServer(
            app
        );


    initializeSocketServer(
        httpServer
    );


    await listen(
        httpServer
    );


    const address =
        httpServer.address();


    const port =
        typeof address ===
            "object" &&
        address
            ? address.port
            : null;


    check(
        Number.isInteger(
            port
        ) &&
            port > 0,
        "isolated HTTP and Socket.IO server started on an ephemeral port"
    );


    /*
     * -------------------------------------------------
     * 4. Connect authenticated Socket.IO client
     * -------------------------------------------------
     */

    socketClient =
        createSocketClient(
            `http://${HOST}:${port}`,
            {
                auth: {
                    token,
                },

                transports: [
                    "websocket",
                ],

                reconnection:
                    false,

                timeout:
                    10_000,

                forceNew:
                    true,
            }
        );


    await waitForSocketConnect(
        socketClient
    );


    check(
        socketClient.connected ===
            true,
        "authenticated Socket.IO validation client connected"
    );


    /*
     * -------------------------------------------------
     * 5. Subscribe to real installation room
     * -------------------------------------------------
     */

    const subscription =
        await subscribeToSite(
            socketClient
        );


    check(
        subscription
            ?.vrmSiteId ===
            String(SITE_ID),
        `authenticated client subscribed to site ${SITE_ID}`
    );


    check(
        subscription
            ?.room ===
            `site:${SITE_ID}`,
        "client joined the canonical site room"
    );


    /*
     * -------------------------------------------------
     * 6. Arm Socket.IO listener BEFORE MQTT startup
     * -------------------------------------------------
     *
     * This ordering is mandatory.
     *
     * The initial VRM keepalive causes the GX to
     * republish its notification set. The Socket.IO
     * client must already be listening so that the
     * first allowlisted real measurement cannot be
     * missed.
     */

    const telemetryPromise =
        waitForRealTelemetry(
            socketClient
        );


    /*
     * -------------------------------------------------
     * 7. Start real production MQTT source
     * -------------------------------------------------
     */

    await startVrmLiveTelemetry(
        SITE_ID
    );


    check(
        true,
        "real VRM MQTT production service started"
    );


    /*
     * -------------------------------------------------
     * 8. Wait for actual VRM -> Socket.IO telemetry
     * -------------------------------------------------
     */

    const {
        message,
        record,
    } =
        await telemetryPromise;


    check(
        String(
            message.vrmSiteId
        ) ===
            String(SITE_ID),
        "telemetry:update preserves the subscribed VRM site ID"
    );


    check(
        record.source ===
            "VRM_MQTT",
        "Socket.IO record is sourced from real VRM MQTT"
    );


    check(
        Number.isInteger(
            record.vrmAttributeId
        ),
        "Socket.IO record contains an evidence-backed VRM attribute ID"
    );


    check(
        typeof record.dbusPath ===
            "string" &&
            record.dbusPath.startsWith(
                "/"
            ),
        "Socket.IO record preserves its mapped D-Bus path"
    );


    /*
     * missing != zero
     *
     * Zero remains a legitimate observed value.
     * Null remains unavailable.
     */

    check(
        record.numericValue ===
            null ||
            (
                typeof record.numericValue ===
                    "number" &&
                Number.isFinite(
                    record.numericValue
                )
            ),
        "live numeric value preserves number-or-null semantics"
    );


    check(
        (
            record.numericValue ===
                null &&
            record.quality ===
                "UNAVAILABLE"
        ) ||
        (
            typeof record.numericValue ===
                "number" &&
            record.quality ===
                "GOOD"
        ),
        "quality remains consistent with null/observed-value semantics"
    );


    check(
        typeof record.timestamp ===
            "string" &&
            !Number.isNaN(
                Date.parse(
                    record.timestamp
                )
            ),
        "live record contains a valid receive timestamp"
    );


    /*
     * Print only the approved engineering record.
     *
     * Never print:
     * - access token
     * - JWT
     * - MQTT password
     * - arbitrary MQTT payloads
     * - network/security/settings topics
     */

    console.log("");

    console.log(
        "First delivered live record:"
    );


    console.log(
        JSON.stringify(
            {
                vrmSiteId:
                    record.vrmSiteId,

                vrmAttributeId:
                    record.vrmAttributeId,

                serviceType:
                    record.serviceType,

                deviceInstance:
                    record.deviceInstance,

                dbusPath:
                    record.dbusPath,

                unit:
                    record.unit,

                numericValue:
                    record.numericValue,

                quality:
                    record.quality,

                source:
                    record.source,

                timestamp:
                    record.timestamp,
            },
            null,
            2
        )
    );

} catch (error) {
    fail += 1;

    console.error(
        "VALIDATOR ERROR:",
        error.message
    );

} finally {

    /*
     * -------------------------------------------------
     * Cleanup order
     * -------------------------------------------------
     *
     * MQTT publisher
     *     ↓
     * Socket.IO client
     *     ↓
     * Socket.IO server
     *     ↓
     * HTTP server
     *     ↓
     * MongoDB
     *
     * This prevents live telemetry from attempting
     * delivery after the realtime transport is closed.
     */

    try {
        await stopVrmLiveTelemetry(
            SITE_ID
        );
    } catch {
        // Best-effort cleanup.
    }


    if (socketClient) {
        socketClient.disconnect();

        socketClient =
            null;
    }


    try {
        await closeSocketServer();
    } catch {
        // Best-effort cleanup.
    }


    try {
        await closeHttpServer(
            httpServer
        );
    } catch {
        // Best-effort cleanup.
    }


    /*
     * Close MongoDB last because Socket.IO
     * site subscription validation depends
     * on the Installation collection.
     */

    try {
        if (
            mongoose.connection.readyState !==
            0
        ) {
            await mongoose.connection.close();
        }

        databaseConnected =
            false;

    } catch {
        // Best-effort cleanup.
    }
}


console.log("");

console.log(
    "=============================================="
);

console.log(
    `PASS: ${pass}`
);

console.log(
    `FAIL: ${fail}`
);


if (fail === 0) {
    console.log(
        "L.3E REAL VRM MQTT -> SOCKET.IO INTEGRATION: PASS"
    );
} else {
    console.error(
        "L.3E REAL VRM MQTT -> SOCKET.IO INTEGRATION: FAIL"
    );

    process.exitCode = 1;
}