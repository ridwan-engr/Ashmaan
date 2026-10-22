// scripts/validateRequireInstallationAccess.js

import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  readVrmSiteId,
  requireInstallationAccess,
} from "../middleware/requireInstallationAccess.js";

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

function createNextTracker() {
  let calls = 0;

  return {
    next() {
      calls += 1;
    },

    get calls() {
      return calls;
    },
  };
}

function createResolver({
  result,
  error = null,
} = {}) {
  const calls = [];

  const resolver =
    async (input) => {
      calls.push(input);

      if (error) {
        throw error;
      }

      return result;
    };

  resolver.calls = calls;

  return resolver;
}

function createAuthorizer({
  result,
  error = null,
} = {}) {
  const calls = [];

  const authorizer =
    async (input) => {
      calls.push(input);

      if (error) {
        throw error;
      }

      return result;
    };

  authorizer.calls = calls;

  return authorizer;
}

const USER_ID =
  "64b000000000000000000001";

const INSTALLATION_ID =
  "64b000000000000000000002";

const VRM_SITE_ID =
  "18053";

function resolvedInstallation() {
  return {
    status: "RESOLVED",
    resolved: true,
    reason: "INSTALLATION_RESOLVED",
    vrmSiteId: VRM_SITE_ID,
    installationId: INSTALLATION_ID,
  };
}

function allowedAuthorization() {
  return {
    decision: "ALLOW",
    allowed: true,
    reason: "ENTITLEMENT_CONFIRMED",
    userId: USER_ID,
    installationId: INSTALLATION_ID,
    equipmentControlAllowed: false,
    automaticDispatchAllowed: false,
  };
}

async function executeMiddleware({
  req,
  resolver,
  authorizer,
  options = {},
}) {
  const res =
    createResponse();

  const nextTracker =
    createNextTracker();

  const middleware =
    requireInstallationAccess({
      ...options,

      resolveInstallation:
        resolver,

      authorizeResource:
        authorizer,
    });

  await middleware(
    req,
    res,
    nextTracker.next
      .bind(nextTracker)
  );

  return {
    req,
    res,
    nextTracker,
  };
}

console.log(`
============================================================
ASHMAAN PORTAL P.1H-D2 — INSTALLATION ACL HTTP MIDDLEWARE
============================================================
`);

/*
|--------------------------------------------------------------------------
| A. Request resource extraction
|--------------------------------------------------------------------------
*/

equal(
  readVrmSiteId(
    {
      params: {
        vrmSiteId: "18053",
      },
    }
  ),
  "18053",
  "default resource extraction reads params.vrmSiteId"
);

equal(
  readVrmSiteId(
    {
      params: {
        id: "18053",
      },
    },
    {
      paramName: "id",
      source: "params",
    }
  ),
  "18053",
  "resource extraction supports configured route parameter"
);

equal(
  readVrmSiteId(
    {
      query: {
        vrmSiteId: "18053",
      },
    },
    {
      paramName: "vrmSiteId",
      source: "query",
    }
  ),
  "18053",
  "resource extraction supports configured query source"
);

equal(
  readVrmSiteId(
    {},
    {
      paramName: "vrmSiteId",
      source: "params",
    }
  ),
  undefined,
  "missing resource parameter remains missing"
);

equal(
  readVrmSiteId(
    {
      body: {
        vrmSiteId: "18053",
      },
    },
    {
      paramName: "vrmSiteId",
      source: "body",
    }
  ),
  undefined,
  "unsupported request source is not inferred"
);

/*
|--------------------------------------------------------------------------
| B. Successful authorization path
|--------------------------------------------------------------------------
*/

const allowResolver =
  createResolver({
    result:
      resolvedInstallation(),
  });

const allowAuthorizer =
  createAuthorizer({
    result:
      allowedAuthorization(),
  });

const allowReq = {
  auth: {
    userId: USER_ID,
  },

  params: {
    vrmSiteId: VRM_SITE_ID,
  },
};

const allowExecution =
  await executeMiddleware({
    req: allowReq,
    resolver: allowResolver,
    authorizer: allowAuthorizer,
  });

equal(
  allowResolver.calls.length,
  1,
  "ALLOW path performs exactly one resource-resolution call"
);

equal(
  allowResolver.calls[0].vrmSiteId,
  VRM_SITE_ID,
  "ALLOW path resolves caller-facing vrmSiteId"
);

equal(
  allowAuthorizer.calls.length,
  1,
  "ALLOW path performs exactly one entitlement decision"
);

