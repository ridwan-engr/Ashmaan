import siteDashboardService
  from "../services/dashboard/siteDashboardService.js";

import {
  getSiteTelemetrySnapshot,
} from "../services/dashboard/siteTelemetrySnapshotService.js";

const {
  getDashboardSites,
  getSiteOverview,
  getSiteTelemetry,
  getSiteEnergyHistory,
} = siteDashboardService;

const getSites = async (
  req,
  res,
  next
) => {
  try {
    const sites =
      await getDashboardSites();

    return res.status(200).json({
      success: true,
      data: sites,
    });
  } catch (error) {
    next(error);
  }
};

const getSite = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getSiteOverview(
        req.params.vrmSiteId
      );

    if (!result) {
      return res.status(404).json({
        success: false,
        message:
          "Installation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getTelemetry = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getSiteTelemetry({
        vrmSiteId:
          req.params.vrmSiteId,

        limit:
          req.query.limit,
      });

    if (!result) {
      return res.status(404).json({
        success: false,
        message:
          "Installation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getEnergyHistory =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getSiteEnergyHistory({
          vrmSiteId:
            req.params.vrmSiteId,

          metric:
            req.query.metric ||
            "kwh",

          days:
            req.query.days || 7,
        });

      if (!result) {
        return res.status(404).json({
          success: false,
          message:
            "Installation not found.",
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

export async function
getSiteTelemetrySnapshotController(
  req,
  res,
  next
) {
  try {
    const result =
      await getSiteTelemetrySnapshot(
        req.params.vrmSiteId
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  }
  catch (error) {
    return next(error);
  }
}

export {
  getSites,
  getSite,
  getTelemetry,
  getEnergyHistory,
};