// services/optimizationDss/optimizationDssApiService.js

import {
  OPTIMIZATION_DSS_API_CONTRACT_PHASE,
  OPTIMIZATION_DSS_API_CONTRACT_LAYER,
  OPTIMIZATION_DSS_API_RESPONSE_STATUS,
  buildOptimizationDssApiListRequest,
  buildOptimizationDssApiGetRequest,
  buildOptimizationDssApiEnvelope,
} from "./optimizationDssApiContract.js";


export const OPTIMIZATION_DSS_API_IMPLEMENTATION_PHASE =
  "11.13";

export const OPTIMIZATION_DSS_API_IMPLEMENTATION_LAYER =
  "OPTIMIZATION_DSS";

export const OPTIMIZATION_DSS_API_IMPLEMENTATION_UPSTREAM_PHASE =
  "11.12";


export const OPTIMIZATION_DSS_API_IMPLEMENTATION_BOUNDARIES =
  Object.freeze({
    implementationOnly:
      true,

    readOnly:
      true,

    listImplemented:
      true,

    getByPersistenceKeyImplemented:
      true,

    createImplemented:
      false,

    updateImplemented:
      false,

    deleteImplemented:
      false,

    persistenceMutationIncluded:
      false,

    serverMountIncluded:
      false,

    liveHttpValidated:
      false,

    dashboardIncluded:
      false,

    automatedControlIncluded:
      false,

    automaticDispatchAllowed:
      false,

    executableActionProduced:
      false,

    financialBiMutationIncluded:
      false,

    forecastingMutationIncluded:
      false,

    engineeringAnalyticsMutationIncluded:
      false,

    telemetryMutationIncluded:
      false,

    eventMutationIncluded:
      false,

    missingMeansZero:
      false,

    unavailableMeansZero:
      false,

    unitInferenceAllowed:
      false,

    currencyInferenceAllowed:
      false,

    currencyConversionAllowed:
      false,

    tariffInferenceAllowed:
      false,

    emissionFactorInferenceAllowed:
      false,

    topologyInferenceAllowed:
      false,

    controllabilityInferenceAllowed:
      false,

    implicitTimeGridAllowed:
      false,

    implicitResamplingAllowed:
      false,

    interpolationAllowed:
      false,

    futureObservedDataFabricationAllowed:
      false,
  });


function validateRepository(
  repository
) {
  if (
    !repository ||
    typeof repository.listRecommendations !==
      "function" ||
    typeof repository.findByPersistenceKey !==
      "function"
  ) {
    throw new Error(
      "READ_REPOSITORY_REQUIRED"
    );
  }
}


export function createOptimizationDssApiService({
  repository,
} = {}) {
  validateRepository(
    repository
  );

  return Object.freeze({
    phase:
      OPTIMIZATION_DSS_API_IMPLEMENTATION_PHASE,

    layer:
      OPTIMIZATION_DSS_API_IMPLEMENTATION_LAYER,

    upstreamPhase:
      OPTIMIZATION_DSS_API_IMPLEMENTATION_UPSTREAM_PHASE,

    contractPhase:
      OPTIMIZATION_DSS_API_CONTRACT_PHASE,

    contractLayer:
      OPTIMIZATION_DSS_API_CONTRACT_LAYER,

    boundaries:
      OPTIMIZATION_DSS_API_IMPLEMENTATION_BOUNDARIES,

    async listRecommendations({
      query = {},
    } = {}) {
      try {
        const request =
          buildOptimizationDssApiListRequest({
            query,
          });

        const result =
          await repository.listRecommendations({
            filters:
              request.filters,

            offset:
              request.offset,

            limit:
              request.limit,

            sort:
              request.sort,
          });

        const items =
          Array.isArray(
            result?.items
          )
            ? result.items
            : [];

        const total =
          Number.isInteger(
            result?.total
          ) &&
          result.total >=
            0
            ? result.total
            : 0;

        return buildOptimizationDssApiEnvelope({
          status:
            OPTIMIZATION_DSS_API_RESPONSE_STATUS.OK,

          data:
            items,

          meta:
            {
              page:
                request.page,

              limit:
                request.limit,

              total,

              pageCount:
                Math.ceil(
                  total /
                  request.limit
                ),

              sort:
                request.sort,

              filters:
                request.filters,
            },
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(
                error
              );

        const invalidRequest =
          [
            "PAGE_INVALID",
            "LIMIT_INVALID",
            "LIMIT_EXCEEDS_MAX",
            "SORT_FIELD_INVALID",
            "SORT_DIRECTION_INVALID",
            "HORIZON_START_INVALID",
            "HORIZON_END_INVALID",
            "HORIZON_RANGE_INVALID",
            "FILTER_VALUE_INVALID",
          ].includes(
            message
          );

        return buildOptimizationDssApiEnvelope({
          status:
            invalidRequest
              ? OPTIMIZATION_DSS_API_RESPONSE_STATUS.INVALID_REQUEST
              : OPTIMIZATION_DSS_API_RESPONSE_STATUS.UNAVAILABLE,

          error:
            {
              code:
                invalidRequest
                  ? "INVALID_REQUEST"
                  : "READ_REPOSITORY_UNAVAILABLE",

              message,
            },
        });
      }
    },

    async getRecommendation({
      persistenceKey,
    } = {}) {
      try {
        const request =
          buildOptimizationDssApiGetRequest({
            persistenceKey,
          });

        const item =
          await repository.findByPersistenceKey({
            persistenceKey:
              request.persistenceKey,
          });

        if (
          !item
        ) {
          return buildOptimizationDssApiEnvelope({
            status:
              OPTIMIZATION_DSS_API_RESPONSE_STATUS.NOT_FOUND,

            error:
              {
                code:
                  "RECOMMENDATION_NOT_FOUND",
              },
          });
        }

        return buildOptimizationDssApiEnvelope({
          status:
            OPTIMIZATION_DSS_API_RESPONSE_STATUS.OK,

          data:
            item,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(
                error
              );

        const invalidRequest =
          message ===
            "PERSISTENCE_KEY_INVALID";

        return buildOptimizationDssApiEnvelope({
          status:
            invalidRequest
              ? OPTIMIZATION_DSS_API_RESPONSE_STATUS.INVALID_REQUEST
              : OPTIMIZATION_DSS_API_RESPONSE_STATUS.UNAVAILABLE,

          error:
            {
              code:
                invalidRequest
                  ? "INVALID_REQUEST"
                  : "READ_REPOSITORY_UNAVAILABLE",

              message,
            },
        });
      }
    },
  });
}
