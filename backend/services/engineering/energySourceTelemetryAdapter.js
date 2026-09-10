// services/engineering/energySourceTelemetryAdapter.js

import {
    Installation,
    Telemetry,
} from "../../models/index.js";

import {
    calculateEnergySourceAnalytics,
} from "./energySourceAnalyticsService.js";

import {
    ENERGY_SOURCE_ATTRIBUTE_MAP,
} from "./energySourceAttributeMap.js";


/*
|--------------------------------------------------------------------------
| Validated production direct-power attributes
|--------------------------------------------------------------------------
*/

export const ENERGY_SOURCE_PRODUCTION_ATTRIBUTE_IDS =
    Object.freeze({

        GRID: Object.freeze([
            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GRID
                .DIRECT_POWER_L1
                .id,

            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GRID
                .DIRECT_POWER_L2
                .id,

            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GRID
                .DIRECT_POWER_L3
                .id,
        ]),

        GENERATOR: Object.freeze([
            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GENERATOR
                .TOTAL_POWER
                .id,

            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GENERATOR
                .POWER_L1
                .id,

            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GENERATOR
                .POWER_L2
                .id,

            ENERGY_SOURCE_ATTRIBUTE_MAP
                .GENERATOR
                .POWER_L3
                .id,
        ]),

        SOLAR: Object.freeze([
            ENERGY_SOURCE_ATTRIBUTE_MAP
                .SOLAR
                .TOTAL_POWER
                .id,
        ]),

        BATTERY: Object.freeze([
            ENERGY_SOURCE_ATTRIBUTE_MAP
                .BATTERY
                .POWER
                .id,
        ]),
    });


export const ENERGY_SOURCE_PRODUCTION_DIRECT_ATTRIBUTE_IDS =
    Object.freeze(
        [
            ...new Set(
                Object.values(
                    ENERGY_SOURCE_PRODUCTION_ATTRIBUTE_IDS
                ).flat()
            ),
        ]
    );


/*
|--------------------------------------------------------------------------
| Engineering boundaries
|--------------------------------------------------------------------------
*/

export const ENERGY_SOURCE_TELEMETRY_ADAPTER_BOUNDARIES =
    Object.freeze({

        READ_ONLY:
            true,

        SYNTHETIC_VALUES_ALLOWED:
            false,

        MISSING_TELEMETRY_MEANS_ZERO:
            false,

        AC_INPUT_POWER_INCLUDED:
            false,

        SYSTEM_OVERVIEW_FLOW_INCLUDED:
            false,

        GENERIC_KWH_INCLUDED:
            false,

        BATTERY_DIRECTIONAL_ENERGY_ALLOWED:
            false,

        MULTIPLE_SOURCE_DEVICES_AUTOMATICALLY_SUMMED:
            false,
    });


/*
|--------------------------------------------------------------------------
| General helpers
|--------------------------------------------------------------------------
*/

