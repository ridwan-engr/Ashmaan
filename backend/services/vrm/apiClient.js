import axios from "axios";
import env from "../../config/env.js";
import ApiError from "../../utils/ApiError.js";

const vrmApiClient = axios.create({
  baseURL: env.vrm.baseUrl,
  timeout: env.vrm.timeout,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/*
|--------------------------------------------------------------------------
| Request interceptor
|--------------------------------------------------------------------------
|
| Every outbound VRM request receives the access token here.
|
| The token therefore never needs to appear in:
| - controllers
| - routes
| - frontend
| - request payloads
|
*/

vrmApiClient.interceptors.request.use(
  (config) => {
    if (!env.vrm.accessToken) {
      throw new ApiError(
        500,
        "VRM_ACCESS_TOKEN is not configured."
      );
    }

    config.headers["x-authorization"] =
      `Token ${env.vrm.accessToken}`;

    return config;
  },

  (error) => Promise.reject(error)
);

/*
|--------------------------------------------------------------------------
| Response interceptor
|--------------------------------------------------------------------------
*/

vrmApiClient.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response) {
      const status = error.response.status;

      const vrmMessage =
        error.response.data?.errors ||
        error.response.data?.message ||
        "VRM API request failed.";

      if (status === 401) {
        return Promise.reject(
          new ApiError(
            401,
            `VRM authentication failed: ${vrmMessage}`
          )
        );
      }

      if (status === 403) {
        return Promise.reject(
          new ApiError(
            403,
            `VRM access forbidden: ${vrmMessage}`
          )
        );
      }

      if (status === 404) {
        return Promise.reject(
          new ApiError(
            404,
            `VRM resource not found: ${vrmMessage}`
          )
        );
      }

      if (status === 429) {
        return Promise.reject(
          new ApiError(
            429,
            "VRM API rate limit exceeded."
          )
        );
      }

      return Promise.reject(
        new ApiError(
          status,
          `VRM API error: ${vrmMessage}`
        )
      );
    }

    if (error.code === "ECONNABORTED") {
      return Promise.reject(
        new ApiError(
          504,
          "VRM API request timed out."
        )
      );
    }

    return Promise.reject(
      new ApiError(
        502,
        `Unable to communicate with VRM API: ${error.message}`
      )
    );
  }
);

export default vrmApiClient;