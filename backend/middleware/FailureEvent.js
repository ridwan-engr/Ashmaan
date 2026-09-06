import mongoose from "mongoose";


const {
  Schema,
  model,
} = mongoose;


const failureEventSchema =
  new Schema(
    {
      /*
       * Relationships
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
       * Failure classification
       */

      failureType: {
        type:
          String,

        enum: [
          "GRID_FAILURE",
          "GENERATOR_FAILURE",
          "BATTERY_FAILURE",
          "SOLAR_FAILURE",
          "INVERTER_FAILURE",
          "RECTIFIER_FAILURE",
          "COMMUNICATION_FAILURE",
          "DEVICE_FAILURE",
          "SYSTEM_FAILURE",
          "UNKNOWN_FAILURE",
        ],

        required:
          true,

        index:
          true,
      },

      severity: {
        type:
          String,

        enum: [
          "INFO",
          "MINOR",
          "MAJOR",
          "CRITICAL",
        ],

        default:
          "MINOR",

        index:
          true,
      },

      source: {
        type:
          String,

        enum: [
          "VRM",
          "DERIVED",
          "MANUAL",
        ],

        default:
          "DERIVED",

        index:
          true,
      },


      /*
       * Lifecycle
       */

      status: {
        type:
          String,

        enum: [
          "OPEN",
          "DETECTED",
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

      responseTime: {
        type:
          Date,

        default:
          null,
      },

      repairStartTime: {
        type:
          Date,

        default:
          null,
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
       * Durations
       *
       * Stored in seconds.
       */

      failureDurationSeconds: {
        type:
          Number,

        default:
          null,

        min:
          0,
      },

      responseDurationSeconds: {
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

      restorationDurationSeconds: {
        type:
          Number,

        default:
          null,

        min:
          0,
      },


      /*
       * Operational impact
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

      affectedCustomers: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },


      /*
       * Maintenance / financial context
       */

      maintenanceCost: {
        type:
          Number,

        default:
          null,

        min:
          0,
      },

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


      /*
       * Detection metadata
       */

      detectionMethod: {
        type:
          String,

        enum: [
          "ALARM_RULE",
          "TELEMETRY_THRESHOLD",
          "STATE_CHANGE",
          "MULTI_SIGNAL",
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
       * Evidence
       */

      evidence: {
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
          },
        ],

        default:
          [],
      },


      /*
       * Audit trail / raw context
       */

      notes: {
        type:
          String,

        default:
          null,
      },

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
  failureType: 1,
  startTime: -1,
});


failureEventSchema.index({
  installation: 1,
  status: 1,
});


failureEventSchema.index({
  device: 1,
  startTime: -1,
});


/*
 * Prevent exact duplicate derived failures
 * for the same installation/type/start time.
 */

failureEventSchema.index(
  {
    installation: 1,
    failureType: 1,
    startTime: 1,
  },
  {
    unique:
      true,

    name:
      "uniq_installation_failure_type_start",
  }
);


const FailureEvent =
  model(
    "FailureEvent",
    failureEventSchema
  );


export default FailureEvent;