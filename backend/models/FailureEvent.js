// backend/models/FailureEvent.js

import mongoose from "mongoose";


const {
    Schema,
    model,
} = mongoose;


/*
|--------------------------------------------------------------------------
| Failure Event Schema
|--------------------------------------------------------------------------
|
| FailureEvent represents an ENGINEERING / EQUIPMENT failure.
|
| It must not be used merely because:
|
| - grid ceased being the active source
| - an installation became monitoring-OFFLINE
| - a customer interruption occurred
| - a VRM alarm existed
|
| A FailureEvent requires evidence that a defined equipment / functional
| item actually entered a failed state.
|--------------------------------------------------------------------------
*/

const failureEventSchema =
    new Schema(
        {
            /*
            |--------------------------------------------------------------------------
            | Site relationships
            |--------------------------------------------------------------------------
            */

            installation: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "Installation",

                required:
                    true,

                index:
                    true,
            },


            site: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "Site",

                default:
                    null,

                index:
                    true,
            },


            /*
            |--------------------------------------------------------------------------
            | Equipment relationships
            |--------------------------------------------------------------------------
            |
            | device:
            |     Existing VRM / application device when known.
            |
            | asset:
            |     Future engineering Asset entity when the asset-management
            |     layer is introduced.
            |--------------------------------------------------------------------------
            */

            device: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "Device",

                default:
                    null,

                index:
                    true,
            },


            asset: {
                type:
                    Schema.Types.ObjectId,

                ref:
                    "Asset",

                default:
                    null,

                index:
                    true,
            },


            /*
            |--------------------------------------------------------------------------
            | Logical equipment identity
            |--------------------------------------------------------------------------
            |
            | These fields allow failure analysis before a dedicated Asset
            | record exists for every physical item.
            |--------------------------------------------------------------------------
            */

            equipmentType: {
                type:
                    String,

                enum: [
                    "INVERTER",
                    "CHARGER",
                    "BATTERY",
                    "BATTERY_BANK",
                    "SOLAR_CHARGER",
                    "PV_ARRAY",
                    "GENERATOR",
                    "GRID_INTERFACE",
                    "TRANSFER_SWITCH",
                    "METER",
                    "CONTROLLER",
                    "COMMUNICATION_DEVICE",
                    "PUMP",
                    "OTHER",
                    "UNKNOWN",
                ],

                default:
                    "UNKNOWN",

                index:
                    true,
            },


            equipmentIdentifier: {
                type:
                    String,

                default:
                    null,

                index:
                    true,
            },


            /*
            |--------------------------------------------------------------------------
            | Failure classification
            |--------------------------------------------------------------------------
            */

            failureType: {
                type:
                    String,

                enum: [
                    "ELECTRICAL_FAILURE",
                    "MECHANICAL_FAILURE",
                    "COMMUNICATION_FAILURE",
                    "CONTROL_FAILURE",
                    "BATTERY_FAILURE",
                    "GENERATOR_FAILURE",
                    "INVERTER_FAILURE",
                    "CHARGER_FAILURE",
                    "METER_FAILURE",
                    "PROTECTION_TRIP",
                    "THERMAL_FAILURE",
                    "FUNCTIONAL_FAILURE",
                    "OTHER",
                    "UNKNOWN",
                ],

                required:
                    true,

                default:
                    "UNKNOWN",

                index:
                    true,
            },


            failureMode: {
                type:
                    String,

                default:
                    null,
            },


            /*
            |--------------------------------------------------------------------------
            | Source
            |--------------------------------------------------------------------------
            */

            source: {
                type:
                    String,

                enum: [
                    "VRM",
                    "MANUAL",
                    "DERIVED",
                    "MAINTENANCE",
                ],

                default:
                    "DERIVED",

                index:
                    true,
            },


            /*
            |--------------------------------------------------------------------------
            | Lifecycle
            |--------------------------------------------------------------------------
            */

            status: {
                type:
                    String,

                enum: [
                    "OPEN",
                    "UNDER_REPAIR",
                    "RESTORED",
                    "CLOSED",
                    "INVALIDATED",
                ],

                default:
                    "OPEN",

                index:
                    true,
            },


            /*
            |--------------------------------------------------------------------------
            | Failure timing
            |--------------------------------------------------------------------------
            |
            | startTime:
            |     Best-established time at which the item entered failed state.
            |
            | detectionTime:
            |     When the monitoring / maintenance system detected the failure.
            |--------------------------------------------------------------------------
            */

            startTime: {
                type:
                    Date,

                required:
                    true,

                index:
                    true,
            },


            detectionTime: {
                type:
                    Date,

                default:
                    null,
            },


            /*
            |--------------------------------------------------------------------------
            | Repair timing
            |--------------------------------------------------------------------------
            |
            | repairStartTime:
            |     Actual start of repair activity.
            |
            | repairEndTime:
            |     Actual completion of repair work.
            |
            | restorationTime:
            |     Time the equipment / function was confirmed returned to service.
            |
            | These are deliberately separate.
            |--------------------------------------------------------------------------
            */

            repairStartTime: {
                type:
                    Date,

                default:
                    null,

                index:
                    true,
            },


            repairEndTime: {
                type:
                    Date,

                default:
                    null,
            },


            restorationTime: {
                type:
                    Date,

                default:
                    null,

                index:
                    true,
            },


            endTime: {
                type:
                    Date,

                default:
                    null,
            },


            /*
            |--------------------------------------------------------------------------
            | Derived durations
            |--------------------------------------------------------------------------
            |
            | downtimeSeconds:
            |     failure start -> restoration
            |
            | repairDurationSeconds:
            |     repair start -> repair end
            |
            | These MUST NOT automatically be assumed equal.
            |--------------------------------------------------------------------------
            */

            downtimeSeconds: {
                type:
                    Number,

                default:
                    null,

                min:
                    0,
            },


            repairDurationSeconds: {
                type:
                    Number,

                default:
                    null,

                min:
                    0,
            },


            /*
            |--------------------------------------------------------------------------
            | Detection / response metrics
            |--------------------------------------------------------------------------
            */

            detectionDelaySeconds: {
                type:
                    Number,

                default:
                    null,

                min:
                    0,
            },


            responseTimeSeconds: {
                type:
                    Number,

                default:
                    null,

                min:
                    0,
            },


            /*
            |--------------------------------------------------------------------------
            | Operational impact
            |--------------------------------------------------------------------------
            */

            affectedLoadKw: {
                type:
                    Number,

                default:
                    null,

                min:
                    0,
            },


            energyNotSuppliedKwh: {
                type:
                    Number,

                default:
                    null,

                min:
                    0,
            },


            /*
            |--------------------------------------------------------------------------
            | Maintenance / repair context
            |--------------------------------------------------------------------------
            */

            technician: {
                type:
                    String,

                default:
                    null,
            },


            contractor: {
                type:
                    String,

                default:
                    null,
            },


            maintenanceCost: {
                type:
                    Number,

                default:
                    null,

                min:
                    0,
            },


            /*
            |--------------------------------------------------------------------------
            | Engineering diagnosis
            |--------------------------------------------------------------------------
            */

            cause: {
                type:
                    String,

                default:
                    null,
            },


            rootCause: {
                type:
                    String,

                default:
                    null,
            },


            correctiveAction: {
                type:
                    String,

                default:
                    null,
            },


            notes: {
                type:
                    String,

                default:
                    null,
            },


            /*
            |--------------------------------------------------------------------------
            | Evidence
            |--------------------------------------------------------------------------
            */

            detectionEvidence: {
                type: [
                    {
                        telemetryId: {
                            type:
                                Schema.Types.ObjectId,

                            ref:
                                "Telemetry",

                            default:
                                null,
                        },

                        parameter: {
                            type:
                                String,

                            default:
                                null,
                        },

                        value: {
                            type:
                                Schema.Types.Mixed,

                            default:
                                null,
                        },

                        timestamp: {
                            type:
                                Date,

                            default:
                                null,
                        },

                        role: {
                            type:
                                String,

                            default:
                                null,
                        },
                    },
                ],

                default:
                    [],
            },


            restorationEvidence: {
                type: [
                    {
                        telemetryId: {
                            type:
                                Schema.Types.ObjectId,

                            ref:
                                "Telemetry",

                            default:
                                null,
                        },

                        parameter: {
                            type:
                                String,

                            default:
                                null,
                        },

                        value: {
                            type:
                                Schema.Types.Mixed,

                            default:
                                null,
                        },

                        timestamp: {
                            type:
                                Date,

                            default:
                                null,
                        },

                        role: {
                            type:
                                String,

                            default:
                                null,
                        },
                    },
                ],

                default:
                    [],
            },


            /*
            |--------------------------------------------------------------------------
            | Confidence
            |--------------------------------------------------------------------------
            */

            detectionMethod: {
                type:
                    String,

                enum: [
                    "TELEMETRY",
                    "ALARM",
                    "MULTI_SIGNAL",
                    "MAINTENANCE_RECORD",
                    "MANUAL",
                    "UNKNOWN",
                ],

                default:
                    "UNKNOWN",
            },


            confidence: {
                type:
                    Number,

                default:
                    null,

                min:
                    0,

                max:
                    1,
            },


            /*
            |--------------------------------------------------------------------------
            | Reliability qualification
            |--------------------------------------------------------------------------
            |
            | These flags prevent incomplete or ambiguous failure records from
            | silently entering MTBF / MTTR calculations.
            |--------------------------------------------------------------------------
            */

            failureConfirmed: {
                type:
                    Boolean,

                default:
                    false,

                index:
                    true,
            },


            eligibleForMtbf: {
                type:
                    Boolean,

                default:
                    false,

                index:
                    true,
            },


            eligibleForMttr: {
                type:
                    Boolean,

                default:
                    false,

                index:
                    true,
            },


            /*
            |--------------------------------------------------------------------------
            | Auditability
            |--------------------------------------------------------------------------
            */

            raw: {
                type:
                    Schema.Types.Mixed,

                default:
                    null,
            },
        },
        {
            timestamps:
                true,
        }
    );


/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

failureEventSchema.index({
    installation: 1,
    startTime: -1,
});


failureEventSchema.index({
    installation: 1,
    equipmentType: 1,
    startTime: -1,
});


failureEventSchema.index({
    device: 1,
    startTime: -1,
});


failureEventSchema.index({
    asset: 1,
    startTime: -1,
});


failureEventSchema.index({
    status: 1,
    startTime: -1,
});


failureEventSchema.index({
    failureType: 1,
    startTime: -1,
});


failureEventSchema.index({
    failureConfirmed: 1,
    eligibleForMtbf: 1,
    eligibleForMttr: 1,
});


/*
|--------------------------------------------------------------------------
| Important
|--------------------------------------------------------------------------
|
| We intentionally do NOT create a broad unique index such as:
|
| installation + failureType + startTime
|
| because two different assets in one installation may fail at the same time.
|
| Physical-event deduplication belongs in the future FailureEvent persistence
| service, where device / asset / evidence identity can be evaluated safely.
|--------------------------------------------------------------------------
*/


const FailureEvent =
    model(
        "FailureEvent",
        failureEventSchema
    );


export default FailureEvent;