// services/optimizationDss/optimizationDssSiteConfigurationService.js

import mongoose
  from "mongoose";

import OptimizationDssSiteConfiguration
  from "../../models/OptimizationDssSiteConfiguration.js";

import Installation
  from "../../models/Installation.js";


export const OPTIMIZATION_DSS_SITE_CONFIGURATION_STATUS =
  Object.freeze({
    FOUND:
      "FOUND",

    SAVED:
      "SAVED",

    NOT_FOUND:
      "NOT_FOUND",
  });


export const OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR =
  Object.freeze({
    VRM_SITE_ID_REQUIRED:
      "VRM_SITE_ID_REQUIRED",

    INSTALLATION_ID_REQUIRED:
      "INSTALLATION_ID_REQUIRED",

    INSTALLATION_NOT_FOUND:
      "INSTALLATION_NOT_FOUND",

    INSTALLATION_ID_MISMATCH:
      "INSTALLATION_ID_MISMATCH",

    CONFIGURATION_BODY_REQUIRED:
      "CONFIGURATION_BODY_REQUIRED",

    INVALID_CONFIGURATION_FIELD:
      "INVALID_CONFIGURATION_FIELD",

    INVALID_RESOURCE_CONFIGURATION:
      "INVALID_RESOURCE_CONFIGURATION",

    INVALID_ENGINEERING_QUANTITY:
      "INVALID_ENGINEERING_QUANTITY",

    INVALID_ENGINEERING_QUANTITY_VALUE:
      "INVALID_ENGINEERING_QUANTITY_VALUE",

    INVALID_ENGINEERING_QUANTITY_UNIT:
      "INVALID_ENGINEERING_QUANTITY_UNIT",

    INVALID_ENGINEERING_QUANTITY_SOURCE:
      "INVALID_ENGINEERING_QUANTITY_SOURCE",

    INVALID_ENGINEERING_EVIDENCE_BASIS:
      "INVALID_ENGINEERING_EVIDENCE_BASIS",

    INVALID_ENGINEERING_APPLICABILITY:
      "INVALID_ENGINEERING_QUANTITY_APPLICABILITY",

    INVALID_CONFIGURATION_STATUS:
      "INVALID_CONFIGURATION_STATUS",

    INVALID_PROVENANCE:
      "INVALID_PROVENANCE",

    INVALID_SOC_RANGE:
      "INVALID_SOC_RANGE",

    INVALID_EFFICIENCY_RANGE:
      "INVALID_EFFICIENCY_RANGE",

    INVALID_POWER_RANGE:
      "INVALID_POWER_RANGE",

    INVALID_QUANTITY_SIGN:
      "INVALID_QUANTITY_SIGN",

    PERSISTENCE_FAILED:
      "OPTIMIZATION_DSS_CONFIGURATION_PERSISTENCE_FAILED",
  });


const EVIDENCE_BASES =
  new Set([
    "ENGINEERING_CONFIGURATION",
    "MANUFACTURER_DATASHEET",
    "COMMISSIONING_RECORD",
    "SITE_SURVEY",
    "OPERATOR_CONFIGURATION",
  ]);


const CONFIGURATION_STATUSES =
  new Set([
    "ACTIVE",
    "INACTIVE",
  ]);


const TOP_LEVEL_FIELDS =
  new Set([
    "status",
    "grid",
    "battery",
    "solar",
    "generator",
    "provenance",
  ]);


const RESOURCE_FIELDS =
  Object.freeze({
    grid:
      new Set([
        "enabled",
        "maxImportPower",
        "maxExportPower",
      ]),

    battery:
      new Set([
        "enabled",
        "usableCapacity",
        "minimumSoc",
        "maximumSoc",
        "maxChargePower",
        "maxDischargePower",
        "chargeEfficiency",
        "dischargeEfficiency",
      ]),

    solar:
      new Set([
        "enabled",
        "ratedPower",
      ]),

    generator:
      new Set([
        "enabled",
        "minimumPower",
        "maximumPower",
      ]),
  });


const PROVENANCE_FIELDS =
  new Set([
    "verifiedBy",
    "verifiedAt",
  ]);


const QUANTITY_FIELDS =
  new Set([
    "value",
    "unit",
    "source",
    "evidenceBasis",
    "applicableFrom",
    "applicableUntil",
    "notes",
  ]);


