// ASHMAAN Phase 13.4
// Authorization / RBAC Service

export const AUTHORIZATION_RBAC_PHASE = "13.4";

export const AUTHORIZATION_RBAC_LAYER =
  "AUTHORIZATION_AND_RBAC";

// ============================================================
// ROLES
// ============================================================

export const RBAC_ROLES = Object.freeze({
  USER: "USER",
  OPERATOR: "OPERATOR",
  ADMINISTRATOR: "ADMINISTRATOR",
  SERVICE: "SERVICE",
  SYSTEM: "SYSTEM",
});

// ============================================================
// PERMISSIONS
// ============================================================

export const RBAC_PERMISSIONS = Object.freeze({
  READ_DASHBOARD:
    "READ_DASHBOARD",

  READ_ENGINEERING_ANALYTICS:
    "READ_ENGINEERING_ANALYTICS",

  READ_FORECASTING:
    "READ_FORECASTING",

  READ_FINANCIAL_BI:
    "READ_FINANCIAL_BI",

  READ_OPTIMIZATION_DSS:
    "READ_OPTIMIZATION_DSS",

  MANAGE_OPTIMIZATION_DSS:
    "MANAGE_OPTIMIZATION_DSS",

  MANAGE_USERS:
    "MANAGE_USERS",

  MANAGE_SECURITY:
    "MANAGE_SECURITY",

  READ_AUDIT_LOG:
    "READ_AUDIT_LOG",

  EXECUTE_EQUIPMENT_CONTROL:
    "EXECUTE_EQUIPMENT_CONTROL",
});

// ============================================================
// AUTHORIZATION DECISION
// ============================================================

export const AUTHORIZATION_DECISION = Object.freeze({
  ALLOW: "ALLOW",
  DENY: "DENY",
  UNAVAILABLE: "UNAVAILABLE",
});

// ============================================================
// DENIAL REASONS
// ============================================================

export const AUTHORIZATION_DENIAL_REASON =
  Object.freeze({
    NOT_AUTHENTICATED:
      "NOT_AUTHENTICATED",

    ROLE_MISSING:
      "ROLE_MISSING",

    ROLE_UNKNOWN:
      "ROLE_UNKNOWN",

    PERMISSION_MISSING:
      "PERMISSION_MISSING",

    PERMISSION_DENIED:
      "PERMISSION_DENIED",

    AUTHORIZATION_UNAVAILABLE:
      "AUTHORIZATION_UNAVAILABLE",

    EQUIPMENT_CONTROL_FORBIDDEN:
      "EQUIPMENT_CONTROL_FORBIDDEN",
  });

// ============================================================
// ROLE → PERMISSION MAP
// ============================================================

export const DEFAULT_ROLE_PERMISSION_MAP =
  Object.freeze({
    [RBAC_ROLES.USER]:
      Object.freeze([
        RBAC_PERMISSIONS.READ_DASHBOARD,
        RBAC_PERMISSIONS.READ_ENGINEERING_ANALYTICS,
        RBAC_PERMISSIONS.READ_FORECASTING,
        RBAC_PERMISSIONS.READ_FINANCIAL_BI,
        RBAC_PERMISSIONS.READ_OPTIMIZATION_DSS,
      ]),

    [RBAC_ROLES.OPERATOR]:
      Object.freeze([
        RBAC_PERMISSIONS.READ_DASHBOARD,
        RBAC_PERMISSIONS.READ_ENGINEERING_ANALYTICS,
        RBAC_PERMISSIONS.READ_FORECASTING,
        RBAC_PERMISSIONS.READ_FINANCIAL_BI,
        RBAC_PERMISSIONS.READ_OPTIMIZATION_DSS,
        RBAC_PERMISSIONS.READ_AUDIT_LOG,
      ]),

    [RBAC_ROLES.ADMINISTRATOR]:
      Object.freeze([
        RBAC_PERMISSIONS.READ_DASHBOARD,
        RBAC_PERMISSIONS.READ_ENGINEERING_ANALYTICS,
        RBAC_PERMISSIONS.READ_FORECASTING,
        RBAC_PERMISSIONS.READ_FINANCIAL_BI,
        RBAC_PERMISSIONS.READ_OPTIMIZATION_DSS,
        RBAC_PERMISSIONS.MANAGE_OPTIMIZATION_DSS,
        RBAC_PERMISSIONS.MANAGE_USERS,
        RBAC_PERMISSIONS.MANAGE_SECURITY,
        RBAC_PERMISSIONS.READ_AUDIT_LOG,
      ]),

    [RBAC_ROLES.SERVICE]:
      Object.freeze([
        RBAC_PERMISSIONS.READ_ENGINEERING_ANALYTICS,
        RBAC_PERMISSIONS.READ_FORECASTING,
        RBAC_PERMISSIONS.READ_FINANCIAL_BI,
        RBAC_PERMISSIONS.READ_OPTIMIZATION_DSS,
      ]),

    [RBAC_ROLES.SYSTEM]:
      Object.freeze([
        RBAC_PERMISSIONS.READ_ENGINEERING_ANALYTICS,
        RBAC_PERMISSIONS.READ_FORECASTING,
        RBAC_PERMISSIONS.READ_FINANCIAL_BI,
        RBAC_PERMISSIONS.READ_OPTIMIZATION_DSS,
      ]),
  });

// ============================================================
// INVARIANTS
// ============================================================

