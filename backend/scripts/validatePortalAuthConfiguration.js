// scripts/validatePortalAuthConfiguration.js

import assert from "node:assert/strict";

import env from "../config/env.js";

import {
  PORTAL_TOKEN_ALGORITHM,
  PORTAL_ACCESS_TOKEN_TTL_SECONDS,
  PORTAL_REFRESH_TOKEN_TTL_SECONDS,
} from "../services/security/portalTokenService.js";


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
  "ASHMAAN PORTAL P.1D — AUTH CONFIGURATION"
);

console.log(
  "================================================\n"
);


check(
  Object.prototype.hasOwnProperty.call(
    env,
    "jwtSecret"
  ),
  "JWT signing-secret configuration exists"
);


check(
  Object.prototype.hasOwnProperty.call(
    env,
    "jwtIssuer"
  ),
  "JWT issuer configuration exists"
);


check(
  Object.prototype.hasOwnProperty.call(
    env,
    "jwtAudience"
  ),
  "JWT audience configuration exists"
);


check(
  typeof env.jwtIssuer ===
    "string" &&
  env.jwtIssuer.trim() !==
    "",
  "JWT issuer is non-empty"
);


check(
  typeof env.jwtAudience ===
    "string" &&
  env.jwtAudience.trim() !==
    "",
  "JWT audience is non-empty"
);


check(
  !Object.prototype.hasOwnProperty.call(
    env,
    "jwtExpiresIn"
  ),
  "obsolete generic JWT expiry configuration is removed"
);


check(
  PORTAL_TOKEN_ALGORITHM ===
    "HS256",
  "portal token algorithm remains HS256"
);


check(
  PORTAL_ACCESS_TOKEN_TTL_SECONDS ===
    900,
  "access-token TTL remains 15 minutes"
);


check(
  PORTAL_REFRESH_TOKEN_TTL_SECONDS ===
    604800,
  "refresh-token TTL remains 7 days"
);


check(
  PORTAL_REFRESH_TOKEN_TTL_SECONDS >
    PORTAL_ACCESS_TOKEN_TTL_SECONDS,
  "refresh-token lifetime exceeds access-token lifetime"
);


console.log(
  "\n------------------------------------------------"
);

console.log(
  `Assertions passed: ${passed}`
);

console.log(
  "P.1D AUTH CONFIGURATION VALIDATION PASSED"
);

console.log(
  "------------------------------------------------\n"
);
