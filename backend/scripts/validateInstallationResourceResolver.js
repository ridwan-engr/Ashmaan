// scripts/validateInstallationResourceResolver.js

import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  INSTALLATION_RESOURCE_RESOLUTION,
  INSTALLATION_RESOURCE_RESOLUTION_REASONS,
  normalizeVrmSiteId,
  resolveInstallationByVrmSiteId,
} from "../services/security/installationResourceResolver.js";

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

function createFakeInstallationModel({
  installation = null,
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

              return installation;
            },
          };
        },
      };
    },
  };
}

const INSTALLATION_ID =
  new mongoose.Types.ObjectId(
    "64b000000000000000000002"
  );

console.log(`
============================================================
ASHMAAN PORTAL P.1H-D1 — INSTALLATION RESOURCE RESOLVER
============================================================
`);

/*
|--------------------------------------------------------------------------
| A. Resolution taxonomy
|--------------------------------------------------------------------------
*/

equal(
  INSTALLATION_RESOURCE_RESOLUTION.RESOLVED,
  "RESOLVED",
  "RESOLVED status is explicit"
);

equal(
  INSTALLATION_RESOURCE_RESOLUTION.NOT_FOUND,
  "NOT_FOUND",
  "NOT_FOUND status is explicit"
);

equal(
  INSTALLATION_RESOURCE_RESOLUTION.INVALID,
  "INVALID",
  "INVALID status is explicit"
);

equal(
  INSTALLATION_RESOURCE_RESOLUTION.UNAVAILABLE,
  "UNAVAILABLE",
  "UNAVAILABLE status is explicit"
);

equal(
  INSTALLATION_RESOURCE_RESOLUTION_REASONS
    .INSTALLATION_RESOLVED,
  "INSTALLATION_RESOLVED",
  "successful resolution reason is explicit"
);

equal(
  INSTALLATION_RESOURCE_RESOLUTION_REASONS
    .VRM_SITE_ID_MISSING,
  "VRM_SITE_ID_MISSING",
  "missing-site identity reason is explicit"
);

equal(
  INSTALLATION_RESOURCE_RESOLUTION_REASONS
    .INSTALLATION_NOT_FOUND,
  "INSTALLATION_NOT_FOUND",
  "not-found reason is explicit"
);

equal(
  INSTALLATION_RESOURCE_RESOLUTION_REASONS
    .RESOLUTION_UNAVAILABLE,
  "RESOLUTION_UNAVAILABLE",
  "resolution-unavailable reason is explicit"
);

/*
|--------------------------------------------------------------------------
| B. vrmSiteId normalization
|--------------------------------------------------------------------------
*/

equal(
  normalizeVrmSiteId("18053"),
  "18053",
  "string vrmSiteId is preserved"
);

equal(
  normalizeVrmSiteId(" 18053 "),
  "18053",
  "vrmSiteId surrounding whitespace is removed"
);

equal(
  normalizeVrmSiteId(18053),
  "18053",
  "numeric vrmSiteId is normalized to string"
);

equal(
  normalizeVrmSiteId(undefined),
  null,
  "undefined vrmSiteId normalizes to null"
);

equal(
  normalizeVrmSiteId(null),
  null,
  "null vrmSiteId normalizes to null"
);

equal(
  normalizeVrmSiteId("   "),
  null,
  "blank vrmSiteId normalizes to null"
);

/*
|--------------------------------------------------------------------------
| C. Successful external -> internal identity resolution
|--------------------------------------------------------------------------
*/

const resolvedModel =
  createFakeInstallationModel({
    installation: {
      _id: INSTALLATION_ID,
      vrmSiteId: "18053",
    },
  });

const resolved =
  await resolveInstallationByVrmSiteId({
    vrmSiteId: " 18053 ",
    installationModel: resolvedModel,
  });

equal(
  resolved.status,
  "RESOLVED",
  "known VRM site produces RESOLVED"
);

equal(
  resolved.resolved,
  true,
  "RESOLVED result exposes resolved=true"
);

equal(
  resolved.reason,
  "INSTALLATION_RESOLVED",
  "resolved installation has explicit reason"
);

equal(
  resolved.vrmSiteId,
  "18053",
  "resolved result preserves canonical vrmSiteId"
);

equal(
  resolved.installationId,
  String(INSTALLATION_ID),
  "resolved result exposes canonical Installation ObjectId"
);

equal(
  resolvedModel.calls.length,
  3,
  "resolution performs one injected Installation query chain"
);

equal(
  resolvedModel.calls[0].filter.vrmSiteId,
  "18053",
  "Installation lookup uses normalized vrmSiteId"
);

equal(
  resolvedModel.calls[0].filter.source,
  "VRM",
  "Installation lookup is constrained to VRM source"
);

equal(
  resolvedModel.calls[1].selection._id,
  1,
  "resolver selects canonical Installation ObjectId"
);

equal(
  resolvedModel.calls[1].selection.vrmSiteId,
  1,
  "resolver selects canonical vrmSiteId"
);

/*
|--------------------------------------------------------------------------
| D. Unknown installation
|--------------------------------------------------------------------------
*/

