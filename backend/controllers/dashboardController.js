import {
  getFleetOverview,
  getEnergyTrend
} from "../services/dashboard/dashboardService.js";

import {
  getUserInstallationScope,
  USER_INSTALLATION_SCOPE_STATUS,
} from "../services/security/userInstallationScopeService.js";


async function resolveDashboardScope(
  req,
  res
) {
  const scope =
    await getUserInstallationScope({
      userId:
        req?.auth?.userId,
    });

  if (
    scope.status ===
    USER_INSTALLATION_SCOPE_STATUS.DENY
  ) {
    res.status(403).json({
      error: {
        code:
          "INSTALLATION_ACCESS_DENIED",

        message:
          "Installation access denied.",
      },
    });

    return null;
  }

  if (
    scope.status !==
    USER_INSTALLATION_SCOPE_STATUS.RESOLVED
  ) {
    res.status(503).json({
      error: {
        code:
          "INSTALLATION_AUTHORIZATION_UNAVAILABLE",

        message:
          "Installation authorization is temporarily unavailable.",
      },
    });

    return null;
  }

  return scope;
}


const getOverview = async (
  req,
  res,
  next
) => {
  try {
    const scope =
      await resolveDashboardScope(
        req,
        res
      );

    if (!scope) {
      return;
    }

    const overview =
      await getFleetOverview({
        installationIds:
          scope.installationIds,
      });

    return res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};


const getEnergyHistory = async (
  req,
  res,
  next
) => {
  try {
    const {
      days = 7,
      metric = "kwh",
    } = req.query;

    const scope =
      await resolveDashboardScope(
        req,
        res
      );

    if (!scope) {
      return;
    }

    const result =
      await getEnergyTrend({
        days,
        metric,

        installationIds:
          scope.installationIds,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export {
  getOverview,
  getEnergyHistory,
};