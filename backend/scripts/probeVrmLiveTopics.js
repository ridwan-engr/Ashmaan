import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mqtt from "mqtt";

import env from "../config/env.js";
import vrmApiClient from "../services/vrm/apiClient.js";

const SITE_ID = "70628";
const WAIT_MS = 15_000;

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const VRM_CA_PATH =
    path.resolve(
        __dirname,
        "../certs/venus-ca.crt"
    );

const extractInstallations = (payload) => {
    if (Array.isArray(payload?.records)) {
        return payload.records;
    }

    if (Array.isArray(payload?.data?.records)) {
        return payload.data.records;
    }

    if (Array.isArray(payload?.installations)) {
        return payload.installations;
    }

    if (Array.isArray(payload)) {
        return payload;
    }

    return [];
};

const discoverLiveSource = async () => {
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
                ) === Number(SITE_ID)
        );

    if (!installation) {
        throw new Error(
            `VRM installation ${SITE_ID} was not found.`
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
            "Installation has no valid Portal ID."
        );
    }

    if (
        !/^[a-z0-9.-]+$/i.test(
            mqttHost
        )
    ) {
        throw new Error(
            "Installation has no valid MQTT host."
        );
    }

    return {
        portalId,
        mqttHost,
    };
};

const waitForConnect = (client) =>
    new Promise(
        (resolve, reject) => {
            const timeout =
                setTimeout(
                    () => {
                        reject(
                            new Error(
                                "MQTT connection timed out."
                            )
                        );
                    },
                    15_000
                );

            client.once(
                "connect",
                () => {
                    clearTimeout(
                        timeout
                    );

                    resolve();
                }
            );

            client.once(
                "error",
                (error) => {
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

const subscribe = (
    client,
    topic
) =>
    new Promise(
        (resolve, reject) => {
            client.subscribe(
                topic,
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

                    if (
                        !Array.isArray(
                            granted
                        ) ||
                        granted.length !== 1 ||
                        granted[0]?.qos === 128
                    ) {
                        reject(
                            new Error(
                                "Diagnostic wildcard subscription was not granted."
                            )
                        );

                        return;
                    }

                    resolve(
                        granted
                    );
                }
            );
        }
    );

const publishInitialKeepalive = (
    client,
    portalId
) =>
    new Promise(
        (resolve, reject) => {
            client.publish(
                `R/${portalId}/keepalive`,
                "",
                {
                    qos: 0,
                    retain: false,
                },
                (error) => {
                    if (error) {
                        reject(
                            error
                        );

                        return;
                    }

                    resolve();
                }
            );
        }
    );

const closeClient = (client) =>
    new Promise(
        (resolve) => {
            if (!client) {
                resolve();
                return;
            }

            client.end(
                true,
                {},
                resolve
            );
        }
    );

let client = null;

try {
    console.log(
        "=============================================="
    );

    console.log(
        "ASHMAAN TEMPORARY VRM MQTT TOPIC PROBE"
    );

    console.log(
        "=============================================="
    );

    console.log(
        "Site:",
        SITE_ID
    );

    console.log(
        "Mode: READ-ONLY TOPIC DISCOVERY"
    );

    console.log(
        "Payload values will NOT be printed."
    );

    const {
        portalId,
        mqttHost,
    } =
        await discoverLiveSource();

    console.log(
        "Portal ID discovered:",
        true
    );

    console.log(
        "MQTT host:",
        mqttHost
    );

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

    client =
        mqtt.connect(
            `mqtts://${mqttHost}:${env.vrm.mqttPort}`,
            {
                clientId:
                    `ashmaan-topic-probe-${SITE_ID}-${Date.now()}`,

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

    const observedTopics =
        new Set();

    client.on(
        "message",
        (topic) => {
            if (
                !topic.startsWith(
                    `N/${portalId}/`
                )
            ) {
                return;
            }

            if (
                observedTopics.has(
                    topic
                )
            ) {
                return;
            }

            observedTopics.add(
                topic
            );

            console.log(
                `[TOPIC ${observedTopics.size}]`,
                topic
            );
        }
    );

    client.on(
        "error",
        (error) => {
            console.error(
                "[MQTT ERROR]",
                error.message
            );
        }
    );

    await waitForConnect(
        client
    );

    console.log(
        "MQTT connected:",
        true
    );

    const wildcardTopic =
        `N/${portalId}/#`;

    await subscribe(
        client,
        wildcardTopic
    );

    console.log(
        "Diagnostic subscription granted:",
        wildcardTopic
    );

    /*
     * Read/keepalive request only.
     *
     * This requests the current dataset.
     * No W/<portalId>/... control topic
     * is published by this probe.
     */
    const wait =
        (ms) =>
            new Promise(
                (resolve) =>
                    setTimeout(
                        resolve,
                        ms
                    )
            );

    const publishProbeKeepalive =
        (label, payload) =>
            new Promise(
                (resolve, reject) => {
                    console.log(
                        `\n===== ${label} =====`
                    );

                    console.log(
                        "Unique topics before:",
                        observedTopics.size
                    );

                    client.publish(
                        `R/${portalId}/keepalive`,
                        payload,
                        {
                            qos: 0,
                            retain: false,
                        },
                        (error) => {
                            if (error) {
                                reject(
                                    error
                                );

                                return;
                            }

                            console.log(
                                "Keepalive request published."
                            );

                            resolve();
                        }
                    );
                }
            );

    await publishProbeKeepalive(
        "TEST A - EMPTY PAYLOAD",
        ""
    );

    await wait(
        10_000
    );

    console.log(
        "Topics after TEST A:",
        observedTopics.size
    );

    await publishProbeKeepalive(
        "TEST B - EMPTY JSON OBJECT",
        "{}"
    );

    await wait(
        10_000
    );

    console.log(
        "Topics after TEST B:",
        observedTopics.size
    );

    await publishProbeKeepalive(
        "TEST C - EMPTY KEEPALIVE OPTIONS",
        JSON.stringify({
            "keepalive-options": [],
        })
    );

    await wait(
        10_000
    );

    console.log(
        "Topics after TEST C:",
        observedTopics.size
    );

    console.log(
        "\n=============================================="
    );

    console.log(
        "PROBE RESULT"
    );

    console.log(
        "=============================================="
    );

    console.log(
        "Unique notification topics observed:",
        observedTopics.size
    );

    console.log(
        "full_publish_completed observed:",
        observedTopics.has(
            `N/${portalId}/full_publish_completed`
        )
    );

    if (
        observedTopics.size === 0
    ) {
        console.log(
            "\nRESULT: Broker connection/subscription succeeded, but no notification topics were published."
        );
    } else {
        console.log(
            "\nRESULT: VRM is publishing notifications. Compare these actual topic identities with ASHMAAN's qualified mappings."
        );
    }
} catch (error) {
    console.error(
        "\nPROBE FAILED:",
        error.message
    );

    process.exitCode =
        1;
} finally {
    await closeClient(
        client
    );

    console.log(
        "\nMQTT diagnostic connection closed."
    );
}
