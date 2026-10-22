// scripts/validatePortalUserIdentityModel.js

import assert from "node:assert/strict";

import User, {
  USER_ACCOUNT_STATUS,
  normalizeEmail,
} from "../models/User.js";

import {
  RBAC_ROLES,
} from "../services/security/authorizationRbacService.js";


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
  "ASHMAAN PORTAL P.1A — USER IDENTITY MODEL"
);

console.log(
  "================================================\n"
);


check(
  User.modelName ===
    "User",
  "canonical User model exists"
);


check(
  User.collection.name ===
    "users",
  "canonical users collection is explicit"
);


check(
  normalizeEmail(
    "  USER@Example.COM "
  ) ===
    "user@example.com",
  "email normalization is deterministic"
);


check(
  USER_ACCOUNT_STATUS.ACTIVE ===
    "ACTIVE",
  "ACTIVE account status exists"
);


check(
  USER_ACCOUNT_STATUS.DISABLED ===
    "DISABLED",
  "DISABLED account status exists"
);


const password =
  "Ashmaan-Test-Password-123!";

const hash =
  await User.hashPassword(
    password
  );


check(
  typeof hash ===
    "string" &&
  hash !==
    password,
  "password is hashed"
);


const user =
  new User({
    email:
      "PORTAL.USER@Example.com",

    passwordHash:
      hash,

    role:
      RBAC_ROLES.USER,

    status:
      USER_ACCOUNT_STATUS.ACTIVE,

    displayName:
      "Portal User",
  });


await user.validate();


check(
  user.email ===
    "portal.user@example.com",
  "stored email is normalized"
);


check(
  user.role ===
    RBAC_ROLES.USER,
  "RBAC role is preserved"
);


check(
  await user.verifyPassword(
    password
  ),
  "correct password verifies"
);


check(
  !await user.verifyPassword(
    "incorrect-password"
  ),
  "incorrect password is rejected"
);


const json =
  user.toJSON();


check(
  !Object.prototype.hasOwnProperty.call(
    json,
    "passwordHash"
  ),
  "password hash is excluded from JSON"
);


const object =
  user.toObject();


check(
  !Object.prototype.hasOwnProperty.call(
    object,
    "passwordHash"
  ),
  "password hash is excluded from object serialization"
);


let shortPasswordRejected =
  false;

try {
  await User.hashPassword(
    "short"
  );
} catch (
  error
) {
  shortPasswordRejected =
    error?.message ===
      "PASSWORD_MINIMUM_LENGTH_12";
}


check(
  shortPasswordRejected,
  "password shorter than 12 characters is rejected"
);


const invalidRoleUser =
  new User({
    email:
      "invalid.role@example.com",

    passwordHash:
      hash,

    role:
      "SUPERUSER",
  });


let invalidRoleRejected =
  false;

try {
  await invalidRoleUser
    .validate();
} catch {
  invalidRoleRejected =
    true;
}


check(
  invalidRoleRejected,
  "unknown RBAC role is rejected"
);


check(
  Object.isFrozen(
    USER_ACCOUNT_STATUS
  ),
  "account-status taxonomy is frozen"
);


console.log(
  "\n------------------------------------------------"
);

console.log(
  `Assertions passed: ${passed}`
);

console.log(
  "P.1A USER IDENTITY MODEL VALIDATION PASSED"
);

console.log(
  "------------------------------------------------\n"
);
