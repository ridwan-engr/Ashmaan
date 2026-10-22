// scripts/validatePortalAuthHttpController.js

import assert from "node:assert/strict";

import {
  DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  isSecureCookiePolicy,
} from "../services/security/sessionTokenSecurityService.js";

import {
  PORTAL_AUTH_ERROR,
} from "../services/security/portalAuthenticationService.js";

import {
  PORTAL_REFRESH_COOKIE_NAME,
  PORTAL_REFRESH_COOKIE_OPTIONS,
  PORTAL_REFRESH_COOKIE_CLEAR_OPTIONS,
  readCookie,
  createPortalAuthController,
} from "../controllers/portalAuthController.js";


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


function createResponse() {
  return {
    statusCode:
      200,

    body:
      null,

    cookies:
      [],

    clearedCookies:
      [],

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

    cookie(
      name,
      value,
      options
    ) {
      this.cookies.push({
        name,
        value,
        options,
      });

      return this;
    },

    clearCookie(
      name,
      options
    ) {
      this.clearedCookies.push({
        name,
        options,
      });

      return this;
    },
  };
}


function createAuthError(
  code
) {
  const error =
    new Error(
      code
    );

  error.code =
    code;

  return error;
}


console.log(
  "\n================================================"
);

console.log(
  "ASHMAAN PORTAL P.1F-B — AUTH HTTP CONTROLLER"
);

console.log(
  "================================================\n"
);


check(
  PORTAL_REFRESH_COOKIE_NAME ===
    "ashmaan_refresh",
  "refresh cookie uses canonical portal name"
);


check(
  Object.isFrozen(
    PORTAL_REFRESH_COOKIE_OPTIONS
  ),
  "refresh-cookie options are frozen"
);


check(
  isSecureCookiePolicy(
    PORTAL_REFRESH_COOKIE_OPTIONS
  ),
  "refresh cookie satisfies Phase 13 secure-cookie policy"
);


check(
  PORTAL_REFRESH_COOKIE_OPTIONS
    .httpOnly ===
    true,
  "refresh cookie is HttpOnly"
);


check(
  PORTAL_REFRESH_COOKIE_OPTIONS
    .secure ===
    true,
  "refresh cookie always uses Secure flag"
);


check(
  PORTAL_REFRESH_COOKIE_OPTIONS
    .sameSite ===
    "strict",
  "refresh cookie uses SameSite strict"
);


check(
  PORTAL_REFRESH_COOKIE_OPTIONS
    .path ===
    "/",
  "refresh cookie has explicit root path"
);


check(
  PORTAL_REFRESH_COOKIE_OPTIONS
    .maxAge ===
    DEFAULT_REFRESH_TOKEN_TTL_SECONDS *
      1000,
  "refresh cookie lifetime matches 7-day refresh-token TTL"
);


check(
  readCookie(
    "alpha=1; ashmaan_refresh=token-123; beta=2",
    PORTAL_REFRESH_COOKIE_NAME
  ) ===
    "token-123",
  "refresh cookie is parsed by exact cookie name"
);


check(
  readCookie(
    "ashmaan_refresh_extra=wrong; ashmaan_refresh=correct",
    PORTAL_REFRESH_COOKIE_NAME
  ) ===
    "correct",
  "cookie parser does not accept prefix-name collisions"
);


check(
  readCookie(
    "ashmaan_refresh=abc%2Edef%2Eghi",
    PORTAL_REFRESH_COOKIE_NAME
  ) ===
    "abc.def.ghi",
  "cookie parser decodes encoded token value"
);


check(
  readCookie(
    "other=value",
    PORTAL_REFRESH_COOKIE_NAME
  ) ===
    null,
  "missing refresh cookie fails closed"
);


const calls = {
  login:
    0,

  refresh:
    0,

  logout:
    0,

  me:
    0,
};


const authenticationService = {
  async login({
    email,
    password,
  }) {
    calls.login +=
      1;

    assert.equal(
      email,
      "admin@example.com"
    );

    assert.equal(
      password,
      "correct-password"
    );

    return {
      accessToken:
        "access-login",

      refreshToken:
        "refresh-login",

      user: {
        id:
          "user-001",

        role:
          "ADMINISTRATOR",
      },
    };
  },


  async refresh({
    refreshToken,
  }) {
    calls.refresh +=
      1;

    assert.equal(
      refreshToken,
      "refresh-login"
    );

    return {
      accessToken:
        "access-refreshed",

      refreshToken:
        "refresh-rotated",

      user: {
        id:
          "user-001",

        role:
          "ADMINISTRATOR",
      },
    };
  },


  async logout({
    sessionId,
  }) {
    calls.logout +=
      1;

    assert.equal(
      sessionId,
      "session-001"
    );

    return true;
  },


  async getCurrentUser({
    userId,
  }) {
    calls.me +=
      1;

    assert.equal(
      userId,
      "user-001"
    );

    return {
      id:
        "user-001",

      role:
        "ADMINISTRATOR",
    };
  },
};


const controller =
  createPortalAuthController({
    authenticationService,
  });


const loginRes =
  createResponse();


await controller.login(
  {
    body: {
      email:
        "admin@example.com",

      password:
        "correct-password",
    },
  },
  loginRes
);


check(
  calls.login ===
    1,
  "login delegates exactly once to authentication service"
);


check(
  loginRes.statusCode ===
    200 &&
  loginRes.body
    ?.success ===
    true,
  "successful login returns 200"
);


