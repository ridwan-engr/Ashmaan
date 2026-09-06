import {
  getFleetOverview,
  getEnergyTrend
} from "../services/dashboard/dashboardService.js";

const getOverview = async (
  req,
  res,
  next
) => {
  try {
    const overview =
      await getFleetOverview();

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

    const result =
      await getEnergyTrend({
        days,
        metric,
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