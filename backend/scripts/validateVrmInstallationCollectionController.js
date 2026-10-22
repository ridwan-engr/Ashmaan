import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  getInstallationsWithDependencies,
} from "../controllers/vrmController.js";

import {
  USER_INSTALLATION_SCOPE_STATUS,
} from "../services/security/userInstallationScopeService.js";

let assertionsPassed = 0;

function pass(message) {
  assertionsPassed += 1;
  console.log(
    `PASS ${assertionsPassed}: ${message}`
  );
}

function equal(
  actual,
  expected,
  message
) {
  assert.equal(
    actual,
    expected,
    message
  );

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

function ok(value, message) {
  assert.ok(value, message);
  pass(message);
}

function createResponse() {
  return {
    statusCode: null,
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.body = body;
      return this;
    },
  };
}

const USER_ID =
  "64b64c4f2f8f4d3f9c100001";

const INSTALLATION_A =
  "64b64c4f2f8f4d3f9c000001";

const INSTALLATION_B =
  "64b64c4f2f8f4d3f9c000002";

console.log(`
============================================================
ASHMAAN PORTAL P.1H-F3-C — VRM COLLECTION CONTROLLER ACL
============================================================
`);

/*
|--------------------------------------------------------------------------
| A. DENY -> 403
|--------------------------------------------------------------------------
*/

{
  let siteScopeCalls = 0;
  let vrmCalls = 0;

  const res =
    createResponse();

  await getInstallationsWithDependencies(
    {
      auth: {
        userId: USER_ID,
      },
    },
    res,
    {
      resolveUserScope:
        async () => ({
          status:
            USER_INSTALLATION_SCOPE_STATUS.DENY,

          installationIds: [],
        }),

      resolveVrmSiteIds:
        async () => {
          siteScopeCalls += 1;
          return [];
        },

      fetchVrmInstallations:
        async () => {
          vrmCalls += 1;
          return {
            records: [],
          };
        },
    }
  );

  equal(
    res.statusCode,
    403,
    "DENY scope returns HTTP 403"
  );

  equal(
    res.body?.error?.code,
    "INSTALLATION_ACCESS_DENIED",
    "DENY scope returns generic installation denial"
  );

  equal(
    siteScopeCalls,
    0,
    "DENY scope performs no Installation-to-VRM resolution"
  );

  equal(
    vrmCalls,
    0,
    "DENY scope performs no VRM request"
  );
}

/*
|--------------------------------------------------------------------------
| B. UNAVAILABLE -> 503
|--------------------------------------------------------------------------
*/

{
  let vrmCalls = 0;

  const res =
    createResponse();

  await getInstallationsWithDependencies(
    {
      auth: {
        userId: USER_ID,
      },
    },
    res,
    {
      resolveUserScope:
        async () => ({
          status:
            USER_INSTALLATION_SCOPE_STATUS.UNAVAILABLE,

          installationIds: [],
        }),

      fetchVrmInstallations:
        async () => {
          vrmCalls += 1;
          return {
            records: [],
          };
        },
    }
  );

  equal(
    res.statusCode,
    503,
    "UNAVAILABLE scope returns HTTP 503"
  );

  equal(
    res.body?.error?.code,
    "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
    "UNAVAILABLE scope exposes authorization-unavailable code"
  );

  equal(
    vrmCalls,
    0,
    "UNAVAILABLE scope performs no VRM request"
  );
}

/*
|--------------------------------------------------------------------------
| C. Zero entitlements
|--------------------------------------------------------------------------
*/

{
  let siteScopeCalls = 0;
  let vrmCalls = 0;

  const res =
    createResponse();

  await getInstallationsWithDependencies(
    {
      auth: {
        userId: USER_ID,
      },
    },
    res,
    {
      resolveUserScope:
        async () => ({
          status:
            USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

          installationIds: [],
        }),

      resolveVrmSiteIds:
        async () => {
          siteScopeCalls += 1;
          return [];
        },

      fetchVrmInstallations:
        async () => {
          vrmCalls += 1;
          return {
            records: [],
          };
        },
    }
  );

  equal(
    res.statusCode,
    200,
    "zero entitlement scope returns HTTP 200"
  );

  deepEqual(
    res.body?.data?.records,
    [],
    "zero entitlement scope returns empty records"
  );

  equal(
    siteScopeCalls,
    0,
    "zero entitlements skip Installation-to-VRM resolution"
  );

  equal(
    vrmCalls,
    0,
    "zero entitlements skip VRM request"
  );
}

