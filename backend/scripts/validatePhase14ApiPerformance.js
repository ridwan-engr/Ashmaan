// scripts/validatePhase14ApiPerformance.js

import assert from "node:assert/strict";

import {
    readFile,
} from "node:fs/promises";

import {
    fileURLToPath,
} from "node:url";

import {
    dirname,
    resolve,
} from "node:path";

import {
    createForecastingApiService,
} from "../services/forecasting/forecastingApiService.js";

import {
    API_PERFORMANCE_PHASE,
    API_PERFORMANCE_LAYER,
    API_PERFORMANCE_CATEGORY,
    API_PERFORMANCE_DEFAULTS,
    API_PERFORMANCE_LIMITS,
    API_PERFORMANCE_BOUNDARIES,
    API_SECURITY_HEADER_NAMES,

    validateApiPerformanceConfiguration,
    readBoundedResponseBody,
    runApiPerformanceBaseline,
} from "../services/performance/apiPerformanceBaselineService.js";


const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    dirname(
        __filename
    );

const BACKEND_ROOT =
    resolve(
        __dirname,
        ".."
    );


let checks =
    0;


function pass(
    message
) {
    checks +=
        1;

    console.log(
        `PASS ${checks}: ${message}`
    );
}


function section(
    title
) {
    console.log(
        `\n--- ${title} ---`
    );
}


function check(
    condition,
    message
) {
    assert.equal(
        Boolean(
            condition
        ),
        true
    );

    pass(
        message
    );
}


function finiteNonNegative(
    value
) {
    return (
        typeof value ===
            "number" &&
        Number.isFinite(
            value
        ) &&
        value >=
            0
    );
}


async function readBackendSource(
    relativePath
) {
    return readFile(
        resolve(
            BACKEND_ROOT,
            relativePath
        ),
        "utf8"
    );
}


console.log(`
============================================================================
ASHMAAN PHASE 14.10 — API SUSTAINED PERFORMANCE / PAYLOAD BOUNDS VALIDATION
============================================================================
`);


/*
|--------------------------------------------------------------------------
| A. Identity
|--------------------------------------------------------------------------
*/

section(
    "A. Phase identity and contract"
);


assert.equal(
    API_PERFORMANCE_PHASE,
    "14.10"
);
pass(
    "phase identity is 14.10"
);


assert.equal(
    API_PERFORMANCE_LAYER,
    "API_PERFORMANCE_RESILIENCE"
);
pass(
    "layer identifies API performance and resilience"
);


assert.equal(
    API_PERFORMANCE_CATEGORY,
    "SUSTAINED_HTTP_PAYLOAD_BOUNDS"
);
pass(
    "category identifies sustained HTTP and payload-bound validation"
);


/*
|--------------------------------------------------------------------------
| B. Controlled defaults
|--------------------------------------------------------------------------
*/

section(
    "B. Bounded API measurement defaults"
);


assert.equal(
    API_PERFORMANCE_DEFAULTS
        .healthPath,
    "/api/v1/health"
);
pass(
    "canonical health endpoint is explicit"
);


assert.equal(
    API_PERFORMANCE_DEFAULTS
        .repetitions,
    12
);
pass(
    "default repeated workload is bounded at twelve requests"
);


check(
    API_PERFORMANCE_DEFAULTS
        .timeoutMs >
        0,
    "HTTP request timeout is finite"
);


check(
    API_PERFORMANCE_DEFAULTS
        .maxResponseBytes >
        0,
    "maximum consumed response payload is finite"
);


check(
    API_PERFORMANCE_DEFAULTS
        .repetitions <=
        API_PERFORMANCE_LIMITS
            .maxRepetitions,
    "default repetitions remain within safety bound"
);


check(
    API_PERFORMANCE_DEFAULTS
        .timeoutMs <=
        API_PERFORMANCE_LIMITS
            .maxTimeoutMs,
    "default timeout remains within safety bound"
);


