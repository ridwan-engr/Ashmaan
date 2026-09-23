import {
    buildEngineeringReportingWindow,
} from "./engineeringAnalyticsContract.js";

import {
    createProductionEngineeringAggregate,
} from "./productionEngineeringAggregateProvider.js";

import {
    loadProductionEngineeringSiteFamilies,
} from "./productionEngineeringSiteFamilyLoader.js";


export const PRODUCTION_ENGINEERING_HTTP_PROVIDER_PHASE =
    "P.1H-G2-E3-B2";


function createHttpProviderError(
    message,
    statusCode,
    code
) {
    const error =
        new Error(
            message
        );

    error.statusCode =
        statusCode;

    error.code =
        code;

    return error;
}


function requireAuthenticatedUserId(
    req
) {
    const userId =
        req
            ?.auth
            ?.userId;

    if (
        userId ===
            null ||
        userId ===
            undefined ||
        String(
            userId
        ).trim() ===
            ""
    ) {
        throw createHttpProviderError(
            "Authenticated portal user is required for Engineering Analytics.",
            401,
            "ENGINEERING_AUTHENTICATED_USER_REQUIRED"
        );
    }

    return userId;
}


export function buildProductionEngineeringHttpReportingWindow(
    query = {}
) {
    if (
        !query ||
        typeof query !==
            "object" ||
        Array.isArray(
            query
        )
    ) {
        throw createHttpProviderError(
            "Engineering Analytics query must be an object.",
            400,
            "ENGINEERING_QUERY_INVALID"
        );
    }


    let reportingWindow;

    try {
        reportingWindow =
            buildEngineeringReportingWindow({
                start:
                    query.start,

                end:
                    query.end,
            });
    }
    catch (error) {
        throw createHttpProviderError(
            error?.message ??
                "Invalid Engineering Analytics reporting window.",
            400,
            "ENGINEERING_REPORTING_WINDOW_INVALID"
        );
    }


    if (
        !reportingWindow
            ?.start ||
        !reportingWindow
            ?.end
    ) {
        throw createHttpProviderError(
            "Engineering Analytics requires explicit start and end timestamps.",
            400,
            "ENGINEERING_REPORTING_WINDOW_REQUIRED"
        );
    }


    if (
        reportingWindow
            .semantics !==
        "[start,end)"
    ) {
        throw createHttpProviderError(
            "Engineering Analytics reporting-window semantics are invalid.",
            400,
            "ENGINEERING_REPORTING_WINDOW_INVALID"
        );
    }


    return reportingWindow;
}


export function createProductionEngineeringHttpProvider({
    aggregateProvider =
        createProductionEngineeringAggregate,

    siteFamilyLoader =
        loadProductionEngineeringSiteFamilies,
} = {}) {
    if (
        typeof aggregateProvider !==
            "function"
    ) {
        throw new TypeError(
            "Production Engineering aggregateProvider must be a function."
        );
    }


    if (
        typeof siteFamilyLoader !==
            "function"
    ) {
        throw new TypeError(
            "Production Engineering siteFamilyLoader must be a function."
        );
    }


    return async function productionEngineeringHttpProvider({
        req,
        query = {},
    } = {}) {
        const userId =
            requireAuthenticatedUserId(
                req
            );


        const reportingWindow =
            buildProductionEngineeringHttpReportingWindow(
                query
            );


        return aggregateProvider({
            userId,

            reportingWindow,

            siteFamilyLoader,
        });
    };
}


export default Object.freeze({
    PRODUCTION_ENGINEERING_HTTP_PROVIDER_PHASE,
    buildProductionEngineeringHttpReportingWindow,
    createProductionEngineeringHttpProvider,
});
