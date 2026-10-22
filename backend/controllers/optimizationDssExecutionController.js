// controllers/optimizationDssExecutionController.js

import {
  OPTIMIZATION_DSS_EXECUTION_STATUS,
  createOptimizationDssExecutionService,
} from "../services/optimizationDss/optimizationDssExecutionService.js";


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
      "[OptimizationDSS] Execution failure:",
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
          "OPTIMIZATION_DSS_EXECUTION_UNAVAILABLE",

        message:
          statusCode >=
          500
            ? "Optimization DSS execution is temporarily unavailable."
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


export function
createOptimizationDssExecutionController({
  service =
    createOptimizationDssExecutionService(),
} = {}) {
  if (
    !service ||
    typeof service.run !==
      "function"
  ) {
    throw new TypeError(
      "OPTIMIZATION_DSS_EXECUTION_SERVICE_REQUIRED"
    );
  }


  async function run(
    req,
    res
  ) {
    try {
      const result =
        await service.run({
          vrmSiteId:
            req.installationAccess
              ?.vrmSiteId,

          objectiveKind:
            req.body
              ?.objectiveKind,
        });


      /*
       * DSS UNAVAILABLE is an application result,
       * not an HTTP transport/server failure.
       *
       * The request was valid and the DSS evaluated
       * the site's current evidence successfully.
       */
      return res
        .status(200)
        .json({
          success:
            true,

          data:
            result,

          available:
            result.status !==
            OPTIMIZATION_DSS_EXECUTION_STATUS
              .UNAVAILABLE,
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
    run,
  });
}


export default
  createOptimizationDssExecutionController;