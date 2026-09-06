import vrmApiClient from "./apiClient.js";
import env from "../../config/env.js";
import ApiError from "../../utils/ApiError.js";

const getInstallations = async () => {
  if (!env.vrm.userId) {
    throw new ApiError(
      500,
      "VRM_USER_ID is not configured."
    );
  }

  const response = await vrmApiClient.get(
    `/users/${env.vrm.userId}/installations`
  );

  return response.data;
};

const getInstallationById = async (installationId) => {
  if (!installationId) {
    throw new ApiError(
      400,
      "VRM installation ID is required."
    );
  }

  /*
   * Query the user's installations and ask VRM
   * for the requested site.
   */
  const response = await vrmApiClient.get(
    `/users/${env.vrm.userId}/installations`,
    {
      params: {
        idSite: installationId,
        extended: 1,
      },
    }
  );

  const records = response.data?.records;

  if (!records || records.length === 0) {
    throw new ApiError(
      404,
      `VRM installation ${installationId} was not found.`
    );
  }

  return records[0];
};

export {
  getInstallations,
  getInstallationById,
};