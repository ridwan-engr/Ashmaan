import mongoose from "mongoose";

const FinancialBiKpiRecordSchema = new mongoose.Schema(
  {
    persistenceKey: { type: String, required: true, unique: true, immutable: true, index: true },
    recordKind: { type: String, required: true, enum: ["KPI_AGGREGATION"], immutable: true },
    metricName: { type: String, required: true, immutable: true },
    scope: { type: String, required: true, enum: ["SITE", "FLEET"], immutable: true },
    scopeIdentity: {
      vrmSiteId: { type: String, default: null },
      fleetId: { type: String, default: null },
    },
    reportingWindow: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
      timezone: { type: String, required: true },
      semantics: { type: String, required: true, enum: ["[start,end)"] },
    },
    lineage: {
      phase10_6: { type: String, required: true },
      phase10_5: { type: String, required: true },
      aggregationDefinitionName: { type: String, required: true },
      aggregationStatus: { type: String, required: true },
      aggregationReason: { type: String, required: true },
    },
    payload: {
      status: { type: String, required: true },
      reason: { type: String, required: true },
      value: { type: Number, default: null },
      unit: { type: String, default: null },
      currency: { type: String, default: null },
      available: { type: Boolean, required: true },
    },
    phase: { type: String, required: true, enum: ["10.8"], immutable: true },
    upstreamPhase: { type: String, required: true, enum: ["10.7"], immutable: true },
    layer: { type: String, required: true, enum: ["FINANCIAL_BI"], immutable: true },
  },
  { timestamps: true, minimize: false, versionKey: false }
);

FinancialBiKpiRecordSchema.index({
  scope: 1,
  metricName: 1,
  "reportingWindow.start": 1,
  "reportingWindow.end": 1,
});

const FinancialBiKpiRecord =
  mongoose.models.FinancialBiKpiRecord ||
  mongoose.model("FinancialBiKpiRecord", FinancialBiKpiRecordSchema);

export default FinancialBiKpiRecord;
