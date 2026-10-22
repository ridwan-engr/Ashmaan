import assert from "node:assert/strict";

import {
  RBAC_ROLES,
} from "../services/security/authorizationRbacService.js";

import {
  USER_ACCOUNT_STATUS,
  normalizeEmail,
} from "../models/User.js";

import {
  SESSION_STATUS,
  hashSessionToken,
} from "../models/Session.js";

import {
  verifyAccessToken,
  verifyRefreshToken,
} from "../services/security/portalTokenService.js";

import {
  PORTAL_AUTH_ERROR,
  createPortalAuthenticationService,
} from "../services/security/portalAuthenticationService.js";


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
  "ASHMAAN PORTAL P.1E — AUTHENTICATION SERVICE"
);

console.log(
  "================================================\n"
);


const secret =
  "portal-p1e-validator-secret-material";

const issuer =
  "ashmaan-api";

const audience =
  "ashmaan-portal";

const fixedNow =
  new Date(
    "2026-09-18T08:00:00.000Z"
  );


const users =
  new Map();

const sessions =
  new Map();


function makeUser({
  id,
  email,
  password,
  role,
  status,
}) {
  return {
    _id:
      id,

    email:
      normalizeEmail(
        email
      ),

    displayName:
      "Portal Test User",

    role,

    status,

    lastLoginAt:
      null,

    async verifyPassword(
      candidate
    ) {
      return candidate ===
        password;
    },

    async save() {
      users.set(
        String(
          this._id
        ),
        this
      );

      return this;
    },
  };
}


const activeUser =
  makeUser({
    id:
      "user-001",

    email:
      "admin@example.com",

    password:
      "Correct-Password-123!",

    role:
      RBAC_ROLES.ADMINISTRATOR,

    status:
      USER_ACCOUNT_STATUS.ACTIVE,
  });


const disabledUser =
  makeUser({
    id:
      "user-002",

    email:
      "disabled@example.com",

    password:
      "Correct-Password-123!",

    role:
      RBAC_ROLES.USER,

    status:
      USER_ACCOUNT_STATUS.DISABLED,
  });


users.set(
  activeUser._id,
  activeUser
);

users.set(
  disabledUser._id,
  disabledUser
);


const UserModel = {
  async findForAuthentication(
    email
  ) {
    for (
      const user of
      users.values()
    ) {
      if (
        user.email ===
          normalizeEmail(
            email
          )
      ) {
        return user;
      }
    }

    return null;
  },

  async findById(
    id
  ) {
    return (
      users.get(
        String(
          id
        )
      ) ??
      null
    );
  },
};


function hydrateSession(
  record
) {
  return {
    ...record,

    matchesRefreshToken(
      token
    ) {
      return (
        this.refreshTokenHash ===
        hashSessionToken(
          token
        )
      );
    },

    isUsable(
      current
    ) {
      return (
        this.status ===
          SESSION_STATUS.ACTIVE &&
        this.expiresAt.getTime() >
          current.getTime()
      );
    },

    revoke(
      reason,
      current
    ) {
      this.status =
        SESSION_STATUS.REVOKED;

      this.revokedAt =
        current;

      this.revocationReason =
        reason;

      return this;
    },

    async save() {
      sessions.set(
        this.sessionId,
        this
      );

      return this;
    },
  };
}


let refreshRotationAttempts =
  0;

let refreshRotationSuccesses =
  0;


const SessionModel = {
  async create(
    input
  ) {
    const session =
      hydrateSession({
        ...input,

        revokedAt:
          null,

        revocationReason:
          null,

        lastUsedAt:
          null,
      });

    sessions.set(
      session.sessionId,
      session
    );

    return session;
  },

  async findForRefresh(
    sessionId
  ) {
    return (
      sessions.get(
        sessionId
      ) ??
      null
    );
  },

  async rotateRefreshToken({
    sessionId,
    userId,
    currentRefreshToken,
    nextRefreshToken,
    now,
  }) {
    refreshRotationAttempts +=
      1;


    const session =
      sessions.get(
        sessionId
      ) ??
      null;


    if (
      !session ||
      String(
        session.user
      ) !==
        String(
          userId
        ) ||
      session.status !==
        SESSION_STATUS.ACTIVE ||
      !(session.expiresAt instanceof Date) ||
      session.expiresAt.getTime() <=
        now.getTime() ||
      session.refreshTokenHash !==
        hashSessionToken(
          currentRefreshToken
        )
    ) {
      return null;
    }


    session.refreshTokenHash =
      hashSessionToken(
        nextRefreshToken
      );

    session.lastUsedAt =
      now;


    sessions.set(
      session.sessionId,
      session
    );


    refreshRotationSuccesses +=
      1;


    return session;
  },

  async findOne({
    sessionId,
  }) {
    return (
      sessions.get(
        sessionId
      ) ??
      null
    );
  },
};


