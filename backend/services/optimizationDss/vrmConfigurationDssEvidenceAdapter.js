import OptimizationDssSiteConfiguration from "../../models/OptimizationDssSiteConfiguration.js";
import Installation from "../../models/Installation.js";
import Device from "../../models/Device.js";


export const VRM_CONFIGURATION_DSS_EVIDENCE_PHASE =
  "11.2F";

export const VRM_CONFIGURATION_DSS_EVIDENCE_LAYER =
  "OPTIMIZATION_DSS";


export const VRM_CONFIGURATION_DSS_EVIDENCE_STATUS =
  Object.freeze({
    QUALIFIED: "QUALIFIED",
    PARTIALLY_QUALIFIED:
      "PARTIALLY_QUALIFIED",
    UNAVAILABLE: "UNAVAILABLE",
  });


export const VRM_CONFIGURATION_DSS_EVIDENCE_REASON =
  Object.freeze({
    QUALIFIED: "QUALIFIED",

    PARTIAL_CONFIGURATION:
      "PARTIAL_CONFIGURATION",

    INSTALLATION_NOT_FOUND:
      "INSTALLATION_NOT_FOUND",

    DEVICE_CONFIGURATION_NOT_FOUND:
      "DEVICE_CONFIGURATION_NOT_FOUND",

    NO_QUALIFIED_CONFIGURATION:
      "NO_QUALIFIED_CONFIGURATION",

    VALUE_INVALID:
      "VALUE_INVALID",

    SENTINEL_VALUE:
      "SENTINEL_VALUE",
  });


export const VRM_CONFIGURATION_DSS_METRIC =
  Object.freeze({
    BATTERY_USABLE_CAPACITY:
      "BATTERY_USABLE_CAPACITY",

    BATTERY_MINIMUM_SOC:
      "BATTERY_MINIMUM_SOC",
  });


const VRM_CONFIGURATION_DSS_BOUNDARIES =
  Object.freeze({
    readOnly: true,

    configurationEvidenceOnly: true,

    telemetryMeasurementUsedAsRating:
      false,

    missingMeansZero: false,

    unavailableMeansZero: false,

    invalidMeansZero: false,

    unsetSentinelAccepted: false,

    observedMaximumUsedAsLimit: false,

    observedMinimumUsedAsLimit: false,

    currentToPowerConversionAllowed:
      false,

    voltageToPowerConversionAllowed:
      false,

    powerFactorInferenceAllowed: false,

    phaseCountInferenceAllowed: false,

    systemEfficiencySplitAllowed: false,

    targetSocUsedAsLimit: false,

    batteryHistoryUsedAsRating: false,

    crossDeviceInstanceMergeAllowed:
      false,

    hiddenSocUsedAsInitialSoc: false,

    optimizationExecuted: false,

    recommendationGenerated: false,

    persistenceExecuted: false,

    executableControl: false,

    autoDispatch: false,
  });


const CONFIGURATION_DEFINITIONS =
  Object.freeze([
    Object.freeze({
      metricName:
        VRM_CONFIGURATION_DSS_METRIC
          .BATTERY_USABLE_CAPACITY,

      deviceType: "Gateway",

      vrmAttributeId: 1289,

      dbusPath:
        "/Settings/DynamicEss/BatteryCapacity",

      description:
        "DESS battery capacity",

      unit: "kWh",

      normalizeValue(value) {
        const numericValue =
          Number(value);

        if (
          !Number.isFinite(
            numericValue
          ) ||
          numericValue <= 0
        ) {
          return null;
        }

        return numericValue;
      },
    }),

    Object.freeze({
      metricName:
        VRM_CONFIGURATION_DSS_METRIC
          .BATTERY_MINIMUM_SOC,

      deviceType: "Gateway",

      vrmAttributeId: 334,

      dbusPath:
        "/Settings/CGwacs/BatteryLife/MinimumSocLimit",

      description:
        "ESS Minimum SOC (unless grid fails)",

      unit: "PERCENT",

      normalizeValue(value) {
        const numericValue =
          Number(value);

        if (
          !Number.isFinite(
            numericValue
          ) ||
          numericValue < 0 ||
          numericValue > 100
        ) {
          return null;
        }

        return numericValue;
      },
    }),
  ]);


function normalizeVrmSiteId(
  vrmSiteId
) {
  const value =
    String(
      vrmSiteId ?? ""
    ).trim();

  if (!value) {
    throw new TypeError(
      "vrmSiteId is required"
    );
  }

  return value;
}


