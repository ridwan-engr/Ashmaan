// controllers/optimizationDssConfigurationController.js

import {
  OPTIMIZATION_DSS_SITE_CONFIGURATION_STATUS,
  createOptimizationDssSiteConfigurationService,
} from "../services/optimizationDss/optimizationDssSiteConfigurationService.js";


function sendError(
  res,
  error
) {
  const statusCode =
    Number.isInteger(
      error?.statusCode
    )
      ? error.statusCode
      : 500;


  if (
    statusCode >=
      500
  ) {
    console.error(
      "[OptimizationDSS] Configuration failure:",
      error?.code ??
        error?.message ??
        "UNKNOWN"
    );
  }


  return res
    .status(
      statusCode
    )
    .json({
      success:
        false,

      error: {
        code:
          error?.code ??
          "OPTIMIZATION_DSS_CONFIGURATION_UNAVAILABLE",

        message:
          statusCode >=
            500
            ? "Optimization DSS configuration is temporarily unavailable."
            : error.message,

        details:
          statusCode >=
            500
            ? null
            : error?.details ??
              null,
      },
    });
}


export function createOptimizationDssConfigurationController({
  service =
    createOptimizationDssSiteConfigurationService(),
} = {}) {
  if (
    !service ||
    typeof service
      .getConfiguration !==
      "function" ||
    typeof service
      .putConfiguration !==
      "function"
  ) {
    throw new TypeError(
      "OPTIMIZATION_DSS_CONFIGURATION_SERVICE_REQUIRED"
    );
  }


  async function getConfiguration(
    req,
    res
  ) {
    try {
      const result =
        await service
          .getConfiguration({
            vrmSiteId:
              req.installationAccess
                ?.vrmSiteId,

            installationId:
              req.installationAccess
                ?.installationId,
          });


      if (
        result.status ===
          OPTIMIZATION_DSS_SITE_CONFIGURATION_STATUS
            .NOT_FOUND
      ) {
        return res
          .status(404)
          .json({
            success:
              false,

            error: {
              code:
                "OPTIMIZATION_DSS_CONFIGURATION_NOT_FOUND",

              message:
                "No Optimization DSS engineering configuration exists for this installation.",
            },
          });
      }


      return res
        .status(200)
        .json({
          success:
            true,

          data:
            result.configuration,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  }


  async function putConfiguration(
    req,
    res
  ) {
    try {
      const result =
        await service
          .putConfiguration({
            vrmSiteId:
              req.installationAccess
                ?.vrmSiteId,

            installationId:
              req.installationAccess
                ?.installationId,

            actorUserId:
              req.auth
                ?.userId,

            body:
              req.body,
          });


      return res
        .status(
          result.created
            ? 201
            : 200
        )
        .json({
          success:
            true,

          data:
            result.configuration,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  }


  return Object.freeze({
    getConfiguration,
    putConfiguration,
  });
}


export default
  createOptimizationDssConfigurationController;