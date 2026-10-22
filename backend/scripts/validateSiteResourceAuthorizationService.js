// scripts/validateSiteResourceAuthorizationService.js

import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  SITE_RESOURCE_AUTHORIZATION_DECISIONS,
  SITE_RESOURCE_AUTHORIZATION_REASONS,
  authorizeSiteResource,
} from "../services/security/siteResourceAuthorizationService.js";

let assertionsPassed = 0;

function pass(message) {
  assertionsPassed += 1;
  console.log(`PASS ${assertionsPassed}: ${message}`);
}

function ok(condition, message) {
  assert.ok(condition, message);
  pass(message);
}

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  pass(message);
}

function createFakeAccessModel({
  entitlement = null,
  error = null,
} = {}) {
  const calls = [];

  return {
    calls,

    findOne(filter) {
      calls.push({
        operation: "findOne",
        filter,
      });

      return {
        select(selection) {
          calls.push({
            operation: "select",
            selection,
          });

          return {
            async lean() {
              calls.push({
                operation: "lean",
              });

              if (error) {
                throw error;
              }

              return entitlement;
            },
          };
        },
      };
    },
  };
}

const USER_ID =
  "64b000000000000000000001";

const INSTALLATION_ID =
  "64b000000000000000000002";

console.log(`
============================================================
ASHMAAN PORTAL P.1H-C — SITE RESOURCE AUTHORIZATION SERVICE
============================================================
`);

/*
|--------------------------------------------------------------------------
| A. Decision taxonomy
|--------------------------------------------------------------------------
*/

equal(
  SITE_RESOURCE_AUTHORIZATION_DECISIONS.ALLOW,
  "ALLOW",
  "ALLOW decision is explicit"
);

equal(
  SITE_RESOURCE_AUTHORIZATION_DECISIONS.DENY,
  "DENY",
  "DENY decision is explicit"
);

equal(
  SITE_RESOURCE_AUTHORIZATION_DECISIONS.UNAVAILABLE,
  "UNAVAILABLE",
  "UNAVAILABLE decision is explicit"
);

equal(
  SITE_RESOURCE_AUTHORIZATION_REASONS
    .ENTITLEMENT_CONFIRMED,
  "ENTITLEMENT_CONFIRMED",
  "confirmed-entitlement reason is explicit"
);

equal(
  SITE_RESOURCE_AUTHORIZATION_REASONS
    .ENTITLEMENT_NOT_FOUND,
  "ENTITLEMENT_NOT_FOUND",
  "missing-entitlement reason is explicit"
);

equal(
  SITE_RESOURCE_AUTHORIZATION_REASONS
    .ENTITLEMENT_INACTIVE,
  "ENTITLEMENT_INACTIVE",
  "inactive-entitlement reason is explicit"
);

equal(
  SITE_RESOURCE_AUTHORIZATION_REASONS
    .AUTHORIZATION_UNAVAILABLE,
  "AUTHORIZATION_UNAVAILABLE",
  "authorization-unavailable reason is explicit"
);

/*
|--------------------------------------------------------------------------
| B. Active entitlement -> ALLOW
|--------------------------------------------------------------------------
*/

const activeModel =
  createFakeAccessModel({
    entitlement: {
      _id:
        "64b000000000000000000003",
      active: true,
    },
  });

const allowed =
  await authorizeSiteResource({
    userId: USER_ID,
    installationId: INSTALLATION_ID,
    accessModel: activeModel,
  });

equal(
  allowed.decision,
  "ALLOW",
  "active entitlement produces ALLOW"
);

equal(
  allowed.allowed,
  true,
  "ALLOW result exposes allowed=true"
);

equal(
  allowed.reason,
  "ENTITLEMENT_CONFIRMED",
  "ALLOW result identifies confirmed entitlement"
);

equal(
  allowed.userId,
  USER_ID,
  "ALLOW preserves normalized user identity"
);

equal(
  allowed.installationId,
  INSTALLATION_ID,
  "ALLOW preserves normalized installation identity"
);

equal(
  activeModel.calls.length,
  3,
  "authorization performs one injected entitlement query chain"
);

equal(
  activeModel.calls[0].filter.user,
  USER_ID,
  "entitlement lookup is scoped to authenticated user"
);

equal(
  activeModel.calls[0].filter.installation,
  INSTALLATION_ID,
  "entitlement lookup is scoped to installation"
);

equal(
  activeModel.calls[1].selection.active,
  1,
  "authorization reads entitlement active state"
);

/*
|--------------------------------------------------------------------------
| C. Missing entitlement -> DENY
|--------------------------------------------------------------------------
*/

const missingModel =
  createFakeAccessModel({
    entitlement: null,
  });

const missing =
  await authorizeSiteResource({
    userId: USER_ID,
    installationId: INSTALLATION_ID,
    accessModel: missingModel,
  });

equal(
  missing.decision,
  "DENY",
  "missing entitlement produces DENY"
);

