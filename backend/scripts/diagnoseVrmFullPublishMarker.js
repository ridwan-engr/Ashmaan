import "dotenv/config";

import {
    startVrmLiveTelemetry,
    stopVrmLiveTelemetry,
    getVrmLiveTelemetryState,
} from "../services/vrm/vrmLiveTelemetryService.js";

const SITE_ID = process.env.LIVE_VRM_SITE_ID || "132158";
const OBSERVATION_MS = 30_000;
const POLL_MS = 500;

const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

let started = false;

try {
    console.log("=== VRM FULL-PUBLICATION DIAGNOSTIC ===");
    console.log(`Site ID: ${SITE_ID}`);
    console.log(`Observation window: ${OBSERVATION_MS / 1000}s`);

    await startVrmLiveTelemetry(SITE_ID);
    started = true;

    const initialState = getVrmLiveTelemetryState(SITE_ID);

    console.log("Service started.");
    console.log(
        `Initial telemetry count: ${initialState?.receivedTelemetryCount ?? "unavailable"}`
    );
    console.log(
        `Initial marker state: ${initialState?.fullPublishCompleted === true}`
    );

    const deadline = Date.now() + OBSERVATION_MS;

    while (Date.now() < deadline) {
        await sleep(POLL_MS);

        const state = getVrmLiveTelemetryState(SITE_ID);

        if (!state) {
            console.log("Service state disappeared during observation.");
            break;
        }

        if (state.fullPublishCompleted === true) {
            console.log("Completion marker observed.");
            break;
        }
    }

    const finalState = getVrmLiveTelemetryState(SITE_ID);

    console.log("\n=== FINAL OBSERVATIONS ===");
    console.log(
        `Telemetry count: ${finalState?.receivedTelemetryCount ?? "unavailable"}`
    );
    console.log(
        `Last telemetry timestamp: ${finalState?.lastTelemetryAt ?? "unavailable"}`
    );
    console.log(
        `Subscribed topic count: ${finalState?.subscriptionCount ?? "unavailable"}`
    );
    console.log(
        `full_publish_completed observed: ${finalState?.fullPublishCompleted === true}`
    );
} catch (error) {
    console.error("DIAGNOSTIC ERROR:", error.message);
    process.exitCode = 1;
} finally {
    if (started) {
        try {
            const stopped = await stopVrmLiveTelemetry(SITE_ID);
            console.log(`Service stopped cleanly: ${stopped === true}`);
        } catch (error) {
            console.error("Cleanup error:", error.message);
            process.exitCode = 1;
        }
    }
}
