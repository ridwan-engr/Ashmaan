// scripts/runOptimizationDss.js

import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";

import FinancialBiKpiRecord
  from "../models/FinancialBiKpiRecord.js";

import {
  getInitialBatterySocDssEvidence,
} from "../services/optimizationDss/batterySocDssEvidenceAdapter.js";

import {
  getSiteLoadForecastDssEvidence,
} from "../services/optimizationDss/forecastingDssEvidenceAdapter.js";

import {
  getEngineeringDssEvidence,
} from "../services/optimizationDss/engineeringDssEvidenceAdapter.js";

import {
  getVrmConfigurationDssEvidence,
} from "../services/optimizationDss/vrmConfigurationDssEvidenceAdapter.js";

import {
  composeOptimizationDssEvidence,
  OPTIMIZATION_DSS_EVIDENCE_SOURCE,
} from "../services/optimizationDss/optimizationDssEvidenceCompositionService.js";

import {
  OPTIMIZATION_DSS_OBJECTIVE_KIND,
} from "../services/optimizationDss/optimizationDssContract.js";

import {
  preflightOptimizationDssEvidence,
} from "../services/optimizationDss/optimizationDssProblemDefinitionService.js";


dns.setServers([
  "1.1.1.1",
  "1.0.0.1",
]);


function selectComposedEvidence(
  composition,
  evidenceSource
) {
  if (
    !composition ||
    !Array.isArray(
      composition.evidence
    )
  ) {
    return [];
  }

  return composition.evidence.filter(
    (item) =>
      item?.evidenceSource ===
      evidenceSource
  );
}


