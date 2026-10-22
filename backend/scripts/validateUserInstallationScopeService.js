// scripts/validateUserInstallationScopeService.js

import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  USER_INSTALLATION_SCOPE_STATUS,
  USER_INSTALLATION_SCOPE_REASONS,
  normalizeUserId,
  getUserInstallationScope,
} from "../services/security/userInstallationScopeService.js";

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
  installationIds = [],
  error = null,
} = {}) {
  const calls = [];

  return {
    calls,

    async distinct(
      field,
      filter
    ) {
      calls.push({
        field,
        filter,
      });

      if (error) {
        throw error;
      }

      return installationIds;
    },
  };
}

const USER_ID =
  "64b000000000000000000001";

const INSTALLATION_A =
  new mongoose.Types.ObjectId(
    "64b000000000000000000002"
  );

const INSTALLATION_B =
  new mongoose.Types.ObjectId(
    "64b000000000000000000003"
  );

console.log(`
============================================================
ASHMAAN PORTAL P.1H-E3 — USER INSTALLATION SCOPE SERVICE
============================================================
`);

/*
|--------------------------------------------------------------------------
| A. Status contract
|--------------------------------------------------------------------------
*/

equal(
  USER_INSTALLATION_SCOPE_STATUS.RESOLVED,
  "RESOLVED",
  "RESOLVED scope status is explicit"
);

equal(
  USER_INSTALLATION_SCOPE_STATUS.DENY,
  "DENY",
  "DENY scope status is explicit"
);

equal(
  USER_INSTALLATION_SCOPE_STATUS.UNAVAILABLE,
  "UNAVAILABLE",
  "UNAVAILABLE scope status is explicit"
);

equal(
  USER_INSTALLATION_SCOPE_REASONS.SCOPE_RESOLVED,
  "SCOPE_RESOLVED",
  "resolved-scope reason is explicit"
);

equal(
  USER_INSTALLATION_SCOPE_REASONS.USER_ID_MISSING,
  "USER_ID_MISSING",
  "missing-user reason is explicit"
);

equal(
  USER_INSTALLATION_SCOPE_REASONS.USER_ID_INVALID,
  "USER_ID_INVALID",
  "invalid-user reason is explicit"
);

equal(
  USER_INSTALLATION_SCOPE_REASONS.SCOPE_UNAVAILABLE,
  "SCOPE_UNAVAILABLE",
  "scope-unavailable reason is explicit"
);

/*
|--------------------------------------------------------------------------
| B. User identity normalization
|--------------------------------------------------------------------------
*/

equal(
  normalizeUserId(USER_ID),
  USER_ID,
  "valid user ObjectId string is preserved"
);

equal(
  normalizeUserId(` ${USER_ID} `),
  USER_ID,
  "user identity whitespace is removed"
);

equal(
  normalizeUserId(undefined),
  null,
  "undefined user identity normalizes to null"
);

equal(
  normalizeUserId(null),
  null,
  "null user identity normalizes to null"
);

equal(
  normalizeUserId("   "),
  null,
  "blank user identity normalizes to null"
);

equal(
  normalizeUserId("not-an-object-id"),
  false,
  "malformed user identity is rejected"
);

/*
|--------------------------------------------------------------------------
| C. Active entitlement scope
|--------------------------------------------------------------------------
*/

const populatedModel =
  createFakeAccessModel({
    installationIds: [
      INSTALLATION_A,
      INSTALLATION_B,
    ],
  });

const populated =
  await getUserInstallationScope({
    userId: USER_ID,
    accessModel: populatedModel,
  });

equal(
  populated.status,
  "RESOLVED",
  "valid entitlement query produces RESOLVED"
);

equal(
  populated.resolved,
  true,
  "resolved scope exposes resolved=true"
);

equal(
  populated.allowed,
  true,
  "resolved scope permits scoped data access"
);

equal(
  populated.reason,
  "SCOPE_RESOLVED",
  "resolved scope has explicit reason"
);

equal(
  populated.userId,
  USER_ID,
  "resolved scope preserves authenticated user identity"
);

equal(
  populated.count,
  2,
  "resolved scope reports entitlement count"
);

equal(
  populated.installationIds[0],
  String(INSTALLATION_A),
  "first Installation ObjectId is normalized to string"
);

equal(
  populated.installationIds[1],
  String(INSTALLATION_B),
  "second Installation ObjectId is normalized to string"
);

equal(
  populatedModel.calls.length,
  1,
  "scope performs exactly one entitlement distinct query"
);

equal(
  populatedModel.calls[0].field,
  "installation",
  "scope derives canonical installation identities"
);

equal(
  populatedModel.calls[0].filter.user,
  USER_ID,
  "scope query is constrained to authenticated user"
);

equal(
  populatedModel.calls[0].filter.active,
  true,
  "scope query includes active entitlements only"
);

/*
|--------------------------------------------------------------------------
| D. Zero entitlements = resolved empty scope
|--------------------------------------------------------------------------
*/

const emptyModel =
  createFakeAccessModel({
    installationIds: [],
  });

const empty =
  await getUserInstallationScope({
    userId: USER_ID,
    accessModel: emptyModel,
  });

equal(
  empty.status,
  "RESOLVED",
  "zero entitlements remains a resolved scope"
);

equal(
  empty.allowed,
  true,
  "zero-entitlement scope is valid for scoped query execution"
);

