// services/engineering/batteryAvailabilityAdapter.js

import {
    Installation,
    Telemetry,
} from "../../models/index.js";

import {
    calculateBatteryAvailability,
} from "./batteryAvailabilityService.js";


/*
|--------------------------------------------------------------------------
| Phase 8.4H-D
| Production Battery Availability Adapter
|--------------------------------------------------------------------------
|
| READ ONLY.
|
| Connects:
|
| MongoDB Telemetry
|       ↓
| qualified battery availability evidence
|       ↓
| Phase 8.4H-C pure battery availability engine
|
| IMPORTANT:
|
| Production currently has NO qualified direct battery availability
| signal.
|
| Therefore this adapter MUST NOT:
|
| - fabricate an availability percentage
| - infer availability from SOC
| - infer availability from non-zero battery power
| - infer unavailability from zero battery power/current
| - infer availability from communication/monitoring status
| - infer downtime from generic alarms
| - reinterpret attr 215 as an availability state
| - silently combine unrelated battery devices
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Production availability-evidence attributes
|--------------------------------------------------------------------------
|
| These correspond to the evidence classes qualified in 8.4H-A/H-B.
|
| OPERATING MODE
|   215
|
| FUNCTIONAL SUPPORT
|   49
|   243
|
| HEALTH SUPPORT
|   39
|   47
|   51
|   115
|   144
|   273
|   1035
|
| CONDITIONAL ALARM
|   119
|   120
|   124
|   125
|
| CONTROL LIMIT
|   274
|   275
|   276
|   277
|
| CONFIGURATION
|   333
|   334
|   472
|   1277
|
|--------------------------------------------------------------------------
*/

export const BATTERY_AVAILABILITY_ATTRIBUTE_IDS =
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
| Evidence classes
|--------------------------------------------------------------------------
*/

export const BATTERY_AVAILABILITY_EVIDENCE_CLASS =
    Object.freeze({

        OPERATING_MODE:
            "OPERATING_MODE",

        FUNCTIONAL_SUPPORT:
            "FUNCTIONAL_SUPPORT",

        HEALTH_SUPPORT:
            "HEALTH_SUPPORT",

        CONDITIONAL_ALARM:
            "CONDITIONAL_ALARM",

        CONTROL_LIMIT:
            "CONTROL_LIMIT",

        CONFIGURATION:
            "CONFIGURATION",
    });


export const BATTERY_AVAILABILITY_ATTRIBUTE_CLASS =
    Object.freeze({

        39:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .HEALTH_SUPPORT,

        47:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .HEALTH_SUPPORT,

        49:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .FUNCTIONAL_SUPPORT,

        51:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .HEALTH_SUPPORT,

        115:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .HEALTH_SUPPORT,

        119:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONDITIONAL_ALARM,

        120:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONDITIONAL_ALARM,

        124:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONDITIONAL_ALARM,

        125:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONDITIONAL_ALARM,

        144:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .HEALTH_SUPPORT,

        215:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .OPERATING_MODE,

        243:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .FUNCTIONAL_SUPPORT,

        273:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .HEALTH_SUPPORT,

        274:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONTROL_LIMIT,

        275:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONTROL_LIMIT,

        276:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONTROL_LIMIT,

        277:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONTROL_LIMIT,

        333:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONFIGURATION,

        334:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONFIGURATION,

        472:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONFIGURATION,

        1035:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .HEALTH_SUPPORT,

        1277:
            BATTERY_AVAILABILITY_EVIDENCE_CLASS
                .CONFIGURATION,
    });


/*
|--------------------------------------------------------------------------
| Adapter boundaries
|--------------------------------------------------------------------------
*/