export const AUTHORIZATION_RBAC_INVARIANTS =
  Object.freeze({
    defaultDeny: true,

    authenticationDoesNotImplyAuthorization:
      true,

    explicitPermissionRequired:
      true,

    leastPrivilegeRequired:
      true,

    unknownRoleMustBeDenied:
      true,

    missingRoleMustBeDenied:
      true,

    missingPermissionMustBeDenied:
      true,

    unavailableAuthorizationMustNotAllow:
      true,

    equipmentControlPermissionAssigned:
      false,

    optimizationDssRemainsAdvisoryOnly:
      true,

    optimizationDssExecutable:
      false,

    optimizationDssAutoDispatch:
      false,
  });

// ============================================================
// HELPERS
// ============================================================

function normalizeRole(role) {
  return typeof role === "string"
    ? role.trim().toUpperCase()
    : "";
}

function normalizePermission(permission) {
  return typeof permission === "string"
    ? permission.trim().toUpperCase()
    : "";
}

export function isKnownRole(role) {
  const normalizedRole =
    normalizeRole(role);

  return Object.values(
    RBAC_ROLES
  ).includes(normalizedRole);
}

export function isKnownPermission(
  permission
) {
  const normalizedPermission =
    normalizePermission(permission);

  return Object.values(
    RBAC_PERMISSIONS
  ).includes(normalizedPermission);
}

export function getPermissionsForRole(
  role,
  rolePermissionMap =
    DEFAULT_ROLE_PERMISSION_MAP
) {
  const normalizedRole =
    normalizeRole(role);

  if (!isKnownRole(normalizedRole)) {
    return Object.freeze([]);
  }

  const permissions =
    rolePermissionMap[
    normalizedRole
    ];

  if (!Array.isArray(permissions)) {
    return Object.freeze([]);
  }

  return Object.freeze([
    ...permissions,
  ]);
}

// ============================================================
// AUTHORIZATION RESULT
// ============================================================

export function createAuthorizationResult({
  decision,
  role = null,
  permission = null,
  reason = null,
} = {}) {
  if (
    !Object.values(
      AUTHORIZATION_DECISION
    ).includes(decision)
  ) {
    throw new TypeError(
      `Unsupported authorization decision: ${decision}`
    );
  }

  const allowed =
    decision ===
    AUTHORIZATION_DECISION.ALLOW;

  return Object.freeze({
    phase:
      AUTHORIZATION_RBAC_PHASE,

    layer:
      AUTHORIZATION_RBAC_LAYER,

    decision,
    allowed,

    role:
      role
        ? normalizeRole(role)
        : null,

    permission:
      permission
        ? normalizePermission(
          permission
        )
        : null,

    reason:
      allowed
        ? null
        : reason ??
        AUTHORIZATION_DENIAL_REASON.PERMISSION_DENIED,

    executableControlGranted:
      false,

    autoDispatchGranted:
      false,

    invariants:
      AUTHORIZATION_RBAC_INVARIANTS,
  });
}

// ============================================================
// MAIN AUTHORIZATION CHECK
// ============================================================

export function authorizePermission({
  authenticated,
  role,
  permission,
  authorizationAvailable = true,
  rolePermissionMap =
  DEFAULT_ROLE_PERMISSION_MAP,
} = {}) {
  if (
    authorizationAvailable !==
    true
  ) {
    return createAuthorizationResult({
      decision:
        AUTHORIZATION_DECISION.UNAVAILABLE,

      role,
      permission,

      reason:
        AUTHORIZATION_DENIAL_REASON
          .AUTHORIZATION_UNAVAILABLE,
    });
  }

  if (authenticated !== true) {
    return createAuthorizationResult({
      decision:
        AUTHORIZATION_DECISION.DENY,

      role,
      permission,

      reason:
        AUTHORIZATION_DENIAL_REASON
          .NOT_AUTHENTICATED,
    });
  }

  const normalizedRole =
    normalizeRole(role);

  const normalizedPermission =
    normalizePermission(
      permission
    );

  if (!normalizedRole) {
    return createAuthorizationResult({
      decision:
        AUTHORIZATION_DECISION.DENY,

      role: null,
      permission:
        normalizedPermission ||
        null,

      reason:
        AUTHORIZATION_DENIAL_REASON
          .ROLE_MISSING,
    });
  }

  if (
    !isKnownRole(
      normalizedRole
    )
  ) {
    return createAuthorizationResult({
      decision:
        AUTHORIZATION_DECISION.DENY,

      role:
        normalizedRole,

      permission:
        normalizedPermission ||
        null,

      reason:
        AUTHORIZATION_DENIAL_REASON
          .ROLE_UNKNOWN,
    });
  }

  if (!normalizedPermission) {
    return createAuthorizationResult({
      decision:
        AUTHORIZATION_DECISION.DENY,

      role:
        normalizedRole,

      permission:
        null,

      reason:
        AUTHORIZATION_DENIAL_REASON
          .PERMISSION_MISSING,
    });
  }

  if (
    normalizedPermission ===
    RBAC_PERMISSIONS
      .EXECUTE_EQUIPMENT_CONTROL
  ) {
    return createAuthorizationResult({
      decision:
        AUTHORIZATION_DECISION.DENY,

      role:
        normalizedRole,

      permission:
        normalizedPermission,

      reason:
        AUTHORIZATION_DENIAL_REASON
          .EQUIPMENT_CONTROL_FORBIDDEN,
    });
  }

  const permissions =
    getPermissionsForRole(
      normalizedRole,
      rolePermissionMap
    );

  const granted =
    permissions.includes(
      normalizedPermission
    );

  return createAuthorizationResult({
    decision:
      granted
        ? AUTHORIZATION_DECISION.ALLOW
        : AUTHORIZATION_DECISION.DENY,

    role:
      normalizedRole,

    permission:
      normalizedPermission,

    reason:
      granted
        ? null
        : AUTHORIZATION_DENIAL_REASON
          .PERMISSION_DENIED,
  });
}

export default authorizePermission;