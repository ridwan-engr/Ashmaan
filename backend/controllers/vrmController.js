import ApiResponse from "../utils/ApiResponse.js";

import {
  getInstallations as fetchInstallations,
  getInstallationById as fetchInstallationById,
} from "../services/vrm/installationService.js";

import {
  getInstallationTelemetry as fetchTelemetry,
} from "../services/vrm/telemetryService.js";

import {
  getInstallationAlarms as fetchAlarms,
} from "../services/vrm/alarmService.js";

import {
  getInstallationStatistics as fetchStatistics,
} from "../services/vrm/statisticsService.js";

import {
  getUserInstallationScope,
  USER_INSTALLATION_SCOPE_STATUS,
} from "../services/security/userInstallationScopeService.js";

import {
  getEntitledVrmSiteIds,
  filterVrmInstallationsBySiteIds,
} from "../services/security/vrmInstallationCollectionScopeService.js";


/*
|--------------------------------------------------------------------------
| VRM Installation Collection
|--------------------------------------------------------------------------
|
| Dependency injection is intentional here.
|
| Production calls use the real services through the defaults below.
| Validation can inject controlled dependencies without connecting to
| Atlas or making VRM network requests.
|
*/

const getInstallationsWithDependencies = async (
  req,
  res,
  {
    resolveUserScope =
      getUserInstallationScope,

    resolveVrmSiteIds =
      getEntitledVrmSiteIds,

    fetchVrmInstallations =
      fetchInstallations,

    filterInstallations =
      filterVrmInstallationsBySiteIds,
  } = {}
) => {
  /*
   * Resolve the authenticated portal user's installation scope.
   */
  const scope =
    await resolveUserScope({
      userId:
        req?.auth?.userId,
    });


  /*
   * Missing, invalid, or otherwise denied principal/scope.
   */
  if (
    scope.status ===
    USER_INSTALLATION_SCOPE_STATUS.DENY
  ) {
    return res.status(403).json({
      error: {
        code:
          "INSTALLATION_ACCESS_DENIED",

        message:
          "Installation access denied.",
      },
    });
  }


  /*
   * Any scope result other than RESOLVED is fail-closed.
   *
   * This includes authorization repository unavailability and
   * unknown/unexpected scope states.
   */
  if (
    scope.status !==
    USER_INSTALLATION_SCOPE_STATUS.RESOLVED
  ) {
    return res.status(503).json({
      error: {
        code:
          "INSTALLATION_AUTHORIZATION_UNAVAILABLE",

        message:
          "Installation authorization is temporarily unavailable.",
      },
    });
  }


  /*
   * Empty entitlement is a valid resolved scope.
   *
   * It means the authenticated user can see zero installations.
   *
   * Critically:
   * - empty does not mean unrestricted;
   * - no Installation lookup is required;
   * - no VRM fleet request is made.
   */
  if (
    scope.installationIds.length === 0
  ) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          records: [],
        },
        "VRM installations retrieved successfully."
      )
    );
  }


  /*
   * Bridge canonical local authorization identity:
   *
   * Installation._id[]
   *        ->
   * Installation.vrmSiteId[]
   */
  const vrmSiteIds =
    await resolveVrmSiteIds({
      installationIds:
        scope.installationIds,
    });


  /*
   * Entitlements may reference local installations that no longer
   * resolve to usable VRM site identities.
   *
   * This condition remains empty/fail-closed rather than falling
   * back to unrestricted VRM fleet access.
   */
  if (vrmSiteIds.length === 0) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          records: [],
        },
        "VRM installations retrieved successfully."
      )
    );
  }


  /*
   * Fetch the remote collection only after authorization scope has
   * successfully resolved to at least one permitted VRM site ID.
   */
  const data =
    await fetchVrmInstallations();


  /*
   * Established VRM installation collection contract:
   *
   *     data.records
   *
   * Do not silently interpret a malformed/unexpected upstream
   * response as an empty successful fleet.
   */
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !Array.isArray(data.records)
  ) {
    const error =
      new Error(
        "VRM installation collection response is unavailable."
      );

    error.statusCode = 503;

    error.code =
      "VRM_INSTALLATION_COLLECTION_UNAVAILABLE";

    throw error;
  }


  /*
   * Filter the remote collection against the already-authorized
   * VRM site identity set.
   *
   * Non-entitled records and records without a usable VRM identity
   * are excluded.
   */
  const records =
    filterInstallations({
      installations:
        data.records,

      vrmSiteIds,
    });


  /*
   * Preserve the complete upstream VRM response envelope.
   *
   * Only the records collection is replaced with its authorized
   * subset.
   */
  const scopedData = {
    ...data,
    records,
  };


  return res.status(200).json(
    new ApiResponse(
      200,
      scopedData,
      "VRM installations retrieved successfully."
    )
  );
};


