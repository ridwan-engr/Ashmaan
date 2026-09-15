const LIVE_TELEMETRY_MAPPINGS = Object.freeze([
    {
        vrmAttributeId: 14,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/ActiveIn/L1/F",
        unit: "Hz",
    },
    {
        vrmAttributeId: 15,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/ActiveIn/L2/F",
        unit: "Hz",
    },
    {
        vrmAttributeId: 16,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/ActiveIn/L3/F",
        unit: "Hz",
    },

    {
        vrmAttributeId: 20,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/Out/L1/V",
        unit: "V",
    },
    {
        vrmAttributeId: 21,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/Out/L2/V",
        unit: "V",
    },
    {
        vrmAttributeId: 22,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/Out/L3/V",
        unit: "V",
    },

    {
        vrmAttributeId: 23,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/Out/L1/I",
        unit: "A",
    },
    {
        vrmAttributeId: 24,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/Out/L2/I",
        unit: "A",
    },
    {
        vrmAttributeId: 25,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/Out/L3/I",
        unit: "A",
    },

    {
        vrmAttributeId: 29,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/Out/L1/P",
        unit: "W",
    },
    {
        vrmAttributeId: 30,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/Out/L2/P",
        unit: "W",
    },
    {
        vrmAttributeId: 31,
        serviceType: "vebus",
        deviceInstance: 0,
        dbusPath: "/Ac/Out/L3/P",
        unit: "W",
    },

    {
        vrmAttributeId: 131,
        serviceType: "system",
        deviceInstance: 0,
        dbusPath: "/Ac/Consumption/L1/Power",
        unit: "W",
    },
    {
        vrmAttributeId: 132,
        serviceType: "system",
        deviceInstance: 0,
        dbusPath: "/Ac/Consumption/L2/Power",
        unit: "W",
    },
    {
        vrmAttributeId: 133,
        serviceType: "system",
        deviceInstance: 0,
        dbusPath: "/Ac/Consumption/L3/Power",
        unit: "W",
    },

    {
        vrmAttributeId: 137,
        serviceType: "system",
        deviceInstance: 0,
        dbusPath: "/Ac/Genset/L1/Power",
        unit: "W",
    },
    {
        vrmAttributeId: 138,
        serviceType: "system",
        deviceInstance: 0,
        dbusPath: "/Ac/Genset/L2/Power",
        unit: "W",
    },
    {
        vrmAttributeId: 139,
        serviceType: "system",
        deviceInstance: 0,
        dbusPath: "/Ac/Genset/L3/Power",
        unit: "W",
    },

    {
        vrmAttributeId: 426,
        serviceType: "genset",
        deviceInstance: 40,
        dbusPath: "/Ac/L1/Voltage",
        unit: "V",
    },
    {
        vrmAttributeId: 427,
        serviceType: "genset",
        deviceInstance: 40,
        dbusPath: "/Ac/L1/Current",
        unit: "A",
    },
    {
        vrmAttributeId: 428,
        serviceType: "genset",
        deviceInstance: 40,
        dbusPath: "/Ac/L1/Power",
        unit: "W",
    },
    {
        vrmAttributeId: 431,
        serviceType: "genset",
        deviceInstance: 40,
        dbusPath: "/Ac/L1/Frequency",
        unit: "Hz",
    },

    {
        vrmAttributeId: 432,
        serviceType: "genset",
        deviceInstance: 40,
        dbusPath: "/Ac/L2/Voltage",
        unit: "V",
    },
    {
        vrmAttributeId: 433,
        serviceType: "genset",
        deviceInstance: 40,
        dbusPath: "/Ac/L2/Current",
        unit: "A",
    },
    {
        vrmAttributeId: 434,
        serviceType: "genset",
        deviceInstance: 40,
        dbusPath: "/Ac/L2/Power",
        unit: "W",
    },

    {
        vrmAttributeId: 436,
        serviceType: "genset",
        deviceInstance: 40,
        dbusPath: "/Ac/L3/Voltage",
        unit: "V",
    },
    {
        vrmAttributeId: 437,
        serviceType: "genset",
        deviceInstance: 40,
        dbusPath: "/Ac/L3/Current",
        unit: "A",
    },
    {
        vrmAttributeId: 438,
        serviceType: "genset",
        deviceInstance: 40,
        dbusPath: "/Ac/L3/Power",
        unit: "W",
    },
]);

const mappingKey = (
    serviceType,
    deviceInstance,
    dbusPath
) =>
    `${serviceType}:${deviceInstance}:${dbusPath}`;

const LIVE_TELEMETRY_MAPPING_BY_TOPIC =
    new Map(
        LIVE_TELEMETRY_MAPPINGS.map(
            (mapping) => [
                mappingKey(
                    mapping.serviceType,
                    mapping.deviceInstance,
                    mapping.dbusPath
                ),
                Object.freeze({
                    ...mapping,
                }),
            ]
        )
    );

const findLiveTelemetryMapping = ({
    serviceType,
    deviceInstance,
    dbusPath,
}) =>
    LIVE_TELEMETRY_MAPPING_BY_TOPIC.get(
        mappingKey(
            serviceType,
            deviceInstance,
            dbusPath
        )
    ) ?? null;

export {
    LIVE_TELEMETRY_MAPPINGS,
    findLiveTelemetryMapping,
};
