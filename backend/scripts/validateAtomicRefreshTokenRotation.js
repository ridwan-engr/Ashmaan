// scripts/validateAtomicRefreshTokenRotation.js

import assert
  from "node:assert/strict";

import Session, {
  SESSION_STATUS,
  hashSessionToken,
} from "../models/Session.js";


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
  "ASHMAAN PORTAL P.1F-F — ATOMIC REFRESH ROTATION"
);

console.log(
  "================================================\n"
);


check(
  typeof Session
    .rotateRefreshToken ===
    "function",
  "Session exposes atomic refresh-token rotation"
);


const originalFindOneAndUpdate =
  Session.findOneAndUpdate;


let capturedFilter =
  null;

let capturedUpdate =
  null;

let capturedOptions =
  null;


const rotatedDocument = {
  sessionId:
    "session-001",

  user:
    "user-001",

  status:
    SESSION_STATUS.ACTIVE,
};


Session.findOneAndUpdate =
  function findOneAndUpdate(
    filter,
    update,
    options
  ) {
    capturedFilter =
      filter;

    capturedUpdate =
      update;

    capturedOptions =
      options;

    return rotatedDocument;
  };


const currentRefreshToken =
  "current-refresh-token";

const nextRefreshToken =
  "next-refresh-token";

const rotationTime =
  new Date(
    "2026-09-18T08:00:00.000Z"
  );


const result =
  Session.rotateRefreshToken({
    sessionId:
      " session-001 ",

    userId:
      "user-001",

    currentRefreshToken,

    nextRefreshToken,

    now:
      rotationTime,
  });


check(
  result ===
    rotatedDocument,
  "atomic rotation returns database operation result"
);


check(
  capturedFilter
    ?.sessionId ===
    "session-001",
  "atomic predicate binds canonical session identity"
);


check(
  capturedFilter
    ?.user ===
    "user-001",
  "atomic predicate binds authenticated user identity"
);


check(
  capturedFilter
    ?.status ===
    SESSION_STATUS.ACTIVE,
  "atomic predicate requires ACTIVE session"
);


check(
  capturedFilter
    ?.expiresAt
    ?.$gt ===
    rotationTime,
  "atomic predicate requires unexpired session"
);


check(
  capturedFilter
    ?.refreshTokenHash ===
    hashSessionToken(
      currentRefreshToken
    ),
  "atomic predicate requires exact presented refresh-token hash"
);


check(
  capturedUpdate
    ?.$set
    ?.refreshTokenHash ===
    hashSessionToken(
      nextRefreshToken
    ),
  "atomic update stores rotated refresh-token hash"
);


check(
  capturedUpdate
    ?.$set
    ?.refreshTokenHash !==
    nextRefreshToken,
  "atomic update never persists raw rotated refresh token"
);


check(
  capturedUpdate
    ?.$set
    ?.lastUsedAt ===
    rotationTime,
  "atomic rotation records last-used timestamp"
);


check(
  capturedOptions
    ?.new ===
    true,
  "atomic rotation requests post-update session"
);


const filterKeys =
  Object.keys(
    capturedFilter
  ).sort();


check(
  JSON.stringify(
    filterKeys
  ) ===
    JSON.stringify(
      [
        "expiresAt",
        "refreshTokenHash",
        "sessionId",
        "status",
        "user",
      ].sort()
    ),
  "atomic predicate contains exactly required concurrency guards"
);


let invalidCallCount =
  0;


Session.findOneAndUpdate =
  function findOneAndUpdate() {
    invalidCallCount +=
      1;

    return {};
  };


const missingSession =
  Session.rotateRefreshToken({
    sessionId:
      "",

    userId:
      "user-001",

    currentRefreshToken,

    nextRefreshToken,

    now:
      rotationTime,
  });


check(
  missingSession ===
    null,
  "missing session identity fails closed"
);


check(
  invalidCallCount ===
    0,
  "invalid session identity performs no database mutation"
);


const missingUser =
  Session.rotateRefreshToken({
    sessionId:
      "session-001",

    userId:
      null,

    currentRefreshToken,

    nextRefreshToken,

    now:
      rotationTime,
  });


check(
  missingUser ===
    null,
  "missing user identity fails closed"
);


check(
  invalidCallCount ===
    0,
  "invalid user identity performs no database mutation"
);


const missingCurrentToken =
  Session.rotateRefreshToken({
    sessionId:
      "session-001",

    userId:
      "user-001",

    currentRefreshToken:
      "",

    nextRefreshToken,

    now:
      rotationTime,
  });


check(
  missingCurrentToken ===
    null,
  "missing presented refresh token fails closed"
);


const missingNextToken =
  Session.rotateRefreshToken({
    sessionId:
      "session-001",

    userId:
      "user-001",

    currentRefreshToken,

    nextRefreshToken:
      "",

    now:
      rotationTime,
  });


check(
  missingNextToken ===
    null,
  "missing rotated refresh token fails closed"
);


const invalidClock =
  Session.rotateRefreshToken({
    sessionId:
      "session-001",

    userId:
      "user-001",

    currentRefreshToken,

    nextRefreshToken,

    now:
      new Date(
        "invalid"
      ),
  });


check(
  invalidClock ===
    null,
  "invalid rotation clock fails closed"
);


check(
  invalidCallCount ===
    0,
  "all invalid rotation inputs avoid database mutation"
);


Session.findOneAndUpdate =
  originalFindOneAndUpdate;


console.log(
  "\n------------------------------------------------"
);

console.log(
  `Assertions passed: ${passed}`
);

console.log(
  "P.1F-F ATOMIC REFRESH ROTATION MODEL VALIDATION PASSED"
);

console.log(
  "------------------------------------------------\n"
);
