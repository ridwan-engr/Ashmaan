import {
    Device,
    Installation,
} from "../../models/index.js";

import {
    getInstallationDevices,
} from "../vrm/deviceService.js";


const extractRecords = (response) => {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.records)) {
        return response.records;
    }

    if (Array.isArray(response?.data?.records)) {
        return response.data.records;
    }

    return [];
};


const buildDeviceKey = (record) => {
    const deviceType =
        record?.Device !== undefined &&
            record?.Device !== null
            ? String(record.Device)
            : null;

    const instance =
        record?.instance !== undefined &&
            record?.instance !== null
            ? String(record.instance)
            : null;

    if (!deviceType || instance === null) {
        return null;
    }

    return {
        key: `${deviceType}:${instance}`,

        deviceType,

        deviceInstance: instance,
    };
};


const extractDeviceMetadata = (
    records
) => {
    const metadata = {
        productName: null,
        productId: null,
        firmwareVersion: null,
        serialNumber: null,
    };

    for (const record of records) {
        const description =
            String(
                record?.description || ""
            )
                .trim()
                .toLowerCase();

        const value =
            record?.rawValue ??
            record?.formattedValue ??
            null;

        if (value === null) {
            continue;
        }

        if (
            description === "machinename" ||
            description === "machine name"
        ) {
            metadata.productName =
                String(value);
        }

        if (
            description === "productid" ||
            description === "product id"
        ) {
            metadata.productId =
                String(value);
        }

        if (
            description === "fw version" ||
            description === "firmware version"
        ) {
            metadata.firmwareVersion =
                String(value);
        }

        if (
            description ===
            "machine serial number" ||
            description ===
            "serial number"
        ) {
            metadata.serialNumber =
                String(value);
        }
    }

    return metadata;
};


const groupDeviceRecords = (
    records
) => {
    const groups = new Map();

    for (const record of records) {
        const identity =
            buildDeviceKey(record);

        if (!identity) {
            continue;
        }

        if (
            !groups.has(identity.key)
        ) {
            groups.set(
                identity.key,
                {
                    identity,
                    records: [],
                }
            );
        }

        groups
            .get(identity.key)
            .records.push(record);
    }

    return groups;
};


const normalizeDeviceGroup = (
    installation,
    group
) => {
    const {
        identity,
        records,
    } = group;

    const metadata =
        extractDeviceMetadata(records);

    let latestTimestamp = null;

    for (const record of records) {
        const timestamp =
            Number(record?.timestamp);

        if (
            Number.isFinite(timestamp) &&
            timestamp > 0
        ) {
            if (
                latestTimestamp === null ||
                timestamp > latestTimestamp
            ) {
                latestTimestamp =
                    timestamp;
            }
        }
    }

    return {
        installation:
            installation._id,

        site:
            installation.site ||
            undefined,

        /*
         * Do not populate vrmDeviceId from
         * diagnostics row `id`.
         *
         * That `id` identifies the diagnostic
         * row/attribute, not the physical device.
         */
        vrmDeviceId: null,

        deviceInstance:
            identity.deviceInstance,

        name:
            metadata.productName ||
            `${identity.deviceType} ${identity.deviceInstance}`,

        productName:
            metadata.productName,

        productId:
            metadata.productId,

        deviceType:
            identity.deviceType,

        firmwareVersion:
            metadata.firmwareVersion,

        serialNumber:
            metadata.serialNumber,

        status: "UNKNOWN",

        lastSeenAt:
            latestTimestamp
                ? new Date(
                    latestTimestamp * 1000
                )
                : null,

        source: "VRM",

        /*
         * Preserve all diagnostic rows associated
         * with this device during discovery.
         */
        raw: {
            diagnosticRecordCount:
                records.length,

            discoveryAttributes:
                records,
        },
    };
};


