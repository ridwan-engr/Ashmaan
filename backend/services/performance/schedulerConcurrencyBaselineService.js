// ============================================================================
// ASHMAAN PHASE 14.5
// Scheduler Concurrency / Overlap Protection Baseline
// ============================================================================
//
// PURPOSE
//
// Validate scheduler concurrency behavior without:
//
// - starting the production VRM scheduler
// - calling VRM
// - querying or mutating MongoDB
// - executing telemetry synchronization
// - changing scheduler intervals
// - changing production jobLocks
//
// Dynamic concurrency evidence uses the REAL production:
// services/scheduler/syncJobRunner.js -> runWithConcurrency()
//
// Same-job overlap behavior is exercised with an isolated in-memory guard
// having the same lock lifecycle:
//
// unlocked -> running -> skipped-overlap -> finally -> unlocked
//
// ============================================================================

import {
    performance,
} from "node:perf_hooks";

import {
    runWithConcurrency,
} from "../scheduler/syncJobRunner.js";


export const PHASE_14_SCHEDULER_CONCURRENCY =
    Object.freeze({
        phase:
            "14.5",

        layer:
            "SCHEDULER_CONCURRENCY_RESILIENCE",

        category:
            "SCHEDULER_OVERLAP_BASELINE",

        mode:
            "CONTROLLED_IN_MEMORY_VALIDATION",

        productionEvidence:
            Object.freeze({
                scheduler:
                    "services/scheduler/vrmScheduler.js",

                concurrencyRunner:
                    "services/scheduler/syncJobRunner.js",

                executesProductionConcurrencyRunner:
                    true,

                executesProductionScheduler:
                    false,

                executesProductionSyncWorkers:
                    false,
            }),

        expectedProductionLocks:
            Object.freeze([
                "telemetry",
                "statusRefresh",
                "alarms",
                "statistics",
                "devices",
            ]),

        defaults:
            Object.freeze({
                itemCount:
                    12,

                concurrency:
                    3,

                delayBetweenStartsMs:
                    0,

                workerDelayMs:
                    20,

                overlapJobDelayMs:
                    50,

                maxItems:
                    100,

                maxConcurrency:
                    10,

                maxWorkerDelayMs:
                    1000,
            }),

        semantics:
            Object.freeze({
                sameJobOverlapAllowed:
                    false,

                concurrencyMustBeBounded:
                    true,

                individualWorkerFailureIsolated:
                    true,

                lockReleasedOnSuccess:
                    true,

                lockReleasedOnFailure:
                    true,

                skippedOverlapIsNotExecution:
                    true,

                unrelatedJobNamesUseIndependentLocks:
                    true,
            }),

        boundaries:
            Object.freeze({
                startsProductionScheduler:
                    false,

                changesSchedulerIntervals:
                    false,

                changesProductionLocks:
                    false,

                performsVrmRequest:
                    false,

                performsDatabaseRead:
                    false,

                performsDatabaseWrite:
                    false,

                executesTelemetrySync:
                    false,

                executesAlarmSync:
                    false,

                executesStatisticsSync:
                    false,

                executesDeviceSync:
                    false,

                changesEnvironment:
                    false,

                performsEquipmentControl:
                    false,

                performsAutoDispatch:
                    false,
            }),
    });


const sleep =
    (ms) =>
        new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    ms
                )
        );


function requirePositiveInteger(
    value,
    name,
    maximum
) {
    if (
        !Number.isInteger(
            value
        ) ||
        value < 1 ||
        value > maximum
    ) {
        throw new RangeError(
            `${name} must be an integer between 1 and ${maximum}.`
        );
    }
}


function round(
    value,
    digits = 3
) {
    if (
        typeof value !==
            "number" ||
        !Number.isFinite(
            value
        )
    ) {
        return null;
    }

    const factor =
        10 ** digits;

    return (
        Math.round(
            value *
            factor
        ) /
        factor
    );
}


// ============================================================================
// Controlled overlap guard
// ============================================================================

