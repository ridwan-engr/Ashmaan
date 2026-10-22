import "dotenv/config";

import env from "../config/env.js";
import vrmApiClient from "../services/vrm/apiClient.js";
import {
    qualifyLiveSiteMappings,
} from "../services/vrm/vrmLiveSiteQualificationService.js";

const normalizeSiteId = (value) => {
    const normalized =
        String(value ?? "").trim();

    return /^\d+$/.test(normalized)
        ? normalized
        : null;
};

const normalizePortalId = (value) => {
    const normalized =
        String(value ?? "")
            .trim()
            .toLowerCase();

    return /^[0-9a-f]{12}$/.test(
        normalized
    )
        ? normalized
        : null;
};

const normalizeHost = (value) => {
    const normalized =
        String(value ?? "").trim();

    return normalized.length > 0
        ? normalized
        : null;
};

const extractInstallations = (
    response
) => {
    if (Array.isArray(response)) {
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
            response?.data
        )
    ) {
        return response.data;
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

    return [];
};

const getSiteId = (
    installation
) =>
    normalizeSiteId(
        installation?.idSite ??
            installation?.idsite ??
            installation?.siteId ??
            installation?.installationId ??
            installation?.id
    );

const getPortalId = (
    installation
) =>
    normalizePortalId(
        installation?.identifier
    );

const getMqttHost = (
    installation
) =>
    normalizeHost(
        installation?.mqtt_host ??
            installation?.mqttHost
    );

console.log(
    "=================================================="
);

console.log(
    "ASHMAAN VRM FLEET MQTT BROKER DISTRIBUTION"
);

console.log(
    "=================================================="
);

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
    extractInstallations(response);

console.log(
    `Installations discovered: ${installations.length}`
);

const qualifiedSites = [];
const partialSites = [];
const notLiveCapableSites = [];
const errors = [];

for (const installation of installations) {
    const vrmSiteId =
        getSiteId(installation);

    if (!vrmSiteId) {
        continue;
    }

    const portalId =
        getPortalId(installation);

    const mqttHost =
        getMqttHost(installation);

    /*
     * A site without valid cloud MQTT
     * discovery metadata cannot be started
     * as a cloud live MQTT installation.
     */
    if (
        !portalId ||
        !mqttHost
    ) {
        notLiveCapableSites.push({
            vrmSiteId,
            portalId,
            mqttHost,
        });

        continue;
    }

    try {
        const qualification =
            await qualifyLiveSiteMappings(
                vrmSiteId
            );

        const approvedMappingCount =
            qualification
                ?.approvedMappingCount ??
            0;

        const record = {
            vrmSiteId,
            portalId,
            mqttHost,
            approvedMappingCount,
        };

        if (
            approvedMappingCount > 0
        ) {
            qualifiedSites.push(
                record
            );
        } else {
            partialSites.push(
                record
            );
        }
    } catch (error) {
        errors.push({
            vrmSiteId,
            portalId,
            mqttHost,
            message:
                error?.message ??
                String(error),
        });
    }
}

/*
 * ------------------------------------------------
 * Group production-qualified installations
 * by the broker supplied by VRM.
 * ------------------------------------------------
 */

const brokerGroups = new Map();

for (const site of qualifiedSites) {
    const existing =
        brokerGroups.get(
            site.mqttHost
        ) ?? [];

    existing.push(site);

    brokerGroups.set(
        site.mqttHost,
        existing
    );
}

const sortedBrokerGroups =
    [...brokerGroups.entries()]
        .map(
            ([
                mqttHost,
                sites,
            ]) => ({
                mqttHost,
                siteCount:
                    sites.length,
                sites:
                    [...sites].sort(
                        (a, b) =>
                            Number(
                                a.vrmSiteId
                            ) -
                            Number(
                                b.vrmSiteId
                            )
                    ),
            })
        )
        .sort(
            (a, b) =>
                b.siteCount -
                    a.siteCount ||
                a.mqttHost.localeCompare(
                    b.mqttHost
                )
        );

console.log("");
console.log(
    "=================================================="
);

console.log(
    "QUALIFICATION SUMMARY"
);

console.log(
    "=================================================="
);

console.log(
    `Qualified live sites: ${qualifiedSites.length}`
);

console.log(
    `Live-metadata sites with zero approved mappings: ${partialSites.length}`
);

console.log(
    `Not live-capable from discovery metadata: ${notLiveCapableSites.length}`
);

console.log(
    `Qualification errors: ${errors.length}`
);

console.log(
    `Distinct MQTT brokers for qualified sites: ${sortedBrokerGroups.length}`
);

console.log("");
console.log(
    "=================================================="
);

console.log(
    "BROKER DISTRIBUTION"
);

console.log(
    "=================================================="
);

for (
    const group of
    sortedBrokerGroups
) {
    console.log("");
    console.log(
        `${group.mqttHost} -> ${group.siteCount} qualified site(s)`
    );

    for (const site of group.sites) {
        console.log(
            `  site=${site.vrmSiteId} | portal=${site.portalId} | mappings=${site.approvedMappingCount}`
        );
    }
}

if (partialSites.length > 0) {
    console.log("");
    console.log(
        "=================================================="
    );

    console.log(
        "LIVE METADATA / ZERO APPROVED MAPPINGS"
    );

    console.log(
        "=================================================="
    );

    for (
        const site of
        partialSites
    ) {
        console.log(
            `site=${site.vrmSiteId} | broker=${site.mqttHost} | portal=${site.portalId}`
        );
    }
}

if (
    notLiveCapableSites.length >
    0
) {
    console.log("");
    console.log(
        "=================================================="
    );

    console.log(
        "NOT LIVE-CAPABLE FROM DISCOVERY METADATA"
    );

    console.log(
        "=================================================="
    );

    for (
        const site of
        notLiveCapableSites
    ) {
        console.log(
            `site=${site.vrmSiteId} | broker=${site.mqttHost ?? "NONE"} | portal=${site.portalId ?? "NONE"}`
        );
    }
}

if (errors.length > 0) {
    console.log("");
    console.log(
        "=================================================="
    );

    console.log(
        "QUALIFICATION ERRORS"
    );

    console.log(
        "=================================================="
    );

    for (
        const error of
        errors
    ) {
        console.log(
            `site=${error.vrmSiteId} | ${error.message}`
        );
    }
}

console.log("");
console.log(
    "=================================================="
);

console.log(
    "L.3J-A FLEET BROKER DISTRIBUTION INSPECTION COMPLETE"
);

console.log(
    "=================================================="
);