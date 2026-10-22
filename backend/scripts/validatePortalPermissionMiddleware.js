import assert
  from "node:assert/strict";

import {
  RBAC_ROLES,
  RBAC_PERMISSIONS,
  AUTHORIZATION_DECISION,
} from "../services/security/authorizationRbacService.js";

import {
  createRequirePortalPermission,
  requirePortalPermission,
} from "../middleware/requirePortalPermission.js";


let passed =
  0;


function check(
  condition,
  description
) {
  assert.equal(
    Boolean(
      condition
    ),
    true,
    description
  );

  passed +=
    1;

  console.log(
    `PASS ${passed}: ${description}`
  );
}


function createResponse() {
  return {
    statusCode:
      null,

    body:
      null,

    status(
      code
    ) {
      this.statusCode =
        code;

      return this;
    },

    json(
      body
    ) {
      this.body =
        body;

      return this;
    },
  };
}


async function executeMiddleware({
  middleware,
  auth,
}) {
  const req = {
    auth,
  };

  const res =
    createResponse();

  let nextCount =
    0;

  const next =
    () => {
      nextCount +=
        1;
    };


  await middleware(
    req,
    res,
    next
  );


  return {
    res,
    nextCount,
  };
}


console.log(
  "\n================================================"
);

console.log(
  "ASHMAAN PORTAL P.1G-A — PERMISSION MIDDLEWARE"
);

console.log(
  "================================================\n"
);


check(
  typeof requirePortalPermission ===
    "function",
  "canonical portal permission factory exists"
);


const requireDashboard =
  requirePortalPermission(
    RBAC_PERMISSIONS
      .READ_DASHBOARD
  );


check(
  typeof requireDashboard ===
    "function",
  "known permission creates authorization middleware"
);


const userAllowed =
  await executeMiddleware({
    middleware:
      requireDashboard,

    auth: {
      authenticated:
        true,

      role:
        RBAC_ROLES.USER,
    },
  });


check(
  userAllowed.nextCount ===
    1,
  "USER with READ_DASHBOARD reaches protected handler"
);


check(
  userAllowed.res.statusCode ===
    null,
  "authorized request emits no authorization error"
);


const administratorAllowed =
  await executeMiddleware({
    middleware:
      requireDashboard,

    auth: {
      authenticated:
        true,

      role:
        RBAC_ROLES
          .ADMINISTRATOR,
    },
  });


check(
  administratorAllowed.nextCount ===
    1,
  "ADMINISTRATOR with READ_DASHBOARD reaches protected handler"
);


const serviceDenied =
  await executeMiddleware({
    middleware:
      requireDashboard,

    auth: {
      authenticated:
        true,

      role:
        RBAC_ROLES.SERVICE,
    },
  });


check(
  serviceDenied.nextCount ===
    0,
  "SERVICE without READ_DASHBOARD never reaches protected handler"
);


check(
  serviceDenied.res.statusCode ===
    403,
  "authenticated insufficient permission returns 403"
);


check(
  serviceDenied.res.body
    ?.error ===
    "PERMISSION_DENIED",
  "permission denial uses fail-closed response shape"
);


const unauthenticated =
  await executeMiddleware({
    middleware:
      requireDashboard,

    auth:
      null,
  });


check(
  unauthenticated.nextCount ===
    0,
  "unauthenticated request never reaches protected handler"
);


check(
  unauthenticated.res.statusCode ===
    401,
  "unauthenticated request returns 401"
);


check(
  unauthenticated.res.body
    ?.error ===
    "AUTHENTICATION_REQUIRED",
  "unauthenticated denial is explicit"
);


const engineeringForService =
  await executeMiddleware({
    middleware:
      requirePortalPermission(
        RBAC_PERMISSIONS
          .READ_ENGINEERING_ANALYTICS
      ),

    auth: {
      authenticated:
        true,

      role:
        RBAC_ROLES.SERVICE,
    },
  });


check(
  engineeringForService.nextCount ===
    1,
  "SERVICE may read Engineering Analytics"
);


const forecastingForSystem =
  await executeMiddleware({
    middleware:
      requirePortalPermission(
        RBAC_PERMISSIONS
          .READ_FORECASTING
      ),

    auth: {
      authenticated:
        true,

      role:
        RBAC_ROLES.SYSTEM,
    },
  });


check(
  forecastingForSystem.nextCount ===
    1,
  "SYSTEM may read Forecasting"
);


const financialForUser =
  await executeMiddleware({
    middleware:
      requirePortalPermission(
        RBAC_PERMISSIONS
          .READ_FINANCIAL_BI
      ),

    auth: {
      authenticated:
        true,

      role:
        RBAC_ROLES.USER,
    },
  });