check(
    API_PERFORMANCE_DEFAULTS
        .maxResponseBytes <=
        API_PERFORMANCE_LIMITS
            .maxResponseBytes,
    "default payload consumption remains within safety bound"
);


/*
|--------------------------------------------------------------------------
| C. Phase 14.1 API boundaries
|--------------------------------------------------------------------------
*/

section(
    "C. API performance contract boundaries"
);


const requiredTrue =
    [
        [
            "latencyMeasured",
            "API latency measurement is required",
        ],
        [
            "responseTimeBaselineRequired",
            "API response-time baseline is required",
        ],
        [
            "finiteTimeoutRequired",
            "finite API timeout is required",
        ],
        [
            "responseConsumptionBounded",
            "response consumption must remain bounded",
        ],
        [
            "paginationRequiredForCollections",
            "collection APIs require pagination",
        ],
        [
            "paginationLimitsBounded",
            "pagination limits must remain bounded",
        ],
        [
            "malformedRequestProtectionRequired",
            "malformed-request resource protection remains required",
        ],
        [
            "authenticationPreserved",
            "authentication preservation remains required",
        ],
        [
            "authorizationPreserved",
            "authorization preservation remains required",
        ],
        [
            "inputValidationPreserved",
            "input validation preservation remains required",
        ],
        [
            "rateLimitingPreserved",
            "rate-limit preservation remains required",
        ],
        [
            "securityHeadersPreserved",
            "security-header preservation remains required",
        ],
        [
            "corsPreserved",
            "CORS preservation remains required",
        ],
        [
            "readOnlyHttpMeasurement",
            "Phase 14.10 live measurement is read-only",
        ],
    ];


for (
    const [
        key,
        message,
    ]
    of requiredTrue
) {
    assert.equal(
        API_PERFORMANCE_BOUNDARIES[
            key
        ],
        true
    );

    pass(
        message
    );
}


const requiredFalse =
    [
        [
            "arbitraryLatencySlaDefined",
            "Phase 14.10 defines no arbitrary latency SLA",
        ],
        [
            "performsDatabaseMutation",
            "Phase 14.10 performs no database mutation",
        ],
        [
            "performsVrmRequest",
            "Phase 14.10 performs no VRM request",
        ],
        [
            "startsScheduler",
            "Phase 14.10 does not start scheduler",
        ],
        [
            "invokesWriteEndpoint",
            "Phase 14.10 invokes no write endpoint",
        ],
        [
            "executesForecasting",
            "Phase 14.10 does not execute forecasting",
        ],
        [
            "executesOptimization",
            "Phase 14.10 does not execute optimization",
        ],
        [
            "performsEquipmentControl",
            "Phase 14.10 performs no equipment control",
        ],
        [
            "performsAutoDispatch",
            "Phase 14.10 performs no automatic dispatch",
        ],
        [
            "missingMeansZero",
            "missing evidence remains distinct from zero",
        ],
        [
            "unavailableMeansZero",
            "UNAVAILABLE remains distinct from zero",
        ],
        [
            "unitInferenceAllowed",
            "unit inference remains prohibited",
        ],
        [
            "topologyInferenceAllowed",
            "topology inference remains prohibited",
        ],
    ];


for (
    const [
        key,
        message,
    ]
    of requiredFalse
) {
    assert.equal(
        API_PERFORMANCE_BOUNDARIES[
            key
        ],
        false
    );

    pass(
        message
    );
}


/*
|--------------------------------------------------------------------------
| D. Unsafe measurement configuration rejection
|--------------------------------------------------------------------------
*/

section(
    "D. Unsafe measurement configuration rejection"
);


assert.throws(
    () =>
        validateApiPerformanceConfiguration({
            repetitions:
                API_PERFORMANCE_LIMITS
                    .maxRepetitions +
                1,
        }),
    RangeError
);
pass(
    "request repetitions above safety bound are rejected"
);


