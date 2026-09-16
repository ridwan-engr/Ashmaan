import vrmApiClient from "./apiClient.js";

import {
    findLiveTelemetryMapping,
} from "./vrmLiveTelemetryMapping.js";

const normalizeSiteId = (value) => {
    const normalized =
        String(value ?? "").trim();

    if (!/^\d+$/.test(normalized)) {
        throw new Error(
            "A valid VRM site ID is required."
        );
    }

    return normalized;
};

const extractRecords = (payload) => {
    if (Array.isArray(payload?.records)) {
        return payload.records;
    }

    if (Array.isArray(payload?.data?.records)) {
        return payload.data.records;
    }

    if (Array.isArray(payload)) {
        return payload;
    }

    return [];
};

const normalizeServiceType = (value) => {
    const normalized =
        String(value ?? "")
            .trim()
            .replace(/^com\.victronenergy\./i, "");

    return normalized || null;
};

const normalizeDeviceInstance = (value) => {
    const numeric =
        Number(value);

    return Number.isInteger(numeric)
        ? numeric
        : null;
};

const normalizeDbusPath = (value) => {
    const normalized =
        String(value ?? "").trim();

    if (!normalized) {
        return null;
    }

    return normalized.startsWith("/")
        ? normalized
        : `/${normalized}`;
};

const mappingIdentity = (mapping) =>
    [
        mapping.serviceType,
        mapping.deviceInstance,
        mapping.dbusPath,
    ].join(":");

const qualifyLiveSiteMappings =
    async (vrmSiteId) => {
        const normalizedSiteId =
            normalizeSiteId(vrmSiteId);

        /*
         * VRM diagnostics are used only
         * as topology/evidence input.
         *
         * No topology is inferred when
         * the required tuple is absent.
         */
        const response =
            await vrmApiClient.get(
                `/installations/${normalizedSiteId}/diagnostics`,
                {
                    params: {
                        count: 1000,
                    },
                }
            );

        const records =
            extractRecords(response.data);

        const approvedByIdentity =
            new Map();

        for (const record of records) {
            const serviceType =
                normalizeServiceType(
                    record.dbusServiceType ??
                    record.serviceType
                );

            const deviceInstance =
                normalizeDeviceInstance(
                    record.instance ??
                    record.deviceInstance
                );

            const dbusPath =
                normalizeDbusPath(
                    record.dbusPath ??
                    record.path
                );

            if (
                !serviceType ||
                deviceInstance === null ||
                !dbusPath
            ) {
                continue;
            }

            const mapping =
                findLiveTelemetryMapping({
                    serviceType,
                    deviceInstance,
                    dbusPath,
                });

            if (!mapping) {
                continue;
            }

            approvedByIdentity.set(
                mappingIdentity(mapping),
                mapping
            );
        }

        const approvedMappings =
            Object.freeze(
                Array.from(
                    approvedByIdentity.values()
                )
            );

        return Object.freeze({
            vrmSiteId:
                normalizedSiteId,

            diagnosticsRecordCount:
                records.length,

            approvedMappingCount:
                approvedMappings.length,

            approvedMappings,
        });
    };

export {
    qualifyLiveSiteMappings,
};