export const BATTERY_AVAILABILITY_ADAPTER_BOUNDARIES =
    Object.freeze({

        READ_ONLY:
            true,

        SYNTHETIC_VALUES_ALLOWED:
            false,

        DIRECT_AVAILABILITY_SIGNAL_ESTABLISHED:
            false,

        PRODUCTION_DIRECT_AVAILABILITY_MAPPING_ALLOWED:
            false,

        ATTRIBUTE_215_IS_AVAILABILITY_SIGNAL:
            false,

        ATTRIBUTE_215_IS_OPERATING_MODE:
            true,

        SOC_AUTOMATICALLY_MEANS_AVAILABLE:
            false,

        ZERO_POWER_AUTOMATICALLY_MEANS_UNAVAILABLE:
            false,

        ZERO_CURRENT_AUTOMATICALLY_MEANS_UNAVAILABLE:
            false,

        ALARM_AUTOMATICALLY_MEANS_UNAVAILABLE:
            false,

        COMMUNICATION_LOSS_AUTOMATICALLY_MEANS_FAILURE:
            false,

        MONITORING_STATUS_USED_FOR_BATTERY_AVAILABILITY:
            false,

        MULTIPLE_DEVICES_AUTOMATICALLY_COMBINED:
            false,

        AVAILABILITY_PERCENTAGE_FABRICATED:
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


function normalizeDeviceInstance(
    value
) {

    return String(
        value ??
        "UNKNOWN"
    );
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
            "A valid [start,end) battery availability reporting window is required."
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
| Resolve installation
|--------------------------------------------------------------------------
*/

export async function resolveBatteryAvailabilityInstallation({
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


    const query =
        installationId
            ? {
                _id:
                    installationId,
            }
            : {
                vrmSiteId:
                    normalizeSiteId(
                        vrmSiteId
                    ),
            };


    return Installation
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
}


/*
|--------------------------------------------------------------------------
| Read production availability evidence
|--------------------------------------------------------------------------
|
| Normal production reporting-window telemetry uses [start,end).
|
| Because production has no direct availability signal, there is currently
| no need to retrieve an exact-end boundary state for availability
| calculation.
|--------------------------------------------------------------------------
*/

export async function getBatteryAvailabilityTelemetry({
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
                        BATTERY_AVAILABILITY_ATTRIBUTE_IDS,
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

                vrmAttributeId:
                    1,

                deviceInstance:
                    1,

                timestamp:
                    1,
            })
            .lean();


    return {

        records,

        reportingWindow,
    };
}


/*
|--------------------------------------------------------------------------
| Evidence inventory
|--------------------------------------------------------------------------
|
| Important:
|
| Device identity is tracked PER ATTRIBUTE.
|
| Different semantic evidence families are not automatically treated as
| one physical battery device.
|--------------------------------------------------------------------------
*/

export function summarizeBatteryAvailabilityEvidence(
    records = []
) {

    const attributes =
        {};


    const classes =
        {};


    const allDeviceKeys =
        new Set();


    for (
        const attributeId
        of BATTERY_AVAILABILITY_ATTRIBUTE_IDS
    ) {

        const attributeRecords =
            records.filter(
                (
                    record
                ) =>
                    Number(
                        record.vrmAttributeId
                    ) ===
                    Number(
                        attributeId
                    )
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
                                    .deviceInstance
                            )
                    )
                )
            ).sort();


        for (
            const record
            of attributeRecords
        ) {

            const deviceKey =
                [
                    String(
                        record.deviceType ??
                        "UNKNOWN"
                    ),

                    normalizeDeviceInstance(
                        record.deviceInstance
                    ),
                ].join(
                    "|"
                );


            allDeviceKeys.add(
                deviceKey
            );
        }


        const evidenceClass =
            BATTERY_AVAILABILITY_ATTRIBUTE_CLASS[
                attributeId
            ] ??
            null;


        attributes[
            attributeId
        ] = {

            attributeId,

            evidenceClass,

            recordCount:
                attributeRecords.length,

            deviceCount:
                devices.length,

            deviceInstances:
                devices,

            observed:
                attributeRecords.length >
                0,
        };


        if (
            evidenceClass
        ) {

            if (
                !classes[
                    evidenceClass
                ]
            ) {

                classes[
                    evidenceClass
                ] = {

                    observed:
                        false,

                    recordCount:
                        0,

                    attributeIds:
                        [],
                };
            }


            if (
                attributeRecords.length >
                0
            ) {

                classes[
                    evidenceClass
                ].observed =
                    true;


                classes[
                    evidenceClass
                ].recordCount +=
                    attributeRecords.length;


                classes[
                    evidenceClass
                ].attributeIds.push(
                    attributeId
                );
            }
        }
    }


    return {

        totalRecords:
            records.length,

        anyCandidateEvidence:
            records.length >
            0,

        observedAttributeIds:
            Object
                .values(
                    attributes
                )
                .filter(
                    (
                        item
                    ) =>
                        item.observed
                )
                .map(
                    (
                        item
                    ) =>
                        item.attributeId
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a -
                        b
                ),

        physicalEvidenceDeviceKeys:
            Array.from(
                allDeviceKeys
            ).sort(),

        physicalEvidenceDeviceCount:
            allDeviceKeys.size,

        attributes,

        classes,
    };
}


