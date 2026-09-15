import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mqtt from "mqtt";

import env from "../../config/env.js";
import vrmApiClient from "./apiClient.js";

import {
    parseVrmLiveTelemetryMessage,
} from "./vrmLiveTelemetryParser.js";

import {
    publishSiteTelemetry,
} from "../../realtime/socketServer.js";

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const VRM_CA_PATH =
    path.resolve(
        __dirname,
        "../../certs/venus-ca.crt"
    );

const KEEPALIVE_INTERVAL_MS =
    30_000;

const RECONNECT_MIN_MS =
    5_000;

const RECONNECT_MAX_MS =
    60_000;

const connections =
    new Map();

let shuttingDown =
    false;

const sleep = (ms) =>
    new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                ms
            )
    );

const normalizeSiteId = (
    value
) => {
    const normalized =
        String(
            value ?? ""
        ).trim();

    if (
        !/^\d+$/.test(
            normalized
        )
    ) {
        throw new Error(
            "A valid VRM site ID is required."
        );
    }

    return normalized;
};

const extractInstallations = (
    payload
) => {
    if (
        Array.isArray(
            payload?.records
        )
    ) {
        return payload.records;
    }

    if (
        Array.isArray(
            payload?.data?.records
        )
    ) {
        return payload.data.records;
    }

    if (
        Array.isArray(
            payload?.installations
        )
    ) {
        return payload.installations;
    }

    if (
        Array.isArray(payload)
    ) {
        return payload;
    }

    return [];
};

const discoverLiveSource =
    async (
        vrmSiteId
    ) => {
        if (!env.vrm.userId) {
            throw new Error(
                "VRM_USER_ID is not configured."
            );
        }

        const response =
            await vrmApiClient.get(
                `/users/${env.vrm.userId}/installations`,
                {
                    params: {
                        extended: 1,
                    },
                }
            );

        const installations =
            extractInstallations(
                response.data
            );

        const installation =
            installations.find(
                (candidate) =>
                    Number(
                        candidate.idSite ??
                        candidate.idsite ??
                        candidate.siteId ??
                        candidate.id
                    ) ===
                    Number(vrmSiteId)
            );

        if (!installation) {
            throw new Error(
                `VRM installation ${vrmSiteId} was not found.`
            );
        }

        const portalId =
            String(
                installation.identifier ??
                ""
            ).trim();

        const mqttHost =
            String(
                installation.mqtt_host ??
                ""
            ).trim();

        if (
            !/^[0-9a-f]{12}$/i.test(
                portalId
            )
        ) {
            throw new Error(
                `VRM installation ${vrmSiteId} has no valid Portal ID.`
            );
        }

        if (
            !/^[a-z0-9.-]+$/i.test(
                mqttHost
            )
        ) {
            throw new Error(
                `VRM installation ${vrmSiteId} has no valid MQTT host.`
            );
        }

        return {
            portalId,
            mqttHost,
        };
    };

const readVrmCa = () => {
    if (
        !fs.existsSync(
            VRM_CA_PATH
        )
    ) {
        throw new Error(
            `Victron MQTT CA certificate is missing: ${VRM_CA_PATH}`
        );
    }

    const ca =
        fs.readFileSync(
            VRM_CA_PATH
        );

    if (ca.length === 0) {
        throw new Error(
            "Victron MQTT CA certificate is empty."
        );
    }

    return ca;
};

const publishKeepalive = (
    state,
    suppressRepublish
) =>
    new Promise(
        (
            resolve,
            reject
        ) => {
            if (
                !state.client ||
                !state.client.connected
            ) {
                reject(
                    new Error(
                        "VRM MQTT client is not connected."
                    )
                );

                return;
            }

            const payload =
                suppressRepublish
                    ? JSON.stringify({
                          "keepalive-options": [
                              "suppress-republish",
                          ],
                      })
                    : "";

            state.client.publish(
                `R/${state.portalId}/keepalive`,
                payload,
                {
                    qos: 0,
                    retain: false,
                },
                (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                }
            );
        }
    );

const stopKeepalive = (
    state
) => {
    if (
        state.keepaliveTimer
    ) {
        clearInterval(
            state.keepaliveTimer
        );

        state.keepaliveTimer =
            null;
    }
};

const startKeepalive = (
    state
) => {
    stopKeepalive(
        state
    );

    state.keepaliveTimer =
        setInterval(
            () => {
                if (
                    shuttingDown ||
                    state.stopping ||
                    !state.client
                        ?.connected
                ) {
                    return;
                }

                publishKeepalive(
                    state,
                    true
                ).catch(
                    (error) => {
                        console.error(
                            `[VRM MQTT] keepalive failed for site ${state.vrmSiteId}:`,
                            error.message
                        );
                    }
                );
            },
            KEEPALIVE_INTERVAL_MS
        );

    state.keepaliveTimer
        ?.unref?.();
};

