// ASHMAAN Phase 13.7
// HTTP / Security Headers Service

export const HTTP_SECURITY_HEADERS_PHASE =
  "13.7";

export const HTTP_SECURITY_HEADERS_LAYER =
  "HTTP_SECURITY_HEADERS";

// ============================================================
// ENVIRONMENTS
// ============================================================

export const SECURITY_HEADER_ENVIRONMENT =
  Object.freeze({
    DEVELOPMENT: "DEVELOPMENT",
    TEST: "TEST",
    PRODUCTION: "PRODUCTION",
  });

// ============================================================
// POLICY STATUS
// ============================================================

export const SECURITY_HEADER_STATUS =
  Object.freeze({
    VALID: "VALID",
    INVALID: "INVALID",
  });

// ============================================================
// STANDARD HEADER NAMES
// ============================================================

export const SECURITY_HEADER_NAMES =
  Object.freeze({
    CONTENT_SECURITY_POLICY:
      "Content-Security-Policy",

    STRICT_TRANSPORT_SECURITY:
      "Strict-Transport-Security",

    X_CONTENT_TYPE_OPTIONS:
      "X-Content-Type-Options",

    X_FRAME_OPTIONS:
      "X-Frame-Options",

    REFERRER_POLICY:
      "Referrer-Policy",

    PERMISSIONS_POLICY:
      "Permissions-Policy",

    CROSS_ORIGIN_OPENER_POLICY:
      "Cross-Origin-Opener-Policy",

    CROSS_ORIGIN_RESOURCE_POLICY:
      "Cross-Origin-Resource-Policy",

    X_DNS_PREFETCH_CONTROL:
      "X-DNS-Prefetch-Control",

    CACHE_CONTROL:
      "Cache-Control",
  });

// ============================================================
// SECURITY HEADER VALUES
// ============================================================

export const DEFAULT_SECURITY_HEADER_VALUES =
  Object.freeze({
    contentSecurityPolicy:
      "default-src 'self'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none'; " +
      "object-src 'none'; " +
      "script-src 'self'; " +
      "style-src 'self'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'",

    strictTransportSecurity:
      "max-age=31536000; includeSubDomains",

    xContentTypeOptions:
      "nosniff",

    xFrameOptions:
      "DENY",

    referrerPolicy:
      "no-referrer",

    permissionsPolicy:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",

    crossOriginOpenerPolicy:
      "same-origin",

    crossOriginResourcePolicy:
      "same-origin",

    xDnsPrefetchControl:
      "off",

    sensitiveCacheControl:
      "no-store, no-cache, must-revalidate, private",
  });

// ============================================================
// INVARIANTS
// ============================================================

export const HTTP_SECURITY_HEADERS_INVARIANTS =
  Object.freeze({
    securityHeadersExplicitlyDefined:
      true,

    productionHstsRequired:
      true,

    mimeSniffingProtectionRequired:
      true,

    clickjackingProtectionRequired:
      true,

    contentSecurityPolicyRequired:
      true,

    referrerPolicyRequired:
      true,

    permissionsPolicyRequired:
      true,

    serverImplementationDisclosureForbidden:
      true,

    xPoweredByDisclosureForbidden:
      true,

    sensitiveResponsesMustNotBeCached:
      true,

    unsafeWildcardCspForbidden:
      true,

    unsafeInlineScriptDefaultForbidden:
      true,

    framingDefaultForbidden:
      true,

    securityPolicyMustNotExecuteEquipmentControl:
      true,

    optimizationDssRemainsNonExecutable:
      true,

    optimizationDssAutoDispatchRemainsDisabled:
      true,
  });

// ============================================================
// HELPERS
// ============================================================

function normalizeEnvironment(environment) {
  return typeof environment === "string"
    ? environment.trim().toUpperCase()
    : "";
}

export function isKnownSecurityHeaderEnvironment(
  environment
) {
  return Object.values(
    SECURITY_HEADER_ENVIRONMENT
  ).includes(
    normalizeEnvironment(environment)
  );
}

