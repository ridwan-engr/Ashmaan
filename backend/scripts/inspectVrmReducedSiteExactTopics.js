import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mqtt from "mqtt";

import env from "../config/env.js";
import vrmApiClient from "../services/vrm/apiClient.js";

import {
    qualifyLiveSiteMappings,
} from "../services/vrm/vrmLiveSiteQualificationService.js";

const SITE_ID =
    process.env.LIVE_VRM_REDUCED_SITE_ID ||
    "40898";

const OBSERVE_MS =
    30_000;

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const CA_PATH =
    path.resolve(
        __dirname,
        "../certs/venus-ca.crt"
    );

const sleep = (ms) =>
    new Promise((resolve) =>
        setTimeout(resolve, ms)
    );

const extractInstallations = (
    payload
) => {
    if (Array.isArray(payload?.records)) {
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

    if (Array.isArray(payload)) {
        return payload;
    }

    return [];
};

const discoverLiveSource =
    async () => {
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

        if (!mqttHost) {
            throw new Error(
                "Installation has no MQTT host."
            );
        }

        return {
            portalId,
            mqttHost,
        };
    };

let client = null;

try {
    console.log(
        "================================================"
    );
    console.log(
        "ASHMAAN REDUCED-SITE EXACT MQTT TOPIC INSPECTION"
    );
    console.log(
        "================================================"
    );

    console.log(
        `Site: ${SITE_ID}`
    );

    const qualification =
        await qualifyLiveSiteMappings(
            SITE_ID
        );

    console.log(
        `Diagnostics records: ${qualification.diagnosticsRecordCount}`
    );

    console.log(
        `Approved mappings: ${qualification.approvedMappingCount}`
    );

    if (
        qualification
            .approvedMappingCount ===
        0
    ) {
        throw new Error(
            "No approved mappings were found."
        );
    }

    console.log("");
    console.log(
        "Qualified mappings:"
    );

    for (
        const mapping
        of qualification.approvedMappings
    ) {
        console.log(
            [
                `  attr=${mapping.vrmAttributeId}`,
                `${mapping.serviceType}/${mapping.deviceInstance}`,
                mapping.dbusPath,
                mapping.unit ?? "",
            ].join(" | ")
        );
    }

    const {
        portalId,
        mqttHost,
    } =
        await discoverLiveSource();

    console.log("");
    console.log(
        `Portal ID: ${portalId}`
    );

    console.log(
        `MQTT host: ${mqttHost}`
    );

    const telemetryTopics =
        qualification.approvedMappings.map(
            (mapping) =>
                `N/${portalId}/${mapping.serviceType}/${mapping.deviceInstance}${mapping.dbusPath}`
        );

    const markerTopic =
        `N/${portalId}/full_publish_completed`;

    const topics = [
        ...new Set(
            telemetryTopics
        ),
        markerTopic,
    ];

    console.log("");
    console.log(
        `Exact subscriptions: ${topics.length}`
    );

    topics.forEach(
        (topic) =>
            console.log(
                `  ${topic}`
            )
    );

    const ca =
        fs.readFileSync(
            CA_PATH
        );

    client =
        mqtt.connect(
            `mqtts://${mqttHost}:${env.vrm.mqttPort}`,
            {
                clientId:
                    `ashmaan-inspect-${SITE_ID}-${Date.now()}`,

                username:
                    env.vrm.mqttUsername,

                password:
                    `Token ${env.vrm.accessToken}`,

                protocolVersion: 4,
                clean: true,

                reconnectPeriod: 0,

                connectTimeout:
                    15_000,

                ca,

                rejectUnauthorized:
                    true,
            }
        );

    await new Promise(
        (resolve, reject) => {
            const timeout =
                setTimeout(
                    () =>
                        reject(
                            new Error(
                                "MQTT connection timed out."
                            )
                        ),
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

                    reject(error);
                }
            );
        }
    );

    console.log("");
    console.log(
        "MQTT connected."
    );

    const received =
        new Map();

    client.on(
        "message",
        (topic, payload) => {
            const text =
                payload.toString();

            const count =
                (received.get(topic) ??
                    0) +
                1;

            received.set(
                topic,
                count
            );

            console.log("");
            console.log(
                `[MESSAGE ${count}]`
            );

            console.log(
                `Topic: ${topic}`
            );

            console.log(
                `Bytes: ${payload.length}`
            );

            console.log(
                `Payload: ${
                    text.length === 0
                        ? "<EMPTY>"
                        : text
                }`
            );
        }
    );

    await new Promise(
        (resolve, reject) => {
            client.subscribe(
                topics,
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

                    console.log("");
                    console.log(
                        "Subscription grants:"
                    );

                    for (
                        const grant
                        of granted ?? []
                    ) {
                        console.log(
                            `  qos=${grant.qos} | ${grant.topic}`
                        );
                    }

                    if (
                        !Array.isArray(
                            granted
                        ) ||
                        granted.length !==
                            topics.length ||
                        granted.some(
                            (grant) =>
                                grant.qos ===
                                128
                        )
                    ) {
                        reject(
                            new Error(
                                "Not all exact topics were granted."
                            )
                        );

                        return;
                    }

                    resolve();
                }
            );
        }
    );

    console.log("");
    console.log(
        "All exact topics granted."
    );

    /*
     * Initial Victron keepalive:
     * request publication of current
     * values for subscribed topics.
     */
    await new Promise(
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
                        reject(error);
                        return;
                    }

                    resolve();
                }
            );
        }
    );

    console.log(
        "Initial empty keepalive published."
    );

    console.log(
        `Observing exact topics for ${OBSERVE_MS / 1000} seconds...`
    );

    await sleep(
        OBSERVE_MS
    );

    console.log("");
    console.log(
        "================================================"
    );

    console.log(
        "OBSERVATION SUMMARY"
    );

    console.log(
        "================================================"
    );

    console.log(
        `Messages received: ${
            Array.from(
                received.values()
            ).reduce(
                (sum, value) =>
                    sum + value,
                0
            )
        }`
    );

    console.log(
        `Distinct subscribed topics observed: ${received.size}/${topics.length}`
    );

    for (
        const topic of topics
    ) {
        console.log(
            `${
                received.has(topic)
                    ? "OBSERVED"
                    : "NOT OBSERVED"
            } | ${topic}`
        );
    }
} catch (error) {
    console.error(
        "INSPECTION ERROR:",
        error.message
    );

    process.exitCode = 1;
} finally {
    if (client) {
        await new Promise(
            (resolve) => {
                try {
                    client.end(
                        true,
                        {},
                        resolve
                    );
                } catch {
                    resolve();
                }
            }
        );
    }
}