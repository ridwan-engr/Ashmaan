export const OPTIMIZATION_DSS_EVIDENCE_COMPOSITION_PHASE =
  "11.2G";

export const OPTIMIZATION_DSS_EVIDENCE_COMPOSITION_LAYER =
  "OPTIMIZATION_DSS";


export const OPTIMIZATION_DSS_EVIDENCE_COMPOSITION_STATUS =
  Object.freeze({
    READY: "READY",
    PARTIALLY_READY: "PARTIALLY_READY",
    UNAVAILABLE: "UNAVAILABLE",
  });


export const OPTIMIZATION_DSS_EVIDENCE_SOURCE =
  Object.freeze({
    FINANCIAL_BI: "FINANCIAL_BI",
    FORECASTING: "FORECASTING",
    ENGINEERING_CONFIGURATION:
      "ENGINEERING_CONFIGURATION",
    VRM_CONFIGURATION:
      "VRM_CONFIGURATION",
    OPERATIONAL: "OPERATIONAL",
  });


const BOUNDARIES =
  Object.freeze({
    compositionOnly: true,

    evidenceMutationAllowed: false,

    valueInferenceAllowed: false,

    unitInferenceAllowed: false,

    currencyInferenceAllowed: false,

    timestampInferenceAllowed: false,

    resamplingAllowed: false,

    interpolationAllowed: false,

    duplicateMergeAllowed: false,

    missingMeansZero: false,

    unavailableMeansZero: false,

    invalidMeansZero: false,

    forecastFlatteningAllowed: true,

    engineeringConfigurationPreserved:
      true,

    vrmConfigurationPreserved: true,

    operationalEvidencePreserved: true,

    financialBiEvidencePreserved: true,

    forecastingEvidencePreserved: true,

    optimizationExecuted: false,

    solverExecuted: false,

    recommendationGenerated: false,

    persistenceExecuted: false,

    executableControl: false,

    autoDispatch: false,
  });


function normalizeSiteId(
  value
) {
  const normalized =
    String(
      value ?? ""
    ).trim();

  if (!normalized) {
    throw new TypeError(
      "vrmSiteId is required"
    );
  }

  return normalized;
}


function normalizeIsoTimestamp(
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


function isFiniteNumber(
  value
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  );
}


function freezeEvidence(
  evidence
) {
  return Object.freeze({
    ...evidence,

    provenance:
      evidence?.provenance &&
      typeof evidence.provenance ===
        "object"
        ? Object.freeze({
            ...evidence.provenance,
          })
        : evidence?.provenance ??
          null,
  });
}


/*
 * Financial BI records are already
 * scalar evidence.
 *
 * We preserve the original object
 * through sourceEvidence.
 */
function composeFinancialBiEvidence(
  records,
  vrmSiteId
) {
  if (!Array.isArray(records)) {
    return [];
  }

  const result = [];

  for (const record of records) {
    const metricName =
      record?.metricName ??
      record?.payload
        ?.metricName ??
      null;

    const value =
      record?.payload?.value ??
      record?.value;

    const unit =
      record?.payload?.unit ??
      record?.unit ??
      null;

    const currency =
      record?.payload?.currency ??
      record?.currency ??
      null;

    const timestamp =
      normalizeIsoTimestamp(
        record?.reportingWindow
          ?.start ??
          record?.timestamp
      );

    if (
      !metricName ||
      !isFiniteNumber(value) ||
      !timestamp
    ) {
      continue;
    }

    result.push(
      freezeEvidence({
        metricName,

        value,

        unit,

        currency,

        timestamp,

        vrmSiteId,

        evidenceSource:
          OPTIMIZATION_DSS_EVIDENCE_SOURCE
            .FINANCIAL_BI,

        evidenceRole:
          "FINANCIAL",

        sourceEvidence:
          record,

        provenance:
          Object.freeze({
            source:
              "FINANCIAL_BI",

            phase:
              record?.phase ??
              null,

            persistenceKey:
              record?.persistenceKey ??
              null,
          }),
      })
    );
  }

  return result;
}


/*
 * Forecasting is intentionally
 * expanded into scalar points.
 *
 * This solves the existing mismatch:
 *
 * forecast adapter:
 *   { metricName, values: [...] }
 *
 * Phase 11.2 / formulation:
 *   one metric/value/timestamp per
 *   evidence item.
 *
 * No interpolation or resampling occurs.
 */