equal(
  empty.count,
  0,
  "zero entitlements produces count zero"
);

ok(
  Array.isArray(
    empty.installationIds
  ),
  "zero-entitlement scope contains an installation array"
);

equal(
  empty.installationIds.length,
  0,
  "zero-entitlement scope remains an empty set"
);

ok(
  empty.installationIds !== null,
  "empty entitlement scope is not represented as null"
);

/*
|--------------------------------------------------------------------------
| E. Missing user fails before repository query
|--------------------------------------------------------------------------
*/

const missingModel =
  createFakeAccessModel({
    installationIds: [
      INSTALLATION_A,
    ],
  });

const missing =
  await getUserInstallationScope({
    accessModel: missingModel,
  });

equal(
  missing.status,
  "DENY",
  "missing user identity produces DENY"
);

equal(
  missing.allowed,
  false,
  "missing user identity does not allow scoped access"
);

equal(
  missing.reason,
  "USER_ID_MISSING",
  "missing user identity has explicit reason"
);

equal(
  missingModel.calls.length,
  0,
  "missing user identity performs no entitlement query"
);

/*
|--------------------------------------------------------------------------
| F. Invalid user fails before repository query
|--------------------------------------------------------------------------
*/

const invalidModel =
  createFakeAccessModel({
    installationIds: [
      INSTALLATION_A,
    ],
  });

const invalid =
  await getUserInstallationScope({
    userId:
      "not-an-object-id",

    accessModel:
      invalidModel,
  });

equal(
  invalid.status,
  "DENY",
  "invalid user identity produces DENY"
);

equal(
  invalid.allowed,
  false,
  "invalid user identity does not allow scoped access"
);

equal(
  invalid.reason,
  "USER_ID_INVALID",
  "invalid user identity has explicit reason"
);

equal(
  invalidModel.calls.length,
  0,
  "invalid user identity performs no entitlement query"
);

/*
|--------------------------------------------------------------------------
| G. Repository failure
|--------------------------------------------------------------------------
*/

const failingModel =
  createFakeAccessModel({
    error:
      new Error(
        "simulated entitlement repository failure"
      ),
  });

const unavailable =
  await getUserInstallationScope({
    userId: USER_ID,
    accessModel: failingModel,
  });

equal(
  unavailable.status,
  "UNAVAILABLE",
  "repository failure produces UNAVAILABLE"
);

equal(
  unavailable.allowed,
  false,
  "UNAVAILABLE scope never permits data access"
);

equal(
  unavailable.reason,
  "SCOPE_UNAVAILABLE",
  "repository failure has explicit unavailable reason"
);

equal(
  unavailable.count,
  0,
  "UNAVAILABLE scope exposes no installation count"
);

equal(
  unavailable.installationIds.length,
  0,
  "UNAVAILABLE scope exposes no installation identities"
);

/*
|--------------------------------------------------------------------------
| H. Immutability
|--------------------------------------------------------------------------
*/

ok(
  Object.isFrozen(populated),
  "resolved scope result is immutable"
);

ok(
  Object.isFrozen(
    populated.installationIds
  ),
  "resolved installation identity set is immutable"
);

ok(
  Object.isFrozen(empty),
  "empty resolved scope is immutable"
);

ok(
  Object.isFrozen(
    empty.installationIds
  ),
  "empty installation identity set is immutable"
);

ok(
  Object.isFrozen(unavailable),
  "UNAVAILABLE result is immutable"
);

/*
|--------------------------------------------------------------------------
| I. No authorization-domain leakage
|--------------------------------------------------------------------------
*/

ok(
  !Object.prototype.hasOwnProperty.call(
    populated,
    "role"
  ),
  "scope does not duplicate RBAC role"
);

ok(
  !Object.prototype.hasOwnProperty.call(
    populated,
    "permission"
  ),
  "scope does not duplicate RBAC permission"
);

ok(
  !Object.prototype.hasOwnProperty.call(
    populated,
    "vrmSiteIds"
  ),
  "scope does not duplicate external vrmSiteId identities"
);

ok(
  !Object.prototype.hasOwnProperty.call(
    populated,
    "equipmentControlAllowed"
  ),
  "scope grants no equipment-control authority"
);

ok(
  !Object.prototype.hasOwnProperty.call(
    populated,
    "automaticDispatchAllowed"
  ),
  "scope grants no automatic-dispatch authority"
);

/*
|--------------------------------------------------------------------------
| J. Runtime isolation
|--------------------------------------------------------------------------
*/

equal(
  mongoose.connection.readyState,
  0,
  "scope validator establishes no MongoDB connection"
);

/*
|--------------------------------------------------------------------------
| K. Completion
|--------------------------------------------------------------------------
*/

pass(
  "P.1H-E3 installation-scope assertion plan completed"
);

console.log(`
------------------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1H-E3 USER INSTALLATION SCOPE SERVICE VALIDATION PASSED
------------------------------------------------------------

Boundary: principal identity     = User._id
Boundary: scope identity         = Installation._id
Boundary: active assignments     = ONLY
Boundary: empty entitlement set  = EMPTY SCOPE
Boundary: fleet fallback         = NONE
Boundary: RBAC                   = SEPARATE
Boundary: collection integration = NOT YET INCLUDED
Boundary: aggregate integration  = NOT YET INCLUDED
Boundary: Atlas activity         = NONE
`);