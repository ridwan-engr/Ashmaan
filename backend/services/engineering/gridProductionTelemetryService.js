// services/engineering/gridProductionTelemetryService.js

import {
    Installation,
    Telemetry,
} from "../../models/index.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6H-A
| Production Grid Telemetry / Data-Access Qualification
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Establish the MongoDB evidence boundary for production grid analytics.
|
| This service:
|
| - resolves one persisted installation
| - validates a [start,end) reporting window
| - optionally applies a source-state lookback
| - retrieves only Phase 8.6-approved grid attributes
| - preserves persisted telemetry metadata
| - summarizes evidence without interpreting electrical meaning
|
| This service does NOT:
|
| - calculate grid source state
| - calculate grid power
| - calculate grid energy
| - detect outages
| - calculate grid quality
| - infer units
| - infer import/export
| - fabricate missing values
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Production attribute groups
|--------------------------------------------------------------------------
*/

export const GRID_PRODUCTION_ATTRIBUTE_GROUP =
    Object.freeze({
        ACTIVE_SOURCE:
            "ACTIVE_SOURCE",

        INPUT_CONTEXT:
            "INPUT_CONTEXT",

        DIRECT_GRID_POWER:
            "DIRECT_GRID_POWER",

        ACTIVE_INPUT_POWER:
            "ACTIVE_INPUT_POWER",

        GRID_QUALITY_VOLTAGE:
            "GRID_QUALITY_VOLTAGE",

        GRID_QUALITY_CURRENT:
            "GRID_QUALITY_CURRENT",

        GRID_QUALITY_FREQUENCY:
            "GRID_QUALITY_FREQUENCY",

        UNKNOWN:
            "UNKNOWN",
    });


export const GRID_PRODUCTION_ATTRIBUTES =
    Object.freeze({
        ACTIVE_SOURCE:
            Object.freeze([
                471,
            ]),

        INPUT_CONTEXT:
            Object.freeze([
                35,
                1664,
            ]),

        DIRECT_GRID_POWER:
            Object.freeze([
                379,
                380,
                381,
            ]),

        ACTIVE_INPUT_POWER:
            Object.freeze([
                17,
                18,
                19,
            ]),

        GRID_QUALITY_VOLTAGE:
            Object.freeze([
                8,
                9,
                10,
            ]),

        GRID_QUALITY_CURRENT:
            Object.freeze([
                11,
                12,
                13,
            ]),

        GRID_QUALITY_FREQUENCY:
            Object.freeze([
                14,
                15,
                16,
            ]),
    });


export const GRID_PRODUCTION_ATTRIBUTE_IDS =
    Object.freeze([
        ...GRID_PRODUCTION_ATTRIBUTES
            .ACTIVE_SOURCE,

        ...GRID_PRODUCTION_ATTRIBUTES
            .INPUT_CONTEXT,

        ...GRID_PRODUCTION_ATTRIBUTES
            .DIRECT_GRID_POWER,

        ...GRID_PRODUCTION_ATTRIBUTES
            .ACTIVE_INPUT_POWER,

        ...GRID_PRODUCTION_ATTRIBUTES
            .GRID_QUALITY_VOLTAGE,

        ...GRID_PRODUCTION_ATTRIBUTES
            .GRID_QUALITY_CURRENT,

        ...GRID_PRODUCTION_ATTRIBUTES
            .GRID_QUALITY_FREQUENCY,
    ]);


/*
|--------------------------------------------------------------------------
| Production data policy
|--------------------------------------------------------------------------
*/