function hasUnsafeWildcardCsp(csp) {
  if (typeof csp !== "string") {
    return true;
  }

  const normalized =
    csp.toLowerCase();

  return (
    normalized.includes(
      "default-src *"
    ) ||
    normalized.includes(
      "script-src *"
    ) ||
    normalized.includes(
      "object-src *"
    )
  );
}

function hasUnsafeInlineScript(csp) {
  if (typeof csp !== "string") {
    return true;
  }

  const scriptDirective =
    csp
      .split(";")
      .map((part) => part.trim())
      .find((part) =>
        part.startsWith(
          "script-src"
        )
      );

  if (!scriptDirective) {
    return false;
  }

  return scriptDirective.includes(
    "'unsafe-inline'"
  );
}

function hasFrameProtection(csp) {
  return (
    typeof csp === "string" &&
    csp
      .toLowerCase()
      .includes(
        "frame-ancestors 'none'"
      )
  );
}

// ============================================================
// POLICY VALIDATION
// ============================================================

export function validateSecurityHeaderPolicy({
  environment =
    SECURITY_HEADER_ENVIRONMENT
      .PRODUCTION,

  values =
    DEFAULT_SECURITY_HEADER_VALUES,
} = {}) {
  const normalizedEnvironment =
    normalizeEnvironment(environment);

  const errors = [];

  if (
    !isKnownSecurityHeaderEnvironment(
      normalizedEnvironment
    )
  ) {
    errors.push(
      "INVALID_ENVIRONMENT"
    );
  }

  if (
    !values ||
    typeof values !== "object" ||
    Array.isArray(values)
  ) {
    errors.push(
      "INVALID_POLICY"
    );

    return Object.freeze({
      phase:
        HTTP_SECURITY_HEADERS_PHASE,

      layer:
        HTTP_SECURITY_HEADERS_LAYER,

      status:
        SECURITY_HEADER_STATUS.INVALID,

      valid: false,

      errors:
        Object.freeze(errors),

      invariants:
        HTTP_SECURITY_HEADERS_INVARIANTS,
    });
  }

  const requiredStringFields = [
    "contentSecurityPolicy",
    "xContentTypeOptions",
    "xFrameOptions",
    "referrerPolicy",
    "permissionsPolicy",
    "crossOriginOpenerPolicy",
    "crossOriginResourcePolicy",
    "xDnsPrefetchControl",
    "sensitiveCacheControl",
  ];

  for (
    const field of
      requiredStringFields
  ) {
    if (
      typeof values[field] !==
        "string" ||
      values[field].trim()
        .length === 0
    ) {
      errors.push(
        `MISSING_${field.toUpperCase()}`
      );
    }
  }

  if (
    normalizedEnvironment ===
      SECURITY_HEADER_ENVIRONMENT
        .PRODUCTION &&
    (
      typeof values
        .strictTransportSecurity !==
        "string" ||
      values
        .strictTransportSecurity
        .trim()
        .length === 0
    )
  ) {
    errors.push(
      "MISSING_PRODUCTION_HSTS"
    );
  }

  if (
    values.xContentTypeOptions !==
      "nosniff"
  ) {
    errors.push(
      "INVALID_NOSNIFF_POLICY"
    );
  }

  if (
    values.xFrameOptions !==
      "DENY"
  ) {
    errors.push(
      "INVALID_FRAME_POLICY"
    );
  }

  if (
    hasUnsafeWildcardCsp(
      values.contentSecurityPolicy
    )
  ) {
    errors.push(
      "UNSAFE_WILDCARD_CSP"
    );
  }

  if (
    hasUnsafeInlineScript(
      values.contentSecurityPolicy
    )
  ) {
    errors.push(
      "UNSAFE_INLINE_SCRIPT"
    );
  }

  if (
    !hasFrameProtection(
      values.contentSecurityPolicy
    )
  ) {
    errors.push(
      "CSP_FRAME_PROTECTION_MISSING"
    );
  }

  return Object.freeze({
    phase:
      HTTP_SECURITY_HEADERS_PHASE,

    layer:
      HTTP_SECURITY_HEADERS_LAYER,

    status:
      errors.length === 0
        ? SECURITY_HEADER_STATUS.VALID
        : SECURITY_HEADER_STATUS.INVALID,

    valid:
      errors.length === 0,

    errors:
      Object.freeze([
        ...errors,
      ]),

    invariants:
      HTTP_SECURITY_HEADERS_INVARIANTS,
  });
}

