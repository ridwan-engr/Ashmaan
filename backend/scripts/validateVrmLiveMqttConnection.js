import "dotenv/config";
import mqtt from "mqtt";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import env from "../config/env.js";
import vrmApiClient from "../services/vrm/apiClient.js";

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const VRM_CA_PATH =
    path.resolve(
        __dirname,
        "../certs/venus-ca.crt"
    );

const TARGET_SITE_ID =
    Number(
        process.env.LIVE_VRM_SITE_ID ||
        18053
    );

const CONNECT_TIMEOUT_MS = 15000;
const TELEMETRY_TIMEOUT_MS = 30000;

let pass = 0;
let fail = 0;

const assertPass = (
    condition,
    successMessage,
    failureMessage
) => {
    if (condition) {
        pass += 1;
        console.log(
            `PASS ${pass}: ${successMessage}`
        );

        return true;
    }

    fail += 1;

    console.error(
        `FAIL ${fail}: ${failureMessage}`
    );

    return false;
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
    async () => {
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
                    ) === TARGET_SITE_ID
            );

        if (!installation) {
            throw new Error(
                `VRM installation ${TARGET_SITE_ID} was not found.`
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

        if (!portalId) {
            throw new Error(
                "VRM Portal ID is unavailable."
            );
        }

        if (!mqttHost) {
            throw new Error(
                "VRM MQTT broker is unavailable."
            );
        }

        return {
            portalId,
            mqttHost,
        };
    };

const main = async () => {
    console.log(
        "=============================================="
    );

    console.log(
        "ASHMAAN VRM LIVE MQTT VALIDATION"
    );

    console.log(
        "=============================================="
    );

    assertPass(
        Boolean(env.vrm.accessToken),
        "VRM access token is configured without being printed",
        "VRM access token is not configured"
    );

    assertPass(
        Boolean(env.vrm.userId),
        "VRM user ID is configured",
        "VRM user ID is not configured"
    );

    assertPass(
        Boolean(env.vrm.mqttUsername),
        "VRM MQTT username is configured without being printed",
        "VRM_MQTT_USERNAME is not configured"
    );

    if (fail > 0) {
        throw new Error(
            "Required VRM configuration is incomplete."
        );
    }

    const {
        portalId,
        mqttHost,
    } = await discoverLiveSource();

    assertPass(
        /^[0-9a-f]{12}$/i.test(
            portalId
        ),
        `site ${TARGET_SITE_ID} has a valid VRM Portal ID`,
        `site ${TARGET_SITE_ID} returned an invalid VRM Portal ID`
    );

    assertPass(
        /^[a-z0-9.-]+$/i.test(
            mqttHost
        ),
        `site ${TARGET_SITE_ID} has a valid MQTT broker hostname`,
        `site ${TARGET_SITE_ID} returned an invalid MQTT broker hostname`
    );

    console.log(
        `Broker: ${mqttHost}:${env.vrm.mqttPort}`
    );

    console.log(
        `Site: ${TARGET_SITE_ID}`
    );

    console.log(
        `Portal ID: ${portalId}`
    );

    const notificationTopic =
        `N/${portalId}/#`;

    const keepaliveTopic =
        `R/${portalId}/keepalive`;

    const clientId =
        `ashmaan-l3-validator-${Date.now()}`;
    if (
        !fs.existsSync(
            VRM_CA_PATH
        )
    ) {
        throw new Error(
            `Victron CA certificate is missing: ${VRM_CA_PATH}`
        );
    }

    const vrmCa =
        fs.readFileSync(
            VRM_CA_PATH
        );

    assertPass(
        vrmCa.length > 0,
        "official Victron MQTT CA certificate is available",
        "Victron MQTT CA certificate is empty"
    );
    const client =
    mqtt.connect(
        `mqtts://${mqttHost}:${env.vrm.mqttPort}`,
        {
            clientId,

            username:
                env.vrm.mqttUsername,

            password:
                `Token ${env.vrm.accessToken}`,

            protocolVersion: 4,

            clean: true,

            reconnectPeriod: 0,

            connectTimeout:
                CONNECT_TIMEOUT_MS,

            ca: vrmCa,

            rejectUnauthorized:
                true,
        }
    );
    let telemetryReceived = false;
    let fullPublishCompleted = false;
    let firstTelemetryTopic = null;

    const cleanup = () => {
        if (
            client &&
            !client.disconnected
        ) {
            client.end(
                true
            );
        }
    };

    const connectionPromise =
        new Promise(
            (
                resolve,
                reject
            ) => {
                const timeout =
                    setTimeout(
                        () => {
                            reject(
                                new Error(
                                    "MQTT connection timed out."
                                )
                            );
                        },
                        CONNECT_TIMEOUT_MS
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

                        reject(error);
                    }
                );
            }
        );

    try {
        await connectionPromise;

        assertPass(
            client.connected === true,
            "TLS MQTT connection authenticated successfully",
            "TLS MQTT connection was not established"
        );

        await new Promise(
            (
                resolve,
                reject
            ) => {
                client.subscribe(
                    notificationTopic,
                    {
                        qos: 0,
                    },
                    (
                        error,
                        granted
                    ) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        if (
                            !Array.isArray(
                                granted
                            ) ||
                            granted.length === 0
                        ) {
                            reject(
                                new Error(
                                    "MQTT subscription was not granted."
                                )
                            );

                            return;
                        }

                        resolve();
                    }
                );
            }
        );

        assertPass(
            true,
            `installation-scoped subscription ${notificationTopic} was accepted`,
            "installation-scoped subscription failed"
        );

        client.on(
            "message",
            (
                topic,
                payload
            ) => {
                if (
                    !topic.startsWith(
                        `N/${portalId}/`
                    )
                ) {
                    return;
                }

                if (
                    topic ===
                    `N/${portalId}/full_publish_completed`
                ) {
                    fullPublishCompleted =
                        true;

                    return;
                }

                telemetryReceived =
                    true;

                if (
                    firstTelemetryTopic ===
                    null
                ) {
                    firstTelemetryTopic =
                        topic;
                }

                /*
                 * Deliberately do not print
                 * telemetry payloads.
                 *
                 * This validator proves transport
                 * without exposing site data.
                 */
                void payload;
            }
        );

        await new Promise(
            (
                resolve,
                reject
            ) => {
                client.publish(
                    keepaliveTopic,
                    "",
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

        assertPass(
            true,
            "initial VRM MQTT keep-alive request was published",
            "VRM MQTT keep-alive request failed"
        );

        const deadline =
            Date.now() +
            TELEMETRY_TIMEOUT_MS;

        while (
            Date.now() <
            deadline &&
            !fullPublishCompleted
        ) {
            await new Promise(
                (resolve) =>
                    setTimeout(
                        resolve,
                        250
                    )
            );
        }

        assertPass(
            telemetryReceived,
            "real installation telemetry was received from VRM MQTT",
            "no installation telemetry was received from VRM MQTT"
        );

        assertPass(
            fullPublishCompleted,
            "VRM full_publish_completed marker was received",
            "VRM full_publish_completed marker was not received before timeout"
        );

        if (
            firstTelemetryTopic
        ) {
            const safeParts =
                firstTelemetryTopic
                    .split("/");

            /*
             * Print only structural evidence,
             * not the telemetry payload.
             */
            console.log(
                "First notification structure:",
                safeParts
                    .slice(
                        0,
                        Math.min(
                            safeParts.length,
                            5
                        )
                    )
                    .join("/")
            );
        }
    } finally {
        cleanup();
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
            "L.3C VRM LIVE MQTT CONNECTION VALIDATION: PASS"
        );

        return;
    }

    console.error(
        "L.3C VRM LIVE MQTT CONNECTION VALIDATION: FAIL"
    );

    process.exitCode = 1;
};

main().catch(
    (error) => {
        console.error("");
        console.error(
            "L.3C validator error:",
            error.message
        );

        console.error(
            "No credentials or tokens were printed."
        );

        process.exitCode = 1;
    }
);
