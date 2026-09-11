// scripts/validatePhase14SchedulerResilience.js

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
    SCHEDULER_RESILIENCE_PHASE,
    SCHEDULER_RESILIENCE_LAYER,
    SCHEDULER_RESILIENCE_CATEGORY,
    SCHEDULER_RESILIENCE_LIMITS,
    SCHEDULER_RESILIENCE_BOUNDARIES,

    createControlledSchedulerLockHarness,
    createControlledSchedulerHandleRegistry,
    runSchedulerResilienceBaseline,
} from "../services/performance/schedulerResilienceBaselineService.js";


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


async function readSource(
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
ASHMAAN PHASE 14.11 — PRODUCTION SCHEDULER RESILIENCE VALIDATION
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
    SCHEDULER_RESILIENCE_PHASE,
    "14.11"
);
pass(
    "phase identity is 14.11"
);


assert.equal(
    SCHEDULER_RESILIENCE_LAYER,
    "SCHEDULER_RESILIENCE"
);
pass(
    "layer identifies scheduler resilience"
);


assert.equal(
    SCHEDULER_RESILIENCE_CATEGORY,
    "OVERLAP_FAILURE_LIFECYCLE_CONTROL"
);
pass(
    "category identifies overlap, failure and lifecycle control"
);


/*
|--------------------------------------------------------------------------
| B. Contract boundaries
|--------------------------------------------------------------------------
*/

section(
    "B. Scheduler resilience boundaries"
);


const trueBoundaries =
    [
        [
            "productionSchedulerInspected",
            "production scheduler evidence is required",
        ],
        [
            "overlapProtectionRequired",
            "same-job overlap protection is required",
        ],
        [
            "lockReleaseRequired",
            "scheduler lock release is required",
        ],
        [
            "boundedConcurrencyRequired",
            "scheduler concurrency must remain bounded",
        ],
        [
            "workerStartPacingRequired",
            "worker-start pacing remains required",
        ],
        [
            "failureIsolationRequired",
            "worker/job failure isolation remains required",
        ],
        [
            "longRunningJobObservabilityRequired",
            "long-running job observability remains required",
        ],
        [
            "controlledShutdownRequired",
            "controlled scheduler shutdown is required",
        ],
        [
            "scheduledHandleCleanupRequired",
            "scheduled handles must be cleaned up",
        ],
        [
            "controlledRestartRequired",
            "controlled scheduler restart is required",
        ],
    ];


for (
    const [
        key,
        message,
    ]
    of trueBoundaries
) {
    assert.equal(
        SCHEDULER_RESILIENCE_BOUNDARIES[
            key
        ],
        true
    );

    pass(
        message
    );
}


