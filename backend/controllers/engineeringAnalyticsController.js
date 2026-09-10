// controllers/engineeringAnalyticsController.js

import {
    getEngineeringApiHealth,
    getFleetEngineeringApiView,
    getEngineeringFamiliesApiView,
    getEngineeringFamilyApiView,
    getEngineeringSitesApiView,
    getEngineeringSiteApiView,
    getEngineeringSiteFamilyApiView,
} from "../services/engineering/engineeringAnalyticsApiService.js";


function sendError(
    res,
    error
) {
    const statusCode =
        Number.isInteger(
            error
                ?.statusCode
        )
            ? error.statusCode
            : 500;

    return res
        .status(
            statusCode
        )
        .json({
            success:
                false,

            phase:
                "8.9",

            error: {
                code:
                    error
                        ?.code ??
                    "ENGINEERING_ANALYTICS_API_ERROR",

                message:
                    error
                        ?.message ??
                    "Engineering Analytics API request failed.",
            },
        });
}


export function createEngineeringAnalyticsController({
    aggregateProvider,
} = {}) {
    if (
        typeof aggregateProvider !==
        "function"
    ) {
        throw new Error(
            "Engineering Analytics aggregateProvider must be a function."
        );
    }

    async function loadAggregate(
        req
    ) {
        return aggregateProvider({
            req,

            query:
                req
                    ?.query ??
                {},

            params:
                req
                    ?.params ??
                {},
        });
    }


    return Object.freeze({
        health:
            async (
                req,
                res
            ) => {
                try {
                    const aggregate =
                        await loadAggregate(
                            req
                        );

                    return res
                        .status(
                            200
                        )
                        .json(
                            getEngineeringApiHealth(
                                aggregate
                            )
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

        fleet:
            async (
                req,
                res
            ) => {
                try {
                    const aggregate =
                        await loadAggregate(
                            req
                        );

                    return res
                        .status(
                            200
                        )
                        .json(
                            getFleetEngineeringApiView(
                                aggregate
                            )
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

        families:
            async (
                req,
                res
            ) => {
                try {
                    const aggregate =
                        await loadAggregate(
                            req
                        );

                    return res
                        .status(
                            200
                        )
                        .json(
                            getEngineeringFamiliesApiView(
                                aggregate
                            )
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

        family:
            async (
                req,
                res
            ) => {
                try {
                    const aggregate =
                        await loadAggregate(
                            req
                        );

                    return res
                        .status(
                            200
                        )
                        .json(
                            getEngineeringFamilyApiView(
                                aggregate,
                                req
                                    ?.params
                                    ?.family
                            )
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

        sites:
            async (
                req,
                res
            ) => {
                try {
                    const aggregate =
                        await loadAggregate(
                            req
                        );

                    return res
                        .status(
                            200
                        )
                        .json(
                            getEngineeringSitesApiView(
                                aggregate
                            )
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

        site:
            async (
                req,
                res
            ) => {
                try {
                    const aggregate =
                        await loadAggregate(
                            req
                        );

                    return res
                        .status(
                            200
                        )
                        .json(
                            getEngineeringSiteApiView(
                                aggregate,
                                req
                                    ?.params
                                    ?.vrmSiteId
                            )
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

        siteFamily:
            async (
                req,
                res
            ) => {
                try {
                    const aggregate =
                        await loadAggregate(
                            req
                        );

                    return res
                        .status(
                            200
                        )
                        .json(
                            getEngineeringSiteFamilyApiView(
                                aggregate,
                                req
                                    ?.params
                                    ?.vrmSiteId,
                                req
                                    ?.params
                                    ?.family
                            )
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


export default Object.freeze({
    createEngineeringAnalyticsController,
});