function asDate(
    value
) {

    if (
        value ===
        null ||
        value ===
        undefined
    ) {

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


function normalizeId(
    value
) {

    if (
        value ===
        null ||
        value ===
        undefined
    ) {

        return null;
    }


    const normalized =
        String(
            value
        ).trim();


    return normalized.length
        ? normalized
        : null;
}


function finiteNumericValue(
    value
) {

    if (
        value ===
        null ||
        value ===
        undefined ||
        value ===
        ""
    ) {

        return null;
    }


    const numeric =
        Number(
            value
        );


    return Number.isFinite(
        numeric
    )
        ? numeric
        : null;
}


/*
|--------------------------------------------------------------------------
| Production telemetry field accessors
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| ASHMAAN telemetryNormalizer returns a normalized object, but the sync
| service persists that object with:
|
|     $setOnInsert: normalized
|
| Therefore these fields are TOP-LEVEL MongoDB fields:
|
|     installation
|     deviceType
|     deviceInstance
|     vrmAttributeId
|     timestamp
|     numericValue/value
|
|--------------------------------------------------------------------------
*/

function getTelemetryAttributeId(
    document
) {

    const numeric =
        Number(
            document
                ?.vrmAttributeId
        );


    return Number.isInteger(
        numeric
    )
        ? numeric
        : null;
}


function getTelemetryTimestamp(
    document
) {

    return asDate(
        document
            ?.timestamp
    );
}


function getTelemetryValue(
    document
) {

    /*
     * numericValue is preferred because the Phase 8 evidence work already
     * established it as the engineering numeric representation.
     *
     * value is retained as compatibility fallback.
     */

    const numericValue =
        finiteNumericValue(
            document
                ?.numericValue
        );


    if (
        numericValue !==
        null
    ) {

        return numericValue;
    }


    return finiteNumericValue(
        document
            ?.value
    );
}


function getTelemetryDeviceInstance(
    document
) {

    return (
        document
            ?.deviceInstance ??
        null
    );
}


function getTelemetryDeviceType(
    document
) {

    return (
        document
            ?.deviceType ??
        null
    );
}


/*
|--------------------------------------------------------------------------
| Installation resolution
|--------------------------------------------------------------------------
*/

export async function resolveEnergySourceInstallation(
    vrmSiteId
) {

    const id =
        normalizeId(
            vrmSiteId
        );


    if (!id) {

        return null;
    }


    /*
     * Existing telemetry sync itself resolves installations through
     * installation.vrmSiteId.
     */

    return Installation
        .findOne({
            vrmSiteId:
                id,
        })
        .lean();
}


/*
|--------------------------------------------------------------------------
| Adapt persisted telemetry record to Phase 8.3C calculator input
|--------------------------------------------------------------------------
*/

export function adaptEnergySourceTelemetryDocument(
    document
) {

    const vrmAttributeId =
        getTelemetryAttributeId(
            document
        );


    const timestamp =
        getTelemetryTimestamp(
            document
        );


    const numericValue =
        getTelemetryValue(
            document
        );


    if (
        !Number.isInteger(
            vrmAttributeId
        ) ||
        !timestamp ||
        numericValue ===
        null
    ) {

        return null;
    }


    return {

        vrmAttributeId,

        timestamp,

        numericValue,

        value:
            numericValue,

        deviceInstance:
            getTelemetryDeviceInstance(
                document
            ),

        deviceType:
            getTelemetryDeviceType(
                document
            ),
    };
}


/*
|--------------------------------------------------------------------------
| Discover real production source telemetry
|--------------------------------------------------------------------------
|
| Start from Telemetry because source evidence is a telemetry property.
|
| The installation is resolved from the persisted MongoDB relation:
|
|     telemetry.installation -> Installation._id
|
|--------------------------------------------------------------------------
*/

export async function findProductionEnergySourceCandidate() {

    const candidates =
        await Telemetry
            .find({

                vrmAttributeId: {
                    $in:
                        ENERGY_SOURCE_PRODUCTION_DIRECT_ATTRIBUTE_IDS,
                },

                timestamp: {
                    $ne:
                        null,
                },

                installation: {
                    $ne:
                        null,
                },
            })
            .sort({
                timestamp:
                    -1,
            })
            .limit(
                250
            )
            .lean();


    for (
        const telemetry
        of candidates
    ) {

        const installationId =
            telemetry
                ?.installation;


        if (!installationId) {

            continue;
        }


        const installation =
            await Installation
                .findById(
                    installationId
                )
                .lean();


        if (!installation) {

            continue;
        }


        const timestamp =
            getTelemetryTimestamp(
                telemetry
            );


        if (!timestamp) {

            continue;
        }


        return {

            installation,

            telemetry,

            latestTimestamp:
                timestamp,
        };
    }


    return null;
}


/*
|--------------------------------------------------------------------------
| Latest direct source telemetry for one installation
|--------------------------------------------------------------------------
*/

export async function findLatestEnergySourceTelemetry(
    installation
) {

    if (
        !installation
            ?._id
    ) {

        throw new Error(
            "INSTALLATION_REQUIRED"
        );
    }


    return Telemetry
        .findOne({

            installation:
                installation._id,

            vrmAttributeId: {
                $in:
                    ENERGY_SOURCE_PRODUCTION_DIRECT_ATTRIBUTE_IDS,
            },

            timestamp: {
                $ne:
                    null,
            },
        })
        .sort({
            timestamp:
                -1,
        })
        .lean();
}


/*
|--------------------------------------------------------------------------
| Query production direct source telemetry
|--------------------------------------------------------------------------
*/

export async function getEnergySourceTelemetryForInstallation({
    installation,
    start,
    end,
} = {}) {

    if (
        !installation
            ?._id
    ) {

        throw new Error(
            "INSTALLATION_REQUIRED"
        );
    }


    const reportingStart =
        asDate(
            start
        );


    const reportingEnd =
        asDate(
            end
        );


    if (
        !reportingStart ||
        !reportingEnd ||
        reportingEnd <=
        reportingStart
    ) {

        throw new Error(
            "INVALID_REPORTING_WINDOW"
        );
    }


    const documents =
        await Telemetry
            .find({

                installation:
                    installation._id,

                vrmAttributeId: {
                    $in:
                        ENERGY_SOURCE_PRODUCTION_DIRECT_ATTRIBUTE_IDS,
                },

                timestamp: {

                    $gte:
                        reportingStart,

                    $lt:
                        reportingEnd,
                },
            })
            .sort({
                timestamp:
                    1,
            })
            .lean();


    const records =
        documents
            .map(
                adaptEnergySourceTelemetryDocument
            )
            .filter(
                Boolean
            );


    const observedAttributeIds =
        [
            ...new Set(
                records.map(
                    (
                        record
                    ) =>
                        record
                            .vrmAttributeId
                )
            ),
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    a -
                    b
            );


    const observedDeviceInstances =
        [
            ...new Set(
                records
                    .map(
                        (
                            record
                        ) =>
                            record
                                .deviceInstance
                    )
                    .filter(
                        (
                            value
                        ) =>
                            value !==
                                null &&
                            value !==
                                undefined
                    )
                    .map(
                        String
                    )
            ),
        ]
            .sort();


    return {

        documents,

        records,

        evidence: {

            storedDocuments:
                documents.length,

            qualifiedAdaptedRecords:
                records.length,

            rejectedDocuments:
                documents.length -
                records.length,

            attributeIdsQueried:
                [
                    ...ENERGY_SOURCE_PRODUCTION_DIRECT_ATTRIBUTE_IDS,
                ],

            observedAttributeIds,

            observedDeviceInstances,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Production analytics
|--------------------------------------------------------------------------
*/

export async function calculateProductionEnergySourceAnalytics({
    vrmSiteId,
    start,
    end,
    deviceSelection = {},
    config = {},
} = {}) {

    const reportingStart =
        asDate(
            start
        );


    const reportingEnd =
        asDate(
            end
        );


    if (
        !reportingStart ||
        !reportingEnd ||
        reportingEnd <=
        reportingStart
    ) {

        throw new Error(
            "INVALID_REPORTING_WINDOW"
        );
    }


    const installation =
        await resolveEnergySourceInstallation(
            vrmSiteId
        );


    if (!installation) {

        throw new Error(
            `INSTALLATION_NOT_FOUND:${vrmSiteId}`
        );
    }


    const telemetry =
        await getEnergySourceTelemetryForInstallation({

            installation,

            start:
                reportingStart,

            end:
                reportingEnd,
        });


    const analytics =
        calculateEnergySourceAnalytics({

            records:
                telemetry.records,

            start:
                reportingStart,

            end:
                reportingEnd,

            deviceSelection,

            config,
        });


    return {

        installation: {

            id:
                normalizeId(
                    installation
                        ._id
                ),

            vrmSiteId:
                installation
                    .vrmSiteId ??
                null,

            name:
                installation
                    .name ??
                installation
                    .siteName ??
                installation
                    .description ??
                null,
        },

        reportingWindow: {

            start:
                reportingStart,

            end:
                reportingEnd,

            semantics:
                "[start,end)",
        },

        telemetryEvidence:
            telemetry
                .evidence,

        analytics,

        boundaries:
            ENERGY_SOURCE_TELEMETRY_ADAPTER_BOUNDARIES,
    };
}