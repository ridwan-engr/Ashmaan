// ASHMAAN Phase 13.8
// CORS Production Hardening Service

export const CORS_HARDENING_PHASE = "13.8";

export const CORS_HARDENING_LAYER = "CORS";

export const CORS_ENVIRONMENT = Object.freeze({
    DEVELOPMENT: "DEVELOPMENT",
    TEST: "TEST",
    PRODUCTION: "PRODUCTION",
});

export const CORS_DECISION = Object.freeze({
    ALLOW: "ALLOW",
    DENY: "DENY",
    UNAVAILABLE: "UNAVAILABLE",
});

export const CORS_DENIAL_REASON = Object.freeze({
    INVALID_ENVIRONMENT: "INVALID_ENVIRONMENT",
    INVALID_POLICY: "INVALID_POLICY",
    ORIGIN_MISSING: "ORIGIN_MISSING",
    ORIGIN_INVALID: "ORIGIN_INVALID",
    ORIGIN_NOT_ALLOWED: "ORIGIN_NOT_ALLOWED",
    WILDCARD_FORBIDDEN_IN_PRODUCTION:
        "WILDCARD_FORBIDDEN_IN_PRODUCTION",
    WILDCARD_WITH_CREDENTIALS_FORBIDDEN:
        "WILDCARD_WITH_CREDENTIALS_FORBIDDEN",
    CORS_UNAVAILABLE: "CORS_UNAVAILABLE",
});

export const DEFAULT_ALLOWED_METHODS = Object.freeze([
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
]);

export const DEFAULT_ALLOWED_HEADERS = Object.freeze([
    "Authorization",
    "Content-Type",
]);

export const DEFAULT_EXPOSED_HEADERS = Object.freeze([]);

export const CORS_HARDENING_INVARIANTS = Object.freeze({
    productionOriginsMustBeExplicit: true,
    wildcardProductionOriginForbidden: true,
    wildcardWithCredentialsForbidden: true,
    unauthorizedOriginMustBeDenied: true,
    missingOriginEvidenceMustNotBeInferred: true,
    malformedOriginMustBeRejected: true,
    originComparisonMustBeExact: true,
    credentialsMustBeExplicit: true,
    methodsMustBeExplicit: true,
    headersMustBeExplicit: true,
    corsUnavailableMustNotAllow: true,
    corsFailureMustFailClosed: true,
    corsPolicyMustNotExecuteEquipmentControl: true,
    optimizationDssRemainsNonExecutable: true,
    optimizationDssAutoDispatchRemainsDisabled: true,
});

function normalizeEnvironment(environment) {
    return typeof environment === "string"
        ? environment.trim().toUpperCase()
        : "";
}

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

export function isKnownCorsEnvironment(environment) {
    return Object.values(CORS_ENVIRONMENT).includes(
        normalizeEnvironment(environment)
    );
}

export function isValidOrigin(origin) {
    if (
        typeof origin !== "string" ||
        origin.trim().length === 0
    ) {
        return false;
    }

    if (origin === "*") {
        return true;
    }

    try {
        const parsed = new URL(origin);

        return (
            (parsed.protocol === "http:" ||
                parsed.protocol === "https:") &&
            parsed.username === "" &&
            parsed.password === "" &&
            parsed.pathname === "/" &&
            parsed.search === "" &&
            parsed.hash === ""
        );
    } catch {
        return false;
    }
}

function hasDuplicates(values) {
    return new Set(values).size !== values.length;
}

function validStringArray(values) {
    return (
        Array.isArray(values) &&
        values.every(
            (value) =>
                typeof value === "string" &&
                value.trim().length > 0
        )
    );
}

export function validateCorsPolicy({
    environment = CORS_ENVIRONMENT.PRODUCTION,
    allowedOrigins = [],
    credentials = false,
    allowedMethods = DEFAULT_ALLOWED_METHODS,
    allowedHeaders = DEFAULT_ALLOWED_HEADERS,
    exposedHeaders = DEFAULT_EXPOSED_HEADERS,
} = {}) {
    const normalizedEnvironment =
        normalizeEnvironment(environment);

    const errors = [];

    if (!isKnownCorsEnvironment(normalizedEnvironment)) {
        errors.push(
            CORS_DENIAL_REASON.INVALID_ENVIRONMENT
        );
    }

    if (
        !Array.isArray(allowedOrigins) ||
        !validStringArray(allowedMethods) ||
        !validStringArray(allowedHeaders) ||
        !validStringArray(exposedHeaders) ||
        typeof credentials !== "boolean"
    ) {
        errors.push(
            CORS_DENIAL_REASON.INVALID_POLICY
        );
    }

    if (Array.isArray(allowedOrigins)) {
        for (const origin of allowedOrigins) {
            if (!isValidOrigin(origin)) {
                errors.push(
                    CORS_DENIAL_REASON.ORIGIN_INVALID
                );
                break;
            }
        }

        if (hasDuplicates(allowedOrigins)) {
            errors.push(
                CORS_DENIAL_REASON.INVALID_POLICY
            );
        }

        const hasWildcard =
            allowedOrigins.includes("*");

        if (
            normalizedEnvironment ===
            CORS_ENVIRONMENT.PRODUCTION &&
            hasWildcard
        ) {
            errors.push(
                CORS_DENIAL_REASON
                    .WILDCARD_FORBIDDEN_IN_PRODUCTION
            );
        }

        if (credentials === true && hasWildcard) {
            errors.push(
                CORS_DENIAL_REASON
                    .WILDCARD_WITH_CREDENTIALS_FORBIDDEN
            );
        }

        if (
            normalizedEnvironment ===
            CORS_ENVIRONMENT.PRODUCTION &&
            allowedOrigins.length === 0
        ) {
            errors.push(
                CORS_DENIAL_REASON.INVALID_POLICY
            );
        }
    }

    return Object.freeze({
        phase: CORS_HARDENING_PHASE,
        layer: CORS_HARDENING_LAYER,

        valid: errors.length === 0,

        errors: Object.freeze([
            ...errors,
        ]),

        invariants:
            CORS_HARDENING_INVARIANTS,
    });
}