const scheduleReconnect = (
    state
) => {
    if (
        shuttingDown ||
        state.stopping ||
        state.reconnectTimer
    ) {
        return;
    }

    const delay =
        Math.min(
            RECONNECT_MIN_MS *
                2 **
                    state.reconnectAttempt,
            RECONNECT_MAX_MS
        );

    state.reconnectAttempt +=
        1;

    console.warn(
        `[VRM MQTT] site ${state.vrmSiteId} reconnect scheduled in ${delay} ms`
    );

    state.reconnectTimer =
        setTimeout(
            async () => {
                state.reconnectTimer =
                    null;

                if (
                    shuttingDown ||
                    state.stopping
                ) {
                    return;
                }

                try {
                    await connectState(
                        state
                    );
                } catch (error) {
                    console.error(
                        `[VRM MQTT] reconnect failed for site ${state.vrmSiteId}:`,
                        error.message
                    );

                    scheduleReconnect(
                        state
                    );
                }
            },
            delay
        );

    state.reconnectTimer
        ?.unref?.();
};

const handleMessage = (
    state,
    topic,
    payload
) => {
    if (
        topic ===
        `N/${state.portalId}/full_publish_completed`
    ) {
        state.fullPublishCompleted =
            true;

        console.log(
            `[VRM MQTT] initial publication complete for site ${state.vrmSiteId}`
        );

        return;
    }

    const parsed =
        parseVrmLiveTelemetryMessage({
            vrmSiteId:
                state.vrmSiteId,

            portalId:
                state.portalId,

            topic,

            payload,

            receivedAt:
                new Date().toISOString(),
        });

    if (!parsed.accepted) {
        return;
    }

    /*
     * Live telemetry is intentionally
     * NOT persisted to MongoDB here.
     *
     * Historical persistence remains
     * telemetrySyncService's responsibility.
     */
    publishSiteTelemetry({
        vrmSiteId:
            state.vrmSiteId,

        timestamp:
            parsed.record.timestamp,

        records: [
            parsed.record,
        ],
    });
};

const connectState =
    async (
        state
    ) => {
        if (
            shuttingDown ||
            state.stopping
        ) {
            return;
        }

        if (
            !env.vrm.accessToken
        ) {
            throw new Error(
                "VRM_ACCESS_TOKEN is not configured."
            );
        }

        if (
            !env.vrm.mqttUsername
        ) {
            throw new Error(
                "VRM_MQTT_USERNAME is not configured."
            );
        }

        stopKeepalive(
            state
        );

        if (
            state.client
        ) {
            try {
                state.client.removeAllListeners();

                state.client.end(
                    true
                );
            } catch {
                // Best-effort cleanup.
            }

            state.client =
                null;
        }

        const {
            portalId,
            mqttHost,
        } =
            await discoverLiveSource(
                state.vrmSiteId
            );

        state.portalId =
            portalId;

        state.mqttHost =
            mqttHost;

        state.fullPublishCompleted =
            false;

        const ca =
            readVrmCa();

        const client =
            mqtt.connect(
                `mqtts://${mqttHost}:${env.vrm.mqttPort}`,
                {
                    clientId:
                        `ashmaan-${state.vrmSiteId}-${Date.now()}`,

                    username:
                        env.vrm.mqttUsername,

                    password:
                        `Token ${env.vrm.accessToken}`,

                    protocolVersion:
                        4,

                    clean:
                        true,

                    reconnectPeriod:
                        0,

                    connectTimeout:
                        15_000,

                    ca,

                    rejectUnauthorized:
                        true,
                }
            );

        state.client =
            client;

        client.on(
            "message",
            (
                topic,
                payload
            ) => {
                handleMessage(
                    state,
                    topic,
                    payload
                );
            }
        );

        client.on(
            "error",
            (error) => {
                if (
                    shuttingDown ||
                    state.stopping
                ) {
                    return;
                }

                console.error(
                    `[VRM MQTT] site ${state.vrmSiteId} error:`,
                    error.message
                );
            }
        );

        client.on(
            "close",
            () => {
                stopKeepalive(
                    state
                );

                if (
                    shuttingDown ||
                    state.stopping
                ) {
                    return;
                }

                console.warn(
                    `[VRM MQTT] connection closed for site ${state.vrmSiteId}`
                );

                scheduleReconnect(
                    state
                );
            }
        );

        await new Promise(
            (
                resolve,
                reject
            ) => {
                let settled =
                    false;

                const timeout =
                    setTimeout(
                        () => {
                            if (
                                settled
                            ) {
                                return;
                            }

                            settled =
                                true;

                            reject(
                                new Error(
                                    `VRM MQTT connection timed out for site ${state.vrmSiteId}.`
                                )
                            );
                        },
                        15_000
                    );

                client.once(
                    "connect",
                    () => {
                        if (
                            settled
                        ) {
                            return;
                        }

                        settled =
                            true;

                        clearTimeout(
                            timeout
                        );

                        resolve();
                    }
                );

                client.once(
                    "error",
                    (error) => {
                        if (
                            settled
                        ) {
                            return;
                        }

                        settled =
                            true;

                        clearTimeout(
                            timeout
                        );

                        reject(
                            error
                        );
                    }
                );
            }
        );

        await new Promise(
            (
                resolve,
                reject
            ) => {
                client.subscribe(
                    `N/${portalId}/#`,
                    {
                        qos: 0,
                    },
                    (
                        error,
                        granted
                    ) => {
                        if (error) {
                            reject(
                                error
                            );

                            return;
                        }

                        const accepted =
                            Array.isArray(
                                granted
                            ) &&
                            granted.length >
                                0 &&
                            granted.every(
                                (entry) =>
                                    entry.qos !==
                                    128
                            );

                        if (
                            !accepted
                        ) {
                            reject(
                                new Error(
                                    `VRM MQTT subscription was not granted for site ${state.vrmSiteId}.`
                                )
                            );

                            return;
                        }

                        resolve();
                    }
                );
            }
        );

        await publishKeepalive(
            state,
            false
        );

        state.reconnectAttempt =
            0;

        startKeepalive(
            state
        );

        console.log(
            `[VRM MQTT] live telemetry connected for site ${state.vrmSiteId} via ${mqttHost}`
        );
    };