const missingModel =
  createFakeInstallationModel({
    installation: null,
  });

const missing =
  await resolveInstallationByVrmSiteId({
    vrmSiteId: "99999",
    installationModel: missingModel,
  });

equal(
  missing.status,
  "NOT_FOUND",
  "unknown VRM site produces NOT_FOUND"
);

equal(
  missing.resolved,
  false,
  "NOT_FOUND never reports resource as resolved"
);

equal(
  missing.reason,
  "INSTALLATION_NOT_FOUND",
  "unknown installation has explicit reason"
);

equal(
  missing.vrmSiteId,
  "99999",
  "NOT_FOUND preserves normalized requested vrmSiteId"
);

equal(
  missing.installationId,
  null,
  "NOT_FOUND exposes no Installation ObjectId"
);

/*
|--------------------------------------------------------------------------
| E. Missing identities fail before repository access
|--------------------------------------------------------------------------
*/

for (const [
  label,
  vrmSiteId,
] of [
  ["undefined", undefined],
  ["null", null],
  ["blank", "   "],
]) {
  const model =
    createFakeInstallationModel({
      installation: {
        _id: INSTALLATION_ID,
        vrmSiteId: "18053",
      },
    });

  const result =
    await resolveInstallationByVrmSiteId({
      vrmSiteId,
      installationModel: model,
    });

  equal(
    result.status,
    "INVALID",
    `${label} vrmSiteId produces INVALID`
  );

  equal(
    result.resolved,
    false,
    `${label} vrmSiteId never resolves`
  );

  equal(
    result.reason,
    "VRM_SITE_ID_MISSING",
    `${label} vrmSiteId has explicit missing reason`
  );

  equal(
    model.calls.length,
    0,
    `${label} vrmSiteId performs no Installation query`
  );
}

/*
|--------------------------------------------------------------------------
| F. Repository failure
|--------------------------------------------------------------------------
*/

const failingModel =
  createFakeInstallationModel({
    error:
      new Error(
        "simulated Installation repository failure"
      ),
  });

const unavailable =
  await resolveInstallationByVrmSiteId({
    vrmSiteId: "18053",
    installationModel: failingModel,
  });

equal(
  unavailable.status,
  "UNAVAILABLE",
  "repository failure produces UNAVAILABLE"
);

equal(
  unavailable.resolved,
  false,
  "UNAVAILABLE never reports resource as resolved"
);

equal(
  unavailable.reason,
  "RESOLUTION_UNAVAILABLE",
  "repository failure has explicit unavailable reason"
);

equal(
  unavailable.vrmSiteId,
  "18053",
  "UNAVAILABLE preserves normalized requested vrmSiteId"
);

equal(
  unavailable.installationId,
  null,
  "UNAVAILABLE exposes no Installation ObjectId"
);

/*
|--------------------------------------------------------------------------
| G. Identity-boundary invariants
|--------------------------------------------------------------------------
*/

ok(
  !Object.prototype.hasOwnProperty.call(
    resolved,
    "siteId"
  ),
  "resolver does not create parallel siteId identity"
);

ok(
  !Object.prototype.hasOwnProperty.call(
    resolved,
    "userId"
  ),
  "resolver does not mix authenticated user identity into resource resolution"
);

ok(
  !Object.prototype.hasOwnProperty.call(
    resolved,
    "role"
  ),
  "resolver does not evaluate RBAC role"
);

ok(
  !Object.prototype.hasOwnProperty.call(
    resolved,
    "permission"
  ),
  "resolver does not evaluate RBAC permission"
);

ok(
  !Object.prototype.hasOwnProperty.call(
    resolved,
    "allowed"
  ),
  "resolver does not make entitlement decisions"
);

/*
|--------------------------------------------------------------------------
| H. Result immutability
|--------------------------------------------------------------------------
*/

ok(
  Object.isFrozen(resolved),
  "RESOLVED result is immutable"
);

ok(
  Object.isFrozen(missing),
  "NOT_FOUND result is immutable"
);

ok(
  Object.isFrozen(unavailable),
  "UNAVAILABLE result is immutable"
);

/*
|--------------------------------------------------------------------------
| I. Runtime isolation
|--------------------------------------------------------------------------
*/

equal(
  mongoose.connection.readyState,
  0,
  "resolver validator establishes no MongoDB connection"
);

/*
|--------------------------------------------------------------------------
| J. Completion
|--------------------------------------------------------------------------
*/

pass(
  "P.1H-D1 installation resource resolution assertion plan completed"
);

console.log(`
------------------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1H-D1 INSTALLATION RESOURCE RESOLVER VALIDATION PASSED
------------------------------------------------------------

Boundary: external identity       = vrmSiteId
Boundary: internal identity       = Installation._id
Boundary: Installation source     = VRM
Boundary: entitlement decision    = NOT INCLUDED
Boundary: RBAC                    = NOT INCLUDED
Boundary: HTTP middleware         = NOT INCLUDED
Boundary: route enforcement       = NOT INCLUDED
Boundary: Atlas activity          = NONE
`);
