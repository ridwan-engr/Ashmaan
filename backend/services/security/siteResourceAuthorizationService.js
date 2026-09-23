// services/security/siteResourceAuthorizationService.js

import mongoose from "mongoose";

import UserInstallationAccess
  from "../../models/UserInstallationAccess.js";

/*
|--------------------------------------------------------------------------
| P.1H-C — Site Resource Authorization
|--------------------------------------------------------------------------
|
| This service evaluates user-to-installation entitlement only.
|
| It does NOT:
| - authenticate users;
| - evaluate RBAC permissions;
| - infer entitlement from role;
| - resolve vrmSiteId;
| - perform equipment control;
| - perform automatic dispatch.
|
*/

const SITE_RESOURCE_AUTHORIZATION_DECISIONS =
  Object.freeze({
    ALLOW: "ALLOW",
    DENY: "DENY",
    UNAVAILABLE: "UNAVAILABLE",
  });

const SITE_RESOURCE_AUTHORIZATION_REASONS =
  Object.freeze({
    ENTITLEMENT_CONFIRMED:
      "ENTITLEMENT_CONFIRMED",

    USER_ID_MISSING:
      "USER_ID_MISSING",

    USER_ID_INVALID:
      "USER_ID_INVALID",

    INSTALLATION_ID_MISSING:
      "INSTALLATION_ID_MISSING",

    INSTALLATION_ID_INVALID:
      "INSTALLATION_ID_INVALID",

    ENTITLEMENT_NOT_FOUND:
      "ENTITLEMENT_NOT_FOUND",

    ENTITLEMENT_INACTIVE:
      "ENTITLEMENT_INACTIVE",

    AUTHORIZATION_UNAVAILABLE:
      "AUTHORIZATION_UNAVAILABLE",
  });

function buildResult({
  decision,
  reason,
  userId = null,
  installationId = null,
}) {
  return Object.freeze({
    decision,

    allowed:
      decision ===
      SITE_RESOURCE_AUTHORIZATION_DECISIONS.ALLOW,

    reason,

    userId:
      userId === null
        ? null
        : String(userId),

    installationId:
      installationId === null
        ? null
        : String(installationId),

    equipmentControlAllowed: false,
    automaticDispatchAllowed: false,
  });
}

function normalizeObjectId(value) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  if (
    !mongoose.Types.ObjectId.isValid(
      normalized
    )
  ) {
    return false;
  }

  return normalized;
}

async function authorizeSiteResource({
  userId,
  installationId,
  accessModel =
    UserInstallationAccess,
} = {}) {
  const normalizedUserId =
    normalizeObjectId(userId);

  if (normalizedUserId === null) {
    return buildResult({
      decision:
        SITE_RESOURCE_AUTHORIZATION_DECISIONS.DENY,

      reason:
        SITE_RESOURCE_AUTHORIZATION_REASONS.USER_ID_MISSING,

      installationId,
    });
  }

  if (normalizedUserId === false) {
    return buildResult({
      decision:
        SITE_RESOURCE_AUTHORIZATION_DECISIONS.DENY,

      reason:
        SITE_RESOURCE_AUTHORIZATION_REASONS.USER_ID_INVALID,

      userId,
      installationId,
    });
  }

  const normalizedInstallationId =
    normalizeObjectId(installationId);

  if (
    normalizedInstallationId === null
  ) {
    return buildResult({
      decision:
        SITE_RESOURCE_AUTHORIZATION_DECISIONS.DENY,

      reason:
        SITE_RESOURCE_AUTHORIZATION_REASONS
          .INSTALLATION_ID_MISSING,

      userId: normalizedUserId,
    });
  }

  if (
    normalizedInstallationId === false
  ) {
    return buildResult({
      decision:
        SITE_RESOURCE_AUTHORIZATION_DECISIONS.DENY,

      reason:
        SITE_RESOURCE_AUTHORIZATION_REASONS
          .INSTALLATION_ID_INVALID,

      userId: normalizedUserId,
      installationId,
    });
  }

  try {
    const entitlement =
      await accessModel
        .findOne({
          user: normalizedUserId,
          installation:
            normalizedInstallationId,
        })
        .select({
          active: 1,
        })
        .lean();

    if (!entitlement) {
      return buildResult({
        decision:
          SITE_RESOURCE_AUTHORIZATION_DECISIONS.DENY,

        reason:
          SITE_RESOURCE_AUTHORIZATION_REASONS
            .ENTITLEMENT_NOT_FOUND,

        userId:
          normalizedUserId,

        installationId:
          normalizedInstallationId,
      });
    }

    if (entitlement.active !== true) {
      return buildResult({
        decision:
          SITE_RESOURCE_AUTHORIZATION_DECISIONS.DENY,

        reason:
          SITE_RESOURCE_AUTHORIZATION_REASONS
            .ENTITLEMENT_INACTIVE,

        userId:
          normalizedUserId,

        installationId:
          normalizedInstallationId,
      });
    }

    return buildResult({
      decision:
        SITE_RESOURCE_AUTHORIZATION_DECISIONS.ALLOW,

      reason:
        SITE_RESOURCE_AUTHORIZATION_REASONS
          .ENTITLEMENT_CONFIRMED,

      userId:
        normalizedUserId,

      installationId:
        normalizedInstallationId,
    });
  }
  catch {
    return buildResult({
      decision:
        SITE_RESOURCE_AUTHORIZATION_DECISIONS
          .UNAVAILABLE,

      reason:
        SITE_RESOURCE_AUTHORIZATION_REASONS
          .AUTHORIZATION_UNAVAILABLE,

      userId:
        normalizedUserId,

      installationId:
        normalizedInstallationId,
    });
  }
}

export {
  SITE_RESOURCE_AUTHORIZATION_DECISIONS,
  SITE_RESOURCE_AUTHORIZATION_REASONS,
  authorizeSiteResource,
};

export default authorizeSiteResource;
