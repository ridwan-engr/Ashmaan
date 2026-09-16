import "dotenv/config";

import {
    startVrmLiveFleet,
    stopVrmLiveFleet,
    getVrmLiveFleetState,
} from "../services/vrm/vrmLiveFleetService.js";

import {
    getVrmLiveTelemetryState,
} from "../services/vrm/vrmLiveTelemetryService.js";

const TEST_SITES = [
    "18053",
    "30689",
];

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

const waitForFleetTelemetry =
    async () => {
        const deadline =
            Date.now() + WAIT_MS;

        let state =
            getVrmLiveFleetState();

        while (
            Date.now() <
                deadline &&
            !TEST_SITES.every(
                (siteId) => {
                    const site =
                        state.sites.find(
                            (item) =>
                                item.vrmSiteId ===
                                siteId
                        );

                    return (
                        site
                            ?.receivedTelemetryCount >
                        0
                    );
                }
            )
        ) {
            await sleep(250);

            state =
                getVrmLiveFleetState();
        }

        return state;
    };

console.log(
    "=================================================="
);

console.log(
    "ASHMAAN VRM LIVE FLEET LIFECYCLE VALIDATION"
);

console.log(
    "=================================================="
);

try {
    const initialState =
        getVrmLiveFleetState();

    check(
        initialState.siteCount ===
            0,
        "fleet lifecycle starts with an empty runtime registry"
    );

    const startResult =
        await startVrmLiveFleet({
            siteIds:
                TEST_SITES,
            concurrency: 2,
        });

    check(
        startResult
            .selectedSiteCount ===
            2,
        "validator selects exactly the two requested qualified sites"
    );

    check(
        startResult
            .startedCount === 2,
        "both qualified validation sites start successfully"
    );

    check(
        startResult
            .failedCount === 0,
        "no validation site fails during bounded fleet startup"
    );

    check(
        startResult
            .rejectedRequestedSiteCount ===
            0,
        "no requested validation site is rejected by fleet qualification"
    );

    check(
        startResult
            .concurrency === 2,
        "validator uses the explicitly bounded startup concurrency"
    );

    let fleetState =
        getVrmLiveFleetState();

    check(
        fleetState.siteCount ===
            2,
        "fleet runtime registry contains exactly two started sites"
    );

    check(
        fleetState
            .connectedCount === 2,
        "both fleet-managed MQTT clients are connected"
    );

    const fullSite =
        fleetState.sites.find(
            (site) =>
                site.vrmSiteId ===
                "18053"
        );

    check(
        fullSite
            ?.approvedMappingCount ===
            28 &&
            fullSite
                ?.subscriptionCount ===
                29,
        "reference site preserves its 28-mapping plus marker subscription topology"
    );

    const reducedSite =
        fleetState.sites.find(
            (site) =>
                site.vrmSiteId ===
                "30689"
        );

    check(
        reducedSite
            ?.approvedMappingCount ===
            18 &&
            reducedSite
                ?.subscriptionCount ===
                19,
        "heterogeneous site preserves its own 18-mapping plus marker topology"
    );

    check(
        getVrmLiveTelemetryState(
            "18053"
        ) !== null &&
            getVrmLiveTelemetryState(
                "30689"
            ) !== null,
        "fleet manager delegates to the existing per-site MQTT connection registry"
    );

    fleetState =
        await waitForFleetTelemetry();

    const fullLive =
        fleetState.sites.find(
            (site) =>
                site.vrmSiteId ===
                "18053"
        );

    const reducedLive =
        fleetState.sites.find(
            (site) =>
                site.vrmSiteId ===
                "30689"
        );

    check(
        fullLive
            ?.receivedTelemetryCount >
            0,
        "reference fleet site receives parser-approved live telemetry"
    );

    check(
        reducedLive
            ?.receivedTelemetryCount >
            0,
        "heterogeneous fleet site receives parser-approved live telemetry"
    );

    check(
        typeof fullLive
            ?.lastTelemetryAt ===
            "string" &&
            !Number.isNaN(
                Date.parse(
                    fullLive.lastTelemetryAt
                )
            ),
        "reference fleet site exposes a valid live telemetry timestamp"
    );

    check(
        typeof reducedLive
            ?.lastTelemetryAt ===
            "string" &&
            !Number.isNaN(
                Date.parse(
                    reducedLive.lastTelemetryAt
                )
            ),
        "heterogeneous fleet site exposes a valid live telemetry timestamp"
    );

    console.log(
        `[VALIDATOR] site 18053 approved=${fullLive?.approvedMappingCount} subscribed=${fullLive?.subscriptionCount} received=${fullLive?.receivedTelemetryCount}`
    );

    console.log(
        `[VALIDATOR] site 30689 approved=${reducedLive?.approvedMappingCount} subscribed=${reducedLive?.subscriptionCount} received=${reducedLive?.receivedTelemetryCount}`
    );

    const stopResult =
        await stopVrmLiveFleet({
            siteIds:
                TEST_SITES,
            concurrency: 2,
        });

    check(
        stopResult
            .targetSiteCount === 2,
        "fleet shutdown targets both managed validation sites"
    );

    check(
        stopResult
            .stoppedCount === 2,
        "both fleet-managed validation sites stop cleanly"
    );

    check(
        stopResult
            .failedCount === 0,
        "fleet shutdown completes without site-level failures"
    );

    const finalState =
        getVrmLiveFleetState();

    check(
        finalState.siteCount ===
            0,
        "fleet runtime registry is empty after shutdown"
    );

    check(
        getVrmLiveTelemetryState(
            "18053"
        ) === null &&
            getVrmLiveTelemetryState(
                "30689"
            ) === null,
        "underlying per-site MQTT registry is empty after fleet shutdown"
    );
} catch (error) {
    fail += 1;

    console.error(
        "VALIDATOR ERROR:",
        error?.message ??
            String(error)
    );

    /*
     * Best-effort cleanup.
     */
    try {
        await stopVrmLiveFleet({
            siteIds:
                TEST_SITES,
            concurrency: 2,
        });
    } catch {
        // Ignore cleanup errors.
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
        "L.3J-C VRM LIVE FLEET LIFECYCLE: PASS"
    );
} else {
    console.error(
        "L.3J-C VRM LIVE FLEET LIFECYCLE: FAIL"
    );

    process.exitCode = 1;
}