equal(
  allowAuthorizer.calls[0].userId,
  USER_ID,
  "entitlement decision uses authenticated req.auth.userId"
);

equal(
  allowAuthorizer.calls[0].installationId,
  INSTALLATION_ID,
  "entitlement decision uses resolved Installation ObjectId"
);

equal(
  allowExecution.nextTracker.calls,
  1,
  "ALLOW path invokes next exactly once"
);

equal(
  allowExecution.res.statusCode,
  null,
  "ALLOW path sends no error status"
);

equal(
  allowExecution.res.body,
  null,
  "ALLOW path sends no error body"
);

ok(
  Boolean(
    allowExecution.req
      .installationAccess
  ),
  "ALLOW path attaches authorized installation context"
);

equal(
  allowExecution.req
    .installationAccess.userId,
  USER_ID,
  "authorized context preserves authenticated user identity"
);

equal(
  allowExecution.req
    .installationAccess.vrmSiteId,
  VRM_SITE_ID,
  "authorized context preserves canonical vrmSiteId"
);

equal(
  allowExecution.req
    .installationAccess
    .installationId,
  INSTALLATION_ID,
  "authorized context exposes canonical Installation ObjectId"
);

equal(
  allowExecution.req
    .installationAccess.authorized,
  true,
  "authorized context explicitly marks authorization success"
);

ok(
  Object.isFrozen(
    allowExecution.req
      .installationAccess
  ),
  "authorized installation context is immutable"
);

/*
|--------------------------------------------------------------------------
| C. Missing authenticated principal
|--------------------------------------------------------------------------
*/

const missingPrincipalResolver =
  createResolver({
    result:
      resolvedInstallation(),
  });

const missingPrincipalAuthorizer =
  createAuthorizer({
    result:
      allowedAuthorization(),
  });

const missingPrincipal =
  await executeMiddleware({
    req: {
      params: {
        vrmSiteId:
          VRM_SITE_ID,
      },
    },

    resolver:
      missingPrincipalResolver,

    authorizer:
      missingPrincipalAuthorizer,
  });

equal(
  missingPrincipal.res.statusCode,
  403,
  "missing authenticated principal returns 403"
);

equal(
  missingPrincipal.res.body
    .error.code,
  "INSTALLATION_ACCESS_DENIED",
  "missing principal uses generic access-denied code"
);

equal(
  missingPrincipal.nextTracker.calls,
  0,
  "missing principal never invokes next"
);

equal(
  missingPrincipalResolver.calls.length,
  0,
  "missing principal performs no resource resolution"
);

equal(
  missingPrincipalAuthorizer.calls.length,
  0,
  "missing principal performs no entitlement lookup"
);

/*
|--------------------------------------------------------------------------
| D. Invalid/missing resource identity
|--------------------------------------------------------------------------
*/

const invalidResolver =
  createResolver({
    result: {
      status: "INVALID",
      resolved: false,
      reason:
        "VRM_SITE_ID_MISSING",
      vrmSiteId: null,
      installationId: null,
    },
  });

const invalidAuthorizer =
  createAuthorizer({
    result:
      allowedAuthorization(),
  });

const invalidResource =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {},
    },

    resolver:
      invalidResolver,

    authorizer:
      invalidAuthorizer,
  });

equal(
  invalidResource.res.statusCode,
  400,
  "invalid installation resource returns 400"
);

equal(
  invalidResource.res.body
    .error.code,
  "INVALID_INSTALLATION_RESOURCE",
  "invalid resource has explicit HTTP error code"
);

equal(
  invalidResource.nextTracker.calls,
  0,
  "invalid resource never invokes next"
);

equal(
  invalidAuthorizer.calls.length,
  0,
  "invalid resource never reaches entitlement decision"
);

/*
|--------------------------------------------------------------------------
| E. Unknown installation
|--------------------------------------------------------------------------
*/

const notFoundResolver =
  createResolver({
    result: {
      status: "NOT_FOUND",
      resolved: false,
      reason:
        "INSTALLATION_NOT_FOUND",
      vrmSiteId:
        "99999",
      installationId: null,
    },
  });

const notFoundAuthorizer =
  createAuthorizer({
    result:
      allowedAuthorization(),
  });

const notFound =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        vrmSiteId:
          "99999",
      },
    },

    resolver:
      notFoundResolver,

    authorizer:
      notFoundAuthorizer,
  });

equal(
  notFound.res.statusCode,
  404,
  "unknown installation returns 404"
);

equal(
  notFound.res.body
    .error.code,
  "INSTALLATION_NOT_FOUND",
  "unknown installation has explicit HTTP error code"
);