equal(
  missing.allowed,
  false,
  "missing entitlement never grants access"
);

equal(
  missing.reason,
  "ENTITLEMENT_NOT_FOUND",
  "missing entitlement has explicit reason"
);

/*
|--------------------------------------------------------------------------
| D. Inactive entitlement -> DENY
|--------------------------------------------------------------------------
*/

const inactiveModel =
  createFakeAccessModel({
    entitlement: {
      active: false,
    },
  });

const inactive =
  await authorizeSiteResource({
    userId: USER_ID,
    installationId: INSTALLATION_ID,
    accessModel: inactiveModel,
  });

equal(
  inactive.decision,
  "DENY",
  "inactive entitlement produces DENY"
);

equal(
  inactive.allowed,
  false,
  "inactive entitlement never grants access"
);

equal(
  inactive.reason,
  "ENTITLEMENT_INACTIVE",
  "inactive entitlement has explicit reason"
);

/*
|--------------------------------------------------------------------------
| E. Missing user identity -> DENY without repository query
|--------------------------------------------------------------------------
*/

const missingUserModel =
  createFakeAccessModel({
    entitlement: {
      active: true,
    },
  });

const missingUser =
  await authorizeSiteResource({
    installationId: INSTALLATION_ID,
    accessModel: missingUserModel,
  });

equal(
  missingUser.decision,
  "DENY",
  "missing user identity produces DENY"
);

equal(
  missingUser.allowed,
  false,
  "missing user identity never grants access"
);

equal(
  missingUser.reason,
  "USER_ID_MISSING",
  "missing user identity has explicit reason"
);

equal(
  missingUserModel.calls.length,
  0,
  "missing user identity performs no entitlement query"
);

/*
|--------------------------------------------------------------------------
| F. Invalid user identity -> DENY
|--------------------------------------------------------------------------
*/

const invalidUserModel =
  createFakeAccessModel({
    entitlement: {
      active: true,
    },
  });

const invalidUser =
  await authorizeSiteResource({
    userId: "not-an-object-id",
    installationId: INSTALLATION_ID,
    accessModel: invalidUserModel,
  });

equal(
  invalidUser.decision,
  "DENY",
  "invalid user identity produces DENY"
);

equal(
  invalidUser.allowed,
  false,
  "invalid user identity never grants access"
);

equal(
  invalidUser.reason,
  "USER_ID_INVALID",
  "invalid user identity has explicit reason"
);

equal(
  invalidUserModel.calls.length,
  0,
  "invalid user identity performs no entitlement query"
);

/*
|--------------------------------------------------------------------------
| G. Missing installation identity -> DENY
|--------------------------------------------------------------------------
*/

const missingInstallationModel =
  createFakeAccessModel({
    entitlement: {
      active: true,
    },
  });

const missingInstallation =
  await authorizeSiteResource({
    userId: USER_ID,
    accessModel: missingInstallationModel,
  });

equal(
  missingInstallation.decision,
  "DENY",
  "missing installation identity produces DENY"
);

equal(
  missingInstallation.allowed,
  false,
  "missing installation identity never grants access"
);

equal(
  missingInstallation.reason,
  "INSTALLATION_ID_MISSING",
  "missing installation identity has explicit reason"
);

equal(
  missingInstallationModel.calls.length,
  0,
  "missing installation identity performs no entitlement query"
);

/*
|--------------------------------------------------------------------------
| H. Invalid installation identity -> DENY
|--------------------------------------------------------------------------
*/

const invalidInstallationModel =
  createFakeAccessModel({
    entitlement: {
      active: true,
    },
  });

const invalidInstallation =
  await authorizeSiteResource({
    userId: USER_ID,
    installationId: "not-an-object-id",
    accessModel: invalidInstallationModel,
  });

equal(
  invalidInstallation.decision,
  "DENY",
  "invalid installation identity produces DENY"
);

equal(
  invalidInstallation.allowed,
  false,
  "invalid installation identity never grants access"
);

equal(
  invalidInstallation.reason,
  "INSTALLATION_ID_INVALID",
  "invalid installation identity has explicit reason"
);

equal(
  invalidInstallationModel.calls.length,
  0,
  "invalid installation identity performs no entitlement query"
);

/*
|--------------------------------------------------------------------------
| I. Repository failure -> UNAVAILABLE
|--------------------------------------------------------------------------
*/

const failingModel =
  createFakeAccessModel({
    error:
      new Error(
        "simulated repository failure"
      ),
  });

const unavailable =
  await authorizeSiteResource({
    userId: USER_ID,
    installationId: INSTALLATION_ID,
    accessModel: failingModel,
  });

equal(
  unavailable.decision,
  "UNAVAILABLE",
  "repository failure produces UNAVAILABLE"
);

equal(
  unavailable.allowed,
  false,
  "UNAVAILABLE never grants access"
);

equal(
  unavailable.reason,
  "AUTHORIZATION_UNAVAILABLE",
  "repository failure has explicit unavailable reason"
);

