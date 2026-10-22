// scripts/validatePortalAuthApiMount.js

import assert
  from "node:assert/strict";

import apiRouter
  from "../routes/index.js";

import authenticatePortalAccessToken
  from "../middleware/authenticatePortalAccessToken.js";

import requireActivePortalSession
  from "../middleware/requireActivePortalSession.js";


let passed = 0;


function check(
  condition,
  description
) {
  assert.equal(
    Boolean(condition),
    true,
    description
  );

  passed += 1;

  console.log(
    `PASS ${passed}: ${description}`
  );
}


console.log(
  "\n================================================"
);

console.log(
  "ASHMAAN PORTAL P.1F-D — AUTH API MOUNT"
);

console.log(
  "================================================\n"
);


check(
  typeof apiRouter ===
    "function",
  "API root exports an Express router"
);


check(
  Array.isArray(
    apiRouter.stack
  ),
  "API root exposes router stack"
);


const mountedRouters =
  apiRouter.stack.filter(
    (
      layer
    ) =>
      !layer.route &&
      typeof layer.handle ===
        "function"
  );


check(
  mountedRouters.length >
    0,
  "API root contains mounted child routers"
);


const authLayer =
  mountedRouters.find(
    (
      layer
    ) => {
      const childStack =
        layer.handle
          ?.stack;

      if (
        !Array.isArray(
          childStack
        )
      ) {
        return false;
      }


      const paths =
        childStack
          .filter(
            (
              child
            ) =>
              child.route
          )
          .map(
            (
              child
            ) =>
              child.route.path
          );


      return (
        paths.includes(
          "/login"
        ) &&
        paths.includes(
          "/refresh"
        ) &&
        paths.includes(
          "/logout"
        ) &&
        paths.includes(
          "/me"
        )
      );
    }
  );


check(
  Boolean(
    authLayer
  ),
  "canonical portal authentication router is mounted in API root"
);


const authRoutes =
  authLayer.handle.stack.filter(
    (
      layer
    ) =>
      layer.route
  );


check(
  authRoutes.length ===
    4,
  "mounted authentication router preserves exactly four routes"
);


function findRoute(
  path,
  method
) {
  return authRoutes.find(
    (
      layer
    ) =>
      layer.route
        ?.path ===
        path &&
      layer.route
        ?.methods
        ?.[method] ===
        true
  );
}


const loginLayer =
  findRoute(
    "/login",
    "post"
  );

const refreshLayer =
  findRoute(
    "/refresh",
    "post"
  );

const logoutLayer =
  findRoute(
    "/logout",
    "post"
  );

const meLayer =
  findRoute(
    "/me",
    "get"
  );


check(
  Boolean(
    loginLayer
  ),
  "mounted API exposes POST auth login"
);


check(
  Boolean(
    refreshLayer
  ),
  "mounted API exposes POST auth refresh"
);


check(
  Boolean(
    logoutLayer
  ),
  "mounted API exposes POST auth logout"
);


check(
  Boolean(
    meLayer
  ),
  "mounted API exposes GET auth current-user endpoint"
);


check(
  loginLayer.route
    .stack.length ===
    1,
  "mounted login endpoint remains public"
);


check(
  refreshLayer.route
    .stack.length ===
    1,
  "mounted refresh endpoint remains public"
);


check(
  logoutLayer.route
    .stack.length ===
    3,
  "mounted logout endpoint preserves authentication and active-session protection"
);


check(
  logoutLayer.route
    .stack[0]
    .handle ===
    authenticatePortalAccessToken,
  "mounted logout endpoint first uses canonical ACCESS authentication middleware"
);


check(
  logoutLayer.route
    .stack[1]
    .handle ===
    requireActivePortalSession,
  "mounted logout endpoint next requires active persistent session"
);


check(
  meLayer.route
    .stack.length ===
    3,
  "mounted current-user endpoint preserves authentication and active-session protection"
);


check(
  meLayer.route
    .stack[0]
    .handle ===
    authenticatePortalAccessToken,
  "mounted current-user endpoint first uses canonical ACCESS authentication middleware"
);


check(
  meLayer.route
    .stack[1]
    .handle ===
    requireActivePortalSession,
  "mounted current-user endpoint next requires active persistent session"
);


console.log(
  "\n------------------------------------------------"
);

console.log(
  `Assertions passed: ${passed}`
);

console.log(
  "P.1F-D AUTH API MOUNT VALIDATION PASSED"
);

console.log(
  "------------------------------------------------\n"
);