equal(
  notFound.nextTracker.calls,
  0,
  "unknown installation never invokes next"
);

equal(
  notFoundAuthorizer.calls.length,
  0,
  "unknown installation never reaches entitlement decision"
);

/*
|--------------------------------------------------------------------------
| F. Resolver reports unavailable
|--------------------------------------------------------------------------
*/

const unavailableResolver =
  createResolver({
    result: {
      status: "UNAVAILABLE",
      resolved: false,
      reason:
        "RESOLUTION_UNAVAILABLE",
      vrmSiteId:
        VRM_SITE_ID,
      installationId: null,
    },
  });

const unavailableResolverAuthorizer =
  createAuthorizer({
    result:
      allowedAuthorization(),
  });

const resolutionUnavailable =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        vrmSiteId:
          VRM_SITE_ID,
      },
    },

    resolver:
      unavailableResolver,

    authorizer:
      unavailableResolverAuthorizer,
  });

equal(
  resolutionUnavailable.res
    .statusCode,
  503,
  "resolver UNAVAILABLE returns 503"
);

equal(
  resolutionUnavailable.res.body
    .error.code,
  "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
  "resolver UNAVAILABLE uses authorization-unavailable code"
);

equal(
  resolutionUnavailable.nextTracker.calls,
  0,
  "resolver UNAVAILABLE never invokes next"
);

equal(
  unavailableResolverAuthorizer
    .calls.length,
  0,
  "resolver UNAVAILABLE never reaches entitlement decision"
);

/*
|--------------------------------------------------------------------------
| G. Resolver throws
|--------------------------------------------------------------------------
*/

const throwingResolver =
  createResolver({
    error:
      new Error(
        "simulated resolver exception"
      ),
  });

const throwingResolverAuthorizer =
  createAuthorizer({
    result:
      allowedAuthorization(),
  });

const resolverException =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        vrmSiteId:
          VRM_SITE_ID,
      },
    },

    resolver:
      throwingResolver,

    authorizer:
      throwingResolverAuthorizer,
  });

equal(
  resolverException.res.statusCode,
  503,
  "resolver exception returns 503"
);

equal(
  resolverException.nextTracker.calls,
  0,
  "resolver exception never invokes next"
);

equal(
  throwingResolverAuthorizer
    .calls.length,
  0,
  "resolver exception never reaches entitlement decision"
);

/*
|--------------------------------------------------------------------------
| H. Entitlement DENY
|--------------------------------------------------------------------------
*/

const denyResolver =
  createResolver({
    result:
      resolvedInstallation(),
  });

const denyAuthorizer =
  createAuthorizer({
    result: {
      decision: "DENY",
      allowed: false,
      reason:
        "ENTITLEMENT_NOT_FOUND",
      userId: USER_ID,
      installationId:
        INSTALLATION_ID,
    },
  });

const denied =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        vrmSiteId:
          VRM_SITE_ID,
      },
    },

    resolver:
      denyResolver,

    authorizer:
      denyAuthorizer,
  });

equal(
  denied.res.statusCode,
  403,
  "entitlement DENY returns 403"
);

equal(
  denied.res.body.error.code,
  "INSTALLATION_ACCESS_DENIED",
  "entitlement DENY uses generic access-denied code"
);

equal(
  denied.nextTracker.calls,
  0,
  "entitlement DENY never invokes next"
);

ok(
  !Object.prototype.hasOwnProperty.call(
    denied.req,
    "installationAccess"
  ),
  "DENY does not attach authorized resource context"
);

/*
|--------------------------------------------------------------------------
| I. Inactive and missing entitlements are not exposed differently
|--------------------------------------------------------------------------
*/

const inactiveResolver =
  createResolver({
    result:
      resolvedInstallation(),
  });

const inactiveAuthorizer =
  createAuthorizer({
    result: {
      decision: "DENY",
      allowed: false,
      reason:
        "ENTITLEMENT_INACTIVE",
      userId: USER_ID,
      installationId:
        INSTALLATION_ID,
    },
  });

const inactiveDenied =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        vrmSiteId:
          VRM_SITE_ID,
      },
    },

    resolver:
      inactiveResolver,

    authorizer:
      inactiveAuthorizer,
  });

equal(
  inactiveDenied.res.statusCode,
  denied.res.statusCode,
  "inactive and absent entitlement return the same HTTP status"
);

equal(
  inactiveDenied.res.body.error.code,
  denied.res.body.error.code,
  "inactive and absent entitlement expose the same HTTP error code"
);

