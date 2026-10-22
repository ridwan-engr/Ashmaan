import {
    ENGINEERING_ANALYTICS_SCOPE_STATUS,
    getEngineeringAnalyticsInstallationScope,
} from "../security/engineeringAnalyticsScopeService.js";

import {
    aggregateFleetEngineering,
} from "./fleetEngineeringAggregationService.js";


export const PRODUCTION_ENGINEERING_PROVIDER_STATUS =
    Object.freeze({
        RESOLVED: "RESOLVED",
        DENY: "DENY",
        UNAVAILABLE: "UNAVAILABLE",
    });


export const PRODUCTION_ENGINEERING_FAMILY_KEYS =
    Object.freeze([
        "siteElectrical",
        "energySource",
        "battery",
        "generator",
        "grid",
        "solar",
    ]);


/*
|--------------------------------------------------------------------------
| Production site concurrency
|--------------------------------------------------------------------------
|
| Each site-family loader already executes the six Engineering Analytics
| producers concurrently.
|
| Keep site-level concurrency bounded so the provider does not launch all
| authorized sites simultaneously and overload MongoDB.
|
*/

const PRODUCTION_ENGINEERING_SITE_CONCURRENCY =
    4;


function createProviderError(
    message,
    {
        statusCode = 503,
        code =
            "ENGINEERING_AGGREGATE_PROVIDER_UNAVAILABLE",
    } = {}
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


function normalizeFamilies(
    families
) {
    if (
        families === null ||
        typeof families !== "object" ||
        Array.isArray(families)
    ) {
        throw createProviderError(
            "Engineering site family result is invalid."
        );
    }


    const normalized =
        {};


    for (
        const family
        of PRODUCTION_ENGINEERING_FAMILY_KEYS
    ) {
        const result =
            Object.prototype.hasOwnProperty.call(
                families,
                family
            )
                ? families[family]
                : null;


        /*
        |--------------------------------------------------------------------------
        | Phase 8.8 contract
        |--------------------------------------------------------------------------
        |
        | A family is either:
        |
        | - a validated upstream result object, or
        | - null.
        |
        | Never convert missing to zero.
        | Never manufacture UNAVAILABLE.
        |
        */

        if (
            result !== null &&
            (
                typeof result !== "object" ||
                Array.isArray(result)
            )
        ) {
            throw createProviderError(
                `Invalid Engineering family result: ${family}`
            );
        }


        normalized[family] =
            result;
    }


    return Object.freeze(
        normalized
    );
}


export function createEmptyEngineeringFamilies() {
    return Object.freeze({
        siteElectrical: null,
        energySource: null,
        battery: null,
        generator: null,
        grid: null,
        solar: null,
    });
}


export async function loadEmptyEngineeringSiteFamilies() {
    /*
    |--------------------------------------------------------------------------
    | Explicit empty family loader
    |--------------------------------------------------------------------------
    |
    | This is NOT a production analytics implementation.
    |
    | It exists only as a safe injectable boundary for validation and for
    | explicit callers that intentionally require no upstream family results.
    |
    | It MUST NOT be silently used by the production HTTP composition.
    |
    */

    return createEmptyEngineeringFamilies();
}


export async function createProductionEngineeringAggregate({
    userId,
    reportingWindow,

    resolveEngineeringScope =
        getEngineeringAnalyticsInstallationScope,

    siteFamilyLoader,

    fleetAggregator =
        aggregateFleetEngineering,
} = {}) {
    if (
        typeof siteFamilyLoader !==
        "function"
    ) {
        throw createProviderError(
            "Production Engineering site-family loader is required."
        );
    }


    let scope;

    try {
        scope =
            await resolveEngineeringScope({
                userId,
            });
    }
    catch {
        throw createProviderError(
            "Engineering authorization scope is unavailable."
        );
    }


    if (
        scope?.status ===
        ENGINEERING_ANALYTICS_SCOPE_STATUS.DENY
    ) {
        throw createProviderError(
            "Engineering resource access denied.",
            {
                statusCode:
                    403,

                code:
                    "ENGINEERING_RESOURCE_ACCESS_DENIED",
            }
        );
    }


    if (
        scope?.status !==
            ENGINEERING_ANALYTICS_SCOPE_STATUS.RESOLVED ||
        scope?.allowed !==
            true ||
        !Array.isArray(
            scope.installations
        )
    ) {
        throw createProviderError(
            "Engineering authorization scope is unavailable."
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Empty authorization scope
    |--------------------------------------------------------------------------
    |
    | Empty means empty, never unrestricted.
    |
    | No family loader is called.
    | Phase 8.8 owns EMPTY_FLEET semantics.
    |
    */

    if (
        scope.installations.length ===
        0
    ) {
        return fleetAggregator({
            sites: [],
            reportingWindow,
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Authorized site-family loader
    |--------------------------------------------------------------------------
    |
    | Load exactly one authorized installation.
    |
    | Authorization scope has already been resolved above. This function does
    | not discover or expand that scope.
    |
    */

    async function loadAuthorizedSite(
        scopedInstallation
    ) {
        const installation =
            scopedInstallation?.installation;

        const installationId =
            scopedInstallation?.installationId;

        const vrmSiteId =
            scopedInstallation?.vrmSiteId;


        if (
            installation === null ||
            typeof installation !== "object" ||
            Array.isArray(installation) ||
            typeof installationId !== "string" ||
            installationId.trim() === "" ||
            typeof vrmSiteId !== "string" ||
            vrmSiteId.trim() === ""
        ) {
            throw createProviderError(
                "Authorized Engineering installation scope is invalid."
            );
        }


        let families;

        try {
            families =
                await siteFamilyLoader({
                    installation,
                    installationId,
                    vrmSiteId,
                    reportingWindow,
                });
        }
        catch (error) {
            /*
            |--------------------------------------------------------------------------
            | Preserve controlled upstream errors
            |--------------------------------------------------------------------------
            */

            if (
                error?.statusCode &&
                error?.code
            ) {
                throw error;
            }


            throw createProviderError(
                "Engineering site-family production failed."
            );
        }


        return {
            installation,

            families:
                normalizeFamilies(
                    families
                ),
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Bounded site concurrency
    |--------------------------------------------------------------------------
    |
    | Previous implementation processed all authorized installations
    | sequentially:
    |
    |     site 1 -> site 2 -> site 3 -> ... -> site N
    |
    | Each site-family loader already runs six persisted-data producers in
    | parallel. Running every authorized site simultaneously would therefore
    | create excessive database concurrency.
    |
    | Use a small worker pool instead.
    |
    | Results are written into their original scope indexes so fleet
    | aggregation receives the same deterministic site ordering as before.
    |
    */

    const sites =
        new Array(
            scope.installations.length
        );


    let nextIndex =
        0;


    async function worker() {
        while (true) {
            const index =
                nextIndex++;


            if (
                index >=
                scope.installations.length
            ) {
                return;
            }


            sites[index] =
                await loadAuthorizedSite(
                    scope.installations[
                        index
                    ]
                );
        }
    }


    const workerCount =
        Math.min(
            PRODUCTION_ENGINEERING_SITE_CONCURRENCY,
            scope.installations.length
        );


    await Promise.all(
        Array.from(
            {
                length:
                    workerCount,
            },
            () =>
                worker()
        )
    );


    /*
    |--------------------------------------------------------------------------
    | Fleet aggregation
    |--------------------------------------------------------------------------
    |
    | Preserve the existing Phase 8.8 aggregation boundary.
    |
    */

    return fleetAggregator({
        sites,
        reportingWindow,
    });
}


export default Object.freeze({
    PRODUCTION_ENGINEERING_PROVIDER_STATUS,
    PRODUCTION_ENGINEERING_FAMILY_KEYS,

    createEmptyEngineeringFamilies,
    loadEmptyEngineeringSiteFamilies,
    createProductionEngineeringAggregate,
});
