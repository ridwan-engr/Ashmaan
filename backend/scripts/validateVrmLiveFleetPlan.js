import "dotenv/config";

import {
    DEFAULT_STARTUP_CONCURRENCY,
    buildVrmLiveFleetPlan,
} from "../services/vrm/vrmLiveFleetService.js";

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
    "ASHMAAN VRM LIVE FLEET PLAN VALIDATION"
);

console.log(
    "=================================================="
);

try {
    const plan =
        await buildVrmLiveFleetPlan();

    check(
        plan.installationCount === 73,
        "fleet plan discovers the current 73 VRM installations"
    );

    check(
        plan.qualifiedSiteCount === 47,
        "fleet plan identifies the current 47 evidence-qualified live sites"
    );

    check(
        plan.qualifiedSites.length ===
            plan.qualifiedSiteCount,
        "qualified-site count matches the returned qualified-site set"
    );

    check(
        plan.zeroMappingSiteCount ===
            24,
        "24 installations currently have live discovery metadata but no approved live mappings"
    );

    check(
        plan.discoveryRejectedSiteCount ===
            2,
        "two installations are rejected for incomplete live discovery metadata"
    );

    check(
        plan.errorCount === 0,
        "fleet qualification completes without API or diagnostics errors"
    );

    check(
        plan.distinctBrokerCount ===
            37,
        "47 qualified sites currently span 37 discovered MQTT brokers"
    );

    check(
        plan.startupConcurrency ===
            DEFAULT_STARTUP_CONCURRENCY &&
            DEFAULT_STARTUP_CONCURRENCY ===
                4,
        "fleet startup concurrency is explicitly bounded to four sites"
    );

    const siteIds =
        plan.qualifiedSites.map(
            (site) =>
                site.vrmSiteId
        );

    check(
        new Set(siteIds).size ===
            siteIds.length,
        "qualified fleet contains no duplicate VRM site IDs"
    );

    check(
        plan.qualifiedSites.every(
            (site) =>
                /^[0-9a-f]{12}$/.test(
                    site.portalId
                ) &&
                typeof site.mqttHost ===
                    "string" &&
                site.mqttHost.length >
                    0 &&
                site.approvedMappingCount >
                    0
        ),
        "every qualified site has Portal ID, broker metadata, and at least one evidence-backed mapping"
    );

    check(
        plan.zeroMappingSites.every(
            (site) =>
                site.approvedMappingCount ===
                    0
        ),
        "zero-mapping installations remain excluded from the production live fleet"
    );

    check(
        plan.discoveryRejectedSites.every(
            (site) =>
                !site.portalId ||
                !site.mqttHost
        ),
        "discovery-rejected installations are missing required cloud-live metadata"
    );

    const brokerSiteTotal =
        plan.brokerDistribution.reduce(
            (
                total,
                broker
            ) =>
                total +
                broker.siteCount,
            0
        );

    check(
        brokerSiteTotal ===
            plan.qualifiedSiteCount,
        "broker distribution accounts for every qualified live site exactly once"
    );

    const largestBrokerGroup =
        plan.brokerDistribution[0]
            ?.siteCount ?? 0;

    check(
        largestBrokerGroup === 3,
        "current largest qualified broker group contains three installations"
    );

    /*
     * Reference regression fixtures must
     * remain in the qualified fleet.
     */
    const reference =
        plan.qualifiedSites.find(
            (site) =>
                site.vrmSiteId ===
                "18053"
        );

    check(
        reference
            ?.approvedMappingCount ===
            28,
        "reference site 18053 remains qualified with 28 mappings"
    );

    const heterogeneous =
        plan.qualifiedSites.find(
            (site) =>
                site.vrmSiteId ===
                "30689"
        );

    check(
        heterogeneous
            ?.approvedMappingCount ===
            18,
        "heterogeneous MQTT-live site 30689 remains qualified with 18 mappings"
    );

    console.log("");
    console.log(
        `[VALIDATOR] installations=${plan.installationCount}`
    );

    console.log(
        `[VALIDATOR] qualified=${plan.qualifiedSiteCount}`
    );

    console.log(
        `[VALIDATOR] zeroMappings=${plan.zeroMappingSiteCount}`
    );

    console.log(
        `[VALIDATOR] discoveryRejected=${plan.discoveryRejectedSiteCount}`
    );

    console.log(
        `[VALIDATOR] brokers=${plan.distinctBrokerCount}`
    );

    console.log(
        `[VALIDATOR] startupConcurrency=${plan.startupConcurrency}`
    );
} catch (error) {
    fail += 1;

    console.error(
        "VALIDATOR ERROR:",
        error?.message ??
            String(error)
    );
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
        "L.3J-B VRM LIVE FLEET PLAN: PASS"
    );
} else {
    console.error(
        "L.3J-B VRM LIVE FLEET PLAN: FAIL"
    );

    process.exitCode = 1;
}