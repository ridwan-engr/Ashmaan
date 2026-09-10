// services/engineering/solarProductionTelemetryService.js

import {
    Installation,
    Telemetry,
} from "../../models/index.js";

import {
    SOLAR_ATTRIBUTE_MAP,
    SOLAR_ATTRIBUTE_IDS,
    SOLAR_ATTRIBUTE_ROLE,
    getSolarAttributeById,
} from "./solarAttributeMap.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 8.7H-A — Production Solar Telemetry / Data-Access Qualification
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Establish the canonical production data-access boundary between:
|
|   MongoDB Telemetry
|
| and the validated pure Solar engineering services:
|
|   8.7C — power
|   8.7D — energy / yield
|   8.7E — operating state
|   8.7F — performance
|   8.7G — availability foundation
|
| RESPONSIBILITIES
|
| - resolve one production installation
| - resolve reporting and query windows
| - retrieve only approved Phase 8.7 attributes
| - require VALID / RAW production telemetry
| - preserve canonical vrmAttributeId
| - preserve device topology
| - preserve unit metadata exactly as stored
| - classify evidence by semantic family
| - distinguish reporting-window records from lookback records
|
| DOES NOT
|
| - calculate PV power
| - calculate solar energy
| - calculate operating state
| - calculate performance
| - calculate availability
| - infer units
| - infer installed PV capacity
| - infer irradiance
| - aggregate multiple Solar Chargers
| - treat settings telemetry as generation
| - treat PV flows as total generation
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Identity
|--------------------------------------------------------------------------
*/

export const SOLAR_PRODUCTION_TELEMETRY_PHASE =
    "8.7H-A";


export const SOLAR_PRODUCTION_TELEMETRY_FAMILY =
    "SOLAR_PRODUCTION_TELEMETRY";


/*
|--------------------------------------------------------------------------
| Production attribute groups
|--------------------------------------------------------------------------
*/

export const SOLAR_PRODUCTION_ATTRIBUTE_GROUP =
    Object.freeze({
        PV_POWER:
            "PV_POWER",

        PV_ELECTRICAL:
            "PV_ELECTRICAL",

        YIELD_HISTORY:
            "YIELD_HISTORY",

        PERFORMANCE_HISTORY:
            "PERFORMANCE_HISTORY",

        OPERATING_STATE:
            "OPERATING_STATE",

        FLOW_CONTEXT:
            "FLOW_CONTEXT",

        SETTINGS_CONTEXT:
            "SETTINGS_CONTEXT",

        DEVICE_CONTEXT:
            "DEVICE_CONTEXT",

        UNKNOWN:
            "UNKNOWN",
    });


/*
|--------------------------------------------------------------------------
| Explicit approved attribute sets
|--------------------------------------------------------------------------
|
| These come directly from the validated Phase 8.7B semantic map.
|--------------------------------------------------------------------------
*/

