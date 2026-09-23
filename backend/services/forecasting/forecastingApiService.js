// services/forecasting/forecastingApiService.js

/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 9.12 — Forecasting API Service
|--------------------------------------------------------------------------
|
| Read-only service over persisted forecast records.
|
|--------------------------------------------------------------------------
*/

export const FORECASTING_API_PHASE =
    "9.12";

export const FORECASTING_API_VERSION =
    "v1";

export const FORECASTING_API_BASE_PATH =
    "/api/v1/forecasting";


export const FORECASTING_API_BOUNDARIES =
    Object.freeze({
        readOnly:
            true,

        modelTrainingIncluded:
            false,

        modelQualificationIncluded:
            false,

        productionForecastExecutionIncluded:
            false,

        forecastPersistenceIncluded:
            false,

        forecastMutationIncluded:
            false,

        forecastDeletionIncluded:
            false,

        targetUnitInferenceAllowed:
            false,

        timezoneMutationAllowed:
            false,

        horizonMutationAllowed:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        engineeringAnalyticsMutationIncluded:
            false,

        telemetryMutationIncluded:
            false,

        eventMutationIncluded:
            false,

        dashboardIncluded:
            false,

        financialBiIncluded:
            false,

        optimizationDssIncluded:
            false,
    });


function assertModel(
    ForecastRecordModel
) {
    if (
        !ForecastRecordModel ||
        typeof ForecastRecordModel.find !==
            "function" ||
        typeof ForecastRecordModel.findOne !==
            "function" ||
        typeof ForecastRecordModel.findById !==
            "function"
    ) {
        throw new Error(
            "FORECAST_RECORD_MODEL_REQUIRED"
        );
    }
}


function positiveInteger(
    value,
    fallback
) {
    const parsed =
        Number.parseInt(
            value,
            10
        );

    return Number.isInteger(
        parsed
    ) &&
        parsed >
            0
        ? parsed
        : fallback;
}


function normalizeAllowedVrmSiteIds(
    allowedVrmSiteIds
) {
    if (
        allowedVrmSiteIds ===
            undefined
    ) {
        return undefined;
    }

    if (
        !Array.isArray(
            allowedVrmSiteIds
        )
    ) {
        throw new TypeError(
            "ALLOWED_VRM_SITE_IDS_ARRAY_REQUIRED"
        );
    }

    return [
        ...new Set(
            allowedVrmSiteIds
                .map(
                    (vrmSiteId) =>
                        String(
                            vrmSiteId
                        ).trim()
                )
                .filter(
                    (vrmSiteId) =>
                        vrmSiteId !==
                        ""
                )
        ),
    ];
}


function queryToPlain(
    query
) {
    if (
        query &&
        typeof query.lean ===
            "function"
    ) {
        return query.lean();
    }

    return query;
}


function applySortLimit(
    query,
    {
        sort,
        limit,
        skip,
    }
) {
    let current =
        query;

    if (
        current &&
        typeof current.sort ===
            "function"
    ) {
        current =
            current.sort(
                sort
            );
    }

    if (
        current &&
        typeof current.skip ===
            "function"
    ) {
        current =
            current.skip(
                skip
            );
    }

    if (
        current &&
        typeof current.limit ===
            "function"
    ) {
        current =
            current.limit(
                limit
            );
    }

    return current;
}


