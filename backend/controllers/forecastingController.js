// controllers/forecastingController.js

import {
    FORECASTING_API_PHASE,
} from "../services/forecasting/forecastingApiService.js";


export function createForecastingController({
    forecastingApiService,
} = {}) {
    if (
        !forecastingApiService ||
        typeof forecastingApiService !==
            "object"
    ) {
        throw new Error(
            "FORECASTING_API_SERVICE_REQUIRED"
        );
    }

    function sendError(
        res,
        error,
        status =
            400
    ) {
        return res
            .status(
                status
            )
            .json(
                {
                    phase:
                        FORECASTING_API_PHASE,

                    error:
                        {
                            name:
                                error?.name ??
                                "Error",

                            message:
                                error?.message ??
                                "Forecasting API request failed.",
                        },
                }
            );
    }

    return Object.freeze({
        async health(
            req,
            res
        ) {
            try {
                return res.json(
                    forecastingApiService.health()
                );
            }
            catch (
                error
            ) {
                return sendError(
                    res,
                    error,
                    500
                );
            }
        },


        async listForecasts(
            req,
            res
        ) {
            try {
                const result =
                    await forecastingApiService.listForecasts(
                        {
                            vrmSiteId:
                                req.query?.vrmSiteId ??
                                null,

                            targetFamily:
                                req.query?.targetFamily ??
                                null,

                            targetMetric:
                                req.query?.targetMetric ??
                                null,

                            modelFamily:
                                req.query?.modelFamily ??
                                null,

                            outputType:
                                req.query?.outputType ??
                                null,

                            page:
                                req.query?.page ??
                                1,

                            limit:
                                req.query?.limit ??
                                50,
                        }
                    );

                return res.json(
                    result
                );
            }
            catch (
                error
            ) {
                return sendError(
                    res,
                    error
                );
            }
        },


        async getForecastById(
            req,
            res
        ) {
            try {
                const record =
                    await forecastingApiService.getForecastById(
                        {
                            id:
                                req.params?.id,
                        }
                    );

                if (
                    !record
                ) {
                    return res
                        .status(
                            404
                        )
                        .json(
                            {
                                phase:
                                    FORECASTING_API_PHASE,

                                error:
                                    {
                                        message:
                                            "FORECAST_NOT_FOUND",
                                    },
                            }
                        );
                }

                return res.json(
                    record
                );
            }
            catch (
                error
            ) {
                return sendError(
                    res,
                    error
                );
            }
        },


        async getForecastByPersistenceKey(
            req,
            res
        ) {
            try {
                const record =
                    await forecastingApiService.getForecastByPersistenceKey(
                        {
                            persistenceKey:
                                req.params?.persistenceKey,
                        }
                    );

                if (
                    !record
                ) {
                    return res
                        .status(
                            404
                        )
                        .json(
                            {
                                phase:
                                    FORECASTING_API_PHASE,

                                error:
                                    {
                                        message:
                                            "FORECAST_NOT_FOUND",
                                    },
                            }
                        );
                }

                return res.json(
                    record
                );
            }
            catch (
                error
            ) {
                return sendError(
                    res,
                    error
                );
            }
        },


        async listSiteForecasts(
            req,
            res
        ) {
            try {
                const result =
                    await forecastingApiService.listSiteForecasts(
                        {
                            vrmSiteId:
                                req.params?.vrmSiteId,

                            page:
                                req.query?.page ??
                                1,

                            limit:
                                req.query?.limit ??
                                50,
                        }
                    );

                return res.json(
                    result
                );
            }
            catch (
                error
            ) {
                return sendError(
                    res,
                    error
                );
            }
        },


        async getLatestSiteTargetForecast(
            req,
            res
        ) {
            try {
                const record =
                    await forecastingApiService.getLatestSiteTargetForecast(
                        {
                            vrmSiteId:
                                req.params?.vrmSiteId,

                            targetFamily:
                                req.params?.targetFamily,

                            targetMetric:
                                req.params?.targetMetric,
                        }
                    );

                if (
                    !record
                ) {
                    return res
                        .status(
                            404
                        )
                        .json(
                            {
                                phase:
                                    FORECASTING_API_PHASE,

                                error:
                                    {
                                        message:
                                            "FORECAST_NOT_FOUND",
                                    },
                            }
                        );
                }

                return res.json(
                    record
                );
            }
            catch (
                error
            ) {
                return sendError(
                    res,
                    error
                );
            }
        },
    });
}


export default createForecastingController;
