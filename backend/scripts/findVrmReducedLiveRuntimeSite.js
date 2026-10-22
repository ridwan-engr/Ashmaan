import "dotenv/config";

import {
    startVrmLiveTelemetry,
    stopVrmLiveTelemetry,
    getVrmLiveTelemetryState,
} from "../services/vrm/vrmLiveTelemetryService.js";

const CANDIDATES = [
    "30689",
    "74378",
    "885675",
    "822696",
    "46710",
    "132158",
    "70628",
    "57153",
    "729615",
    "440520",
    "873805",
];

const OBSERVE_MS = 10_000;
const POLL_MS = 250;

const sleep = (ms) =>
    new Promise((resolve) =>
        setTimeout(resolve, ms)
    );

const waitForTelemetry = async (
    siteId
) => {
    const deadline =
        Date.now() + OBSERVE_MS;

    let state =
        getVrmLiveTelemetryState(
            siteId
        );

    while (
        Date.now() < deadline &&
        !(state?.receivedTelemetryCount > 0)
    ) {
        await sleep(POLL_MS);

        state =
            getVrmLiveTelemetryState(
                siteId
            );
    }

    return state;
};

console.log(
    "================================================"
);

console.log(
    "ASHMAAN REDUCED LIVE MQTT RUNTIME SITE DISCOVERY"
);

console.log(
    "================================================"
);

let selected = null;

for (const siteId of CANDIDATES) {
    console.log("");
    console.log(
        `--- Testing site ${siteId} ---`
    );

    try {
        await startVrmLiveTelemetry(
            siteId
        );

        const initial =
            getVrmLiveTelemetryState(
                siteId
            );

        console.log(
            `approved=${initial?.approvedMappingCount ?? 0}`
        );

        console.log(
            `subscribed=${initial?.subscriptionCount ?? 0}`
        );

        console.log(
            `connected=${initial?.connected === true}`
        );

        /*
         * We are specifically looking
         * for a heterogeneous site.
         */
        if (
            !initial?.connected ||
            !(
                initial
                    .approvedMappingCount >
                    0 &&
                initial
                    .approvedMappingCount <
                    28
            )
        ) {
            console.log(
                "SKIP: site is not a connected reduced-topology candidate."
            );

            await stopVrmLiveTelemetry(
                siteId
            );

            continue;
        }

        if (
            initial.subscriptionCount !==
            initial.approvedMappingCount + 1
        ) {
            console.log(
                "REJECT: subscription count does not match qualified mappings + marker."
            );

            await stopVrmLiveTelemetry(
                siteId
            );

            continue;
        }

        const state =
            await waitForTelemetry(
                siteId
            );

        console.log(
            `received=${state?.receivedTelemetryCount ?? 0}`
        );

        console.log(
            `lastTelemetryAt=${state?.lastTelemetryAt ?? "null"}`
        );

        console.log(
            `fullPublishCompleted=${state?.fullPublishCompleted === true}`
        );

        if (
            state?.receivedTelemetryCount >
                0 &&
            typeof state.lastTelemetryAt ===
                "string" &&
            !Number.isNaN(
                Date.parse(
                    state.lastTelemetryAt
                )
            )
        ) {
            selected = {
                siteId,
                approvedMappingCount:
                    state.approvedMappingCount,

                subscriptionCount:
                    state.subscriptionCount,

                receivedTelemetryCount:
                    state.receivedTelemetryCount,

                lastTelemetryAt:
                    state.lastTelemetryAt,

                fullPublishCompleted:
                    state.fullPublishCompleted,
            };

            console.log("");
            console.log(
                `SELECTED: site ${siteId} is a real reduced-topology MQTT-live installation.`
            );

            await stopVrmLiveTelemetry(
                siteId
            );

            break;
        }

        console.log(
            "NO LIVE DATA: exact topics were subscribed but no approved telemetry arrived."
        );

        await stopVrmLiveTelemetry(
            siteId
        );
    } catch (error) {
        console.error(
            `ERROR site ${siteId}: ${error.message}`
        );

        try {
            await stopVrmLiveTelemetry(
                siteId
            );
        } catch {
            // Best-effort cleanup.
        }
    }
}

console.log("");
console.log(
    "================================================"
);

console.log(
    "DISCOVERY RESULT"
);

console.log(
    "================================================"
);

if (selected) {
    console.log(
        JSON.stringify(
            selected,
            null,
            2
        )
    );

    console.log("");
    console.log(
        "RESULT: REDUCED MQTT-LIVE SITE FOUND"
    );
} else {
    console.log(
        "RESULT: NO REDUCED MQTT-LIVE SITE FOUND IN CANDIDATE SET"
    );

    process.exitCode = 1;
}