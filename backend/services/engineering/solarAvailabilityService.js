// services/engineering/solarAvailabilityService.js

import {
    SOLAR_ATTRIBUTE_MAP,
} from "./solarAttributeMap.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 8.7G — Solar Availability Foundation
|--------------------------------------------------------------------------
|
| Purpose:
|
| Establish a strict engineering boundary between:
|
|   - telemetry observability
|   - operating state
|   - generation state
|   - fault / error indications
|   - functional availability
|   - downtime
|
| Current production solar telemetry does NOT contain a qualified direct
| functional-availability signal.
|
| Therefore this service MUST NOT derive a numerical solar availability
| percentage from:
|
|   442 — PV power
|   84  — charger mode
|   85  — charger state
|   98  — error code
|   518 — MPPT state
|   583 — off reason
|   86  — PV voltage
|
| These attributes remain supporting evidence only.
|--------------------------------------------------------------------------
*/


export const SOLAR_AVAILABILITY_PHASE =
    "8.7G";


export const SOLAR_AVAILABILITY_FAMILY =
    "SOLAR_AVAILABILITY";


export const SOLAR_AVAILABILITY_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const SOLAR_AVAILABILITY_REASON =
    Object.freeze({
        DIRECT_AVAILABILITY_SIGNAL_QUALIFIED:
            "DIRECT_AVAILABILITY_SIGNAL_QUALIFIED",

        DIRECT_AVAILABILITY_SIGNAL_NOT_ESTABLISHED:
            "DIRECT_AVAILABILITY_SIGNAL_NOT_ESTABLISHED",

        NO_SOLAR_AVAILABILITY_EVIDENCE:
            "NO_SOLAR_AVAILABILITY_EVIDENCE",

        DEVICE_TOPOLOGY_AMBIGUOUS:
            "DEVICE_TOPOLOGY_AMBIGUOUS",

        SELECTED_DEVICE_NOT_FOUND:
            "SELECTED_DEVICE_NOT_FOUND",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",
    });


export const SOLAR_AVAILABILITY_REFERENCE_STATUS =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        SUPPORTING_ONLY:
            "SUPPORTING_ONLY",

        AMBIGUOUS:
            "AMBIGUOUS",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


export const SOLAR_AVAILABILITY_EVIDENCE_ROLE =
    Object.freeze({
        GENERATION:
            "GENERATION",

        OPERATING_MODE:
            "OPERATING_MODE",

        OPERATING_STATE:
            "OPERATING_STATE",

        ERROR_INDICATION:
            "ERROR_INDICATION",

        MPPT_STATE:
            "MPPT_STATE",

        OFF_REASON:
            "OFF_REASON",

        PV_VOLTAGE:
            "PV_VOLTAGE",
    });


export const DEFAULT_SOLAR_AVAILABILITY_CONFIG =
    Object.freeze({
        requireValidQuality:
            true,

        requireRawAggregation:
            true,

        /*
         * Deliberately empty in Phase 8.7G.
         *
         * A future production-qualified direct availability signal may be
         * injected only after its semantics are independently established.
         */
        directAvailabilityMappings:
            Object.freeze([]),
    });


