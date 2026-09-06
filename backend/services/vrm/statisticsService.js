import vrmApiClient from "./apiClient.js";
import ApiError from "../../utils/ApiError.js";

const getInstallationStatistics = async (
  installationId,
  options = {}
) => {
  if (!installationId) {
    throw new ApiError(
      400,
      "VRM installation ID is required."
    );
  }

  const {
    type = "kwh",
    interval = "days",
    start,
    end,
  } = options;

  const params = {
    type,
    interval,
  };

  if (start) {
    params.start = start;
  }

  if (end) {
    params.end = end;
  }

  const response = await vrmApiClient.get(
    `/installations/${installationId}/stats`,
    {
      params,
    }
  );

  return response.data;
};

export {
  getInstallationStatistics,
};