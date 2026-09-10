// services/engineering/gridPowerTopologyService.js

import {
    GRID_ACTIVE_SOURCE,
    GRID_DIRECT_POWER_ATTRIBUTES,
    GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES,
} from "./gridAttributeMap.js";


/*
|--------------------------------------------------------------------------
| Phase 8.6D-A
| Grid Power Topology / Source Qualification
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Establish the usable grid-power evidence family before any actual power
| aggregation or energy integration is performed.
|
| SOURCE PRIORITY
|
| 1. Direct grid meter:
|       attrs 379 / 380 / 381
|
| 2. VE.Bus active input:
|       attrs 17 / 18 / 19
|
|    ONLY if independent source-state evidence later qualifies the
|    relevant interval as GRID (attr471 = 1).
|
| This service DOES NOT:
|
| - calculate total grid power
| - align phase timestamps
| - calculate energy
| - infer W/kW
| - infer import/export direction
| - infer outage
| - infer grid availability
|--------------------------------------------------------------------------
*/


export const GRID_POWER_SOURCE = Object.freeze({
    DIRECT_GRID_METER:
        "DIRECT_GRID_METER",

    ACTIVE_INPUT_CONDITIONAL:
        "ACTIVE_INPUT_CONDITIONAL",

    NONE:
        "NONE",
});


export const GRID_POWER_TOPOLOGY_STATUS = Object.freeze({
    QUALIFIED:
        "QUALIFIED",

    CONDITIONAL:
        "CONDITIONAL",

    AMBIGUOUS:
        "AMBIGUOUS",

    UNAVAILABLE:
        "UNAVAILABLE",
});


export const GRID_POWER_TOPOLOGY_REASON = Object.freeze({
    DIRECT_GRID_METER_QUALIFIED:
        "DIRECT_GRID_METER_QUALIFIED",

    ACTIVE_INPUT_REQUIRES_GRID_SOURCE_QUALIFICATION:
        "ACTIVE_INPUT_REQUIRES_GRID_SOURCE_QUALIFICATION",

    NO_GRID_POWER_EVIDENCE:
        "NO_GRID_POWER_EVIDENCE",

    INCOMPLETE_DIRECT_GRID_PHASES:
        "INCOMPLETE_DIRECT_GRID_PHASES",

    INCOMPLETE_ACTIVE_INPUT_PHASES:
        "INCOMPLETE_ACTIVE_INPUT_PHASES",

    MULTIPLE_DIRECT_GRID_METERS_AMBIGUOUS:
        "MULTIPLE_DIRECT_GRID_METERS_AMBIGUOUS",

    MULTIPLE_ACTIVE_INPUT_DEVICES_AMBIGUOUS:
        "MULTIPLE_ACTIVE_INPUT_DEVICES_AMBIGUOUS",

    SELECTED_DEVICE_NOT_FOUND:
        "SELECTED_DEVICE_NOT_FOUND",

    SELECTED_DEVICE_INCOMPLETE_PHASES:
        "SELECTED_DEVICE_INCOMPLETE_PHASES",
});


export const GRID_POWER_UNIT = Object.freeze({
    W:
        "W",

    KW:
        "KW",

    UNRESOLVED:
        "UNRESOLVED",
});


export const GRID_POWER_UNIT_STATUS = Object.freeze({
    QUALIFIED:
        "QUALIFIED",

    UNRESOLVED:
        "UNRESOLVED",

    CONFLICT:
        "CONFLICT",
});


export const GRID_POWER_DIRECTION_STATUS = Object.freeze({
    UNRESOLVED:
        "UNRESOLVED",
});


function normalizeDeviceInstance(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "NO_DEVICE_INSTANCE";
    }


    const normalized =
        String(
            value
        )
            .trim();


    return normalized ||
        "NO_DEVICE_INSTANCE";
}


function finiteNumber(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;
    }


    if (
        typeof value ===
        "boolean"
    ) {

        return null;
    }


    if (
        typeof value ===
            "string" &&
        value.trim() ===
            ""
    ) {

        return null;
    }


    const numeric =
        typeof value ===
            "number"
            ? value
            : Number(
                value
            );


    return Number.isFinite(
        numeric
    )
        ? numeric
        : null;
}


