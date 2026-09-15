import "dotenv/config";

import {
    startVrmLiveTelemetry,
    stopVrmLiveTelemetry,
    getVrmLiveTelemetryState,
} from "../services/vrm/vrmLiveTelemetryService.js";

const SITE_ID =
    process.env.LIVE_VRM_SITE_ID ||
    "18053";

const WAIT_MS =
    5000;

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
        /^[0-9a-f]{12}$/i.test(
            connectedState
                ?.portalId ??
                ""
        ),
        "live service discovered a valid Portal ID"
    );

    check(
        Boolean(
            connectedState
                ?.mqttHost
        ),
        "live service discovered the installation MQTT broker"
    );

    /*
     * Give the initial publication marker
     * time to arrive from the real source.
     */
    const deadline =
        Date.now() +
        WAIT_MS;

    let publicationState =
        connectedState;

    while (
        Date.now() <
            deadline &&
        publicationState
            ?.fullPublishCompleted !==
            true
    ) {
        await sleep(
            250
        );

        publicationState =
            getVrmLiveTelemetryState(
                SITE_ID
            );
    }

    check(
        publicationState
            ?.fullPublishCompleted ===
            true,
        "real VRM full publication completes through the production service"
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
        "L.3D PRODUCTION LIVE TELEMETRY SERVICE VALIDATION: PASS"
    );
} else {
    console.error(
        "L.3D PRODUCTION LIVE TELEMETRY SERVICE VALIDATION: FAIL"
    );

    process.exitCode = 1;
}