function composeForecastEvidence(
  forecastEvidence,
  vrmSiteId
) {
  if (
    !forecastEvidence ||
    forecastEvidence.status !==
      "QUALIFIED" ||
    !Array.isArray(
      forecastEvidence.values
    )
  ) {
    return [];
  }

  const metricName =
    forecastEvidence.metricName;

  if (!metricName) {
    return [];
  }

  const result = [];

  for (
    const point of
    forecastEvidence.values
  ) {
    const timestamp =
      normalizeIsoTimestamp(
        point?.timestamp
      );

    const value =
      point?.value;

    const unit =
      point?.unit ??
      forecastEvidence.unit ??
      null;

    if (
      !timestamp ||
      !isFiniteNumber(value)
    ) {
      continue;
    }

    result.push(
      freezeEvidence({
        metricName,

        value,

        unit,

        currency: null,

        timestamp,

        vrmSiteId,

        evidenceSource:
          OPTIMIZATION_DSS_EVIDENCE_SOURCE
            .FORECASTING,

        evidenceRole:
          "FORECAST",

        sourceEvidence:
          forecastEvidence,

        provenance:
          Object.freeze({
            source:
              "FORECASTING",

            persistenceKey:
              forecastEvidence
                ?.source
                ?.persistenceKey ??
              null,

            modelName:
              forecastEvidence
                ?.source
                ?.modelName ??
              null,

            modelFamily:
              forecastEvidence
                ?.source
                ?.modelFamily ??
              null,

            outputType:
              forecastEvidence
                ?.source
                ?.outputType ??
              null,

            originalPointProvenance:
              point?.provenance ??
              null,
          }),
      })
    );
  }

  return result;
}


function composeEvidenceArray({
  evidence,
  vrmSiteId,
  evidenceSource,
  evidenceRole,
}) {
  if (!Array.isArray(evidence)) {
    return [];
  }

  const result = [];

  for (const item of evidence) {
    if (
      item?.status &&
      item.status !==
        "QUALIFIED"
    ) {
      continue;
    }

    const metricName =
      item?.metricName;

    const value =
      item?.value;

    const timestamp =
      normalizeIsoTimestamp(
        item?.timestamp
      );

    if (
      !metricName ||
      !isFiniteNumber(value) ||
      !timestamp
    ) {
      continue;
    }

    result.push(
      freezeEvidence({
        metricName,

        value,

        unit:
          item?.unit ??
          null,

        currency:
          item?.currency ??
          null,

        timestamp,

        vrmSiteId,

        evidenceSource,

        evidenceRole,

        sourceEvidence:
          item,

        provenance:
          Object.freeze({
            source:
              item?.source ??
              evidenceSource,

            phase:
              item?.phase ??
              null,

            deviceId:
              item?.deviceId ??
              null,

            deviceType:
              item?.deviceType ??
              null,

            deviceInstance:
              item?.deviceInstance ??
              null,

            vrmAttributeId:
              item?.vrmAttributeId ??
              null,

            dbusPath:
              item?.dbusPath ??
              null,

            evidenceBasis:
              item?.evidenceBasis ??
              null,
          }),
      })
    );
  }

  return result;
}


function extractEvidenceArray(
  source
) {
  if (!source) {
    return [];
  }


  /*
   * Source already supplied as an
   * evidence array.
   */
  if (Array.isArray(source)) {
    return source;
  }


  /*
   * Adapter wrapper containing an
   * evidence array.
   */
  if (
    Array.isArray(
      source.evidence
    )
  ) {
    return source.evidence;
  }


  /*
   * Adapter wrapper containing one
   * qualified evidence object.
   *
   * Example:
   *
   * batterySocEvidenceResult = {
   *   status: "QUALIFIED",
   *   evidence: {
   *     metricName:
   *       "INITIAL_BATTERY_SOC",
   *     value: 100,
   *     ...
   *   }
   * }
   */
  if (
    source.status ===
      "QUALIFIED" &&
    source.evidence &&
    typeof source.evidence ===
      "object" &&
    !Array.isArray(
      source.evidence
    ) &&
    source.evidence
      .metricName
  ) {
    return [
      source.evidence,
    ];
  }


  /*
   * Adapter may itself be the
   * qualified evidence object.
   */
  if (
    source.status ===
      "QUALIFIED" &&
    source.metricName
  ) {
    return [source];
  }


  return [];
}

