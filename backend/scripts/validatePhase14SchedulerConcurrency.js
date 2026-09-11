// ============================================================================
// ASHMAAN PHASE 14.5
// Scheduler Concurrency / Overlap Protection Validation
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";

import schedulerConcurrencyContract, {
    measureProductionConcurrencyRunner,
    measureSameJobOverlap,
    measureLockReleaseAfterFailure,
    measureIndependentJobLocks,
} from "../services/performance/schedulerConcurrencyBaselineService.js";


let assertionsPassed =
    0;


function check(
    condition,
    message
) {
    assert.ok(
        condition,
        message
    );

    assertionsPassed +=
        1;

    console.log(
        `PASS ${assertionsPassed}: ${message}`
    );
}


function section(
    title
) {
    console.log("");
    console.log(
        `--- ${title} ---`
    );
}


console.log("");
console.log(
    "=".repeat(
        76
    )
);

console.log(
    "ASHMAAN PHASE 14.5 — SCHEDULER CONCURRENCY / OVERLAP VALIDATION"
);

console.log(
    "=".repeat(
        76
    )
);


try {

    // ========================================================================
    // A. Identity
    // ========================================================================

    section(
        "A. Phase identity and contract"
    );


    check(
        schedulerConcurrencyContract
            .phase ===
            "14.5",
        "phase identity is 14.5"
    );


    check(
        schedulerConcurrencyContract
            .layer ===
            "SCHEDULER_CONCURRENCY_RESILIENCE",
        "layer identifies scheduler concurrency resilience"
    );


    check(
        schedulerConcurrencyContract
            .category ===
            "SCHEDULER_OVERLAP_BASELINE",
        "category identifies scheduler overlap baseline"
    );


    check(
        schedulerConcurrencyContract
            .mode ===
            "CONTROLLED_IN_MEMORY_VALIDATION",
        "checkpoint uses controlled in-memory validation"
    );


    check(
        Object.isFrozen(
            schedulerConcurrencyContract
        ),
        "Phase 14.5 contract is frozen"
    );


    // ========================================================================
    // B. Production source evidence
    // ========================================================================

    section(
        "B. Production scheduler source evidence"
    );


    const schedulerPath =
        new URL(
            "../services/scheduler/vrmScheduler.js",
            import.meta.url
        );


    const runnerPath =
        new URL(
            "../services/scheduler/syncJobRunner.js",
            import.meta.url
        );


    check(
        fs.existsSync(
            schedulerPath
        ),
        "production VRM scheduler exists"
    );


    check(
        fs.existsSync(
            runnerPath
        ),
        "production scheduler concurrency runner exists"
    );


    const schedulerSource =
        fs.readFileSync(
            schedulerPath,
            "utf8"
        );


    const runnerSource =
        fs.readFileSync(
            runnerPath,
            "utf8"
        );


    check(
        /const\s+jobLocks\s*=\s*\{/.test(
            schedulerSource
        ),
        "production scheduler defines jobLocks"
    );


    for (
        const jobName
        of schedulerConcurrencyContract
            .expectedProductionLocks
    ) {
        check(
            new RegExp(
                `${jobName}\\s*:\\s*false`
            ).test(
                schedulerSource
            ),
            `production scheduler defines ${jobName} overlap lock`
        );
    }


    check(
        /jobLocks\s*\[\s*jobName\s*\]/.test(
            schedulerSource
        ),
        "generic installation scheduler checks per-job lock"
    );


    check(
        /previous execution still running/.test(
            schedulerSource
        ),
        "production scheduler exposes explicit overlap-skip behavior"
    );


    check(
        /jobLocks\s*\[\s*jobName\s*\]\s*=\s*true/.test(
            schedulerSource
        ),
        "production scheduler acquires generic job lock before execution"
    );


    check(
        /finally\s*\{[\s\S]*?jobLocks\s*\[\s*jobName\s*\]\s*=\s*false/.test(
            schedulerSource
        ),
        "production scheduler releases generic job lock in finally"
    );


    check(
        /jobLocks\.statusRefresh/.test(
            schedulerSource
        ),
        "status-refresh job has explicit overlap lock check"
    );


    check(
        /jobLocks\.statusRefresh\s*=\s*true/.test(
            schedulerSource
        ),
        "status-refresh job acquires its lock"
    );


    check(
        /finally\s*\{[\s\S]*?jobLocks\.statusRefresh\s*=\s*false/.test(
            schedulerSource
        ),
        "status-refresh lock is released in finally"
    );


    check(
        /runWithConcurrency/.test(
            schedulerSource
        ),
        "production scheduler delegates installation batches to concurrency runner"
    );


    check(
        /Math\.min\s*\([\s\S]*?safeConcurrency[\s\S]*?items\.length/.test(
            runnerSource
        ),
        "production concurrency runner bounds worker count to available items"
    );


    check(
        /await\s+Promise\.all\s*\(\s*workers\s*\)/.test(
            runnerSource
        ),
        "production concurrency runner waits for bounded workers"
    );


    check(
        /success\s*:\s*false/.test(
            runnerSource
        ),
        "production concurrency runner records individual worker failures"
    );


    // ========================================================================
    // C. Scheduler intervals remain established
    // ========================================================================

    section(
        "C. Existing scheduler timing configuration"
    );


    check(
        /10\s*\*\s*60\s*\*\s*1000/.test(
            schedulerSource
        ),
        "telemetry interval remains ten minutes"
    );


    check(
        /5\s*\*\s*60\s*\*\s*1000/.test(
            schedulerSource
        ),
        "status-refresh interval remains five minutes"
    );


    check(
        /30\s*\*\s*60\s*\*\s*1000/.test(
            schedulerSource
        ),
        "thirty-minute scheduled jobs remain configured"
    );


    check(
        /6\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(
            schedulerSource
        ),
        "device interval remains six hours"
    );


    // ========================================================================
    // D. Safety boundary
    // ========================================================================

    section(
        "D. Phase 14.5 execution boundary"
    );


    const boundaries =
        schedulerConcurrencyContract
            .boundaries;


    for (
        const [
            key,
            value,
        ]
        of Object.entries(
            boundaries
        )
    ) {
        check(
            value ===
            false,
            `${key} remains disabled`
        );
    }


    // ========================================================================
    // E. Controlled production concurrency runner
    // ========================================================================

    section(
        "E. Production runWithConcurrency bounded execution"
    );


    const concurrencyBaseline =
        await measureProductionConcurrencyRunner({
            itemCount:
                12,

            concurrency:
                3,

            delayBetweenStartsMs:
                0,

            workerDelayMs:
                20,
        });


    check(
        concurrencyBaseline
            .input
            .itemCount ===
            12,
        "controlled concurrency baseline contains twelve items"
    );


    check(
        concurrencyBaseline
            .input
            .concurrency ===
            3,
        "controlled concurrency limit is three"
    );


    check(
        concurrencyBaseline
            .execution
            .startedWorkers ===
            12,
        "every controlled item started exactly one worker execution"
    );


    check(
        concurrencyBaseline
            .execution
            .completedWorkers ===
            12,
        "all non-failing controlled workers completed"
    );


    check(
        concurrencyBaseline
            .execution
            .failedWorkers ===
            0,
        "baseline contains no unexpected worker failure"
    );


    check(
        concurrencyBaseline
            .execution
            .activeWorkersAtEnd ===
            0,
        "no worker remains active after completion"
    );


    check(
        concurrencyBaseline
            .execution
            .maximumActiveWorkers <=
            3,
        "actual simultaneous worker count never exceeds configured concurrency"
    );


    check(
        concurrencyBaseline
            .execution
            .bounded ===
            true,
        "production concurrency runner remained bounded"
    );


    check(
        concurrencyBaseline
            .productionResult
            .total ===
            12,
        "production runner reports twelve total items"
    );


    check(
        concurrencyBaseline
            .productionResult
            .successful ===
            12,
        "production runner reports twelve successful items"
    );


    check(
        concurrencyBaseline
            .productionResult
            .failed ===
            0,
        "production runner reports zero failed items"
    );


    check(
        Number.isFinite(
            concurrencyBaseline
                .execution
                .durationMs
        ) &&
        concurrencyBaseline
            .execution
            .durationMs >
        0,
        "controlled concurrency duration is finite and positive"
    );


    // ========================================================================
    // F. Concurrency lower bound
    // ========================================================================

    section(
        "F. Worker count bounded by available items"
    );


    const smallBatch =
        await measureProductionConcurrencyRunner({
            itemCount:
                2,

            concurrency:
                5,

            delayBetweenStartsMs:
                0,

            workerDelayMs:
                20,
        });


    check(
        smallBatch
            .execution
            .maximumActiveWorkers <=
            2,
        "worker count does not exceed number of available items"
    );


    check(
        smallBatch
            .productionResult
            .total ===
            2,
        "small batch reports exactly two items"
    );


    check(
        smallBatch
            .productionResult
            .successful ===
            2,
        "small batch completes both items"
    );


    // ========================================================================
    // G. Worker failure isolation
    // ========================================================================

    section(
        "G. Individual worker failure isolation"
    );


    const failureBaseline =
        await measureProductionConcurrencyRunner({
            itemCount:
                8,

            concurrency:
                3,

            delayBetweenStartsMs:
                0,

            workerDelayMs:
                10,

            failingIndexes: [
                2,
                5,
            ],
        });


    check(
        failureBaseline
            .productionResult
            .total ===
            8,
        "failure-isolation batch reports all eight items"
    );


    check(
        failureBaseline
            .productionResult
            .successful ===
            6,
        "six controlled workers remain successful"
    );


    check(
        failureBaseline
            .productionResult
            .failed ===
            2,
        "two controlled worker failures are reported explicitly"
    );


    check(
        failureBaseline
            .execution
            .failedWorkers ===
            2,
        "worker instrumentation observed exactly two controlled failures"
    );


    check(
        failureBaseline
            .execution
            .completedWorkers ===
            6,
        "six workers completed despite sibling failures"
    );


    check(
        failureBaseline
            .execution
            .activeWorkersAtEnd ===
            0,
        "failure batch leaves no worker active"
    );


    check(
        failureBaseline
            .execution
            .maximumActiveWorkers <=
            3,
        "failure isolation preserves configured concurrency ceiling"
    );


    check(
        failureBaseline
            .productionResult
            .results
            .filter(
                (entry) =>
                    entry?.success ===
                    false
            )
            .length ===
            2,
        "production result preserves both per-item failure records"
    );


    // ========================================================================
    // H. Same-job overlap protection
    // ========================================================================

    section(
        "H. Same-job overlap protection"
    );


    const overlap =
        await measureSameJobOverlap({
            jobName:
                "telemetry",

            workerDelayMs:
                50,
        });


    check(
        overlap
            .workerExecutions ===
            1,
        "same-job overlap starts only one worker"
    );


    check(
        overlap
            .firstResult
            .executed ===
            true,
        "first telemetry job executes"
    );


    check(
        overlap
            .firstResult
            .success ===
            true,
        "first telemetry job completes successfully"
    );


    check(
        overlap
            .secondResult
            .executed ===
            false,
        "overlapping telemetry invocation is not executed"
    );


    check(
        overlap
            .secondResult
            .skipped ===
            true,
        "overlapping telemetry invocation is explicitly skipped"
    );


    check(
        overlap
            .secondResult
            .reason ===
            "PREVIOUS_EXECUTION_STILL_RUNNING",
        "overlap skip preserves explicit reason"
    );


    check(
        overlap
            .finalState
            .statistics
            .overlapsSkipped ===
            1,
        "exactly one overlap is recorded"
    );


    check(
        overlap
            .finalState
            .statistics
            .executionsStarted ===
            1,
        "only one same-job execution acquired the lock"
    );


    check(
        overlap
            .finalState
            .locks
            .telemetry ===
            false,
        "same-job lock is released after successful completion"
    );


    // ========================================================================
    // I. Lock release after failure
    // ========================================================================

    section(
        "I. Lock release after controlled job failure"
    );


    const failureRelease =
        await measureLockReleaseAfterFailure({
            jobName:
                "telemetry",
        });


    check(
        failureRelease
            .failed
            .executed ===
            true,
        "controlled failing job acquired the lock"
    );


    check(
        failureRelease
            .failed
            .success ===
            false,
        "controlled failing job reports failure"
    );


    check(
        failureRelease
            .failed
            .error
            .message ===
            "CONTROLLED_SCHEDULER_FAILURE",
        "controlled scheduler failure remains explicit"
    );


    check(
        failureRelease
            .afterFailureLocked ===
            false,
        "job lock is released after failure"
    );


    check(
        failureRelease
            .retry
            .executed ===
            true,
        "job can execute again after failed run releases lock"
    );


    check(
        failureRelease
            .retry
            .success ===
            true,
        "retry succeeds after lock release"
    );


    check(
        failureRelease
            .executionCount ===
            2,
        "failed execution and retry each execute exactly once"
    );


    check(
        failureRelease
            .finalState
            .locks
            .telemetry ===
            false,
        "telemetry lock is false after failure and retry sequence"
    );


    // ========================================================================
    // J. Independent job locks
    // ========================================================================

    section(
        "J. Independent scheduler job locks"
    );


    const independent =
        await measureIndependentJobLocks();


    check(
        independent
            .telemetryExecutions ===
            1,
        "telemetry controlled job executes once"
    );


    check(
        independent
            .alarmExecutions ===
            1,
        "alarm controlled job executes once"
    );


    check(
        independent
            .telemetryResult
            .executed ===
            true,
        "telemetry job is not blocked by alarm job"
    );


    check(
        independent
            .alarmResult
            .executed ===
            true,
        "alarm job is not blocked by telemetry job"
    );


    check(
        independent
            .finalState
            .statistics
            .maximumSimultaneousJobs ===
            2,
        "independent job names may execute simultaneously"
    );


    check(
        independent
            .finalState
            .locks
            .telemetry ===
            false,
        "telemetry lock released after independent-job test"
    );


    check(
        independent
            .finalState
            .locks
            .alarms ===
            false,
        "alarm lock released after independent-job test"
    );


    // ========================================================================
    // K. Final safety
    // ========================================================================

    section(
        "K. Final scheduler safety confirmation"
    );


    check(
        schedulerConcurrencyContract
            .productionEvidence
            .executesProductionConcurrencyRunner ===
            true,
        "Phase 14.5 executes the real production concurrency helper"
    );


    check(
        schedulerConcurrencyContract
            .productionEvidence
            .executesProductionScheduler ===
            false,
        "Phase 14.5 does not start the production scheduler"
    );


    check(
        schedulerConcurrencyContract
            .productionEvidence
            .executesProductionSyncWorkers ===
            false,
        "Phase 14.5 does not execute production synchronization workers"
    );


    check(
        boundaries
            .performsDatabaseWrite ===
            false,
        "Phase 14.5 performs no database write"
    );


    check(
        boundaries
            .performsVrmRequest ===
            false,
        "Phase 14.5 performs no VRM request"
    );


    check(
        boundaries
            .changesSchedulerIntervals ===
            false,
        "Phase 14.5 does not alter scheduler cadence"
    );


    check(
        boundaries
            .changesProductionLocks ===
            false,
        "Phase 14.5 does not mutate production scheduler locks"
    );


    check(
        boundaries
            .performsEquipmentControl ===
            false,
        "Phase 14.5 performs no equipment control"
    );


    check(
        boundaries
            .performsAutoDispatch ===
            false,
        "Phase 14.5 performs no automatic dispatch"
    );


    // ========================================================================
    // Report
    // ========================================================================

    console.log("");
    console.log(
        "-".repeat(
            76
        )
    );

    console.log(
        "PHASE 14.5 SCHEDULER CONCURRENCY / OVERLAP RESULT"
    );

    console.log(
        "-".repeat(
            76
        )
    );

    console.log(
        `Controlled items               : ${concurrencyBaseline.input.itemCount}`
    );

    console.log(
        `Configured concurrency         : ${concurrencyBaseline.input.concurrency}`
    );

    console.log(
        `Observed max active workers    : ${concurrencyBaseline.execution.maximumActiveWorkers}`
    );

    console.log(
        `Concurrency bounded            : ${concurrencyBaseline.execution.bounded}`
    );

    console.log(
        `Controlled batch duration      : ${concurrencyBaseline.execution.durationMs} ms`
    );

    console.log(
        `Failure-isolation successes    : ${failureBaseline.productionResult.successful}`
    );

    console.log(
        `Failure-isolation failures     : ${failureBaseline.productionResult.failed}`
    );

    console.log(
        `Same-job workers executed      : ${overlap.workerExecutions}`
    );

    console.log(
        `Same-job overlaps skipped      : ${overlap.finalState.statistics.overlapsSkipped}`
    );

    console.log(
        `Lock released after failure    : ${failureRelease.afterFailureLocked === false}`
    );

    console.log(
        `Independent jobs simultaneous  : ${independent.finalState.statistics.maximumSimultaneousJobs}`
    );

    console.log(
        "Production scheduler started   : NO"
    );

    console.log(
        "Production sync workers called : NO"
    );

    console.log(
        "Database mutation              : NONE"
    );

    console.log(
        "VRM request                    : NONE"
    );

    console.log(
        "Scheduler cadence mutation     : NONE"
    );

    console.log(
        "Equipment control              : NONE"
    );

    console.log(
        "Auto-dispatch                  : DISABLED"
    );

    console.log(
        "-".repeat(
            76
        )
    );

    console.log("");
    console.log(
        `Assertions passed: ${assertionsPassed}`
    );

    console.log(
        "ASHMAAN PHASE 14.5 SCHEDULER CONCURRENCY / OVERLAP VALIDATION PASSED"
    );


    process.exitCode =
        0;

} catch (error) {

    console.error("");
    console.error(
        "=".repeat(
            76
        )
    );

    console.error(
        "ASHMAAN PHASE 14.5 SCHEDULER CONCURRENCY / OVERLAP VALIDATION FAILED"
    );

    console.error(
        "=".repeat(
            76
        )
    );

    console.error(
        error
    );

    console.error("");
    console.error(
        "Do not alter scheduler cadence, MongoDB, VRM synchronization, or production locks without evidence from the first failed assertion."
    );


    process.exitCode =
        1;
}