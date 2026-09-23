// controllers/forecastingController.js

import {
    FORECASTING_API_PHASE,
} from "../services/forecasting/forecastingApiService.js";

import {
    USER_INSTALLATION_SCOPE_STATUS,
    getUserInstallationScope,
} from "../services/security/userInstallationScopeService.js";

import {
    getEntitledVrmSiteIds,
} from "../services/security/vrmInstallationCollectionScopeService.js";

import {
    FORECAST_RECORD_AUTHORIZATION_DECISIONS,
    authorizeForecastRecord,
} from "../services/security/forecastRecordAuthorizationService.js";


export function createForecastingController({
    forecastingApiService,
    getInstallationScope =
        getUserInstallationScope,
    getVrmSiteIds =
        getEntitledVrmSiteIds,
    authorizeRecord =
        authorizeForecastRecord,
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

    if (
        typeof getInstallationScope !==
            "function"
    ) {
        throw new Error(
            "FORECASTING_INSTALLATION_SCOPE_REQUIRED"
        );
    }

    if (
        typeof getVrmSiteIds !==
            "function"
    ) {
        throw new Error(
            "FORECASTING_VRM_SITE_SCOPE_REQUIRED"
        );
    }

    if (
        typeof authorizeRecord !==
            "function"
    ) {
        throw new Error(
            "FORECASTING_RECORD_AUTHORIZATION_REQUIRED"
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
                const userId =
                    req?.auth?.userId;

                const scope =
                    await getInstallationScope({
                        userId,
                    });

                if (
                    scope?.status !==
                        USER_INSTALLATION_SCOPE_STATUS.RESOLVED ||
                    !Array.isArray(
                        scope?.installationIds
                    )
                ) {
                    const status =
                        scope?.status ===
                            USER_INSTALLATION_SCOPE_STATUS.DENY
                            ? 403
                            : 503;

                    return sendError(
                        res,
                        new Error(
                            status === 403
                                ? "FORECASTING_SITE_SCOPE_DENIED"
                                : "FORECASTING_SITE_SCOPE_UNAVAILABLE"
                        ),
                        status
                    );
                }

                const allowedVrmSiteIds =
                    await getVrmSiteIds({
                        installationIds:
                            scope.installationIds,
                    });

                if (
                    !Array.isArray(
                        allowedVrmSiteIds
                    )
                ) {
                    return sendError(
                        res,
                        new Error(
                            "FORECASTING_SITE_SCOPE_UNAVAILABLE"
                        ),
                        503
                    );
                }

                const result =
                    await forecastingApiService.listForecasts(
                        {
                            vrmSiteId:
                                req.query?.vrmSiteId ??
                                null,

                            allowedVrmSiteIds,

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
                    error,
                    503
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

                const authorization =
                    await authorizeRecord({
                        userId:
                            req.auth?.userId,
                        record,
                    });

                if (
                    authorization?.decision ===
                    FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE
                ) {
                    return sendError(
                        res,
                        new Error(
                            "FORECAST_AUTHORIZATION_UNAVAILABLE"
                        ),
                        503
                    );
                }

                if (
                    authorization?.decision !==
                    FORECAST_RECORD_AUTHORIZATION_DECISIONS.ALLOW
                ) {
                    return sendError(
                        res,
                        new Error(
                            "FORECAST_ACCESS_DENIED"
                        ),
                        403
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

                const authorization =
                    await authorizeRecord({
                        userId:
                            req.auth?.userId,
                        record,
                    });

                if (
                    authorization?.decision ===
                    FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE
                ) {
                    return sendError(
                        res,
                        new Error(
                            "FORECAST_AUTHORIZATION_UNAVAILABLE"
                        ),
                        503
                    );
                }

                if (
                    authorization?.decision !==
                    FORECAST_RECORD_AUTHORIZATION_DECISIONS.ALLOW
                ) {
                    return sendError(
                        res,
                        new Error(
                            "FORECAST_ACCESS_DENIED"
                        ),
                        403
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