// ============================================================
// HEADER BUILDER
// ============================================================

export function buildSecurityHeaders({
  environment =
    SECURITY_HEADER_ENVIRONMENT
      .PRODUCTION,

  sensitiveResponse = false,

  values =
    DEFAULT_SECURITY_HEADER_VALUES,
} = {}) {
  const normalizedEnvironment =
    normalizeEnvironment(environment);

  const validation =
    validateSecurityHeaderPolicy({
      environment:
        normalizedEnvironment,
      values,
    });

  if (!validation.valid) {
    return Object.freeze({
      phase:
        HTTP_SECURITY_HEADERS_PHASE,

      layer:
        HTTP_SECURITY_HEADERS_LAYER,

      status:
        SECURITY_HEADER_STATUS.INVALID,

      valid: false,

      headers:
        Object.freeze({}),

      errors:
        validation.errors,

      serverHeaderExposed: false,

      xPoweredByExposed: false,

      equipmentControlExecuted:
        false,

      autoDispatchExecuted:
        false,

      invariants:
        HTTP_SECURITY_HEADERS_INVARIANTS,
    });
  }

  const headers = {
    [SECURITY_HEADER_NAMES
      .CONTENT_SECURITY_POLICY]:
      values
        .contentSecurityPolicy,

    [SECURITY_HEADER_NAMES
      .X_CONTENT_TYPE_OPTIONS]:
      values
        .xContentTypeOptions,

    [SECURITY_HEADER_NAMES
      .X_FRAME_OPTIONS]:
      values
        .xFrameOptions,

    [SECURITY_HEADER_NAMES
      .REFERRER_POLICY]:
      values
        .referrerPolicy,

    [SECURITY_HEADER_NAMES
      .PERMISSIONS_POLICY]:
      values
        .permissionsPolicy,

    [SECURITY_HEADER_NAMES
      .CROSS_ORIGIN_OPENER_POLICY]:
      values
        .crossOriginOpenerPolicy,

    [SECURITY_HEADER_NAMES
      .CROSS_ORIGIN_RESOURCE_POLICY]:
      values
        .crossOriginResourcePolicy,

    [SECURITY_HEADER_NAMES
      .X_DNS_PREFETCH_CONTROL]:
      values
        .xDnsPrefetchControl,
  };

  if (
    normalizedEnvironment ===
      SECURITY_HEADER_ENVIRONMENT
        .PRODUCTION
  ) {
    headers[
      SECURITY_HEADER_NAMES
        .STRICT_TRANSPORT_SECURITY
    ] =
      values
        .strictTransportSecurity;
  }

  if (sensitiveResponse === true) {
    headers[
      SECURITY_HEADER_NAMES
        .CACHE_CONTROL
    ] =
      values
        .sensitiveCacheControl;
  }

  return Object.freeze({
    phase:
      HTTP_SECURITY_HEADERS_PHASE,

    layer:
      HTTP_SECURITY_HEADERS_LAYER,

    status:
      SECURITY_HEADER_STATUS.VALID,

    valid: true,

    environment:
      normalizedEnvironment,

    sensitiveResponse:
      sensitiveResponse === true,

    headers:
      Object.freeze({
        ...headers,
      }),

    serverHeaderExposed: false,

    xPoweredByExposed: false,

    equipmentControlExecuted:
      false,

    autoDispatchExecuted:
      false,

    errors:
      Object.freeze([]),

    invariants:
      HTTP_SECURITY_HEADERS_INVARIANTS,
  });
}

export default buildSecurityHeaders;