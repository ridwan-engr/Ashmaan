import "dotenv/config";

import env from "../config/env.js";
import vrmApiClient
    from "../services/vrm/apiClient.js";

const SITE_ID =
    process.env.LIVE_VRM_SITE_ID ||
    "18053";

if (!env.vrm.userId) {
    throw new Error(
        "VRM_USER_ID is required."
    );
}

const response =
    await vrmApiClient.get(
        `/installations/${SITE_ID}/diagnostics`,
        {
            params: {
                count: 1000,
            },
        }
    );

console.log(
    "=============================================="
);

console.log(
    "L.3F DIAGNOSTICS STRUCTURE INSPECTION"
);

console.log(
    "=============================================="
);

console.log(
    "Response type:",
    Array.isArray(response)
        ? "ARRAY"
        : typeof response
);

console.log(
    "Top-level keys:",
    response &&
    typeof response === "object" &&
    !Array.isArray(response)
        ? Object.keys(response)
        : []
);

console.log(
    "response.data type:",
    Array.isArray(response?.data)
        ? "ARRAY"
        : typeof response?.data
);

console.log(
    "response.data keys:",
    response?.data &&
    typeof response.data === "object" &&
    !Array.isArray(response.data)
        ? Object.keys(response.data)
        : []
);

const candidates = [
    {
        name: "response",
        value: response,
    },
    {
        name: "response.records",
        value: response?.records,
    },
    {
        name: "response.data",
        value: response?.data,
    },
    {
        name: "response.data.records",
        value:
            response?.data?.records,
    },
];

console.log("");

for (const candidate of candidates) {
    console.log(
        `${candidate.name}:`,
        Array.isArray(candidate.value)
            ? `ARRAY(${candidate.value.length})`
            : typeof candidate.value
    );
}

const records =
    candidates.find(
        (candidate) =>
            Array.isArray(
                candidate.value
            )
    )?.value || [];

console.log("");
console.log(
    "Selected record count:",
    records.length
);

if (records.length === 0) {
    throw new Error(
        "No diagnostics array was located."
    );
}

/*
 * Find known attribute 137 first.
 * It is proven for site 18053.
 */
const known =
    records.find(
        (record) =>
            Number(
                record?.idDataAttribute ??
                record?.vrmAttributeId ??
                record?.attributeId ??
                record?.id
            ) === 137
    );

console.log("");
console.log(
    "Known attribute 137 found:",
    Boolean(known)
);

if (known) {
    console.log(
        "Attribute 137 keys:"
    );

    console.log(
        Object.keys(known)
    );

    console.log("");

    /*
     * Print structural metadata only.
     * Do not dump the entire diagnostics
     * response because it can contain
     * unrelated network/configuration data.
     */
    console.log(
        JSON.stringify(
            {
                idDataAttribute:
                    known.idDataAttribute,

                vrmAttributeId:
                    known.vrmAttributeId,

                attributeId:
                    known.attributeId,

                id:
                    known.id,

                instance:
                    known.instance,

                deviceInstance:
                    known.deviceInstance,

                dbusServiceType:
                    known.dbusServiceType,

                serviceType:
                    known.serviceType,

                dbusPath:
                    known.dbusPath,

                path:
                    known.path,

                code:
                    known.code,

                description:
                    known.description,

                unit:
                    known.unit,
            },
            null,
            2
        )
    );
}

/*
 * Also locate records based on the
 * structural fields currently assumed
 * by L.3F.
 */
const structuralRecord =
    records.find(
        (record) =>
            record?.dbusServiceType ||
            record?.serviceType ||
            record?.dbusPath ||
            record?.path ||
            record?.instance !==
                undefined ||
            record?.deviceInstance !==
                undefined
    );

console.log("");
console.log(
    "Record with structural metadata found:",
    Boolean(structuralRecord)
);

if (structuralRecord) {
    console.log(
        "Structural record keys:"
    );

    console.log(
        Object.keys(
            structuralRecord
        )
    );

    console.log("");

    console.log(
        JSON.stringify(
            {
                idDataAttribute:
                    structuralRecord
                        .idDataAttribute,

                vrmAttributeId:
                    structuralRecord
                        .vrmAttributeId,

                instance:
                    structuralRecord
                        .instance,

                deviceInstance:
                    structuralRecord
                        .deviceInstance,

                dbusServiceType:
                    structuralRecord
                        .dbusServiceType,

                serviceType:
                    structuralRecord
                        .serviceType,

                dbusPath:
                    structuralRecord
                        .dbusPath,

                path:
                    structuralRecord
                        .path,

                code:
                    structuralRecord
                        .code,

                description:
                    structuralRecord
                        .description,

                unit:
                    structuralRecord
                        .unit,
            },
            null,
            2
        )
    );
}

console.log("");
console.log(
    "=============================================="
);

console.log(
    "L.3F DIAGNOSTICS STRUCTURE INSPECTION COMPLETE"
);