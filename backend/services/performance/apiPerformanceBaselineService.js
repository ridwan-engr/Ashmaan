// services/performance/apiPerformanceBaselineService.js

import {
    performance,
} from "node:perf_hooks";


/*
|--------------------------------------------------------------------------
| ASHMAAN
| Phase 14.10 — API Sustained Performance / Payload Bounds
|--------------------------------------------------------------------------
|
| Purpose:
|
| - measure existing live read-only HTTP behavior
| - record response-time evidence
| - enforce finite client timeout
| - enforce bounded response consumption
| - preserve Phase 13 security controls
|
| This service DOES NOT:
|
| - create a new API
| - mutate MongoDB
| - invoke VRM
| - start the scheduler
| - invoke write endpoints
| - change authentication / authorization
| - weaken rate limiting
| - weaken security headers / CORS
| - execute Optimization/DSS
| - execute equipment control
| - execute automatic dispatch
|
|--------------------------------------------------------------------------
*/


export const API_PERFORMANCE_PHASE =
    "14.10";

export const API_PERFORMANCE_LAYER =
    "API_PERFORMANCE_RESILIENCE";

export const API_PERFORMANCE_CATEGORY =
    "SUSTAINED_HTTP_PAYLOAD_BOUNDS";


export const API_PERFORMANCE_DEFAULTS =
    Object.freeze({
        baseUrl:
            process.env
                .ASHMAAN_API_BASE_URL ??
            "http://localhost:5000",

        healthPath:
            "/api/v1/health",

        rootPath:
            "/",

        notFoundPath:
            "/api/v1/phase14-api-performance-not-found",

        repetitions:
            12,

        timeoutMs:
            3000,

        maxResponseBytes:
            256 * 1024,
    });


/*
|--------------------------------------------------------------------------
| Validator safety bounds
|--------------------------------------------------------------------------
|
| These are workload safety limits.
|
| They are NOT:
|
| - API latency SLAs
| - production SLOs
| - availability targets
|
|--------------------------------------------------------------------------
*/

export const API_PERFORMANCE_LIMITS =
    Object.freeze({
        maxRepetitions:
            50,

        maxTimeoutMs:
            10_000,

        maxResponseBytes:
            1024 * 1024,
    });


export const API_PERFORMANCE_BOUNDARIES =
    Object.freeze({
        latencyMeasured:
            true,

        responseTimeBaselineRequired:
            true,

        finiteTimeoutRequired:
            true,

        responseConsumptionBounded:
            true,

        paginationRequiredForCollections:
            true,

        paginationLimitsBounded:
            true,

        malformedRequestProtectionRequired:
            true,

        authenticationPreserved:
            true,

        authorizationPreserved:
            true,

        inputValidationPreserved:
            true,

        rateLimitingPreserved:
            true,

        securityHeadersPreserved:
            true,

        corsPreserved:
            true,

        readOnlyHttpMeasurement:
            true,

        arbitraryLatencySlaDefined:
            false,

        performsDatabaseMutation:
            false,

        performsVrmRequest:
            false,

        startsScheduler:
            false,

        invokesWriteEndpoint:
            false,

        executesForecasting:
            false,

        executesOptimization:
            false,

        performsEquipmentControl:
            false,

        performsAutoDispatch:
            false,

        missingMeansZero:
            false,

        unavailableMeansZero:
            false,

        unitInferenceAllowed:
            false,

        topologyInferenceAllowed:
            false,
    });


export const API_SECURITY_HEADER_NAMES =
    Object.freeze([
        "content-security-policy",
        "x-content-type-options",
        "x-frame-options",
        "referrer-policy",
    ]);


/*
|--------------------------------------------------------------------------
| Validation helpers
|--------------------------------------------------------------------------
*/

function positiveInteger(
    value,
    name
) {
    if (
        !Number.isInteger(
            value
        ) ||
        value <=
            0
    ) {
        throw new TypeError(
            `${name} must be a positive integer.`
        );
    }

    return value;
}