function telemetryNumericValue(
    record
) {

    const numericValue =
        finiteNumber(
            record?.numericValue
        );


    if (
        numericValue !==
        null
    ) {

        return numericValue;
    }


    return finiteNumber(
        record?.value
    );
}


function normalizeUnit(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;
    }


    const normalized =
        String(
            value
        )
            .trim()
            .toLowerCase();


    if (
        [
            "w",
            "watt",
            "watts",
        ].includes(
            normalized
        )
    ) {

        return GRID_POWER_UNIT
            .W;
    }


    if (
        [
            "kw",
            "kilowatt",
            "kilowatts",
        ].includes(
            normalized
        )
    ) {

        return GRID_POWER_UNIT
            .KW;
    }


    return null;
}


/*
|--------------------------------------------------------------------------
| Production telemetry normalization
|--------------------------------------------------------------------------
*/

export function normalizeGridPowerTelemetry(
    records = []
) {

    return records
        .filter(
            (
                record
            ) => {

                const attributeId =
                    Number(
                        record
                            ?.vrmAttributeId
                    );


                const isRelevant =
                    GRID_DIRECT_POWER_ATTRIBUTES
                        .includes(
                            attributeId
                        ) ||
                    GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES
                        .includes(
                            attributeId
                        );


                if (
                    !isRelevant
                ) {

                    return false;
                }


                const timestamp =
                    new Date(
                        record
                            ?.timestamp
                    );


                if (
                    !Number.isFinite(
                        timestamp.getTime()
                    )
                ) {

                    return false;
                }


                if (
                    record
                        ?.quality !==
                        undefined &&
                    record
                        ?.quality !==
                        "VALID"
                ) {

                    return false;
                }


                if (
                    record
                        ?.aggregationLevel !==
                        undefined &&
                    record
                        ?.aggregationLevel !==
                        "RAW"
                ) {

                    return false;
                }


                return (
                    telemetryNumericValue(
                        record
                    ) !==
                    null
                );
            }
        )
        .map(
            (
                record
            ) => ({
                ...record,

                timestamp:
                    new Date(
                        record.timestamp
                    ),

                vrmAttributeId:
                    Number(
                        record.vrmAttributeId
                    ),

                numericValue:
                    telemetryNumericValue(
                        record
                    ),

                deviceInstance:
                    normalizeDeviceInstance(
                        record.deviceInstance
                    ),
            })
        )
        .sort(
            (
                a,
                b
            ) =>
                a.timestamp -
                b.timestamp
        );
}


/*
|--------------------------------------------------------------------------
| Duplicate handling
|--------------------------------------------------------------------------
|
| Same:
|   attribute + device + timestamp + value
|
| -> safe duplicate
|
| Same:
|   attribute + device + timestamp
|
| but conflicting numeric value
|
| -> entire timestamp key becomes ambiguous and is removed
|--------------------------------------------------------------------------
*/

export function removeAmbiguousGridPowerDuplicates(
    records = []
) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        const key =
            [
                record.vrmAttributeId,
                normalizeDeviceInstance(
                    record.deviceInstance
                ),
                record.timestamp.toISOString(),
            ].join(
                "|"
            );


        if (
            !groups.has(
                key
            )
        ) {

            groups.set(
                key,
                []
            );
        }


        groups
            .get(
                key
            )
            .push(
                record
            );
    }


    const output =
        [];


    let duplicateCount =
        0;


    let conflictingDuplicateCount =
        0;


    for (
        const group
        of groups.values()
    ) {

        if (
            group.length ===
            1
        ) {

            output.push(
                group[0]
            );

            continue;
        }


        const values =
            new Set(
                group.map(
                    (
                        record
                    ) =>
                        record.numericValue
                )
            );


        if (
            values.size ===
            1
        ) {

            output.push(
                group[0]
            );


            duplicateCount +=
                group.length -
                1;


            continue;
        }


        conflictingDuplicateCount +=
            group.length;
    }


    return {
        records:
            output,

        duplicateCount,

        conflictingDuplicateCount,
    };
}