/*
|--------------------------------------------------------------------------
| Reference evidence selection
|--------------------------------------------------------------------------
|
| Phase 8.4H-C contains a conservative device-ambiguity guard.
|
| Production availability evidence, however, can legitimately span:
|
| - System overview
| - Battery Monitor
| - VE.Bus
| - Gateway/BMS
|
| Feeding every supporting attribute directly into H-C would therefore
| make unrelated evidence-device identities look like availability-device
| ambiguity.
|
| H-D does NOT silently combine those devices.
|
| Instead it selects one transparent REAL telemetry reference series for
| the pure engine. The complete evidence inventory remains separately
| available above.
|
| Preference:
|
| 215  operating mode
| 243  battery power
| 144  system battery SOC
| 51   battery monitor SOC
| 47   battery voltage
| 49   battery current
| 115  temperature
| 1035 system temperature
| 39   VE.Bus SOC
|
| This selection does NOT establish availability.
|--------------------------------------------------------------------------
*/

const BATTERY_AVAILABILITY_REFERENCE_PRIORITY =
    Object.freeze([
        215,
        243,
        144,
        51,
        47,
        49,
        115,
        1035,
        39,
    ]);


export function selectBatteryAvailabilityReferenceEvidence(
    records = []
) {

    for (
        const attributeId
        of BATTERY_AVAILABILITY_REFERENCE_PRIORITY
    ) {

        const attributeRecords =
            records.filter(
                (
                    record
                ) =>
                    Number(
                        record.vrmAttributeId
                    ) ===
                    attributeId
            );


        if (
            attributeRecords.length ===
            0
        ) {

            continue;
        }


        const grouped =
            new Map();


        for (
            const record
            of attributeRecords
        ) {

            const key =
                [
                    String(
                        record.deviceType ??
                        "UNKNOWN"
                    ),

                    normalizeDeviceInstance(
                        record.deviceInstance
                    ),
                ].join(
                    "|"
                );


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
                .push(
                    record
                );
        }


        /*
         * Only accept an unambiguous single-device series.
         */

        if (
            grouped.size !==
            1
        ) {

            continue;
        }


        const [
            [
                deviceKey,
                selectedRecords,
            ],
        ] =
            Array.from(
                grouped.entries()
            );


        return {

            attributeId,

            deviceKey,

            deviceType:
                selectedRecords[
                    0
                ]
                    ?.deviceType ??
                null,

            deviceInstance:
                normalizeDeviceInstance(
                    selectedRecords[
                        0
                    ]
                        ?.deviceInstance
                ),

            records:
                selectedRecords,

            reason:
                "UNAMBIGUOUS_REAL_TELEMETRY_REFERENCE_SERIES",
        };
    }


    /*
     * There may still be valid battery evidence, but there is no
     * unambiguous reference series suitable for H-C's conservative
     * device guard.
     */

    return {

        attributeId:
            null,

        deviceKey:
            null,

        deviceType:
            null,

        deviceInstance:
            null,

        records:
            [],

        reason:
            records.length >
            0
                ? "NO_UNAMBIGUOUS_REFERENCE_SERIES"
                : "NO_BATTERY_AVAILABILITY_EVIDENCE",
    };
}


