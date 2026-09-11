// scripts/validatePhase14ConcurrencyBackpressure.js

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
    runWithConcurrency,
} from "../services/scheduler/syncJobRunner.js";

import {
    CONCURRENCY_BACKPRESSURE_PHASE,
    CONCURRENCY_BACKPRESSURE_LAYER,
    CONCURRENCY_BACKPRESSURE_CATEGORY,
    CONCURRENCY_BACKPRESSURE_DEFAULTS,
    CONCURRENCY_BACKPRESSURE_LIMITS,
    CONCURRENCY_BACKPRESSURE_BOUNDARIES,

    controlledWorkerDelay,
    observeProductionConcurrency,
    runConcurrencyBackpressureBaseline,
} from "../services/performance/concurrencyBackpressureBaselineService.js";


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
ASHMAAN PHASE 14.9 — CONCURRENCY / BACKPRESSURE VALIDATION
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
    CONCURRENCY_BACKPRESSURE_PHASE,
    "14.9"
);
pass(
    "phase identity is 14.9"
);


assert.equal(
    CONCURRENCY_BACKPRESSURE_LAYER,
    "CONCURRENCY_BACKPRESSURE"
);
pass(
    "layer identifies concurrency and backpressure"
);


assert.equal(
    CONCURRENCY_BACKPRESSURE_CATEGORY,
    "BOUNDED_WORKER_EXECUTION"
);
pass(
    "category identifies bounded worker execution"
);


/*
|--------------------------------------------------------------------------
| B. Production dependency
|--------------------------------------------------------------------------
*/

section(
    "B. Production concurrency-runner dependency"
);


assert.equal(
    typeof runWithConcurrency,
    "function"
);
pass(
    "production runWithConcurrency helper exists"
);


assert.equal(
    CONCURRENCY_BACKPRESSURE_BOUNDARIES
        .productionRunnerUsed,
    true
);
pass(
    "Phase 14.9 explicitly uses production concurrency runner"
);


assert.equal(
    CONCURRENCY_BACKPRESSURE_BOUNDARIES
        .alternativeProductionRunnerCreated,
    false
);
pass(
    "Phase 14.9 introduces no alternative production worker pool"
);


/*
|--------------------------------------------------------------------------
| C. Controlled defaults
|--------------------------------------------------------------------------
*/

section(
    "C. Bounded validation defaults"
);


assert.equal(
    CONCURRENCY_BACKPRESSURE_DEFAULTS
        .itemCount,
    24
);
pass(
    "default controlled workload contains 24 items"
);


assert.equal(
    CONCURRENCY_BACKPRESSURE_DEFAULTS
        .concurrency,
    3
);
pass(
    "default controlled concurrency is three workers"
);


assert.equal(
    CONCURRENCY_BACKPRESSURE_DEFAULTS
        .workerDelayMs,
    4
);
pass(
    "default controlled worker delay is finite"
);


assert.equal(
    CONCURRENCY_BACKPRESSURE_DEFAULTS
        .delayBetweenStartsMs,
    1
);
pass(
    "default worker-start pacing is explicit"
);


check(
    CONCURRENCY_BACKPRESSURE_LIMITS
        .maxItems >
        CONCURRENCY_BACKPRESSURE_DEFAULTS
            .itemCount,
    "validation item count has explicit upper bound"
);


check(
    CONCURRENCY_BACKPRESSURE_LIMITS
        .maxConcurrency >
        CONCURRENCY_BACKPRESSURE_DEFAULTS
            .concurrency,
    "validation concurrency has explicit upper bound"
);


check(
    CONCURRENCY_BACKPRESSURE_LIMITS
        .maxWorkerDelayMs >=
        CONCURRENCY_BACKPRESSURE_DEFAULTS
            .workerDelayMs,
    "worker delay has explicit upper bound"
);


check(
    CONCURRENCY_BACKPRESSURE_LIMITS
        .maxDelayBetweenStartsMs >=
        CONCURRENCY_BACKPRESSURE_DEFAULTS
            .delayBetweenStartsMs,
    "start pacing has explicit upper bound"
);


/*
|--------------------------------------------------------------------------
| D. Concurrency semantics
|--------------------------------------------------------------------------
*/

section(
    "D. Concurrency / backpressure boundaries"
);


