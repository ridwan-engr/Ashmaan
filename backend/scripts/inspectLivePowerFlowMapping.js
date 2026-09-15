import "dotenv/config";

import {
    getInstallationTelemetry,
} from "../services/vrm/telemetryService.js";

const SITE_ID = 18053;

const ALLOWED_ATTRIBUTE_IDS =
    new Set([
        471,

        137,
        138,
        139,

        426,
        427,
        428,
        431,

        432,
        433,
        434,

        436,
        437,
        438,

        14,
        15,
        16,

        20,
        21,
        22,

        23,
        24,
        25,

        29,
        30,
        31,

        131,
        132,
        133,

        567,
        568,
        569,

        39,
    ]);

const response =
    await getInstallationTelemetry(
        SITE_ID,
        {
            count: 1000,
        }
    );

const records =
    Array.isArray(response?.records)
        ? response.records
        : Array.isArray(
            response?.data?.records
        )
            ? response.data.records
            : Array.isArray(response)
                ? response
                : [];

const matches =
    records
        .filter(
            (record) =>
                ALLOWED_ATTRIBUTE_IDS.has(
                    Number(
                        record.idDataAttribute
                    )
                )
        )
        .sort(
            (a, b) =>
                Number(
                    a.idDataAttribute
                ) -
                Number(
                    b.idDataAttribute
                )
        );

console.log(
    "=============================================="
);

console.log(
    "ASHMAAN LIVE POWER-FLOW MQTT MAPPING"
);

console.log(
    "=============================================="
);

console.log(
    "Site:",
    SITE_ID
);

console.log(
    "Allowed attributes:",
    ALLOWED_ATTRIBUTE_IDS.size
);

console.log(
    "Observed mappings:",
    matches.length
);

console.log("");

for (
    const record of matches
) {
    console.log(
        JSON.stringify(
            {
                idDataAttribute:
                    record.idDataAttribute,

                description:
                    record.description,

                Device:
                    record.Device,

                instance:
                    record.instance,

                dbusServiceType:
                    record.dbusServiceType,

                dbusPath:
                    record.dbusPath,

                code:
                    record.code,

                formatWithUnit:
                    record.formatWithUnit,

                rawValue:
                    record.rawValue,

                formattedValue:
                    record.formattedValue,
            },
            null,
            2
        )
    );
}