export const GRID_PRODUCTION_DATA_POLICY =
    Object.freeze({
        acceptedQuality:
            "VALID",

        acceptedAggregationLevel:
            "RAW",

        reportingWindowSemantics:
            "[start,end)",

        defaultLookbackMinutes:
            30,

        includeInvalidTelemetry:
            false,

        includeNonRawTelemetry:
            false,

        missingMeansZero:
            false,

        unitInferenceAllowed:
            false,

        directionInferenceAllowed:
            false,

        sourceIdentityAttributeId:
            471,
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


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function numericAttributeId(
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


/*
|--------------------------------------------------------------------------
| Attribute membership
|--------------------------------------------------------------------------
*/

export function isGridProductionAttribute(
    attributeId
) {
    const numeric =
        numericAttributeId(
            attributeId
        );


    return (
        numeric !== null &&
        GRID_PRODUCTION_ATTRIBUTE_IDS
            .includes(
                numeric
            )
    );
}


/*
|--------------------------------------------------------------------------
| Attribute classification
|--------------------------------------------------------------------------
*/

export function classifyGridProductionAttribute(
    attributeId
) {
    const numeric =
        numericAttributeId(
            attributeId
        );


    if (
        numeric === null
    ) {
        return GRID_PRODUCTION_ATTRIBUTE_GROUP
            .UNKNOWN;
    }


    for (
        const [
            key,
            values,
        ]
        of Object.entries(
            GRID_PRODUCTION_ATTRIBUTES
        )
    ) {
        if (
            values.includes(
                numeric
            )
        ) {
            return GRID_PRODUCTION_ATTRIBUTE_GROUP[
                key
            ];
        }
    }


    return GRID_PRODUCTION_ATTRIBUTE_GROUP
        .UNKNOWN;
}


/*
|--------------------------------------------------------------------------
| Reporting-window resolution
|--------------------------------------------------------------------------
|
| queryStart may precede reporting start because source-state qualification
| can require evidence immediately before the requested reporting period.
|--------------------------------------------------------------------------
*/

export function resolveGridProductionWindow({
    start = null,
    end = null,
    lookbackMinutes =
        GRID_PRODUCTION_DATA_POLICY
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
            "Production grid reporting-window end must be later than start."
        );
    }


    const numericLookback =
        Number(
            lookbackMinutes
        );


    if (
        !Number.isFinite(
            numericLookback
        ) ||
        numericLookback <
        0
    ) {
        throw new Error(
            "Production grid lookbackMinutes must be a finite non-negative number."
        );
    }


    const queryStart =
        new Date(
            startDate.getTime() -
            numericLookback *
            60 *
            1000
        );


    return {
        start:
            startDate,

        end:
            endDate,

        queryStart,

        lookbackMinutes:
            numericLookback,

        semantics:
            "[start,end)",
    };
}


/*
|--------------------------------------------------------------------------
| Installation query
|--------------------------------------------------------------------------
*/

export function buildGridInstallationQuery({
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
        vrmSiteId,
    };
}


/*
|--------------------------------------------------------------------------
| Resolve production installation
|--------------------------------------------------------------------------
*/

export async function resolveGridProductionInstallation({
    installationId = null,
    vrmSiteId = null,
} = {}) {
    const query =
        buildGridInstallationQuery({
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
| MongoDB telemetry query builder
|--------------------------------------------------------------------------
|
| IMPORTANT
|
| The database predicate intentionally filters VALID + RAW.
|
| This does not alter the raw documents. It only prevents invalid,
| aggregated or unrelated telemetry from entering the production
| engineering pipeline.
|--------------------------------------------------------------------------
*/

export function buildGridTelemetryQuery({
    installationId,
    queryStart,
    end,
} = {}) {
    if (
        !installationId
    ) {
        throw new Error(
            "installationId is required for production grid telemetry."
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
            "A valid production grid telemetry query window is required."
        );
    }


    return {
        installation:
            installationId,

        vrmAttributeId: {
            $in:
                [
                    ...GRID_PRODUCTION_ATTRIBUTE_IDS,
                ],
        },

        timestamp: {
            $gte:
                normalizedStart,

            /*
            | Use $lt for strict [start,end) semantics.
            */
            $lt:
                normalizedEnd,
        },

        quality:
            GRID_PRODUCTION_DATA_POLICY
                .acceptedQuality,

        aggregationLevel:
            GRID_PRODUCTION_DATA_POLICY
                .acceptedAggregationLevel,
    };
}


/*
|--------------------------------------------------------------------------
| Telemetry projection
|--------------------------------------------------------------------------
*/

export const GRID_PRODUCTION_TELEMETRY_PROJECTION =
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
| Retrieve production grid telemetry
|--------------------------------------------------------------------------
*/

export async function getGridProductionTelemetry({
    installationId,
    queryStart,
    end,
} = {}) {
    const query =
        buildGridTelemetryQuery({
            installationId,
            queryStart,
            end,
        });


    return Telemetry
        .find(
            query
        )
        .select(
            GRID_PRODUCTION_TELEMETRY_PROJECTION
        )
        .sort({
            timestamp:
                1,

            vrmAttributeId:
                1,

            deviceInstance:
                1,
        })
        .lean();
}


/*
|--------------------------------------------------------------------------
| Reporting-window membership
|--------------------------------------------------------------------------
|
| query results can contain lookback evidence before reporting start.
|--------------------------------------------------------------------------
*/

export function isRecordInsideGridReportingWindow(
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
| Evidence summary
|--------------------------------------------------------------------------
*/

export function summarizeGridProductionEvidence({
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


    const groupSummary =
        {};


    for (
        const group
        of Object.values(
            GRID_PRODUCTION_ATTRIBUTE_GROUP
        )
    ) {
        if (
            group ===
            GRID_PRODUCTION_ATTRIBUTE_GROUP
                .UNKNOWN
        ) {
            continue;
        }


        groupSummary[
            group
        ] = {
            recordCount:
                0,

            reportingWindowRecordCount:
                0,

            attributeIds:
                [],

            deviceInstances:
                [],
        };
    }


    const unknownRecords =
        [];


    for (
        const record
        of normalizedRecords
    ) {
        const attributeId =
            numericAttributeId(
                record
                    ?.vrmAttributeId
            );


        const group =
            classifyGridProductionAttribute(
                attributeId
            );


        if (
            group ===
            GRID_PRODUCTION_ATTRIBUTE_GROUP
                .UNKNOWN
        ) {
            unknownRecords.push(
                record
            );

            continue;
        }


        const summary =
            groupSummary[
                group
            ];


        summary.recordCount +=
            1;


        if (
            isRecordInsideGridReportingWindow(
                record,
                {
                    start,
                    end,
                }
            )
        ) {
            summary
                .reportingWindowRecordCount +=
                1;
        }


        if (
            attributeId !==
                null &&
            !summary
                .attributeIds
                .includes(
                    attributeId
                )
        ) {
            summary
                .attributeIds
                .push(
                    attributeId
                );
        }


        const deviceInstance =
            record
                ?.deviceInstance !==
                null &&
            record
                ?.deviceInstance !==
                undefined
                ? String(
                    record
                        .deviceInstance
                )
                : null;


        if (
            deviceInstance !==
                null &&
            !summary
                .deviceInstances
                .includes(
                    deviceInstance
                )
        ) {
            summary
                .deviceInstances
                .push(
                    deviceInstance
                );
        }
    }


    for (
        const summary
        of Object.values(
            groupSummary
        )
    ) {
        summary
            .attributeIds
            .sort(
                (
                    a,
                    b
                ) =>
                    a -
                    b
            );


        summary
            .deviceInstances
            .sort();
    }


    const reportingWindowRecords =
        normalizedRecords.filter(
            (
                record
            ) =>
                isRecordInsideGridReportingWindow(
                    record,
                    {
                        start,
                        end,
                    }
                )
        );


    return {
        totalRecordCount:
            normalizedRecords.length,

        reportingWindowRecordCount:
            reportingWindowRecords.length,

        lookbackRecordCount:
            normalizedRecords.length -
            reportingWindowRecords.length,

        groupSummary,

        unknownRecordCount:
            unknownRecords.length,

        observedAttributeIds:
            Array.from(
                new Set(
                    normalizedRecords
                        .map(
                            (
                                record
                            ) =>
                                numericAttributeId(
                                    record
                                        ?.vrmAttributeId
                                )
                        )
                        .filter(
                            (
                                value
                            ) =>
                                value !==
                                null
                        )
                )
            )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a -
                        b
                ),

        boundaries: {
            onlyApprovedGridAttributesExpected:
                true,

            validTelemetryOnlyExpected:
                true,

            rawTelemetryOnlyExpected:
                true,

            missingMeansZero:
                false,

            unitInferenceAllowed:
                false,

            directionInferenceAllowed:
                false,

            lookbackIsReportingExposure:
                false,

            reportingWindowSemantics:
                "[start,end)",
        },
    };
}


/*
|--------------------------------------------------------------------------
| Public Phase 8.6H-A production evidence bundle
|--------------------------------------------------------------------------
*/

export async function getProductionGridTelemetryEvidence({
    installationId = null,
    vrmSiteId = null,

    start = null,
    end = null,

    lookbackMinutes =
        GRID_PRODUCTION_DATA_POLICY
            .defaultLookbackMinutes,
} = {}) {
    const installation =
        await resolveGridProductionInstallation({
            installationId,
            vrmSiteId,
        });


    const window =
        resolveGridProductionWindow({
            start,
            end,
            lookbackMinutes,
        });


    const records =
        await getGridProductionTelemetry({
            installationId:
                installation._id,

            queryStart:
                window.queryStart,

            end:
                window.end,
        });


    const evidence =
        summarizeGridProductionEvidence({
            records,

            start:
                window.start,

            end:
                window.end,
        });


    return {
        family:
            "GRID_PRODUCTION_TELEMETRY",

        phase:
            "8.6H-A",

        installation: {
            id:
                String(
                    installation._id
                ),

            vrmSiteId:
                String(
                    installation.vrmSiteId
                ),

            name:
                installation.name ??
                null,

            status:
                installation.status ??
                null,

            syncEnabled:
                installation.syncEnabled ??
                null,
        },

        reportingWindow: {
            start:
                window.start,

            end:
                window.end,

            semantics:
                window.semantics,
        },

        queryWindow: {
            start:
                window.queryStart,

            end:
                window.end,

            lookbackMinutes:
                window.lookbackMinutes,
        },

        records,

        evidence,

        boundaries: {
            analyticsCalculated:
                false,

            sourceStateCalculated:
                false,

            powerCalculated:
                false,

            energyCalculated:
                false,

            gridQualityCalculated:
                false,

            interruptionsCalculated:
                false,

            phase7EventsModified:
                false,

            rawTelemetryModified:
                false,

            missingMeansZero:
                false,

            unitInferenceAllowed:
                false,

            directionInferenceAllowed:
                false,
        },
    };
}


export default {
    GRID_PRODUCTION_ATTRIBUTE_GROUP,
    GRID_PRODUCTION_ATTRIBUTES,
    GRID_PRODUCTION_ATTRIBUTE_IDS,
    GRID_PRODUCTION_DATA_POLICY,
    GRID_PRODUCTION_TELEMETRY_PROJECTION,

    isGridProductionAttribute,
    classifyGridProductionAttribute,
    resolveGridProductionWindow,
    buildGridInstallationQuery,
    resolveGridProductionInstallation,
    buildGridTelemetryQuery,
    getGridProductionTelemetry,
    isRecordInsideGridReportingWindow,
    summarizeGridProductionEvidence,
    getProductionGridTelemetryEvidence,
};