const QUANTITY_RULES =
  Object.freeze({
    "grid.maxImportPower":
      Object.freeze({
        minimum:
          0,
      }),

    "grid.maxExportPower":
      Object.freeze({
        minimum:
          0,
      }),

    "battery.usableCapacity":
      Object.freeze({
        minimumExclusive:
          0,
      }),

    "battery.minimumSoc":
      Object.freeze({
        minimum:
          0,
        maximum:
          100,
      }),

    "battery.maximumSoc":
      Object.freeze({
        minimum:
          0,
        maximum:
          100,
      }),

    "battery.maxChargePower":
      Object.freeze({
        minimum:
          0,
      }),

    "battery.maxDischargePower":
      Object.freeze({
        minimum:
          0,
      }),

    "battery.chargeEfficiency":
      Object.freeze({
        minimumExclusive:
          0,
        maximum:
          1,
      }),

    "battery.dischargeEfficiency":
      Object.freeze({
        minimumExclusive:
          0,
        maximum:
          1,
      }),

    "solar.ratedPower":
      Object.freeze({
        minimum:
          0,
      }),

    "generator.minimumPower":
      Object.freeze({
        minimum:
          0,
      }),

    "generator.maximumPower":
      Object.freeze({
        minimum:
          0,
      }),
  });


function configurationError(
  code,
  message,
  {
    statusCode = 400,
    details = null,
  } = {}
) {
  const error =
    new Error(
      message ??
        code
    );

  error.code =
    code;

  error.statusCode =
    statusCode;

  error.details =
    details;

  return error;
}


function isPlainObject(
  value
) {
  return (
    value !==
      null &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  );
}


function assertAllowedFields(
  candidate,
  allowedFields,
  context
) {
  for (
    const field of
    Object.keys(
      candidate
    )
  ) {
    if (
      !allowedFields.has(
        field
      )
    ) {
      throw configurationError(
        OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
          .INVALID_CONFIGURATION_FIELD,
        `Unsupported ${context} field: ${field}.`,
        {
          details: {
            context,
            field,
          },
        }
      );
    }
  }
}


function normalizeRequiredString(
  value,
  code,
  field
) {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    throw configurationError(
      code,
      `${field} is required.`,
      {
        details: {
          field,
        },
      }
    );
  }

  return value.trim();
}


function normalizeNullableString(
  value,
  field
) {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return null;
  }

  if (
    typeof value !==
      "string"
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_PROVENANCE,
      `${field} must be a string or null.`,
      {
        details: {
          field,
        },
      }
    );
  }

  const normalized =
    value.trim();

  return normalized ||
    null;
}


function normalizeDate(
  value,
  {
    nullable = true,
    field,
    code =
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_ENGINEERING_APPLICABILITY,
  } = {}
) {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  ) {
    if (
      nullable
    ) {
      return null;
    }

    throw configurationError(
      code,
      `${field} is required.`,
      {
        details: {
          field,
        },
      }
    );
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw configurationError(
      code,
      `${field} must contain a valid date/time.`,
      {
        details: {
          field,
        },
      }
    );
  }

  return date;
}