assert.throws(
    () =>
        validateApiPerformanceConfiguration({
            timeoutMs:
                API_PERFORMANCE_LIMITS
                    .maxTimeoutMs +
                1,
        }),
    RangeError
);
pass(
    "HTTP timeout above safety bound is rejected"
);


assert.throws(
    () =>
        validateApiPerformanceConfiguration({
            maxResponseBytes:
                API_PERFORMANCE_LIMITS
                    .maxResponseBytes +
                1,
        }),
    RangeError
);
pass(
    "response-consumption limit above safety bound is rejected"
);


/*
|--------------------------------------------------------------------------
| E. Client payload-bound enforcement
|--------------------------------------------------------------------------
*/

section(
    "E. Bounded response consumption"
);


const smallResponse =
    new Response(
        JSON.stringify({
            success:
                true,
        }),
        {
            status:
                200,

            headers:
                {
                    "content-type":
                        "application/json",
                },
        }
    );


const smallBody =
    await readBoundedResponseBody(
        smallResponse,
        {
            maxResponseBytes:
                1024,
        }
    );


check(
    smallBody.bytes >
        0,
    "bounded response reader consumes a small valid response"
);


check(
    smallBody.bytes <=
        1024,
    "small response remains within explicit byte bound"
);


const oversizedResponse =
    new Response(
        "X".repeat(
            2048
        ),
        {
            status:
                200,
        }
    );


await assert.rejects(
    () =>
        readBoundedResponseBody(
            oversizedResponse,
            {
                maxResponseBytes:
                    128,
            }
        ),
    (
        error
    ) =>
        error?.code ===
        "API_RESPONSE_PAYLOAD_LIMIT_EXCEEDED"
);
pass(
    "response larger than configured byte bound is rejected"
);


/*
|--------------------------------------------------------------------------
| F. Production Forecasting pagination evidence
|--------------------------------------------------------------------------
*/

section(
    "F. Production collection pagination bounds"
);


const forecastingSource =
    await readBackendSource(
        "services/forecasting/forecastingApiService.js"
    );


check(
    /page\s*=\s*1/.test(
        forecastingSource
    ),
    "production Forecasting API has explicit default page"
);


check(
    /limit\s*=\s*50/.test(
        forecastingSource
    ),
    "production Forecasting API has explicit default limit"
);