/*
|--------------------------------------------------------------------------
| D. Entitlements resolve to zero usable VRM sites
|--------------------------------------------------------------------------
*/

{
  let vrmCalls = 0;
  let receivedIds = null;

  const res =
    createResponse();

  await getInstallationsWithDependencies(
    {
      auth: {
        userId: USER_ID,
      },
    },
    res,
    {
      resolveUserScope:
        async () => ({
          status:
            USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

          installationIds: [
            INSTALLATION_A,
          ],
        }),

      resolveVrmSiteIds:
        async ({
          installationIds,
        }) => {
          receivedIds =
            installationIds;

          return [];
        },

      fetchVrmInstallations:
        async () => {
          vrmCalls += 1;

          return {
            records: [
              {
                idSite: 18053,
              },
            ],
          };
        },
    }
  );

  deepEqual(
    receivedIds,
    [INSTALLATION_A],
    "controller passes entitlement Installation IDs to VRM-site resolver"
  );

  equal(
    res.statusCode,
    200,
    "zero resolved VRM sites returns HTTP 200"
  );

  deepEqual(
    res.body?.data?.records,
    [],
    "zero resolved VRM sites returns empty records"
  );

  equal(
    vrmCalls,
    0,
    "zero resolved VRM sites skip VRM request"
  );
}

/*
|--------------------------------------------------------------------------
| E. Normal entitled collection
|--------------------------------------------------------------------------
*/

{
  let vrmCalls = 0;
  let filterInput = null;

  const remoteA = {
    idSite: 18053,
    name: "Allowed A",
  };

  const remoteB = {
    idSite: 18054,
    name: "Denied B",
  };

  const upstream = {
    success: true,

    records: [
      remoteA,
      remoteB,
    ],

    metadata: {
      source: "VRM",
    },
  };

  const res =
    createResponse();

  await getInstallationsWithDependencies(
    {
      auth: {
        userId: USER_ID,
      },
    },
    res,
    {
      resolveUserScope:
        async () => ({
          status:
            USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

          installationIds: [
            INSTALLATION_A,
          ],
        }),

      resolveVrmSiteIds:
        async () => [
          "18053",
        ],

      fetchVrmInstallations:
        async () => {
          vrmCalls += 1;
          return upstream;
        },

      filterInstallations:
        ({
          installations,
          vrmSiteIds,
        }) => {
          filterInput = {
            installations,
            vrmSiteIds,
          };

          return [
            remoteA,
          ];
        },
    }
  );

  equal(
    vrmCalls,
    1,
    "resolved entitled scope performs one VRM collection request"
  );

  equal(
    filterInput.installations,
    upstream.records,
    "controller passes upstream records array unchanged to filter"
  );

  deepEqual(
    filterInput.vrmSiteIds,
    ["18053"],
    "controller passes resolved VRM site scope to filter"
  );

  equal(
    res.statusCode,
    200,
    "entitled VRM collection returns HTTP 200"
  );

  equal(
    res.body?.data?.success,
    true,
    "upstream success field is preserved"
  );

  equal(
    res.body?.data?.metadata,
    upstream.metadata,
    "upstream metadata is preserved by reference"
  );

  equal(
    res.body?.data?.records?.length,
    1,
    "response contains only filtered records"
  );

  equal(
    res.body?.data?.records?.[0],
    remoteA,
    "entitled remote record is preserved by reference"
  );

  ok(
    !res.body?.data?.records?.includes(
      remoteB
    ),
    "non-entitled remote record is absent"
  );

  equal(
    upstream.records.length,
    2,
    "upstream response object is not mutated"
  );
}

/*
|--------------------------------------------------------------------------
| F. Malformed upstream collection fails closed
|--------------------------------------------------------------------------
*/