export function createCorsDecision({
    decision,
    origin = null,
    credentials = false,
    reason = null,
} = {}) {
    if (
        !Object.values(CORS_DECISION).includes(
            decision
        )
    ) {
        throw new TypeError(
            `Unsupported CORS decision: ${decision}`
        );
    }

    const allowed =
        decision === CORS_DECISION.ALLOW;

    return Object.freeze({
        phase: CORS_HARDENING_PHASE,
        layer: CORS_HARDENING_LAYER,

        decision,
        allowed,

        origin:
            typeof origin === "string"
                ? origin
                : null,

        credentials:
            credentials === true,

        reason:
            allowed
                ? null
                : reason,

        equipmentControlExecuted: false,
        autoDispatchExecuted: false,

        invariants:
            CORS_HARDENING_INVARIANTS,
    });
}

export function evaluateCorsOrigin({
    origin,
    environment = CORS_ENVIRONMENT.PRODUCTION,
    allowedOrigins = [],
    credentials = false,
    allowedMethods = DEFAULT_ALLOWED_METHODS,
    allowedHeaders = DEFAULT_ALLOWED_HEADERS,
    exposedHeaders = DEFAULT_EXPOSED_HEADERS,
    corsAvailable = true,
} = {}) {
    if (corsAvailable !== true) {
        return createCorsDecision({
            decision: CORS_DECISION.UNAVAILABLE,
            origin,
            credentials,

            reason:
                CORS_DENIAL_REASON.CORS_UNAVAILABLE,
        });
    }

    const policyValidation =
        validateCorsPolicy({
            environment,
            allowedOrigins,
            credentials,
            allowedMethods,
            allowedHeaders,
            exposedHeaders,
        });

    if (!policyValidation.valid) {
        return createCorsDecision({
            decision: CORS_DECISION.DENY,
            origin,
            credentials,

            reason:
                policyValidation.errors[0] ??
                CORS_DENIAL_REASON.INVALID_POLICY,
        });
    }

    if (
        typeof origin !== "string" ||
        origin.trim().length === 0
    ) {
        return createCorsDecision({
            decision: CORS_DECISION.DENY,
            origin: null,
            credentials,

            reason:
                CORS_DENIAL_REASON.ORIGIN_MISSING,
        });
    }

    if (!isValidOrigin(origin) || origin === "*") {
        return createCorsDecision({
            decision: CORS_DECISION.DENY,
            origin,
            credentials,

            reason:
                CORS_DENIAL_REASON.ORIGIN_INVALID,
        });
    }

    const wildcardAllowed =
        allowedOrigins.includes("*");

    const explicitMatch =
        allowedOrigins.includes(origin);

    if (
        !wildcardAllowed &&
        !explicitMatch
    ) {
        return createCorsDecision({
            decision: CORS_DECISION.DENY,
            origin,
            credentials,

            reason:
                CORS_DENIAL_REASON.ORIGIN_NOT_ALLOWED,
        });
    }

    return createCorsDecision({
        decision: CORS_DECISION.ALLOW,
        origin,
        credentials,
        reason: null,
    });
}

export function buildCorsConfiguration({
    environment = CORS_ENVIRONMENT.PRODUCTION,
    allowedOrigins = [],
    credentials = false,
    allowedMethods = DEFAULT_ALLOWED_METHODS,
    allowedHeaders = DEFAULT_ALLOWED_HEADERS,
    exposedHeaders = DEFAULT_EXPOSED_HEADERS,
} = {}) {
    const policy =
        validateCorsPolicy({
            environment,
            allowedOrigins,
            credentials,
            allowedMethods,
            allowedHeaders,
            exposedHeaders,
        });

    if (!policy.valid) {
        return Object.freeze({
            phase: CORS_HARDENING_PHASE,
            layer: CORS_HARDENING_LAYER,

            valid: false,

            config: null,

            errors: policy.errors,

            equipmentControlExecuted: false,
            autoDispatchExecuted: false,

            invariants:
                CORS_HARDENING_INVARIANTS,
        });
    }

    return Object.freeze({
        phase: CORS_HARDENING_PHASE,
        layer: CORS_HARDENING_LAYER,

        valid: true,

        config: Object.freeze({
            environment:
                normalizeEnvironment(environment),

            allowedOrigins:
                Object.freeze([
                    ...allowedOrigins,
                ]),

            credentials,

            allowedMethods:
                Object.freeze([
                    ...allowedMethods,
                ]),

            allowedHeaders:
                Object.freeze([
                    ...allowedHeaders,
                ]),

            exposedHeaders:
                Object.freeze([
                    ...exposedHeaders,
                ]),
        }),

        errors: Object.freeze([]),

        equipmentControlExecuted: false,
        autoDispatchExecuted: false,

        invariants:
            CORS_HARDENING_INVARIANTS,
    });
}

export default evaluateCorsOrigin;