function normalizeEngineeringQuantity(
  candidate,
  fieldPath
) {
  if (
    candidate === undefined ||
    candidate === null
  ) {
    return null;
  }

  if (
    !isPlainObject(
      candidate
    )
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_ENGINEERING_QUANTITY,
      `${fieldPath} must be an engineering quantity object.`,
      {
        details: {
          field:
            fieldPath,
        },
      }
    );
  }


  assertAllowedFields(
    candidate,
    QUANTITY_FIELDS,
    fieldPath
  );


  /*
  |--------------------------------------------------------------------------
  | Engineering quantity value
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | Do not coerce the supplied value with Number(...).
  |
  | Engineering configuration is authoritative input to the DSS feasible
  | region. Values such as:
  |
  |   true
  |   false
  |   "100"
  |   ""
  |   []
  |
  | must not be silently converted into numeric engineering limits.
  |
  | The API therefore accepts only an actual finite JSON number.
  |
  */

  if (
    typeof candidate.value !==
      "number" ||
    !Number.isFinite(
      candidate.value
    )
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_ENGINEERING_QUANTITY_VALUE,
      `${fieldPath}.value must be a finite number.`,
      {
        details: {
          field:
            `${fieldPath}.value`,
        },
      }
    );
  }


  const value =
    candidate.value;


  const rule =
    QUANTITY_RULES[
      fieldPath
    ] ??
    {};


  if (
    rule.minimum !==
      undefined &&
    value <
      rule.minimum
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_QUANTITY_SIGN,
      `${fieldPath}.value is below its permitted minimum.`,
      {
        details: {
          field:
            `${fieldPath}.value`,
          minimum:
            rule.minimum,
          value,
        },
      }
    );
  }


  if (
    rule.minimumExclusive !==
      undefined &&
    value <=
      rule.minimumExclusive
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_QUANTITY_SIGN,
      `${fieldPath}.value must be greater than ${rule.minimumExclusive}.`,
      {
        details: {
          field:
            `${fieldPath}.value`,
          minimumExclusive:
            rule.minimumExclusive,
          value,
        },
      }
    );
  }


  if (
    rule.maximum !==
      undefined &&
    value >
      rule.maximum
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_ENGINEERING_QUANTITY_VALUE,
      `${fieldPath}.value exceeds its permitted maximum.`,
      {
        details: {
          field:
            `${fieldPath}.value`,
          maximum:
            rule.maximum,
          value,
        },
      }
    );
  }


  const unit =
    normalizeRequiredString(
      candidate.unit,
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_ENGINEERING_QUANTITY_UNIT,
      `${fieldPath}.unit`
    );


  const source =
    normalizeRequiredString(
      candidate.source,
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_ENGINEERING_QUANTITY_SOURCE,
      `${fieldPath}.source`
    );


  const evidenceBasis =
    normalizeRequiredString(
      candidate.evidenceBasis,
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_ENGINEERING_EVIDENCE_BASIS,
      `${fieldPath}.evidenceBasis`
    )
      .toUpperCase();


  if (
    !EVIDENCE_BASES.has(
      evidenceBasis
    )
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_ENGINEERING_EVIDENCE_BASIS,
      `${fieldPath}.evidenceBasis is not supported.`,
      {
        details: {
          field:
            `${fieldPath}.evidenceBasis`,
          evidenceBasis,
        },
      }
    );
  }


  const applicableFrom =
    normalizeDate(
      candidate.applicableFrom,
      {
        field:
          `${fieldPath}.applicableFrom`,
      }
    );


  const applicableUntil =
    normalizeDate(
      candidate.applicableUntil,
      {
        field:
          `${fieldPath}.applicableUntil`,
      }
    );


  if (
    applicableFrom &&
    applicableUntil &&
    applicableUntil <=
      applicableFrom
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_ENGINEERING_APPLICABILITY,
      `${fieldPath} contains an invalid applicability interval.`,
      {
        details: {
          field:
            fieldPath,
        },
      }
    );
  }


  let notes =
    null;


  if (
    candidate.notes !==
      undefined &&
    candidate.notes !==
      null
  ) {
    if (
      typeof candidate.notes !==
        "string"
    ) {
      throw configurationError(
        OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
          .INVALID_ENGINEERING_QUANTITY,
        `${fieldPath}.notes must be a string or null.`,
        {
          details: {
            field:
              `${fieldPath}.notes`,
          },
        }
      );
    }


    notes =
      candidate.notes.trim() ||
      null;
  }


  return {
    value,
    unit,
    source,
    evidenceBasis,
    applicableFrom,
    applicableUntil,
    notes,
  };
}

function normalizeResource(
  resourceName,
  candidate
) {
  if (
    candidate ===
      undefined ||
    candidate ===
      null
  ) {
    return {
      enabled:
        false,
    };
  }


  if (
    !isPlainObject(
      candidate
    )
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_RESOURCE_CONFIGURATION,
      `${resourceName} must be an object.`
    );
  }


  assertAllowedFields(
    candidate,
    RESOURCE_FIELDS[
      resourceName
    ],
    resourceName
  );


  if (
    candidate.enabled !==
      undefined &&
    typeof candidate.enabled !==
      "boolean"
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_RESOURCE_CONFIGURATION,
      `${resourceName}.enabled must be boolean.`,
      {
        details: {
          field:
            `${resourceName}.enabled`,
        },
      }
    );
  }


  const normalized =
    {
      enabled:
        candidate.enabled ===
          true,
    };


  for (
    const field of
    RESOURCE_FIELDS[
      resourceName
    ]
  ) {
    if (
      field ===
        "enabled"
    ) {
      continue;
    }

    normalized[
      field
    ] =
      normalizeEngineeringQuantity(
        candidate[
          field
        ],
        `${resourceName}.${field}`
      );
  }


  return normalized;
}


