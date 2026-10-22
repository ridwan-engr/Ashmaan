// scripts/validatePortalAuthRoutes.js

import assert
  from "node:assert/strict";

import {
  createPortalAuthRouter,
} from "../routes/portalAuthRoutes.js";


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


const calls = {
  login:
    0,

  refresh:
    0,

  logout:
    0,

  me:
    0,

  authenticate:
    0,

  requireActiveSession:
    0,
};


const controller = {
  login(
    req,
    res
  ) {
    calls.login +=
      1;

    return res;
  },


  refresh(
    req,
    res
  ) {
    calls.refresh +=
      1;

    return res;
  },


  logout(
    req,
    res
  ) {
    calls.logout +=
      1;

    return res;
  },


  me(
    req,
    res
  ) {
    calls.me +=
      1;

    return res;
  },
};


function authenticate(
  req,
  res,
  next
) {
  calls.authenticate +=
    1;

  return next();
}


function requireActiveSession(
  req,
  res,
  next
) {
  calls.requireActiveSession +=
    1;

  return next();
}


console.log(
  "\n================================================"
);

console.log(
  "ASHMAAN PORTAL P.1F-C — AUTH ROUTE TOPOLOGY"
);

console.log(
  "================================================\n"
);


const router =
  createPortalAuthRouter({
    controller,
    authenticate,
    requireActiveSession,
  });


check(
  typeof router ===
    "function",
  "portal authentication router is an Express router"
);


check(
  Array.isArray(
    router.stack
  ),
  "portal authentication router exposes route stack"
);


const routeLayers =
  router.stack.filter(
    (
      layer
    ) =>
      layer.route
  );


check(
  routeLayers.length ===
    4,
  "portal authentication router exposes exactly four routes"
);


function findRoute(
  path,
  method
) {
  return routeLayers.find(
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


const loginRoute =
  findRoute(
    "/login",
    "post"
  );

const refreshRoute =
  findRoute(
    "/refresh",
    "post"
  );

const logoutRoute =
  findRoute(
    "/logout",
    "post"
  );

const meRoute =
  findRoute(
    "/me",
    "get"
  );


check(
  Boolean(
    loginRoute
  ),
  "POST /login route exists"
);


check(
  Boolean(
    refreshRoute
  ),
  "POST /refresh route exists"
);


check(
  Boolean(
    logoutRoute
  ),
  "POST /logout route exists"
);


check(
  Boolean(
    meRoute
  ),
  "GET /me route exists"
);


check(
  loginRoute.route
    .stack.length ===
    1,
  "POST /login remains public"
);


check(
  refreshRoute.route
    .stack.length ===
    1,
  "POST /refresh remains public"
);


check(
  logoutRoute.route
    .stack.length ===
    3,
  "POST /logout requires token authentication and active-session enforcement"
);


check(
  meRoute.route
    .stack.length ===
    3,
  "GET /me requires token authentication and active-session enforcement"
);


check(
  logoutRoute.route
    .stack[0]
    .handle ===
    authenticate,
  "logout first uses canonical portal authentication middleware"
);


check(
  logoutRoute.route
    .stack[1]
    .handle ===
    requireActiveSession,
  "logout next requires active persistent session"
);


check(
  logoutRoute.route
    .stack[2]
    .handle ===
    controller.logout,
  "logout controller executes only after authentication and session validation"
);


check(
  meRoute.route
    .stack[0]
    .handle ===
    authenticate,
  "current-user route first uses canonical portal authentication middleware"
);


check(
  meRoute.route
    .stack[1]
    .handle ===
    requireActiveSession,
  "current-user route next requires active persistent session"
);


check(
  meRoute.route
    .stack[2]
    .handle ===
    controller.me,
  "current-user controller executes only after authentication and session validation"
);


check(
  loginRoute.route
    .stack[0]
    .handle ===
    controller.login,
  "login delegates directly to canonical authentication controller"
);


check(
  refreshRoute.route
    .stack[0]
    .handle ===
    controller.refresh,
  "refresh delegates directly to canonical authentication controller"
);


check(
  !findRoute(
    "/login",
    "get"
  ),
  "login is not exposed through GET"
);


check(
  !findRoute(
    "/refresh",
    "get"
  ),
  "refresh is not exposed through GET"
);


check(
  !findRoute(
    "/logout",
    "get"
  ),
  "logout is not exposed through GET"
);


check(
  !findRoute(
    "/me",
    "post"
  ),
  "current-user endpoint is not exposed through POST"
);


let invalidControllerRejected =
  false;


try {
  createPortalAuthRouter({
    controller: {},
    authenticate,
    requireActiveSession,
  });
} catch (
  error
) {
  invalidControllerRejected =
    error?.message ===
      "PORTAL_AUTH_CONTROLLER_INVALID";
}


check(
  invalidControllerRejected,
  "invalid authentication controller fails closed"
);


let invalidAuthenticationRejected =
  false;


try {
  createPortalAuthRouter({
    controller,

    authenticate:
      null,

    requireActiveSession,
  });
} catch (
  error
) {
  invalidAuthenticationRejected =
    error?.message ===
      "PORTAL_AUTH_MIDDLEWARE_INVALID";
}


check(
  invalidAuthenticationRejected,
  "invalid authentication middleware fails closed"
);


let invalidActiveSessionRejected =
  false;


try {
  createPortalAuthRouter({
    controller,
    authenticate,

    requireActiveSession:
      null,
  });
} catch (
  error
) {
  invalidActiveSessionRejected =
    error?.message ===
      "PORTAL_ACTIVE_SESSION_MIDDLEWARE_INVALID";
}


check(
  invalidActiveSessionRejected,
  "invalid active-session middleware fails closed"
);


console.log(
  "\n------------------------------------------------"
);

console.log(
  `Assertions passed: ${passed}`
);

console.log(
  "P.1F-C AUTH ROUTE TOPOLOGY VALIDATION PASSED"
);

console.log(
  "------------------------------------------------\n"
);
