import vrmApiClient from "./apiClient.js";
import ApiError from "../../utils/ApiError.js";

const getInstallationAlarms = async (
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
    count = 100,
  } = options;

  const response = await vrmApiClient.get(
    `/installations/${installationId}/alarms`,
    {
      params: {
        count,
      },
    }
  );

  return response.data;
};

export {
  getInstallationAlarms,
};