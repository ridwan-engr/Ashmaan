// services/optimizationDss/batterySocDssEvidenceAdapter.js

import {
  Telemetry,
} from "../../models/index.js";

import {
  resolveBatteryInstallation,
} from "../engineering/batteryTelemetryAdapter.js";

import {
  getPreferredSocAttributes,
} from "../engineering/batteryAttributeMap.js";


export const BATTERY_SOC_DSS_EVIDENCE_PHASE =
  "11.2E";

export const BATTERY_SOC_DSS_EVIDENCE_LAYER =
  "OPTIMIZATION_DSS";


export const BATTERY_SOC_DSS_METRIC =
  Object.freeze({
    INITIAL_BATTERY_SOC:
      "INITIAL_BATTERY_SOC",
  });


export const BATTERY_SOC_DSS_STATUS =
  Object.freeze({
    QUALIFIED:
      "QUALIFIED",

    UNAVAILABLE:
      "UNAVAILABLE",
  });


export const BATTERY_SOC_DSS_REASON =
  Object.freeze({
    QUALIFIED:
      "QUALIFIED",

    INSTALLATION_NOT_FOUND:
      "INSTALLATION_NOT_FOUND",

    SOC_SIGNAL_NOT_OBSERVED:
      "SOC_SIGNAL_NOT_OBSERVED",

    SOC_VALUE_INVALID:
      "SOC_VALUE_INVALID",

    SOC_VALUE_OUT_OF_RANGE:
      "SOC_VALUE_OUT_OF_RANGE",

    SOC_TIMESTAMP_INVALID:
      "SOC_TIMESTAMP_INVALID",

    SOC_STALE:
      "SOC_STALE",
  });


export const BATTERY_SOC_DSS_BOUNDARIES =
  Object.freeze({
    readOnly:
      true,

    measuredTelemetryOnly:
      true,

    analyticsInterpolationUsed:
      false,

    analyticsAggregationUsed:
      false,

    syntheticSocAllowed:
      false,

    hiddenSocAllowed:
      false,

    configuredMinimumSocAsMeasuredSoc:
      false,

    controlTargetAsMeasuredSoc:
      false,

    futureObservationAllowed:
      false,

    missingMeansZero:
      false,

    unavailableMeansZero:
      false,

    socInferenceAllowed:
      false,

    batteryVoltageToSocInferenceAllowed:
      false,

    batteryPowerToSocInferenceAllowed:
      false,
  });


function normalizeTimestamp(
  value,
  field
) {
  const date =
    value instanceof Date
      ? value
      : new Date(
          value
        );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      `${field}_INVALID`
    );
  }

  return date;
}