check(
  financialForUser.nextCount ===
    1,
  "USER may read Financial/BI"
);


const optimizationForUser =
  await executeMiddleware({
    middleware:
      requirePortalPermission(
        RBAC_PERMISSIONS
          .READ_OPTIMIZATION_DSS
      ),

    auth: {
      authenticated:
        true,

      role:
        RBAC_ROLES.USER,
    },
  });


check(
  optimizationForUser.nextCount ===
    1,
  "USER may read advisory Optimization/DSS"
);


const equipmentControl =
  await executeMiddleware({
    middleware:
      requirePortalPermission(
        RBAC_PERMISSIONS
          .EXECUTE_EQUIPMENT_CONTROL
      ),

    auth: {
      authenticated:
        true,

      role:
        RBAC_ROLES
          .ADMINISTRATOR,
    },
  });


check(
  equipmentControl.nextCount ===
    0,
  "equipment-control permission never reaches protected handler"
);


check(
  equipmentControl.res.statusCode ===
    403,
  "equipment-control request remains forbidden"
);


let invalidPermissionRejected =
  false;


try {
  requirePortalPermission(
    "UNKNOWN_PERMISSION"
  );
} catch (
  error
) {
  invalidPermissionRejected =
    error instanceof
      TypeError &&
    error.message ===
      "PORTAL_PERMISSION_INVALID";
}


check(
  invalidPermissionRejected,
  "unknown route permission fails closed during middleware construction"
);


let missingPermissionRejected =
  false;


try {
  requirePortalPermission();
} catch (
  error
) {
  missingPermissionRejected =
    error instanceof
      TypeError &&
    error.message ===
      "PORTAL_PERMISSION_INVALID";
}


check(
  missingPermissionRejected,
  "missing route permission fails closed during middleware construction"
);


const unavailableAuthorize =
  createRequirePortalPermission({
    authorize:
      () => ({
        decision:
          AUTHORIZATION_DECISION
            .UNAVAILABLE,

        allowed:
          false,
      }),
  });


const unavailable =
  await executeMiddleware({
    middleware:
      unavailableAuthorize(
        RBAC_PERMISSIONS
          .READ_DASHBOARD
      ),

    auth: {
      authenticated:
        true,

      role:
        RBAC_ROLES.USER,
    },
  });


check(
  unavailable.nextCount ===
    0,
  "unavailable authorization never reaches protected handler"
);


check(
  unavailable.res.statusCode ===
    503,
  "unavailable authorization returns 503"
);


check(
  unavailable.res.body
    ?.error ===
    "AUTHORIZATION_UNAVAILABLE",
  "authorization-unavailable response is explicit"
);


const malformedAuthorize =
  createRequirePortalPermission({
    authorize:
      () =>
        null,
  });


const malformedResult =
  await executeMiddleware({
    middleware:
      malformedAuthorize(
        RBAC_PERMISSIONS
          .READ_DASHBOARD
      ),

    auth: {
      authenticated:
        true,

      role:
        RBAC_ROLES.USER,
    },
  });


check(
  malformedResult.nextCount ===
    0,
  "malformed authorization result fails closed"
);


check(
  malformedResult.res.statusCode ===
    503,
  "malformed authorization result returns 503"
);


let invalidDependencyRejected =
  false;


try {
  createRequirePortalPermission({
    authorize:
      null,
  });
} catch (
  error
) {
  invalidDependencyRejected =
    error instanceof
      TypeError &&
    error.message ===
      "PORTAL_AUTHORIZATION_SERVICE_REQUIRED";
}


check(
  invalidDependencyRejected,
  "invalid authorization dependency fails closed"
);


const throwingAuthorize =
  createRequirePortalPermission({
    authorize:
      () => {
        throw new Error(
          "AUTHORIZATION_BACKEND_FAILURE"
        );
      },
  });


const throwingResult =
  await executeMiddleware({
    middleware:
      throwingAuthorize(
        RBAC_PERMISSIONS
          .READ_DASHBOARD
      ),

    auth: {
      authenticated:
        true,

      role:
        RBAC_ROLES.USER,
    },
  });


check(
  throwingResult.nextCount ===
    0,
  "authorization runtime failure never reaches protected handler"
);


check(
  throwingResult.res.statusCode ===
    503,
  "authorization runtime failure fails closed with 503"
);


console.log(
  "\n------------------------------------------------"
);

console.log(
  `Assertions passed: ${passed}`
);

console.log(
  "P.1G-A PORTAL PERMISSION MIDDLEWARE VALIDATION PASSED"
);

console.log(
  "------------------------------------------------\n"
);