/*
|--------------------------------------------------------------------------
| Source-family helpers
|--------------------------------------------------------------------------
*/

function getFamilyRecords(
    records,
    attributes
) {

    const attributeSet =
        new Set(
            attributes
        );


    return records.filter(
        (
            record
        ) =>
            attributeSet.has(
                record.vrmAttributeId
            )
    );
}


function groupByDevice(
    records
) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        const deviceInstance =
            normalizeDeviceInstance(
                record.deviceInstance
            );


        if (
            !groups.has(
                deviceInstance
            )
        ) {

            groups.set(
                deviceInstance,
                []
            );
        }


        groups
            .get(
                deviceInstance
            )
            .push(
                record
            );
    }


    return groups;
}


function getObservedAttributes(
    records
) {

    return new Set(
        records.map(
            (
                record
            ) =>
                Number(
                    record.vrmAttributeId
                )
        )
    );
}


function hasCompletePhaseFamily(
    records,
    requiredAttributes
) {

    const observed =
        getObservedAttributes(
            records
        );


    return requiredAttributes.every(
        (
            attributeId
        ) =>
            observed.has(
                attributeId
            )
    );
}


/*
|--------------------------------------------------------------------------
| Device qualification
|--------------------------------------------------------------------------
*/

function qualifyFamilyDevice({
    records,
    requiredAttributes,
    selectedDeviceInstance = null,
    multipleDeviceReason,
    incompleteReason,
}) {

    const groups =
        groupByDevice(
            records
        );


    if (
        selectedDeviceInstance !==
            null &&
        selectedDeviceInstance !==
            undefined
    ) {

        const selectedKey =
            normalizeDeviceInstance(
                selectedDeviceInstance
            );


        if (
            !groups.has(
                selectedKey
            )
        ) {

            return {
                status:
                    GRID_POWER_TOPOLOGY_STATUS
                        .UNAVAILABLE,

                reason:
                    GRID_POWER_TOPOLOGY_REASON
                        .SELECTED_DEVICE_NOT_FOUND,

                selectedDeviceInstance:
                    selectedKey,

                deviceInstances:
                    Array.from(
                        groups.keys()
                    ),

                records:
                    [],
            };
        }


        const selectedRecords =
            groups.get(
                selectedKey
            );


        if (
            !hasCompletePhaseFamily(
                selectedRecords,
                requiredAttributes
            )
        ) {

            return {
                status:
                    GRID_POWER_TOPOLOGY_STATUS
                        .UNAVAILABLE,

                reason:
                    GRID_POWER_TOPOLOGY_REASON
                        .SELECTED_DEVICE_INCOMPLETE_PHASES,

                selectedDeviceInstance:
                    selectedKey,

                deviceInstances:
                    Array.from(
                        groups.keys()
                    ),

                records:
                    selectedRecords,
            };
        }


        return {
            status:
                GRID_POWER_TOPOLOGY_STATUS
                    .QUALIFIED,

            reason:
                null,

            selectedDeviceInstance:
                selectedKey,

            deviceInstances:
                Array.from(
                    groups.keys()
                ),

            records:
                selectedRecords,
        };
    }


    const completeDevices =
        [];


    const incompleteDevices =
        [];


    for (
        const [
            deviceInstance,
            deviceRecords,
        ]
        of groups.entries()
    ) {

        if (
            hasCompletePhaseFamily(
                deviceRecords,
                requiredAttributes
            )
        ) {

            completeDevices.push({
                deviceInstance,
                records:
                    deviceRecords,
            });
        }


        else {

            incompleteDevices.push({
                deviceInstance,
                records:
                    deviceRecords,
            });
        }
    }


    if (
        completeDevices.length >
        1
    ) {

        return {
            status:
                GRID_POWER_TOPOLOGY_STATUS
                    .AMBIGUOUS,

            reason:
                multipleDeviceReason,

            selectedDeviceInstance:
                null,

            deviceInstances:
                completeDevices.map(
                    (
                        item
                    ) =>
                        item.deviceInstance
                ),

            records:
                [],
        };
    }


    if (
        completeDevices.length ===
        1
    ) {

        return {
            status:
                GRID_POWER_TOPOLOGY_STATUS
                    .QUALIFIED,

            reason:
                null,

            selectedDeviceInstance:
                completeDevices[0]
                    .deviceInstance,

            deviceInstances:
                Array.from(
                    groups.keys()
                ),

            records:
                completeDevices[0]
                    .records,
        };
    }


    return {
        status:
            GRID_POWER_TOPOLOGY_STATUS
                .UNAVAILABLE,

        reason:
            incompleteReason,

        selectedDeviceInstance:
            null,

        deviceInstances:
            Array.from(
                groups.keys()
            ),

        records:
            [],
    };
}