{
  const malformedCases = [
    null,
    undefined,
    [],
    {},
    {
      records: null,
    },
    {
      records: {},
    },
  ];

  for (
    const malformed
    of malformedCases
  ) {
    const res =
      createResponse();

    await assert.rejects(
      () =>
        getInstallationsWithDependencies(
          {
            auth: {
              userId: USER_ID,
            },
          },
          res,
          {
            resolveUserScope:
              async () => ({
                status:
                  USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

                installationIds: [
                  INSTALLATION_A,
                ],
              }),

            resolveVrmSiteIds:
              async () => [
                "18053",
              ],

            fetchVrmInstallations:
              async () =>
                malformed,
          }
        ),
      (error) =>
        error?.statusCode === 503 &&
        error?.code ===
          "VRM_INSTALLATION_COLLECTION_UNAVAILABLE"
    );
  }

  pass(
    "malformed upstream collection variants fail closed"
  );
}

/*
|--------------------------------------------------------------------------
| G. Unknown scope status fails closed
|--------------------------------------------------------------------------
*/

{
  let vrmCalls = 0;

  const res =
    createResponse();

  await getInstallationsWithDependencies(
    {
      auth: {
        userId: USER_ID,
      },
    },
    res,
    {
      resolveUserScope:
        async () => ({
          status:
            "UNKNOWN_STATUS",

          installationIds: [
            INSTALLATION_A,
          ],
        }),

      fetchVrmInstallations:
        async () => {
          vrmCalls += 1;
          return {
            records: [],
          };
        },
    }
  );

  equal(
    res.statusCode,
    503,
    "unknown scope status fails closed with HTTP 503"
  );

  equal(
    vrmCalls,
    0,
    "unknown scope status performs no VRM request"
  );
}

/*
|--------------------------------------------------------------------------
| H. Principal propagation
|--------------------------------------------------------------------------
*/

{
  let observedUserId = null;

  const res =
    createResponse();

  await getInstallationsWithDependencies(
    {
      auth: {
        userId: USER_ID,
      },
    },
    res,
    {
      resolveUserScope:
        async ({
          userId,
        }) => {
          observedUserId =
            userId;

          return {
            status:
              USER_INSTALLATION_SCOPE_STATUS.RESOLVED,

            installationIds: [],
          };
        },
    }
  );

  equal(
    observedUserId,
    USER_ID,
    "controller derives collection scope from req.auth.userId"
  );
}

/*
|--------------------------------------------------------------------------
| I. No authority expansion
|--------------------------------------------------------------------------
*/

const {
  readFile,
} =
  await import(
    "node:fs/promises"
  );

const controllerSource =
  await readFile(
    new URL(
      "../controllers/vrmController.js",
      import.meta.url
    ),
    "utf8"
  );

ok(
  !controllerSource.includes(
    "ADMINISTRATOR"
  ),
  "VRM controller introduces no administrator ACL bypass"
);

ok(
  !controllerSource.includes(
    "EXECUTE_EQUIPMENT_CONTROL"
  ),
  "VRM controller grants no equipment-control permission"
);

ok(
  !controllerSource.includes(
    "automaticDispatch"
  ),
  "VRM controller grants no automatic-dispatch authority"
);

/*
|--------------------------------------------------------------------------
| J. Database isolation
|--------------------------------------------------------------------------
*/

equal(
  mongoose.connection.readyState,
  0,
  "validator establishes no MongoDB connection"
);

pass(
  "P.1H-F3-C controller assertion plan completed"
);

console.log(`
------------------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1H-F3-C VRM COLLECTION CONTROLLER VALIDATION PASSED
------------------------------------------------------------

Boundary: principal              = req.auth.userId
Boundary: entitlement scope      = Installation._id[]
Boundary: local VRM scope        = Installation.vrmSiteId[]
Boundary: remote collection      = data.records
Boundary: zero entitlement       = NO VRM REQUEST
Boundary: zero usable VRM sites  = NO VRM REQUEST
Boundary: remote envelope        = PRESERVED
Boundary: malformed upstream     = FAIL CLOSED
Boundary: VRM network activity   = NONE
Boundary: Atlas activity         = NONE
`);
