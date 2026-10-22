// scripts/validateUserInstallationAccessModel.js

import assert from "node:assert/strict";

import mongoose from "mongoose";

import UserInstallationAccess
  from "../models/UserInstallationAccess.js";

let assertionsPassed = 0;

function pass(message) {
  assertionsPassed += 1;

  console.log(
    `PASS ${assertionsPassed}: ${message}`
  );
}

function ok(condition, message) {
  assert.ok(condition, message);
  pass(message);
}

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  pass(message);
}

console.log(`
============================================================
ASHMAAN PORTAL P.1H-B — USER INSTALLATION ACCESS MODEL
============================================================
`);

/*
|--------------------------------------------------------------------------
| A. Model identity
|--------------------------------------------------------------------------
*/

equal(
  UserInstallationAccess.modelName,
  "UserInstallationAccess",
  "entitlement model name is UserInstallationAccess"
);

const schema =
  UserInstallationAccess.schema;

ok(
  schema instanceof mongoose.Schema,
  "entitlement model uses a Mongoose schema"
);

/*
|--------------------------------------------------------------------------
| B. Required identity fields
|--------------------------------------------------------------------------
*/

const userPath =
  schema.path("user");

ok(
  Boolean(userPath),
  "user entitlement field exists"
);

equal(
  userPath.options.required,
  true,
  "user entitlement field is required"
);

equal(
  userPath.options.ref,
  "User",
  "user entitlement references canonical User model"
);

equal(
  userPath.instance,
  "ObjectId",
  "user entitlement uses MongoDB ObjectId identity"
);

const installationPath =
  schema.path("installation");

ok(
  Boolean(installationPath),
  "installation entitlement field exists"
);

equal(
  installationPath.options.required,
  true,
  "installation entitlement field is required"
);

equal(
  installationPath.options.ref,
  "Installation",
  "installation entitlement references canonical Installation model"
);

equal(
  installationPath.instance,
  "ObjectId",
  "installation entitlement uses MongoDB ObjectId identity"
);

/*
|--------------------------------------------------------------------------
| C. Active entitlement state
|--------------------------------------------------------------------------
*/

const activePath =
  schema.path("active");

ok(
  Boolean(activePath),
  "active entitlement state exists"
);

equal(
  activePath.instance,
  "Boolean",
  "active entitlement state is Boolean"
);

equal(
  activePath.options.default,
  true,
  "new entitlement defaults to active"
);

/*
|--------------------------------------------------------------------------
| D. Grant metadata
|--------------------------------------------------------------------------
*/

const grantedAtPath =
  schema.path("grantedAt");

ok(
  Boolean(grantedAtPath),
  "grantedAt metadata exists"
);

equal(
  grantedAtPath.instance,
  "Date",
  "grantedAt metadata uses Date"
);

equal(
  grantedAtPath.options.default,
  Date.now,
  "grantedAt defaults to Date.now"
);

/*
|--------------------------------------------------------------------------
| E. Timestamp contract
|--------------------------------------------------------------------------
*/

ok(
  Boolean(schema.path("createdAt")),
  "createdAt timestamp exists"
);

ok(
  Boolean(schema.path("updatedAt")),
  "updatedAt timestamp exists"
);

/*
|--------------------------------------------------------------------------
| F. Identity duplication prevention
|--------------------------------------------------------------------------
*/

ok(
  !schema.path("vrmSiteId"),
  "entitlement does not duplicate vrmSiteId"
);

ok(
  !schema.path("siteId"),
  "entitlement does not create parallel siteId identity"
);

ok(
  !schema.path("email"),
  "entitlement does not use email as authorization identity"
);

ok(
  !schema.path("vrmUserId"),
  "entitlement does not use VRM user identity"
);

/*
|--------------------------------------------------------------------------
| G. RBAC separation
|--------------------------------------------------------------------------
*/

ok(
  !schema.path("role"),
  "entitlement does not duplicate RBAC role"
);

ok(
  !schema.path("permission"),
  "entitlement does not duplicate RBAC permission"
);

ok(
  !schema.path("permissions"),
  "entitlement does not create a parallel permission map"
);

ok(
  !schema.path("administratorBypass"),
  "entitlement model defines no administrator ACL bypass"
);

ok(
  !schema.path("serviceBypass"),
  "entitlement model defines no service ACL bypass"
);

ok(
  !schema.path("systemBypass"),
  "entitlement model defines no system ACL bypass"
);

/*
|--------------------------------------------------------------------------
| H. Index contract
|--------------------------------------------------------------------------
*/

const indexes =
  schema.indexes();

const hasUniqueUserInstallationIndex =
  indexes.some(
    ([fields, options]) =>
      fields?.user === 1 &&
      fields?.installation === 1 &&
      options?.unique === true
  );

ok(
  hasUniqueUserInstallationIndex,
  "user + installation entitlement identity is unique"
);

const hasUserActiveIndex =
  indexes.some(
    ([fields]) =>
      fields?.user === 1 &&
      fields?.active === 1
  );

ok(
  hasUserActiveIndex,
  "user + active authorization lookup index is declared"
);

const hasInstallationActiveIndex =
  indexes.some(
    ([fields]) =>
      fields?.installation === 1 &&
      fields?.active === 1
  );

ok(
  hasInstallationActiveIndex,
  "installation + active authorization lookup index is declared"
);

/*
|--------------------------------------------------------------------------
| I. Schema-only production boundary
|--------------------------------------------------------------------------
*/

equal(
  mongoose.connection.readyState,
  0,
  "validator does not establish a MongoDB connection"
);

ok(
  typeof UserInstallationAccess.findOne ===
    "function",
  "entitlement model exposes standard read lookup"
);

ok(
  typeof UserInstallationAccess.find ===
    "function",
  "entitlement model supports collection filtering lookups"
);

/*
|--------------------------------------------------------------------------
| J. Authorization boundary
|--------------------------------------------------------------------------
*/

ok(
  !schema.path("equipmentControl"),
  "entitlement model grants no equipment-control authority"
);

ok(
  !schema.path("automaticDispatch"),
  "entitlement model grants no automatic-dispatch authority"
);

ok(
  !schema.path("autoDispatch"),
  "entitlement model contains no alternate auto-dispatch grant"
);

/*
|--------------------------------------------------------------------------
| K. Completion
|--------------------------------------------------------------------------
*/

pass(
  "P.1H-B entitlement persistence assertion plan completed"
);

console.log(`
------------------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1H-B USER INSTALLATION ACCESS MODEL VALIDATION PASSED
------------------------------------------------------------

Boundary: entitlement persistence = SCHEMA CONTRACT ONLY
Boundary: production index       = NOT PROVEN
Boundary: route enforcement      = NOT INCLUDED
Boundary: RBAC bypass            = NOT INCLUDED
Boundary: equipment control      = NOT INCLUDED
Boundary: automatic dispatch     = NOT INCLUDED
`);