equal(
  inactiveDenied.res.body.error.message,
  denied.res.body.error.message,
  "inactive and absent entitlement expose the same HTTP message"
);

/*
|--------------------------------------------------------------------------
| J. Entitlement service unavailable
|--------------------------------------------------------------------------
*/

const authUnavailableResolver =
  createResolver({
    result:
      resolvedInstallation(),
  });

const authUnavailableAuthorizer =
  createAuthorizer({
    result: {
      decision: "UNAVAILABLE",
      allowed: false,
      reason:
        "AUTHORIZATION_UNAVAILABLE",
      userId: USER_ID,
      installationId:
        INSTALLATION_ID,
    },
  });

const authorizationUnavailable =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        vrmSiteId:
          VRM_SITE_ID,
      },
    },

    resolver:
      authUnavailableResolver,

    authorizer:
      authUnavailableAuthorizer,
  });

equal(
  authorizationUnavailable.res
    .statusCode,
  503,
  "authorization UNAVAILABLE returns 503"
);

equal(
  authorizationUnavailable.res.body
    .error.code,
  "INSTALLATION_AUTHORIZATION_UNAVAILABLE",
  "authorization UNAVAILABLE has explicit HTTP error code"
);

equal(
  authorizationUnavailable.nextTracker.calls,
  0,
  "authorization UNAVAILABLE never invokes next"
);

/*
|--------------------------------------------------------------------------
| K. Authorizer throws
|--------------------------------------------------------------------------
*/

const throwingAuthorizerResolver =
  createResolver({
    result:
      resolvedInstallation(),
  });

const throwingAuthorizer =
  createAuthorizer({
    error:
      new Error(
        "simulated authorization exception"
      ),
  });

const authorizationException =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        vrmSiteId:
          VRM_SITE_ID,
      },
    },

    resolver:
      throwingAuthorizerResolver,

    authorizer:
      throwingAuthorizer,
  });

equal(
  authorizationException.res
    .statusCode,
  503,
  "authorization exception returns 503"
);

equal(
  authorizationException.nextTracker.calls,
  0,
  "authorization exception never invokes next"
);

/*
|--------------------------------------------------------------------------
| L. Unknown resolver output fails closed
|--------------------------------------------------------------------------
*/

const unknownResolver =
  createResolver({
    result: {
      status: "SOMETHING_NEW",
      resolved: true,
      installationId:
        INSTALLATION_ID,
      vrmSiteId:
        VRM_SITE_ID,
    },
  });

const unknownResolverAuthorizer =
  createAuthorizer({
    result:
      allowedAuthorization(),
  });

const unknownResolution =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        vrmSiteId:
          VRM_SITE_ID,
      },
    },

    resolver:
      unknownResolver,

    authorizer:
      unknownResolverAuthorizer,
  });

equal(
  unknownResolution.res.statusCode,
  503,
  "unknown resolver status fails closed with 503"
);

equal(
  unknownResolverAuthorizer
    .calls.length,
  0,
  "unknown resolver status never reaches entitlement decision"
);

equal(
  unknownResolution.nextTracker.calls,
  0,
  "unknown resolver status never invokes next"
);

/*
|--------------------------------------------------------------------------
| M. RESOLVED without Installation ObjectId fails closed
|--------------------------------------------------------------------------
*/

const incompleteResolver =
  createResolver({
    result: {
      status: "RESOLVED",
      resolved: true,
      vrmSiteId:
        VRM_SITE_ID,
      installationId: null,
    },
  });

const incompleteAuthorizer =
  createAuthorizer({
    result:
      allowedAuthorization(),
  });

const incompleteResolution =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        vrmSiteId:
          VRM_SITE_ID,
      },
    },

    resolver:
      incompleteResolver,

    authorizer:
      incompleteAuthorizer,
  });

equal(
  incompleteResolution.res.statusCode,
  503,
  "RESOLVED without Installation ObjectId fails closed"
);

equal(
  incompleteAuthorizer.calls.length,
  0,
  "incomplete resolution never reaches entitlement decision"
);

equal(
  incompleteResolution.nextTracker.calls,
  0,
  "incomplete resolution never invokes next"
);

/*
|--------------------------------------------------------------------------
| N. Unknown authorization output fails closed
|--------------------------------------------------------------------------
*/

const unknownAuthResolver =
  createResolver({
    result:
      resolvedInstallation(),
  });

const unknownAuthorizer =
  createAuthorizer({
    result: {
      decision: "UNKNOWN",
      allowed: true,
    },
  });

