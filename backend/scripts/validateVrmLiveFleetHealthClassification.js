import "dotenv/config";

import {
    LIVE_FLEET_STATUSES,
    classifyVrmLiveFleetSite,
    startVrmLiveFleet,
    stopVrmLiveFleet,
    getVrmLiveFleetState,
} from "../services/vrm/vrmLiveFleetService.js";

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

const waitForLiveSites =
    async () => {
        const deadline =
            Date.now() + WAIT_MS;

        let state =
            getVrmLiveFleetState();

        while (
            Date.now() < deadline &&
            !TEST_SITES.every(
                (siteId) =>
                    state.sites.find(
                        (site) =>
                            site.vrmSiteId ===
                                siteId &&
                            site.status ===
                                LIVE_FLEET_STATUSES.LIVE
                    )
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
    "ASHMAAN VRM LIVE FLEET HEALTH CLASSIFICATION"
);

console.log(
    "=================================================="
);

/*
 * ----------------------------------------------
 * Pure classification contract.
 * ----------------------------------------------
 */

check(
    classifyVrmLiveFleetSite({
        storedStatus:
            LIVE_FLEET_STATUSES
                .CONNECTED_AWAITING_DATA,
        connected: true,
        receivedTelemetryCount: 1,
        reconnectScheduled: false,
        stopping: false,
    }) ===
        LIVE_FLEET_STATUSES.LIVE,
    "connected site with parser-approved telemetry is LIVE"
);

check(
    classifyVrmLiveFleetSite({
        storedStatus:
            LIVE_FLEET_STATUSES
                .CONNECTED_AWAITING_DATA,
        connected: true,
        receivedTelemetryCount: 0,
        reconnectScheduled: false,
        stopping: false,
    }) ===
        LIVE_FLEET_STATUSES
            .CONNECTED_AWAITING_DATA,
    "connected site without approved telemetry remains CONNECTED_AWAITING_DATA"
);

check(
    classifyVrmLiveFleetSite({
        storedStatus:
            LIVE_FLEET_STATUSES.LIVE,
        connected: false,
        receivedTelemetryCount: 100,
        reconnectScheduled: true,
        stopping: false,
    }) ===
        LIVE_FLEET_STATUSES.RECONNECTING,
    "disconnected site with a pending reconnect is RECONNECTING even with historical receive evidence"
);

check(
    classifyVrmLiveFleetSite({
        storedStatus:
            LIVE_FLEET_STATUSES.FAILED,
        connected: false,
        receivedTelemetryCount: 0,
        reconnectScheduled: false,
        stopping: false,
    }) ===
        LIVE_FLEET_STATUSES.FAILED,
    "startup failure remains FAILED"
);

check(
    classifyVrmLiveFleetSite({
        storedStatus:
            LIVE_FLEET_STATUSES.LIVE,
        connected: false,
        receivedTelemetryCount: 10,
        reconnectScheduled: false,
        stopping: true,
    }) ===
        LIVE_FLEET_STATUSES.STOPPING,
    "explicit shutdown state is STOPPING"
);

check(
    classifyVrmLiveFleetSite({
        storedStatus:
            LIVE_FLEET_STATUSES.STARTING,
        connected: false,
        receivedTelemetryCount: 0,
        reconnectScheduled: false,
        stopping: false,
    }) ===
        LIVE_FLEET_STATUSES.STARTING,
    "unconnected nonfailed site without reconnect remains STARTING"
);

/*
 * full_publish_completed is deliberately
 * not an input to the classifier.
 */
check(
    classifyVrmLiveFleetSite.length <=
        1,
    "runtime classifier does not require the full-publication marker"
);

try {
    const initialState =
        getVrmLiveFleetState();

    check(
        initialState.siteCount === 0,
        "runtime registry starts empty"
    );

    const startResult =
        await startVrmLiveFleet({
            siteIds:
                TEST_SITES,
            concurrency: 2,
        });

    check(
        startResult.startedCount ===
            2 &&
            startResult.failedCount ===
                0,
        "both runtime fixtures start successfully"
    );

    let state =
        getVrmLiveFleetState();

    check(
        state.connectedCount === 2,
        "both fleet-managed MQTT clients are connected"
    );

    check(
        state.sites.every(
            (site) =>
                site.status ===
                    LIVE_FLEET_STATUSES
                        .CONNECTED_AWAITING_DATA ||
                site.status ===
                    LIVE_FLEET_STATUSES.LIVE
        ),
        "connected fixtures are never mislabeled as STARTING or FAILED"
    );

    state =
        await waitForLiveSites();

    check(
        state.liveCount === 2,
        "both fixtures become LIVE after parser-approved telemetry"
    );

    check(
        state.awaitingDataCount === 0,
        "no fixture remains awaiting data after both produce telemetry"
    );

    check(
        state.reconnectingCount === 0 &&
            state.failedCount === 0,
        "healthy fixtures have no reconnecting or failed state"
    );

    const reference =
        state.sites.find(
            (site) =>
                site.vrmSiteId ===
                "18053"
        );

    const reduced =
        state.sites.find(
            (site) =>
                site.vrmSiteId ===
                "30689"
        );

    check(
        reference?.status ===
            LIVE_FLEET_STATUSES.LIVE &&
            reduced?.status ===
                LIVE_FLEET_STATUSES.LIVE,
        "reference and heterogeneous sites are both classified LIVE"
    );

    check(
        reference
            ?.approvedMappingCount ===
            28 &&
            reference
                ?.subscriptionCount ===
                29 &&
            reduced
                ?.approvedMappingCount ===
                18 &&
            reduced
                ?.subscriptionCount ===
                19,
        "health classification preserves heterogeneous exact-topic topology"
    );

    check(
        typeof reference
            ?.lastTelemetryReceivedAt ===
            "string" &&
            !Number.isNaN(
                Date.parse(
                    reference
                        .lastTelemetryReceivedAt
                )
            ) &&
            reference
                .lastTelemetryReceivedAt ===
                reference.lastTelemetryAt,
        "reference site exposes explicit receive-time freshness with compatibility alias"
    );

    check(
        typeof reduced
            ?.lastTelemetryReceivedAt ===
            "string" &&
            !Number.isNaN(
                Date.parse(
                    reduced
                        .lastTelemetryReceivedAt
                )
            ) &&
            reduced
                .lastTelemetryReceivedAt ===
                reduced.lastTelemetryAt,
        "heterogeneous site exposes explicit receive-time freshness with compatibility alias"
    );

    /*
     * Marker state may be true or false.
     * It must not alter LIVE status.
     */
    check(
        [true, false].includes(
            reference
                ?.fullPublishCompleted
        ) &&
            [true, false].includes(
                reduced
                    ?.fullPublishCompleted
            ) &&
            reference?.status ===
                LIVE_FLEET_STATUSES.LIVE &&
            reduced?.status ===
                LIVE_FLEET_STATUSES.LIVE,
        "full-publication marker remains diagnostic and does not control LIVE classification"
    );

    const stopResult =
        await stopVrmLiveFleet({
            siteIds:
                TEST_SITES,
            concurrency: 2,
        });

    check(
        stopResult.stoppedCount ===
            2 &&
            stopResult.failedCount ===
                0,
        "both classified fleet sites stop cleanly"
    );

    const finalState =
        getVrmLiveFleetState();

    check(
        finalState.siteCount === 0,
        "runtime registry is empty after shutdown"
    );
} catch (error) {
    fail += 1;

    console.error(
        "VALIDATOR ERROR:",
        error?.message ??
            String(error)
    );

    try {
        await stopVrmLiveFleet({
            siteIds:
                TEST_SITES,
            concurrency: 2,
        });
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
        "L.3J-G VRM LIVE FLEET HEALTH CLASSIFICATION: PASS"
    );
} else {
    console.error(
        "L.3J-G VRM LIVE FLEET HEALTH CLASSIFICATION: FAIL"
    );

    process.exitCode = 1;
}