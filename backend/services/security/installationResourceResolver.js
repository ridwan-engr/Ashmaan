// services/security/installationResourceResolver.js

import Installation
  from "../../models/Installation.js";

/*
|--------------------------------------------------------------------------
| P.1H-D1 — Installation Resource Resolver
|--------------------------------------------------------------------------
|
| Converts the caller-facing VRM site identity into the canonical
| Installation resource used by portal ACL authorization.
|
| Identity contract:
|
|   external identity  = Installation.vrmSiteId
|   internal identity  = Installation._id
|
| This service performs resource resolution only.
| It does NOT authenticate, evaluate RBAC, or grant entitlement.
|
*/

const INSTALLATION_RESOURCE_RESOLUTION =
  Object.freeze({
    RESOLVED: "RESOLVED",
    NOT_FOUND: "NOT_FOUND",
    INVALID: "INVALID",
    UNAVAILABLE: "UNAVAILABLE",
  });

const INSTALLATION_RESOURCE_RESOLUTION_REASONS =
  Object.freeze({
    INSTALLATION_RESOLVED:
      "INSTALLATION_RESOLVED",

    VRM_SITE_ID_MISSING:
      "VRM_SITE_ID_MISSING",

    INSTALLATION_NOT_FOUND:
      "INSTALLATION_NOT_FOUND",

    RESOLUTION_UNAVAILABLE:
      "RESOLUTION_UNAVAILABLE",
  });

function buildResolution({
  status,
  reason,
  vrmSiteId = null,
  installationId = null,
}) {
  return Object.freeze({
    status,
    resolved:
      status ===
      INSTALLATION_RESOURCE_RESOLUTION.RESOLVED,

    reason,

    vrmSiteId,

    installationId:
      installationId === null
        ? null
        : String(installationId),
  });
}

function normalizeVrmSiteId(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized === ""
    ? null
    : normalized;
}

async function resolveInstallationByVrmSiteId({
  vrmSiteId,
  installationModel = Installation,
} = {}) {
  const normalizedSiteId =
    normalizeVrmSiteId(vrmSiteId);

  if (!normalizedSiteId) {
    return buildResolution({
      status:
        INSTALLATION_RESOURCE_RESOLUTION.INVALID,

      reason:
        INSTALLATION_RESOURCE_RESOLUTION_REASONS
          .VRM_SITE_ID_MISSING,
    });
  }

  try {
    const installation =
      await installationModel
        .findOne({
          vrmSiteId: normalizedSiteId,
          source: "VRM",
        })
        .select({
          _id: 1,
          vrmSiteId: 1,
        })
        .lean();

    if (!installation) {
      return buildResolution({
        status:
          INSTALLATION_RESOURCE_RESOLUTION.NOT_FOUND,

        reason:
          INSTALLATION_RESOURCE_RESOLUTION_REASONS
            .INSTALLATION_NOT_FOUND,

        vrmSiteId:
          normalizedSiteId,
      });
    }

    return buildResolution({
      status:
        INSTALLATION_RESOURCE_RESOLUTION.RESOLVED,

      reason:
        INSTALLATION_RESOURCE_RESOLUTION_REASONS
          .INSTALLATION_RESOLVED,

      vrmSiteId:
        String(
          installation.vrmSiteId
        ),

      installationId:
        installation._id,
    });
  }
  catch {
    return buildResolution({
      status:
        INSTALLATION_RESOURCE_RESOLUTION.UNAVAILABLE,

      reason:
        INSTALLATION_RESOURCE_RESOLUTION_REASONS
          .RESOLUTION_UNAVAILABLE,

      vrmSiteId:
        normalizedSiteId,
    });
  }
}

export {
  INSTALLATION_RESOURCE_RESOLUTION,
  INSTALLATION_RESOURCE_RESOLUTION_REASONS,
  normalizeVrmSiteId,
  resolveInstallationByVrmSiteId,
};

export default
  resolveInstallationByVrmSiteId;
