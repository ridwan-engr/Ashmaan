import {
    INSTALLATION_RESOURCE_RESOLUTION,
    resolveInstallationByVrmSiteId,
} from "./installationResourceResolver.js";

import {
    SITE_RESOURCE_AUTHORIZATION_DECISIONS,
    authorizeSiteResource,
} from "./siteResourceAuthorizationService.js";


const FORECAST_RECORD_AUTHORIZATION_DECISIONS =
    Object.freeze({
        ALLOW:
            "ALLOW",

        DENY:
            "DENY",

        UNAVAILABLE:
            "UNAVAILABLE",
    });


const FORECAST_RECORD_AUTHORIZATION_REASONS =
    Object.freeze({
        FORECAST_IDENTITY_MISSING:
            "FORECAST_IDENTITY_MISSING",

        INSTALLATION_NOT_FOUND:
            "INSTALLATION_NOT_FOUND",

        INSTALLATION_RESOLUTION_INVALID:
            "INSTALLATION_RESOLUTION_INVALID",

        INSTALLATION_RESOLUTION_UNAVAILABLE:
            "INSTALLATION_RESOLUTION_UNAVAILABLE",

        SITE_ACCESS_DENIED:
            "SITE_ACCESS_DENIED",

        SITE_AUTHORIZATION_UNAVAILABLE:
            "SITE_AUTHORIZATION_UNAVAILABLE",

        FORECAST_ACCESS_CONFIRMED:
            "FORECAST_ACCESS_CONFIRMED",
    });


function buildResult({
    decision,
    reason,
    vrmSiteId = null,
    installationId = null,
} = {}) {
    return Object.freeze({
        decision,

        allowed:
            decision ===
            FORECAST_RECORD_AUTHORIZATION_DECISIONS.ALLOW,

        reason,

        vrmSiteId:
            vrmSiteId === null
                ? null
                : String(
                    vrmSiteId
                ),

        installationId:
            installationId === null
                ? null
                : String(
                    installationId
                ),

        equipmentControlAllowed:
            false,

        automaticDispatchAllowed:
            false,
    });
}


function readForecastIdentityVrmSiteId(
    record
) {
    const value =
        record?.identity?.vrmSiteId;

    if (
        value === undefined ||
        value === null
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


async function authorizeForecastRecord({
    userId,
    record,
    resolveInstallation =
        resolveInstallationByVrmSiteId,
    authorizeResource =
        authorizeSiteResource,
} = {}) {
    if (
        typeof resolveInstallation !==
            "function"
    ) {
        throw new TypeError(
            "FORECAST_INSTALLATION_RESOLVER_REQUIRED"
        );
    }

    if (
        typeof authorizeResource !==
            "function"
    ) {
        throw new TypeError(
            "FORECAST_SITE_AUTHORIZER_REQUIRED"
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Strict persisted Forecast identity
    |--------------------------------------------------------------------------
    |
    | Portal ACL authority is identity.vrmSiteId only.
    |
    | target.vrmSiteId is domain payload/provenance and MUST NOT be used
    | as a fallback authorization identity.
    |
    */

    const vrmSiteId =
        readForecastIdentityVrmSiteId(
            record
        );

    if (
        vrmSiteId === null
    ) {
        return buildResult({
            decision:
                FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY,

            reason:
                FORECAST_RECORD_AUTHORIZATION_REASONS
                    .FORECAST_IDENTITY_MISSING,
        });
    }

    let resolution;

    try {
        resolution =
            await resolveInstallation({
                vrmSiteId,
            });
    }
    catch {
        return buildResult({
            decision:
                FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE,

            reason:
                FORECAST_RECORD_AUTHORIZATION_REASONS
                    .INSTALLATION_RESOLUTION_UNAVAILABLE,

            vrmSiteId,
        });
    }

    if (
        resolution?.status ===
        INSTALLATION_RESOURCE_RESOLUTION.UNAVAILABLE
    ) {
        return buildResult({
            decision:
                FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE,

            reason:
                FORECAST_RECORD_AUTHORIZATION_REASONS
                    .INSTALLATION_RESOLUTION_UNAVAILABLE,

            vrmSiteId,
        });
    }

    if (
        resolution?.status ===
        INSTALLATION_RESOURCE_RESOLUTION.NOT_FOUND
    ) {
        return buildResult({
            decision:
                FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY,

            reason:
                FORECAST_RECORD_AUTHORIZATION_REASONS
                    .INSTALLATION_NOT_FOUND,

            vrmSiteId,
        });
    }

    if (
        resolution?.status !==
            INSTALLATION_RESOURCE_RESOLUTION.RESOLVED ||
        !resolution?.installationId
    ) {
        return buildResult({
            decision:
                FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY,

            reason:
                FORECAST_RECORD_AUTHORIZATION_REASONS
                    .INSTALLATION_RESOLUTION_INVALID,

            vrmSiteId,
        });
    }

    let authorization;

    try {
        authorization =
            await authorizeResource({
                userId,
                installationId:
                    resolution.installationId,
            });
    }
    catch {
        return buildResult({
            decision:
                FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE,

            reason:
                FORECAST_RECORD_AUTHORIZATION_REASONS
                    .SITE_AUTHORIZATION_UNAVAILABLE,

            vrmSiteId,
            installationId:
                resolution.installationId,
        });
    }

    if (
        authorization?.decision ===
        SITE_RESOURCE_AUTHORIZATION_DECISIONS.UNAVAILABLE
    ) {
        return buildResult({
            decision:
                FORECAST_RECORD_AUTHORIZATION_DECISIONS.UNAVAILABLE,

            reason:
                FORECAST_RECORD_AUTHORIZATION_REASONS
                    .SITE_AUTHORIZATION_UNAVAILABLE,

            vrmSiteId,
            installationId:
                resolution.installationId,
        });
    }

    if (
        authorization?.decision !==
        SITE_RESOURCE_AUTHORIZATION_DECISIONS.ALLOW
    ) {
        return buildResult({
            decision:
                FORECAST_RECORD_AUTHORIZATION_DECISIONS.DENY,

            reason:
                FORECAST_RECORD_AUTHORIZATION_REASONS
                    .SITE_ACCESS_DENIED,

            vrmSiteId,
            installationId:
                resolution.installationId,
        });
    }

    return buildResult({
        decision:
            FORECAST_RECORD_AUTHORIZATION_DECISIONS.ALLOW,

        reason:
            FORECAST_RECORD_AUTHORIZATION_REASONS
                .FORECAST_ACCESS_CONFIRMED,

        vrmSiteId,
        installationId:
            resolution.installationId,
    });
}


export {
    FORECAST_RECORD_AUTHORIZATION_DECISIONS,
    FORECAST_RECORD_AUTHORIZATION_REASONS,
    readForecastIdentityVrmSiteId,
    authorizeForecastRecord,
};

export default authorizeForecastRecord;
