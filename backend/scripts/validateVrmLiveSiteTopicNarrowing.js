import "dotenv/config";

import {
    qualifyLiveSiteMappings,
} from "../services/vrm/vrmLiveSiteQualificationService.js";

const FULL_SITE =
    process.env.LIVE_VRM_FULL_SITE_ID ||
    "18053";

const REDUCED_SITE =
    process.env.LIVE_VRM_REDUCED_SITE_ID ||
    "40898";

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

const hasUniqueMappings = (
    mappings
) => {
    const identities =
        mappings.map(
            (mapping) =>
                [
                    mapping.serviceType,
                    mapping.deviceInstance,
                    mapping.dbusPath,
                ].join(":")
        );

    return (
        new Set(identities).size ===
        identities.length
    );
};

console.log(
    "=============================================="
);

console.log(
    "ASHMAAN VRM PER-SITE LIVE TOPIC QUALIFICATION"
);

console.log(
    "=============================================="
);

try {
    const fullSite =
        await qualifyLiveSiteMappings(
            FULL_SITE
        );

    const reducedSite =
        await qualifyLiveSiteMappings(
            REDUCED_SITE
        );

    check(
        fullSite.vrmSiteId ===
            String(FULL_SITE),
        "reference full-topology site identity is preserved"
    );

    check(
        fullSite.diagnosticsRecordCount >
            0,
        "reference site returned real VRM diagnostics"
    );

    check(
        fullSite.approvedMappingCount ===
            28,
        "reference site 18053 qualifies all 28 evidence-backed mappings"
    );

    check(
        fullSite.approvedMappings.length ===
            fullSite.approvedMappingCount,
        "reference-site mapping count matches the returned approved mapping set"
    );

    check(
        hasUniqueMappings(
            fullSite.approvedMappings
        ),
        "reference-site approved mappings contain no duplicate topic identities"
    );

    check(
        reducedSite.vrmSiteId ===
            String(REDUCED_SITE),
        "heterogeneous reduced-topology site identity is preserved"
    );

    check(
        reducedSite.diagnosticsRecordCount >
            0,
        "heterogeneous site returned real VRM diagnostics"
    );

    check(
        reducedSite.approvedMappingCount >
            0 &&
        reducedSite.approvedMappingCount <
            28,
        "heterogeneous site qualifies a strict subset of the global 28-entry allowlist"
    );

    check(
        reducedSite.approvedMappings.length ===
            reducedSite.approvedMappingCount,
        "heterogeneous-site mapping count matches the returned approved mapping set"
    );

    check(
        hasUniqueMappings(
            reducedSite.approvedMappings
        ),
        "heterogeneous-site approved mappings contain no duplicate topic identities"
    );

    /*
     * L.3F previously established site
     * 40898 as a six-mapping topology.
     *
     * Keep this exact assertion so a
     * future diagnostics/topology change
     * becomes explicit rather than being
     * silently inferred.
     */
    check(
        reducedSite.approvedMappingCount ===
            6,
        "site 40898 currently qualifies exactly its six evidenced live mappings"
    );

    const reducedAttributeIds =
        reducedSite.approvedMappings
            .map(
                (mapping) =>
                    mapping.vrmAttributeId
            )
            .sort(
                (a, b) =>
                    a - b
            );

    check(
        JSON.stringify(
            reducedAttributeIds
        ) ===
            JSON.stringify([
                131,
                132,
                133,
                137,
                138,
                139,
            ]),
        "site 40898 is narrowed exactly to its evidenced system consumption/genset mappings"
    );

    console.log("");
    console.log(
        `Reference ${FULL_SITE}: ${fullSite.approvedMappingCount} approved mappings`
    );

    console.log(
        `Reduced ${REDUCED_SITE}: ${reducedSite.approvedMappingCount} approved mappings`
    );
} catch (error) {
    fail += 1;

    console.error(
        "VALIDATOR ERROR:",
        error.message
    );
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
        "L.3I PER-SITE LIVE TOPIC QUALIFICATION: PASS"
    );
} else {
    console.error(
        "L.3I PER-SITE LIVE TOPIC QUALIFICATION: FAIL"
    );

    process.exitCode = 1;
}