function numericTelemetryValue(
  record
) {
  if (
    typeof record?.numericValue ===
      "number" &&
    Number.isFinite(
      record.numericValue
    )
  ) {
    return record.numericValue;
  }

  if (
    typeof record?.value ===
      "number" &&
    Number.isFinite(
      record.value
    )
  ) {
    return record.value;
  }

  const parsed =
    Number(
      record?.value
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}


function unavailable(
  reason,
  diagnostics = {}
) {
  return Object.freeze({
    phase:
      BATTERY_SOC_DSS_EVIDENCE_PHASE,

    layer:
      BATTERY_SOC_DSS_EVIDENCE_LAYER,

    status:
      BATTERY_SOC_DSS_STATUS.UNAVAILABLE,

    reason,

    metricName:
      BATTERY_SOC_DSS_METRIC
        .INITIAL_BATTERY_SOC,

    evidence:
      null,

    diagnostics:
      Object.freeze({
        ...diagnostics,
      }),

    boundaries:
      BATTERY_SOC_DSS_BOUNDARIES,
  });
}


export async function getInitialBatterySocDssEvidence({
  vrmSiteId,
  horizonStart,
  maxAgeMinutes = 60,
} = {}) {
  const start =
    normalizeTimestamp(
      horizonStart,
      "HORIZON_START"
    );

  if (
    typeof maxAgeMinutes !==
      "number" ||
    !Number.isFinite(
      maxAgeMinutes
    ) ||
    maxAgeMinutes <= 0
  ) {
    throw new Error(
      "MAX_AGE_MINUTES_INVALID"
    );
  }

  const installation =
    await resolveBatteryInstallation(
      vrmSiteId
    );

  if (!installation) {
    return unavailable(
      BATTERY_SOC_DSS_REASON
        .INSTALLATION_NOT_FOUND
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Reuse the engineering semantic preference hierarchy
  |--------------------------------------------------------------------------
  |
  | Current semantic map:
  |
  |   51  Battery Monitor measured SOC
  |   144 System overview SOC fallback
  |   39  VE.Bus SOC fallback
  |
  | We do not use hidden SOC, configured minimum SOC, low-SOC state,
  | or SOC target.
  |
  */

  const preferredDefinitions =
    getPreferredSocAttributes();

  for (
    const definition
    of preferredDefinitions
  ) {
    const attributeId =
      Number(
        definition.attributeId
      );

    if (
      !Number.isFinite(
        attributeId
      )
    ) {
      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Important temporal rule
    |--------------------------------------------------------------------------
    |
    | Select the latest actual observation at or before horizon start.
    | Never initialize from future telemetry.
    |
    */

    const record =
      await Telemetry
        .findOne({
          installation:
            installation._id,

          vrmAttributeId:
            attributeId,

          timestamp: {
            $type:
              "date",

            $lte:
              start,
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
          timestamp:
            -1,
        })
        .lean();

    if (!record) {
      continue;
    }

    const value =
      numericTelemetryValue(
        record
      );

    if (
      value === null
    ) {
      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Existing battery semantic map defines SOC in percent.
    |--------------------------------------------------------------------------
    */

    if (
      value < 0 ||
      value > 100
    ) {
      continue;
    }

    const timestamp =
      normalizeTimestamp(
        record.timestamp,
        "SOC_TIMESTAMP"
      );

    const ageMilliseconds =
      start.getTime() -
      timestamp.getTime();

    const ageMinutes =
      ageMilliseconds /
      60000;

    if (
      ageMinutes >
        maxAgeMinutes
    ) {
      /*
       * Do not fall through to a lower-priority SOC source after finding
       * a stale higher-priority source. Report the evidence condition
       * explicitly rather than silently changing source semantics.
       */

      return unavailable(
        BATTERY_SOC_DSS_REASON
          .SOC_STALE,
        {
          attributeId,
          timestamp:
            timestamp.toISOString(),
          horizonStart:
            start.toISOString(),
          ageMinutes,
          maxAgeMinutes,
        }
      );
    }

    const evidence =
      Object.freeze({
        metricName:
          BATTERY_SOC_DSS_METRIC
            .INITIAL_BATTERY_SOC,

        timestamp:
          timestamp.toISOString(),

        value,

        unit:
          "PERCENT",

        currency:
          null,

        source:
          "BATTERY_TELEMETRY",

        attributeId,

        preferredPriority:
          definition.preferredPriority ??
          null,

        deviceType:
          record.deviceType ??
          null,

        deviceInstance:
          record.deviceInstance ??
          null,

        telemetryId:
          record._id
            ? String(
                record._id
              )
            : null,

        horizonStart:
          start.toISOString(),

        ageMinutes,
      });

    return Object.freeze({
      phase:
        BATTERY_SOC_DSS_EVIDENCE_PHASE,

      layer:
        BATTERY_SOC_DSS_EVIDENCE_LAYER,

      status:
        BATTERY_SOC_DSS_STATUS
          .QUALIFIED,

      reason:
        BATTERY_SOC_DSS_REASON
          .QUALIFIED,

      metricName:
        BATTERY_SOC_DSS_METRIC
          .INITIAL_BATTERY_SOC,

      evidence,

      diagnostics:
        Object.freeze({
          attributeId,

          preferredPriority:
            definition.preferredPriority ??
            null,

          ageMinutes,

          maxAgeMinutes,
        }),

      boundaries:
        BATTERY_SOC_DSS_BOUNDARIES,
    });
  }

  return unavailable(
    BATTERY_SOC_DSS_REASON
      .SOC_SIGNAL_NOT_OBSERVED,
    {
      horizonStart:
        start.toISOString(),

      searchedAttributeIds:
        Object.freeze(
          preferredDefinitions.map(
            definition =>
              Number(
                definition.attributeId
              )
          )
        ),
    }
  );
}


export default
  getInitialBatterySocDssEvidence;