function normalizeTimestamp(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}


function buildUnavailableResult({
  vrmSiteId,
  reason,
  installation = null,
  evidence = [],
  rejectedEvidence = [],
}) {
  return Object.freeze({
    phase:
      VRM_CONFIGURATION_DSS_EVIDENCE_PHASE,

    layer:
      VRM_CONFIGURATION_DSS_EVIDENCE_LAYER,

    status:
      VRM_CONFIGURATION_DSS_EVIDENCE_STATUS
        .UNAVAILABLE,

    reason,

    vrmSiteId,

    installationId:
      installation?._id
        ? String(
            installation._id
          )
        : null,

    evidence:
      Object.freeze([
        ...evidence,
      ]),

    rejectedEvidence:
      Object.freeze([
        ...rejectedEvidence,
      ]),

    evidenceCount:
      evidence.length,

    rejectedEvidenceCount:
      rejectedEvidence.length,

    boundaries:
      VRM_CONFIGURATION_DSS_BOUNDARIES,
  });
}


function buildEvidenceRecord({
  vrmSiteId,
  installation,
  device,
  definition,
  attribute,
  value,
}) {
  const timestamp =
    normalizeTimestamp(
      device.updatedAt ??
        device.lastSeenAt ??
        installation.updatedAt ??
        installation.lastSeenAt
    );

  return Object.freeze({
    phase:
      VRM_CONFIGURATION_DSS_EVIDENCE_PHASE,

    layer:
      VRM_CONFIGURATION_DSS_EVIDENCE_LAYER,

    status:
      VRM_CONFIGURATION_DSS_EVIDENCE_STATUS
        .QUALIFIED,

    reason:
      VRM_CONFIGURATION_DSS_EVIDENCE_REASON
        .QUALIFIED,

    metricName:
      definition.metricName,

    value,

    unit:
      definition.unit,

    currency: null,

    timestamp,

    vrmSiteId,

    source:
      "VRM_CONFIGURATION",

    evidenceBasis:
      "OPERATOR_CONFIGURATION",

    installationId:
      String(
        installation._id
      ),

    deviceId:
      String(
        device._id
      ),

    deviceType:
      device.deviceType ??
      definition.deviceType,

    deviceInstance:
      device.deviceInstance ??
      null,

    productName:
      device.productName ??
      device.name ??
      null,

    productId:
      device.productId ??
      null,

    vrmAttributeId:
      definition.vrmAttributeId,

    dbusPath:
      definition.dbusPath,

    description:
      definition.description,

    rawValue:
      attribute.rawValue,

    formattedValue:
      attribute.formattedValue ??
      null,

    formatWithUnit:
      attribute.formatWithUnit ??
      null,

    provenance:
      Object.freeze({
        source:
          "VRM",

        sourceType:
          "DEVICE_DISCOVERY_CONFIGURATION",

        deviceId:
          String(
            device._id
          ),

        deviceType:
          device.deviceType ??
          definition.deviceType,

        deviceInstance:
          device.deviceInstance ??
          null,

        vrmAttributeId:
          definition.vrmAttributeId,

        dbusPath:
          definition.dbusPath,

        capturedAt:
          timestamp,
      }),

    boundaries:
      VRM_CONFIGURATION_DSS_BOUNDARIES,
  });
}


function buildRejectedEvidence({
  definition,
  device,
  attribute,
  reason,
}) {
  return Object.freeze({
    metricName:
      definition.metricName,

    reason,

    deviceId:
      device?._id
        ? String(
            device._id
          )
        : null,

    deviceType:
      device?.deviceType ??
      definition.deviceType,

    deviceInstance:
      device?.deviceInstance ??
      null,

    vrmAttributeId:
      definition.vrmAttributeId,

    dbusPath:
      definition.dbusPath,

    rawValue:
      attribute?.rawValue ??
      null,

    formattedValue:
      attribute?.formattedValue ??
      null,
  });
}


function findDiscoveryAttribute(
  device,
  definition
) {
  const attributes =
    Array.isArray(
      device?.raw
        ?.discoveryAttributes
    )
      ? device.raw
          .discoveryAttributes
      : [];

  return (
    attributes.find(
      (attribute) =>
        Number(
          attribute
            ?.idDataAttribute
        ) ===
          Number(
            definition
              .vrmAttributeId
          ) &&
        String(
          attribute
            ?.dbusPath ?? ""
        ).trim() ===
          definition.dbusPath
    ) ??
    null
  );
}


