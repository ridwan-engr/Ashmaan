// services/optimizationDss/mongooseOptimizationDssPersistenceRepository.js

import OptimizationDssRecommendation
  from "../../models/OptimizationDssRecommendation.js";


function toPlainDocument(document) {
  if (!document) {
    return null;
  }

  if (
    typeof document.toObject ===
      "function"
  ) {
    return document.toObject();
  }

  return document;
}


export function createMongooseOptimizationDssPersistenceRepository({
  model =
    OptimizationDssRecommendation,
} = {}) {
  if (
    !model ||
    typeof model.findOneAndUpdate !==
      "function"
  ) {
    throw new Error(
      "MONGOOSE_MODEL_REQUIRED"
    );
  }

  return Object.freeze({
    async upsertByPersistenceKey({
      persistenceKey,
      record,
    }) {
      // persistenceKey is the deterministic selector and must not be
      // written through both $set and $setOnInsert in the same update.
      // MongoDB rejects overlapping update paths such as:
      //   $set.persistenceKey + $setOnInsert.persistenceKey
      //
      // Keep the key insert-only while all remaining record fields are
      // updated idempotently.
      const {
        persistenceKey:
          _recordPersistenceKey,
        ...recordWithoutPersistenceKey
      } =
        record ?? {};

      const document =
        await model.findOneAndUpdate(
          {
            persistenceKey,
          },

          {
            $set: {
              ...recordWithoutPersistenceKey,
            },

            $setOnInsert: {
              persistenceKey,
            },
          },

          {
            returnDocument:
              "after",
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );

      return toPlainDocument(
        document
      );
    },

    async findByPersistenceKey({
      persistenceKey,
    }) {
      const query =
        model.findOne({
          persistenceKey,
        });

      const document =
        typeof query?.lean ===
          "function"
          ? await query.lean()
          : await query;

      return toPlainDocument(
        document
      );
    },
  });
}
