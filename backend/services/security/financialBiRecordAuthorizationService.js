import mongoose from "mongoose";

import Installation
    from "../../models/Installation.js";

import UserInstallationAccess
    from "../../models/UserInstallationAccess.js";

/*
|--------------------------------------------------------------------------
| P.1H-G4-C
| Financial/BI Record Authorization Service
|--------------------------------------------------------------------------
|
| PURPOSE
|
| Authorize Financial/BI resource identities against the authenticated
| user's proven installation entitlement.
|
| Proven security model:
|
|   user
|     -> UserInstallationAccess
|     -> Installation
|     -> vrmSiteId
|
| Financial/BI domain identities:
|
|   SITE  -> scopeIdentity.vrmSiteId
|   FLEET -> scopeIdentity.fleetId
|
| G4-B2 established that ASHMAAN currently has no authoritative:
|
|   user -> fleet
|   fleet -> Installation
|   UserInstallationAccess -> fleet
|
| Therefore:
|
|   SITE  -> installation-backed authorization
|   FLEET -> fail closed
|
| IMPORTANT
|
| fleetId existence is NOT authorization evidence.
| READ_FINANCIAL_BI is NOT fleet membership.
|
|--------------------------------------------------------------------------
*/

export const FINANCIAL_BI_AUTHORIZATION_STATUS =
    Object.freeze({
        AUTHORIZED:
            "AUTHORIZED",

        FORBIDDEN:
            "FORBIDDEN",

        UNAVAILABLE:
            "UNAVAILABLE",
    });