function validateCrossFieldRules(
  configuration
) {
  const minimumSoc =
    configuration
      .battery
      ?.minimumSoc
      ?.value;

  const maximumSoc =
    configuration
      .battery
      ?.maximumSoc
      ?.value;


  if (
    Number.isFinite(
      minimumSoc
    ) &&
    Number.isFinite(
      maximumSoc
    ) &&
    minimumSoc >
      maximumSoc
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_SOC_RANGE,
      "battery.minimumSoc cannot exceed battery.maximumSoc."
    );
  }


  const generatorMinimum =
    configuration
      .generator
      ?.minimumPower
      ?.value;

  const generatorMaximum =
    configuration
      .generator
      ?.maximumPower
      ?.value;


  if (
    Number.isFinite(
      generatorMinimum
    ) &&
    Number.isFinite(
      generatorMaximum
    ) &&
    generatorMinimum >
      generatorMaximum
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_POWER_RANGE,
      "generator.minimumPower cannot exceed generator.maximumPower."
    );
  }
}


function normalizeConfigurationBody(
  body
) {
  if (
    !isPlainObject(
      body
    )
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .CONFIGURATION_BODY_REQUIRED,
      "Optimization DSS configuration body is required."
    );
  }


  assertAllowedFields(
    body,
    TOP_LEVEL_FIELDS,
    "configuration"
  );


  const status =
    body.status ===
      undefined
      ? "ACTIVE"
      : normalizeRequiredString(
          body.status,
          OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
            .INVALID_CONFIGURATION_STATUS,
          "status"
        )
          .toUpperCase();


  if (
    !CONFIGURATION_STATUSES.has(
      status
    )
  ) {
    throw configurationError(
      OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
        .INVALID_CONFIGURATION_STATUS,
      "Configuration status must be ACTIVE or INACTIVE."
    );
  }


  let provenance =
    {};

  if (
    body.provenance !==
      undefined &&
    body.provenance !==
      null
  ) {
    if (
      !isPlainObject(
        body.provenance
      )
    ) {
      throw configurationError(
        OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
          .INVALID_PROVENANCE,
        "provenance must be an object."
      );
    }


    assertAllowedFields(
      body.provenance,
      PROVENANCE_FIELDS,
      "provenance"
    );


    provenance =
      {
        verifiedBy:
          normalizeNullableString(
            body.provenance
              .verifiedBy,
            "provenance.verifiedBy"
          ),

        verifiedAt:
          normalizeDate(
            body.provenance
              .verifiedAt,
            {
              field:
                "provenance.verifiedAt",
              code:
                OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
                  .INVALID_PROVENANCE,
            }
          ),
      };
  }


  const normalized =
    {
      status,

      grid:
        normalizeResource(
          "grid",
          body.grid
        ),

      battery:
        normalizeResource(
          "battery",
          body.battery
        ),

      solar:
        normalizeResource(
          "solar",
          body.solar
        ),

      generator:
        normalizeResource(
          "generator",
          body.generator
        ),

      provenance,
    };


  validateCrossFieldRules(
    normalized
  );


  return normalized;
}


function serializeConfiguration(
  document
) {
  if (
    !document
  ) {
    return null;
  }

  const source =
    typeof document.toObject ===
      "function"
      ? document.toObject()
      : document;


  return {
    id:
      String(
        source._id
      ),

    installation:
      source.installation
        ? String(
            source.installation
          )
        : null,

    site:
      source.site
        ? String(
            source.site
          )
        : null,

    vrmSiteId:
      source.vrmSiteId,

    status:
      source.status,

    grid:
      source.grid,

    battery:
      source.battery,

    solar:
      source.solar,

    generator:
      source.generator,

    provenance:
      source.provenance,

    createdAt:
      source.createdAt ??
      null,

    updatedAt:
      source.updatedAt ??
      null,
  };
}