export const SOLAR_AVAILABILITY_BOUNDARIES =
    Object.freeze({
        missingTelemetryMeansZeroAvailability:
            false,

        noTelemetryMeansNoSolarInstallation:
            false,

        telemetryObservedMeansAvailable:
            false,

        telemetryMissingMeansUnavailable:
            false,

        positivePvPowerMeansAvailable:
            false,

        zeroPvPowerMeansUnavailable:
            false,

        zeroPvPowerMeansFailure:
            false,

        negativePvPowerMeansUnavailable:
            false,

        chargerModeMeansAvailable:
            false,

        chargerModeOffMeansUnavailable:
            false,

        chargerStateMeansAvailable:
            false,

        mpptActiveMeansAvailable:
            false,

        mpptInactiveMeansUnavailable:
            false,

        errorCodeZeroMeansAvailable:
            false,

        errorCodeNonZeroMeansUnavailable:
            false,

        errorIndicationCreatesDowntime:
            false,

        offReasonCreatesDowntime:
            false,

        positivePvVoltageMeansAvailable:
            false,

        operatingStateEqualsAvailability:
            false,

        generationStateEqualsAvailability:
            false,

        faultIndicationEqualsDowntime:
            false,

        observabilityEqualsFunctionalAvailability:
            false,

        availabilityPercentageCalculatedWithoutDirectSignal:
            false,

        multipleDevicesAutomaticallyAggregated:
            false,

        dayNightStateInferred:
            false,

        irradianceInferred:
            false,

        downtimeCalculated:
            false,

        mtbfCalculated:
            false,

        mttrCalculated:
            false,
    });


const ATTRIBUTES =
    Object.freeze({
        PV_POWER:
            SOLAR_ATTRIBUTE_MAP
                .PV_POWER
                .id,

        CHARGER_MODE:
            SOLAR_ATTRIBUTE_MAP
                .CHARGER_MODE
                .id,

        CHARGER_STATE:
            SOLAR_ATTRIBUTE_MAP
                .CHARGER_STATE
                .id,

        ERROR_CODE:
            SOLAR_ATTRIBUTE_MAP
                .ERROR_CODE
                .id,

        MPPT_STATE:
            SOLAR_ATTRIBUTE_MAP
                .MPPT_STATE
                .id,

        OFF_REASON:
            SOLAR_ATTRIBUTE_MAP
                .OFF_REASON
                .id,

        PV_VOLTAGE:
            SOLAR_ATTRIBUTE_MAP
                .PV_VOLTAGE
                .id,
    });


const SUPPORTING_ATTRIBUTE_IDS =
    Object.freeze(
        Object.values(
            ATTRIBUTES
        )
    );


