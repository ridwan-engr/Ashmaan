import assert from "node:assert/strict";

import {
  HTTP_SECURITY_HEADERS_PHASE,
  HTTP_SECURITY_HEADERS_LAYER,
  SECURITY_HEADER_ENVIRONMENT,
  SECURITY_HEADER_STATUS,
  SECURITY_HEADER_NAMES,
  DEFAULT_SECURITY_HEADER_VALUES,
  HTTP_SECURITY_HEADERS_INVARIANTS,
  isKnownSecurityHeaderEnvironment,
  validateSecurityHeaderPolicy,
  buildSecurityHeaders,
} from "../services/security/httpSecurityHeadersService.js";

let passed = 0;

function check(
  condition,
  message
) {
  assert.ok(
    condition,
    message
  );

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

console.log(
  "\n========================================================================"
);

console.log(
  "ASHMAAN PHASE 13.7 — HTTP / SECURITY HEADERS VALIDATION"
);

console.log(
  "========================================================================"
);

try {
  // ============================================================
  // A. IDENTITY
  // ============================================================

  section(
    "A. Phase identity"
  );

  check(
    HTTP_SECURITY_HEADERS_PHASE ===
      "13.7",
    "phase identity is 13.7"
  );

  check(
    HTTP_SECURITY_HEADERS_LAYER ===
      "HTTP_SECURITY_HEADERS",
    "layer identity is HTTP_SECURITY_HEADERS"
  );

  // ============================================================
  // B. ENVIRONMENT TAXONOMY
  // ============================================================

  section(
    "B. Environment taxonomy"
  );

  for (
    const environment of [
      "DEVELOPMENT",
      "TEST",
      "PRODUCTION",
    ]
  ) {
    check(
      Object.values(
        SECURITY_HEADER_ENVIRONMENT
      ).includes(
        environment
      ),
      `security-header environment exists: ${environment}`
    );
  }

  check(
    isKnownSecurityHeaderEnvironment(
      "production"
    ) === true,
    "environment normalization is case-insensitive"
  );

  check(
    isKnownSecurityHeaderEnvironment(
      "UNKNOWN"
    ) === false,
    "unknown environment is rejected"
  );

  // ============================================================
  // C. STATUS TAXONOMY
  // ============================================================

  section(
    "C. Policy status taxonomy"
  );

  check(
    SECURITY_HEADER_STATUS.VALID ===
      "VALID",
    "VALID status exists"
  );

  check(
    SECURITY_HEADER_STATUS.INVALID ===
      "INVALID",
    "INVALID status exists"
  );

  // ============================================================
  // D. HEADER TAXONOMY
  // ============================================================

  section(
    "D. Security-header taxonomy"
  );

  const requiredHeaderNames = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
    "X-DNS-Prefetch-Control",
    "Cache-Control",
  ];

  for (
    const headerName of
      requiredHeaderNames
  ) {
    check(
      Object.values(
        SECURITY_HEADER_NAMES
      ).includes(
        headerName
      ),
      `security header exists: ${headerName}`
    );
  }

  // ============================================================
  // E. DEFAULT VALUES
  // ============================================================

  section(
    "E. Default security values"
  );

  check(
    DEFAULT_SECURITY_HEADER_VALUES
      .xContentTypeOptions ===
      "nosniff",
    "MIME sniffing protection defaults to nosniff"
  );

  check(
    DEFAULT_SECURITY_HEADER_VALUES
      .xFrameOptions ===
      "DENY",
    "frame protection defaults to DENY"
  );

  check(
    DEFAULT_SECURITY_HEADER_VALUES
      .referrerPolicy ===
      "no-referrer",
    "referrer policy defaults to no-referrer"
  );

  check(
    DEFAULT_SECURITY_HEADER_VALUES
      .contentSecurityPolicy
      .includes(
        "default-src 'self'"
      ),
    "CSP defaults to self-origin"
  );

  check(
    DEFAULT_SECURITY_HEADER_VALUES
      .contentSecurityPolicy
      .includes(
        "frame-ancestors 'none'"
      ),
    "CSP forbids framing"
  );

  check(
    DEFAULT_SECURITY_HEADER_VALUES
      .contentSecurityPolicy
      .includes(
        "object-src 'none'"
      ),
    "CSP forbids object embedding"
  );

  check(
    !DEFAULT_SECURITY_HEADER_VALUES
      .contentSecurityPolicy
      .includes(
        "'unsafe-inline'"
      ),
    "CSP does not permit unsafe inline scripts"
  );

  check(
    DEFAULT_SECURITY_HEADER_VALUES
      .strictTransportSecurity
      .includes(
        "max-age=31536000"
      ),
    "HSTS duration is explicitly defined"
  );

  check(
    DEFAULT_SECURITY_HEADER_VALUES
      .sensitiveCacheControl
      .includes(
        "no-store"
      ),
    "sensitive-response cache policy includes no-store"
  );

  // ============================================================
  // F. INVARIANTS
  // ============================================================

  section(
    "F. Core security-header invariants"
  );

  const invariantNames = [
    "securityHeadersExplicitlyDefined",
    "productionHstsRequired",
    "mimeSniffingProtectionRequired",
    "clickjackingProtectionRequired",
    "contentSecurityPolicyRequired",
    "referrerPolicyRequired",
    "permissionsPolicyRequired",
    "serverImplementationDisclosureForbidden",
    "xPoweredByDisclosureForbidden",
    "sensitiveResponsesMustNotBeCached",
    "unsafeWildcardCspForbidden",
    "unsafeInlineScriptDefaultForbidden",
    "framingDefaultForbidden",
    "securityPolicyMustNotExecuteEquipmentControl",
    "optimizationDssRemainsNonExecutable",
    "optimizationDssAutoDispatchRemainsDisabled",
  ];

  for (
    const name of
      invariantNames
  ) {
    check(
      HTTP_SECURITY_HEADERS_INVARIANTS[
        name
      ] === true,
      `security-header invariant enforced: ${name}`
    );
  }

  // ============================================================
  // G. VALID PRODUCTION POLICY
  // ============================================================

  section(
    "G. Production policy validation"
  );

  const productionPolicy =
    validateSecurityHeaderPolicy({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,
    });

  check(
    productionPolicy.valid ===
      true,
    "default production security-header policy is valid"
  );

  check(
    productionPolicy.status ===
      SECURITY_HEADER_STATUS.VALID,
    "valid production policy reports VALID"
  );

  check(
    productionPolicy.errors
      .length === 0,
    "valid production policy reports zero errors"
  );

  // ============================================================
  // H. PRODUCTION HEADER BUILD
  // ============================================================

  section(
    "H. Production headers"
  );

  const production =
    buildSecurityHeaders({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,
    });

  check(
    production.valid === true,
    "production security headers build successfully"
  );

  check(
    production.environment ===
      "PRODUCTION",
    "production environment is preserved"
  );

  check(
    production.headers[
      "Content-Security-Policy"
    ] ===
      DEFAULT_SECURITY_HEADER_VALUES
        .contentSecurityPolicy,
    "production CSP is emitted"
  );

  check(
    production.headers[
      "Strict-Transport-Security"
    ] ===
      DEFAULT_SECURITY_HEADER_VALUES
        .strictTransportSecurity,
    "production HSTS is emitted"
  );

  check(
    production.headers[
      "X-Content-Type-Options"
    ] ===
      "nosniff",
    "production nosniff header is emitted"
  );

  check(
    production.headers[
      "X-Frame-Options"
    ] ===
      "DENY",
    "production frame protection is emitted"
  );

  check(
    production.headers[
      "Referrer-Policy"
    ] ===
      "no-referrer",
    "production referrer policy is emitted"
  );

  check(
    typeof production.headers[
      "Permissions-Policy"
    ] === "string",
    "production permissions policy is emitted"
  );

  check(
    production.headers[
      "Cross-Origin-Opener-Policy"
    ] ===
      "same-origin",
    "production opener policy is emitted"
  );

  check(
    production.headers[
      "Cross-Origin-Resource-Policy"
    ] ===
      "same-origin",
    "production resource policy is emitted"
  );

  // ============================================================
  // I. DEVELOPMENT HSTS BEHAVIOR
  // ============================================================

  section(
    "I. Development behavior"
  );

  const development =
    buildSecurityHeaders({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .DEVELOPMENT,
    });

  check(
    development.valid === true,
    "development security policy remains valid"
  );

  check(
    !Object.prototype
      .hasOwnProperty.call(
        development.headers,
        "Strict-Transport-Security"
      ),
    "development does not force HSTS"
  );

  check(
    development.headers[
      "X-Content-Type-Options"
    ] ===
      "nosniff",
    "development retains MIME-sniffing protection"
  );

  check(
    development.headers[
      "X-Frame-Options"
    ] ===
      "DENY",
    "development retains frame protection"
  );

  // ============================================================
  // J. SENSITIVE RESPONSE
  // ============================================================

  section(
    "J. Sensitive-response cache protection"
  );

  const sensitive =
    buildSecurityHeaders({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,

      sensitiveResponse: true,
    });

  check(
    sensitive.sensitiveResponse ===
      true,
    "sensitive-response classification is explicit"
  );

  check(
    sensitive.headers[
      "Cache-Control"
    ] ===
      DEFAULT_SECURITY_HEADER_VALUES
        .sensitiveCacheControl,
    "sensitive response receives explicit cache protection"
  );

  check(
    sensitive.headers[
      "Cache-Control"
    ].includes(
      "no-store"
    ),
    "sensitive response forbids storage"
  );

  const ordinary =
    buildSecurityHeaders({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,

      sensitiveResponse: false,
    });

  check(
    !Object.prototype
      .hasOwnProperty.call(
        ordinary.headers,
        "Cache-Control"
      ),
    "ordinary response receives no forced sensitive-cache classification"
  );

  // ============================================================
  // K. IMPLEMENTATION DISCLOSURE
  // ============================================================

  section(
    "K. Implementation disclosure"
  );

  check(
    production.serverHeaderExposed ===
      false,
    "Server implementation disclosure is disabled"
  );

  check(
    production.xPoweredByExposed ===
      false,
    "X-Powered-By implementation disclosure is disabled"
  );

  check(
    !Object.prototype
      .hasOwnProperty.call(
        production.headers,
        "Server"
      ),
    "Server header is not emitted by policy"
  );

  check(
    !Object.prototype
      .hasOwnProperty.call(
        production.headers,
        "X-Powered-By"
      ),
    "X-Powered-By header is not emitted by policy"
  );

  // ============================================================
  // L. UNSAFE CSP REJECTION
  // ============================================================

  section(
    "L. Unsafe CSP rejection"
  );

  const wildcardPolicy =
    validateSecurityHeaderPolicy({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,

      values: {
        ...DEFAULT_SECURITY_HEADER_VALUES,

        contentSecurityPolicy:
          "default-src *; script-src 'self'",
      },
    });

  check(
    wildcardPolicy.valid ===
      false,
    "unsafe wildcard CSP is rejected"
  );

  check(
    wildcardPolicy.errors
      .includes(
        "UNSAFE_WILDCARD_CSP"
      ),
    "unsafe wildcard CSP rejection is explicit"
  );

  const inlineScriptPolicy =
    validateSecurityHeaderPolicy({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,

      values: {
        ...DEFAULT_SECURITY_HEADER_VALUES,

        contentSecurityPolicy:
          "default-src 'self'; " +
          "frame-ancestors 'none'; " +
          "script-src 'self' 'unsafe-inline'",
      },
    });

  check(
    inlineScriptPolicy.valid ===
      false,
    "unsafe inline script CSP is rejected"
  );

  check(
    inlineScriptPolicy.errors
      .includes(
        "UNSAFE_INLINE_SCRIPT"
      ),
    "unsafe inline script rejection is explicit"
  );

  // ============================================================
  // M. FRAME PROTECTION FAILURE
  // ============================================================

  section(
    "M. Frame-protection validation"
  );

  const missingFrameProtection =
    validateSecurityHeaderPolicy({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,

      values: {
        ...DEFAULT_SECURITY_HEADER_VALUES,

        contentSecurityPolicy:
          "default-src 'self'; object-src 'none'",
      },
    });

  check(
    missingFrameProtection.valid ===
      false,
    "CSP without frame-ancestors protection is rejected"
  );

  check(
    missingFrameProtection.errors
      .includes(
        "CSP_FRAME_PROTECTION_MISSING"
      ),
    "missing CSP frame protection is explicit"
  );

  // ============================================================
  // N. MIME PROTECTION FAILURE
  // ============================================================

  section(
    "N. MIME protection validation"
  );

  const invalidNosniff =
    validateSecurityHeaderPolicy({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,

      values: {
        ...DEFAULT_SECURITY_HEADER_VALUES,

        xContentTypeOptions:
          "invalid",
      },
    });

  check(
    invalidNosniff.valid ===
      false,
    "invalid MIME-sniffing policy is rejected"
  );

  check(
    invalidNosniff.errors
      .includes(
        "INVALID_NOSNIFF_POLICY"
      ),
    "invalid MIME policy rejection is explicit"
  );

  // ============================================================
  // O. FRAME HEADER FAILURE
  // ============================================================

  section(
    "O. Frame-header validation"
  );

  const invalidFrameHeader =
    validateSecurityHeaderPolicy({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,

      values: {
        ...DEFAULT_SECURITY_HEADER_VALUES,

        xFrameOptions:
          "ALLOWALL",
      },
    });

  check(
    invalidFrameHeader.valid ===
      false,
    "unsafe frame header is rejected"
  );

  check(
    invalidFrameHeader.errors
      .includes(
        "INVALID_FRAME_POLICY"
      ),
    "unsafe frame-header rejection is explicit"
  );

  // ============================================================
  // P. PRODUCTION HSTS FAILURE
  // ============================================================

  section(
    "P. Production HSTS requirement"
  );

  const missingHsts =
    validateSecurityHeaderPolicy({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,

      values: {
        ...DEFAULT_SECURITY_HEADER_VALUES,

        strictTransportSecurity:
          "",
      },
    });

  check(
    missingHsts.valid ===
      false,
    "production policy without HSTS is rejected"
  );

  check(
    missingHsts.errors
      .includes(
        "MISSING_PRODUCTION_HSTS"
      ),
    "missing production HSTS is explicit"
  );

  // ============================================================
  // Q. INVALID ENVIRONMENT
  // ============================================================

  section(
    "Q. Invalid environment"
  );

  const invalidEnvironment =
    validateSecurityHeaderPolicy({
      environment:
        "UNKNOWN_ENVIRONMENT",
    });

  check(
    invalidEnvironment.valid ===
      false,
    "unknown deployment environment is rejected"
  );

  check(
    invalidEnvironment.errors
      .includes(
        "INVALID_ENVIRONMENT"
      ),
    "invalid environment rejection is explicit"
  );

  // ============================================================
  // R. INVALID POLICY STRUCTURE
  // ============================================================

  section(
    "R. Invalid policy structure"
  );

  const invalidPolicy =
    validateSecurityHeaderPolicy({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,

      values: [],
    });

  check(
    invalidPolicy.valid ===
      false,
    "array is rejected as security-header policy"
  );

  check(
    invalidPolicy.errors
      .includes(
        "INVALID_POLICY"
      ),
    "invalid security-header policy structure is explicit"
  );

  // ============================================================
  // S. INVALID BUILD FAILS CLOSED
  // ============================================================

  section(
    "S. Invalid build behavior"
  );

  const invalidBuild =
    buildSecurityHeaders({
      environment:
        SECURITY_HEADER_ENVIRONMENT
          .PRODUCTION,

      values: {
        ...DEFAULT_SECURITY_HEADER_VALUES,

        xContentTypeOptions:
          "invalid",
      },
    });

  check(
    invalidBuild.valid ===
      false,
    "invalid security policy does not produce valid header set"
  );

  check(
    Object.keys(
      invalidBuild.headers
    ).length === 0,
    "invalid policy emits no partial security-header set"
  );

  check(
    invalidBuild.status ===
      SECURITY_HEADER_STATUS.INVALID,
    "invalid header build reports INVALID"
  );

  // ============================================================
  // T. SAFETY BOUNDARY
  // ============================================================

  section(
    "T. Safety boundary"
  );

  check(
    production
      .equipmentControlExecuted ===
      false,
    "security-header service executes no equipment control"
  );

  check(
    production
      .autoDispatchExecuted ===
      false,
    "security-header service executes no auto-dispatch"
  );

  check(
    invalidBuild
      .equipmentControlExecuted ===
      false,
    "invalid security-header policy executes no equipment control"
  );

  check(
    invalidBuild
      .autoDispatchExecuted ===
      false,
    "invalid security-header policy executes no auto-dispatch"
  );

  // ============================================================
  // U. RESULT CONTRACT
  // ============================================================

  section(
    "U. Result contract"
  );

  check(
    production.phase ===
      "13.7",
    "header result preserves phase"
  );

  check(
    production.layer ===
      "HTTP_SECURITY_HEADERS",
    "header result preserves layer"
  );

  check(
    production.status ===
      "VALID",
    "successful header result reports VALID"
  );

  check(
    production.errors.length ===
      0,
    "successful header result has zero errors"
  );

  // ============================================================
  // V. FROZEN STRUCTURES
  // ============================================================

  section(
    "V. Frozen structures"
  );

  check(
    Object.isFrozen(
      SECURITY_HEADER_ENVIRONMENT
    ),
    "security-header environment taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      SECURITY_HEADER_STATUS
    ),
    "security-header status taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      SECURITY_HEADER_NAMES
    ),
    "security-header name taxonomy is frozen"
  );

  check(
    Object.isFrozen(
      DEFAULT_SECURITY_HEADER_VALUES
    ),
    "default security-header values are frozen"
  );

  check(
    Object.isFrozen(
      HTTP_SECURITY_HEADERS_INVARIANTS
    ),
    "security-header invariants are frozen"
  );

  check(
    Object.isFrozen(
      production
    ),
    "security-header result is frozen"
  );

  check(
    Object.isFrozen(
      production.headers
    ),
    "generated security-header collection is frozen"
  );

  // ============================================================
  // FINAL
  // ============================================================

  console.log(
    "\n------------------------------------------------------------------------"
  );

  console.log(
    "PHASE 13.7 HTTP / SECURITY HEADERS RESULT"
  );

  console.log(
    "------------------------------------------------------------------------"
  );

  console.log(
    "Content-Security-Policy : REQUIRED"
  );

  console.log(
    "Production HSTS         : REQUIRED"
  );

  console.log(
    "MIME sniffing           : BLOCKED"
  );

  console.log(
    "Framing / clickjacking  : BLOCKED"
  );

  console.log(
    "Referrer leakage        : RESTRICTED"
  );

  console.log(
    "Browser permissions     : RESTRICTED"
  );

  console.log(
    "Unsafe wildcard CSP     : FORBIDDEN"
  );

  console.log(
    "Unsafe inline scripts   : FORBIDDEN"
  );

  console.log(
    "Server disclosure       : FORBIDDEN"
  );

  console.log(
    "X-Powered-By disclosure : FORBIDDEN"
  );

  console.log(
    "Sensitive caching       : FORBIDDEN"
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
    "ASHMAAN PHASE 13.7 HTTP / SECURITY HEADERS VALIDATION PASSED"
  );
} catch (error) {
  console.error(
    "\n========================================================================"
  );

  console.error(
    "ASHMAAN PHASE 13.7 HTTP / SECURITY HEADERS VALIDATION FAILED"
  );

  console.error(
    "========================================================================"
  );

  console.error(
    error?.stack ?? error
  );

  process.exitCode = 1;
}