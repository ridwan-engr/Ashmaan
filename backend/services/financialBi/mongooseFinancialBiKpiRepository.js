import FinancialBiKpiRecord
  from "../../models/FinancialBiKpiRecord.js";

export const mongooseFinancialBiKpiRepository = Object.freeze({
  async upsertByPersistenceKey({ persistenceKey, document } = {}) {
    if (typeof persistenceKey !== "string" || !persistenceKey) {
      throw new Error("PERSISTENCE_KEY_REQUIRED");
    }
    if (!document || typeof document !== "object") {
      throw new Error("PERSISTENCE_DOCUMENT_REQUIRED");
    }

    const writeResult = await FinancialBiKpiRecord.updateOne(
      { persistenceKey },
      { $setOnInsert: document },
      { upsert: true }
    );

    const persisted = await FinancialBiKpiRecord
      .findOne({ persistenceKey })
      .select({ _id: 1, persistenceKey: 1 })
      .lean();

    return {
      inserted: writeResult.upsertedCount === 1,
      existing: writeResult.matchedCount === 1,
      documentId: persisted?._id ?? null,
    };
  },
});
