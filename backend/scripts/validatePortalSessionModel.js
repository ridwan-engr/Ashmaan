// scripts/validatePortalSessionModel.js

import assert from "node:assert/strict";
import mongoose from "mongoose";

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
  "ASHMAAN PORTAL P.1B — SESSION MODEL"
);

console.log(
  "================================================\n"
);


check(
  Session.modelName ===
    "Session",
  "canonical Session model exists"
);


check(
  Session.collection.name ===
    "sessions",
  "canonical sessions collection is explicit"
);


check(
  SESSION_STATUS.ACTIVE ===
    "ACTIVE",
  "ACTIVE session status exists"
);


check(
  SESSION_STATUS.REVOKED ===
    "REVOKED",
  "REVOKED session status exists"
);


check(
  SESSION_STATUS.EXPIRED ===
    "EXPIRED",
  "EXPIRED session status exists"
);


check(
  Object.isFrozen(
    SESSION_STATUS
  ),
  "session-status taxonomy is frozen"
);


const rawRefreshToken =
  "refresh-token-test-material";

const refreshTokenHash =
  hashSessionToken(
    rawRefreshToken
  );


check(
  typeof refreshTokenHash ===
    "string" &&
  refreshTokenHash.length ===
    64,
  "refresh token produces SHA-256 hash"
);


check(
  refreshTokenHash !==
    rawRefreshToken,
  "raw refresh token is not persisted as its hash"
);


check(
  hashSessionToken(
    rawRefreshToken
  ) ===
    refreshTokenHash,
  "refresh-token hashing is deterministic"
);


let missingTokenRejected =
  false;

try {
  hashSessionToken(
    ""
  );
} catch (
  error
) {
  missingTokenRejected =
    error?.message ===
      "SESSION_TOKEN_REQUIRED";
}


check(
  missingTokenRejected,
  "missing refresh token is rejected"
);


const userId =
  new mongoose.Types.ObjectId();


const session =
  new Session({
    user:
      userId,

    sessionId:
      "session-test-001",

    refreshTokenHash,

    status:
      SESSION_STATUS.ACTIVE,

    expiresAt:
      new Date(
        Date.now() +
        60_000
      ),
  });


await session.validate();


check(
  session.status ===
    SESSION_STATUS.ACTIVE,
  "new session is ACTIVE"
);


check(
  session.matchesRefreshToken(
    rawRefreshToken
  ),
  "correct refresh token matches stored hash"
);


check(
  !session.matchesRefreshToken(
    "wrong-refresh-token"
  ),
  "incorrect refresh token is rejected"
);


check(
  session.isUsable(
    new Date()
  ),
  "active unexpired session is usable"
);


const json =
  session.toJSON();


check(
  !Object.prototype.hasOwnProperty.call(
    json,
    "refreshTokenHash"
  ),
  "refresh-token hash is excluded from JSON"
);


const object =
  session.toObject();


check(
  !Object.prototype.hasOwnProperty.call(
    object,
    "refreshTokenHash"
  ),
  "refresh-token hash is excluded from object serialization"
);


const expiredSession =
  new Session({
    user:
      userId,

    sessionId:
      "session-test-expired",

    refreshTokenHash,

    status:
      SESSION_STATUS.ACTIVE,

    expiresAt:
      new Date(
        Date.now() -
        60_000
      ),
  });


check(
  !expiredSession.isUsable(
    new Date()
  ),
  "expired session is unusable"
);


session.revoke(
  "TEST_REVOCATION"
);


check(
  session.status ===
    SESSION_STATUS.REVOKED,
  "session revocation changes status"
);


check(
  session.revokedAt instanceof
    Date,
  "session revocation records timestamp"
);


check(
  session.revocationReason ===
    "TEST_REVOCATION",
  "session revocation records reason"
);


check(
  !session.isUsable(
    new Date()
  ),
  "revoked session is unusable"
);


const indexes =
  Session.schema.indexes();


check(
  indexes.some(
    ([spec]) =>
      spec?.sessionId ===
        1
  ),
  "session identity index exists"
);


check(
  indexes.some(
    ([spec, options]) =>
      spec?.expiresAt ===
        1 &&
      options?.expireAfterSeconds ===
        0
  ),
  "expired-session TTL index exists"
);


console.log(
  "\n------------------------------------------------"
);

console.log(
  `Assertions passed: ${passed}`
);

console.log(
  "P.1B SESSION MODEL VALIDATION PASSED"
);

console.log(
  "------------------------------------------------\n"
);
