// services/security/userInstallationScopeService.js

import mongoose from "mongoose";

import UserInstallationAccess
  from "../../models/UserInstallationAccess.js";

const USER_INSTALLATION_SCOPE_STATUS =
  Object.freeze({
    RESOLVED: "RESOLVED",
    DENY: "DENY",
    UNAVAILABLE: "UNAVAILABLE",
  });

const USER_INSTALLATION_SCOPE_REASONS =
  Object.freeze({
    SCOPE_RESOLVED:
      "SCOPE_RESOLVED",

    USER_ID_MISSING:
      "USER_ID_MISSING",

    USER_ID_INVALID:
      "USER_ID_INVALID",

    SCOPE_UNAVAILABLE:
      "SCOPE_UNAVAILABLE",
  });

function buildScopeResult({
  status,
  reason,
  userId = null,
  installationIds = [],
}) {
  const normalizedInstallationIds =
    Object.freeze(
      installationIds.map(
        (installationId) =>
          String(installationId)
      )
    );

  return Object.freeze({
    status,

    resolved:
      status ===
      USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

    allowed:
      status ===
      USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

    reason,

    userId:
      userId === null
        ? null
        : String(userId),

    installationIds:
      normalizedInstallationIds,

    count:
      normalizedInstallationIds.length,
  });
}

function normalizeUserId(value) {
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

async function getUserInstallationScope({
  userId,
  accessModel =
    UserInstallationAccess,
} = {}) {
  const normalizedUserId =
    normalizeUserId(userId);

  if (normalizedUserId === null) {
    return buildScopeResult({
      status:
        USER_INSTALLATION_SCOPE_STATUS.DENY,

      reason:
        USER_INSTALLATION_SCOPE_REASONS
          .USER_ID_MISSING,
    });
  }

  if (normalizedUserId === false) {
    return buildScopeResult({
      status:
        USER_INSTALLATION_SCOPE_STATUS.DENY,

      reason:
        USER_INSTALLATION_SCOPE_REASONS
          .USER_ID_INVALID,

      userId,
    });
  }

  try {
    const installationIds =
      await accessModel.distinct(
        "installation",
        {
          user:
            normalizedUserId,

          active: true,
        }
      );

    return buildScopeResult({
      status:
        USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

      reason:
        USER_INSTALLATION_SCOPE_REASONS
          .SCOPE_RESOLVED,

      userId:
        normalizedUserId,

      installationIds:
        Array.isArray(
          installationIds
        )
          ? installationIds
          : [],
    });
  }
  catch {
    return buildScopeResult({
      status:
        USER_INSTALLATION_SCOPE_STATUS
          .UNAVAILABLE,

      reason:
        USER_INSTALLATION_SCOPE_REASONS
          .SCOPE_UNAVAILABLE,

      userId:
        normalizedUserId,
    });
  }
}

export {
  USER_INSTALLATION_SCOPE_STATUS,
  USER_INSTALLATION_SCOPE_REASONS,
  normalizeUserId,
  getUserInstallationScope,
};

export default
  getUserInstallationScope;