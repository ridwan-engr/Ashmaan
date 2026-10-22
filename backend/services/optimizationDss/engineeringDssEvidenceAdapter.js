import OptimizationDssSiteConfiguration
  from "../../models/OptimizationDssSiteConfiguration.js";


export const ENGINEERING_DSS_EVIDENCE_ADAPTER_PHASE =
  "11.2C";

export const ENGINEERING_DSS_EVIDENCE_ADAPTER_LAYER =
  "OPTIMIZATION_DSS";


export const ENGINEERING_DSS_EVIDENCE_STATUS =
  Object.freeze({
    QUALIFIED:
      "QUALIFIED",

    PARTIALLY_QUALIFIED:
      "PARTIALLY_QUALIFIED",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const ENGINEERING_DSS_EVIDENCE_REASON =
  Object.freeze({
    QUALIFIED:
      "QUALIFIED",

    PARTIAL_CONFIGURATION:
      "PARTIAL_CONFIGURATION",

    CONFIGURATION_NOT_FOUND:
      "CONFIGURATION_NOT_FOUND",

    CONFIGURATION_INACTIVE:
      "CONFIGURATION_INACTIVE",

    NO_QUALIFIED_ENGINEERING_CONSTRAINTS:
      "NO_QUALIFIED_ENGINEERING_CONSTRAINTS",
  });


export const ENGINEERING_DSS_EVIDENCE_METRIC =
  Object.freeze({
    GRID_IMPORT_LIMIT:
      "GRID_IMPORT_LIMIT",

    GRID_EXPORT_LIMIT:
      "GRID_EXPORT_LIMIT",

    BATTERY_USABLE_CAPACITY:
      "BATTERY_USABLE_CAPACITY",

    BATTERY_MINIMUM_SOC:
      "BATTERY_MINIMUM_SOC",

    BATTERY_MAXIMUM_SOC:
      "BATTERY_MAXIMUM_SOC",

    BATTERY_MAX_CHARGE_POWER:
      "BATTERY_MAX_CHARGE_POWER",

    BATTERY_MAX_DISCHARGE_POWER:
      "BATTERY_MAX_DISCHARGE_POWER",

    BATTERY_CHARGE_EFFICIENCY:
      "BATTERY_CHARGE_EFFICIENCY",

    BATTERY_DISCHARGE_EFFICIENCY:
      "BATTERY_DISCHARGE_EFFICIENCY",

    SOLAR_RATED_POWER:
      "SOLAR_RATED_POWER",

    GENERATOR_MINIMUM_POWER:
      "GENERATOR_MINIMUM_POWER",

    GENERATOR_MAXIMUM_POWER:
      "GENERATOR_MAXIMUM_POWER",
  });


const BOUNDARIES =
  Object.freeze({
    readOnly:
      true,

    configurationMutationAllowed:
      false,

    telemetryUsedAsConfiguredLimit:
      false,

    observedMaximumUsedAsConfiguredLimit:
      false,

    missingMeansZero:
      false,

    unavailableMeansZero:
      false,

    unitInferenceAllowed:
      false,

    capacityUnitInferenceAllowed:
      false,

    batteryDirectionInferenceAllowed:
      false,

    gridDirectionInferenceAllowed:
      false,

    vrmSettingAutomaticallyEngineeringLimit:
      false,

    optimizationExecuted:
      false,
  });


function plain(
  value
) {
  if (
    value &&
    typeof value.toObject ===
      "function"
  ) {
    return value.toObject();
  }

  return value;
}


function asIsoOrNull(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}


function quantityIsApplicable(
  quantity,
  at
) {
  const instant =
    new Date(at);

  if (
    Number.isNaN(
      instant.getTime()
    )
  ) {
    throw new Error(
      "INVALID_ENGINEERING_EVIDENCE_INSTANT"
    );
  }

  if (
    quantity.applicableFrom &&
    instant <
      new Date(
        quantity.applicableFrom
      )
  ) {
    return false;
  }

  if (
    quantity.applicableUntil &&
    instant >=
      new Date(
        quantity.applicableUntil
      )
  ) {
    return false;
  }

  return true;
}


function buildEvidence({
  metricName,
  quantity,
  vrmSiteId,
  installationId,
  siteId,
  resource,
  at,
} = {}) {
  if (
    !quantity ||
    typeof quantity !==
      "object"
  ) {
    return null;
  }

  const value =
    Number(
      quantity.value
    );

  if (
    !Number.isFinite(
      value
    )
  ) {
    return null;
  }

  if (
    typeof quantity.unit !==
      "string" ||
    !quantity.unit.trim()
  ) {
    return null;
  }

  if (
    typeof quantity.source !==
      "string" ||
    !quantity.source.trim()
  ) {
    return null;
  }

  if (
    typeof quantity.evidenceBasis !==
      "string" ||
    !quantity.evidenceBasis.trim()
  ) {
    return null;
  }

  if (
    !quantityIsApplicable(
      quantity,
      at
    )
  ) {
    return null;
  }

  return Object.freeze({
    phase:
      ENGINEERING_DSS_EVIDENCE_ADAPTER_PHASE,

    layer:
      ENGINEERING_DSS_EVIDENCE_ADAPTER_LAYER,

    status:
      ENGINEERING_DSS_EVIDENCE_STATUS
        .QUALIFIED,

    reason:
      ENGINEERING_DSS_EVIDENCE_REASON
        .QUALIFIED,

    metricName,

    value,

    unit:
      quantity.unit.trim(),

    vrmSiteId:
      String(vrmSiteId),

    installationId:
      installationId
        ? String(installationId)
        : null,

    siteId:
      siteId
        ? String(siteId)
        : null,

    resource,

    applicability:
      Object.freeze({
        from:
          asIsoOrNull(
            quantity.applicableFrom
          ),

        until:
          asIsoOrNull(
            quantity.applicableUntil
          ),

        semantics:
          "[applicableFrom,applicableUntil)",
      }),

    provenance:
      Object.freeze({
        source:
          quantity.source.trim(),

        evidenceBasis:
          quantity.evidenceBasis,

        notes:
          quantity.notes ??
          null,
      }),

    boundaries:
      BOUNDARIES,
  });
}


function collectResourceEvidence({
  configuration,
  at,
} = {}) {
  const evidence =
    [];

  const common = {
    vrmSiteId:
      configuration.vrmSiteId,

    installationId:
      configuration.installation,

    siteId:
      configuration.site,

    at,
  };


  if (
    configuration.grid
      ?.enabled === true
  ) {
    evidence.push(
      buildEvidence({
        ...common,

        resource:
          "GRID",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .GRID_IMPORT_LIMIT,

        quantity:
          configuration.grid
            .maxImportPower,
      }),

      buildEvidence({
        ...common,

        resource:
          "GRID",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .GRID_EXPORT_LIMIT,

        quantity:
          configuration.grid
            .maxExportPower,
      })
    );
  }


  if (
    configuration.battery
      ?.enabled === true
  ) {
    evidence.push(
      buildEvidence({
        ...common,

        resource:
          "BATTERY",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .BATTERY_USABLE_CAPACITY,

        quantity:
          configuration.battery
            .usableCapacity,
      }),

      buildEvidence({
        ...common,

        resource:
          "BATTERY",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .BATTERY_MINIMUM_SOC,

        quantity:
          configuration.battery
            .minimumSoc,
      }),

      buildEvidence({
        ...common,

        resource:
          "BATTERY",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .BATTERY_MAXIMUM_SOC,

        quantity:
          configuration.battery
            .maximumSoc,
      }),

      buildEvidence({
        ...common,

        resource:
          "BATTERY",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .BATTERY_MAX_CHARGE_POWER,

        quantity:
          configuration.battery
            .maxChargePower,
      }),

      buildEvidence({
        ...common,

        resource:
          "BATTERY",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .BATTERY_MAX_DISCHARGE_POWER,

        quantity:
          configuration.battery
            .maxDischargePower,
      }),

      buildEvidence({
        ...common,

        resource:
          "BATTERY",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .BATTERY_CHARGE_EFFICIENCY,

        quantity:
          configuration.battery
            .chargeEfficiency,
      }),

      buildEvidence({
        ...common,

        resource:
          "BATTERY",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .BATTERY_DISCHARGE_EFFICIENCY,

        quantity:
          configuration.battery
            .dischargeEfficiency,
      })
    );
  }


  if (
    configuration.solar
      ?.enabled === true
  ) {
    evidence.push(
      buildEvidence({
        ...common,

        resource:
          "SOLAR",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .SOLAR_RATED_POWER,

        quantity:
          configuration.solar
            .ratedPower,
      })
    );
  }


  if (
    configuration.generator
      ?.enabled === true
  ) {
    evidence.push(
      buildEvidence({
        ...common,

        resource:
          "GENERATOR",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .GENERATOR_MINIMUM_POWER,

        quantity:
          configuration.generator
            .minimumPower,
      }),

      buildEvidence({
        ...common,

        resource:
          "GENERATOR",

        metricName:
          ENGINEERING_DSS_EVIDENCE_METRIC
            .GENERATOR_MAXIMUM_POWER,

        quantity:
          configuration.generator
            .maximumPower,
      })
    );
  }


  return Object.freeze(
    evidence.filter(Boolean)
  );
}


export async function getEngineeringDssEvidence({
  vrmSiteId,
  at = new Date(),
  ConfigurationModel =
    OptimizationDssSiteConfiguration,
} = {}) {
  if (
    vrmSiteId ===
      undefined ||
    vrmSiteId ===
      null ||
    !String(
      vrmSiteId
    ).trim()
  ) {
    throw new Error(
      "VRM_SITE_ID_REQUIRED"
    );
  }


  let query =
    ConfigurationModel.findOne({
      vrmSiteId:
        String(
          vrmSiteId
        ),

      status:
        "ACTIVE",
    });


  if (
    query &&
    typeof query.lean ===
      "function"
  ) {
    query =
      query.lean();
  }


  const record =
    plain(
      await query
    );


  if (!record) {
    return Object.freeze({
      phase:
        ENGINEERING_DSS_EVIDENCE_ADAPTER_PHASE,

      layer:
        ENGINEERING_DSS_EVIDENCE_ADAPTER_LAYER,

      status:
        ENGINEERING_DSS_EVIDENCE_STATUS
          .UNAVAILABLE,

      reason:
        ENGINEERING_DSS_EVIDENCE_REASON
          .CONFIGURATION_NOT_FOUND,

      vrmSiteId:
        String(
          vrmSiteId
        ),

      evidence:
        Object.freeze([]),

      evidenceCount:
        0,

      availableEvidenceMetricNames:
        Object.freeze([]),

      configuration:
        null,

      boundaries:
        BOUNDARIES,
    });
  }


  const evidence =
    collectResourceEvidence({
      configuration:
        record,

      at,
    });


  if (
    evidence.length ===
      0
  ) {
    return Object.freeze({
      phase:
        ENGINEERING_DSS_EVIDENCE_ADAPTER_PHASE,

      layer:
        ENGINEERING_DSS_EVIDENCE_ADAPTER_LAYER,

      status:
        ENGINEERING_DSS_EVIDENCE_STATUS
          .UNAVAILABLE,

      reason:
        ENGINEERING_DSS_EVIDENCE_REASON
          .NO_QUALIFIED_ENGINEERING_CONSTRAINTS,

      vrmSiteId:
        String(
          vrmSiteId
        ),

      evidence,

      evidenceCount:
        0,

      availableEvidenceMetricNames:
        Object.freeze([]),

      configuration:
        Object.freeze({
          id:
            String(
              record._id
            ),

          status:
            record.status,

          revision:
            record.provenance
              ?.revision ??
            null,
        }),

      boundaries:
        BOUNDARIES,
    });
  }


  const enabledResources =
    [
      record.grid
        ?.enabled === true,

      record.battery
        ?.enabled === true,

      record.solar
        ?.enabled === true,

      record.generator
        ?.enabled === true,
    ].filter(Boolean)
      .length;


  const status =
    enabledResources >
      0 &&
    evidence.length >
      0
      ? ENGINEERING_DSS_EVIDENCE_STATUS
          .QUALIFIED
      : ENGINEERING_DSS_EVIDENCE_STATUS
          .PARTIALLY_QUALIFIED;


  return Object.freeze({
    phase:
      ENGINEERING_DSS_EVIDENCE_ADAPTER_PHASE,

    layer:
      ENGINEERING_DSS_EVIDENCE_ADAPTER_LAYER,

    status,

    reason:
      status ===
      ENGINEERING_DSS_EVIDENCE_STATUS
        .QUALIFIED
        ? ENGINEERING_DSS_EVIDENCE_REASON
            .QUALIFIED
        : ENGINEERING_DSS_EVIDENCE_REASON
            .PARTIAL_CONFIGURATION,

    vrmSiteId:
      String(
        vrmSiteId
      ),

    evidence,

    evidenceCount:
      evidence.length,

    availableEvidenceMetricNames:
      Object.freeze(
        [
          ...new Set(
            evidence.map(
              item =>
                item.metricName
            )
          ),
        ].sort()
      ),

    configuration:
      Object.freeze({
        id:
          String(
            record._id
          ),

        status:
          record.status,

        revision:
          record.provenance
            ?.revision ??
          null,
      }),

    boundaries:
      BOUNDARIES,
  });
}


export default
  getEngineeringDssEvidence;