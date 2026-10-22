import mongoose from "mongoose";

const engineeringQuantitySchema =
  new mongoose.Schema(
    {
      value: {
        type: Number,
        required: true,
      },

      unit: {
        type: String,
        required: true,
        trim: true,
      },

      source: {
        type: String,
        required: true,
        trim: true,
      },

      evidenceBasis: {
        type: String,
        required: true,
        enum: [
          "ENGINEERING_CONFIGURATION",
          "MANUFACTURER_DATASHEET",
          "COMMISSIONING_RECORD",
          "SITE_SURVEY",
          "OPERATOR_CONFIGURATION",
        ],
      },

      applicableFrom: {
        type: Date,
        default: null,
      },

      applicableUntil: {
        type: Date,
        default: null,
      },

      notes: {
        type: String,
        trim: true,
        default: null,
      },
    },
    {
      _id: false,
    }
  );


const gridConfigurationSchema =
  new mongoose.Schema(
    {
      enabled: {
        type: Boolean,
        default: false,
      },

      maxImportPower: {
        type: engineeringQuantitySchema,
        default: null,
      },

      maxExportPower: {
        type: engineeringQuantitySchema,
        default: null,
      },
    },
    {
      _id: false,
    }
  );


const batteryConfigurationSchema =
  new mongoose.Schema(
    {
      enabled: {
        type: Boolean,
        default: false,
      },

      usableCapacity: {
        type: engineeringQuantitySchema,
        default: null,
      },

      minimumSoc: {
        type: engineeringQuantitySchema,
        default: null,
      },

      maximumSoc: {
        type: engineeringQuantitySchema,
        default: null,
      },

      maxChargePower: {
        type: engineeringQuantitySchema,
        default: null,
      },

      maxDischargePower: {
        type: engineeringQuantitySchema,
        default: null,
      },

      chargeEfficiency: {
        type: engineeringQuantitySchema,
        default: null,
      },

      dischargeEfficiency: {
        type: engineeringQuantitySchema,
        default: null,
      },
    },
    {
      _id: false,
    }
  );


const solarConfigurationSchema =
  new mongoose.Schema(
    {
      enabled: {
        type: Boolean,
        default: false,
      },

      ratedPower: {
        type: engineeringQuantitySchema,
        default: null,
      },
    },
    {
      _id: false,
    }
  );


const generatorConfigurationSchema =
  new mongoose.Schema(
    {
      enabled: {
        type: Boolean,
        default: false,
      },

      minimumPower: {
        type: engineeringQuantitySchema,
        default: null,
      },

      maximumPower: {
        type: engineeringQuantitySchema,
        default: null,
      },
    },
    {
      _id: false,
    }
  );


const optimizationDssSiteConfigurationSchema =
  new mongoose.Schema(
    {
      installation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Installation",
        required: true,
        index: true,
      },

      site: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Site",
        default: null,
        index: true,
      },

      vrmSiteId: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true,
      },

      status: {
        type: String,
        enum: [
          "ACTIVE",
          "INACTIVE",
        ],
        default: "ACTIVE",
        index: true,
      },

      grid: {
        type: gridConfigurationSchema,
        default: () => ({}),
      },

      battery: {
        type: batteryConfigurationSchema,
        default: () => ({}),
      },

      solar: {
        type: solarConfigurationSchema,
        default: () => ({}),
      },

      generator: {
        type: generatorConfigurationSchema,
        default: () => ({}),
      },

      provenance: {
        configuredBy: {
          type: String,
          trim: true,
          default: null,
        },

        verifiedBy: {
          type: String,
          trim: true,
          default: null,
        },

        verifiedAt: {
          type: Date,
          default: null,
        },

        revision: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    },
    {
      timestamps: true,

      collection:
        "optimizationDssSiteConfigurations",
    }
  );


optimizationDssSiteConfigurationSchema.index({
  vrmSiteId: 1,
  status: 1,
});


optimizationDssSiteConfigurationSchema.pre(
  "validate",
  function validateApplicability(
    next
  ) {
    const resources = [
      this.grid,
      this.battery,
      this.solar,
      this.generator,
    ];

    for (
      const resource of resources
    ) {
      if (!resource) {
        continue;
      }

      for (
        const quantity of Object.values(
          resource.toObject
            ? resource.toObject()
            : resource
        )
      ) {
        if (
          !quantity ||
          typeof quantity !==
            "object" ||
          !(
            "applicableFrom" in
            quantity
          )
        ) {
          continue;
        }

        if (
          quantity.applicableFrom &&
          quantity.applicableUntil &&
          new Date(
            quantity.applicableUntil
          ) <=
            new Date(
              quantity.applicableFrom
            )
        ) {
          return next(
            new Error(
              "INVALID_ENGINEERING_QUANTITY_APPLICABILITY"
            )
          );
        }
      }
    }

    next();
  }
);


const OptimizationDssSiteConfiguration =
  mongoose.model(
    "OptimizationDssSiteConfiguration",
    optimizationDssSiteConfigurationSchema
  );


export default OptimizationDssSiteConfiguration;