export function createControlledSchedulerGuard() {
    const locks =
        new Map();

    const statistics = {
        executionAttempts:
            0,

        executionsStarted:
            0,

        executionsCompleted:
            0,

        executionsFailed:
            0,

        overlapsSkipped:
            0,

        maximumSimultaneousJobs:
            0,

        activeJobs:
            0,
    };


    function isLocked(
        jobName
    ) {
        return (
            locks.get(
                jobName
            ) === true
        );
    }


    async function execute({
        jobName,
        worker,
    } = {}) {
        if (
            typeof jobName !==
                "string" ||
            jobName.trim() ===
                ""
        ) {
            throw new TypeError(
                "jobName is required."
            );
        }

        if (
            typeof worker !==
                "function"
        ) {
            throw new TypeError(
                "worker must be a function."
            );
        }

        statistics
            .executionAttempts +=
            1;


        if (
            isLocked(
                jobName
            )
        ) {
            statistics
                .overlapsSkipped +=
                1;

            return {
                jobName,

                executed:
                    false,

                skipped:
                    true,

                reason:
                    "PREVIOUS_EXECUTION_STILL_RUNNING",
            };
        }


        locks.set(
            jobName,
            true
        );

        statistics
            .executionsStarted +=
            1;

        statistics
            .activeJobs +=
            1;

        statistics
            .maximumSimultaneousJobs =
            Math.max(
                statistics
                    .maximumSimultaneousJobs,

                statistics
                    .activeJobs
            );


        const startedAt =
            performance.now();


        try {
            const result =
                await worker();

            statistics
                .executionsCompleted +=
                1;

            return {
                jobName,

                executed:
                    true,

                skipped:
                    false,

                success:
                    true,

                durationMs:
                    round(
                        performance.now() -
                        startedAt
                    ),

                result,
            };
        } catch (error) {
            statistics
                .executionsFailed +=
                1;

            return {
                jobName,

                executed:
                    true,

                skipped:
                    false,

                success:
                    false,

                durationMs:
                    round(
                        performance.now() -
                        startedAt
                    ),

                error: {
                    message:
                        error instanceof Error
                            ? error.message
                            : String(
                                error
                            ),
                },
            };
        } finally {
            statistics
                .activeJobs -=
                1;

            locks.set(
                jobName,
                false
            );
        }
    }


    function snapshot() {
        return {
            statistics: {
                ...statistics,
            },

            locks:
                Object.fromEntries(
                    locks.entries()
                ),
        };
    }


    return {
        execute,
        isLocked,
        snapshot,
    };
}


// ============================================================================
// Production runWithConcurrency measurement
// ============================================================================

export async function measureProductionConcurrencyRunner({
    itemCount =
        PHASE_14_SCHEDULER_CONCURRENCY
            .defaults.itemCount,

    concurrency =
        PHASE_14_SCHEDULER_CONCURRENCY
            .defaults.concurrency,

    delayBetweenStartsMs =
        PHASE_14_SCHEDULER_CONCURRENCY
            .defaults.delayBetweenStartsMs,

    workerDelayMs =
        PHASE_14_SCHEDULER_CONCURRENCY
            .defaults.workerDelayMs,

    failingIndexes = [],
} = {}) {
    requirePositiveInteger(
        itemCount,
        "itemCount",
        PHASE_14_SCHEDULER_CONCURRENCY
            .defaults.maxItems
    );

    requirePositiveInteger(
        concurrency,
        "concurrency",
        PHASE_14_SCHEDULER_CONCURRENCY
            .defaults.maxConcurrency
    );

    if (
        !Number.isInteger(
            delayBetweenStartsMs
        ) ||
        delayBetweenStartsMs < 0 ||
        delayBetweenStartsMs > 1000
    ) {
        throw new RangeError(
            "delayBetweenStartsMs must be between 0 and 1000."
        );
    }

    if (
        !Number.isInteger(
            workerDelayMs
        ) ||
        workerDelayMs < 0 ||
        workerDelayMs >
        PHASE_14_SCHEDULER_CONCURRENCY
            .defaults.maxWorkerDelayMs
    ) {
        throw new RangeError(
            "workerDelayMs is outside the controlled boundary."
        );
    }

    if (
        !Array.isArray(
            failingIndexes
        )
    ) {
        throw new TypeError(
            "failingIndexes must be an array."
        );
    }


    const failingSet =
        new Set(
            failingIndexes
        );

    const items =
        Array.from(
            {
                length:
                    itemCount,
            },
            (
                _,
                index
            ) => ({
                id:
                    index + 1,

                index,
            })
        );


    let activeWorkers =
        0;

    let maximumActiveWorkers =
        0;

    let startedWorkers =
        0;

    let completedWorkers =
        0;

    let failedWorkers =
        0;


    const workerStarts =
        [];


    const startedAt =
        performance.now();


    const result =
        await runWithConcurrency({
            items,

            concurrency,

            delayBetweenStartsMs,

            worker:
                async (
                    item,
                    itemIndex,
                    workerId
                ) => {
                    startedWorkers +=
                        1;

                    activeWorkers +=
                        1;

                    maximumActiveWorkers =
                        Math.max(
                            maximumActiveWorkers,
                            activeWorkers
                        );

                    workerStarts.push({
                        itemIndex,
                        workerId,
                        activeAtStart:
                            activeWorkers,
                    });


                    try {
                        if (
                            workerDelayMs >
                            0
                        ) {
                            await sleep(
                                workerDelayMs
                            );
                        }

                        if (
                            failingSet.has(
                                itemIndex
                            )
                        ) {
                            failedWorkers +=
                                1;

                            throw new Error(
                                `CONTROLLED_WORKER_FAILURE_${itemIndex}`
                            );
                        }

                        completedWorkers +=
                            1;

                        return {
                            id:
                                item.id,

                            itemIndex,

                            workerId,
                        };
                    } finally {
                        activeWorkers -=
                            1;
                    }
                },
        });


    const durationMs =
        performance.now() -
        startedAt;


    return {
        input: {
            itemCount,

            concurrency,

            delayBetweenStartsMs,

            workerDelayMs,

            failingIndexes: [
                ...failingSet,
            ],
        },

        execution: {
            startedWorkers,

            completedWorkers,

            failedWorkers,

            activeWorkersAtEnd:
                activeWorkers,

            maximumActiveWorkers,

            bounded:
                maximumActiveWorkers <=
                concurrency,

            durationMs:
                round(
                    durationMs
                ),

            workerStarts,
        },

        productionResult:
            result,
    };
}