export const SOLAR_PRODUCTION_ATTRIBUTES =
    Object.freeze({
        PV_POWER:
            Object.freeze([
                SOLAR_ATTRIBUTE_MAP
                    .PV_POWER
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .DC_COUPLED_PV_POWER
                    .id,
            ]),

        PV_ELECTRICAL:
            Object.freeze([
                SOLAR_ATTRIBUTE_MAP
                    .PV_VOLTAGE
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .CHARGER_OUTPUT_VOLTAGE
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .CHARGER_OUTPUT_CURRENT
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .CHARGER_OUTPUT_POWER
                    .id,
            ]),

        YIELD_HISTORY:
            Object.freeze([
                SOLAR_ATTRIBUTE_MAP
                    .YIELD_TODAY
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .YIELD_YESTERDAY
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .USER_YIELD
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .USER_YIELD_DELTA
                    .id,
            ]),

        PERFORMANCE_HISTORY:
            Object.freeze([
                SOLAR_ATTRIBUTE_MAP
                    .MAX_POWER_TODAY
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .MAX_POWER_YESTERDAY
                    .id,
            ]),

        OPERATING_STATE:
            Object.freeze([
                SOLAR_ATTRIBUTE_MAP
                    .CHARGER_MODE
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .CHARGER_STATE
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .ERROR_CODE
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .MPPT_STATE
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .OFF_REASON
                    .id,
            ]),

        FLOW_CONTEXT:
            Object.freeze([
                SOLAR_ATTRIBUTE_MAP
                    .PV_TO_BATTERY
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .PV_TO_CONSUMERS
                    .id,
            ]),

        SETTINGS_CONTEXT:
            Object.freeze([
                SOLAR_ATTRIBUTE_MAP
                    .DC_PV_FEED_IN_SETTING
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .AC_PV_FEEDBACK_SETTING
                    .id,
            ]),

        DEVICE_CONTEXT:
            Object.freeze([
                SOLAR_ATTRIBUTE_MAP
                    .FIRMWARE_VERSION
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .RELAY_STATE
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .PRODUCT_ID
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .SERIAL_NUMBER
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .LOAD_STATE
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .CUSTOM_NAME
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .BATTERY_VOLTAGE_SETTING
                    .id,

                SOLAR_ATTRIBUTE_MAP
                    .VREG_LINK_CAPABILITY
                    .id,
            ]),
    });


export const SOLAR_PRODUCTION_ATTRIBUTE_IDS =
    Object.freeze(
        Array.from(
            new Set(
                Object.values(
                    SOLAR_PRODUCTION_ATTRIBUTES
                ).flat()
            )
        ).sort(
            (
                a,
                b
            ) =>
                a - b
        )
    );


/*
|--------------------------------------------------------------------------
| Data policy
|--------------------------------------------------------------------------
*/

export const SOLAR_PRODUCTION_DATA_POLICY =
    Object.freeze({
        acceptedQuality:
            "VALID",

        acceptedAggregationLevel:
            "RAW",

        reportingWindowSemantics:
            "[start,end)",

        /*
         * Lookback is retrieval support only.
         *
         * It MUST NOT silently enter 8.7C–8.7G reporting-window analytics.
         */
        defaultLookbackMinutes:
            30,

        rawTelemetryPreserved:
            true,

        missingTelemetryMeansZero:
            false,

        noTelemetryMeansNoSolarInstallation:
            false,

        contextualSettingsEstablishSolarPresence:
            false,

        multipleDevicesAutomaticallyAggregated:
            false,

        unitInferenceAllowed:
            false,
    });


/*
|--------------------------------------------------------------------------
| MongoDB projection
|--------------------------------------------------------------------------
|
| Preserve all fields needed by the validated pure services and later
| production integration.
|--------------------------------------------------------------------------
*/

export const SOLAR_PRODUCTION_TELEMETRY_PROJECTION =
    Object.freeze({
        _id:
            1,

        site:
            1,

        installation:
            1,

        device:
            1,

        timestamp:
            1,

        parameter:
            1,

        code:
            1,

        description:
            1,

        value:
            1,

        numericValue:
            1,

        unit:
            1,

        formattedValue:
            1,

        quality:
            1,

        source:
            1,

        aggregationLevel:
            1,

        vrmAttributeId:
            1,

        deviceType:
            1,

        deviceInstance:
            1,

        dbusServiceType:
            1,

        dbusPath:
            1,

        formatWithUnit:
            1,

    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function asDate(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }


    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );


    return Number.isFinite(
        date.getTime()
    )
        ? date
        : null;
}


