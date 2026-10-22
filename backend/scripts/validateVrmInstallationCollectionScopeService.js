import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  extractRemoteVrmSiteId,
  getEntitledVrmSiteIds,
  filterVrmInstallationsBySiteIds,
} from "../services/security/vrmInstallationCollectionScopeService.js";

let assertionsPassed = 0;

function pass(message) {
  assertionsPassed += 1;
  console.log(
    `PASS ${assertionsPassed}: ${message}`
  );
}

function ok(value, message) {
  assert.ok(value, message);
  pass(message);
}

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  pass(message);
}

function deepEqual(
  actual,
  expected,
  message
) {
  assert.deepEqual(
    actual,
    expected,
    message
  );
  pass(message);
}

function createFakeInstallationModel({
  installations = [],
  error = null,
} = {}) {
  const calls = [];

  return {
    calls,

    find(filter) {
      calls.push({
        operation: "find",
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

              return installations;
            },
          };
        },
      };
    },
  };
}

console.log(`
============================================================
ASHMAAN PORTAL P.1H-F3-B — VRM COLLECTION SCOPE SERVICE
============================================================
`);

/*
|--------------------------------------------------------------------------
| A. Remote VRM identity extraction
|--------------------------------------------------------------------------
*/

equal(
  extractRemoteVrmSiteId({
    idSite: 18053,
  }),
  "18053",
  "idSite is accepted as remote VRM identity"
);

equal(
  extractRemoteVrmSiteId({
    idsite: "18054",
  }),
  "18054",
  "idsite is accepted as remote VRM identity"
);

equal(
  extractRemoteVrmSiteId({
    siteId: "18055",
  }),
  "18055",
  "siteId is accepted as remote VRM identity"
);

equal(
  extractRemoteVrmSiteId({
    installationId: "18056",
  }),
  "18056",
  "installationId is accepted as remote VRM identity"
);

equal(
  extractRemoteVrmSiteId({
    id: "18057",
  }),
  "18057",
  "id is accepted as remote VRM identity"
);

equal(
  extractRemoteVrmSiteId({
    idSite: " 18058 ",
  }),
  "18058",
  "remote VRM identity is normalized"
);

equal(
  extractRemoteVrmSiteId({}),
  null,
  "missing remote identity remains unavailable"
);

equal(
  extractRemoteVrmSiteId(null),
  null,
  "null remote installation has no identity"
);

/*
|--------------------------------------------------------------------------
| B. Canonical precedence
|--------------------------------------------------------------------------
*/

equal(
  extractRemoteVrmSiteId({
    idSite: "18053",
    idsite: "99991",
    siteId: "99992",
    installationId: "99993",
    id: "99994",
  }),
  "18053",
  "idSite has canonical extraction precedence"
);

equal(
  extractRemoteVrmSiteId({
    idsite: "18054",
    siteId: "99992",
    installationId: "99993",
    id: "99994",
  }),
  "18054",
  "idsite precedes lower-priority aliases"
);

/*
|--------------------------------------------------------------------------
| C. Installation._id -> vrmSiteId scope bridge
|--------------------------------------------------------------------------
*/

const INSTALLATION_A =
  "64b64c4f2f8f4d3f9c000001";

const INSTALLATION_B =
  "64b64c4f2f8f4d3f9c000002";

const model =
  createFakeInstallationModel({
    installations: [
      {
        _id: INSTALLATION_A,
        vrmSiteId: "18053",
      },
      {
        _id: INSTALLATION_B,
        vrmSiteId: "18054",
      },
    ],
  });

const vrmSiteIds =
  await getEntitledVrmSiteIds({
    installationIds: [
      INSTALLATION_A,
      INSTALLATION_B,
    ],
    installationModel: model,
  });

deepEqual(
  [...vrmSiteIds],
  ["18053", "18054"],
  "entitled Installation IDs resolve to VRM site IDs"
);

equal(
  model.calls.length,
  3,
  "scope bridge performs one Installation query chain"
);

deepEqual(
  model.calls[0].filter._id.$in,
  [
    INSTALLATION_A,
    INSTALLATION_B,
  ],
  "Installation lookup is constrained to entitled ObjectIds"
);

equal(
  model.calls[0].filter.source,
  "VRM",
  "Installation lookup is constrained to VRM source"
);

equal(
  model.calls[1].selection._id,
  1,
  "scope bridge selects Installation ObjectId"
);

equal(
  model.calls[1].selection.vrmSiteId,
  1,
  "scope bridge selects vrmSiteId"
);

ok(
  Object.isFrozen(vrmSiteIds),
  "resolved VRM site ID scope is immutable"
);

/*
|--------------------------------------------------------------------------
| D. Empty entitlement scope
|--------------------------------------------------------------------------
*/

const emptyModel =
  createFakeInstallationModel({
    installations: [
      {
        _id: INSTALLATION_A,
        vrmSiteId: "18053",
      },
    ],
  });

const emptyScope =
  await getEntitledVrmSiteIds({
    installationIds: [],
    installationModel: emptyModel,
  });

deepEqual(
  [...emptyScope],
  [],
  "zero entitlements resolve to empty VRM site scope"
);

equal(
  emptyModel.calls.length,
  0,
  "zero entitlements perform no Installation query"
);

ok(
  Object.isFrozen(emptyScope),
  "empty VRM site scope is immutable"
);

