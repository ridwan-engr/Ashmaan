// scripts/validateActivePortalSessionMiddleware.js

import assert from
  "node:assert/strict";

import {
  createRequireActivePortalSession,
} from
  "../middleware/requireActivePortalSession.js";


console.log(`
================================================
ASHMAAN PORTAL P.1F-E — ACTIVE SESSION MIDDLEWARE
================================================
`);


let assertionsPassed =
  0;


function check(
  condition,
  message
) {
  assert.equal(
    condition,
    true,
    message
  );

  assertionsPassed +=
    1;

  console.log(
    `PASS ${assertionsPassed}: ${message}`
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


function createAuth(
  overrides =
    {}
) {
  return Object.freeze({
    authenticated:
      true,

    identity:
      Object.freeze({
        id:
          "user-123",

        type:
          "USER",
      }),

    userId:
      "user-123",

    role:
      "USER",

    sessionId:
      "session-123",

    tokenId:
      "token-123",

    ...overrides,
  });
}


function createSession(
  overrides =
    {}
) {
  return {
    user:
      "user-123",

    sessionId:
      "session-123",

    status:
      "ACTIVE",

    expiresAt:
      new Date(
        "2026-09-18T11:00:00.000Z"
      ),

    isUsable(
      now
    ) {
      return (
        this.status ===
          "ACTIVE" &&
        this.expiresAt instanceof
          Date &&
        this.expiresAt.getTime() >
          now.getTime()
      );
    },

    ...overrides,
  };
}


function createSessionModel(
  session,
  {
    error =
      null,
  } = {}
) {
  return {
    calls:
      [],

    async findOne(
      query
    ) {
      this.calls.push(
        query
      );

      if (
        error
      ) {
        throw error;
      }

      return session;
    },
  };
}


async function execute({
  auth =
    createAuth(),

  session =
    createSession(),

  modelError =
    null,

  now =
    () =>
      new Date(
        "2026-09-18T10:00:00.000Z"
      ),
} = {}) {
  const SessionModel =
    createSessionModel(
      session,
      {
        error:
          modelError,
      }
    );

  const middleware =
    createRequireActivePortalSession({
      SessionModel,
      now,
    });

  const req = {
    auth,
  };

  const res =
    createResponse();

  let nextCalls =
    0;

  await middleware(
    req,
    res,
    () => {
      nextCalls +=
        1;
    }
  );

  return {
    req,
    res,
    nextCalls,
    SessionModel,
  };
}


const valid =
  await execute();


check(
  valid.nextCalls ===
    1,
  "active matching session reaches next middleware"
);

check(
  valid.res.statusCode ===
    null,
  "active matching session emits no authentication error"
);

check(
  valid.SessionModel.calls.length ===
    1,
  "active-session validation performs exactly one session lookup"
);

check(
  valid.SessionModel.calls[0]
    ?.sessionId ===
    "session-123",
  "session lookup is bound to authenticated token session identity"
);


const missingAuth =
  await execute({
    auth:
      null,
  });


check(
  missingAuth.res.statusCode ===
    401,
  "missing authenticated request context fails with 401"
);

check(
  missingAuth.nextCalls ===
    0,
  "missing authenticated request context never reaches controller"
);

check(
  missingAuth.SessionModel.calls.length ===
    0,
  "missing authenticated request context performs no session lookup"
);


const unauthenticated =
  await execute({
    auth:
      createAuth({
        authenticated:
          false,
      }),
  });


check(
  unauthenticated.res.statusCode ===
    401,
  "unauthenticated request context fails with 401"
);


const missingSessionId =
  await execute({
    auth:
      createAuth({
        sessionId:
          "",
      }),
  });


check(
  missingSessionId.res.statusCode ===
    401,
  "missing token session identity fails with 401"
);

check(
  missingSessionId.SessionModel.calls.length ===
    0,
  "missing token session identity performs no database lookup"
);


const missingUserId =
  await execute({
    auth:
      createAuth({
        userId:
          "",
      }),
  });


check(
  missingUserId.res.statusCode ===
    401,
  "missing authenticated user identity fails with 401"
);


const missingSession =
  await execute({
    session:
      null,
  });


check(
  missingSession.res.statusCode ===
    401,
  "unknown persistent session fails with 401"
);

check(
  missingSession.nextCalls ===
    0,
  "unknown persistent session never reaches controller"
);


const revokedSession =
  await execute({
    session:
      createSession({
        status:
          "REVOKED",
      }),
  });


check(
  revokedSession.res.statusCode ===
    401,
  "revoked persistent session fails with 401"
);

check(
  revokedSession.nextCalls ===
    0,
  "revoked persistent session never reaches controller"
);


const expiredSession =
  await execute({
    session:
      createSession({
        expiresAt:
          new Date(
            "2026-09-18T09:59:59.000Z"
          ),
      }),
  });


check(
  expiredSession.res.statusCode ===
    401,
  "expired persistent session fails with 401"
);

check(
  expiredSession.nextCalls ===
    0,
  "expired persistent session never reaches controller"
);


const mismatchedUser =
  await execute({
    session:
      createSession({
        user:
          "different-user",
      }),
  });


check(
  mismatchedUser.res.statusCode ===
    401,
  "session owned by a different user fails with 401"
);

check(
  mismatchedUser.nextCalls ===
    0,
  "session-to-token subject mismatch never reaches controller"
);


const malformedSession =
  await execute({
    session: {
      user:
        "user-123",
    },
  });


check(
  malformedSession.res.statusCode ===
    401,
  "persistent session without usability contract fails closed"
);


const databaseFailure =
  await execute({
    modelError:
      new Error(
        "DATABASE_UNAVAILABLE"
      ),
  });


check(
  databaseFailure.res.statusCode ===
    503,
  "session-store failure fails closed with 503"
);

check(
  databaseFailure.nextCalls ===
    0,
  "session-store failure never reaches controller"
);

check(
  databaseFailure.res.body
    ?.success ===
    false,
  "session-store failure preserves fail-closed response shape"
);


assert.throws(
  () =>
    createRequireActivePortalSession({
      SessionModel:
        {},
    }),
  /PORTAL_SESSION_MODEL_INVALID/
);

check(
  true,
  "invalid session-model dependency fails closed"
);


assert.throws(
  () =>
    createRequireActivePortalSession({
      SessionModel: {
        findOne() {
          return null;
        },
      },

      now:
        null,
    }),
  /PORTAL_SESSION_CLOCK_INVALID/
);

check(
  true,
  "invalid session clock dependency fails closed"
);


const invalidClock =
  await execute({
    now:
      () =>
        new Date(
          "invalid"
        ),
  });


check(
  invalidClock.res.statusCode ===
    503,
  "invalid runtime session clock fails closed with 503"
);


check(
  Object.isFrozen(
    valid.req.auth
  ),
  "session validation preserves frozen authentication context"
);


console.log(`
------------------------------------------------
Assertions passed: ${assertionsPassed}
P.1F-E ACTIVE SESSION MIDDLEWARE VALIDATION PASSED
------------------------------------------------
`);