const ROLE_BY_ATTRIBUTE =
    Object.freeze({
        [ATTRIBUTES.PV_POWER]:
            SOLAR_AVAILABILITY_EVIDENCE_ROLE
                .GENERATION,

        [ATTRIBUTES.CHARGER_MODE]:
            SOLAR_AVAILABILITY_EVIDENCE_ROLE
                .OPERATING_MODE,

        [ATTRIBUTES.CHARGER_STATE]:
            SOLAR_AVAILABILITY_EVIDENCE_ROLE
                .OPERATING_STATE,

        [ATTRIBUTES.ERROR_CODE]:
            SOLAR_AVAILABILITY_EVIDENCE_ROLE
                .ERROR_INDICATION,

        [ATTRIBUTES.MPPT_STATE]:
            SOLAR_AVAILABILITY_EVIDENCE_ROLE
                .MPPT_STATE,

        [ATTRIBUTES.OFF_REASON]:
            SOLAR_AVAILABILITY_EVIDENCE_ROLE
                .OFF_REASON,

        [ATTRIBUTES.PV_VOLTAGE]:
            SOLAR_AVAILABILITY_EVIDENCE_ROLE
                .PV_VOLTAGE,
    });


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function validDate(
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
    if (
        value === null ||
        value === undefined ||
        value === ""
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


function numericValue(
    record
) {
    return (
        finiteNumber(
            record
                ?.numericValue
        ) ??
        finiteNumber(
            record
                ?.value
        )
    );
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


function recordPassesBoundary({
    record,
    start,
    end,
    config,
}) {
    const timestamp =
        validDate(
            record
                ?.timestamp
        );


    if (
        !timestamp ||
        timestamp <
            start ||
        timestamp >=
            end
    ) {
        return false;
    }


    if (
        config
            .requireValidQuality &&
        record
            ?.quality !==
            "VALID"
    ) {
        return false;
    }


    if (
        config
            .requireRawAggregation &&
        record
            ?.aggregationLevel !==
            "RAW"
    ) {
        return false;
    }


    return true;
}


function isSupportingAttribute(
    record
) {
    return SUPPORTING_ATTRIBUTE_IDS
        .includes(
            Number(
                record
                    ?.vrmAttributeId
            )
        );
}


function distinctDeviceInstances(
    records
) {
    return Array.from(
        new Set(
            records.map(
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
}


function filterDevice(
    records,
    deviceInstance
) {
    const normalized =
        normalizeDeviceInstance(
            deviceInstance
        );


    return records.filter(
        (
            record
        ) =>
            normalizeDeviceInstance(
                record
                    ?.deviceInstance
            ) ===
            normalized
    );
}


/*
|--------------------------------------------------------------------------
| Deduplication
|--------------------------------------------------------------------------
|
| Identical same-timestamp observations for the same attribute are
| deduplicated.
|
| Conflicting same-timestamp observations are discarded.
|--------------------------------------------------------------------------
*/

function prepareAttributeSeries(
    records,
    attributeId
) {
    const attributeRecords =
        records.filter(
            (
                record
            ) =>
                Number(
                    record
                        ?.vrmAttributeId
                ) ===
                Number(
                    attributeId
                )
        );


    const grouped =
        new Map();


    for (
        const record
        of attributeRecords
    ) {
        const timestamp =
            validDate(
                record
                    ?.timestamp
            );


        const value =
            numericValue(
                record
            );


        if (
            !timestamp ||
            value ===
                null
        ) {
            continue;
        }


        const key =
            timestamp
                .toISOString();


        if (
            !grouped.has(
                key
            )
        ) {
            grouped.set(
                key,
                []
            );
        }


        grouped
            .get(
                key
            )
            .push({
                timestamp,
                value,
                record,
            });
    }


    const series =
        [];


    let duplicateTimestampCount =
        0;


    let conflictingTimestampCount =
        0;


    for (
        const observations
        of grouped.values()
    ) {
        const values =
            Array.from(
                new Set(
                    observations.map(
                        (
                            observation
                        ) =>
                            observation
                                .value
                    )
                )
            );


        if (
            values.length >
            1
        ) {
            conflictingTimestampCount +=
                1;

            continue;
        }


        if (
            observations.length >
            1
        ) {
            duplicateTimestampCount +=
                observations.length -
                1;
        }


        series.push(
            observations[
                0
            ]
        );
    }


    series.sort(
        (
            a,
            b
        ) =>
            a.timestamp -
            b.timestamp
    );


    return {
        attributeId,

        role:
            ROLE_BY_ATTRIBUTE[
                attributeId
            ] ??
            null,

        candidateRecordCount:
            attributeRecords
                .length,

        recordsUsed:
            series
                .length,

        observed:
            series.length >
            0,

        latestValue:
            series.length >
            0
                ? series[
                    series.length -
                    1
                ].value
                : null,

        latestAt:
            series.length >
            0
                ? series[
                    series.length -
                    1
                ].timestamp
                : null,

        duplicateTimestampCount,

        conflictingTimestampCount,

        /*
         * Deliberately not decoded into AVAILABLE / UNAVAILABLE.
         */
        availabilityState:
            null,

        establishesAvailability:
            false,

        establishesDowntime:
            false,
    };
}


/*
|--------------------------------------------------------------------------
| Evidence summary
|--------------------------------------------------------------------------
*/

function buildEvidenceSummary(
    records
) {
    return {
        pvPower:
            prepareAttributeSeries(
                records,
                ATTRIBUTES
                    .PV_POWER
            ),

        chargerMode:
            prepareAttributeSeries(
                records,
                ATTRIBUTES
                    .CHARGER_MODE
            ),

        chargerState:
            prepareAttributeSeries(
                records,
                ATTRIBUTES
                    .CHARGER_STATE
            ),

        errorCode:
            prepareAttributeSeries(
                records,
                ATTRIBUTES
                    .ERROR_CODE
            ),

        mpptState:
            prepareAttributeSeries(
                records,
                ATTRIBUTES
                    .MPPT_STATE
            ),

        offReason:
            prepareAttributeSeries(
                records,
                ATTRIBUTES
                    .OFF_REASON
            ),

        pvVoltage:
            prepareAttributeSeries(
                records,
                ATTRIBUTES
                    .PV_VOLTAGE
            ),
    };
}


function emptyEvidence() {
    return buildEvidenceSummary(
        []
    );
}


function countObservedFamilies(
    evidence
) {
    return Object.values(
        evidence
    ).filter(
        (
            item
        ) =>
            item
                .observed
    ).length;
}


/*
|--------------------------------------------------------------------------
| Direct availability mapping
|--------------------------------------------------------------------------
|
| Phase 8.7G production default:
|
|     []
|
| A mapping may be injected in a future phase only after the underlying
| telemetry semantics have been independently qualified.
|--------------------------------------------------------------------------
*/

function findDirectMapping({
    records,
    mappings,
}) {
    if (
        !Array.isArray(
            mappings
        ) ||
        mappings.length ===
            0
    ) {
        return null;
    }


    for (
        const mapping
        of mappings
    ) {
        if (
            !mapping ||
            !Number.isFinite(
                Number(
                    mapping
                        .attributeId
                )
            ) ||
            typeof mapping
                .decode !==
                "function"
        ) {
            continue;
        }


        const attributeId =
            Number(
                mapping
                    .attributeId
            );


        const prepared =
            prepareAttributeSeries(
                records,
                attributeId
            );


        if (
            prepared
                .recordsUsed ===
            0
        ) {
            continue;
        }


        const decoded =
            prepared
                .recordsUsed >
                0
                ? mapping.decode(
                    prepared
                        .latestValue
                )
                : null;


        if (
            decoded ===
                true ||
            decoded ===
                false
        ) {
            return {
                attributeId,

                available:
                    decoded,

                latestValue:
                    prepared
                        .latestValue,

                latestAt:
                    prepared
                        .latestAt,

                mappingName:
                    mapping
                        .name ??
                    null,
            };
        }
    }


    return null;
}


/*
|--------------------------------------------------------------------------
| Empty / unavailable result
|--------------------------------------------------------------------------
*/

function buildUnavailableResult({
    reason,
    start,
    end,
    totalInputRecords = 0,
    qualifiedInputRecords = 0,
    candidateRecords = 0,
    observedDeviceInstances = [],
    selectedDeviceInstance = null,
    ambiguous = false,
    evidence = null,
}) {
    const resolvedEvidence =
        evidence ??
        emptyEvidence();


    return {
        family:
            SOLAR_AVAILABILITY_FAMILY,

        phase:
            SOLAR_AVAILABILITY_PHASE,

        status:
            SOLAR_AVAILABILITY_STATUS
                .UNAVAILABLE,

        reason,

        reportingWindow: {
            start,
            end,
            semantics:
                "[start,end)",
        },

        topology: {
            status:
                ambiguous
                    ? SOLAR_AVAILABILITY_REFERENCE_STATUS
                        .AMBIGUOUS
                    : observedDeviceInstances
                        .length >
                        0
                        ? SOLAR_AVAILABILITY_REFERENCE_STATUS
                            .SUPPORTING_ONLY
                        : SOLAR_AVAILABILITY_REFERENCE_STATUS
                            .UNAVAILABLE,

            observedDeviceInstances,

            selectedDeviceInstance,

            ambiguous,
        },

        availability: {
            value:
                null,

            unit:
                "%",

            status:
                SOLAR_AVAILABILITY_STATUS
                    .UNAVAILABLE,

            eligible:
                false,

            numeratorSeconds:
                null,

            denominatorSeconds:
                null,

            uptimeSeconds:
                null,

            downtimeSeconds:
                null,

            directSignalEstablished:
                false,
        },

        evidence: {
            totalInputRecords,
            qualifiedInputRecords,
            candidateRecords,

            observedEvidenceFamilies:
                countObservedFamilies(
                    resolvedEvidence
                ),

            ...resolvedEvidence,
        },

        boundaries:
            SOLAR_AVAILABILITY_BOUNDARIES,
    };
}


/*
|--------------------------------------------------------------------------
| Main service
|--------------------------------------------------------------------------
*/

export function calculateSolarAvailability({
    records = [],
    start,
    end,
    selectedDeviceInstance =
        null,
    config = {},
} = {}) {
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
        return buildUnavailableResult({
            reason:
                SOLAR_AVAILABILITY_REASON
                    .INVALID_REPORTING_WINDOW,

            start:
                reportingStart,

            end:
                reportingEnd,

            totalInputRecords:
                Array.isArray(
                    records
                )
                    ? records.length
                    : 0,
        });
    }


    const resolvedConfig = {
        ...DEFAULT_SOLAR_AVAILABILITY_CONFIG,
        ...config,
    };


    const inputRecords =
        Array.isArray(
            records
        )
            ? records
            : [];


    const qualifiedRecords =
        inputRecords.filter(
            (
                record
            ) =>
                recordPassesBoundary({
                    record,
                    start:
                        reportingStart,
                    end:
                        reportingEnd,
                    config:
                        resolvedConfig,
                })
        );


    const candidateRecords =
        qualifiedRecords.filter(
            isSupportingAttribute
        );


    if (
        candidateRecords.length ===
        0
    ) {
        return buildUnavailableResult({
            reason:
                SOLAR_AVAILABILITY_REASON
                    .NO_SOLAR_AVAILABILITY_EVIDENCE,

            start:
                reportingStart,

            end:
                reportingEnd,

            totalInputRecords:
                inputRecords
                    .length,

            qualifiedInputRecords:
                qualifiedRecords
                    .length,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Device topology
    |--------------------------------------------------------------------------
    */

    const observedDeviceInstances =
        distinctDeviceInstances(
            candidateRecords
        );


    let selectedRecords =
        candidateRecords;


    let resolvedDeviceInstance =
        null;


    if (
        selectedDeviceInstance !==
            null &&
        selectedDeviceInstance !==
            undefined
    ) {
        resolvedDeviceInstance =
            normalizeDeviceInstance(
                selectedDeviceInstance
            );


        selectedRecords =
            filterDevice(
                candidateRecords,
                selectedDeviceInstance
            );


        if (
            selectedRecords.length ===
            0
        ) {
            return buildUnavailableResult({
                reason:
                    SOLAR_AVAILABILITY_REASON
                        .SELECTED_DEVICE_NOT_FOUND,

                start:
                    reportingStart,

                end:
                    reportingEnd,

                totalInputRecords:
                    inputRecords
                        .length,

                qualifiedInputRecords:
                    qualifiedRecords
                        .length,

                candidateRecords:
                    candidateRecords
                        .length,

                observedDeviceInstances,

                selectedDeviceInstance:
                    resolvedDeviceInstance,
            });
        }
    }
    else {
        if (
            observedDeviceInstances.length >
            1
        ) {
            return buildUnavailableResult({
                reason:
                    SOLAR_AVAILABILITY_REASON
                        .DEVICE_TOPOLOGY_AMBIGUOUS,

                start:
                    reportingStart,

                end:
                    reportingEnd,

                totalInputRecords:
                    inputRecords
                        .length,

                qualifiedInputRecords:
                    qualifiedRecords
                        .length,

                candidateRecords:
                    candidateRecords
                        .length,

                observedDeviceInstances,

                ambiguous:
                    true,
            });
        }


        resolvedDeviceInstance =
            observedDeviceInstances[
                0
            ] ??
            null;
    }


    const evidence =
        buildEvidenceSummary(
            selectedRecords
        );


    /*
    |--------------------------------------------------------------------------
    | Direct availability signal
    |--------------------------------------------------------------------------
    |
    | Production default is deliberately absent.
    |--------------------------------------------------------------------------
    */

    const directMapping =
        findDirectMapping({
            records:
                selectedRecords,

            mappings:
                resolvedConfig
                    .directAvailabilityMappings,
        });


    if (
        !directMapping
    ) {
        return buildUnavailableResult({
            reason:
                SOLAR_AVAILABILITY_REASON
                    .DIRECT_AVAILABILITY_SIGNAL_NOT_ESTABLISHED,

            start:
                reportingStart,

            end:
                reportingEnd,

            totalInputRecords:
                inputRecords
                    .length,

            qualifiedInputRecords:
                qualifiedRecords
                    .length,

            candidateRecords:
                candidateRecords
                    .length,

            observedDeviceInstances,

            selectedDeviceInstance:
                resolvedDeviceInstance,

            evidence,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Important:
    |
    | A single latest direct availability observation can qualify current
    | availability state, but it still does NOT establish a reporting-window
    | availability percentage.
    |
    | Time exposure requires a qualified state timeline with explicit gap
    | handling. That is intentionally outside the current foundation.
    |--------------------------------------------------------------------------
    */

    return {
        family:
            SOLAR_AVAILABILITY_FAMILY,

        phase:
            SOLAR_AVAILABILITY_PHASE,

        status:
            SOLAR_AVAILABILITY_STATUS
                .PARTIALLY_CALCULATED,

        reason:
            SOLAR_AVAILABILITY_REASON
                .DIRECT_AVAILABILITY_SIGNAL_QUALIFIED,

        reportingWindow: {
            start:
                reportingStart,

            end:
                reportingEnd,

            semantics:
                "[start,end)",
        },

        topology: {
            status:
                SOLAR_AVAILABILITY_REFERENCE_STATUS
                    .QUALIFIED,

            observedDeviceInstances,

            selectedDeviceInstance:
                resolvedDeviceInstance,

            ambiguous:
                false,
        },

        availability: {
            /*
             * Percentage remains null because a point observation does not
             * establish reporting-window uptime exposure.
             */
            value:
                null,

            unit:
                "%",

            status:
                SOLAR_AVAILABILITY_STATUS
                    .PARTIALLY_CALCULATED,

            eligible:
                false,

            numeratorSeconds:
                null,

            denominatorSeconds:
                null,

            uptimeSeconds:
                null,

            downtimeSeconds:
                null,

            directSignalEstablished:
                true,

            latestFunctionalState:
                directMapping
                    .available
                    ? "AVAILABLE"
                    : "UNAVAILABLE",

            latestFunctionalStateAt:
                directMapping
                    .latestAt,

            directAttributeId:
                directMapping
                    .attributeId,

            directMappingName:
                directMapping
                    .mappingName,
        },

        evidence: {
            totalInputRecords:
                inputRecords
                    .length,

            qualifiedInputRecords:
                qualifiedRecords
                    .length,

            candidateRecords:
                candidateRecords
                    .length,

            observedEvidenceFamilies:
                countObservedFamilies(
                    evidence
                ),

            ...evidence,
        },

        boundaries:
            SOLAR_AVAILABILITY_BOUNDARIES,
    };
}


export default Object.freeze({
    SOLAR_AVAILABILITY_PHASE,
    SOLAR_AVAILABILITY_FAMILY,
    SOLAR_AVAILABILITY_STATUS,
    SOLAR_AVAILABILITY_REASON,
    SOLAR_AVAILABILITY_REFERENCE_STATUS,
    SOLAR_AVAILABILITY_EVIDENCE_ROLE,
    DEFAULT_SOLAR_AVAILABILITY_CONFIG,
    SOLAR_AVAILABILITY_BOUNDARIES,
    calculateSolarAvailability,
});