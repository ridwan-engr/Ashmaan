import vrmApiClient from "./apiClient.js";
import ApiError from "../../utils/ApiError.js";

const getInstallationTelemetry = async (
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
    count = 1000,
  } = options;

  const response = await vrmApiClient.get(
    `/installations/${installationId}/diagnostics`,
    {
      params: {
        count,
      },
    }
  );

  return response.data;
};

export {
  getInstallationTelemetry,
};