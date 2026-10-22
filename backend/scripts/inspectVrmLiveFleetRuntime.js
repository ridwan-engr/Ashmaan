import "dotenv/config";

import {
    startVrmLiveFleet,
    stopVrmLiveFleet,
    getVrmLiveFleetState,
} from "../services/vrm/vrmLiveFleetService.js";

const STARTUP_CONCURRENCY = 4;
const OBSERVATION_MS = 30_000;

const sleep = (ms) =>
    new Promise(
        (resolve) =>
            setTimeout(resolve, ms)
    );

const printSite = (site) => {
    console.log(
        [
            `site=${site.vrmSiteId}`,
            `status=${site.status}`,
            `connected=${site.connected}`,
            `approved=${site.approvedMappingCount}`,
            `subscribed=${site.subscriptionCount}`,
            `received=${site.receivedTelemetryCount}`,
            `lastTelemetry=${site.lastTelemetryAt ?? "NONE"}`,
            `fullPublish=${site.fullPublishCompleted}`,
            `broker=${site.mqttHost ?? "NONE"}`,
        ].join(" | ")
    );
};

console.log(
    "=================================================="
);

console.log(
    "ASHMAAN VRM CONTROLLED FULL-FLEET RUNTIME INSPECTION"
);

console.log(
    "=================================================="
);

console.log(
    `Startup concurrency: ${STARTUP_CONCURRENCY}`
);

console.log(
    `Observation window: ${OBSERVATION_MS} ms`
);

let shutdownRequired = false;

try {
    console.log("");
    console.log(
        "Starting diagnostics-qualified fleet..."
    );

    const startResult =
        await startVrmLiveFleet({
            concurrency:
                STARTUP_CONCURRENCY,
        });

    shutdownRequired = true;

    console.log("");
    console.log(
        "=================================================="
    );

    console.log(
        "STARTUP RESULT"
    );

    console.log(
        "=================================================="
    );

    console.log(
        `Selected: ${startResult.selectedSiteCount}`
    );

    console.log(
        `Started: ${startResult.startedCount}`
    );

    console.log(
        `Failed: ${startResult.failedCount}`
    );

    console.log(
        `Rejected requested: ${startResult.rejectedRequestedSiteCount}`
    );

    console.log(
        `Concurrency: ${startResult.concurrency}`
    );

    if (
        startResult.failed.length >
        0
    ) {
        console.log("");
        console.log(
            "STARTUP FAILURES"
        );

        for (
            const failure of
            startResult.failed
        ) {
            console.log(
                [
                    `site=${failure.vrmSiteId}`,
                    `broker=${failure.mqttHost ?? "NONE"}`,
                    `approved=${failure.approvedMappingCount}`,
                    `error=${failure.error ?? "UNKNOWN"}`,
                ].join(" | ")
            );
        }
    }

    console.log("");
    console.log(
        `Observing fleet for ${OBSERVATION_MS / 1000} seconds...`
    );

    await sleep(
        OBSERVATION_MS
    );

    const state =
        getVrmLiveFleetState();

    const connected =
        state.sites.filter(
            (site) =>
                site.connected ===
                true
        );

    const telemetryProducing =
        state.sites.filter(
            (site) =>
                site.receivedTelemetryCount >
                0
        );

    const connectedNoTelemetry =
        state.sites.filter(
            (site) =>
                site.connected ===
                    true &&
                site.receivedTelemetryCount ===
                    0
        );

    const disconnected =
        state.sites.filter(
            (site) =>
                site.connected !==
                true
        );

    const fullPublishCompleted =
        state.sites.filter(
            (site) =>
                site.fullPublishCompleted ===
                true
        );

    console.log("");
    console.log(
        "=================================================="
    );

    console.log(
        "RUNTIME SUMMARY"
    );

    console.log(
        "=================================================="
    );

    console.log(
        `Fleet registry sites: ${state.siteCount}`
    );

    console.log(
        `Connected: ${connected.length}`
    );

    console.log(
        `Telemetry-producing: ${telemetryProducing.length}`
    );

    console.log(
        `Connected / zero telemetry: ${connectedNoTelemetry.length}`
    );

    console.log(
        `Disconnected after startup: ${disconnected.length}`
    );

    console.log(
        `Full-publication marker observed: ${fullPublishCompleted.length}`
    );

    console.log("");
    console.log(
        "=================================================="
    );

    console.log(
        "TELEMETRY-PRODUCING SITES"
    );

    console.log(
        "=================================================="
    );

    for (
        const site of
        telemetryProducing
    ) {
        printSite(site);
    }

    console.log("");
    console.log(
        "=================================================="
    );

    console.log(
        "CONNECTED / ZERO TELEMETRY"
    );

    console.log(
        "=================================================="
    );

    if (
        connectedNoTelemetry.length ===
        0
    ) {
        console.log("NONE");
    } else {
        for (
            const site of
            connectedNoTelemetry
        ) {
            printSite(site);
        }
    }

    console.log("");
    console.log(
        "=================================================="
    );

    console.log(
        "DISCONNECTED RUNTIME SITES"
    );

    console.log(
        "=================================================="
    );

    if (
        disconnected.length ===
        0
    ) {
        console.log("NONE");
    } else {
        for (
            const site of
            disconnected
        ) {
            printSite(site);
        }
    }

    console.log("");
    console.log(
        "=================================================="
    );

    console.log(
        "ALL FLEET RUNTIME STATES"
    );

    console.log(
        "=================================================="
    );

    for (
        const site of
        state.sites
    ) {
        printSite(site);
    }
} catch (error) {
    console.error("");
    console.error(
        "FLEET INSPECTION ERROR:",
        error?.message ??
            String(error)
    );

    process.exitCode = 1;
} finally {
    if (shutdownRequired) {
        console.log("");
        console.log(
            "=================================================="
        );

        console.log(
            "CONTROLLED FLEET SHUTDOWN"
        );

        console.log(
            "=================================================="
        );

        try {
            const stopResult =
                await stopVrmLiveFleet({
                    concurrency:
                        STARTUP_CONCURRENCY,
                });

            console.log(
                `Targeted: ${stopResult.targetSiteCount}`
            );

            console.log(
                `Stopped: ${stopResult.stoppedCount}`
            );

            console.log(
                `Stop failures: ${stopResult.failedCount}`
            );

            const finalState =
                getVrmLiveFleetState();

            console.log(
                `Remaining fleet registry sites: ${finalState.siteCount}`
            );

            if (
                stopResult.failedCount >
                0
            ) {
                process.exitCode = 1;
            }
        } catch (error) {
            console.error(
                "Fleet shutdown error:",
                error?.message ??
                    String(error)
            );

            process.exitCode = 1;
        }
    }
}

console.log("");
console.log(
    "=================================================="
);

console.log(
    "L.3J-F CONTROLLED FLEET RUNTIME INSPECTION COMPLETE"
);

console.log(
    "=================================================="
);