async function main() {
  const uri =
    process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI_MISSING"
    );
  }


  const vrmSiteId =
    process.argv[2] ??
    "87666";


  const objectiveKind =
    process.argv[3] ??
    OPTIMIZATION_DSS_OBJECTIVE_KIND
      .MINIMIZE_GRID_IMPORT;


  await mongoose.connect(uri);


  try {
    /*
     * --------------------------------------------------
     * 1. FINANCIAL BI
     * --------------------------------------------------
     *
     * Use the most recently persisted Financial BI
     * reporting window for this site.
     */
    const latestRecord =
      await FinancialBiKpiRecord.findOne({
        scope:
          "SITE",

        "scopeIdentity.vrmSiteId":
          vrmSiteId,
      })
        .sort({
          "reportingWindow.end": -1,
          updatedAt: -1,
          createdAt: -1,
        })
        .lean();


    if (!latestRecord) {
      console.log(
        JSON.stringify(
          {
            status:
              "UNAVAILABLE",

            stage:
              "FINANCIAL_BI_EVIDENCE",

            reason:
              "NO_FINANCIAL_BI_EVIDENCE",

            vrmSiteId,

            objectiveKind,

            optimizationRequestConstructible:
              false,

            optimizationExecutable:
              false,

            optimizationExecuted:
              false,
          },
          null,
          2
        )
      );

      return;
    }


    const windowStart =
      latestRecord
        ?.reportingWindow
        ?.start;

    const windowEnd =
      latestRecord
        ?.reportingWindow
        ?.end;


    if (
      !windowStart ||
      !windowEnd
    ) {
      console.log(
        JSON.stringify(
          {
            status:
              "UNAVAILABLE",

            stage:
              "FINANCIAL_BI_EVIDENCE",

            reason:
              "INVALID_FINANCIAL_BI_REPORTING_WINDOW",

            vrmSiteId,

            objectiveKind,

            optimizationRequestConstructible:
              false,

            optimizationExecutable:
              false,

            optimizationExecuted:
              false,
          },
          null,
          2
        )
      );

      return;
    }


    const financialBiEvidence =
      await FinancialBiKpiRecord.find({
        scope:
          "SITE",

        "scopeIdentity.vrmSiteId":
          vrmSiteId,

        "reportingWindow.start":
          windowStart,

        "reportingWindow.end":
          windowEnd,
      })
        .sort({
          metricName: 1,
        })
        .lean();


    /*
     * --------------------------------------------------
     * 2. FORECASTING
     * --------------------------------------------------
     */
    const siteLoadForecastEvidence =
      await getSiteLoadForecastDssEvidence({
        vrmSiteId,
      });


    /*
     * The composer accepts the qualified forecast
     * wrapper directly and expands its values[] into
     * scalar SITE_LOAD_POWER evidence points.
     */
    const forecastEvidence =
      siteLoadForecastEvidence
        ?.status ===
        "QUALIFIED"
        ? siteLoadForecastEvidence
        : null;


    /*
     * The qualified Site Load forecast origin defines
     * the DSS optimization horizon start.
     */
    const optimizationHorizonStart =
      siteLoadForecastEvidence
        ?.status ===
        "QUALIFIED"
        ? siteLoadForecastEvidence
          ?.window
          ?.forecastOrigin ??
        null
        : null;


    /*
     * --------------------------------------------------
     * 3. OPERATIONAL BATTERY STATE
     * --------------------------------------------------
     */
    let batterySocEvidenceResult =
      null;


    if (
      optimizationHorizonStart
    ) {
      batterySocEvidenceResult =
        await getInitialBatterySocDssEvidence({
          vrmSiteId,

          horizonStart:
            optimizationHorizonStart,

          maxAgeMinutes:
            60,
        });
    }


    /*
     * --------------------------------------------------
     * 4. EXPLICIT ENGINEERING CONFIGURATION
     * --------------------------------------------------
     *
     * No equipment limit is inferred from observed
     * telemetry.
     */
    const engineeringEvidenceResult =
      await getEngineeringDssEvidence({
        vrmSiteId,
      });


    /*
     * --------------------------------------------------
     * 5. VRM CONFIGURATION
     * --------------------------------------------------
     *
     * Phase 11.2F currently qualifies only
     * semantically safe VRM configuration:
     *
     * BATTERY_USABLE_CAPACITY
     * BATTERY_MINIMUM_SOC
     *
     * Sentinel/unset values and inferred ratings are
     * excluded by the adapter.
     */
    const vrmConfigurationEvidenceResult =
      await getVrmConfigurationDssEvidence({
        vrmSiteId,
      });


    /*
     * --------------------------------------------------
     * 6. UNIFIED DSS EVIDENCE COMPOSITION — 11.2G
     * --------------------------------------------------
     *
     * This becomes the canonical DSS evidence package.
     *
     * Forecast values are expanded into scalar points.
     * No resampling, interpolation, zero substitution,
     * unit inference, or equipment-rating inference is
     * performed.
     */
    const evidenceComposition =
      composeOptimizationDssEvidence({
        vrmSiteId,

        financialBiEvidence,

        forecastEvidence,

        engineeringEvidence:
          engineeringEvidenceResult,

        vrmConfigurationEvidence:
          vrmConfigurationEvidenceResult,

        operationalEvidence:
          batterySocEvidenceResult,
      });


    /*
     * --------------------------------------------------
     * 7. DERIVE PREFLIGHT CHANNELS FROM THE CANONICAL
     *    COMPOSED EVIDENCE
     * --------------------------------------------------
     *
     * Preserve the existing preflight interface while
     * making 11.2G the canonical source.
     */

    const composedFinancialBiEvidence =
      selectComposedEvidence(
        evidenceComposition,
        OPTIMIZATION_DSS_EVIDENCE_SOURCE
          .FINANCIAL_BI
      );


    const composedForecastEvidence =
      selectComposedEvidence(
        evidenceComposition,
        OPTIMIZATION_DSS_EVIDENCE_SOURCE
          .FORECASTING
      );


    const composedManualEngineeringEvidence =
      selectComposedEvidence(
        evidenceComposition,
        OPTIMIZATION_DSS_EVIDENCE_SOURCE
          .ENGINEERING_CONFIGURATION
      );


    const composedVrmConfigurationEvidence =
      selectComposedEvidence(
        evidenceComposition,
        OPTIMIZATION_DSS_EVIDENCE_SOURCE
          .VRM_CONFIGURATION
      );


    const composedEngineeringEvidence =
      [
        ...composedManualEngineeringEvidence,
        ...composedVrmConfigurationEvidence,
      ];


    const composedOperationalEvidence =
      selectComposedEvidence(
        evidenceComposition,
        OPTIMIZATION_DSS_EVIDENCE_SOURCE
          .OPERATIONAL
      );


    /*
     * --------------------------------------------------
     * 8. DSS PROBLEM-DEFINITION PREFLIGHT
     * --------------------------------------------------
     */
    const preflight =
      preflightOptimizationDssEvidence({
        financialBiEvidence:
          composedFinancialBiEvidence,

        forecastEvidence:
          composedForecastEvidence,

        engineeringEvidence:
          composedEngineeringEvidence,

        operationalEvidence:
          composedOperationalEvidence,

        objectiveKind,
      });

    /*
     * --------------------------------------------------
     * 9. DSS EXECUTION GATE
     * --------------------------------------------------
     *
     * Preflight determines whether enough qualified
     * evidence exists to construct a legitimate
     * resource formulation.
     *
     * Missing engineering limits must never be replaced
     * by inferred, observed, default, or synthetic
     * values merely to force optimization execution.
     */

    const optimizationHorizon =
      siteLoadForecastEvidence
        ?.status ===
        "QUALIFIED"
        ? {
          start:
            siteLoadForecastEvidence
              ?.window
              ?.forecastOrigin ??
            null,

          end:
            siteLoadForecastEvidence
              ?.window
              ?.forecastEnd ??
            null,

          timezone:
            siteLoadForecastEvidence
              ?.window
              ?.timezone ??
            null,

          semantics:
            siteLoadForecastEvidence
              ?.window
              ?.semantics ??
            null,
        }
        : null;


    const runtimeReady =
      preflight
        ?.optimizationRequestConstructible ===
        true &&
      preflight
        ?.resourceFormulationConstructible ===
        true &&
      Array.isArray(
        preflight
          ?.constructibleResourcePaths
      ) &&
      preflight
        .constructibleResourcePaths
        .length >
        0 &&
      Boolean(
        optimizationHorizon
          ?.start
      ) &&
      Boolean(
        optimizationHorizon
          ?.end
      ) &&
      Boolean(
        optimizationHorizon
          ?.timezone
      );


    /*
     * --------------------------------------------------
     * 10. COMMON RUNTIME DIAGNOSTICS
     * --------------------------------------------------
     */

    const runtimeDiagnostics = {
      vrmSiteId,

      objectiveKind,


      /*
       * Financial BI provenance.
       */
      reportingWindow:
        latestRecord
          .reportingWindow,


      /*
       * Forecast-derived DSS optimization horizon.
       */
      optimizationHorizon,


      /*
       * ----------------------------------------------
       * UNIFIED EVIDENCE COMPOSITION
       * ----------------------------------------------
       */
      evidenceComposition: {
        phase:
          evidenceComposition
            .phase,

        status:
          evidenceComposition
            .status,

        evidenceCount:
          evidenceComposition
            .evidenceCount,

        availableMetricNames:
          evidenceComposition
            .availableMetricNames,

        sourceCounts:
          evidenceComposition
            .sourceCounts,
      },


      /*
       * Canonical scalar evidence counts passed from
       * Phase 11.2G into preflight.
       */
      composedEvidenceCounts: {
        financialBi:
          composedFinancialBiEvidence
            .length,

        forecasting:
          composedForecastEvidence
            .length,

        manualEngineering:
          composedManualEngineeringEvidence
            .length,

        vrmConfiguration:
          composedVrmConfigurationEvidence
            .length,

        engineeringTotal:
          composedEngineeringEvidence
            .length,

        operational:
          composedOperationalEvidence
            .length,
      },


      /*
       * Forecasting -> DSS.
       */
      forecastingEvidence: {
        status:
          siteLoadForecastEvidence
            ?.status ??
          null,

        reason:
          siteLoadForecastEvidence
            ?.reason ??
          null,

        metricName:
          siteLoadForecastEvidence
            ?.metricName ??
          null,

        valueCount:
          Array.isArray(
            siteLoadForecastEvidence
              ?.values
          )
            ? siteLoadForecastEvidence
              .values
              .length
            : 0,

        unit:
          siteLoadForecastEvidence
            ?.unit ??
          null,

        forecastOrigin:
          siteLoadForecastEvidence
            ?.window
            ?.forecastOrigin ??
          null,

        forecastEnd:
          siteLoadForecastEvidence
            ?.window
            ?.forecastEnd ??
          null,

        semantics:
          siteLoadForecastEvidence
            ?.window
            ?.semantics ??
          null,
      },


      /*
       * Explicit/manual engineering configuration.
       */
      engineeringConfiguration: {
        status:
          engineeringEvidenceResult
            ?.status ??
          null,

        reason:
          engineeringEvidenceResult
            ?.reason ??
          null,

        evidenceCount:
          engineeringEvidenceResult
            ?.evidenceCount ??
          0,

        availableEvidenceMetricNames:
          engineeringEvidenceResult
            ?.availableEvidenceMetricNames ??
          [],

        configuration:
          engineeringEvidenceResult
            ?.configuration ??
          null,
      },


      /*
       * VRM configuration -> DSS.
       */
      vrmConfiguration: {
        phase:
          vrmConfigurationEvidenceResult
            ?.phase ??
          null,

        status:
          vrmConfigurationEvidenceResult
            ?.status ??
          null,

        reason:
          vrmConfigurationEvidenceResult
            ?.reason ??
          null,

        evidenceCount:
          vrmConfigurationEvidenceResult
            ?.evidenceCount ??
          0,

        rejectedEvidenceCount:
          vrmConfigurationEvidenceResult
            ?.rejectedEvidenceCount ??
          0,

        availableMetricNames:
          vrmConfigurationEvidenceResult
            ?.availableMetricNames ??
          [],
      },


      /*
       * Operational battery state.
       */
      batteryOperationalState: {
        status:
          batterySocEvidenceResult
            ?.status ??
          (
            optimizationHorizonStart
              ? null
              : "UNAVAILABLE"
          ),

        reason:
          batterySocEvidenceResult
            ?.reason ??
          (
            optimizationHorizonStart
              ? null
              : "FORECAST_HORIZON_START_UNAVAILABLE"
          ),

        metricName:
          batterySocEvidenceResult
            ?.evidence
            ?.metricName ??
          batterySocEvidenceResult
            ?.metricName ??
          null,

        value:
          batterySocEvidenceResult
            ?.evidence
            ?.value ??
          null,

        unit:
          batterySocEvidenceResult
            ?.evidence
            ?.unit ??
          null,

        timestamp:
          batterySocEvidenceResult
            ?.evidence
            ?.timestamp ??
          null,

        horizonStart:
          batterySocEvidenceResult
            ?.evidence
            ?.horizonStart ??
          optimizationHorizonStart,

        attributeId:
          batterySocEvidenceResult
            ?.evidence
            ?.attributeId ??
          null,

        preferredPriority:
          batterySocEvidenceResult
            ?.evidence
            ?.preferredPriority ??
          null,

        deviceType:
          batterySocEvidenceResult
            ?.evidence
            ?.deviceType ??
          null,

        deviceInstance:
          batterySocEvidenceResult
            ?.evidence
            ?.deviceInstance ??
          null,

        ageMinutes:
          batterySocEvidenceResult
            ?.evidence
            ?.ageMinutes ??
          batterySocEvidenceResult
            ?.diagnostics
            ?.ageMinutes ??
          null,

        maxAgeMinutes:
          batterySocEvidenceResult
            ?.diagnostics
            ?.maxAgeMinutes ??
          60,
      },


      /*
       * Combined DSS evidence state.
       */
      availableFinancialBiMetricNames:
        preflight
          .availableFinancialBiMetricNames,

      availableForecastMetricNames:
        preflight
          .availableForecastMetricNames,

      availableEngineeringMetricNames:
        preflight
          .availableEngineeringMetricNames,

      availableOperationalMetricNames:
        preflight
          .availableOperationalMetricNames,

      availableEvidenceMetricNames:
        preflight
          .availableEvidenceMetricNames,

      requiredEvidenceMetricNames:
        preflight
          .requiredEvidenceMetricNames,

      missingEvidenceMetricNames:
        preflight
          .missingEvidenceMetricNames,


      /*
       * DSS readiness.
       */
      evidencePreflightSatisfied:
        preflight
          .evidencePreflightSatisfied,

      resourceFormulationConstructible:
        preflight
          .resourceFormulationConstructible,

      resourceReadiness:
        preflight
          .resourceReadiness,

      candidateResourcePaths:
        preflight
          .candidateResourcePaths,

      constructibleResourcePaths:
        preflight
          .constructibleResourcePaths,

      optimizationRequestConstructible:
        preflight
          .optimizationRequestConstructible,


      /*
       * Preserve no-fabrication boundaries.
       */
      boundaries: {
        composition:
          evidenceComposition
            .boundaries,

        preflight:
          preflight
            .boundaries,
      },
    };


    /*
     * --------------------------------------------------
     * 11. CONTROLLED PREFLIGHT TERMINATION
     * --------------------------------------------------
     *
     * UNAVAILABLE here is a valid DSS decision.
     *
     * Solver/recommendation/persistence must not execute
     * when no resource path can be constructed from
     * qualified evidence.
     */

    if (!runtimeReady) {
      console.log(
        JSON.stringify(
          {
            status:
              preflight.status,

            stage:
              "PROBLEM_DEFINITION_PREFLIGHT",

            reason:
              preflight.reason,

            ...runtimeDiagnostics,

            optimizationExecutable:
              false,

            optimizationExecuted:
              false,

            solverExecuted:
              false,

            recommendationGenerated:
              false,

            persistenceExecuted:
              false,

            executionGate: {
              runtimeReady:
                false,

              blockedAt:
                "PROBLEM_DEFINITION_PREFLIGHT",

              reason:
                preflight.reason,

              noFabricationApplied:
                true,
            },
          },
          null,
          2
        )
      );

      return;
    }


    /*
     * --------------------------------------------------
     * 12. CONSTRUCTIBLE RESOURCE PATH
     * --------------------------------------------------
     *
     * At least one legitimate resource formulation now
     * exists.
     *
     * Do not insert arbitrary Phase 11.1 variable bounds
     * here. The production runtime request builder must
     * use the qualified engineering evidence associated
     * with the selected resource path.
     */

    console.log(
      JSON.stringify(
        {
          status:
            "READY",

          stage:
            "RUNTIME_REQUEST_BUILD",

          reason:
            "CONSTRUCTIBLE_RESOURCE_PATH_AVAILABLE",

          ...runtimeDiagnostics,

          optimizationExecutable:
            false,

          optimizationExecuted:
            false,

          solverExecuted:
            false,

          recommendationGenerated:
            false,

          persistenceExecuted:
            false,

          executionGate: {
            runtimeReady:
              true,

            blockedAt:
              "RUNTIME_REQUEST_BUILD",

            runtimeInvocationDeferred:
              true,

            reason:
              "EVIDENCE_BACKED_RUNTIME_REQUEST_BUILDER_REQUIRED",

            noFabricationApplied:
              true,
          },
        },
        null,
        2
      )
    );
  } finally {
    await mongoose.disconnect();
  }
}


main().catch(error => {
  console.error(
    "\nOPTIMIZATION_DSS_RUNTIME_FAILED"
  );

  console.error(
    error?.stack ??
    error?.message ??
    String(error)
  );

  process.exitCode = 1;
});