export function createForecastingApiService({
    ForecastRecordModel,
} = {}) {
    assertModel(
        ForecastRecordModel
    );

    return Object.freeze({
        health() {
            return {
                phase:
                    FORECASTING_API_PHASE,

                version:
                    FORECASTING_API_VERSION,

                basePath:
                    FORECASTING_API_BASE_PATH,

                status:
                    "OK",

                readOnly:
                    true,

                boundaries:
                    FORECASTING_API_BOUNDARIES,
            };
        },


        async listForecasts({
            vrmSiteId = null,
            allowedVrmSiteIds = undefined,
            targetFamily = null,
            targetMetric = null,
            modelFamily = null,
            outputType = null,
            page = 1,
            limit = 50,
        } = {}) {
            const safePage =
                positiveInteger(
                    page,
                    1
                );

            const safeLimit =
                Math.min(
                    positiveInteger(
                        limit,
                        50
                    ),
                    200
                );

            const filter =
                {};

            const normalizedAllowedVrmSiteIds =
                normalizeAllowedVrmSiteIds(
                    allowedVrmSiteIds
                );

            if (
                vrmSiteId !==
                    null
            ) {
                const normalizedVrmSiteId =
                    String(
                        vrmSiteId
                    );

                if (
                    normalizedAllowedVrmSiteIds ===
                        undefined
                ) {
                    filter[
                        "identity.vrmSiteId"
                    ] =
                        normalizedVrmSiteId;
                }
                else {
                    filter[
                        "identity.vrmSiteId"
                    ] =
                        {
                            $in:
                                normalizedAllowedVrmSiteIds
                                    .filter(
                                        (
                                            allowedVrmSiteId
                                        ) =>
                                            allowedVrmSiteId ===
                                            normalizedVrmSiteId
                                    ),
                        };
                }
            }
            else if (
                normalizedAllowedVrmSiteIds !==
                    undefined
            ) {
                filter[
                    "identity.vrmSiteId"
                ] =
                    {
                        $in:
                            normalizedAllowedVrmSiteIds,
                    };
            }

            if (
                targetFamily
            ) {
                filter[
                    "identity.targetFamily"
                ] =
                    targetFamily;
            }

            if (
                targetMetric
            ) {
                filter[
                    "identity.targetMetric"
                ] =
                    targetMetric;
            }

            if (
                modelFamily
            ) {
                filter[
                    "identity.modelFamily"
                ] =
                    modelFamily;
            }

            if (
                outputType
            ) {
                filter[
                    "identity.outputType"
                ] =
                    outputType;
            }

            const skip =
                (
                    safePage -
                    1
                ) *
                safeLimit;

            let query =
                ForecastRecordModel.find(
                    filter
                );

            query =
                applySortLimit(
                    query,
                    {
                        sort:
                            {
                                "identity.forecastOrigin":
                                    -1,
                            },

                        skip,

                        limit:
                            safeLimit,
                    }
                );

            const records =
                await queryToPlain(
                    query
                );

            return {
                phase:
                    FORECASTING_API_PHASE,

                filter,

                pagination:
                    {
                        page:
                            safePage,

                        limit:
                            safeLimit,

                        skip,
                    },

                records:
                    Array.isArray(
                        records
                    )
                        ? records
                        : [],
            };
        },


        async getForecastById({
            id,
        } = {}) {
            if (
                !id
            ) {
                throw new Error(
                    "FORECAST_ID_REQUIRED"
                );
            }

            const record =
                await queryToPlain(
                    ForecastRecordModel.findById(
                        id
                    )
                );

            return record ??
                null;
        },


        async getForecastByPersistenceKey({
            persistenceKey,
        } = {}) {
            if (
                !persistenceKey
            ) {
                throw new Error(
                    "PERSISTENCE_KEY_REQUIRED"
                );
            }

            const record =
                await queryToPlain(
                    ForecastRecordModel.findOne(
                        {
                            persistenceKey,
                        }
                    )
                );

            return record ??
                null;
        },


        async listSiteForecasts({
            vrmSiteId,
            page = 1,
            limit = 50,
        } = {}) {
            if (
                vrmSiteId ===
                    undefined ||
                vrmSiteId ===
                    null ||
                String(
                    vrmSiteId
                ).trim() ===
                    ""
            ) {
                throw new Error(
                    "VRM_SITE_ID_REQUIRED"
                );
            }

            return this.listForecasts({
                vrmSiteId:
                    String(
                        vrmSiteId
                    ),

                page,

                limit,
            });
        },


        async getLatestSiteTargetForecast({
            vrmSiteId,
            targetFamily,
            targetMetric,
        } = {}) {
            if (
                vrmSiteId ===
                    undefined ||
                vrmSiteId ===
                    null ||
                String(
                    vrmSiteId
                ).trim() ===
                    ""
            ) {
                throw new Error(
                    "VRM_SITE_ID_REQUIRED"
                );
            }

            if (
                !targetFamily
            ) {
                throw new Error(
                    "TARGET_FAMILY_REQUIRED"
                );
            }

            if (
                !targetMetric
            ) {
                throw new Error(
                    "TARGET_METRIC_REQUIRED"
                );
            }

            let query =
                ForecastRecordModel.findOne(
                    {
                        "identity.vrmSiteId":
                            String(
                                vrmSiteId
                            ),

                        "identity.targetFamily":
                            targetFamily,

                        "identity.targetMetric":
                            targetMetric,
                    }
                );

            if (
                query &&
                typeof query.sort ===
                    "function"
            ) {
                query =
                    query.sort(
                        {
                            "identity.forecastOrigin":
                                -1,
                        }
                    );
            }

            const record =
                await queryToPlain(
                    query
                );

            return record ??
                null;
        },
    });
}


export default Object.freeze({
    FORECASTING_API_PHASE,
    FORECASTING_API_VERSION,
    FORECASTING_API_BASE_PATH,
    FORECASTING_API_BOUNDARIES,
    createForecastingApiService,
});