const unknownAuthorization =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        vrmSiteId:
          VRM_SITE_ID,
      },
    },

    resolver:
      unknownAuthResolver,

    authorizer:
      unknownAuthorizer,
  });

equal(
  unknownAuthorization.res.statusCode,
  503,
  "unknown authorization decision fails closed with 503"
);

equal(
  unknownAuthorization.nextTracker.calls,
  0,
  "unknown authorization decision never invokes next"
);

/*
|--------------------------------------------------------------------------
| O. ALLOW decision with allowed=false fails closed
|--------------------------------------------------------------------------
*/

const inconsistentResolver =
  createResolver({
    result:
      resolvedInstallation(),
  });

const inconsistentAuthorizer =
  createAuthorizer({
    result: {
      decision: "ALLOW",
      allowed: false,
      reason:
        "ENTITLEMENT_CONFIRMED",
    },
  });

const inconsistentAuthorization =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        vrmSiteId:
          VRM_SITE_ID,
      },
    },

    resolver:
      inconsistentResolver,

    authorizer:
      inconsistentAuthorizer,
  });

equal(
  inconsistentAuthorization.res
    .statusCode,
  503,
  "inconsistent ALLOW result fails closed"
);

equal(
  inconsistentAuthorization
    .nextTracker.calls,
  0,
  "inconsistent ALLOW result never invokes next"
);

/*
|--------------------------------------------------------------------------
| P. Configured direct-VRM :id compatibility
|--------------------------------------------------------------------------
*/

const idResolver =
  createResolver({
    result:
      resolvedInstallation(),
  });

const idAuthorizer =
  createAuthorizer({
    result:
      allowedAuthorization(),
  });

const idExecution =
  await executeMiddleware({
    req: {
      auth: {
        userId: USER_ID,
      },

      params: {
        id:
          VRM_SITE_ID,
      },
    },

    resolver:
      idResolver,

    authorizer:
      idAuthorizer,

    options: {
      paramName: "id",
      source: "params",
    },
  });

equal(
  idResolver.calls[0].vrmSiteId,
  VRM_SITE_ID,
  "configured :id route is treated as caller-facing VRM site identity"
);

equal(
  idExecution.nextTracker.calls,
  1,
  "authorized configured :id route invokes next"
);

equal(
  idExecution.req
    .installationAccess
    .installationId,
  INSTALLATION_ID,
  "configured :id route still authorizes canonical Installation ObjectId"
);

/*
|--------------------------------------------------------------------------
| Q. No RBAC duplication
|--------------------------------------------------------------------------
*/

ok(
  !Object.prototype.hasOwnProperty.call(
    allowExecution.req
      .installationAccess,
    "role"
  ),
  "authorized resource context does not duplicate RBAC role"
);

ok(
  !Object.prototype.hasOwnProperty.call(
    allowExecution.req
      .installationAccess,
    "permission"
  ),
  "authorized resource context does not duplicate RBAC permission"
);

/*
|--------------------------------------------------------------------------
| R. No control authority
|--------------------------------------------------------------------------
*/

ok(
  !Object.prototype.hasOwnProperty.call(
    allowExecution.req
      .installationAccess,
    "equipmentControlAllowed"
  ),
  "HTTP ACL context does not grant equipment-control authority"
);

ok(
  !Object.prototype.hasOwnProperty.call(
    allowExecution.req
      .installationAccess,
    "automaticDispatchAllowed"
  ),
  "HTTP ACL context does not grant automatic-dispatch authority"
);

/*
|--------------------------------------------------------------------------
| S. Runtime isolation
|--------------------------------------------------------------------------
*/

equal(
  mongoose.connection.readyState,
  0,
  "middleware validator establishes no MongoDB connection"
);

/*
|--------------------------------------------------------------------------
| T. Completion
|--------------------------------------------------------------------------
*/

pass(
  "P.1H-D2 HTTP installation ACL assertion plan completed"
);

console.log(`
------------------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1H-D2 INSTALLATION ACL HTTP MIDDLEWARE VALIDATION PASSED
------------------------------------------------------------

Boundary: authentication         = UPSTREAM
Boundary: active session         = UPSTREAM
Boundary: RBAC                   = UPSTREAM / SEPARATE
Boundary: resource resolution    = D1
Boundary: entitlement decision   = P.1H-C
Boundary: HTTP ACL enforcement   = IMPLEMENTED
Boundary: route wiring           = NOT INCLUDED
Boundary: Atlas activity         = NONE
Boundary: equipment control      = NOT INCLUDED
Boundary: automatic dispatch     = NOT INCLUDED
`);
