// services/security/financialBiCollectionScopeService.js

import mongoose from "mongoose";

import {
    getUserInstallationScope,
    USER_INSTALLATION_SCOPE_STATUS,
} from "./userInstallationScopeService.js";

import {
    getEntitledVrmSiteIds,
} from "./vrmInstallationCollectionScopeService.js";

/*
|--------------------------------------------------------------------------
| P.1H-G4-D2
| Financial/BI Collection Scope Service
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Resolve the authenticated user's Financial/BI collection scope before
| any Financial/BI repository query executes.
|
| Proven authorization chain:
|
|   user
|     -> UserInstallationAccess
|     -> authorized Installation IDs
|     -> VRM Installations
|     -> authorized vrmSiteIds
|
| Collection semantics:
|
|   no explicit scope
|       -> authorized SITE collection only
|
|   SITE + vrmSiteId
|       -> allow only when vrmSiteId is in authorized site scope
|
|   FLEET
|       -> fail closed because G4-B2 found no authoritative fleet ACL
|
| IMPORTANT
|
| An empty authorized site set MUST NOT become an unrestricted query.
|
|--------------------------------------------------------------------------
*/

export const FINANCIAL_BI_COLLECTION_SCOPE_STATUS =
    Object.freeze({
        RESOLVED:
            "RESOLVED",

        EMPTY:
            "EMPTY",

        FORBIDDEN:
            "FORBIDDEN",

        UNAVAILABLE:
            "UNAVAILABLE",
    });

export const FINANCIAL_BI_COLLECTION_SCOPE_REASON =
    Object.freeze({
        AUTHORIZED_SITE_COLLECTION:
            "AUTHORIZED_SITE_COLLECTION",

        AUTHORIZED_EXPLICIT_SITE:
            "AUTHORIZED_EXPLICIT_SITE",

        NO_AUTHORIZED_SITES:
            "NO_AUTHORIZED_SITES",

        SITE_NOT_AUTHORIZED:
            "SITE_NOT_AUTHORIZED",

        SITE_IDENTITY_REQUIRED:
            "SITE_IDENTITY_REQUIRED",

        FLEET_AUTHORIZATION_UNAVAILABLE:
            "FLEET_AUTHORIZATION_UNAVAILABLE",

        USER_ID_INVALID:
            "USER_ID_INVALID",

        USER_SCOPE_DENIED:
            "USER_SCOPE_DENIED",

        USER_SCOPE_UNAVAILABLE:
            "USER_SCOPE_UNAVAILABLE",

        SITE_SCOPE_RESOLUTION_FAILED:
            "SITE_SCOPE_RESOLUTION_FAILED",

        SCOPE_UNSUPPORTED:
            "SCOPE_UNSUPPORTED",
    });

function normalizeString(value) {
    if (
        typeof value !==
        "string"
    ) {
        return null;
    }

    const normalized =
        value.trim();

    return normalized.length > 0
        ? normalized
        : null;
}

function normalizeUserId(value) {
    const normalized =
        normalizeString(
            value === null ||
            value === undefined
                ? null
                : String(value)
        );

    if (
        !normalized ||
        !mongoose.Types.ObjectId
            .isValid(normalized)
    ) {
        return null;
    }

    return normalized;
}

function normalizeVrmSiteIds(
    values
) {
    if (
        !Array.isArray(values)
    ) {
        return Object.freeze([]);
    }

    const normalized =
        values
            .map(
                (value) =>
                    normalizeString(
                        value === null ||
                        value === undefined
                            ? null
                            : String(value)
                    )
            )
            .filter(Boolean);

    return Object.freeze([
        ...new Set(normalized),
    ]);
}

function buildResult({
    status,
    reason,
    userId = null,
    requestedScope = null,
    requestedVrmSiteId = null,
    authorizedVrmSiteIds = [],
}) {
    const siteIds =
        normalizeVrmSiteIds(
            authorizedVrmSiteIds
        );

    return Object.freeze({
        status,

        reason,

        authorized:
            status ===
            FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                .RESOLVED,

        userId,

        requestedScope,

        requestedVrmSiteId,

        repositoryScope:
            status ===
                FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                    .RESOLVED
                ? "SITE"
                : null,

        authorizedVrmSiteIds:
            siteIds,

        count:
            siteIds.length,
    });
}