/*
|--------------------------------------------------------------------------
| E. Scope is mandatory
|--------------------------------------------------------------------------
*/

await assert.rejects(
  () =>
    getEntitledVrmSiteIds({
      installationModel: model,
    }),
  TypeError
);

pass(
  "missing installationIds scope is rejected"
);

await assert.rejects(
  () =>
    getEntitledVrmSiteIds({
      installationIds: null,
      installationModel: model,
    }),
  TypeError
);

pass(
  "null installationIds scope is rejected"
);

/*
|--------------------------------------------------------------------------
| F. Repository failure propagates fail-closed
|--------------------------------------------------------------------------
*/

const failingModel =
  createFakeInstallationModel({
    error: new Error(
      "simulated Installation repository failure"
    ),
  });

await assert.rejects(
  () =>
    getEntitledVrmSiteIds({
      installationIds: [
        INSTALLATION_A,
      ],
      installationModel:
        failingModel,
    }),
  /simulated Installation repository failure/
);

pass(
  "Installation repository failure does not create unrestricted scope"
);

/*
|--------------------------------------------------------------------------
| G. Remote collection filtering
|--------------------------------------------------------------------------
*/

const remoteInstallations = [
  {
    idSite: 18053,
    name: "Allowed A",
  },
  {
    idsite: "18054",
    name: "Allowed B",
  },
  {
    siteId: "18055",
    name: "Denied C",
  },
  {
    installationId: "18056",
    name: "Denied D",
  },
  {
    id: "18057",
    name: "Denied E",
  },
  {
    name: "Missing identity",
  },
];

const filtered =
  filterVrmInstallationsBySiteIds({
    installations:
      remoteInstallations,
    vrmSiteIds: [
      "18053",
      "18054",
    ],
  });

equal(
  filtered.length,
  2,
  "remote collection retains only entitled installations"
);

equal(
  filtered[0],
  remoteInstallations[0],
  "filter preserves first entitled remote record by reference"
);

equal(
  filtered[1],
  remoteInstallations[1],
  "filter preserves second entitled remote record by reference"
);

ok(
  !filtered.includes(
    remoteInstallations[2]
  ),
  "non-entitled remote installation is excluded"
);

ok(
  !filtered.includes(
    remoteInstallations[5]
  ),
  "remote installation without usable identity is excluded"
);

/*
|--------------------------------------------------------------------------
| H. Empty and invalid allowed scopes
|--------------------------------------------------------------------------
*/

deepEqual(
  filterVrmInstallationsBySiteIds({
    installations:
      remoteInstallations,
    vrmSiteIds: [],
  }),
  [],
  "empty allowed scope returns empty collection"
);

deepEqual(
  filterVrmInstallationsBySiteIds({
    installations:
      remoteInstallations,
    vrmSiteIds: [
      null,
      undefined,
      "   ",
    ],
  }),
  [],
  "scope with no usable VRM identities returns empty collection"
);

/*
|--------------------------------------------------------------------------
| I. Input contracts
|--------------------------------------------------------------------------
*/

assert.throws(
  () =>
    filterVrmInstallationsBySiteIds({
      installations: null,
      vrmSiteIds: ["18053"],
    }),
  TypeError
);

pass(
  "non-array remote collection is rejected"
);

assert.throws(
  () =>
    filterVrmInstallationsBySiteIds({
      installations: [],
      vrmSiteIds: null,
    }),
  TypeError
);

pass(
  "non-array VRM site scope is rejected"
);

/*
|--------------------------------------------------------------------------
| J. No authority expansion
|--------------------------------------------------------------------------
*/

const source =
  await import(
    "node:fs/promises"
  ).then(
    ({ readFile }) =>
      readFile(
        new URL(
          "../services/security/vrmInstallationCollectionScopeService.js",
          import.meta.url
        ),
        "utf8"
      )
  );

ok(
  !source.includes(
    "ADMINISTRATOR"
  ),
  "collection scope service introduces no administrator bypass"
);

ok(
  !source.includes(
    "SERVICE"
  ),
  "collection scope service introduces no SERVICE bypass"
);

ok(
  !source.includes(
    "SYSTEM"
  ),
  "collection scope service introduces no SYSTEM bypass"
);

ok(
  !source.includes(
    "EXECUTE_EQUIPMENT_CONTROL"
  ),
  "collection scope service grants no equipment-control permission"
);

ok(
  !source.includes(
    "automaticDispatch"
  ),
  "collection scope service grants no automatic-dispatch authority"
);

/*
|--------------------------------------------------------------------------
| K. Database isolation
|--------------------------------------------------------------------------
*/

equal(
  mongoose.connection.readyState,
  0,
  "validator establishes no MongoDB connection"
);

pass(
  "P.1H-F3-B VRM collection scope assertion plan completed"
);

console.log(`
------------------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1H-F3-B VRM COLLECTION SCOPE SERVICE VALIDATION PASSED
------------------------------------------------------------

Boundary: entitlement input      = Installation._id[]
Boundary: local identity         = Installation.vrmSiteId
Boundary: remote identity        = idSite/idsite/siteId/installationId/id
Boundary: zero entitlements      = EMPTY
Boundary: unrestricted fallback  = FORBIDDEN
Boundary: controller integration = NOT YET INCLUDED
Boundary: VRM network activity   = NONE
Boundary: Atlas activity         = NONE
`);