function buildMetricIndex(
  evidence
) {
  const index =
    new Map();

  for (const item of evidence) {
    const existing =
      index.get(
        item.metricName
      ) ?? [];

    existing.push(item);

    index.set(
      item.metricName,
      existing
    );
  }

  return Object.freeze(
    Object.fromEntries(
      [...index.entries()]
        .map(
          ([
            metricName,
            items,
          ]) => [
            metricName,
            Object.freeze([
              ...items,
            ]),
          ]
        )
    )
  );
}


export function
composeOptimizationDssEvidence({
  vrmSiteId,

  financialBiEvidence = [],

  forecastEvidence = null,

  engineeringEvidence = null,

  vrmConfigurationEvidence = null,

  operationalEvidence = null,
} = {}) {
  const normalizedSiteId =
    normalizeSiteId(
      vrmSiteId
    );


  const financial =
    composeFinancialBiEvidence(
      financialBiEvidence,
      normalizedSiteId
    );


  const forecast =
    composeForecastEvidence(
      forecastEvidence,
      normalizedSiteId
    );


  const engineering =
    composeEvidenceArray({
      evidence:
        extractEvidenceArray(
          engineeringEvidence
        ),

      vrmSiteId:
        normalizedSiteId,

      evidenceSource:
        OPTIMIZATION_DSS_EVIDENCE_SOURCE
          .ENGINEERING_CONFIGURATION,

      evidenceRole:
        "ENGINEERING",
    });


  const vrmConfiguration =
    composeEvidenceArray({
      evidence:
        extractEvidenceArray(
          vrmConfigurationEvidence
        ),

      vrmSiteId:
        normalizedSiteId,

      evidenceSource:
        OPTIMIZATION_DSS_EVIDENCE_SOURCE
          .VRM_CONFIGURATION,

      evidenceRole:
        "ENGINEERING",
    });


  const operational =
    composeEvidenceArray({
      evidence:
        extractEvidenceArray(
          operationalEvidence
        ),

      vrmSiteId:
        normalizedSiteId,

      evidenceSource:
        OPTIMIZATION_DSS_EVIDENCE_SOURCE
          .OPERATIONAL,

      evidenceRole:
        "OPERATIONAL",
    });


  const allEvidence =
    Object.freeze([
      ...financial,
      ...forecast,
      ...engineering,
      ...vrmConfiguration,
      ...operational,
    ]);


  const availableMetricNames =
    Object.freeze([
      ...new Set(
        allEvidence.map(
          (item) =>
            item.metricName
        )
      ),
    ]);


  const metricIndex =
    buildMetricIndex(
      allEvidence
    );


  const sourceCounts =
    Object.freeze({
      financialBi:
        financial.length,

      forecasting:
        forecast.length,

      engineering:
        engineering.length,

      vrmConfiguration:
        vrmConfiguration.length,

      operational:
        operational.length,
    });


  const status =
    allEvidence.length === 0
      ? OPTIMIZATION_DSS_EVIDENCE_COMPOSITION_STATUS
          .UNAVAILABLE
      : (
          forecast.length > 0 &&
          (
            engineering.length > 0 ||
            vrmConfiguration.length > 0
          ) &&
          operational.length > 0
        )
        ? OPTIMIZATION_DSS_EVIDENCE_COMPOSITION_STATUS
            .READY
        : OPTIMIZATION_DSS_EVIDENCE_COMPOSITION_STATUS
            .PARTIALLY_READY;


  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_EVIDENCE_COMPOSITION_PHASE,

    layer:
      OPTIMIZATION_DSS_EVIDENCE_COMPOSITION_LAYER,

    status,

    vrmSiteId:
      normalizedSiteId,

    evidenceCount:
      allEvidence.length,

    availableMetricNames,

    sourceCounts,

    evidence:
      allEvidence,

    metricIndex,

    sourceEvidence:
      Object.freeze({
        financialBiEvidence,

        forecastEvidence,

        engineeringEvidence,

        vrmConfigurationEvidence,

        operationalEvidence,
      }),

    optimizationExecuted: false,

    boundaries:
      BOUNDARIES,
  });
}