function forbidden({
    reason,
    userId = null,
    requestedScope = null,
    requestedVrmSiteId = null,
}) {
    return buildResult({
        status:
            FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                .FORBIDDEN,

        reason,

        userId,

        requestedScope,

        requestedVrmSiteId,
    });
}

function unavailable({
    reason,
    userId = null,
    requestedScope = null,
    requestedVrmSiteId = null,
}) {
    return buildResult({
        status:
            FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                .UNAVAILABLE,

        reason,

        userId,

        requestedScope,

        requestedVrmSiteId,
    });
}

function empty({
    userId,
    requestedScope = null,
}) {
    return buildResult({
        status:
            FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                .EMPTY,

        reason:
            FINANCIAL_BI_COLLECTION_SCOPE_REASON
                .NO_AUTHORIZED_SITES,

        userId,

        requestedScope,

        authorizedVrmSiteIds: [],
    });
}

/*
|--------------------------------------------------------------------------
| Public collection-scope resolver
|--------------------------------------------------------------------------
*/

export async function resolveFinancialBiCollectionScope({
    userId,

    requestedScope = null,

    requestedVrmSiteId = null,

    getUserScope =
        getUserInstallationScope,

    getVrmSiteIds =
        getEntitledVrmSiteIds,
} = {}) {
    const normalizedUserId =
        normalizeUserId(
            userId
        );

    const normalizedScope =
        normalizeString(
            requestedScope
        )?.toUpperCase() ??
        null;

    const normalizedRequestedVrmSiteId =
        normalizeString(
            requestedVrmSiteId
        );

    /*
    |--------------------------------------------------------------------------
    | Validate authenticated user identity
    |--------------------------------------------------------------------------
    */

    if (!normalizedUserId) {
        return forbidden({
            reason:
                FINANCIAL_BI_COLLECTION_SCOPE_REASON
                    .USER_ID_INVALID,

            requestedScope:
                normalizedScope,

            requestedVrmSiteId:
                normalizedRequestedVrmSiteId,
        });
    }

    /*
    |--------------------------------------------------------------------------
    | FLEET must fail before entitlement/repository work
    |--------------------------------------------------------------------------
    */

    if (
        normalizedScope ===
        "FLEET"
    ) {
        return unavailable({
            reason:
                FINANCIAL_BI_COLLECTION_SCOPE_REASON
                    .FLEET_AUTHORIZATION_UNAVAILABLE,

            userId:
                normalizedUserId,

            requestedScope:
                "FLEET",
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Only collection SITE semantics are currently authorized
    |--------------------------------------------------------------------------
    */

    if (
        normalizedScope !== null &&
        normalizedScope !== "SITE"
    ) {
        return forbidden({
            reason:
                FINANCIAL_BI_COLLECTION_SCOPE_REASON
                    .SCOPE_UNSUPPORTED,

            userId:
                normalizedUserId,

            requestedScope:
                normalizedScope,

            requestedVrmSiteId:
                normalizedRequestedVrmSiteId,
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Explicit SITE requires an identity
    |--------------------------------------------------------------------------
    */

    if (
        normalizedScope === "SITE" &&
        !normalizedRequestedVrmSiteId
    ) {
        return forbidden({
            reason:
                FINANCIAL_BI_COLLECTION_SCOPE_REASON
                    .SITE_IDENTITY_REQUIRED,

            userId:
                normalizedUserId,

            requestedScope:
                "SITE",
        });
    }

    let userScope;

    try {
        userScope =
            await getUserScope({
                userId:
                    normalizedUserId,
            });
    } catch {
        return unavailable({
            reason:
                FINANCIAL_BI_COLLECTION_SCOPE_REASON
                    .USER_SCOPE_UNAVAILABLE,

            userId:
                normalizedUserId,

            requestedScope:
                normalizedScope,

            requestedVrmSiteId:
                normalizedRequestedVrmSiteId,
        });
    }

    /*
    |--------------------------------------------------------------------------
    | UserInstallationAccess scope must itself be resolved
    |--------------------------------------------------------------------------
    */

    if (
        userScope?.status ===
        USER_INSTALLATION_SCOPE_STATUS
            .UNAVAILABLE
    ) {
        return unavailable({
            reason:
                FINANCIAL_BI_COLLECTION_SCOPE_REASON
                    .USER_SCOPE_UNAVAILABLE,

            userId:
                normalizedUserId,

            requestedScope:
                normalizedScope,

            requestedVrmSiteId:
                normalizedRequestedVrmSiteId,
        });
    }

    if (
        userScope?.status !==
        USER_INSTALLATION_SCOPE_STATUS
            .RESOLVED
    ) {
        return forbidden({
            reason:
                FINANCIAL_BI_COLLECTION_SCOPE_REASON
                    .USER_SCOPE_DENIED,

            userId:
                normalizedUserId,

            requestedScope:
                normalizedScope,

            requestedVrmSiteId:
                normalizedRequestedVrmSiteId,
        });
    }

    const installationIds =
        Array.isArray(
            userScope.installationIds
        )
            ? userScope.installationIds
            : [];

    /*
    |--------------------------------------------------------------------------
    | Empty installation entitlement must terminate here.
    |--------------------------------------------------------------------------
    |
    | This is security-sensitive:
    |
    | [] MUST NOT become an omitted repository filter.
    |
    |--------------------------------------------------------------------------
    */

    if (
        installationIds.length === 0
    ) {
        return empty({
            userId:
                normalizedUserId,

            requestedScope:
                normalizedScope,
        });
    }

    let authorizedVrmSiteIds;

    try {
        authorizedVrmSiteIds =
            await getVrmSiteIds({
                installationIds,
            });
    } catch {
        return unavailable({
            reason:
                FINANCIAL_BI_COLLECTION_SCOPE_REASON
                    .SITE_SCOPE_RESOLUTION_FAILED,

            userId:
                normalizedUserId,

            requestedScope:
                normalizedScope,

            requestedVrmSiteId:
                normalizedRequestedVrmSiteId,
        });
    }

    const normalizedAuthorizedSiteIds =
        normalizeVrmSiteIds(
            authorizedVrmSiteIds
        );

    if (
        normalizedAuthorizedSiteIds
            .length === 0
    ) {
        return empty({
            userId:
                normalizedUserId,

            requestedScope:
                normalizedScope,
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Explicit SITE request
    |--------------------------------------------------------------------------
    */

    if (
        normalizedScope ===
        "SITE"
    ) {
        if (
            !normalizedAuthorizedSiteIds
                .includes(
                    normalizedRequestedVrmSiteId
                )
        ) {
            return forbidden({
                reason:
                    FINANCIAL_BI_COLLECTION_SCOPE_REASON
                        .SITE_NOT_AUTHORIZED,

                userId:
                    normalizedUserId,

                requestedScope:
                    "SITE",

                requestedVrmSiteId:
                    normalizedRequestedVrmSiteId,
            });
        }

        return buildResult({
            status:
                FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                    .RESOLVED,

            reason:
                FINANCIAL_BI_COLLECTION_SCOPE_REASON
                    .AUTHORIZED_EXPLICIT_SITE,

            userId:
                normalizedUserId,

            requestedScope:
                "SITE",

            requestedVrmSiteId:
                normalizedRequestedVrmSiteId,

            /*
             * Reduce repository scope to the exact requested
             * authorized site.
             */
            authorizedVrmSiteIds: [
                normalizedRequestedVrmSiteId,
            ],
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Unfiltered collection
    |--------------------------------------------------------------------------
    |
    | Even though the client did not request SITE explicitly, repository
    | execution must be SITE-only and restricted to this authorized set.
    |
    |--------------------------------------------------------------------------
    */

    return buildResult({
        status:
            FINANCIAL_BI_COLLECTION_SCOPE_STATUS
                .RESOLVED,

        reason:
            FINANCIAL_BI_COLLECTION_SCOPE_REASON
                .AUTHORIZED_SITE_COLLECTION,

        userId:
            normalizedUserId,

        requestedScope: null,

        requestedVrmSiteId: null,

        authorizedVrmSiteIds:
            normalizedAuthorizedSiteIds,
    });
}

export default
    resolveFinancialBiCollectionScope;