/*
|--------------------------------------------------------------------------
| J. No role-based bypass
|--------------------------------------------------------------------------
*/

const adminMissingModel =
  createFakeAccessModel({
    entitlement: null,
  });

const adminLikeRequest =
  await authorizeSiteResource({
    userId: USER_ID,
    installationId: INSTALLATION_ID,

    // Deliberately irrelevant input.
    role: "ADMINISTRATOR",

    accessModel: adminMissingModel,
  });

equal(
  adminLikeRequest.decision,
  "DENY",
  "ADMINISTRATOR-like input does not bypass missing entitlement"
);

const serviceMissingModel =
  createFakeAccessModel({
    entitlement: null,
  });

const serviceLikeRequest =
  await authorizeSiteResource({
    userId: USER_ID,
    installationId: INSTALLATION_ID,
    role: "SERVICE",
    accessModel: serviceMissingModel,
  });

equal(
  serviceLikeRequest.decision,
  "DENY",
  "SERVICE-like input does not bypass missing entitlement"
);

const systemMissingModel =
  createFakeAccessModel({
    entitlement: null,
  });

const systemLikeRequest =
  await authorizeSiteResource({
    userId: USER_ID,
    installationId: INSTALLATION_ID,
    role: "SYSTEM",
    accessModel: systemMissingModel,
  });

equal(
  systemLikeRequest.decision,
  "DENY",
  "SYSTEM-like input does not bypass missing entitlement"
);

/*
|--------------------------------------------------------------------------
| K. No permission-map duplication
|--------------------------------------------------------------------------
*/

const permissionMissingModel =
  createFakeAccessModel({
    entitlement: null,
  });

const permissionLikeRequest =
  await authorizeSiteResource({
    userId: USER_ID,
    installationId: INSTALLATION_ID,
    permission: "READ_DASHBOARD",
    accessModel: permissionMissingModel,
  });

equal(
  permissionLikeRequest.decision,
  "DENY",
  "RBAC permission input does not substitute for entitlement"
);

/*
|--------------------------------------------------------------------------
| L. No vrmSiteId inference
|--------------------------------------------------------------------------
*/

const vrmOnlyModel =
  createFakeAccessModel({
    entitlement: {
      active: true,
    },
  });

const vrmOnly =
  await authorizeSiteResource({
    userId: USER_ID,
    vrmSiteId: "18053",
    accessModel: vrmOnlyModel,
  });

equal(
  vrmOnly.decision,
  "DENY",
  "vrmSiteId is not inferred as installation ObjectId"
);

equal(
  vrmOnly.reason,
  "INSTALLATION_ID_MISSING",
  "vrmSiteId-only request fails closed on missing installation identity"
);

equal(
  vrmOnlyModel.calls.length,
  0,
  "vrmSiteId-only request performs no entitlement lookup"
);

/*
|--------------------------------------------------------------------------
| M. Safety invariants
|--------------------------------------------------------------------------
*/

equal(
  allowed.equipmentControlAllowed,
  false,
  "ALLOW does not grant equipment control"
);

equal(
  allowed.automaticDispatchAllowed,
  false,
  "ALLOW does not grant automatic dispatch"
);

equal(
  unavailable.equipmentControlAllowed,
  false,
  "UNAVAILABLE does not grant equipment control"
);

equal(
  unavailable.automaticDispatchAllowed,
  false,
  "UNAVAILABLE does not grant automatic dispatch"
);

/*
|--------------------------------------------------------------------------
| N. Result immutability
|--------------------------------------------------------------------------
*/

ok(
  Object.isFrozen(allowed),
  "ALLOW result is immutable"
);

ok(
  Object.isFrozen(missing),
  "DENY result is immutable"
);

ok(
  Object.isFrozen(unavailable),
  "UNAVAILABLE result is immutable"
);

/*
|--------------------------------------------------------------------------
| O. Runtime isolation
|--------------------------------------------------------------------------
*/

equal(
  mongoose.connection.readyState,
  0,
  "behavioral validator establishes no MongoDB connection"
);

/*
|--------------------------------------------------------------------------
| P. Completion
|--------------------------------------------------------------------------
*/

pass(
  "P.1H-C site resource authorization assertion plan completed"
);

console.log(`
------------------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1H-C SITE RESOURCE AUTHORIZATION SERVICE VALIDATION PASSED
------------------------------------------------------------

Boundary: entitlement decision   = IMPLEMENTED
Boundary: RBAC                   = SEPARATE
Boundary: vrmSiteId resolution   = NOT INCLUDED
Boundary: HTTP middleware        = NOT INCLUDED
Boundary: route enforcement      = NOT INCLUDED
Boundary: production indexes     = NOT PROVEN
Boundary: Atlas activity         = NONE
Boundary: equipment control      = NOT INCLUDED
Boundary: automatic dispatch     = NOT INCLUDED
`);
