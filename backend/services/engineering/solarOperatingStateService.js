// services/engineering/solarOperatingStateService.js

import {
    SOLAR_ATTRIBUTE_MAP,
    SOLAR_OPERATING_STATE_ATTRIBUTE_IDS,
} from "./solarAttributeMap.js";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 8.7E — Solar Operating-State Analytics
|--------------------------------------------------------------------------
|
| Pure engineering analytics service.
|
| PURPOSE
|
| Establish defensible Solar Charger operating-state observations from:
|
|   84  — Charger mode
|   85  — Charger state
|   98  — Error code
|   518 — MPPT state
|   583 — Device off reason
|
| Supporting evidence:
|
|   442 — PV-input power
|   86  — PV voltage
|
| IMPORTANT
|
| This service distinguishes:
|
|   operating state
|   generation state
|   diagnostic state
|   telemetry observability
|   functional availability
|
| These are NOT interchangeable.
|
| This service DOES NOT:
|
| - query MongoDB
| - persist telemetry
| - calculate availability
| - calculate downtime
| - calculate reliability
| - infer irradiance
| - infer day/night
| - infer installed PV capacity
| - infer failure from zero PV power
| - infer unavailability from zero PV power
| - infer availability from charger mode
| - infer availability from ErrorCode=0
| - decode undocumented state codes automatically
| - aggregate multiple Solar Chargers automatically
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Identity
|--------------------------------------------------------------------------
*/

export const SOLAR_OPERATING_STATE_PHASE =
    "8.7E";


export const SOLAR_OPERATING_STATE_FAMILY =
    "SOLAR_OPERATING_STATE";


/*
|--------------------------------------------------------------------------
| Analytics status
|--------------------------------------------------------------------------
*/

