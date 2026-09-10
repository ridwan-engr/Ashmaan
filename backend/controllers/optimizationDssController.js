// controllers/optimizationDssController.js

import {
  OPTIMIZATION_DSS_API_RESPONSE_STATUS,
} from "../services/optimizationDss/optimizationDssApiContract.js";


function httpStatusForEnvelope(
  envelope
) {
  switch (
    envelope.status
  ) {
    case OPTIMIZATION_DSS_API_RESPONSE_STATUS.OK:
      return 200;

    case OPTIMIZATION_DSS_API_RESPONSE_STATUS.NOT_FOUND:
      return 404;

    case OPTIMIZATION_DSS_API_RESPONSE_STATUS.INVALID_REQUEST:
      return 400;

    case OPTIMIZATION_DSS_API_RESPONSE_STATUS.UNAVAILABLE:
    default:
      return 503;
  }
}


export function createOptimizationDssController({
  apiService,
} = {}) {
  if (
    !apiService ||
    typeof apiService.listRecommendations !==
      "function" ||
    typeof apiService.getRecommendation !==
      "function"
  ) {
    throw new Error(
      "OPTIMIZATION_DSS_API_SERVICE_REQUIRED"
    );
  }

  return Object.freeze({
    async listRecommendations(
      req,
      res
    ) {
      const envelope =
        await apiService.listRecommendations({
          query:
            req?.query ??
            {},
        });

      return res
        .status(
          httpStatusForEnvelope(
            envelope
          )
        )
        .json(
          envelope
        );
    },

    async getRecommendation(
      req,
      res
    ) {
      const envelope =
        await apiService.getRecommendation({
          persistenceKey:
            req?.params
              ?.persistenceKey,
        });

      return res
        .status(
          httpStatusForEnvelope(
            envelope
          )
        )
        .json(
          envelope
        );
    },
  });
}