export const FINANCIAL_BI_AUTHORIZATION_REASON =
    Object.freeze({
        SITE_AUTHORIZED:
            "SITE_AUTHORIZED",

        SITE_NOT_AUTHORIZED:
            "SITE_NOT_AUTHORIZED",

        FLEET_AUTHORIZATION_UNAVAILABLE:
            "FLEET_AUTHORIZATION_UNAVAILABLE",

        USER_ID_INVALID:
            "USER_ID_INVALID",

        SITE_IDENTITY_INVALID:
            "SITE_IDENTITY_INVALID",

        FLEET_IDENTITY_INVALID:
            "FLEET_IDENTITY_INVALID",

        SCOPE_UNSUPPORTED:
            "SCOPE_UNSUPPORTED",

        AUTHORIZATION_LOOKUP_FAILED:
            "AUTHORIZATION_LOOKUP_FAILED",
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

function normalizeObjectId(value) {
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

function buildDecision({
    authorized,
    status,
    reason,
    scope = null,
    vrmSiteId = null,
    fleetId = null,
}) {
    return Object.freeze({
        authorized:
            authorized === true,

        status,

        reason,

        scope,

        scopeIdentity:
            Object.freeze({
                vrmSiteId,
                fleetId,
            }),
    });
}

function forbidden({
    reason,
    scope = null,
    vrmSiteId = null,
    fleetId = null,
}) {
    return buildDecision({
        authorized: false,

        status:
            FINANCIAL_BI_AUTHORIZATION_STATUS
                .FORBIDDEN,

        reason,

        scope,

        vrmSiteId,

        fleetId,
    });
}

function unavailable({
    reason,
    scope = null,
    vrmSiteId = null,
    fleetId = null,
}) {
    return buildDecision({
        authorized: false,

        status:
            FINANCIAL_BI_AUTHORIZATION_STATUS
                .UNAVAILABLE,

        reason,

        scope,

        vrmSiteId,

        fleetId,
    });
}

function authorizedSite({
    vrmSiteId,
}) {
    return buildDecision({
        authorized: true,

        status:
            FINANCIAL_BI_AUTHORIZATION_STATUS
                .AUTHORIZED,

        reason:
            FINANCIAL_BI_AUTHORIZATION_REASON
                .SITE_AUTHORIZED,

        scope:
            "SITE",

        vrmSiteId,

        fleetId: null,
    });
}

/*
|--------------------------------------------------------------------------
| SITE authorization
|--------------------------------------------------------------------------
|
| Resolve the Financial/BI vrmSiteId to an Installation and require an
| active UserInstallationAccess relationship for that exact installation.
|
| No unrestricted fallback is permitted.
|
|--------------------------------------------------------------------------
*/

async function authorizeFinancialBiSite({
    userId,
    vrmSiteId,

    installationModel =
        Installation,

    accessModel =
        UserInstallationAccess,
} = {}) {
    const normalizedUserId =
        normalizeObjectId(userId);

    if (!normalizedUserId) {
        return forbidden({
            reason:
                FINANCIAL_BI_AUTHORIZATION_REASON
                    .USER_ID_INVALID,

            scope:
                "SITE",

            vrmSiteId:
                normalizeString(
                    vrmSiteId
                ),
        });
    }

    const normalizedVrmSiteId =
        normalizeString(
            vrmSiteId
        );

    if (!normalizedVrmSiteId) {
        return forbidden({
            reason:
                FINANCIAL_BI_AUTHORIZATION_REASON
                    .SITE_IDENTITY_INVALID,

            scope:
                "SITE",
        });
    }

    try {
        const installation =
            await installationModel
                .findOne({
                    source:
                        "VRM",

                    vrmSiteId:
                        normalizedVrmSiteId,
                })
                .select({
                    _id: 1,
                })
                .lean();

        if (!installation?._id) {
            return forbidden({
                reason:
                    FINANCIAL_BI_AUTHORIZATION_REASON
                        .SITE_NOT_AUTHORIZED,

                scope:
                    "SITE",

                vrmSiteId:
                    normalizedVrmSiteId,
            });
        }

        const access =
            await accessModel
                .findOne({
                    user:
                        normalizedUserId,

                    installation:
                        installation._id,

                    active:
                        true,
                })
                .select({
                    _id: 1,
                })
                .lean();

        if (!access?._id) {
            return forbidden({
                reason:
                    FINANCIAL_BI_AUTHORIZATION_REASON
                        .SITE_NOT_AUTHORIZED,

                scope:
                    "SITE",

                vrmSiteId:
                    normalizedVrmSiteId,
            });
        }

        return authorizedSite({
            vrmSiteId:
                normalizedVrmSiteId,
        });
    } catch {
        /*
         * Authorization infrastructure failure must never
         * degrade into access.
         */
        return unavailable({
            reason:
                FINANCIAL_BI_AUTHORIZATION_REASON
                    .AUTHORIZATION_LOOKUP_FAILED,

            scope:
                "SITE",

            vrmSiteId:
                normalizedVrmSiteId,
        });
    }
}

/*
|--------------------------------------------------------------------------
| Public authorization entry point
|--------------------------------------------------------------------------
*/

export async function authorizeFinancialBiRecord({
    userId,
    scope,
    scopeIdentity = {},
    installationModel =
        Installation,
    accessModel =
        UserInstallationAccess,
} = {}) {
    const normalizedScope =
        normalizeString(scope)
            ?.toUpperCase() ??
        null;

    if (
        normalizedScope ===
        "SITE"
    ) {
        return authorizeFinancialBiSite({
            userId,

            vrmSiteId:
                scopeIdentity
                    ?.vrmSiteId,

            installationModel,

            accessModel,
        });
    }

    if (
        normalizedScope ===
        "FLEET"
    ) {
        const fleetId =
            normalizeString(
                scopeIdentity
                    ?.fleetId
            );

        if (!fleetId) {
            return forbidden({
                reason:
                    FINANCIAL_BI_AUTHORIZATION_REASON
                        .FLEET_IDENTITY_INVALID,

                scope:
                    "FLEET",
            });
        }

        /*
         * P.1H-G4-B2:
         *
         * No authoritative fleet membership model exists.
         *
         * The presence of a valid fleetId MUST NOT grant access.
         */
        return unavailable({
            reason:
                FINANCIAL_BI_AUTHORIZATION_REASON
                    .FLEET_AUTHORIZATION_UNAVAILABLE,

            scope:
                "FLEET",

            vrmSiteId: null,

            fleetId,
        });
    }

    return forbidden({
        reason:
            FINANCIAL_BI_AUTHORIZATION_REASON
                .SCOPE_UNSUPPORTED,

        scope:
            normalizedScope,
    });
}

export default
    authorizeFinancialBiRecord;