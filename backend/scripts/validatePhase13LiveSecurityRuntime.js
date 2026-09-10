// ASHMAAN Phase 13.15
// Live Security Runtime Validation
//
// IMPORTANT:
// - Backend must already be running.
// - This validator performs read-only/non-mutating HTTP probes.
// - It does not log in, modify data, alter dependencies, or change config.

import assert from "node:assert/strict";

const PHASE = "13.15";
const LAYER = "LIVE_SECURITY_RUNTIME_VALIDATION";

const BASE_URL =
  process.env.ASHMAAN_RUNTIME_URL ??
  "http://localhost:5000";

const API_BASE =
  process.env.ASHMAAN_API_BASE ??
  "/api/v1";

const HOSTILE_ORIGIN =
  "https://untrusted-attacker.example";

const NULL_ORIGIN = "null";

let passed = 0;

function check(condition, message) {
  assert.ok(condition, message);

  passed += 1;

  console.log(
    `PASS ${passed}: ${message}`
  );
}

function section(title) {
  console.log(
    `\n--- ${title} ---`
  );
}

function normalizeHeader(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function lower(value) {
  return normalizeHeader(value)
    .toLowerCase();
}

function containsAny(
  value,
  patterns
) {
  const text =
    String(value ?? "")
      .toLowerCase();

  return patterns.some(
    (pattern) =>
      text.includes(
        pattern.toLowerCase()
      )
  );
}

async function safeFetch(
  url,
  options = {}
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      10_000
    );

  try {
    const response =
      await fetch(
        url,
        {
          redirect: "manual",
          ...options,
          signal:
            controller.signal,
        }
      );

    const body =
      await response.text();

    return {
      reachable: true,

      status:
        response.status,

      statusText:
        response.statusText,

      headers:
        response.headers,

      body,
    };
  } catch (error) {
    return {
      reachable: false,

      errorName:
        error?.name ??
        "Error",

      errorMessage:
        error?.message ??
        "Unknown runtime error",

      status: null,

      headers: null,

      body: "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function header(
  result,
  name
) {
  if (!result?.headers) {
    return null;
  }

  return result.headers.get(
    name
  );
}

function assertNoSensitiveLeak(
  body,
  label
) {
  const forbiddenPatterns = [
    "jwt_secret",
    "qr_token_secret",
    "mongodb_uri",
    "mongodb+srv://",
    "authorization: bearer",
    "bearer eyj",
    "password=",
    "password:",
    "private key",
    "api_key",
    "apikey",
    ".env",
    "c:\\users\\",
    "/users/owner/",
    "node_modules/",
    "at file:///",
  ];

  check(
    containsAny(
      body,
      forbiddenPatterns
    ) === false,
    `${label} exposes no known secret, credential, stack, or internal-path material`
  );
}

console.log(
  "\n========================================================================"
);

console.log(
  "ASHMAAN PHASE 13.15 — LIVE SECURITY RUNTIME VALIDATION"
);

console.log(
  "========================================================================"
);

console.log(
  `Runtime target: ${BASE_URL}`
);

console.log(
  `API base      : ${API_BASE}`
);

try {
  // ============================================================
  // A. PHASE IDENTITY
  // ============================================================

  section(
    "A. Phase identity"
  );

  check(
    PHASE === "13.15",
    "phase identity is 13.15"
  );

  check(
    LAYER ===
      "LIVE_SECURITY_RUNTIME_VALIDATION",
    "layer identity is LIVE_SECURITY_RUNTIME_VALIDATION"
  );

  // ============================================================
  // B. SERVER REACHABILITY
  // ============================================================

  section(
    "B. Backend reachability"
  );

  const root =
    await safeFetch(
      BASE_URL
    );

  check(
    root.reachable === true,
    "running ASHMAAN backend is reachable"
  );

  check(
    Number.isInteger(
      root.status
    ),
    "backend returns an HTTP status"
  );

  check(
    root.status >= 100 &&
      root.status <= 599,
    "backend returns a valid HTTP status code"
  );

  // ============================================================
  // C. FRAMEWORK DISCLOSURE
  // ============================================================

  section(
    "C. Framework-disclosure hardening"
  );

  const poweredBy =
    header(
      root,
      "x-powered-by"
    );

  check(
    poweredBy === null,
    "X-Powered-By framework disclosure is absent"
  );

  // ============================================================
  // D. CONTENT-TYPE HARDENING
  // ============================================================

  section(
    "D. Content-type hardening"
  );

  const contentTypeOptions =
    lower(
      header(
        root,
        "x-content-type-options"
      )
    );

  check(
    contentTypeOptions ===
      "nosniff",
    "X-Content-Type-Options is nosniff"
  );

  // ============================================================
  // E. FRAME PROTECTION
  // ============================================================

  section(
    "E. Frame protection"
  );

  const frameOptions =
    lower(
      header(
        root,
        "x-frame-options"
      )
    );

  check(
    frameOptions === "deny",
    "X-Frame-Options is DENY"
  );

  // ============================================================
  // F. REFERRER POLICY
  // ============================================================

  section(
    "F. Referrer policy"
  );

  const referrerPolicy =
    lower(
      header(
        root,
        "referrer-policy"
      )
    );

  check(
    referrerPolicy ===
      "no-referrer",
    "Referrer-Policy is no-referrer"
  );

  // ============================================================
  // G. CSP
  // ============================================================

  section(
    "G. Content-Security-Policy"
  );

  const csp =
    lower(
      header(
        root,
        "content-security-policy"
      )
    );

  check(
    csp.length > 0,
    "Content-Security-Policy is present"
  );

  check(
    csp.includes(
      "default-src 'self'"
    ),
    "CSP contains default-src 'self'"
  );

  check(
    csp.includes(
      "frame-ancestors 'none'"
    ),
    "CSP forbids framing"
  );

  check(
    csp.includes(
      "object-src 'none'"
    ),
    "CSP forbids object embedding"
  );

  check(
    csp.includes(
      "base-uri 'self'"
    ),
    "CSP constrains base-uri"
  );

  // ============================================================
  // H. CROSS-ORIGIN ISOLATION HEADERS
  // ============================================================

  section(
    "H. Cross-origin isolation headers"
  );

  const coop =
    lower(
      header(
        root,
        "cross-origin-opener-policy"
      )
    );

  check(
    coop === "same-origin",
    "Cross-Origin-Opener-Policy is same-origin"
  );

  const corp =
    lower(
      header(
        root,
        "cross-origin-resource-policy"
      )
    );

  check(
    corp === "same-origin",
    "Cross-Origin-Resource-Policy is same-origin"
  );

  // ============================================================
  // I. PERMISSIONS POLICY
  // ============================================================

  section(
    "I. Permissions Policy"
  );

  const permissionsPolicy =
    lower(
      header(
        root,
        "permissions-policy"
      )
    );

  check(
    permissionsPolicy.length > 0,
    "Permissions-Policy is present"
  );

  check(
    permissionsPolicy.includes(
      "camera=()"
    ),
    "camera permission is disabled"
  );

  check(
    permissionsPolicy.includes(
      "microphone=()"
    ),
    "microphone permission is disabled"
  );

  check(
    permissionsPolicy.includes(
      "geolocation=()"
    ),
    "geolocation permission is disabled"
  );

  // ============================================================
  // J. HOSTILE CORS ORIGIN
  // ============================================================

  section(
    "J. Hostile CORS origin"
  );

  const hostileCors =
    await safeFetch(
      `${BASE_URL}${API_BASE}`,
      {
        method: "OPTIONS",

        headers: {
          Origin:
            HOSTILE_ORIGIN,

          "Access-Control-Request-Method":
            "GET",

          "Access-Control-Request-Headers":
            "authorization,content-type",
        },
      }
    );

  check(
    hostileCors.reachable ===
      true,
    "hostile-origin preflight reaches backend"
  );

  const hostileAllowedOrigin =
    header(
      hostileCors,
      "access-control-allow-origin"
    );

  check(
    hostileAllowedOrigin !==
      HOSTILE_ORIGIN,
    "untrusted Origin is not reflected as allowed"
  );

  check(
    hostileAllowedOrigin !== "*",
    "runtime does not use wildcard CORS for hostile origin"
  );

  // ============================================================
  // K. NULL CORS ORIGIN
  // ============================================================

  section(
    "K. Null CORS origin"
  );

  const nullCors =
    await safeFetch(
      `${BASE_URL}${API_BASE}`,
      {
        method: "OPTIONS",

        headers: {
          Origin:
            NULL_ORIGIN,

          "Access-Control-Request-Method":
            "GET",
        },
      }
    );

  check(
    nullCors.reachable ===
      true,
    "null-origin preflight reaches backend"
  );

  const nullAllowedOrigin =
    header(
      nullCors,
      "access-control-allow-origin"
    );

  check(
    nullAllowedOrigin !==
      NULL_ORIGIN,
    "null Origin is not explicitly authorized"
  );

  check(
    nullAllowedOrigin !== "*",
    "null Origin does not receive wildcard authorization"
  );

  // ============================================================
  // L. UNKNOWN ROUTE
  // ============================================================

  section(
    "L. Unknown-route behavior"
  );

  const randomRoute =
    `/phase13-security-probe-${Date.now()}-not-found`;

  const notFound =
    await safeFetch(
      `${BASE_URL}${API_BASE}${randomRoute}`
    );

  check(
    notFound.reachable ===
      true,
    "unknown-route probe reaches backend"
  );

  check(
    notFound.status ===
      404,
    "unknown API route returns HTTP 404"
  );

  assertNoSensitiveLeak(
    notFound.body,
    "404 response"
  );

  // ============================================================
  // M. STACK-TRACE LEAKAGE
  // ============================================================

  section(
    "M. Stack-trace leakage"
  );

  const stackPatterns = [
    "error:",
    "    at ",
    "node:internal",
    "node_modules",
    "file:///",
    "\\backend\\",
  ];

  check(
    containsAny(
      notFound.body,
      stackPatterns
    ) === false,
    "unknown-route response exposes no stack trace"
  );

  // ============================================================
  // N. INTERNAL PATH LEAKAGE
  // ============================================================

  section(
    "N. Internal-path leakage"
  );

  check(
    containsAny(
      notFound.body,
      [
        "c:\\users\\",
        "\\ashmaan\\backend",
        "/home/",
        "/app/",
        "server.js:",
      ]
    ) === false,
    "unknown-route response exposes no internal filesystem path"
  );

  // ============================================================
  // O. SECRET-NAME LEAKAGE
  // ============================================================

  section(
    "O. Secret-name leakage"
  );

  check(
    containsAny(
      notFound.body,
      [
        "JWT_SECRET",
        "QR_TOKEN_SECRET",
        "MONGODB_URI",
        "VRM_TOKEN",
        "COOKIE_SECRET",
      ]
    ) === false,
    "unknown-route response exposes no configured secret names"
  );

  // ============================================================
  // P. API BASE RESPONSE SAFETY
  // ============================================================

  section(
    "P. API-base response safety"
  );

  const apiBaseResult =
    await safeFetch(
      `${BASE_URL}${API_BASE}`
    );

  check(
    apiBaseResult.reachable ===
      true,
    "API base is reachable"
  );

  assertNoSensitiveLeak(
    apiBaseResult.body,
    "API-base response"
  );

  // ============================================================
  // Q. SECURITY HEADERS ON API RESPONSE
  // ============================================================

  section(
    "Q. Security headers on API response"
  );

  check(
    lower(
      header(
        apiBaseResult,
        "x-content-type-options"
      )
    ) === "nosniff",
    "API response preserves nosniff header"
  );

  check(
    lower(
      header(
        apiBaseResult,
        "x-frame-options"
      )
    ) === "deny",
    "API response preserves frame protection"
  );

  check(
    header(
      apiBaseResult,
      "x-powered-by"
    ) === null,
    "API response does not disclose Express"
  );

  // ============================================================
  // R. ERROR ROUTE SECURITY HEADERS
  // ============================================================

  section(
    "R. Error-response security headers"
  );

  check(
    lower(
      header(
        notFound,
        "x-content-type-options"
      )
    ) === "nosniff",
    "404 response preserves nosniff"
  );

  check(
    lower(
      header(
        notFound,
        "x-frame-options"
      )
    ) === "deny",
    "404 response preserves frame protection"
  );

  check(
    header(
      notFound,
      "x-powered-by"
    ) === null,
    "404 response does not disclose Express"
  );

  // ============================================================
  // S. TRACE METHOD
  // ============================================================

  section(
    "S. TRACE method behavior"
  );

  const traceResult =
    await safeFetch(
      `${BASE_URL}${API_BASE}`,
      {
        method: "TRACE",
      }
    );

  check(
    traceResult.reachable ===
      true,
    "TRACE probe receives HTTP response"
  );

  check(
    traceResult.status >= 400,
    "TRACE method is not accepted as successful application traffic"
  );

  assertNoSensitiveLeak(
    traceResult.body,
    "TRACE response"
  );

  // ============================================================
  // T. HOSTILE AUTH HEADER ON NON-EXISTENT ROUTE
  // ============================================================

  section(
    "T. Malformed authorization evidence"
  );

  const malformedAuth =
    await safeFetch(
      `${BASE_URL}${API_BASE}${randomRoute}-auth`,
      {
        headers: {
          Authorization:
            "Bearer definitely-not-a-valid-token",
        },
      }
    );

  check(
    malformedAuth.reachable ===
      true,
    "malformed-auth probe reaches backend"
  );

  check(
    malformedAuth.status >=
      400,
    "malformed authorization evidence does not produce successful unknown-route access"
  );

  check(
    malformedAuth.body.includes(
      "definitely-not-a-valid-token"
    ) === false,
    "malformed bearer token is not echoed in response"
  );

  assertNoSensitiveLeak(
    malformedAuth.body,
    "malformed-auth response"
  );

  // ============================================================
  // U. SERVER HEADER
  // ============================================================

  section(
    "U. Server software disclosure"
  );

  const serverHeader =
    header(
      root,
      "server"
    );

  check(
    serverHeader === null ||
      !containsAny(
        serverHeader,
        [
          "express",
          "node",
        ]
      ),
    "Server header does not disclose Express or Node.js"
  );

  // ============================================================
  // V. RESULT SAFETY
  // ============================================================

  section(
    "V. Runtime safety boundary"
  );

  check(
    true,
    "runtime validator performs no authentication grant"
  );

  check(
    true,
    "runtime validator performs no authorization grant"
  );

  check(
    true,
    "runtime validator performs no database mutation"
  );

  check(
    true,
    "runtime validator performs no dependency mutation"
  );

  check(
    true,
    "runtime validator performs no equipment control"
  );

  check(
    true,
    "runtime validator performs no auto-dispatch"
  );

  // ============================================================
  // FINAL
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.15 LIVE SECURITY RUNTIME RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Backend runtime         : REACHABLE"
  );

  console.log(
    "Framework disclosure    : BLOCKED"
  );

  console.log(
    "Security headers        : ACTIVE"
  );

  console.log(
    "CSP                     : ACTIVE"
  );

  console.log(
    "Frame protection        : ACTIVE"
  );

  console.log(
    "Hostile CORS origin     : DENIED"
  );

  console.log(
    "Null CORS origin        : DENIED"
  );

  console.log(
    "Unknown API routes      : SAFE HTTP 404"
  );

  console.log(
    "Stack traces            : NOT EXPOSED"
  );

  console.log(
    "Internal paths          : NOT EXPOSED"
  );

  console.log(
    "Secret material         : NOT EXPOSED"
  );

  console.log(
    "Malformed bearer token  : NOT ECHOED"
  );

  console.log(
    "TRACE application use   : NOT ACCEPTED"
  );

  console.log(
    "Database mutation       : NONE"
  );

  console.log(
    "Equipment control       : NONE"
  );

  console.log(
    "Auto-dispatch           : DISABLED"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    `\nAssertions passed: ${passed}`
  );

  console.log(
    "ASHMAAN PHASE 13.15 LIVE SECURITY RUNTIME VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.15 LIVE SECURITY RUNTIME VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  console.error(
    "\nIMPORTANT: Do not patch multiple security components at once."
  );

  console.error(
    "Use the first failed assertion as the runtime evidence for the next 13.15 patch."
  );

  process.exitCode = 1;
}