// ============================================================================
// Same-job overlap measurement
// ============================================================================

export async function measureSameJobOverlap({
    jobName =
        "telemetry",

    workerDelayMs =
        PHASE_14_SCHEDULER_CONCURRENCY
            .defaults.overlapJobDelayMs,
} = {}) {
    const guard =
        createControlledSchedulerGuard();


    let workerExecutions =
        0;


    const first =
        guard.execute({
            jobName,

            worker:
                async () => {
                    workerExecutions +=
                        1;

                    await sleep(
                        workerDelayMs
                    );

                    return (
                        "FIRST_EXECUTION_COMPLETED"
                    );
                },
        });


    // Allow the first call to synchronously acquire its lock.
    await Promise.resolve();


    const second =
        guard.execute({
            jobName,

            worker:
                async () => {
                    workerExecutions +=
                        1;

                    return (
                        "SECOND_EXECUTION_SHOULD_NOT_RUN"
                    );
                },
        });


    const [
        firstResult,
        secondResult,
    ] =
        await Promise.all([
            first,
            second,
        ]);


    return {
        jobName,

        workerExecutions,

        firstResult,

        secondResult,

        finalState:
            guard.snapshot(),
    };
}


// ============================================================================
// Failure lock-release measurement
// ============================================================================

export async function measureLockReleaseAfterFailure({
    jobName =
        "telemetry",
} = {}) {
    const guard =
        createControlledSchedulerGuard();


    let executionCount =
        0;


    const failed =
        await guard.execute({
            jobName,

            worker:
                async () => {
                    executionCount +=
                        1;

                    throw new Error(
                        "CONTROLLED_SCHEDULER_FAILURE"
                    );
                },
        });


    const afterFailureLocked =
        guard.isLocked(
            jobName
        );


    const retry =
        await guard.execute({
            jobName,

            worker:
                async () => {
                    executionCount +=
                        1;

                    return (
                        "RETRY_EXECUTED"
                    );
                },
        });


    return {
        jobName,

        executionCount,

        failed,

        afterFailureLocked,

        retry,

        finalState:
            guard.snapshot(),
    };
}


// ============================================================================
// Independent-job lock measurement
// ============================================================================

export async function measureIndependentJobLocks() {
    const guard =
        createControlledSchedulerGuard();


    let telemetryExecutions =
        0;

    let alarmExecutions =
        0;


    const telemetryPromise =
        guard.execute({
            jobName:
                "telemetry",

            worker:
                async () => {
                    telemetryExecutions +=
                        1;

                    await sleep(
                        40
                    );

                    return (
                        "TELEMETRY_COMPLETE"
                    );
                },
        });


    const alarmPromise =
        guard.execute({
            jobName:
                "alarms",

            worker:
                async () => {
                    alarmExecutions +=
                        1;

                    await sleep(
                        40
                    );

                    return (
                        "ALARMS_COMPLETE"
                    );
                },
        });


    const [
        telemetryResult,
        alarmResult,
    ] =
        await Promise.all([
            telemetryPromise,
            alarmPromise,
        ]);


    return {
        telemetryExecutions,

        alarmExecutions,

        telemetryResult,

        alarmResult,

        finalState:
            guard.snapshot(),
    };
}


export default
PHASE_14_SCHEDULER_CONCURRENCY;