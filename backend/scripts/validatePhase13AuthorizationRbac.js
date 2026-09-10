import assert from "node:assert/strict";

import {
  AUTHORIZATION_RBAC_PHASE,
  AUTHORIZATION_RBAC_LAYER,
  RBAC_ROLES,
  RBAC_PERMISSIONS,
  AUTHORIZATION_DECISION,
  AUTHORIZATION_DENIAL_REASON,
  DEFAULT_ROLE_PERMISSION_MAP,
  AUTHORIZATION_RBAC_INVARIANTS,
  isKnownRole,
  isKnownPermission,
  getPermissionsForRole,
  createAuthorizationResult,
  authorizePermission,
} from "../services/security/authorizationRbacService.js";

let passed = 0;

function check(condition, message) {
  assert.ok(condition, message);
  passed += 1;
  console.log(
    `PASS ${passed}: ${message}`
  );
}

function section(title) {
  console.log(
    `\n--- ${title} ---`
  );
}

console.log(
  "\n========================================================================"
);

console.log(
  "ASHMAAN PHASE 13.4 — AUTHORIZATION / RBAC VALIDATION"
);

console.log(
  "========================================================================"
);

try {
  // ============================================================
  // A. IDENTITY
  // ============================================================

  section(
    "A. Phase identity"
  );

  check(
    AUTHORIZATION_RBAC_PHASE ===
      "13.4",
    "phase identity is 13.4"
  );

  check(
    AUTHORIZATION_RBAC_LAYER ===
      "AUTHORIZATION_AND_RBAC",
    "layer identity is AUTHORIZATION_AND_RBAC"
  );

  // ============================================================
  // B. ROLE TAXONOMY
  // ============================================================

  section(
    "B. Role taxonomy"
  );

  const requiredRoles = [
    "USER",
    "OPERATOR",
    "ADMINISTRATOR",
    "SERVICE",
    "SYSTEM",
  ];

  for (
    const role of requiredRoles
  ) {
    check(
      Object.values(
        RBAC_ROLES
      ).includes(role),
      `RBAC role exists: ${role}`
    );
  }

  // ============================================================
  // C. PERMISSION TAXONOMY
  // ============================================================

  section(
    "C. Permission taxonomy"
  );

  const requiredPermissions = [
    "READ_DASHBOARD",
    "READ_ENGINEERING_ANALYTICS",
    "READ_FORECASTING",
    "READ_FINANCIAL_BI",
    "READ_OPTIMIZATION_DSS",
    "MANAGE_USERS",
    "MANAGE_SECURITY",
    "READ_AUDIT_LOG",
    "EXECUTE_EQUIPMENT_CONTROL",
  ];

  for (
    const permission of
      requiredPermissions
  ) {
    check(
      Object.values(
        RBAC_PERMISSIONS
      ).includes(permission),
      `RBAC permission exists: ${permission}`
    );
  }

  // ============================================================
  // D. DECISION TAXONOMY
  // ============================================================

  section(
    "D. Authorization decision taxonomy"
  );

  check(
    AUTHORIZATION_DECISION.ALLOW ===
      "ALLOW",
    "ALLOW authorization decision exists"
  );

  check(
    AUTHORIZATION_DECISION.DENY ===
      "DENY",
    "DENY authorization decision exists"
  );

  check(
    AUTHORIZATION_DECISION.UNAVAILABLE ===
      "UNAVAILABLE",
    "UNAVAILABLE authorization decision exists"
  );

  // ============================================================
  // E. DENIAL REASONS
  // ============================================================

  section(
    "E. Denial reason taxonomy"
  );

  const requiredReasons = [
    "NOT_AUTHENTICATED",
    "ROLE_MISSING",
    "ROLE_UNKNOWN",
    "PERMISSION_MISSING",
    "PERMISSION_DENIED",
    "AUTHORIZATION_UNAVAILABLE",
    "EQUIPMENT_CONTROL_FORBIDDEN",
  ];

  for (
    const reason of
      requiredReasons
  ) {
    check(
      Object.values(
        AUTHORIZATION_DENIAL_REASON
      ).includes(reason),
      `authorization denial reason exists: ${reason}`
    );
  }

  // ============================================================
  // F. ROLE PERMISSION MAP
  // ============================================================

  section(
    "F. Role / permission map"
  );

  for (
    const role of requiredRoles
  ) {
    check(
      Array.isArray(
        DEFAULT_ROLE_PERMISSION_MAP[
          role
        ]
      ),
      `${role} has explicit permission mapping`
    );
  }

  check(
    DEFAULT_ROLE_PERMISSION_MAP
      .USER
      .includes(
        RBAC_PERMISSIONS
          .READ_DASHBOARD
      ),
    "USER may read dashboard"
  );

  check(
    !DEFAULT_ROLE_PERMISSION_MAP
      .USER
      .includes(
        RBAC_PERMISSIONS
          .MANAGE_USERS
      ),
    "USER may not manage users"
  );

  check(
    DEFAULT_ROLE_PERMISSION_MAP
      .ADMINISTRATOR
      .includes(
        RBAC_PERMISSIONS
          .MANAGE_USERS
      ),
    "ADMINISTRATOR may manage users"
  );

  check(
    DEFAULT_ROLE_PERMISSION_MAP
      .ADMINISTRATOR
      .includes(
        RBAC_PERMISSIONS
          .MANAGE_SECURITY
      ),
    "ADMINISTRATOR may manage security"
  );

  check(
    !Object.values(
      DEFAULT_ROLE_PERMISSION_MAP
    ).some(
      (permissions) =>
        permissions.includes(
          RBAC_PERMISSIONS
            .EXECUTE_EQUIPMENT_CONTROL
        )
    ),
    "no role receives equipment-control permission"
  );

  // ============================================================
  // G. ROLE / PERMISSION HELPERS
  // ============================================================

  section(
    "G. Role / permission helpers"
  );

  check(
    isKnownRole("USER") ===
      true,
    "known USER role is recognized"
  );

  check(
    isKnownRole("administrator") ===
      true,
    "role normalization is case-insensitive"
  );

  check(
    isKnownRole("UNKNOWN_ROLE") ===
      false,
    "unknown role is rejected"
  );

  check(
    isKnownPermission(
      "READ_FORECASTING"
    ) === true,
    "known permission is recognized"
  );

  check(
    isKnownPermission(
      "read_financial_bi"
    ) === true,
    "permission normalization is case-insensitive"
  );

  check(
    isKnownPermission(
      "FAKE_PERMISSION"
    ) === false,
    "unknown permission is rejected"
  );

  const adminPermissions =
    getPermissionsForRole(
      "ADMINISTRATOR"
    );

  check(
    adminPermissions.includes(
      RBAC_PERMISSIONS
        .MANAGE_SECURITY
    ),
    "administrator permission lookup succeeds"
  );

  check(
    getPermissionsForRole(
      "UNKNOWN_ROLE"
    ).length === 0,
    "unknown role receives zero permissions"
  );

  // ============================================================
  // H. CORE INVARIANTS
  // ============================================================

  section(
    "H. Core authorization invariants"
  );

  const requiredInvariantNames = [
    "defaultDeny",
    "authenticationDoesNotImplyAuthorization",
    "explicitPermissionRequired",
    "leastPrivilegeRequired",
    "unknownRoleMustBeDenied",
    "missingRoleMustBeDenied",
    "missingPermissionMustBeDenied",
    "unavailableAuthorizationMustNotAllow",
    "optimizationDssRemainsAdvisoryOnly",
  ];

  for (
    const name of
      requiredInvariantNames
  ) {
    check(
      AUTHORIZATION_RBAC_INVARIANTS[
        name
      ] === true,
      `authorization invariant enforced: ${name}`
    );
  }

  check(
    AUTHORIZATION_RBAC_INVARIANTS
      .equipmentControlPermissionAssigned ===
      false,
    "equipment-control permission is not assigned"
  );

  check(
    AUTHORIZATION_RBAC_INVARIANTS
      .optimizationDssExecutable ===
      false,
    "Optimization/DSS remains non-executable"
  );

  check(
    AUTHORIZATION_RBAC_INVARIANTS
      .optimizationDssAutoDispatch ===
      false,
    "Optimization/DSS auto-dispatch remains disabled"
  );

  // ============================================================
  // I. AUTHENTICATION REQUIRED
  // ============================================================

  section(
    "I. Authentication prerequisite"
  );

  const unauthenticated =
    authorizePermission({
      authenticated: false,
      role: "ADMINISTRATOR",
      permission:
        "MANAGE_SECURITY",
    });

  check(
    unauthenticated.decision ===
      AUTHORIZATION_DECISION.DENY,
    "unauthenticated request is denied"
  );

  check(
    unauthenticated.allowed ===
      false,
    "unauthenticated request has allowed=false"
  );

  check(
    unauthenticated.reason ===
      AUTHORIZATION_DENIAL_REASON
        .NOT_AUTHENTICATED,
    "unauthenticated denial reason is explicit"
  );

  // ============================================================
  // J. ALLOW CASE
  // ============================================================

  section(
    "J. Explicit allow case"
  );

  const allowed =
    authorizePermission({
      authenticated: true,
      role: "ADMINISTRATOR",
      permission:
        "MANAGE_SECURITY",
    });

  check(
    allowed.decision ===
      AUTHORIZATION_DECISION.ALLOW,
    "qualified administrator permission is allowed"
  );

  check(
    allowed.allowed === true,
    "qualified permission produces allowed=true"
  );

  check(
    allowed.role ===
      "ADMINISTRATOR",
    "authorized role is preserved"
  );

  check(
    allowed.permission ===
      "MANAGE_SECURITY",
    "authorized permission is preserved"
  );

  check(
    allowed.reason === null,
    "allowed authorization has no denial reason"
  );

  // ============================================================
  // K. LEAST PRIVILEGE
  // ============================================================

  section(
    "K. Least privilege"
  );

  const deniedUserAdmin =
    authorizePermission({
      authenticated: true,
      role: "USER",
      permission:
        "MANAGE_SECURITY",
    });

  check(
    deniedUserAdmin.decision ===
      AUTHORIZATION_DECISION.DENY,
    "USER cannot manage security"
  );

  check(
    deniedUserAdmin.reason ===
      AUTHORIZATION_DENIAL_REASON
        .PERMISSION_DENIED,
    "insufficient permission is explicitly denied"
  );

  const operatorRead =
    authorizePermission({
      authenticated: true,
      role: "OPERATOR",
      permission:
        "READ_AUDIT_LOG",
    });

  check(
    operatorRead.allowed ===
      true,
    "OPERATOR may read audit log"
  );

  const serviceAdmin =
    authorizePermission({
      authenticated: true,
      role: "SERVICE",
      permission:
        "MANAGE_USERS",
    });

  check(
    serviceAdmin.allowed ===
      false,
    "SERVICE identity does not receive administrative privilege"
  );

  // ============================================================
  // L. MISSING / UNKNOWN ROLE
  // ============================================================

  section(
    "L. Missing and unknown role handling"
  );

  const missingRole =
    authorizePermission({
      authenticated: true,
      permission:
        "READ_FORECASTING",
    });

  check(
    missingRole.allowed ===
      false,
    "missing role is denied"
  );

  check(
    missingRole.reason ===
      AUTHORIZATION_DENIAL_REASON
        .ROLE_MISSING,
    "missing role has explicit reason"
  );

  const unknownRole =
    authorizePermission({
      authenticated: true,
      role: "SUPERUSER",
      permission:
        "READ_FORECASTING",
    });

  check(
    unknownRole.allowed ===
      false,
    "unknown role is denied"
  );

  check(
    unknownRole.reason ===
      AUTHORIZATION_DENIAL_REASON
        .ROLE_UNKNOWN,
    "unknown role has explicit reason"
  );

  // ============================================================
  // M. MISSING PERMISSION
  // ============================================================

  section(
    "M. Missing permission handling"
  );

  const missingPermission =
    authorizePermission({
      authenticated: true,
      role: "USER",
    });

  check(
    missingPermission.allowed ===
      false,
    "missing permission is denied"
  );

  check(
    missingPermission.reason ===
      AUTHORIZATION_DENIAL_REASON
        .PERMISSION_MISSING,
    "missing permission has explicit reason"
  );

  // ============================================================
  // N. AUTHORIZATION UNAVAILABLE
  // ============================================================

  section(
    "N. Authorization unavailable behavior"
  );

  const unavailable =
    authorizePermission({
      authenticated: true,
      role: "ADMINISTRATOR",
      permission:
        "MANAGE_SECURITY",
      authorizationAvailable:
        false,
    });

  check(
    unavailable.decision ===
      AUTHORIZATION_DECISION.UNAVAILABLE,
    "authorization failure is represented as UNAVAILABLE"
  );

  check(
    unavailable.allowed ===
      false,
    "UNAVAILABLE authorization never becomes ALLOW"
  );

  check(
    unavailable.reason ===
      AUTHORIZATION_DENIAL_REASON
        .AUTHORIZATION_UNAVAILABLE,
    "UNAVAILABLE reason is explicit"
  );

  // ============================================================
  // O. EQUIPMENT CONTROL BOUNDARY
  // ============================================================

  section(
    "O. Equipment-control boundary"
  );

  for (
    const role of requiredRoles
  ) {
    const result =
      authorizePermission({
        authenticated: true,
        role,
        permission:
          RBAC_PERMISSIONS
            .EXECUTE_EQUIPMENT_CONTROL,
      });

    check(
      result.allowed === false,
      `${role} cannot receive equipment-control execution`
    );

    check(
      result.reason ===
        AUTHORIZATION_DENIAL_REASON
          .EQUIPMENT_CONTROL_FORBIDDEN,
      `${role} equipment-control denial is explicit`
    );

    check(
      result.executableControlGranted ===
        false,
      `${role} receives no executable-control grant`
    );

    check(
      result.autoDispatchGranted ===
        false,
      `${role} receives no auto-dispatch grant`
    );
  }

  // ============================================================
  // P. RESULT CONTRACT
  // ============================================================

  section(
    "P. Authorization result contract"
  );

  const explicitResult =
    createAuthorizationResult({
      decision:
        AUTHORIZATION_DECISION.DENY,
      role: "USER",
      permission:
        "MANAGE_USERS",
      reason:
        AUTHORIZATION_DENIAL_REASON
          .PERMISSION_DENIED,
    });

  check(
    explicitResult.phase ===
      "13.4",
    "authorization result preserves phase"
  );

  check(
    explicitResult.layer ===
      "AUTHORIZATION_AND_RBAC",
    "authorization result preserves layer"
  );

  check(
    explicitResult.allowed ===
      false,
    "DENY result preserves allowed=false"
  );

  check(
    explicitResult.executableControlGranted ===
      false,
    "authorization result cannot grant executable control"
  );

  check(
    explicitResult.autoDispatchGranted ===
      false,
    "authorization result cannot grant auto-dispatch"
  );

  // ============================================================
  // Q. INVALID DECISION
  // ============================================================

  section(
    "Q. Invalid decision rejection"
  );

  let invalidDecisionRejected =
    false;

  try {
    createAuthorizationResult({
      decision:
        "INVALID_DECISION",
    });
  } catch {
    invalidDecisionRejected =
      true;
  }

  check(
    invalidDecisionRejected,
    "unsupported authorization decision is rejected"
  );

  // ============================================================
  // R. FROZEN STRUCTURES
  // ============================================================

  section(
    "R. Frozen security structures"
  );

  check(
    Object.isFrozen(
      RBAC_ROLES
    ),
    "RBAC role taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      RBAC_PERMISSIONS
    ),
    "RBAC permission taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      AUTHORIZATION_DECISION
    ),
    "authorization decision taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      AUTHORIZATION_DENIAL_REASON
    ),
    "authorization denial taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DEFAULT_ROLE_PERMISSION_MAP
    ),
    "default role-permission map is frozen"
  );

  check(
    Object.isFrozen(
      AUTHORIZATION_RBAC_INVARIANTS
    ),
    "authorization invariants are frozen"
  );

  check(
    Object.isFrozen(
      allowed
    ),
    "authorization result is frozen"
  );

  // ============================================================
  // FINAL RESULT
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.4 AUTHORIZATION / RBAC RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Default authorization       : DENY"
  );

  console.log(
    "Authentication ≠ authorization: ENFORCED"
  );

  console.log(
    "Explicit permission         : REQUIRED"
  );

  console.log(
    "Least privilege             : ENFORCED"
  );

  console.log(
    "Unknown role                : DENIED"
  );

  console.log(
    "Missing role                : DENIED"
  );

  console.log(
    "Missing permission          : DENIED"
  );

  console.log(
    "Authorization unavailable   : NOT ALLOWED"
  );

  console.log(
    "Equipment control           : FORBIDDEN"
  );

  console.log(
    "Optimization/DSS execution  : DISABLED"
  );

  console.log(
    "Auto-dispatch               : DISABLED"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    `\nAssertions passed: ${passed}`
  );

  console.log(
    "ASHMAAN PHASE 13.4 AUTHORIZATION / RBAC VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.4 AUTHORIZATION / RBAC VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}