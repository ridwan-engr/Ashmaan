// middleware/requireInstallationAccess.js

import {
  INSTALLATION_RESOURCE_RESOLUTION,
  resolveInstallationByVrmSiteId,
} from "../services/security/installationResourceResolver.js";

import {
  SITE_RESOURCE_AUTHORIZATION_DECISIONS,
  authorizeSiteResource,
} from "../services/security/siteResourceAuthorizationService.js";

/*
|--------------------------------------------------------------------------
| P.1H-D2 — Installation ACL HTTP Middleware
|--------------------------------------------------------------------------
|
| Expected upstream chain:
|
| authenticatePortalAccessToken
|   -> requireActivePortalSession
|   -> requirePortalPermission(...)
|   -> requireInstallationAccess(...)
|   -> route handler
|
| This middleware:
| - obtains authenticated user identity from req.auth.userId;
| - obtains caller-facing VRM site identity from the configured request source;
| - resolves vrmSiteId -> Installation._id;
| - evaluates explicit user-to-installation entitlement;
| - attaches immutable resource context only after ALLOW.
|
| It does NOT authenticate users or evaluate RBAC permissions.
|
*/

const INSTALLATION_ACCESS_HTTP_STATUS =
  Object.freeze({
    BAD_REQUEST: 400,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVICE_UNAVAILABLE: 503,
  });

function sendError(
  res,
  status,
  code,
  message
) {
  return res.status(status).json({
    error: {
      code,
      message,
    },
  });
}

function readVrmSiteId(
  req,
  {
    paramName = "vrmSiteId",
    source = "params",
  } = {}
) {
  if (!req || !paramName) {
    return undefined;
  }

  if (source === "params") {
    return req.params?.[paramName];
  }

  if (source === "query") {
    return req.query?.[paramName];
  }

  return undefined;
}

function requireInstallationAccess({
  paramName = "vrmSiteId",
  source = "params",
  resolveInstallation =
    resolveInstallationByVrmSiteId,
  authorizeResource =
    authorizeSiteResource,
} = {}) {
  return async function installationAccessMiddleware(
    req,
    res,
    next
  ) {
    const userId =
      req?.auth?.userId;

    /*
    |--------------------------------------------------------------------------
    | Authentication invariant
    |--------------------------------------------------------------------------
    |
    | This middleware normally executes after authentication and active-session
    | validation. Missing principal nevertheless fails closed.
    |
    */

    if (
      userId === undefined ||
      userId === null ||
      String(userId).trim() === ""
    ) {
      return sendError(
        res,
        INSTALLATION_ACCESS_HTTP_STATUS.FORBIDDEN,
        "INSTALLATION_ACCESS_DENIED",
        "Installation access denied."
      );
    }

    const vrmSiteId =
      readVrmSiteId(
        req,
        {
          paramName,
          source,
        }
      );

    let resolution;

    try {
      resolution =
        await resolveInstallation({
          vrmSiteId,
        });
    }
    catch {
      return sendError(
        res,
        INSTALLATION_ACCESS_HTTP_STATUS
          .SERVICE_UNAVAILABLE,
        "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
        "Installation authorization is temporarily unavailable."
      );
    }

    if (
      resolution?.status ===
      INSTALLATION_RESOURCE_RESOLUTION.INVALID
    ) {
      return sendError(
        res,
        INSTALLATION_ACCESS_HTTP_STATUS.BAD_REQUEST,
        "INVALID_INSTALLATION_RESOURCE",
        "A valid installation resource identifier is required."
      );
    }

    if (
      resolution?.status ===
      INSTALLATION_RESOURCE_RESOLUTION.NOT_FOUND
    ) {
      return sendError(
        res,
        INSTALLATION_ACCESS_HTTP_STATUS.NOT_FOUND,
        "INSTALLATION_NOT_FOUND",
        "Installation resource was not found."
      );
    }

    if (
      resolution?.status ===
      INSTALLATION_RESOURCE_RESOLUTION.UNAVAILABLE
    ) {
      return sendError(
        res,
        INSTALLATION_ACCESS_HTTP_STATUS
          .SERVICE_UNAVAILABLE,
        "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
        "Installation authorization is temporarily unavailable."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Unknown resolver output fails closed
    |--------------------------------------------------------------------------
    */

    if (
      resolution?.status !==
        INSTALLATION_RESOURCE_RESOLUTION.RESOLVED ||
      !resolution?.installationId
    ) {
      return sendError(
        res,
        INSTALLATION_ACCESS_HTTP_STATUS
          .SERVICE_UNAVAILABLE,
        "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
        "Installation authorization is temporarily unavailable."
      );
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
      return sendError(
        res,
        INSTALLATION_ACCESS_HTTP_STATUS
          .SERVICE_UNAVAILABLE,
        "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
        "Installation authorization is temporarily unavailable."
      );
    }

    if (
      authorization?.decision ===
      SITE_RESOURCE_AUTHORIZATION_DECISIONS.DENY
    ) {
      return sendError(
        res,
        INSTALLATION_ACCESS_HTTP_STATUS.FORBIDDEN,
        "INSTALLATION_ACCESS_DENIED",
        "Installation access denied."
      );
    }

    if (
      authorization?.decision ===
      SITE_RESOURCE_AUTHORIZATION_DECISIONS.UNAVAILABLE
    ) {
      return sendError(
        res,
        INSTALLATION_ACCESS_HTTP_STATUS
          .SERVICE_UNAVAILABLE,
        "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
        "Installation authorization is temporarily unavailable."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Unknown authorization output fails closed
    |--------------------------------------------------------------------------
    */

    if (
      authorization?.decision !==
        SITE_RESOURCE_AUTHORIZATION_DECISIONS.ALLOW ||
      authorization?.allowed !== true
    ) {
      return sendError(
        res,
        INSTALLATION_ACCESS_HTTP_STATUS
          .SERVICE_UNAVAILABLE,
        "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
        "Installation authorization is temporarily unavailable."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Authorized resource context
    |--------------------------------------------------------------------------
    |
    | Downstream handlers receive the already-resolved canonical resource.
    |
    */

    req.installationAccess =
      Object.freeze({
        userId:
          String(userId),

        vrmSiteId:
          String(
            resolution.vrmSiteId
          ),

        installationId:
          String(
            resolution.installationId
          ),

        authorized: true,
      });

    return next();
  };
}

export {
  INSTALLATION_ACCESS_HTTP_STATUS,
  readVrmSiteId,
  requireInstallationAccess,
};

export default requireInstallationAccess;
