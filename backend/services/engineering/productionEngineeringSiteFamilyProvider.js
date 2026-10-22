import {
    ENGINEERING_ANALYTICS_SCOPE_STATUS,
    getEngineeringAnalyticsInstallationScope,
} from "../security/engineeringAnalyticsScopeService.js";

import {
    loadProductionEngineeringSiteFamily,
} from "./productionEngineeringSiteFamilyLoader.js";


export const PRODUCTION_ENGINEERING_SITE_FAMILY_PROVIDER_PHASE =
    "P.1H-G2-E3-C";


const SUPPORTED_FAMILIES =
    Object.freeze([
        "siteElectrical",
        "energySource",
        "battery",
        "generator",
        "grid",
        "solar",
    ]);


function createProviderError(
    message,
    {
        statusCode = 503,
        code =
            "ENGINEERING_SITE_FAMILY_PROVIDER_UNAVAILABLE",
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


function normalizeRequiredString(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalized =
        String(
            value
        ).trim();

    return normalized === ""
        ? null
        : normalized;
}


export async function createProductionEngineeringSiteFamily({
    userId,
    vrmSiteId,
    family,
    reportingWindow,

    resolveEngineeringScope =
        getEngineeringAnalyticsInstallationScope,

    siteFamilyLoader =
        loadProductionEngineeringSiteFamily,
} = {}) {
    const normalizedSiteId =
        normalizeRequiredString(
            vrmSiteId
        );

    if (
        !normalizedSiteId
    ) {
        throw createProviderError(
            "VRM site ID is required.",
            {
                statusCode: 400,
                code:
                    "VRM_SITE_ID_REQUIRED",
            }
        );
    }


    const normalizedFamily =
        normalizeRequiredString(
            family
        );

    if (
        !normalizedFamily ||
        !SUPPORTED_FAMILIES.includes(
            normalizedFamily
        )
    ) {
        throw createProviderError(
            `Unsupported engineering family: ${family}`,
            {
                statusCode: 400,
                code:
                    "UNSUPPORTED_ENGINEERING_FAMILY",
            }
        );
    }


    if (
        typeof siteFamilyLoader !==
        "function"
    ) {
        throw new TypeError(
            "Production Engineering targeted site-family loader must be a function."
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
                statusCode: 403,
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
    | Resolve requested site INSIDE authorized scope
    |--------------------------------------------------------------------------
    |
    | Never query an arbitrary installation supplied by the request.
    |--------------------------------------------------------------------------
    */

    const scopedInstallation =
        scope.installations.find(
            (
                candidate
            ) =>
                String(
                    candidate
                        ?.vrmSiteId ??
                    ""
                ) ===
                normalizedSiteId
        );


    if (
        !scopedInstallation
    ) {
        /*
        |--------------------------------------------------------------------------
        | Non-disclosing authorization boundary
        |--------------------------------------------------------------------------
        |
        | A site outside the user's resolved scope is not exposed.
        |--------------------------------------------------------------------------
        */

        throw createProviderError(
            `Engineering site not found: ${normalizedSiteId}`,
            {
                statusCode: 404,
                code:
                    "ENGINEERING_SITE_NOT_FOUND",
            }
        );
    }


    const installation =
        scopedInstallation
            ?.installation;

    const installationId =
        normalizeRequiredString(
            scopedInstallation
                ?.installationId
        );

    const authorizedVrmSiteId =
        normalizeRequiredString(
            scopedInstallation
                ?.vrmSiteId
        );


    if (
        installation === null ||
        typeof installation !==
            "object" ||
        Array.isArray(
            installation
        ) ||
        !installationId ||
        !authorizedVrmSiteId
    ) {
        throw createProviderError(
            "Authorized Engineering installation scope is invalid."
        );
    }


    let result;

    try {
        result =
            await siteFamilyLoader({
                family:
                    normalizedFamily,

                installation,

                installationId,

                vrmSiteId:
                    authorizedVrmSiteId,

                reportingWindow,
            });
    }
    catch (
        error
    ) {
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


    return Object.freeze({
        installation,

        installationId,

        vrmSiteId:
            authorizedVrmSiteId,

        family:
            normalizedFamily,

        result:
            result ?? null,

        reportingWindow,
    });
}


export default Object.freeze({
    PRODUCTION_ENGINEERING_SITE_FAMILY_PROVIDER_PHASE,
    createProductionEngineeringSiteFamily,
});