import Installation from "../../models/Installation.js";

import {
  normalizeVrmSiteId,
} from "./installationResourceResolver.js";

function extractRemoteVrmSiteId(
  installation
) {
  if (
    !installation ||
    typeof installation !== "object"
  ) {
    return null;
  }

  return normalizeVrmSiteId(
    installation.idSite ??
    installation.idsite ??
    installation.siteId ??
    installation.installationId ??
    installation.id
  );
}

async function getEntitledVrmSiteIds({
  installationIds,
  installationModel = Installation,
} = {}) {
  if (!Array.isArray(installationIds)) {
    throw new TypeError(
      "installationIds scope is required."
    );
  }

  if (installationIds.length === 0) {
    return Object.freeze([]);
  }

  const installations =
    await installationModel
      .find({
        _id: {
          $in: installationIds,
        },
        source: "VRM",
      })
      .select({
        _id: 1,
        vrmSiteId: 1,
      })
      .lean();

  const vrmSiteIds =
    installations
      .map(
        (installation) =>
          normalizeVrmSiteId(
            installation?.vrmSiteId
          )
      )
      .filter(Boolean);

  return Object.freeze([
    ...new Set(vrmSiteIds),
  ]);
}

function filterVrmInstallationsBySiteIds({
  installations,
  vrmSiteIds,
} = {}) {
  if (!Array.isArray(installations)) {
    throw new TypeError(
      "installations must be an array."
    );
  }

  if (!Array.isArray(vrmSiteIds)) {
    throw new TypeError(
      "vrmSiteIds scope is required."
    );
  }

  if (vrmSiteIds.length === 0) {
    return [];
  }

  const allowed =
    new Set(
      vrmSiteIds
        .map(normalizeVrmSiteId)
        .filter(Boolean)
    );

  if (allowed.size === 0) {
    return [];
  }

  return installations.filter(
    (installation) => {
      const vrmSiteId =
        extractRemoteVrmSiteId(
          installation
        );

      return (
        vrmSiteId !== null &&
        allowed.has(vrmSiteId)
      );
    }
  );
}

export {
  extractRemoteVrmSiteId,
  getEntitledVrmSiteIds,
  filterVrmInstallationsBySiteIds,
};

export default
  filterVrmInstallationsBySiteIds;
