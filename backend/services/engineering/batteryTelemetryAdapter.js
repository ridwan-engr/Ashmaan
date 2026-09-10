// services/engineering/batteryTelemetryAdapter.js

import {
    Installation,
    Telemetry,
} from "../../models/index.js";

import {
    calculateBatteryAnalytics,
} from "./batteryAnalyticsService.js";

import {
    BATTERY_ATTRIBUTE_MAP,
    isBatteryAttributeCalculationEnabled,
} from "./batteryAttributeMap.js";


/*
|--------------------------------------------------------------------------
| Phase 8.4D
| Production Battery Telemetry Adapter
|--------------------------------------------------------------------------
|
| READ ONLY.
|
| Connects:
|
| MongoDB Telemetry
|       ↓
| qualified battery attributes
|       ↓
| Phase 8.4C pure battery analytics engine
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Profile attributes consumed by Phase 8.4C
|--------------------------------------------------------------------------
|
| SOC
|   51   Battery Monitor SOC
|   144  System overview SOC fallback
|   39   VE.Bus SOC fallback
|
| Voltage
|   47
|
| Current
|   49
|
| Temperature
|   115
|   1035 fallback
|
| Signed battery power
|   243
|
|--------------------------------------------------------------------------
*/

export const BATTERY_PROFILE_ATTRIBUTE_IDS =
    Object.freeze([
        39,
        47,
        49,
        51,
        115,
        144,
        243,
        1035,
    ]);


/*
|--------------------------------------------------------------------------
| All calculation-enabled battery attributes
|--------------------------------------------------------------------------
|
| This broader set is retained for later:
|
| 8.4F operating windows
| 8.4G cycle / throughput
| 8.4H availability
|
|--------------------------------------------------------------------------
*/

export const BATTERY_PRODUCTION_ATTRIBUTE_IDS =
    Object.freeze(
        Object
            .values(
                BATTERY_ATTRIBUTE_MAP
            )
            .filter(
                (
                    definition
                ) =>
                    definition
                        .calculationEnabled ===
                    true
            )
            .map(
                (
                    definition
                ) =>
                    Number(
                        definition
                            .attributeId
                    )
            )
            .filter(
                Number.isFinite
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a -
                    b
            )
    );


/*
|--------------------------------------------------------------------------
| Adapter boundaries
|--------------------------------------------------------------------------
*/

