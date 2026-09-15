import "dotenv/config";

import env from "../config/env.js";
import vrmApiClient
    from "../services/vrm/apiClient.js";

import {
    findLiveTelemetryMapping,
} from "../services/vrm/vrmLiveTelemetryMapping.js";


const PORTAL_ID_PATTERN =
    /^[0-9a-f]{12}$/i;


function extractInstallations(
    response
) {
    if (
        Array.isArray(
            response
        )
    ) {
        return response;
    }

    if (
        Array.isArray(
            response?.records
        )
    ) {
        return response.records;
    }

    if (
        Array.isArray(
            response?.installations
        )
    ) {
        return response.installations;
    }

    if (
        Array.isArray(
            response?.data?.records
        )
    ) {
        return response.data.records;
    }

    if (
        Array.isArray(
            response?.data?.installations
        )
    ) {
        return response.data.installations;
    }

    if (
        Array.isArray(
            response?.data
        )
    ) {
        return response.data;
    }

    return [];
}


function extractDiagnostics(
    response
) {
    if (
        Array.isArray(
            response
        )
    ) {
        return response;
    }

    if (
        Array.isArray(
            response?.records
        )
    ) {
        return response.records;
    }

    if (
        Array.isArray(
            response?.data?.records
        )
    ) {
        return response.data.records;
    }

    if (
        Array.isArray(
            response?.data
        )
    ) {
        return response.data;
    }

    return [];
}


function normalizeSiteId(
    installation
) {
    const value =
        installation?.idSite ??
        installation?.idsite ??
        installation?.siteId ??
        installation?.id;

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalized =
        String(
            value
        ).trim();

    return /^\d+$/.test(
        normalized
    )
        ? normalized
        : null;
}


function normalizePortalId(
    installation
) {
    const value =
        installation?.identifier;

    if (
        typeof value !==
        "string"
    ) {
        return null;
    }

    const normalized =
        value
            .trim()
            .toLowerCase();

    return PORTAL_ID_PATTERN.test(
        normalized
    )
        ? normalized
        : null;
}


function normalizeMqttHost(
    installation
) {
    const value =
        installation?.mqtt_host;

    if (
        typeof value !==
        "string"
    ) {
        return null;
    }

    const normalized =
        value.trim();

    return normalized.length > 0
        ? normalized
        : null;
}


function isRealtimeExplicitlyDisabled(
    installation
) {
    const value =
        installation
            ?.realtimeUpdates;

    return (
        value === false ||
        value === 0 ||
        value === "0" ||
        value === "false"
    );
}


function extractServiceType(
    record
) {
    const value =
        record?.dbusServiceType ??
        record?.serviceType;

    if (
        typeof value !==
        "string"
    ) {
        return null;
    }

    const normalized =
        value.trim();

    return normalized.length > 0
        ? normalized
        : null;
}


function extractDeviceInstance(
    record
) {
    const value =
        record?.instance ??
        record?.deviceInstance;

    const numeric =
        Number(
            value
        );

    return Number.isInteger(
        numeric
    )
        ? numeric
        : null;
}


function extractDbusPath(
    record
) {
    const value =
        record?.dbusPath ??
        record?.path;

    if (
        typeof value !==
        "string"
    ) {
        return null;
    }

    const normalized =
        value.trim();

    return normalized.startsWith(
        "/"
    )
        ? normalized
        : null;
}


function getObservedMappings(
    diagnostics
) {
    const observed =
        new Map();

    for (
        const record
        of diagnostics
    ) {
        const serviceType =
            extractServiceType(
                record
            );

        const deviceInstance =
            extractDeviceInstance(
                record
            );

        const dbusPath =
            extractDbusPath(
                record
            );

        if (
            !serviceType ||
            deviceInstance ===
                null ||
            !dbusPath
        ) {
            continue;
        }

        const mapping =
            findLiveTelemetryMapping(
                serviceType,
                deviceInstance,
                dbusPath
            );

        if (!mapping) {
            continue;
        }

        observed.set(
            mapping.vrmAttributeId,
            mapping
        );
    }

    return [
        ...observed.values(),
    ];
}


async function getDiagnostics(
    siteId
) {
    const response =
        await vrmApiClient.get(
            `/installations/${siteId}/diagnostics`,
            {
                params: {
                    count:
                        1000,
                },
            }
        );

    return extractDiagnostics(
        response
    );
}


console.log(
    "================================================"
);

console.log(
    "ASHMAAN VRM LIVE SITE QUALIFICATION"
);

console.log(
    "================================================"
);