check(
  loginRes.body
    ?.accessToken ===
    "access-login",
  "successful login returns access token"
);


check(
  !Object.prototype.hasOwnProperty.call(
    loginRes.body,
    "refreshToken"
  ),
  "successful login never exposes refresh token in JSON"
);


check(
  loginRes.cookies.length ===
    1 &&
  loginRes.cookies[0]
    .name ===
    PORTAL_REFRESH_COOKIE_NAME &&
  loginRes.cookies[0]
    .value ===
    "refresh-login",
  "successful login places refresh token in cookie"
);


check(
  loginRes.cookies[0]
    .options ===
    PORTAL_REFRESH_COOKIE_OPTIONS,
  "login uses canonical secure-cookie options"
);


const refreshRes =
  createResponse();


await controller.refresh(
  {
    headers: {
      cookie:
        "other=1; ashmaan_refresh=refresh-login",
    },
  },
  refreshRes
);


check(
  calls.refresh ===
    1,
  "refresh delegates exactly once to authentication service"
);


check(
  refreshRes.statusCode ===
    200 &&
  refreshRes.body
    ?.accessToken ===
    "access-refreshed",
  "successful refresh returns rotated access result"
);


check(
  !Object.prototype.hasOwnProperty.call(
    refreshRes.body,
    "refreshToken"
  ),
  "successful refresh never exposes refresh token in JSON"
);


check(
  refreshRes.cookies.length ===
    1 &&
  refreshRes.cookies[0]
    .value ===
    "refresh-rotated",
  "successful refresh replaces cookie with rotated refresh token"
);


const missingRefreshRes =
  createResponse();


await controller.refresh(
  {
    headers: {},
  },
  missingRefreshRes
);


check(
  missingRefreshRes.statusCode ===
    401 &&
  missingRefreshRes.body
    ?.success ===
    false,
  "missing refresh cookie fails closed with 401"
);


check(
  calls.refresh ===
    1,
  "missing refresh cookie never invokes refresh service"
);


const logoutRes =
  createResponse();


await controller.logout(
  {
    auth: {
      sessionId:
        "session-001",
    },
  },
  logoutRes
);


check(
  calls.logout ===
    1,
  "logout delegates authenticated session identity"
);


check(
  logoutRes.statusCode ===
    200 &&
  logoutRes.body
    ?.success ===
    true,
  "successful logout returns 200"
);


check(
  logoutRes.clearedCookies
    .length ===
    1 &&
  logoutRes.clearedCookies[0]
    .name ===
    PORTAL_REFRESH_COOKIE_NAME,
  "logout clears canonical refresh cookie"
);


check(
  logoutRes.clearedCookies[0]
    .options ===
    PORTAL_REFRESH_COOKIE_CLEAR_OPTIONS,
  "logout uses canonical secure clear-cookie options"
);


const meRes =
  createResponse();


await controller.me(
  {
    auth: {
      userId:
        "user-001",
    },
  },
  meRes
);


check(
  calls.me ===
    1,
  "current-user endpoint delegates authenticated user identity"
);


check(
  meRes.statusCode ===
    200 &&
  meRes.body
    ?.user?.id ===
    "user-001",
  "current-user response returns canonical active user"
);


const invalidService =
  createPortalAuthController({
    authenticationService: {
      async login() {
        throw createAuthError(
          PORTAL_AUTH_ERROR
            .INVALID_CREDENTIALS
        );
      },

      async refresh() {
        throw createAuthError(
          PORTAL_AUTH_ERROR
            .REFRESH_TOKEN_INVALID
        );
      },

      async logout() {
        return false;
      },

      async getCurrentUser() {
        return null;
      },
    },
  });


const invalidLoginRes =
  createResponse();


await invalidService.login(
  {
    body: {
      email:
        "bad@example.com",

      password:
        "bad",
    },
  },
  invalidLoginRes
);


check(
  invalidLoginRes.statusCode ===
    401 &&
  invalidLoginRes.body
    ?.success ===
    false,
  "invalid login credentials map to 401"
);


check(
  invalidLoginRes.cookies
    .length ===
    0,
  "failed login never sets refresh cookie"
);


const unavailableController =
  createPortalAuthController({
    authenticationService: {
      async login() {
        throw createAuthError(
          PORTAL_AUTH_ERROR
            .CONFIGURATION_UNAVAILABLE
        );
      },

      async refresh() {
        throw createAuthError(
          PORTAL_AUTH_ERROR
            .CONFIGURATION_UNAVAILABLE
        );
      },

      async logout() {
        throw createAuthError(
          PORTAL_AUTH_ERROR
            .CONFIGURATION_UNAVAILABLE
        );
      },

      async getCurrentUser() {
        throw createAuthError(
          PORTAL_AUTH_ERROR
            .CONFIGURATION_UNAVAILABLE
        );
      },
    },
  });


const unavailableRes =
  createResponse();


await unavailableController.login(
  {
    body: {},
  },
  unavailableRes
);


check(
  unavailableRes.statusCode ===
    503,
  "authentication configuration failure maps to 503"
);


console.log(
  "\n------------------------------------------------"
);

console.log(
  `Assertions passed: ${passed}`
);

console.log(
  "P.1F-B AUTH HTTP CONTROLLER VALIDATION PASSED"
);

console.log(
  "------------------------------------------------\n"
);