/*
|--------------------------------------------------------------------------
| Production battery availability adapter
|--------------------------------------------------------------------------
*/

export async function getProductionBatteryAvailability({
    installationId = null,
    vrmSiteId = null,
    start,
    end,
} = {}) {

    const reportingWindow =
        buildWindow(
            start,
            end
        );


    const installation =
        await resolveBatteryAvailabilityInstallation({

            installationId,

            vrmSiteId,
        });


    if (
        !installation
    ) {

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
                BATTERY_AVAILABILITY_ADAPTER_BOUNDARIES,
        };
    }


    const telemetryResult =
        await getBatteryAvailabilityTelemetry({

            installation,

            start:
                reportingWindow.start,

            end:
                reportingWindow.end,
        });


    const evidence =
        summarizeBatteryAvailabilityEvidence(
            telemetryResult
                .records
        );


    const referenceEvidence =
        selectBatteryAvailabilityReferenceEvidence(
            telemetryResult
                .records
        );


    /*
    |--------------------------------------------------------------------------
    | Pure engine invocation
    |--------------------------------------------------------------------------
    |
    | CRITICAL:
    |
    | No directAvailabilityMapping is passed.
    |
    | Production semantics therefore remain blocked exactly as established
    | in 8.4H-B and validated in 8.4H-C.
    |--------------------------------------------------------------------------
    */

    let analytics;


    if (
        referenceEvidence
            .records
            .length >
        0
    ) {

        analytics =
            calculateBatteryAvailability({

                records:
                    referenceEvidence
                        .records,

                start:
                    reportingWindow
                        .start,

                end:
                    reportingWindow
                        .end,

                selectedDeviceInstance:
                    referenceEvidence
                        .deviceInstance,

                config: {

                    /*
                     * Explicitly no production mapping.
                     */

                    directAvailabilityMapping:
                        null,
                },
            });
    }
    else {

        analytics =
            calculateBatteryAvailability({

                records:
                    [],

                start:
                    reportingWindow
                        .start,

                end:
                    reportingWindow
                        .end,

                config: {

                    directAvailabilityMapping:
                        null,
                },
            });
    }


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

        reportingWindow: {

            start:
                reportingWindow
                    .start,

            end:
                reportingWindow
                    .end,

            semantics:
                "[start,end)",
        },

        telemetry: {

            evidence,

            referenceEvidence: {

                attributeId:
                    referenceEvidence
                        .attributeId,

                deviceKey:
                    referenceEvidence
                        .deviceKey,

                deviceType:
                    referenceEvidence
                        .deviceType,

                deviceInstance:
                    referenceEvidence
                        .deviceInstance,

                recordCount:
                    referenceEvidence
                        .records
                        .length,

                reason:
                    referenceEvidence
                        .reason,
            },
        },

        analytics,

        productionQualification: {

            directAvailabilitySignalEstablished:
                false,

            directAvailabilityMappingPassedToEngine:
                false,

            availabilityPercentageEligible:
                false,

            evidenceOnly:
                true,
        },

        boundaries:
            BATTERY_AVAILABILITY_ADAPTER_BOUNDARIES,
    };
}


export default {

    BATTERY_AVAILABILITY_ATTRIBUTE_IDS,

    BATTERY_AVAILABILITY_ADAPTER_BOUNDARIES,

    resolveBatteryAvailabilityInstallation,

    getBatteryAvailabilityTelemetry,

    summarizeBatteryAvailabilityEvidence,

    selectBatteryAvailabilityReferenceEvidence,

    getProductionBatteryAvailability,
};