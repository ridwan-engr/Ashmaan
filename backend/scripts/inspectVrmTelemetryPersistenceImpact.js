import dns from "node:dns";

import {
    getInstallationTelemetry,
} from "../services/vrm/telemetryService.js";

import {
    getRecordVrmAttributeId,
    isHistoricalTelemetryAllowed,
} from "../services/sync/telemetryPersistencePolicy.js";


/*
|--------------------------------------------------------------------------
| DNS
|--------------------------------------------------------------------------
|
| Required in the current local environment because Node/c-ares SRV
| resolution previously failed while the Windows resolver succeeded.
|
*/

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);


const VRM_SITE_ID =
    "18053";

const REQUESTED_COUNT =
    200;


const extractRecords = (
    response
) => {
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
        Array.isArray(response)
    ) {
        return response;
    }

    return [];
};


const toValidTimestamp = (
    value
) => {
    const numeric =
        Number(value);

    if (
        !Number.isFinite(
            numeric
        ) ||
        numeric <= 0
    ) {
        return null;
    }

    const date =
        new Date(
            numeric * 1000
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
};


const main = async () => {
    console.log(`
==================================================
ASHMAAN VRM TELEMETRY PERSISTENCE IMPACT
READ-ONLY — NO DATABASE CONNECTION OR MODIFICATION
==================================================
`);

    console.log(
        `VRM site       : ${VRM_SITE_ID}`
    );

    console.log(
        `Requested count: ${REQUESTED_COUNT}`
    );

    console.log(
        "\nFetching VRM diagnostics..."
    );


    const startedAt =
        Date.now();

    const response =
        await getInstallationTelemetry(
            VRM_SITE_ID,
            {
                count:
                    REQUESTED_COUNT,
            }
        );

    const fetchMs =
        Date.now() -
        startedAt;

    const records =
        extractRecords(
            response
        );


    /*
    |--------------------------------------------------------------------------
    | Classify records
    |--------------------------------------------------------------------------
    */

    const allowed = [];

    const rejected = [];

    const missingAttributeId = [];

    const malformedTimestamp = [];


    for (
        const record
        of records
    ) {
        const vrmAttributeId =
            getRecordVrmAttributeId(
                record
            );

        if (
            vrmAttributeId ===
            null
        ) {
            missingAttributeId.push(
                record
            );

            rejected.push(
                record
            );

            continue;
        }

        if (
            !toValidTimestamp(
                record.timestamp
            )
        ) {
            malformedTimestamp.push(
                record
            );
        }

        if (
            isHistoricalTelemetryAllowed(
                record
            )
        ) {
            allowed.push(
                record
            );
        } else {
            rejected.push(
                record
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Timestamp range
    |--------------------------------------------------------------------------
    */

    const validTimestamps =
        records
            .map(
                (record) =>
                    toValidTimestamp(
                        record.timestamp
                    )
            )
            .filter(Boolean);


    validTimestamps.sort(
        (a, b) =>
            a.getTime() -
            b.getTime()
    );


    const oldest =
        validTimestamps.length
            ? validTimestamps[0]
            : null;

    const newest =
        validTimestamps.length
            ? validTimestamps[
                validTimestamps.length -
                1
            ]
            : null;


    /*
    |--------------------------------------------------------------------------
    | Attribute aggregation
    |--------------------------------------------------------------------------
    */

    const attributeMap =
        new Map();


    for (
        const record
        of records
    ) {
        const vrmAttributeId =
            getRecordVrmAttributeId(
                record
            );

        const key =
            vrmAttributeId === null
                ? "INVALID"
                : String(
                    vrmAttributeId
                );

        if (
            !attributeMap.has(
                key
            )
        ) {
            attributeMap.set(
                key,
                {
                    vrmAttributeId:
                        vrmAttributeId ??
                        "INVALID",

                    parameter:
                        record.description ??
                        record.code ??
                        null,

                    records:
                        0,

                    allowed:
                        vrmAttributeId !==
                            null &&
                        isHistoricalTelemetryAllowed(
                            record
                        ),
                }
            );
        }

        attributeMap.get(
            key
        ).records += 1;
    }


    const attributes =
        [
            ...attributeMap.values(),
        ].sort(
            (a, b) =>
                b.records -
                a.records
        );


    /*
    |--------------------------------------------------------------------------
    | Device aggregation
    |--------------------------------------------------------------------------
    */

    const deviceMap =
        new Map();


    for (
        const record
        of records
    ) {
        const deviceType =
            String(
                record.Device ??
                "UNKNOWN"
            );

        const current =
            deviceMap.get(
                deviceType
            ) ?? {
                deviceType,
                received:
                    0,
                allowed:
                    0,
                rejected:
                    0,
            };

        current.received +=
            1;

        if (
            isHistoricalTelemetryAllowed(
                record
            )
        ) {
            current.allowed +=
                1;
        } else {
            current.rejected +=
                1;
        }

        deviceMap.set(
            deviceType,
            current
        );
    }


    const devices =
        [
            ...deviceMap.values(),
        ].sort(
            (a, b) =>
                b.received -
                a.received
        );


    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    const rejectionPercent =
        records.length > 0
            ? (
                (
                    rejected.length /
                    records.length
                ) *
                100
            ).toFixed(2)
            : "0.00";

    const allowedPercent =
        records.length > 0
            ? (
                (
                    allowed.length /
                    records.length
                ) *
                100
            ).toFixed(2)
            : "0.00";


    console.log(`
==================================================
VRM RESPONSE SUMMARY
==================================================
`);

    console.table([
        {
            site:
                VRM_SITE_ID,

            requestedCount:
                REQUESTED_COUNT,

            received:
                records.length,

            allowed:
                allowed.length,

            rejected:
                rejected.length,

            allowedPercent:
                `${allowedPercent}%`,

            rejectedPercent:
                `${rejectionPercent}%`,

            missingAttributeId:
                missingAttributeId.length,

            malformedTimestamp:
                malformedTimestamp.length,

            uniqueAttributes:
                attributeMap.size,

            fetchMs,
        },
    ]);


    console.log(
        "\nVRM TELEMETRY TIME RANGE"
    );

    console.table([
        {
            oldest:
                oldest
                    ?.toISOString() ??
                null,

            newest:
                newest
                    ?.toISOString() ??
                null,

            spanMinutes:
                oldest &&
                newest
                    ? (
                        (
                            newest.getTime() -
                            oldest.getTime()
                        ) /
                        60000
                    ).toFixed(2)
                    : null,
        },
    ]);


    console.log(
        "\nATTRIBUTES RETURNED BY VRM"
    );

    console.table(
        attributes
    );


    console.log(
        "\nDEVICE-TYPE IMPACT"
    );

    console.table(
        devices
    );


    console.log(`
==================================================
INTERPRETATION DATA
==================================================

Requested count : ${REQUESTED_COUNT}
Actually received: ${records.length}

Policy permits  : ${allowed.length}
Policy rejects  : ${rejected.length}

Persistence reduction for this response:
${rejectionPercent}%

IMPORTANT:
This script fetched VRM diagnostics only.
It did NOT connect to MongoDB.
It did NOT write Telemetry.
It did NOT modify SyncState.
It did NOT modify Installation.
==================================================
`);
};


main()
    .catch(
        (error) => {
            console.error(
                "\nINSPECTION FAILED:",
                error
            );

            process.exitCode =
                1;
        }
    );