function requireNonEmptyString(
    value,
    name
) {
    if (
        typeof value !==
            "string" ||
        value.trim() ===
            ""
    ) {
        throw new TypeError(
            `${name} must be a non-empty string.`
        );
    }

    return value.trim();
}


export function validateApiPerformanceConfiguration({
    baseUrl =
        API_PERFORMANCE_DEFAULTS
            .baseUrl,

    repetitions =
        API_PERFORMANCE_DEFAULTS
            .repetitions,

    timeoutMs =
        API_PERFORMANCE_DEFAULTS
            .timeoutMs,

    maxResponseBytes =
        API_PERFORMANCE_DEFAULTS
            .maxResponseBytes,
} = {}) {
    const normalizedBaseUrl =
        requireNonEmptyString(
            baseUrl,
            "baseUrl"
        )
            .replace(
                /\/+$/,
                ""
            );


    positiveInteger(
        repetitions,
        "repetitions"
    );

    positiveInteger(
        timeoutMs,
        "timeoutMs"
    );

    positiveInteger(
        maxResponseBytes,
        "maxResponseBytes"
    );


    if (
        repetitions >
        API_PERFORMANCE_LIMITS
            .maxRepetitions
    ) {
        throw new RangeError(
            "repetitions exceeds Phase 14.10 safety limit."
        );
    }


    if (
        timeoutMs >
        API_PERFORMANCE_LIMITS
            .maxTimeoutMs
    ) {
        throw new RangeError(
            "timeoutMs exceeds Phase 14.10 safety limit."
        );
    }


    if (
        maxResponseBytes >
        API_PERFORMANCE_LIMITS
            .maxResponseBytes
    ) {
        throw new RangeError(
            "maxResponseBytes exceeds Phase 14.10 safety limit."
        );
    }


    return Object.freeze({
        baseUrl:
            normalizedBaseUrl,

        repetitions,

        timeoutMs,

        maxResponseBytes,
    });
}


/*
|--------------------------------------------------------------------------
| Bounded response reader
|--------------------------------------------------------------------------
|
| Prevents the validation client from consuming an unbounded response body.
|
|--------------------------------------------------------------------------
*/

export async function readBoundedResponseBody(
    response,
    {
        maxResponseBytes =
            API_PERFORMANCE_DEFAULTS
                .maxResponseBytes,
    } = {}
) {
    positiveInteger(
        maxResponseBytes,
        "maxResponseBytes"
    );


    if (
        maxResponseBytes >
        API_PERFORMANCE_LIMITS
            .maxResponseBytes
    ) {
        throw new RangeError(
            "maxResponseBytes exceeds Phase 14.10 safety limit."
        );
    }


    if (
        !response ||
        typeof response !==
            "object"
    ) {
        throw new TypeError(
            "response is required."
        );
    }


    if (
        !response.body ||
        typeof response.body
            .getReader !==
            "function"
    ) {
        const text =
            await response.text();

        const bytes =
            Buffer.byteLength(
                text,
                "utf8"
            );

        if (
            bytes >
            maxResponseBytes
        ) {
            const error =
                new Error(
                    "API_RESPONSE_PAYLOAD_LIMIT_EXCEEDED"
                );

            error.code =
                "API_RESPONSE_PAYLOAD_LIMIT_EXCEEDED";

            throw error;
        }

        return Object.freeze({
            text,

            bytes,
        });
    }


    const reader =
        response.body
            .getReader();

    const chunks =
        [];

    let totalBytes =
        0;


    try {
        while (
            true
        ) {
            const {
                done,
                value,
            } =
                await reader.read();


            if (
                done
            ) {
                break;
            }


            const chunk =
                Buffer.from(
                    value
                );


            totalBytes +=
                chunk.length;


            if (
                totalBytes >
                maxResponseBytes
            ) {
                await reader.cancel(
                    "Phase 14.10 response bound exceeded."
                );

                const error =
                    new Error(
                        "API_RESPONSE_PAYLOAD_LIMIT_EXCEEDED"
                    );

                error.code =
                    "API_RESPONSE_PAYLOAD_LIMIT_EXCEEDED";

                throw error;
            }


            chunks.push(
                chunk
            );
        }
    } finally {
        try {
            reader.releaseLock();
        } catch {
            // No action required.
        }
    }


    const buffer =
        Buffer.concat(
            chunks,
            totalBytes
        );


    return Object.freeze({
        text:
            buffer.toString(
                "utf8"
            ),

        bytes:
            totalBytes,
    });
}