let sessionSequence = 0;


const service =
  createPortalAuthenticationService({
    UserModel,
    SessionModel,
    secret,
    issuer,
    audience,

    now:
      () =>
        new Date(
          fixedNow
        ),

    createSessionId:
      () => {
        sessionSequence +=
          1;

        return `session-${sessionSequence}`;
      },
  });


check(
  Object.isFrozen(
    PORTAL_AUTH_ERROR
  ),
  "authentication-error taxonomy is frozen"
);


let invalidCredentialsRejected =
  false;


try {
  await service.login({
    email:
      "admin@example.com",

    password:
      "wrong-password",
  });
} catch (
  error
) {
  invalidCredentialsRejected =
    error?.code ===
      PORTAL_AUTH_ERROR
        .INVALID_CREDENTIALS;
}


check(
  invalidCredentialsRejected,
  "invalid credentials are rejected"
);


let disabledLoginRejected =
  false;


try {
  await service.login({
    email:
      "disabled@example.com",

    password:
      "Correct-Password-123!",
  });
} catch (
  error
) {
  disabledLoginRejected =
    error?.code ===
      PORTAL_AUTH_ERROR
        .ACCOUNT_DISABLED;
}


check(
  disabledLoginRejected,
  "disabled account cannot login"
);


const login =
  await service.login({
    email:
      " ADMIN@EXAMPLE.COM ",

    password:
      "Correct-Password-123!",
  });


check(
  typeof login.accessToken ===
    "string",
  "login issues access token"
);


check(
  typeof login.refreshToken ===
    "string",
  "login issues refresh token"
);


check(
  login.user.id ===
    activeUser._id,
  "login returns canonical user identity"
);


check(
  login.user.role ===
    RBAC_ROLES.ADMINISTRATOR,
  "login returns authoritative RBAC role"
);


check(
  !Object.prototype.hasOwnProperty.call(
    login.user,
    "passwordHash"
  ),
  "login response excludes password hash"
);


check(
  sessions.size ===
    1,
  "login creates one persistent session"
);


const accessIdentity =
  verifyAccessToken({
    token:
      login.accessToken,

    secret,
    issuer,
    audience,
  });


const refreshIdentity =
  verifyRefreshToken({
    token:
      login.refreshToken,

    secret,
    issuer,
    audience,
  });


check(
  accessIdentity.subject ===
    activeUser._id,
  "access token subject matches user"
);


check(
  refreshIdentity.subject ===
    activeUser._id,
  "refresh token subject matches user"
);


check(
  accessIdentity.sessionId ===
    refreshIdentity.sessionId,
  "access and refresh tokens share session identity"
);


const session =
  sessions.get(
    refreshIdentity.sessionId
  );


check(
  Boolean(
    session
  ),
  "issued session can be resolved"
);


check(
  session.refreshTokenHash ===
    hashSessionToken(
      login.refreshToken
    ),
  "session stores refresh-token hash"
);


check(
  session.refreshTokenHash !==
    login.refreshToken,
  "raw refresh token is not persisted"
);


check(
  activeUser.lastLoginAt instanceof
    Date,
  "successful login records last-login timestamp"
);


const originalRefreshToken =
  login.refreshToken;


const refreshed =
  await service.refresh({
    refreshToken:
      originalRefreshToken,
  });


check(
  typeof refreshed.accessToken ===
    "string",
  "refresh issues new access token"
);


check(
  typeof refreshed.refreshToken ===
    "string",
  "refresh rotates refresh token"
);


check(
  refreshed.refreshToken !==
    originalRefreshToken,
  "rotated refresh token differs from previous token"
);


check(
  session.refreshTokenHash ===
    hashSessionToken(
      refreshed.refreshToken
    ),
  "session stores rotated refresh-token hash"
);


