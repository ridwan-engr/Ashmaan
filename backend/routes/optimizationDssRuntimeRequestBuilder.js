// services/optimizationDss/optimizationDssRuntimeRequestBuilder.js

import {
  OPTIMIZATION_DSS_OBJECTIVE_KIND,
  OPTIMIZATION_DSS_DECISION_VARIABLE_KIND,
  OPTIMIZATION_DSS_CONSTRAINT_KIND,
  buildOptimizationDssObjective,
  buildOptimizationDssDecisionVariable,
  buildOptimizationDssConstraint,
} from "./optimizationDssContract.js";


export const OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_STATUS =
  Object.freeze({
    READY: "READY",
    UNAVAILABLE: "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON =
  Object.freeze({
    READY: "READY",
    UNSUPPORTED_OBJECTIVE: "UNSUPPORTED_OBJECTIVE",
    GRID_BATTERY_PATH_REQUIRED: "GRID_BATTERY_PATH_REQUIRED",
    EVIDENCE_REQUIRED: "EVIDENCE_REQUIRED",
    EVIDENCE_MISSING: "EVIDENCE_MISSING",
    EVIDENCE_AMBIGUOUS: "EVIDENCE_AMBIGUOUS",
    EVIDENCE_VALUE_INVALID: "EVIDENCE_VALUE_INVALID",
    EVIDENCE_UNIT_INVALID: "EVIDENCE_UNIT_INVALID",
    SITE_LOAD_SERIES_INVALID: "SITE_LOAD_SERIES_INVALID",
  });


const METRIC =
  Object.freeze({
    SITE_LOAD_POWER: "SITE_LOAD_POWER",
    GRID_IMPORT_LIMIT: "GRID_IMPORT_LIMIT",

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

    INITIAL_BATTERY_SOC:
      "INITIAL_BATTERY_SOC",
  });


const REQUIRED_GRID_BATTERY_METRICS =
  Object.freeze([
    METRIC.SITE_LOAD_POWER,
    METRIC.GRID_IMPORT_LIMIT,
    METRIC.BATTERY_USABLE_CAPACITY,
    METRIC.BATTERY_MINIMUM_SOC,
    METRIC.BATTERY_MAXIMUM_SOC,
    METRIC.BATTERY_MAX_CHARGE_POWER,
    METRIC.BATTERY_MAX_DISCHARGE_POWER,
    METRIC.BATTERY_CHARGE_EFFICIENCY,
    METRIC.BATTERY_DISCHARGE_EFFICIENCY,
    METRIC.INITIAL_BATTERY_SOC,
  ]);


function unavailable(
  reason,
  details = null
) {
  return Object.freeze({
    status:
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_STATUS
        .UNAVAILABLE,

    reason,

    selectedResourcePath: null,
    optimizationRequest: null,
    details,
  });
}


function extractEvidenceArray(
  optimizationEvidence
) {
  if (
    Array.isArray(
      optimizationEvidence
    )
  ) {
    return optimizationEvidence;
  }

  if (
    Array.isArray(
      optimizationEvidence?.evidence
    )
  ) {
    return optimizationEvidence.evidence;
  }

  return [];
}


function metricMatches(
  evidence,
  metricName
) {
  return evidence.filter(
    item =>
      item?.metricName ===
      metricName
  );
}


function normalizeUnit(
  unit
) {
  if (
    typeof unit !== "string" ||
    !unit.trim()
  ) {
    return null;
  }

  return unit.trim();
}


function getStaticMetric({
  evidence,
  metricName,
  expectedUnit = null,
} = {}) {
  const matches =
    metricMatches(
      evidence,
      metricName
    );

  if (
    matches.length === 0
  ) {
    return {
      ok: false,

      reason:
        OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
          .EVIDENCE_MISSING,

      details: {
        metricName,
      },
    };
  }

  if (
    matches.length !== 1
  ) {
    return {
      ok: false,

      reason:
        OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
          .EVIDENCE_AMBIGUOUS,

      details: {
        metricName,
        evidenceCount:
          matches.length,
      },
    };
  }

  const item =
    matches[0];

  if (
    typeof item.value !== "number" ||
    !Number.isFinite(item.value)
  ) {
    return {
      ok: false,

      reason:
        OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
          .EVIDENCE_VALUE_INVALID,

      details: {
        metricName,
        value:
          item.value ?? null,
      },
    };
  }

  const unit =
    normalizeUnit(
      item.unit
    );

  if (!unit) {
    return {
      ok: false,

      reason:
        OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
          .EVIDENCE_UNIT_INVALID,

      details: {
        metricName,
        actualUnit:
          item.unit ?? null,
      },
    };
  }

  if (
    expectedUnit !== null &&
    unit !== expectedUnit
  ) {
    return {
      ok: false,

      reason:
        OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
          .EVIDENCE_UNIT_INVALID,

      details: {
        metricName,
        expectedUnit,
        actualUnit:
          unit,
      },
    };
  }

  return {
    ok: true,
    item,
    value: item.value,
    unit,
  };
}


function containsGridBatteryPath(
  preflight
) {
  const paths =
    Array.isArray(
      preflight
        ?.constructibleResourcePaths
    )
      ? preflight
          .constructibleResourcePaths
      : [];

  return paths.some(
    path => {
      const resources =
        Array.isArray(
          path?.resources
        )
          ? path.resources
          : [];

      return (
        resources.includes("GRID") &&
        resources.includes("BATTERY")
      );
    }
  );
}


function buildEvidenceContract(
  evidenceResult
) {
  return Object.freeze({
    metricName:
      evidenceResult
        .item
        .metricName,

    unit:
      evidenceResult.unit,

    currency:
      evidenceResult
        .item
        .currency ?? null,
  });
}


function validateSiteLoadSeries(
  evidence
) {
  const points =
    metricMatches(
      evidence,
      METRIC.SITE_LOAD_POWER
    );

  if (
    points.length === 0
  ) {
    return {
      ok: false,

      reason:
        OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
          .EVIDENCE_MISSING,

      details: {
        metricName:
          METRIC.SITE_LOAD_POWER,
      },
    };
  }

  const timestamps =
    new Set();

  let seriesUnit =
    null;

  for (
    const point of points
  ) {
    if (
      typeof point?.value !==
        "number" ||
      !Number.isFinite(
        point.value
      )
    ) {
      return {
        ok: false,

        reason:
          OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
            .EVIDENCE_VALUE_INVALID,

        details: {
          metricName:
            METRIC.SITE_LOAD_POWER,

          timestamp:
            point?.timestamp ??
            null,

          value:
            point?.value ??
            null,
        },
      };
    }

    const unit =
      normalizeUnit(
        point?.unit
      );

    if (!unit) {
      return {
        ok: false,

        reason:
          OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
            .EVIDENCE_UNIT_INVALID,

        details: {
          metricName:
            METRIC.SITE_LOAD_POWER,

          timestamp:
            point?.timestamp ??
            null,
        },
      };
    }

    if (
      seriesUnit === null
    ) {
      seriesUnit =
        unit;
    } else if (
      seriesUnit !== unit
    ) {
      return {
        ok: false,

        reason:
          OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
            .EVIDENCE_UNIT_INVALID,

        details: {
          metricName:
            METRIC.SITE_LOAD_POWER,

          expectedUnit:
            seriesUnit,

          actualUnit:
            unit,
        },
      };
    }

    if (
      typeof point?.timestamp !==
        "string" ||
      !point.timestamp.trim()
    ) {
      return {
        ok: false,

        reason:
          OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
            .SITE_LOAD_SERIES_INVALID,

        details: {
          metricName:
            METRIC.SITE_LOAD_POWER,

          reason:
            "TIMESTAMP_REQUIRED",
        },
      };
    }

    const parsed =
      Date.parse(
        point.timestamp
      );

    if (
      !Number.isFinite(parsed)
    ) {
      return {
        ok: false,

        reason:
          OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
            .SITE_LOAD_SERIES_INVALID,

        details: {
          metricName:
            METRIC.SITE_LOAD_POWER,

          reason:
            "TIMESTAMP_INVALID",

          timestamp:
            point.timestamp,
        },
      };
    }

    const normalizedTimestamp =
      new Date(parsed)
        .toISOString();

    if (
      timestamps.has(
        normalizedTimestamp
      )
    ) {
      return {
        ok: false,

        reason:
          OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
            .SITE_LOAD_SERIES_INVALID,

        details: {
          metricName:
            METRIC.SITE_LOAD_POWER,

          reason:
            "TIMESTAMP_DUPLICATE",

          timestamp:
            normalizedTimestamp,
        },
      };
    }

    timestamps.add(
      normalizedTimestamp
    );
  }

  return {
    ok: true,
    points,
    unit: seriesUnit,
  };
}


export function
buildOptimizationDssRuntimeRequest({
  objectiveKind,
  optimizationEvidence,
  preflight,
} = {}) {
  if (
    objectiveKind !==
    OPTIMIZATION_DSS_OBJECTIVE_KIND
      .MINIMIZE_GRID_IMPORT
  ) {
    return unavailable(
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
        .UNSUPPORTED_OBJECTIVE,

      {
        objectiveKind:
          objectiveKind ?? null,
      }
    );
  }

  if (
    !containsGridBatteryPath(
      preflight
    )
  ) {
    return unavailable(
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
        .GRID_BATTERY_PATH_REQUIRED
    );
  }

  const evidence =
    extractEvidenceArray(
      optimizationEvidence
    );

  if (
    evidence.length === 0
  ) {
    return unavailable(
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
        .EVIDENCE_REQUIRED
    );
  }

  const missingMetricNames =
    REQUIRED_GRID_BATTERY_METRICS
      .filter(
        metricName =>
          metricMatches(
            evidence,
            metricName
          ).length === 0
      );

  if (
    missingMetricNames.length >
    0
  ) {
    return unavailable(
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
        .EVIDENCE_MISSING,

      {
        missingMetricNames,
      }
    );
  }

  const siteLoad =
    validateSiteLoadSeries(
      evidence
    );

  if (!siteLoad.ok) {
    return unavailable(
      siteLoad.reason,
      siteLoad.details
    );
  }

  /*
   * These units are already established elsewhere in the
   * DSS formulation/evidence contracts.
   *
   * Efficiency units are intentionally NOT invented here.
   * Their actual evidence units are preserved.
   */

  const gridImportLimit =
    getStaticMetric({
      evidence,

      metricName:
        METRIC.GRID_IMPORT_LIMIT,

      expectedUnit:
        "kW",
    });

  const batteryUsableCapacity =
    getStaticMetric({
      evidence,

      metricName:
        METRIC.BATTERY_USABLE_CAPACITY,

      expectedUnit:
        "kWh",
    });

  const batteryMinimumSoc =
    getStaticMetric({
      evidence,

      metricName:
        METRIC.BATTERY_MINIMUM_SOC,

      expectedUnit:
        "PERCENT",
    });

  const batteryMaximumSoc =
    getStaticMetric({
      evidence,

      metricName:
        METRIC.BATTERY_MAXIMUM_SOC,

      expectedUnit:
        "PERCENT",
    });

  const batteryMaxChargePower =
    getStaticMetric({
      evidence,

      metricName:
        METRIC.BATTERY_MAX_CHARGE_POWER,

      expectedUnit:
        "kW",
    });

  const batteryMaxDischargePower =
    getStaticMetric({
      evidence,

      metricName:
        METRIC.BATTERY_MAX_DISCHARGE_POWER,

      expectedUnit:
        "kW",
    });

  const batteryChargeEfficiency =
    getStaticMetric({
      evidence,

      metricName:
        METRIC.BATTERY_CHARGE_EFFICIENCY,
    });

  const batteryDischargeEfficiency =
    getStaticMetric({
      evidence,

      metricName:
        METRIC.BATTERY_DISCHARGE_EFFICIENCY,
    });

  const initialBatterySoc =
    getStaticMetric({
      evidence,

      metricName:
        METRIC.INITIAL_BATTERY_SOC,

      expectedUnit:
        "PERCENT",
    });

  const scalarResults = [
    gridImportLimit,
    batteryUsableCapacity,
    batteryMinimumSoc,
    batteryMaximumSoc,
    batteryMaxChargePower,
    batteryMaxDischargePower,
    batteryChargeEfficiency,
    batteryDischargeEfficiency,
    initialBatterySoc,
  ];

  const invalidScalar =
    scalarResults.find(
      result =>
        !result.ok
    );

  if (invalidScalar) {
    return unavailable(
      invalidScalar.reason,
      invalidScalar.details
    );
  }

  /*
   * Numerical sanity checks.
   *
   * No value is corrected or inferred.
   */

  if (
    gridImportLimit.value < 0
  ) {
    return unavailable(
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
        .EVIDENCE_VALUE_INVALID,

      {
        metricName:
          METRIC.GRID_IMPORT_LIMIT,

        value:
          gridImportLimit.value,
      }
    );
  }

  if (
    batteryUsableCapacity.value <=
    0
  ) {
    return unavailable(
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
        .EVIDENCE_VALUE_INVALID,

      {
        metricName:
          METRIC.BATTERY_USABLE_CAPACITY,

        value:
          batteryUsableCapacity.value,
      }
    );
  }

  if (
    batteryMinimumSoc.value < 0 ||
    batteryMinimumSoc.value > 100 ||
    batteryMaximumSoc.value < 0 ||
    batteryMaximumSoc.value > 100 ||
    batteryMaximumSoc.value <
      batteryMinimumSoc.value
  ) {
    return unavailable(
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
        .EVIDENCE_VALUE_INVALID,

      {
        metricNames: [
          METRIC.BATTERY_MINIMUM_SOC,
          METRIC.BATTERY_MAXIMUM_SOC,
        ],

        minimumSoc:
          batteryMinimumSoc.value,

        maximumSoc:
          batteryMaximumSoc.value,
      }
    );
  }

  if (
    batteryMaxChargePower.value <
      0 ||
    batteryMaxDischargePower.value <
      0
  ) {
    return unavailable(
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
        .EVIDENCE_VALUE_INVALID,

      {
        metricNames: [
          METRIC.BATTERY_MAX_CHARGE_POWER,
          METRIC.BATTERY_MAX_DISCHARGE_POWER,
        ],
      }
    );
  }

  if (
    batteryChargeEfficiency.value <=
      0 ||
    batteryChargeEfficiency.value >
      1 ||
    batteryDischargeEfficiency.value <=
      0 ||
    batteryDischargeEfficiency.value >
      1
  ) {
    return unavailable(
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
        .EVIDENCE_VALUE_INVALID,

      {
        metricNames: [
          METRIC.BATTERY_CHARGE_EFFICIENCY,
          METRIC.BATTERY_DISCHARGE_EFFICIENCY,
        ],

        chargeEfficiency:
          batteryChargeEfficiency.value,

        dischargeEfficiency:
          batteryDischargeEfficiency.value,
      }
    );
  }

  if (
    initialBatterySoc.value <
      batteryMinimumSoc.value ||
    initialBatterySoc.value >
      batteryMaximumSoc.value
  ) {
    return unavailable(
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
        .EVIDENCE_VALUE_INVALID,

      {
        metricName:
          METRIC.INITIAL_BATTERY_SOC,

        value:
          initialBatterySoc.value,

        minimumSoc:
          batteryMinimumSoc.value,

        maximumSoc:
          batteryMaximumSoc.value,
      }
    );
  }

  const objective =
    buildOptimizationDssObjective({
      name:
        "MINIMIZE_GRID_IMPORT",

      kind:
        OPTIMIZATION_DSS_OBJECTIVE_KIND
          .MINIMIZE_GRID_IMPORT,

      unit:
        "kWh",

      currency:
        null,

      weight:
        1,

      sourceMetricName:
        METRIC.SITE_LOAD_POWER,
    });

  /*
   * Phase 11.1 requires a finite upper bound.
   * It comes exclusively from qualified GRID_IMPORT_LIMIT.
   */

  const gridPower =
    buildOptimizationDssDecisionVariable({
      name:
        "GRID_POWER",

      kind:
        OPTIMIZATION_DSS_DECISION_VARIABLE_KIND
          .GRID_POWER,

      unit:
        gridImportLimit.unit,

      lowerBound:
        0,

      upperBound:
        gridImportLimit.value,
    });

  const evidenceContracts =
    [
      gridImportLimit,
      batteryUsableCapacity,
      batteryMinimumSoc,
      batteryMaximumSoc,
      batteryMaxChargePower,
      batteryMaxDischargePower,
      batteryChargeEfficiency,
      batteryDischargeEfficiency,
      initialBatterySoc,
    ].map(
      buildEvidenceContract
    );

  /*
   * Phase 11.1 bootstrap constraint.
   *
   * This declares the complete GRID + BATTERY evidence
   * dependency set so canonical qualification preserves
   * those metrics.
   *
   * Detailed algebra is still produced by the numerical
   * formulation service.
   */

  const resourceConstraint =
    buildOptimizationDssConstraint({
      name:
        "GRID_BATTERY_RESOURCE_REQUIREMENTS",

      kind:
        OPTIMIZATION_DSS_CONSTRAINT_KIND
          .GRID_LIMIT,

      required:
        true,

      parameters: {
        maximumPower:
          gridImportLimit.value,

        unit:
          gridImportLimit.unit,

        resourcePath:
          "GRID_BATTERY",
      },

      sourceMetricNames:
        evidenceContracts.map(
          item =>
            item.metricName
        ),

      evidenceContracts,
    });

  return Object.freeze({
    status:
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_STATUS
        .READY,

    reason:
      OPTIMIZATION_DSS_RUNTIME_REQUEST_BUILD_REASON
        .READY,

    selectedResourcePath:
      Object.freeze([
        "GRID",
        "BATTERY",
      ]),

    optimizationRequest:
      Object.freeze({
        objectives:
          Object.freeze([
            objective,
          ]),

        decisionVariables:
          Object.freeze([
            gridPower,
          ]),

        constraints:
          Object.freeze([
            resourceConstraint,
          ]),
      }),

    evidenceBasis:
      Object.freeze({
        siteLoadPointCount:
          siteLoad.points.length,

        siteLoadUnit:
          siteLoad.unit,

        gridImportLimit:
          Object.freeze({
            value:
              gridImportLimit.value,

            unit:
              gridImportLimit.unit,

            source:
              gridImportLimit
                .item
                .evidenceSource ??
              gridImportLimit
                .item
                .source ??
              null,
          }),

        batteryEfficiencyUnits:
          Object.freeze({
            charge:
              batteryChargeEfficiency.unit,

            discharge:
              batteryDischargeEfficiency.unit,
          }),

        requiredMetricNames:
          REQUIRED_GRID_BATTERY_METRICS,
      }),

    boundaries:
      Object.freeze({
        engineeringLimitInferred:
          false,

        observedMaximumUsedAsLimit:
          false,

        telemetryUsedAsConfiguredLimit:
          false,

        efficiencyUnitInferred:
          false,

        missingMeansZero:
          false,

        timeSeriesCollapsed:
          false,

        optimizationExecuted:
          false,
      }),
  });
}


export default
  buildOptimizationDssRuntimeRequest;