const falseBoundaries =
    [
        [
            "productionSchedulerStarted",
            "validator does not start production scheduler",
        ],
        [
            "alternativeProductionSchedulerCreated",
            "no alternative production scheduler is introduced",
        ],
        [
            "unboundedDuplicateWorkAllowed",
            "unbounded duplicate scheduler work remains prohibited",
        ],
        [
            "performsDatabaseRead",
            "validator performs no database read",
        ],
        [
            "performsDatabaseWrite",
            "validator performs no database write",
        ],
        [
            "performsVrmRequest",
            "validator performs no VRM request",
        ],
        [
            "changesSchedulerConfiguration",
            "validator does not change scheduler configuration",
        ],
        [
            "performsEquipmentControl",
            "validator performs no equipment control",
        ],
        [
            "performsAutoDispatch",
            "validator performs no automatic dispatch",
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
    of falseBoundaries
) {
    assert.equal(
        SCHEDULER_RESILIENCE_BOUNDARIES[
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
| C. Production scheduler source
|--------------------------------------------------------------------------
*/

section(
    "C. Production scheduler source evidence"
);


const schedulerSource =
    await readSource(
        "services/scheduler/vrmScheduler.js"
    );


const runnerSource =
    await readSource(
        "services/scheduler/syncJobRunner.js"
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
        `production lock exists for ${jobName}`
    );
}


check(
    /previous execution still running/.test(
        schedulerSource
    ),
    "scheduler explicitly skips overlapping execution"
);


check(
    /jobLocks\s*\[\s*jobName\s*\]\s*=\s*true/.test(
        schedulerSource
    ),
    "generic scheduler job acquires lock"
);


check(
    /jobLocks\s*\[\s*jobName\s*\]\s*=\s*false/.test(
        schedulerSource
    ),
    "generic scheduler job releases lock"
);


check(
    /finally\s*\{/.test(
        schedulerSource
    ),
    "scheduler uses finally-based lock release"
);


check(
    /jobLocks\.statusRefresh\s*=\s*true/.test(
        schedulerSource
    ),
    "status-refresh job acquires dedicated lock"
);


check(
    /jobLocks\.statusRefresh\s*=\s*false/.test(
        schedulerSource
    ),
    "status-refresh job releases dedicated lock"
);


/*
|--------------------------------------------------------------------------
| D. Production schedule frequencies
|--------------------------------------------------------------------------
*/

section(
    "D. Production scheduler cadence"
);


check(
    /10\s*\*\s*60\s*\*\s*1000/.test(
        schedulerSource
    ),
    "telemetry cadence remains ten minutes"
);


check(
    /5\s*\*\s*60\s*\*\s*1000/.test(
        schedulerSource
    ),
    "status-refresh cadence remains five minutes"
);


check(
    /30\s*\*\s*60\s*\*\s*1000/.test(
        schedulerSource
    ),
    "thirty-minute scheduler cadence remains explicit"
);


check(
    /6\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(
        schedulerSource
    ),
    "device cadence remains six hours"
);


/*
|--------------------------------------------------------------------------
| E. Production bounded concurrency and pacing
|--------------------------------------------------------------------------
*/

section(
    "E. Production scheduler concurrency / pacing"
);


check(
    /concurrency\s*=\s*2/.test(
        schedulerSource
    ),
    "generic installation scheduler defaults to two workers"
);


check(
    /concurrency\s*:\s*1/.test(
        schedulerSource
    ),
    "device synchronization remains serialized"
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
    "scheduler supplies explicit worker-start pacing"
);


check(
    /Math\.max\s*\(/.test(
        runnerSource
    ),
    "production runner normalizes worker concurrency"
);


check(
    /Math\.min\s*\([\s\S]*?safeConcurrency[\s\S]*?items\.length/.test(
        runnerSource
    ),
    "production worker fan-out is bounded by item cardinality"
);


check(
    /Promise\.all\s*\(\s*workers\s*\)/.test(
        runnerSource
    ),
    "production runner awaits only bounded worker collection"
);


/*
|--------------------------------------------------------------------------
| F. Production failure isolation / observability
|--------------------------------------------------------------------------
*/

section(
    "F. Production failure isolation and observability"
);


check(
    /successful/.test(
        runnerSource
    ) &&
    /failed/.test(
        runnerSource
    ),
    "production runner reconciles successful and failed items"
);


check(
    /catch\s*\(\s*error\s*\)/.test(
        runnerSource
    ),
    "production runner isolates worker errors"
);


check(
    /Duration:/.test(
        schedulerSource
    ),
    "scheduler reports job duration"
);


check(
    /Successful:/.test(
        schedulerSource
    ) &&
    /Failed:/.test(
        schedulerSource
    ),
    "scheduler reports success and failure counts"
);


/*
|--------------------------------------------------------------------------
| G. Production lifecycle source
|--------------------------------------------------------------------------
*/

section(
    "G. Production scheduler lifecycle"
);


check(
    /const\s+schedulerHandles\s*=\s*\[\s*\]/.test(
        schedulerSource
    ),
    "scheduler tracks scheduled handles"
);


check(
    /setTimeout\s*\(/.test(
        schedulerSource
    ),
    "scheduler uses tracked staggered initial execution"
);


check(
    /setInterval\s*\(/.test(
        schedulerSource
    ),
    "scheduler uses recurring interval handles"
);


check(
    /clearTimeout\s*\(/.test(
        schedulerSource
    ),
    "scheduler stop clears initial timeout handles"
);


check(
    /clearInterval\s*\(/.test(
        schedulerSource
    ),
    "scheduler stop clears recurring interval handles"
);


check(
    /schedulerHandles\.length\s*=\s*0/.test(
        schedulerSource
    ),
    "scheduler handle registry is emptied during stop"
);


check(
    /startVrmScheduler/.test(
        schedulerSource
    ) &&
    /stopVrmScheduler/.test(
        schedulerSource
    ),
    "scheduler exports explicit start and stop lifecycle operations"
);


/*
|--------------------------------------------------------------------------
| H. Server shutdown integration
|--------------------------------------------------------------------------
*/

section(
    "H. Server / scheduler shutdown integration"
);


const serverSource =
    await readSource(
        "server.js"
    );


check(
    /startVrmScheduler\s*\(\s*\)/.test(
        serverSource
    ),
    "server starts production scheduler after server startup"
);


check(
    /stopVrmScheduler\s*\(\s*\)/.test(
        serverSource
    ),
    "server stops scheduler during shutdown path"
);


check(
    /SIGINT/.test(
        serverSource
    ),
    "server handles SIGINT"
);


check(
    /SIGTERM/.test(
        serverSource
    ),
    "server handles SIGTERM"
);


check(
    /server\.close\s*\(/.test(
        serverSource
    ),
    "server stops accepting HTTP work during shutdown"
);


/*
|--------------------------------------------------------------------------
| I. Unsafe harness input
|--------------------------------------------------------------------------
*/

section(
    "I. Controlled harness safety"
);


await assert.rejects(
    () =>
        runSchedulerResilienceBaseline({
            workerDelayMs:
                SCHEDULER_RESILIENCE_LIMITS
                    .maxWorkerDelayMs +
                1,
        }),
    RangeError
);
pass(
    "worker delay above explicit harness safety bound is rejected"
);


/*
|--------------------------------------------------------------------------
| J. Same-job overlap
|--------------------------------------------------------------------------
*/

section(
    "J. Controlled same-job overlap behavior"
);


const baseline =
    await runSchedulerResilienceBaseline();


assert.equal(
    baseline.phase,
    "14.11"
);
pass(
    "controlled baseline identifies Phase 14.11"
);


assert.equal(
    baseline.controlled,
    true
);
pass(
    "scheduler resilience baseline is explicitly controlled"
);


assert.equal(
    baseline.productionSchedulerExecuted,
    false
);
pass(
    "production scheduler is not executed by validator"
);


assert.equal(
    baseline.overlap
        .firstRun
        .status,
    "COMPLETED"
);
pass(
    "primary controlled scheduler job completes"
);


assert.equal(
    baseline.overlap
        .overlappingRun
        .status,
    "SKIPPED_OVERLAP"
);
pass(
    "same-job overlap is explicitly skipped"
);


assert.equal(
    baseline.overlap
        .overlappingRun
        .executed,
    false
);
pass(
    "overlapping worker body is not executed"
);


assert.equal(
    baseline.overlap
        .primaryExecutions,
    1
);
pass(
    "same logical job executes exactly once during overlap"
);


check(
    baseline.overlap
        .firstRun
        .durationMs >=
        0,
    "controlled job duration is observable"
);


/*
|--------------------------------------------------------------------------
| K. Failure lock release / recovery
|--------------------------------------------------------------------------
*/

section(
    "K. Failure isolation and lock recovery"
);


assert.equal(
    baseline.failureRecovery
        .failedRun
        .status,
    "FAILED"
);
pass(
    "controlled scheduler failure remains explicit"
);


assert.equal(
    baseline.failureRecovery
        .recoveryRun
        .status,
    "COMPLETED"
);
pass(
    "same job can run again after controlled failure"
);


assert.equal(
    baseline.failureRecovery
        .finalLocked,
    false
);
pass(
    "scheduler lock is released after failure and recovery"
);


check(
    baseline.failureRecovery
        .events
        .some(
            (
                event
            ) =>
                event.type ===
                "LOCK_RELEASED"
        ),
    "failure path records explicit lock release"
);


/*
|--------------------------------------------------------------------------
| L. Independent-job isolation
|--------------------------------------------------------------------------
*/

section(
    "L. Independent scheduled-job isolation"
);


assert.equal(
    baseline.independentJobs
        .telemetry
        .status,
    "COMPLETED"
);
pass(
    "controlled telemetry job completes"
);


assert.equal(
    baseline.independentJobs
        .alarms
        .status,
    "COMPLETED"
);
pass(
    "controlled alarms job completes independently"
);


check(
    baseline.independentJobs
        .events
        .filter(
            (
                event
            ) =>
                event.type ===
                "STARTED"
        )
        .length ===
        2,
    "independent scheduler jobs can begin without sharing one global lock"
);


/*
|--------------------------------------------------------------------------
| M. Controlled lifecycle restart
|--------------------------------------------------------------------------
*/

section(
    "M. Controlled stop / restart lifecycle"
);


assert.equal(
    baseline.lifecycle
        .initialStart
        .started,
    true
);
pass(
    "controlled scheduler lifecycle starts once"
);


assert.equal(
    baseline.lifecycle
        .initialStart
        .handleCount,
    10
);
pass(
    "controlled lifecycle tracks finite scheduled handles"
);


assert.equal(
    baseline.lifecycle
        .duplicateStart
        .started,
    false
);
pass(
    "controlled duplicate start does not create duplicate handles"
);


assert.equal(
    baseline.lifecycle
        .duplicateStart
        .reason,
    "ALREADY_RUNNING"
);
pass(
    "duplicate controlled start is explicitly identified"
);


assert.equal(
    baseline.lifecycle
        .firstStop
        .cleared,
    10
);
pass(
    "controlled stop clears every tracked handle"
);


assert.equal(
    baseline.lifecycle
        .firstStop
        .remaining,
    0
);
pass(
    "no controlled scheduler handle remains after stop"
);


assert.equal(
    baseline.lifecycle
        .restart
        .started,
    true
);
pass(
    "controlled scheduler can restart after stop"
);


assert.equal(
    baseline.lifecycle
        .restart
        .handleCount,
    10
);
pass(
    "controlled restart recreates only finite expected handles"
);


assert.equal(
    baseline.lifecycle
        .finalStop
        .remaining,
    0
);
pass(
    "final controlled scheduler stop leaves zero handles"
);


assert.equal(
    baseline.lifecycle
        .finalSnapshot
        .running,
    false
);
pass(
    "controlled scheduler is not running after final stop"
);


assert.equal(
    baseline.lifecycle
        .finalSnapshot
        .handleCount,
    0
);
pass(
    "controlled scheduler final handle count is zero"
);


/*
|--------------------------------------------------------------------------
| N. Final safety boundary
|--------------------------------------------------------------------------
*/

section(
    "N. Final Phase 14.11 safety confirmation"
);


for (
    const [
        key,
        message,
    ]
    of [
        [
            "productionSchedulerStarted",
            "validator never starts production scheduler",
        ],
        [
            "alternativeProductionSchedulerCreated",
            "no parallel production scheduler is created",
        ],
        [
            "performsDatabaseRead",
            "validator performs no database read",
        ],
        [
            "performsDatabaseWrite",
            "validator performs no database write",
        ],
        [
            "performsVrmRequest",
            "validator performs no VRM request",
        ],
        [
            "changesSchedulerConfiguration",
            "production scheduler configuration remains unchanged",
        ],
        [
            "performsEquipmentControl",
            "equipment control remains absent",
        ],
        [
            "performsAutoDispatch",
            "automatic dispatch remains disabled",
        ],
    ]
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
| O. Result
|--------------------------------------------------------------------------
*/

section(
    "O. Scheduler resilience result"
);


console.log(`
Same-job primary execution     : ${baseline.overlap.firstRun.status}
Overlapping execution          : ${baseline.overlap.overlappingRun.status}
Primary worker executions      : ${baseline.overlap.primaryExecutions}

Failure scenario               : ${baseline.failureRecovery.failedRun.status}
Recovery after failure         : ${baseline.failureRecovery.recoveryRun.status}
Final failed-job lock          : ${baseline.failureRecovery.finalLocked}

Independent telemetry job      : ${baseline.independentJobs.telemetry.status}
Independent alarms job         : ${baseline.independentJobs.alarms.status}

Initial controlled handles     : ${baseline.lifecycle.initialStart.handleCount}
Duplicate controlled start     : ${baseline.lifecycle.duplicateStart.reason}
Handles cleared on stop        : ${baseline.lifecycle.firstStop.cleared}
Handles remaining after stop   : ${baseline.lifecycle.firstStop.remaining}
Restart handle count           : ${baseline.lifecycle.restart.handleCount}
Final handle count             : ${baseline.lifecycle.finalSnapshot.handleCount}

Production overlap locks       : PRESENT
Production lock release        : FINALLY-BASED
Production worker concurrency  : BOUNDED
Production start pacing        : PRESENT
Production duration logging    : PRESENT
Production stop lifecycle      : PRESENT
SIGINT handling                : PRESENT
SIGTERM handling               : PRESENT

Production scheduler executed  : NO
Database read by validator     : NONE
Database write by validator    : NONE
VRM request by validator       : NONE
Scheduler config mutation      : NONE
Equipment control              : NONE
Auto-dispatch                  : DISABLED
`);


console.log(
    "----------------------------------------------------------------------------"
);

console.log(
    `Assertions passed: ${checks}`
);

console.log(
    "ASHMAAN PHASE 14.11 PRODUCTION SCHEDULER RESILIENCE VALIDATION PASSED"
);