const syncDevicesForInstallation =
    async (installation) => {

        const startedAt =
            Date.now();

        const fetchStartedAt =
            Date.now();

        const response =
            await getInstallationDevices(
                installation.vrmSiteId,
                {
                    count: 200,
                }
            );

        const vrmFetchMs =
            Date.now() -
            fetchStartedAt;

        const records =
            extractRecords(response);

        const groups =
            groupDeviceRecords(records);

        const operations = [];

        for (
            const group
            of groups.values()
        ) {
            const normalized =
                normalizeDeviceGroup(
                    installation,
                    group
                );
            const setFields = {
                installation:
                    normalized.installation,

                deviceInstance:
                    normalized.deviceInstance,

                name:
                    normalized.name,

                deviceType:
                    normalized.deviceType,

                status:
                    normalized.status,

                source:
                    normalized.source,

                raw:
                    normalized.raw,
            };

            if (normalized.site) {
                setFields.site =
                    normalized.site;
            }

            if (
                normalized.vrmDeviceId !== null &&
                normalized.vrmDeviceId !== undefined
            ) {
                setFields.vrmDeviceId =
                    normalized.vrmDeviceId;
            }

            if (normalized.productName) {
                setFields.productName =
                    normalized.productName;
            }

            if (normalized.productId) {
                setFields.productId =
                    normalized.productId;
            }

            if (normalized.firmwareVersion) {
                setFields.firmwareVersion =
                    normalized.firmwareVersion;
            }

            if (normalized.serialNumber) {
                setFields.serialNumber =
                    normalized.serialNumber;
            }

            if (normalized.lastSeenAt) {
                setFields.lastSeenAt =
                    normalized.lastSeenAt;
            }

            operations.push({
                updateOne: {
                    filter: {
                        installation:
                            installation._id,

                        deviceType:
                            normalized.deviceType,

                        deviceInstance:
                            normalized.deviceInstance,
                    },

                    update: {
                        $set:
                            setFields,
                    },

                    upsert: true,
                },
            });

        }

        let databaseResult = null;

        let databaseMs = 0;

        if (operations.length > 0) {
            const dbStartedAt =
                Date.now();

            databaseResult =
                await Device.bulkWrite(
                    operations,
                    {
                        ordered: false,
                    }
                );

            databaseMs =
                Date.now() -
                dbStartedAt;
        }

        return {
            installationId:
                installation._id.toString(),

            vrmSiteId:
                installation.vrmSiteId,

            received:
                records.length,

            discovered:
                groups.size,

            created:
                databaseResult?.upsertedCount ||
                0,

            matched:
                databaseResult?.matchedCount ||
                0,

            updated:
                databaseResult?.modifiedCount ||
                0,

            skipped:
                records.length -
                groups.size,

            failed: 0,

            performance: {
                vrmFetchMs,

                databaseMs,

                totalMs:
                    Date.now() -
                    startedAt,
            },

            errors: [],
        };
    };


const syncDevices = async () => {
    const installations =
        await Installation.find({
            source: "VRM",
        });

    const result = {
        installations:
            installations.length,

        processedInstallations: 0,

        receivedRecords: 0,

        discovered: 0,

        created: 0,

        matched: 0,

        updated: 0,

        skipped: 0,

        failed: 0,

        errors: [],
    };

    for (
        const [index, installation]
        of installations.entries()
    ) {
        try {
            console.log(
                `[Device Sync ${index + 1}/${installations.length}] ` +
                `${installation.name} ` +
                `(${installation.vrmSiteId})`
            );

            const syncResult =
                await syncDevicesForInstallation(
                    installation
                );

            result.processedInstallations +=
                1;

            result.receivedRecords +=
                syncResult.received;

            result.discovered +=
                syncResult.discovered;

            result.created +=
                syncResult.created;

            result.matched +=
                syncResult.matched;

            result.updated +=
                syncResult.updated;

            result.skipped +=
                syncResult.skipped;

            console.log(
                `  Records: ${syncResult.received} | ` +
                `Devices: ${syncResult.discovered} | ` +
                `Created: ${syncResult.created} | ` +
                `Updated: ${syncResult.updated}`
            );

            console.log(
                `  VRM: ${syncResult.performance.vrmFetchMs} ms | ` +
                `DB: ${syncResult.performance.databaseMs} ms | ` +
                `Total: ${syncResult.performance.totalMs} ms`
            );
        } catch (error) {
            result.failed += 1;

            result.errors.push({
                vrmSiteId:
                    installation.vrmSiteId,

                message:
                    error.message,
            });

            console.error(
                `[Device Sync ${index + 1}/${installations.length}] FAILED: ` +
                error.message
            );
        }
    }

    return result;
};


export {
    syncDevices,
    syncDevicesForInstallation,
};