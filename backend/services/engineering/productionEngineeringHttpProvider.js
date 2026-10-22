import {
    buildEngineeringReportingWindow,
} from "./engineeringAnalyticsContract.js";

import {
    createProductionEngineeringAggregate,
} from "./productionEngineeringAggregateProvider.js";

import {
    loadProductionEngineeringSiteFamilies,
} from "./productionEngineeringSiteFamilyLoader.js";

import {
    createProductionEngineeringSiteFamily,
} from "./productionEngineeringSiteFamilyProvider.js";

export const PRODUCTION_ENGINEERING_HTTP_PROVIDER_PHASE =
    "P.1H-G2-E3-B2";


/*
|--------------------------------------------------------------------------
| In-flight aggregate deduplication
|--------------------------------------------------------------------------
|
| Multiple Engineering Analytics HTTP views can require the exact same
| production aggregate.
|
| Example:
|
|   GET /fleet
|   GET /sites
|
| If both requests belong to the same authenticated user and use the exact
| same reporting window, they must not independently execute the complete
| Engineering Analytics production pipeline.
|
| This map contains ONLY currently executing aggregates.
|
| It is not a persistent result cache.
| Completed and failed promises are removed immediately.
|
*/

const inFlightAggregates =
    new Map();


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

    return String(
        userId
    ).trim();
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


/*
|--------------------------------------------------------------------------
| Exact aggregate identity
|--------------------------------------------------------------------------
|
| Authorization identity:
|   authenticated portal user
|
| Analytics identity:
|   exact [start,end) reporting window
|
| Do not deduplicate across users or across different reporting windows.
|
*/

function buildInFlightAggregateKey({
    userId,
    reportingWindow,
}) {
    return JSON.stringify([
        String(
            userId
        ),

        String(
            reportingWindow.start
        ),

        String(
            reportingWindow.end
        ),

        String(
            reportingWindow.semantics
        ),
    ]);
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


        const aggregateKey =
            buildInFlightAggregateKey({
                userId,
                reportingWindow,
            });


        /*
        |--------------------------------------------------------------------------
        | Share identical active computation
        |--------------------------------------------------------------------------
        */

        const existingPromise =
            inFlightAggregates.get(
                aggregateKey
            );


        if (
            existingPromise
        ) {
            return existingPromise;
        }


        /*
        |--------------------------------------------------------------------------
        | Start one production aggregate
        |--------------------------------------------------------------------------
        */

        const aggregatePromise =
            Promise.resolve()
                .then(
                    () =>
                        aggregateProvider({
                            userId,

                            reportingWindow,

                            siteFamilyLoader,
                        })
                );


        inFlightAggregates.set(
            aggregateKey,
            aggregatePromise
        );


        try {
            return await aggregatePromise;
        }
        finally {
            /*
            |--------------------------------------------------------------------------
            | Delete only our own Promise
            |--------------------------------------------------------------------------
            |
            | The identity comparison prevents an older completion from deleting
            | a newer Promise should this key ever be reused.
            |
            */

            if (
                inFlightAggregates.get(
                    aggregateKey
                ) ===
                aggregatePromise
            ) {
                inFlightAggregates.delete(
                    aggregateKey
                );
            }
        }
    };
}

export function createProductionEngineeringSiteFamilyHttpProvider({
    siteFamilyProvider =
        createProductionEngineeringSiteFamily,
} = {}) {
    if (
        typeof siteFamilyProvider !==
        "function"
    ) {
        throw new TypeError(
            "Production Engineering targeted siteFamilyProvider must be a function."
        );
    }


    return async function productionEngineeringSiteFamilyHttpProvider({
        req,
        query = {},
        params = {},
    } = {}) {
        const userId =
            requireAuthenticatedUserId(
                req
            );


        const reportingWindow =
            buildProductionEngineeringHttpReportingWindow(
                query
            );


        return siteFamilyProvider({
            userId,

            vrmSiteId:
                params
                    ?.vrmSiteId,

            family:
                params
                    ?.family,

            reportingWindow,
        });
    };
}


export default Object.freeze({
    PRODUCTION_ENGINEERING_HTTP_PROVIDER_PHASE,
    buildProductionEngineeringHttpReportingWindow,
    createProductionEngineeringHttpProvider,
    createProductionEngineeringSiteFamilyHttpProvider,
});