if (!env.vrm.userId) {
    throw new Error(
        "VRM_USER_ID is required."
    );
}


const response =
    await vrmApiClient.get(
        `/users/${env.vrm.userId}/installations`,
        {
            params: {
                extended: 1,
            },
        }
    );


const installations =
    extractInstallations(
        response
    );


if (
    installations.length ===
    0
) {
    throw new Error(
        "No VRM installations were returned."
    );
}


const results = [];


for (
    const installation
    of installations
) {
    const siteId =
        normalizeSiteId(
            installation
        );

    const portalId =
        normalizePortalId(
            installation
        );

    const mqttHost =
        normalizeMqttHost(
            installation
        );

    const realtimeDisabled =
        isRealtimeExplicitlyDisabled(
            installation
        );


    if (
        !siteId ||
        !portalId ||
        !mqttHost ||
        realtimeDisabled
    ) {
        results.push({
            siteId,
            status:
                "NOT_LIVE_CAPABLE",

            portalId:
                Boolean(
                    portalId
                ),

            mqttHost:
                Boolean(
                    mqttHost
                ),

            realtimeDisabled,

            approvedMappingCount:
                0,
        });

        continue;
    }


    try {
        const diagnostics =
            await getDiagnostics(
                siteId
            );

        const mappings =
            getObservedMappings(
                diagnostics
            );


        results.push({
            siteId,

            status:
                mappings.length > 0
                    ? "QUALIFIED"
                    : "PARTIAL",

            portalId:
                true,

            mqttHost:
                true,

            realtimeDisabled:
                false,

            diagnosticsCount:
                diagnostics.length,

            approvedMappingCount:
                mappings.length,

            approvedAttributes:
                mappings
                    .map(
                        (
                            mapping
                        ) =>
                            mapping
                                .vrmAttributeId
                    )
                    .sort(
                        (
                            left,
                            right
                        ) =>
                            left -
                            right
                    ),
        });

    } catch (error) {
        results.push({
            siteId,

            status:
                "ERROR",

            portalId:
                true,

            mqttHost:
                true,

            realtimeDisabled:
                false,

            approvedMappingCount:
                0,

            error:
                error?.message ||
                "Qualification failed.",
        });
    }
}


const qualified =
    results.filter(
        (
            result
        ) =>
            result.status ===
            "QUALIFIED"
    );


const partial =
    results.filter(
        (
            result
        ) =>
            result.status ===
            "PARTIAL"
    );


const notLiveCapable =
    results.filter(
        (
            result
        ) =>
            result.status ===
            "NOT_LIVE_CAPABLE"
    );


const errors =
    results.filter(
        (
            result
        ) =>
            result.status ===
            "ERROR"
    );


console.log("");

console.log(
    `Installations inspected: ${results.length}`
);

console.log(
    `QUALIFIED: ${qualified.length}`
);

console.log(
    `PARTIAL: ${partial.length}`
);

console.log(
    `NOT_LIVE_CAPABLE: ${notLiveCapable.length}`
);

console.log(
    `ERROR: ${errors.length}`
);


console.log("");

console.log(
    "Qualified live sites:"
);


for (
    const result
    of qualified
) {
    console.log(
        [
            `site=${result.siteId}`,
            `mappings=${result.approvedMappingCount}`,
            `attributes=${result.approvedAttributes.join(",")}`,
        ].join(
            " "
        )
    );
}


console.log("");

console.log(
    "Non-qualified summary:"
);


for (
    const result
    of results.filter(
        (
            item
        ) =>
            item.status !==
            "QUALIFIED"
    )
) {
    console.log(
        [
            `site=${result.siteId ?? "UNKNOWN"}`,
            `status=${result.status}`,
            `mappings=${result.approvedMappingCount}`,
            result.error
                ? `error=${result.error}`
                : "",
        ]
            .filter(
                Boolean
            )
            .join(
                " "
            )
    );
}


console.log("");

console.log(
    "================================================"
);


if (
    qualified.some(
        (
            result
        ) =>
            result.siteId ===
            "18053"
    )
) {
    console.log(
        "PASS: reference site 18053 remains live-qualified"
    );
} else {
    console.error(
        "FAIL: reference site 18053 is no longer live-qualified"
    );

    process.exitCode = 1;
}


if (
    errors.length ===
    0
) {
    console.log(
        "PASS: qualification completed without API errors"
    );
} else {
    console.error(
        `FAIL: ${errors.length} site qualification request(s) failed`
    );

    process.exitCode = 1;
}


console.log(
    "L.3F LIVE SITE QUALIFICATION COMPLETE"
);