/*
|--------------------------------------------------------------------------
| Public topology qualification
|--------------------------------------------------------------------------
*/

export function selectGridPowerTopology({
    records = [],
    selectedDeviceInstance = null,
} = {}) {

    const normalized =
        normalizeGridPowerTelemetry(
            records
        );


    const deduplicated =
        removeAmbiguousGridPowerDuplicates(
            normalized
        );


    const cleanRecords =
        deduplicated.records;


    /*
     * --------------------------------------------------------------
     * Priority 1:
     * Direct grid meter 379/380/381
     * --------------------------------------------------------------
     */

    const directRecords =
        getFamilyRecords(
            cleanRecords,
            GRID_DIRECT_POWER_ATTRIBUTES
        );


    if (
        directRecords.length >
        0
    ) {

        const directTopology =
            qualifyFamilyDevice({
                records:
                    directRecords,

                requiredAttributes:
                    GRID_DIRECT_POWER_ATTRIBUTES,

                selectedDeviceInstance,

                multipleDeviceReason:
                    GRID_POWER_TOPOLOGY_REASON
                        .MULTIPLE_DIRECT_GRID_METERS_AMBIGUOUS,

                incompleteReason:
                    GRID_POWER_TOPOLOGY_REASON
                        .INCOMPLETE_DIRECT_GRID_PHASES,
            });


        if (
            directTopology.status ===
            GRID_POWER_TOPOLOGY_STATUS
                .QUALIFIED
        ) {

            return {
                status:
                    GRID_POWER_TOPOLOGY_STATUS
                        .QUALIFIED,

                reason:
                    GRID_POWER_TOPOLOGY_REASON
                        .DIRECT_GRID_METER_QUALIFIED,

                source:
                    GRID_POWER_SOURCE
                        .DIRECT_GRID_METER,

                sourceAttributes:
                    GRID_DIRECT_POWER_ATTRIBUTES,

                sourceIdentityRequired:
                    false,

                requiredSourceCode:
                    null,

                topology:
                    directTopology,

                records:
                    directTopology.records,

                evidence: {
                    inputRecordCount:
                        records.length,

                    normalizedRecordCount:
                        normalized.length,

                    deduplicatedRecordCount:
                        cleanRecords.length,

                    duplicateCount:
                        deduplicated
                            .duplicateCount,

                    conflictingDuplicateCount:
                        deduplicated
                            .conflictingDuplicateCount,

                    directGridRecordCount:
                        directRecords.length,

                    activeInputRecordCount:
                        getFamilyRecords(
                            cleanRecords,
                            GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES
                        ).length,
                },

                semantics: {
                    directGridMeasurement:
                        true,

                    gridSourceStateRequired:
                        false,

                    gridAvailabilityEstablished:
                        false,

                    gridOutageEstablished:
                        false,

                    importExportDirectionEstablished:
                        false,

                    powerUnitEstablished:
                        false,
                },
            };
        }


        /*
         * Direct-grid evidence exists but topology itself is ambiguous.
         *
         * We do NOT silently fall through to VE.Bus active-input power
         * because that would substitute a lower-confidence source for an
         * unresolved higher-priority source.
         */
        if (
            directTopology.status ===
            GRID_POWER_TOPOLOGY_STATUS
                .AMBIGUOUS ||
            selectedDeviceInstance !==
                null
        ) {

            return {
                status:
                    directTopology.status,

                reason:
                    directTopology.reason,

                source:
                    GRID_POWER_SOURCE
                        .DIRECT_GRID_METER,

                sourceAttributes:
                    GRID_DIRECT_POWER_ATTRIBUTES,

                sourceIdentityRequired:
                    false,

                requiredSourceCode:
                    null,

                topology:
                    directTopology,

                records:
                    [],

                evidence: {
                    inputRecordCount:
                        records.length,

                    normalizedRecordCount:
                        normalized.length,

                    deduplicatedRecordCount:
                        cleanRecords.length,

                    duplicateCount:
                        deduplicated
                            .duplicateCount,

                    conflictingDuplicateCount:
                        deduplicated
                            .conflictingDuplicateCount,

                    directGridRecordCount:
                        directRecords.length,
                },

                semantics: {
                    directGridMeasurement:
                        true,

                    gridSourceStateRequired:
                        false,

                    gridAvailabilityEstablished:
                        false,

                    gridOutageEstablished:
                        false,

                    importExportDirectionEstablished:
                        false,

                    powerUnitEstablished:
                        false,
                },
            };
        }
    }


    /*
     * --------------------------------------------------------------
     * Priority 2:
     * VE.Bus active-input power 17/18/19
     * --------------------------------------------------------------
     *
     * This remains CONDITIONAL.
     *
     * The records are not yet grid power.
     * Phase 8.6D-C will intersect them with qualified GRID source-state
     * intervals from Phase 8.6C.
     * --------------------------------------------------------------
     */

    const activeInputRecords =
        getFamilyRecords(
            cleanRecords,
            GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES
        );


    if (
        activeInputRecords.length >
        0
    ) {

        const activeInputTopology =
            qualifyFamilyDevice({
                records:
                    activeInputRecords,

                requiredAttributes:
                    GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES,

                selectedDeviceInstance,

                multipleDeviceReason:
                    GRID_POWER_TOPOLOGY_REASON
                        .MULTIPLE_ACTIVE_INPUT_DEVICES_AMBIGUOUS,

                incompleteReason:
                    GRID_POWER_TOPOLOGY_REASON
                        .INCOMPLETE_ACTIVE_INPUT_PHASES,
            });


        if (
            activeInputTopology.status ===
            GRID_POWER_TOPOLOGY_STATUS
                .QUALIFIED
        ) {

            return {
                status:
                    GRID_POWER_TOPOLOGY_STATUS
                        .CONDITIONAL,

                reason:
                    GRID_POWER_TOPOLOGY_REASON
                        .ACTIVE_INPUT_REQUIRES_GRID_SOURCE_QUALIFICATION,

                source:
                    GRID_POWER_SOURCE
                        .ACTIVE_INPUT_CONDITIONAL,

                sourceAttributes:
                    GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES,

                sourceIdentityRequired:
                    true,

                requiredSourceCode:
                    GRID_ACTIVE_SOURCE
                        .GRID,

                topology:
                    activeInputTopology,

                records:
                    activeInputTopology.records,

                evidence: {
                    inputRecordCount:
                        records.length,

                    normalizedRecordCount:
                        normalized.length,

                    deduplicatedRecordCount:
                        cleanRecords.length,

                    duplicateCount:
                        deduplicated
                            .duplicateCount,

                    conflictingDuplicateCount:
                        deduplicated
                            .conflictingDuplicateCount,

                    directGridRecordCount:
                        directRecords.length,

                    activeInputRecordCount:
                        activeInputRecords.length,
                },

                semantics: {
                    directGridMeasurement:
                        false,

                    gridSourceStateRequired:
                        true,

                    gridAvailabilityEstablished:
                        false,

                    gridOutageEstablished:
                        false,

                    importExportDirectionEstablished:
                        false,

                    powerUnitEstablished:
                        false,
                },
            };
        }


        return {
            status:
                activeInputTopology.status,

            reason:
                activeInputTopology.reason,

            source:
                GRID_POWER_SOURCE
                    .ACTIVE_INPUT_CONDITIONAL,

            sourceAttributes:
                GRID_CONDITIONAL_ACTIVE_INPUT_POWER_ATTRIBUTES,

            sourceIdentityRequired:
                true,

            requiredSourceCode:
                GRID_ACTIVE_SOURCE
                    .GRID,

            topology:
                activeInputTopology,

            records:
                [],

            evidence: {
                inputRecordCount:
                    records.length,

                normalizedRecordCount:
                    normalized.length,

                deduplicatedRecordCount:
                    cleanRecords.length,

                duplicateCount:
                    deduplicated
                        .duplicateCount,

                conflictingDuplicateCount:
                    deduplicated
                        .conflictingDuplicateCount,

                directGridRecordCount:
                    directRecords.length,

                activeInputRecordCount:
                    activeInputRecords.length,
            },

            semantics: {
                directGridMeasurement:
                    false,

                gridSourceStateRequired:
                    true,

                gridAvailabilityEstablished:
                    false,

                gridOutageEstablished:
                    false,

                importExportDirectionEstablished:
                    false,

                powerUnitEstablished:
                    false,
            },
        };
    }


    return {
        status:
            GRID_POWER_TOPOLOGY_STATUS
                .UNAVAILABLE,

        reason:
            GRID_POWER_TOPOLOGY_REASON
                .NO_GRID_POWER_EVIDENCE,

        source:
            GRID_POWER_SOURCE
                .NONE,

        sourceAttributes:
            [],

        sourceIdentityRequired:
            false,

        requiredSourceCode:
            null,

        topology: {
            status:
                GRID_POWER_TOPOLOGY_STATUS
                    .UNAVAILABLE,

            reason:
                GRID_POWER_TOPOLOGY_REASON
                    .NO_GRID_POWER_EVIDENCE,

            selectedDeviceInstance:
                null,

            deviceInstances:
                [],

            records:
                [],
        },

        records:
            [],

        evidence: {
            inputRecordCount:
                records.length,

            normalizedRecordCount:
                normalized.length,

            deduplicatedRecordCount:
                cleanRecords.length,

            duplicateCount:
                deduplicated
                    .duplicateCount,

            conflictingDuplicateCount:
                deduplicated
                    .conflictingDuplicateCount,

            directGridRecordCount:
                0,

            activeInputRecordCount:
                0,
        },

        semantics: {
            directGridMeasurement:
                false,

            gridSourceStateRequired:
                false,

            gridAvailabilityEstablished:
                false,

            gridOutageEstablished:
                false,

            importExportDirectionEstablished:
                false,

            powerUnitEstablished:
                false,
        },
    };
}