check(
    /Math\.min\s*\(/.test(
        forecastingSource
    ),
    "production Forecasting API applies explicit upper-limit calculation"
);


check(
    /200/.test(
        forecastingSource
    ),
    "production Forecasting API contains the validated 200-record cap"
);


check(
    /\.skip\s*\(/.test(
        forecastingSource
    ),
    "production Forecasting query supports explicit skip"
);


check(
    /\.limit\s*\(/.test(
        forecastingSource
    ),
    "production Forecasting query applies bounded limit"
);


/*
|--------------------------------------------------------------------------
| G. Execute production pagination logic without MongoDB
|--------------------------------------------------------------------------
*/

section(
    "G. Production pagination execution without database access"
);


const queryState =
    {
        filter:
            null,

        sort:
            null,

        skip:
            null,

        limit:
            null,
    };


const createQuery =
    () => {
        const query =
            {
                sort(
                    value
                ) {
                    queryState.sort =
                        value;

                    return query;
                },

                skip(
                    value
                ) {
                    queryState.skip =
                        value;

                    return query;
                },

                limit(
                    value
                ) {
                    queryState.limit =
                        value;

                    return query;
                },

                async lean() {
                    return [];
                },
            };

        return query;
    };


const MockForecastRecordModel =
    {
        find(
            filter
        ) {
            queryState.filter =
                filter;

            return createQuery();
        },

        findOne() {
            return {
                async lean() {
                    return null;
                },
            };
        },

        findById() {
            return {
                async lean() {
                    return null;
                },
            };
        },
    };


const forecastingApiService =
    createForecastingApiService({
        ForecastRecordModel:
            MockForecastRecordModel,
    });


const hugeLimitResult =
    await forecastingApiService
        .listForecasts({
            page:
                1,

            limit:
                999_999_999,
        });


assert.equal(
    hugeLimitResult
        .pagination
        .limit,
    200
);
pass(
    "extreme requested Forecasting limit is capped at 200"
);


assert.equal(
    queryState.limit,
    200
);
pass(
    "production query receives capped 200-record limit"
);


assert.equal(
    queryState.skip,
    0
);
pass(
    "first page produces zero skip"
);


const invalidPaginationResult =
    await forecastingApiService
        .listForecasts({
            page:
                "not-a-page",

            limit:
                "not-a-limit",
        });


assert.equal(
    invalidPaginationResult
        .pagination
        .page,
    1
);
pass(
    "invalid page falls back to bounded default page"
);


assert.equal(
    invalidPaginationResult
        .pagination
        .limit,
    50
);
pass(
    "invalid limit falls back to bounded default limit"
);


const secondPage =
    await forecastingApiService
        .listForecasts({
            page:
                2,

            limit:
                200,
        });


assert.equal(
    secondPage
        .pagination
        .skip,
    200
);
pass(
    "second bounded page calculates explicit skip"
);


assert.equal(
    secondPage
        .pagination
        .limit,
    200
);
pass(
    "second page preserves maximum bounded limit"
);


/*
|--------------------------------------------------------------------------
| H. Server security source evidence
|--------------------------------------------------------------------------
*/

section(
    "H. Existing API security controls remain present"
);


const serverSource =
    await readBackendSource(
        "server.js"
    );


check(
    /helmet\s*\(/.test(
        serverSource
    ),
    "server retains Helmet security middleware"
);


check(
    /cors\s*\(/.test(
        serverSource
    ),
    "server retains CORS middleware"
);


check(
    /express\.json\s*\(/.test(
        serverSource
    ),
    "server retains JSON request parsing"
);


check(
    /notFound/.test(
        serverSource
    ),
    "server retains controlled not-found middleware"
);


check(
    /errorHandler/.test(
        serverSource
    ),
    "server retains centralized error handler"
);


/*
|--------------------------------------------------------------------------
| I. Live HTTP baseline
|--------------------------------------------------------------------------
*/

section(
    "I. Live read-only HTTP baseline"
);


let baseline;


try {
    baseline =
        await runApiPerformanceBaseline();
} catch (error) {
    if (
        error?.cause?.code ===
            "ECONNREFUSED" ||
        error?.code ===
            "ECONNREFUSED"
    ) {
        console.error(`
ERROR: ASHMAAN backend is not reachable.

Start the backend in another PowerShell terminal:

    cd C:\\Users\\owner\\ASHMAAN\\backend
    npm run dev

Then run this Phase 14.10 validator again.
`);

        process.exitCode =
            1;

        throw error;
    }

    throw error;
}


assert.equal(
    baseline.phase,
    "14.10"
);
pass(
    "live baseline identifies Phase 14.10"
);


assert.equal(
    baseline.controlled,
    true
);
pass(
    "live API baseline is explicitly controlled"
);


assert.equal(
    baseline.liveHttpEvidence,
    true
);
pass(
    "Phase 14.10 includes live HTTP evidence"
);


assert.equal(
    baseline.destructiveLoadTest,
    false
);
pass(
    "Phase 14.10 is not a destructive load test"
);


/*
|--------------------------------------------------------------------------
| J. Root API response
|--------------------------------------------------------------------------
*/

section(
    "J. Root API live response"
);


assert.equal(
    baseline.root.statusCode,
    200
);
pass(
    "ASHMAAN root endpoint returns HTTP 200"
);


assert.equal(
    baseline.root.ok,
    true
);
pass(
    "ASHMAAN root endpoint is successful"
);


check(
    finiteNonNegative(
        baseline.root.durationMs
    ),
    "root endpoint response duration is finite"
);


check(
    baseline.root.responseBytes >
        0,
    "root endpoint returns a measurable payload"
);


check(
    baseline.root.responseBytes <=
        baseline.config
            .maxResponseBytes,
    "root payload remains within validation-client bound"
);


/*
|--------------------------------------------------------------------------
| K. Repeated health endpoint
|--------------------------------------------------------------------------
*/

section(
    "K. Sustained health-endpoint baseline"
);


assert.equal(
    baseline.health.repetitions,
    API_PERFORMANCE_DEFAULTS
        .repetitions
);
pass(
    "health endpoint executes exact bounded repetition count"
);


assert.equal(
    baseline.health.successful,
    API_PERFORMANCE_DEFAULTS
        .repetitions
);
pass(
    "all bounded health requests return successful status"
);


assert.equal(
    baseline.health.failed,
    0
);
pass(
    "bounded health baseline contains no failed request"
);


check(
    finiteNonNegative(
        baseline.health
            .minimumDurationMs
    ),
    "minimum health response duration is finite"
);


check(
    finiteNonNegative(
        baseline.health
            .maximumDurationMs
    ),
    "maximum health response duration is finite"
);


check(
    finiteNonNegative(
        baseline.health
            .meanDurationMs
    ),
    "mean health response duration is finite"
);


check(
    baseline.health
        .maximumResponseBytes <=
        baseline.config
            .maxResponseBytes,
    "every health payload remains within client response bound"
);


assert.equal(
    baseline.health
        .measurements
        .length,
    API_PERFORMANCE_DEFAULTS
        .repetitions
);
pass(
    "one measurement record exists for every health request"
);


for (
    const [
        index,
        measurement,
    ]
    of baseline.health
        .measurements
        .entries()
) {
    assert.equal(
        measurement.statusCode,
        200
    );

    pass(
        `health request ${index + 1} returns HTTP 200`
    );


    check(
        finiteNonNegative(
            measurement
                .durationMs
        ),
        `health request ${index + 1} latency is finite`
    );


    check(
        measurement
            .responseBytes <=
            baseline.config
                .maxResponseBytes,
        `health request ${index + 1} payload is bounded`
    );
}


/*
|--------------------------------------------------------------------------
| L. Phase 13 live header preservation
|--------------------------------------------------------------------------
*/

section(
    "L. Phase 13 security-header preservation"
);


const representativeHealth =
    baseline.health
        .measurements[
            0
        ];


for (
    const headerName
    of API_SECURITY_HEADER_NAMES
) {
    check(
        typeof representativeHealth
            .securityHeaders[
                headerName
            ] ===
            "string" &&
        representativeHealth
            .securityHeaders[
                headerName
            ].length >
            0,
        `${headerName} remains present on live API response`
    );
}


/*
|--------------------------------------------------------------------------
| M. Controlled 404 behavior
|--------------------------------------------------------------------------
*/

section(
    "M. Controlled not-found response"
);


assert.equal(
    baseline.notFound
        .statusCode,
    404
);
pass(
    "unknown API route returns controlled HTTP 404"
);


assert.equal(
    baseline.notFound
        .ok,
    false
);
pass(
    "unknown API route is not represented as successful"
);


check(
    baseline.notFound
        .responseBytes <=
        baseline.config
            .maxResponseBytes,
    "404 payload remains bounded"
);


check(
    finiteNonNegative(
        baseline.notFound
            .durationMs
    ),
    "404 response duration is finite"
);


for (
    const headerName
    of API_SECURITY_HEADER_NAMES
) {
    check(
        typeof baseline.notFound
            .securityHeaders[
                headerName
            ] ===
            "string" &&
        baseline.notFound
            .securityHeaders[
                headerName
            ].length >
            0,
        `${headerName} remains present on controlled 404`
    );
}


/*
|--------------------------------------------------------------------------
| N. Sensitive runtime leakage check
|--------------------------------------------------------------------------
*/

section(
    "N. Live error-response leakage check"
);


const lowerNotFoundBody =
    baseline.notFound
        .bodyText
        .toLowerCase();


const forbiddenLeakPatterns =
    [
        "mongodb+srv://",
        "jwt_secret",
        "qr_token_secret",
        "password=",
        "private key",
        "node_modules/",
        "at file:///",
        "c:\\users\\",
        "/users/owner/",
    ];


for (
    const pattern
    of forbiddenLeakPatterns
) {
    assert.equal(
        lowerNotFoundBody
            .includes(
                pattern
                    .toLowerCase()
            ),
        false
    );

    pass(
        `404 response does not expose ${pattern}`
    );
}


/*
|--------------------------------------------------------------------------
| O. Final safety boundary
|--------------------------------------------------------------------------
*/

section(
    "O. Final Phase 14.10 safety confirmation"
);


const finalFalse =
    [
        [
            "performsDatabaseMutation",
            "no database mutation occurs",
        ],
        [
            "performsVrmRequest",
            "no VRM request occurs",
        ],
        [
            "startsScheduler",
            "validator does not start scheduler",
        ],
        [
            "invokesWriteEndpoint",
            "validator invokes no write endpoint",
        ],
        [
            "executesForecasting",
            "validator does not execute Forecasting",
        ],
        [
            "executesOptimization",
            "validator does not execute Optimization/DSS",
        ],
        [
            "performsEquipmentControl",
            "equipment control remains absent",
        ],
        [
            "performsAutoDispatch",
            "automatic dispatch remains disabled",
        ],
        [
            "arbitraryLatencySlaDefined",
            "no arbitrary latency SLA is introduced",
        ],
    ];


for (
    const [
        key,
        message,
    ]
    of finalFalse
) {
    assert.equal(
        baseline.boundaries[
            key
        ],
        false
    );

    pass(
        message
    );
}


/*
|--------------------------------------------------------------------------
| P. Result
|--------------------------------------------------------------------------
*/

section(
    "P. API sustained-performance result"
);


console.log(`
Base URL                     : ${baseline.config.baseUrl}
Health path                  : ${API_PERFORMANCE_DEFAULTS.healthPath}
Requests measured            : ${baseline.health.repetitions}
Successful requests          : ${baseline.health.successful}
Failed requests              : ${baseline.health.failed}

Minimum health latency       : ${baseline.health.minimumDurationMs.toFixed(3)} ms
Maximum health latency       : ${baseline.health.maximumDurationMs.toFixed(3)} ms
Mean health latency          : ${baseline.health.meanDurationMs.toFixed(3)} ms

Minimum health payload       : ${baseline.health.minimumResponseBytes} bytes
Maximum health payload       : ${baseline.health.maximumResponseBytes} bytes
Client payload bound         : ${baseline.config.maxResponseBytes} bytes
Client timeout               : ${baseline.config.timeoutMs} ms

Forecast default page        : 1
Forecast default limit       : 50
Forecast maximum limit       : 200
Extreme requested limit      : CAPPED TO 200
Invalid pagination           : FALLS BACK TO BOUNDED DEFAULTS

Security headers             : PRESERVED
Controlled 404               : VERIFIED
Sensitive 404 leakage        : NOT DETECTED

Arbitrary latency SLA        : NONE
Destructive load test        : NO
Database mutation            : NONE
VRM request                  : NONE
Write endpoint invocation    : NONE
Scheduler started by test    : NO
Equipment control            : NONE
Auto-dispatch                : DISABLED
`);


console.log(
    "----------------------------------------------------------------------------"
);

console.log(
    `Assertions passed: ${checks}`
);

console.log(
    "ASHMAAN PHASE 14.10 API SUSTAINED PERFORMANCE / PAYLOAD BOUNDS VALIDATION PASSED"
);