export const BATTERY_TELEMETRY_ADAPTER_BOUNDARIES =
    Object.freeze({

        READ_ONLY:
            true,

        SYNTHETIC_VALUES_ALLOWED:
            false,

        MISSING_TELEMETRY_MEANS_ZERO:
            false,

        TOP_LEVEL_TELEMETRY_FIELDS:
            true,

        SIGNED_POWER_DIRECTION_ESTABLISHED:
            false,

        SIGNED_CURRENT_DIRECTION_ESTABLISHED:
            false,

        MULTIPLE_DEVICES_AUTOMATICALLY_COMBINED:
            false,

        ALARMS_INCLUDED_IN_PROFILE_ENGINE:
            false,

        ENERGY_COUNTERS_INCLUDED_IN_PROFILE_ENGINE:
            false,

        CYCLE_COUNTERS_INCLUDED_IN_PROFILE_ENGINE:
            false,

        SOH_INCLUDED_IN_PROFILE_ENGINE:
            false,

        CAPACITY_INCLUDED_IN_PROFILE_ENGINE:
            false,

        REPORTING_WINDOW_SEMANTICS:
            "[start,end)",
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function asDate(
    value
) {

    if (!value) {
        return null;
    }


    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function normalizeSiteId(
    value
) {

    const normalized =
        String(
            value ??
            ""
        ).trim();


    return normalized ||
        null;
}


function buildWindow(
    start,
    end
) {

    const startDate =
        asDate(
            start
        );

    const endDate =
        asDate(
            end
        );


    if (
        !startDate ||
        !endDate ||
        endDate <=
            startDate
    ) {

        throw new Error(
            "A valid [start,end) battery reporting window is required."
        );
    }


    return {

        start:
            startDate,

        end:
            endDate,

        semantics:
            "[start,end)",
    };
}


/*
|--------------------------------------------------------------------------
| Semantic-map safety check
|--------------------------------------------------------------------------
*/

export function validateBatteryProfileAttributeSet() {

    for (
        const attributeId
        of BATTERY_PROFILE_ATTRIBUTE_IDS
    ) {

        if (
            !isBatteryAttributeCalculationEnabled(
                attributeId
            )
        ) {

            throw new Error(
                `Battery profile attribute ${attributeId} is not calculation-enabled.`
            );
        }
    }


    /*
     * Explicitly prohibit later-phase attributes from entering 8.4C.
     */

    const forbiddenProfileIds =
        [
            58,   // charge cycles
            59,   // full discharges
            244,  // discharged cumulative energy
            245,  // charged cumulative energy
            273,  // SOH
            338,  // discharged energy delta
            339,  // charged energy delta
            413,  // capacity
        ];


    for (
        const attributeId
        of forbiddenProfileIds
    ) {

        if (
            BATTERY_PROFILE_ATTRIBUTE_IDS
                .includes(
                    attributeId
                )
        ) {

            throw new Error(
                `Later-phase battery attribute ${attributeId} leaked into the Phase 8.4C profile set.`
            );
        }
    }


    return true;
}


/*
|--------------------------------------------------------------------------
| Resolve installation
|--------------------------------------------------------------------------
*/

export async function resolveBatteryInstallation(
    vrmSiteId
) {

    const normalizedId =
        normalizeSiteId(
            vrmSiteId
        );


    if (!normalizedId) {

        throw new Error(
            "vrmSiteId is required."
        );
    }


    return Installation
        .findOne({
            vrmSiteId:
                normalizedId,
        })
        .select({

            _id:
                1,

            vrmSiteId:
                1,

            name:
                1,

            status:
                1,

            syncEnabled:
                1,

            lastSeenAt:
                1,

            lastSyncAt:
                1,
        })
        .lean();
}


/*
|--------------------------------------------------------------------------
| Latest battery profile telemetry
|--------------------------------------------------------------------------
*/

export async function findLatestBatteryTelemetry(
    installation
) {

    if (
        !installation
            ?._id
    ) {

        throw new Error(
            "Installation is required."
        );
    }


    return Telemetry
        .findOne({

            installation:
                installation
                    ._id,

            vrmAttributeId: {
                $in:
                    BATTERY_PROFILE_ATTRIBUTE_IDS,
            },

            timestamp: {
                $type:
                    "date",
            },
        })
        .select({

            _id:
                1,

            installation:
                1,

            vrmAttributeId:
                1,

            timestamp:
                1,

            numericValue:
                1,

            value:
                1,

            deviceType:
                1,

            deviceInstance:
                1,

            parameter:
                1,

            description:
                1,

            code:
                1,

            unit:
                1,
        })
        .sort({
            timestamp:
                -1,
        })
        .lean();
}


/*
|--------------------------------------------------------------------------
| Read production battery profile telemetry
|--------------------------------------------------------------------------
*/

export async function getBatteryTelemetryForInstallation({
    installation,
    start,
    end,
} = {}) {

    if (
        !installation
            ?._id
    ) {

        throw new Error(
            "Installation is required."
        );
    }


    const reportingWindow =
        buildWindow(
            start,
            end
        );


    const records =
        await Telemetry
            .find({

                installation:
                    installation
                        ._id,

                vrmAttributeId: {
                    $in:
                        BATTERY_PROFILE_ATTRIBUTE_IDS,
                },

                timestamp: {
                    $gte:
                        reportingWindow
                            .start,

                    $lt:
                        reportingWindow
                            .end,
                },
            })
            .select({

                _id:
                    1,

                installation:
                    1,

                vrmAttributeId:
                    1,

                timestamp:
                    1,

                numericValue:
                    1,

                value:
                    1,

                quality:
                    1,

                deviceType:
                    1,

                deviceInstance:
                    1,

                parameter:
                    1,

                description:
                    1,

                code:
                    1,

                unit:
                    1,
            })
            .sort({
                timestamp:
                    1,
            })
            .lean();


    /*
    |--------------------------------------------------------------------------
    | Evidence inventory
    |--------------------------------------------------------------------------
    */

    const attributeCounts =
        {};


    const deviceSets =
        {};


    for (
        const record
        of records
    ) {

        const attributeId =
            Number(
                record
                    .vrmAttributeId
            );


        if (
            !Number.isFinite(
                attributeId
            )
        ) {

            continue;
        }


        attributeCounts[
            attributeId
        ] =
            (
                attributeCounts[
                    attributeId
                ] ??
                0
            ) +
            1;


        if (
            !deviceSets[
                attributeId
            ]
        ) {

            deviceSets[
                attributeId
            ] =
                new Set();
        }


        deviceSets[
            attributeId
        ].add(
            String(
                record
                    .deviceInstance ??
                "UNKNOWN"
            )
        );
    }


    const deviceInstancesByAttribute =
        Object.fromEntries(
            Object.entries(
                deviceSets
            )
                .map(
                    (
                        [
                            attributeId,
                            set,
                        ]
                    ) => [
                        attributeId,

                        Array.from(
                            set
                        )
                            .sort(),
                    ]
                )
        );


    return {

        records,

        evidence: {

            recordCount:
                records.length,

            observedAttributeIds:
                Object.keys(
                    attributeCounts
                )
                    .map(
                        Number
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a -
                            b
                    ),

            attributeCounts,

            deviceInstancesByAttribute,

            reportingWindow,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Production battery analytics
|--------------------------------------------------------------------------
*/

export async function getProductionBatteryAnalytics({
    vrmSiteId,
    start,
    end,
    deviceSelection = {},
    config = {},
} = {}) {

    validateBatteryProfileAttributeSet();


    const installation =
        await resolveBatteryInstallation(
            vrmSiteId
        );


    if (!installation) {

        return {

            installation:
                null,

            telemetry:
                null,

            analytics:
                null,

            reason:
                "INSTALLATION_NOT_FOUND",

            boundaries:
                BATTERY_TELEMETRY_ADAPTER_BOUNDARIES,
        };
    }


    const telemetryResult =
        await getBatteryTelemetryForInstallation({

            installation,

            start,

            end,
        });


    const analytics =
        calculateBatteryAnalytics({

            records:
                telemetryResult
                    .records,

            start,

            end,

            deviceSelection,

            config,
        });


    return {

        installation: {

            id:
                String(
                    installation
                        ._id
                ),

            vrmSiteId:
                String(
                    installation
                        .vrmSiteId
                ),

            name:
                installation
                    .name ??
                null,

            status:
                installation
                    .status ??
                null,

            syncEnabled:
                installation
                    .syncEnabled ??
                true,

            lastSeenAt:
                installation
                    .lastSeenAt ??
                null,

            lastSyncAt:
                installation
                    .lastSyncAt ??
                null,
        },

        telemetry:
            telemetryResult
                .evidence,

        analytics,

        boundaries:
            BATTERY_TELEMETRY_ADAPTER_BOUNDARIES,
    };
}