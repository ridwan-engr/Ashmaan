import "dotenv/config";

import {
    startVrmLiveTelemetry,
    stopVrmLiveTelemetry,
    getVrmLiveTelemetryState,
} from "../services/vrm/vrmLiveTelemetryService.js";

const FULL_SITE = "18053";
const REDUCED_SITE = "30689";

const FULL_APPROVED_COUNT = 28;
const FULL_SUBSCRIPTION_COUNT = 29;

const REDUCED_APPROVED_COUNT = 18;
const REDUCED_SUBSCRIPTION_COUNT = 19;

const WAIT_MS = 10_000;

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
            setTimeout(resolve, ms)
    );

const waitForTelemetry =
    async (siteId) => {
        const deadline =
            Date.now() + WAIT_MS;

        let state =
            getVrmLiveTelemetryState(
                siteId
            );

        while (
            Date.now() < deadline &&
            !(
                state
                    ?.receivedTelemetryCount >
                0
            )
        ) {
            await sleep(250);

            state =
                getVrmLiveTelemetryState(
                    siteId
                );
        }

        return state;
    };

console.log(
    "=================================================="
);

console.log(
    "ASHMAAN PER-SITE MQTT SUBSCRIPTION VALIDATION"
);

console.log(
    "=================================================="
);

try {
    /*
     * ------------------------------------------------
     * SITE 18053
     *
     * Full evidence-backed topology:
     *
     * 28 telemetry mappings
     * + 1 full_publish_completed marker
     * = 29 exact MQTT subscriptions.
     * ------------------------------------------------
     */

    await startVrmLiveTelemetry(
        FULL_SITE
    );

    let fullState =
        getVrmLiveTelemetryState(
            FULL_SITE
        );

    check(
        fullState?.connected === true,
        `reference site ${FULL_SITE} MQTT connection is active`
    );

    check(
        fullState?.approvedMappingCount ===
            FULL_APPROVED_COUNT,
        `reference site ${FULL_SITE} has exactly ${FULL_APPROVED_COUNT} site-qualified mappings`
    );

    check(
        fullState?.subscriptionCount ===
            FULL_SUBSCRIPTION_COUNT,
        `reference site ${FULL_SITE} subscribes to exactly ${FULL_APPROVED_COUNT} telemetry topics plus marker`
    );

    check(
        fullState?.subscriptionCount ===
            fullState?.approvedMappingCount +
                1,
        "reference-site subscription count is derived from its qualified mapping count"
    );

    fullState =
        await waitForTelemetry(
            FULL_SITE
        );

    check(
        fullState
            ?.receivedTelemetryCount >
            0,
        "reference site receives parser-approved live telemetry"
    );

    check(
        typeof fullState
            ?.lastTelemetryAt ===
            "string" &&
            !Number.isNaN(
                Date.parse(
                    fullState.lastTelemetryAt
                )
            ),
        "reference site records a valid live telemetry timestamp"
    );

    const fullStopped =
        await stopVrmLiveTelemetry(
            FULL_SITE
        );

    check(
        fullStopped === true,
        "reference-site MQTT service stops cleanly"
    );

    check(
        getVrmLiveTelemetryState(
            FULL_SITE
        ) === null,
        "reference site is removed from the connection registry"
    );

    /*
     * ------------------------------------------------
     * SITE 30689
     *
     * Reduced heterogeneous topology:
     *
     * 18 evidence-backed live mappings
     * + 1 full_publish_completed marker
     * = 19 exact MQTT subscriptions.
     *
     * Site 30689 has also been independently
     * observed receiving real MQTT telemetry
     * through this reduced topic set.
     * ------------------------------------------------
     */

    await startVrmLiveTelemetry(
        REDUCED_SITE
    );

    let reducedState =
        getVrmLiveTelemetryState(
            REDUCED_SITE
        );

    check(
        reducedState?.connected === true,
        `heterogeneous site ${REDUCED_SITE} MQTT connection is active`
    );

    check(
        reducedState?.approvedMappingCount ===
            REDUCED_APPROVED_COUNT,
        `heterogeneous site ${REDUCED_SITE} has exactly ${REDUCED_APPROVED_COUNT} site-qualified mappings`
    );

    check(
        reducedState?.subscriptionCount ===
            REDUCED_SUBSCRIPTION_COUNT,
        `heterogeneous site ${REDUCED_SITE} subscribes to exactly ${REDUCED_APPROVED_COUNT} telemetry topics plus marker`
    );

    check(
        reducedState?.subscriptionCount ===
            reducedState?.approvedMappingCount +
                1,
        "heterogeneous-site subscription count is derived from its own qualified mapping count"
    );

    /*
     * Critical L.3I production boundary:
     *
     * Site 30689 must use its own evidence-backed
     * reduced topology and must not inherit the
     * 28-topic telemetry topology of site 18053.
     */
    check(
        reducedState?.subscriptionCount <
            fullState?.subscriptionCount,
        "heterogeneous site is narrowed below the reference site's subscription topology"
    );

    reducedState =
        await waitForTelemetry(
            REDUCED_SITE
        );

    check(
        reducedState
            ?.receivedTelemetryCount >
            0,
        "heterogeneous site receives parser-approved live telemetry through its narrowed topics"
    );

    check(
        typeof reducedState
            ?.lastTelemetryAt ===
            "string" &&
            !Number.isNaN(
                Date.parse(
                    reducedState.lastTelemetryAt
                )
            ),
        "heterogeneous site records a valid live telemetry timestamp"
    );

    /*
     * full_publish_completed remains diagnostic
     * only. Absence of this marker is not a
     * validation failure when real approved
     * telemetry has already been received.
     */
    console.log(
        `[VALIDATOR] site ${FULL_SITE} full_publish_completed observed: ${
            fullState
                ?.fullPublishCompleted ===
            true
        }`
    );

    console.log(
        `[VALIDATOR] site ${REDUCED_SITE} full_publish_completed observed: ${
            reducedState
                ?.fullPublishCompleted ===
            true
        }`
    );

    console.log(
        `[VALIDATOR] site ${FULL_SITE}: approved=${fullState?.approvedMappingCount}, subscribed=${fullState?.subscriptionCount}, received=${fullState?.receivedTelemetryCount}`
    );

    console.log(
        `[VALIDATOR] site ${REDUCED_SITE}: approved=${reducedState?.approvedMappingCount}, subscribed=${reducedState?.subscriptionCount}, received=${reducedState?.receivedTelemetryCount}`
    );

    const reducedStopped =
        await stopVrmLiveTelemetry(
            REDUCED_SITE
        );

    check(
        reducedStopped === true,
        "heterogeneous-site MQTT service stops cleanly"
    );

    check(
        getVrmLiveTelemetryState(
            REDUCED_SITE
        ) === null,
        "heterogeneous site is removed from the connection registry"
    );
} catch (error) {
    fail += 1;

    console.error(
        "VALIDATOR ERROR:",
        error.message
    );

    /*
     * Best-effort cleanup.
     */
    for (const siteId of [
        FULL_SITE,
        REDUCED_SITE,
    ]) {
        try {
            await stopVrmLiveTelemetry(
                siteId
            );
        } catch {
            // Ignore cleanup errors.
        }
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
        "L.3I PER-SITE PRODUCTION MQTT NARROWING: PASS"
    );
} else {
    console.error(
        "L.3I PER-SITE PRODUCTION MQTT NARROWING: FAIL"
    );

    process.exitCode = 1;
}