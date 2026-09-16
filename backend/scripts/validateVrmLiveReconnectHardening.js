import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import {
    fileURLToPath,
} from "node:url";

import {
    calculateReconnectDelay,
    startVrmLiveTelemetry,
    stopVrmLiveTelemetry,
    getVrmLiveTelemetryState,
} from "../services/vrm/vrmLiveTelemetryService.js";

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const SERVICE_PATH =
    path.resolve(
        __dirname,
        "../services/vrm/vrmLiveTelemetryService.js"
    );

const REFERENCE_SITE =
    "18053";

const RECONNECT_MIN_MS =
    5_000;

const RECONNECT_MAX_MS =
    60_000;

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

console.log(
    "=================================================="
);

console.log(
    "ASHMAAN VRM MQTT RECONNECT HARDENING VALIDATION"
);

console.log(
    "=================================================="
);

const source =
    fs.readFileSync(
        SERVICE_PATH,
        "utf8"
    );

/*
 * ------------------------------------------------
 * Static production invariants.
 * ------------------------------------------------
 */

check(
    source.includes(
        "RECONNECT_JITTER_RATIO"
    ),
    "production MQTT service defines reconnect jitter"
);

check(
    source.includes(
        "connections.get("
    ) &&
        source.includes(
            ") !== state"
        ),
    "reconnect callback verifies current connection-registry ownership"
);

check(
    source.includes(
        "state.reconnectTimer"
    ) &&
        source.includes(
            "clearTimeout("
        ),
    "site shutdown explicitly cancels a pending reconnect timer"
);

check(
    !/catch\s*\(\s*error\s*\)\s*\{\s*scheduleReconnect\s*\(\s*state\s*\)\s*;\s*throw\s+error\s*;/s.test(
        source
    ),
    "initial startup failure no longer schedules reconnect before rethrowing"
);

/*
 * ------------------------------------------------
 * Deterministic reconnect-delay semantics.
 * ------------------------------------------------
 */

const attempt0Low =
    calculateReconnectDelay(
        0,
        0
    );

const attempt0Mid =
    calculateReconnectDelay(
        0,
        0.5
    );

const attempt0High =
    calculateReconnectDelay(
        0,
        1
    );

check(
    attempt0Low ===
        RECONNECT_MIN_MS,
    "first reconnect attempt never falls below the configured five-second minimum"
);

check(
    attempt0Mid ===
        5_000,
    "first reconnect midpoint preserves the five-second base delay"
);

check(
    attempt0High ===
        6_000,
    "first reconnect upper jitter produces six seconds"
);

const attempt1Low =
    calculateReconnectDelay(
        1,
        0
    );

const attempt1Mid =
    calculateReconnectDelay(
        1,
        0.5
    );

const attempt1High =
    calculateReconnectDelay(
        1,
        1
    );

check(
    attempt1Low ===
        8_000 &&
        attempt1Mid ===
            10_000 &&
        attempt1High ===
            12_000,
    "second reconnect attempt applies symmetric 20-percent jitter around ten seconds"
);

const highAttemptLow =
    calculateReconnectDelay(
        100,
        0
    );

const highAttemptMid =
    calculateReconnectDelay(
        100,
        0.5
    );

const highAttemptHigh =
    calculateReconnectDelay(
        100,
        1
    );

check(
    highAttemptLow >=
        RECONNECT_MIN_MS &&
        highAttemptLow <=
            RECONNECT_MAX_MS &&
        highAttemptMid <=
            RECONNECT_MAX_MS &&
        highAttemptHigh <=
            RECONNECT_MAX_MS,
    "extreme reconnect attempts remain bounded inside five to sixty seconds"
);

check(
    calculateReconnectDelay(
        -100,
        0.5
    ) === 5_000,
    "negative reconnect attempts are normalized safely"
);

check(
    calculateReconnectDelay(
        Number.MAX_SAFE_INTEGER,
        0.5
    ) ===
        RECONNECT_MAX_MS,
    "very large reconnect attempts cannot overflow the backoff calculation"
);

/*
 * ------------------------------------------------
 * Real production-service regression.
 * ------------------------------------------------
 */

try {
    await startVrmLiveTelemetry(
        REFERENCE_SITE
    );

    const liveState =
        getVrmLiveTelemetryState(
            REFERENCE_SITE
        );

    check(
        liveState !== null,
        "reference MQTT site starts after reconnect hardening"
    );

    check(
        liveState?.connected ===
            true,
        "reference MQTT site remains connected"
    );

    check(
        liveState
            ?.approvedMappingCount ===
            28 &&
            liveState
                ?.subscriptionCount ===
                29,
        "reference exact-topic topology remains 28 telemetry mappings plus marker"
    );

    check(
        liveState
            ?.reconnectAttempt ===
            0,
        "successful connection resets reconnect attempt state"
    );

    check(
        liveState
            ?.reconnectScheduled ===
            false,
        "successful connection has no pending reconnect timer"
    );

    check(
        liveState
            ?.lastReconnectDelayMs ===
            null,
        "successful connection clears reconnect delay metadata"
    );

    await stopVrmLiveTelemetry(
        REFERENCE_SITE
    );

    check(
        getVrmLiveTelemetryState(
            REFERENCE_SITE
        ) === null,
        "stopped site is removed from the connection registry"
    );
} catch (error) {
    fail += 1;

    console.error(
        "VALIDATOR ERROR:",
        error?.message ??
            String(error)
    );

    try {
        await stopVrmLiveTelemetry(
            REFERENCE_SITE
        );
    } catch {
        // Best-effort cleanup.
    }
}

console.log("");

console.log(
    "=================================================="
);

console.log(
    `PASS: ${pass}`
);

console.log(
    `FAIL: ${fail}`
);

if (fail === 0) {
    console.log(
        "L.3J-D VRM MQTT RECONNECT HARDENING: PASS"
    );
} else {
    console.error(
        "L.3J-D VRM MQTT RECONNECT HARDENING: FAIL"
    );

    process.exitCode = 1;
}