function selectConfigurationDevice(
  devices,
  definition
) {
  const candidates =
    devices.filter(
      (device) =>
        String(
          device?.deviceType ??
            ""
        ) ===
        definition.deviceType
    );

  const matching =
    candidates.filter(
      (device) =>
        findDiscoveryAttribute(
          device,
          definition
        )
    );

  /*
   * Do not merge configuration
   * across device instances.
   *
   * For these two metrics we expect
   * the installation Gateway
   * configuration source.
   */
  if (
    matching.length !== 1
  ) {
    return null;
  }

  return matching[0];
}


export async function
getVrmConfigurationDssEvidence({
  vrmSiteId,
} = {}) {
  const normalizedSiteId =
    normalizeVrmSiteId(
      vrmSiteId
    );

  const installation =
    await Installation.findOne({
      vrmSiteId:
        normalizedSiteId,
    }).lean();

  if (!installation) {
    return buildUnavailableResult({
      vrmSiteId:
        normalizedSiteId,

      reason:
        VRM_CONFIGURATION_DSS_EVIDENCE_REASON
          .INSTALLATION_NOT_FOUND,
    });
  }


  const devices =
    await Device.find({
      installation:
        installation._id,
    }).lean();


  if (
    !Array.isArray(devices) ||
    devices.length === 0
  ) {
    return buildUnavailableResult({
      vrmSiteId:
        normalizedSiteId,

      installation,

      reason:
        VRM_CONFIGURATION_DSS_EVIDENCE_REASON
          .DEVICE_CONFIGURATION_NOT_FOUND,
    });
  }


  const evidence = [];
  const rejectedEvidence = [];


  for (
    const definition of
    CONFIGURATION_DEFINITIONS
  ) {
    const device =
      selectConfigurationDevice(
        devices,
        definition
      );

    if (!device) {
      continue;
    }


    const attribute =
      findDiscoveryAttribute(
        device,
        definition
      );

    if (!attribute) {
      continue;
    }


    const value =
      definition.normalizeValue(
        attribute.rawValue
      );


    if (value === null) {
      rejectedEvidence.push(
        buildRejectedEvidence({
          definition,
          device,
          attribute,

          reason:
            VRM_CONFIGURATION_DSS_EVIDENCE_REASON
              .VALUE_INVALID,
        })
      );

      continue;
    }


    evidence.push(
      buildEvidenceRecord({
        vrmSiteId:
          normalizedSiteId,

        installation,
        device,
        definition,
        attribute,
        value,
      })
    );
  }


  if (
    evidence.length === 0
  ) {
    return buildUnavailableResult({
      vrmSiteId:
        normalizedSiteId,

      installation,

      reason:
        VRM_CONFIGURATION_DSS_EVIDENCE_REASON
          .NO_QUALIFIED_CONFIGURATION,

      rejectedEvidence,
    });
  }


  const status =
    evidence.length ===
    CONFIGURATION_DEFINITIONS.length
      ? VRM_CONFIGURATION_DSS_EVIDENCE_STATUS
          .QUALIFIED
      : VRM_CONFIGURATION_DSS_EVIDENCE_STATUS
          .PARTIALLY_QUALIFIED;


  const reason =
    status ===
    VRM_CONFIGURATION_DSS_EVIDENCE_STATUS
      .QUALIFIED
      ? VRM_CONFIGURATION_DSS_EVIDENCE_REASON
          .QUALIFIED
      : VRM_CONFIGURATION_DSS_EVIDENCE_REASON
          .PARTIAL_CONFIGURATION;


  return Object.freeze({
    phase:
      VRM_CONFIGURATION_DSS_EVIDENCE_PHASE,

    layer:
      VRM_CONFIGURATION_DSS_EVIDENCE_LAYER,

    status,

    reason,

    vrmSiteId:
      normalizedSiteId,

    installationId:
      String(
        installation._id
      ),

    evidence:
      Object.freeze([
        ...evidence,
      ]),

    rejectedEvidence:
      Object.freeze([
        ...rejectedEvidence,
      ]),

    evidenceCount:
      evidence.length,

    rejectedEvidenceCount:
      rejectedEvidence.length,

    availableMetricNames:
      Object.freeze(
        evidence.map(
          (item) =>
            item.metricName
        )
      ),

    boundaries:
      VRM_CONFIGURATION_DSS_BOUNDARIES,
  });
}