const startVrmLiveTelemetry =
    async (
        vrmSiteId
    ) => {
        const normalizedSiteId =
            normalizeSiteId(
                vrmSiteId
            );

        shuttingDown =
            false;

        const existing =
            connections.get(
                normalizedSiteId
            );

        if (
            existing &&
            !existing.stopping
        ) {
            return existing;
        }

        const state = {
            vrmSiteId:
                normalizedSiteId,

            portalId:
                null,

            mqttHost:
                null,

            client:
                null,

            keepaliveTimer:
                null,

            reconnectTimer:
                null,

            reconnectAttempt:
                0,

            fullPublishCompleted:
                false,

            stopping:
                false,
        };

        connections.set(
            normalizedSiteId,
            state
        );

        try {
            await connectState(
                state
            );

            return state;
        } catch (error) {
            scheduleReconnect(
                state
            );

            throw error;
        }
    };

const stopVrmLiveTelemetry =
    async (
        vrmSiteId
    ) => {
        const normalizedSiteId =
            normalizeSiteId(
                vrmSiteId
            );

        const state =
            connections.get(
                normalizedSiteId
            );

        if (!state) {
            return false;
        }

        state.stopping =
            true;

        stopKeepalive(
            state
        );

        if (
            state.reconnectTimer
        ) {
            clearTimeout(
                state.reconnectTimer
            );

            state.reconnectTimer =
                null;
        }

        if (
            state.client
        ) {
            const client =
                state.client;

            state.client =
                null;

            client.removeAllListeners();

            await new Promise(
                (resolve) => {
                    client.end(
                        true,
                        {},
                        resolve
                    );
                }
            );
        }

        connections.delete(
            normalizedSiteId
        );

        console.log(
            `[VRM MQTT] live telemetry stopped for site ${normalizedSiteId}`
        );

        return true;
    };

const closeVrmLiveTelemetry =
    async () => {
        shuttingDown =
            true;

        const siteIds =
            Array.from(
                connections.keys()
            );

        await Promise.allSettled(
            siteIds.map(
                (siteId) =>
                    stopVrmLiveTelemetry(
                        siteId
                    )
            )
        );

        console.log(
            "[VRM MQTT] live telemetry service closed"
        );
    };

const getVrmLiveTelemetryState =
    (
        vrmSiteId
    ) => {
        const normalizedSiteId =
            normalizeSiteId(
                vrmSiteId
            );

        const state =
            connections.get(
                normalizedSiteId
            );

        if (!state) {
            return null;
        }

        /*
         * Never expose credentials,
         * MQTT password or access token.
         */
        return Object.freeze({
            vrmSiteId:
                state.vrmSiteId,

            portalId:
                state.portalId,

            mqttHost:
                state.mqttHost,

            connected:
                state.client
                    ?.connected ===
                true,

            fullPublishCompleted:
                state.fullPublishCompleted,

            reconnectAttempt:
                state.reconnectAttempt,

            stopping:
                state.stopping,
        });
    };

export {
    startVrmLiveTelemetry,
    stopVrmLiveTelemetry,
    closeVrmLiveTelemetry,
    getVrmLiveTelemetryState,
};