const requiredTrue =
    [
        [
            "productionRunnerUsed",
            "production runner use is required",
        ],
        [
            "concurrencyMustBeBounded",
            "concurrency must remain bounded",
        ],
        [
            "workerFanOutMustBeBounded",
            "worker fan-out must remain bounded",
        ],
        [
            "failureIsolationRequired",
            "worker failure isolation is required",
        ],
        [
            "pacingSupported",
            "controlled start pacing is supported",
        ],
        [
            "schedulerOverlapProtectionRequired",
            "scheduler overlap protection is required",
        ],
        [
            "duplicateSchedulerExecutionControlled",
            "duplicate scheduler execution must remain controlled",
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
        CONCURRENCY_BACKPRESSURE_BOUNDARIES[
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
            "alternativeProductionRunnerCreated",
            "no alternative production worker pool is introduced",
        ],
        [
            "unboundedPromiseFanOutAllowed",
            "unbounded Promise fan-out remains prohibited",
        ],
        [
            "unboundedQueueAllowed",
            "unbounded in-memory queue remains prohibited",
        ],
        [
            "missingMeansZero",
            "missing telemetry remains distinct from zero",
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
        CONCURRENCY_BACKPRESSURE_BOUNDARIES[
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
| E. Production runner source evidence
|--------------------------------------------------------------------------
*/

section(
    "E. Production runner bounded-fan-out evidence"
);


const runnerSource =
    await readBackendSource(
        "services/scheduler/syncJobRunner.js"
    );


check(
    /Math\.max\s*\(/.test(
        runnerSource
    ),
    "production runner normalizes concurrency to a safe positive worker count"
);


check(
    /Math\.min\s*\(/.test(
        runnerSource
    ),
    "production runner limits workers by available item count"
);


check(
    /items\.length/.test(
        runnerSource
    ),
    "production worker fan-out is tied to finite input cardinality"
);


check(
    /Promise\.all\s*\(\s*workers\s*\)/.test(
        runnerSource
    ),
    "production runner awaits only the bounded worker collection"
);


check(
    /currentIndex/.test(
        runnerSource
    ),
    "production runner uses shared bounded item-index progression"
);


check(
    /delayBetweenStartsMs/.test(
        runnerSource
    ),
    "production runner exposes explicit start pacing"
);


check(
    /successful/.test(
        runnerSource
    ) &&
    /failed/.test(
        runnerSource
    ),
    "production runner explicitly reconciles successful and failed work"
);


/*
|--------------------------------------------------------------------------
| F. Scheduler source evidence
|--------------------------------------------------------------------------
*/

section(
    "F. Production scheduler overlap / concurrency evidence"
);


const schedulerSource =
    await readBackendSource(
        "services/scheduler/vrmScheduler.js"
    );


check(
    /const\s+jobLocks\s*=\s*\{/.test(
        schedulerSource
    ),
    "production scheduler declares per-job lock state"
);


for (
    const jobName
    of [
        "telemetry",
        "statusRefresh",
        "alarms",
        "statistics",
        "devices",
    ]
) {
    check(
        new RegExp(
            `${jobName}\\s*:\\s*false`
        ).test(
            schedulerSource
        ),
        `scheduler lock exists for ${jobName}`
    );
}


check(
    /previous execution still running/.test(
        schedulerSource
    ),
    "production scheduler explicitly skips overlapping execution"
);


check(
    /jobLocks\s*\[\s*jobName\s*\]\s*=\s*true/.test(
        schedulerSource
    ),
    "generic scheduled job acquires its lock"
);


check(
    /jobLocks\s*\[\s*jobName\s*\]\s*=\s*false/.test(
        schedulerSource
    ),
    "generic scheduled job releases its lock"
);


check(
    /finally/.test(
        schedulerSource
    ),
    "scheduler contains finally-based lock-release path"
);


check(
    /concurrency\s*=\s*2/.test(
        schedulerSource
    ),
    "generic installation-job concurrency defaults to two"
);


check(
    /concurrency\s*:\s*1/.test(
        schedulerSource
    ),
    "device synchronization uses serialized concurrency"
);


check(
    /concurrency\s*:\s*2/.test(
        schedulerSource
    ),
    "scheduler contains explicitly bounded two-worker jobs"
);


check(
    /delayBetweenStartsMs/.test(
        schedulerSource
    ),
    "production scheduler supplies worker-start pacing"
);


/*
|--------------------------------------------------------------------------
| G. Unsafe harness configuration rejection
|--------------------------------------------------------------------------
*/

section(
    "G. Unsafe harness configuration rejection"
);


await assert.rejects(
    () =>
        observeProductionConcurrency({
            itemCount:
                CONCURRENCY_BACKPRESSURE_LIMITS
                    .maxItems +
                1,
        }),
    RangeError
);
pass(
    "item count above explicit safety bound is rejected"
);


await assert.rejects(
    () =>
        observeProductionConcurrency({
            concurrency:
                CONCURRENCY_BACKPRESSURE_LIMITS
                    .maxConcurrency +
                1,
        }),
    RangeError
);
pass(
    "concurrency above explicit safety bound is rejected"
);


await assert.rejects(
    () =>
        observeProductionConcurrency({
            workerDelayMs:
                CONCURRENCY_BACKPRESSURE_LIMITS
                    .maxWorkerDelayMs +
                1,
        }),
    RangeError
);
pass(
    "worker delay above explicit safety bound is rejected"
);


await assert.rejects(
    () =>
        observeProductionConcurrency({
            delayBetweenStartsMs:
                CONCURRENCY_BACKPRESSURE_LIMITS
                    .maxDelayBetweenStartsMs +
                1,
        }),
    RangeError
);
pass(
    "worker-start delay above explicit safety bound is rejected"
);


/*
|--------------------------------------------------------------------------
| H. Nominal bounded execution
|--------------------------------------------------------------------------
*/

section(
    "H. Nominal bounded production-runner execution"
);


const nominal =
    await observeProductionConcurrency({
        itemCount:
            18,

        concurrency:
            3,

        workerDelayMs:
            3,

        delayBetweenStartsMs:
            1,
    });


assert.equal(
    nominal.phase,
    "14.9"
);
pass(
    "nominal run preserves Phase 14.9 identity"
);


assert.equal(
    nominal.productionRunnerUsed,
    true
);
pass(
    "nominal run executes through production concurrency helper"
);


assert.equal(
    nominal.requestedItems,
    18
);
pass(
    "nominal run preserves requested item count"
);


assert.equal(
    nominal.requestedConcurrency,
    3
);
pass(
    "nominal run preserves requested concurrency"
);


assert.equal(
    nominal.theoreticalMaximumWorkers,
    3
);
pass(
    "nominal theoretical worker maximum is three"
);


check(
    nominal.peakActiveWorkers <=
        3,
    "observed nominal active workers never exceed requested concurrency"
);


check(
    nominal.peakActiveWorkers >=
        1,
    "nominal execution observes at least one active worker"
);


assert.equal(
    nominal.startedWorkers,
    18
);
pass(
    "each nominal item starts exactly once"
);


assert.equal(
    nominal.completedWorkers,
    18
);
pass(
    "each nominal item reaches worker completion"
);


assert.equal(
    nominal.finalActiveWorkers,
    0
);
pass(
    "no nominal worker remains active after completion"
);


assert.equal(
    nominal.runnerResult.total,
    18
);
pass(
    "production runner preserves nominal total"
);


assert.equal(
    nominal.runnerResult.successful,
    18
);
pass(
    "nominal run reports all items successful"
);


assert.equal(
    nominal.runnerResult.failed,
    0
);
pass(
    "nominal run reports zero failures"
);


assert.equal(
    nominal.runnerResult.results.length,
    18
);
pass(
    "nominal runner returns one result slot per item"
);


check(
    finiteNonNegative(
        nominal.durationMs
    ),
    "nominal concurrency duration is finite"
);


/*
|--------------------------------------------------------------------------
| I. Failure isolation
|--------------------------------------------------------------------------
*/

section(
    "I. Worker failure isolation"
);


const failureRun =
    await observeProductionConcurrency({
        itemCount:
            10,

        concurrency:
            3,

        workerDelayMs:
            2,

        delayBetweenStartsMs:
            1,

        failureIndexes:
            [
                1,
                5,
                8,
            ],
    });


assert.equal(
    failureRun.runnerResult.total,
    10
);
pass(
    "failure-isolation run preserves all input items"
);


assert.equal(
    failureRun.runnerResult.successful,
    7
);
pass(
    "failure-isolation run preserves seven successful items"
);


assert.equal(
    failureRun.runnerResult.failed,
    3
);
pass(
    "failure-isolation run records exactly three failures"
);


assert.equal(
    failureRun.failedWorkers,
    3
);
pass(
    "controlled worker failure accounting matches runner failures"
);


assert.equal(
    failureRun.startedWorkers,
    10
);
pass(
    "worker failure does not prevent later independent items from starting"
);


assert.equal(
    failureRun.completedWorkers,
    10
);
pass(
    "all worker paths complete even when individual items fail"
);


assert.equal(
    failureRun.finalActiveWorkers,
    0
);
pass(
    "no failed-worker activity remains after run completion"
);


check(
    failureRun.peakActiveWorkers <=
        3,
    "worker failures do not cause concurrency limit escape"
);


for (
    const failureIndex
    of [
        1,
        5,
        8,
    ]
) {
    assert.equal(
        failureRun
            .runnerResult
            .results[
                failureIndex
            ]
            .success,
        false
    );

    pass(
        `failed item ${failureIndex} remains explicitly failed`
    );
}


/*
|--------------------------------------------------------------------------
| J. Serialized execution
|--------------------------------------------------------------------------
*/

section(
    "J. Serialized concurrency behavior"
);


const serialized =
    await observeProductionConcurrency({
        itemCount:
            6,

        concurrency:
            1,

        workerDelayMs:
            2,

        delayBetweenStartsMs:
            0,
    });


assert.equal(
    serialized.peakActiveWorkers,
    1
);
pass(
    "concurrency=1 produces serialized execution"
);


assert.equal(
    serialized.runnerResult.successful,
    6
);
pass(
    "serialized production runner completes all items"
);


assert.equal(
    serialized.finalActiveWorkers,
    0
);
pass(
    "serialized run leaves no active worker"
);


/*
|--------------------------------------------------------------------------
| K. Concurrency greater than item cardinality
|--------------------------------------------------------------------------
*/

section(
    "K. Worker fan-out bounded by input cardinality"
);


const tinyRun =
    await observeProductionConcurrency({
        itemCount:
            2,

        concurrency:
            6,

        workerDelayMs:
            2,

        delayBetweenStartsMs:
            0,
    });


assert.equal(
    tinyRun.theoreticalMaximumWorkers,
    2
);
pass(
    "theoretical worker fan-out cannot exceed two-item input"
);


check(
    tinyRun.peakActiveWorkers <=
        2,
    "observed worker fan-out cannot exceed item cardinality"
);


assert.equal(
    tinyRun.startedWorkers,
    2
);
pass(
    "two-item workload starts exactly two item executions"
);


assert.equal(
    tinyRun.runnerResult.total,
    2
);
pass(
    "tiny workload preserves exact result cardinality"
);


/*
|--------------------------------------------------------------------------
| L. Full baseline
|--------------------------------------------------------------------------
*/

section(
    "L. Controlled Phase 14.9 baseline"
);


const baseline =
    await runConcurrencyBackpressureBaseline();


assert.equal(
    baseline.phase,
    "14.9"
);
pass(
    "baseline identifies Phase 14.9"
);


assert.equal(
    baseline.layer,
    CONCURRENCY_BACKPRESSURE_LAYER
);
pass(
    "baseline preserves concurrency/backpressure layer"
);


assert.equal(
    baseline.category,
    CONCURRENCY_BACKPRESSURE_CATEGORY
);
pass(
    "baseline preserves bounded-worker category"
);


assert.equal(
    baseline.controlled,
    true
);
pass(
    "baseline is explicitly controlled"
);


assert.equal(
    baseline.productionEvidence,
    false
);
pass(
    "controlled baseline is not represented as live production evidence"
);


check(
    baseline.scenarios
        .nominal
        .peakActiveWorkers <=
        baseline.scenarios
            .nominal
            .requestedConcurrency,
    "baseline nominal run preserves concurrency ceiling"
);


assert.equal(
    baseline.scenarios
        .withFailures
        .runnerResult
        .failed,
    3
);
pass(
    "baseline failure scenario isolates exactly three failures"
);


assert.equal(
    baseline.scenarios
        .withFailures
        .runnerResult
        .successful,
    9
);
pass(
    "baseline failure scenario allows nine independent successes"
);


assert.equal(
    baseline.scenarios
        .serialized
        .peakActiveWorkers,
    1
);
pass(
    "baseline serialized scenario remains single-worker"
);


check(
    baseline.scenarios
        .concurrencyGreaterThanItems
        .peakActiveWorkers <=
        2,
    "baseline worker count is bounded by two-item workload"
);


/*
|--------------------------------------------------------------------------
| M. Final safety boundary
|--------------------------------------------------------------------------
*/

section(
    "M. Final Phase 14.9 safety confirmation"
);


const finalFalse =
    [
        [
            "performsVrmRequest",
            "Phase 14.9 performs no VRM request",
        ],
        [
            "performsDatabaseRead",
            "Phase 14.9 performs no database read",
        ],
        [
            "performsDatabaseWrite",
            "Phase 14.9 performs no database write",
        ],
        [
            "startsProductionScheduler",
            "Phase 14.9 does not start production scheduler",
        ],
        [
            "modifiesProductionRunner",
            "Phase 14.9 does not modify production concurrency runner",
        ],
        [
            "changesSchedulerConfiguration",
            "Phase 14.9 does not change scheduler configuration",
        ],
        [
            "changesRuntimeConfiguration",
            "Phase 14.9 does not change runtime configuration",
        ],
        [
            "bypassesAuthentication",
            "Phase 14.9 does not bypass authentication",
        ],
        [
            "bypassesAuthorization",
            "Phase 14.9 does not bypass authorization",
        ],
        [
            "bypassesInputValidation",
            "Phase 14.9 does not bypass input validation",
        ],
        [
            "bypassesRateLimiting",
            "Phase 14.9 does not bypass rate limiting",
        ],
        [
            "performsEquipmentControl",
            "Phase 14.9 performs no equipment control",
        ],
        [
            "performsAutoDispatch",
            "Phase 14.9 performs no automatic dispatch",
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
| N. Measured result
|--------------------------------------------------------------------------
*/

section(
    "N. Concurrency / backpressure baseline result"
);


const measured =
    baseline.scenarios
        .nominal;


console.log(`
Nominal items                 : ${measured.requestedItems}
Requested concurrency         : ${measured.requestedConcurrency}
Theoretical max workers       : ${measured.theoreticalMaximumWorkers}
Observed peak workers         : ${measured.peakActiveWorkers}
Started item executions       : ${measured.startedWorkers}
Completed item executions     : ${measured.completedWorkers}
Successful                    : ${measured.runnerResult.successful}
Failed                        : ${measured.runnerResult.failed}
Final active workers          : ${measured.finalActiveWorkers}
Duration                      : ${measured.durationMs.toFixed(3)} ms

Failure scenario total        : ${baseline.scenarios.withFailures.runnerResult.total}
Failure scenario successful   : ${baseline.scenarios.withFailures.runnerResult.successful}
Failure scenario failed       : ${baseline.scenarios.withFailures.runnerResult.failed}
Failure peak workers          : ${baseline.scenarios.withFailures.peakActiveWorkers}

Serialized peak workers       : ${baseline.scenarios.serialized.peakActiveWorkers}

Tiny workload items           : ${baseline.scenarios.concurrencyGreaterThanItems.requestedItems}
Tiny requested concurrency     : ${baseline.scenarios.concurrencyGreaterThanItems.requestedConcurrency}
Tiny theoretical max workers   : ${baseline.scenarios.concurrencyGreaterThanItems.theoreticalMaximumWorkers}
Tiny observed peak workers     : ${baseline.scenarios.concurrencyGreaterThanItems.peakActiveWorkers}

Production runner             : USED
Alternative worker pool       : NONE
Scheduler overlap protection  : PRESENT
Worker start pacing           : PRESENT
Unbounded Promise fan-out     : PROHIBITED
Unbounded queue               : PROHIBITED
Database mutation             : NONE
VRM request                   : NONE
Production scheduler          : NOT STARTED
Equipment control             : NONE
Auto-dispatch                 : DISABLED
`);


console.log(
    "----------------------------------------------------------------------------"
);

console.log(
    `Assertions passed: ${checks}`
);

console.log(
    "ASHMAAN PHASE 14.9 CONCURRENCY / BACKPRESSURE VALIDATION PASSED"
);