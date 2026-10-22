// controllers/engineeringAnalyticsController.js

import {
    getEngineeringApiHealth,
    getFleetEngineeringApiView,
    getEngineeringFamiliesApiView,
    getEngineeringFamilyApiView,
    getEngineeringSitesApiView,
    getEngineeringSiteApiView,
    getTargetedEngineeringSiteFamilyApiView,
} from "../services/engineering/engineeringAnalyticsApiService.js";


function sendError(
    res,
    error
) {
    const statusCode =
        Number.isInteger(
            error?.statusCode
        )
            ? error.statusCode
            : 500;

    return res
        .status(statusCode)
        .json({
            success: false,

            phase: "8.9",

            error: {
                code:
                    error?.code ??
                    "ENGINEERING_ANALYTICS_API_ERROR",

                message:
                    error?.message ??
                    "Engineering Analytics API request failed.",
            },
        });
}


export function createEngineeringAnalyticsController({
    aggregateProvider,
    siteFamilyProvider,
} = {}) {
    /*
    |--------------------------------------------------------------------------
    | Provider contracts
    |--------------------------------------------------------------------------
    */

    if (
        typeof aggregateProvider !==
        "function"
    ) {
        throw new Error(
            "Engineering Analytics aggregateProvider must be a function."
        );
    }


    if (
        typeof siteFamilyProvider !==
        "function"
    ) {
        throw new Error(
            "Engineering Analytics siteFamilyProvider must be a function."
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Fleet aggregate loader
    |--------------------------------------------------------------------------
    |
    | Used by endpoints that genuinely require the Phase 8.8 fleet aggregate.
    |--------------------------------------------------------------------------
    */

    async function loadAggregate(
        req
    ) {
        return aggregateProvider({
            req,

            query:
                req?.query ??
                {},

            params:
                req?.params ??
                {},
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Targeted site-family loader
    |--------------------------------------------------------------------------
    |
    | This path MUST NOT invoke the full fleet aggregate.
    |
    | Authorization and reporting-window validation are performed by the
    | targeted production HTTP/provider composition.
    |--------------------------------------------------------------------------
    */

    async function loadSiteFamily(
        req
    ) {
        return siteFamilyProvider({
            req,

            query:
                req?.query ??
                {},

            params:
                req?.params ??
                {},
        });
    }


    return Object.freeze({
        /*
        |--------------------------------------------------------------------------
        | Health
        |--------------------------------------------------------------------------
        */

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
                        .status(200)
                        .json(
                            getEngineeringApiHealth(
                                aggregate
                            )
                        );
                }
                catch (error) {
                    return sendError(
                        res,
                        error
                    );
                }
            },


        /*
        |--------------------------------------------------------------------------
        | Fleet
        |--------------------------------------------------------------------------
        */

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
                        .status(200)
                        .json(
                            getFleetEngineeringApiView(
                                aggregate
                            )
                        );
                }
                catch (error) {
                    return sendError(
                        res,
                        error
                    );
                }
            },


        /*
        |--------------------------------------------------------------------------
        | Families
        |--------------------------------------------------------------------------
        */

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
                        .status(200)
                        .json(
                            getEngineeringFamiliesApiView(
                                aggregate
                            )
                        );
                }
                catch (error) {
                    return sendError(
                        res,
                        error
                    );
                }
            },


        /*
        |--------------------------------------------------------------------------
        | Fleet family
        |--------------------------------------------------------------------------
        */

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
                        .status(200)
                        .json(
                            getEngineeringFamilyApiView(
                                aggregate,
                                req?.params?.family
                            )
                        );
                }
                catch (error) {
                    return sendError(
                        res,
                        error
                    );
                }
            },


        /*
        |--------------------------------------------------------------------------
        | Sites
        |--------------------------------------------------------------------------
        */

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
                        .status(200)
                        .json(
                            getEngineeringSitesApiView(
                                aggregate
                            )
                        );
                }
                catch (error) {
                    return sendError(
                        res,
                        error
                    );
                }
            },


        /*
        |--------------------------------------------------------------------------
        | Site
        |--------------------------------------------------------------------------
        */

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
                        .status(200)
                        .json(
                            getEngineeringSiteApiView(
                                aggregate,
                                req?.params?.vrmSiteId
                            )
                        );
                }
                catch (error) {
                    return sendError(
                        res,
                        error
                    );
                }
            },


        /*
        |--------------------------------------------------------------------------
        | Targeted site-family
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        |
        | This endpoint intentionally bypasses loadAggregate().
        |
        | Old execution:
        |
        |   authorized fleet
        |       -> every site
        |       -> all six families
        |       -> fleet aggregation
        |       -> extract requested site/family
        |
        | Correct execution:
        |
        |   authorized scope
        |       -> requested site
        |       -> requested family
        |       -> API envelope
        |--------------------------------------------------------------------------
        */

        siteFamily:
            async (
                req,
                res
            ) => {
                try {
                    const targeted =
                        await loadSiteFamily(
                            req
                        );

                    return res
                        .status(200)
                        .json(
                            getTargetedEngineeringSiteFamilyApiView(
                                targeted
                            )
                        );
                }
                catch (error) {
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