check(
  session.lastUsedAt instanceof
    Date,
  "refresh records session last-used timestamp"
);


let replayRejected =
  false;


try {
  await service.refresh({
    refreshToken:
      originalRefreshToken,
  });
} catch (
  error
) {
  replayRejected =
    error?.code ===
      PORTAL_AUTH_ERROR
        .SESSION_INVALID;
}


check(
  replayRejected,
  "previous refresh token cannot be replayed after rotation"
);


const currentUser =
  await service.getCurrentUser({
    userId:
      activeUser._id,
  });


check(
  currentUser?.id ===
    activeUser._id,
  "current active user can be resolved"
);


check(
  currentUser?.role ===
    RBAC_ROLES.ADMINISTRATOR,
  "current user preserves authoritative RBAC role"
);


const logoutResult =
  await service.logout({
    sessionId:
      session.sessionId,
  });


check(
  logoutResult ===
    true,
  "logout resolves active session"
);


check(
  session.status ===
    SESSION_STATUS.REVOKED,
  "logout revokes session"
);


check(
  session.revocationReason ===
    "LOGOUT",
  "logout records revocation reason"
);


let revokedRefreshRejected =
  false;


try {
  await service.refresh({
    refreshToken:
      refreshed.refreshToken,
  });
} catch (
  error
) {
  revokedRefreshRejected =
    error?.code ===
      PORTAL_AUTH_ERROR
        .SESSION_INVALID;
}


check(
  revokedRefreshRejected,
  "revoked session cannot refresh"
);


/*
|--------------------------------------------------------------------------
| Concurrent refresh-token contention
|--------------------------------------------------------------------------
|
| Create a fresh independent session so this test does not reuse the
| session already revoked above.
|
| Both refresh requests present exactly the same valid refresh token.
| Both may pass preliminary inspection, but the compare-and-swap rotation
| boundary must allow the old refresh-token hash to be consumed only once.
|
|--------------------------------------------------------------------------
*/

const concurrentLogin =
  await service.login({
    email:
      "admin@example.com",

    password:
      "Correct-Password-123!",
  });


const attemptsBeforeConcurrency =
  refreshRotationAttempts;

const successesBeforeConcurrency =
  refreshRotationSuccesses;


const concurrentResults =
  await Promise.allSettled([
    service.refresh({
      refreshToken:
        concurrentLogin
          .refreshToken,
    }),

    service.refresh({
      refreshToken:
        concurrentLogin
          .refreshToken,
    }),
  ]);


const concurrentFulfilled =
  concurrentResults.filter(
    (
      result
    ) =>
      result.status ===
        "fulfilled"
  );


const concurrentRejected =
  concurrentResults.filter(
    (
      result
    ) =>
      result.status ===
        "rejected"
  );


check(
  concurrentFulfilled.length ===
    1,
  "concurrent refresh-token contention permits exactly one successful rotation"
);


check(
  concurrentRejected.length ===
    1,
  "concurrent refresh-token contention rejects exactly one competing consumer"
);


check(
  concurrentRejected[0]
    ?.reason
    ?.code ===
    PORTAL_AUTH_ERROR
      .SESSION_INVALID,
  "losing concurrent refresh consumer fails with SESSION_INVALID"
);


check(
  refreshRotationAttempts -
    attemptsBeforeConcurrency ===
    2,
  "both concurrent refresh consumers reach atomic rotation boundary"
);


check(
  refreshRotationSuccesses -
    successesBeforeConcurrency ===
    1,
  "presented refresh token is atomically consumed exactly once"
);


let missingConfigurationRejected =
  false;


try {
  createPortalAuthenticationService({
    UserModel,
    SessionModel,

    secret:
      "",

    issuer,
    audience,
  });
} catch (
  error
) {
  missingConfigurationRejected =
    error?.code ===
      PORTAL_AUTH_ERROR
        .CONFIGURATION_UNAVAILABLE;
}


check(
  missingConfigurationRejected,
  "missing signing configuration fails closed"
);


console.log(
  "\n------------------------------------------------"
);

console.log(
  `Assertions passed: ${passed}`
);

console.log(
  "P.1E AUTHENTICATION SERVICE VALIDATION PASSED"
);

console.log(
  "------------------------------------------------\n"
);