export const SOLAR_OPERATING_STATE_STATUS =
    Object.freeze({
        CALCULATED:
            "CALCULATED",

        PARTIALLY_CALCULATED:
            "PARTIALLY_CALCULATED",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


/*
|--------------------------------------------------------------------------
| Reasons
|--------------------------------------------------------------------------
*/

export const SOLAR_OPERATING_STATE_REASON =
    Object.freeze({
        OPERATING_STATE_CALCULATED:
            "OPERATING_STATE_CALCULATED",

        RAW_STATE_EVIDENCE_ONLY:
            "RAW_STATE_EVIDENCE_ONLY",

        NO_SOLAR_OPERATING_STATE_EVIDENCE:
            "NO_SOLAR_OPERATING_STATE_EVIDENCE",

        NO_VALID_SOLAR_OPERATING_STATE_SAMPLES:
            "NO_VALID_SOLAR_OPERATING_STATE_SAMPLES",

        DEVICE_TOPOLOGY_AMBIGUOUS:
            "DEVICE_TOPOLOGY_AMBIGUOUS",

        SELECTED_DEVICE_NOT_FOUND:
            "SELECTED_DEVICE_NOT_FOUND",

        INVALID_REPORTING_WINDOW:
            "INVALID_REPORTING_WINDOW",
    });


/*
|--------------------------------------------------------------------------
| Generation state
|--------------------------------------------------------------------------
|
| This describes observed PV generation only.
|
| NOT_GENERATING does not mean failed or unavailable.
|--------------------------------------------------------------------------
*/

export const SOLAR_GENERATION_STATE =
    Object.freeze({
        GENERATING:
            "GENERATING",

        NOT_GENERATING:
            "NOT_GENERATING",

        INDETERMINATE:
            "INDETERMINATE",

        UNKNOWN:
            "UNKNOWN",
    });


/*
|--------------------------------------------------------------------------
| Charger operating state
|--------------------------------------------------------------------------
*/

export const SOLAR_CHARGER_OPERATING_STATE =
    Object.freeze({
        DEVICE_ON:
            "DEVICE_ON",

        DEVICE_OFF:
            "DEVICE_OFF",

        OBSERVED_UNDECODED:
            "OBSERVED_UNDECODED",

        UNKNOWN:
            "UNKNOWN",
    });


/*
|--------------------------------------------------------------------------
| Diagnostic state
|--------------------------------------------------------------------------
*/

export const SOLAR_DIAGNOSTIC_STATE =
    Object.freeze({
        FAULT_INDICATED:
            "FAULT_INDICATED",

        NO_FAULT_INDICATED:
            "NO_FAULT_INDICATED",

        OFF_REASON_INDICATED:
            "OFF_REASON_INDICATED",

        OBSERVED_UNDECODED:
            "OBSERVED_UNDECODED",

        UNKNOWN:
            "UNKNOWN",
    });


/*
|--------------------------------------------------------------------------
| MPPT interpretation
|--------------------------------------------------------------------------
*/

export const SOLAR_MPPT_STATE =
    Object.freeze({
        ACTIVE:
            "ACTIVE",

        INACTIVE:
            "INACTIVE",

        OBSERVED_UNDECODED:
            "OBSERVED_UNDECODED",

        UNKNOWN:
            "UNKNOWN",
    });


/*
|--------------------------------------------------------------------------
| Topology
|--------------------------------------------------------------------------
*/

export const SOLAR_OPERATING_TOPOLOGY_STATUS =
    Object.freeze({
        QUALIFIED:
            "QUALIFIED",

        AMBIGUOUS:
            "AMBIGUOUS",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


/*
|--------------------------------------------------------------------------
| Default configuration
|--------------------------------------------------------------------------
|
| State-code decoding is intentionally empty by default.
|
| Later, when Victron code semantics are explicitly qualified, the
| production adapter may supply mappings without changing this service.
|--------------------------------------------------------------------------
*/

export const DEFAULT_SOLAR_OPERATING_STATE_CONFIG =
    Object.freeze({
        requireValidQuality:
            true,

        requireRawAggregation:
            true,

        decoders:
            Object.freeze({
                modeOnValues:
                    Object.freeze([]),

                modeOffValues:
                    Object.freeze([]),

                chargerStateLabels:
                    Object.freeze({}),

                mpptActiveValues:
                    Object.freeze([]),

                mpptInactiveValues:
                    Object.freeze([]),

                noFaultErrorCodes:
                    Object.freeze([]),

                faultErrorCodes:
                    Object.freeze([]),

                noOffReasonCodes:
                    Object.freeze([]),

                offReasonCodes:
                    Object.freeze([]),
            }),
    });


/*
|--------------------------------------------------------------------------
| Semantic boundaries
|--------------------------------------------------------------------------
*/

export const SOLAR_OPERATING_STATE_BOUNDARIES =
    Object.freeze({
        missingTelemetryMeansZero:
            false,

        noTelemetryMeansNoSolarInstallation:
            false,

        zeroPvPowerMeansFailure:
            false,

        zeroPvPowerMeansUnavailable:
            false,

        zeroPvPowerMeansNight:
            false,

        positivePvVoltageMeansGenerating:
            false,

        modeOnMeansAvailable:
            false,

        modeOffMeansFailed:
            false,

        errorCodeZeroMeansAvailable:
            false,

        errorCodeMeansDowntime:
            false,

        offReasonMeansDowntime:
            false,

        mpptInactiveMeansFailed:
            false,

        mpptStateMeansIrradiance:
            false,

        stateCodeAutomaticallyDecoded:
            false,

        multipleDevicesAutomaticallyAggregated:
            false,

        telemetryObservabilityMeansAvailability:
            false,

        availabilityCalculated:
            false,

        downtimeCalculated:
            false,

        irradianceCalculated:
            false,

        performanceRatioCalculated:
            false,

        capacityFactorCalculated:
            false,
    });


/*
|--------------------------------------------------------------------------
| Attribute identities
|--------------------------------------------------------------------------
*/

const MODE_ID =
    SOLAR_ATTRIBUTE_MAP
        .CHARGER_MODE
        .id;


const CHARGER_STATE_ID =
    SOLAR_ATTRIBUTE_MAP
        .CHARGER_STATE
        .id;


const ERROR_CODE_ID =
    SOLAR_ATTRIBUTE_MAP
        .ERROR_CODE
        .id;


const MPPT_STATE_ID =
    SOLAR_ATTRIBUTE_MAP
        .MPPT_STATE
        .id;


const OFF_REASON_ID =
    SOLAR_ATTRIBUTE_MAP
        .OFF_REASON
        .id;


const PV_POWER_ID =
    SOLAR_ATTRIBUTE_MAP
        .PV_POWER
        .id;


const PV_VOLTAGE_ID =
    SOLAR_ATTRIBUTE_MAP
        .PV_VOLTAGE
        .id;


const DIRECT_SOLAR_DEVICE_ATTRIBUTE_IDS =
    Object.freeze([
        ...SOLAR_OPERATING_STATE_ATTRIBUTE_IDS,
        PV_POWER_ID,
        PV_VOLTAGE_ID,
    ]);


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

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


function normalizeDeviceInstance(
    value
) {
    if (
        value === null ||
        value === undefined ||
        String(
            value
        ).trim() === ""
    ) {
        return "UNKNOWN_DEVICE";
    }


    return String(
        value
    );
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


function normalizeDecoderArray(
    values
) {
    if (
        !Array.isArray(
            values
        )
    ) {
        return [];
    }


    return [
        ...values,
    ];
}


function normalizeDecoderObject(
    value
) {
    if (
        !value ||
        typeof value !==
            "object" ||
        Array.isArray(
            value
        )
    ) {
        return {};
    }


    return {
        ...value,
    };
}


function normalizeConfig(
    config
) {
    const incoming =
        config ??
        {};


    const incomingDecoders =
        incoming
            .decoders ??
        {};


    return {
        ...DEFAULT_SOLAR_OPERATING_STATE_CONFIG,
        ...incoming,

        decoders: {
            modeOnValues:
                normalizeDecoderArray(
                    incomingDecoders
                        .modeOnValues ??
                    DEFAULT_SOLAR_OPERATING_STATE_CONFIG
                        .decoders
                        .modeOnValues
                ),

            modeOffValues:
                normalizeDecoderArray(
                    incomingDecoders
                        .modeOffValues ??
                    DEFAULT_SOLAR_OPERATING_STATE_CONFIG
                        .decoders
                        .modeOffValues
                ),

            chargerStateLabels:
                normalizeDecoderObject(
                    incomingDecoders
                        .chargerStateLabels ??
                    DEFAULT_SOLAR_OPERATING_STATE_CONFIG
                        .decoders
                        .chargerStateLabels
                ),

            mpptActiveValues:
                normalizeDecoderArray(
                    incomingDecoders
                        .mpptActiveValues ??
                    DEFAULT_SOLAR_OPERATING_STATE_CONFIG
                        .decoders
                        .mpptActiveValues
                ),

            mpptInactiveValues:
                normalizeDecoderArray(
                    incomingDecoders
                        .mpptInactiveValues ??
                    DEFAULT_SOLAR_OPERATING_STATE_CONFIG
                        .decoders
                        .mpptInactiveValues
                ),

            noFaultErrorCodes:
                normalizeDecoderArray(
                    incomingDecoders
                        .noFaultErrorCodes ??
                    DEFAULT_SOLAR_OPERATING_STATE_CONFIG
                        .decoders
                        .noFaultErrorCodes
                ),

            faultErrorCodes:
                normalizeDecoderArray(
                    incomingDecoders
                        .faultErrorCodes ??
                    DEFAULT_SOLAR_OPERATING_STATE_CONFIG
                        .decoders
                        .faultErrorCodes
                ),

            noOffReasonCodes:
                normalizeDecoderArray(
                    incomingDecoders
                        .noOffReasonCodes ??
                    DEFAULT_SOLAR_OPERATING_STATE_CONFIG
                        .decoders
                        .noOffReasonCodes
                ),

            offReasonCodes:
                normalizeDecoderArray(
                    incomingDecoders
                        .offReasonCodes ??
                    DEFAULT_SOLAR_OPERATING_STATE_CONFIG
                        .decoders
                        .offReasonCodes
                ),
        },
    };
}


function decoderContains(
    array,
    value
) {
    return array.some(
        (
            candidate
        ) =>
            String(
                candidate
            ) ===
            String(
                value
            )
    );
}


function recordPassesBaseBoundary({
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
        !timestamp
    ) {
        return false;
    }


    if (
        timestamp < start ||
        timestamp >= end
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


function isCandidateAttribute(
    record
) {
    return DIRECT_SOLAR_DEVICE_ATTRIBUTE_IDS
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


function recordsForAttribute(
    records,
    attributeId
) {
    return records.filter(
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
}


/*
|--------------------------------------------------------------------------
| Prepare attribute series
|--------------------------------------------------------------------------
|
| Identical same-timestamp values are deduplicated.
|
| Conflicting same-timestamp values are discarded.
|--------------------------------------------------------------------------
*/

function prepareStateSeries(
    records
) {
    const byTimestamp =
        new Map();


    for (
        const record
        of records
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
            value === null
        ) {
            continue;
        }


        const key =
            timestamp.toISOString();


        if (
            !byTimestamp.has(
                key
            )
        ) {
            byTimestamp.set(
                key,
                []
            );
        }


        byTimestamp
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
        of byTimestamp.values()
    ) {
        const uniqueValues =
            Array.from(
                new Set(
                    observations.map(
                        (
                            observation
                        ) =>
                            observation.value
                    )
                )
            );


        if (
            uniqueValues.length >
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


        series.push({
            timestamp:
                observations[
                    0
                ].timestamp,

            value:
                observations[
                    0
                ].value,

            record:
                observations[
                    0
                ].record,
        });
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
        series,
        duplicateTimestampCount,
        conflictingTimestampCount,
    };
}


function latestPoint(
    prepared
) {
    if (
        !prepared ||
        prepared
            .series
            .length ===
            0
    ) {
        return null;
    }


    return prepared
        .series[
            prepared
                .series
                .length -
            1
        ];
}


/*
|--------------------------------------------------------------------------
| Attribute evidence block
|--------------------------------------------------------------------------
*/

function buildAttributeEvidence(
    records,
    attributeId
) {
    const candidateRecords =
        recordsForAttribute(
            records,
            attributeId
        );


    const prepared =
        prepareStateSeries(
            candidateRecords
        );


    const latest =
        latestPoint(
            prepared
        );


    return {
        attributeId,

        candidateRecords:
            candidateRecords
                .length,

        recordsUsed:
            prepared
                .series
                .length,

        latestValue:
            latest
                ?.value ??
            null,

        latestAt:
            latest
                ?.timestamp ??
            null,

        observed:
            latest !==
            null,

        duplicateTimestampCount:
            prepared
                .duplicateTimestampCount,

        conflictingTimestampCount:
            prepared
                .conflictingTimestampCount,
    };
}


/*
|--------------------------------------------------------------------------
| Generation-state interpretation
|--------------------------------------------------------------------------
*/

function interpretGenerationState(
    pvPowerEvidence
) {
    if (
        !pvPowerEvidence
            .observed
    ) {
        return {
            state:
                SOLAR_GENERATION_STATE
                    .UNKNOWN,

            reason:
                "NO_PV_POWER_OBSERVATION",

            sourceAttributeId:
                PV_POWER_ID,

            value:
                null,

            observedAt:
                null,
        };
    }


    const value =
        pvPowerEvidence
            .latestValue;


    if (
        value >
        0
    ) {
        return {
            state:
                SOLAR_GENERATION_STATE
                    .GENERATING,

            reason:
                "POSITIVE_PV_POWER_OBSERVED",

            sourceAttributeId:
                PV_POWER_ID,

            value,

            observedAt:
                pvPowerEvidence
                    .latestAt,
        };
    }


    if (
        value ===
        0
    ) {
        return {
            state:
                SOLAR_GENERATION_STATE
                    .NOT_GENERATING,

            reason:
                "ZERO_PV_POWER_OBSERVED",

            sourceAttributeId:
                PV_POWER_ID,

            value,

            observedAt:
                pvPowerEvidence
                    .latestAt,
        };
    }


    /*
     * Negative PV-input power is preserved as evidence but not given
     * an inferred import/export/reverse-power semantic.
     */
    return {
        state:
            SOLAR_GENERATION_STATE
                .INDETERMINATE,

        reason:
            "NEGATIVE_PV_POWER_SEMANTICS_UNRESOLVED",

        sourceAttributeId:
            PV_POWER_ID,

        value,

        observedAt:
            pvPowerEvidence
                .latestAt,
    };
}


/*
|--------------------------------------------------------------------------
| Mode interpretation
|--------------------------------------------------------------------------
*/

function interpretMode(
    evidence,
    decoders
) {
    if (
        !evidence
            .observed
    ) {
        return {
            state:
                SOLAR_CHARGER_OPERATING_STATE
                    .UNKNOWN,

            rawValue:
                null,

            decoded:
                false,

            observedAt:
                null,
        };
    }


    const value =
        evidence
            .latestValue;


    if (
        decoderContains(
            decoders
                .modeOnValues,
            value
        )
    ) {
        return {
            state:
                SOLAR_CHARGER_OPERATING_STATE
                    .DEVICE_ON,

            rawValue:
                value,

            decoded:
                true,

            observedAt:
                evidence
                    .latestAt,
        };
    }


    if (
        decoderContains(
            decoders
                .modeOffValues,
            value
        )
    ) {
        return {
            state:
                SOLAR_CHARGER_OPERATING_STATE
                    .DEVICE_OFF,

            rawValue:
                value,

            decoded:
                true,

            observedAt:
                evidence
                    .latestAt,
        };
    }


    return {
        state:
            SOLAR_CHARGER_OPERATING_STATE
                .OBSERVED_UNDECODED,

        rawValue:
            value,

        decoded:
            false,

        observedAt:
            evidence
                .latestAt,
    };
}


/*
|--------------------------------------------------------------------------
| Charger-state interpretation
|--------------------------------------------------------------------------
*/

function interpretChargerState(
    evidence,
    decoders
) {
    if (
        !evidence
            .observed
    ) {
        return {
            rawValue:
                null,

            label:
                null,

            decoded:
                false,

            observedAt:
                null,
        };
    }


    const rawValue =
        evidence
            .latestValue;


    const key =
        String(
            rawValue
        );


    const label =
        Object.prototype
            .hasOwnProperty
            .call(
                decoders
                    .chargerStateLabels,
                key
            )
            ? decoders
                .chargerStateLabels[
                    key
                ]
            : null;


    return {
        rawValue,

        label,

        decoded:
            label !==
            null,

        observedAt:
            evidence
                .latestAt,
    };
}


/*
|--------------------------------------------------------------------------
| MPPT interpretation
|--------------------------------------------------------------------------
*/

function interpretMppt(
    evidence,
    decoders
) {
    if (
        !evidence
            .observed
    ) {
        return {
            state:
                SOLAR_MPPT_STATE
                    .UNKNOWN,

            rawValue:
                null,

            decoded:
                false,

            observedAt:
                null,
        };
    }


    const value =
        evidence
            .latestValue;


    if (
        decoderContains(
            decoders
                .mpptActiveValues,
            value
        )
    ) {
        return {
            state:
                SOLAR_MPPT_STATE
                    .ACTIVE,

            rawValue:
                value,

            decoded:
                true,

            observedAt:
                evidence
                    .latestAt,
        };
    }


    if (
        decoderContains(
            decoders
                .mpptInactiveValues,
            value
        )
    ) {
        return {
            state:
                SOLAR_MPPT_STATE
                    .INACTIVE,

            rawValue:
                value,

            decoded:
                true,

            observedAt:
                evidence
                    .latestAt,
        };
    }


    return {
        state:
            SOLAR_MPPT_STATE
                .OBSERVED_UNDECODED,

        rawValue:
            value,

        decoded:
            false,

        observedAt:
            evidence
                .latestAt,
    };
}


/*
|--------------------------------------------------------------------------
| Error-code interpretation
|--------------------------------------------------------------------------
*/

function interpretErrorCode(
    evidence,
    decoders
) {
    if (
        !evidence
            .observed
    ) {
        return {
            state:
                SOLAR_DIAGNOSTIC_STATE
                    .UNKNOWN,

            rawValue:
                null,

            decoded:
                false,

            observedAt:
                null,
        };
    }


    const value =
        evidence
            .latestValue;


    if (
        decoderContains(
            decoders
                .faultErrorCodes,
            value
        )
    ) {
        return {
            state:
                SOLAR_DIAGNOSTIC_STATE
                    .FAULT_INDICATED,

            rawValue:
                value,

            decoded:
                true,

            observedAt:
                evidence
                    .latestAt,
        };
    }


    if (
        decoderContains(
            decoders
                .noFaultErrorCodes,
            value
        )
    ) {
        return {
            state:
                SOLAR_DIAGNOSTIC_STATE
                    .NO_FAULT_INDICATED,

            rawValue:
                value,

            decoded:
                true,

            observedAt:
                evidence
                    .latestAt,
        };
    }


    return {
        state:
            SOLAR_DIAGNOSTIC_STATE
                .OBSERVED_UNDECODED,

        rawValue:
            value,

        decoded:
            false,

        observedAt:
            evidence
                .latestAt,
    };
}


/*
|--------------------------------------------------------------------------
| Off-reason interpretation
|--------------------------------------------------------------------------
*/

function interpretOffReason(
    evidence,
    decoders
) {
    if (
        !evidence
            .observed
    ) {
        return {
            state:
                SOLAR_DIAGNOSTIC_STATE
                    .UNKNOWN,

            rawValue:
                null,

            decoded:
                false,

            observedAt:
                null,
        };
    }


    const value =
        evidence
            .latestValue;


    if (
        decoderContains(
            decoders
                .offReasonCodes,
            value
        )
    ) {
        return {
            state:
                SOLAR_DIAGNOSTIC_STATE
                    .OFF_REASON_INDICATED,

            rawValue:
                value,

            decoded:
                true,

            observedAt:
                evidence
                    .latestAt,
        };
    }


    if (
        decoderContains(
            decoders
                .noOffReasonCodes,
            value
        )
    ) {
        return {
            state:
                SOLAR_DIAGNOSTIC_STATE
                    .NO_FAULT_INDICATED,

            rawValue:
                value,

            decoded:
                true,

            observedAt:
                evidence
                    .latestAt,
        };
    }


    return {
        state:
            SOLAR_DIAGNOSTIC_STATE
                .OBSERVED_UNDECODED,

        rawValue:
            value,

        decoded:
            false,

        observedAt:
            evidence
                .latestAt,
    };
}


/*
|--------------------------------------------------------------------------
| Overall qualification
|--------------------------------------------------------------------------
*/

function determineOverallStatus({
    generation,
    mode,
    chargerState,
    mppt,
    errorCode,
    offReason,
}) {
    /*
     * PV power sign has sufficient semantics to establish an observed
     * generation/non-generation state without requiring W/kW resolution.
     */
    if (
        generation
            .state ===
            SOLAR_GENERATION_STATE
                .GENERATING ||
        generation
            .state ===
            SOLAR_GENERATION_STATE
                .NOT_GENERATING
    ) {
        return {
            status:
                SOLAR_OPERATING_STATE_STATUS
                    .CALCULATED,

            reason:
                SOLAR_OPERATING_STATE_REASON
                    .OPERATING_STATE_CALCULATED,
        };
    }


    const decodedStateExists =
        mode
            .decoded ||
        chargerState
            .decoded ||
        mppt
            .decoded ||
        errorCode
            .decoded ||
        offReason
            .decoded;


    if (
        decodedStateExists
    ) {
        return {
            status:
                SOLAR_OPERATING_STATE_STATUS
                    .CALCULATED,

            reason:
                SOLAR_OPERATING_STATE_REASON
                    .OPERATING_STATE_CALCULATED,
        };
    }


    const rawStateExists =
        mode
            .rawValue !==
            null ||
        chargerState
            .rawValue !==
            null ||
        mppt
            .rawValue !==
            null ||
        errorCode
            .rawValue !==
            null ||
        offReason
            .rawValue !==
            null;


    if (
        rawStateExists ||
        generation
            .state ===
            SOLAR_GENERATION_STATE
                .INDETERMINATE
    ) {
        return {
            status:
                SOLAR_OPERATING_STATE_STATUS
                    .PARTIALLY_CALCULATED,

            reason:
                SOLAR_OPERATING_STATE_REASON
                    .RAW_STATE_EVIDENCE_ONLY,
        };
    }


    return {
        status:
            SOLAR_OPERATING_STATE_STATUS
                .UNAVAILABLE,

        reason:
            SOLAR_OPERATING_STATE_REASON
                .NO_SOLAR_OPERATING_STATE_EVIDENCE,
    };
}


/*
|--------------------------------------------------------------------------
| Empty result
|--------------------------------------------------------------------------
*/

function buildUnavailableResult({
    reason,
    start,
    end,
    selectedDeviceInstance =
        null,
    deviceInstances = [],
    ambiguous =
        false,
    evidence = {},
}) {
    return {
        family:
            SOLAR_OPERATING_STATE_FAMILY,

        phase:
            SOLAR_OPERATING_STATE_PHASE,

        status:
            SOLAR_OPERATING_STATE_STATUS
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
                    ? SOLAR_OPERATING_TOPOLOGY_STATUS
                        .AMBIGUOUS
                    : SOLAR_OPERATING_TOPOLOGY_STATUS
                        .UNAVAILABLE,

            observedDeviceInstances:
                deviceInstances,

            selectedDeviceInstance,

            ambiguous,
        },

        state: {
            generation: {
                state:
                    SOLAR_GENERATION_STATE
                        .UNKNOWN,

                reason:
                    "NO_PV_POWER_OBSERVATION",

                sourceAttributeId:
                    PV_POWER_ID,

                value:
                    null,

                observedAt:
                    null,
            },

            mode: {
                state:
                    SOLAR_CHARGER_OPERATING_STATE
                        .UNKNOWN,

                rawValue:
                    null,

                decoded:
                    false,

                observedAt:
                    null,
            },

            chargerState: {
                rawValue:
                    null,

                label:
                    null,

                decoded:
                    false,

                observedAt:
                    null,
            },

            mppt: {
                state:
                    SOLAR_MPPT_STATE
                        .UNKNOWN,

                rawValue:
                    null,

                decoded:
                    false,

                observedAt:
                    null,
            },

            errorCode: {
                state:
                    SOLAR_DIAGNOSTIC_STATE
                        .UNKNOWN,

                rawValue:
                    null,

                decoded:
                    false,

                observedAt:
                    null,
            },

            offReason: {
                state:
                    SOLAR_DIAGNOSTIC_STATE
                        .UNKNOWN,

                rawValue:
                    null,

                decoded:
                    false,

                observedAt:
                    null,
            },
        },

        supportingEvidence: {
            pvVoltage: {
                observed:
                    false,

                latestValue:
                    null,

                latestAt:
                    null,

                establishesGeneration:
                    false,
            },
        },

        evidence: {
            totalInputRecords:
                0,

            qualifiedInputRecords:
                0,

            candidateRecords:
                0,

            ...evidence,
        },

        boundaries:
            SOLAR_OPERATING_STATE_BOUNDARIES,
    };
}


/*
|--------------------------------------------------------------------------
| Main service
|--------------------------------------------------------------------------
*/

export function calculateSolarOperatingState({
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
                SOLAR_OPERATING_STATE_REASON
                    .INVALID_REPORTING_WINDOW,

            start:
                reportingStart,

            end:
                reportingEnd,
        });
    }


    const resolvedConfig =
        normalizeConfig(
            config
        );


    /*
    |--------------------------------------------------------------------------
    | Base telemetry qualification
    |--------------------------------------------------------------------------
    */

    const qualifiedRecords =
        Array.isArray(
            records
        )
            ? records.filter(
                (
                    record
                ) =>
                    recordPassesBaseBoundary({
                        record,
                        start:
                            reportingStart,
                        end:
                            reportingEnd,
                        config:
                            resolvedConfig,
                    })
            )
            : [];


    const candidateRecords =
        qualifiedRecords.filter(
            isCandidateAttribute
        );


    if (
        candidateRecords.length ===
        0
    ) {
        return buildUnavailableResult({
            reason:
                SOLAR_OPERATING_STATE_REASON
                    .NO_SOLAR_OPERATING_STATE_EVIDENCE,

            start:
                reportingStart,

            end:
                reportingEnd,

            evidence: {
                totalInputRecords:
                    Array.isArray(
                        records
                    )
                        ? records.length
                        : 0,

                qualifiedInputRecords:
                    qualifiedRecords
                        .length,

                candidateRecords:
                    0,
            },
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
                    SOLAR_OPERATING_STATE_REASON
                        .SELECTED_DEVICE_NOT_FOUND,

                start:
                    reportingStart,

                end:
                    reportingEnd,

                selectedDeviceInstance:
                    resolvedDeviceInstance,

                deviceInstances:
                    observedDeviceInstances,

                evidence: {
                    totalInputRecords:
                        Array.isArray(
                            records
                        )
                            ? records.length
                            : 0,

                    qualifiedInputRecords:
                        qualifiedRecords
                            .length,

                    candidateRecords:
                        candidateRecords
                            .length,
                },
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
                    SOLAR_OPERATING_STATE_REASON
                        .DEVICE_TOPOLOGY_AMBIGUOUS,

                start:
                    reportingStart,

                end:
                    reportingEnd,

                deviceInstances:
                    observedDeviceInstances,

                ambiguous:
                    true,

                evidence: {
                    totalInputRecords:
                        Array.isArray(
                            records
                        )
                            ? records.length
                            : 0,

                    qualifiedInputRecords:
                        qualifiedRecords
                            .length,

                    candidateRecords:
                        candidateRecords
                            .length,
                },
            });
        }


        resolvedDeviceInstance =
            observedDeviceInstances[
                0
            ] ??
            null;
    }


    /*
    |--------------------------------------------------------------------------
    | Per-signal evidence
    |--------------------------------------------------------------------------
    */

    const modeEvidence =
        buildAttributeEvidence(
            selectedRecords,
            MODE_ID
        );


    const chargerStateEvidence =
        buildAttributeEvidence(
            selectedRecords,
            CHARGER_STATE_ID
        );


    const errorCodeEvidence =
        buildAttributeEvidence(
            selectedRecords,
            ERROR_CODE_ID
        );


    const mpptEvidence =
        buildAttributeEvidence(
            selectedRecords,
            MPPT_STATE_ID
        );


    const offReasonEvidence =
        buildAttributeEvidence(
            selectedRecords,
            OFF_REASON_ID
        );


    const pvPowerEvidence =
        buildAttributeEvidence(
            selectedRecords,
            PV_POWER_ID
        );


    const pvVoltageEvidence =
        buildAttributeEvidence(
            selectedRecords,
            PV_VOLTAGE_ID
        );


    const generation =
        interpretGenerationState(
            pvPowerEvidence
        );


    const mode =
        interpretMode(
            modeEvidence,
            resolvedConfig
                .decoders
        );


    const chargerState =
        interpretChargerState(
            chargerStateEvidence,
            resolvedConfig
                .decoders
        );


    const mppt =
        interpretMppt(
            mpptEvidence,
            resolvedConfig
                .decoders
        );


    const errorCode =
        interpretErrorCode(
            errorCodeEvidence,
            resolvedConfig
                .decoders
        );


    const offReason =
        interpretOffReason(
            offReasonEvidence,
            resolvedConfig
                .decoders
        );


    const overall =
        determineOverallStatus({
            generation,
            mode,
            chargerState,
            mppt,
            errorCode,
            offReason,
        });


    return {
        family:
            SOLAR_OPERATING_STATE_FAMILY,

        phase:
            SOLAR_OPERATING_STATE_PHASE,

        status:
            overall
                .status,

        reason:
            overall
                .reason,

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
                SOLAR_OPERATING_TOPOLOGY_STATUS
                    .QUALIFIED,

            observedDeviceInstances,

            selectedDeviceInstance:
                resolvedDeviceInstance,

            ambiguous:
                false,
        },

        state: {
            generation,
            mode,
            chargerState,
            mppt,
            errorCode,
            offReason,
        },

        supportingEvidence: {
            pvVoltage: {
                observed:
                    pvVoltageEvidence
                        .observed,

                latestValue:
                    pvVoltageEvidence
                        .latestValue,

                latestAt:
                    pvVoltageEvidence
                        .latestAt,

                /*
                 * Explicit semantic boundary from 8.7B.
                 */
                establishesGeneration:
                    false,
            },
        },

        evidence: {
            totalInputRecords:
                Array.isArray(
                    records
                )
                    ? records.length
                    : 0,

            qualifiedInputRecords:
                qualifiedRecords
                    .length,

            candidateRecords:
                candidateRecords
                    .length,

            selectedRecords:
                selectedRecords
                    .length,

            attributes: {
                mode:
                    modeEvidence,

                chargerState:
                    chargerStateEvidence,

                errorCode:
                    errorCodeEvidence,

                mppt:
                    mpptEvidence,

                offReason:
                    offReasonEvidence,

                pvPower:
                    pvPowerEvidence,

                pvVoltage:
                    pvVoltageEvidence,
            },
        },

        /*
         * 8.7E does not calculate availability.
         */
        availability: {
            value:
                null,

            calculated:
                false,

            reason:
                "RESERVED_FOR_PHASE_8.7G",
        },

        /*
         * 8.7E does not calculate downtime.
         */
        downtime: {
            value:
                null,

            unit:
                null,

            calculated:
                false,
        },

        boundaries:
            SOLAR_OPERATING_STATE_BOUNDARIES,
    };
}


/*
|--------------------------------------------------------------------------
| Default export
|--------------------------------------------------------------------------
*/

export default Object.freeze({
    SOLAR_OPERATING_STATE_PHASE,
    SOLAR_OPERATING_STATE_FAMILY,
    SOLAR_OPERATING_STATE_STATUS,
    SOLAR_OPERATING_STATE_REASON,
    SOLAR_GENERATION_STATE,
    SOLAR_CHARGER_OPERATING_STATE,
    SOLAR_DIAGNOSTIC_STATE,
    SOLAR_MPPT_STATE,
    SOLAR_OPERATING_TOPOLOGY_STATUS,
    DEFAULT_SOLAR_OPERATING_STATE_CONFIG,
    SOLAR_OPERATING_STATE_BOUNDARIES,
    calculateSolarOperatingState,
});