/*
|--------------------------------------------------------------------------
| Security-header snapshot
|--------------------------------------------------------------------------
*/

export function extractSecurityHeaders(
    headers
) {
    const result =
        {};


    for (
        const name
        of API_SECURITY_HEADER_NAMES
    ) {
        result[
            name
        ] =
            headers?.get?.(
                name
            ) ??
            null;
    }


    return Object.freeze(
        result
    );
}


/*
|--------------------------------------------------------------------------
| One bounded HTTP measurement
|--------------------------------------------------------------------------
*/

export async function measureApiGet({
    url,

    timeoutMs =
        API_PERFORMANCE_DEFAULTS
            .timeoutMs,

    maxResponseBytes =
        API_PERFORMANCE_DEFAULTS
            .maxResponseBytes,
} = {}) {
    requireNonEmptyString(
        url,
        "url"
    );

    positiveInteger(
        timeoutMs,
        "timeoutMs"
    );

    positiveInteger(
        maxResponseBytes,
        "maxResponseBytes"
    );


    if (
        timeoutMs >
        API_PERFORMANCE_LIMITS
            .maxTimeoutMs
    ) {
        throw new RangeError(
            "timeoutMs exceeds Phase 14.10 safety limit."
        );
    }


    const controller =
        new AbortController();


    const timeoutHandle =
        setTimeout(
            () => {
                controller.abort();
            },
            timeoutMs
        );


    const startedAt =
        performance.now();


    try {
        const response =
            await fetch(
                url,
                {
                    method:
                        "GET",

                    headers:
                        {
                            Accept:
                                "application/json",
                        },

                    signal:
                        controller.signal,

                    redirect:
                        "error",
                }
            );


        const body =
            await readBoundedResponseBody(
                response,
                {
                    maxResponseBytes,
                }
            );


        const durationMs =
            performance.now() -
            startedAt;


        return Object.freeze({
            url,

            method:
                "GET",

            statusCode:
                response.status,

            ok:
                response.ok,

            durationMs,

            responseBytes:
                body.bytes,

            contentType:
                response.headers.get(
                    "content-type"
                ),

            contentLength:
                response.headers.get(
                    "content-length"
                ),

            securityHeaders:
                extractSecurityHeaders(
                    response.headers
                ),

            bodyText:
                body.text,
        });
    } catch (error) {
        const durationMs =
            performance.now() -
            startedAt;


        if (
            error?.name ===
            "AbortError"
        ) {
            const timeoutError =
                new Error(
                    "API_REQUEST_TIMEOUT"
                );

            timeoutError.code =
                "API_REQUEST_TIMEOUT";

            timeoutError.durationMs =
                durationMs;

            throw timeoutError;
        }


        throw error;
    } finally {
        clearTimeout(
            timeoutHandle
        );
    }
}


/*
|--------------------------------------------------------------------------
| Sequential sustained measurement
|--------------------------------------------------------------------------
|
| Deliberately sequential:
|
| - no load testing
| - no concurrency flood
| - no destructive stress
|
|--------------------------------------------------------------------------
*/

