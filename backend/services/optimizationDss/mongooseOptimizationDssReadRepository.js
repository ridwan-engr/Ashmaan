// services/optimizationDss/mongooseOptimizationDssReadRepository.js

import OptimizationDssRecommendation
  from "../../models/OptimizationDssRecommendation.js";


function compactObject(
  value
) {
  return Object.fromEntries(
    Object.entries(
      value
    ).filter(
      (
        [, item]
      ) =>
        item !==
          null &&
        item !==
          undefined
    )
  );
}


function buildMongoFilter(
  filters
) {
  const mongoFilter = {};

  if (
    filters.scope
  ) {
    mongoFilter.scope =
      filters.scope;
  }

  if (
    filters.vrmSiteId
  ) {
    mongoFilter[
      "scopeIdentity.vrmSiteId"
    ] =
      filters.vrmSiteId;
  }

  if (
    filters.fleetId
  ) {
    mongoFilter[
      "scopeIdentity.fleetId"
    ] =
      filters.fleetId;
  }

  if (
    filters.recommendationKind
  ) {
    mongoFilter.recommendationKind =
      filters.recommendationKind;
  }

  if (
    filters.generationStatus
  ) {
    mongoFilter.generationStatus =
      filters.generationStatus;
  }

  if (
    filters.applicability
  ) {
    mongoFilter.applicability =
      filters.applicability;
  }

  if (
    filters.confidence
  ) {
    mongoFilter.confidence =
      filters.confidence;
  }

  if (
    filters.horizonStart ||
    filters.horizonEnd
  ) {
    mongoFilter[
      "horizon.start"
    ] =
      compactObject({
        $gte:
          filters.horizonStart,
        $lt:
          filters.horizonEnd,
      });
  }

  return mongoFilter;
}


export function createMongooseOptimizationDssReadRepository({
  model =
    OptimizationDssRecommendation,
} = {}) {
  if (
    !model ||
    typeof model.find !==
      "function" ||
    typeof model.findOne !==
      "function" ||
    typeof model.countDocuments !==
      "function"
  ) {
    throw new Error(
      "MONGOOSE_READ_MODEL_REQUIRED"
    );
  }

  return Object.freeze({
    async listRecommendations({
      filters,
      offset,
      limit,
      sort,
    }) {
      const mongoFilter =
        buildMongoFilter(
          filters
        );

      const sortDirection =
        sort.direction ===
          "asc"
          ? 1
          : -1;

      const query =
        model
          .find(
            mongoFilter
          )
          .sort({
            [sort.field]:
              sortDirection,
          })
          .skip(
            offset
          )
          .limit(
            limit
          )
          .lean();

      const [
        items,
        total,
      ] =
        await Promise.all([
          query,
          model.countDocuments(
            mongoFilter
          ),
        ]);

      return {
        items,
        total,
      };
    },

    async findByPersistenceKey({
      persistenceKey,
    }) {
      return model
        .findOne({
          persistenceKey,
        })
        .lean();
    },
  });
}