export function createOptimizationDssSiteConfigurationService({
  ConfigurationModel =
    OptimizationDssSiteConfiguration,

  InstallationModel =
    Installation,
} = {}) {
  async function getConfiguration({
    vrmSiteId,
    installationId,
  } = {}) {
    const normalizedVrmSiteId =
      normalizeRequiredString(
        vrmSiteId,
        OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
          .VRM_SITE_ID_REQUIRED,
        "vrmSiteId"
      );


    const normalizedInstallationId =
      normalizeRequiredString(
        installationId,
        OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
          .INSTALLATION_ID_REQUIRED,
        "installationId"
      );


    const configuration =
      await ConfigurationModel
        .findOne({
          vrmSiteId:
            normalizedVrmSiteId,

          installation:
            normalizedInstallationId,
        })
        .lean()
        .exec();


    if (
      !configuration
    ) {
      return Object.freeze({
        status:
          OPTIMIZATION_DSS_SITE_CONFIGURATION_STATUS
            .NOT_FOUND,

        configuration:
          null,
      });
    }


    return Object.freeze({
      status:
        OPTIMIZATION_DSS_SITE_CONFIGURATION_STATUS
          .FOUND,

      configuration:
        serializeConfiguration(
          configuration
        ),
    });
  }


  async function putConfiguration({
    vrmSiteId,
    installationId,
    actorUserId,
    body,
  } = {}) {
    const normalizedVrmSiteId =
      normalizeRequiredString(
        vrmSiteId,
        OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
          .VRM_SITE_ID_REQUIRED,
        "vrmSiteId"
      );


    const normalizedInstallationId =
      normalizeRequiredString(
        installationId,
        OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
          .INSTALLATION_ID_REQUIRED,
        "installationId"
      );


    if (
      !mongoose.Types.ObjectId.isValid(
        normalizedInstallationId
      )
    ) {
      throw configurationError(
        OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
          .INSTALLATION_ID_REQUIRED,
        "A valid installationId is required."
      );
    }


    const actor =
      normalizeRequiredString(
        actorUserId,
        OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
          .INVALID_PROVENANCE,
        "actorUserId"
      );


    const normalizedBody =
      normalizeConfigurationBody(
        body
      );


    const installation =
      await InstallationModel
        .findOne({
          _id:
            normalizedInstallationId,

          vrmSiteId:
            normalizedVrmSiteId,
        })
        .select({
          _id: 1,
          site: 1,
          vrmSiteId: 1,
        })
        .lean()
        .exec();


    if (
      !installation
    ) {
      const installationById =
        await InstallationModel
          .findById(
            normalizedInstallationId
          )
          .select({
            _id: 1,
            vrmSiteId: 1,
          })
          .lean()
          .exec();


      if (
        installationById
      ) {
        throw configurationError(
          OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
            .INSTALLATION_ID_MISMATCH,
          "Authorized installation does not match vrmSiteId.",
          {
            statusCode:
              409,
          }
        );
      }


      throw configurationError(
        OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
          .INSTALLATION_NOT_FOUND,
        "Installation was not found.",
        {
          statusCode:
            404,
        }
      );
    }


    const existing =
      await ConfigurationModel
        .findOne({
          vrmSiteId:
            normalizedVrmSiteId,
        })
        .exec();


    const nextRevision =
      existing
        ? Math.max(
            1,
            Number(
              existing.provenance
                ?.revision ??
              1
            ) +
              1
          )
        : 1;


    const replacement =
      {
        installation:
          installation._id,

        site:
          installation.site ??
          null,

        vrmSiteId:
          normalizedVrmSiteId,

        status:
          normalizedBody.status,

        grid:
          normalizedBody.grid,

        battery:
          normalizedBody.battery,

        solar:
          normalizedBody.solar,

        generator:
          normalizedBody.generator,

        provenance:
          {
            configuredBy:
              actor,

            verifiedBy:
              normalizedBody
                .provenance
                .verifiedBy,

            verifiedAt:
              normalizedBody
                .provenance
                .verifiedAt,

            revision:
              nextRevision,
          },
      };


    try {
      let saved;


      if (
        existing
      ) {
        existing.set(
          replacement
        );

        saved =
          await existing.save();
      } else {
        saved =
          await ConfigurationModel.create(
            replacement
          );
      }


      return Object.freeze({
        status:
          OPTIMIZATION_DSS_SITE_CONFIGURATION_STATUS
            .SAVED,

        created:
          !existing,

        configuration:
          serializeConfiguration(
            saved
          ),
      });
    } catch (
      error
    ) {
      if (
        error?.code ===
          11000
      ) {
        throw configurationError(
          OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
            .PERSISTENCE_FAILED,
          "Optimization DSS configuration already exists for this site.",
          {
            statusCode:
              409,
          }
        );
      }


      if (
        error?.name ===
          "ValidationError" ||
        error?.message ===
          "INVALID_ENGINEERING_QUANTITY_APPLICABILITY"
      ) {
        throw configurationError(
          error?.message ===
            "INVALID_ENGINEERING_QUANTITY_APPLICABILITY"
            ? OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
                .INVALID_ENGINEERING_APPLICABILITY
            : OPTIMIZATION_DSS_SITE_CONFIGURATION_ERROR
                .INVALID_ENGINEERING_QUANTITY,
          error?.message ??
            "Optimization DSS configuration validation failed."
        );
      }


      throw error;
    }
  }


  return Object.freeze({
    getConfiguration,
    putConfiguration,
  });
}


export default
  createOptimizationDssSiteConfigurationService;