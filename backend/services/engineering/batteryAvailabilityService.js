// services/engineering/batteryAvailabilityService.js

import {
    BATTERY_AVAILABILITY_STATE,
    BATTERY_AVAILABILITY_SEMANTIC_BOUNDARIES,
    classifyBatteryAvailabilityFromState215,
} from "./batteryAvailabilitySemantics.js";


/*
|--------------------------------------------------------------------------
| Phase 8.4H-C
| Pure Battery Availability Engine
|--------------------------------------------------------------------------
|
| Purpose:
|
| - preserve battery availability evidence semantics
| - return UNAVAILABLE/null when production evidence cannot establish
|   functional battery availability
| - support future explicitly-qualified direct availability signals
| - never infer availability from SOC, power, current, alarms,
|   connectivity, or attr 215 operating mode
|
| Production status:
|
| DIRECT_AVAILABILITY_SIGNAL_ESTABLISHED = false
|
|--------------------------------------------------------------------------
*/


export const BATTERY_AVAILABILITY_STATUS =
    Object.freeze({

        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const BATTERY_AVAILABILITY_REASON =
    Object.freeze({

        DIRECT_AVAILABILITY_SIGNAL_NOT_ESTABLISHED:
            "DIRECT_AVAILABILITY_SIGNAL_NOT_ESTABLISHED",

        NO_BATTERY_EVIDENCE:
            "NO_BATTERY_EVIDENCE",

        INSUFFICIENT_AVAILABILITY_INTERVALS:
            "INSUFFICIENT_AVAILABILITY_INTERVALS",

        MULTIPLE_DEVICES_AMBIGUOUS:
            "MULTIPLE_DEVICES_AMBIGUOUS",

        DIRECT_STATE_INTERVALS_QUALIFIED:
            "DIRECT_STATE_INTERVALS_QUALIFIED",
    });


export const DEFAULT_BATTERY_AVAILABILITY_CONFIG =
    Object.freeze({

        /*
         * Maximum time allowed between consecutive direct-state samples
         * before the interval becomes unknown.
         */

        maxGapMinutes:
            30,

        /*
         * Production default is deliberately null.
         *
         * A future qualified structure would be:
         *
         * {
         *   attributeId: 9999,
         *   states: {
         *     1: "AVAILABLE",
         *     0: "UNAVAILABLE"
         *   }
         * }
         */

        directAvailabilityMapping:
            null,
    });


/*
|--------------------------------------------------------------------------
| Known battery evidence attributes
|--------------------------------------------------------------------------
*/

const BATTERY_EVIDENCE_ATTRIBUTE_IDS =
    Object.freeze([
        39,
        47,
        49,
        51,
        115,
        119,
        120,
        124,
        125,
        144,
        215,
        243,
        273,
        274,
        275,
        276,
        277,
        333,
        334,
        472,
        1035,
        1277,
    ]);


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function finite(
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


function validDate(
    value
) {

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


function normalizeDeviceInstance(
    value
) {

    return String(
        value ??
        "UNKNOWN"
    );
}


function buildReportingWindow(
    start,
    end
) {

    return {
        start,
        end,
        semantics:
            "[start,end)",
    };
}


function buildUnavailableMetric(
    reason,
    metadata = {}
) {

    return {
        key:
            "batteryAvailabilityPercent",

        status:
            BATTERY_AVAILABILITY_STATUS
                .UNAVAILABLE,

        reason,

        value:
            null,

        unit:
            "%",

        metadata,
    };
}


function buildCalculatedMetric(
    value,
    metadata = {}
) {

    return {
        key:
            "batteryAvailabilityPercent",

        status:
            BATTERY_AVAILABILITY_STATUS
                .CALCULATED,

        reason:
            BATTERY_AVAILABILITY_REASON
                .DIRECT_STATE_INTERVALS_QUALIFIED,

        value,

        unit:
            "%",

        metadata,
    };
}


/*
|--------------------------------------------------------------------------
| Device grouping
|--------------------------------------------------------------------------
|
| NOTE:
|
| This Phase 8.4H-C pure engine currently preserves the conservative
| device-group rule established for validation.
|
| Production topology qualification is deferred to Phase 8.4H-D.
|--------------------------------------------------------------------------
*/

function groupByDevice(
    records
) {

    const groups =
        new Map();


    for (
        const record
        of records
    ) {

        const key =
            normalizeDeviceInstance(
                record.deviceInstance
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


    return groups;
}


/*
|--------------------------------------------------------------------------
| Battery evidence
|--------------------------------------------------------------------------
*/

function hasBatteryEvidence(
    records
) {

    return records.some(
        (
            record
        ) => {

            const attributeId =
                Number(
                    record.vrmAttributeId
                );


            return BATTERY_EVIDENCE_ATTRIBUTE_IDS
                .includes(
                    attributeId
                );
        }
    );
}


/*
|--------------------------------------------------------------------------
| Evidence summary
|--------------------------------------------------------------------------
*/

function buildEvidenceSummary(
    records
) {

    const attributes =
        new Set(
            records.map(
                (
                    record
                ) =>
                    Number(
                        record.vrmAttributeId
                    )
            )
        );


    const state215Records =
        records.filter(
            (
                record
            ) =>
                Number(
                    record.vrmAttributeId
                ) ===
                215
        );


    const observedStateCodes =
        Array.from(
            new Set(
                state215Records
                    .map(
                        (
                            record
                        ) =>
                            finite(
                                record.numericValue ??
                                record.value
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
        ).sort(
            (
                a,
                b
            ) =>
                a -
                b
        );


    return {

        anyBatteryEvidence:
            records.length >
            0,

        operatingModeObserved:
            attributes.has(
                215
            ),

        functionalEvidenceObserved:
            attributes.has(
                243
            ) ||
            attributes.has(
                49
            ),

        healthEvidenceObserved:
            [
                39,
                47,
                51,
                115,
                144,
                273,
                1035,
            ].some(
                (
                    attributeId
                ) =>
                    attributes.has(
                        attributeId
                    )
            ),

        conditionalAlarmEvidenceObserved:
            [
                119,
                120,
                124,
                125,
            ].some(
                (
                    attributeId
                ) =>
                    attributes.has(
                        attributeId
                    )
            ),

        controlLimitEvidenceObserved:
            [
                274,
                275,
                276,
                277,
            ].some(
                (
                    attributeId
                ) =>
                    attributes.has(
                        attributeId
                    )
            ),

        configurationEvidenceObserved:
            [
                333,
                334,
                472,
                1277,
            ].some(
                (
                    attributeId
                ) =>
                    attributes.has(
                        attributeId
                    )
            ),

        observedState215Codes:
            observedStateCodes,
    };
}


/*
|--------------------------------------------------------------------------
| Direct-state qualification
|--------------------------------------------------------------------------
|
| This function is ONLY for an explicitly supplied and qualified direct
| availability mapping.
|
| It does not apply to attr 215.
|--------------------------------------------------------------------------
*/

function qualifyDirectAvailabilityState(
    record,
    directAvailabilityMapping
) {

    if (
        !directAvailabilityMapping
    ) {

        return BATTERY_AVAILABILITY_STATE
            .UNKNOWN;
    }


    const value =
        finite(
            record.numericValue ??
            record.value
        );


    if (
        value ===
        null
    ) {

        return BATTERY_AVAILABILITY_STATE
            .UNKNOWN;
    }


    const mapped =
        directAvailabilityMapping[
            String(
                value
            )
        ];


    if (
        mapped ===
            BATTERY_AVAILABILITY_STATE
                .AVAILABLE ||
        mapped ===
            BATTERY_AVAILABILITY_STATE
                .UNAVAILABLE
    ) {

        return mapped;
    }


    return BATTERY_AVAILABILITY_STATE
        .UNKNOWN;
}


/*
|--------------------------------------------------------------------------
| Direct availability interval calculation
|--------------------------------------------------------------------------
|
| Piecewise-constant state assumption:
|
| Current sample state applies until the next qualified sample.
|
| Long gaps are never bridged.
|
| An exact sample at the reporting-window `end` can be supplied solely
| as a boundary marker to close the preceding interval.
|--------------------------------------------------------------------------
*/

function calculateDirectAvailabilityIntervals({
    records,
    start,
    end,
    maxGapMinutes,
    directAvailabilityMapping,
}) {

    const maxGapMs =
        maxGapMinutes *
        60 *
        1000;


    const points =
        records
            .map(
                (
                    record
                ) => ({

                    timestamp:
                        validDate(
                            record.timestamp
                        ),

                    state:
                        qualifyDirectAvailabilityState(
                            record,
                            directAvailabilityMapping
                        ),
                })
            )
            .filter(
                (
                    point
                ) =>
                    point.timestamp !==
                    null
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.timestamp -
                    b.timestamp
            );


    let availableMs =
        0;

    let unavailableMs =
        0;

    let qualifiedMs =
        0;

    let unknownMs =
        0;

    let intervalCount =
        0;

    let longGapCount =
        0;


    for (
        let index = 0;
        index <
            points.length -
            1;
        index +=
            1
    ) {

        const current =
            points[
                index
            ];


        const next =
            points[
                index +
                1
            ];


        /*
         * Clip the interval to the reporting window.
         */

        const intervalStartMs =
            Math.max(
                current.timestamp.getTime(),
                start.getTime()
            );


        const intervalEndMs =
            Math.min(
                next.timestamp.getTime(),
                end.getTime()
            );


        const durationMs =
            intervalEndMs -
            intervalStartMs;


        if (
            durationMs <=
            0
        ) {

            continue;
        }


        const sourceGapMs =
            next.timestamp.getTime() -
            current.timestamp.getTime();


        /*
         * Never bridge a telemetry gap larger than the configured
         * evidence threshold.
         */

        if (
            sourceGapMs >
            maxGapMs
        ) {

            unknownMs +=
                durationMs;

            longGapCount +=
                1;

            continue;
        }


        if (
            current.state ===
            BATTERY_AVAILABILITY_STATE
                .AVAILABLE
        ) {

            availableMs +=
                durationMs;

            qualifiedMs +=
                durationMs;

            intervalCount +=
                1;

            continue;
        }


        if (
            current.state ===
            BATTERY_AVAILABILITY_STATE
                .UNAVAILABLE
        ) {

            unavailableMs +=
                durationMs;

            qualifiedMs +=
                durationMs;

            intervalCount +=
                1;

            continue;
        }


        unknownMs +=
            durationMs;
    }


    return {

        availableHours:
            availableMs /
            3600000,

        unavailableHours:
            unavailableMs /
            3600000,

        qualifiedHours:
            qualifiedMs /
            3600000,

        unknownHours:
            unknownMs /
            3600000,

        intervalCount,

        longGapCount,
    };
}


/*
|--------------------------------------------------------------------------
| Main calculation
|--------------------------------------------------------------------------
*/

export function calculateBatteryAvailability({
    records = [],
    start,
    end,
    selectedDeviceInstance = null,
    config = {},
} = {}) {

    /*
    |--------------------------------------------------------------------------
    | Reporting window validation
    |--------------------------------------------------------------------------
    */

    const reportingStart =
        validDate(
            start
        );


    const reportingEnd =
        validDate(
            end
        );


    if (
        !reportingStart ||
        !reportingEnd ||
        reportingStart >=
            reportingEnd
    ) {

        throw new Error(
            "Valid [start,end) reporting window is required."
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Configuration
    |--------------------------------------------------------------------------
    */

    const resolvedConfig =
        {
            ...DEFAULT_BATTERY_AVAILABILITY_CONFIG,
            ...config,
        };


    if (
        !Number.isFinite(
            Number(
                resolvedConfig
                    .maxGapMinutes
            )
        ) ||
        Number(
            resolvedConfig
                .maxGapMinutes
        ) <=
            0
    ) {

        throw new Error(
            "maxGapMinutes must be a finite number greater than zero."
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Standard [start,end) observations
    |--------------------------------------------------------------------------
    |
    | Exact `end` observations are excluded here.
    |--------------------------------------------------------------------------
    */

    const candidateRecords =
        records.filter(
            (
                record
            ) => {

                const timestamp =
                    validDate(
                        record.timestamp
                    );


                return (
                    timestamp !==
                        null &&
                    timestamp >=
                        reportingStart &&
                    timestamp <
                        reportingEnd
                );
            }
        );


    const reportingWindow =
        buildReportingWindow(
            reportingStart,
            reportingEnd
        );


    const evidence =
        buildEvidenceSummary(
            candidateRecords
        );


    /*
    |--------------------------------------------------------------------------
    | Configured direct availability attribute
    |--------------------------------------------------------------------------
    |
    | Production default is null.
    |
    | This branch allows the pure engine to be validated against a
    | synthetic/future explicitly-qualified signal without falsely
    | requiring that attribute to appear in our present VRM battery
    | evidence attribute list.
    |--------------------------------------------------------------------------
    */

    const directAvailabilityAttributeId =
        resolvedConfig
            .directAvailabilityMapping
            ?.attributeId !==
            undefined &&
        resolvedConfig
            .directAvailabilityMapping
            ?.attributeId !==
            null
            ? Number(
                resolvedConfig
                    .directAvailabilityMapping
                    .attributeId
            )
            : null;


    const hasConfiguredDirectEvidence =
        directAvailabilityAttributeId !==
            null &&
        Number.isFinite(
            directAvailabilityAttributeId
        ) &&
        records.some(
            (
                record
            ) => {

                const timestamp =
                    validDate(
                        record.timestamp
                    );


                return (
                    timestamp !==
                        null &&
                    timestamp >=
                        reportingStart &&
                    timestamp <=
                        reportingEnd &&
                    Number(
                        record.vrmAttributeId
                    ) ===
                        directAvailabilityAttributeId
                );
            }
        );


    /*
    |--------------------------------------------------------------------------
    | No evidence
    |--------------------------------------------------------------------------
    */

    if (
        !hasBatteryEvidence(
            candidateRecords
        ) &&
        !hasConfiguredDirectEvidence
    ) {

        return {

            family:
                "BATTERY_AVAILABILITY",

            status:
                BATTERY_AVAILABILITY_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            availability:
                buildUnavailableMetric(
                    BATTERY_AVAILABILITY_REASON
                        .NO_BATTERY_EVIDENCE
                ),

            evidence,

            boundaries:
                BATTERY_AVAILABILITY_SEMANTIC_BOUNDARIES,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Device grouping
    |--------------------------------------------------------------------------
    */

    const deviceGroups =
        groupByDevice(
            candidateRecords
        );


    let selectedRecords =
        candidateRecords;


    let selectedDeviceKey =
        null;


    if (
        selectedDeviceInstance !==
            null &&
        selectedDeviceInstance !==
            undefined
    ) {

        selectedDeviceKey =
            String(
                selectedDeviceInstance
            );


        selectedRecords =
            deviceGroups.get(
                selectedDeviceKey
            ) ??
            [];
    }
    else if (
        deviceGroups.size >
        1
    ) {

        return {

            family:
                "BATTERY_AVAILABILITY",

            status:
                BATTERY_AVAILABILITY_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            availability:
                buildUnavailableMetric(
                    BATTERY_AVAILABILITY_REASON
                        .MULTIPLE_DEVICES_AMBIGUOUS,
                    {
                        deviceInstances:
                            Array.from(
                                deviceGroups.keys()
                            ),
                    }
                ),

            evidence,

            boundaries:
                BATTERY_AVAILABILITY_SEMANTIC_BOUNDARIES,
        };
    }
    else if (
        deviceGroups.size ===
        1
    ) {

        selectedDeviceKey =
            Array.from(
                deviceGroups.keys()
            )[0];
    }


    /*
    |--------------------------------------------------------------------------
    | Production-safe branch
    |--------------------------------------------------------------------------
    |
    | Current ASHMAAN production evidence has NO qualified direct battery
    | availability signal.
    |
    | Attr 215 is deliberately classified only as an operating-mode
    | signal and must not create uptime/downtime.
    |--------------------------------------------------------------------------
    */

    if (
        !resolvedConfig
            .directAvailabilityMapping
    ) {

        const state215Evidence =
            selectedRecords
                .filter(
                    (
                        record
                    ) =>
                        Number(
                            record.vrmAttributeId
                        ) ===
                        215
                )
                .map(
                    (
                        record
                    ) =>
                        classifyBatteryAvailabilityFromState215(
                            record.numericValue ??
                            record.value
                        )
                );


        return {

            family:
                "BATTERY_AVAILABILITY",

            status:
                BATTERY_AVAILABILITY_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            availability:
                buildUnavailableMetric(
                    BATTERY_AVAILABILITY_REASON
                        .DIRECT_AVAILABILITY_SIGNAL_NOT_ESTABLISHED,
                    {

                        selectedDeviceInstance:
                            selectedDeviceKey,

                        state215AvailabilityClassifications:
                            state215Evidence,
                    }
                ),

            evidence:
                buildEvidenceSummary(
                    selectedRecords
                ),

            boundaries:
                BATTERY_AVAILABILITY_SEMANTIC_BOUNDARIES,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Explicit direct availability mapping validation
    |--------------------------------------------------------------------------
    |
    | This is a pure-engine capability path.
    |
    | It does NOT establish production semantics.
    |--------------------------------------------------------------------------
    */

    if (
        directAvailabilityAttributeId ===
            null ||
        !Number.isFinite(
            directAvailabilityAttributeId
        ) ||
        !resolvedConfig
            .directAvailabilityMapping
            .states ||
        typeof resolvedConfig
            .directAvailabilityMapping
            .states !==
            "object"
    ) {

        return {

            family:
                "BATTERY_AVAILABILITY",

            status:
                BATTERY_AVAILABILITY_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            availability:
                buildUnavailableMetric(
                    BATTERY_AVAILABILITY_REASON
                        .INSUFFICIENT_AVAILABILITY_INTERVALS,
                    {
                        directAvailabilityMappingValid:
                            false,
                    }
                ),

            evidence:
                buildEvidenceSummary(
                    selectedRecords
                ),

            boundaries:
                BATTERY_AVAILABILITY_SEMANTIC_BOUNDARIES,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Direct-state records
    |--------------------------------------------------------------------------
    |
    | Important:
    |
    | Standard observations follow [start,end).
    |
    | However, an exact sample at `end` is allowed ONLY as a boundary
    | marker so that the preceding state interval can be closed.
    |
    | Example:
    |
    | 01:00 AVAILABLE
    | 02:00 AVAILABLE
    | 03:00 UNAVAILABLE
    | 04:00 AVAILABLE  <- reporting end marker
    |
    | Qualified exposure:
    |
    | 01→02 AVAILABLE
    | 02→03 AVAILABLE
    | 03→04 UNAVAILABLE
    |
    | The value at 04:00 contributes no duration itself.
    |--------------------------------------------------------------------------
    */

    const directRecords =
        records.filter(
            (
                record
            ) => {

                const timestamp =
                    validDate(
                        record.timestamp
                    );


                if (
                    !timestamp
                ) {

                    return false;
                }


                if (
                    Number(
                        record.vrmAttributeId
                    ) !==
                    directAvailabilityAttributeId
                ) {

                    return false;
                }


                /*
                 * Inclusive `end` only for boundary-state closure.
                 */

                if (
                    timestamp <
                        reportingStart ||
                    timestamp >
                        reportingEnd
                ) {

                    return false;
                }


                if (
                    selectedDeviceKey !==
                        null &&
                    normalizeDeviceInstance(
                        record.deviceInstance
                    ) !==
                        selectedDeviceKey
                ) {

                    return false;
                }


                return true;
            }
        );


    /*
    |--------------------------------------------------------------------------
    | Calculate qualified exposure
    |--------------------------------------------------------------------------
    */

    const intervalResult =
        calculateDirectAvailabilityIntervals({

            records:
                directRecords,

            start:
                reportingStart,

            end:
                reportingEnd,

            maxGapMinutes:
                Number(
                    resolvedConfig
                        .maxGapMinutes
                ),

            directAvailabilityMapping:
                resolvedConfig
                    .directAvailabilityMapping
                    .states,
        });


    /*
    |--------------------------------------------------------------------------
    | No qualified intervals
    |--------------------------------------------------------------------------
    */

    if (
        intervalResult
            .qualifiedHours <=
        0
    ) {

        return {

            family:
                "BATTERY_AVAILABILITY",

            status:
                BATTERY_AVAILABILITY_STATUS
                    .UNAVAILABLE,

            reportingWindow,

            availability:
                buildUnavailableMetric(
                    BATTERY_AVAILABILITY_REASON
                        .INSUFFICIENT_AVAILABILITY_INTERVALS,
                    {
                        ...intervalResult,

                        directAvailabilityAttributeId,

                        selectedDeviceInstance:
                            selectedDeviceKey,
                    }
                ),

            evidence:
                buildEvidenceSummary(
                    selectedRecords
                ),

            boundaries:
                BATTERY_AVAILABILITY_SEMANTIC_BOUNDARIES,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Availability calculation
    |--------------------------------------------------------------------------
    |
    | Availability denominator is QUALIFIED availability exposure only.
    |
    | Unknown/unobserved intervals are NOT silently counted as available
    | or unavailable.
    |--------------------------------------------------------------------------
    */

    const availabilityPercent =
        (
            intervalResult
                .availableHours /
            intervalResult
                .qualifiedHours
        ) *
        100;


    return {

        family:
            "BATTERY_AVAILABILITY",

        status:
            BATTERY_AVAILABILITY_STATUS
                .CALCULATED,

        reportingWindow,

        availability:
            buildCalculatedMetric(
                availabilityPercent,
                {

                    ...intervalResult,

                    directAvailabilityAttributeId,

                    selectedDeviceInstance:
                        selectedDeviceKey,

                    exactEndBoundaryAllowed:
                        true,

                    denominator:
                        "QUALIFIED_DIRECT_AVAILABILITY_EXPOSURE",
                }
            ),

        evidence:
            buildEvidenceSummary(
                selectedRecords
            ),

        boundaries:
            BATTERY_AVAILABILITY_SEMANTIC_BOUNDARIES,
    };
}


export default {

    BATTERY_AVAILABILITY_STATUS,

    BATTERY_AVAILABILITY_REASON,

    DEFAULT_BATTERY_AVAILABILITY_CONFIG,

    calculateBatteryAvailability,
};