/*
|--------------------------------------------------------------------------
| Explicit unit qualification
|--------------------------------------------------------------------------
|
| No magnitude inference.
|--------------------------------------------------------------------------
*/

export function qualifyGridPowerUnit(
    records = []
) {

    const units =
        new Set();


    for (
        const record
        of records
    ) {

        const candidates = [
            record?.unit,
            record?.formatWithUnit,
        ];


        for (
            const candidate
            of candidates
        ) {

            const unit =
                normalizeUnit(
                    candidate
                );


            if (
                unit
            ) {

                units.add(
                    unit
                );
            }
        }
    }


    if (
        units.size ===
        0
    ) {

        return {
            status:
                GRID_POWER_UNIT_STATUS
                    .UNRESOLVED,

            unit:
                GRID_POWER_UNIT
                    .UNRESOLVED,

            observedUnits:
                [],
        };
    }


    if (
        units.size >
        1
    ) {

        return {
            status:
                GRID_POWER_UNIT_STATUS
                    .CONFLICT,

            unit:
                GRID_POWER_UNIT
                    .UNRESOLVED,

            observedUnits:
                Array.from(
                    units
                ),
        };
    }


    const [
        unit,
    ] =
        Array.from(
            units
        );


    return {
        status:
            GRID_POWER_UNIT_STATUS
                .QUALIFIED,

        unit,

        observedUnits: [
            unit,
        ],
    };
}


export default {
    GRID_POWER_SOURCE,
    GRID_POWER_TOPOLOGY_STATUS,
    GRID_POWER_TOPOLOGY_REASON,
    GRID_POWER_UNIT,
    GRID_POWER_UNIT_STATUS,
    GRID_POWER_DIRECTION_STATUS,
    normalizeGridPowerTelemetry,
    removeAmbiguousGridPowerDuplicates,
    selectGridPowerTopology,
    qualifyGridPowerUnit,
};