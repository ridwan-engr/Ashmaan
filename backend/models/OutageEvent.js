import mongoose from "mongoose";


const {
  Schema,
  model,
} = mongoose;


const outageEventSchema =
  new Schema(
    {
      /*
       * Site relationships
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
       * Event classification
       */

      eventType: {
        type:
          String,

        enum: [
          "GRID_OUTAGE",
          "LOAD_INTERRUPTION",
          "SUPPLY_FAILURE",
          "UNKNOWN_OUTAGE",
        ],

        required:
          true,

        index:
          true,
      },

      source: {
        type:
          String,

        enum: [
          "VRM",
          "MANUAL",
          "DERIVED",
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
       * Duration
       *
       * Stored in seconds.
       */

      durationSeconds: {
        type:
          Number,

        default:
          null,

        min:
          0,
      },


      /*
       * Electrical impact
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
       * Reliability population impact
       *
       * Initially a site may represent one
       * service point. This can later be
       * expanded to customer-level impact.
       */

      affectedCustomers: {
        type:
          Number,

        default:
          1,

        min:
          0,
      },


      /*
       * Evidence used by the event detector.
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
          },
        ],

        default:
          [],
      },


      /*
       * Restoration evidence
       */

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
          },
        ],

        default:
          [],
      },


      /*
       * Detection metadata
       */

      detectionMethod: {
        type: String,

        enum: [
          "ACTIVE_SOURCE_TRANSITION",
          "GRID_METER",
          "GRID_STATE",
          "AC_INPUT",
          "POWER_FLOW",
          "MULTI_SIGNAL",
          "MANUAL",
          "UNKNOWN",
        ],

        default: "UNKNOWN",
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
       * Optional engineering context.
       */

      cause: {
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
       * Auditability
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


outageEventSchema.index({
  installation: 1,
  startTime: -1,
});


outageEventSchema.index({
  installation: 1,
  status: 1,
});


outageEventSchema.index({
  eventType: 1,
  startTime: -1,
});


/*
 * Prevent multiple derived outage events
 * starting at the exact same timestamp
 * for the same installation/type.
 */

outageEventSchema.index(
  {
    installation: 1,
    eventType: 1,
    startTime: 1,
  },
  {
    unique:
      true,

    name:
      "uniq_installation_outage_type_start",
  }
);


const OutageEvent =
  model(
    "OutageEvent",
    outageEventSchema
  );


export default OutageEvent;