/*
|--------------------------------------------------------------------------
| Production VRM Installation Collection Handler
|--------------------------------------------------------------------------
|
| Routes continue using getInstallations().
|
| The dependency-aware implementation above exists so the security
| behavior can be validated without Atlas or VRM network activity.
|
*/

const getInstallations = async (
  req,
  res
) =>
  getInstallationsWithDependencies(
    req,
    res
  );


/*
|--------------------------------------------------------------------------
| Single Installation
|--------------------------------------------------------------------------
*/

const getInstallationById = async (
  req,
  res
) => {
  const { id } = req.params;

  const data =
    await fetchInstallationById(id);

  return res.status(200).json(
    new ApiResponse(
      200,
      data,
      "VRM installation retrieved successfully."
    )
  );
};


/*
|--------------------------------------------------------------------------
| Installation Telemetry
|--------------------------------------------------------------------------
*/

const getInstallationTelemetry = async (
  req,
  res
) => {
  const { id } = req.params;

  const count =
    Number(req.query.count) || 1000;

  const data =
    await fetchTelemetry(
      id,
      {
        count,
      }
    );

  return res.status(200).json(
    new ApiResponse(
      200,
      data,
      "VRM telemetry retrieved successfully."
    )
  );
};


/*
|--------------------------------------------------------------------------
| Installation Alarms
|--------------------------------------------------------------------------
*/

const getInstallationAlarms = async (
  req,
  res
) => {
  const { id } = req.params;

  const count =
    Number(req.query.count) || 100;

  const data =
    await fetchAlarms(
      id,
      {
        count,
      }
    );

  return res.status(200).json(
    new ApiResponse(
      200,
      data,
      "VRM alarms retrieved successfully."
    )
  );
};


/*
|--------------------------------------------------------------------------
| Installation Statistics
|--------------------------------------------------------------------------
*/

const getInstallationStatistics = async (
  req,
  res
) => {
  const { id } = req.params;

  const {
    type,
    interval,
    start,
    end,
  } = req.query;

  const data =
    await fetchStatistics(
      id,
      {
        type,
        interval,
        start,
        end,
      }
    );

  return res.status(200).json(
    new ApiResponse(
      200,
      data,
      "VRM statistics retrieved successfully."
    )
  );
};


/*
|--------------------------------------------------------------------------
| Internal Diagnostic Telemetry Inspection
|--------------------------------------------------------------------------
|
| The implementation is retained for internal use.
|
| P.1G removed its public HTTP exposure. Do not re-add a public
| diagnostic-sample route as part of P.1H-F3.
|
*/

const inspectInstallationTelemetry = async (
  req,
  res
) => {
  const { id } = req.params;

  const data =
    await fetchTelemetry(
      id,
      {
        count: 10,
      }
    );

  const records =
    Array.isArray(data?.records)
      ? data.records
      : Array.isArray(
          data?.data?.records
        )
        ? data.data.records
        : [];

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        recordCount:
          records.length,

        sample:
          records.slice(
            0,
            10
          ),
      },
      "VRM diagnostic sample retrieved successfully."
    )
  );
};


export {
  getInstallations,
  getInstallationsWithDependencies,
  getInstallationById,
  getInstallationTelemetry,
  getInstallationAlarms,
  getInstallationStatistics,
  inspectInstallationTelemetry,
};