export async function measureRepeatedApiGet({
    url,

    repetitions =
        API_PERFORMANCE_DEFAULTS
            .repetitions,

    timeoutMs =
        API_PERFORMANCE_DEFAULTS
            .timeoutMs,

    maxResponseBytes =
        API_PERFORMANCE_DEFAULTS
            .maxResponseBytes,
} = {}) {
    positiveInteger(
        repetitions,
        "repetitions"
    );


    if (
        repetitions >
        API_PERFORMANCE_LIMITS
            .maxRepetitions
    ) {
        throw new RangeError(
            "repetitions exceeds Phase 14.10 safety limit."
        );
    }


    const measurements =
        [];


    for (
        let index = 0;
        index <
        repetitions;
        index +=
        1
    ) {
        const measurement =
            await measureApiGet({
                url,
                timeoutMs,
                maxResponseBytes,
            });


        measurements.push(
            measurement
        );
    }


    const durations =
        measurements.map(
            (
                item
            ) =>
                item.durationMs
        );


    const responseBytes =
        measurements.map(
            (
                item
            ) =>
                item.responseBytes
        );


    const totalDurationMs =
        durations.reduce(
            (
                sum,
                value
            ) =>
                sum +
                value,
            0
        );


    const successful =
        measurements.filter(
            (
                item
            ) =>
                item.ok
        ).length;


    return Object.freeze({
        repetitions,

        successful,

        failed:
            repetitions -
            successful,

        minimumDurationMs:
            Math.min(
                ...durations
            ),

        maximumDurationMs:
            Math.max(
                ...durations
            ),

        meanDurationMs:
            totalDurationMs /
            repetitions,

        minimumResponseBytes:
            Math.min(
                ...responseBytes
            ),

        maximumResponseBytes:
            Math.max(
                ...responseBytes
            ),

        measurements:
            Object.freeze(
                measurements
            ),
    });
}


/*
|--------------------------------------------------------------------------
| Phase 14.10 live baseline
|--------------------------------------------------------------------------
*/

export async function runApiPerformanceBaseline({
    baseUrl =
        API_PERFORMANCE_DEFAULTS
            .baseUrl,

    repetitions =
        API_PERFORMANCE_DEFAULTS
            .repetitions,

    timeoutMs =
        API_PERFORMANCE_DEFAULTS
            .timeoutMs,

    maxResponseBytes =
        API_PERFORMANCE_DEFAULTS
            .maxResponseBytes,
} = {}) {
    const config =
        validateApiPerformanceConfiguration({
            baseUrl,
            repetitions,
            timeoutMs,
            maxResponseBytes,
        });


    const rootUrl =
        `${config.baseUrl}${API_PERFORMANCE_DEFAULTS.rootPath}`;


    const healthUrl =
        `${config.baseUrl}${API_PERFORMANCE_DEFAULTS.healthPath}`;


    const notFoundUrl =
        `${config.baseUrl}${API_PERFORMANCE_DEFAULTS.notFoundPath}`;


    const root =
        await measureApiGet({
            url:
                rootUrl,

            timeoutMs:
                config.timeoutMs,

            maxResponseBytes:
                config.maxResponseBytes,
        });


    const health =
        await measureRepeatedApiGet({
            url:
                healthUrl,

            repetitions:
                config.repetitions,

            timeoutMs:
                config.timeoutMs,

            maxResponseBytes:
                config.maxResponseBytes,
        });


    const notFound =
        await measureApiGet({
            url:
                notFoundUrl,

            timeoutMs:
                config.timeoutMs,

            maxResponseBytes:
                config.maxResponseBytes,
        });


    return Object.freeze({
        phase:
            API_PERFORMANCE_PHASE,

        layer:
            API_PERFORMANCE_LAYER,

        category:
            API_PERFORMANCE_CATEGORY,

        controlled:
            true,

        liveHttpEvidence:
            true,

        destructiveLoadTest:
            false,

        config,

        root,

        health,

        notFound,

        boundaries:
            API_PERFORMANCE_BOUNDARIES,
    });
}