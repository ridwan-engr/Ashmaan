import {
    findLiveTelemetryMapping,
} from "./vrmLiveTelemetryMapping.js";

const parseNotificationTopic = (
    topic,
    expectedPortalId
) => {
    if (
        typeof topic !== "string" ||
        typeof expectedPortalId !== "string"
    ) {
        return null;
    }

    const prefix =
        `N/${expectedPortalId}/`;

    if (
        !topic.startsWith(prefix)
    ) {
        return null;
    }

    const remainder =
        topic.slice(prefix.length);

    const parts =
        remainder.split("/");

    /*
     * Required structure:
     *
     * serviceType /
     * deviceInstance /
     * D-Bus path...
     */

    if (parts.length < 3) {
        return null;
    }

    const [
        serviceType,
        deviceInstanceText,
        ...pathParts
    ] = parts;

    if (
        !serviceType ||
        !/^\d+$/.test(
            deviceInstanceText
        ) ||
        pathParts.length === 0
    ) {
        return null;
    }

    const deviceInstance =
        Number(
            deviceInstanceText
        );

    const dbusPath =
        `/${pathParts.join("/")}`;

    return {
        serviceType,
        deviceInstance,
        dbusPath,
    };
};

const parseMqttPayload = (
    payload
) => {
    let decoded;

    try {
        decoded =
            JSON.parse(
                Buffer.isBuffer(payload)
                    ? payload.toString(
                        "utf8"
                    )
                    : String(payload)
            );
    } catch {
        return {
            accepted: false,
            reason:
                "INVALID_JSON",
        };
    }

    if (
        decoded === null ||
        typeof decoded !== "object" ||
        Array.isArray(decoded) ||
        !Object.prototype.hasOwnProperty.call(
            decoded,
            "value"
        )
    ) {
        return {
            accepted: false,
            reason:
                "INVALID_PAYLOAD",
        };
    }

    const value =
        decoded.value;

    /*
     * Victron null means the measurement
     * is unavailable.
     *
     * Do not convert it to zero.
     */
    if (value === null) {
        return {
            accepted: true,
            rawValue: null,
            numericValue: null,
            quality: "UNAVAILABLE",
        };
    }

    /*
     * The current live power-flow
     * allowlist is numeric telemetry.
     *
     * Boolean/string/object values must
     * not be coerced into numbers.
     */
    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        return {
            accepted: false,
            reason:
                "NON_NUMERIC_VALUE",
        };
    }

    return {
        accepted: true,
        rawValue: value,
        numericValue: value,
        quality: "GOOD",
    };
};

const parseVrmLiveTelemetryMessage = ({
    vrmSiteId,
    portalId,
    topic,
    payload,
    receivedAt =
        new Date().toISOString(),
}) => {
    const topicIdentity =
        parseNotificationTopic(
            topic,
            portalId
        );

    if (!topicIdentity) {
        return {
            accepted: false,
            reason:
                "UNSUPPORTED_TOPIC",
        };
    }

    const mapping =
        findLiveTelemetryMapping(
            topicIdentity
        );

    /*
     * This is the security/data boundary.
     *
     * Anything that is not explicitly
     * mapped is dropped.
     */
    if (!mapping) {
        return {
            accepted: false,
            reason:
                "NOT_ALLOWLISTED",
        };
    }

    const parsedPayload =
        parseMqttPayload(
            payload
        );

    if (
        !parsedPayload.accepted
    ) {
        return parsedPayload;
    }

    return {
        accepted: true,

        record: {
            vrmSiteId:
                String(vrmSiteId),

            vrmAttributeId:
                mapping.vrmAttributeId,

            serviceType:
                mapping.serviceType,

            deviceInstance:
                mapping.deviceInstance,

            dbusPath:
                mapping.dbusPath,

            unit:
                mapping.unit,

            rawValue:
                parsedPayload.rawValue,

            numericValue:
                parsedPayload.numericValue,

            quality:
                parsedPayload.quality,

            timestamp:
                receivedAt,

            source:
                "VRM_MQTT",
        },
    };
};

export {
    parseNotificationTopic,
    parseMqttPayload,
    parseVrmLiveTelemetryMessage,
};