function finiteNumber(
    value
) {
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


function normalizeDeviceInstance(
    value
) {
    if (
        value === null ||
        value === undefined ||
        String(
            value
        ).trim() ===
            ""
    ) {
        return "UNKNOWN_DEVICE";
    }


    return String(
        value
    );
}


/*
|--------------------------------------------------------------------------
| Attribute qualification
|--------------------------------------------------------------------------
*/

export function isSolarProductionAttribute(
    attributeId
) {
    const numeric =
        finiteNumber(
            attributeId
        );


    return (
        numeric !==
            null &&
        SOLAR_PRODUCTION_ATTRIBUTE_IDS
            .includes(
                numeric
            )
    );
}


export function classifySolarProductionAttribute(
    attributeId
) {
    const numeric =
        finiteNumber(
            attributeId
        );


    if (
        numeric ===
        null
    ) {
        return SOLAR_PRODUCTION_ATTRIBUTE_GROUP
            .UNKNOWN;
    }


    for (
        const [
            key,
            values,
        ]
        of Object.entries(
            SOLAR_PRODUCTION_ATTRIBUTES
        )
    ) {
        if (
            values.includes(
                numeric
            )
        ) {
            return SOLAR_PRODUCTION_ATTRIBUTE_GROUP[
                key
            ];
        }
    }


    return SOLAR_PRODUCTION_ATTRIBUTE_GROUP
        .UNKNOWN;
}


/*
|--------------------------------------------------------------------------
| Reporting/query window
|--------------------------------------------------------------------------
*/

export function resolveSolarProductionWindow({
    start = null,
    end = null,
    lookbackMinutes =
        SOLAR_PRODUCTION_DATA_POLICY
            .defaultLookbackMinutes,
    now = null,
} = {}) {
    const normalizedNow =
        asDate(
            now
        ) ??
        new Date();


    const endDate =
        asDate(
            end
        ) ??
        normalizedNow;


    const startDate =
        asDate(
            start
        ) ??
        new Date(
            endDate.getTime() -
            24 *
            60 *
            60 *
            1000
        );


    if (
        startDate >=
        endDate
    ) {
        throw new Error(
            "A valid production solar reporting window is required."
        );
    }


    const normalizedLookback =
        Number(
            lookbackMinutes
        );


    if (
        !Number.isFinite(
            normalizedLookback
        ) ||
        normalizedLookback <
            0
    ) {
        throw new Error(
            "Solar production lookbackMinutes must be zero or greater."
        );
    }


    const queryStart =
        new Date(
            startDate.getTime() -
            normalizedLookback *
            60 *
            1000
        );


    return {
        start:
            startDate,

        end:
            endDate,

        queryStart,

        semantics:
            SOLAR_PRODUCTION_DATA_POLICY
                .reportingWindowSemantics,

        lookbackMinutes:
            normalizedLookback,
    };
}


/*
|--------------------------------------------------------------------------
| Installation resolution
|--------------------------------------------------------------------------
*/

export function buildSolarInstallationQuery({
    installationId = null,
    vrmSiteId = null,
} = {}) {
    if (
        !installationId &&
        !vrmSiteId
    ) {
        throw new Error(
            "installationId or vrmSiteId is required."
        );
    }


    if (
        installationId
    ) {
        return {
            _id:
                installationId,
        };
    }


    return {
        vrmSiteId:
            vrmSiteId,
    };
}


export async function resolveSolarProductionInstallation({
    installationId = null,
    vrmSiteId = null,
} = {}) {
    const query =
        buildSolarInstallationQuery({
            installationId,
            vrmSiteId,
        });


    const installation =
        await Installation
            .findOne(
                query
            )
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


    if (
        !installation
    ) {
        throw new Error(
            "Installation not found."
        );
    }


    return installation;
}


/*
|--------------------------------------------------------------------------
| Telemetry query
|--------------------------------------------------------------------------
*/

export function buildSolarTelemetryQuery({
    installationId,
    queryStart,
    end,
} = {}) {
    if (
        !installationId
    ) {
        throw new Error(
            "installationId is required for production solar telemetry."
        );
    }


    const normalizedStart =
        asDate(
            queryStart
        );


    const normalizedEnd =
        asDate(
            end
        );


    if (
        !normalizedStart ||
        !normalizedEnd ||
        normalizedStart >=
            normalizedEnd
    ) {
        throw new Error(
            "A valid production solar telemetry query window is required."
        );
    }


    return {
        installation:
            installationId,

        vrmAttributeId: {
            $in:
                SOLAR_PRODUCTION_ATTRIBUTE_IDS,
        },

        quality:
            SOLAR_PRODUCTION_DATA_POLICY
                .acceptedQuality,

        aggregationLevel:
            SOLAR_PRODUCTION_DATA_POLICY
                .acceptedAggregationLevel,

        timestamp: {
            $gte:
                normalizedStart,

            /*
             * Strict [queryStart,end).
             */
            $lt:
                normalizedEnd,
        },
    };
}


export async function getSolarProductionTelemetry({
    installationId,
    queryStart,
    end,
} = {}) {
    const query =
        buildSolarTelemetryQuery({
            installationId,
            queryStart,
            end,
        });


    return Telemetry
        .find(
            query
        )
        .select(
            SOLAR_PRODUCTION_TELEMETRY_PROJECTION
        )
        .sort({
            vrmAttributeId:
                1,

            deviceInstance:
                1,

            timestamp:
                1,
        })
        .lean();
}


/*
|--------------------------------------------------------------------------
| Reporting-window boundary
|--------------------------------------------------------------------------
*/

export function isRecordInsideSolarReportingWindow(
    record,
    {
        start,
        end,
    } = {}
) {
    const timestamp =
        asDate(
            record
                ?.timestamp
        );


    const startDate =
        asDate(
            start
        );


    const endDate =
        asDate(
            end
        );


    if (
        !timestamp ||
        !startDate ||
        !endDate
    ) {
        return false;
    }


    return (
        timestamp >=
            startDate &&
        timestamp <
            endDate
    );
}


/*
|--------------------------------------------------------------------------
| Semantic description
|--------------------------------------------------------------------------
*/

function semanticDescriptor(
    attributeId
) {
    const attribute =
        getSolarAttributeById(
            attributeId
        );


    if (
        !attribute
    ) {
        return null;
    }


    return {
        id:
            attribute.id,

        key:
            attribute.key,

        name:
            attribute.name,

        role:
            attribute.role,

        semanticStatus:
            attribute.semanticStatus,

        measurementBoundary:
            attribute.measurementBoundary,

        dataKind:
            attribute.dataKind,

        evidenceBasis:
            attribute.evidenceBasis,

        unitStatus:
            attribute.unit
                ?.status ??
            null,

        qualification:
            attribute.qualification ??
            null,
    };
}


/*
|--------------------------------------------------------------------------
| Evidence summarization
|--------------------------------------------------------------------------
*/

export function summarizeSolarProductionEvidence({
    records = [],
    start = null,
    end = null,
} = {}) {
    const normalizedRecords =
        Array.isArray(
            records
        )
            ? records
            : [];


    const reportingRecords =
        normalizedRecords.filter(
            (
                record
            ) =>
                isRecordInsideSolarReportingWindow(
                    record,
                    {
                        start,
                        end,
                    }
                )
        );


    const groupSummary =
        {};


    for (
        const group
        of Object.values(
            SOLAR_PRODUCTION_ATTRIBUTE_GROUP
        )
    ) {
        if (
            group ===
            SOLAR_PRODUCTION_ATTRIBUTE_GROUP
                .UNKNOWN
        ) {
            continue;
        }


        const groupRecords =
            normalizedRecords.filter(
                (
                    record
                ) =>
                    classifySolarProductionAttribute(
                        record
                            ?.vrmAttributeId
                    ) ===
                    group
            );


        const groupReportingRecords =
            reportingRecords.filter(
                (
                    record
                ) =>
                    classifySolarProductionAttribute(
                        record
                            ?.vrmAttributeId
                    ) ===
                    group
            );


        const attributeIds =
            Array.from(
                new Set(
                    groupRecords.map(
                        (
                            record
                        ) =>
                            Number(
                                record
                                    .vrmAttributeId
                            )
                    )
                )
            ).sort(
                (
                    a,
                    b
                ) =>
                    a - b
            );


        const deviceInstances =
            Array.from(
                new Set(
                    groupRecords.map(
                        (
                            record
                        ) =>
                            normalizeDeviceInstance(
                                record
                                    ?.deviceInstance
                            )
                    )
                )
            ).sort();


        groupSummary[
            group
        ] = {
            recordCount:
                groupRecords
                    .length,

            reportingWindowRecordCount:
                groupReportingRecords
                    .length,

            attributeIds,

            deviceInstances,

            deviceCount:
                deviceInstances
                    .length,
        };
    }


    const attributeSummary =
        {};


    for (
        const attributeId
        of SOLAR_PRODUCTION_ATTRIBUTE_IDS
    ) {
        const attributeRecords =
            normalizedRecords.filter(
                (
                    record
                ) =>
                    Number(
                        record
                            ?.vrmAttributeId
                    ) ===
                    attributeId
            );


        const reportingAttributeRecords =
            reportingRecords.filter(
                (
                    record
                ) =>
                    Number(
                        record
                            ?.vrmAttributeId
                    ) ===
                    attributeId
            );


        const devices =
            Array.from(
                new Set(
                    attributeRecords.map(
                        (
                            record
                        ) =>
                            normalizeDeviceInstance(
                                record
                                    ?.deviceInstance
                            )
                    )
                )
            ).sort();


        attributeSummary[
            attributeId
        ] = {
            recordCount:
                attributeRecords
                    .length,

            reportingWindowRecordCount:
                reportingAttributeRecords
                    .length,

            deviceInstances:
                devices,

            semantic:
                semanticDescriptor(
                    attributeId
                ),
        };
    }


    const observedAttributeIds =
        Object.entries(
            attributeSummary
        )
            .filter(
                ([
                    ,
                    summary,
                ]) =>
                    summary
                        .recordCount >
                    0
            )
            .map(
                ([
                    id,
                ]) =>
                    Number(
                        id
                    )
            );


    const reportingObservedAttributeIds =
        Object.entries(
            attributeSummary
        )
            .filter(
                ([
                    ,
                    summary,
                ]) =>
                    summary
                        .reportingWindowRecordCount >
                    0
            )
            .map(
                ([
                    id,
                ]) =>
                    Number(
                        id
                    )
            );


    const allDeviceInstances =
        Array.from(
            new Set(
                normalizedRecords.map(
                    (
                        record
                    ) =>
                        normalizeDeviceInstance(
                            record
                                ?.deviceInstance
                        )
                )
            )
        ).sort();


    const solarChargerRecords =
        normalizedRecords.filter(
            (
                record
            ) =>
                String(
                    record
                        ?.dbusServiceType ??
                    ""
                ).toLowerCase() ===
                    "solarcharger" ||
                String(
                    record
                        ?.deviceType ??
                    ""
                ).toLowerCase() ===
                    "solar charger"
        );


    /*
     * Settings/context-only telemetry must not establish actual
     * solar-generation evidence.
     */
    const generationEvidenceRecords =
        normalizedRecords.filter(
            (
                record
            ) => {
                const attributeId =
                    Number(
                        record
                            ?.vrmAttributeId
                    );


                return (
                    attributeId ===
                        SOLAR_ATTRIBUTE_MAP
                            .PV_POWER
                            .id ||
                    attributeId ===
                        SOLAR_ATTRIBUTE_MAP
                            .DC_COUPLED_PV_POWER
                            .id
                );
            }
        );


    return {
        totalRecords:
            normalizedRecords
                .length,

        reportingWindowRecords:
            reportingRecords
                .length,

        lookbackOnlyRecords:
            normalizedRecords
                .length -
            reportingRecords
                .length,

        observedAttributeIds,

        reportingObservedAttributeIds,

        observedDeviceInstances:
            allDeviceInstances,

        solarChargerRecordCount:
            solarChargerRecords
                .length,

        generationEvidenceRecordCount:
            generationEvidenceRecords
                .length,

        hasAnyApprovedSolarEvidence:
            normalizedRecords
                .length >
            0,

        hasSolarChargerTelemetry:
            solarChargerRecords
                .length >
            0,

        hasGenerationEvidence:
            generationEvidenceRecords
                .length >
            0,

        /*
         * This is crucial:
         *
         * any approved/context telemetry != qualified PV generation.
         */
        generationEstablishedFromContextOnly:
            false,

        groups:
            groupSummary,

        attributes:
            attributeSummary,
    };
}


/*
|--------------------------------------------------------------------------
| Public production evidence loader
|--------------------------------------------------------------------------
*/

export async function getProductionSolarTelemetryEvidence({
    installationId = null,
    vrmSiteId = null,
    start = null,
    end = null,
    lookbackMinutes =
        SOLAR_PRODUCTION_DATA_POLICY
            .defaultLookbackMinutes,
} = {}) {
    const installation =
        await resolveSolarProductionInstallation({
            installationId,
            vrmSiteId,
        });


    const window =
        resolveSolarProductionWindow({
            start,
            end,
            lookbackMinutes,
        });


    const records =
        await getSolarProductionTelemetry({
            installationId:
                installation
                    ._id,

            queryStart:
                window
                    .queryStart,

            end:
                window
                    .end,
        });


    const evidence =
        summarizeSolarProductionEvidence({
            records,
            start:
                window
                    .start,
            end:
                window
                    .end,
        });


    const reportingRecords =
        records.filter(
            (
                record
            ) =>
                isRecordInsideSolarReportingWindow(
                    record,
                    {
                        start:
                            window
                                .start,

                        end:
                            window
                                .end,
                    }
                )
        );


    return {
        family:
            SOLAR_PRODUCTION_TELEMETRY_FAMILY,

        phase:
            SOLAR_PRODUCTION_TELEMETRY_PHASE,

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
                null,

            lastSeenAt:
                installation
                    .lastSeenAt ??
                null,

            lastSyncAt:
                installation
                    .lastSyncAt ??
                null,
        },

        reportingWindow: {
            start:
                window
                    .start,

            end:
                window
                    .end,

            semantics:
                window
                    .semantics,
        },

        queryWindow: {
            start:
                window
                    .queryStart,

            end:
                window
                    .end,

            lookbackMinutes:
                window
                    .lookbackMinutes,
        },

        records,

        reportingRecords,

        evidence,

        dataPolicy:
            SOLAR_PRODUCTION_DATA_POLICY,

        boundaries: {
            analyticsCalculated:
                false,

            rawTelemetryPreserved:
                true,

            onlyApprovedSolarAttributeIdsQueried:
                true,

            validOnly:
                true,

            rawAggregationOnly:
                true,

            canonicalAttributeField:
                "vrmAttributeId",

            strictReportingWindow:
                true,

            lookbackAutomaticallyIncludedInAnalytics:
                false,

            unitInferenceAllowed:
                false,

            settingsContextEstablishesGeneration:
                false,

            flowContextEstablishesGeneration:
                false,

            multipleSolarChargersAutomaticallyAggregated:
                false,

            noTelemetryMeansZero:
                false,

            noTelemetryMeansNoSolarInstallation:
                false,

            generationMeansAvailability:
                false,
        },
    };
}


export default Object.freeze({
    SOLAR_PRODUCTION_TELEMETRY_PHASE,
    SOLAR_PRODUCTION_TELEMETRY_FAMILY,
    SOLAR_PRODUCTION_ATTRIBUTE_GROUP,
    SOLAR_PRODUCTION_ATTRIBUTES,
    SOLAR_PRODUCTION_ATTRIBUTE_IDS,
    SOLAR_PRODUCTION_DATA_POLICY,
    SOLAR_PRODUCTION_TELEMETRY_PROJECTION,

    isSolarProductionAttribute,
    classifySolarProductionAttribute,
    resolveSolarProductionWindow,
    buildSolarInstallationQuery,
    resolveSolarProductionInstallation,
    buildSolarTelemetryQuery,
    getSolarProductionTelemetry,
    isRecordInsideSolarReportingWindow,
    summarizeSolarProductionEvidence,
    getProductionSolarTelemetryEvidence,
});
