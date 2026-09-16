import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    startVrmLiveTelemetry,
    stopVrmLiveTelemetry,
    getVrmLiveTelemetryState,
} from "../services/vrm/vrmLiveTelemetryService.js";

const SITE_ID =
    process.env.LIVE_VRM_SITE_ID ||
    "18053";

const WAIT_MS =
    10_000;

const EXPECTED_TELEMETRY_TOPIC_COUNT =
    28;

const EXPECTED_SUBSCRIPTION_COUNT =
    EXPECTED_TELEMETRY_TOPIC_COUNT +
    1;

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );

const SERVICE_PATH =
    path.resolve(
        __dirname,
        "../services/vrm/vrmLiveTelemetryService.js"
    );

let pass = 0;
let fail = 0;
let assertion = 0;

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

        return;
    }

    fail += 1;

    console.error(
        `FAIL ${assertion}: ${message}`
    );
};

const sleep = (ms) =>
    new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                ms
            )
    );

console.log(
    "=============================================="
);

console.log(
    "ASHMAAN VRM LIVE TELEMETRY SERVICE VALIDATION"
);

console.log(
    "=============================================="
);

/*
 * L.3H static production-boundary check.
 *
 * The production live service must not
 * execute a broad Portal notification
 * wildcard subscription.
 *
 * Comments mentioning the prohibited
 * pattern are permitted.
 */
const serviceSource =
    fs.readFileSync(
        SERVICE_PATH,
        "utf8"
    );

const hasExecutableBroadSubscription =
    /client\s*\.\s*subscribe\s*\(\s*[`'"]N\/\$\{portalId\}\/#/m.test(
        serviceSource
    );

check(
    hasExecutableBroadSubscription ===
        false,
    "production service contains no executable broad Portal notification wildcard subscription"
);

/*
 * ASHMAAN remains monitoring/advisory-only.
 *
 * No executable MQTT W/... publication
 * is permitted in this service.
 */
const hasWriteTopicPublication =
    /(?:client|state\.client)\s*\.\s*publish\s*\(\s*[`'"]W\//m.test(
        serviceSource
    );

check(
    hasWriteTopicPublication ===
        false,
    "production live service contains no VRM MQTT write-topic publication"
);

try {
    await startVrmLiveTelemetry(
        SITE_ID
    );

    check(
        true,
        `production live service starts for site ${SITE_ID}`
    );

    const connectedState =
        getVrmLiveTelemetryState(
            SITE_ID
        );

    check(
        connectedState
            ?.connected ===
            true,
        "production MQTT client is connected"
    );

    check(
        connectedState
            ?.subscriptionCount ===
            EXPECTED_SUBSCRIPTION_COUNT,
        "production service uses exactly 28 allowlisted telemetry topics plus the full-publication marker"
    );

    check(
        /^[0-9a-f]{12}$/i.test(
            connectedState
                ?.portalId ??
                ""
        ),
        "live service discovered a valid Portal ID"
    );

    check(
        typeof connectedState
            ?.mqttHost ===
            "string" &&
        connectedState
            .mqttHost
            .length >
            0,
        "live service discovered the installation MQTT broker"
    );

    /*
     * The initial empty keepalive asks
     * VRM to republish current values.
     *
     * Exact-topic live readiness is
     * established by receipt of at least
     * one parser-approved telemetry record.
     *
     * full_publish_completed remains
     * diagnostic metadata and is not the
     * sole readiness requirement.
     */
    const deadline =
        Date.now() +
        WAIT_MS;

    let liveState =
        connectedState;

    while (
        Date.now() <
            deadline &&
        !(
            liveState
                ?.receivedTelemetryCount >
            0
        )
    ) {
        await sleep(
            250
        );

        liveState =
            getVrmLiveTelemetryState(
                SITE_ID
            );
    }

    check(
        liveState
            ?.receivedTelemetryCount >
            0,
        "exact-topic production service receives real parser-approved VRM telemetry"
    );

    check(
        typeof liveState
            ?.lastTelemetryAt ===
            "string" &&
        !Number.isNaN(
            Date.parse(
                liveState.lastTelemetryAt
            )
        ),
        "accepted live telemetry records a valid receive timestamp"
    );

    check(
        liveState
            ?.subscriptionCount ===
            EXPECTED_SUBSCRIPTION_COUNT,
        "exact-topic subscription remains active after live telemetry is received"
    );

    /*
     * Diagnostic only.
     *
     * Do not fail L.3H solely because
     * Victron's full-publication marker
     * was not observed inside this
     * validator's readiness window.
     */
    console.log(
        `[VALIDATOR] full_publish_completed observed: ${
            liveState
                ?.fullPublishCompleted ===
            true
        }`
    );

    const stopped =
        await stopVrmLiveTelemetry(
            SITE_ID
        );

    check(
        stopped === true,
        "production live service stops cleanly"
    );

    check(
        getVrmLiveTelemetryState(
            SITE_ID
        ) === null,
        "stopped site is removed from the live connection registry"
    );
} catch (error) {
    fail += 1;

    console.error(
        "VALIDATOR ERROR:",
        error.message
    );

    try {
        await stopVrmLiveTelemetry(
            SITE_ID
        );
    } catch {
        // Best-effort validator cleanup.
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
        "L.3H EXACT-TOPIC LIVE TELEMETRY SERVICE VALIDATION: PASS"
    );
} else {
    console.error(
        "L.3H EXACT-TOPIC LIVE TELEMETRY SERVICE VALIDATION: FAIL"
    );

    process.exitCode = 1;
}
